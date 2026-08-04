# PRD: Scraper Admin Console (Operator Dashboard)

**Product:** 手慢无 (ShouManWu) — Venice Free Finds  
**Screen set:** `/admin` operator console  
**Audience:** Solo operator (not end users)  
**Design system:** Google Stitch — Structured Minimalist / Notion-adjacent (see `.planning/google-stitch-ui-design/DESIGN.md`)

---

## 1. Problem

The scraper worker today is configured via `scraper/.env` (cron interval, proxy, alert tokens). The operator cannot:

- See scrape health at a glance
- Enable/disable sources or change frequency without redeploying
- Configure Facebook / Vinted / Wallapop / eBay for future crawlers
- Toggle auto-translation or retry failed translations
- Trigger a manual run or pause all scraping during maintenance

## 2. Goal

A **document-first, monochrome admin console** that lets one operator manage ingestion supply safely — without touching server env files for day-to-day changes.

## 3. Users & Access

| Role | Access |
|------|--------|
| Operator (email allowlist) | Full read/write on admin |
| End user | No access — `/admin` returns 403 or redirect |
| Worker (service role) | Read config + jobs; write runs (existing) |

Login reuses consumer Supabase Auth (Google / email). Only allowlisted emails see admin chrome.

## 4. Information Architecture

```
/admin                          → Dashboard (status-first)
/admin/sources                  → Source list (cards/table)
/admin/sources/[id]             → Source detail + edit
/admin/runs                     → scrape_runs history
/admin/runs/[id]                → Run detail
/admin/translation              → Translation queue + re-translate
/admin/settings                 → Global pause, auto-translate, alerts, proxy
```

**Navigation:** Left sidebar or top tabs — minimal, text labels, Material Symbols Outlined icons.

## 5. Screens

### 5.1 Dashboard (`/admin`)

**Purpose:** Answer "Is scraping healthy?" in 5 seconds.

**Sections:**

1. **Global status bar**
   - Global pause toggle (prominent)
   - Last config sync time (UTC + Europe/Rome)
   - Pending translation count (link to queue)

2. **Source status grid** (5 cards)
   - Subito, Facebook Marketplace, Vinted, Wallapop, eBay
   - Each card: name, status badge (`Running` | `Paused` | `Coming soon`), enabled toggle, next scheduled run, last run result (success/failed), listings found (last run)
   - Primary action: **Run now** (per card)

3. **Recent alerts** (last 3 failures)
   - Timestamp, source, failure code, one-line reason
   - Link to run detail

4. **Quick stats row**
   - Listings inserted (24h), failed runs (7d), avg selector hit rate (7d)

### 5.2 Source list (`/admin/sources`)

Table or card list with columns:

| Column | Notes |
|--------|-------|
| Source | Logo placeholder + name |
| Status badge | Running / Paused / Coming soon |
| Enabled | Toggle |
| Interval | e.g. `90 min` |
| Anti-block | Conservative / Standard / Aggressive |
| Last run | Relative time + outcome |
| Actions | Edit, Run now |

**Coming soon sources:** Toggle and fields editable but save shows helper text: "Crawler not live — config saved for when adapter ships."

### 5.3 Source detail (`/admin/sources/[id]`)

**Form fields:**

- Enabled (switch)
- Schedule interval (minutes, slider or stepper, **30–1440** range with validation hint)
- URL(s) (textarea, one per line) — Venice/Veneto scoped helper text
- Anti-block preset (3-option segmented control with short descriptions)
- Read-only validation thresholds info panel (selector 90%, count 50% median, geo 50%)

**Actions:** Save, Run now, View run history (filtered)

### 5.4 Run history (`/admin/runs`)

Paginated table from `scrape_runs`:

| started_at | source | status | found | inserted | updated | skipped | rejected | selector_hit_rate | actions |

Filters: source, status, date range.

### 5.5 Run detail (`/admin/runs/[id]`)

- All run metrics
- `failure_reason` full text if failed
- Link back to source config

### 5.6 Translation queue (`/admin/translation`)

- Global **Auto-translate** toggle (duplicate from settings OK)
- Pending count
- Table: listing id, source, title snippet, failed at, error, retry count
- Bulk action: **Re-translate selected** / **Re-translate all pending**

### 5.7 Settings (`/admin/settings`)

**Global controls:**

- Global pause all scraping
- Auto-translate on/off
- Default stagger minutes (read-only display 5–10 in MVP OK)

**Proxy:**

- Proxy URL (password-masked input)
- Status: configured / not configured

**Alerts:**

- Telegram chat ID
- Alert email `to` address
- Read-only: bot token / Resend key configured via server env

## 6. States & Feedback

| State | Treatment |
|-------|-----------|
| Loading | Skeleton rows, no spinners blocking whole page |
| Empty runs | "No runs yet — trigger Run now on Subito" |
| Save success | Inline toast or subtle banner, Stitch style |
| Validation error | Field-level red outline + message |
| Unauthorized | Full-page "Not authorized" — no admin chrome leak |

## 7. Visual Requirements (Stitch)

- **Monochrome document-first** — white/`#f9f9f8` surfaces, `#e5e5e5` borders, no drop shadows
- **Inter** typography per DESIGN.md scale
- **Material Symbols Outlined** icons
- **4px spacing grid**
- Primary button: black on white
- Status badges: light gray `#f1f1f0` chips; success/failure use subtle text color only (no saturated green/red blocks)
- Dense but readable — operator tool, not marketing

## 8. Responsive

- Desktop-first (operator on laptop)
- Tablet: sidebar collapses to icons
- Mobile: usable but not optimized — acceptable for emergency checks

## 9. Out of Scope (this PRD)

- End-user settings changes
- Live FB/Vinted/Wallapop/eBay crawl implementation
- Editable soft-block numeric thresholds
- scrape_rejects browser
- Multi-operator RBAC beyond email allowlist

## 10. Success Criteria

1. Operator can enable Subito, set 90min interval, save, and see next run time without SSH/env edit
2. Operator can pause all sources in one click
3. Operator can trigger Run now and see result in runs table within one worker cycle
4. Operator can turn auto-translate off/on and see pending translation queue
5. All screens match Stitch Structured Minimalist tokens and pass workspace stitch-ui-design rule

---

*PRD version: 1.0 — 2026-08-04*
