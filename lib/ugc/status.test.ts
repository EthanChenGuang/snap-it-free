import { describe, expect, it } from 'vitest';
import { mapDeliveredTransition, mapReservedTransition } from './status';

describe('mapReservedTransition', () => {
  it('sets status claimed and reserved_at timestamp', () => {
    const now = new Date('2026-08-01T10:00:00.000Z');
    expect(mapReservedTransition(now)).toEqual({
      status: 'claimed',
      reserved_at: '2026-08-01T10:00:00.000Z',
    });
  });
});

describe('mapDeliveredTransition', () => {
  it('sets status expired', () => {
    expect(mapDeliveredTransition()).toEqual({
      status: 'expired',
    });
  });
});
