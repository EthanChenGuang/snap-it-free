import { describe, expect, it } from 'vitest';
import { decryptProxy, decryptSession, encryptProxy, encryptSession } from './crypto';

// 32-byte key encoded as base64 (openssl rand -base64 32)
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

describe('encryptProxy / decryptProxy', () => {
  it('roundtrips proxy URL with SCRAPER_SECRETS_KEY fixture (D-20)', () => {
    const plaintext = 'http://user:pass@proxy.example:8080';
    const encrypted = encryptProxy(plaintext, TEST_KEY);
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.tag).toBeTruthy();
    expect(encrypted.data).toBeTruthy();
    expect(decryptProxy(encrypted, TEST_KEY)).toBe(plaintext);
  });

  it('rejects invalid key length', () => {
    expect(() => encryptProxy('x', Buffer.alloc(16).toString('base64'))).toThrow(
      /32 bytes/,
    );
  });
});

describe('encryptSession / decryptSession (D-18-11)', () => {
  it('roundtrips operator cookie JSON with c_user fixture', () => {
    const plaintext = JSON.stringify({
      cookies: [
        {
          name: 'c_user',
          value: '100012345678901',
          domain: '.facebook.com',
          path: '/',
        },
      ],
    });
    const encrypted = encryptSession(plaintext, TEST_KEY);
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.tag).toBeTruthy();
    expect(encrypted.data).toBeTruthy();
    expect(decryptSession(encrypted, TEST_KEY)).toBe(plaintext);
  });
});
