---
quick_id: 260804-h7l
status: complete
completed: "2026-08-04"
---

# Quick 260804-h7l: Stitch dark theme fix

Rewrote `.dark` tokens in `globals.css` using DESIGN.md inverse/fixed roles (inverse-surface, inverse-on-surface, primary-fixed, secondary-fixed-dim, etc.) instead of harsh pure-white primary CTAs.

## Changes

- Dark primary: `#e5e2e1` / on-primary `#1c1b1b` — mirrors light black-on-white buttons
- Surface hierarchy anchored on `#2f3130` inverse-surface with proper container steps
- Added missing light tokens: `secondary-fixed`, `secondary-fixed-dim`, `on-primary-container`
- ZonesSection active badge: Stitch `secondary-fixed` chip (removed saturated green)
- PostForm toggle knob: semantic surface/outline tokens (removed `bg-white`)

## Verification

- `npm run lint` — pass
- Manual: Settings → Aspetto → Scuro should show calm monochrome layers, not blown-out white CTAs
