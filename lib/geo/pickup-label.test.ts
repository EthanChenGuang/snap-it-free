import { describe, expect, it } from 'vitest';
import {
  combinedPickupDisplayLabel,
  formatCombinedPlaceLabel,
  geocodeFallbackLabel,
  pickupDisplayLabel,
} from './pickup-label';
import { messages as itMessages } from '@/messages/it';

describe('formatCombinedPlaceLabel', () => {
  it('combines locality and catalog city when they differ', () => {
    expect(formatCombinedPlaceLabel('Mirano', 'Venezia')).toBe('Mirano · Venezia');
  });

  it('dedupes when names match ignoring case and accents', () => {
    expect(formatCombinedPlaceLabel('Venezia', 'Venezia')).toBe('Venezia');
    expect(formatCombinedPlaceLabel('Venice', 'Venice')).toBe('Venice');
  });

  it('falls back to catalog when locality is empty', () => {
    expect(formatCombinedPlaceLabel('', 'Venezia')).toBe('Venezia');
    expect(formatCombinedPlaceLabel('  ', 'Padova')).toBe('Padova');
  });

  it('uses custom formatter from i18n', () => {
    const formatted = formatCombinedPlaceLabel('Mirano', 'Venezia', (a, b) => `${a}, area di ${b}`);
    expect(formatted).toBe('Mirano, area di Venezia');
  });
});

describe('geocodeFallbackLabel', () => {
  it('returns empty fallback outside catalog bboxes', () => {
    expect(geocodeFallbackLabel(45.2128, 11.1333, itMessages)).toBe('');
  });

  it('returns catalog label inside bbox while geocode loads', () => {
    expect(geocodeFallbackLabel(45.434, 12.338, itMessages)).toBe(
      itMessages.feed.cityVenice,
    );
  });
});

describe('combinedPickupDisplayLabel', () => {
  it('combines Mirano locality with Venezia catalog for metro coords', () => {
    const label = combinedPickupDisplayLabel(
      'Mirano',
      45.4934,
      12.1084,
      itMessages,
      itMessages.selectLocation.combinedPlaceLabel,
    );
    expect(label).toBe('Mirano · Venezia');
  });

  it('returns catalog only when locality matches catalog label', () => {
    const catalog = pickupDisplayLabel(45.434, 12.338, itMessages);
    const label = combinedPickupDisplayLabel(
      catalog,
      45.434,
      12.338,
      itMessages,
      itMessages.selectLocation.combinedPlaceLabel,
    );
    expect(label).toBe(catalog);
  });
});
