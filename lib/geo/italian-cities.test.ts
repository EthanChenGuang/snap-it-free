import { describe, expect, it } from 'vitest';
import {
  ITALIAN_CITIES,
  buildRegaloCategoryUrl,
  inCityBbox,
  parseRegaloCategoryPath,
} from './italian-cities';

describe('italian-cities catalog', () => {
  it('includes nine supported cities', () => {
    expect(ITALIAN_CITIES).toHaveLength(9);
    expect(ITALIAN_CITIES.map((city) => city.subitoSlug)).toEqual([
      'venezia',
      'padova',
      'milano',
      'firenze',
      'roma',
      'napoli',
      'perugia',
      'torino',
      'prato',
    ]);
  });

  it('builds multi-region regalo URLs', () => {
    expect(buildRegaloCategoryUrl('lombardia', 'informatica', 'milano')).toBe(
      'https://www.subito.it/annunci-lombardia/regalo/informatica/milano/milano/',
    );
    expect(buildRegaloCategoryUrl('lazio', 'informatica', 'roma')).toBe(
      'https://www.subito.it/annunci-lazio/regalo/informatica/roma/roma/',
    );
  });

  it('parses multi-region paths and rejects region/city mismatches', () => {
    expect(
      parseRegaloCategoryPath('/annunci-lombardia/regalo/informatica/milano/milano/'),
    ).toEqual({
      region: 'lombardia',
      city: 'milano',
      categorySlug: 'informatica',
    });
    expect(
      parseRegaloCategoryPath('/annunci-veneto/regalo/informatica/milano/milano/'),
    ).toBeNull();
  });

  it('validates city bboxes', () => {
    expect(inCityBbox(45.46, 9.19, 'milano')).toBe(true);
    expect(inCityBbox(45.46, 9.19, 'venezia')).toBe(false);
  });
});
