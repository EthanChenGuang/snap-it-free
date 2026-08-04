---
phase: 6
slug: scraper-admin-console
status: approved
shadcn_initialized: false
preset: stitch-scraper-dashboard
created: 2026-08-04
---

# Phase 6 — UI Design Contract

> **Authority:** Scraper Admin UI MUST strictly follow Google Stitch prototype  
> `.planning/google-stitch-ui-design/scraper-dashboard/admin_dashboard/code.html`  
> for shell layout, tokens, component shapes, and interaction patterns.  
> Token source: `.planning/google-stitch-ui-design/scraper-dashboard/DESIGN.md`.  
> Sibling screens port their own `code.html` but reuse the **same shell** (sidebar width, header height, borders, typography) as `admin_dashboard`.

---

## Design Authority & Screen Map

| Route | Stitch prototype (PRIMARY) | Notes |
|-------|------------------------------|-------|
| `/admin` | **`admin_dashboard/code.html`** | **Canonical shell + dashboard** |
| `/admin/sources` | `source_list_admin_console/code.html` | Same shell as dashboard |
| `/admin/sources/[id]` | `source_detail_subito/code.html` | Same shell |
| `/admin/runs` | `run_history_empty_state/code.html` | Extend for populated rows |
| `/admin/runs/[id]` | `run_detail_subito/code.html` | Same shell |
| `/admin/rejects` | `reject-details/code.html` | Adds **Rejects** nav item (only deviation to nav list) |
| `/admin/translation` | `translation_queue/code.html` | Same shell |
| `/admin/settings` | `admin_settings/code.html` | Same shell |

**Implementation reference (logic only, NOT visual):** `scraper-admin/` — restyle to Stitch; do not ship Notion/lucide styling.

**Port target:** Next.js App Router under `app/admin/**`, shared `AdminShell` component.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (port Stitch HTML → React; no default shadcn theme) |
| Preset | `stitch-scraper-dashboard` |
| Component library | Radix primitives OK when restyled to Stitch tokens (D-53 workspace rule) |
| Icon library | **Material Symbols Outlined** only (`admin_dashboard` uses `material-symbols-outlined`) |
| Font | **Inter** — **2 weights only:** 400 regular, 600 semibold (via Google Fonts or next/font) |

**Anti-patterns (BLOCKING):**
- lucide-react icons in admin UI
- Notion palette (`#37352f`, `#787774`, emoji page icons) from `scraper-admin/`
- Default shadcn saturated theme, card drop shadows, rounded-xl/2xl marketing cards
- Redesigning dashboard layout — port structure from `admin_dashboard/code.html`

---

## Layout Shell (from `admin_dashboard`)

Must match prototype structure:

```
┌─────────────────────────────────────────────────────────┐
│ SideNav: fixed w-64, border-r outline-variant, surface  │
│   - Title: "Scraper Worker" / subtitle "Admin Console"  │
│   - Nav items with Material icon + label-md             │
│   - Active: font-bold + border-r-2 border-primary       │
│   - Operator avatar footer                              │
├─────────────────────────────────────────────────────────┤
│ TopAppBar: sticky h-16, border-b, px-gutter             │
│   - Title: "Scraper Admin" (headline-md)                │
│   - Operator email chip (rounded-full, surface-container-high) │
├─────────────────────────────────────────────────────────┤
│ Main: max-w-container-max (1200px), p-gutter            │
│ Footer stats bar: border-t, label-sm metrics row        │
└─────────────────────────────────────────────────────────┘
```

**Sidebar nav (dashboard prototype):** Dashboard, Sources, Runs, Translation, Settings  
**Extension:** Insert **Rejects** (`block` icon) between Runs and Translation per `reject-details/code.html`.

**Responsive:** Sidebar `hidden md:flex`; main `md:ml-64` — match prototype breakpoints.

### Visual hierarchy (focal point)

1. **Primary anchor:** Global status row (pause + last sync + pending translations) — first scan target on `/admin`.
2. **Secondary:** Subito source card in the grid (only live card with enabled toggle + **立即运行**).
3. **Tertiary:** Recent alerts list below the fold; footer stats as persistent baseline metrics.

Executor must not reorder these blocks or introduce competing saturated CTAs.

---

## Spacing Scale

From `admin_dashboard` Tailwind config / DESIGN.md — multiples of 4:

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, chip padding |
| space-sm | 8px | Tight inline spacing |
| space-md | 16px | Card padding, status row padding |
| space-lg | 24px | Section gaps, grid gap, sidebar py |
| space-xl | 48px | Section breaks (mb-space-xl) |
| gutter | 24px | Page horizontal padding (`px-gutter`, `p-gutter`) |
| container-max | 1200px | Main content max width |

