import { describe, expect, it } from 'vitest';
import {
  adminBillingHref,
  adminRunHref,
  adminRunsHref,
  adminSourceHref,
  BILLING_SECTION_IDS,
  parseRunsListFilter,
} from './dashboard-links';

describe('adminBillingHref', () => {
  it('returns billing root without a section', () => {
    expect(adminBillingHref()).toBe('/admin/billing');
  });

  it('returns anchored billing URLs for each section', () => {
    expect(adminBillingHref(BILLING_SECTION_IDS.supabase)).toBe('/admin/billing#billing-supabase');
    expect(adminBillingHref(BILLING_SECTION_IDS.llm)).toBe('/admin/billing#billing-llm');
  });
});

describe('adminRunHref', () => {
  it('encodes run ids in the runs page query', () => {
    expect(adminRunHref('run-abc')).toBe('/admin/runs?id=run-abc');
    expect(adminRunHref('a/b')).toBe('/admin/runs?id=a%2Fb');
  });
});

describe('adminRunsHref', () => {
  it('builds filter and day query strings', () => {
    expect(adminRunsHref()).toBe('/admin/runs');
    expect(adminRunsHref({ filter: 'failed' })).toBe('/admin/runs?filter=failed');
    expect(adminRunsHref({ filter: 'partial', days: 14 })).toBe('/admin/runs?filter=partial&days=14');
    expect(adminRunsHref({ days: 7 })).toBe('/admin/runs');
  });
});

describe('adminSourceHref', () => {
  it('builds source detail paths', () => {
    expect(adminSourceHref('vinted')).toBe('/admin/sources/vinted');
  });
});

describe('parseRunsListFilter', () => {
  it('accepts failed and partial only', () => {
    expect(parseRunsListFilter('failed')).toBe('failed');
    expect(parseRunsListFilter('partial')).toBe('partial');
    expect(parseRunsListFilter('all')).toBeNull();
    expect(parseRunsListFilter(undefined)).toBeNull();
  });
});
