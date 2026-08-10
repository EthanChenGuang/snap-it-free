import { describe, expect, it } from 'vitest';
import { formatDistance } from './format-distance';

describe('formatDistance', () => {
  it('renders meters under 1000 m (D-15)', () => {
    expect(formatDistance(350)).toBe('350 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('renders km at 1000 m+ with one decimal (D-15)', () => {
    expect(formatDistance(2300)).toBe('2.3 km');
  });
});
