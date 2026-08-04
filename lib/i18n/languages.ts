import type { AppLanguage } from '@/lib/settings/preferences';

export const LANGUAGES: { id: AppLanguage; label: string; sublabel: string }[] = [
  { id: 'zh', label: '中文', sublabel: 'Chinese' },
  { id: 'en', label: 'English', sublabel: 'English' },
  { id: 'it', label: 'Italiano', sublabel: 'Italian' },
];
