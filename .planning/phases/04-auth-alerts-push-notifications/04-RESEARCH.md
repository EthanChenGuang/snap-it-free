# Phase 4: Auth, Alerts & Push Notifications - Research

**Researched:** 2026-08-01
**Domain:** Supabase Auth (OAuth + PKCE), Web Push (VAPID + Serwist SW), DB outbox alert matching, iOS PWA install funnel
**Confidence:** HIGH

## Summary

Phase 4 extends the existing login-optional PWA with three tightly coupled capabilities: **multi-provider auth** (Google, Apple, magic link), **Supabase-backed favorites + keyword/zone alerts**, and **best-effort Web Push** with an in-app badge fallback. The codebase already has the hardest auth plumbing — `@supabase/ssr` browser client, PKCE callback at `app/auth/callback/route.ts` with `safeNextPath`, and `AuthPromptModal` for magic-link OTP. OAuth is a straight extension: add `signInWithOAuth` buttons using the same `redirectTo` pattern as magic link.

Push delivery requires **new infrastructure**: `@serwist/next` + `serwist` for service worker registration and push event handling, `web-push` on the server for VAPID-signed sends, four new Postgres tables (`user_favorites`, `alerts`, `push_subscriptions`, `listing_events`, `alert_matches`), and a **Vercel Cron** route (no `vercel.json` exists yet) that polls the outbox every 3 minutes. A Postgres `AFTER INSERT` trigger on `listings` is the correct decoupling point — scraper upserts and UGC inserts both hit the same table, and trigger-on-INSERT naturally satisfies D-100 ("newly inserted only, not updates").

**iOS is the dominant risk** (Pitfall 5): push works only in standalone Home Screen web apps opened from the icon, permission requires a direct user gesture, and Simulator cannot test push. The locked UX funnel (detect iOS + non-standalone → illustrated A2HS guide → then permission) plus `alert_matches` in-app badge is non-negotiable for Venice's iPhone-heavy student segment.

**Primary recommendation:** Ship a **tracer-first vertical slice** — OAuth + one favorite API round-trip + one alert + listing_events trigger + cron writing `alert_matches` + badge — before layering push subscribe/Serwist and iOS onboarding polish.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Auth Providers (AUTH-01)
- **D-89:** Extend Phase 3 magic-link auth with **Google OAuth** and **Apple OAuth** via Supabase Auth — all three providers (Google, Apple, email OTP) exposed in a unified login modal — **Reversibility:** costly — OAuth redirect URLs, Apple developer setup, and Supabase provider config propagate to every auth entry point.
- **D-90:** Keep **PKCE browser flow** for all providers; magic-link `emailRedirectTo` must land on `/auth/callback?next=…` (already hardened with `safeNextPath`) — fix any remaining implicit/hash-token gap noted in Phase 3 UAT — **Reversibility:** reversible.
- **D-91:** Extend `AuthPromptModal` with provider buttons (Google, Apple) above the existing email magic-link form; reuse Stitch monochrome dialog styling — **Reversibility:** reversible.

#### Login Gate Scope (AUTH-02)
- **D-92:** Login required **only** at: favorite toggle, alert create/manage, post (existing Phase 3), contact/DM (existing Phase 3) — map/list/detail/browse remain fully anonymous — **Reversibility:** one-way — core product boundary from Phase 2 D-49 extended, not reversed.
- **D-93:** Each gate uses **`AuthPromptModal` with action-specific `redirectTo`** (e.g. `/favorites`, `/settings?tab=alerts`, `/listing/[id]?openDm=1`) — no global auth wall or middleware redirect — **Reversibility:** reversible.
- **D-94:** Settings profile section shows signed-in email + **Sign out** when authenticated; signed-out state shows "Accedi" CTA opening the same modal — **Reversibility:** reversible.

#### Favorites Migration (DISC-06 evolution)
- **D-95:** New **`user_favorites`** table (`user_id uuid`, `listing_id uuid`, `created_at`, unique `(user_id, listing_id)`) with RLS: users SELECT/INSERT/DELETE own rows only — **Reversibility:** one-way — migration + RLS + API routes.
- **D-96:** On first authenticated session (post-login hook or client effect), **merge `localStorage` key `shoumanwu_favorites`** into Supabase (union, dedupe by listing ID); clear localStorage after successful merge — **Reversibility:** costly — one-time migration path must stay idempotent.
- **D-97:** Favorite toggle: logged-out → auth modal; logged-in → Supabase write via Route Handler (`app/api/favorites/*`) — remove direct localStorage writes except as pre-login cache that merges on login — **Reversibility:** costly — touches map popup, list cards, WebView shell, UGC detail.

