import { describe, expect, it } from 'vitest';
import {
  isRegaloCategoryUrl,
  locationHintsFromUrl,
  lookupMunicipalityCentroid,
  resolveCoords,
} from './extract.js';

describe('isRegaloCategoryUrl', () => {
  it('accepts Venice-scoped comune category URLs', () => {
    expect(
      isRegaloCategoryUrl(
        'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
      ),
    ).toBe(true);
  });

  it('rejects detail pages', () => {
    expect(
      isRegaloCategoryUrl(
        'https://www.subito.it/arredamento-casalinghi/divano-letto-venezia-655938204.htm',
      ),
    ).toBe(false);
  });
});

describe('lookupMunicipalityCentroid', () => {
  it('resolves a municipality followed by a bracketed province code', () => {
    const hit = lookupMunicipalityCentroid('Venezia (VE)');
    expect(hit?.matchedName).toBe('Venezia');
    expect(hit?.lat).toBeCloseTo(45.434);
  });

  it('prefers a specific locality over the comune-wide name', () => {
    const hit = lookupMunicipalityCentroid('Mestre | Venezia (VE)');
    expect(hit?.matchedName).toBe('Mestre');
  });

  it('does not resolve Lido di Jesolo to the Venice Lido centroid', () => {
    expect(lookupMunicipalityCentroid('Lido di Jesolo (VE)')).toBeNull();
  });

  it('returns null for a locality outside the three zones', () => {
    expect(lookupMunicipalityCentroid('Chioggia (VE)')).toBeNull();
  });
});

describe('locationHintsFromUrl', () => {
  it('extracts locality tokens from the detail slug', () => {
    const hints = locationHintsFromUrl(
      'https://www.subito.it/arredamento-casalinghi/mobili-camera-matrimoniale-marghera-venezia-655961839.htm',
    );
    expect(hints).toContain('marghera');
  });
});

describe('resolveCoords', () => {
  it('returns coordinates from raw-html latitude/longitude keys', () => {
    const html = '{"latitude": 45.434, "longitude": 12.338}';
    const result = resolveCoords(html, '');
    expect(result.source).toBe('raw-html');
    expect(result.lat).toBeCloseTo(45.434);
    expect(result.lng).toBeCloseTo(12.338);
  });

  it('rejects coordinates outside the Venice bbox as out-of-bbox', () => {
    const html = '{"latitude": 45.9, "longitude": 12.5}';
    const result = resolveCoords(html, 'Venezia (VE)');
    expect(result).toEqual({ lat: null, lng: null, source: 'out-of-bbox' });
  });

  it('falls back to centroid from location text when HTML has no coords', () => {
    const result = resolveCoords('<html></html>', 'Venezia (VE)');
    expect(result.source).toBe('centroid');
    expect(result.matchedName).toBe('Venezia');
    expect(result.lat).toBeCloseTo(45.434);
  });

  it('prefers Marghera from the URL slug over comune-wide Venezia location text', () => {
    const url =
      'https://www.subito.it/arredamento-casalinghi/mobili-camera-matrimoniale-marghera-venezia-655961839.htm';
    const result = resolveCoords('<html></html>', 'Venezia (VE)', url);
    expect(result.source).toBe('centroid');
    expect(result.matchedName).toBe('Marghera');
    expect(result.lat).toBeCloseTo(45.459);
  });

  it('returns none when neither HTML nor location yield coordinates', () => {
    const result = resolveCoords('<html></html>', 'Padova (PD)');
    expect(result).toEqual({ lat: null, lng: null, source: 'none' });
  });
});
