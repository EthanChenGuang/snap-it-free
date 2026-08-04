import { describe, expect, it } from 'vitest';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';
import { mergeTargetUrls } from './config-loader.js';

describe('mergeTargetUrls', () => {
  it('uses SUBITO_CATEGORY_URLS fallback when DB URLs are empty', () => {
    expect(mergeTargetUrls([], SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
    expect(mergeTargetUrls(null, SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
    expect(mergeTargetUrls(undefined, SUBITO_CATEGORY_URLS)).toEqual([...SUBITO_CATEGORY_URLS]);
  });

  it('prefers DB URLs when present', () => {
    const db = ['https://www.subito.it/custom/'];
    expect(mergeTargetUrls(db, SUBITO_CATEGORY_URLS)).toEqual(db);
  });
});
