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
  runModeMenuLabel: '选择运行模式',
  runModeIncremental: '增量抓取',
  runModeIncrementalHelp: '仅抓取最新 listing',
  runModeFull: '全量抓取',
  runModeFullHelp: '完整刷新，关闭 early-stop',
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
  runQueued: '任务已提交，等待 worker 执行（约 1 分钟内）。',
  runQueuedPaused: '全局暂停中：仅执行本次手动任务，计划抓取仍暂停。',
  runSourceDisabled: '数据源已暂停，仍可手动运行一次。',
  runSubmitting: '提交中…',
  runWaitingWorker: '等待 worker 接收任务…',
  runInProgress: '抓取进行中…',
  runComplete: '运行完成',
  runFailed: '无法提交运行任务',
  refreshList: '刷新',
  globalPauseBanner: '全局暂停中：计划抓取已停，「立即运行」仍可手动触发。',
  globalPauseHint: '集成数据源 · 全局暂停中（可手动运行）',
  lastRunLabel: '上次运行',
  recentRunLabel: '最近一次运行',
  lastFullSuccessLabel: '上次全量成功',
  lastFullSuccessNone: '暂无成功记录',
  noDataPlaceholder: '-',
  runStatusSuccess: '成功',
  runStatusFailed: '失败',
  runStatusRunning: '运行中',
  listingsCountBadge: (count: number) => `${count} listings`,
  listingsCountEmpty: '0 listings',
  antiBlockPrefix: '防封',
  intervalPrefix: '频率',
  validateUrls: '测试 URL',
  validateUrlsRunning: (count: number) => `正在验证 ${count} 个 URL…`,
  validateUrlsEmpty: '请先添加至少一个 URL。',
  validateUrlsAllPass: (count: number) => `${count} 个 URL 格式与可达性验证通过。`,
  validateUrlsPartialFail: (failed: number, total: number) =>
    `${failed}/${total} 个 URL 未通过验证。`,
  validateUrlsFormatError: '格式错误',
  validateUrlsReachError: '不可达',
  validateUrlsRequestError: '无法完成 URL 验证，请稍后重试。',
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
  pageSubtitle: '每次后台抓取任务一条记录（非单条 URL）',
  filterAllSources: '全部数据源',
  filterAllStatuses: '全部状态',
  filterAllModes: '全部模式',
  filterAllTriggers: '全部触发方式',
  filterStatusSuccess: '成功',
  filterStatusFailed: '失败',
  filterStatusPartial: '未正常完成',
  filterStatusRunning: '运行中',
  filterModeIncremental: '增量',
  filterModeFull: '全量',
  filterTriggerCron: '定时',
  filterTriggerManual: '手动',
  emptyHeading: '暂无运行记录',
  emptyBody: '近 7 天内尚无后台抓取记录。请在概览页对 Subito 点击「立即运行」以填充此视图。',
  emptyCta: '返回概览',
  tableStarted: '开始时间',
  tableSource: '数据源',
  tableStatus: '状态',
  tableMode: '模式',
  tableTrigger: '触发',
  tableDuration: '耗时',
  tableFound: '发现',
  tableInserted: '入库',
  tableRejected: '拒绝',
  tableReason: '原因',
  tableSelectorRate: 'Selector rate',
  tableActions: '操作',
  viewDetail: '查看详情',
  statusSuccess: '成功',
  statusFailed: '失败',
  statusSkipped: '已跳过',
  statusIncomplete: '未完成',
  statusRunning: '运行中',
  triggerCron: '定时',
  triggerManual: '手动',
  triggerUnknown: '—',
  modeIncremental: '增量',
  modeFull: '全量',
  modeUnknown: '—',
  runCount: (n: number, days = 7) => `近 ${days} 天 · ${n} 条`,
} as const;

export const runsMasterDetailMessages = {
  segmentLabel: '状态筛选',
  segmentAll: '全部',
  segmentFailed: '仅失败',
  segmentSkipped: '已跳过',
  timeFilterLabel: '时间范围',
  timeDays7: '近 7 天',
  timeDays14: '近 14 天',
  timeDays30: '近 30 天',
  timeFilterHint: '切换时间范围将刷新列表数据',
  metricFound: '发现数',
  metricInserted: '入库数',
  metricRejected: '拒绝数',
  metricDuration: '总耗时',
  logTitle: '运行日志',
  copyLog: '复制',
  copied: '已复制',
  selectRunTitle: '选择一条运行记录',
  selectRunBody: '在左侧列表中点击记录，即可在此查看指标与日志详情。',
  detailLoadError: '无法加载运行详情',
} as const;

