# Google Stitch Prompt — Scraper Admin Console

Copy the block below into Google Stitch when generating admin UI prototypes.

---

## Prompt (English — recommended for Stitch)

```
Design an operator admin console for "手慢无 (ShouManWu)", a Venice free-items discovery app. This is NOT the consumer map app — it is a solo-operator scraping control panel at /admin.

DESIGN SYSTEM (strict):
- Structured Minimalist / Notion-adjacent monochrome document UI
- Inter font, Material Symbols Outlined icons
- Surfaces: #f9f9f8 / white; borders: thin #e5e5e5; NO card drop shadows
- Primary button: black fill, white text
- Chips/badges: light gray #f1f1f0 background
- 4px spacing grid; generous whitespace; table-heavy, calm, professional

SCREENS TO GENERATE (desktop 1440px, also show collapsed sidebar variant):

1) ADMIN DASHBOARD (/admin)
- Left sidebar nav: Dashboard, Sources, Runs, Translation, Settings
- Top: page title "Scraper Admin" + operator email chip
- Global status row: "Global pause" toggle (off by default), "Last sync" timestamp, "Pending translations: 3" link
- Five source cards in a row (wrap on smaller width):
  • Subito — badge "Running", toggle on, "Every 90 min", "Last run: 12 min ago · Success · 47 listings", [Run now] button
  • Facebook Marketplace — badge "Coming soon", toggle off, grayed helper text
  • Vinted — Coming soon
  • Wallapop — Coming soon
  • eBay — Coming soon
- Section "Recent alerts": 2 rows of failed run snippets with red-adjacent text only (no bright red boxes)
- Footer stats: Inserted 24h | Failed runs 7d | Avg selector rate

2) SOURCE DETAIL (/admin/sources/subito)
- Breadcrumb: Sources > Subito
- Form sections with thin horizontal rules (not cards with shadow):
  • Enabled toggle
  • Interval: numeric stepper "90" minutes with hint "Min 30 · Max 1440"
  • URLs textarea (3 Venice regalo category URLs shown)
  • Anti-block preset: 3-option segmented control — Conservative | Standard (selected) | Aggressive — one-line description under each
  • Read-only info panel: "Validation thresholds (fixed): selector ≥90%, count ≥50% median, geo ≥50%"
- Sticky footer: [Save changes] [Run now]

3) RUN HISTORY (/admin/runs)
- Filter bar: source dropdown, status, date range
- Data table with columns: Started, Source, Status, Found, Inserted, Selector rate, Actions (View)
- Pagination at bottom

4) TRANSLATION QUEUE (/admin/translation)
- Toggle "Auto-translate listings (Gemini)" on
- Banner: "2 listings pending translation"
- Table: checkbox, Listing, Source, Error, Retries, [Retry]
- Top action: [Re-translate all pending]

5) SETTINGS (/admin/settings)
- Global pause toggle (duplicate OK)
- Proxy URL masked field + "Configured" status
- Telegram Chat ID, Alert email To
- Muted note: "Bot token and Resend API key are set on the server"

STATES: Show one empty state on Runs — "No runs yet. Run Subito manually from the dashboard."

DO NOT USE: rounded-xl cards, glassmorphism, saturated accent colors, default shadcn purple/blue theme, hero marketing layouts.

Output: clean HTML prototype per screen folder, matching existing app screens like map_explorer_notion_style in the same design language.
```

---

## Prompt (中文摘要 — 给 operator 阅读)

为 Venice 免费物品 App「手慢无」设计 **运营后台 /admin**（不是用户地图页）：

- 黑白文档风、Inter 字体、细边框、无阴影
- 5 个页面：Dashboard、Source 详情、Run 历史、翻译队列、Settings
- Dashboard 优先展示各抓取源状态（Subito 运行中，FB/Vinted/Wallapop/eBay 显示「即将支持」）
- 支持：全局暂停、立即运行、每源频率 30min–24h、防封三档、代理与告警配置、自动翻译开关与重试队列

---

## After Stitch

1. Save prototypes under `.planning/google-stitch-ui-design/admin_*_notion_style/`
2. Update `DESIGN.md` if new admin-specific tokens needed
3. Run `/gsd-ui-phase 6` or reference prototypes in `/gsd-plan-phase 6`

---

*Prompt version: 1.0 — 2026-08-04*
