# Phase 3: UGC Posting & Community Marketplace - Research

**Researched:** 2026-07-30
**Domain:** Supabase Auth/Storage/RLS + Next.js Route Handlers + UGC posting + in-app DM + community moderation
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 adds the **community supply layer** on top of Phase 1–2's scraped browsing foundation: authenticated users post free items (Quick Post + Street Dump pin confirm), photos are EXIF-stripped server-side, buyers DM posters in-app, posters manage listing lifecycle (reserved/gone), and community reports auto-hide bad listings with **UGC-specific safeguards** (3-report threshold + `pending_review` vs 2 for scraped).

The codebase is **ready structurally** — single `listings` table with `source = 'ugc'` discriminator, MapLibre map, Stitch UI shell, Italian `messages/it.ts`, Supabase anon reads via `listings_public` — but **Phase 3 is greenfield for auth, API routes, messaging, and UGC UI**. Critical gaps discovered in research:

1. **`lib/supabase/server.ts` has no-op `setAll`** — auth sessions cannot persist; must fix before any login flow works [VERIFIED: codebase grep].
2. **No `app/api/` routes exist** — all UGC writes go through new Route Handlers per D-86.
3. **`app/listing/[id]/page.tsx` hard-rejects non-Subito** (`source !== 'subito'` → `notFound()`) — must branch to native UGC detail.
4. **`listings_public` view excludes `claimed` status** — must extend for D-69 reserved UGC badge visibility.
5. **Zone tagging lives in `scraper/src/shared/zone-tag.ts`** — must extract to shared `lib/geo/` for server-side UGC tagging (D-63).

**Primary recommendation:** Ship a **tracer-first vertical slice** — migration → auth magic link → photo upload API → single Quick Post → UGC detail page → verify pin appears on map — before layering DM, reports, and Street Dump. Use **Route Handlers + Zod + RLS** (not service-role client writes). Fix server Supabase cookie handling on day one.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Auth Scope (Phase 3 vs Phase 4)
- **D-54:** Ship **minimal Supabase Auth in Phase 3** scoped to UGC write paths — **email magic link only** as the sole provider; Google/Apple deferred to Phase 4 (AUTH-01). Login required to post (UGC-04), initiate DM (CONT-04), and manage own listings; browsing, favorites, and scraped detail remain login-optional until Phase 4 — **Reversibility:** one-way — RLS policies, `owner_user_id` FK, and session gates touch every UGC route.
- **D-55:** `/post` and DM entry show **inline login prompt** (not a global auth wall) — reuse Stitch monochrome modal pattern; after auth redirect back to intended action — **Reversibility:** reversible.

#### UGC Post Flow & Street Dump
- **D-56:** Replace `/post` stub with full quick-post UI ported from `.planning/google-stitch-ui-design/post_free_item_notion_style/code.html` — **Reversibility:** reversible.
- **D-57:** **Two tabs on `/post`**: "Pubblica" (default quick post) and "Street Dump" — Street Dump pre-seeds pin from browser geolocation but **never auto-publishes**; user must confirm/drag-adjust on map before submit (Pitfall 8) — **Reversibility:** reversible.
- **D-58:** Required fields only: **photo, title, zone** — target under 30 seconds; no category/condition pickers from Vite prototype; optional description field hidden behind "Aggiungi dettagli" expander — **Reversibility:** reversible.
- **D-59:** On success navigate to **`/listing/[id]`** (UGC native detail) with toast confirmation — **Reversibility:** reversible.

#### Photo Upload & EXIF (UGC-03)
- **D-60:** Store UGC photos in **Supabase Storage** bucket `ugc-photos` with public read URLs written to `listings.photo_url` — **Reversibility:** costly — storage bucket policies and URL shape propagate to all listing cards.
- **D-61:** **Server-side EXIF strip** in Next.js upload route using `sharp` — remove GPS and all metadata; re-encode as JPEG before Storage write — **Reversibility:** reversible.
- **D-62:** Accept JPEG/PNG/WebP; max **5 MB**; client may downscale before upload but server enforces limit — **Reversibility:** reversible.

#### Location, Zone & Pin Placement
- **D-63:** UGC posts require **non-null lat/lng + zone** at publish; zone computed **server-side** via same Turf point-in-polygon GeoJSON as scraper (`scraper/src/geo/*.geojson`) — **Reversibility:** costly — shared geo module between scraper and app.
- **D-64:** Quick Post flow: user selects **zone chip first**, then places/adjusts pin on zone-centered mini-map; Street Dump: GPS seeds pin on full Venice map overlay with drag handle — **Reversibility:** reversible.
- **D-65:** Reject publish if pin falls **outside all three Venice zones** — show inline error "Sposta il pin dentro Venezia" — **Reversibility:** reversible.

#### Schema & Listing Lifecycle
- **D-66:** Migration extends `listings` for UGC: `owner_user_id uuid references auth.users`, `description text`, `reserved_at timestamptz`, `report_count int default 0`, `hidden_reason text`; UGC `external_id` = listing UUID string; UGC `external_url` = in-app path `/listing/[id]` — **Reversibility:** one-way — migration + RLS.
- **D-67:** UGC default **`expires_at = posted_at + 7 days`** (longer than 48h scraped); poster can mark sent/gone earlier — **Reversibility:** reversible.
- **D-68:** Poster lifecycle: **Segna riservato** → `status = 'claimed'`, `reserved_at = now()`; **Segna consegnato** → `status = 'expired'` (reuse enum, no new value) — **Reversibility:** costly — status semantics shared with scraped expiry.
- **D-69:** Reserved UGC stays on map/list with **"Riservato"** badge; sent/gone/expired UGC excluded from `listings_public` view — **Reversibility:** reversible.

