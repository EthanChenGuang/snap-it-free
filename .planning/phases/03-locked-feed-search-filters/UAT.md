---
phase: 03-locked-feed-search-filters
status: passed
verified: 2026-11-04
build: preview/recent-changes @ 73ca623 (dpl_2ZA6x7HWrP4SDSYoK8dSefciCyW3)
---

# Phase 3 UAT — locked feed keeps search and filters

Automated: `drive.mjs onboarding` on the Vercel Preview, **69/69** (2026-11-04).

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Non-subscriber can open filters without the paywall popping up | pass | drive `locked feed: filter sheet opens`, `opening filters does not open the paywall` |
| 2 | Count tracks the real filtered rows | pass | 10b: "73 free listings match your search and filters" with Milan + Books applied |
| 3 | Listing detail stays locked | pass | drive `listing detail … is locked for a non-subscriber`; screenshot 12 |
| 4 | Favorites stay locked | pass | drive `favorites stay locked for a non-subscriber` |
