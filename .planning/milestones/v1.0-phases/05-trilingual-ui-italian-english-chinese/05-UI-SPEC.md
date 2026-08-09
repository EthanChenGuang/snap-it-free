---
phase: 05
slug: trilingual-ui-italian-english-chinese
status: draft
shadcn_initialized: false
preset: stitch-structured-minimalist
created: 2026-08-04
design_authority: .planning/google-stitch-ui-design/DESIGN.md
---

# Phase 5 — UI Design Contract

> Visual and interaction contract for trilingual UI chrome. **All UI MUST follow `.planning/google-stitch-ui-design/`** — port existing React components; do not redesign.

**Stitch prototypes (mandatory read before implementing):**
- `.planning/google-stitch-ui-design/DESIGN.md` — tokens, typography, spacing, component rules
- `.planning/google-stitch-ui-design/setting_notion_style/code.html` — Settings language segment (lines 237–254)
- `.planning/google-stitch-ui-design/SKILL.md` — porting rules

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom Tailwind `@theme` tokens) |
| Preset | Stitch Structured Minimalist |
| Component library | Radix primitives restyled to Stitch (D-53) |
| Icon library | Material Symbols Outlined |
| Font | Inter (400/500/600/700 per DESIGN.md scale) |

**Anti-patterns (blocking):** default shadcn theme colors, rounded-xl/2xl cards, saturated accents, glassmorphism, card drop shadows.

---

## Spacing Scale

From DESIGN.md — multiples of 4 only:

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, inline padding |
| space-sm | 8px | Compact element spacing |
| space-md | 16px | Default element spacing |
| space-lg | 24px | Section padding, gutter |
| space-xl | 48px | Major section breaks |
| gutter | 24px | Page horizontal padding |
| container-max | 1200px | Max content width |

Exceptions: none

---

## Typography

| Role | Class | Size | Weight |
|------|-------|------|--------|
| Header title | text-h3 | 24px | 600 |
| Section label | text-label-md uppercase tracking-wider | 14px | 500 |
| Body | text-body-md | 15px | 400 |
| Language label (active) | text-label-md font-bold | 14px | 700 |
| Language sublabel | text-[10px] uppercase | 10px | 500 |

---

## Color

| Role | Token | Usage |
|------|-------|-------|
| Surface | bg-surface `#f9f9f8` | Page/header background |
| On-surface | text-on-surface | Primary text |
| Secondary | text-secondary | Sublabels, metadata |
| Primary CTA / active | bg-primary text-on-primary | Active language segment |
| Border | border-outline-variant `#c4c7c7` / `#e5e5e5` | Structural divisions |
| Hover | bg-surface-container-high | Inactive language hover |
| Chip/tag bg | bg-surface-container-low | Segment container |

Accent: reserved for links only — **not** language controls.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Header dropdown closed | Native script of current locale: `中文` / `English` / `Italiano` (D-124) |
| Header dropdown options | Same three labels; no ISO codes in UI |
| Settings section title | `messages.settings.languageSection` (already cataloged) |
| Language segment labels | `中文` + `Chinese`, `English` + `English`, `Italiano` + `Italian` |
| Empty/error states | From message catalogs — no hardcoded English/Italian in components |

---

## Screens & Components

### 1. Header Language Dropdown (NEW — D-123–D-127)

**Placement:** Right cluster of `components/shell/Header.tsx`, between title and search icon (or replace right-most affordance cluster per layout fit — must remain on all main pages).

**Closed state:**
- Text button showing current language native script (`中文`, `English`, `Italiano`)
- `min-h-11 min-w-11` touch target (44px)
- `text-label-md font-medium text-on-surface`
- Optional chevron: Material Symbol `expand_more`, 20px, `text-secondary`

**Open state (popover/menu):**
- Thin 1px `border-outline-variant` panel, `bg-surface`, `rounded-lg` (8px max per DESIGN.md Level 2)
- No drop shadow unless needed for separation — prefer border-only
- Three rows, each `min-h-11`, full-width tap target
- Active row: `bg-surface-container-high` or subtle left border — **not** saturated accent
- Inactive hover: `bg-surface-container-low`

**Interaction:**
- Click/tap selects language → `writeAppPreferences({ language })` → instant re-render via `useMessages()`
- No toast, no page reload (D-128)
- `aria-haspopup="listbox"`, `aria-expanded`, `aria-label` from messages catalog

**Stitch reference:** No dedicated header prototype — extend existing Header layout (`map_explorer_notion_style` header row pattern: monochrome, icon+text cluster, 1px bottom border).

### 2. Settings Language Segment (EXISTING — verify Stitch parity)

**File:** `components/settings/LanguageSection.tsx`

**Stitch reference:** `setting_notion_style/code.html` lines 237–254.

**Contract:**
- Section title: uppercase label-md, `text-on-secondary-container`, `ml-space-xs`
- Container: `SettingsCard` with `border border-outline-variant`, `rounded-lg`, `p-space-xs`
- Inner track: `bg-surface-container-low rounded-lg p-space-xs`
- Active button: `bg-primary text-on-primary` (black on white per DESIGN.md primary button)
- Inactive: `text-on-surface hover:bg-surface-container-high`
- Labels: native script bold + 10px uppercase sublabel

**Status:** Implemented — audit only for token drift vs Stitch prototype.

### 3. Document Language Sync (EXISTING)

**File:** `components/shell/DocumentLang.tsx`

Maps preference → `html[lang]` (`zh`→`zh-CN`, `en`→`en`, `it`→`it`). No visual change.

---

## UI Considerations

| Edge | Status | Acceptance criterion |
|------|--------|-------------------|
| Header dropdown visible on mobile PWA | covered | Language control reachable with 44px touch target on map, list, post, settings, detail |
| Header + Settings stay in sync | covered | Both call `writeAppPreferences`; changing one updates the other instantly |
| Stitch token compliance on new dropdown | covered | Uses `@theme` tokens only; no hardcoded hex except DESIGN.md-approved borders |
| Dark mode language controls | backstop | If appearance=dark, dropdown/segment use dark surface tokens from theme — verify contrast |
| RTL / locale script overflow | unresolved | Chinese/Italian labels fit in compact header — assume LTR; truncate with ellipsis if needed |
| Keyboard navigation in dropdown | covered | Arrow keys + Enter/Escape if using Radix; Tab focus ring visible |

---

## Accessibility

- Minimum 44×44px touch targets on all language controls
- `html[lang]` updated on preference change (DocumentLang)
- Screen reader: language control labeled from messages (not hardcoded English)
- Focus visible on dropdown items (`peer-focus-visible:outline` pattern from AlertsSection)

---

## Out of Scope (UI)

- Admin console i18n (Phase 6)
- Listing content translation UI (Phase 6 ingest)
- URL `[locale]` routing or next-intl layout switches