#### UGC Detail & Contact Branching
- **D-70:** Detail route branches on `source`: **`ugc` → native detail page** (Stitch `item_details_notion_style` adapted); **`subito`/`facebook` → existing WebView shell** (D-42) — **Reversibility:** costly — detail route becomes dual-mode.
- **D-71:** UGC detail primary CTA: **"Contatta"** opens DM; scraped listings keep **"Claim on Subito"** external only — **Reversibility:** one-way — core product boundary from Phase 1–2.
- **D-72:** UGC detail shows poster-safe metadata only (title, photo, zone, posted time, status badge) — no home address text field — **Reversibility:** reversible.

#### In-App DM (CONT-01, CONT-04, CONT-05)
- **D-73:** New tables: `conversations` (`listing_id`, `buyer_user_id`, `seller_user_id`, unique pair per listing+buyer) and `messages` (`conversation_id`, `sender_id`, `body`, `created_at`) — **Reversibility:** one-way — messaging schema.
- **D-74:** **Poll-based refresh** every 10s while DM drawer open — no Supabase Realtime in Phase 3 — **Reversibility:** reversible.
- **D-75:** **FCFS implicit**: one active buyer thread per listing; if another user already opened DM, show read-only notice "Qualcuno potrebbe già essere in contatto" — no multi-buyer queue UI in v1 — **Reversibility:** reversible.
- **D-76:** DM UI: **bottom sheet / slide-over** from detail page (not full-page route) — port interaction pattern from Vite `ChatModal.tsx` with Stitch tokens — **Reversibility:** reversible.

#### Safety Messaging (CONT-05, Pitfall 7)
- **D-77:** **First-send safety modal** per conversation — Italian copy: meet in public well-lit place, keep chat in-app, never pay for "free" items; user must tap "Ho capito" before first message sends — **Reversibility:** reversible.
- **D-78:** **Persistent safety banner** at top of DM thread (collapsible after first read) — **Reversibility:** reversible.

#### Moderation & Reports (MOD-01, MOD-02, MOD-03)
- **D-79:** Report action on all listing types from detail overflow menu; reasons: **Già preso / non più disponibile**, **Non è gratis**, **Spam o truffa** — **Reversibility:** reversible.
- **D-80:** **Scraped listings: auto-hide after 2 reports** → `status = 'hidden'` immediately — **Reversibility:** reversible.
- **D-81:** **UGC listings: auto-hide after 3 reports** → `status = 'hidden'`, `hidden_reason = 'pending_review'` (Pitfall 6 — higher bar than scraped) — **Reversibility:** costly — distinct thresholds require report pipeline branching.
- **D-82:** New `listing_reports` table (listing_id, reporter_user_id or session fingerprint, reason, created_at) with **unique constraint per reporter per listing** — **Reversibility:** one-way.
- **D-83:** Poster sees **"Nascosto — in revisione"** banner on own hidden UGC via `/post/manage` or detail owner view; public feeds exclude hidden rows — **Reversibility:** reversible.
- **D-84:** Reporter **soft-mute**: reported listing hidden from that reporter's feed only — **Reversibility:** reversible.

#### Rate Limiting & Abuse
- **D-85:** Rate limits: max **3 UGC posts per user per day**, max **5 DM conversation starts per user per hour** — enforced server-side — **Reversibility:** reversible.

#### API & RLS
- **D-86:** UGC writes via **Next.js Route Handlers** (`app/api/ugc/*`, `app/api/messages/*`, `app/api/reports/*`) with Zod validation — not direct client service-role — **Reversibility:** costly.
- **D-87:** RLS: authenticated users **INSERT** own UGC rows; **UPDATE** own listings (status/reserved); **SELECT** conversations where participant; anon retains read via `listings_public` only — **Reversibility:** one-way.

#### UI Language (Pre-i18n)
- **D-88:** Phase 3 chrome in **Italian** via `messages/it.ts` — same pattern as Phase 2 (D-51); UGC listing titles user-authored (any language) — **Reversibility:** reversible.

### Claude's Discretion
- Exact `sharp` output quality/compression settings
- Whether DM is route (`/listing/[id]/chat`) vs modal-only
- Mini-map component reuse (MapLibre vs static zone map for pin placement)
- Poster "manage listings" as `/post/manage` sub-route vs settings section
- Session fingerprint vs anonymous report blocking before auth
- Whether reserved badge uses gray chip or strikethrough title

