import { describe, expect, it } from 'vitest';
import { checkTranslationCap } from './translation-cap';

describe('checkTranslationCap', () => {
  it('at cap returns pauseTranslate true and scrapeAllowed true (D-43)', () => {
    const result = checkTranslationCap(500, 500);
    expect(result).toEqual({ pauseTranslate: true, scrapeAllowed: true });
  });

  it('below cap allows translation', () => {
    const result = checkTranslationCap(499, 500);
    expect(result).toEqual({ pauseTranslate: false, scrapeAllowed: true });
  });
});
