# Phase 6: Scraper Admin Console - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers an operator-facing **Scraper Admin Console** at `/admin` that replaces hardcoded `scraper/.env` configuration with a Supabase-backed control plane. A solo operator can: view scrape health, enable/disable sources, set per-source schedules and URLs (Venice-scoped), choose anti-block presets, configure proxy and alert channels, toggle auto-translation, trigger manual runs, pause all scraping globally, and review run history — while the existing `scraper/` worker reads config from the DB each run.

**In scope:** Admin UI (Google Stitch-designed, 8 screens), config schema + RLS, worker config pull, Subito crawler wired to dynamic config, placeholder config for Facebook / Vinted / Wallapop / eBay (UI + DB + "coming soon" status), per-source scheduling with stagger, job queue for manual runs, ingest-time translation (title + description + category) to en/zh via **Gemini primary + OpenRouter fallback** with configurable daily cap, translation retry queue, **`/admin/rejects`** browser.

**Out of scope:** Implementing live crawlers for Facebook, Vinted, Wallapop, eBay in this phase (config + status only); end-user-facing settings changes; changing Phase 1 validation threshold values; closed FB group scraping (SCRP-08).

May run **in parallel with Phase 5** — admin console and ingest-time translation columns do not block on consumer trilingual UI. Requires Phase 4 auth for operator login. Consumer app reads translated columns per locale when Phase 5 ships (fallback to original until then).

</domain>

<decisions>
## Implementation Decisions

### Admin Surface & Access
- **D-01:** Dedicated **`/admin` route** separate from consumer app — Stitch document-first aesthetic, table-heavy ops layout — **Reversibility:** reversible.
- **D-02:** **Supabase Auth + operator email allowlist** for admin access (reuse Phase 4 Google/email login; RLS gates admin tables) — **Reversibility:** costly — auth/RLS model anchors all admin mutations.
- **D-03:** Admin home is **status-first dashboard**: per-source last run, success/failure, listing counts, recent alerts — **Reversibility:** reversible.
- **D-04:** **Run history** via `scrape_runs` (list + detail); **`scrape_rejects` browser** at `/admin/rejects` per Stitch prototype — **Reversibility:** reversible.
- **D-05:** **"Run now"** for any configured source (including placeholders that no-op with clear message until crawler exists) — **Reversibility:** reversible.
- **D-06:** **Alert channels configurable in admin** — Telegram chat ID and email recipients editable; secrets (bot token, Resend key) remain server-side env, not stored in plaintext in DB — **Reversibility:** reversible.
- **D-07:** Admin UI **designed via Google Stitch** — use `06-STITCH-PRD.md` and `06-STITCH-PROMPT.md` as Stitch inputs before implementation — **Reversibility:** reversible.

### Source Configuration
- **D-08:** **Subito fully operational** in Phase 6; **Facebook, Vinted, Wallapop, eBay** appear as configurable cards with toggle + frequency + URL fields but status badge **"Coming soon"** until crawler adapters land — **Reversibility:** reversible.
- **D-09:** Per source: **enabled toggle, interval (minutes), custom URL(s)** — Subito defaults to existing three Venice regalo category URLs — **Reversibility:** reversible.
- **D-10:** All sources **geographically locked to Venice/Veneto** — URL templates default to Venice; system validates URLs against allowed patterns where feasible — **Reversibility:** reversible.
- **D-11:** **Shared free-listing filter** from Phase 1 (Italian price/negotiation keywords + source category semantics) — not per-source editable keyword lists in MVP — **Reversibility:** reversible.
- **D-12:** Source cards show **name + status badge** (Running / Paused / Coming soon) — **Reversibility:** reversible.

### Scheduling & Control
- **D-13:** **Per-source independent schedule** (minutes), not a single global cron — **Reversibility:** costly — worker scheduler refactor from single 90min interval.
- **D-14:** Frequency bounds **30 minutes minimum, 24 hours maximum** — enforce in admin UI and API — **Reversibility:** reversible.
- **D-15:** When multiple sources fire together, **stagger executions by 5–10 minutes** to reduce concurrent anti-bot pressure — **Reversibility:** reversible.
- **D-16:** Worker schedules in **UTC**; admin UI displays **Europe/Rome** (Venice) for operator readability — **Reversibility:** reversible.
- **D-17:** **Global pause** control — one-click pause all scraping without losing config — **Reversibility:** reversible. *(Claude-selected: safest ops posture.)*

### Config Sync & Manual Runs
- **D-18:** Worker **loads config from Supabase at the start of each run** (no hot-reload webhook in MVP) — **Reversibility:** reversible.
- **D-19:** Manual runs via **`scrape_jobs` queue** — admin inserts job row; worker picks up on next tick or dedicated poll; same runner path as cron — **Reversibility:** reversible.

