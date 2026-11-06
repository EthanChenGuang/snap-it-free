/**
 * Bounded exhaustive check of how the subscriptions row converges under Stripe webhook reordering.
 *
 * Property (Converges): once Stripe has stopped changing the subscription and every write path has run,
 * the stored `subscriptions.status` equals Stripe's final status. Harm when it breaks: a paying user stays
 * locked out, or a canceled user keeps access, until some later Stripe event happens to fix the row.
 *
 * Real code under check: `handleStripeEvent` and `subscriptionStateFromStripe` (lib/subscriptions/sync.ts).
 * The database write is `public.apply_subscription_state`; its "newer or equal wins" guard is read from the
 * newest migration that defines it (see `loadApplyGuard`), so editing that SQL changes what is checked.
 *
 * Explored, for each scenario: every interleaving of (a) Stripe's state changes in order, (b) one delivery
 * of every webhook event in any order after it is emitted, plus optionally one duplicate delivery of any one
 * event, (c) the checkout.session.completed handler's retrieve and its write as two separate steps, and
 * (d) the success_url return route (app/api/stripe/checkout/return/route.ts) running zero or one time after
 * activation, also as retrieve then write. Handlers that retrieve (created, updated, checkout, return route) read the
 * server clock and Stripe's current state in one step and write in a later one; `deleted` writes in one step.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type Stripe from 'stripe';
import { handleStripeEvent, subscriptionStateFromStripe, type SubscriptionState } from '@/lib/subscriptions/sync';

const ROOT = path.resolve(__dirname, '../../../..');
const PRICES = { weekly: 'price_w', monthly: 'price_m', yearly: 'price_y' } as const;
const USER = 'user-1';
const CUSTOMER = 'cus_1';
const SUB_ID = 'sub_1';

export type StripeStatus = 'incomplete' | 'active' | 'past_due' | 'canceled';
/** One state change on Stripe's side; `sec` is Stripe's event.created (whole seconds). */
export type Change = { status: StripeStatus; sec: number };
export type Scenario = { name: string; changes: Change[] };

// ---------------------------------------------------------------- SQL guard (from the real migration)

export type ApplyGuard = { op: '<=' | '<' | 'always'; source: string };

/** The `where s.last_event_at <op> excluded.last_event_at` of the newest migration defining the function. */
export function loadApplyGuard(): ApplyGuard {
  const dir = path.join(ROOT, 'supabase/migrations');
  const files = readdirSync(dir)
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort();
  for (const file of files.reverse()) {
    const sql = readFileSync(path.join(dir, file), 'utf8');
    const at = sql.indexOf('function public.apply_subscription_state');
    if (at < 0) continue;
    const body = sql.slice(at, sql.indexOf('$$;', at));
    const match = body.match(/where\s+s\.last_event_at\s*(<=|<)\s*excluded\.last_event_at/i);
    return { op: match ? (match[1] as '<=' | '<') : 'always', source: file };
  }
  throw new Error('no migration defines public.apply_subscription_state');
}

type Row = { status: string; lastEventAt: number } | null;

function applyRow(row: Row, state: SubscriptionState, guard: ApplyGuard): Row {
  const at = Date.parse(state.p_last_event_at);
  if (!row) return { status: state.p_status, lastEventAt: at };
  const wins = guard.op === 'always' || (guard.op === '<=' ? row.lastEventAt <= at : row.lastEventAt < at);
  return wins ? { status: state.p_status, lastEventAt: at } : row;
}

// ---------------------------------------------------------------- Stripe fakes shaped like the real objects

function subscriptionObject(status: StripeStatus): Stripe.Subscription {
  return {
    id: SUB_ID,
    customer: CUSTOMER,
    status,
    cancel_at_period_end: false,
    metadata: { user_id: USER },
    items: { data: [{ price: { id: PRICES.yearly }, current_period_end: 2_000_000_000 }] },
  } as unknown as Stripe.Subscription;
}

type Emitted =
  | { id: string; kind: 'subscription'; event: Stripe.Event }
  | { id: string; kind: 'checkout'; event: Stripe.Event };

/** The webhook events Stripe emits for change k (created / updated / deleted, plus checkout on first activation). */
function eventsFor(changes: Change[], k: number): Emitted[] {
  const change = changes[k];
  const type =
    k === 0 ? 'customer.subscription.created' : change.status === 'canceled' ? 'customer.subscription.deleted' : 'customer.subscription.updated';
  const out: Emitted[] = [
    {
      id: `${type.split('.').pop()}#${k}(${change.status}@${change.sec})`,
      kind: 'subscription',
      event: { type, created: change.sec, data: { object: subscriptionObject(change.status) } } as unknown as Stripe.Event,
    },
  ];
  const firstActive = changes.findIndex((entry) => entry.status === 'active');
  if (k === firstActive) {
    out.push({
      id: `checkout.completed#${k}(@${change.sec})`,
      kind: 'checkout',
      event: {
        type: 'checkout.session.completed',
        created: change.sec,
        data: { object: { mode: 'subscription', subscription: SUB_ID, client_reference_id: USER } },
      } as unknown as Stripe.Event,
    });
  }
  return out;
}

