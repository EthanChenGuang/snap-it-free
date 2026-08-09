---
phase: 03-ugc-posting-community-marketplace
reviewed: 2026-08-01T09:16:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - supabase/migrations/007_ugc_messaging_reports.sql
  - supabase/migrations/008_messaging_fcfs.sql
  - supabase/migrations/009_report_auto_hide_trigger.sql
  - app/api/ugc/upload/route.ts
  - app/api/ugc/listings/route.ts
  - app/api/ugc/listings/[id]/route.ts
  - app/api/reports/route.ts
  - app/api/messages/conversations/route.ts
  - app/api/messages/conversations/[id]/messages/route.ts
  - app/auth/callback/route.ts
  - lib/geo/zone-tag.ts
  - lib/supabase/auth.ts
  - lib/supabase/server.ts
  - lib/ugc/exif-strip.ts
  - lib/ugc/schemas.ts
  - lib/ugc/status.ts
  - lib/ugc/rate-limit.ts
  - lib/messages/schemas.ts
  - lib/reports/schemas.ts
  - lib/reports/auto-hide.ts
  - lib/reports/storage.ts
  - lib/listings/queries.ts
  - lib/listings/filters.ts
  - app/listing/[id]/page.tsx
  - app/post/page.tsx
  - app/post/manage/page.tsx
  - components/ugc/PostForm.tsx
  - components/ugc/PostPageClient.tsx
  - components/ugc/StreetDumpForm.tsx
  - components/ugc/StreetDumpPinMap.tsx
  - components/ugc/ManageListingsClient.tsx
  - components/ugc/AuthPromptModal.tsx
  - components/ugc/HiddenReviewBanner.tsx
  - components/detail/UgcListingShell.tsx
  - components/detail/DetailTopBar.tsx
  - components/detail/DetailOverflowMenu.tsx
  - components/detail/ReportListingMenu.tsx
  - components/messages/DmDrawer.tsx
  - components/messages/SafetyModal.tsx
  - components/messages/SafetyBanner.tsx
  - components/map/MapExplorer.tsx
  - components/listings/ListPageClient.tsx
  - components/listings/ListingPopup.tsx
findings:
  critical: 4
  warning: 5
  info: 2
  total: 11
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-01T09:16:00Z  
**Depth:** standard  
**Files Reviewed:** 43  
**Status:** issues_found

## Summary

Phase 03 delivers UGC posting, messaging, reporting, and lifecycle management with a consistent Route Handler + Zod + RLS pattern matching Phase 2. The report auto-hide trigger design (INSERT-only route, REVOKE on trigger function, no RPC grants) is sound. EXIF stripping via sharp re-encode is correct.

However, several **RLS policies are too permissive** for a Supabase client that exposes the anon key: authenticated users can bypass server-side rate limits, geo validation, and moderation fields via direct PostgREST calls. FCFS has a concurrency race, and conversation insert RLS does not bind `seller_user_id` to the listing owner. These must be fixed before shipping.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Owner can unhide listings and reset report counts via direct UPDATE

**File:** `supabase/migrations/007_ugc_messaging_reports.sql:45-48`  
**Issue:** `ugc_update_own` grants UPDATE on all columns when `owner_user_id = auth.uid()`, with no restriction on `status`, `report_count`, or `hidden_reason`. Any authenticated owner can call Supabase client directly to set `status = 'active'`, `report_count = 0`, or clear `hidden_reason`, bypassing the auto-hide trigger and PATCH route lifecycle guards.  
**Fix:**

```sql
-- Replace permissive update policy with column-scoped check or use a BEFORE UPDATE trigger
create or replace function public.enforce_ugc_owner_update()
returns trigger language plpgsql as $$
begin
  if new.report_count is distinct from old.report_count
     or new.hidden_reason is distinct from old.hidden_reason
     or (old.status = 'hidden' and new.status <> old.status)
  then
    raise exception 'Moderation fields are server-managed';
  end if;
  return new;
end;
$$;

create trigger ugc_owner_update_guard
  before update on public.listings
  for each row
  when (old.source = 'ugc' and old.owner_user_id = auth.uid())
  execute function public.enforce_ugc_owner_update();
```

Alternatively, revoke direct UPDATE and route all mutations through service-role Route Handlers.

### CR-02: Rate limits and geo validation bypass via direct INSERT

**File:** `supabase/migrations/007_ugc_messaging_reports.sql:38-43`, `lib/ugc/rate-limit.ts:18-37`  
**Issue:** `ugc_insert_own` only checks `source = 'ugc'` and `owner_user_id = auth.uid()`. Rate limiting (`assertCanPost`) and Venice bounds/zone tagging run only in the Route Handler. An authenticated user can insert listings directly via PostgREST, exceeding 3 posts/day and placing pins outside Venice with null/wrong zones.  
**Fix:** Tighten RLS `WITH CHECK` to enforce zone IS NOT NULL and lat/lng within Venice bounds, and add a SECURITY DEFINER rate-limit function called from a BEFORE INSERT trigger (mirroring server-side count logic).

