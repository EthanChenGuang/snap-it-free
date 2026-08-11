---
phase: quick-260811-nwf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scraper/src/translate/ingest.ts
  - scraper/src/shared/persist.ts
  - scraper/src/shared/persist.test.ts
  - scraper/src/translate/ingest.test.ts
autonomous: true
requirements: [QUICK-260811-NWF]

must_haves:
  truths:
    - "A persistBatch call touching N listings issues exactly one scraper_global_config SELECT for translate config/cap, not one per listing."
    - "The daily translation cap is never exceeded even when multiple listings' translations are dispatched concurrently within the same persistBatch call."
    - "Listings whose content_hash is unchanged (result 'skipped') still trigger zero translation calls and consume zero cap budget, identical to current behavior."
    - "When auto_translate is false, persistBatch makes zero scraper_global_config writes and zero LLM calls, identical to today."
    - "Up to DEFAULT_TRANSLATE_CONCURRENCY listings' translation calls run concurrently instead of strictly one at a time, while each listing's row upsert/content-hash check still runs sequentially and unchanged."
    - "A translation failure (LLM failure or post-translation DB write failure) still queues into translation_queue with incrementing attempts, exactly as before."
    - "persistBatch resolves only after all dispatched translation work has settled, so callers observe final listings/translation_queue state — persist is never rolled back regardless of translation outcome."
  artifacts:
    - "scraper/src/translate/ingest.ts exports loadTranslateBatchState, TranslateBatchState, translateBatch, TranslationWorkItem, DEFAULT_TRANSLATE_CONCURRENCY"
    - "scraper/src/shared/persist.ts persistBatch collects translation work per listing and dispatches it once via translateBatch after its persist loop"
    - "scraper/src/translate/ingest.test.ts (new) covers single-load-per-batch, cap-exhaustion-under-concurrency, failure-queueing regression, and concurrency-limit enforcement"
    - "scraper/src/shared/persist.test.ts mock updated to match the new ingest.ts import surface; all 4 existing tests still pass"
  key_links:
    - "persistBatch -> translateBatch(supabase, translationWork) -> loadTranslateBatchState (once) -> runWithConcurrencyLimit(items, DEFAULT_TRANSLATE_CONCURRENCY, translateOneListing) -> translateListingFields (engine.ts, unchanged) -> listings.update / translation_queue.upsert|delete"
    - "reserveTranslationSlot(state) is a synchronous, non-async function with no internal await — this is what makes the cap check-and-increment race-free under concurrent dispatch (Node's single-threaded event loop cannot interleave a function body that never yields)"
---

<objective>
Cut the scraper's post-persist translation pipeline from 3-4 Supabase round trips + one fully-blocking LLM call PER LISTING down to one config/cap load per batch plus bounded-concurrency (4-in-flight) LLM dispatch, without changing any observable persistence/failure-queueing behavior.

