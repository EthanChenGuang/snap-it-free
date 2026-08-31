import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isScraperAdminOperatorEmail,
  parseScraperAdminOperatorEmails,
  resolveUserEmail,
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

describe('resolveUserEmail', () => {
  it('prefers top-level user.email', () => {
    expect(
      resolveUserEmail({
        id: '1',
        email: 'ops@example.com',
        user_metadata: { email: 'meta@example.com' },
      } as never),
    ).toBe('ops@example.com');
  });

  it('falls back to user_metadata.email for Google OAuth sessions', () => {
    expect(
      resolveUserEmail({
        id: '1',
        user_metadata: { email: 'chen.guang.regis@gmail.com' },
        identities: [{ identity_data: { email: 'other@example.com' } }],
      } as never),
    ).toBe('chen.guang.regis@gmail.com');
  });

  it('falls back to identity email when needed', () => {
    expect(
      resolveUserEmail({
        id: '1',
        identities: [{ identity_data: { email: 'chen.guang.regis@gmail.com' } }],
      } as never),
    ).toBe('chen.guang.regis@gmail.com');
  });
});
