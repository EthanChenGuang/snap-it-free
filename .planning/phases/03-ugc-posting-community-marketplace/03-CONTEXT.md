# Phase 3: UGC Posting & Community Marketplace - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** Auto-selected (--auto)

<domain>
## Phase Boundary

Phase 3 delivers user-generated supply and the in-app coordination layer that scraped listings intentionally lack: logged-in users can post free items (standard quick-post and Street Dump pin modes), uploaded photos are EXIF-stripped, buyers can DM UGC posters in-app, posters can reserve or mark listings as gone, community reporting auto-hides bad listings with UGC-specific safeguards, and meetup safety messaging ships alongside contact — not after an incident.

Requirements in scope: UGC-01, UGC-02, UGC-03, UGC-04, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, MOD-01, MOD-02, MOD-03.

Out of scope: Full auth provider matrix (Google/Apple — Phase 4 AUTH-01), login gates on browse/favorite/alerts (Phase 4 AUTH-02), push notifications and keyword alerts (Phase 4 NOTF-01–05), full trilingual UI (Phase 5 I18N-01–02), FB Marketplace scraped supply (v2), operator moderation dashboard, payment/checkout, social graph features.

</domain>

<decisions>
## Implementation Decisions

### Auth Scope (Phase 3 vs Phase 4)
- **D-54:** Ship **minimal Supabase Auth in Phase 3** scoped to UGC write paths — **email magic link only** as the sole provider; Google/Apple deferred to Phase 4 (AUTH-01). Login required to post (UGC-04), initiate DM (CONT-04), and manage own listings; browsing, favorites, and scraped detail remain login-optional until Phase 4 — **Reversibility:** one-way — RLS policies, `owner_user_id` FK, and session gates touch every UGC route.
- **D-55:** `/post` and DM entry show **inline login prompt** (not a global auth wall) — reuse Stitch monochrome modal pattern; after auth redirect back to intended action — **Reversibility:** reversible.

### UGC Post Flow & Street Dump
- **D-56:** Replace `/post` stub with full quick-post UI ported from `.planning/google-stitch-ui-design/post_free_item_notion_style/code.html` — **Reversibility:** reversible.
- **D-57:** **Two tabs on `/post`**: "Pubblica" (default quick post) and "Street Dump" — Street Dump pre-seeds pin from browser geolocation but **never auto-publishes**; user must confirm/drag-adjust on map before submit (Pitfall 8) — **Reversibility:** reversible.
- **D-58:** Required fields only: **photo, title, zone** — target under 30 seconds; no category/condition pickers from Vite prototype; optional description field hidden behind "Aggiungi dettagli" expander — **Reversibility:** reversible.
- **D-59:** On success navigate to **`/listing/[id]`** (UGC native detail) with toast confirmation — **Reversibility:** reversible.

### Photo Upload & EXIF (UGC-03)
- **D-60:** Store UGC photos in **Supabase Storage** bucket `ugc-photos` with public read URLs written to `listings.photo_url` — **Reversibility:** costly — storage bucket policies and URL shape propagate to all listing cards.
- **D-61:** **Server-side EXIF strip** in Next.js upload route using `sharp` — remove GPS and all metadata; re-encode as JPEG before Storage write — **Reversibility:** reversible.
- **D-62:** Accept JPEG/PNG/WebP; max **5 MB**; client may downscale before upload but server enforces limit — **Reversibility:** reversible.

### Location, Zone & Pin Placement
- **D-63:** UGC posts require **non-null lat/lng + zone** at publish; zone computed **server-side** via same Turf point-in-polygon GeoJSON as scraper (`scraper/src/geo/*.geojson`) — **Reversibility:** costly — shared geo module between scraper and app.
- **D-64:** Quick Post flow: user selects **zone chip first**, then places/adjusts pin on zone-centered mini-map; Street Dump: GPS seeds pin on full Venice map overlay with drag handle — **Reversibility:** reversible.
- **D-65:** Reject publish if pin falls **outside all three Venice zones** — show inline error "Sposta il pin dentro Venezia" — **Reversibility:** reversible.

### Schema & Listing Lifecycle
- **D-66:** Migration extends `listings` for UGC: `owner_user_id uuid references auth.users`, `description text`, `reserved_at timestamptz`, `report_count int default 0`, `hidden_reason text`; UGC `external_id` = listing UUID string; UGC `external_url` = in-app path `/listing/[id]` — **Reversibility:** one-way — migration + RLS.
- **D-67:** UGC default **`expires_at = posted_at + 7 days`** (longer than 48h scraped); poster can mark sent/gone earlier — **Reversibility:** reversible.
- **D-68:** Poster lifecycle: **Segna riservato** → `status = 'claimed'`, `reserved_at = now()`; **Segna consegnato** → `status = 'expired'` (reuse enum, no new value) — **Reversibility:** costly — status semantics shared with scraped expiry.
- **D-69:** Reserved UGC stays on map/list with **"Riservato"** badge; sent/gone/expired UGC excluded from `listings_public` view — **Reversibility:** reversible.

