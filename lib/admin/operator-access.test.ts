import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isScraperAdminOperatorEmail,
  parseScraperAdminOperatorEmails,
} from './operator-access';

describe('scraper admin operator env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parseScraperAdminOperatorEmails splits comma-separated values', () => {
    vi.stubEnv('SCRAPER_ADMIN_OPERATOR_EMAILS', ' Ops@Example.com , admin@test.dev ');
    expect(parseScraperAdminOperatorEmails()).toEqual(['ops@example.com', 'admin@test.dev']);
  });

  it('isScraperAdminOperatorEmail matches case-insensitively', () => {
    vi.stubEnv('SCRAPER_ADMIN_OPERATOR_EMAILS', 'ops@example.com');
    expect(isScraperAdminOperatorEmail('OPS@example.com')).toBe(true);
    expect(isScraperAdminOperatorEmail('other@example.com')).toBe(false);
  });

  it('falls back to legacy OPERATOR_BOOTSTRAP_EMAILS', () => {
    vi.stubEnv('OPERATOR_BOOTSTRAP_EMAILS', 'legacy@example.com');
    expect(parseScraperAdminOperatorEmails()).toEqual(['legacy@example.com']);
  });
});
