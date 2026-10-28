import type { AppLanguage } from '@/lib/settings/preferences';

// Prices decided by Guang on 2026-10-25. Stripe prices must match these amounts.
export type PlanId = 'weekly' | 'monthly' | 'yearly';

export type PaywallPlan = {
  id: PlanId;
  priceCents: number;
  currency: 'EUR';
  /** Billing period length in weeks, used for the per-week equivalent. */
  periodWeeks: number;
  highlighted: boolean;
};

const WEEKS_PER_YEAR = 52;

export const PAYWALL_PLANS: readonly PaywallPlan[] = [
  { id: 'weekly', priceCents: 199, currency: 'EUR', periodWeeks: 1, highlighted: false },
  { id: 'monthly', priceCents: 499, currency: 'EUR', periodWeeks: WEEKS_PER_YEAR / 12, highlighted: false },
  { id: 'yearly', priceCents: 1999, currency: 'EUR', periodWeeks: WEEKS_PER_YEAR, highlighted: true },
];

export const DEFAULT_PLAN_ID: PlanId =
  PAYWALL_PLANS.find((plan) => plan.highlighted)?.id ?? PAYWALL_PLANS[0].id;

export function getPlan(id: PlanId): PaywallPlan {
  const plan = PAYWALL_PLANS.find((entry) => entry.id === id);
  if (!plan) throw new Error(`Unknown paywall plan: ${id}`);
  return plan;
}

export function perWeekCents(plan: PaywallPlan): number {
  return Math.round(plan.priceCents / plan.periodWeeks);
}

/**
 * Honest savings of a plan vs paying monthly for the same span, as a whole percent.
 * Returns 0 when the plan is not cheaper, so a tag is only ever shown when it is arithmetically true.
 * Yearly €19.99 vs €4.99×12 = €59.88 → 66%. Floored so the figure never overstates the saving.
 */
export function savingsVsMonthlyPct(plan: PaywallPlan): number {
  const monthly = PAYWALL_PLANS.find((entry) => entry.id === 'monthly');
  if (!monthly || plan.id === 'monthly' || plan.id === 'weekly') return 0;
  const monthlyForSpan = perWeekCents(monthly) * plan.periodWeeks;
  if (monthlyForSpan <= 0) return 0;
  const pct = Math.floor((1 - plan.priceCents / monthlyForSpan) * 100);
  return pct > 0 ? pct : 0;
}

const NUMBER_LOCALE: Record<AppLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-IE',
  it: 'it-IT',
};

export function formatCents(cents: number, currency: PaywallPlan['currency'], language: AppLanguage): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[language], {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
