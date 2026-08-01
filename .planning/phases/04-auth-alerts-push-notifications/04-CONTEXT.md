# Phase 4: Auth, Alerts & Push Notifications - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning
**Mode:** Auto-selected (--auto)

<domain>
## Phase Boundary

Phase 4 completes the login-optional product model: users browse anonymously but authenticate only when an action requires it (favorite, enable alerts, post, contact). It delivers full Supabase Auth (Google, Apple, email magic link), migrates favorites from localStorage to Supabase-backed user favorites, keyword + zone saved alerts with Web Push delivery (VAPID), explicit iOS Add-to-Home-Screen onboarding (push requires standalone PWA install), and an in-app "new match" badge fallback when push is unavailable.

Requirements in scope: AUTH-01, AUTH-02, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05.

Out of scope: Full trilingual UI toggle (Phase 5 I18N-01–02), instant-alerts subscription tier (v2 MON-01), email digest alerts, DM push notifications, operator alert dashboard, native mobile app (v2 PLAT-01), paywalling feed access.

</domain>

<decisions>
## Implementation Decisions

### Auth Providers (AUTH-01)
- **D-89:** Extend Phase 3 magic-link auth with **Google OAuth** and **Apple OAuth** via Supabase Auth — all three providers (Google, Apple, email OTP) exposed in a unified login modal — **Reversibility:** costly — OAuth redirect URLs, Apple developer setup, and Supabase provider config propagate to every auth entry point.
- **D-90:** Keep **PKCE browser flow** for all providers; magic-link `emailRedirectTo` must land on `/auth/callback?next=…` (already hardened with `safeNextPath`) — fix any remaining implicit/hash-token gap noted in Phase 3 UAT — **Reversibility:** reversible.
- **D-91:** Extend `AuthPromptModal` with provider buttons (Google, Apple) above the existing email magic-link form; reuse Stitch monochrome dialog styling — **Reversibility:** reversible.

### Login Gate Scope (AUTH-02)
- **D-92:** Login required **only** at: favorite toggle, alert create/manage, post (existing Phase 3), contact/DM (existing Phase 3) — map/list/detail/browse remain fully anonymous — **Reversibility:** one-way — core product boundary from Phase 2 D-49 extended, not reversed.
- **D-93:** Each gate uses **`AuthPromptModal` with action-specific `redirectTo`** (e.g. `/favorites`, `/settings?tab=alerts`, `/listing/[id]?openDm=1`) — no global auth wall or middleware redirect — **Reversibility:** reversible.
- **D-94:** Settings profile section shows signed-in email + **Sign out** when authenticated; signed-out state shows "Accedi" CTA opening the same modal — **Reversibility:** reversible.

### Favorites Migration (DISC-06 evolution)
- **D-95:** New **`user_favorites`** table (`user_id uuid`, `listing_id uuid`, `created_at`, unique `(user_id, listing_id)`) with RLS: users SELECT/INSERT/DELETE own rows only — **Reversibility:** one-way — migration + RLS + API routes.
- **D-96:** On first authenticated session (post-login hook or client effect), **merge `localStorage` key `shoumanwu_favorites`** into Supabase (union, dedupe by listing ID); clear localStorage after successful merge — **Reversibility:** costly — one-time migration path must stay idempotent.
- **D-97:** Favorite toggle: logged-out → auth modal; logged-in → Supabase write via Route Handler (`app/api/favorites/*`) — remove direct localStorage writes except as pre-login cache that merges on login — **Reversibility:** costly — touches map popup, list cards, WebView shell, UGC detail.

### Alert Schema & Matching (NOTF-01, NOTF-05)
- **D-98:** New **`alerts`** table: `id`, `user_id`, `keyword text` (nullable), `zone venice_zone` (nullable), `enabled boolean default true`, `created_at` — CHECK constraint: at least one of keyword or zone must be non-null — **Reversibility:** one-way.
- **D-99:** Match rule: **case-insensitive substring** match on `listings.title` when keyword set; **exact zone enum** match when zone set; when both set, **AND** logic (must match both) — **Reversibility:** reversible.
- **D-100:** Match only **newly inserted active listings** (`status = 'active'`, `expires_at > now()`) — both scraped and UGC sources — do not retro-match on alert creation — **Reversibility:** reversible.
- **D-101:** Max **5 active alerts per user** — enforced server-side in alert create Route Handler — **Reversibility:** reversible.
- **D-102:** Alert CRUD via authenticated Route Handlers only (`app/api/alerts/*`); no direct client PostgREST writes — **Reversibility:** costly.

