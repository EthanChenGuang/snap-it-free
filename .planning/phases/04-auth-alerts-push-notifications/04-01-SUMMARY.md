---
phase: 04-auth-alerts-push-notifications
plan: 01
subsystem: auth-alerts-push
status: complete
tags: [migration, cron, vitest, rls, wave-0]

requires:
  - phase-03-ugc-complete
provides:
  - migration-016-schema
  - wave-0-lib-modules
  - cron-stub
  - service-role-client
affects:
  - 04-02-oauth
  - 04-05-matcher-cron

tech-stack:
  added: []
  patterns:
    - pure-lib-modules-with-vitest
    - db-outbox-ddl-only
    - cron-secret-bearer-gate

key-files:
  created:
    - supabase/migrations/016_auth_alerts_push.sql
    - vercel.json
    - lib/supabase/service.ts
    - lib/alerts/matcher.ts
    - lib/alerts/limit.ts
    - lib/alerts/unread-count.ts
    - lib/favorites/merge.ts
    - lib/pwa/ios-detect.ts
    - lib/auth/safe-next-path.ts
    - app/api/cron/match-alerts/route.ts
  modified:
    - .env.example
    - app/auth/callback/route.ts

key-decisions:
  - "Option-a locked: migration 016 full schema with all five tables and RLS (D-95, D-98, D-103, D-112)"
  - "Service role client in lib/supabase/service.ts for cron fan-out — server-only"
  - "Vercel cron */3 * * * * for match-alerts poller"

requirements-completed:
  - AUTH-01
  - NOTF-01
  - NOTF-03
  - NOTF-04

coverage:
  - deliverable: "Migration 016 with five tables and RLS"
    human_judgment: true
    rationale: "SQL file created; operator must apply via Supabase dashboard or db push"
  - deliverable: "Wave 0 pure lib modules with unit tests"
    human_judgment: false
    verification:
      - kind: test
        ref: "npm run test:lib -- lib/alerts/matcher.test.ts lib/alerts/limit.test.ts lib/alerts/unread-count.test.ts lib/favorites/merge.test.ts lib/pwa/ios-detect.test.ts lib/auth/safe-next-path.test.ts"
        status: pass
  - deliverable: "Cron stub with CRON_SECRET gate"
    human_judgment: true
    rationale: "Route implemented; live 401/200 curl requires dev server and CRON_SECRET env"

metrics:
  duration: "2 min"
  completed: "2026-08-01"
---

# Phase 4 Plan 01: Schema & Wave 0 Foundation Summary

**One-liner:** Migration 016 DDL, six pure lib modules with green Vitest, cron stub with CRON_SECRET gate, and service-role Supabase client.

## Accomplishments

- Auto-selected **option-a**: full migration 016 schema (user_favorites, alerts, push_subscriptions, listing_events, alert_matches) with RLS
- TDD Wave 0: matcher (D-99 AND), limit (max 5), unread-count (D-113), merge (D-96), ios-detect (NOTF-04), safeNextPath (D-90)
- Tracer: `016_auth_alerts_push.sql`, `vercel.json` cron `*/3 * * * *`, cron route stub, `createServiceClient()`, `.env.example` VAPID/cron docs
- Extracted `safeNextPath` from auth callback to testable lib module

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Option-a full schema | Matches locked D-95/D-98/D-103/D-112; blocks Plans 05–07 if deferred |
| Service role in Route Handler | Matches Phase 3 server patterns; RLS bypass isolated to cron |
| 3-minute cron schedule | Sufficient for 1–2 hr scraper cadence per RESEARCH |

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

```
npm run test:lib -- lib/alerts/matcher.test.ts lib/alerts/limit.test.ts lib/alerts/unread-count.test.ts lib/favorites/merge.test.ts lib/pwa/ios-detect.test.ts lib/auth/safe-next-path.test.ts
Test Files  20 passed (20)
Tests       76 passed (76)
```

## Human Setup Required

### Supabase migration 016

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. Apply `supabase/migrations/016_auth_alerts_push.sql` via SQL Editor or `supabase db push`

### VAPID keys (Plan 06 wiring)

```bash
npx web-push generate-vapid-keys --json
openssl rand -hex 32  # CRON_SECRET
```

Add to `.env.local`: `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`

### Cron verification (after dev server + env)

```bash
curl -X GET http://localhost:3000/api/cron/match-alerts          # expect 401
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/match-alerts  # expect 200 stub
```

## Commits

| Hash | Message |
|------|---------|
| 06a4b83 | test(04-01): add Wave 0 failing tests |
| 085cd15 | feat(04-01): implement Wave 0 pure lib modules |
| 19a9658 | feat(04-01): add migration 016, cron stub, and service client |

## Self-Check: PASSED

- FOUND: supabase/migrations/016_auth_alerts_push.sql
- FOUND: vercel.json
- FOUND: lib/alerts/matcher.ts
- FOUND: app/api/cron/match-alerts/route.ts
- FOUND: 06a4b83, 085cd15, 19a9658
