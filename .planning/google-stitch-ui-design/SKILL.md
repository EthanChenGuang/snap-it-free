---
name: google-stitch-ui-design
description: >-
  Enforces the Google Stitch Structured Minimalist design system for 手慢无.
  Use when writing UI-SPEC.md, implementing React components, auditing frontend
  work, or any task touching src/components/, src/index.css, or user-facing
  screens. Requires strict adherence to DESIGN.md and screen HTML prototypes.
---

# Google Stitch UI Design Authority

This skill makes `.planning/google-stitch-ui-design/` the **locked visual source of truth**. Do not invent a new design language. Extend the existing system only when no Stitch screen exists.

## Mandatory Reading (before any UI decision)

1. [DESIGN.md](DESIGN.md) — tokens, typography, spacing, elevation, component rules
2. The relevant screen prototype: `{screen}_notion_style/code.html` (see map below)
3. Existing React implementation in `src/components/` for that screen
4. `src/index.css` — Tailwind v4 `@theme` tokens derived from Stitch

## Screen Reference Map

| Screen | Stitch prototype | React component |
|--------|------------------|-----------------|
| Listing feed | `listing_feed_notion_style/code.html` | `src/components/ListView.tsx` |
| Map explorer | `map_explorer_notion_style/code.html` | `src/components/MapView.tsx` |
| Item details | `item_details_notion_style/code.html` | `src/components/ItemDetailView.tsx` |
| Post free item | `post_free_item_notion_style/code.html` | `src/components/PostItemView.tsx` |
| Settings | `setting_notion_style/code.html` | `src/components/SettingsView.tsx` |

For new screens: match the closest Stitch screen's layout density, borders, and interactions. Extend from [DESIGN.md](DESIGN.md) — do not default to shadcn/Tailwind themes.

## Locked Contract (summary)

Full token values live in [DESIGN.md](DESIGN.md). These rules are non-negotiable:

### Aesthetic
- Document-first minimalism — clarity over decoration
- Monochrome-first — content is the focus
- Thin borders and whitespace over heavy dividers or shadows
- Calm, ordered workspace feel — no playful or organic styling

### Colors
- Surface `#f9f9f8`, on-surface `#1a1c1c`, variant `#444748`
- Primary CTA `#000000` on `#ffffff`
- Borders `#e5e5e5` — use `.notion-border` or `border-outline-variant`
- Hover/sub-surface `#f1f1f0` / `surface-container`
- Accent blue sparingly (links, specific highlights only)
- No gradients, glassmorphism, neon, or saturated palette drift

### Typography (Inter only)
- h1 40px/700 (32px mobile), h2 30px/600, h3 24px/600
- body-lg 17px/400, body-md 15px/400, label-md 14px/500, label-sm 12px/500
- Body line-height 1.6; headings 1.2–1.4

### Spacing & Layout
- 4px grid: 4, 8, 16, 24, 48
- Max width 1200px centered (`max-w-container-max mx-auto`)
- Gutter 24px (`px-gutter`)
- Left-align text-heavy content

### Shapes & Elevation
- Base radius 4px (inputs, buttons, chips); large 8px (cards, modals); pill for tags only
- No drop shadows on cards — 1px borders and tonal layers
- Hover: background tint, not lift (except subtle card image zoom per Stitch HTML)

### Components
- Primary button: black bg, white text
- Secondary: white bg, 1px `#e5e5e5` border
- Ghost: no border; hover → `#f1f1f0`
- Icons: Material Symbols Outlined (weight 400, opsz 24)
- Category pills: rounded-full; active black fill, inactive white + notion-border

## Agent-Specific Obligations

### gsd-ui-researcher / UI-SPEC
- Set design system to **Google Stitch Structured Minimalist**
- Copy token values from [DESIGN.md](DESIGN.md), not generic shadcn presets
- Reference the specific `code.html` per screen in the spec
- Flag screens without Stitch prototypes as **needs extension from DESIGN.md**

### gsd-executor
1. Read the Stitch `code.html` for the target screen first
2. Reproduce layout, spacing, hierarchy, and component structure
3. Use `src/index.css` `@theme` tokens and semantic Tailwind classes
4. Do not hardcode ad-hoc hex unless matching a Stitch token
5. Diff output section-by-section against the HTML prototype before marking done

### gsd-ui-checker / gsd-ui-auditor
- Compare against Stitch prototypes, not abstract taste
- BLOCK on: colorful themes, rounded-xl/2xl cards, card shadows, non-Inter fonts, new button styles outside primary/secondary/ghost

## Anti-Patterns (BLOCKING)

- Default Tailwind/shadcn theme or accent-heavy UI
- Large border-radius on cards unless in Stitch HTML
- Box shadows on static cards
- Center-aligned body copy in list/detail views
- Ignoring `.planning/google-stitch-ui-design/` because React components exist

## Verification Checklist

- [ ] Read [DESIGN.md](DESIGN.md) and relevant `code.html`
- [ ] Colors, type scale, spacing match Stitch tokens
- [ ] Borders use `#e5e5e5` / `notion-border`
- [ ] No unauthorized shadows or radius inflation
- [ ] Icons are Material Symbols Outlined
- [ ] Layout matches Stitch screen structure
- [ ] Side-by-side comparison with HTML prototype would pass
