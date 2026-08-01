import type { ListingSource } from '@/lib/listings/types';

export const THRESHOLDS = { subito: 2, facebook: 2, ugc: 3 } as const;

export type AutoHideResult = {
  hide: boolean;
  hiddenReason: 'community_reports' | 'pending_review' | null;
};

export function shouldAutoHide(source: ListingSource, reportCount: number): AutoHideResult {
  const threshold = THRESHOLDS[source];
  if (reportCount >= threshold) {
    return {
      hide: true,
      hiddenReason: source === 'ugc' ? 'pending_review' : 'community_reports',
    };
  }
  return { hide: false, hiddenReason: null };
}
