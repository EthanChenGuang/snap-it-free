'use client';

import { useState } from 'react';
import { messages } from '@/messages/it';

const SESSION_DISMISS_KEY = 'dm_safety_banner_dismissed';

type SafetyBannerProps = {
  conversationId: string;
};

export function SafetyBanner({ conversationId }: SafetyBannerProps) {
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
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-space-md py-space-xs">
        <span className="text-label-sm text-on-surface-variant">{messages.safety.bannerShort}</span>
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container"
          aria-label={messages.safety.expand}
        >
          <span className="material-symbols-outlined text-base">info</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-outline-variant bg-surface-container-low px-space-md py-space-sm">
      <div className="flex items-start justify-between gap-space-sm">
        <p className="text-label-sm leading-relaxed text-on-surface-variant">
          {messages.safety.bannerShort}
        </p>
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container"
          aria-label={messages.safety.collapse}
        >
          <span className="material-symbols-outlined text-base">expand_less</span>
        </button>
      </div>
    </div>
  );
}
