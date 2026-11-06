---
phase: 02-youre-in-after-purchase
status: passed
verified: 2026-11-04
build: preview/recent-changes @ 73ca623 (dpl_2ZA6x7HWrP4SDSYoK8dSefciCyW3, includes f8d5589)
---

# Phase 2 UAT — after purchase

Automated: `drive.mjs onboarding` on the Vercel Preview, **69/69** (2026-11-04). Human: Guang's annual test purchase 2026-10-31.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Locked `/?checkout=success` shows "activation can take a minute", not a success message | pass | drive `locked + checkout=success: activation can take a minute`; screenshot 10b |
| 2 | City / interests / radius from onboarding are applied when the feed opens | pass | drive "screen 10 carries the persisted city + interest"; 10b shows Milan + Books chips |
| 3 | Unlocked feed after a real payment | pass (human) | Guang, 2026-10-31: paid, landed on the unlocked feed (slow first load → fixed in ca0464d) |
| 4 | Unlocked `/?checkout=success` shows "You're in" | superseded | Removed in d79b531 at Guang's request (banner felt annoying); `?checkout` is still stripped |

Not covered: webhook-only unlock (pay, close tab). Needs a new test account on the shared DB — Guang's OK.
