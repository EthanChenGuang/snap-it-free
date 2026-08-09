# Phase 6: Scraper Admin Console — Research

**Researched:** 2026-08-04
**Domain:** Supabase-backed scraper control plane, Next.js `/admin` ops UI, worker scheduler refactor, ingest-time translation (Gemini + OpenRouter)
**Confidence:** HIGH (codebase-verified patterns) / MEDIUM (external API docs)

## Summary

Phase 6 replaces the scraper worker's hardcoded env/URL config with a Supabase control plane and adds an operator-facing `/admin` console in the main Next.js app. The existing `scraper/` worker (`worker.ts`) runs a single 90-minute `setInterval` cron, reads URLs from `subito/categories.ts`, proxy from `PROXY_URL` env, and writes audit rows to `scrape_runs` without a `source` column. The admin surface does not exist yet (`app/admin/**` absent); consumer chrome (`AppChrome` with Header + BottomNav) wraps all routes today and must be bypassed via a dedicated `app/admin/layout.tsx`.

The reference Vite app `scraper-admin/` provides interaction patterns only — production UI must port Stitch prototypes from `.planning/google-stitch-ui-design/scraper-dashboard/` per `06-UI-SPEC.md` (Material Symbols, Chinese-primary copy, monochrome tokens). Auth reuses Phase 4 Supabase Auth (`lib/supabase/server.ts`, `requireAuth()` in Route Handlers) plus a new email allowlist table and middleware gate (D-48/D-49).

**Primary recommendation:** Ship in three layers — (1) Supabase migration for config/jobs/allowlist/translation columns + RLS, (2) worker refactor to poll config + `scrape_jobs` every 60s with per-source schedules and stagger, (3) Next.js `/admin` routes + Route Handlers using service role for writes and app-level AES for proxy URL encryption shared with the worker.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin UI (8 screens) | Browser / Client | Frontend Server (SSR) | React pages under `app/admin/**`; server components fetch via Supabase session |
| Operator auth gate | Frontend Server (middleware) | API / Backend | `middleware.ts` on `/admin/*`: session refresh + allowlist check + redirect |
| Config CRUD / Run now | API / Backend | Database | Next.js Route Handlers validate with Zod, write via service role or RLS-gated client |
| Allowlist management | API / Backend | Database | `/admin/settings` mutations; `is_operator()` security definer for RLS |
| Proxy URL encryption | API / Backend | Database | Encrypt in Route Handler; store ciphertext in DB; worker decrypts at run start |
| Per-source scheduling | API / Backend (worker process) | Database | Worker owns tick loop; DB stores `next_run_at` per source |
| Manual run queue | Database | API / Backend | Admin inserts `scrape_jobs`; worker polls every 60s |
| Subito crawl execution | API / Backend (worker) | — | Existing `runSubitoCrawler` — not in Next.js serverless |
| Ingest-time translation | API / Backend (worker) | API / Backend (admin retry) | Worker translates after persist; admin bulk retry via Route Handler |
| Run history / rejects display | Frontend Server | Database | Read `scrape_runs`, `scrape_rejects` via RLS or service role in server components |
| Alert delivery | API / Backend (worker) | — | Existing `notify.ts`; chat ID/email from DB, tokens stay env |
| Validation thresholds display | Browser / Client | — | Read-only UI; values fixed in worker code (D-23) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Admin Surface & Access
- **D-01:** Dedicated **`/admin` route** separate from consumer app — Stitch document-first aesthetic, table-heavy ops layout — **Reversibility:** reversible.
- **D-02:** **Supabase Auth + operator email allowlist** for admin access (reuse Phase 4 Google/email login; RLS gates admin tables) — **Reversibility:** costly — auth/RLS model anchors all admin mutations.
- **D-03:** Admin home is **status-first dashboard**: per-source last run, success/failure, listing counts, recent alerts — **Reversibility:** reversible.
- **D-04:** **Run history** via `scrape_runs` (list + detail); **`scrape_rejects` browser** at `/admin/rejects` per Stitch prototype — **Reversibility:** reversible.
- **D-05:** **"Run now"** for any configured source (including placeholders that no-op with clear message until crawler exists) — **Reversibility:** reversible.
- **D-06:** **Alert channels configurable in admin** — Telegram chat ID and email recipients editable; secrets (bot token, Resend key) remain server-side env, not stored in plaintext in DB — **Reversibility:** reversible.
- **D-07:** Admin UI **designed via Google Stitch** — use `06-STITCH-PRD.md` and `06-STITCH-PROMPT.md` as Stitch inputs before implementation — **Reversibility:** reversible.

#### Source Configuration
- **D-08:** **Subito fully operational** in Phase 6; **Facebook, Vinted, Wallapop, eBay** appear as configurable cards with toggle + frequency + URL fields but status badge **"Coming soon"** until crawler adapters land — **Reversibility:** reversible.
- **D-09:** Per source: **enabled toggle, interval (minutes), custom URL(s)** — Subito defaults to existing three Venice regalo category URLs — **Reversibility:** reversible.
- **D-10:** All sources **geographically locked to Venice/Veneto** — URL templates default to Venice; system validates URLs against allowed patterns where feasible — **Reversibility:** reversible.
- **D-11:** **Shared free-listing filter** from Phase 1 (Italian price/negotiation keywords + source category semantics) — not per-source editable keyword lists in MVP — **Reversibility:** reversible.
- **D-12:** Source cards show **name + status badge** (Running / Paused / Coming soon) — **Reversibility:** reversible.

