import { rejectsMessages } from '@/components/admin/admin-messages';

const REASON_FILTERS = [
  { value: '', label: rejectsMessages.filterAllReasons },
  { value: 'outside venice', label: rejectsMessages.reasonOutsideVenice },
  { value: 'duplicate', label: rejectsMessages.reasonDuplicate },
  { value: 'keyword', label: rejectsMessages.reasonKeywordFilter },
  { value: 'price', label: rejectsMessages.reasonPriceOutlier },
  { value: 'missing', label: rejectsMessages.reasonMissingData },
] as const;

export { REASON_FILTERS };

export function mapRejectReasonLabel(reason: string): string {
  const lower = reason.toLowerCase();

  if (
    lower.includes('outside venice') ||
    lower.includes('location mismatch') ||
    lower.includes('geo')
  ) {
    return rejectsMessages.reasonOutsideVenice;
  }
  if (lower.includes('duplicate')) {
    return rejectsMessages.reasonDuplicate;
  }
  if (lower.includes('keyword') || lower.includes('price pattern') || lower.includes('matched price')) {
    return rejectsMessages.reasonKeywordFilter;
  }
  if (lower.includes('price outlier') || lower.includes('outlier')) {
    return rejectsMessages.reasonPriceOutlier;
  }
  if (lower.includes('missing')) {
    return rejectsMessages.reasonMissingData;
  }

  return reason;
}

/** Parse reject reason for detail panel rule analysis. */
export function extractRuleDetail(reason: string): {
  strategy: string;
  rawReason: string;
  matchedPattern: string | null;
} {
  const strategy = mapRejectReasonLabel(reason);
  const priceMatch = reason.match(/matched price pattern:\s*(.+)/i);
  return {
    strategy,
    rawReason: reason,
    matchedPattern: priceMatch?.[1]?.trim() ?? null,
  };
}

export function extractSnippetText(raw: Record<string, unknown>): {
  title: string | null;
  description: string | null;
  preview: string;
} {
  const title = typeof raw.title === 'string' ? raw.title : null;
  const description = typeof raw.description === 'string' ? raw.description : null;
  const preview = [title, description].filter(Boolean).join(' — ') || '—';
  return { title, description, preview };
}

export function matchesReasonFilter(reason: string, filter: string): boolean {
  if (!filter) {
    return true;
  }

  const lower = reason.toLowerCase();
  const needle = filter.toLowerCase();

  if (needle === 'outside venice') {
    return (
      lower.includes('outside venice') ||
      lower.includes('location') ||
      lower.includes('geo')
    );
  }
  if (needle === 'keyword') {
    return (
      lower.includes('keyword') ||
      lower.includes('price pattern') ||
      lower.includes('matched price')
    );
  }
  if (needle === 'price') {
    return lower.includes('price') && !lower.includes('price pattern');
  }

  return lower.includes(needle);
}
