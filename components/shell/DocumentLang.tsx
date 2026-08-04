'use client';

import { useMessages } from '@/lib/i18n/useMessages';
import type { AppLanguage } from '@/lib/settings/preferences';
import { useEffect } from 'react';

const HTML_LANG: Record<AppLanguage, string> = {
  zh: 'zh-CN',
  en: 'en',
  it: 'it',
};

export function DocumentLang() {
  const { language } = useMessages();

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language];
  }, [language]);

  return null;
}
