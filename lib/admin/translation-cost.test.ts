import { describe, expect, it } from 'vitest';
import {
  buildCostSummary,
  computeTranslationCostUsd,
  estimateListingCost,
  formatTokenCount,
  formatUsd,
} from './translation-cost';

describe('translation-cost', () => {
  it('formats USD and token counts', () => {
    expect(formatUsd(12.45)).toBe('$12.45');
    expect(formatTokenCount(1_200_000)).toBe('1.2M');
    expect(formatTokenCount(320)).toBe('320');
  });

  it('computes listing cost from attempts', () => {
    const cost = estimateListingCost({
      title: 'Cabina doccia con Jacuzzi vintage',
      attempts: 2,
      provider: 'gemini',
    });
    expect(cost.inputTokens).toBeGreaterThan(100);
    expect(cost.outputTokens).toBe(130);
    expect(cost.costUsd).toBeGreaterThan(0);
    expect(cost.modelLabel).toContain('Gemini');
  });

  it('builds monthly summary with provider split', () => {
    const summary = buildCostSummary({
      translatedThisMonth: 100,
      translatedLastMonth: 80,
      translationsToday: 5,
      primaryProvider: 'gemini',
    });
    expect(summary.monthTotalUsd).toBeGreaterThan(0);
    expect(summary.providers).toHaveLength(2);
    expect(summary.providers[0].percent + summary.providers[1].percent).toBe(100);
    expect(summary.monthOverMonthDeltaPercent).not.toBeNull();
  });

  it('keeps month total >= today when today API calls exceed scraped-this-month count', () => {
    const summary = buildCostSummary({
      translatedThisMonth: 222,
      translatedLastMonth: 180,
      translationsToday: 302,
      primaryProvider: 'openrouter',
    });
    expect(summary.translatedThisMonth).toBe(302);
    expect(summary.monthTotalUsd).toBeGreaterThanOrEqual(summary.todayUsd);
    expect(summary.todayUsd).toBeCloseTo(summary.monthTotalUsd, 10);
  });

  it('computes per-token provider pricing', () => {
    const usd = computeTranslationCostUsd('gemini', 320, 130);
    expect(usd).toBeCloseTo(0.000063, 6);
  });
});
