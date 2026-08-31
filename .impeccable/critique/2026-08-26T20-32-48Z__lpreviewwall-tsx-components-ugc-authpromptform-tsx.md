---
target: components/detail/DetailPreviewWall.tsx components/ugc/AuthPromptForm.tsx
total_score: 20
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
timestamp: 2026-08-26T20-32-48Z
slug: lpreviewwall-tsx-components-ugc-authpromptform-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | OAuth loading only disables buttons; no "Redirecting…" or `aria-busy` |
| 2 | Match System / Real World | 3 | Passwordless copy is clear, but "full details" is vague vs preview already shown |
| 3 | User Control and Freedom | 2 | Sent state removes OAuth/email; disabled Apple has no inline escape |
| 4 | Consistency and Standards | 3 | Modal vs inline mostly aligned; double-bordered card nesting |
| 5 | Error Prevention | 2 | Disabled Apple renders as peer option; mobile users tap dead control |
| 6 | Recognition Rather Than Recall | 3 | OAuth labels visible; favorite gate not signposted before tap |
| 7 | Flexibility and Efficiency | 1 | No provider memory, no guest shortcut beyond scroll-to-auth |
| 8 | Aesthetic and Minimalist Design | 2 | Triple value-prop stack + saturated Google icon + nested borders |
| 9 | Error Recovery | 2 | Generic `text-error` lines; no retry path after magic-link sent |
| 10 | Help and Documentation | n/a | Operate login flow; contextual help not expected on this surface |
| **Total** | | **20/36** | **Acceptable** |

Cognitive load: **6 checklist failures** (redundant messaging, unclear primary action, vague lock scope, dead Apple affordance, implicit favorite gate, sent-state trap). Auth path count is 3 (within working-memory limit).

## Design Specificity Verdict

**LLM assessment:** Partially authored for Venice Free Finds. `DetailPreviewWall` is product-native (hero chips, zone/distance metadata, favorite→auth bridge). `AuthPromptForm` inline mode is a portable passwordless stack with only typography/spacing tweaks — `modalDescription` copy still reads modal-generic. Google full-color icon breaks Stitch monochrome on the focal auth block.

**Deterministic scan:** CLI `detect.mjs` returned **0 findings** on both TSX files. Browser inject found **1** runtime issue: `nested-cards` — outer auth `<section>` (`DetailPreviewWall` ~L108) wrapping inner bordered email `<form>` (`AuthPromptForm` ~L176). Likely intentional grouping, but visually reads as card-in-card.

**Visual overlays:** Browser injection succeeded on guest listing detail; overlay flagged the nested email form inside the auth section.

## Overall Impression

The 2-screen guest flow works and respects Stitch tokens at a baseline level, but the auth block still feels like a reused modal dropped below the fold — not a purpose-built preview gate. The single biggest opportunity is clarifying what is locked and tightening the auth card into one calm, Apple-grade surface (fewer borders, clearer primary path, no dead Apple row).

## What's Working

1. **Favorite bridge** — `handleFavoriteUnauthed` scrolls to `#guest-auth-form` instead of opening a second modal; keeps the merged 2-screen flow intact.
2. **Touch targets** — OAuth and submit buttons honor `min-h-11`; inline layout compresses gaps without crushing legibility.
3. **Preview framing** — Metadata chips, thin borders, no drop shadows; section uses proper `aria-labelledby` wiring.

## Priority Issues

### [P0] Disabled Apple shown as equal OAuth peer
- **What:** `appleSignIn` button always visible; disabled when `APPLE_OAUTH_ENABLED` is false; explanation only in `title` tooltip.
- **Why it matters:** Mobile guests tap a dead control; reads as broken product.
- **Fix:** Hide Apple when disabled, or show persistent inline helper text.
- **Suggested command:** `/impeccable polish components/ugc/AuthPromptForm.tsx`

### [P1] OAuth loading is invisible
- **What:** `oauthStatus === 'loading'` disables buttons without label/spinner change.
- **Why it matters:** Tap Google → frozen UI before redirect; abandonment spike.
- **Fix:** "Redirecting…" label, spinner, `aria-busy` on active button.
- **Suggested command:** `/impeccable polish components/ugc/AuthPromptForm.tsx`

### [P1] Magic-link sent state is a dead end
- **What:** `status === 'sent'` replaces entire form with `checkEmail` only.
- **Why it matters:** Wrong email or OAuth preference requires refresh.
- **Fix:** Add "Try again" / keep OAuth visible below success message.
- **Suggested command:** `/impeccable harden components/ugc/AuthPromptForm.tsx`

### [P2] Lock value not concrete
- **What:** Preview shows title, photo, zone, distance; `detailTitle` promises "full details" without naming hidden fields.
- **Why it matters:** Register-first growth needs explicit unlock list (contact, description, alerts).
- **Fix:** Bullet or secondary line for locked content; consider using unused `previewCta`.
- **Suggested command:** `/impeccable clarify components/detail/DetailPreviewWall.tsx`

### [P2] Nested card visual noise
- **What:** Section border + inner email form border (`nested-cards` in browser detect).
- **Why it matters:** Extra frame weight on already dense mobile stack; fights "elegant" goal from Live iterations.
- **Fix:** Flatten to single inset panel or remove inner form border in inline layout.
- **Suggested command:** `/impeccable layout components/detail/DetailPreviewWall.tsx components/ugc/AuthPromptForm.tsx`

## Persona Red Flags

**Jordan (first-timer):** Can't tell what's hidden after preview; disabled Apple with no inline explanation; `checkEmail` omits spam-folder / return-to-listing guidance.

**Casey (mobile one-handed):** Long thumb travel from hero heart to below-fold auth; disabled Apple wastes vertical space; OAuth handoff exits PWA context.

**Sam (a11y):** Disabled Apple lacks accessible disabled reason; status/error/success changes lack `aria-live`; email errors not linked via `aria-describedby`; favorite scroll jumps focus to Google without announcement.

## Minor Observations

- `messages.detail.previewCta` exists but unused.
- Saturated Google SVG paths conflict with monochrome DESIGN.md rule.
- Favorite focus targets first OAuth button, not heading or email field.
- Redundant copy stack: `previewSubtitle` + `detailTitle` + `modalDescription`.

## Questions to Consider

- What single locked artifact (seller contact? full description?) would convert a guest in under 10 seconds — and should it be teased/blurred rather than omitted?
- Is below-the-fold inline auth better for conversion than favorite-triggered modal, given scroll cost on 390×844?
- When Apple OAuth is off, does showing a disabled row signal polish or beta?
