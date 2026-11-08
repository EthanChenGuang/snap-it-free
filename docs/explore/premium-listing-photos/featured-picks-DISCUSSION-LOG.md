# Discussion Log — 今日精选 (Featured Picks)

**Date:** 2026-11-08
**Mode:** owner chose "全部按建议" (accept all recommendations) for every gray area.

| # | Gray area | Options presented | Owner's choice |
|---|---|---|---|
| 1 | Where does cutout processing run? | GitHub Actions daily job (free, ~600 min/month, total ~1,500/2,000) · hosted open model (~$3/month) | GitHub Actions (recommended) |
| 2 | Featured picks per region? | Per consumer city, hidden when none · Veneto cities only | Per city (recommended) |
| 3 | How does the owner review? | Mobile admin page + push when ready, swipe 通过/不要, keep yesterday's still-active picks if unreviewed | As recommended |
| 4 | Vision-AI quality gate? | Not in v1 (owner review is the safety net) · add now (~$5/month) | Not in v1 (recommended) |

## Context the owner gave earlier in the session
- Featured picks is a direction far from the original design: develop on its own branch
  (`claude/featured-picks`); photo fixes go separately (PR #11). Owner will decide later whether to ship.
- Owner has only a phone right now → review page must work fully on a phone; Stitch API key cannot
  be entered yet (credential form requires a computer).
- Supabase plan: Free.
