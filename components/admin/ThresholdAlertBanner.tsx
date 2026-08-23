'use client';

import Link from 'next/link';
import type { ThresholdAlert } from '@/lib/admin/threshold-alerts';
import { adminRoutes } from '@/lib/admin/dashboard-links';
import { cn } from '@/lib/utils';

type ThresholdAlertBannerProps = {
  alerts: ThresholdAlert[];
  onDismiss?: () => void;
  dismissed?: boolean;
};

export function ThresholdAlertBanner({ alerts, onDismiss, dismissed }: ThresholdAlertBannerProps) {
  if (alerts.length === 0 || dismissed) {
    return null;
  }

  const primary = alerts[0]!;
  const extraCount = alerts.length - 1;

  return (
    <div
      className={cn(
        'mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900',
      )}
      role="alert"
      data-testid="threshold-alert-banner"
    >
      <Link href={adminRoutes.billing} className="flex min-w-0 flex-1 items-start gap-3 transition-opacity hover:opacity-90">
        <span className="text-xl leading-none" aria-hidden>
          ⚠️
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-snug">{primary.message}</p>
          {extraCount > 0 ? (
            <ul className="mt-2 space-y-1 text-[13px] text-amber-800/90">
              {alerts.slice(1).map((alert) => (
                <li key={alert.key} className="truncate">
                  {alert.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Link>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg border border-amber-300/60 bg-white/60 px-3 py-1.5 text-[12px] font-medium text-amber-900 transition hover:bg-white"
          aria-label="暂时关闭告警横幅"
        >
          知道了
        </button>
      ) : null}
    </div>
  );
}