#### Scheduling & Control
- **D-13:** **Per-source independent schedule** (minutes), not a single global cron — **Reversibility:** costly — worker scheduler refactor from single 90min interval.
- **D-14:** Frequency bounds **30 minutes minimum, 24 hours maximum** — enforce in admin UI and API — **Reversibility:** reversible.
- **D-15:** When multiple sources fire together, **stagger executions by 5–10 minutes** to reduce concurrent anti-bot pressure — **Reversibility:** reversible.
- **D-16:** Worker schedules in **UTC**; admin UI displays **Europe/Rome** (Venice) for operator readability — **Reversibility:** reversible.
- **D-17:** **Global pause** control — one-click pause all scraping without losing config — **Reversibility:** reversible.

#### Config Sync & Manual Runs
- **D-18:** Worker **loads config from Supabase at the start of each run** (no hot-reload webhook in MVP) — **Reversibility:** reversible.
- **D-19:** Manual runs via **`scrape_jobs` queue** — admin inserts job row; worker picks up on next tick or dedicated poll; same runner path as cron — **Reversibility:** reversible.

#### Anti-Block & Validation
- **D-20:** **Proxy URL editable in admin** — stored in Supabase **encrypted column**; readable only via service role + admin API routes; env `PROXY_URL` fallback for bootstrap — **Reversibility:** costly — secret storage pattern.
- **D-21:** Anti-block exposed as **preset profiles per source**: Conservative / Standard / Aggressive — maps to delay, retries, session pool size internally; no raw numeric fields in MVP — **Reversibility:** reversible.
- **D-22:** **Per-source anti-block preset** — Facebook defaults to Conservative, Subito to Standard when first enabled — **Reversibility:** reversible.
- **D-23:** Soft-block **validation thresholds remain fixed in code** (selector ≥90%, count ≥50% trailing median, geo ≥50%) — admin displays read-only; operator cannot loosen — **Reversibility:** reversible.

#### Auto-Translation
- **D-24:** Translate at **ingest time** after successful normalize — store original Italian + generated **en** and **zh** for title, description, and category label — **Reversibility:** costly — schema adds translation columns.
- **D-25:** **Global "auto-translate" toggle** in admin — when off, only original text stored — **Reversibility:** reversible.
- **D-26:** Translation provider: **Google Gemini primary**, **OpenRouter fallback** — admin-selectable provider; API keys server-side env — **Reversibility:** reversible.
- **D-27:** On translation failure: **listing still ingests**; UI falls back to original; failed items enter **translation retry queue**; admin shows pending count + **one-click re-translate** — **Reversibility:** reversible.
- **D-43:** **Daily translation cap configurable in admin** (default TBD in plan, e.g. 500 listings/day) — **shared across Gemini + OpenRouter**; when exceeded **pause auto-translate only** (scraping continues) — **Reversibility:** reversible.
- **D-44:** Listing translations stored as **separate columns** (`title_en`, `title_zh`, `description_en`, `description_zh`, `category_en`, `category_zh`) — not jsonb blob — **Reversibility:** costly — schema migration.

#### Operator Allowlist
- **D-28:** Operator allowlist: **env bootstraps first operator(s)**; ongoing add/remove via **`/admin/settings` backed by DB table** — **Reversibility:** costly — RLS + bootstrap story.
- **D-45:** Add operator by **typing email + save** — no invite link; user need not pre-exist in Supabase — **Reversibility:** reversible.
- **D-46:** Operator **cannot remove their own email** from allowlist (UI disabled) — **Reversibility:** reversible.
- **D-47:** Allowlist must keep **at least one operator** — cannot delete the last remaining entry — **Reversibility:** reversible.

#### Admin Access Control
- **D-48:** **Logged-out** visitor to `/admin` → **login flow**; after auth, non-allowlist → **redirect to `/`** (no 403 page) — **Reversibility:** reversible.
- **D-49:** **Logged-in non-operator** → silent **redirect to `/`** — do not expose admin chrome — **Reversibility:** reversible.
- **D-50:** **No link** to `/admin` from consumer app (Settings/nav) — operator bookmarks URL directly — **Reversibility:** reversible.

#### Default Source URLs
- **D-51:** Coming-soon sources seed **3 default URLs each** (Venice/Veneto); operator may **add more URLs** per source in admin — no hard cap in MVP — **Reversibility:** reversible.
- **D-52:** Default URL keyword sets per source (FB/Vinted/Wallapop/eBay templates + Subito Phase 1 URLs) — **Reversibility:** reversible.

#### Reference Implementation
- **D-53:** **`scraper-admin/`** is reference for UI/interactions — port to Next.js `/admin`; **do not deploy** standalone Vite app — **Reversibility:** reversible.
- **D-54:** Mock-only features (`handleAddSource`, `handleForceAccept`, Immobiliare demo) **out of scope** unless explicitly added — **Reversibility:** reversible.
- **D-55:** Reference `POST /api/translate` is a **spike** — production must match D-26/D-43/D-44 — **Reversibility:** reversible.

