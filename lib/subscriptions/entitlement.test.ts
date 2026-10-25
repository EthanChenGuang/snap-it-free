import { describe, expect, it } from 'vitest';
import { isEntitled } from './entitlement';

const NOW = new Date('2026-10-25T12:00:00.000Z');

describe('isEntitled', () => {
  it.each([
    [null, false],
    [{ status: 'active', current_period_end: '2026-11-25T12:00:00.000Z' }, true],
    [{ status: 'trialing', current_period_end: null }, true],
    [{ status: 'active', current_period_end: '2026-10-25T11:59:59.000Z' }, false],
    [{ status: 'past_due', current_period_end: '2026-11-25T12:00:00.000Z' }, false],
    [{ status: 'canceled', current_period_end: '2026-11-25T12:00:00.000Z' }, false],
    [{ status: 'incomplete', current_period_end: null }, false],
  ])('%o → %s', (row, expected) => {
    expect(isEntitled(row, NOW)).toBe(expected);
  });
});
