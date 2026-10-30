import { beforeEach, describe, expect, it } from 'vitest';
import { hasPendingCheckout, savePendingCheckout, takePendingCheckout } from './pending-checkout';

describe('pending checkout', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('round-trips a plan for the same source once', () => {
    savePendingCheckout(window.sessionStorage, 'yearly', 'locked', 1_000);
    expect(hasPendingCheckout(window.sessionStorage, 'locked', 2_000)).toBe(true);
    expect(takePendingCheckout(window.sessionStorage, 'locked', 2_000)).toBe('yearly');
    expect(takePendingCheckout(window.sessionStorage, 'locked', 2_000)).toBeNull();
  });

  it('ignores another source without consuming it', () => {
    savePendingCheckout(window.sessionStorage, 'monthly', 'onboarding', 1_000);
    expect(hasPendingCheckout(window.sessionStorage, 'locked', 2_000)).toBe(false);
    expect(takePendingCheckout(window.sessionStorage, 'locked', 2_000)).toBeNull();
    expect(takePendingCheckout(window.sessionStorage, 'onboarding', 2_000)).toBe('monthly');
  });

  it('drops stale entries', () => {
    savePendingCheckout(window.sessionStorage, 'weekly', 'locked', 0);
    const later = 31 * 60 * 1000;
    expect(hasPendingCheckout(window.sessionStorage, 'locked', later)).toBe(false);
    expect(takePendingCheckout(window.sessionStorage, 'locked', later)).toBeNull();
  });

  it('rejects garbage', () => {
    window.sessionStorage.setItem('shoumanwu_pending_checkout_v1', '{"plan":"lifetime","source":"locked","at":1}');
    expect(takePendingCheckout(window.sessionStorage, 'locked', 2)).toBeNull();
    window.sessionStorage.setItem('shoumanwu_pending_checkout_v1', 'not json');
    expect(takePendingCheckout(window.sessionStorage, 'locked', 2)).toBeNull();
  });
});
