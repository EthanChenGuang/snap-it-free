'use client';

import { useState } from 'react';
import { useMessages } from '@/lib/i18n/useMessages';

const SESSION_DISMISS_KEY = 'dm_safety_banner_dismissed';

type SafetyBannerProps = {
  conversationId: string;
};

export function SafetyBanner({ conversationId }: SafetyBannerProps) {
  const { messages } = useMessages();

  const dismissKey = `${SESSION_DISMISS_KEY}_${conversationId}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(dismissKey) === '1';
  });

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (next) {
      sessionStorage.setItem(dismissKey, '1');
    } else {
      sessionStorage.removeItem(dismissKey);
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-space-sm border-b border-outline-variant bg-[#f1f1f0] px-gutter py-space-xs text-left"
        aria-label={messages.safety.expand}
      >
        <span className="material-symbols-outlined text-base text-on-surface-variant">info</span>
        <span className="flex-1 truncate text-label-sm text-on-surface-variant">
          {messages.safety.bannerShort}
        </span>
        <span className="material-symbols-outlined text-base text-on-surface-variant">
          expand_more
        </span>
      </button>
    );
  }

  return (
    <div className="border-b border-outline-variant bg-[#f1f1f0] px-gutter py-space-sm">
      <div className="flex items-start gap-space-sm">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-on-surface-variant">
          shield
        </span>
        <p className="flex-1 text-label-sm leading-relaxed text-on-surface-variant">
          {messages.safety.bannerShort}
        </p>
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
          aria-label={messages.safety.collapse}
        >
          <span className="material-symbols-outlined text-base">expand_less</span>
        </button>
      </div>
    </div>
  );
}