### CR-03: Conversation insert RLS does not validate seller_user_id

**File:** `supabase/migrations/007_ugc_messaging_reports.sql:60-62`  
**Issue:** `conversation_insert_buyer` only verifies `buyer_user_id = auth.uid()`. A client can insert a row with an arbitrary `seller_user_id`, granting unintended users read access to the conversation thread via `conversation_select_participant`.  
**Fix:**

```sql
create policy "conversation_insert_buyer"
  on public.conversations for insert to authenticated
  with check (
    buyer_user_id = auth.uid()
    and seller_user_id = (
      select l.owner_user_id from public.listings l
      where l.id = listing_id and l.source = 'ugc'
    )
  );
```

### CR-04: FCFS race allows multiple writable buyer conversations

**File:** `app/api/messages/conversations/route.ts:60-90`, `supabase/migrations/007_ugc_messaging_reports.sql:16`  
**Issue:** FCFS is checked with a read-then-insert pattern. The unique constraint is `(listing_id, buyer_user_id)`, not one conversation per listing. Two buyers racing concurrently can both pass `listing_has_other_buyer_conversation`, both insert, and both receive writable threads — violating FCFS (CONT-03).  
**Fix:** Add a partial unique index or serialized creation path:

```sql
-- Option A: one active conversation per listing (strongest FCFS)
create unique index conversations_one_per_listing
  on public.conversations (listing_id);
```

Or wrap FCFS check + insert in a serializable transaction / advisory lock in the Route Handler.

## Warnings

### WR-01: Auth callback `next` parameter is not validated

**File:** `app/auth/callback/route.ts:7-13`  
**Issue:** The `next` query param is concatenated onto `origin` without validation. Values like `//evil.com` or encoded variants can produce open-redirect behavior after magic-link login.  
**Fix:**

```typescript
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/post';
  return raw;
}
const next = safeNextPath(searchParams.get('next'));
```

### WR-02: Listing create accepts arbitrary photoUrl not tied to upload

**File:** `lib/ugc/schemas.ts:5`, `app/api/ugc/listings/route.ts:33-62`  
**Issue:** `CreateListingSchema` accepts any valid URL. Clients can skip `/api/ugc/upload` and attach third-party or another user's `ugc-photos` URL, bypassing EXIF strip and storage ownership checks.  
**Fix:** Validate `photoUrl` hostname/path against the Supabase storage bucket and require prefix `{userId}/`:

```typescript
const photoUrlSchema = z.string().url().refine(
  (url) => url.includes(`/ugc-photos/${user.id}/`),
  { message: 'Photo must be uploaded via /api/ugc/upload' },
);
```

### WR-03: Lifecycle PATCH does not guard current status

**File:** `app/api/ugc/listings/[id]/route.ts:40-52`, `lib/ugc/status.ts:6-16`  
**Issue:** PATCH applies `reserved` or `delivered` transitions without checking current `status`. Owners can re-reserve an already-claimed listing or mark an expired listing delivered via repeated PATCH calls. RLS also permits these transitions directly.  
**Fix:** Add status preconditions in the Route Handler (e.g., `reserved` only from `active`, `delivered` from `active` or `claimed`) and mirror them in RLS or a trigger.

### WR-04: `openDm=1` persists in URL and reopens drawer on refresh

**File:** `components/detail/UgcListingShell.tsx:64-68, 88-94`  
**Issue:** After magic-link auth redirect, `?openDm=1` remains in the URL. Refreshing or revisiting the listing reopens the DM drawer automatically because the effect fires whenever `isLoggedIn` is true.  
**Fix:** Clear the query param after opening (e.g., `router.replace` without `openDm`) or gate on a session-scoped flag.

### WR-05: Upload route has no error handling around stripExif

**File:** `app/api/ugc/upload/route.ts:28-29`  
**Issue:** Corrupt or non-image payloads that pass MIME checks can cause `sharp()` to throw, producing an unhandled 500 instead of a controlled 400 response.  
**Fix:**

```typescript
let clean: Buffer;
try {
  clean = await stripExif(inputBuffer);
} catch {
  return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
}
```

## Info

### IN-01: Reporters can report their own listings

**File:** `app/api/reports/route.ts:27-31`  
**Issue:** No server-side check prevents `owner_user_id === reporter_user_id`. A single self-report adds 1 to `report_count` (below UGC threshold of 3) but is unnecessary noise.  
**Fix:** Reject with 422 if the reporter owns the listing (query `listings.owner_user_id` before insert).

### IN-02: Report on missing listing returns opaque 500

**File:** `app/api/reports/route.ts:33-37`  
**Issue:** Invalid `listingId` hits the FK constraint and surfaces `insertError.message` as 500. A 404/422 would match Phase 2 error-shape conventions.  
**Fix:** Map FK violation (`23503`) to `{ error: 'Listing not found' }` with status 404.

---

_Reviewed: 2026-08-01T09:16:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
