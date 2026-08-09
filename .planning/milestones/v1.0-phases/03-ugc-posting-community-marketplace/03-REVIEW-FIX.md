---
phase: 03-ugc-posting-community-marketplace
fixed_at: 2026-08-01T12:10:00Z
review_path: .planning/phases/03-ugc-posting-community-marketplace/03-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-01T12:10:00Z  
**Source review:** `.planning/phases/03-ugc-posting-community-marketplace/03-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: Owner can unhide listings and reset report counts via direct UPDATE

**Files modified:** `supabase/migrations/011_ugc_owner_update_guard.sql`  
**Commit:** cc21eb0  
**Applied fix:** Added `enforce_ugc_owner_update` BEFORE UPDATE trigger blocking owner mutations of `report_count`, `hidden_reason`, and un-hiding from `hidden` status.

### CR-02: Rate limits and geo validation bypass via direct INSERT

**Files modified:** `supabase/migrations/012_ugc_insert_hardening.sql`  
**Commit:** c175066  
**Applied fix:** Tightened `ugc_insert_own` RLS to require non-null zone and Venice lat/lng bounds; added `enforce_ugc_post_rate_limit` BEFORE INSERT trigger (3 posts / 24h).

### CR-03: Conversation insert RLS does not validate seller_user_id

**Files modified:** `supabase/migrations/013_conversation_insert_seller_check.sql`  
**Commit:** 35baafd  
**Applied fix:** Recreated `conversation_insert_buyer` policy to require `seller_user_id` matches the UGC listing owner.

### CR-04: FCFS race allows multiple writable buyer conversations

**Files modified:** `supabase/migrations/014_conversations_fcfs_unique.sql`, `app/api/messages/conversations/route.ts`  
**Commit:** 98f1654  
**Applied fix:** Added unique index on `conversations(listing_id)`; route handler returns `readOnly: true` on unique-violation when another buyer owns the thread.

### WR-01: Auth callback `next` parameter is not validated

**Files modified:** `app/auth/callback/route.ts`  
**Commit:** a1889d9  
**Applied fix:** Added `safeNextPath()` to reject open-redirect patterns (`//`, non-relative paths).

### WR-02: Listing create accepts arbitrary photoUrl not tied to upload

**Files modified:** `lib/ugc/schemas.ts`, `app/api/ugc/listings/route.ts`  
**Commit:** 6145cf8  
**Applied fix:** Added `createListingSchemaForUser()` requiring `photoUrl` path prefix `/ugc-photos/{userId}/`.

### WR-03: Lifecycle PATCH does not guard current status

**Files modified:** `lib/ugc/status.ts`, `app/api/ugc/listings/[id]/route.ts`, `supabase/migrations/015_ugc_status_transition_guard.sql`  
**Commit:** 7a2d755  
**Applied fix:** Route handler checks `canReserve`/`canDeliver` preconditions; DB trigger mirrors allowed transitions.

### WR-04: `openDm=1` persists in URL and reopens drawer on refresh

**Files modified:** `components/detail/UgcListingShell.tsx`  
**Commit:** 1791bd2  
**Applied fix:** Clears `openDm` query param via `router.replace` after opening DM drawer post-auth.

### WR-05: Upload route has no error handling around stripExif

**Files modified:** `app/api/ugc/upload/route.ts`  
**Commit:** ed95de4  
**Applied fix:** Wrapped `stripExif` in try/catch returning 400 `Invalid image` on failure.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-08-01T12:10:00Z_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
