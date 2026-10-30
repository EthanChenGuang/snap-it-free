import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuth = vi.fn();
const getSubscriptionForUser = vi.fn();
const applySubscriptionState = vi.fn();
const fake = {
  webhooks: new Stripe('sk_test_signing_only').webhooks,
  subscriptions: { retrieve: vi.fn() },
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
};

vi.mock('@/lib/supabase/auth', () => ({ requireAuth: () => requireAuth() }));
vi.mock('@/lib/subscriptions/store', () => ({
  getSubscriptionForUser: (id: string) => getSubscriptionForUser(id),
  applySubscriptionState: (state: unknown) => applySubscriptionState(state),
}));
vi.mock('@/lib/stripe/client', () => ({ createStripeClient: () => fake }));

const checkout = await import('./checkout/route');
const checkoutReturn = await import('./checkout/return/route');
const portal = await import('./portal/route');
const webhook = await import('./webhook/route');

const WEBHOOK_SECRET = 'whsec_test_secret';
const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_WEEKLY: 'price_w',
  STRIPE_PRICE_MONTHLY: 'price_m',
  STRIPE_PRICE_YEARLY: 'price_y',
};
const USER = { id: 'user-1', email: 'u@example.test' };
const ORIGIN = 'https://app.example.test';

function stubStripeEnv() {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const subscriptionPayload = {
  id: 'sub_1',
  object: 'subscription',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  metadata: { user_id: 'user-1' },
  items: { object: 'list', data: [{ price: { id: 'price_m' }, current_period_end: 1_824_000_000 }] },
};

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of Object.keys(ENV)) vi.stubEnv(key, '');
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/stripe/checkout', () => {
  it('answers 503 payments_disabled without Stripe env, so the paywall keeps "coming soon"', async () => {
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'yearly' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'payments_disabled' });
  });

  it('needs a signed-in user and a known plan', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValueOnce(null);
    expect((await checkout.POST(post('/api/stripe/checkout', { plan: 'yearly' }))).status).toBe(401);
    requireAuth.mockResolvedValueOnce(USER);
    expect((await checkout.POST(post('/api/stripe/checkout', { plan: 'daily' }))).status).toBe(400);
  });

  it('refuses a second subscription', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValue({ status: 'active', current_period_end: null, stripe_customer_id: 'cus_1' });
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'yearly' }));
    expect(res.status).toBe(409);
  });

  it('creates a subscription Checkout session carrying the user id', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValue(null);
    fake.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.test/s/1' });
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'monthly' }));
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/s/1' });
    expect(fake.checkout.sessions.create.mock.calls[0][0]).toEqual({
      mode: 'subscription',
      line_items: [{ price: 'price_m', quantity: 1 }],
      customer_email: 'u@example.test',
      client_reference_id: 'user-1',
      metadata: { user_id: 'user-1' },
      subscription_data: { metadata: { user_id: 'user-1' } },
      success_url: `${ORIGIN}/api/stripe/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ORIGIN}/?checkout=cancel`,
    });
  });
});

describe('Stripe and unexpected failures', () => {
  // What Stripe throws for a misconfigured price; the message carries the id, never the key.
  const noSuchPrice = () =>
    new Stripe.errors.StripeInvalidRequestError({
      type: 'invalid_request_error',
      code: 'resource_missing',
      message: "No such price: 'price_m'",
    });

  function captureErrorLog() {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let logged = '';
    return {
      text: () => logged,
      // Read the calls before restoring: mockRestore() clears them.
      restore: () => {
        logged = JSON.stringify(spy.mock.calls);
        spy.mockRestore();
      },
    };
  }

  it('checkout answers 502 stripe_error as JSON and logs the Stripe code, never the key', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValue(null);
    fake.checkout.sessions.create.mockRejectedValue(noSuchPrice());
    const log = captureErrorLog();
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'monthly' }));
    log.restore();
    expect(res.status).toBe(502);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ error: 'stripe_error' });
    expect(body).not.toContain('sk_test');
    expect(log.text()).toContain('resource_missing');
    expect(log.text()).toContain('No such price');
    expect(log.text()).not.toContain(ENV.STRIPE_SECRET_KEY);
  });

  it('redacts a key that appears inside a Stripe error message', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValue(null);
    fake.checkout.sessions.create.mockRejectedValue(
      new Stripe.errors.StripeAuthenticationError({ type: 'authentication_error', message: `Invalid API Key provided: ${ENV.STRIPE_SECRET_KEY}` }),
    );
    const log = captureErrorLog();
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'monthly' }));
    log.restore();
    expect(res.status).toBe(502);
    expect(log.text()).toContain('Invalid API Key provided');
    expect(log.text()).not.toContain(ENV.STRIPE_SECRET_KEY);
  });

  it('checkout answers 500 internal_error as JSON when the subscription read throws', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockRejectedValue(new Error('connection reset'));
    const log = captureErrorLog();
    const res = await checkout.POST(post('/api/stripe/checkout', { plan: 'monthly' }));
    log.restore();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'internal_error' });
  });

  it('portal answers 502 stripe_error as JSON when Stripe rejects the customer', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValue({ stripe_customer_id: 'cus_gone', status: 'canceled', current_period_end: null });
    fake.billingPortal.sessions.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({ type: 'invalid_request_error', code: 'resource_missing', message: "No such customer: 'cus_gone'" }),
    );
    const log = captureErrorLog();
    const res = await portal.POST(post('/api/stripe/portal', {}));
    log.restore();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'stripe_error' });
  });

  it('portal answers 500 internal_error as JSON when auth throws', async () => {
    stubStripeEnv();
    requireAuth.mockRejectedValue(new Error('auth backend down'));
    const log = captureErrorLog();
    const res = await portal.POST(post('/api/stripe/portal', {}));
    log.restore();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'internal_error' });
  });

  it('checkout return still redirects to pending when auth throws', async () => {
    stubStripeEnv();
    requireAuth.mockRejectedValue(new Error('auth backend down'));
    const log = captureErrorLog();
    const res = await checkoutReturn.GET(new Request(`${ORIGIN}/api/stripe/checkout/return?session_id=cs_1`));
    log.restore();
    expect(res.headers.get('location')).toBe(`${ORIGIN}/?checkout=pending`);
  });
});

