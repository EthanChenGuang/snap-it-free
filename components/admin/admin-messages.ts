export const adminNav = {
  dashboard: '概览',
  sources: '数据源',
  runs: '运行记录',
  rejects: '拒绝记录',
  translation: '翻译队列',
  settings: '系统设置',
} as const;

export const adminShellMessages = {
  brandTitle: 'Scraper Worker',
  brandSubtitle: 'Admin Console',
  topBarTitle: 'Scraper Admin',
  loadError: '无法加载配置。请刷新或检查网络。',
} as const;

export type AdminNavKey = keyof typeof adminNav;

export const adminNavItems: Array<{
  key: AdminNavKey;
  href: string;
  icon: string;
  badge?: 'pendingTranslations' | 'rejects';
}> = [
  { key: 'dashboard', href: '/admin', icon: 'dashboard' },
  { key: 'sources', href: '/admin/sources', icon: 'source' },
  { key: 'runs', href: '/admin/runs', icon: 'play_arrow' },
  { key: 'rejects', href: '/admin/rejects', icon: 'block', badge: 'rejects' },
  { key: 'translation', href: '/admin/translation', icon: 'translate', badge: 'pendingTranslations' },
  { key: 'settings', href: '/admin/settings', icon: 'settings' },
];
