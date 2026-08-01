import { describe, expect, it } from 'vitest';
import { CreateAlertSchema } from './schemas';

describe('CreateAlertSchema', () => {
  it('rejects empty keyword and zone', () => {
    const result = CreateAlertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects blank keyword with no zone', () => {
    const result = CreateAlertSchema.safeParse({ keyword: '   ' });
    expect(result.success).toBe(false);
  });

  it('accepts keyword-only', () => {
    const result = CreateAlertSchema.safeParse({ keyword: 'bici' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyword).toBe('bici');
      expect(result.data.zone).toBeUndefined();
    }
  });

  it('accepts zone-only', () => {
    const result = CreateAlertSchema.safeParse({ zone: 'centro_storico' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone).toBe('centro_storico');
      expect(result.data.keyword).toBeUndefined();
    }
  });

  it('trims keyword', () => {
    const result = CreateAlertSchema.safeParse({ keyword: '  lampada  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyword).toBe('lampada');
    }
  });

  it('accepts keyword and zone together', () => {
    const result = CreateAlertSchema.safeParse({
      keyword: 'divano',
      zone: 'mestre_marghera',
    });
    expect(result.success).toBe(true);
  });

  it('rejects keyword over 100 characters', () => {
    const result = CreateAlertSchema.safeParse({ keyword: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