// ---------------------------------------------------------------- exploration

/** A delivery being handled. Handlers that retrieve take two steps: stamp + retrieve, then write. */
type Pending = { id: string; event: Stripe.Event; kind: Emitted['kind']; fetched?: StripeStatus; stamp?: number };

type World = {
  changesDone: number;
  row: Row;
  queue: Pending[]; // emitted, not yet fully handled (checkout may be mid-way: fetched but not written)
  retryLeft: boolean;
  emittedLog: Emitted[];
  returnRoute: 'notYet' | { fetched: StripeStatus; stamp: number } | 'done' | 'never';
  /** Last server-clock reading (ms). Readings strictly increase in real order; skew vs Stripe is out of scope. */
  clock: number;
  trace: string[];
};

const trueStatus = (scenario: Scenario, world: World): StripeStatus | null =>
  world.changesDone === 0 ? null : scenario.changes[world.changesDone - 1].status;

/** Reads the server clock (`now()` in handleStripeEvent, `new Date()` in the return route). */
const readClock = (scenario: Scenario, world: World): number =>
  Math.max(world.clock, scenario.changes[Math.max(0, world.changesDone - 1)].sec * 1000) + 1;

/**
 * Runs the real handler at its write step. `retrieveStamp` is the clock reading at the earlier retrieve step and
 * `writeStamp` the reading now; `now()` returns whichever matches where the code calls it (before or after the
 * retrieve), so moving the stamp after the retrieve in the code changes what is checked.
 */
async function runHandler(
  world: World,
  event: Stripe.Event,
  fetched: StripeStatus | undefined,
  retrieveStamp: number,
  writeStamp: number,
  guard: ApplyGuard,
): Promise<Row> {
  let row = world.row;
  let retrieved = false;
  await handleStripeEvent(event, {
    prices: PRICES,
    now: () => new Date(retrieved ? writeStamp : retrieveStamp),
    retrieveSubscription: async () => {
      if (fetched === undefined) throw new Error(`${event.type} retrieved but the model gave it no retrieve step`);
      retrieved = true;
      return subscriptionObject(fetched);
    },
    applyState: async (state) => {
      row = applyRow(row, state, guard);
      return true;
    },
  });
  return row;
}

/** `customer.subscription.deleted` writes its payload without retrieving (canceled is terminal). */
const retrievesFirst = (event: Stripe.Event): boolean => event.type !== 'customer.subscription.deleted';

function writeReturnRoute(world: World, fetched: StripeStatus, stamp: number, guard: ApplyGuard): Row {
  // Same mapping the route uses: stamp = new Date() taken before sessions.retrieve, then subscriptionStateFromStripe.
  const state = subscriptionStateFromStripe(subscriptionObject(fetched), PRICES, new Date(stamp), USER);
  if (!state) throw new Error('return route state should map');
  return applyRow(world.row, state, guard);
}

export type Counterexample = { scenario: string; finalStripe: StripeStatus; stored: string | null; steps: string[] };
export type ScenarioResult = { scenario: string; states: number; counterexample: Counterexample | null };

/** Everything that decides what can happen next and what gets stored (the trace is history only). */
function stateKey(world: World): string {
  return JSON.stringify([
    world.changesDone,
    world.row,
    world.queue.map((pending) => [pending.id, pending.fetched ?? null, pending.stamp ?? null]).sort(),
    world.retryLeft,
    world.returnRoute,
    world.clock,
    world.emittedLog.length,
  ]);
}

