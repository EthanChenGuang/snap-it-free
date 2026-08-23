'use client';

import {
  AUTO_TRANSLATE_INTERVAL_OPTIONS,
  type AutoTranslateTickResult,
} from '@/lib/admin/auto-translate-settings';
import { translationMessages } from '@/components/admin/admin-messages';
import { useAutoTranslateAll } from '@/hooks/useAutoTranslateAll';
import { cn } from '@/lib/utils';

function formatLastCheck(date: Date | null): string {
  if (!date) {
    return '—';
  }
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function statusMessage(
  enabled: boolean,
  intervalMinutes: number,
  isBulkTranslating: boolean,
  lastTickResult: AutoTranslateTickResult | null,
  lastCheckAt: Date | null,
): string {
  if (isBulkTranslating) {
    return translationMessages.autoTranslateAllRunning;
  }
  if (!enabled) {
    return translationMessages.autoTranslateAllDisabledHint;
  }
  if (lastTickResult === 'skipped-busy') {
    return translationMessages.autoTranslateAllSkipped;
  }
  return translationMessages.autoTranslateAllScheduleHint(intervalMinutes, formatLastCheck(lastCheckAt));
}

export function AutoTranslateSettingsPanel() {
  const {
    settings,
    setEnabled,
    setIntervalMinutes,
    isBulkTranslating,
    lastCheckAt,
    lastTickResult,
    runScheduledCheck,
  } = useAutoTranslateAll();

  const status = statusMessage(
    settings.enabled,
    settings.intervalMinutes,
    isBulkTranslating,
    lastTickResult,
    lastCheckAt,
  );

  return (
    <div className="space-y-3 border-t border-outline-variant pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{translationMessages.autoTranslateAllLabel}</p>
          <p className="mt-1 text-[14px] text-secondary">{translationMessages.autoTranslateAllSettingsHelp}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label={translationMessages.autoTranslateAllLabel}
          disabled={isBulkTranslating}
          onClick={() => setEnabled(!settings.enabled)}
          className={cn('sources-ios-toggle', isBulkTranslating && 'sources-ios-toggle-busy')}
        >
          <span
            className={cn(
              'sources-ios-toggle-track',
              settings.enabled && 'sources-ios-toggle-track-on',
            )}
            aria-hidden
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[14px] text-secondary">
          <span>{translationMessages.autoTranslateAllInterval}</span>
          <select
            value={settings.intervalMinutes}
            disabled={isBulkTranslating}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            className="rounded border border-outline-variant bg-surface-container-low px-2 py-1.5 font-mono text-[13px] text-on-surface focus:border-primary focus:outline-none"
          >
            {AUTO_TRANSLATE_INTERVAL_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}
              </option>
            ))}
          </select>
        </label>
        {settings.enabled ? (
          <button
            type="button"
            onClick={() => void runScheduledCheck()}
            disabled={isBulkTranslating}
            className="rounded border border-outline-variant px-3 py-1.5 text-[13px] font-medium text-primary hover:bg-surface-container-high"
          >
            {translationMessages.autoTranslateAllCheckNow}
          </button>
        ) : null}
      </div>

      <p className="font-mono text-[12px] text-secondary" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