#### Alert Schema & Matching (NOTF-01, NOTF-05)
- **D-98:** New **`alerts`** table: `id`, `user_id`, `keyword text` (nullable), `zone venice_zone` (nullable), `enabled boolean default true`, `created_at` — CHECK constraint: at least one of keyword or zone must be non-null — **Reversibility:** one-way.
- **D-99:** Match rule: **case-insensitive substring** match on `listings.title` when keyword set; **exact zone enum** match when zone set; when both set, **AND** logic (must match both) — **Reversibility:** reversible.
- **D-100:** Match only **newly inserted active listings** (`status = 'active'`, `expires_at > now()`) — both scraped and UGC sources — do not retro-match on alert creation — **Reversibility:** reversible.
- **D-101:** Max **5 active alerts per user** — enforced server-side in alert create Route Handler — **Reversibility:** reversible.
- **D-102:** Alert CRUD via authenticated Route Handlers only (`app/api/alerts/*`); no direct client PostgREST writes — **Reversibility:** costly.

#### Push Delivery Pipeline (NOTF-02)
- **D-103:** New **`push_subscriptions`** table: `user_id`, `endpoint`, `p256dh`, `auth` keys, `user_agent`, `created_at` — unique on `(user_id, endpoint)` — **Reversibility:** one-way.
- **D-104:** Add **`web-push` npm package** + **VAPID key pair** (env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) — server sends via Next.js Route Handler — **Reversibility:** costly — env + service worker wiring.
- **D-105:** Add **Serwist** (`@serwist/next`) for service worker registration, push event handler, and notification click → deep link to `/listing/[id]` — **Reversibility:** costly.
- **D-106:** **DB outbox pattern**: new `listing_events` table written on INSERT of active listing (Postgres trigger or scraper/app insert hook) — **Vercel Cron** poller every **3 minutes** matches pending events against enabled alerts and fans out push + in-app notifications — decouple from scraper worker ingest path — **Reversibility:** costly.
- **D-107:** Push payload: **title** = listing title, **body** = zone label + "Nuovo oggetto gratis", **data.url** = `/listing/[id]` — Italian chrome for notification strings — **Reversibility:** reversible.
- **D-108:** On push send failure (410 Gone subscription), delete stale `push_subscriptions` row — **Reversibility:** reversible.

#### iOS PWA Install Onboarding (NOTF-04, Pitfall 5)
- **D-109:** Detect **`iOS && !display-mode: standalone`** via client utility; show dedicated **Add-to-Home-Screen onboarding** (illustrated Share → "Aggiungi a Home" steps) before offering push permission — port tone from Stitch settings alerts section — **Reversibility:** reversible.
- **D-110:** Request **`Notification.requestPermission()` only after**: (a) user is logged in, AND (b) on iOS: standalone install confirmed OR user dismissed install guide with "Continue without push", AND (c) on other platforms: immediate after login — **Reversibility:** reversible.
- **D-111:** Non-iOS browsers: standard push opt-in from Settings "Push Notifications" toggle — **Reversibility:** reversible.

#### In-App Match Badge Fallback (NOTF-03)
- **D-112:** New **`alert_matches`** table: `user_id`, `alert_id`, `listing_id`, `read_at` (nullable), `created_at` — unique `(user_id, listing_id, alert_id)` — **Reversibility:** one-way.
- **D-113:** **Unread match count badge** on Settings tab in `BottomNav` (Material Symbols badge dot + count) — poll on app focus and alongside existing `useListingsPoll` interval — **Reversibility:** reversible.
- **D-114:** Settings **"Nuovi match"** section lists recent unread matches with tap-through to listing; mark read on open — **Reversibility:** reversible.
- **D-115:** In-app matches written by the same outbox poller that sends push — push unavailable users still get badge updates — **Reversibility:** reversible.

#### Settings & Alerts UI
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

