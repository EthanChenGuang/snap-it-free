'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatedCount } from '@/components/admin/AnimatedCount';
import { adminNav, adminNavItems, adminShellMessages } from '@/components/admin/admin-messages';
import { adminRoutes, adminRunsHref } from '@/lib/admin/dashboard-links';
import {
  TranslationQueuePollingProvider,
  useTranslationQueuePollingContext,
} from '@/components/admin/TranslationQueuePollingProvider';
import type { FooterStats } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type AdminShellProps = {
  operatorEmail: string;
  children: React.ReactNode;
  pendingTranslationsCount?: number;
  rejectsCount?: number;
  footerStats?: FooterStats;
};

function operatorInitials(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) return 'OP';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function badgeCount(
  badge: 'pendingTranslations' | 'rejects' | undefined,
  pendingTranslationsCount: number,
  rejectsCount: number,
): number | undefined {
  if (badge === 'pendingTranslations' && pendingTranslationsCount > 0) {
    return pendingTranslationsCount;
  }
  if (badge === 'rejects' && rejectsCount > 0) {
    return rejectsCount;
  }
  return undefined;
}

export function AdminShell({
  operatorEmail,
  children,
  pendingTranslationsCount = 0,
  rejectsCount = 0,
  footerStats,
}: AdminShellProps) {
  return (
    <TranslationQueuePollingProvider initialCount={pendingTranslationsCount}>
      <AdminShellInner
        operatorEmail={operatorEmail}
        rejectsCount={rejectsCount}
        footerStats={footerStats}
      >
        {children}
      </AdminShellInner>
    </TranslationQueuePollingProvider>
  );
}

function AdminShellInner({
  operatorEmail,
  children,
  rejectsCount = 0,
  footerStats,
}: Omit<AdminShellProps, 'pendingTranslationsCount'>) {
  const pathname = usePathname();
  const { pendingCount: pendingTranslationsCount } = useTranslationQueuePollingContext();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface md:flex">
        <div className="px-gutter py-space-lg">
          <Link href={adminRoutes.dashboard} className="block rounded-md transition-colors hover:opacity-80">
            <h1 className="text-h3 font-semibold text-primary">{adminShellMessages.brandTitle}</h1>
            <p className="mt-1 text-label-sm text-secondary">{adminShellMessages.brandSubtitle}</p>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const count = badgeCount(item.badge, pendingTranslationsCount, rejectsCount);

            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                className={cn(
                  'flex items-center justify-between gap-3 px-gutter py-3 text-label-md transition-colors duration-150',
                  active
                    ? 'border-r-2 border-primary font-semibold text-primary'
                    : 'text-secondary hover:bg-surface-container-high',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{adminNav[item.key]}</span>
                </span>
                {count !== undefined && (
                  <span className="shrink-0 rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-primary">
                    <AnimatedCount value={count} />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-outline-variant px-gutter py-space-lg">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-label-sm font-semibold text-primary"
            aria-hidden
          >
            {operatorInitials(operatorEmail)}
          </div>
          <span className="truncate font-mono text-label-sm text-secondary">{operatorEmail}</span>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-outline-variant bg-surface px-gutter">
          <div className="flex items-center gap-4">
            {pendingTranslationsCount > 0 && (
              <Link
                href={adminRoutes.translation}
                prefetch={false}
                className="hidden rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-label-sm font-semibold text-primary hover:bg-surface-container-high sm:inline-flex"
              >
                {adminNav.translation}: <AnimatedCount value={pendingTranslationsCount} />
              </Link>
            )}
            <Link
              href={adminRoutes.settings}
              className="hidden rounded-full bg-surface-container-high px-3 py-1 font-mono text-label-sm text-secondary transition-colors hover:bg-surface-container sm:inline"
            >
              {operatorEmail}
            </Link>
            <Link
              href={adminRunsHref({ filter: 'failed' })}
              className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-container"
              aria-label="查看最近告警"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                notifications
              </span>
            </Link>
            <Link
              href={adminRoutes.settings}
              className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-container"
              aria-label="系统设置"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                help_outline
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-container-max flex-1 p-gutter">{children}</main>

        <footer className="mt-auto border-t border-outline-variant bg-surface p-gutter">
          <div className="mx-auto flex max-w-container-max flex-wrap gap-x-space-xl gap-y-space-sm text-label-sm text-secondary">
            <Link href={adminRoutes.runs} className="transition-colors hover:text-primary">
              24h 新增：
              <span className="font-medium text-primary">
                {footerStats ? footerStats.inserted24h.toLocaleString('zh-CN') : '—'}
              </span>
            </Link>
            <Link
              href={adminRunsHref({ filter: 'failed' })}
              className="transition-colors hover:text-primary"
            >
              7d 失败运行：
              <span className="font-medium text-error">
                {footerStats ? footerStats.failedRuns7d.toLocaleString('zh-CN') : '—'}
              </span>
            </Link>
            <Link href={adminRoutes.runs} className="transition-colors hover:text-primary">
              平均选择器命中率：
              <span className="font-medium text-primary">
                {footerStats?.avgSelectorRate != null
                  ? `${(footerStats.avgSelectorRate * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