### Deferred Ideas (OUT OF SCOPE)
- Google/Apple OAuth providers — Phase 4 (AUTH-01)
- Login gate on favorite/alerts/browse — Phase 4 (AUTH-02)
- Supabase-backed favorites migration — Phase 4
- Push notifications on new DM messages — Phase 4 (optional enhancement)
- Full EN/ZH UI toggle — Phase 5 (I18N-01)
- Operator moderation dashboard / manual review queue UI — post-v1
- Multi-buyer waitlist when listing has active DM — future enhancement
- Realtime DM via Supabase Realtime — future if poll UX insufficient
- FB Marketplace UGC-like scraped contact — permanently out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UGC-01 | Post free item with photo, title, zone in under 30s | Two-tab `/post` UI (D-56–58); Route Handler POST with Zod; shared `lib/geo/tagZone`; Storage upload pipeline |
| UGC-02 | Street Dump quick-pin with GPS seed + manual confirm | Browser geolocation + MapLibre drag pin (D-57, D-64); never auto-publish (Pitfall 8) |
| UGC-03 | Strip EXIF from uploaded photos | `sharp` server route: `autoOrient().jpeg().toBuffer()` strips metadata by default [CITED: sharp docs] |
| UGC-04 | Login required to post | Supabase magic link (D-54); inline auth modal on `/post` (D-55); RLS INSERT requires `auth.uid()` |
| CONT-01 | In-app DM for UGC only | `conversations` + `messages` tables (D-73); bottom sheet UI (D-76); poll 10s (D-74) |
| CONT-02 | Poster marks listing reserved | PATCH status → `claimed`, `reserved_at = now()` (D-68); badge on map/list (D-69) |
| CONT-03 | Poster marks sent/gone | PATCH status → `expired` (D-68); excluded from `listings_public` |
| CONT-04 | Login required to initiate contact | Auth gate on DM open (D-54, D-55); conversation INSERT requires authenticated buyer |
| CONT-05 | Meetup safety messaging | First-send modal + thread banner (D-77, D-78); Pitfall 7 mitigation |
| MOD-01 | Report listing (claimed/not free/spam) | `listing_reports` table + overflow menu (D-79, D-82) |
| MOD-02 | Auto-hide at 2 scraped / 3 UGC reports | Server-side counter increment + threshold branch (D-80, D-81) |
| MOD-03 | Poster sees hidden-pending-review state | Owner-scoped query + banner (D-83); `hidden_reason = 'pending_review'` |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- All user-facing UI MUST follow `.planning/google-stitch-ui-design/DESIGN.md` and matching `{screen}_notion_style/code.html` prototypes — port, do not redesign.
- Monochrome document-first aesthetic; thin `#e5e5e5` borders; no card drop shadows; Inter + Material Symbols Outlined; 4px spacing grid.
- Use `@theme` tokens from `app/globals.css` — not default shadcn/Tailwind themes.
- shadcn/Radix primitives OK only when restyled to Stitch tokens.
- Blocking anti-patterns: default shadcn theme colors, rounded-xl/2xl cards, saturated accents, glassmorphism, hardcoded hex drift.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email magic-link auth | Frontend Server (SSR) + Supabase Auth | Browser / Client (login modal trigger) | PKCE callback + cookie session on server; client triggers `signInWithOtp` [CITED: supabase/ssr] |
| Photo upload + EXIF strip | API / Backend (Route Handler) | CDN / Static (Supabase Storage) | Server validates MIME/size, strips metadata, writes to Storage — never trust client |
| Zone tagging at post time | API / Backend (Route Handler) | — | Server-side Turf point-in-polygon (D-63); client zone chip is UX hint only |
| UGC listing INSERT/UPDATE | API / Backend (Route Handler) | Database (RLS) | Route Handler validates Zod; RLS enforces `owner_user_id = auth.uid()` |
| Public listing reads | Database (RLS + view) | Frontend Server (RSC) | `listings_public` view; anon unchanged for browse |
| DM send/receive | API / Backend (Route Handler) | Browser / Client (poll UI) | 10s poll while drawer open; no Realtime in v1 |
| Report submission + auto-hide | API / Backend (Route Handler) | Database (counter + status) | Atomic increment + threshold check in Route Handler transaction |
| Rate limiting | API / Backend (Route Handler) | Database (count queries) | Server-side DB counts per D-85 |
| Safety modal/banner | Browser / Client | — | Client UX gate before first message POST |
| Reserved badge on map/list | Browser / Client | Database (status column in view) | Client renders badge from `status = 'claimed'` in extended view |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.12.4 (installed) / latest 0.12.x | Auth session cookies in Next.js App Router | Official SSR package; forces PKCE for magic links [CITED: github.com/supabase/ssr] |
| `@supabase/supabase-js` | 2.111.0 (registry) / 2.110.9 (installed) | DB, Auth, Storage client | Already in project; single vendor for auth+storage+postgres |
| `sharp` | 0.35.3 (registry) | Server-side EXIF strip + JPEG re-encode | De-facto Node image pipeline; metadata stripped by default on `toBuffer()` [CITED: github.com/lovell/sharp] |
| `@turf/boolean-point-in-polygon` | 7.3.5 (registry) | Server-side Venice zone tagging | Same algorithm as scraper; proven in Phase 1 [VERIFIED: scraper/src/shared/zone-tag.ts] |
| `zod` | 4.4.3 (installed) | Route Handler request validation | Already used in `lib/listings/schema.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-map-gl` + `maplibre-gl` | 8.1.1 / 6.0.0 (installed) | Pin placement maps (Street Dump, Quick Post mini-map) | Reuse Phase 2 MapLibre setup |
| `vaul` | 1.1.2 (installed) | DM bottom sheet drawer | Same pattern as map bottom sheet |
| `@radix-ui/react-toast` | 1.2.23 (installed) | Post-success confirmation toast | D-59 navigate + toast |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Poll-based DM (10s) | Supabase Realtime | Realtime adds RLS complexity + connection overhead; poll sufficient for v1 per D-74 |
| Route Handlers | Server Actions | Route Handlers better for multipart upload + explicit API boundaries per D-86 |
| sharp EXIF strip | Client-side canvas strip | Client strip is bypassable; server strip mandatory for GPS leak prevention (Pitfall 7/Security) |
| Shared `lib/geo/` | Duplicate zone logic in app | Extraction required anyway (D-63); duplication causes drift |