Exceptions: none

---

## Typography

**Contract cap:** 4 sizes × 2 weights (400 / 600). Prototype HTML may reference additional Tailwind tokens; implementation maps them into this contract.

| Token | Size | Weight | Line height | Prototype alias | Usage |
|-------|------|--------|-------------|-----------------|-------|
| headline | 30px | 600 | 1.3 | `font-headline-md` | TopAppBar page titles |
| heading | 24px | 600 | 1.4 | `font-headline-sm`, `font-h3` | Section titles, card names, empty-state headings |
| body | 15px | 400 | 1.6 | `font-body-md` | Alerts, descriptions, table cell text |
| label | 14px | 400 / 600 | 1.4 | `font-label-md`, `font-label-sm` | Nav, buttons, schedule meta, footer stats |

**Prototype mapping notes:**
- Prototype `font-label-sm` (12px) → render at **label 14px** with `letter-spacing: 0.01em` and `text-secondary` for de-emphasis (keeps 4-size cap).
- Prototype `font-h1` (40px) on source detail → use **headline 30px** to match admin shell consistency.
- Monospace JSON snippets in rejects table: **body 15px** + `font-mono` (not a 5th size).
- Bold nav active state: **600** on label token; do not introduce weight 700.

**Locale (D-34):** UI chrome in **Chinese**; keep source names and technical terms in English (`Subito`, `selector rate`, `UTC`).

---

## Color

From `admin_dashboard` / DESIGN.md — monochrome document-first:

| Role | Token / hex | Usage |
|------|-------------|-------|
| Dominant (60%) | `surface` `#F9F9F8`, `background` `#f9f9f9` | Page bg, cards |
| Secondary (30%) | `surface-container-low` `#f3f3f3`, `surface-container-high` | Disabled/coming-soon cards, chips |
| Primary action | `primary` `#000000` on `on-primary` `#ffffff` | **Run now** full-width buttons only |
| Borders | `outline-variant` `#cfc4c5` / `#c4c7c7` | All card/row borders — **no drop shadow** |
| Muted text | `secondary` `#615e57`, `outline` | Meta lines, schedule text |
| Error (text/icon only) | `error` `#BA1A1A` | Alert rows, failed metrics — not filled red blocks |
| Status chips | `surface-container` bg + `outline-variant` border | Running / Coming soon badges |

**Coming soon cards:** `bg-surface-container-low opacity-75`, disabled toggle, italic helper — match Facebook card in prototype.

Accent reserved for: **none** — no orange/saturated accents in admin (consumer `accent-orange` NOT used here).

---

## Component Contracts (dashboard)

### Global status row
- Border `border-outline-variant`, `rounded-lg`, `p-space-md`
- **Global pause** toggle (peer checkbox pattern from prototype)
- Divider `h-6 w-px bg-outline-variant`
- **Last sync** label-sm secondary + primary timestamp (UTC display, Rome in tooltip optional)
- Link: **Pending translations: N** → `/admin/translation`

### Source card grid
- `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-space-lg`
- Card: `border border-outline-variant bg-surface rounded-lg p-space-lg`
- Header: name (h3) + status chip (`rounded-full`, light gray chip)
- Enable toggle: same peer switch as prototype (black when on)
- Meta: `Schedule: Every {n} min` + last run line (label-sm secondary)
- CTA: `Run now` — `bg-primary text-on-primary w-full rounded` button

### Recent alerts
- List container with `divide-y divide-outline-variant`
- Row: Material `error` icon + `text-error` body-md message
- Format: `{Source} | {failure} | {time}`

### Footer stats
- `border-t border-outline-variant`, flex wrap, label-sm
- Metrics: Inserted 24h, Failed runs 7d, Avg selector rate

---

## Copywriting Contract

### Shell (all routes)

| Element | Copy (zh primary) |
|---------|-------------------|
| App title (sidebar) | Scraper Worker / 副标题：Admin Console |
| Header title (dashboard) | 抓取管理 |
| Nav: Dashboard | 概览 |
| Nav: Sources | 数据源 |
| Nav: Runs | 运行记录 |
| Nav: Rejects | 拒绝记录 |
| Nav: Translation | 翻译队列 |
| Nav: Settings | 系统设置 |
| Global pause | 全局暂停 |
| Last sync | 上次同步：{timestamp} UTC |
| Pending translations link | 待翻译：{n} |
| Status: Running | 运行中 |
| Status: Coming soon | 即将支持 |
| Status: Paused | 已暂停 |
| Primary CTA | 立即运行 |
| Save | 保存更改 |
| Go to dashboard | 返回概览 |

