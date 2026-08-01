---
phase: 04-auth-alerts-push-notifications
plan: 05
subsystem: auth-alerts-push
status: complete
tags: [match-pipeline, outbox, cron, badge, NOTF-03, D-106, D-113, D-114]

requires:
  - 04-04
provides:
  - listing-events-trigger
  - cron-match-poller
  - alert-matches-writes
  - unread-badge-ui
  - settings-matches-list
affects:
  - 04-06-push

tech-stack:
  added: []
  patterns:
    - outbox-listing-events-trigger
    - service-role-cron-poller
    - unread-count-poll-on-focus

key-files:
  created:
    - lib/alerts/process-events.ts
    - lib/alerts/useUnreadMatchCount.ts
    - app/api/alerts/matches/route.ts
    - app/api/alerts/matches/unread-count/route.ts
    - app/api/alerts/matches/[listingId]/read/route.ts
    - components/settings/MatchesSection.tsx
  modified:
    - supabase/migrations/016_auth_alerts_push.sql
    - app/api/cron/match-alerts/route.ts
    - components/shell/BottomNav.tsx
    - components/settings/SettingsPageClient.tsx
    - messages/it.ts

key-decisions:
  - "Auto-selected option-a: locked outbox + Vercel Cron poller (D-106)"
  - "enqueue_listing_event uses SECURITY DEFINER so UGC INSERT can write listing_events under RLS"
  - "Matches API joins listings table (FK) not listings_public view for PostgREST embed"
  - "Map Crea avviso CTA skipped (D-117 optional)"

requirements-completed:
  - NOTF-03

metrics:
  duration: "18 min"
  completed: "2026-08-01"
---

# Phase 4 Plan 05: Match Pipeline + In-App Badge Summary

**One-liner:** INSERT-only listing_events outbox with cron batch matcher, alert_matches writes, Settings tab badge, and Nuovi match list with mark-read on open.

## Accomplishments

- ⚡ Auto-selected **option-a**: locked outbox + Vercel Cron poller (D-106)
- `enqueue_listing_event()` AFTER INSERT trigger on active non-expired listings (D-100); SECURITY DEFINER for RLS-safe outbox writes
- `processPendingListingEvents()` — batch 50, Promise.allSettled, `alertMatchesListing` filter, upsert alert_matches, mark processed/failed
- Cron route `/api/cron/match-alerts` replaces stub — CRON_SECRET + vercel-cron auth, returns `{ processed: n }`
- `GET /api/alerts/matches/unread-count` + `useUnreadMatchCount` (60s poll + window focus)
- BottomNav Settings tab badge dot with 9+ cap (D-113)
- `GET /api/alerts/matches` + `POST .../[listingId]/read` + `MatchesSection` in Settings (D-114)

## Test Results

```
npm run test:lib -- lib/alerts/matcher.test.ts
Test Files  21 passed (21)
Tests       83 passed (83)
```

`npx next build` — **FAILED** (pre-existing maplibre-gl Turbopack dynamic import error, unrelated to this plan). TypeScript `tsc --noEmit` passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] SECURITY DEFINER on enqueue_listing_event**
- **Found during:** Task 2 (tracer)
- **Issue:** listing_events has RLS enabled with no insert policies; UGC INSERT trigger would fail for authenticated users
- **Fix:** Added `security definer set search_path = public` to trigger function
- **Files modified:** `supabase/migrations/016_auth_alerts_push.sql`
- **Commit:** ad7d33b

**2. [Rule 3 - Blocking] PostgREST embed uses listings FK not listings_public view**
- **Found during:** Task 3
- **Issue:** alert_matches has FK to listings, not listings_public view — embed would fail at runtime
- **Fix:** Join `listings(title, zone)` with unwrap helper for Supabase embed shape
- **Files modified:** `app/api/alerts/matches/route.ts`
- **Commit:** af8e1fa

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Locked outbox + cron (option-a) | Matches D-106; decouples scraper/UGC ingest; batch match before push layer |
| SECURITY DEFINER trigger | UGC path inserts as authenticated user; outbox table has RLS with no user policies |
| 60s badge poll interval | Plan suggests alignment with listings poll; 60s balances freshness vs. load |
| Skip map CTA (D-117) | Optional; not trivial without map context wiring |

## Self-Check: PASSED

- FOUND: supabase/migrations/016_auth_alerts_push.sql
- FOUND: lib/alerts/process-events.ts
- FOUND: app/api/cron/match-alerts/route.ts
- FOUND: app/api/alerts/matches/unread-count/route.ts
- FOUND: lib/alerts/useUnreadMatchCount.ts
- FOUND: components/shell/BottomNav.tsx
- FOUND: app/api/alerts/matches/route.ts
- FOUND: app/api/alerts/matches/[listingId]/read/route.ts
- FOUND: components/settings/MatchesSection.tsx
- FOUND: commit ad7d33b
- FOUND: commit af8e1fa
