---
target: guest preview wall v2 post-IA
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 1
timestamp: 2026-08-26T20-54-14Z
slug: components-detail-detailpreviewwall-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Locks label hidden content; compact auth hides methods until expand |
| 2 | Match System / Real World | 2 | Free item + repeated sign-in asks; 免费 adjacent to locked pickup |
| 3 | User Control and Freedom | 2 | Lock surfaces not tappable; no browse-without-account path |
| 4 | Consistency and Standards | 3 | Section skeleton matches authenticated detail; no sticky CTA on guest |
| 5 | Error Prevention | 2 | English email placeholder in zh UI |
| 6 | Recognition Rather Than Recall | 1 | Four near-duplicate login strings; three lock icons |
| 7 | Flexibility and Efficiency | n/a | Operate |
| 8 | Aesthetic and Minimalist Design | 2 | Better proportion than v1; triple paywall violates minimalism |
| 9 | Error Recovery | 2 | Sent-state one-way; generic errors |
| 10 | Help and Documentation | n/a | Operate |
| **Total** | | **18/32** | **Acceptable — IA improved, messaging still auth-first** |

## Design Specificity Verdict

**LLM:** Structure now tracks authenticated detail (square hero, bordered sections, cost block). Compact auth fixed the OAuth tower. New failure: **serial paywall fatigue** — subtitle + blurred lock + pickup lock box + bottom CTA = four sign-in messages before action.

**Deterministic:** CLI clean. Browser 390×844 collapsed: **2 lock icons**, **5 visible login strings**, tease sections above fold, auth CTA at y=911 (below fold). Intentional text-occlusion on blur overlay (false positive).

## Overall Impression

Better than the first refactor (no longer a login page with thumbnail), but the screenshot confirms your instinct: **three locks + one black button all say the same thing**. Product structure is right; copy and interaction need **one gate, not three**.

## Priority Issues

### [P0] Triple paywall redundancy
- Fix: Remove previewSubtitle; merge locked description + pickup into one tease OR one divider line; single CTA copy
- Command: `/impeccable clarify`

### [P0] Lock teases are dead ends
- Fix: Tap locked sections → revealAuth(); or remove lock overlays entirely
- Command: `/impeccable layout`

### [P1] No sticky CTA like authenticated detail
- Fix: listing-detail-sticky-bar with previewCta; auth expands on tap
- Command: `/impeccable layout`

### [P2] 免费 + locked pickup dissonance
- Fix: One line "Free · sign in for pickup & contact" without separate lock box
- Command: `/impeccable clarify`

### [P3] sr-only heading duplicates CTA
- Command: `/impeccable polish AuthPromptForm`
