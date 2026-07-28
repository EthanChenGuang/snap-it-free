import { describe, expect, it } from 'vitest';
import { SUBITO_CATEGORY_URLS } from './categories.js';

const VENETO_REGALO_PATTERN = /\/annunci-veneto\/regalo\//;

describe('SUBITO_CATEGORY_URLS', () => {
  it('includes at least one category URL', () => {
    expect(SUBITO_CATEGORY_URLS.length).toBeGreaterThan(0);
  });

  it('matches /annunci-veneto/regalo/ pattern for every URL', () => {
    for (const url of SUBITO_CATEGORY_URLS) {
      expect(url).toMatch(VENETO_REGALO_PATTERN);
    }
  });

  it('does not use ?o= pagination query params', () => {
    for (const url of SUBITO_CATEGORY_URLS) {
      expect(url).not.toContain('?o=');
    }
  });
});