### Deferred Ideas (OUT OF SCOPE)
- Email digest for alert matches — post-v1 engagement channel
- Push notifications on new DM messages — optional enhancement beyond NOTF scope
- Instant-alerts subscription tier (MON-01) — v2 monetization
- Full EN/ZH UI toggle — Phase 5 (I18N-01)
- Redis/BullMQ notification queue — defer until subscriber volume requires it
- Realtime alert delivery via Supabase Realtime — poll/cron sufficient for hourly scraper cadence
- Sound alerts toggle from Stitch prototype — cosmetic; defer unless trivial
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Sign in with Google, Apple, or email when login required | Extend `AuthPromptModal` with `signInWithOAuth`; reuse PKCE callback [CITED: supabase.com/docs/guides/auth/social-login/auth-google] |
| AUTH-02 | Login prompt only at favorite, alerts, post, contact | Gate `FavoriteButton` + settings alert UI; existing Phase 3 gates for post/DM/report |
| NOTF-01 | Keyword + zone match alerts | `alerts` table + CRUD Route Handlers + zone chip reuse |
| NOTF-02 | Web Push on new matches | `web-push` + VAPID + Serwist SW push handler + `push_subscriptions` |
| NOTF-03 | In-app badge fallback | `alert_matches` + BottomNav badge + settings matches list |
| NOTF-04 | iOS Add-to-Home-Screen onboarding | `lib/pwa/ios-detect.ts` + standalone check + illustrated funnel [CITED: webkit.org/blog/13878] |
| NOTF-05 | Login required for alert CRUD | `requireAuth()` on `app/api/alerts/*` |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- All user-facing UI MUST follow `.planning/google-stitch-ui-design/DESIGN.md` and matching Stitch screen prototypes before implementation.
- Monochrome document-first aesthetic; thin `#e5e5e5` borders; no card drop shadows; Inter + Material Symbols Outlined; 4px spacing grid.
- Use `@theme` tokens from `app/globals.css` — not default shadcn/Tailwind themes.
- shadcn/Radix primitives OK only when restyled to Stitch tokens.
- Settings/alerts UI must port from `setting_notion_style/code.html`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OAuth / magic-link auth | Browser (Supabase JS client) | Frontend Server (callback Route Handler) | Client initiates OAuth; server exchanges code via cookies [CITED: supabase.com/docs/guides/auth/server-side/advanced-guide] |
| Session / requireAuth | Frontend Server (Route Handlers) | — | Existing `lib/supabase/auth.ts` + `@supabase/ssr` cookie session |
| Favorites read/write | API / Backend (Route Handlers) | Browser (pre-login localStorage cache) | RLS-backed `user_favorites`; merge on login client-side |
| Alert CRUD | API / Backend | Browser (Settings UI) | D-102: no direct PostgREST writes |
| Push subscription save | API / Backend | Browser (PushManager + SW) | Store keys server-side; client subscribes with VAPID public key |
| Push display / click | Browser (Service Worker) | — | SW `push` + `notificationclick` handlers in `app/sw.ts` |
| Push send | API / Backend (Route Handler / cron) | — | `web-push.sendNotification` with private VAPID key — never client |
| Listing → event enqueue | Database (Postgres trigger) | — | Decouple ingest from notification; fires on INSERT only |
| Alert matching + fan-out | API / Backend (Vercel Cron poller) | Database (outbox read/update) | Batch match every 3 min; writes `alert_matches` + sends push |
| In-app badge count | Browser (client poll) | API / Backend (matches endpoint) | Poll on focus + interval alongside `useListingsPoll` |
| iOS A2HS detection | Browser (client utility) | — | `navigator.userAgent` + `matchMedia('(display-mode: standalone)')` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.110.9 (installed) | Auth + DB client | Already in project; GoTrue OAuth + RLS |
| `@supabase/ssr` | 0.12.3 (installed) | PKCE cookie session | Default PKCE flow [CITED: supabase.com/docs/guides/auth/server-side/advanced-guide] |
| `@serwist/next` | 9.5.12 | Next.js SW build + registration | Active `next-pwa` successor [CITED: serwist.pages.dev/docs/next/getting-started] |
| `serwist` | 9.5.12 | SW runtime (precache + custom listeners) | Paired with `@serwist/next` |
| `web-push` | 3.6.7 | VAPID signing + encrypted send | De-facto Node Web Push lib [VERIFIED: npm registry] [CITED: github.com/web-push-libs/web-push] |
| `zod` | 4.4.3 (installed) | Route Handler validation | Matches Phase 3 API pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/web-push` | 3.6.4 | TS types for web-push | Dev dependency |
| Vercel Cron (`vercel.json`) | platform | Schedule outbox poller | `*/3 * * * *` recommended (see Discretion) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Serwist (D-105 locked) | Hand-rolled `public/sw.js` | Less precache/offline boilerplate but more maintenance; locked decision favors Serwist |
| Vercel Cron | Supabase `pg_cron` HTTP call | Project already uses pg_cron for expiry; Vercel Cron keeps matcher in Next.js with shared `web-push` import |
| Supabase Realtime | Cron poller | Deferred per CONTEXT — hourly scraper cadence doesn't need realtime |

**Installation:**

```bash
npm install @serwist/next serwist web-push
npm install -D @types/web-push
```

**Version verification (2026-08-01):**

```bash
npm view @serwist/next version   # 9.5.12
npm view serwist version         # 9.5.12
npm view web-push version        # 3.6.7
npm view @types/web-push version # 3.6.4
```

Project already runs `next dev --webpack` and `next build --webpack` in `package.json` — aligns with Serwist's webpack-based SW injection [CITED: serwist.pages.dev/docs/next/getting-started].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@serwist/next` | npm | Jul 2026 | ~418K/wk | github.com/serwist/serwist | SUS | Flagged — planner adds `checkpoint:human-verify` (locked D-105; official docs + high downloads) |
| `serwist` | npm | Jul 2026 | ~550K/wk | github.com/serwist/serwist | SUS | Flagged — same checkpoint as above |
| `web-push` | npm | Jan 2024 | ~6.9M/wk | github.com/web-push-libs/web-push | OK | Approved |
| `@types/web-push` | npm | Oct 2024 | ~2.6M/wk | DefinitelyTyped | OK | Approved |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `@serwist/next`, `serwist` — seam flagged "too-new" despite official Serwist docs and active GitHub; human checkpoint before install.