#### Phase Timing & Consumer i18n Bridge
- **D-29:** **Phase 6 may execute in parallel with Phase 5** — **Reversibility:** reversible.
- **D-30:** Consumer listing display: read translated columns by locale; fallback to original — **Reversibility:** reversible.

#### Source Defaults & Audit
- **D-31:** Coming-soon sources ship with prefilled Venice/Veneto template URLs — **Reversibility:** reversible.
- **D-32:** Add **`source` column to `scrape_runs`** — one audit row per source run — **Reversibility:** costly — migration.

#### Jobs & Admin Locale
- **D-33:** Worker **polls `scrape_jobs` every 60 seconds** for Run now — **Reversibility:** reversible.
- **D-34:** Admin UI **Chinese-primary** copy; source names and technical labels in English — **Reversibility:** reversible.

#### Stitch Prototypes
- **D-35–D-42:** Admin UI from `scraper-dashboard/` Stitch exports; design authority `scraper-dashboard/DESIGN.md` — **Reversibility:** reversible.

### Claude's Discretion
- Exact Supabase table names (`scraper_sources`, `scraper_config`, `scrape_jobs`, `translation_queue`)
- Secret encryption approach for proxy URL at rest (pgcrypto vs app-level)
- Default translation daily cap initial value
- OpenRouter model slug for fallback (cheap multilingual model — research in plan phase)
- Default stagger minutes (5 vs 10) within stated range
- Gemini model choice and rate limiting within $20–100/mo budget
- Whether admin uses Next.js Route Handlers only or Server Actions

