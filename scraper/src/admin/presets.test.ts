import { describe, expect, it } from 'vitest';
import { getMaxPoolSize, presetToCrawleeOptions } from './presets.js';

describe('anti-block presets', () => {
  it('conservative/standard/aggressive map to distinct maxPoolSize (D-21)', () => {
    const conservative = getMaxPoolSize('conservative');
    const standard = getMaxPoolSize('standard');
    const aggressive = getMaxPoolSize('aggressive');
    expect(new Set([conservative, standard, aggressive]).size).toBe(3);
    expect(conservative).toBeLessThan(standard);
    expect(standard).toBeLessThan(aggressive);
  });

  it('presetToCrawleeOptions returns full Crawlee mapping', () => {
    expect(presetToCrawleeOptions('standard')).toEqual({
      maxPoolSize: 5,
      maxRequestRetries: 3,
      minConcurrency: 1,
      maxConcurrency: 1,
    });
  });
});
