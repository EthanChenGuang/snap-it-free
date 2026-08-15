import { describe, expect, it } from 'vitest';
import { classifySessionProbeUrl, type SessionProbeResult } from './session.js';

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
