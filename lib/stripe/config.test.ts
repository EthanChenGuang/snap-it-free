import { describe, expect, it } from 'vitest';
import { planForPriceId, readStripeConfig } from './config';

const FULL = {
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
  STRIPE_PRICE_WEEKLY: 'price_w',
  STRIPE_PRICE_MONTHLY: 'price_m',
  STRIPE_PRICE_YEARLY: 'price_y',
};

describe('readStripeConfig', () => {
  it('enables payments only when every variable is set', () => {
    expect(readStripeConfig(FULL)).toEqual({
      enabled: true,
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_123',
      prices: { weekly: 'price_w', monthly: 'price_m', yearly: 'price_y' },
    });
    expect(readStripeConfig({ ...FULL, STRIPE_PRICE_YEARLY: ' ' })).toEqual({ enabled: false, reason: 'missing_env' });
    expect(readStripeConfig({})).toEqual({ enabled: false, reason: 'missing_env' });
  });

  it('refuses live keys', () => {
    expect(readStripeConfig({ ...FULL, STRIPE_SECRET_KEY: 'sk_live_abc' })).toEqual({
      enabled: false,
      reason: 'live_key_rejected',
    });
  });
});

describe('planForPriceId', () => {
  it('maps a configured price back to its plan', () => {
    const prices = { weekly: 'price_w', monthly: 'price_m', yearly: 'price_y' };
    expect(planForPriceId(prices, 'price_m')).toBe('monthly');
    expect(planForPriceId(prices, 'price_other')).toBeNull();
    expect(planForPriceId(prices, null)).toBeNull();
  });
});
