'use client';

import Link from 'next/link';
import type { AdminAlert } from '@/lib/admin/types';
import type { MaintenanceState } from '@/components/admin/MaintenanceCard';
import { formatUtcTimestamp } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type CoreHealthSectionProps = {
  globalPause: boolean;
  pauseSaving: boolean;
  lastSyncAt: string | null;
  pendingTranslationCount: number;
  alerts: AdminAlert[];
  maintenance: Pick<MaintenanceState, 'preview' | 'loading' | 'error' | 'handlePreview' | 'handleExecute'>;
  onGlobalToggle: () => void;
};

function ControlTile({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('dashboard-control-tile', className)}>
      <div className="dashboard-control-tile-head">
        <span className="dashboard-control-tile-label">{label}</span>
        {icon ? (
          <span className="material-symbols-outlined dashboard-control-tile-icon" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="dashboard-control-tile-body">{children}</div>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <section className="dashboard-alerts-panel">
      <header className="dashboard-alerts-panel-head">
        <h2 className="dashboard-alerts-panel-title">最近告警</h2>
        <span className="font-mono text-[11px] tabular-nums text-[#86868b]">{alerts.length} 条</span>
      </header>

      {alerts.length === 0 ? (
        <p className="dashboard-alerts-empty">暂无告警记录。</p>
      ) : (
        <ul className="dashboard-alerts-list">
          {alerts.map((alert) => (
            <li key={alert.id} className="dashboard-alert-item">
              <span className="material-symbols-outlined dashboard-alert-icon" aria-hidden>
                warning
              </span>
              <div className="dashboard-alert-body">
                <span className="dashboard-alert-source">{alert.source}</span>
                <span className="dashboard-alert-message">{alert.message}</span>
              </div>
              <time className="dashboard-alert-time">{formatUtcTimestamp(alert.timestamp)}</time>
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
  pendingTranslationCount,
  alerts,
  maintenance,
  onGlobalToggle,
}: CoreHealthSectionProps) {
  const { preview, loading, error, handlePreview, handleExecute } = maintenance;

  return (
    <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label="核心状态与快速操作">
      <div className="grid grid-cols-2 gap-3 lg:col-span-5">
        <ControlTile label="全局状态" icon="tune">
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
          <p className="mt-2 font-mono text-[11px] tabular-nums text-[#86868b]">
            同步 {lastSyncAt ? formatUtcTimestamp(lastSyncAt) : '—'}
          </p>
        </ControlTile>

        <ControlTile label="待翻译队列" icon="translate">
          <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
            {pendingTranslationCount}
          </p>
          <Link href="/admin/translation" className="dashboard-metric-link mt-1 inline-block text-[12px]">
            进入队列 →
          </Link>
        </ControlTile>

        <ControlTile label="数据库维护" icon="cleaning_services" className="col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              {preview ? (
                <>
                  <p className="font-mono text-xl font-bold tabular-nums text-[#1d1d1f]">
                    {preview.total}
                  </p>
                  <p className="font-mono text-[11px] tabular-nums text-[#86868b]">待清理记录</p>
                </>
              ) : (
                <p className="text-[12px] text-[#86868b]">过期 listing 与 30 天前审计行</p>
              )}
              {error ? (
                <p className="mt-1 font-mono text-[11px] text-[#ff3b30]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
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
        </ControlTile>
      </div>

      <div className="lg:col-span-7">
        <AlertsPanel alerts={alerts} />
      </div>
    </section>
  );
}
