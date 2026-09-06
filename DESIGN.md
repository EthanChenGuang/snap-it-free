---
name: Structured Minimalist
description: Document-first monochrome design system for 零元 (Venice Free Finds)
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e1'
  surface-variant: '#e2e2e1'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  secondary: '#615e57'
  on-secondary: '#ffffff'
  secondary-container: '#e7e2d9'
  on-secondary-container: '#67645d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  accent-orange: '#df6b05'
  chip-bg: '#f1f1f0'
  structural-border: '#e5e5e5'
typography:
  display:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  title:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 48px
  container-max: 1200px
  gutter: 24px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.DEFAULT}'
    padding: '8px 16px'
    height: 36px
  button-primary-hover:
    backgroundColor: '{colors.primary-container}'
    textColor: '{colors.on-primary}'
  button-secondary:
    backgroundColor: '{colors.surface-container-lowest}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label}'
    rounded: '{rounded.DEFAULT}'
    padding: '8px 16px'
    height: 36px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.on-surface-variant}'
    typography: '{typography.label}'
    rounded: '{rounded.DEFAULT}'
    padding: '8px 16px'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '8px 16px'
  chip-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '8px 16px'
---

# Design System: Structured Minimalist

## Overview

**Creative North Star: "The Digital Document"**

零元 (Venice Free Finds) uses Google Stitch's **Structured Minimalist** world: a document-first, monochrome workspace where listings read like a carefully typeset catalog, not a promotional marketplace. Information density, scanability, and calm order outrank decoration. The system prioritizes thin structural borders, generous whitespace, and Inter-driven hierarchy so free items remain the hero.

This file carbonizes the incumbent visual authority from `.planning/google-stitch-ui-design/DESIGN.md` and the live token implementation in `app/globals.css`. Snag-style reference screenshots inform **interaction patterns only** — never Snag's red theme or floating capsule nav clone.

**Key Characteristics:**

- Monochrome-first palette with black primary CTAs and `#e5e5e5` structural borders
- Inter typography as the sole type family; weight and size carry hierarchy
- 4px spacing grid; max content width 1200px; 24px gutters
- Tonal layering over drop shadows; borders define zones
- Material Symbols Outlined icons (weight 300–400, opsz 24)
- Mobile-first PWA shell with frosted header/nav overlays on consumer feed surfaces
- Radix/shadcn primitives allowed only when restyled to Stitch tokens

## Colors

A high-contrast monochrome palette mimics paper: warm off-white surfaces (`#f9f9f8`), near-black text (`#1a1c1c`), and consistent `#e5e5e5` / `outline-variant` borders. Color accents are rare and functional.

### Primary

- **Ink Black** (`#000000`): Primary buttons, active chips, focus rings, structural emphasis. The dominant action color — used sparingly so its weight stays meaningful.
- **On Primary** (`#ffffff`): Text and icons on primary-filled surfaces.

### Secondary

- **Warm Stone** (`#615e57`): Secondary actions and admin metadata where a softer dark tone is needed without competing with primary black.
- **Stone Container** (`#e7e2d9`): Secondary container backgrounds for grouped secondary content.

### Neutral

- **Paper Surface** (`#f9f9f8`): Default page background; reads as warm white paper.
- **On Surface** (`#1a1c1c`): Primary body text and icons.
- **Muted Metadata** (`#444748`): Secondary labels, placeholders, inactive nav icons.
- **Sub-surface** (`#f1f1f0` / `surface-container`): Hover fills, chip backgrounds, ghost button hover.
- **Structural Border** (`#e5e5e5` / `outline-variant`): All dividers, card edges, input strokes. Use `.notion-border` or `border-outline-variant`.
- **Container steps** (`surface-container-low` through `surface-container-highest`): Tonal layering for panels, skeletons, and nested zones.

### Tertiary / Accent

- **Signal Orange** (`#df6b05`): Map pin dots, active favorite heart, UGC location markers — geographic and save-state accent only.
- **Alert Red** (`#ba1a1a`): Errors, destructive actions, active bottom-nav icon (consumer shell), location button icon.

