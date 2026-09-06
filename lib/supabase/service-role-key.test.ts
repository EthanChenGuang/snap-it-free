import { afterEach, describe, expect, it } from 'vitest';
import { isLegacyServiceRoleJwt, isNewSecretApiKey, resolveServiceRoleKey } from './service-role-key';

const LEGACY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy';
const SECRET = 'sb_secret_abc123';

describe('service role key helpers', () => {
  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_JWT;
    delete process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY;
  });

  it('detects legacy JWT and new secret prefixes', () => {
    expect(isLegacyServiceRoleJwt(LEGACY)).toBe(true);
    expect(isLegacyServiceRoleJwt(SECRET)).toBe(false);
    expect(isNewSecretApiKey(SECRET)).toBe(true);
  });

  it('returns primary when it is already a legacy JWT', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = LEGACY;
    expect(resolveServiceRoleKey()).toBe(LEGACY);
  });

  it('prefers SUPABASE_SERVICE_ROLE_JWT when primary is sb_secret', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    process.env.SUPABASE_SERVICE_ROLE_JWT = LEGACY;
    expect(resolveServiceRoleKey()).toBe(LEGACY);
  });

  it('falls back to SCRAPER_ADMIN_SERVICE_ROLE_KEY for sb_secret primary', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY = LEGACY;
    expect(resolveServiceRoleKey()).toBe(LEGACY);
  });

  it('returns sb_secret when no legacy JWT is configured', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    expect(resolveServiceRoleKey()).toBe(SECRET);
  });

  it('throws when no key is set', () => {
    expect(() => resolveServiceRoleKey()).toThrow(/Missing SUPABASE_SERVICE_ROLE_KEY/);
  });
});
