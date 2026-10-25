'use client';

/** Full-screen on phones, a centered bordered card on wider screens. Sits above the feed header. */
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
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId}
      data-screen={screen}
      className="fixed inset-0 z-[150] flex justify-center bg-background sm:items-center sm:bg-surface-container-low sm:p-space-lg"
    >
      <div className="flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:h-[min(820px,100%)] sm:rounded-lg sm:border sm:border-outline-variant">
        {children}
      </div>
    </div>
  );
}
