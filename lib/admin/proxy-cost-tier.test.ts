import { describe, expect, it } from 'vitest';
import {
  computeProxyCostTier,
  formatBlockedRatioPercent,
} from './proxy-cost-tier';

describe('computeProxyCostTier', () => {
  it('returns insufficient_data when ratio is null', () => {
    expect(computeProxyCostTier(null).tier).toBe('insufficient_data');
  });

  it('returns direct_free below 0.5', () => {
    expect(computeProxyCostTier(0.3).tier).toBe('direct_free');
    expect(computeProxyCostTier(0.499).tier).toBe('direct_free');
  });

  it('returns webshare_budget from 0.5 up to but not including 0.7', () => {
    expect(computeProxyCostTier(0.5).tier).toBe('webshare_budget');
    expect(computeProxyCostTier(0.55).tier).toBe('webshare_budget');
    expect(computeProxyCostTier(0.699).tier).toBe('webshare_budget');
  });

  it('returns residential_recommended at 0.7 and above', () => {
    expect(computeProxyCostTier(0.7).tier).toBe('residential_recommended');
    expect(computeProxyCostTier(0.75).tier).toBe('residential_recommended');
  });
});

describe('formatBlockedRatioPercent', () => {
  it('formats ratio as percentage', () => {
    expect(formatBlockedRatioPercent(0.025)).toBe('2.5%');
  });

  it('returns null for missing ratio', () => {
    expect(formatBlockedRatioPercent(null)).toBeNull();
  });
});