export const runDetailMessages = {
  pageTitle: '运行详情',
  breadcrumbRuns: '运行记录',
  runLabel: (id: string) => `运行 #${id.slice(0, 8)}`,
  timeRange: (started: string, finished: string | null, duration: string) =>
    finished ? `${started} → ${finished} (${duration})` : `${started}（运行中）`,
  triggerCron: '定时任务',
  triggerManual: '手动触发',
  triggerUnknown: '未知触发',
  funnelTitle: '结果漏斗',
  funnelFound: '发现',
  funnelCrawlSkipped: '抓取跳过',
  funnelInserted: '入库',
  funnelUpdated: '更新',
  funnelPersistSkipped: '持久化跳过',
  funnelRejected: '拒绝',
  qualityTitle: '质量指标',
  metricSelectorRate: 'Selector rate',
  metricJsonCompleteness: 'JSON 完整度',
  metricHttpRequests: 'HTTP 请求数',
  metricBlockedUrls: 'Blocked URL',
  urlBreakdownTitle: '分类 URL',
  urlBreakdownEmpty: '本次运行未记录 URL 明细（历史数据）。',
  urlColumnLabel: '分类',
  urlColumnFound: '发现',
  urlColumnCrawlSkipped: '抓取跳过',
  urlColumnStatus: '状态',
  urlStatusOk: '正常',
  urlStatusNotRun: '未抓取',
  urlStatusBlocked: 'Blocked',
  urlEarlyStop: 'Early-stop',
  metricFound: '发现数',
  metricInserted: '入库数',
  metricRejected: '拒绝数',
  metricCrawlSkipped: '抓取层跳过',
  metricWallTime: '墙钟时间',
  crawlModeIncremental: '增量',
  crawlModeFull: '全量',
  crawlModeUnknown: '—',
  degradedChip: '降级',
  jobLink: '关联任务',
  logSection: '日志摘要',
  logSuccess: '运行成功完成，未发现错误。',
  logDegraded: '运行完成但处于降级模式，请检查代理或 block 状态。',
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
  selectRejectTitle: '选择一条拒绝记录',
  selectRejectBody: '从左侧列表选择记录，查看完整上下文与命中规则。',
  detailListingId: 'Listing ID',
  detailSource: '数据源',
  detailFoundAt: '发现时间',
  copyListingId: '复制 Listing ID',
  copiedListingId: '已复制',
  ruleAnalysisTitle: '命中规则分析',
  ruleStrategyLabel: '策略',
  rulePatternLabel: '匹配模式',
  ruleRawReasonLabel: '原始原因',
  snapshotTitle: '文本快照',
  snapshotTitleLabel: '标题',
  snapshotDescriptionLabel: '描述',
  snapshotRawJson: '原始 JSON',
  linkedRun: '关联运行',
  rescrapeOne: '重新抓取此条',
  rescraping: '抓取中…',
  rescrapeSuccess: '已重新入库，关键词过滤已跳过',
  rescrapeSuccessOffline: '已从快照恢复入库（原 listing 可能已下架，暂无图片）',
  rescrapeFailed: '重新抓取失败',
  viewListing: '查看 listing',
} as const;

export const rejectsMasterDetailMessages = {
  countChip: (n: number) => `共 ${n} 条拒绝记录`,
} as const;

function formatTranslationDurationMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function translationProviderLabel(provider: 'gemini' | 'openrouter'): string {
  return provider === 'gemini' ? 'Gemini' : 'OpenRouter';
}

export const translationMessages = {
  pageTitle: '翻译队列',
  pageSubtitle: '监控待翻译与失败的 listing，支持单条或批量重试。',
  pendingBanner: (n: number) => `${n} 条 listing 等待翻译`,
  pendingBannerTruncated: (shown: number, total: number) =>
    `${total} 条 listing 等待翻译（仅显示前 ${shown} 条，请重试后刷新查看剩余）`,
  retry: '重试',
  retryAll: '重新翻译',
  retrying: '翻译中…',
  retryAllPending: '重新翻译全部待处理',
  batchSelection: (selected: number, total: number) =>
    `已选 ${selected} 项 / 共 ${total} 条待翻译`,
  batchRetry: '批量重试',
  batchRetrying: (n: number) => `翻译中… (${n} 条，约需 8 秒)`,
  clearSelection: '清空选中',
  attemptsLabel: (n: number) => `重试 ${n} 次`,
  tableListing: 'Listing',
  tableStatus: '状态',
  tableAttempts: '重试次数',
  tableError: '错误信息',
  tableActions: '操作',
  statusPending: '待翻译',
  statusFailed: '失败',
  errorBadgeLabel: (error: string) => {
    const lower = error.toLowerCase();
    if (
      lower.includes('provider') ||
      lower.includes('api key') ||
      lower.includes('translation providers failed')
    ) {
      return 'Provider 异常';
    }
    return '翻译失败';
  },
  emptyHeading: '翻译队列为空',
  emptyBody: '所有 listing 已完成翻译。',
  translateSuccessDetail: (provider: 'gemini' | 'openrouter', durationMs: number) =>
    `翻译成功 · ${translationProviderLabel(provider)} · ${formatTranslationDurationMs(durationMs)}`,
  translateSuccessBatch: (
    items: Array<{ provider: 'gemini' | 'openrouter'; durationMs: number }>,
  ) => {
    const count = items.length;
    if (count === 0) {
      return '翻译成功';
    }
    if (count === 1) {
      const item = items[0];
      return `翻译成功 · ${translationProviderLabel(item.provider)} · ${formatTranslationDurationMs(item.durationMs)}`;
    }
    const avgMs = items.reduce((sum, item) => sum + item.durationMs, 0) / count;
    const providers = new Set(items.map((item) => item.provider));
    const providerPart =
      providers.size === 1 ? ` · ${translationProviderLabel(items[0].provider)}` : '';
    return `已成功翻译 ${count} 条${providerPart} · 平均 ${formatTranslationDurationMs(avgMs)}`;
  },
  translateSuccess: (n: number) => (n === 1 ? '翻译成功' : `已成功翻译 ${n} 条`),
  translateFailureBatch: (n: number) =>
    n === 1 ? '1 条翻译失败，请查看错误信息' : `${n} 条翻译失败，请查看错误信息`,
  translatePartialBatch: (successCount: number, failureCount: number) =>
    `成功 ${successCount} 条，失败 ${failureCount} 条`,
} as const;

