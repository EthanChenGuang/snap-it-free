'use client';

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
        'relative inline-flex cursor-pointer items-center',
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
      <span className="relative h-5 w-10 rounded-full bg-secondary-fixed after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-outline-variant after:bg-surface-container-lowest after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-outline" />
    </label>
  );
}

export function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-space-md ml-space-xs text-label-md uppercase tracking-wider text-on-secondary-container">
      {children}
    </h2>
  );
}
