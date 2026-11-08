'use client';

import { pop } from '@/components/onboarding/pop-theme';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

/** Photo-only card with the FREE badge, for bundled illustrative photos (Stitch screen f1f5f2ef…, 2026-11-08). */
export function PhotoCard({ src, tilt = 0 }: { src: string; tilt?: number }) {
  const { messages } = useMessages();
  return (
    <div className={cn('w-[46%] shrink-0 select-none bg-white p-1.5', pop.card, 'rounded-2xl')} style={{ rotate: `${tilt}deg` }} aria-hidden>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#F3E2CF]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
        <span className="absolute left-1.5 top-1.5 z-[2] rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0.5 text-[11px] font-black uppercase text-[#1A1A2E]">
          {messages.listing.free}
        </span>
      </div>
    </div>
  );
}
