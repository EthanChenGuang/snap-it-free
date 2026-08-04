# Phase 6: Scraper Admin Console - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 06-scraper-admin-console
**Areas discussed:** Admin access, Source rollout, Schedule, Anti-block, Translation, Config sync, Manual run, Translation provider, Admin Stitch UI

---

## Admin Surface & Access

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /admin | Separate route, Stitch ops layout | ✓ |
| Settings embed | Inside consumer Settings | |
| External only | DB + env, no Web UI | |

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Auth + email allowlist | Reuse Phase 4 login | ✓ |
| Shared admin secret | Single API key | |
| ADMIN_SECRET cookie | Server-only gate | |

| Option | Description | Selected |
|--------|-------------|----------|
| Status-first dashboard | Health at a glance | ✓ |
| Config-first | Forms on home | |
| Minimal single page | No dashboard | |

| Option | Description | Selected |
|--------|-------------|----------|
| scrape_runs history table | Reuse audit table | ✓ |
| runs + rejects | Include rejects browser | |
| Last run only | Minimal | |

| Option | Description | Selected |
|--------|-------------|----------|
| Run now yes | Manual trigger per source | ✓ |
| Subito only | | |
| No manual run | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Alerts in admin | Telegram chat ID + email to editable | ✓ |
| Alerts env only | | |
| Alerts read-only status | | |

**User's choice:** Dedicated /admin, allowlist auth, status dashboard, runs table, run now, alerts in admin.

---

## Source Rollout

| Option | Description | Selected |
|--------|-------------|----------|
| Subito live + others config placeholder | FB/Vinted/Wallapop/eBay coming soon | ✓ |
| All five implement | Full crawlers in Phase 6 | |
| Subito + FB only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle + frequency + URL | Per-source full config | ✓ |
| Toggle only | | |
| Global master switch only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Venice-only geo | Lock to Venice/Veneto | ✓ |
| Per-source geo | | |
| URL defines geo | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Phase 1 free filter | Common rules | ✓ |
| Per-source rules | | |
| Category only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Source cards with badges | Running/Paused/Coming soon | ✓ |
| Simple table | | |
| Grouped sections | | |

**User's choice:** Subito operational; four other sources configurable with Coming soon badge; Venice scope; shared filter.

---

## Scheduling

| Option | Description | Selected |
|--------|-------------|----------|
| Per-source frequency | Independent intervals | ✓ |
| Global only | | |
| Global + override | | |

| Option | Description | Selected |
|--------|-------------|----------|
| 30 min – 24 h bounds | Safety limits | ✓ |
| 15 min – 12 h | | |
| No bounds | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stagger 5–10 min | Reduce concurrent load | ✓ |
| Run simultaneously | | |
| Configurable stagger | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Worker UTC, UI Europe/Rome | | ✓ |
| Europe/Rome everywhere | | |
| Browser local | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Global pause | One-click stop all | ✓ (Claude-selected for user) |
| Per-source only | | |
| Pause with auto-resume | | |

---

## Anti-Block

| Option | Description | Selected |
|--------|-------------|----------|
| Proxy URL in admin | DB-backed, worker reads | ✓ |
| Proxy env only | | |
| Per-source proxy | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Preset profiles | Conservative/Standard/Aggressive | ✓ |
| Raw numeric advanced | | |
| Hardcoded only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Per-source preset | FB conservative default | ✓ |
| Global preset | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Validation thresholds read-only fixed | Safest posture | ✓ (Claude-selected) |
| Tunable thresholds | | |
| Preset-linked validation | | |

---

## Translation

| Option | Description | Selected |
|--------|-------------|----------|
| Ingest-time translation | Store en/zh at scrape | ✓ |
| Display-time | | |
| Optional ingest | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Title + description + category | | ✓ |
| Title only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep IT + generate en/zh | | ✓ |
| All three columns always | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Global auto-translate toggle | | ✓ |
| Per-source toggle | | |
| Always on | | |

**User's choice (freeform):** On failure — still ingest, UI shows original, failures go to retry queue, admin shows pending count, one-click re-translate.

| Option | Description | Selected |
|--------|-------------|----------|
| Google Gemini | Translation provider | ✓ |
| DeepL / OpenAI | | |

---

## Config Sync & Manual Run

| Option | Description | Selected |
|--------|-------------|----------|
| Poll config each run | Worker reads DB at run start | ✓ |
| Poll interval | | |
| Webhook hot-reload | | |

| Option | Description | Selected |
|--------|-------------|----------|
| scrape_jobs queue | Admin writes job, worker consumes | ✓ |
| HTTP POST worker | | |
| Vercel trigger only | | |

---

## Admin Visual (Stitch)

**User's choice:** Design admin UI in **Google Stitch** — requested generated PRD + Prompt (`06-STITCH-PRD.md`, `06-STITCH-PROMPT.md`).

---

## Claude's Discretion

- Global pause (user asked Claude to choose → global pause selected)
- Validation thresholds fixed read-only (user asked for safest scraping → fixed thresholds)

## Deferred Ideas

- Live crawlers for FB, Vinted, Wallapop, eBay in Phase 6 implementation
- Per-source free-filter keyword editing
- scrape_rejects admin browser
- Config webhook hot-reload
