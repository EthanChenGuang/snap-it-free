import { describe, expect, it } from 'vitest';
import { canCreateAlert, MAX_ALERTS } from './limit';

describe('canCreateAlert', () => {
  it('returns false when user already has 5 alerts', () => {
    expect(canCreateAlert(5)).toBe(false);
    expect(canCreateAlert(MAX_ALERTS)).toBe(false);
  });

  it('returns true when user has fewer than 5 alerts', () => {
    expect(canCreateAlert(4)).toBe(true);
    expect(canCreateAlert(0)).toBe(true);
  });
});