**Postinstall scripts:** none on any listed packages (verified via `npm view … scripts.postinstall`).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (PWA client)                            │
│  AuthPromptModal ──► signInWithOAuth / signInWithOtp                    │
│  FavoriteButton ──► auth gate ──► POST /api/favorites                   │
│  Settings ──► alert CRUD UI ──► /api/alerts/*                           │
│  Push toggle ──► PushManager.subscribe(VAPID pub) ──► POST /api/push/*  │
│  iOS detect ──► A2HS onboarding ──► (standalone) ──► requestPermission  │
│  BottomNav ──► poll GET /api/alerts/matches/unread-count                │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │ OAuth/magic redirect          │ SW push/click
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────────────┐
│  GET /auth/callback       │     │  Serwist SW (public/sw.js)            │
│  exchangeCodeForSession   │     │  push → showNotification              │
│  redirect ?next=…         │     │  notificationclick → /listing/[id]    │
└───────────────────────────┘     └───────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API / BACKEND (Next.js Route Handlers)               │
│  /api/favorites/*  /api/alerts/*  /api/push/subscribe                   │
│  /api/cron/match-alerts  ◄── Vercel Cron */3 * * * * (CRON_SECRET)      │
│       │                                                                 │
│       ├── match listing_events → alerts (ILIKE + zone AND)              │
│       ├── INSERT alert_matches (always)                                 │
│       └── web-push.sendNotification (if subscription exists)            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase Postgres)                         │
│  listings ──INSERT trigger──► listing_events (pending)                  │
│  user_favorites · alerts · push_subscriptions · alert_matches           │
│  RLS: user-owned rows only; service role for cron matcher               │
└─────────────────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │ INSERT (new)                       │ upsert INSERT path
┌────────┴────────┐                  ┌────────┴────────┐
│ Scraper worker  │                  │ UGC POST route  │
│ persistListing  │                  │ /api/ugc/...    │
└─────────────────┘                  └─────────────────┘
```

### Recommended Project Structure

```
app/
├── auth/callback/route.ts          # existing PKCE callback — extend error path only
├── sw.ts                           # Serwist SW source + push/notificationclick
├── manifest.ts                     # App Router dynamic manifest (display: standalone)
├── settings/page.tsx               # expand: Profile, Alerts, Matches
├── api/
│   ├── favorites/route.ts          # GET list, POST toggle
│   ├── alerts/route.ts             # GET/POST (max 5)
│   ├── alerts/[id]/route.ts        # PATCH/DELETE
│   ├── alerts/matches/route.ts     # GET recent matches
│   ├── alerts/matches/unread-count/route.ts
│   ├── push/subscribe/route.ts     # POST save subscription
│   └── cron/match-alerts/route.ts  # Vercel Cron poller
lib/
├── favorites/
│   ├── storage.ts                  # keep for pre-login cache + merge source
│   ├── useFavorites.ts             # migrate to Supabase-backed when authed
│   └── merge-on-login.ts           # idempotent localStorage → Supabase union
├── alerts/
│   ├── schemas.ts                  # Zod alert create/update
│   └── matcher.ts                  # pure match fn (unit tested)
├── notifications/
│   └── web-push.ts                 # setVapidDetails + send + 410 cleanup
├── pwa/
│   ├── ios-detect.ts               # isIOS, isStandalone, canUsePush
│   └── usePushSubscribe.ts         # subscribe flow with funnel gates
components/
├── ugc/AuthPromptModal.tsx         # + Google/Apple buttons
├── settings/                       # ProfileSection, AlertsSection, MatchesSection
└── pwa/IosInstallGuide.tsx         # A2HS illustrated steps
supabase/migrations/
└── 016_auth_alerts_push.sql        # all Phase 4 tables + trigger + RLS
vercel.json                         # cron schedule (new file)
```

### Pattern 1: OAuth via Existing PKCE Callback

**What:** Add Google/Apple buttons to `AuthPromptModal` calling `signInWithOAuth` with the same `redirectTo` as magic link.

**When to use:** All browser OAuth (D-89, D-90).

**Example:**

```typescript
// Source: [CITED: supabase.com/docs/guides/auth/social-login/auth-google]
const redirectToUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'apple'
  options: { redirectTo: redirectToUrl },
});
```

Existing callback already matches official template:

```4:19:app/auth/callback/route.ts
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/post';
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
```

**Supabase Dashboard config (not app env):** enable Google + Apple providers; add redirect URLs `http://localhost:3000/auth/callback` and production URL to allow list [CITED: supabase.com/docs/guides/auth/redirect-urls]. Apple requires Services ID, Team ID, `.p8` key in Supabase dashboard [CITED: supabase.com/docs/guides/auth/social-login/auth-apple].

