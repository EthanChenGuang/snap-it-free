import { describe, expect, it } from 'vitest';
import { UpdateSourceSchema } from './schemas';

describe('UpdateSourceSchema', () => {
  it('rejects interval below 30 minutes (D-14)', () => {
    const result = UpdateSourceSchema.safeParse({ interval_minutes: 29 });
    expect(result.success).toBe(false);
  });

  it('rejects interval above 1440 minutes (D-14)', () => {
    const result = UpdateSourceSchema.safeParse({ interval_minutes: 1441 });
    expect(result.success).toBe(false);
  });

  it('accepts interval at lower bound 30', () => {
    const result = UpdateSourceSchema.safeParse({ interval_minutes: 30 });
    expect(result.success).toBe(true);
  });

  it('accepts interval at upper bound 1440', () => {
    const result = UpdateSourceSchema.safeParse({ interval_minutes: 1440 });
    expect(result.success).toBe(true);
  });
});