### Named Rules

**The One Border Rule.** All structural divisions use 1px `#e5e5e5` (`outline-variant`). Do not mix border weights or ad-hoc gray hex values across surfaces.

**The Monochrome Default Rule.** Screens should read as black, white, and warm gray. Saturated fills appear only on photo overlays (FREE badge) or the two functional accents above — never as decorative theme color.

## Typography

**Display / Headline / Body Font:** Inter (with system-ui fallbacks)
**Icons:** Material Symbols Outlined — not Lucide in new consumer surfaces

**Character:** Systematic, functional, and breathable. Headings use tight negative letter-spacing; body copy uses generous 1.6 line-height for trilingual readability.

### Hierarchy

- **Display / H1** (700, 40px / 32px mobile, 1.2): Page titles, hero headings on settings and admin.
- **Headline / H2** (600, 30px, 1.3): Section headers, drawer titles.
- **Title / H3** (600, 24px, 1.4): Subsection labels within forms and settings groups.
- **Body Large** (400, 17px, 1.6): Long-form descriptions, listing detail prose.
- **Body** (400, 15px, 1.6): Default UI copy; keep lines under ~65–75ch in text-heavy admin views.
- **Label** (500, 14px): Buttons, form labels, filter section headers.
- **Label Small** (500, 12px, +0.01em tracking): Metadata rows, card subtitles, chip text.

### Named Rules

**The Weight-as-Signal Rule.** Use 600–700 for headings only. Body stays 400; labels at 500. Never bold body paragraphs for emphasis — use label size or color instead.

## Layout

Mobile-first PWA shell: `100dvh` app column with sticky feed header, scrollable main, and fixed bottom nav cleared by safe-area insets.

- **Grid:** 4px base unit — spacing tokens `space-xs` (4) through `space-xl` (48).
- **Container:** `max-w-container-max` (1200px) centered; `px-gutter` (24px) horizontal padding.
- **Feed home:** Two-column listing grid on mobile; search header row with locale chip, filter, and location actions.
- **Admin:** Document-style full-width tables and panels; left-aligned text-heavy content.
- **Safe areas:** Bottom nav and drawers respect `env(safe-area-inset-bottom)`.

Consumer feed uses **frosted overlays** (header `bg-white/80 backdrop-blur-md`, bottom nav capsule `bg-white/70`) — a mobile legibility extension on top of the flat document base, not a separate visual world.

## Elevation & Depth

Flat-by-default. Depth comes from **tonal surface steps** and **1px borders**, not card drop shadows.

- **Level 0:** `background` / `surface-container-lowest` — primary canvas.
- **Level 1:** `surface-container` / `chip-bg` (`#f1f1f0`) — sidebars, hover states, inactive chips.
- **Level 2:** Drawers and modals — `border-outline-variant`, `rounded-t-lg`, optional minimal shadow only when separating from map content beneath.

### Shadow Vocabulary

- **Overlay scrim:** Transparent or none on filter drawer (map remains tappable).
- **Nav capsule** (`0 10px 15px rgba(0,0,0,0.1)` class `shadow-lg`): Reserved for floating bottom nav only — not cards or buttons.
- **Card image zoom:** Listing photos may scale on hover (`scale-105`) — motion on media, not container lift.

### Named Rules

**The No Shadow Rule.** Cards, buttons, and list rows do not carry drop shadows. If depth is needed, step surface tone or add a border.

**The Hover-Tint Rule.** Hover and active states change background to `surface-container` or opacity — never translateY lift on buttons.

## Shapes

Controlled geometry with soft modern corners — not pill-everything, not sharp brutalism.

- **Base radius** (4px / `rounded` / 0.25rem): Buttons, inputs, checkboxes, admin cards.
- **Large radius** (8px / `rounded-lg`): Drawer tops, admin panels.
- **Photo radius** (`rounded-2xl` / 16px): Feed listing image containers — photo-first mobile layout exception.
- **Pill** (`rounded-full`): Search field, filter chips, active filter pills, bottom nav capsule, FREE badge.

