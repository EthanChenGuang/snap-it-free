---
quick_id: 260805-r3k
status: complete
---

# Summary: Shrink the root layout chunk so it stops being truncated

## Result

`app/layout.js` (dev): **5,078,157 → 2,389,989 bytes (-53%)**, with the Supabase SDK
fully removed from the root layout graph (`@supabase/realtime-js` and
`@supabase/auth-js` occurrences: 43/55 → 0/0).

## What was actually wrong

Not the map — it renders correctly in every clean load. The dev server was
truncating the root layout chunk mid-transfer:

```
Content-Length: 5067615  →  body closed at ~2,424,832 bytes
```

Reproducible with plain `curl`. The browser then threw
`SyntaxError: Invalid or unexpected token` at `layout.js:809` (HTTP 200, correct
MIME — not a 404). Since that is the *root layout* chunk, React never hydrated, so
`next/dynamic` stayed on its loading fallback (`地图加载中…`) permanently while the
renderer spun at 100% CPU. No error boundary can catch this: hydration never starts.

## Fix

Moved every Supabase-dependent unit in the root layout behind a chunk boundary.

A bare `import()` does **not** split in Next's dev webpack build (measured — chunk
stayed at ~5 MB). `next/dynamic` **does**, so the component-level splits use it; the
one non-component call site uses `import()` inside an already-async path.

- `FavoritesMergeProvider` → renders `children` plus a `next/dynamic`
  `FavoritesMergeEffect` (new, headless) that runs `useMergeFavoritesOnLogin`
- `BottomNav` → unread badge extracted to a `next/dynamic` `UnreadMatchBadge` (new);
  nav markup and layout unchanged
- `PwaOnboardingProvider` → context stays static (consumers throw without it); only
  the `useAuthSession`-dependent auto-open effect moved to a `next/dynamic`
  `IosGuideAutoOpen` (new)
- `lib/user/locale-client.ts` → `createClient` imported inside the async
  fire-and-forget `syncLocaleToServer`. This was the last static path and the one
  actually pinning Supabase into the layout chunk.

## Verification

- Raw chunk transfer: 5/5 complete at 2,389,989 bytes (previously the first request
  in each batch truncated at a 64 KB boundary)
- Normal loads: 6/6 render the map (canvas + markers)
- Rebuild-during-load race (the deterministic repro that previously failed on the
  first attempt every time): 3/4 then 3/3 pass, with no `scriptFailedToParse` — the
  probe had previously logged a layout.js parse failure even on runs that rendered
- Routes `/`, `/list`, `/post`, `/settings` all render with zero page errors;
  `/settings` confirms `usePwaOnboarding()` still resolves
- `tsc --noEmit`: no errors in touched files (pre-existing failures in
  `scraper-admin/*` and `lib/i18n/listing-fields.test.ts` are unrelated and unchanged)

## Honest caveat

This is a **mitigation, not an elimination**. The upstream defect is the dev server
truncating large static responses; halving the chunk makes the window far harder to
hit but does not remove it. Turbopack would likely avoid it entirely but is ruled out
by locked decision D-13 (MapLibre/Serwist require `--webpack`).

If it ever recurs: hard-reload with an empty cache, and avoid saving files while a
page is mid-load.

## Files changed

- `components/providers/FavoritesMergeProvider.tsx`
- `components/providers/FavoritesMergeEffect.tsx` (new)
- `components/shell/BottomNav.tsx`
- `components/shell/UnreadMatchBadge.tsx` (new)
- `components/providers/PwaOnboardingProvider.tsx`
- `components/pwa/IosGuideAutoOpen.tsx` (new)
- `lib/user/locale-client.ts`
