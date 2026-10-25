import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN_ID,
  PAYWALL_PLANS,
  formatCents,
  getPlan,
  perWeekCents,
} from './plans';

describe('paywall plan config', () => {
  it('has exactly weekly, monthly, yearly in that order', () => {
    expect(PAYWALL_PLANS.map((plan) => plan.id)).toEqual(['weekly', 'monthly', 'yearly']);
  });

  it('highlights exactly one plan, the yearly one, and preselects it', () => {
    expect(PAYWALL_PLANS.filter((plan) => plan.highlighted).map((plan) => plan.id)).toEqual(['yearly']);
    expect(DEFAULT_PLAN_ID).toBe('yearly');
  });

  it('shows the decided prices and drops the placeholder TODO', () => {
    expect(PAYWALL_PLANS.map((plan) => formatCents(plan.priceCents, plan.currency, 'en'))).toEqual([
      '€1.99',
      '€4.99',
      '€19.99',
    ]);
    expect(PAYWALL_PLANS.map((plan) => formatCents(perWeekCents(plan), plan.currency, 'en'))).toEqual([
      '€1.99',
      '€1.15',
      '€0.38',
    ]);
    const source = readFileSync(path.join(__dirname, 'plans.ts'), 'utf8');
    expect(source).not.toContain('TODO');
  });
});

describe('perWeekCents', () => {
  it('derives the weekly equivalent from price and period', () => {
    expect(perWeekCents({ id: 'weekly', priceCents: 199, currency: 'EUR', periodWeeks: 1, highlighted: false })).toBe(199);
    expect(perWeekCents({ id: 'monthly', priceCents: 520, currency: 'EUR', periodWeeks: 52 / 12, highlighted: false })).toBe(120);
    expect(perWeekCents({ id: 'yearly', priceCents: 2600, currency: 'EUR', periodWeeks: 52, highlighted: true })).toBe(50);
  });

  it('makes yearly the cheapest per week in the shipped table', () => {
    const [weekly, monthly, yearly] = PAYWALL_PLANS.map(perWeekCents);
    expect(yearly).toBeLessThan(monthly);
    expect(monthly).toBeLessThan(weekly);
  });
});

describe('formatCents', () => {
  it('formats euros per locale', () => {
    expect(formatCents(1999, 'EUR', 'en')).toBe('€19.99');
    expect(formatCents(1999, 'EUR', 'it')).toBe('19,99\u00a0€');
    expect(formatCents(1999, 'EUR', 'zh')).toBe('€19.99');
  });
});

describe('getPlan', () => {
  it('throws on an unknown id', () => {
    expect(getPlan('monthly').periodWeeks).toBeCloseTo(4.333, 3);
    expect(() => getPlan('daily' as never)).toThrow('Unknown paywall plan: daily');
  });
});
