import type { PlanId } from '@/lib/paywall/plans';

type Env = Record<string, string | undefined>;

export type StripeConfig =
  | {
      enabled: true;
      secretKey: string;
      webhookSecret: string;
      prices: Record<PlanId, string>;
    }
  | { enabled: false; reason: 'missing_env' | 'live_key_rejected' };

const PRICE_ENV: Record<PlanId, string> = {
  weekly: 'STRIPE_PRICE_WEEKLY',
  monthly: 'STRIPE_PRICE_MONTHLY',
  yearly: 'STRIPE_PRICE_YEARLY',
};

/** Payments are on only when every variable is set. Live keys are refused until a deliberate switch. */
export function readStripeConfig(env: Env = process.env): StripeConfig {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const weekly = env[PRICE_ENV.weekly]?.trim();
  const monthly = env[PRICE_ENV.monthly]?.trim();
  const yearly = env[PRICE_ENV.yearly]?.trim();
  if (!secretKey || !webhookSecret || !weekly || !monthly || !yearly) {
    return { enabled: false, reason: 'missing_env' };
  }
  if (secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')) {
    return { enabled: false, reason: 'live_key_rejected' };
  }
  return { enabled: true, secretKey, webhookSecret, prices: { weekly, monthly, yearly } };
}

export function planForPriceId(prices: Record<PlanId, string>, priceId: string | null | undefined): PlanId | null {
  const match = (Object.keys(prices) as PlanId[]).find((plan) => prices[plan] === priceId);
  return match ?? null;
}
