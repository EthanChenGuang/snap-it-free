import { describe, expect, it } from 'vitest';
import { resolveCityLabel, VENICE_CENTER } from './resolve-city-label';

const LABELS = { venice: 'Venice', padova: 'Padova' };

describe('resolveCityLabel', () => {
  it('resolves near Venice historic center to venice label', () => {
    expect(resolveCityLabel(45.434, 12.338, LABELS)).toBe('Venice');
  });

  it('resolves near Padova center to padova label', () => {
    expect(resolveCityLabel(45.41, 11.88, LABELS)).toBe('Padova');
  });

  it('resolves exact tie to venice label (ties favor Venice)', () => {
    // Equidistant from Venice (45.44, 12.33) and Padova (45.41, 11.88) centers
    expect(resolveCityLabel(45.425, 12.105, LABELS)).toBe('Venice');
  });
});

describe('VENICE_CENTER', () => {
  it('equals { lat: 45.44, lng: 12.33 } (D-27)', () => {
    expect(VENICE_CENTER).toEqual({ lat: 45.44, lng: 12.33 });
  });
});
