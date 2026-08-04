import { describe, expect, it } from 'vitest';
import { cannotRemoveLast, cannotRemoveSelf, isOperatorEmail } from './require-operator';

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
