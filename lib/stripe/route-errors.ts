import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe masks keys in its own messages; this is a second guard so a key never reaches the logs.
const SECRET_PATTERN = /\b(sk|rk|pk)_(test|live)_[A-Za-z0-9*]+|\bwhsec_[A-Za-z0-9*]+/g;

function redact(text: string): string {
  return text.replace(SECRET_PATTERN, '[redacted]');
}

/** Logs one structured line (type, code, redacted message), never the error object or the request. */
export function logStripeRouteError(tag: string, error: unknown): 'stripe' | 'internal' {
  if (error instanceof Stripe.errors.StripeError) {
    console.error(`[stripe] ${tag} failed`, {
      type: error.type,
      code: error.code ?? null,
      message: redact(error.message),
    });
    return 'stripe';
  }
  console.error(`[stripe] ${tag} failed`, {
    type: error instanceof Error ? error.name : typeof error,
    message: redact(error instanceof Error ? error.message : String(error)),
  });
  return 'internal';
}

/**
 * Turns a thrown error inside a Stripe route into a JSON answer the client can map:
 * 502 `stripe_error` for Stripe SDK errors (upstream), 500 `internal_error` for anything else.
 */
export function stripeRouteError(tag: string, error: unknown): NextResponse {
  return logStripeRouteError(tag, error) === 'stripe'
    ? NextResponse.json({ error: 'stripe_error' }, { status: 502 })
    : NextResponse.json({ error: 'internal_error' }, { status: 500 });
}