export const settingsMessages = {
  pageTitle: '系统设置',
  sectionTitle: '系统配置',
  sectionSubtitle: '管理核心运行参数与告警路由。',
  globalPauseTitle: '全局暂停',
  globalPauseHelp: '停止所有计划抓取；「立即运行」仍可手动触发。',
  pauseInactive: '未启用',
  pauseActive: '已启用',
  proxyTitle: '代理配置',
  proxyUrlLabel: 'Proxy URL',
  proxyHelp: '用于所有出站抓取请求，防止 IP 封禁。',
  proxyConfigured: '已配置',
  proxyNotConfigured: '未配置',
  proxyPlaceholder: 'http://user:pass@proxy.example.com:8080',
  updateConfiguration: '更新配置',
  alertRoutingTitle: '告警路由',
  telegramChatIdLabel: 'Telegram Chat ID',
  telegramHelp: '用于即时错误广播。',
  alertEmailLabel: '告警邮件收件人',
  alertEmailHelp: '用于每日运行摘要与严重失败通知。',
  autoTranslateLabel: '自动翻译',
  autoTranslateHelp: '关闭后仅存储原始文本，不写入 title_en/zh 等列。',
  dailyCapLabel: '每日翻译上限',
  dailyCapHelp: '全站 Gemini + OpenRouter 共享配额；超出后暂停自动翻译，抓取继续。',
  capExceededNotice: '已达每日翻译上限，自动翻译已暂停。',
  translationProviderLabel: '翻译提供商',
  providerGemini: 'Gemini',
  providerOpenrouter: 'OpenRouter',
  serverKeysNote: 'Bot token 与 Resend API key 在服务端配置',
  saveError: '保存失败。请检查字段后重试，或刷新页面。',
  allowlistTitle: 'Operator 允许名单',
  allowlistHelp: '输入邮箱并保存以添加 operator；无需预先注册。',
  allowlistEmailPlaceholder: 'ops@example.com',
  allowlistAdd: '保存',
  allowlistDelete: '删除',
  allowlistDeleteConfirm: '删除 operator：此操作不可撤销（若仅剩一人则禁用）',
  allowlistDeleteBlockedSelf: '不能删除自己的 operator 权限',
  allowlistDeleteBlockedLast: '至少保留一名 operator',
  crawlEfficiencyTitle: '抓取效率',
  earlyStopKLabel: 'Early-stop K',
  earlyStopKHelp: '每个分类 URL 在停止前允许的连续已知未变 listing 数',
  fullRefreshHoursLabel: '全量刷新（小时）',
  fullRefreshHoursHelp: '下次自动全量抓取前的间隔（该次运行关闭 early-stop）',
  maxPagesLabel: '每 URL 最大页数',
  maxPagesHelp: '仅全量刷新运行分页上限；增量抓取始终为第 1 页',
  runFullCrawl: '立即全量抓取',
  runFullCrawlStarting: '启动中…',
  runFullCrawlError: '无法启动全量抓取，请重试',
  lastBlockReasonLabel: '最近封禁原因',
  lastBlockReasonEmpty: '暂无封禁记录',
  proxyQuotaFallbackReason:
    '代理流量已用尽 — 已降级为直连抓取（PROXY-C04）',
  degradedRunsLabel: '降级运行次数',
  degradedBannerTitle: '降级运行中',
  degradedBannerBody:
    '未配置代理。全量生产抓取可能被封；相关运行已标记为降级。',
  degradedBannerSettingsLink: '打开代理设置',
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