### UGC Detail & Contact Branching
- **D-70:** Detail route branches on `source`: **`ugc` → native detail page** (Stitch `item_details_notion_style` adapted); **`subito`/`facebook` → existing WebView shell** (D-42) — **Reversibility:** costly — detail route becomes dual-mode.
- **D-71:** UGC detail primary CTA: **"Contatta"** opens DM; scraped listings keep **"Claim on Subito"** external only — **Reversibility:** one-way — core product boundary from Phase 1–2.
- **D-72:** UGC detail shows poster-safe metadata only (title, photo, zone, posted time, status badge) — no home address text field — **Reversibility:** reversible.

### In-App DM (CONT-01, CONT-04, CONT-05)
- **D-73:** New tables: `conversations` (`listing_id`, `buyer_user_id`, `seller_user_id`, unique pair per listing+buyer) and `messages` (`conversation_id`, `sender_id`, `body`, `created_at`) — **Reversibility:** one-way — messaging schema.
- **D-74:** **Poll-based refresh** every 10s while DM drawer open — no Supabase Realtime in Phase 3 — **Reversibility:** reversible.
- **D-75:** **FCFS implicit**: one active buyer thread per listing; if another user already opened DM, show read-only notice "Qualcuno potrebbe già essere in contatto" — no multi-buyer queue UI in v1 — **Reversibility:** reversible.
- **D-76:** DM UI: **bottom sheet / slide-over** from detail page (not full-page route) — port interaction pattern from Vite `ChatModal.tsx` with Stitch tokens — **Reversibility:** reversible.

### Safety Messaging (CONT-05, Pitfall 7)
- **D-77:** **First-send safety modal** per conversation — Italian copy: meet in public well-lit place, keep chat in-app, never pay for "free" items; user must tap "Ho capito" before first message sends — **Reversibility:** reversible.
- **D-78:** **Persistent safety banner** at top of DM thread (collapsible after first read) — **Reversibility:** reversible.

### Moderation & Reports (MOD-01, MOD-02, MOD-03)
- **D-79:** Report action on all listing types from detail overflow menu; reasons: **Già preso / non più disponibile**, **Non è gratis**, **Spam o truffa** — **Reversibility:** reversible.
- **D-80:** **Scraped listings: auto-hide after 2 reports** → `status = 'hidden'` immediately — **Reversibility:** reversible.
- **D-81:** **UGC listings: auto-hide after 3 reports** → `status = 'hidden'`, `hidden_reason = 'pending_review'` (Pitfall 6 — higher bar than scraped) — **Reversibility:** costly — distinct thresholds require report pipeline branching.
- **D-82:** New `listing_reports` table (listing_id, reporter_user_id or session fingerprint, reason, created_at) with **unique constraint per reporter per listing** — **Reversibility:** one-way.
- **D-83:** Poster sees **"Nascosto — in revisione"** banner on own hidden UGC via `/post/manage` or detail owner view; public feeds exclude hidden rows — **Reversibility:** reversible.
- **D-84:** Reporter **soft-mute**: reported listing hidden from that reporter's feed only — **Reversibility:** reversible.

### Rate Limiting & Abuse
- **D-85:** Rate limits: max **3 UGC posts per user per day**, max **5 DM conversation starts per user per hour** — enforced server-side — **Reversibility:** reversible.

### API & RLS
- **D-86:** UGC writes via **Next.js Route Handlers** (`app/api/ugc/*`, `app/api/messages/*`, `app/api/reports/*`) with Zod validation — not direct client service-role — **Reversibility:** costly.
- **D-87:** RLS: authenticated users **INSERT** own UGC rows; **UPDATE** own listings (status/reserved); **SELECT** conversations where participant; anon retains read via `listings_public` only — **Reversibility:** one-way.

### UI Language (Pre-i18n)
- **D-88:** Phase 3 chrome in **Italian** via `messages/it.ts` — same pattern as Phase 2 (D-51); UGC listing titles user-authored (any language) — **Reversibility:** reversible.

### Claude's Discretion
- Exact `sharp` output quality/compression settings
- Whether DM is route (`/listing/[id]/chat`) vs modal-only
- Mini-map component reuse (MapLibre vs static zone map for pin placement)
- Poster "manage listings" as `/post/manage` sub-route vs settings section
- Session fingerprint vs anonymous report blocking before auth
- Whether reserved badge uses gray chip or strikethrough title

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — UGC structural bet, scraped vs UGC contact boundary, Venice zone importance
- `.planning/REQUIREMENTS.md` — UGC-01–04, CONT-01–05, MOD-01–03 definitions and traceability
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, dependency on Phase 2

### Prior Phase Context
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — canonical `listings` schema, zone tagging, source enum (D-01–D-23)
- `.planning/phases/02-map-list-core-browsing/02-CONTEXT.md` — Next.js routes, MapLibre, WebView shell, login-optional browse, Italian chrome (D-24–D-53)
- `.planning/phases/02-map-list-core-browsing/02-UI-SPEC.md` — Stitch design authority for Phase 2+ frontend

