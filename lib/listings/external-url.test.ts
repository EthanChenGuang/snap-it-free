import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl } from './external-url';

describe('isAllowedExternalUrl', () => {
  it('allows https://www.subito.it/annunci/...', () => {
    expect(
      isAllowedExternalUrl('https://www.subito.it/annunci/veneto/annuncio-123456789'),
    ).toBe(true);
  });

  it('allows https://subito.it/annunci/...', () => {
    expect(isAllowedExternalUrl('https://subito.it/annunci/veneto/annuncio-123')).toBe(true);
  });

  it('allows https://www.vinted.it/items/...', () => {
    expect(
      isAllowedExternalUrl('https://www.vinted.it/items/123456789-free-lamp'),
    ).toBe(true);
  });

  it('allows https://vinted.it/items/...', () => {
    expect(isAllowedExternalUrl('https://vinted.it/items/987654321')).toBe(true);
  });

  it('rejects https://evil.example.com', () => {
    expect(isAllowedExternalUrl('https://evil.example.com/phish')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedExternalUrl('not-a-url')).toBe(false);
  });
});
