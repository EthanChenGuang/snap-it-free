'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type SettingsToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
};

export function SettingsToggle({ checked, disabled, onChange, ariaLabel }: SettingsToggleProps) {
  return (
    <label
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
      />
      <span className="relative h-[31px] w-[51px] rounded-full bg-surface-container-high transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-surface-container-lowest after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
    </label>
  );
}

/** iOS inset grouped card container */
export function SettingsGroupCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Standalone single-row card (e.g. Appearance, My Posts) */
export function SettingsRowCard({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const baseClass = cn(
    'mb-3 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-transform active:scale-[0.98]',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(baseClass, 'text-left')}>
      {children}
    </button>
  );
}

export function SettingsSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-4 text-label-sm font-medium uppercase tracking-wide text-on-surface-variant">
      {children}
    </h2>
  );
}

export function SettingsRowDivider() {
  return <div className="mx-4 border-b border-outline-variant" />;
}

export function SettingsChevron() {
  return (
    <span className="material-symbols-outlined shrink-0 text-label-md text-outline" aria-hidden>
      chevron_right
    </span>
  );
}

export function SettingsAccountCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-6 flex items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** @deprecated Use SettingsGroupCard or SettingsRowCard — kept for gradual migration */
export function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SettingsGroupCard className={className}>
      {children}
    </SettingsGroupCard>
  );
}
