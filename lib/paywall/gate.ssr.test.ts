// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveOnboardingGate } from './gate';

describe('resolveOnboardingGate during SSR', () => {
  it('never shows without a window, even with the flag on', () => {
    expect(typeof window).toBe('undefined');
    expect(resolveOnboardingGate(true)).toBe(false);
  });
});
