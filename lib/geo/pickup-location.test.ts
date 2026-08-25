import { describe, expect, it } from 'vitest';
import {
  findCatalogCityAt,
  isWithinUgcPickupBounds,
  nearestCatalogCity,
  pickupFieldsForInsert,
  resolvePickupLocation,
} from './pickup-location';

describe('pickup-location', () => {
  it('treats Mirano as inside the Venezia catalog bbox', () => {
    expect(findCatalogCityAt(45.4934, 12.1084)?.subitoSlug).toBe('venezia');
    expect(resolvePickupLocation(45.4934, 12.1084).isOther).toBe(false);
  });

  it('classifies Zevio as other (outside Verona bbox)', () => {
    const resolved = resolvePickupLocation(45.2128, 11.1333);
    expect(resolved.isOther).toBe(true);
    expect(resolved.catalogCity).toBeNull();
  });

  it('classifies coords outside all bboxes as other with a nearest city reference', () => {
    const resolved = resolvePickupLocation(44.7, 10.5);
    expect(resolved.isOther).toBe(true);
    expect(resolved.nearestCity.subitoSlug).toBe('bologna');
    expect(pickupFieldsForInsert(resolved)).toEqual({
      city: 'bologna',
      region: 'emilia-romagna',
    });
  });

  it('allows pickup within the padded national envelope', () => {
    expect(isWithinUgcPickupBounds(45.434, 12.338)).toBe(true);
    expect(isWithinUgcPickupBounds(45.46, 9.19)).toBe(true);
    expect(isWithinUgcPickupBounds(30, 10)).toBe(false);
  });

  it('returns nearest catalog city by bbox-center distance', () => {
    expect(nearestCatalogCity(45.4934, 12.1084).subitoSlug).toBe('padova');
    expect(nearestCatalogCity(45.434, 12.338).subitoSlug).toBe('venezia');
  });
});
