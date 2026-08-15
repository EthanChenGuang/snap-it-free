---
status: complete
slug: post-form-draft-persist
started: 2026-08-11T08:09:00Z
completed: 2026-08-11T08:19:00Z
---

# Quick Task: Post Form Draft Persistence + Post Fixes

## Problem

1. Navigating to `/select-location?context=post` and back wiped photo, title, and description (D-12).
2. Posting failed with generic "Could not publish" when pickup was outside Venice (e.g. Padova).

## Solution

- Extended `shoumanwu_post_draft` sessionStorage to hold title, description, category, condition, and photo (data URL, ≤3MB).
- `mergePostDraft` merges partial updates; location confirm no longer overwrites form fields; empty strings never clobber saved text.
- `PostForm` persists on change after hydration; clears draft on successful submit.
- Venice-only UGC validation at picker confirm and submit with clear `pinOutsideVenice` message.

## Verification

- `lib/post-draft/storage.test.ts` — 13/13 pass
- Playwright round-trip: title + description survive location confirm ✓
- Production build green

## Files

- `lib/post-draft/storage.ts`
- `lib/post-draft/storage.test.ts`
- `components/ugc/PostForm.tsx`
- `components/map/SelectLocationClient.tsx`
- `lib/ugc/schemas.ts` (Venice bounds helper from prior fix)
