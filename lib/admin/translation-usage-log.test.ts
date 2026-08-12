import { describe, expect, it } from 'vitest';
import { resolveTranslationCostUsd } from './translation-cost';

describe('resolveTranslationCostUsd', () => {
  it('prefers provider-reported cost when present', () => {
    expect(resolveTranslationCostUsd('openrouter', 100, 50, 0.002)).toBe(0.002);
  });

  it('falls back to token pricing when reported cost is missing', () => {
    const computed = resolveTranslationCostUsd('gemini', 320, 130);
    expect(computed).toBeGreaterThan(0);
    expect(resolveTranslationCostUsd('gemini', 320, 130, null)).toBe(computed);
  });
});