### Anti-Block & Validation
- **D-20:** **Proxy URL editable in admin** — stored in Supabase **encrypted column**; readable only via service role + admin API routes; env `PROXY_URL` fallback for bootstrap — **Reversibility:** costly — secret storage pattern.
- **D-21:** Anti-block exposed as **preset profiles per source**: Conservative / Standard / Aggressive — maps to delay, retries, session pool size internally; no raw numeric fields in MVP — **Reversibility:** reversible.
- **D-22:** **Per-source anti-block preset** — Facebook defaults to Conservative, Subito to Standard when first enabled — **Reversibility:** reversible.
- **D-23:** Soft-block **validation thresholds remain fixed in code** (selector ≥90%, count ≥50% trailing median, geo ≥50%) — admin displays read-only; operator cannot loosen — **Reversibility:** reversible. *(Claude-selected: most conservative scraping posture.)*

### Auto-Translation
- **D-24:** Translate at **ingest time** after successful normalize — store original Italian + generated **en** and **zh** for title, description, and category label — **Reversibility:** costly — schema adds translation columns.
- **D-25:** **Global "auto-translate" toggle** in admin — when off, only original text stored — **Reversibility:** reversible.
- **D-26:** Translation provider: **Google Gemini primary**, **OpenRouter fallback** — admin-selectable provider; API keys server-side env — **Reversibility:** reversible.
- **D-27:** On translation failure: **listing still ingests**; UI falls back to original; failed items enter **translation retry queue**; admin shows pending count + **one-click re-translate** — **Reversibility:** reversible.
- **D-43:** **Daily translation cap configurable in admin** (default TBD in plan, e.g. 500 listings/day) — **shared across Gemini + OpenRouter**; when exceeded **pause auto-translate only** (scraping continues) — **Reversibility:** reversible.
- **D-44:** Listing translations stored as **separate columns** (`title_en`, `title_zh`, `description_en`, `description_zh`, `category_en`, `category_zh`) — not jsonb blob — **Reversibility:** costly — schema migration.

### Operator Allowlist (continued discussion)
- **D-28:** Operator allowlist: **env bootstraps first operator(s)**; ongoing add/remove via **`/admin/settings` backed by DB table** — **Reversibility:** costly — RLS + bootstrap story.

### Phase Timing & Consumer i18n Bridge
- **D-29:** **Phase 6 may execute in parallel with Phase 5** — do not gate admin on trilingual UI completion — **Reversibility:** reversible.
- **D-30:** Consumer listing display (Phase 5): read **`title` / `title_en` / `title_zh`** (and description/category equivalents) by active user locale; **fallback to original** if translation column missing — **Reversibility:** reversible.

### Source Defaults & Audit
- **D-31:** Coming-soon sources (FB, Vinted, Wallapop, eBay) ship with **prefilled Venice/Veneto template URLs** editable by operator — **Reversibility:** reversible.
- **D-32:** Add **`source` column to `scrape_runs`** — one audit row per source run; dashboard filters and stats per source — **Reversibility:** costly — migration on audit table.

### Jobs & Admin Locale
- **D-33:** Worker **polls `scrape_jobs` every 60 seconds** for Run now (in addition to per-source cron) — **Reversibility:** reversible.
- **D-34:** Admin UI **Chinese-primary** copy for operator; keep source names and technical labels in English (Subito, Facebook, selector rate, etc.) — **Reversibility:** reversible.

### Stitch Prototypes
- **D-35:** Admin UI **implemented from Google Stitch exports** in `.planning/google-stitch-ui-design/scraper-dashboard/` — port `code.html` per screen; do not redesign — **Reversibility:** reversible.
- **D-36:** Admin design authority for Phase 6: **`scraper-dashboard/DESIGN.md`** (not consumer `google-stitch-ui-design/DESIGN.md` alone) — **Reversibility:** reversible.
- **D-39:** **`/admin/sources`** list page ports `source_list_admin_console/code.html` — **Reversibility:** reversible.
- **D-40:** **`/admin/runs/[id]`** detail page ports `run_detail_subito/code.html` — **Reversibility:** reversible.
- **D-41:** **`/admin/rejects`** page ports `reject-details/code.html` — filter by rejection reason, view raw snippet for filter tuning — **Reversibility:** reversible.
- **D-42:** **`/admin/runs` populated table** — extend `run_history_empty_state` layout for rows (no separate Stitch export); empty state remains for zero runs — **Reversibility:** reversible.

### Claude's Discretion
- Exact Supabase table names (`scraper_sources`, `scraper_config`, `scrape_jobs`, `translation_queue`)
- Secret encryption approach for proxy URL at rest (pgcrypto vs app-level)
- Default translation daily cap initial value
- OpenRouter model slug for fallback (cheap multilingual model — research in plan phase)
- Default stagger minutes (5 vs 10) within stated range
- Gemini model choice and rate limiting within $20–100/mo budget
- Whether admin uses Next.js Route Handlers only or Server Actions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Venice scope, Subito-primary strategy, budget, solo operator
- `.planning/REQUIREMENTS.md` — SCRP-01–06 (complete), SCRP-07 FB deferred v2
- `.planning/ROADMAP.md` — Phase 6 entry and dependencies