### Pattern 2: Serwist + Custom Push Handlers

**What:** `@serwist/next` handles precache/build; add native `push` and `notificationclick` listeners after `serwist.addEventListeners()`.

**When to use:** D-105; project has no manifest or SW today.

**Example:**

```typescript
// Source: [CITED: serwist.pages.dev/docs/next/getting-started] + [CITED: nextjs.org/docs/app/guides/progressive-web-apps]
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: defaultCache,
});
serwist.addEventListeners();

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
```

**next.config.ts** — wrap with `withSerwistInit({ swSrc: 'app/sw.ts', swDest: 'public/sw.js', disable: process.env.NODE_ENV === 'development' })`.

**layout.tsx** — wrap children in `<SerwistProvider swUrl="/sw.js">` [CITED: serwist.pages.dev/docs/next/config].

### Pattern 3: DB Outbox + Vercel Cron Matcher

**What:** Postgres trigger writes `listing_events` on INSERT of active listings; cron route processes `pending` rows in batches.

**When to use:** D-106; decouples scraper/UGC ingest from notification latency.

**Trigger sketch (INSERT-only satisfies D-100):**

```sql
-- Only NEW listings enqueue events; scraper upsert UPDATE path does not fire INSERT trigger
create or replace function public.enqueue_listing_event()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' and new.expires_at > now() then
    insert into public.listing_events (listing_id, status)
    values (new.id, 'pending');
  end if;
  return new;
end;
$$;

create trigger listings_insert_event
  after insert on public.listings
  for each row execute function public.enqueue_listing_event();
```

**Matcher logic (pure function in `lib/alerts/matcher.ts`):**

```typescript
export function alertMatchesListing(
  alert: { keyword: string | null; zone: VeniceZone | null },
  listing: { title: string; zone: VeniceZone | null },
): boolean {
  const keywordOk =
    !alert.keyword ||
    listing.title.toLowerCase().includes(alert.keyword.toLowerCase());
  const zoneOk = !alert.zone || alert.zone === listing.zone;
  return keywordOk && zoneOk;
}
```

**Cron route:** verify `Authorization: Bearer ${CRON_SECRET}` or `user-agent` includes `vercel-cron` [CITED: vercel.com/docs/cron-jobs]. Process pending events, mark `processed_at`, insert `alert_matches`, attempt push per subscription.

**Recommended schedule:** `*/3 * * * *` (every 3 minutes UTC) — sufficient for 1–2 hr scraper cadence (D-106 context); 2 min marginally faster, 5 min acceptable per discretion.

### Pattern 4: iOS PWA Install Funnel

**What:** Detect non-standalone iOS Safari and block push permission until A2HS completed or explicitly skipped.

**When to use:** NOTF-04, Pitfall 5.

**Example:**

```typescript
// Source: [CITED: webkit.org/blog/13878] [ASSUMED: UA sniffing pattern]
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error legacy iOS
    navigator.standalone === true
  );
}

export function canOfferPush(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
```

Push on iOS requires Home Screen web app with manifest `display: standalone` [CITED: webkit.org/blog/13878]. Permission must follow direct user interaction (button tap) [CITED: webkit.org/blog/13878]. **Simulator does not support web push** — physical iPhone required [CITED: .planning/research/PITFALLS.md Pitfall 5].

### Pattern 5: Favorites Merge on Login

**What:** After auth session detected, POST local IDs to merge endpoint; clear localStorage on success.

**When to use:** D-96, D-97.

**Example:**

```typescript
// Idempotent: server INSERT ... ON CONFLICT DO NOTHING
const localIds = readFavoriteIds();
if (localIds.length === 0) return;
await fetch('/api/favorites/merge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ listingIds: localIds }),
});
writeFavoriteIds([]); // clear only after 2xx
```

