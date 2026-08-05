import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RECOMMENDED_SUBITO_SEED_URLS } from './subito-recommended-seed';
import {
  REGALO_CATEGORY_URL_REGEX,
  SUBITO_REGALO_CATALOG,
  buildRegaloCategoryUrl,
  dedupeUrls,
  generateRegaloUrls,
  parseRegaloCategoryUrl,
} from './subito-regalo-catalog';

function spikeVerdictIsPass(): boolean {
  try {
    const spikePath = join(
      process.cwd(),
      '.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md',
    );
    const content = readFileSync(spikePath, 'utf-8');
    return /\*\*Verdict:\*\*\s*PASS/i.test(content);
  } catch {
    return false;
  }
}

/** Shared vectors — admin REGALO_CATEGORY_URL_REGEX must match scraper url-context behavior. */
const SHARED_PARSE_VECTORS = [
  {
    url: 'https://www.subito.it/annunci-veneto/regalo/informatica/venezia/venezia/',
    expected: { region: 'veneto', city: 'venezia', categorySlug: 'informatica' },
  },
  {
    url: 'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
    expected: { region: 'veneto', city: 'padova', categorySlug: 'informatica' },
  },
  {
    url: 'https://www.subito.it/annunci-lombardia/regalo/informatica/milano/milano/',
    expected: null,
  },
] as const;

describe('buildRegaloCategoryUrl', () => {
  it('builds valid HTTPS Padova URL (D-03)', () => {
    const url = buildRegaloCategoryUrl('veneto', 'informatica', 'padova');
    expect(url).toBe('https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/');
    expect(parseRegaloCategoryUrl(url)).toEqual({
      region: 'veneto',
      city: 'padova',
      categorySlug: 'informatica',
    });
  });

  it('builds 34 unique URLs for 17 slugs × venezia+padova (D-06)', () => {
    const slugs = SUBITO_REGALO_CATALOG.map((e) => e.slug);
    expect(slugs).toHaveLength(17);
    const urls = generateRegaloUrls(['venezia', 'padova'], slugs);
    expect(urls).toHaveLength(34);
    expect(new Set(urls).size).toBe(34);
    expect(urls[0]).toBe(
      buildRegaloCategoryUrl('veneto', 'arredamento-casalinghi', 'venezia'),
    );
  });
});

describe('parseRegaloCategoryUrl', () => {
  it.each(SHARED_PARSE_VECTORS)('parses $url', ({ url, expected }) => {
    expect(parseRegaloCategoryUrl(url)).toEqual(expected);
  });

  it('REGALO_CATEGORY_URL_REGEX matches valid paths only', () => {
    for (const { url, expected } of SHARED_PARSE_VECTORS) {
      const pathname = new URL(url).pathname;
      expect(REGALO_CATEGORY_URL_REGEX.test(pathname)).toBe(expected !== null);
    }
  });
});

describe('dedupeUrls', () => {
  it('removes duplicate URLs (D-06)', () => {
    const a = buildRegaloCategoryUrl('veneto', 'informatica', 'padova');
    const result = dedupeUrls([a, a, '  ', a]);
    expect(result).toEqual([a]);
  });
});

describe('RECOMMENDED_SUBITO_SEED_URLS', () => {
  it('length matches Padova spike gate (D-15, D-16)', () => {
    const expectedLength = spikeVerdictIsPass() ? 34 : 17;
    expect(RECOMMENDED_SUBITO_SEED_URLS).toHaveLength(expectedLength);
  });

  it('contains only Venice URLs when spike FAIL', () => {
    if (!spikeVerdictIsPass()) {
      for (const url of RECOMMENDED_SUBITO_SEED_URLS) {
        expect(url).toMatch(/\/venezia\/venezia\/?$/);
        expect(url).not.toMatch(/\/padova\//);
      }
    }
  });
});