Square checkboxes use 2px radius per Stitch HTML prototypes.

## Components

### Buttons

- **Shape:** 4px radius (`rounded`), 36px default height, label-md weight 500.
- **Primary:** Black fill, white text; hover → `primary-container` (`#1c1b1b`).
- **Secondary:** White/`surface` fill, 1px `outline-variant` border; hover → `surface-container`.
- **Ghost:** No border; text `on-surface-variant`; hover → `surface-container`.
- **Focus:** `ring-1 ring-outline` — no saturated focus halo.

### Chips & Filter Pills

- **Filter / category chips:** Pill shape; inactive = white + border; active = black fill + white text (`chip` / `chipActive` variants).
- **Filter pills (dismissible):** `rounded-full`, `border-outline-variant`, `bg-surface-container-lowest`, close icon 16px — below search bar when filters active.
- **Locale chip:** Compact `中/EN/IT` pill opening language picker.

### Cards / Listing Grid

- **Feed card:** 4:5 image aspect, `rounded-2xl` photo container, top gradient scrim for legibility, FREE badge overlay, heart favorite top-right.
- **FREE badge:** Uppercase pill on photo — current implementation uses emerald semitransparent fill; treat as photo-overlay exception, not a theme accent.
- **Metadata row:** Label-sm, muted color — distance · relative time when geolocation granted.
- **Border:** No card border or shadow; whitespace separates grid cells.

### Inputs / Search

- **Search field:** Full-width pill, `bg-surface-container-lowest`, search icon absolute left, `min-h-11`, focus `ring-1 ring-primary`.
- **Standard inputs:** 1px `outline-variant` border, 4px radius, focus border shift to `on-surface` or subtle ring.

### Navigation

- **Bottom nav:** Fixed floating capsule — 4 icon slots (Home, Post, Favorites, Settings); active icon filled Material Symbol in `error` red; inactive outline weight 300. Frosted white capsule — **not** Snag red floating bar.
- **Feed header:** Sticky frosted bar — locale + search + filter + location (`pin_drop` in error red when map center set).

### Drawers / Sheets

- **Filter sheet:** Vaul drawer, 60dvh max (~40% feed peek / one card row), `rounded-t-lg`, `border-outline-variant`, handle-only on map context.
- **Admin dialogs:** Radix dialog restyled — flat surface, thin border, no default shadcn shadow stack.

### Icons

Material Symbols Outlined exclusively on consumer surfaces. Default `'FILL' 0, 'wght' 300–400, 'GRAD' 0, 'opsz' 24`; active nav `'FILL' 1`.

## Do's and Don'ts

### Do:

- **Do** use `@theme` tokens from `app/globals.css` — never default shadcn theme colors.
- **Do** apply `.notion-border` or `border-outline-variant` (`#e5e5e5`) for all structural edges.
- **Do** use Inter scale from tokens: h1/h2/h3, body-md/body-lg, label-md/label-sm.
- **Do** align to the 4px grid (`space-xs` through `space-xl`).
- **Do** use black primary buttons for main actions; secondary for alternates.
- **Do** use Material Symbols Outlined for consumer UI icons.
- **Do** left-align text-heavy admin and settings content.
- **Do** extend from Stitch screen prototypes in `.planning/google-stitch-ui-design/*_notion_style/code.html` when building new surfaces.

### Don't:

- **Don't** use default shadcn rounded-xl/2xl cards, saturated accent palettes, or glassmorphism as a default container treatment.
- **Don't** clone Snag's red theme or floating capsule nav verbatim — interaction yes, visual clone no.
- **Don't** add drop shadows to cards, list rows, or primary buttons.
- **Don't** introduce Lucide or emoji icons on consumer-facing surfaces that already use Material Symbols.
- **Don't** hardcode hex values that drift from `@theme` tokens without DESIGN.md justification.
- **Don't** invent a new visual language when a Stitch screen prototype exists — extend DESIGN.md instead.
