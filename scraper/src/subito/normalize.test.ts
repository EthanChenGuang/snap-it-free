import { describe, expect, it } from 'vitest';
import { extractCategoryFromSubitoUrl } from './normalize.js';
import { parseRegaloCategoryUrl } from './url-context.js';

describe('extractCategoryFromSubitoUrl', () => {
  it('returns first path segment on detail URLs (D-18)', () => {
    expect(
      extractCategoryFromSubitoUrl('https://www.subito.it/informatica/monitor-padova-123.htm'),
    ).toBe('informatica');
  });

  it('returns slug from /regalo/ segment on category listing URLs', () => {
    expect(
      extractCategoryFromSubitoUrl(
        'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
      ),
    ).toBe('informatica');
  });

  it('returns null for invalid URL', () => {
    expect(extractCategoryFromSubitoUrl('not-a-url')).toBeNull();
  });
});

describe('parseRegaloCategoryUrl', () => {
  it('extracts region, city, and categorySlug from Padova regalo URL', () => {
    expect(
      parseRegaloCategoryUrl(
        'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
      ),
    ).toEqual({ region: 'veneto', city: 'padova', categorySlug: 'informatica' });
  });
});
