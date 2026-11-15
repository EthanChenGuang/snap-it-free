import Link from 'next/link';

type SimpleTitleBarProps = {
  title: string;
  /** When set, shows a back arrow on the left that goes to this path. */
  backHref?: string;
  backLabel?: string;
};

/** Centered page title bar for Favorites and Settings (D-35/D-45). */
export function SimpleTitleBar({ title, backHref, backLabel }: SimpleTitleBarProps) {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-outline-variant bg-surface">
      <div className="relative mx-auto max-w-container-max px-gutter py-space-md text-center">
        {backHref && (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-surface-container active:opacity-80"
          >
            <span className="material-symbols-outlined text-on-surface" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        )}
        <h1 className="text-h3 font-semibold text-on-surface">{title}</h1>
      </div>
    </header>
  );
}
