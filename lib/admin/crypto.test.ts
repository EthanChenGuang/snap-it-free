import { describe, expect, it } from 'vitest';
import { decryptProxy, encryptProxy } from './crypto';

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
