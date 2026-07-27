---
phase: 1
slug: scraper-foundation-listing-data-model
status: draft
shadcn_initialized: false
preset: google-stitch-structured-minimalist
created: 2026-07-26
updated: 2026-07-27
---

# Phase 1 — UI Design Contract

> **Scope:** No user-facing web UI in Phase 1. This contract covers operator-only notification surfaces (email/Telegram soft-block alerts) and locks the **Google Stitch Structured Minimalist** design system as the project-wide visual authority for Phase 2+ frontend work.

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
| Preset | `google-stitch-structured-minimalist` |
| Design authority | `.planning/google-stitch-ui-design/DESIGN.md` |
| Component library | none in Phase 1; Tailwind v4 + Stitch tokens in Phase 2+ |
| Icon library | Material Symbols Outlined (Phase 2+ only) |
| Font | Phase 1: channel-native (email client default; Telegram system font). Phase 2+: Inter |

**Phase 1:** No web UI — operator messages use channel-native rendering only.

**Phase 2+:** All frontend work MUST follow Google Stitch Structured Minimalist per `.planning/google-stitch-ui-design/`. Copy token values from `DESIGN.md`, not generic shadcn presets. Do NOT use shadcn defaults. Existing React implementations in `src/components/` and tokens in `src/index.css` map from Stitch prototypes — preserve their patterns when extending.

---

## Screen Reference Map

| Screen | Stitch prototype | React component |
|--------|------------------|-----------------|
| Listing feed | `listing_feed_notion_style/code.html` | `src/components/ListView.tsx` |
| Map explorer | `map_explorer_notion_style/code.html` | `src/components/MapView.tsx` |
| Item details | `item_details_notion_style/code.html` | `src/components/ItemDetailView.tsx` |
| Post free item | `post_free_item_notion_style/code.html` | `src/components/PostItemView.tsx` |
| Settings | `setting_notion_style/code.html` | `src/components/SettingsView.tsx` |

For **new** screens: match the closest Stitch screen's layout density, border treatment, and interaction patterns. If no Stitch screen exists, extend from `DESIGN.md` — do not invent a new visual language.

---

## Spacing Scale

**Phase 1:** Not applicable for web layout (no screens). Operator messages use structural whitespace only:

| Token | Value | Usage (notifications) |
|-------|-------|-------------------------|
| section-break | blank line | Between subject/summary, metrics block, and action block |

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

## Phase 2+ Forward Reference — Google Stitch Structured Minimalist

> Locked design contract for all frontend phases. Source: `.planning/google-stitch-ui-design/DESIGN.md`. Planners and executors MUST read the relevant `code.html` prototype before implementing any screen.

### Aesthetic Principles

- Document-first minimalism — clarity over decoration
- Monochrome-first — content is the focus
- Thin borders and whitespace over heavy dividers or shadows
- Calm, ordered workspace feel — no playful or organic styling
- Left-align text-heavy content; max content width 1200px centered

### Spacing Scale (4px grid)

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, inline padding |
| space-sm | 8px | Compact element spacing |
| space-md | 16px | Default element spacing |
| space-lg | 24px | Section padding, gutter |
| space-xl | 48px | Major section breaks |
| container-max | 1200px | Max content width (`max-w-container-max mx-auto`) |
| gutter | 24px | Horizontal page padding (`px-gutter`) |

Exceptions: icon-only touch targets may use 44px minimum per accessibility guidelines.

### Typography (Inter only)

| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| h1 | 40px (32px mobile) | 700 | 1.2 | -0.02em |
| h2 | 30px | 600 | 1.3 | -0.01em |
| h3 | 24px | 600 | 1.4 | -0.01em |
| body-lg | 17px | 400 | 1.6 | — |
| body-md | 15px | 400 | 1.6 | — |
| label-md | 14px | 500 | 1.4 | — |
| label-sm | 12px | 500 | 1.2 | 0.01em |

Use weight 600/700 to differentiate headers from body. Body line-height 1.6; headings 1.2–1.4.

### Color (60/30/10)

