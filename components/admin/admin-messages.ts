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

export const sourcesMessages = {
  pageTitle: '数据源',
  sectionHeading: '集成数据源',
  tableSource: '数据源',
  tableStatus: '状态',
  tableEnabled: '启用',
  tableInterval: '频率',
  tableAntiBlock: '防封策略',
  tableLastRun: '上次运行',
  tableActions: '操作',
  edit: '编辑',
  runNow: '立即运行',
  statusRunning: '运行中',
  statusComingSoon: '即将支持',
  statusPaused: '已暂停',
  intervalEvery: (minutes: number) => `每 ${minutes} 分钟`,
  lastRunNone: '暂无记录',
  comingSoonRunBlocked: '该数据源尚未接入，无法运行。',
  saveSuccess: '配置已保存。',
  intervalRangeError: '间隔必须在 30–1440 分钟之间。',
  detailTitle: (name: string) => `${name} 配置`,
  detailSubtitle: '管理该数据源的抓取参数与目标 URL。',
  breadcrumbSources: '数据源',
  sourceStatusLabel: '数据源状态',
  sourceStatusHelp: '启用或禁用该数据源的后台抓取。',
  intervalLabel: '运行间隔（分钟）',
  intervalHelp: '执行频率。最小 30 · 最大 1440',
  urlsLabel: '目标 URL',
  urlsHelp: '每行一个 URL，作为 scraper 入口。',
  antiBlockLabel: '防封策略',
  antiBlockHelp: '选择网络请求的行为配置。',
  presetConservative: '保守',
  presetStandard: '标准',
  presetAggressive: '激进',
  thresholdsLabel: '验证阈值（只读）',
  thresholdsHelp: '由 worker 常量控制，不可在此修改。',
  thresholdSelector: 'Selector 命中率',
  thresholdCount: '产出数量比',
  thresholdGeo: '地理解析率',
  save: '保存更改',
  cancel: '取消',
  saveFooterNote: '更改将在下次 worker 周期生效。',
} as const;

export const antiBlockPresetLabels: Record<string, string> = {
  conservative: sourcesMessages.presetConservative,
  standard: sourcesMessages.presetStandard,
  aggressive: sourcesMessages.presetAggressive,
};

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
