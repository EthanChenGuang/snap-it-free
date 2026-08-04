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

export const SOURCE_SLUGS = ['subito', 'facebook', 'vinted', 'wallapop', 'ebay'] as const;

export const sourceDisplayNames: Record<string, string> = {
  subito: 'Subito',
  facebook: 'Facebook Marketplace',
  vinted: 'Vinted',
  wallapop: 'Wallapop',
  ebay: 'eBay.it',
};

export const runsMessages = {
  pageTitle: '运行记录',
  filterAllSources: '全部数据源',
  emptyHeading: '暂无运行记录',
  emptyBody: '系统中尚无后台抓取记录。请在概览页对 Subito 点击「立即运行」以填充此视图。',
  emptyCta: '返回概览',
  tableStarted: '开始时间',
  tableSource: '数据源',
  tableStatus: '状态',
  tableFound: '发现',
  tableInserted: '入库',
  tableRejected: '拒绝',
  tableSelectorRate: 'Selector rate',
  tableActions: '操作',
  viewDetail: '查看详情',
  statusSuccess: '成功',
  statusFailed: '失败',
  statusPartial: '部分成功',
  statusRunning: '运行中',
  runCount: (n: number) => `${n} 条记录`,
} as const;

export const runDetailMessages = {
  pageTitle: '运行详情',
  breadcrumbRuns: '运行记录',
  runLabel: (id: string) => `运行 #${id.slice(0, 8)}`,
  metricFound: '发现数',
  metricInserted: '入库数',
  metricRejected: '拒绝数',
  metricSelectorRate: 'Selector rate',
  logSection: '日志摘要',
  logSuccess: '运行成功完成，未发现错误。',
  rejectsLink: '查看本次拒绝记录',
  sourceConfig: '数据源配置',
} as const;

export const rejectsMessages = {
  pageTitle: '抓取拒绝记录',
  pageSubtitle: '查看被过滤规则拒绝的抓取结果，用于调优过滤策略。',
  filterAllSources: '全部数据源',
  filterAllReasons: '全部拒绝原因',
  reasonOutsideVenice: '超出 Venice 范围',
  reasonDuplicate: '重复 listing',
  reasonKeywordFilter: '关键词过滤',
  reasonPriceOutlier: '价格异常',
  reasonMissingData: '缺少关键字段',
  showingCount: (n: number) => `共 ${n} 条拒绝记录`,
  export: '导出',
  emptyHeading: '暂无拒绝记录',
  emptyBody: '当抓取结果被过滤规则拒绝时，记录会出现在此处。',
  tableFoundAt: '发现时间',
  tableSource: '数据源',
  tableListingId: 'Listing ID',
  tableReason: '原因',
  tablePreview: '预览',
  tableActions: '操作',
  viewJson: '查看 JSON',
  hideJson: '收起 JSON',
} as const;

export const translationMessages = {
  pageTitle: '翻译队列',
  pageSubtitle: '监控待翻译与失败的 listing，支持单条或批量重试。',
  pendingBanner: (n: number) => `${n} 条 listing 等待翻译`,
  retry: '重试',
  retryAll: '重新翻译',
  retrying: '翻译中…',
  retryAllPending: '重新翻译全部待处理',
  tableListing: 'Listing',
  tableStatus: '状态',
  tableAttempts: '重试次数',
  tableError: '错误信息',
  tableActions: '操作',
  statusPending: '待翻译',
  statusFailed: '失败',
  emptyHeading: '翻译队列为空',
  emptyBody: '所有 listing 已完成翻译。',
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
