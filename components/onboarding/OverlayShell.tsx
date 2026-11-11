'use client';

import { POP_TOKENS, SCREEN_TINT, popDisplayFont } from '@/components/onboarding/pop-theme';
import { cn } from '@/lib/utils';

/**
 * Full-screen on phones, a centered bordered card on wider screens. Sits above the feed header.
 * Carries the onboarding-only "Lagoon Pop" theme: token overrides + a per-screen background tint.
 */
export function OverlayShell({
  labelledBy,
  testId,
  screen,
  children,
}: {
  labelledBy: string;
  testId: string;
  screen?: string;
  children: React.ReactNode;
}) {
  const tint = (screen && SCREEN_TINT[screen]) || SCREEN_TINT.paywall;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId}
      data-screen={screen}
      style={POP_TOKENS}
      className={cn(
        popDisplayFont.variable,
        'fixed inset-0 z-[150] flex justify-center bg-background text-on-surface sm:items-center sm:bg-[#2A2340]/70 sm:p-space-lg',
      )}
    >
      <div
        className={cn(
          'relative flex h-full w-full max-w-[440px] flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-colors duration-300 sm:h-[min(820px,100%)] sm:rounded-[28px] sm:border-2 sm:border-[#1A1A2E] sm:shadow-[6px_6px_0_#1A1A2E]',
          tint,
        )}
      >
        {children}
      </div>
    </div>
  );
}