**Installation:**
```bash
npm install sharp @turf/boolean-point-in-polygon
```

**Version verification:** `npm view sharp version` → 0.35.3; `npm view @turf/boolean-point-in-polygon version` → 7.3.5 (verified 2026-07-30).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `sharp` | npm | recent publish (2026-07-01) | ~80M/wk | github.com/lovell/sharp | SUS (too-new flag) | Approved — official lovell/sharp; seam false positive on publish date; no postinstall script |
| `@turf/boolean-point-in-polygon` | npm | established | ~3.2M/wk | github.com/Turfjs/turf | OK | Approved |
| `@supabase/ssr` | npm | established | high | github.com/supabase/ssr | OK | Already installed |
| `@supabase/supabase-js` | npm | established | high | github.com/supabase/supabase-js | OK | Already installed |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `sharp` — seam flagged "too-new" but this is the canonical package (80M weekly downloads, lovell/sharp repo). Planner may skip human-verify checkpoint given established provenance.

## Architecture Patterns

### System Architecture Diagram

```
[Browser: /post form]
    │ photo + title + lat/lng (+ optional description)
    ▼
[POST /api/ugc/upload] ──► sharp (EXIF strip) ──► Supabase Storage (ugc-photos)
    │ public URL
    ▼
[POST /api/ugc/listings] ──► lib/geo/tagZone() ──► INSERT listings (source=ugc, owner_user_id)
    │
    ▼
[listings_public view] ◄── anon/authenticated SELECT ──► [Map + List UI]

[Browser: UGC detail "Contatta"]
    │ auth check (inline modal if needed)
    ▼
[POST /api/messages/conversations] ──► INSERT conversations (buyer, seller from listing.owner_user_id)
    │
    ▼
[GET/POST /api/messages/conversations/[id]/messages] ◄── poll 10s while drawer open
    │ first send: safety modal gate (client)
    ▼
[Buyer ↔ Seller DM thread]

[Browser: detail overflow "Segnala"]
    ▼
[POST /api/reports] ──► INSERT listing_reports ──► increment report_count
    │ threshold: 2 (scraped) / 3 (ugc)
    ▼
[UPDATE listings SET status='hidden', hidden_reason=?] ──► removed from public feeds
```

### Recommended Project Structure

```
app/
├── post/
│   ├── page.tsx              # Two-tab post form (replace stub)
│   └── manage/page.tsx       # Owner listing management (discretion)
├── listing/[id]/
│   └── page.tsx              # Branch: UgcDetailShell | ScrapedListingShell
├── auth/
│   └── callback/route.ts     # PKCE exchangeCodeForSession
└── api/
    ├── ugc/
    │   ├── upload/route.ts   # multipart → sharp → Storage
    │   └── listings/route.ts # POST create listing
    │   └── listings/[id]/route.ts  # PATCH status (reserved/gone)
    ├── messages/
    │   ├── conversations/route.ts       # POST start conversation
    │   └── conversations/[id]/messages/route.ts  # GET poll / POST send
    └── reports/route.ts      # POST report + auto-hide logic

lib/
├── geo/
│   ├── zone-tag.ts           # Extracted from scraper (shared Turf logic)
│   └── geojson/              # Copy or symlink scraper/src/geo/*.geojson
├── supabase/
│   ├── server.ts             # FIX: working setAll cookies
│   ├── admin.ts              # Service role (Storage admin ops only if needed)
│   └── auth.ts               # getSession, requireAuth helpers
├── ugc/
│   ├── schemas.ts            # Zod: CreateListing, UpdateStatus, UploadMeta
│   └── rate-limit.ts         # DB-count rate limit helpers
└── messages/
    └── schemas.ts            # Zod: CreateConversation, SendMessage

components/
├── ugc/
│   ├── PostForm.tsx          # Quick Post tab
│   ├── StreetDumpForm.tsx    # GPS seed + map confirm
│   ├── AuthPromptModal.tsx   # Inline login (D-55)
│   └── PinMap.tsx            # MapLibre pin drag (reuse MapExplorer patterns)
├── detail/
│   ├── ScrapedListingShell.tsx  # existing — preserve
│   └── UgcListingShell.tsx      # native UGC detail + Contatta CTA
└── messages/
    ├── DmDrawer.tsx          # vaul bottom sheet (port ChatModal UX)
    ├── SafetyModal.tsx       # first-send gate (D-77)
    └── SafetyBanner.tsx      # persistent thread banner (D-78)

supabase/migrations/
└── 007_ugc_messaging_reports.sql
```

### Pattern 1: Auth Magic Link with PKCE (Next.js App Router)

**What:** Email OTP via `signInWithOtp`; callback route exchanges `code` for session using PKCE flow forced by `@supabase/ssr`.
**When to use:** All Phase 3 authenticated actions (post, DM, manage listings).
**Critical fix:** Current `lib/supabase/server.ts` no-ops `setAll` — sessions cannot persist after callback.

**Example:**
```typescript
// lib/supabase/server.ts — MUST implement setAll (not no-op)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

// app/auth/callback/route.ts
// Source: https://github.com/supabase/ssr (PKCE flowType)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
```

