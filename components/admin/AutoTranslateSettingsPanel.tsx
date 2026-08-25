'use client';

import {
  AUTO_TRANSLATE_INTERVAL_OPTIONS,
  type AutoTranslateTickResult,
} from '@/lib/admin/auto-translate-settings';
import { translationMessages } from '@/components/admin/admin-messages';
import { useAutoTranslateContext } from '@/components/admin/AutoTranslateProvider';
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
  } = useAutoTranslateContext();

  const status = statusMessage(
    settings.enabled,
    settings.intervalMinutes,
    isBulkTranslating,
    lastTickResult,
    lastCheckAt,
  );

  return (
    <section className="translation-queue-auto-poll" aria-labelledby="translation-queue-auto-poll-title">
      <div className="translation-queue-auto-poll-head">
        <div>
          <h2 id="translation-queue-auto-poll-title" className="translation-queue-auto-poll-title">
            {translationMessages.autoTranslateAllLabel}
          </h2>
          <p className="translation-queue-auto-poll-help">{translationMessages.autoTranslateAllSettingsHelp}</p>
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

      <div className="translation-queue-auto-poll-controls">
        <label className="translation-queue-auto-poll-interval">
          <span>{translationMessages.autoTranslateAllInterval}</span>
          <select
            value={settings.intervalMinutes}
            disabled={!settings.enabled || isBulkTranslating}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            className="translation-queue-auto-poll-interval-select"
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
            className="translation-queue-ghost-btn"
          >
            {translationMessages.autoTranslateAllCheckNow}
          </button>
        ) : null}
      </div>

      <p className="translation-queue-auto-poll-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
