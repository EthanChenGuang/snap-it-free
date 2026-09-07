import { afterEach, describe, expect, it } from 'vitest';
import { resolveServiceRoleKey } from './service-role-key';

const LEGACY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy';
const SECRET = 'sb_secret_abc123';

describe('resolveServiceRoleKey', () => {
  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_JWT;
    delete process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY;
  });

  it('returns the primary key', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    expect(resolveServiceRoleKey()).toBe(SECRET);
  });

  it('keeps the primary key even when a legacy JWT is also configured', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    process.env.SUPABASE_SERVICE_ROLE_JWT = LEGACY;
    process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY = LEGACY;
    expect(resolveServiceRoleKey()).toBe(SECRET);
  });

  it('falls back to SUPABASE_SERVICE_ROLE_JWT when primary is unset', () => {
    process.env.SUPABASE_SERVICE_ROLE_JWT = LEGACY;
    expect(resolveServiceRoleKey()).toBe(LEGACY);
  });

  it('falls back to SCRAPER_ADMIN_SERVICE_ROLE_KEY last', () => {
    process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY = LEGACY;
    expect(resolveServiceRoleKey()).toBe(LEGACY);
  });

  it('throws when no key is set', () => {
    expect(() => resolveServiceRoleKey()).toThrow(/Missing SUPABASE_SERVICE_ROLE_KEY/);
  });
});
