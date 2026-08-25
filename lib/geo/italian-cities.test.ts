import { describe, expect, it } from 'vitest';
import {
  ITALIAN_CITIES,
  buildRegaloCategoryUrl,
  cityBboxCenter,
  inCityBbox,
  parseRegaloCategoryPath,
} from './italian-cities';

describe('italian-cities catalog', () => {
  it('includes thirteen supported cities', () => {
    expect(ITALIAN_CITIES).toHaveLength(13);
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
      'bologna',
      'brescia',
      'genova',
      'verona',
    ]);
  });

  it('builds multi-region regalo URLs', () => {
    expect(buildRegaloCategoryUrl('lombardia', 'informatica', 'milano')).toBe(
      'https://www.subito.it/annunci-lombardia/regalo/informatica/milano/milano/',
    );
    expect(buildRegaloCategoryUrl('lazio', 'informatica', 'roma')).toBe(
      'https://www.subito.it/annunci-lazio/regalo/informatica/roma/roma/',
    );
    expect(buildRegaloCategoryUrl('emilia-romagna', 'informatica', 'bologna')).toBe(
      'https://www.subito.it/annunci-emilia-romagna/regalo/informatica/bologna/bologna/',
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

  it('returns bbox center for catalog cities', () => {
    expect(cityBboxCenter('milano')).toEqual({ lat: 45.45, lng: 9.15 });
    expect(cityBboxCenter('padova')).toEqual({ lat: 45.4, lng: 11.85 });
  });
});
