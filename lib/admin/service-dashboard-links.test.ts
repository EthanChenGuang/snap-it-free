import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildBillingServiceMeta,
  extractSupabaseProjectRef,
  inferVercelPlanTier,
  planTierLabel,
  resolveFlyAppName,
} from './service-dashboard-links';

describe('inferVercelPlanTier', () => {
  it('treats Hobby as free', () => {
    expect(inferVercelPlanTier('Hobby')).toBe('free');
  });

  it('treats Pro as paid', () => {
    expect(inferVercelPlanTier('Pro')).toBe('paid');
  });
});

describe('resolveFlyAppName', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to fly.toml default app name', () => {
    vi.stubEnv('FLY_APP_NAME', '');
    expect(resolveFlyAppName()).toBe('shoumanwu-scraper');
  });

  it('uses FLY_APP_NAME when set', () => {
    vi.stubEnv('FLY_APP_NAME', 'custom-app');
    expect(resolveFlyAppName()).toBe('custom-app');
  });
});

describe('extractSupabaseProjectRef', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses project ref from Supabase URL', () => {
    vi.stubEnv('SUPABASE_PROJECT_REF', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc123.supabase.co');
    expect(extractSupabaseProjectRef()).toBe('abc123');
  });

  it('prefers SUPABASE_PROJECT_REF env', () => {
    vi.stubEnv('SUPABASE_PROJECT_REF', 'from-env');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc123.supabase.co');
    expect(extractSupabaseProjectRef()).toBe('from-env');
  });
});

describe('buildBillingServiceMeta', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds dashboard URLs from env', () => {
    vi.stubEnv('SUPABASE_PROJECT_REF', 'test-ref');
    vi.stubEnv('FLY_APP_NAME', 'my-scraper');

    const meta = buildBillingServiceMeta(null);

    expect(meta.supabase.planTier).toBe('free');
    expect(meta.supabase.dashboard?.href).toBe('https://supabase.com/dashboard/project/test-ref');
    expect(meta.flyio.dashboard.href).toBe('https://fly.io/apps/my-scraper');
    expect(meta.llm.openrouter.href).toBe('https://openrouter.ai/activity');
    expect(meta.proxy.links.some((link) => link.label.includes('Resend'))).toBe(true);
  });
});

describe('planTierLabel', () => {
  it('maps tiers to Chinese labels', () => {
    expect(planTierLabel('free')).toBe('免费');
    expect(planTierLabel('paid')).toBe('付费');
  });
});