describe('GET /api/stripe/checkout/return', () => {
  it('syncs the subscription for the session owner and redirects to success', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    fake.checkout.sessions.retrieve.mockResolvedValue({ client_reference_id: 'user-1', subscription: subscriptionPayload });
    applySubscriptionState.mockResolvedValue(true);
    const res = await checkoutReturn.GET(new Request(`${ORIGIN}/api/stripe/checkout/return?session_id=cs_1`));
    expect(res.headers.get('location')).toBe(`${ORIGIN}/?checkout=success`);
    expect(applySubscriptionState.mock.calls[0][0]).toMatchObject({ p_user_id: 'user-1', p_plan: 'monthly', p_status: 'active' });
  });

  it('does not sync a session that belongs to someone else', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    fake.checkout.sessions.retrieve.mockResolvedValue({ client_reference_id: 'user-2', subscription: subscriptionPayload });
    const res = await checkoutReturn.GET(new Request(`${ORIGIN}/api/stripe/checkout/return?session_id=cs_1`));
    expect(res.headers.get('location')).toBe(`${ORIGIN}/?checkout=pending`);
    expect(applySubscriptionState.mock.calls).toEqual([]);
  });
});

describe('POST /api/stripe/portal', () => {
  it('opens the Customer Portal for the stored customer, 404 without one', async () => {
    stubStripeEnv();
    requireAuth.mockResolvedValue(USER);
    getSubscriptionForUser.mockResolvedValueOnce(null);
    expect((await portal.POST(post('/api/stripe/portal', {}))).status).toBe(404);

    getSubscriptionForUser.mockResolvedValueOnce({ stripe_customer_id: 'cus_1', status: 'active', current_period_end: null });
    fake.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.test/p/1' });
    const res = await portal.POST(post('/api/stripe/portal', {}));
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.test/p/1' });
    expect(fake.billingPortal.sessions.create.mock.calls[0][0]).toEqual({
      customer: 'cus_1',
      return_url: `${ORIGIN}/settings`,
    });
  });
});

describe('POST /api/stripe/webhook', () => {
  const event = {
    id: 'evt_1',
    object: 'event',
    type: 'customer.subscription.updated',
    created: 1_792_000_000,
    data: { object: subscriptionPayload },
  };
  const payload = JSON.stringify(event);
  const sign = (body: string, secret = WEBHOOK_SECRET) =>
    fake.webhooks.generateTestHeaderString({ payload: body, secret });

  it('rejects missing and invalid signatures before touching the database', async () => {
    stubStripeEnv();
    expect((await webhook.POST(post('/api/stripe/webhook', payload))).status).toBe(400);
    const forged = await webhook.POST(post('/api/stripe/webhook', payload, { 'stripe-signature': sign(payload, 'whsec_wrong') }));
    expect(forged.status).toBe(400);
    expect(await forged.json()).toEqual({ error: 'invalid_signature' });
    const tampered = payload.replace('"active"', '"trialing"');
    expect((await webhook.POST(post('/api/stripe/webhook', tampered, { 'stripe-signature': sign(payload) }))).status).toBe(400);
    expect(applySubscriptionState.mock.calls).toEqual([]);
  });

  it('applies a correctly signed subscription update', async () => {
    stubStripeEnv();
    applySubscriptionState.mockResolvedValue(true);
    const res = await webhook.POST(post('/api/stripe/webhook', payload, { 'stripe-signature': sign(payload) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, outcome: 'applied' });
    expect(applySubscriptionState.mock.calls[0][0]).toEqual({
      p_user_id: 'user-1',
      p_stripe_customer_id: 'cus_1',
      p_stripe_subscription_id: 'sub_1',
      p_status: 'active',
      p_plan: 'monthly',
      p_price_id: 'price_m',
      p_current_period_end: '2027-10-20T02:40:00.000Z',
      p_cancel_at_period_end: false,
      p_last_event_at: '2026-10-14T17:46:40.000Z',
    });
  });

  it('returns 500 so Stripe retries when the write fails', async () => {
    stubStripeEnv();
    applySubscriptionState.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await webhook.POST(post('/api/stripe/webhook', payload, { 'stripe-signature': sign(payload) }));
    expect(res.status).toBe(500);
  });

  it('answers 503 when payments are not configured', async () => {
    expect((await webhook.POST(post('/api/stripe/webhook', payload, { 'stripe-signature': 't=1,v1=x' }))).status).toBe(503);
  });
});