Purpose: `persistBatch` currently re-reads `scraper_global_config` from scratch for every single listing (`loadTranslateConfig` + `checkAndIncrementUsage`, ~2-3 round trips) and then fully `await`s the Gemini/OpenRouter call before moving to the next listing. This is the dominant source of wall-clock time in a scrape run now that auto-translate runs against every scrape (D-20's original "sequential to respect rate limits" call is being revisited here — see background investigation point 4 — not reversed into unlimited parallelism, just relaxed to config-cached + bounded-concurrent).

Output: `scraper/src/translate/ingest.ts` gains a batch-scoped config/cap loader (`loadTranslateBatchState`) and a bounded-concurrency dispatcher (`translateBatch`) that replace the old per-listing `translateAfterPersist`. `scraper/src/shared/persist.ts`'s `persistBatch` keeps its sequential row-upsert loop untouched but collects translation work items and fires them through `translateBatch` once, after the loop, instead of blocking inline. New `scraper/src/translate/ingest.test.ts` (no prior test file existed) covers the batching, cap-safety-under-concurrency, failure-queueing regression, and concurrency-cap-enforcement behaviors. `scraper/src/shared/persist.test.ts`'s mock is updated to match the new import surface with zero test-case changes.
</objective>

<execution_context>
@/home/guang/Projects/Experiments/.cursor/gsd-core/workflows/execute-plan.md
@/home/guang/Projects/Experiments/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@scraper/src/shared/persist.ts
@scraper/src/translate/ingest.ts
@scraper/src/translate/engine.ts
@scraper/src/shared/persist.test.ts
</context>

<verified_facts>
Facts established during planning — treat as given, do not re-derive:

1. `translateAfterPersist` (ingest.ts) is imported and called ONLY from `scraper/src/shared/persist.ts` (line 113, inside `persistListing`, only reached when the row was inserted or updated — never for the 'skipped' touch-only path at line 73). No other file in the repo imports it. `scraper/src/shared/persist.test.ts` mocks the whole `../translate/ingest.js` module but never asserts on the mock's call count/args — safe to change what persist.ts imports from that module as long as the mock's exported shape still matches.
2. `translation_provider` is loaded by the current `loadTranslateConfig` but never actually consumed anywhere in `translateAfterPersist` — `translateListingFields` always tries Gemini then OpenRouter regardless of this field. This is pre-existing dead-field behavior; preserve it as-is (load it, don't act on it) — acting on it is out of scope for this task.
3. `scraper_global_config` columns confirmed in `supabase/migrations/018_scraper_admin.sql`: `auto_translate boolean`, `daily_translation_cap int`, `translation_provider text check in ('gemini','openrouter')`, `translations_today int`, `translations_reset_date date`. Single row, `id = 1`.
4. `app/api/admin/translation/retry/route.ts` uses a completely separate module (`lib/admin/translate.ts`) for its retry flow — unrelated to `scraper/src/translate/ingest.ts`. Nothing in `app/` or `lib/` breaks from changes made here.
5. `scraper/package.json` has `"test": "vitest run"`, `vitest ^3.0.0`, no `p-limit`/concurrency-limiter dependency — the concurrency limiter must be hand-rolled with zero new dependencies.
6. Root-cause of the out-of-order-write risk considered and designed around: if each of the N concurrent `translateOneListing` calls issued its own `translations_today` UPDATE with its own reserved absolute count, network completion order could differ from reservation order and a later (higher) count's write could land before an earlier (lower) count's write completes, leaving the DB understated. Design below avoids this entirely by doing the in-memory reservation synchronously (correct within the batch, enforced against LLM calls) and flushing to Supabase exactly ONCE per batch, after all translation work has settled — so there is only ever one writer, sequenced after everything it needs to reflect.
</verified_facts>

<tasks>

<task type="tracer">
  <name>Task 1: Batch-scoped config/cap state — replace per-listing loadTranslateConfig + checkAndIncrementUsage</name>
  <files>scraper/src/translate/ingest.ts</files>
  <action>
In `scraper/src/translate/ingest.ts`, delete the private `loadTranslateConfig` and `checkAndIncrementUsage` functions entirely. Replace them with one exported type `TranslateBatchState` carrying: `autoTranslate: boolean`, `translationProvider: 'gemini' | 'openrouter'` (loaded but intentionally unused downstream, per verified_facts #2 — do not wire it into `translateListingFields`), `translationsToday: number`, `dailyCap: number`, and `today: string` (the `YYYY-MM-DD` string computed once, reused for every write this batch instead of recomputing `new Date().toISOString().slice(0, 10)` per listing).

Add one exported async function `loadTranslateBatchState(supabase: SupabaseClient): Promise<TranslateBatchState | null>` that does, in this order: a single SELECT on `scraper_global_config` for `auto_translate, translation_provider, translations_today, translations_reset_date, daily_translation_cap` filtered `eq('id', 1)` via `maybeSingle()`; return `null` immediately on `error` or missing `data` (identical failure mode to today — callers must treat `null` as "auto-translate effectively off"); compute `today`; if `translations_reset_date` (as stored, a `YYYY-MM-DD` string) is lexically less than `today`, reset the in-memory `translationsToday` to `0` and issue exactly one UPDATE (`translations_today: 0, translations_reset_date: today, updated_at: new Date().toISOString()`) — this is the same rollover write the old code did, just now guaranteed to run at most once per batch instead of once per listing that happens to be the first to notice the rollover; then return the assembled `TranslateBatchState`.

Add one private, plain (non-async, no internal `await`) function `reserveTranslationSlot(state: TranslateBatchState): number | null` implementing the check-and-increment purely in memory: if `state.translationsToday >= state.dailyCap` return `null` (cap exhausted — caller must skip, exactly like today's `{ allowed: false }`); otherwise mutate `state.translationsToday += 1` and return the new value. Add a comment directly above this function explaining WHY it is safe without a database transaction: because it contains no `await`, Node's single-threaded event loop cannot interleave two concurrent callers' read-then-write — the old per-listing DB read-then-write pattern was racy under concurrency, this in-memory version is not (cite this as the D-20 revisit's safety argument, not just restating what the code does).

Delete the exported `translateAfterPersist` function for now — Task 2 replaces it with a batch-aware equivalent (`translateBatch`) in this same file. Keep `queueTranslationFailure` and `categoryLabelForSlug` completely untouched. Do not touch `scraper/src/shared/persist.ts` in this task — it still imports the now-deleted `translateAfterPersist`, so the workspace will not type-check until Task 2 lands; that is expected and resolved by Task 2, not a regression to fix here.
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; grep -c "export async function loadTranslateBatchState" src/translate/ingest.ts</automated>
    <automated>cd scraper &amp;&amp; grep -c "function reserveTranslationSlot" src/translate/ingest.ts</automated>
    <automated>cd scraper &amp;&amp; grep -c "function loadTranslateConfig\|function checkAndIncrementUsage" src/translate/ingest.ts</automated>
  </verify>
  <done>`loadTranslateBatchState` and `reserveTranslationSlot` exist exactly once each; `loadTranslateConfig`/`checkAndIncrementUsage` are gone (grep count 0); `queueTranslationFailure` and `categoryLabelForSlug` are unchanged. `persist.ts` is expected to fail to compile until Task 2 — do not attempt to fix it here.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Bounded-concurrency dispatch (translateBatch) wired into persistBatch</name>
  <files>scraper/src/translate/ingest.ts, scraper/src/shared/persist.ts, scraper/src/shared/persist.test.ts</files>
  <behavior>
    - `translateBatch(supabase, [])` (empty work list) returns immediately without calling `loadTranslateBatchState` at all — zero Supabase calls for an all-skipped batch.
    - `translateBatch(supabase, items)` where the loaded state has `autoTranslate: false` makes exactly one SELECT and zero further Supabase writes and zero calls into `translateListingFields`, mirroring today's "auto_translate off -> no DB writes at all" guarantee.
    - Given 5 work items and `dailyCap - translationsToday === 2` remaining budget, exactly 2 of the 5 items result in a `translateListingFields` call and the other 3 are skipped with no queueing side effect (they were never attempted, so `queueTranslationFailure` must not fire for them) — regardless of dispatch concurrency.
    - `persistBatch`'s existing row-upsert/content-hash sequential loop timing and ordering is unchanged — translation dispatch happens strictly after the loop completes, once, and `persistBatch` does not resolve until that dispatch settles.
  </behavior>
  <action>
Still in `scraper/src/translate/ingest.ts`: add an exported constant `export const DEFAULT_TRANSLATE_CONCURRENCY = 4;` near the top (below imports). Add a private async generic function `runWithConcurrencyLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void>` implemented as a small hand-rolled worker pool (no new dependency, per verified_facts #5): keep a single mutable cursor index shared by closures; spawn `Math.min(limit, items.length)` self-recursive "runner" async functions that each loop — take the next unclaimed index, `await worker(items[index])`, then take the next one — until the cursor exceeds `items.length`; `await Promise.all(...)` all runners before returning. This bounds in-flight `worker` calls to `limit` at any time.

Add a private async function `translateOneListing(supabase: SupabaseClient, listingId: string, fields: ListingTranslationFields, state: TranslateBatchState): Promise<void>` containing exactly the body of the old `translateAfterPersist` from the `checkAndIncrementUsage` call onward, adapted to use the new state: call `reserveTranslationSlot(state)`; if it returns `null`, return immediately (cap exhausted for this listing, same as today's `!usage.allowed` early return — no DB write here, that happens once at the very end of `translateBatch`, see below); otherwise proceed exactly as the old code did — call `translateListingFields` with the same `categoryLabelForSlug(fields.category)` mapping and the same `GEMINI_API_KEY`/`OPENROUTER_API_KEY`/`OPENROUTER_FALLBACK_MODEL` env options; on `result.ok`, UPDATE `listings` with the six translated columns, and on that update's own error call `queueTranslationFailure` and return, otherwise DELETE the `translation_queue` row for this `listingId` and return; on `!result.ok`, call `queueTranslationFailure(supabase, listingId, result.error)`. This function does NOT write `translations_today` to Supabase itself — that write is centralized once per batch.

Add exported type `TranslationWorkItem = { listingId: string; fields: ListingTranslationFields }`. Add exported async function `translateBatch(supabase: SupabaseClient, items: TranslationWorkItem[], concurrency: number = DEFAULT_TRANSLATE_CONCURRENCY): Promise<void>`: return immediately if `items.length === 0` (no Supabase calls at all — matches the "skipped-only batch" case); otherwise call `loadTranslateBatchState(supabase)` once; if `!state?.autoTranslate`, return (zero further writes, matching today's off-switch behavior); otherwise capture `const startingCount = state.translationsToday;`, run `await runWithConcurrencyLimit(items, concurrency, (item) => translateOneListing(supabase, item.listingId, item.fields, state))`, then — because `state` was mutated in place by every `reserveTranslationSlot` call across all concurrent workers — if `state.translationsToday !== startingCount`, issue exactly one final UPDATE on `scraper_global_config` writing `{ translations_today: state.translationsToday, translations_reset_date: state.today, updated_at: new Date().toISOString() }`, wrapped so a failure here is caught and logged (e.g. `console.warn`) rather than thrown — this is bookkeeping only; every actual translation/queue effect has already landed regardless of whether this final counter flush succeeds (verified_facts #6 explains why a single end-of-batch write, not N per-listing writes, is the safe design).

In `scraper/src/shared/persist.ts`: change the import from `translateAfterPersist` to `translateBatch` and `type TranslationWorkItem` (from `'../translate/ingest.js'`). In `persistListing`, delete the `await translateAfterPersist(supabase, listingId, {...})` call and its surrounding logic entirely — the function now simply returns `{ result: persistResult, listingId }` right after the upsert resolves; its signature, its row-upsert/content-hash-check logic, and every other line are otherwise byte-identical to today. In `persistBatch`, declare `const translationWork: TranslationWorkItem[] = [];` before the `for` loop; inside the loop, after the existing `const { result: persistResult, listingId } = await persistListing(supabase, result);` line (capture `listingId` from that destructure — it is already returned, just not currently destructured), when `persistResult !== 'skipped'` and `listingId` is non-null, push `{ listingId, fields: { title: result.title, description: descriptionFromListing(result), category: result.category ?? null } }` onto `translationWork` (this exactly mirrors the fields `persistListing` used to pass into `translateAfterPersist`). After the `for` loop ends and before `return stats;`, add `await translateBatch(supabase, translationWork);`.

In `scraper/src/shared/persist.test.ts`, change the `vi.mock('../translate/ingest.js', () => ({ translateAfterPersist: vi.fn().mockResolvedValue(undefined) }))` to instead export `translateBatch: vi.fn().mockResolvedValue(undefined)` — this is the only change needed in this file; every existing `it(...)` block, assertion, and the `createMockSupabase` helper stay exactly as they are today, since they exercise `persistListing` directly and never asserted on the old mock's calls (verified_facts #1).
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; npx tsc --noEmit</automated>
    <automated>cd scraper &amp;&amp; npx vitest run src/shared/persist.test.ts</automated>
    <automated>cd scraper &amp;&amp; grep -c "translateAfterPersist" src/shared/persist.ts src/shared/persist.test.ts</automated>
  </verify>
  <done>`npx tsc --noEmit` passes clean; `npx vitest run src/shared/persist.test.ts` shows all 4 existing tests passing unchanged; `grep -c "translateAfterPersist"` returns 0 in both files (fully replaced by `translateBatch`); `persistListing`'s exported signature/return shape is unchanged; `persistBatch` awaits exactly one `translateBatch(...)` call after its persist loop.</done>
</task>

<task type="auto">
  <name>Task 3: New ingest.test.ts covering batching, cap-safety, failure-queueing, and concurrency cap</name>
  <files>scraper/src/translate/ingest.test.ts</files>
  <action>
Create `scraper/src/translate/ingest.test.ts` (no prior file exists at this path). Mock `./engine.js` with `vi.mock('./engine.js', () => ({ translateListingFields: vi.fn() }))` so each test controls what `translateListingFields` resolves to and can observe/delay concurrent invocations (import the mocked `translateListingFields` for per-test `mockImplementation`/`mockResolvedValue` configuration). Build a local `createMockSupabase(config: { autoTranslate: boolean; translationsToday: number; dailyCap: number; resetDate: string })` factory returning a `{ from }`-shaped object whose behavior is keyed by table name, with every chained method (`select`, `eq`, `maybeSingle`, `update`, `upsert`, `delete`) implemented as `vi.fn()` returning `this`/a resolved value so call counts and call arguments can be asserted per table: `scraper_global_config` supports `select(...).eq('id',1).maybeSingle()` returning the configured row, and `update(...).eq('id',1)` resolving `{ error: null }` while recording every update payload passed to it (a plain array the test can inspect, e.g. `configUpdates: []`, pushed to inside the mock `update` implementation); `listings` supports `update(...).eq('id', listingId)` resolving `{ error: null }`; `translation_queue` supports `select('attempts').eq('listing_id', id).maybeSingle()` returning `{ data: null }` by default (configurable per test to simulate a prior attempt count), `upsert(...)` recording payloads, and `delete().eq('listing_id', id)` resolving `{ error: null }`.

Import `translateBatch`, `loadTranslateBatchState`, `DEFAULT_TRANSLATE_CONCURRENCY`, and `type TranslationWorkItem` from `./ingest.js`. Write these four cases inside `describe('translateBatch', ...)`:

(a) `'loads scraper_global_config exactly once per batch regardless of item count'` — build 5 `TranslationWorkItem`s with distinct `listingId`s, a mock Supabase with `autoTranslate: true, dailyCap: 100, translationsToday: 0`, `translateListingFields` resolving `{ ok: true, translations: <a fixed valid TranslationOutput object> }` for every call; call `await translateBatch(supabase, items)`; assert the `scraper_global_config` table's `select` mock was called exactly once (not 5 times) and `maybeSingle` exactly once.

(b) `'stops dispatching once the daily cap is exhausted mid-batch, with no over-count from concurrent dispatch'` — 5 items, `dailyCap: 2, translationsToday: 0`, `translateListingFields` resolving success after a `setTimeout`/microtask-based artificial delay (so multiple items are genuinely in-flight together, exercising the concurrency path) using the default concurrency; assert `translateListingFields` was called exactly 2 times total (never 3+, proving no over-count even though dispatch is concurrent) and that the final `scraper_global_config` update payload (the single end-of-batch flush) has `translations_today: 2`.

(c) `'still queues a translation failure into translation_queue with incrementing attempts'` — 1 item, `autoTranslate: true, dailyCap: 10, translationsToday: 0`, `translateListingFields` resolving `{ ok: false, queue: true, error: 'All translation providers failed' }`, and the `translation_queue` mock's `maybeSingle` configured to return `{ data: { attempts: 2 } }` for this listing (simulating a prior failed attempt); call `translateBatch`; assert `translation_queue`'s `upsert` mock was called once with a payload containing `attempts: 3` (incrementing from the existing 2, matching `queueTranslationFailure`'s existing `(existing?.attempts ?? 0) + 1` logic) and `status: 'pending'`, and that `listings.update` for translated columns was never called for this item.

(d) `'caps concurrent translateListingFields invocations at the configured limit'` — build 8 items, `dailyCap: 100` (cap not the limiting factor here), and make the mocked `translateListingFields` implementation track concurrency directly: maintain a module-scope-in-test `let inFlight = 0; let maxInFlight = 0;` and have the mock implementation do `inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);` then `await new Promise((r) => setTimeout(r, 5));` then `inFlight -= 1;` before resolving success; call `await translateBatch(supabase, items, 3)` (explicit concurrency override of 3, smaller than the 8 items so the cap is actually exercised); assert `maxInFlight` never exceeded `3` and that all 8 items eventually completed (`translateListingFields` called 8 times total).

Do not modify `scraper/src/shared/persist.test.ts` further in this task — Task 2 already made the one change it needed. After writing the file, run the full scraper suite to confirm zero regressions across all test files (per constraints, 14 pre-existing files plus this new one).
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; npx vitest run src/translate/ingest.test.ts</automated>
    <automated>cd scraper &amp;&amp; npm test</automated>
  </verify>
  <done>`npx vitest run src/translate/ingest.test.ts` passes with all 4 new cases green; `cd scraper &amp;&amp; npm test` passes with zero failures across the whole suite (every pre-existing test file plus the new one); no test makes a real network call, and none of the new tests take longer than a few hundred milliseconds (only small `setTimeout` delays, no real provider latency).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| persistBatch (in-process) → scraper_global_config | Shared mutable daily-cap counter now cached in-process memory for the duration of one batch; must not let a batch under-report or over-report actual translation attempts to the persisted counter used by the NEXT batch/run. |
| Concurrent async dispatch → translateListingFields (Gemini/OpenRouter) | Bounding in-flight calls protects both provider rate limits and the daily spend cap from a burst of simultaneous requests. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-nwf-01 | Tampering | `reserveTranslationSlot` in-memory cap counter | medium | mitigate | Synchronous, no-`await` function body guarantees no interleaving under Node's single-threaded event loop even with concurrent dispatch (Task 1); regression-tested in ingest.test.ts case (b). |
| T-nwf-02 | Denial of Service | Gemini/OpenRouter fetches inside `translateOneListing` | medium | mitigate | `runWithConcurrencyLimit` bounds in-flight calls to `DEFAULT_TRANSLATE_CONCURRENCY` (4), preventing a burst of N-simultaneous requests against either provider; enforced and tested in ingest.test.ts case (d). |
| T-nwf-03 | Tampering | End-of-batch single flush write to `scraper_global_config.translations_today` | low | accept | Only one write per batch, sequenced strictly after all in-batch reservations settle (verified_facts #6) — no write-ordering race is possible since there is exactly one writer per batch; a flush failure is logged, not thrown, and cannot corrupt data already written to `listings`/`translation_queue`. |
| T-nwf-04 | Repudiation | Translation failures | low | accept | Unchanged from today: `queueTranslationFailure`'s upsert into `translation_queue` with incrementing `attempts` and `last_error` is preserved byte-for-byte (Task 2), regression-tested in ingest.test.ts case (c). |

No package-manager installs are introduced by this plan (concurrency limiter is hand-rolled per verified_facts #5) — no supply-chain legitimacy checkpoint required.
</threat_model>

<verification>
1. `cd scraper && npx tsc --noEmit` — clean type-check after the ingest.ts/persist.ts refactor.
2. `cd scraper && npx vitest run src/shared/persist.test.ts` — all 4 existing tests pass unchanged.
3. `cd scraper && npx vitest run src/translate/ingest.test.ts` — all 4 new tests pass (single-load, cap-safety-under-concurrency, failure-queue regression, concurrency-cap enforcement).
4. `cd scraper && npm test` — full suite (14 pre-existing files + 1 new) passes with zero regressions.
5. Manual code check: `persistBatch`'s row-upsert loop remains a plain sequential `for...of` with no concurrency introduced into the upsert/content-hash path; only the post-loop `translateBatch(...)` call is concurrent.
</verification>

<success_criteria>
- A batch of N listings triggers exactly one `scraper_global_config` config/cap load, not N.
- Translation LLM calls for a batch run with bounded concurrency (default 4) instead of strictly one-at-a-time, while the row-persist loop stays sequential and unchanged.
- The daily translation cap is enforced correctly with zero over-count risk under concurrent dispatch (in-memory, synchronous reservation; single end-of-batch flush write).
- `!auto_translate` and cap-exhausted skip paths make zero extra DB writes/LLM calls, exactly as before.
- Translation failure queueing (`translation_queue` upsert with incrementing `attempts`) is unchanged.
- `persistBatch` never returns before all dispatched translation work has settled; persisted rows are never rolled back regardless of translation outcome.
- `cd scraper && npm test` passes in full with zero regressions.
</success_criteria>

<output>
Create `.planning/quick/260811-nwf-speed-up-the-scraper-s-post-persist-tran/260811-nwf-SUMMARY.md` when done, recording: the old vs. new Supabase round-trip count per batch (formula or measured example), the chosen concurrency default and why 4, the end-of-batch single-flush design decision and the write-ordering race it avoids, and the full `npm test` result.
</output>
