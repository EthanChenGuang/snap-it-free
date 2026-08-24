export const BILLING_SECTION_IDS = {
  supabase: 'billing-supabase',
  vercel: 'billing-vercel',
  flyio: 'billing-flyio',
  llm: 'billing-llm',
  proxy: 'billing-proxy',
  messages: 'billing-messages',
} as const;

export type BillingSectionId = (typeof BILLING_SECTION_IDS)[keyof typeof BILLING_SECTION_IDS];

export const adminRoutes = {
  dashboard: '/admin',
  sources: '/admin/sources',
  billing: '/admin/billing',
  runs: '/admin/runs',
  rejects: '/admin/rejects',
  translation: '/admin/translation',
  settings: '/admin/settings',
} as const;

export function adminBillingHref(section?: BillingSectionId): string {
  return section ? `${adminRoutes.billing}#${section}` : adminRoutes.billing;
}

export function adminRunHref(runId: string): string {
  return `${adminRoutes.runs}?id=${encodeURIComponent(runId)}`;
}

export type RunsListFilter = 'failed' | 'partial';

export function adminRunsHref(options?: { filter?: RunsListFilter; days?: number }): string {
  const params = new URLSearchParams();
  if (options?.filter) {
    params.set('filter', options.filter);
  }
  if (options?.days != null && options.days !== 7) {
    params.set('days', String(options.days));
  }
  const query = params.toString();
  return query ? `${adminRoutes.runs}?${query}` : adminRoutes.runs;
}

export function adminSourceHref(slug: string): string {
  return `${adminRoutes.sources}/${encodeURIComponent(slug)}`;
}

export function parseRunsListFilter(value: string | undefined | null): RunsListFilter | null {
  if (value === 'failed' || value === 'partial') {
    return value;
  }
  return null;
}
