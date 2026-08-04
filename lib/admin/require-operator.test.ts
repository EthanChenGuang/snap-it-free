import { describe, expect, it } from 'vitest';
import {
  assertCanRemoveOperator,
  cannotRemoveLast,
  cannotRemoveSelf,
  canEnableSource,
  isOperatorEmail,
} from './require-operator';

describe('allowlist guard helpers', () => {
  const allowlist = ['ops@example.com', 'admin@example.com'];

  it('isOperatorEmail returns true for listed email (D-28)', () => {
    expect(isOperatorEmail('ops@example.com', allowlist)).toBe(true);
    expect(isOperatorEmail('  OPS@example.com  ', allowlist)).toBe(true);
  });

  it('isOperatorEmail returns false for unlisted email', () => {
    expect(isOperatorEmail('stranger@evil.com', allowlist)).toBe(false);
  });

  it('cannotRemoveSelf is true when actor matches target (D-46)', () => {
    expect(cannotRemoveSelf('ops@example.com', 'ops@example.com')).toBe(true);
    expect(cannotRemoveSelf('OPS@example.com', 'ops@example.com')).toBe(true);
  });

  it('cannotRemoveSelf is false for different emails', () => {
    expect(cannotRemoveSelf('ops@example.com', 'admin@example.com')).toBe(false);
  });

  it('cannotRemoveLast is true when removing the only operator (D-47)', () => {
    expect(cannotRemoveLast(['solo@example.com'], 'solo@example.com')).toBe(true);
  });

  it('cannotRemoveLast is false when other operators remain', () => {
    expect(cannotRemoveLast(allowlist, 'ops@example.com')).toBe(false);
  });
});

describe('assertCanRemoveOperator', () => {
  const allowlist = ['ops@example.com', 'admin@example.com'];

  it('blocks self-delete (D-46)', () => {
    expect(assertCanRemoveOperator('ops@example.com', 'ops@example.com', allowlist)).toEqual({
      allowed: false,
      reason: 'self',
    });
  });

  it('blocks deleting the last operator (D-47)', () => {
    expect(
      assertCanRemoveOperator('ops@example.com', 'solo@example.com', ['solo@example.com']),
    ).toEqual({
      allowed: false,
      reason: 'last',
    });
  });

  it('allows deleting another operator when others remain', () => {
    expect(assertCanRemoveOperator('ops@example.com', 'admin@example.com', allowlist)).toEqual({
      allowed: true,
    });
  });
});

describe('canEnableSource', () => {
  it('allows enabling live sources', () => {
    expect(canEnableSource('live', true)).toBe(true);
  });

  it('rejects enabling coming_soon sources', () => {
    expect(canEnableSource('coming_soon', true)).toBe(false);
  });

  it('allows disabling coming_soon sources', () => {
    expect(canEnableSource('coming_soon', false)).toBe(true);
  });
});
