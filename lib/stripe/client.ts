import Stripe from 'stripe';

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { appInfo: { name: 'snap-it-free' } });
}
