import type Stripe from 'stripe';
import { createStripeClient } from './client';
import { readStripeConfig, type StripeConfig } from './config';

export type EnabledStripe = { config: Extract<StripeConfig, { enabled: true }>; stripe: Stripe };

/** Null when payments are not configured (or a live key was supplied); callers answer 503. */
export function getStripe(): EnabledStripe | null {
  const config = readStripeConfig();
  if (!config.enabled) return null;
  return { config, stripe: createStripeClient(config.secretKey) };
}

export const PAYMENTS_DISABLED = { error: 'payments_disabled' } as const;
