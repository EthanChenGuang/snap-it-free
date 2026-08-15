---
phase: 13-select-location-flow
reviewed: 2026-08-10T21:20:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - lib/geo/resolve-city-label.ts
  - lib/post-draft/storage.ts
  - components/map/SelectLocationClient.tsx
  - components/map/SelectLocationMapPane.tsx
  - components/ugc/PostForm.tsx
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-08-10T21:20:00Z  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

Reviewed the five Phase 13 key files implementing the select-location flow: city-label resolution, post-draft session storage, map picker client/pane, and PostForm hydration. Core storage parsing, coordinate validation, and browse/post confirm branching are sound. No security vulnerabilities or crash paths were found in scope.

The main gaps are UX correctness: post context does not gate Venice-only placement before confirm, the post draft is never cleared after a successful submit (stale location bleeds into the next post), and the documented D-12 field-loss regression remains in `PostForm`. Supporting utilities (`resolve-city-label.ts`, `storage.ts`) are small and well-tested; issues concentrate in navigation lifecycle and post-flow validation.

## Warnings

### WR-01: Post draft persists after successful submit

**File:** `components/ugc/PostForm.tsx:173-175`  
**Issue:** After a listing is created successfully, nothing clears `shoumanwu_post_draft` from sessionStorage. The next visit to `/post` hydrates `lat`, `lng`, `cityLabel`, and `locationConfirmed: true` from the previous listing, so the user can unknowingly submit a new post at the old pickup location.  
**Fix:** Clear the draft on successful submit (and optionally on mount when starting a fresh post):

```typescript
import { readPostDraft, clearPostDraft } from '@/lib/post-draft/storage';

// In handleSubmit after router.push:
clearPostDraft();

// Add to lib/post-draft/storage.ts:
export function clearPostDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(POST_DRAFT_STORAGE_KEY);
}
```

### WR-02: Post context allows confirming pins outside Venice

**File:** `components/map/SelectLocationClient.tsx:168-179`  
**Issue:** In `context === 'post'`, `handleConfirm` writes any map coordinates to the draft without checking Venice zone membership. The server rejects out-of-zone coords with HTTP 422 (`tagZone` in `app/api/ugc/listings/route.ts`), but the user already passed the location gate (`locationConfirmed: true`) and only discovers the error at final submit.  
**Fix:** Before `writePostDraft`, validate the pin against Venice polygons (client-side GeoJSON check or a lightweight `/api/ugc/validate-pin` endpoint). Disable Confirm or show an inline error when `tagZone` would return null:

```typescript
// Pseudocode — reuse zone polygons client-side or via API
const zone = await validatePin(markerPosition.lat, markerPosition.lng);
if (!zone) {
  toast(messages.post.pinOutsideVenice);
  return;
}
writePostDraft({ lat, lng, label });
```

### WR-03: PostForm loses non-location fields on picker round trip (D-12)

**File:** `components/ugc/PostForm.tsx:75-83`, `components/map/SelectLocationClient.tsx:179`  
**Issue:** Navigating to `/select-location?context=post` and back via `router.push('/post')` unmounts `PostForm`, resetting `title`, `description`, `category`, `condition`, and `photoFile`. Only location fields round-trip via sessionStorage. This contradicts D-12 in phase context and is a real UX regression versus the pre-Phase-13 inline flow. Documented as open in `13-VALIDATION.md` but still unfixed.  
**Fix:** Persist non-photo form fields in sessionStorage alongside the location draft, lift form state to a layout-level provider, or enable Next.js `cacheComponents` so the post route tree survives navigation.

### WR-04: Bootstrap effect ignores `context` dependency

**File:** `components/map/SelectLocationClient.tsx:97-136`  
**Issue:** The mount `useEffect` reads `context` to choose between `readPostDraft()` and `readBrowseCenter()`, but `context` is omitted from the dependency array (eslint disabled). If `searchParams` change without a full remount (e.g. client-side navigation from `/select-location` to `/select-location?context=post`), the effect will not re-bootstrap and will keep marker state from the prior context's storage source.  
**Fix:** Add `context` to the dependency array and reset `gpsRequested`, `ready`, and marker state when context changes, or key the component on `context` to force remount:

```tsx
// In SelectLocationPageClient or parent:
<SelectLocationClient key={searchParams.get('context') ?? 'browse'} />
```

### WR-05: Locate-me failures are silently swallowed

**File:** `components/map/SelectLocationClient.tsx:163`  
**Issue:** `handleLocateMe` passes an empty error callback `() => {}` to `getCurrentPosition`. Permission denial, timeout, or unavailable GPS gives no feedback; the pin stays put with no aria-live update. Intentional per Plan 03 discretion, but degrades accessibility and debuggability.  
**Fix:** Surface a non-blocking toast or aria-live message on error:

```typescript
() => {
  toast(messages.selectLocation.locateMeFailed);
},
```

## Info

### IN-01: Photo preview object URLs are never revoked

**File:** `components/ugc/PostForm.tsx:85-88`  
**Issue:** Each call to `applyPhotoFile` creates a new object URL without revoking the previous one. Replacing photos repeatedly leaks blob URLs for the session.  
**Fix:** Revoke before replacing:

```typescript
const applyPhotoFile = (file: File) => {
  setPhotoPreview((prev) => {
    if (prev) URL.revokeObjectURL(prev);
    return URL.createObjectURL(file);
  });
  setPhotoFile(file);
};
```

### IN-02: SSR guard on writePostDraft returns incomplete shape

**File:** `lib/post-draft/storage.ts:46-47`  
**Issue:** When `window` is undefined, `writePostDraft` returns `draft as PostDraft` without `locationConfirmed: true`. Harmless today (only called from client event handlers), but misleading if reused from isomorphic code.  
**Fix:** Return a fully typed object:

```typescript
if (typeof window === 'undefined') {
  return { ...draft, locationConfirmed: true };
}
```

---

_Reviewed: 2026-08-10T21:20:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
