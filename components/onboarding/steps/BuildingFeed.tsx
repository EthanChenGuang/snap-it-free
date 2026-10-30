'use client';

import { pop } from '@/components/onboarding/pop-theme';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { cn } from '@/lib/utils';

/**
 * Labour-perception checklist shown only while the real teaser request is in flight — no artificial
 * delay. Each line reflects a real answer the user gave.
 */
export function BuildingFeed({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={cn('mt-space-lg p-space-lg', pop.card)} role="status" aria-live="polite">
      <p className="flex items-center gap-space-sm text-body-lg font-semibold text-[#1A1A2E]">
        <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#F2512D] border-t-transparent" aria-hidden />
        {title}
      </p>
      <ul className="mt-space-md flex flex-col gap-space-sm">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-space-sm text-body-md text-[#4A4A5E]">
            <SymbolIcon name="check_circle" className="text-[20px] text-[#00A6A6]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
