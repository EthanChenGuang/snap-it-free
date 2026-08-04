import { describe, expect, it } from 'vitest';
import {
  CreateJobSchema,
  UpdateGlobalConfigSchema,
  UpdateSourceSchema,
} from './schemas';

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

describe('UpdateGlobalConfigSchema', () => {
  it('accepts global_pause toggle', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ global_pause: true });
    expect(result.success).toBe(true);
  });

  it('accepts auto_translate and daily cap', () => {
    const result = UpdateGlobalConfigSchema.safeParse({
      auto_translate: false,
      daily_translation_cap: 500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive daily cap', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ daily_translation_cap: 0 });
    expect(result.success).toBe(false);
  });
});

describe('CreateJobSchema', () => {
  it('accepts known source slugs', () => {
    const result = CreateJobSchema.safeParse({ source_slug: 'subito' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown source slug', () => {
    const result = CreateJobSchema.safeParse({ source_slug: 'unknown' });
    expect(result.success).toBe(false);
  });
});