### Anti-Patterns to Avoid

- **Synchronous push fan-out in ingest path:** Pitfall from ARCHITECTURE.md — cron/outbox only.
- **Middleware auth wall:** D-93 forbids; use inline `AuthPromptModal` gates.
- **Retro-matching on alert create:** D-100 — only `listing_events` from new inserts.
- **Testing push in iOS Simulator:** false confidence; use real device Home Screen install.
- **Default shadcn card styling in settings:** violates Stitch UI rule.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID signing + payload encryption | Custom crypto | `web-push` | RFC 8291 edge cases, FCM/APNs compatibility |
| Service worker precache manifest injection | Custom build script | `@serwist/next` | Manifest revision, cleanup, Workbox-compatible caching |
| OAuth token exchange | Custom redirect parser | Supabase `exchangeCodeForSession` | PKCE code_verifier cookie handling |
| Push subscription 410 cleanup | Ignore failures | Delete row on 410 | Stale endpoints block future sends |
| Cron expression parser | Custom scheduler | Vercel Cron + `vercel.json` | Platform-managed, `vercel-cron/1.0` UA |

## Common Pitfalls

### Pitfall 1: iOS Push Funnel Failure (Pitfall 5 — CRITICAL)

**What goes wrong:** Users on iPhone never receive push because they never completed Add-to-Home-Screen; feature appears broken.

**Why it happens:** Push works on Android/desktop during dev; iOS Safari tab has no `PushManager`; no install prompt API exists.

**How to avoid:** Ship A2HS onboarding (D-109); gate permission (D-110); always write `alert_matches` (D-115); test on physical iPhone.

**Warning signs:** iOS opt-in << Android; "notifications don't work" support messages.

### Pitfall 2: PKCE code_verifier Missing on Callback

**What goes wrong:** OAuth returns but `exchangeCodeForSession` fails with empty code_verifier.

**Why it happens:** Callback not using cookie-aware server client; or redirect URL not in allow list.

**How to avoid:** Keep `@supabase/ssr` server client in callback (already done); unify all providers to `/auth/callback?next=…` [CITED: supabase.com/docs/guides/auth/social-login/auth-google].

### Pitfall 3: Scraper Upsert Re-firing Events

**What goes wrong:** Users get duplicate notifications on scraper content-hash updates.

**Why it happens:** Trigger on INSERT+UPDATE instead of INSERT only.

**How to avoid:** `AFTER INSERT` trigger only; scraper `persistListing` upsert UPDATE path won't enqueue (verified in `scraper/src/shared/persist.ts`).

### Pitfall 4: Async Fan-out Blocking Cron

**What goes wrong:** Cron timeout when many subscribers match one listing.

**Why it happens:** Sequential `sendNotification` without batching/timeout.

**How to avoid:** Cap batch size per cron run; mark event processed after DB writes; push sends best-effort with `Promise.allSettled`; defer retry via leaving failed subs for next listing (410 deletes).

### Pitfall 5: Favorites Merge Data Loss

**What goes wrong:** localStorage cleared before server merge succeeds.

**Why it happens:** Optimistic clear on login.

**How to avoid:** Clear only after merge API 2xx; merge is idempotent server-side.

## Code Examples

### web-push Server Send

```typescript
// Source: [CITED: github.com/web-push-libs/web-push]
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

await webpush.sendNotification(
  { endpoint, keys: { p256dh, auth } },
  JSON.stringify({ title, body, url: `/listing/${listingId}` }),
);
```

Generate keys once: `npx web-push generate-vapid-keys --json`

### Client Push Subscribe

```typescript
// Source: [CITED: nextjs.org/docs/app/guides/progressive-web-apps]
const registration = await navigator.serviceWorker.ready;
const sub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
});
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(sub),
});
```

### Vercel Cron Config

```json
{
  "crons": [{
    "path": "/api/cron/match-alerts",
    "schedule": "*/3 * * * *"
  }]
}
```

Source: [CITED: vercel.com/docs/cron-jobs]

## Migration SQL Sketch (`016_auth_alerts_push.sql`)

```sql
-- user_favorites (D-95)
create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.user_favorites enable row level security;
create policy "favorites_select_own" on public.user_favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites_insert_own" on public.user_favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.user_favorites for delete to authenticated using (user_id = auth.uid());

-- alerts (D-98)
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text,
  zone venice_zone,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (keyword is not null or zone is not null)
);
create index alerts_user_enabled_idx on public.alerts (user_id) where enabled = true;
-- RLS: select/insert/update/delete own rows (authenticated only)

-- push_subscriptions (D-103)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- listing_events outbox (D-106)
create table public.listing_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index listing_events_pending_idx on public.listing_events (created_at) where status = 'pending';

-- alert_matches (D-112)
create table public.alert_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, alert_id, listing_id)
);

-- INSERT trigger (D-100) — see Pattern 3 above
```

