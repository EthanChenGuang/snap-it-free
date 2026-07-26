---
phase: 1
slug: scraper-foundation-listing-data-model
status: approved
reviewed_at: 2026-07-26
shadcn_initialized: false
preset: none
created: 2026-07-26
---

# Phase 1 — UI Design Contract

> **Scope:** No user-facing web UI in Phase 1. This contract covers operator-only notification surfaces (email/Telegram soft-block alerts) and records deferred design-system decisions for Phase 2 continuity.

---

## Phase Scope

| Surface | In Phase 1? | Notes |
|---------|-------------|-------|
| Map / list UI | No | Phase 2 (DISC-01–03) |
| Web app shell / PWA | No | Phase 2 |
| Operator dashboard | No | Audit data in `scrape_runs` / `scrape_rejects`; query via Supabase SQL or deferred admin UI |
| Operator soft-block alert (email) | Yes | Resend or equivalent (D-21) |
| Operator soft-block alert (Telegram) | Yes | Alternative or parallel channel (D-21, Claude's discretion) |
| Successful run notification | No | Silent on success; operator checks audit table or waits for failure alert |

**Roadmap UI hint:** The Phase 1 "UI hint" refers to operator alerting (SCRP-06), not end-user screens. Map-first browsing is explicitly deferred.

---

## Operator Notification Surfaces

### Surface A — Soft-Block Alert Email

Plain-text email (no HTML template in Phase 1). Visual hierarchy: subject severity → run metadata → failure reason → metrics → recommended actions.

### Surface B — Soft-Block Alert Telegram

Single-message format. Visual hierarchy: emoji severity prefix → one-line summary → bullet metrics → action link.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Phase 1 — no web UI) |
| Preset | not applicable |
| Component library | none |
| Icon library | none |
| Font | channel-native (email client default; Telegram system font) |

**Phase 2 forward reference (not implemented in Phase 1):** Tailwind CSS 4 + shadcn/ui + lucide-react per `.planning/research/STACK.md`. Planner should not create shadcn init tasks in Phase 1.

---

## Spacing Scale

**Phase 1:** Not applicable for web layout (no screens). Operator messages use structural whitespace only:

| Token | Value | Usage (notifications) |
|-------|-------|-------------------------|
| section-break | blank line | Between subject/summary, metrics block, and action block |

**Phase 2 deferred scale (for planner reference):** 4, 8, 16, 24, 32, 48, 64 px on 8-point grid.

Exceptions: none in Phase 1.

---

## Typography

**Phase 1:** Channel-native only — no custom type scale.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Email subject | client default | bold (via `[ALERT]` prefix convention) | n/a |
| Email body | client default (≈14–16px) | regular | ~1.4 (single-spaced paragraphs) |
| Telegram message | system default | regular; **bold** for run ID via Markdown | n/a |

---

## Color

**Phase 1:** No custom colors. Severity communicated textually:

| Role | Value | Usage |
|------|-------|-------|
| Severity prefix | `⚠️` (Telegram) / `[ALERT]` (email subject) | Soft-block failure only — not used on success paths |
| Body text | channel default | All notification content |
| Links | channel default (underlined) | Supabase dashboard / logs URL in action block |

Accent reserved for: **none in Phase 1** (no branded web chrome).

**Phase 2 deferred (60/30/10):** To be locked in Phase 2 UI-SPEC when map/list screens are designed.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Email subject (soft-block) | `[ALERT] 手慢无 scraper soft-block — run {run_id} failed validation` |
| Email opening line | `The Subito.it scraper detected a soft-block or suspiciously small feed and did NOT persist this batch.` |
| Email metrics block | `Run ID: {run_id}` / `Started: {started_at_iso}` / `Listings parsed: {parsed_count} (threshold: ≥{min_count}, 50% of 7-run median {median_count})` / `Selector completeness: {selector_pct}% (threshold: ≥90%)` / `Failure reason: {failure_code} — {failure_detail}` |
| Email action block | `Recommended actions:` / `1. Check worker logs for HTTP/proxy errors` / `2. Review scrape_runs row: {run_id}` / `3. If Subito DOM changed, update extract/ selectors (D-05)` / `4. If blocked, see legal/ops note and fallback plan (D-22)` |
| Email sign-off | `— 手慢无 (ShouManWu) ingestion worker` |
| Telegram message (soft-block) | `⚠️ *Scraper soft-block* — run `{run_id}`` / `Parsed *{parsed_count}* listings (need ≥{min_count}). Selectors *{selector_pct}%*.` / `Reason: {failure_code}` / `→ Check logs & scrape_runs` |
| Success path | *(silent — no message sent)* |
| Empty-state (operator audit) | N/A in Phase 1 — no dashboard. Operator runs SQL: `SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10;` |
| Error state (delivery failure) | Log to worker stderr: `ALERT_DELIVERY_FAILED channel={channel} run_id={run_id} error={message}` — do not retry indefinitely; next cron run will re-evaluate |
| Destructive confirmation | N/A — Phase 1 has no operator-facing destructive UI actions |

**Primary CTA:** N/A (no interactive UI). Closest actionable text: `→ Check logs & scrape_runs` (Telegram) / numbered action list (email).

---

## UI Considerations

> Populated by ui-phase UI-consideration probe (Step 9.5). Empty/loading/error/populated states for web UI are N/A — Phase 1 has no screens. Only overflow and long-text apply to operator notification copy.

Applicable state considerations resolved: 4 covered, 0 backstop, 0 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| overflow | E1 (soft-block email) | ✅ covered | Plain-text email uses natural word-wrap across paragraphs; metrics block is one field per line so long run IDs and ISO timestamps do not clip. |
| long-text | E1 (soft-block email) | ✅ covered | `failure_detail` and `failure_code` are never ellipsized in email; full text spans multiple lines. See Copywriting Contract metrics block. |
| overflow | E2 (Telegram alert) | ✅ covered | Single Telegram message stays under 4096-char limit; if composed body would exceed limit, truncate `failure_detail` to 500 chars with `…(truncated)` suffix; full detail remains in `scrape_runs`. |
| long-text | E2 (Telegram alert) | ✅ covered | Run ID wrapped in backticks for monospace emphasis; `failure_detail` subject to 500-char truncation rule above; metrics line uses bold counts only. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required — no web UI in Phase 1 |
| third-party | none | not required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-26
