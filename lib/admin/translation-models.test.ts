import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODEL, resolveGeminiModel } from './translation-models';

describe('resolveGeminiModel', () => {
  it('defaults to gemini-flash-latest when unset', () => {
    expect(resolveGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-flash-latest');
  });

  it('prefers explicit model override', () => {
    expect(resolveGeminiModel('gemini-3-flash-preview')).toBe('gemini-3-flash-preview');
  });
});
