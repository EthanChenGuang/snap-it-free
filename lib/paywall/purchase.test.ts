import { describe, expect, it } from 'vitest';
import { checkoutOutcome, restoreOutcome } from './purchase';

describe('checkoutOutcome', () => {
  it('maps the checkout route responses to paywall states', () => {
    expect(checkoutOutcome(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1' })).toEqual({
      kind: 'redirect',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
    expect(checkoutOutcome(503, { error: 'payments_disabled' })).toEqual({ kind: 'show', state: 'comingSoon' });
    expect(checkoutOutcome(401, { error: 'sign_in_required' })).toEqual({ kind: 'show', state: 'signInRequired' });
    expect(checkoutOutcome(409, { error: 'already_subscribed' })).toEqual({ kind: 'show', state: 'alreadySubscribed' });
    expect(checkoutOutcome(500, null)).toEqual({ kind: 'show', state: 'error' });
  });

  it('never redirects to a non-https or missing url', () => {
    expect(checkoutOutcome(200, { url: 'javascript:alert(1)' })).toEqual({ kind: 'show', state: 'error' });
    expect(checkoutOutcome(200, {})).toEqual({ kind: 'show', state: 'error' });
  });
});

describe('restoreOutcome', () => {
  it('reloads for an active subscriber, otherwise explains why nothing changed', () => {
    expect(restoreOutcome({ signedIn: true, active: true })).toBe('reload');
    expect(restoreOutcome({ signedIn: true, active: false })).toBe('nothing');
    expect(restoreOutcome({ signedIn: false, active: false })).toBe('signIn');
    expect(restoreOutcome(null)).toBe('signIn');
  });
});
