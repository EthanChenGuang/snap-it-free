import type { AppLanguage } from '@/lib/settings/preferences';

export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'zh';

  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('en')) return 'en';
  return 'zh';
}
