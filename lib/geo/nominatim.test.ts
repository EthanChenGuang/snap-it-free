import { describe, expect, it } from 'vitest';
import {
  extractLocalityLabel,
  resolvePlaceLabelFromNominatim,
  type NominatimReverseResponse,
} from './nominatim';

describe('extractLocalityLabel', () => {
  it('prefers city over town and county', () => {
    expect(
      extractLocalityLabel({
        county: 'Provincia di Treviso',
        town: 'Treviso',
        city: 'Treviso',
      }),
    ).toBe('Treviso');
  });

  it('falls back through town and municipality', () => {
    expect(extractLocalityLabel({ municipality: 'Mestre' })).toBe('Mestre');
    expect(extractLocalityLabel({ town: 'Marghera' })).toBe('Marghera');
  });

  it('returns null when no locality fields exist', () => {
    expect(extractLocalityLabel({ country: 'Italia' })).toBeNull();
    expect(extractLocalityLabel(undefined)).toBeNull();
  });
});

describe('resolvePlaceLabelFromNominatim', () => {
  it('uses address locality when present', () => {
    const payload: NominatimReverseResponse = {
      display_name: 'Treviso, Veneto, Italia',
      address: { town: 'Treviso', county: 'Provincia di Treviso' },
    };
    expect(resolvePlaceLabelFromNominatim(payload)).toBe('Treviso');
  });

  it('falls back to first segment of display_name', () => {
    expect(
      resolvePlaceLabelFromNominatim({
        display_name: 'Mestre, Venezia, Veneto, Italia',
      }),
    ).toBe('Mestre');
  });

  it('returns null for empty payloads', () => {
    expect(resolvePlaceLabelFromNominatim({})).toBeNull();
  });
});