### `/admin` (admin_dashboard)

| Element | Copy |
|---------|------|
| Section: Sources | 数据源 |
| Section: Recent alerts | 最近告警 |
| Schedule line | 频率：每 {n} 分钟 |
| Last run line | 上次运行：{relative} · {Success\|Failed} · {count} listings |
| Coming soon helper | 该数据源尚未接入 |
| Run now blocked (coming soon) | 该数据源尚未接入，无法运行。 |
| Destructive: global pause on | 已暂停所有抓取线程 |
| Footer: Inserted 24h | 24h 入库 |
| Footer: Failed runs 7d | 7d 失败运行 |
| Footer: Avg selector rate | 平均 selector rate |

### `/admin/sources` (source_list_admin_console)

| Element | Copy |
|---------|------|
| Page title | 数据源 |
| Section heading | 集成数据源 |
| Add source | 添加数据源 |
| Table: Source | 数据源 |
| Table: Status | 状态 |
| Table: Enabled | 启用 |
| Table: Interval | 频率 |
| Table: Anti-block | 防封策略 |
| Table: Last run | 上次运行 |
| Table: Actions | 操作 |
| Row action: Edit | 编辑 |

### `/admin/sources/[id]` (source_detail_subito)

| Element | Copy |
|---------|------|
| Breadcrumb | 数据源 › {SourceName} |
| Page title | {SourceName} 配置 |
| Subtitle | 管理该数据源的抓取参数与目标 URL。 |
| Source status label | 数据源状态 |
| Source status help | 启用或禁用该数据源的后台抓取。 |
| Interval label | 运行间隔（分钟） |
| Interval help | 执行频率。最小 30 · 最大 1440 |
| URLs label | 目标 URL |
| URLs help | 每行一个 URL，作为 scraper 入口。 |
| Anti-block label | 防封策略 |
| Anti-block help | 选择网络请求的行为配置。 |
| Preset: Conservative | 保守 |
| Preset: Standard | 标准 |
| Preset: Aggressive | 激进 |
| Save success | 配置已保存。 |
| Validation: interval range | 间隔必须在 30–1440 分钟之间。 |

### `/admin/runs` (run_history_empty_state)

| Element | Copy |
|---------|------|
| Page title | 运行记录 |
| Filter: All sources | 全部数据源 |
| Empty heading | 暂无运行记录 |
| Empty body | 系统中尚无后台抓取记录。请在概览页对 Subito 点击「立即运行」以填充此视图。 |
| Table: Started | 开始时间 |
| Table: Source | 数据源 |
| Table: Status | 状态 |
| Table: Found / Inserted / Selector rate | 发现 / 入库 / Selector rate |
| Row action: View | 查看详情 |

### `/admin/runs/[id]` (run_detail_subito)

| Element | Copy |
|---------|------|
| Page title | 运行详情 |
| Status: Success | 成功 |
| Status: Failed | 失败 |
| Status: Running | 运行中 |
| Metric labels | 发现数 · 入库数 · 拒绝数 · Selector rate |
| Section: Log excerpt | 日志摘要 |
| Section: Rejects link | 查看本次拒绝记录 |

### `/admin/rejects` (reject-details)

| Element | Copy |
|---------|------|
| Page title | 抓取拒绝记录 |
| Filter: All sources | 全部数据源 |
| Filter: All reasons | 全部拒绝原因 |
| Reason: Outside Venice | 超出 Venice 范围 |
| Reason: Duplicate | 重复 listing |
| Reason: Keyword filter | 关键词过滤 |
| Reason: Price outlier | 价格异常 |
| Reason: Missing data | 缺少关键字段 |
| Showing count | 共 {n} 条拒绝记录 |
| Export | 导出 |
| Empty heading | 暂无拒绝记录 |
| Empty body | 当抓取结果被过滤规则拒绝时，记录会出现在此处。 |
| Table: Found at / Source / Listing ID / Reason / Preview / Actions | 发现时间 / 数据源 / Listing ID / 原因 / 预览 / 操作 |

### `/admin/translation` (translation_queue)

| Element | Copy |
|---------|------|
| Page title | 翻译队列 |
| Table: Listing / Status / Attempts / Actions | Listing / 状态 / 重试次数 / 操作 |
| Status: Pending | 待翻译 |
| Status: Failed | 失败 |
| Action: Retry | 重试 |
| Action: Re-translate | 重新翻译 |
| Empty heading | 翻译队列为空 |
| Empty body | 所有 listing 已完成翻译。 |

### `/admin/settings` (admin_settings)

