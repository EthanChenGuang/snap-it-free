# Phase 4: Auth, Alerts & Push Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 4-Auth, Alerts & Push Notifications
**Mode:** --auto (all areas auto-selected, no user prompts)
**Areas discussed:** OAuth providers, Login gate scope, Favorites migration, Alert schema & matching, Push delivery pipeline, iOS PWA onboarding, In-app match badge fallback, Settings & alerts UI

---

## OAuth Providers (AUTH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Google + Apple + email magic link (all three) | Full AUTH-01 compliance via Supabase Auth providers | ✓ |
| Email magic link only (extend Phase 3) | Minimal change; defers OAuth | |
| Google only, defer Apple | Faster setup; incomplete AUTH-01 | |

**Auto-selected:** Google + Apple + email magic link (recommended — satisfies AUTH-01, builds on Phase 3 magic link)
**Notes:** Phase 3 shipped email-only (D-54). Phase 4 completes the provider matrix.

---

## Login Gate Scope (AUTH-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Gate favorite + alerts only (post/contact already gated) | Extends Phase 3 gates; browse stays anonymous | ✓ |
| Gate all Settings access | Too aggressive; breaks login-optional browse | |
| Middleware auth wall on protected routes | Conflicts with Phase 2 D-49 login-optional model | |

**Auto-selected:** Gate favorite + alerts only (recommended — matches ROADMAP success criteria)
**Notes:** Post and contact already require login from Phase 3.

---

## Favorites Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase `user_favorites` + merge localStorage on login | Preserves Phase 2 anonymous favorites; migrates on auth | ✓ |
| Require login for all favorites immediately | Breaks existing anonymous favorite UX abruptly | |
| Keep localStorage forever | Violates AUTH-02 login gate on favorite | |

**Auto-selected:** Supabase table + merge on login (recommended — honors D-46 migration promise)
**Notes:** Key `shoumanwu_favorites` stable since Phase 2.

---

## Alert Schema & Matching (NOTF-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Keyword + zone with AND logic; substring title match; max 5 alerts | Simple, abuse-bounded, matches requirements | ✓ |
| Regex keyword matching | Over-engineered for v1 | |
| Unlimited alerts | Abuse risk on solo-builder infra | |

**Auto-selected:** Keyword + zone AND logic, case-insensitive substring, max 5 (recommended)
**Notes:** Match on new listings only, not retroactive.

---

## Push Delivery Pipeline (NOTF-02)

| Option | Description | Selected |
|--------|-------------|----------|
| web-push + VAPID + Serwist SW + DB outbox + Vercel cron poller | Research-recommended; decouples from scraper | ✓ |
| Synchronous push on listing insert | Blocks ingestion; anti-pattern per ARCHITECTURE.md | |
| Firebase Cloud Messaging | Unnecessary without native app | |

**Auto-selected:** web-push + VAPID + Serwist + outbox + cron (recommended)
**Notes:** 3-min poller sufficient for 1–2 hr scraper cadence.

---

## iOS PWA Install Onboarding (NOTF-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Add-to-Home-Screen flow before push permission on iOS | Pitfall 5 mitigation; NOTF-04 requirement | ✓ |
| Request push immediately on any browser | Fails silently on iOS Safari tab | |
| Skip iOS push entirely | Violates NOTF-02/04; loses key user segment | |

**Auto-selected:** Explicit A2HS onboarding before push on iOS (recommended — Pitfall 5)
**Notes:** Test on real iPhone, not Simulator.

---

## In-App Match Badge Fallback (NOTF-03)

| Option | Description | Selected |
|--------|-------------|----------|
| `alert_matches` table + Settings tab badge + recent matches list | Graceful degradation when push unavailable | ✓ |
| Poll-only without persistence | Loses match history on refresh | |
| Email-only fallback | Out of v1 scope | |

**Auto-selected:** alert_matches + badge + list (recommended — satisfies NOTF-03)
**Notes:** Same poller writes push and in-app matches.

---

## Settings & Alerts UI

| Option | Description | Selected |
|--------|-------------|----------|
| Expand `/settings` with Profile, Alerts CRUD, Matches — Stitch reference | Consistent with Phase 2–3 UI authority | ✓ |
| Separate `/alerts` route only | Fragments settings UX | |
| Defer settings UI to Phase 5 | Blocks alert management (NOTF-01/05) | |

**Auto-selected:** Expand settings page from Stitch prototype (recommended)
**Notes:** Italian chrome via messages/it.ts until Phase 5 i18n.

---

## Claude's Discretion

- Vercel cron interval (2 vs 3 vs 5 min)
- Serwist vs hand-rolled service worker
- Alert create route vs modal
- Apple Sign In button styling

## Deferred Ideas

- Email digest alerts — post-v1
- DM push notifications — optional enhancement
- Sound alerts toggle from Stitch prototype — defer unless trivial
- Instant-alerts subscription (MON-01) — v2
