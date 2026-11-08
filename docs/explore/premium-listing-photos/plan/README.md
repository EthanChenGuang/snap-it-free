# Featured Picks — Plan Overview

**Status:** planned, not started · **Branch:** `claude/featured-picks` · **Date:** 2026-11-08

| Wave | Plan | What | Depends on | Owner action |
|---|---|---|---|---|
| 1 | [01](01-PLAN.md) | DB: `featured_candidates`, `featured_picks_public` view, `featured-photos` bucket, query helpers | — | apply migration 042 in the [SQL editor](https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/sql/new) |
| 1 | [02](02-PLAN.md) | Python image CLI (cutout → gate → 400×500 WebP), pinned deps, pytest | — | — |
| 2 | [03](03-PLAN.md) | Daily orchestrator in the TS worker + `featured-picks.yml` Actions workflow + operator message | 01, 02 | trigger first run (GitHub app → Actions → Run workflow) |
| 2 | [04](04-PLAN.md) | `/admin/featured` phone-first review page + operator-gated API | 01, **PR #11 merged** | verify on phone |
| 2 | [05](05-PLAN.md) | A′ `FeaturedStrip` on the home feed, trilingual strings, quota card | 01 | verify on phone |

Research: [RESEARCH.md](RESEARCH.md) · Context: [../featured-picks-CONTEXT.md](../featured-picks-CONTEXT.md)

## Requirement coverage
| Req | Plans |
|---|---|
| FEAT-01 never show watermarks | 01, 02, 03, 04 |
| FEAT-02 non-generative | 02 |
| FEAT-03 semi-automatic review | 03, 04 |
| FEAT-04 home strip | 01, 05 |
| FEAT-05 self-hosted WebP, deleted on expiry/reject | 01, 02, 03 |
| FEAT-06 cost visibility | 03, 05 |
| FEAT-07 hide when empty | 01, 05 |
| FEAT-08 A′ visual | 02, 05 |

## Pre-conditions
- **Merge PR #11 first, then sync this branch with `main`.** Plan 04 renders original photos through
  `normalizeSubitoPhotoUrl`; only PR #11 makes that preset watermark-free.

## Deviations from CONTEXT (for owner sign-off)
- **D-09 notification channel:** use the existing operator alert channels (`notifyOperator` — email /
  Telegram / WeChat / WhatsApp, whichever is configured) instead of web-push. Same intent (owner is told
  when candidates are ready), works on a phone, no new subscription plumbing.

## Ship / no-ship
Everything here stays on `claude/featured-picks`. Nothing is merged to `main` until the owner decides
to ship featured picks. The DB migration is additive (new table/view/bucket only) and can be applied to
production without affecting the current app.