**Cron/service role access:** Route Handler should use Supabase service role client (new env `SUPABASE_SERVICE_ROLE_KEY`) for cross-user alert matching and `alert_matches` inserts — never expose service key to client.

## Environment Variables

| Variable | Required By | Notes |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | existing | Already used |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | existing | Already used |
| `SUPABASE_SERVICE_ROLE_KEY` | cron matcher | Server-only; bypasses RLS for fan-out |
| `VAPID_PUBLIC_KEY` | server send + client subscribe | Same key; expose public copy as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` | server send | Never expose to client |
| `VAPID_SUBJECT` | server send | `mailto:ops@example.com` or `https://yourdomain.com` [CITED: github.com/web-push-libs/web-push] |
| `CRON_SECRET` | `/api/cron/match-alerts` | Bearer token; Vercel injects on cron invocations |
| Google OAuth credentials | Supabase Dashboard | Client ID/secret in Auth → Providers |
| Apple Sign In credentials | Supabase Dashboard | Services ID, Team ID, Key ID, `.p8` secret |

Generate VAPID: `npx web-push generate-vapid-keys --json`

## Recommended Plan Decomposition (Tracer-First)

Ship end-to-end value in thin vertical slices; each slice is demoable before the next.

| Wave | Tracer Goal | Delivers | Requirements |
|------|-------------|----------|--------------|
| **0** | Schema + env | Migration 016 applied; VAPID keys; `vercel.json` cron stub | foundation |
| **1** | Auth providers | Google/Apple buttons in `AuthPromptModal`; dashboard OAuth config | AUTH-01 |
| **2** | Favorites cloud | `user_favorites` API; merge on login; `FavoriteButton` auth gate | AUTH-02, DISC-06 |
| **3** | Alerts CRUD | Settings expansion (Profile + Alerts); max 5 enforcement | NOTF-01, NOTF-05 |
| **4** | Match pipeline (no push) | listing_events trigger + cron → `alert_matches` + BottomNav badge | NOTF-03 |
| **5** | Push delivery | Serwist SW + subscribe API + web-push in cron | NOTF-02 |
| **6** | iOS funnel | `IosInstallGuide` + permission gates + device QA | NOTF-04 |

**Tracer E2E test path (Wave 4):** Insert test listing via SQL or UGC post → wait ≤3 min → badge count increments → tap match → listing detail → mark read.

**Human checkpoint gates:** Wave 1 (Apple Developer setup), Wave 5 (@serwist/next install), Wave 6 (physical iPhone push test).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` | `@serwist/next` 9.x | 2024–2026 | Required for Next.js 16 maintenance |
| Implicit OAuth flow | PKCE via `@supabase/ssr` | Supabase SSR default | Existing callback already correct |
| Inline notification on scrape | DB outbox + cron | Phase 4 D-106 | Scraper crash domain isolated |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@serwist/next` 9.5.12 works with project's `--webpack` build | Standard Stack | SW not generated; need Turbopack workaround |
| A2 | Vercel Cron available on project's plan | Environment | Must fall back to Supabase pg_cron HTTP or external cron |
| A3 | Service role key acceptable for matcher Route Handler | Migration | RLS bypass scope must stay server-only |
| A4 | INSERT-only trigger sufficient for D-100 with scraper upsert | Pattern 3 | Duplicate events if upsert implementation changes to INSERT-on-conflict |

## Open Questions

1. **Service role vs SECURITY DEFINER matcher function**
   - What we know: Cron needs cross-user reads/writes.
   - What's unclear: Whether to use service role in Route Handler vs Postgres function.
   - Recommendation: Route Handler + service role (matches Phase 3 server patterns); keep matcher SQL simple.

2. **Alert create: modal vs `/settings/alerts/new` route**
   - Discretion item D-117.
   - Recommendation: Modal/sheet from Settings for v1 (less routing); map CTA opens same sheet.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test | ✓ | v23.10.0 | — |
| npm | package install | ✓ | 11.4.2 | — |
| openssl | VAPID generation (via web-push) | ✓ | — | `npx web-push generate-vapid-keys` |
| Supabase project | auth + DB | ✓ (env-gated) | hosted | Dev without DB skips integration |
| Vercel Cron | outbox poller | ? | platform | Manual curl to cron route in dev |
| Apple Developer account | Apple OAuth | ? | — | Ship Google + email first; Apple checkpoint |
| Physical iPhone | iOS push QA | ? | — | Required before NOTF-04 sign-off |