| Element | Copy |
|---------|------|
| Page title | 系统设置 |
| Section title | 系统配置 |
| Section subtitle | 管理核心运行参数与告警路由。 |
| Global pause card title | 全局暂停 |
| Global pause help | 立即停止所有计划抓取；手动运行也将禁用。 |
| Pause status: Inactive / Active | 未启用 / 已启用 |
| Proxy card title | 代理配置 |
| Proxy URL label | Proxy URL |
| Proxy help | 用于所有出站抓取请求，防止 IP 封禁。 |
| Update configuration | 更新配置 |
| Alert routing title | 告警路由 |
| Telegram chat ID label | Telegram Chat ID |
| Telegram help | 用于即时错误广播。 |
| Alert email label | 告警邮件收件人 |
| Alert email help | 用于每日运行摘要与严重失败通知。 |
| Auto-translate toggle (D-25) | 自动翻译 |
| Auto-translate help | 关闭后仅存储原始文本，不写入 title_en/zh 等列。 |
| Daily translation cap label (D-43) | 每日翻译上限 |
| Daily translation cap help | 全站 Gemini + OpenRouter 共享配额；超出后暂停自动翻译，抓取继续。 |
| Cap exceeded notice | 已达每日翻译上限，自动翻译已暂停。 |
| Server keys note | Bot token 与 Resend API key 在服务端配置 |
| Save error | 保存失败。请检查字段后重试，或刷新页面。 |

### Shared errors

| Element | Copy |
|---------|------|
| Error state (load) | 无法加载配置。请刷新或检查网络。 |
| Destructive confirm (delete operator) | 删除 operator：此操作不可撤销（若仅剩一人则禁用） |

**English preserved:** Subito, Facebook Marketplace, Vinted, Wallapop, eBay, selector rate, UTC, Proxy URL, Listing ID, Telegram, API names.

---

## UI Considerations

Applicable state considerations resolved: 12 covered, 4 backstop, 0 unresolved

| Category | Element(s) | Status | Resolution |
|----------|------------|--------|------------|
| empty | E5 Run history | covered | Zero runs → `run_history_empty_state` layout; copy: 暂无运行记录 + 返回概览 CTA |
| empty | E6 Translation queue | covered | Zero pending → check_circle icon + 翻译队列为空 / 所有 listing 已完成翻译。 |
| empty | E8 Rejects table | covered | Zero rejects → centered empty block; copy: 暂无拒绝记录 + filter explanation |
| loading | E1–E8 data surfaces | covered | Shell renders immediately; tables/cards show `surface-container-high` skeleton pulse — no full-page blocker |
| error | E3 source cards, E7 settings | covered | Load: 无法加载配置。请刷新或检查网络。; Save: 保存失败。请检查字段后重试，或刷新页面。 |
| error | E4 alerts | covered | Failed runs appear as `text-error` rows in Recent alerts with source + time |
| populated | E3 source grid | covered | Five cards (1 live + 4 coming soon); grid cols per admin_dashboard |
| populated | E5/E6/E8 tables | covered | Row density matches each Stitch table prototype |
| partial | E2 global row, E6 queue | covered | Pending translations count in global row links to `/admin/translation` when N>0 |
| overflow | E4 alerts, E8 rejects | backstop | `{ statement: "Alert/reject preview truncates with ellipsis in list; full text on detail route", verification: backstop }` |
| long-text | E7 proxy URL, E8 JSON preview | backstop | `{ statement: "Long proxy URL and JSON preview scroll within fixed max-height container", verification: backstop }` |
| zero-one-many | E3 source cards | covered | Fixed five-source layout; singular/plural copy N/A — cards always named |
| disabled | E3 coming-soon toggles | covered | Disabled switch + 该数据源尚未接入 helper; Run now shows 该数据源尚未接入，无法运行。 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Switch, Checkbox, Table (if used) | Must restyle to Stitch tokens — no default theme import |
| Material Symbols | Outlined set only | CDN or self-hosted — match prototype |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all 8 screens + empty/error strings; zh primary per D-34
- [x] Dimension 2 Visuals: PASS — admin_dashboard shell; focal point declared
- [x] Dimension 3 Color: PASS — monochrome Stitch tokens; error text-only
- [x] Dimension 4 Typography: PASS — 4 sizes × 2 weights contract with prototype mapping
- [x] Dimension 5 Spacing: PASS — space-xs through space-xl + gutter 24px
- [x] Dimension 6 Registry Safety: PASS — shadcn restyled only; Material Symbols required

**Approval:** approved 2026-08-04 (revision 1 — post-checker fixes)

---

## UI-SPEC COMPLETE