### Research & Pitfalls
- `.planning/research/ARCHITECTURE.md` — UGC post flow, DM tables, report/auto-hide pattern, schema extensions
- `.planning/research/PITFALLS.md` — Pitfall 6 (gameable reports), Pitfall 7 (meetup safety), Pitfall 8 (GPS/Street Dump confirm), EXIF stripping
- `.planning/research/SUMMARY.md` — Phase 3 sequencing rationale (UGC + moderation + safety ship together)

### Design Reference
- `.planning/google-stitch-ui-design/DESIGN.md` — tokens, typography, monochrome aesthetic
- `.planning/google-stitch-ui-design/post_free_item_notion_style/code.html` — post form reference
- `.planning/google-stitch-ui-design/item_details_notion_style/code.html` — UGC detail reference
- `.planning/google-stitch-ui-design/SKILL.md` — strict UI porting rules

### Schema & Code
- `supabase/migrations/002_listings_schema.sql` — base listings table and enums
- `supabase/migrations/006_listings_public_view.sql` — public read view (extend for UGC status badges)
- `scraper/src/shared/schema.ts` — Zod canonical listing schema
- `scraper/src/geo/*.geojson` — Venice zone polygons for server-side tagging
- `app/post/page.tsx` — current stub to replace
- `src/components/PostItemView.tsx` — Vite prototype post flow (port UX, not mock logic)
- `src/components/ChatModal.tsx` — Vite DM prototype interaction reference
- `components/detail/ScrapedListingShell.tsx` — scraped detail branch to preserve
- `messages/it.ts` — Italian string module

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/post/page.tsx` — route shell with Stitch header; replace stub body with post form
- `src/components/PostItemView.tsx` — dashed upload zone, title input, pin toggle UX to port
- `src/components/ChatModal.tsx` — DM overlay, quick replies, send flow to adapt
- `components/map/MapExplorer.tsx` + MapLibre setup — reuse for pin confirm/drag in Street Dump
- `components/detail/ScrapedListingShell.tsx` — keep for `source !== 'ugc'`; branch sibling for UGC
- `components/shell/BottomNav.tsx` — Post tab already routes to `/post`
- `messages/it.ts` — extend with post/DM/report/safety strings
- `lib/listings/queries.ts` — extend selects for UGC status badges; add owner-scoped queries
- `scraper/src/geo/*.geojson` — zone polygons for server-side UGC tagging

### Established Patterns
- Single `listings` table with `source` discriminator — UGC reuses map/list/detail with branch on `source`
- Zone at ingestion (Phase 1 D-14) — UGC applies same rule at post time, not client-only
- Stitch Structured Minimalist UI — thin borders, no shadows, Inter + Material Symbols
- Italian chrome centralized in `messages/it.ts`; listing content user-authored
- Next.js App Router + Supabase anon read via `listings_public` view
- Phase 2: scraped detail = WebView shell; Phase 3 adds native UGC detail + DM

### Integration Points
- `/post` → auth gate → upload API → listings INSERT (`source = 'ugc'`)
- `/listing/[id]` → branch: UGC native detail vs scraped WebView shell
- Map/list cards → show UGC source badge + reserved badge; report in overflow menu
- Supabase Auth → `owner_user_id` on listings; RLS for write paths
- Supabase Storage → `ugc-photos` bucket → `photo_url`
- New API routes for messages, reports, poster status updates

</code_context>

<specifics>
## Specific Ideas

- Model posting UX on Stitch `post_free_item_notion_style` — dashed photo upload, minimal fields, Notion-adjacent inputs.
- Street Dump is the "I'm standing next to free stuff" flow — GPS seeds pin but user always confirms on map (Venice GPS is unreliable near water/bridges).
- Keep scraped vs UGC contact boundary strict: Subito = leave app; UGC = stay in app with safety messaging.
- UGC is the hedge against thin scraped supply in Venice — posting must feel faster than opening Subito.
- Research warns 2-report auto-hide is weaponizable against UGC posters — use 3 + pending_review for UGC only.

</specifics>

<deferred>
## Deferred Ideas

- Google/Apple OAuth providers — Phase 4 (AUTH-01)
- Login gate on favorite/alerts/browse — Phase 4 (AUTH-02)
- Supabase-backed favorites migration — Phase 4
- Push notifications on new DM messages — Phase 4 (optional enhancement)
- Full EN/ZH UI toggle — Phase 5 (I18N-01)
- Operator moderation dashboard / manual review queue UI — post-v1
- Multi-buyer waitlist when listing has active DM — future enhancement
- Realtime DM via Supabase Realtime — future if poll UX insufficient
- FB Marketplace UGC-like scraped contact — permanently out of scope

</deferred>

---

*Phase: 03-UGC Posting & Community Marketplace*
*Context gathered: 2026-07-30 (auto mode)*
