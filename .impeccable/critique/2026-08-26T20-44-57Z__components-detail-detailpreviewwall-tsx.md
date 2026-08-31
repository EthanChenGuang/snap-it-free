---
target: guest preview wall DetailPreviewWall
total_score: 17
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 1
timestamp: 2026-08-26T20-44-57Z
slug: components-detail-detailpreviewwall-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | OAuth loading only disables buttons; no redirect feedback |
| 2 | Match System / Real World | 2 | User tapped a free item; page responds with account creation |
| 3 | User Control and Freedom | 2 | No continue-browsing path; sent-state is one-way |
| 4 | Consistency and Standards | 2 | Authenticated detail has full hero + article + sticky CTA; guest is a different product |
| 5 | Error Prevention | 2 | Disabled Apple shown as peer OAuth row; English email placeholder in Chinese UI |
| 6 | Recognition Rather Than Recall | 2 | Lock scope never shown; heart implies saveable item |
| 7 | Flexibility and Efficiency | n/a | Operate auth gate |
| 8 | Aesthetic and Minimalist Design | 1 | ~40% viewport is auth controls; redundant copy; Google color breaks monochrome |
| 9 | Error Recovery | 2 | Generic errors; sent-state has no retry |
| 10 | Help and Documentation | n/a | Operate login flow |
| **Total** | | **17/32** | **Acceptable — significant IA/hierarchy work needed** |

## Design Specificity Verdict

**LLM assessment:** Header (hero, verified badge, chips) feels native to Venice Free Finds; lower half is a generic passwordless auth stack. Recent layout polish improved spacing but inverted hierarchy — the page reads as "login page with a photo header," not "item preview with a gate."

**Deterministic scan:** 0 CLI findings across full/type/layout scopes. Browser at 390×844: H1→H2 hierarchy valid, no duplicate copy strings, 60% preview / 40% auth above fold, detect.js 0 anti-patterns. Detector confirms mechanics; it cannot detect the satisfaction problem.

## Overall Impression

The dissatisfaction is structural, not pixel-level. You shortened the hero, stacked metadata, then dropped a full OAuth+email tower — so the product tease loses to the auth form. The single biggest opportunity: **show what is locked (description, pickup, claim path) and collapse auth behind one primary action**, matching how authenticated detail sells the item first.

## What's Working

1. **Favorite → inline auth bridge** — heart scrolls/focuses `#guest-auth-form` without a second modal; good Operate continuity.
2. **Hyperlocal chips** — zone + distance + source give immediate relevance above the auth block.
3. **Stitch baseline** — thin borders, 44px targets, no card shadows; craft floor is met even when IA fails.

## Priority Issues

### [P0] Auth stack owns the page
- **What:** Full Google + Apple + email + submit inline (~300px+) while preview is title + subtitle only.
- **Why:** User sees login page, not item preview; layout polish cannot fix proportion.
- **Fix:** Sticky bottom CTA (`previewCta`) opening sheet/modal auth, or progressive disclosure after locked-content tease.
- **Suggested command:** `/impeccable layout components/detail/DetailPreviewWall.tsx components/ugc/AuthPromptForm.tsx`

### [P0] No tease of locked content
- **What:** `DetailArticle`, pickup hint, cost/claim sections absent — metadata repeats the feed.
- **Why:** User cannot judge if sign-in is worth it; gate feels arbitrary.
- **Fix:** Blurred/truncated description skeleton + locked pickup row + explicit "登录查看联系/领取方式".
- **Suggested command:** `/impeccable clarify components/detail/DetailPreviewWall.tsx`

### [P1] Cropped 240px hero vs authenticated square hero
- **What:** `min(36vh,240px)` + gradient fade vs `aspect-square` full detail.
- **Why:** Photo is the emotional hook; crop + fade reads as withholding, not previewing.
- **Fix:** Match authenticated hero ratio on mobile; move verified badge below hero or into header.
- **Suggested command:** `/impeccable polish components/detail/DetailPreviewWall.tsx`

### [P2] Redundant copy stack
- **What:** `previewSubtitle` + `detailTitle` both pitch sign-up benefits.
- **Why:** Two value props before action; adds login-page verbosity.
- **Fix:** One line under title OR drop subtitle; let locked tease carry the pitch.
- **Suggested command:** `/impeccable clarify components/detail/DetailPreviewWall.tsx messages/zh.ts`

### [P3] Google color + disabled Apple row
- **What:** Saturated OAuth SVG in monochrome block; Apple always shown disabled.
- **Why:** Draws eye to vendor branding; dead row wastes mobile space.
- **Fix:** Monochrome Google mark; hide Apple when disabled.
- **Suggested command:** `/impeccable polish components/ugc/AuthPromptForm.tsx`

## Persona Red Flags

**Jordan (first-timer):** Login form before description/pickup; "完整详情" is vague; may assume whole app requires account.

**Casey (mobile):** No sticky CTA like authenticated detail; auth starts mid-thumb zone; disabled Apple is wasted tap.

**Venice international student (zh UI, IT listings):** Italian title + Chinese UI + English email placeholder; no pickup tease; Subito item with unclear whether sign-in or external claim is needed.

## Minor Observations

- `messages.detail.previewCta` exists but unused — ready slimmer CTA copy.
- Auth h3 outranks product title on scroll — hierarchy inversion.
- Pink "LA" icons in screenshot are browser/extension artifacts, not app UI.

## Questions to Consider

- Should above-the-fold ever show full auth, or only a sticky "查看领取方式" that reveals auth on tap?
- For Subito listings, is pre-auth gating honest or does it push users back to Subito?
- Would blurred description convert better than perfect typography on a login form?
