'use client';

import { pop } from '@/components/onboarding/pop-theme';
import { Sparkle } from '@/components/onboarding/steps/PhotoCollage';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

const ROW_DOTS = ['bg-[#FFC83D]', 'bg-[#2FD3C4]', 'bg-[#F2512D]'] as const;
const ROW_TEXT = ['text-[#1A1A2E]', 'text-[#1A1A2E]', 'text-[#1A1A2E]'] as const;

/** Visual and steps of the "contact the seller without Italian" onboarding page (the title is rendered by the flow). */
export function ContactBubbles() {
  const copy = useMessages().messages.onboarding.contact;
  return (
    <div className="relative mx-auto h-[192px] w-full max-w-[340px]" aria-hidden data-testid="contact-bubbles">
      <div
        className={cn('absolute left-0 top-2 max-w-[88%] -rotate-3 rounded-[24px] bg-white px-space-md py-space-sm', pop.outline, pop.shadowSm)}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#4A4A5E]">
          <span className="h-2 w-2 rounded-full bg-[#F2512D]" />
          {copy.italianLabel}
        </p>
        <p lang="it" className="mt-0.5 text-body-md font-bold text-[#1A1A2E]">
          “{copy.italianBubble}”
        </p>
      </div>
      <span
        className={cn('absolute left-[22%] top-[92px] z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-[#F2512D] text-white', pop.outline)}
      >
        <SymbolIcon name="translate" className="text-[24px]" />
      </span>
      <div
        className={cn('absolute bottom-0 right-0 max-w-[72%] rotate-2 rounded-[24px] bg-[#FFC83D] px-space-md py-space-sm', pop.outline, pop.shadowSm)}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#1A1A2E]">
          <span className="h-2 w-2 rounded-full bg-[#1A1A2E]" />
          {copy.userLabel}
        </p>
        <p className="mt-0.5 text-body-md font-bold text-[#1A1A2E]">“{copy.userBubble}”</p>
      </div>
      <Sparkle className="left-1 top-[120px] h-5 w-5 text-[#00A6A6]" />
      <Sparkle className="right-2 top-0 h-5 w-5 text-[#F2512D]" />
    </div>
  );
}

export function ContactRows() {
  const copy = useMessages().messages.onboarding.contact;
  return (
    <ol role="list" className="mt-space-lg flex flex-col gap-space-sm" data-testid="contact-rows">
      {copy.rows.map((row, index) => (
        <li
          key={row}
          className={cn('flex items-center gap-space-md rounded-full bg-white px-space-sm py-space-xs', pop.outline, pop.shadowSm)}
        >
          <span
            className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-md font-black', pop.outline, ROW_DOTS[index % 3], ROW_TEXT[index % 3])}
            aria-hidden
          >
            {index + 1}
          </span>
          <p className="min-w-0 py-1 text-label-md font-bold leading-snug text-[#1A1A2E]">{row}</p>
        </li>
      ))}
    </ol>
  );
}
