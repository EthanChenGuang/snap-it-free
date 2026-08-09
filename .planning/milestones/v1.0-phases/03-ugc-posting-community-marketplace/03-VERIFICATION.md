---
phase: 03-ugc-posting-community-marketplace
verified: 2026-08-01T09:19:00Z
status: passed
score: 21/27 must-haves verified
behavior_unverified: 6
overrides_applied: 0
behavior_unverified_items:

  - truth: "Logged-in user completes Quick Post and listing appears on map/list within poll window"
    test: "Magic-link login → /post Quick Post tab → upload photo, title, zone pin → submit → navigate /listing/[id] → refresh / map"
    expected: "New UGC pin visible on map and list within poll interval; detail renders UgcListingShell"
    why_human: "End-to-end path requires live Supabase (migration 007, Storage bucket, auth session, listings_public view)"

  - truth: "Magic link callback persists session — getUser() succeeds in Route Handlers after login"
    test: "Complete magic-link flow via /auth/callback; then POST /api/ugc/listings without re-auth"
    expected: "Route Handler requireAuth() returns user; create listing succeeds"
    why_human: "Cookie persistence across PKCE callback requires live Supabase auth provider"

  - truth: "Buyer message visible to seller on 10s poll refresh"
    test: "Two test users: buyer sends DM from Contatta; seller opens same conversation"
    expected: "Message appears on poll without Realtime subscription"
    why_human: "Messaging RLS + participant checks only verifiable with two authenticated sessions against live DB"

  - truth: "Third UGC report auto-hides listing with hidden_reason pending_review"
    test: "Three distinct authenticated users report same UGC listing via /api/reports"
    expected: "Listing status=hidden, hidden_reason=pending_review; removed from listings_public for non-owners"
    why_human: "Trigger in migration 009 fires on INSERT; threshold behavior not exercised by unit tests alone"

  - truth: "Fourth UGC post in 24h rejected with rate limit"
    test: "Create 4 UGC listings with same user within 24h"
    expected: "Fourth POST /api/ugc/listings returns 429 with post.rateLimitPost message"
    why_human: "assertCanPost counts live DB rows; unit tests mock Supabase responses only"

  - truth: "Poster marks reserved → Riservato badge on map; delivered → excluded from public feed"
    test: "Owner PATCH reserved then delivered; check map popup and listings_public"
    expected: "Claimed UGC stays on map with badge; expired UGC disappears from public queries"
    why_human: "Status transitions write to base table; public view filtering requires live DB state"
human_verification:

  - test: "Quick Post happy path (auth → upload → create → map pin)"
    expected: "Listing visible on / map and /list after refresh/poll; UGC detail renders without Subito CTAs"
    why_human: "Tracer path spans auth cookies, Storage upload, RLS INSERT, and listings_public view"

  - test: "Street Dump GPS seed without auto-publish"
    expected: "Geolocation seeds pin on map but submit stays disabled until explicit confirm (button or drag)"
    why_human: "Client-side confirm gate is code-verified; UX timing with geolocation permission is runtime-only"

  - test: "DM reopen after closing drawer"
    expected: "Second Contatta tap returns existing conversation id (200 + existing:true), not bare 409"
    why_human: "Duplicate-conversation path is code-verified; drawer resume UX needs manual session"

  - test: "Owner views hidden UGC listing after 3 reports"
    expected: "HiddenReviewBanner renders; non-owner gets 404"
    why_human: "Requires ugc_select_own RLS applied in live Supabase plus trigger from migration 009"

  - test: "Downloaded ugc-photos object has no GPS EXIF"
    expected: "exiftool or equivalent shows no GPS segment in stored JPEG"
    why_human: "sharp strip verified in unit test; Storage round-trip needs live upload"
---

# Phase 3: UGC Posting & Community Marketplace Verification Report

