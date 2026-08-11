import Link from 'next/link';
import { settingsMessages } from '@/components/admin/admin-messages';

type DegradedBannerProps = {
  showSettingsLink?: boolean;
};

export function DegradedBanner({ showSettingsLink = false }: DegradedBannerProps) {
  return (
    <div className="rounded border border-outline-variant bg-surface-container-low p-4">
      <div className="flex gap-3">
        <span
          className="material-symbols-outlined shrink-0 text-[20px] text-secondary"
          aria-hidden
        >
          warning
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-semibold text-on-surface">
            {settingsMessages.degradedBannerTitle}
          </p>
          <p className="text-[15px] leading-relaxed text-on-surface">
            {settingsMessages.degradedBannerBody}
          </p>
          {showSettingsLink ? (
            <Link
              href="/admin/settings"
              className="inline-block text-[14px] font-semibold text-primary underline decoration-outline-variant underline-offset-4 hover:decoration-primary"
            >
              {settingsMessages.degradedBannerSettingsLink}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
