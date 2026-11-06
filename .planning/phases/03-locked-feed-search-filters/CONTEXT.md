# Phase 3 — Locked feed: search and filters stay usable (PROPOSAL P10)

## Goal

On the locked home feed, search and filters must still change the **real** count and the **blurred real photos**. Lock only listing detail and favorites. No fake counts. No listing payload (ids, titles, links) in the locked DOM.

## Current behaviour (verified in code)

- `AppChrome` already renders `FeedHeaderRow` (search, filter sheet, location) on `/` for locked users. The header is a sibling of `app-main`, so search is not covered by the lock overlay.
- `app/page.tsx` locked branch renders static `LockedFeed` from `getLockedTeaser()` (RPC, else rows fallback). It does **not** read `FeedFilterContext` or `searchQuery`.
- Changing search/filters therefore does nothing to the count or photos.
- Photos are `pointer-events-none`; there are no `/listing/` links. Detail (`app/listing/[id]`) and favorites (`app/favorites`) already render `LockedPanel`.
- Teaser RPC (`listings_paywall_teaser`) only filters by city. Category + search + 7-day counts need migration 045, which is **out of scope**. Until 044, `listings_public` rows are readable and can be filtered client-side (same as onboarding P5–P6). After 044, rows are empty for non-subscribers: keep the SSR teaser and do not invent a filtered count.

## Decisions

- Client-side: fetch rows when the public env exists; `composeFeedListings` (search → radius → city → categories); `teaserFromListings` for count + photos.
- If rows are empty but the SSR teaser has a count > 0 (044 / missing env), keep the SSR teaser. Never show a fake filtered number.
- Unfiltered: prefer the SSR/RPC total count; photos from rows when present.
- Filtered: count = filtered row length (honest, derived from real rows).
- Do not render listing links, titles, or ids. Do not unlock detail or favorites.
- Stitch: existing LockedFeed tokens (rounded-2xl photos, no shadows, outline-variant card, 240 ms motion / reduced motion). No Stitch API.

## Files

- `lib/paywall/locked-feed.ts` (new, pure)
- `components/onboarding/useLockedFeedTeaser.ts` (new)
- `components/onboarding/LockedViews.tsx`
- tests + `drive.mjs` onboarding checks
