'use client';

import type { TranslationListingCostDetail } from '@/lib/admin/types';
import { formatUsdCompact } from '@/lib/admin/translation-cost';

type TranslationListingCostPillProps = {
  cost: TranslationListingCostDetail;
  listingId: string;
};

export function TranslationListingCostPill({ cost, listingId }: TranslationListingCostPillProps) {
  const tooltipId = `cost-tip-${listingId}`;

  return (
    <span
      className="relative inline-flex"
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-2 py-0.5 text-xs font-medium font-mono text-emerald-700">
        {formatUsdCompact(cost.costUsd)}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className="translation-queue-cost-tooltip"
      >
        <span className="block font-medium">估算费用 {formatUsdCompact(cost.costUsd)}</span>
        <span className="mt-1 block text-[10px] text-white/80">
          Model: {cost.modelLabel}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-white/90">
          Input: {cost.inputTokens} tokens | Output: {cost.outputTokens} tokens
        </span>
      </span>
    </span>
  );
}
