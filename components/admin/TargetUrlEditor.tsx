'use client';

import { useMemo, useRef, useState } from 'react';
import { adminShellMessages, sourcesMessages } from '@/components/admin/admin-messages';
import { cn } from '@/lib/utils';

type UrlValidationEntry = {
  line: number;
  url: string;
  format: { ok: true } | { ok: false; error: string };
  reachability?:
    | { ok: true; statusCode: number }
    | { ok: false; statusCode?: number; error: string };
};

type UrlValidationReport = {
  summary: {
    total: number;
    formatOk: number;
    reachOk: number;
    failed: number;
  };
  results: UrlValidationEntry[];
};

type TargetUrlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  sourceSlug: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
};

function contentLines(value: string): string[] {
  if (!value) {
    return [''];
  }

  const split = value.split('\n');
  let end = split.length;

  while (end > 1 && split[end - 1] === '') {
    end -= 1;
  }

  return split.slice(0, end);
}

function entryFailureReason(entry: UrlValidationEntry): string {
  if (!entry.format.ok) {
    return entry.format.error;
  }
  if (entry.reachability && !entry.reachability.ok) {
    return entry.reachability.error;
  }
  return sourcesMessages.validateUrlsReachError;
}

export function TargetUrlEditor({
  value,
  onChange,
  sourceSlug,
  title = '目标 URL',
  subtitle = '每行一个 URL。可手动编辑或使用上方矩阵生成。',
  placeholder = 'https://www.subito.it/annunci-veneto/...',
}: TargetUrlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<UrlValidationReport | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const lines = useMemo(() => contentLines(value), [value]);

  const urlCount = useMemo(
    () => value.split('\n').map((line) => line.trim()).filter(Boolean).length,
    [value],
  );

  const failedEntries = useMemo(
    () =>
      validationReport?.results.filter(
        (entry) => !entry.format.ok || (entry.reachability != null && !entry.reachability.ok),
      ) ?? [],
    [validationReport],
  );

  const syncScroll = () => {
    const textarea = textareaRef.current;
    const gutter = lineNumbersRef.current;
    if (textarea && gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  };

  const handleCopy = async () => {
    if (!value.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  };

  const handleClear = () => {
    onChange('');
    setValidationReport(null);
    setValidationError(null);
    textareaRef.current?.focus();
  };

  const handleValidate = async () => {
    const urls = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setValidationReport(null);
      setValidationError(sourcesMessages.validateUrlsEmpty);
      return;
    }

    setValidating(true);
    setValidationError(null);
    setValidationReport(null);

    try {
      const response = await fetch(`/api/admin/sources/${sourceSlug}/validate-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, probe: true }),
      });

      if (!response.ok) {
        setValidationError(sourcesMessages.validateUrlsRequestError);
        return;
      }

      const report = (await response.json()) as UrlValidationReport;
      setValidationReport(report);
    } catch {
      setValidationError(adminShellMessages.loadError);
    } finally {
      setValidating(false);
    }
  };

  return (
    <section className="source-detail-card source-url-editor">
      <header className="source-url-editor-header">
        <div className="source-url-editor-heading">
          <h2 className="source-detail-card-title">{title}</h2>
          <p className="source-detail-card-subtitle">{subtitle}</p>
        </div>
        <div className="source-url-editor-actions">
          <span className="source-url-count-badge tabular-nums">
            {urlCount} URLs Selected
          </span>
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || !value.trim()}
            className={cn('sources-icon-btn', validating && 'source-url-validate-busy')}
            aria-label={sourcesMessages.validateUrls}
            title={sourcesMessages.validateUrls}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              network_check
            </span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value.trim()}
            className="sources-icon-btn"
            aria-label="复制全部 URL"
            title="复制全部 URL"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              content_copy
            </span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!value.trim()}
            className="sources-icon-btn"
            aria-label="清空 URL"
            title="清空 URL"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              delete
            </span>
          </button>
        </div>
      </header>

      <div className="source-url-editor-shell">
        <div
          ref={lineNumbersRef}
          className="source-url-line-numbers tabular-nums"
          aria-hidden
        >
          {lines.map((_, index) => (
            <div key={index} className="source-url-line-number">
              {index + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setValidationReport(null);
            setValidationError(null);
          }}
          onScroll={syncScroll}
          spellCheck={false}
          placeholder={placeholder}
          className="source-url-textarea"
        />
      </div>

      {validating ? (
        <p className="source-url-validation-banner source-url-validation-banner-loading" role="status">
          <span className="material-symbols-outlined text-[18px] animate-spin" aria-hidden>
            progress_activity
          </span>
          {sourcesMessages.validateUrlsRunning(urlCount)}
        </p>
      ) : null}

      {validationError ? (
        <p className="source-url-validation-banner source-url-validation-banner-error" role="alert">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            error
          </span>
          {validationError}
        </p>
      ) : null}

      {validationReport && !validating ? (
        <div
          className={cn(
            'source-url-validation-banner',
            validationReport.summary.failed === 0
              ? 'source-url-validation-banner-success'
              : 'source-url-validation-banner-warning',
          )}
          role="status"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {validationReport.summary.failed === 0 ? 'check_circle' : 'warning'}
          </span>
          <div className="source-url-validation-copy">
            <p>
              {validationReport.summary.failed === 0
                ? sourcesMessages.validateUrlsAllPass(validationReport.summary.total)
                : sourcesMessages.validateUrlsPartialFail(
                    validationReport.summary.failed,
                    validationReport.summary.total,
                  )}
            </p>
            {failedEntries.length > 0 ? (
              <ul className="source-url-validation-failures">
                {failedEntries.map((entry) => (
                  <li key={`${entry.line}-${entry.url}`}>
                    <span className="tabular-nums">#{entry.line}</span>{' '}
                    <span className="source-url-validation-failure-url">{entry.url}</span>
                    <span className="source-url-validation-failure-reason">
                      {entryFailureReason(entry)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