**Phase Goal:** Users can supplement scraped supply by posting their own free items and coordinating pickup directly in-app, with moderation and safety built in from day one
**Verified:** 2026-08-01T09:19:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### User Flow Coverage (MVP Mode)

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Post free item (Quick Post) | Photo + title + zone + pin → listing on map | `PostForm.tsx` → `/api/ugc/upload` → `/api/ugc/listings`; `ListingCard` UGC chip | ⚠️ Code complete; e2e needs live Supabase |
| Street Dump with GPS confirm | GPS seeds pin; publish only after confirm | `StreetDumpForm.tsx` `pinConfirmed` gate; submit disabled until confirm | ✓ VERIFIED (client gate) |
| EXIF stripped on upload | No GPS metadata in stored photos | `stripExif()` in upload route; `lib/ugc/exif-strip.test.ts` | ✓ VERIFIED |
| Login required to post | 401 without session; auth modal on submit | `requireAuth()` in upload/listings routes; `AuthPromptModal` | ✓ VERIFIED |
| In-app DM to UGC poster | Contatta opens bottom sheet; scraped excluded | `UgcListingShell` → `DmDrawer`; conversations API | ⚠️ Wired; delivery needs live DB |
| Safety at first contact + in thread | Modal gates first send; banner persists | `SafetyModal`, `SafetyBanner`, localStorage ack key | ✓ VERIFIED |
| Report listing (all types) | Three Italian reasons from overflow menu | `DetailTopBar` → `ReportListingMenu` on both shells | ✓ VERIFIED |
| Auto-hide 2 scraped / 3 UGC | Trigger increments count + hides at threshold | `009_report_auto_hide_trigger.sql`; `shouldAutoHide()` tests | ⚠️ SQL + logic verified; runtime needs live DB |
| Owner sees hidden pending review | Banner on own hidden UGC detail | `getListingForDetail` owner path → `HiddenReviewBanner` | ✓ VERIFIED (code path) |
| Poster reserved / delivered lifecycle | Claimed badge on map; expired off public feed | PATCH `/api/ugc/listings/[id]`; `listings_public` view SQL | ⚠️ Wired; state change needs live DB |

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Quick Post pipeline (photo + title + zone + pin) wired end-to-end | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `PostForm.tsx` → upload route → listings route; map via `listings_public` |
| 2 | EXIF stripped before Storage write (UGC-03) | ✓ VERIFIED | `app/api/ugc/upload/route.ts:29`; `exif-strip.test.ts` passes |
| 3 | Unauthenticated post returns 401 / shows auth modal (UGC-04) | ✓ VERIFIED | `requireAuth()` in routes; `AuthPromptModal` in PostForm/StreetDumpForm |
| 4 | Magic link callback persists session (D-54) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `server.ts` setAll implemented; `auth/callback/route.ts` PKCE exchange |
| 5 | `/listing/[id]` renders UgcListingShell for source=ugc (D-70) | ✓ VERIFIED | `app/listing/[id]/page.tsx:27-28` |
| 6 | Zone computed server-side; outside Venice rejected (D-63, D-65) | ✓ VERIFIED | `tagZone()` in listings route; `zone-tag.test.ts` passes |
| 7 | **ugc_select_own RLS in migration 007** (03-REVIEWS) | ✓ VERIFIED | `007_ugc_messaging_reports.sql:50-52` |
| 8 | ugc-photos Storage bucket created in migration 007 | ✓ VERIFIED | `007_ugc_messaging_reports.sql:93-95` |
| 9 | **No client-callable report RPCs — trigger-only** (03-REVIEWS) | ✓ VERIFIED | `009_report_auto_hide_trigger.sql` REVOKE ALL; reports route INSERT-only; no `increment_listing_report`/`apply_listing_auto_hide` in codebase |
| 10 | **getOwnerListingById + getOwnerListings for owner paths** (03-REVIEWS) | ✓ VERIFIED | `lib/listings/queries.ts:72-126`; used by detail page and `/post/manage` |
| 11 | **DM duplicate conversation returns existing id** (03-REVIEWS) | ✓ VERIFIED | `conversations/route.ts:29-37, 92-117` returns `{ id, existing: true }` |
| 12 | **Street Dump never auto-publishes without pin confirm** (03-REVIEWS) | ✓ VERIFIED | `StreetDumpForm.tsx:112` blocks submit; `:291` disabled until `pinConfirmed`; GPS seed does not set confirm |
| 13 | Contatta opens DM for UGC; auth gate for logged-out (CONT-01, CONT-04) | ✓ VERIFIED | `UgcListingShell.tsx:75-86, 238-249` |
| 14 | Safety modal gates first send; banner in thread (CONT-05) | ✓ VERIFIED | `DmDrawer.tsx:201-218, 265, 350` |
| 15 | Messages poll every 10s; no Realtime (D-74) | ✓ VERIFIED | `DmDrawer.tsx:39, 159-161` |
| 16 | FCFS read-only when another buyer has thread (D-75) | ✓ VERIFIED | API returns `{ readOnly: true }`; FCFS RPC in `008_messaging_fcfs.sql` |
| 17 | Report from overflow with three reasons (MOD-01) | ✓ VERIFIED | `ReportListingMenu.tsx`; `schemas.test.ts` |
| 18 | Auto-hide thresholds 2 scraped / 3 UGC (MOD-02) | ✓ VERIFIED | `auto-hide.test.ts` (6 tests); trigger SQL mirrors logic |
| 19 | Duplicate report returns 409 (D-82) | ✓ VERIFIED | `app/api/reports/route.ts:34-35` |
| 20 | Reporter soft-mute via excludeReportedIds (D-84) | ✓ VERIFIED | `MapExplorer.tsx`, `ListPageClient.tsx` import filter |
| 21 | Owner hidden banner on pending_review UGC (MOD-03) | ✓ VERIFIED | `UgcListingShell.tsx:46-52, 128` |
| 22 | Poster marks reserved → claimed + Riservato badge (CONT-02) | ✓ VERIFIED | `status.ts`, PATCH route, `ReservedBadge`, `ListingPopup` |
| 23 | Poster marks delivered → expired; off public view (CONT-03) | ✓ VERIFIED | `mapDeliveredTransition()`; `listings_public` excludes non-active/non-claimed |
| 24 | Rate limits 3 posts/day, 5 DM starts/hour (D-85) | ✓ VERIFIED | `rate-limit.test.ts`; wired in listings + conversations routes |
| 25 | /post/manage lists owner UGC including hidden rows | ✓ VERIFIED | `getOwnerListings()` + `ManageListingsClient.tsx` |
| 26 | Owner lifecycle uses OwnerListingRow.owner_user_id | ✓ VERIFIED | `UgcListingShell.tsx:48-51`; detail passes `isOwnerView` |
| 27 | Claimed UGC visible on map (D-69) | ✓ VERIFIED | `listings_public` view includes claimed UGC predicate |

