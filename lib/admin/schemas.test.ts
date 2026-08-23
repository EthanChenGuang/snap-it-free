import { describe, expect, it } from 'vitest';
import {
  CreateJobSchema,
  UpdateGlobalConfigSchema,
  UpdateSourceSchema,
  VALIDATE_TARGET_URLS_MAX,
  ValidateTargetUrlsSchema,
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

  it('accepts per-source proxy URL toggle', () => {
    const result = UpdateSourceSchema.safeParse({ use_proxy_url: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.use_proxy_url).toBe(true);
    }
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

  it('accepts proxy_url, alerts, and translation provider (D-20, D-26)', () => {
    const result = UpdateGlobalConfigSchema.safeParse({
      proxy_url: 'http://user:pass@proxy.example:8080',
      telegram_chat_id: '-1001234567890',
      alert_email: 'ops@example.com',
      translation_provider: 'openrouter',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid proxy_url', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ proxy_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts crawl efficiency fields within bounds (D-15-32)', () => {
    const result = UpdateGlobalConfigSchema.safeParse({
      early_stop_k: 5,
      full_refresh_hours: 24,
      max_pages: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects early_stop_k below 1', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ early_stop_k: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects early_stop_k above 50', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ early_stop_k: 51 });
    expect(result.success).toBe(false);
  });

  it('rejects max_pages above 3', () => {
    const result = UpdateGlobalConfigSchema.safeParse({ max_pages: 4 });
    expect(result.success).toBe(false);
  });
});

describe('ValidateTargetUrlsSchema', () => {
  it('accepts full regalo matrix size (153 URLs)', () => {
    const urls = Array.from({ length: 153 }, (_, index) => `https://example.com/${index}`);
    const result = ValidateTargetUrlsSchema.safeParse({ urls });
    expect(result.success).toBe(true);
  });

  it(`rejects more than ${VALIDATE_TARGET_URLS_MAX} URLs`, () => {
    const urls = Array.from(
      { length: VALIDATE_TARGET_URLS_MAX + 1 },
      (_, index) => `https://example.com/${index}`,
    );
    const result = ValidateTargetUrlsSchema.safeParse({ urls });
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

  it('accepts crawl_mode full (D-15-08)', () => {
    const result = CreateJobSchema.safeParse({ source_slug: 'subito', crawl_mode: 'full' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crawl_mode).toBe('full');
    }
  });

  it('defaults crawl_mode to incremental', () => {
    const result = CreateJobSchema.safeParse({ source_slug: 'subito' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crawl_mode).toBe('incremental');
    }
  });

  it('rejects invalid crawl_mode', () => {
    const result = CreateJobSchema.safeParse({ source_slug: 'subito', crawl_mode: 'shadow' });
    expect(result.success).toBe(false);
  });
});
