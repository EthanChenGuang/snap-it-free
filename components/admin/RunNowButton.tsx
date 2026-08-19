'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { sourcesMessages } from '@/components/admin/admin-messages';
import { useRunNow, type RunNowPhase, isRunNowActivePhase } from '@/lib/admin/use-run-now';
import type { CrawlMode } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type RunNowButtonProps = {
  slug: string;
  globalPause?: boolean;
  /** When set, primary click runs this mode; chevron opens menu for other modes. */
  defaultCrawlMode?: CrawlMode;
  variant?: 'full' | 'compact' | 'macos';
  className?: string;
  onComplete?: () => void;
  onPhaseChange?: (phase: RunNowPhase) => void;
  showStatusLink?: boolean;
};

function phaseLabel(phase: RunNowPhase): string {
  switch (phase) {
    case 'submitting':
      return sourcesMessages.runSubmitting;
    case 'queued':
      return sourcesMessages.runWaitingWorker;
    case 'running':
      return sourcesMessages.runInProgress;
    case 'done':
      return sourcesMessages.runComplete;
    case 'error':
      return sourcesMessages.runFailed;
    default:
      return sourcesMessages.runNow;
  }
}

function phaseIcon(phase: RunNowPhase): string {
  switch (phase) {
    case 'done':
      return 'check_circle';
    case 'error':
      return 'error';
    default:
      return 'play_arrow';
  }
}