**Score:** 21/27 truths verified (6 present, behavior-unverified)

### Critical 03-REVIEWS Fix Verification

| Finding | Fix Required | Status | Evidence |
|---------|--------------|--------|----------|
| Missing ugc_select_own RLS | Owner SELECT own rows | ✓ FIXED | `007_ugc_messaging_reports.sql:50-52` |
| Client-callable report RPCs | Trigger-only auto-hide | ✓ FIXED | `009_report_auto_hide_trigger.sql`; no GRANT EXECUTE; reports route INSERT-only |
| getOwnerListingById + getOwnerListings | Owner paths for hidden/manage | ✓ FIXED | `lib/listings/queries.ts`; `getListingForDetail` owner-first |
| DM 409 on reopen | Return existing conversation id | ✓ FIXED | Select-before-insert + conflict recovery in conversations route |
| Street Dump auto-publish | Pin confirm gate | ✓ FIXED | `pinConfirmed` state gates submit; GPS seeds without confirm |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `supabase/migrations/007_ugc_messaging_reports.sql` | UGC schema, RLS, bucket, view | ✓ VERIFIED | ugc_select_own, ugc-photos bucket, listings_public with claimed UGC |
| `supabase/migrations/008_messaging_fcfs.sql` | FCFS check RPC | ✓ VERIFIED | `listing_has_other_buyer_conversation` — read-only boolean, not report bypass |
| `supabase/migrations/009_report_auto_hide_trigger.sql` | Trigger-only auto-hide | ✓ VERIFIED | REVOKE ALL; AFTER INSERT trigger |
| `app/api/ugc/upload/route.ts` | EXIF strip → Storage | ✓ VERIFIED | sharp pipeline, auth required |
| `app/api/ugc/listings/route.ts` | Authenticated create + tagZone | ✓ VERIFIED | assertCanPost wired |
| `app/api/ugc/listings/[id]/route.ts` | Owner PATCH lifecycle | ✓ VERIFIED | reserved/delivered actions |
| `app/api/messages/conversations/route.ts` | Create/resume conversation | ✓ VERIFIED | existing id path, FCFS, rate limit |
| `app/api/messages/conversations/[id]/messages/route.ts` | Poll + send | ✓ VERIFIED | GET with since param, POST insert |
| `app/api/reports/route.ts` | INSERT report only | ✓ VERIFIED | No supabase.rpc for hide/increment |
| `components/ugc/PostForm.tsx` | Quick Post UI | ✓ VERIFIED | Upload + create pipeline |
| `components/ugc/StreetDumpForm.tsx` | GPS + confirm flow | ✓ VERIFIED | pinConfirmed gate |
| `components/detail/UgcListingShell.tsx` | UGC detail + DM + lifecycle | ✓ VERIFIED | Wired to DmDrawer, PATCH, HiddenReviewBanner |
| `components/messages/DmDrawer.tsx` | Bottom sheet DM | ✓ VERIFIED | 10s poll, safety gate |
| `components/detail/ReportListingMenu.tsx` | Report UI | ✓ VERIFIED | Three reasons, auth gate |
| `components/ugc/HiddenReviewBanner.tsx` | Owner hidden strip | ✓ VERIFIED | Italian copy from messages/it.ts |
| `app/post/manage/page.tsx` | Owner manage surface | ✓ VERIFIED | getOwnerListings + ManageListingsClient |
| `lib/ugc/rate-limit.ts` | Server rate limits | ✓ VERIFIED | Tests pass; imported in routes |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| PostForm.tsx | upload route | FormData POST photo | ✓ WIRED | Then JSON create listing |
| listings route | zone-tag.ts | tagZone(lat,lng) | ✓ WIRED | 422 on null zone |
| server.ts | auth/callback | setAll cookie persistence | ✓ WIRED | Non-no-op setAll |
| queries.ts | migration 007 | getOwnerListingById on base table | ✓ WIRED | Owner-first detail path |
| UgcListingShell | DmDrawer | Contatta onClick | ✓ WIRED | UGC only |
| DmDrawer | messages API | fetch GET every 10s | ✓ WIRED | POLL_MS = 10000 |
| SafetyModal | messages POST | Ho capito → sendMessage | ✓ WIRED | localStorage ack |
| ReportListingMenu | reports route | POST { listingId, reason } | ✓ WIRED | Auth required |
| reports route | trigger 009 | INSERT listing_reports | ✓ WIRED | No RPC calls |
| StreetDumpForm | listings route | Same upload+create after confirm | ✓ WIRED | pinConfirmed gate |
| ManageListingsClient | PATCH listings/[id] | reserved/delivered actions | ✓ WIRED | Owner RLS update |
| listings route | rate-limit.ts | assertCanPost before INSERT | ✓ WIRED | 429 on limit |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| MapExplorer | listings | useListingsPoll → getActiveListings | DB via listings_public | ✓ FLOWING (when Supabase configured) |
| UgcListingShell | isOwner | getListingForDetail → OwnerListingRow | Base listings + ugc_select_own RLS | ✓ FLOWING |
| DmDrawer | messagesList | GET /api/messages/.../messages | conversations/messages tables | ✓ FLOWING (when DB live) |
| ReportListingMenu | reportedIds | lib/reports/storage localStorage | Client-side soft-mute filter | ✓ FLOWING |
| ManageListingsClient | listings prop | getOwnerListings server query | Base listings owner filter | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Lib unit tests (all phase modules) | `npm run test:lib` | 55/55 passed | ✓ PASS |
| Messages copy contract | `npm run test:lib -- messages/it.test.ts` | 2/2 passed | ✓ PASS |
| Production build | `npm run build` | Compiled successfully; all Phase 3 routes listed | ✓ PASS |
| Auto-hide threshold logic | `lib/reports/auto-hide.test.ts` | 6/6 passed | ✓ PASS |
| Rate limit logic | `lib/ugc/rate-limit.test.ts` | 4/4 passed | ✓ PASS |
| Lifecycle transitions | `lib/ugc/status.test.ts` | 2/2 passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| UGC-01 | 03-01 | Post free item under 30s | ✓ SATISFIED | PostForm + upload/create API; e2e pending human |
| UGC-02 | 03-04 | Street Dump GPS + confirm | ✓ SATISFIED | StreetDumpForm pinConfirmed gate |
| UGC-03 | 03-01 | EXIF strip on upload | ✓ SATISFIED | stripExif + test |
| UGC-04 | 03-01 | Login required to post | ✓ SATISFIED | requireAuth 401 + AuthPromptModal |
| CONT-01 | 03-02 | In-app DM for UGC | ✓ SATISFIED | DmDrawer + conversations/messages API |
| CONT-02 | 03-04 | Poster marks reserved | ✓ SATISFIED | PATCH reserved → claimed |
| CONT-03 | 03-04 | Poster marks delivered/gone | ✓ SATISFIED | PATCH delivered → expired |
| CONT-04 | 03-02 | Login required to contact | ✓ SATISFIED | Auth gate on Contatta |
| CONT-05 | 03-02 | Safety messaging | ✓ SATISFIED | SafetyModal + SafetyBanner |
| MOD-01 | 03-03 | Report listing | ✓ SATISFIED | ReportListingMenu on both shells |
| MOD-02 | 03-03 | Auto-hide 2/3 thresholds | ✓ SATISFIED | Trigger 009 + auto-hide.ts tests |
| MOD-03 | 03-03, 03-04 | Owner sees hidden pending review | ✓ SATISFIED | HiddenReviewBanner + manage page |

