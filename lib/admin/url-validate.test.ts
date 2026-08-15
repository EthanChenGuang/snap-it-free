import { describe, expect, it } from 'vitest';
import { validateTargetUrl, validateTargetUrls } from './url-validate';

describe('validateTargetUrl', () => {
  it('accepts subito.it Venice regalo URL (D-03)', () => {
    const result = validateTargetUrl(
      'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
      'subito',
    );
    expect(result).toEqual({ ok: true });
  });

  it('accepts subito.it Padova regalo URL (D-03)', () => {
    const result = validateTargetUrl(
      'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
      'subito',
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects non-Veneto regalo paths for subito', () => {
    const result = validateTargetUrl(
      'https://www.subito.it/annunci-lombardia/regalo/informatica/milano/milano/',
      'subito',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Veneto regalo city template/i);
    }
  });

  it('rejects evil.com (D-10)', () => {
    const result = validateTargetUrl('https://evil.com/listings', 'subito');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not allowed/i);
    }
  });

  it('accepts vinted.it catalog URL (D-17-03)', () => {
    const result = validateTargetUrl(
      'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=venezia',
      'vinted',
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects non-catalog vinted paths (T-17-SSRF)', () => {
    const result = validateTargetUrl(
      'https://www.vinted.it/catalog?search_text=gratis',
      'vinted',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/catalog/i);
    }
  });
});

describe('validateTargetUrls', () => {
  it('accepts multiple valid subito URLs including Padova', () => {
    const result = validateTargetUrls('subito', [
      'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
      'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/padova/padova/',
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('rejects when any URL fails validation', () => {
    const result = validateTargetUrls('subito', [
      'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
      'https://evil.com/listings',
    ]);
    expect(result.ok).toBe(false);
  });
});
