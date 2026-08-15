import { describe, expect, it, vi } from 'vitest';
import {
  classifySessionProbeUrl,
  hasAuthCookie,
  loadFacebookSession,
  type SessionProbeResult,
} from './session.js';
import { encryptSession } from '../../../lib/admin/crypto.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

describe('classifySessionProbeUrl (D-18-09)', () => {
  it('detects login redirect URL as session_expired', () => {
    const cases: Array<[string, SessionProbeResult]> = [
      ['https://www.facebook.com/login/?next=https%3A%2F%2Fwww.facebook.com%2Fmarketplace', 'session_expired'],
      ['https://facebook.com/login/', 'session_expired'],
      ['https://www.facebook.com/marketplace/venice/search/?query=gratis', 'valid'],
    ];

    for (const [url, expected] of cases) {
      expect(classifySessionProbeUrl(url)).toBe(expected);
    }
  });

  it('detects checkpoint URLs as session_expired', () => {
    expect(
      classifySessionProbeUrl('https://www.facebook.com/checkpoint/?next=marketplace'),
    ).toBe('session_expired');
  });
});

describe('hasAuthCookie (D-18-12)', () => {
  it('requires c_user cookie', () => {
    expect(hasAuthCookie([{ name: 'xs', value: '1', domain: '.facebook.com', path: '/' }])).toBe(
      false,
    );
    expect(
      hasAuthCookie([{ name: 'c_user', value: '123', domain: '.facebook.com', path: '/' }]),
    ).toBe(true);
  });
});

describe('loadFacebookSession (D-18-11)', () => {
  it('throws session_missing when session_enc null and no FB_SESSION_JSON', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { session_enc: null }, error: null }),
          }),
        }),
      }),
    };

    await expect(loadFacebookSession(supabase as never, 'facebook')).rejects.toThrow(
      /session_missing/,
    );
  });

  it('decrypts session_enc via SCRAPER_SECRETS_KEY', async () => {
    const payload = JSON.stringify({
      cookies: [{ name: 'c_user', value: '999', domain: '.facebook.com', path: '/' }],
    });
    const sessionEnc = encryptSession(payload, TEST_KEY);
    vi.stubEnv('SCRAPER_SECRETS_KEY', TEST_KEY);

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { session_enc: sessionEnc }, error: null }),
          }),
        }),
      }),
    };

    const session = await loadFacebookSession(supabase as never, 'facebook');
    expect(session.cookies[0]?.name).toBe('c_user');
    vi.unstubAllEnvs();
  });
});
