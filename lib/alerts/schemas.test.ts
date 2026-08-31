import { describe, expect, it } from 'vitest';
import { CreateAlertSchema } from './schemas';

describe('CreateAlertSchema', () => {
  it('rejects empty keyword, zone, and city', () => {
    const result = CreateAlertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects blank keyword with no zone or city', () => {
    const result = CreateAlertSchema.safeParse({ keyword: '   ' });
    expect(result.success).toBe(false);
  });

  it('accepts keyword-only', () => {
    const result = CreateAlertSchema.safeParse({ keyword: 'bici' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyword).toBe('bici');
      expect(result.data.zone).toBeUndefined();
      expect(result.data.city).toBeUndefined();
    }
  });

  it('accepts legacy zone-only', () => {
    const result = CreateAlertSchema.safeParse({ zone: 'centro_storico' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone).toBe('centro_storico');
      expect(result.data.keyword).toBeUndefined();
    }
  });

  it('accepts city-only', () => {
    const result = CreateAlertSchema.safeParse({ city: 'milano' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe('milano');
    }
  });

  it('trims keyword', () => {
    const result = CreateAlertSchema.safeParse({ keyword: '  lampada  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyword).toBe('lampada');
    }
  });

  it('accepts keyword and city together', () => {
    const result = CreateAlertSchema.safeParse({
      keyword: 'divano',
      city: 'padova',
    });
    expect(result.success).toBe(true);
  });

  it('rejects keyword over 100 characters', () => {
    const result = CreateAlertSchema.safeParse({ keyword: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
