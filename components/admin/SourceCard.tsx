'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RunNowButton } from '@/components/admin/RunNowButton';
import {
  antiBlockPresetLabels,
  sourceIcons,
  sourcesMessages,
} from '@/components/admin/admin-messages';
import { adminRunHref, adminSourceHref } from '@/lib/admin/dashboard-links';
import { formatUtcTimestamp } from '@/lib/admin/format';
import {
  isPreCrawlSkip,
  localizeFailureReason,
  resolvePartialListLabel,
  shouldShowFailureReason,
} from '@/lib/admin/run-status';
import type { RunNowPhase } from '@/lib/admin/use-run-now';
import { isRunNowActivePhase } from '@/lib/admin/use-run-now';
import type { SourceLastRun, SourceWithLastRun } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type SourceCardVariant = 'full' | 'compact';

type SourceCardProps = {
  source: SourceWithLastRun;
  globalPause: boolean;
  toggleBusy?: boolean;
  variant?: SourceCardVariant;
  onToggleEnabled: (slug: string, enabled: boolean) => Promise<void>;
  onRunComplete?: () => void;
};

type RunStatusTone = 'success' | 'failed' | 'skipped' | 'running' | 'partial';

type RunStatusVisual = {
  tone: RunStatusTone;
  label: string;
};

function formatRecentRunTimestamp(run: SourceLastRun | null): string {
  if (!run) {
    return sourcesMessages.noDataPlaceholder;
  }
  return formatUtcTimestamp(run.finishedAt ?? run.startedAt);
}

function resolveRunStatusVisual(run: SourceLastRun | null): RunStatusVisual {
  if (!run) {
    return { tone: 'skipped', label: sourcesMessages.noDataPlaceholder };
  }
  if (!run.finishedAt) {
    return { tone: 'running', label: sourcesMessages.runStatusRunning };
  }
  if (run.status === 'success') {
    return { tone: 'success', label: sourcesMessages.runStatusSuccess };
  }
  if (run.status === 'failed') {
    return { tone: 'failed', label: sourcesMessages.runStatusFailed };
  }
  if (isPreCrawlSkip(run)) {
    return { tone: 'skipped', label: resolvePartialListLabel(run.failureReason) };
  }
  return { tone: 'partial', label: resolvePartialListLabel(run.failureReason) };
}

function resolveFailureReason(run: SourceLastRun | null): string | null {
  if (!run || !shouldShowFailureReason(run)) {
    return null;
  }
  return localizeFailureReason(run.failureReason) ?? run.failureReason;
}

function RunStatusBadge({ visual }: { visual: RunStatusVisual }) {
  if (visual.tone === 'skipped' && visual.label === sourcesMessages.noDataPlaceholder) {
    return null;
  }

  const showMark = visual.tone === 'success' || visual.tone === 'failed' || visual.tone === 'partial';

  return (
    <span
      className={cn(
        'sources-run-status-badge',
        visual.tone === 'success' && 'sources-run-status-badge-success',
        (visual.tone === 'failed' || visual.tone === 'partial') && 'sources-run-status-badge-failed',
        (visual.tone === 'skipped' || visual.tone === 'running') && 'sources-run-status-badge-neutral',
      )}
    >
      {showMark ? (
        <span className="sources-run-status-mark" aria-hidden>
          {visual.tone === 'success' ? '✓' : '✕'}
        </span>
      ) : null}
      <span>{visual.label}</span>
    </span>
  );
}

function RunFailureHint({ reason, hintKey }: { reason: string; hintKey: string }) {
  const hintId = `run-failure-${hintKey}`;

  return (
    <span className="sources-run-failure-hint" tabIndex={0} aria-describedby={hintId}>
      <span className="sources-run-failure-text">{reason}</span>
      <span id={hintId} role="tooltip" className="sources-run-failure-tooltip">
        {reason}
      </span>
    </span>
  );
}

