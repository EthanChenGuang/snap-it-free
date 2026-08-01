import { messages } from '@/messages/it';

export function HiddenReviewBanner() {
  return (
    <div className="flex items-start gap-space-md rounded border border-outline-variant bg-error-container/30 p-space-md">
      <span className="material-symbols-outlined shrink-0 text-error">visibility_off</span>
      <div>
        <p className="text-label-md font-semibold text-on-surface">
          {messages.manage.hiddenBannerTitle}
        </p>
        <p className="mt-space-xs text-label-sm text-on-surface-variant">
          {messages.manage.hiddenBannerBody}
        </p>
      </div>
    </div>
  );
}
