import {
  getGlobalAdminStatus,
  getRecentAlerts,
  getSourcesWithLastRun,
} from '@/lib/admin/queries';
import type { SourceWithLastRun } from '@/lib/admin/types';

// TODO(06-03): Gate /admin behind operator middleware (D-48).

function formatUtcTimestamp(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function formatLastRunLine(source: SourceWithLastRun): string {
  const run = source.lastRun;
  if (!run) {
    return '上次运行：暂无记录';
  }

  const statusLabel =
    run.status === 'success' ? 'Success' : run.status === 'failed' ? 'Failed' : 'Partial';

  return `上次运行：${formatUtcTimestamp(run.finishedAt ?? run.startedAt)} · ${statusLabel} · ${run.listingsFound} listings`;
}

function statusChip(source: SourceWithLastRun) {
  if (source.implementationStatus === 'coming_soon') {
    return '即将支持';
  }
  if (!source.enabled) {
    return '已暂停';
  }
  return '运行中';
}

export default async function AdminDashboardPage() {
  const [sources, alerts, globalStatus] = await Promise.all([
    getSourcesWithLastRun(),
    getRecentAlerts(),
    getGlobalAdminStatus(),
  ]);

  const subito = sources.find((s) => s.slug === 'subito');

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] p-6">
      <header className="mb-6 border-b border-outline-variant pb-6">
        <h1 className="text-[30px] font-semibold leading-[1.3] tracking-tight">抓取管理</h1>
        <p className="mt-1 text-[15px] text-secondary">Scraper Worker · Admin Console</p>
      </header>

      <section className="mb-8 rounded border border-outline-variant bg-surface p-4">
        <div className="flex flex-wrap items-center gap-4 text-[14px]">
          <span className="font-semibold">全局暂停</span>
          <span className="text-secondary">{globalStatus.globalPause ? '已开启' : '未开启'}</span>
          <span className="hidden h-6 w-px bg-outline-variant sm:inline-block" aria-hidden />
          <span className="text-secondary">
            上次同步：{formatUtcTimestamp(globalStatus.lastSyncAt)}
          </span>
        </div>
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="border-b border-outline-variant pb-2 text-[24px] font-semibold">数据源</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {subito ? (
            <article className="rounded border border-outline-variant bg-surface p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[24px] font-semibold">{subito.displayName}</h3>
                  <span className="mt-1 inline-flex rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[14px]">
                    {statusChip(subito)}
                  </span>
                </div>
                <span
                  className={`text-[14px] ${subito.enabled ? 'text-on-surface' : 'text-secondary'}`}
                  aria-label={subito.enabled ? '已启用' : '未启用'}
                >
                  {subito.enabled ? '启用' : '停用'}
                </span>
              </div>

              <div className="space-y-1 rounded border border-outline-variant bg-surface-container-low p-3 font-mono text-[14px] text-secondary">
                <p>频率：每 {subito.intervalMinutes} 分钟</p>
                <p className="text-on-surface">{formatLastRunLine(subito)}</p>
              </div>
            </article>
          ) : (
            <p className="text-[15px] text-secondary">未找到 Subito 数据源配置。</p>
          )}

          {sources
            .filter((s) => s.slug !== 'subito')
            .map((source) => (
              <article
                key={source.slug}
                className="rounded border border-outline-variant bg-surface-container-low p-6 opacity-75"
              >
                <h3 className="text-[24px] font-semibold">{source.displayName}</h3>
                <span className="mt-1 inline-flex rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[14px]">
                  {statusChip(source)}
                </span>
                <p className="mt-3 text-[14px] italic text-secondary">该数据源尚未接入</p>
              </article>
            ))}
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="border-b border-outline-variant pb-2 text-[24px] font-semibold">最近告警</h2>
        {alerts.length === 0 ? (
          <p className="rounded border border-dashed border-outline-variant bg-surface-container-low p-4 text-[15px] text-secondary">
            暂无告警记录。
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded border border-outline-variant bg-surface">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center gap-2 p-3 text-[15px]">
                <span className="material-symbols-outlined text-[18px] text-error" aria-hidden>
                  error
                </span>
                <span className="font-mono font-semibold">{alert.source}</span>
                <span className="text-error">{alert.message}</span>
                <span className="ml-auto font-mono text-[14px] text-secondary">
                  {formatUtcTimestamp(alert.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
