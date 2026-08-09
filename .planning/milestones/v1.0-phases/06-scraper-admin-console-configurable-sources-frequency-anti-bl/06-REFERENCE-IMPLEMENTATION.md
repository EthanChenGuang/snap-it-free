# Phase 6: Reference Implementation — `scraper-admin/`

**Source:** Google AI Studio export (2026-08-04)  
**Status:** UI/UX prototype with mock state + minimal Express API — **not production-ready**  
**Role for planning:** Port visual structure and interaction patterns into Next.js `/admin`; replace mock layer with Supabase + worker integration per `06-CONTEXT.md`.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, Tailwind v4 (`@tailwindcss/vite`) |
| Icons | `lucide-react` (not Material Symbols from Stitch spec) |
| Backend | Express 4 via `server.ts` + `tsx` dev runner |
| AI | `@google/genai` — `POST /api/translate` only |
| State | React `useState` in `App.tsx` — no router, no Supabase |

**Run locally:** `cd scraper-admin && npm install && npm run dev` → http://localhost:3000

---

## Directory Map

```
scraper-admin/
├── server.ts              # Express: /api/health, /api/translate; Vite middleware in dev
├── src/
│   ├── App.tsx            # Tab router + all handlers (mock CRUD)
│   ├── types.ts           # Domain types (Source, RunItem, RejectPayload, …)
│   ├── data/initialData.ts # Seed mock data
│   ├── components/
│   │   ├── DashboardView.tsx
│   │   ├── SourcesView.tsx
│   │   ├── SubitoConfigView.tsx   # Generic source detail (all sources)
│   │   ├── RunHistoryView.tsx
│   │   ├── RunDetailView.tsx
│   │   ├── RejectsView.tsx
│   │   ├── TranslationQueueView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Toast.tsx
│   └── index.css
```

---

## Navigation Model

Tab union in `types.ts` → `NavTab`:

| Tab | Component | Maps to planned route |
|-----|-----------|------------------------|
| `dashboard` | DashboardView | `/admin` |
| `sources` | SourcesView | `/admin/sources` |
| `source-detail` | SubitoConfigView | `/admin/sources/[id]` |
| `runs` | RunHistoryView | `/admin/runs` |
| `run-detail` | RunDetailView | `/admin/runs/[id]` |
| `rejects` | RejectsView | `/admin/rejects` |
| `translation` | TranslationQueueView | `/admin/translation` |
| `settings` | SettingsView | `/admin/settings` |

No URL routing — refresh loses tab state. Production should use Next.js App Router.

---

## Features Implemented (mock)

### Dashboard
- Global pause indicator (reads `SystemConfig.globalPause`)
- Source cards: enable toggle, Run now, link to source detail
- Recent alerts list + dismiss + test alert
- Translation queue count shortcut

### Sources
- Table/list of 5 sources (Subito + FB/Vinted/Wallapop/eBay)
- Toggle, Run now, navigate to detail
- **`handleAddSource`** — add custom integration (not in CONTEXT — consider deferring)

### Source detail (`SubitoConfigView`)
- Enabled toggle, interval stepper **30–1440 min** (matches D-14)
- Multi-line URLs textarea, anti-block 3-way segmented control
- Read-only validation thresholds panel
- Save + Run now

### Runs
- History table with navigate to detail
- Clear history (mock)
- Run detail: metrics + log lines

### Rejects
- Filterable reject list with expandable raw JSON
- **`handleForceAccept`** — force-insert rejected listing (not in CONTEXT — planner decide keep/defer)

### Translation
- Auto-translate toggle
- Per-item + bulk translate via `/api/translate`
- Fallback success if API fails (silent mock)

### Settings
- Global pause toggle
- Proxy URL (password field)
- Telegram chat ID + alert email
- Missing vs CONTEXT: allowlist, daily cap, provider picker, OpenRouter

---

## Server API

```text
GET  /api/health     → { status, timestamp }
POST /api/translate  → { listingId, source, text, targetLanguage? }
                       Uses gemini-3.6-flash; returns translatedText
```

No endpoints for: sources CRUD, runs, jobs, config persist, auth.

---

## Alignment with `06-CONTEXT.md`

### Matches well
- 8 admin views covering planned screens
- Per-source interval 30–1440, anti-block presets, multi-URL config
- Global pause, proxy + alert fields, auto-translate toggle
- Run now simulates new run row
- Translation queue + Gemini call path
- Rejects browser with reason + snippet

### Gaps / drift (fix during port)

| Area | Reference code | CONTEXT decision |
|------|----------------|------------------|
| Host app | Standalone Vite SPA | Next.js `/admin` in main app |
| Auth | None | Supabase Auth + email allowlist |
| Data | `initialData.ts` mock | Supabase tables + RLS |
| Subito URLs | Wrong paths (`vendita/usato-regalo/…`) | Phase 1 regalo category URLs |
| Coming-soon URLs | 1 URL each, wrong keywords | D-51/D-52: 3 Venice templates each |
| Extra source | `Immobiliare` in mock runs/rejects | Out of scope |
| Translation demo | Tokyo/Paris listings | Venice IT → en/zh at ingest |
| Provider | Gemini only, English target | Gemini + OpenRouter; en **and** zh columns |
| Daily cap | Not in UI | D-43 configurable cap |
| Allowlist | Not in UI | D-28, D-45–D-47 |
| Icons / copy | lucide + English Notion style | Stitch + Chinese-primary (D-34) |
| Worker | Not connected | `scraper/` reads DB config + jobs |

---

## Port Strategy (for `gsd-plan-phase 6`)

1. **Visual:** Use `scraper-admin` components as layout reference; reconcile colors with `scraper-dashboard/DESIGN.md` Stitch tokens.
2. **Routes:** One Next.js route per tab; extract shared `AdminShell` (Sidebar + Header).
3. **Data:** Replace `useState(initialData)` with Supabase queries + Route Handlers.
4. **Worker:** Admin writes config/jobs; `scraper/` worker consumes — no duplicate scrape logic in admin.
5. **Translate:** Move `/api/translate` pattern to Next.js server route; wire ingest pipeline + queue table.
6. **Drop or flag:** `handleAddSource`, `Immobiliare` mocks, `handleForceAccept` unless explicitly scoped.

---

*Reference audit: 2026-08-04*