**Missing dependencies with no fallback:**
- Physical iPhone for iOS push verification (Simulator cannot test push)

**Missing dependencies with fallback:**
- Apple Developer account → defer Apple button until credentials ready (Google + email still satisfy AUTH-01 partially)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:lib` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | safeNextPath blocks open redirect | unit | `npm run test:lib -- lib/auth/safe-next-path.test.ts -x` | ❌ Wave 0 |
| NOTF-01 | alert matcher keyword+zone AND | unit | `npm run test:lib -- lib/alerts/matcher.test.ts -x` | ❌ Wave 0 |
| NOTF-01 | max 5 alerts enforced | unit | `npm run test:lib -- lib/alerts/limit.test.ts -x` | ❌ Wave 0 |
| D-96 | favorites merge idempotent | unit | `npm run test:lib -- lib/favorites/merge.test.ts -x` | ❌ Wave 0 |
| NOTF-03 | unread count logic | unit | `npm run test:lib -- lib/alerts/unread-count.test.ts -x` | ❌ Wave 0 |
| NOTF-04 | isStandalone / isIOS detection | unit | `npm run test:lib -- lib/pwa/ios-detect.test.ts -x` | ❌ Wave 0 |
| AUTH-02 | FavoriteButton opens modal when logged out | manual | tap favorite logged out → modal | manual-only |
| NOTF-02 | push E2E | manual | physical device Home Screen install | manual-only |
| NOTF-04 | A2HS funnel | manual | iOS Safari non-standalone flow | manual-only |

### Sampling Rate

- **Per task commit:** `npm run test:lib`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual iPhone push checklist

### Wave 0 Gaps

- [ ] `lib/alerts/matcher.test.ts` — covers NOTF-01 match rules
- [ ] `lib/favorites/merge.test.ts` — covers D-96 idempotent merge
- [ ] `lib/pwa/ios-detect.test.ts` — covers NOTF-04 detection helpers
- [ ] `lib/auth/safe-next-path.test.ts` — extract from route for testability
- [ ] `@serwist/next` + `web-push` install — packages not yet in `package.json`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth OAuth/PKCE; no custom token handling |
| V3 Session Management | yes | `@supabase/ssr` HTTP-only cookies |
| V4 Access Control | yes | RLS on user tables; service role cron isolated |
| V5 Input Validation | yes | Zod on all Route Handlers (Phase 3 pattern) |
| V6 Cryptography | yes | `web-push` VAPID — never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `next` param | Spoofing | Existing `safeNextPath` — extend tests |
| Unauthorized alert/favorite writes | Elevation | `requireAuth()` + RLS |
| Push subscription hijack | Tampering | Bind subscription to authenticated user_id |
| Cron endpoint abuse | DoS | `CRON_SECRET` + Vercel cron UA check |
| VAPID private key leak | Info disclosure | Server env only; never `NEXT_PUBLIC_*` |
| XSS → steal session | Tampering | Existing React escaping; HTTP-only cookies |

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase` — OAuth PKCE callback pattern
- Context7 `/websites/serwist_pages_dev` — `@serwist/next` setup, SerwistProvider, SW init
- npm registry — `web-push@3.6.7`, `@types/web-push@3.6.4` verified
- Codebase grep — existing auth, favorites, settings, API patterns

### Secondary (MEDIUM confidence)
- [CITED: supabase.com/docs/guides/auth/social-login/auth-google] — Google OAuth PKCE
- [CITED: supabase.com/docs/guides/auth/social-login/auth-apple] — Apple OAuth
- [CITED: serwist.pages.dev/docs/next/getting-started] — Serwist Next.js integration
- [CITED: github.com/web-push-libs/web-push] — VAPID send API
- [CITED: vercel.com/docs/cron-jobs] — Cron schedule format
- [CITED: webkit.org/blog/13878] — iOS Home Screen web push requirements
- [CITED: nextjs.org/docs/app/guides/progressive-web-apps] — PushManager subscribe pattern
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md`

### Tertiary (LOW confidence)
- WebSearch summaries for iOS EU PWA edge cases — flag for manual validation on target iOS version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified on npm; Supabase/Serwist patterns match existing codebase
- Architecture: HIGH — outbox + cron aligns with ARCHITECTURE.md and locked decisions
- Pitfalls: HIGH — Pitfall 5 well-documented; codebase gaps (no SW, no favorite gate) confirmed by scout

**Research date:** 2026-08-01
**Valid until:** 2026-08-31 (30 days — stable stack; verify Serwist Turbopack status if removing `--webpack`)
