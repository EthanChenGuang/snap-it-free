'use client';

import { SymbolIcon } from '@/components/onboarding/SymbolIcon';

/**
 * A lock-screen-style stack of example notifications, explicitly labelled "Example" so it is never
 * mistaken for real matches (honesty rule — no fabricated live alerts before the user has any).
 */
export function AlertsMock({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div
      className="relative mt-space-lg rounded-2xl border border-outline-variant bg-surface-container-low p-space-md"
      aria-hidden
    >
      <span className="absolute right-space-md top-space-md rounded-full bg-on-surface px-space-sm py-0.5 text-label-sm text-background">
        {label}
      </span>
      <ul className="flex flex-col gap-space-sm pt-space-lg">
        {lines.map((line, index) => (
          <li
            key={index}
            className="flex items-center gap-space-sm rounded-xl border border-outline-variant bg-background px-space-md py-space-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
              <SymbolIcon name="notifications" className="text-[18px] text-on-surface" />
            </span>
            <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
