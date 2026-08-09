# API Coverage — Auth, Alerts & Push (Phase 4)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

Phase 4 integrates Supabase Auth, user-owned tables, Web Push (VAPID), Serwist PWA, and a Vercel Cron outbox poller.

| capability | decision | reason |
|---|---|---|
| Email magic link (OTP) with PKCE callback | INTEGRATE | |
| Google OAuth signInWithOAuth | INTEGRATE | Requires Supabase + Google Cloud redirect config |
| Apple OAuth signInWithOAuth | INTEGRATE | Env-gated via NEXT_PUBLIC_APPLE_OAUTH_ENABLED |
| Session refresh / SSR cookies | INTEGRATE | |
| Anonymous browse (no auth wall on map/list/detail) | INTEGRATE | D-92 |
| user_favorites SELECT/INSERT/DELETE via /api/favorites | INTEGRATE | requireAuth Route Handlers |
| alerts CRUD via /api/alerts (max 5 enabled) | INTEGRATE | requireAuth Route Handlers |
| push_subscriptions via /api/push/subscribe | INTEGRATE | delete-then-insert (no UPDATE RLS policy) |
| alert_matches list + mark read via /api/alerts/matches | INTEGRATE | |
| listing_events outbox INSERT (SECURITY DEFINER trigger) | INTEGRATE | |
| listing_events batch process via /api/cron/match-alerts | INTEGRATE | CRON_SECRET bearer gate |
| web-push send on cron match (VAPID) | INTEGRATE | VAPID_* env vars |
| Serwist service worker + manifest + icons | INTEGRATE | |
| iOS Add-to-Home-Screen onboarding (IosInstallGuide) | INTEGRATE | NOTF-04 |
| Admin generateLink / service impersonation | OPT-OUT | E2E test harness only; not production user flow |
| Direct client PostgREST writes to user tables | OPT-OUT | D-102 — Route Handlers only |
| Realtime subscriptions for alert matches | OPT-OUT | Poll on focus + 60s interval |
| Retroactive alert matching on alert create | OPT-OUT | D-100 — new inserts only |
| Email digest alerts | OPT-OUT | Deferred post-v1 |
| DM push notifications | OPT-OUT | Out of NOTF scope |
| iOS Safari tab Web Push without standalone install | OPT-OUT | WebKit limitation — badge fallback (NOTF-03) |