function RunNowActivityPanel({
  phase,
  message,
  showStatusLink,
}: {
  phase: RunNowPhase;
  message: string | null;
  showStatusLink: boolean;
}) {
  if (!isRunNowActivePhase(phase)) {
    return null;
  }

  return (
    <div
      className={cn(
        'run-now-panel flex items-start gap-3 rounded border px-3 py-2.5',
        phase === 'running' ? 'run-now-panel-running' : 'run-now-panel-queued',
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="material-symbols-outlined mt-0.5 shrink-0 animate-spin text-[20px] text-on-surface"
        aria-hidden
      >
        progress_activity
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[14px] font-semibold text-on-surface">{phaseLabel(phase)}</p>
        {message ? <p className="text-[13px] text-secondary">{message}</p> : null}
        <div className="h-1 overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={cn(
              'run-now-progress-bar h-full rounded-full bg-primary',
              phase === 'running' && 'run-now-progress-fast',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="run-now-dot run-now-dot-0 h-1.5 w-1.5 rounded-full bg-secondary" />
          <span className="run-now-dot run-now-dot-1 h-1.5 w-1.5 rounded-full bg-secondary" />
          <span className="run-now-dot run-now-dot-2 h-1.5 w-1.5 rounded-full bg-secondary" />
        </div>
        {showStatusLink ? (
          <Link href="/admin/runs" className="inline-block text-[13px] font-medium text-primary underline">
            查看运行记录
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RunModeMenuItem({
  label,
  help,
  onSelect,
}: {
  label: string;
  help: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-pointer select-none flex-col gap-0.5 rounded-md px-3 py-2 outline-none',
        'data-[highlighted]:bg-surface-container-low',
      )}
      onSelect={onSelect}
    >
      <span className="text-[13px] font-semibold text-on-surface">{label}</span>
      <span className="text-[12px] text-secondary">{help}</span>
    </DropdownMenu.Item>
  );
}

export function RunNowButton({
  slug,
  globalPause = false,
  defaultCrawlMode,
  variant = 'compact',
  className,
  onComplete,
  onPhaseChange,
  showStatusLink = false,
}: RunNowButtonProps) {
  const { phase, message, isActive, trigger } = useRunNow({
    globalPause,
    onComplete,
    onPhaseChange,
  });
  const showSpinner = isRunNowActivePhase(phase);
  const isFull = variant === 'full';
  const isMacos = variant === 'macos';
  const iconSize = isFull || isMacos ? 'text-[16px]' : 'text-[16px]';
  const menuDisabled = isActive || phase === 'done';

  function handleRun(crawlMode: CrawlMode) {
    void trigger(slug, crawlMode);
  }

  const useSplitTrigger = defaultCrawlMode != null && !menuDisabled;

  const sharedButtonClasses = cn(
    'relative inline-flex items-center justify-center gap-1.5 overflow-hidden font-medium transition-all disabled:cursor-default',
    isMacos &&
      'h-8 shrink-0 rounded-lg bg-[#1d1d1f] px-3 text-[13px] text-white hover:bg-[#333336] disabled:opacity-50',
    !isMacos &&
      'font-semibold text-on-primary transition-colors disabled:cursor-default',
    !isMacos &&
      (isFull
        ? 'w-full rounded px-4 py-2 text-label-md'
        : 'rounded px-2.5 py-1 text-[14px]'),
    !isMacos && (isActive ? 'bg-primary/90' : 'bg-primary hover:opacity-90 disabled:opacity-50'),
    !isMacos && phase === 'running' && 'run-now-active',
    !isMacos && phase === 'queued' && 'run-now-queued',
    !isMacos && phase === 'submitting' && 'run-now-queued',
    isMacos && isActive && 'opacity-90',
  );

  const triggerContent = (
    <>
      {isActive && !isMacos ? (
        <span className="pointer-events-none absolute inset-0 run-now-shimmer" aria-hidden />
      ) : null}
      {showSpinner ? (
        <span className={cn('material-symbols-outlined animate-spin', iconSize)} aria-hidden>
          progress_activity
        </span>
      ) : (
        <span className={cn('material-symbols-outlined', iconSize)} aria-hidden>
          {phaseIcon(phase)}
        </span>
      )}
      <span className="whitespace-nowrap">{phaseLabel(phase)}</span>
      {!menuDisabled && !useSplitTrigger ? (
        <span className={cn('material-symbols-outlined', iconSize, 'opacity-70')} aria-hidden>
          expand_more
        </span>
      ) : null}
    </>
  );

  const triggerButton = useSplitTrigger ? (
    <div className={cn('inline-flex items-stretch', isFull && 'w-full')}>
      <button
        type="button"
        disabled={menuDisabled}
        onClick={() => handleRun(defaultCrawlMode)}
        className={cn(
          sharedButtonClasses,
          isMacos ? 'rounded-l-lg rounded-r-none' : 'rounded-l rounded-r-none',
          isFull && 'flex-1',
        )}
      >
        {triggerContent}
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={menuDisabled}
            aria-label={sourcesMessages.runModeMenuLabel}
            className={cn(
              sharedButtonClasses,
              'border-l border-on-primary/20 px-1.5',
              isMacos ? 'rounded-r-lg rounded-l-none' : 'rounded-r rounded-l-none',
            )}
          >
            <span className={cn('material-symbols-outlined', iconSize, 'opacity-70')} aria-hidden>
              expand_more
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-[200] min-w-[11rem] rounded-lg border border-outline-variant bg-surface p-1 shadow-none"
            sideOffset={4}
            align={isFull ? 'start' : 'end'}
            aria-label={sourcesMessages.runModeMenuLabel}
          >
            <RunModeMenuItem
              label={sourcesMessages.runModeIncremental}
              help={sourcesMessages.runModeIncrementalHelp}
              onSelect={() => handleRun('incremental')}
            />
            <RunModeMenuItem
              label={sourcesMessages.runModeFull}
              help={sourcesMessages.runModeFullHelp}
              onSelect={() => handleRun('full')}
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  ) : (
    <button type="button" disabled={menuDisabled} className={sharedButtonClasses}>
      {triggerContent}
    </button>
  );

  return (
    <div
      className={cn(
        isFull ? 'space-y-2' : isMacos ? 'min-w-0' : 'flex flex-col items-end gap-1',
        isActive && 'run-now-wrapper-active',
        phase === 'running' && 'run-now-wrapper-running',
        className,
      )}
    >
      {isFull ? (
        <RunNowActivityPanel
          phase={phase}
          message={message}
          showStatusLink={showStatusLink}
        />
      ) : null}

      {menuDisabled || useSplitTrigger ? (
        triggerButton
      ) : (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>{triggerButton}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[200] min-w-[11rem] rounded-lg border border-outline-variant bg-surface p-1 shadow-none"
              sideOffset={4}
              align={isFull ? 'start' : 'end'}
              aria-label={sourcesMessages.runModeMenuLabel}
            >
              <RunModeMenuItem
                label={sourcesMessages.runModeIncremental}
                help={sourcesMessages.runModeIncrementalHelp}
                onSelect={() => handleRun('incremental')}
              />
              <RunModeMenuItem
                label={sourcesMessages.runModeFull}
                help={sourcesMessages.runModeFullHelp}
                onSelect={() => handleRun('full')}
              />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      {message && !isFull && !isMacos && !isRunNowActivePhase(phase) ? (
        <p
          className={cn(
            'text-[13px] text-secondary',
            phase === 'error' && 'text-error',
            phase === 'done' && 'text-on-surface',
          )}
          role="status"
          aria-live="polite"
        >
          {message}
          {showStatusLink && phase === 'done' ? (
            <>
              {' '}
              <Link href="/admin/runs" className="font-medium text-primary underline">
                查看运行记录
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {message && isFull && (phase === 'done' || phase === 'error') ? (
        <p
          className={cn(
            'text-label-sm text-secondary',
            phase === 'error' && 'text-error',
            phase === 'done' && 'text-on-surface',
          )}
          role="status"
          aria-live="polite"
        >
          {message}
          {showStatusLink && phase === 'done' ? (
            <>
              {' '}
              <Link href="/admin/runs" className="font-medium text-primary underline">
                查看运行记录
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export type { RunNowPhase };
