'use client';

import { SymbolIcon } from '@/components/onboarding/SymbolIcon';

/**
 * Labour-perception checklist shown only while the real teaser request is in flight — no artificial
 * delay. Each line reflects a real answer the user gave.
 */
export function BuildingFeed({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-space-lg" role="status" aria-live="polite">
      <p className="text-body-lg text-on-surface">{title}</p>
      <ul className="mt-space-md flex flex-col gap-space-sm">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-space-sm text-body-md text-on-surface-variant">
            <SymbolIcon name="check_circle" className="text-[20px] text-on-surface" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