function CompactLastRunLine({ source }: { source: SourceWithLastRun }) {
  const visual = resolveRunStatusVisual(source.lastRun);
  const runHref = source.lastRun?.id ? adminRunHref(source.lastRun.id) : null;

  const statusNode = <RunStatusBadge visual={visual} />;
  const timeNode = (
    <span className="shrink-0 font-mono text-[12px] tabular-nums text-[#86868b]">
      {formatRecentRunTimestamp(source.lastRun)}
    </span>
  );

  return (
    <div className="flex items-center justify-between gap-2">
      {runHref ? (
        <Link href={runHref} className="relative z-[2] min-w-0">
          {statusNode}
        </Link>
      ) : (
        statusNode
      )}
      {runHref ? (
        <Link href={runHref} className="relative z-[2] shrink-0">
          {timeNode}
        </Link>
      ) : (
        timeNode
      )}
    </div>
  );
}

function SourceRunStatsPanel({ source }: { source: SourceWithLastRun }) {
  const recentVisual = resolveRunStatusVisual(source.lastRun);
  const failureReason = resolveFailureReason(source.lastRun);
  const fullSuccess = source.lastFullSuccess;
  const fullSuccessTimestamp = fullSuccess
    ? formatUtcTimestamp(fullSuccess.finishedAt)
    : sourcesMessages.lastFullSuccessNone;
  const listingsBadge = fullSuccess
    ? sourcesMessages.listingsCountBadge(fullSuccess.listingsFound)
    : sourcesMessages.listingsCountEmpty;

  return (
    <div className="sources-stats-panel">
      <section className="sources-stats-section">
        <div className="sources-stats-header">
          <div className="sources-stats-heading">
            <span className="sources-stats-title">{sourcesMessages.recentRunLabel}</span>
            <span className="sources-stats-timestamp tabular-nums">
              {formatRecentRunTimestamp(source.lastRun)}
            </span>
          </div>
          <RunStatusBadge visual={recentVisual} />
        </div>
        {failureReason ? <RunFailureHint reason={failureReason} hintKey={source.slug} /> : null}
      </section>

      <section className="sources-stats-section sources-stats-section-divided">
        <div className="sources-stats-header">
          <div className="sources-stats-heading">
            <span className="sources-stats-subtitle">{sourcesMessages.lastFullSuccessLabel}</span>
            <span className="sources-stats-timestamp tabular-nums">{fullSuccessTimestamp}</span>
          </div>
          <span className="sources-stats-count-badge tabular-nums">{listingsBadge}</span>
        </div>
      </section>
    </div>
  );
}

function statusBadgeClass(source: SourceWithLastRun): string {
  if (source.implementationStatus === 'coming_soon') {
    return 'sources-badge-soon';
  }
  if (!source.enabled) {
    return 'sources-badge-paused';
  }
  return 'sources-badge-live';
}

function statusChipLabel(source: SourceWithLastRun): string {
  if (source.implementationStatus === 'coming_soon') {
    return sourcesMessages.statusComingSoon;
  }
  if (!source.enabled) {
    return sourcesMessages.statusPaused;
  }
  return sourcesMessages.statusRunning;
}

function IosToggle({
  checked,
  busy,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  busy?: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={busy || undefined}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled || busy) {
          return;
        }
        onChange();
      }}
      className={cn(
        'sources-ios-toggle',
        disabled ? 'sources-ios-toggle-disabled' : 'cursor-pointer',
        busy && 'sources-ios-toggle-busy',
      )}
    >
      <span
        className={cn('sources-ios-toggle-track', checked && 'sources-ios-toggle-track-on')}
        aria-hidden
      />
    </button>
  );
}