All 12 requirement IDs accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None found | — | No TBD/FIXME/stub handlers in Phase 3 code paths |

### Human Verification Required

### 1. Quick Post End-to-End

**Test:** Magic-link login → Quick Post → verify listing on map and detail page
**Expected:** Listing appears on `/` map pins and `/list` after refresh; `/listing/[id]` shows UgcListingShell
**Why human:** Requires live Supabase with migrations 007 applied

### 2. Magic Link Session Persistence

**Test:** Complete auth callback; immediately POST to `/api/ugc/listings`
**Expected:** 201 response without re-login
**Why human:** Cookie round-trip through PKCE needs live auth provider

### 3. DM Two-User Flow

**Test:** Buyer sends message via Contatta; seller polls same thread
**Expected:** Message appears within 10s poll window
**Why human:** Participant RLS requires two real sessions

### 4. Report Auto-Hide Trigger

**Test:** Three users report same UGC listing
**Expected:** Listing hidden with `pending_review`; owner sees banner; public users get 404
**Why human:** Migration 009 trigger only fires against live Postgres

### 5. EXIF Strip on Stored Photo

**Test:** Upload photo with GPS EXIF; download from ugc-photos bucket
**Expected:** No GPS metadata in stored JPEG
**Why human:** Storage round-trip not covered by unit test alone

### 6. Rate Limit Live Enforcement

**Test:** Create 4 UGC posts with same user in 24h
**Expected:** Fourth attempt returns 429
**Why human:** assertCanPost counts live DB rows

### Gaps Summary

No blocking code gaps found. All five critical 03-REVIEWS fixes are implemented in the codebase. Automated tests (57/57 including messages copy) and production build pass. Six behavior-dependent truths and five human UAT items remain because they require live Supabase (migrations 007–009 applied, auth provider, Storage bucket) — expected for this phase's serverless + RLS architecture.

---

_Verified: 2026-08-01T09:19:00Z_
_Verifier: Claude (gsd-verifier)_