### Push Delivery Pipeline (NOTF-02)
- **D-103:** New **`push_subscriptions`** table: `user_id`, `endpoint`, `p256dh`, `auth` keys, `user_agent`, `created_at` — unique on `(user_id, endpoint)` — **Reversibility:** one-way.
- **D-104:** Add **`web-push` npm package** + **VAPID key pair** (env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) — server sends via Next.js Route Handler — **Reversibility:** costly — env + service worker wiring.
- **D-105:** Add **Serwist** (`@serwist/next`) for service worker registration, push event handler, and notification click → deep link to `/listing/[id]` — **Reversibility:** costly.
- **D-106:** **DB outbox pattern**: new `listing_events` table written on INSERT of active listing (Postgres trigger or scraper/app insert hook) — **Vercel Cron** poller every **3 minutes** matches pending events against enabled alerts and fans out push + in-app notifications — decouple from scraper worker ingest path — **Reversibility:** costly.
- **D-107:** Push payload: **title** = listing title, **body** = zone label + "Nuovo oggetto gratis", **data.url** = `/listing/[id]` — Italian chrome for notification strings — **Reversibility:** reversible.
- **D-108:** On push send failure (410 Gone subscription), delete stale `push_subscriptions` row — **Reversibility:** reversible.

### iOS PWA Install Onboarding (NOTF-04, Pitfall 5)
- **D-109:** Detect **`iOS && !display-mode: standalone`** via client utility; show dedicated **Add-to-Home-Screen onboarding** (illustrated Share → "Aggiungi a Home" steps) before offering push permission — port tone from Stitch settings alerts section — **Reversibility:** reversible.
- **D-110:** Request **`Notification.requestPermission()` only after**: (a) user is logged in, AND (b) on iOS: standalone install confirmed OR user dismissed install guide with "Continue without push", AND (c) on other platforms: immediate after login — **Reversibility:** reversible.
- **D-111:** Non-iOS browsers: standard push opt-in from Settings "Push Notifications" toggle — **Reversibility:** reversible.

### In-App Match Badge Fallback (NOTF-03)
- **D-112:** New **`alert_matches`** table: `user_id`, `alert_id`, `listing_id`, `read_at` (nullable), `created_at` — unique `(user_id, listing_id, alert_id)` — **Reversibility:** one-way.
- **D-113:** **Unread match count badge** on Settings tab in `BottomNav` (Material Symbols badge dot + count) — poll on app focus and alongside existing `useListingsPoll` interval — **Reversibility:** reversible.
- **D-114:** Settings **"Nuovi match"** section lists recent unread matches with tap-through to listing; mark read on open — **Reversibility:** reversible.
- **D-115:** In-app matches written by the same outbox poller that sends push — push unavailable users still get badge updates — **Reversibility:** reversible.

### Settings & Alerts UI
- **D-116:** Expand `/settings` from stub into full page: **Profile**, **Alerts & Notifications**, **Recent Matches** — port layout from `.planning/google-stitch-ui-design/setting_notion_style/code.html` Alerts section with Stitch tokens — **Reversibility:** reversible.
- **D-117:** Alert creation UI: **keyword text input** + **zone chip selector** (reuse Phase 2 zone chips: All zones = null zone on alert) — accessible from Settings; optional "Crea avviso" CTA on map when logged in — **Reversibility:** reversible.
- **D-118:** Phase 4 chrome remains **Italian** via `messages/it.ts` — same pre-i18n pattern as Phases 2–3 (D-51, D-88) — **Reversibility:** reversible.