export async function checkScenario(scenario: Scenario, guard = loadApplyGuard()): Promise<ScenarioResult> {
  const seen = new Set<string>();
  let counterexample: Counterexample | null = null;
  const activation = scenario.changes.findIndex((change) => change.status === 'active');

  const explore = async (world: World): Promise<void> => {
    if (counterexample && counterexample.steps.length <= world.trace.length) return; // only a shorter one can replace it
    const key = stateKey(world);
    if (seen.has(key)) return;
    seen.add(key);

    const moves: Array<() => Promise<World>> = [];

    if (world.changesDone < scenario.changes.length) {
      moves.push(async () => {
        const k = world.changesDone;
        const emitted = eventsFor(scenario.changes, k);
        return {
          ...world,
          changesDone: k + 1,
          queue: [...world.queue, ...emitted.map((entry) => ({ id: entry.id, event: entry.event, kind: entry.kind }))],
          emittedLog: [...world.emittedLog, ...emitted],
          trace: [...world.trace, `Stripe: subscription becomes ${scenario.changes[k].status} at second ${scenario.changes[k].sec}`],
        };
      });
    }

    world.queue.forEach((pending, index) => {
      const rest = world.queue.filter((_, at) => at !== index);
      if (!retrievesFirst(pending.event)) {
        moves.push(async () => {
          const stamp = readClock(scenario, world);
          return {
            ...world,
            clock: stamp,
            row: await runHandler(world, pending.event, undefined, stamp, stamp, guard),
            queue: rest,
            trace: [...world.trace, `webhook ${pending.id} delivered, written stamped ${stamp}ms`],
          };
        });
      } else if (pending.fetched === undefined) {
        moves.push(async () => {
          const fetched = trueStatus(scenario, world) as StripeStatus;
          const stamp = readClock(scenario, world);
          return {
            ...world,
            clock: stamp,
            queue: world.queue.map((entry, at) => (at === index ? { ...entry, fetched, stamp } : entry)),
            trace: [...world.trace, `webhook ${pending.id}: handler stamps ${stamp}ms and retrieves the subscription (${fetched})`],
          };
        });
      } else {
        moves.push(async () => {
          const writeStamp = readClock(scenario, world);
          return {
            ...world,
            clock: writeStamp,
            row: await runHandler(world, pending.event, pending.fetched, pending.stamp as number, writeStamp, guard),
            queue: rest,
            trace: [...world.trace, `webhook ${pending.id}: handler writes ${pending.fetched}`],
          };
        });
      }
    });

    if (world.retryLeft) {
      const handled = world.emittedLog.filter(
        (entry) => entry.kind === 'subscription' && !world.queue.some((pending) => pending.id === entry.id),
      );
      for (const entry of handled) {
        moves.push(async () => ({
          ...world,
          retryLeft: false,
          queue: [...world.queue, { id: `${entry.id} (retry)`, event: entry.event, kind: 'subscription' }],
          trace: [...world.trace, `Stripe retries ${entry.id}`],
        }));
      }
    }

    if (world.returnRoute === 'notYet' && activation >= 0 && world.changesDone > activation) {
      moves.push(async () => {
        const fetched = trueStatus(scenario, world) as StripeStatus;
        const stamp = readClock(scenario, world);
        return {
          ...world,
          clock: stamp,
          returnRoute: { fetched, stamp },
          trace: [...world.trace, `return route: user lands on success_url, route retrieves the subscription (${fetched})`],
        };
      });
    }
    if (typeof world.returnRoute === 'object') {
      const { fetched, stamp } = world.returnRoute;
      moves.push(async () => ({
        ...world,
        row: writeReturnRoute(world, fetched, stamp, guard),
        returnRoute: 'done',
        trace: [...world.trace, `return route writes ${fetched} stamped ${stamp}ms`],
      }));
    }

    // Required work is done once Stripe has finished, every delivery is handled and no route is mid-way.
    // Optional moves (a retry, a late return route) may still follow, so check here and keep exploring.
    const settled =
      world.changesDone === scenario.changes.length && world.queue.length === 0 && typeof world.returnRoute !== 'object';
    if (settled) {
      const finalStripe = scenario.changes[scenario.changes.length - 1].status;
      const stored = world.row?.status ?? null;
      if (stored !== finalStripe) {
        const steps = world.returnRoute === 'notYet' ? [...world.trace, 'return route never runs (tab closed / not signed in)'] : world.trace;
        if (!counterexample || steps.length < counterexample.steps.length) {
          counterexample = { scenario: scenario.name, finalStripe, stored, steps };
        }
      }
    }
    for (const move of moves) await explore(await move());
  };

  await explore({
    changesDone: 0,
    row: null,
    queue: [],
    retryLeft: true,
    emittedLog: [],
    returnRoute: activation >= 0 ? 'notYet' : 'never',
    clock: 0,
    trace: [],
  });
  return { scenario: scenario.name, states: seen.size, counterexample };
}

// ---------------------------------------------------------------- scenarios (the bound)

/** Every Stripe change lands in its own second: the guard must make the row converge. */
export const DISTINCT_SECOND_SCENARIOS: Scenario[] = [
  { name: 'checkout: incomplete@10 → active@11', changes: [{ status: 'incomplete', sec: 10 }, { status: 'active', sec: 11 }] },
  {
    name: 'renewal fails then recovers: active@10 → past_due@12 → active@14',
    changes: [
      { status: 'active', sec: 10 },
      { status: 'past_due', sec: 12 },
      { status: 'active', sec: 14 },
    ],
  },
  { name: 'cancel: active@10 → canceled@12', changes: [{ status: 'active', sec: 10 }, { status: 'canceled', sec: 12 }] },
];

/** Two Stripe changes inside the same second (Stripe's event.created has 1 s resolution). */
export const SAME_SECOND_SCENARIOS: Scenario[] = [
  {
    name: 'checkout, same second: incomplete@10 → active@10',
    changes: [
      { status: 'incomplete', sec: 10 },
      { status: 'active', sec: 10 },
    ],
  },
  {
    name: 'renewal fails then cancels, same second: active@10 → past_due@12 → canceled@12',
    changes: [
      { status: 'active', sec: 10 },
      { status: 'past_due', sec: 12 },
      { status: 'canceled', sec: 12 },
    ],
  },
];

export function describeCounterexample(example: Counterexample): string {
  return [
    `Scenario: ${example.scenario}`,
    `Stripe ends ${example.finalStripe}, but the subscriptions row stores ${example.stored ?? 'nothing'}:`,
    ...example.steps.map((step, index) => `  ${index + 1}. ${step}`),
  ].join('\n');
}
