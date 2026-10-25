import { describe, expect, it } from 'vitest';
import { isEntitled } from './entitlement';

const NOW = new Date('2026-10-25T12:00:00.000Z');
const FUTURE_PERIOD = '2026-11-25T12:00:00.000Z';

describe('isEntitled', () => {
  it.each([
    [null, false],
    [{ status: 'active', current_period_end: FUTURE_PERIOD }, true],
    [{ status: 'trialing', current_period_end: null }, true],
    [{ status: 'active', current_period_end: '2026-10-25T11:59:59.000Z' }, false],
    [{ status: 'canceled', current_period_end: FUTURE_PERIOD }, false],
    [{ status: 'incomplete', current_period_end: null }, false],
    [{ status: 'unpaid', current_period_end: FUTURE_PERIOD }, false],
  ])('%o → %s', (row, expected) => {
    expect(isEntitled(row, NOW)).toBe(expected);
  });
});

describe('past_due grace (3 days from when past_due began)', () => {
  const pastDue = (since: string | null | undefined) => ({
    status: 'past_due',
    current_period_end: FUTURE_PERIOD,
    past_due_since: since,
  });

  it('keeps access 3 days minus a minute after entering past_due', () => {
    expect(isEntitled(pastDue('2026-10-22T12:01:00.000Z'), NOW)).toBe(true);
  });

  it('ends access exactly at 3 days and after', () => {
    expect(isEntitled(pastDue('2026-10-22T12:00:00.000Z'), NOW)).toBe(false);
    expect(isEntitled(pastDue('2026-10-22T11:59:00.000Z'), NOW)).toBe(false);
  });

  it('ignores the advanced period end Stripe sets on a failed renewal', () => {
    expect(isEntitled(pastDue('2026-10-01T00:00:00.000Z'), NOW)).toBe(false);
  });

  it('gives no grace before migration 043 adds past_due_since', () => {
    expect(isEntitled(pastDue(undefined), NOW)).toBe(false);
    expect(isEntitled(pastDue(null), NOW)).toBe(false);
  });
});