### Claude's Discretion
- Exact Vercel cron schedule (2 vs 3 vs 5 min)
- Serwist vs hand-rolled service worker
- Whether alert create lives at `/settings/alerts/new` route vs modal
- Push icon/badge asset paths in manifest
- Email digest as future enhancement note only (not v1)
- Apple Sign In button styling (official vs Stitch-monochrome adaptation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — login-optional model, Snag-inspired alerts, PWA-first platform, budget constraints
- `.planning/REQUIREMENTS.md` — AUTH-01–02, NOTF-01–05 definitions and traceability
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, dependency on Phase 3

### Prior Phase Context
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — listings schema, zone enum, source discriminator (D-01–D-23)
- `.planning/phases/02-map-list-core-browsing/02-CONTEXT.md` — login-optional browse, localStorage favorites key `shoumanwu_favorites`, Italian chrome (D-24–D-53)
- `.planning/phases/03-ugc-posting-community-marketplace/03-CONTEXT.md` — magic-link auth scope, AuthPromptModal, RLS patterns (D-54–D-88)

### Research & Pitfalls
- `.planning/research/ARCHITECTURE.md` — auth/alerts/favorites module layout, DB outbox notification pattern, web-push stack
- `.planning/research/PITFALLS.md` — Pitfall 5 (iOS push funnel), async notification fan-out anti-pattern
- `.planning/research/SUMMARY.md` — Phase 4 sequencing rationale, Serwist + web-push recommendation
- `.planning/research/STACK.md` — Supabase Auth, web-push, Serwist/PWA stack

### Design Reference
- `.planning/google-stitch-ui-design/DESIGN.md` — tokens, typography, monochrome aesthetic
- `.planning/google-stitch-ui-design/setting_notion_style/code.html` — settings alerts/notifications section reference
- `.planning/google-stitch-ui-design/SKILL.md` — strict UI porting rules

### Schema & Code
- `supabase/migrations/007_ugc_messaging_reports.sql` — existing auth.users FK patterns
- `lib/supabase/auth.ts` — `requireAuth()` helper
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — SSR cookie auth
- `components/ugc/AuthPromptModal.tsx` — login modal to extend with OAuth
- `app/auth/callback/route.ts` — PKCE callback + safe redirect
- `lib/favorites/storage.ts` — `FAVORITES_STORAGE_KEY = 'shoumanwu_favorites'` migration source
- `lib/favorites/useFavorites.ts` — hook to migrate to Supabase-backed favorites
- `components/shell/BottomNav.tsx` — Settings tab for badge placement
- `app/settings/page.tsx` — settings stub to expand
- `messages/it.ts` — Italian string module to extend

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ugc/AuthPromptModal.tsx` — magic-link modal; extend with Google/Apple OAuth buttons
- `app/auth/callback/route.ts` — PKCE session exchange with `safeNextPath` redirect
- `lib/supabase/auth.ts` + `lib/supabase/server.ts` — server-side session for Route Handlers
- `lib/favorites/storage.ts` + `useFavorites.ts` — localStorage favorites to migrate (key stable since Phase 2)
- `app/settings/page.tsx` — settings route shell to expand
- `components/shell/BottomNav.tsx` — nav chrome for unread match badge
- Zone chip components from map/list — reuse for alert zone selector
- `messages/it.ts` — extend with auth/alerts/push/onboarding strings

### Established Patterns
- Login gates via inline `AuthPromptModal` (Phase 3) — extend to favorites/alerts, not middleware walls
- Route Handlers with `requireAuth()` + Zod validation (Phase 3 UGC/messages/reports)
- RLS on all user-owned tables; anon read via views only
- Italian chrome centralized; listing content user-authored/scraped
- Stitch Structured Minimalist UI — thin borders, no shadows, Inter + Material Symbols

### Integration Points
- Favorite toggle (map popup, list card, detail shells) → auth gate → `user_favorites` API
- Settings → alert CRUD → `alerts` table
- Push subscribe → Serwist SW → `push_subscriptions` API
- Listing INSERT trigger → `listing_events` → cron poller → match alerts → push + `alert_matches`
- Post-login → merge localStorage favorites → Supabase
- iOS detect → install onboarding → push permission → subscription save

</code_context>

<specifics>
## Specific Ideas

- Model alerts/settings UX on Stitch `setting_notion_style` — push toggle, zone cards, keyword alerts section.
- Stay free like Snag's alert mechanics but **without** paywalling the feed (core product differentiator).
- iOS push is a funnel, not a toggle — Add-to-Home-Screen onboarding is a first-class deliverable (Pitfall 5), not a footnote.
- Test push on a **real iPhone** installed to Home Screen — Simulator gives false confidence.
- Venice international students (incl. Chinese segment) disproportionately use iOS — badge fallback matters.
- Scraper cadence is 1–2 hr; 3-min alert poller is sufficient — no realtime broker needed at v1 scale.

</specifics>

<deferred>
## Deferred Ideas

- Email digest for alert matches — post-v1 engagement channel
- Push notifications on new DM messages — optional enhancement beyond NOTF scope
- Instant-alerts subscription tier (MON-01) — v2 monetization
- Full EN/ZH UI toggle — Phase 5 (I18N-01)
- Redis/BullMQ notification queue — defer until subscriber volume requires it
- Realtime alert delivery via Supabase Realtime — poll/cron sufficient for hourly scraper cadence
- Sound alerts toggle from Stitch prototype — cosmetic; defer unless trivial

</deferred>

---

*Phase: 04-Auth, Alerts & Push Notifications*
*Context gathered: 2026-08-01 (auto mode)*
