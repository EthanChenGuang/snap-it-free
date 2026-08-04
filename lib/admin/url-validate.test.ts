import { describe, expect, it } from 'vitest';
import { validateTargetUrl } from './url-validate';

describe('validateTargetUrl', () => {
  it('accepts subito.it Venice regalo URL (D-10)', () => {
    const result = validateTargetUrl(
      'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
      'subito',
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects evil.com (D-10)', () => {
    const result = validateTargetUrl('https://evil.com/listings', 'subito');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not allowed/i);
    }
  });
});