### Deferred Ideas (OUT OF SCOPE)
- Live crawler implementations for Facebook, Vinted, Wallapop, eBay
- Per-source editable free-filter keyword lists
- Raw numeric anti-bot tuning (beyond Conservative/Standard/Aggressive presets)
- Config hot-reload webhook to worker
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRP-01 | Subito ingest on 1–2hr refresh cadence | Per-source interval (30–1440 min) replaces fixed 90min cron; D-13/D-14 scheduler refactor |
| SCRP-02 | Canonical schema with source badge | Extend `listing_source` enum for future sources; translation columns per D-44 |
| SCRP-03 | Zone tags at ingestion | Unchanged — worker `tagZone()` after crawl |
| SCRP-05 | Free-listing filter at ingestion | Unchanged shared filter (D-11); not admin-editable |
| SCRP-06 | Validate output + alert on soft-block | Thresholds read-only in admin (D-23); existing `validate-run.ts` + `notify.ts` |
| D-01–D-07 | Admin surface, auth, dashboard, runs, rejects, alerts, Stitch | Route map + `06-UI-SPEC.md` + middleware allowlist pattern |
| D-08–D-12 | Source config cards, coming-soon status | `scraper_sources` seed + placeholder runner no-op |
| D-13–D-17 | Per-source schedule, bounds, stagger, UTC/Rome, global pause | Worker tick loop + `next_run_at` + stagger queue |
| D-18–D-19 | DB config pull, manual jobs queue | Config loader at run start; `scrape_jobs` poll 60s |
| D-20–D-23 | Proxy encryption, anti-block presets, fixed thresholds | App-level AES + preset→Crawlee mapping table |
| D-24–D-27, D-43–D-44 | Ingest translation, toggle, providers, retry queue, cap, columns | `translation_queue` + Gemini/OpenRouter module |
| D-28, D-45–D-47 | Operator allowlist | `operator_allowlist` table + env bootstrap migration |
| D-48–D-50 | Access redirects, no consumer nav link | Scoped middleware + silent redirect to `/` |
| D-51–D-52 | Default URL templates | Seed migration with D-52 URLs |
| D-53–D-55 | Reference port, drop mock extras | `06-REFERENCE-IMPLEMENTATION.md` port strategy |
| D-29–D-30 | Parallel Phase 5, consumer column reads | Migration adds columns; Phase 5 consumes when ready |
| D-31–D-32 | Prefilled URLs, scrape_runs.source | Migration 017+ |
| D-33–D-34 | Job poll interval, Chinese admin copy | 60s worker tick; `06-UI-SPEC.md` copy contract |
| D-35–D-42 | Stitch screen routes | Prototype paths in `scraper-dashboard/` |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- **Consumer UI rule (`stitch-ui-design.mdc`):** Applies to `app/**`, `components/**` — admin must use **`scraper-dashboard/DESIGN.md`** authority (D-36), not consumer `google-stitch-ui-design/DESIGN.md` alone.
- **Before admin UI:** Read matching `scraper-dashboard/{screen}/code.html` + `DESIGN.md`; port structure, do not redesign.
- **Tokens:** Use `@theme` from `app/globals.css`; extend with admin-specific tokens — no default shadcn saturated theme.
- **Icons:** Material Symbols Outlined only in admin (not lucide from `scraper-admin/`).
- **Radix/shadcn:** OK when restyled to Stitch tokens.
- **Anti-patterns:** Card drop shadows, rounded-xl marketing cards, glassmorphism, Notion palette from reference app.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.12 (installed) | `/admin` App Router, Route Handlers | Existing app stack [VERIFIED: package.json] |
| `@supabase/ssr` | 0.12.4 | Cookie session in middleware + server | Phase 4 pattern; official Next.js example [CITED: github.com/vercel/next.js/examples/with-supabase] |
| `@supabase/supabase-js` | 2.112.0 | DB client (anon + service role) | Worker + admin already use [VERIFIED: codebase] |
| `zod` | 4.4.3 | Admin API + config validation | Matches `lib/alerts/schemas.ts` pattern [VERIFIED: codebase] |
| `@google/genai` | 2.15.0 | Primary translation (Gemini) | Already in root `package.json`; spike in `scraper-admin/server.ts` [VERIFIED: codebase] |
| `crawlee` + `playwright` | 3.12.0 / 1.62.0 | Subito crawler (worker only) | Phase 1 locked stack [VERIFIED: scraper/package.json] |
| `vitest` | 3.2.4 | Unit tests (root + scraper) | Nyquist Dimension 8 [VERIFIED: vitest.config.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `crypto` (built-in) | — | AES-256-GCM proxy encryption | App-level secret at rest (recommended over hand-rolled pgcrypto) |
| OpenRouter HTTP API | v1 | Translation fallback | `fetch` to `/api/v1/chat/completions` [CITED: openrouter.ai/docs] |
| `resend` / `node-telegram-bot-api` | (scraper) | Operator alerts | Existing worker alerting; chat ID from DB |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-level AES for proxy | Supabase Vault (`vault.create_secret`) | Vault is official [CITED: supabase.com/docs/guides/database/vault] but worker service-role Vault grants are harder to audit; app-level shares one env key between Next.js + worker |
| pgcrypto column encryption | App-level AES | pgcrypto requires DB key management and SECURITY DEFINER decrypt functions; worker already runs outside Postgres |
| Server Actions | Route Handlers only | Project consistently uses Route Handlers for mutations (`app/api/alerts/route.ts`); stay consistent |
| node-cron | In-process 60s tick + DB `next_run_at` | Phase 1 rejected invalid `*/90` cron; DB-driven schedule survives worker restarts |

**Installation (no new required packages for MVP):**

```bash
# Root app — @google/genai already present
# Scraper worker — no new deps if OpenRouter via fetch()
```

**Version verification (2026-08-04):**

```bash
npm view @google/genai version      # 2.15.0
npm view @supabase/supabase-js version  # 2.112.0
npm view @supabase/ssr version      # 0.12.4
npm view zod version                # 4.4.3
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `zod` | npm | ~3 mo | ~252M/wk | github.com/colinhacks/zod | OK | Approved |
| `@google/genai` | npm | ~5 days | ~18M/wk | github.com/googleapis/js-genai | SUS (too-new signal) | Approved — official Google SDK, already in project |
| `@supabase/supabase-js` | npm | ~1 day | ~25M/wk | github.com/supabase/supabase-js | SUS (too-new signal) | Approved — official, already in project |
| `@supabase/ssr` | npm | ~7 days | ~6M/wk | github.com/supabase/ssr | SUS (too-new signal) | Approved — official, already in project |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious [SUS]:** none requiring human-verify for install (all pre-installed official packages)

**OpenRouter:** HTTP API only — no npm package required [CITED: openrouter.ai/docs/quickstart]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Operator Browser                                 │
│  /admin/* pages (AdminShell, Stitch UI, zh copy)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS (session cookie)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel / local)                          │
│  middleware.ts ──► session refresh + allowlist check                     │
│  app/admin/** ──► Server Components (read)                               │
│  app/api/admin/** ──► Route Handlers (Zod validate → service role write) │
│  lib/admin/crypto.ts ──► encrypt/decrypt proxy URL                       │
│  lib/admin/translate.ts ──► Gemini primary, OpenRouter fallback          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Supabase Postgres (RLS + service role)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  scraper_sources │ scraper_global_config │ operator_allowlist            │
│  scrape_jobs     │ translation_queue     │ scrape_runs (+ source)       │
│  scrape_rejects  │ listings (+ *_en/*_zh columns)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ service role read/write
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              scraper/ Worker (Fly.io / VPS — always-on)                  │
│  Every 60s tick:                                                         │
│    1. Load global_config + sources (skip if global_pause)                │
│    2. Pick due sources (next_run_at) + pending scrape_jobs             │
│    3. Stagger concurrent runs (5–10 min offsets)                         │
│    4. Decrypt proxy → runSubitoCrawler(urls, preset)                     │
│    5. validate-run → persistBatch → translation_queue/columns            │
│    6. finishScrapeRun(source) → notifyOperator on failure                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
app/
├── admin/
│   ├── layout.tsx              # AdminShell — NO AppChrome/BottomNav
│   ├── page.tsx                # Dashboard
│   ├── sources/page.tsx
│   ├── sources/[slug]/page.tsx
│   ├── runs/page.tsx
│   ├── runs/[id]/page.tsx
│   ├── rejects/page.tsx
│   ├── translation/page.tsx
│   └── settings/page.tsx
├── api/admin/
│   ├── sources/route.ts
│   ├── sources/[slug]/route.ts
│   ├── config/route.ts         # global pause, proxy, alerts, translate toggle
│   ├── jobs/route.ts           # Run now → insert scrape_jobs
│   ├── operators/route.ts      # allowlist CRUD
│   └── translation/retry/route.ts
components/admin/
│   ├── AdminShell.tsx          # Sidebar + TopAppBar from admin_dashboard
│   ├── SourceCard.tsx
│   └── ...                     # Port from scraper-admin, restyle Stitch
lib/admin/
│   ├── schemas.ts              # Zod for all admin writes
│   ├── require-operator.ts     # requireAuth + allowlist check
│   ├── crypto.ts               # AES encrypt/decrypt proxy
│   ├── presets.ts              # AntiBlock → Crawlee options
│   ├── translate.ts              # Gemini + OpenRouter
│   └── url-validate.ts         # Venice/Veneto URL patterns
middleware.ts                   # NEW — /admin matcher only
scraper/src/
│   ├── config-loader.ts        # DB config pull (replaces env URLs)
│   ├── scheduler.ts            # 60s tick, stagger, job queue
│   ├── worker.ts               # Refactored orchestration
│   └── translate/ingest.ts     # Post-persist translation
supabase/migrations/
│   └── 017_scraper_admin.sql   # All Phase 6 tables + columns
```

### Pattern 1: Operator Allowlist RLS

**What:** Security definer function checks email against `operator_allowlist`; RLS policies gate admin tables.

**When to use:** All config tables writable only by authenticated operators.

**Example:**

```sql
-- Source: Supabase RLS best practices [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
create or replace function public.is_operator()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.operator_allowlist o
    where lower(o.email) = lower((select auth.jwt() ->> 'email'))
  );
$$;
revoke execute on function public.is_operator() from anon;

create policy "operators_manage_sources"
  on public.scraper_sources for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());
```

### Pattern 2: Admin Middleware Gate (D-48/D-49)

**What:** Scoped middleware refreshes Supabase session; unauthenticated → login; authenticated non-operator → redirect `/`.

**When to use:** All `/admin` routes except static assets.

**Example:**

```typescript
// Source: Next.js with-supabase proxy pattern [CITED: github.com/vercel/next.js/examples/with-supabase]
// lib/supabase/middleware.ts — createServerClient with cookie getAll/setAll
// middleware.ts:
export const config = { matcher: ['/admin/:path*'] };
// if !session → redirect /post?next=/admin (reuse AuthPromptModal flow)
// if session && !isOperatorEmail → redirect /
```

### Pattern 3: Per-Source Scheduler with Stagger

**What:** Worker 60s tick queries sources where `enabled AND NOT global_pause AND next_run_at <= now()` plus pending jobs; stagger index × stagger_minutes.

**When to use:** Replace `setInterval(90min)` in `worker.ts` lines 216–235.

**Example:**

```typescript
// Pseudocode — planner implements in scraper/src/scheduler.ts
const STAGGER_MINUTES = 7; // discretion: 5–10 range
for (const [i, job] of dueJobs.entries()) {
  const delayMs = i * STAGGER_MINUTES * 60_000;
  setTimeout(() => runSource(job.source_slug, job.trigger), delayMs);
}
```

### Pattern 4: Anti-Block Preset → Crawlee Options

**What:** Map Conservative/Standard/Aggressive to `sessionPoolOptions.maxPoolSize`, `maxRequestRetries`, `minConcurrency`, request handler delays.

**When to use:** `runSubitoCrawler(urls, preset)` — extend crawler constructor.

| Preset | maxPoolSize | maxRequestRetries | minConcurrency | Default for |
|--------|-------------|-------------------|----------------|-------------|
| Conservative | 2 | 2 | 1 | Facebook (D-22) |
| Standard | 5 | 3 | 1 | Subito (D-22) |
| Aggressive | 8 | 5 | 2 | — |

Current crawler defaults match Standard [VERIFIED: scraper/src/subito/crawler.ts].

### Pattern 5: Ingest-Time Translation Pipeline

**What:** After successful `persistBatch`, if `auto_translate` and under daily cap, translate title + description + category to en/zh; on failure insert `translation_queue` row; listing still persisted.

**When to use:** Every inserted/updated listing during scrape run.

**Example:**

```typescript
// Source: @google/genai docs [CITED: github.com/googleapis/js-genai]
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash', // planner picks model within budget
  contents: buildTranslationPrompt({ title, description, category }),
  config: { systemInstruction: 'Translate IT marketplace listing to {lang}.', temperature: 0.2 },
});
// OpenRouter fallback: POST openrouter.ai/api/v1/chat/completions [CITED: openrouter.ai/docs]
```

### Pattern 6: App-Level Proxy Encryption (D-20)

**What:** Admin Route Handler encrypts proxy URL with `SCRAPER_SECRETS_KEY` (32-byte base64); stores `{ iv, ciphertext }` in `scraper_global_config.proxy_enc`; worker decrypts at run start; falls back to `PROXY_URL` env if DB empty.

**When to use:** Preferred over pgcrypto for worker compatibility [CITED: Supabase Vault docs as alternative].

```typescript
// lib/admin/crypto.ts — Node crypto AES-256-GCM [VERIFIED: Node.js crypto API]
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
```

### Anti-Patterns to Avoid

- **Putting crawl logic in Next.js Route Handlers:** Worker separation is Phase 1 locked; admin only enqueues jobs.
- **Using consumer AppChrome for /admin:** Bypass via `app/admin/layout.tsx` — current root layout wraps all routes in BottomNav [VERIFIED: app/layout.tsx + AppChrome.tsx].
- **Storing TELEGRAM_BOT_TOKEN in DB:** D-06 — env only.
- **Letting operators edit validation thresholds:** D-23 — display only.
- **Shipping lucide icons in admin:** D-35/06-UI-SPEC — Material Symbols only.
- **Deploying scraper-admin Vite app:** D-53 — port only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session refresh on /admin | Custom JWT parsing | `@supabase/ssr` middleware pattern | Cookie rotation edge cases |
| Operator role checks in every handler | Ad-hoc email string compare | `is_operator()` RLS + `requireOperator()` helper | Centralized allowlist |
| Cron scheduling library | node-cron with complex expressions | DB `next_run_at` + 60s tick | Phase 1 cron pain; survives restarts |
| Translation HTTP client | Custom Gemini REST | `@google/genai` SDK | Already installed; typed API |
| OpenRouter SDK | npm wrapper hunt | Direct `fetch` to OpenRouter | Simple request/response |
| Email allowlist invite flow | Magic invite tokens | Email row + login-time check (D-45) | User need not pre-exist |
| Reject/run audit tables | New audit system | Extend `scrape_runs` / `scrape_rejects` | Phase 1 tables exist [VERIFIED: 003_scrape_audit_tables.sql] |

**Key insight:** Admin is a control plane over existing worker pipeline — extend, don't duplicate scrape/validate/persist logic.

## Common Pitfalls

### Pitfall 1: Consumer Chrome Leaking into Admin

**What goes wrong:** BottomNav and consumer Header appear on `/admin`.

**Why it happens:** Root `app/layout.tsx` always renders `AppChrome`.

**How to avoid:** `app/admin/layout.tsx` with full-viewport AdminShell; optionally route-group `(consumer)` later — for Phase 6, admin layout replaces chrome for subtree.

**Warning signs:** Map nav visible on dashboard.

### Pitfall 2: Worker Still Reads Hardcoded URLs

**What goes wrong:** Admin URL edits have no effect until worker redeploy.

**Why it happens:** `runScrape()` imports `SUBITO_CATEGORY_URLS` directly [VERIFIED: worker.ts:16,120].

**How to avoid:** `config-loader.ts` fetch at start of each run; keep env/constant as bootstrap fallback only.

### Pitfall 3: scrape_runs Without source Column

**What goes wrong:** Dashboard cannot filter per-source stats (D-32).

**Why it happens:** Current schema has no `source` column [VERIFIED: 003_scrape_audit_tables.sql].

**How to avoid:** Migration adds `source text not null default 'subito'`; backfill existing rows.

### Pitfall 4: Translation Columns Missing on listings

**What goes wrong:** D-44 separate columns cannot be populated; description currently only in `raw_payload` jsonb [VERIFIED: normalize.ts stores description in raw_payload; listings has `description` from migration 007 for UGC].

**How to avoid:** Migration adds `title_en`, `title_zh`, `description_en`, `description_zh`, `category`, `category_en`, `category_zh`; extract category from Subito raw during normalize if not already surfaced.

### Pitfall 5: Placeholder "Run Now" Actually Crawls

**What goes wrong:** Coming-soon sources hit real URLs without adapters.

**Why it happens:** Shared runner path for all sources.

**How to avoid:** Source `implementation_status enum ('live','coming_soon')`; runner no-op with audit row + operator message (D-05).

### Pitfall 6: Daily Cap Counts Per Provider Separately

**What goes wrong:** Budget blown when Gemini fails over to OpenRouter.

**Why it happens:** Separate counters.

**How to avoid:** Single `translation_usage_daily(date, count)` table or global_config counter reset at UTC midnight (D-43).

### Pitfall 7: RLS Blocks Worker Writes

**What goes wrong:** Worker cannot insert config reads or listings after new RLS.

**Why it happens:** Accidentally enabling RLS without service role bypass.

**How to avoid:** Worker always uses `supabaseAdmin` service role [VERIFIED: scraper/src/config.ts]; admin tables allow service role full access; authenticated operators use RLS policies.

## Code Examples

### Existing Worker Entry (refactor target)

```typescript
// scraper/src/worker.ts — current 90min cron [VERIFIED: codebase]
const intervalMs = 90 * 60 * 1000;
setInterval(tick, intervalMs);
```

### Phase 4 Auth Pattern (reuse)

```typescript
// lib/supabase/auth.ts [VERIFIED: codebase]
export async function requireAuth(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

### Service Role Client (admin + worker)

```typescript
// lib/supabase/service.ts [VERIFIED: codebase]
export function createServiceClient() {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

### Gemini Translation (extend spike)

```typescript
// scraper-admin/server.ts pattern — extend for en+zh [VERIFIED: codebase]
const response = await ai.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: prompt,
  config: { systemInstruction: '...', temperature: 0.3 },
});
```

### OpenRouter Fallback

```typescript
// [CITED: openrouter.ai/docs/quickstart]
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.OPENROUTER_FALLBACK_MODEL, // planner sets slug
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  }),
});
```

### Zod Admin Source Update Schema

```typescript
// Follow lib/alerts/schemas.ts style [VERIFIED: codebase]
export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
  anti_block_preset: z.enum(['conservative', 'standard', 'aggressive']).optional(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single 90min `setInterval` | Per-source DB schedule + 60s tick | Phase 6 | Enables multi-source without redeploy |
| Env-only `PROXY_URL` | Encrypted DB + env fallback | Phase 6 | Operator edits proxy in admin |
| Env-only alert recipients | DB telegram_chat_id + alert_email | Phase 6 | Operator edits routing |
| Italian-only listing text | Separate en/zh columns at ingest | Phase 6 | Unblocks Phase 5 i18n |
| Hardcoded Subito URLs | DB `scraper_sources.target_urls` | Phase 6 | Operator adds URLs |
| No admin UI | Stitch `/admin` console | Phase 6 | Ops without `.env` edits |

**Deprecated/outdated:**
- `scraper-admin/` standalone deployment — reference only (D-53)
- `gemini-3.6-flash` English-only spike — replace with en+zh + cap (D-55)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default translation daily cap = **500 listings/day** | Standard Stack | Budget overrun or under-utilization |
| A2 | Default stagger = **7 minutes** within 5–10 range | Architecture Patterns | Anti-bot pressure if too low |
| A3 | OpenRouter fallback model = **`google/gemini-2.0-flash-001`** or **`anthropic/claude-3-haiku`** | Standard Stack | Cost/quality mismatch — needs catalog check |
| A4 | Production Gemini model = **`gemini-2.0-flash`** (not spike's 3.6-flash) | Code Examples | API availability / pricing |
| A5 | App-level AES-256-GCM chosen over Supabase Vault | Pattern 6 | Security review may prefer Vault |
| A6 | `listing_source` enum extended with `vinted`, `wallapop`, `ebay` | Migration | Requires ALTER TYPE + scrape_runs consistency |
| A7 | Category extracted from Subito listing page or URL path | Translation | Missing category translations if not in raw extract |

## Open Questions (RESOLVED)

1. **Category field source for Subito listings** — **RESOLVED:** Plan 08 task 2 audits `scraper/src/subito/extract.ts`; if no category label, derive from URL path segment. Translation writes `category_en`/`category_zh` only when source text exists.

2. **OpenRouter model slug for cheap multilingual fallback** — **RESOLVED:** Default `google/gemini-2.0-flash-001` on OpenRouter; Plan 09 includes `checkpoint:human-verify` before first production deploy to confirm slug + $/1M tokens within budget.

3. **Middleware vs layout-only auth for /admin** — **RESOLVED:** Plan 03 implements `middleware.ts` for Supabase session refresh + operator allowlist redirect (official `@supabase/ssr` pattern); layout wraps AdminShell only — no duplicate auth logic in layout.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Worker + Next.js | ✓ | v23.10.0 | — |
| npm | Install/test | ✓ | 11.4.2 | — |
| Supabase CLI | Migrations | ✓ | 2.75.0 | Manual SQL apply |
| SUPABASE_URL + keys | Worker + admin | ✗ (operator) | — | Blocker per STATE.md |
| GEMINI_API_KEY | Translation primary | ✗ (operator) | — | Skip auto-translate; queue failures |
| OPENROUTER_API_KEY | Translation fallback | ✗ (operator) | — | Gemini-only; log fallback miss |
| SCRAPER_SECRETS_KEY | Proxy encryption | ✗ (new env) | — | PROXY_URL env plaintext bootstrap |
| OPERATOR_BOOTSTRAP_EMAILS | Allowlist seed | ✗ (new env) | — | Manual SQL insert |
| Fly.io/VPS worker host | Scraper execution | ✗ (operator) | — | Local worker for dev |

**Missing dependencies with no fallback:**
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — worker persist blocked until configured

**Missing dependencies with fallback:**
- `GEMINI_API_KEY` — scraping continues; translations queue as pending
- `OPENROUTER_API_KEY` — primary-only translation
- `PROXY_URL` / encrypted proxy — direct egress (dev only)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (root) + Vitest 3.0.0 (scraper) |
| Config file | `vitest.config.ts`, `scraper/vitest.config.ts` |
| Quick run command | `npm test` (root lib/) + `cd scraper && npm test` |
| Full suite command | `npm test && cd scraper && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-14 | Interval bounds 30–1440 | unit | `npm test -- lib/admin/schemas.test.ts -x` | ❌ Wave 0 |
| D-20 | Proxy encrypt/decrypt roundtrip | unit | `npm test -- lib/admin/crypto.test.ts -x` | ❌ Wave 0 |
| D-28/D-45–D-47 | Allowlist min-one, no self-delete | unit | `npm test -- lib/admin/operators.test.ts -x` | ❌ Wave 0 |
| D-21 | Preset → Crawlee options map | unit | `cd scraper && npm test -- src/admin/presets.test.ts -x` | ❌ Wave 0 |
| D-13/D-33 | Scheduler picks due sources + jobs | unit | `cd scraper && npm test -- src/scheduler.test.ts -x` | ❌ Wave 0 |
| D-43 | Daily cap pauses translate only | unit | `npm test -- lib/admin/translation-cap.test.ts -x` | ❌ Wave 0 |
| D-26/D-27 | Gemini fail → OpenRouter → queue | unit | `npm test -- lib/admin/translate.test.ts -x` | ❌ Wave 0 |
| D-10 | Venice URL validation | unit | `npm test -- lib/admin/url-validate.test.ts -x` | ❌ Wave 0 |
| SCRP-06 | Validation thresholds unchanged | unit | `cd scraper && npm test -- src/shared/validate-run.test.ts -x` | ✅ exists |
| D-05 | Coming-soon run no-op | unit | `cd scraper && npm test -- src/worker-placeholder.test.ts -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (affected package only)
- **Per wave merge:** `npm test && cd scraper && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/admin/schemas.ts` + `lib/admin/schemas.test.ts` — Zod bounds, URL arrays
- [ ] `lib/admin/crypto.ts` + test — AES roundtrip
- [ ] `lib/admin/require-operator.ts` + test — allowlist gate (mock Supabase)
- [ ] `lib/admin/translate.ts` + test — provider fallback chain (mock fetch)
- [ ] `scraper/src/config-loader.ts` + test — DB config merge with env fallback
- [ ] `scraper/src/scheduler.ts` + test — due sources, stagger, job dequeue
- [ ] `middleware.ts` + integration smoke — optional manual-only if mock cookies hard
- [ ] Extend `vitest.config.ts` include glob for `lib/admin/**/*.test.ts`

## Security Domain

### Applicable ASVS Categories (ASVS L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth + operator allowlist (D-02) |
| V3 Session Management | yes | `@supabase/ssr` cookie refresh in middleware |
| V4 Access Control | yes | RLS `is_operator()` on admin tables; silent redirect (D-49) |
| V5 Input Validation | yes | Zod on all Route Handlers; URL pattern validation (D-10) |
| V6 Cryptography | yes | AES-256-GCM for proxy at rest; never store bot/API keys in DB (D-06) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-operator admin access | Elevation of Privilege | Allowlist + middleware redirect |
| Proxy URL exposure via anon API | Information Disclosure | Encrypted column; service role + operator routes only |
| SQL injection via admin forms | Tampering | Parameterized Supabase client; Zod string validation |
| SSRF via target URLs | Spoofing | Allowlist URL host patterns per source (subito.it, etc.) |
| Translation prompt injection | Tampering | Fixed system prompt; truncate input length |
| Operator lockout (delete last allowlist) | Denial of Service | DB constraint + UI guard (D-47) |
| CSRF on admin mutations | Tampering | SameSite cookies + POST-only mutations |

## Recommended Schema (Planner Discretion — Names Approved)

```sql
-- Migration 017 (illustrative — planner finalizes)
create table public.operator_allowlist (
  email text primary key check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.scraper_global_config (
  id int primary key default 1 check (id = 1),
  global_pause boolean not null default false,
  auto_translate boolean not null default true,
  daily_translation_cap int not null default 500,
  translation_provider text not null default 'gemini'
    check (translation_provider in ('gemini', 'openrouter')),
  telegram_chat_id text,
  alert_email text,
  proxy_enc jsonb, -- { iv, tag, data } base64 fields
  translations_today int not null default 0,
  translations_reset_date date not null default current_date,
  updated_at timestamptz not null default now()
);

create table public.scraper_sources (
  slug text primary key, -- subito, facebook, vinted, wallapop, ebay
  display_name text not null,
  implementation_status text not null check (implementation_status in ('live', 'coming_soon')),
  enabled boolean not null default false,
  interval_minutes int not null check (interval_minutes between 30 and 1440),
  anti_block_preset text not null default 'standard'
    check (anti_block_preset in ('conservative', 'standard', 'aggressive')),
  target_urls text[] not null default '{}',
  next_run_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null references public.scraper_sources(slug),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  requested_at timestamptz not null default now(),
  requested_by uuid references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  message text
);

create table public.translation_queue (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'done')),
  attempts int not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.scrape_runs add column if not exists source text not null default 'subito';
alter table public.listings
  add column if not exists title_en text,
  add column if not exists title_zh text,
  add column if not exists description_en text,
  add column if not exists description_zh text,
  add column if not exists category text,
  add column if not exists category_en text,
  add column if not exists category_zh text;
```

## Sources

### Primary (HIGH confidence — codebase verified)

- `scraper/src/worker.ts` — current cron, run orchestration
- `scraper/src/config.ts` — env config, service role client
- `scraper/src/subito/crawler.ts` — Crawlee preset defaults
- `supabase/migrations/003_scrape_audit_tables.sql` — audit schema
- `lib/supabase/auth.ts`, `lib/supabase/service.ts`, `lib/supabase/server.ts` — auth patterns
- `app/api/alerts/route.ts` — Route Handler + Zod pattern
- `06-CONTEXT.md`, `06-UI-SPEC.md`, `06-REFERENCE-IMPLEMENTATION.md` — phase decisions

### Secondary (MEDIUM confidence — official docs)

- `/supabase/supabase` Context7 — RLS security definer, Vault
- `/vercel/next.js/v16.2.9` Context7 — Supabase middleware proxy pattern
- `/googleapis/js-genai` Context7 — generateContent API
- [openrouter.ai/docs](https://openrouter.ai/docs/quickstart) — chat completions API

### Tertiary (LOW confidence — needs plan-time validation)

- OpenRouter model slug and pricing for fallback (A3)
- Exact Gemini model availability (`gemini-3.6-flash` vs `gemini-2.0-flash`)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — verified from installed packages and existing patterns
- Architecture: **HIGH** — codebase grep confirms worker/admin split and missing `/admin`
- Pitfalls: **HIGH** — traced to specific files (worker.ts, AppChrome, migrations)
- Translation/encryption: **MEDIUM** — official docs cited; model/cap defaults assumed

**Research date:** 2026-08-04
**Valid until:** 2026-09-04 (stable stack); 2026-08-11 (OpenRouter model pricing)