export function SourceCard({
  source,
  globalPause,
  toggleBusy: toggleBusyExternal = false,
  variant = 'full',
  onToggleEnabled,
  onRunComplete,
}: SourceCardProps) {
  const [toggling, setToggling] = useState(false);
  const [runPhase, setRunPhase] = useState<RunNowPhase>('idle');

  const isCompact = variant === 'compact';
  const isComingSoon = source.implementationStatus === 'coming_soon';
  const isLive = !isComingSoon;
  const toggleDisabled = !isLive;
  const isToggleBusy = toggling || toggleBusyExternal;
  const antiBlockLabel = antiBlockPresetLabels[source.antiBlockPreset] ?? source.antiBlockPreset;

  async function handleToggle() {
    if (toggleDisabled || isToggleBusy) {
      return;
    }
    setToggling(true);
    try {
      await onToggleEnabled(source.slug, !source.enabled);
    } finally {
      setToggling(false);
    }
  }

  return (
    <article
      className={cn(
        'sources-grid-card relative flex flex-col',
        isCompact && 'sources-grid-card-compact',
        isComingSoon && 'sources-grid-card-muted',
        isRunNowActivePhase(runPhase) && 'run-now-card-active',
        runPhase === 'running' && 'run-now-wrapper-running',
      )}
    >
      <Link
        href={adminSourceHref(source.slug)}
        className="sources-grid-card-nav"
        aria-label={`打开 ${source.displayName} 配置`}
      />
      <header className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="sources-platform-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[16px] text-[#636366]">
                {sourceIcons[source.slug] ?? 'source'}
              </span>
            </span>
            <h3 className="truncate text-[15px] font-semibold leading-tight text-[#1d1d1f]">
              {source.displayName}
            </h3>
            <span
              className={cn(
                'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none',
                statusBadgeClass(source),
              )}
            >
              {statusChipLabel(source)}
            </span>
          </div>
        </div>
        <IosToggle
          checked={source.enabled}
          busy={isToggleBusy}
          disabled={toggleDisabled}
          onChange={handleToggle}
          label={`${source.displayName} 启用开关`}
        />
      </header>

      {isCompact ? (
        isLive ? (
          <div className="relative z-[1] mt-3">
            <CompactLastRunLine source={source} />
          </div>
        ) : null
      ) : (
        <div className="relative z-[1] mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-[13px] text-[#636366]">
            <span className="shrink-0">{sourcesMessages.intervalPrefix}</span>
            <span className="truncate font-mono tabular-nums text-[#1d1d1f]">
              {sourcesMessages.intervalEvery(source.intervalMinutes)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 text-[13px] text-[#636366]">{sourcesMessages.antiBlockPrefix}</span>
            <span className="sources-shield-badge inline-flex max-w-full items-center gap-1 whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px]" aria-hidden>
                shield
              </span>
              <span className="truncate">{antiBlockLabel}</span>
            </span>
          </div>
          {isComingSoon ? (
            <p className="text-[13px] italic text-[#86868b]">{sourcesMessages.comingSoonRunBlocked}</p>
          ) : null}
          {!isComingSoon && !source.enabled ? (
            <p className="text-[12px] text-[#86868b]">{sourcesMessages.runSourceDisabled}</p>
          ) : null}
        </div>
      )}

      {isLive ? (
        <footer
          className={cn(
            'relative z-[2] mt-auto border-t border-black/[0.06]',
            isCompact ? 'pt-3' : 'pt-4',
          )}
        >
          {!isCompact ? <SourceRunStatsPanel source={source} /> : null}
          <div className={cn('flex items-center justify-end gap-2', !isCompact && 'mt-3')}>
            <RunNowButton
              slug={source.slug}
              globalPause={globalPause}
              defaultCrawlMode={source.slug === 'vinted' ? 'incremental' : undefined}
              variant="macos"
              showStatusLink
              onComplete={onRunComplete}
              onPhaseChange={setRunPhase}
            />
            <Link
              href={adminSourceHref(source.slug)}
              className="sources-icon-btn relative z-[2]"
              aria-label={`${sourcesMessages.edit} ${source.displayName}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                settings
              </span>
            </Link>
          </div>
        </footer>
      ) : (
        <footer className="relative z-[2] mt-auto border-t border-black/[0.06] pt-4">
          <Link
            href={adminSourceHref(source.slug)}
            className="sources-icon-btn relative z-[2] ml-auto"
            aria-label={`${sourcesMessages.edit} ${source.displayName}`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              settings
            </span>
          </Link>
        </footer>
      )}
    </article>
  );
}

export function SourceCardSkeleton() {
  return (
    <div className="sources-grid-card animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-32 rounded bg-black/[0.06]" />
        <div className="h-6 w-10 rounded-full bg-black/[0.06]" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-4 rounded bg-black/[0.06]" />
        <div className="h-4 w-2/3 rounded bg-black/[0.06]" />
      </div>
      <div className="mt-6 border-t border-black/[0.06] pt-4">
        <div className="sources-stats-panel">
          <div className="h-8 w-full rounded bg-black/[0.06]" />
          <div className="mt-2.5 h-8 w-full rounded bg-black/[0.06]" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <div className="h-8 w-24 rounded-lg bg-black/[0.06]" />
          <div className="h-8 w-8 rounded-lg bg-black/[0.06]" />
        </div>
      </div>
    </div>
  );
}