### Pattern 2: Server-Side Photo Pipeline (EXIF Strip → Storage)

**What:** Route Handler receives multipart FormData, validates file, strips metadata with sharp, uploads clean JPEG to Storage.
**When to use:** Every UGC photo upload (UGC-03).

**Example:**
```typescript
// app/api/ugc/upload/route.ts
// Source: https://github.com/lovell/sharp (toBuffer strips metadata by default)
import sharp from 'sharp';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('photo') as File;
  if (!file || file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'Invalid file' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const clean = await sharp(buffer)
    .autoOrient()
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('ugc-photos')
    .upload(path, clean, { contentType: 'image/jpeg', upsert: false });

  const { data: { publicUrl } } = supabase.storage.from('ugc-photos').getPublicUrl(path);
  return Response.json({ photoUrl: publicUrl });
}
```

### Pattern 3: RLS for UGC + Messaging

**What:** Row-level policies enforce ownership and participant access; Route Handlers use authenticated client (not service role) for writes.
**When to use:** All new tables in migration 007.

**Example (migration sketch):**
```sql
-- supabase/migrations/007_ugc_messaging_reports.sql

-- Extend listings
alter table public.listings
  add column if not exists owner_user_id uuid references auth.users(id),
  add column if not exists description text,
  add column if not exists reserved_at timestamptz,
  add column if not exists report_count int not null default 0,
  add column if not exists hidden_reason text;

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_user_id uuid not null references auth.users(id),
  seller_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_user_id uuid references auth.users(id),
  reporter_fingerprint text,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_user_id),
  unique (listing_id, reporter_fingerprint),
  check (reporter_user_id is not null or reporter_fingerprint is not null)
);

-- RLS: listings UGC writes
create policy "ugc_insert_own"
  on public.listings for insert to authenticated
  with check (
    source = 'ugc'
    and owner_user_id = auth.uid()
  );

create policy "ugc_update_own"
  on public.listings for update to authenticated
  using (owner_user_id = auth.uid() and source = 'ugc')
  with check (owner_user_id = auth.uid());

-- RLS: conversations (participants only)
alter table public.conversations enable row level security;
create policy "conversation_select_participant"
  on public.conversations for select to authenticated
  using (buyer_user_id = auth.uid() or seller_user_id = auth.uid());

create policy "conversation_insert_buyer"
  on public.conversations for insert to authenticated
  with check (buyer_user_id = auth.uid());

-- RLS: messages (participants via conversation join)
alter table public.messages enable row level security;
create policy "message_select_participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

create policy "message_insert_participant"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

-- Storage bucket (run via Supabase dashboard or migration)
-- INSERT policy: authenticated users upload to ugc-photos/{user_id}/*
-- SELECT policy: public read on ugc-photos bucket
-- Source: https://supabase.com/docs/guides/storage/security/access-control

-- Extend listings_public for claimed UGC (D-69)
create or replace view public.listings_public
with (security_invoker = true) as
select
  id, source, title, photo_url, external_url, lat, lng, zone,
  posted_at, expires_at, status
from public.listings
where (
  (status = 'active' and expires_at > now())
  or (status = 'claimed' and source = 'ugc' and expires_at > now())
)
and zone is not null;
```

### Pattern 4: Report Pipeline with Source-Branching Threshold

**What:** Route Handler inserts report, increments counter, applies different hide thresholds for scraped vs UGC.
**When to use:** MOD-01, MOD-02.

**Example:**
```typescript
// app/api/reports/route.ts
const THRESHOLDS = { subito: 2, facebook: 2, ugc: 3 } as const;

async function applyAutoHide(listingId: string) {
  const { data: listing } = await supabase
    .from('listings')
    .select('source, report_count')
    .eq('id', listingId)
    .single();

  const threshold = THRESHOLDS[listing.source];
  if (listing.report_count >= threshold) {
    await supabase.from('listings').update({
      status: 'hidden',
      hidden_reason: listing.source === 'ugc' ? 'pending_review' : 'community_reports',
    }).eq('id', listingId);
  }
}
```

### Pattern 5: Rate Limiting via DB Counts

**What:** Before INSERT, count recent rows for user; reject if over limit.
**When to use:** D-85 (3 posts/day, 5 DM starts/hour).

**Example:**
```typescript
// lib/ugc/rate-limit.ts
export async function assertCanPost(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('owner_user_id', userId)
    .eq('source', 'ugc')
    .gte('posted_at', since);
  if ((count ?? 0) >= 3) throw new RateLimitError('post');
}
```

### Anti-Patterns to Avoid

- **Client-side zone assignment:** Zone must be server-computed (D-63); client chip is UX only.
- **Direct Storage upload from browser:** Bypasses EXIF strip; always proxy through Route Handler.
- **Service-role client in browser:** D-86 forbids; all writes through authenticated Route Handlers.
- **Auto-publish Street Dump on GPS:** Pitfall 8 — always require pin confirm (D-57).
- **Single report threshold for UGC:** Pitfall 6 — use 3 + pending_review for UGC (D-81).
- **DM for scraped listings:** Anti-Pattern 2 from ARCHITECTURE.md — `source` discriminator is authoritative.

## Tracer-First Slice Recommendation

Ship in this order to validate the highest-risk integration points early:

