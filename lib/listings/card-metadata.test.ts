import { describe, expect, it } from 'vitest';
import { buildCardMetadata } from './card-metadata';

describe('buildCardMetadata', () => {
  it('renders distance · time when meters present (CARD-02, D-16)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('2.3 km · 3h ago');
  });

  it('renders city · time fallback when no distance (CARD-01, D-19)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: null,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('Venice · 3h ago');
  });

  it('appends reserved suffix when claimed (D-17)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: 'Reserved',
      }),
    ).toBe('2.3 km · 3h ago · Reserved');
  });

  it('handles claimed + no city + no distance (D-19 edge)', () => {
    expect(
      buildCardMetadata({
        distanceMeters: null,
        cityLabel: '',
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: 'Reserved',
      }),
    ).toBe('3h ago · Reserved');
  });

  it('does not include cityLabel when distance shown (D-16)', () => {
    const result = buildCardMetadata({
      distanceMeters: 500,
      cityLabel: 'Venice',
      postedLabel: '1h ago',
      isClaimed: false,
      reservedLabel: 'Reserved',
    });
    expect(result).toBe('500 m · 1h ago');
    expect(result).not.toContain('Venice');
  });

  it('does not append reservedLabel when not claimed', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('2.3 km · 3h ago');
  });

  it('returns base without trailing separator when claimed but reservedLabel empty', () => {
    expect(
      buildCardMetadata({
        distanceMeters: 2300,
        cityLabel: 'Venice',
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: '',
      }),
    ).toBe('2.3 km · 3h ago');
  });
});