### Phase 1 Scraper (inherit, do not re-decide)
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — Crawlee+Playwright, worker separation, validation gates, zone tagging, alerting
- `scraper/README.md` — worker env, 90min cron, pipeline overview
- `scraper/src/worker.ts` — current scheduler and run orchestration
- `scraper/src/config.ts` — env-based config to be superseded by DB pull
- `scraper/src/subito/categories.ts` — default Subito URLs
- `scraper/src/subito/crawler.ts` — Playwright crawler, proxy, session pool
- `supabase/migrations/003_scrape_audit_tables.sql` — `scrape_runs`, `scrape_rejects`

### Phase 6 Stitch Design Inputs (authoritative prototypes)
- `.planning/google-stitch-ui-design/scraper-dashboard/DESIGN.md` — admin design tokens and brand rules (**read before any /admin UI**)
- `.planning/google-stitch-ui-design/scraper-dashboard/admin_dashboard/code.html` — `/admin` dashboard (+ `screen.png` reference)
- `.planning/google-stitch-ui-design/scraper-dashboard/source_list_admin_console/code.html` — `/admin/sources` list (+ `screen.png`)
- `.planning/google-stitch-ui-design/scraper-dashboard/source_detail_subito/code.html` — `/admin/sources/[id]` (Subito example)
- `.planning/google-stitch-ui-design/scraper-dashboard/run_history_empty_state/code.html` — `/admin/runs` empty state (+ populated table extension per D-42)
- `.planning/google-stitch-ui-design/scraper-dashboard/run_detail_subito/code.html` — `/admin/runs/[id]` run detail
- `.planning/google-stitch-ui-design/scraper-dashboard/reject-details/code.html` — `/admin/rejects` scrape rejects browser
- `.planning/google-stitch-ui-design/scraper-dashboard/translation_queue/code.html` — `/admin/translation`
- `.planning/google-stitch-ui-design/scraper-dashboard/admin_settings/code.html` — `/admin/settings`
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-STITCH-PRD.md` — functional PRD (screens ↔ routes)
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-STITCH-PROMPT.md` — Stitch generation prompt (historical)
- `.planning/google-stitch-ui-design/DESIGN.md` — consumer app tokens (shared Structured Minimalist baseline)

### Legal / Ops
- `docs/legal/subito-scraping-note.md` — robots.txt acknowledgment (if present)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper/` package — worker, Subito crawler, normalize/persist, validate-run, alert notify
- `scraper/src/worker.ts` — `runScrape()`, cron loop, overlap guard; refactor target for per-source + job queue
- `scraper/src/config.ts` — thresholds and env; migrate to DB-backed config loader
- `supabase/migrations/003_scrape_audit_tables.sql` — audit tables for admin run history
- Phase 4 Supabase Auth — reuse for operator login + allowlist check in `/admin` middleware
- `lib/supabase/service.ts` — service role for worker and admin API routes

### Established Patterns
- Separate deployable worker (not Vercel serverless) — keep admin mutations in Next.js, execution in worker
- Zod validation before DB writes — extend canonical listing schema with translation fields
- Failed batch writes zero listings + operator alert — preserve for Subito runs
- Stitch monochrome UI for consumer app — admin follows same tokens, denser tables

### Integration Points
- New `/admin` routes in Next.js App Router
- New Supabase tables for source config, global settings, scrape_jobs, translation_queue
- Worker poll: config + pending jobs each run cycle
- Listing rows: add separate columns per D-44 (`title_en`, `title_zh`, …)

</code_context>

<specifics>
## Specific Ideas

- User wants a **simple backend** to configure Facebook Marketplace, Vinted, Wallapop, eBay, Subito — frequency, anti-block, auto-translation (Chinese + English)
- Admin visual design will be produced in **Google Stitch** using generated PRD + prompt (not improvised in code)
- Translation failure UX: don't block scrape; show pending translations in admin with bulk re-translate
- Stitch admin prototypes: **8 screens** under `scraper-dashboard/` (dashboard, sources list, source detail, runs empty, run detail, rejects, translation, settings)

</specifics>

<deferred>
## Deferred Ideas

- Live crawler implementations for Facebook, Vinted, Wallapop, eBay — future phase or Phase 6 stretch goals after Subito admin path proven (SCRP-07 covers FB)
- Per-source editable free-filter keyword lists
- Raw numeric anti-bot tuning (beyond Conservative/Standard/Aggressive presets)
- Config hot-reload webhook to worker

</deferred>

---

*Phase: 06-scraper-admin-console*
*Context gathered: 2026-08-04*