| Role | Hex | Usage |
|------|-----|-------|
| Dominant (60%) — surface | `#f9f9f8` | Background, primary canvas |
| Secondary (30%) — containers | `#eeeeed` / `#f4f4f3` / `#f1f1f0` | Cards, sidebars, secondary panels, hover states |
| On-surface | `#1a1c1c` | Primary text, critical iconography |
| On-surface-variant | `#444748` | Secondary text, metadata |
| Border | `#e5e5e5` | All structural divisions (`.notion-border`, `border-outline-variant`) |
| Accent (10%) | blue (sparingly) | Links, specific interactive highlights only |
| Primary CTA | `#000000` bg / `#ffffff` text | Primary buttons |
| Destructive | `#ba1a1a` | Destructive actions only |

Accent reserved for: **links**, **specific interactive highlights**, **checked checkbox accent** (primary black or accent blue). NOT for general buttons, cards, or decorative elements.

Full token palette (from DESIGN.md): surface `#f9f9f8`, surface-container-low `#f4f4f3`, surface-container `#eeeeed`, surface-container-high `#e8e8e7`, surface-container-highest `#e2e2e1`, surface-container-lowest `#ffffff`, outline `#747878`, outline-variant `#c4c7c7`, secondary `#615e57`, secondary-container `#e7e2d9`, error `#ba1a1a`, error-container `#ffdad6`.

### Shapes & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| rounded-sm | 0.125rem (2px) | — |
| rounded DEFAULT | 0.25rem (4px) | Inputs, buttons, checkboxes, chips |
| rounded-md | 0.375rem (6px) | — |
| rounded-lg | 0.5rem (8px) | Cards, modals |
| rounded-full | 9999px | Tags, category pills only |

- **Level 0 (Surface):** primary white/off-white background — no shadow
- **Level 1 (Sub-surface):** sidebars/panels use `#f1f1f0` tonal layer
- **Level 2 (Overlays):** modals/menus use 1px `#e5e5e5` border; subtle shadow `0px 4px 12px rgba(0,0,0,0.05)` only when necessary
- **Hover:** background tint to neutral gray — no lift effect (except subtle card image zoom per Stitch HTML)

### Components (Phase 2+)

| Component | Specification |
|-----------|---------------|
| Primary button | Black background (`#000000`), white text, 4px radius |
| Secondary button | White background, 1px `#e5e5e5` border, `#1a1c1c` text |
| Ghost button | No border/background; hover → `#f1f1f0` |
| Input fields | 1px `#e5e5e5` border, 4px radius; focus: 1px `#1a1a1a` border or soft blue halo |
| Cards | White background, 1px `#e5e5e5` border, no shadow; generous internal padding (`space-lg`) |
| Lists | Clean lines, no bullets by default; 1px bottom borders between items only for high-density data |
| Chips/tags | label-sm, light gray background (`#f1f1f0`), 4px radius; pill (`rounded-full`) for category filters |
| Checkboxes | Square, 2px radius; checked: primary black or accent blue |
| Category pills | `rounded-full`; active: black fill; inactive: white + `.notion-border` |
| Icons | Material Symbols Outlined, weight 400, opsz 24 |

Implement using `src/index.css` `@theme` tokens and semantic Tailwind classes. Do not hardcode ad-hoc hex unless matching a Stitch token.

---

## Anti-Patterns (BLOCKING — Phase 2+)

- Default Tailwind/shadcn theme or accent-heavy UI
- Large border-radius on cards unless present in Stitch HTML prototype
- Box shadows on static cards
- Center-aligned body copy in list/detail views
- Ignoring `.planning/google-stitch-ui-design/` because React components already exist
- Gradients, glassmorphism, neon, or saturated palette drift
- Non-Inter fonts for UI text
- New button styles outside primary/secondary/ghost trio

---

## UI Considerations

> Populated by ui-phase UI-consideration probe (Step 9.5). Empty/loading/error/populated states for web UI are N/A — Phase 1 has no screens.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required — no web UI in Phase 1; Stitch is manual design authority |
| third-party | none | not required |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
