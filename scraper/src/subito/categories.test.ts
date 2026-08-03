import { describe, expect, it } from 'vitest';
import { SUBITO_CATEGORY_URLS } from './categories.js';

const VENICE_REGALO_PATTERN = /\/annunci-veneto\/regalo\/[^/]+\/venezia\/venezia\/?$/;

describe('SUBITO_CATEGORY_URLS', () => {
  it('includes at least one category URL', () => {
    expect(SUBITO_CATEGORY_URLS.length).toBeGreaterThan(0);
  });

  it('matches Venice comune-scoped regalo path for every URL', () => {
    for (const url of SUBITO_CATEGORY_URLS) {
      expect(url).toMatch(VENICE_REGALO_PATTERN);
    }
  });

  it('does not use ?o= pagination query params', () => {
    for (const url of SUBITO_CATEGORY_URLS) {
      expect(url).not.toContain('?o=');
    }
  });
});
