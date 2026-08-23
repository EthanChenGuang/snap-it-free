'use client';

import Link from 'next/link';
import type { AdminAlert } from '@/lib/admin/types';
import type { MaintenanceState } from '@/components/admin/MaintenanceCard';
import { AnimatedCount } from '@/components/admin/AnimatedCount';
import { translationMessages } from '@/components/admin/admin-messages';
import { useTranslationQueuePollingContext } from '@/components/admin/TranslationQueuePollingProvider';
import { formatUtcTimestamp } from '@/lib/admin/format';
import {
  adminRoutes,
  adminRunHref,
  adminRunsHref,
} from '@/lib/admin/dashboard-links';
import { cn } from '@/lib/utils';

type CoreHealthSectionProps = {
  globalPause: boolean;
  pauseSaving: boolean;
  lastSyncAt: string | null;
  alerts: AdminAlert[];
  maintenance: Pick<MaintenanceState, 'preview' | 'loading' | 'error' | 'handlePreview' | 'handleExecute'>;
  onGlobalToggle: () => void;
};

function CompactTile({
  label,
  icon,
  children,
  href,
  ariaLabel,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  href?: string;
  ariaLabel?: string;
}) {
  const head = (
    <div className="dashboard-compact-tile-head">
      <span className="dashboard-control-tile-label">{label}</span>
      <span className="material-symbols-outlined dashboard-control-tile-icon" aria-hidden>
        {icon}
      </span>
    </div>
  );

  if (href) {
    return (
      <div className="dashboard-compact-tile dashboard-compact-tile-interactive">
        <Link href={href} className="dashboard-compact-tile-overlay" tabIndex={-1} aria-label={ariaLabel ?? label} />
        <div className="dashboard-compact-tile-content">{head}</div>
        <div className="dashboard-compact-tile-body dashboard-compact-tile-body-interactive">{children}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-compact-tile">
      {head}
      <div className="dashboard-compact-tile-body">{children}</div>
    </div>
  );
}

function TranslationQueueTile() {
  const { pendingCount, isBulkTranslating, retryAllPending } = useTranslationQueuePollingContext();

  return (
    <CompactTile label="待翻译队列" icon="translate">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
            <AnimatedCount value={pendingCount} />
          </p>
          <Link href={adminRoutes.translation} className="dashboard-metric-link mt-0.5 inline-block text-[12px]">
            进入队列 →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void retryAllPending()}
          disabled={isBulkTranslating || pendingCount === 0}
          className="dashboard-metric-action shrink-0"
        >
          {isBulkTranslating
            ? translationMessages.retryAllPendingProcessing
            : translationMessages.translationQueueRunNow}
        </button>
      </div>
    </CompactTile>
  );
}

function AlertsPanel({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <section className="dashboard-alerts-panel dashboard-alerts-panel-stretch">
      <header className="dashboard-alerts-panel-head">
        <h2 className="dashboard-alerts-panel-title">
          <Link href={adminRunsHref({ filter: 'failed' })} className="dashboard-panel-title-link">
            最近告警
          </Link>
        </h2>
        <Link href={adminRunsHref({ filter: 'failed' })} className="dashboard-alerts-count-link">
          <span className="font-mono text-[11px] tabular-nums text-[#86868b]">{alerts.length} 条</span>
        </Link>
      </header>

      {alerts.length === 0 ? (
        <p className="dashboard-alerts-empty">
          暂无告警记录。
          <Link href={adminRoutes.runs} className="dashboard-metric-link ml-1">
            查看运行记录
          </Link>
        </p>
      ) : (
        <ul className="dashboard-alerts-list dashboard-alerts-list-scroll">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link href={adminRunHref(alert.id)} className="dashboard-alert-item">
                <span className="material-symbols-outlined dashboard-alert-icon" aria-hidden>
                  warning
                </span>
                <div className="dashboard-alert-body">
                  <span className="dashboard-alert-source">{alert.source}</span>
                  <span className="dashboard-alert-message">{alert.message}</span>
                </div>
                <time className="dashboard-alert-time">{formatUtcTimestamp(alert.timestamp)}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CoreHealthSection({
  globalPause,
  pauseSaving,
  lastSyncAt,
  alerts,
  maintenance,
  onGlobalToggle,
}: CoreHealthSectionProps) {
  const { preview, loading, error, handlePreview, handleExecute } = maintenance;

  return (
    <section
      className="dashboard-core-health mb-8 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-6"
      aria-label="核心状态与快速操作"
    >
      <div className="flex flex-col gap-3 lg:col-span-5">
        <CompactTile label="全局状态" icon="tune" href={adminRoutes.settings} ariaLabel="打开系统设置">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              {globalPause ? '已暂停' : '运行中'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={globalPause}
              aria-busy={pauseSaving || undefined}
              aria-label="全局暂停"
              disabled={pauseSaving}
              onClick={onGlobalToggle}
              className={cn('sources-ios-toggle', pauseSaving && 'sources-ios-toggle-busy')}
            >
              <span
                className={cn(
                  'sources-ios-toggle-track',
                  globalPause && 'sources-ios-toggle-track-on',
                )}
                aria-hidden
              />
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[11px] tabular-nums text-[#86868b]">
            同步 {lastSyncAt ? formatUtcTimestamp(lastSyncAt) : '—'}
          </p>
        </CompactTile>

        <TranslationQueueTile />

        <CompactTile label="数据库维护" icon="cleaning_services">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {preview ? (
                <>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#1d1d1f]">{preview.total}</p>
                  <p className="font-mono text-[11px] tabular-nums text-[#86868b]">待清理记录</p>
                </>
              ) : (
                <p className="truncate text-[12px] text-[#86868b]">过期 listing · 30 天前审计行</p>
              )}
              {error ? (
                <p className="mt-0.5 font-mono text-[11px] text-[#ff3b30]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading !== null}
                className="dashboard-metric-action"
              >
                {loading === 'preview' ? '加载中…' : 'Preview cleanup'}
              </button>
              {preview && preview.total > 0 ? (
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={loading !== null}
                  className="dashboard-metric-action dashboard-metric-action-primary"
                >
                  {loading === 'execute' ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </div>
        </CompactTile>
      </div>

      <div className="flex min-h-0 lg:col-span-7">
        <AlertsPanel alerts={alerts} />
      </div>
    </section>
  );
}