| Wave | Scope | Validates | Exit Criteria |
|------|-------|-----------|---------------|
| **T0** | Migration 007 + fix `lib/supabase/server.ts` cookies + Storage bucket policies | DB schema + auth session persistence | Migration applies; magic link login sets cookie; `getUser()` returns session in Route Handler |
| **T1** | Auth modal on `/post` + `POST /api/ugc/upload` + `POST /api/ugc/listings` (Quick Post only) | End-to-end post pipeline | Logged-in user posts photo+title+zone → listing appears on map within poll window |
| **T2** | UGC detail branch + source badge on cards | Dual-mode detail route | `/listing/[id]` renders `UgcListingShell` for `source=ugc`; scraped unchanged |
| **T3** | DM drawer + conversations/messages API + safety modal | Messaging + auth gate on contact | Buyer opens DM, passes safety modal, sends message; seller sees it on poll |
| **T4** | Reports + auto-hide + owner hidden banner | Moderation pipeline | 3 reports hide UGC with `pending_review`; poster sees banner |
| **T5** | Street Dump tab + poster lifecycle (reserved/gone) + rate limits | Full requirement coverage | All UGC-01–04, CONT-01–05, MOD-01–03 pass verification |

**Tracer listing suggestion:** Use a known Centro Storico coordinate inside GeoJSON polygon for deterministic zone tagging in tests (same approach as `scraper/src/shared/zone-tag.test.ts`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email magic link auth | Custom JWT/session | Supabase Auth + `@supabase/ssr` | PKCE, refresh, secure cookies [CITED: supabase/ssr] |
| EXIF/GPS stripping | Regex on JPEG bytes | `sharp` pipeline | GPS in EXIF is binary-encoded; client strip bypassable |
| Point-in-polygon zone tag | Manual lat/lng bounds | `@turf/boolean-point-in-polygon` + GeoJSON | Venice zones are irregular polygons; scraper already validates |
| Real-time DM | WebSocket server | 10s poll while drawer open (D-74) | Sufficient for v1; Realtime adds RLS + connection complexity |
| Image storage | Local filesystem | Supabase Storage + RLS | CDN URLs, access policies, scales with project stack |
| Rate limiting | In-memory Map | DB count queries in Route Handler | Serverless-safe; survives restarts |

**Key insight:** Phase 3's risk is **integration surface area** (auth cookies + Storage RLS + new tables + dual detail route), not algorithmic complexity. Tracer-first T0–T1 catches 80% of landmines before building DM/moderation UI.

## Common Pitfalls

### Pitfall 1: Auth Session Not Persisting (Existing Bug)

**What goes wrong:** Magic link callback succeeds but subsequent Route Handler calls return 401 — user stuck in login loop.
**Why it happens:** `lib/supabase/server.ts` currently no-ops `setAll` on cookies [VERIFIED: codebase].
**How to avoid:** Implement full `getAll`/`setAll` cookie handlers per Supabase SSR docs before any auth UI.
**Warning signs:** `exchangeCodeForSession` succeeds in logs but `getUser()` returns null on next request.

### Pitfall 2: Storage Upload 403 (RLS Mismatch)

**What goes wrong:** Photo upload fails with "new row violates row-level security policy."
**Why it happens:** INSERT policy on `storage.objects` without matching SELECT policy, or path doesn't match policy [CITED: supabase.com/docs/guides/storage/security/access-control].
**How to avoid:** Create paired INSERT + SELECT policies scoped to `bucket_id = 'ugc-photos'` and `auth.uid()` in path prefix.
**Warning signs:** Upload returns 403; Storage dashboard shows bucket exists but policies missing.

### Pitfall 3: GPS Leak via EXIF

**What goes wrong:** UGC photo exposes poster's home address despite zone-only UI.
**Why it happens:** Skipping server-side strip or using `withMetadata()` in sharp [CITED: PITFALLS.md Security].
**How to avoid:** Always `sharp(buffer).autoOrient().jpeg().toBuffer()` — default strips all metadata.
**Warning signs:** Downloaded photo from Storage still contains GPS tags when inspected with exiftool.

### Pitfall 4: Street Dump Auto-Publish

**What goes wrong:** Listing pin placed on wrong side of canal or at user's home.
**Why it happens:** Trusting raw GPS in Venice (Pitfall 8) [CITED: PITFALLS.md].
**How to avoid:** GPS seeds pin only; user must drag-confirm before submit (D-57).
**Warning signs:** User complaints about wrong-island pins on UGC posts.

### Pitfall 5: Gameable UGC Takedown

**What goes wrong:** Competitor hides legitimate UGC with 2 coordinated reports.
**Why it happens:** Same threshold as scraped listings (Pitfall 6).
**How to avoid:** 3-report threshold + `hidden_reason = 'pending_review'` for UGC only (D-81).
**Warning signs:** UGC listings hidden faster than view count would suggest organic reports.

### Pitfall 6: `listings_public` View Breaks Reserved Badge

**What goes wrong:** Reserved UGC disappears from map immediately on "Segna riservato."
**Why it happens:** Current view filters `status = 'active'` only [VERIFIED: 006_listings_public_view.sql].
**How to avoid:** Extend view to include `status = 'claimed' AND source = 'ugc'` (D-69).
**Warning signs:** Reserved listing vanishes from map/list after status update.

### Pitfall 7: Detail Route Rejects UGC

**What goes wrong:** Post succeeds but `/listing/[id]` returns 404.
**Why it happens:** Current page hardcodes `source !== 'subito'` → `notFound()` [VERIFIED: app/listing/[id]/page.tsx].
**How to avoid:** Branch on `source` early in T2 tracer slice.
**Warning signs:** 404 after successful post navigation (D-59).

## Code Examples

### Create UGC Listing (Route Handler)

```typescript
// app/api/ugc/listings/route.ts
// Source: project D-66, D-63, D-67
import { z } from 'zod';
import { tagZone, loadZonePolygons } from '@/lib/geo/zone-tag';

const CreateListingSchema = z.object({
  title: z.string().min(1).max(120),
  photoUrl: z.string().url(),
  lat: z.number().min(45.35).max(45.55),
  lng: z.number().min(12.15).max(12.45),
  description: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await assertCanPost(supabase, user.id);
  const body = CreateListingSchema.parse(await request.json());

  const zone = tagZone(body.lat, body.lng, loadZonePolygons());
  if (!zone) return Response.json({ error: 'Pin outside Venice zones' }, { status: 422 });

  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase.from('listings').insert({
    id,
    source: 'ugc',
    external_id: id,
    external_url: `/listing/${id}`,
    title: body.title,
    photo_url: body.photoUrl,
    lat: body.lat,
    lng: body.lng,
    geom: `SRID=4326;POINT(${body.lng} ${body.lat})`,
    zone,
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    content_hash: crypto.randomUUID(), // UGC: unique per post
    owner_user_id: user.id,
    description: body.description ?? null,
  }).select('id').single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
```

### DM Poll Endpoint

```typescript
// app/api/messages/conversations/[id]/messages/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const since = new URL(request.url).searchParams.get('since');
  let query = supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (since) query = query.gt('created_at', since);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data });
}
```

### Inline Auth Prompt (Client)

```typescript
// components/ugc/AuthPromptModal.tsx
'use client';
import { createClient } from '@/lib/supabase/client';

export function AuthPromptModal({ open, onClose, redirectTo }: Props) {
  const supabase = createClient();

  async function sendMagicLink(email: string) {
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
    });
  }
  // Stitch monochrome modal UI per DESIGN.md
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | PKCE forced; use `createServerClient` not deprecated helpers |
| Client-side Storage upload | Server Route Handler proxy | Phase 3 decision (D-86) | Enables EXIF strip + validation |
| Implicit OTP token in URL hash | PKCE `code` query param | `@supabase/ssr` default | Requires `/auth/callback` route with `exchangeCodeForSession` |
| Realtime for all messaging | Poll-based refresh | Phase 3 scope (D-74) | Simpler RLS; upgrade path to Realtime if needed |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr` [CITED: supabase/ssr README]
- Direct anon INSERT to `listings`: blocked once UGC RLS ships; all writes via Route Handlers

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase magic link email works out-of-box on project tier (no custom SMTP required for dev) | Standard Stack | Dev login blocked until SMTP configured |
| A2 | `@turf/boolean-point-in-polygon` can be added to root package.json without monorepo conflict with scraper | Standard Stack | Version drift between app and scraper zone logic |
| A3 | GeoJSON files can be copied to `lib/geo/geojson/` (or imported from scraper via relative path in tests only) | Architecture | Build breaks if GeoJSON not available at runtime in Next.js |
| A4 | `listings_public` view can expose `status` column for reserved badge without leaking hidden rows | Pattern 3 | Badge logic breaks or hidden rows leak |
| A5 | Session fingerprint (`crypto.randomUUID` in localStorage) sufficient for anonymous report dedup | Claude's Discretion | Duplicate anonymous reports if fingerprint cleared |
| A6 | 5 MB upload limit fits Vercel/Next.js Route Handler body size defaults | Pattern 2 | Upload fails on serverless; may need `export const config` body parser limit |

## Open Questions (RESOLVED)

1. **Custom SMTP for magic link emails in production** — RESOLVED: Dev uses Supabase default email; production SMTP (Resend/custom) is an operator checkpoint in Plan 01 user_setup, not a code blocker. T0 manual verify magic link on localhost.

2. **Service role for report counter increment** — RESOLVED: Use **security-definer SQL function** `increment_listing_report()` called from Route Handler with user session context — avoids exposing service-role to client (D-86) and works when `SUPABASE_SERVICE_ROLE_KEY` unset.

3. **Mini-map vs full MapLibre for Quick Post pin placement** — RESOLVED: Reuse **MapLibre** with zone-centered viewport per 03-UI-SPEC.md PinMap component (consistent with Phase 2 MapExplorer; no second map dependency).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js + sharp | ✓ | v23.10.0 | — |
| npm | Package install | ✓ | 11.4.2 | — |
| Supabase project | Auth, Storage, DB | ✓ (partial) | — | `.env.local` exists; STATE.md notes service role may be unset |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | ✓ | — | App degrades to empty listings without env |
| `SUPABASE_SERVICE_ROLE_KEY` | Report pipeline (if service-role pattern) | ✗ (likely) | — | Use security-definer SQL function instead |
| sharp native binaries | EXIF strip | ✗ (not installed) | — | `npm install sharp` in Wave 0 |
| `@turf/boolean-point-in-polygon` | Zone tagging in app | ✗ (scraper only) | — | Add to root package.json |
| MapLibre + OpenFreeMap | Pin placement maps | ✓ | maplibre-gl 6.0.0 | Already in Phase 2 |
| Vitest | Unit tests | ✓ | 3.2.4 | — |

**Missing dependencies with no fallback:**
- Supabase migrations 007 applied on target project (blocks all UGC features)

**Missing dependencies with fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` — use security-definer SQL function for report counter if unset

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root); `include: ['lib/**/*.test.ts']` |
| Quick run command | `npm run test:lib` |
| Full suite command | `npm run test` (includes scraper via default vitest) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UGC-01 | Post with photo/title/zone | unit + integration | `npm run test:lib -- lib/ugc/schemas.test.ts` | ❌ Wave 0 |
| UGC-02 | Street Dump pin validation | unit | `npm run test:lib -- lib/geo/zone-tag.test.ts` | ❌ Wave 0 (port from scraper) |
| UGC-03 | EXIF stripped from buffer | unit | `npm run test:lib -- lib/ugc/exif-strip.test.ts` | ❌ Wave 0 |
| UGC-04 | Auth required on post API | unit | `npm run test:lib -- lib/ugc/auth-gate.test.ts` | ❌ Wave 0 |
| CONT-01 | Conversation create schema | unit | `npm run test:lib -- lib/messages/schemas.test.ts` | ❌ Wave 0 |
| CONT-02 | Reserved status transition | unit | `npm run test:lib -- lib/ugc/status.test.ts` | ❌ Wave 0 |
| CONT-05 | Safety strings present | unit | `npm run test:lib -- messages/it.test.ts` | ❌ Wave 0 |
| MOD-01 | Report reason enum | unit | `npm run test:lib -- lib/reports/schemas.test.ts` | ❌ Wave 0 |
| MOD-02 | Threshold 2 vs 3 by source | unit | `npm run test:lib -- lib/reports/auto-hide.test.ts` | ❌ Wave 0 |
| MOD-03 | Hidden reason pending_review | unit | `npm run test:lib -- lib/reports/auto-hide.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:lib`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/geo/zone-tag.ts` + `lib/geo/zone-tag.test.ts` — port from scraper (covers UGC-02, D-63)
- [ ] `lib/ugc/schemas.ts` + `lib/ugc/schemas.test.ts` — Zod validation (UGC-01)
- [ ] `lib/ugc/exif-strip.ts` + `lib/ugc/exif-strip.test.ts` — sharp pipeline wrapper (UGC-03)
- [ ] `lib/reports/auto-hide.test.ts` — threshold logic (MOD-02)
- [ ] `lib/ugc/rate-limit.test.ts` — post/DM limits (D-85)
- [ ] Framework install: `npm install sharp @turf/boolean-point-in-polygon`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth magic link + PKCE; session in httpOnly cookies |
| V3 Session Management | yes | `@supabase/ssr` cookie handling; fix no-op setAll |
| V4 Access Control | yes | RLS on listings, conversations, messages, storage.objects |
| V5 Input Validation | yes | Zod schemas on all Route Handlers; file size/MIME checks on upload |
| V6 Cryptography | no (minimal) | No custom crypto; rely on Supabase TLS + Auth JWT |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| EXIF GPS leak in UGC photos | Information Disclosure | Server-side sharp strip before Storage (UGC-03) |
| Unauthorized listing edit | Elevation of Privilege | RLS `owner_user_id = auth.uid()` on UPDATE |
| DM snooping | Information Disclosure | RLS participant-only SELECT on conversations/messages |
| Report bombing / UGC takedown abuse | Denial of Service | 3-report UGC threshold + unique reporter constraint (D-81, D-82) |
| Spam posting / DM flooding | Denial of Service | Rate limits 3 posts/day, 5 DM starts/hour (D-85) |
| Storage path traversal upload | Tampering | Upload path scoped to `{user_id}/{uuid}.jpg`; RLS on bucket |
| XSS in DM body | Tampering | React text rendering (no dangerouslySetInnerHTML); Zod max length |
| CSRF on Route Handlers | Spoofing | SameSite cookies + Supabase Auth session; POST-only mutations |

## Sources

### Primary (HIGH confidence)
- `/supabase/ssr` (Context7) — PKCE flowType, cookie getAll/setAll, exchangeCodeForSession
- `/supabase/supabase` (Context7) — Storage RLS policies, messaging RLS participant pattern
- `/lovell/sharp` (Context7) — toBuffer metadata removal, autoOrient, JPEG re-encode
- `/vercel/next.js` (Context7) — Route Handler FormData file upload
- Codebase: `lib/supabase/server.ts`, `app/listing/[id]/page.tsx`, `006_listings_public_view.sql`, `scraper/src/shared/zone-tag.ts`

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — canonical listing schema, UGC/scraped contact boundary
- `.planning/research/PITFALLS.md` — Pitfalls 6, 7, 8; EXIF stripping; report gameability
- `.planning/phases/03-ugc-posting-community-marketplace/03-CONTEXT.md` — D-54 through D-88 locked decisions

### Tertiary (LOW confidence)
- Supabase default email deliverability for magic links in production — needs operator verification (Assumption A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified packages + Context7 docs + existing project dependencies
- Architecture: MEDIUM-HIGH — locked decisions comprehensive; integration landmines identified in codebase audit
- Pitfalls: HIGH — PITFALLS.md cross-referenced with Phase 3 decisions; existing bugs documented

**Research date:** 2026-07-30
**Valid until:** 2026-08-29 (30 days — Supabase/Next stable; sharp moves slowly)
