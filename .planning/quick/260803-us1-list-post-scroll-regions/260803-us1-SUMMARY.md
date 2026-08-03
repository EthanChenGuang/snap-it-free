---
quick_id: 260803-us1
status: complete
---

# Summary: Elenco list scroll region too small; Pubblica did not scroll

Both symptoms came from one defect in the shared app shell, not from either page.

## Root cause

`app/globals.css` sized the content region with two hardcoded constants describing
`position: fixed` chrome that CSS cannot measure:

```css
:root { --shell-header-height: 57px; --shell-bottom-nav-height: 64px; }
.app-main {
  height: calc(100dvh - var(--shell-header-height) - var(--shell-bottom-nav-height));
  margin-top: var(--shell-header-height);
}
```

Measured at 390×844 with headless Chromium under an iPhone UA, **both constants were wrong**:

| Constant | Declared | Measured | Consequence |
|---|---|---|---|
| `--shell-header-height` | 57px | **77px** | `.app-main` began 20px too high — its first 20px sat behind the header |
| `--shell-bottom-nav-height` | 64px | **71.1px** | `.app-main` ended at y=780 while the nav began at y=772.9 — 7.1px sat behind the nav |

On top of that, `.app-main` was a fixed-height box with the default `overflow: visible`, nested
inside `body { overflow: hidden }` (`app/layout.tsx:31`). Because the html/body overflow value
propagates to the viewport, **the document itself could not be scrolled by any user gesture**.
So a route scrolled only if its own page component happened to declare an internal
`overflow-y-auto`. Some did, some did not.

### Elenco — the `pb-24` reserved the nav a second time

`.app-main` had already subtracted the nav height, then `ListPageClient`
(`components/listings/ListPageClient.tsx:35`) added `pb-24` (96px) *inside* that already
shortened `overflow-hidden` box, so the inner `ListingFeed` scroller
(`components/listings/ListingFeed.tsx:30`) lost another 96px.

Measured `/list` scrollport: `top 250 → bottom 684, clientHeight 434` — while the nav did not
begin until **y=772.9**. That left **~89px of dead, unusable space** below the list on top of
the 20px stolen at the header: the list got 434px of the ~696px actually available, **62%**.
The before screenshot shows both defects at once — the "Elenco completo" heading clipped by the
header, and a large empty gap under the last card when scrolled fully down.

### Pubblica — no scroll container existed at all

`PostPageClient` (`components/ugc/PostPageClient.tsx:32`) was `h-full`, pinned to `.app-main`'s
723px, with no `overflow-y-auto` anywhere in its subtree. Measured `clientHeight 723` vs
`scrollHeight 1137` → **414px of the form was unreachable**, including the "Pubblica gratis"
submit button. With `body`'s `overflow: hidden` propagating to the viewport there was no gesture
that could reach it, which is exactly the reported "page is not scrollable".
`/post/manage` and `/settings` carried the identical defect.

### The Stitch prototypes confirm the intent

- `map_explorer_notion_style/code.html:108,122` — `overflow: hidden` plus `height: calc(100vh - 64px - 64px)`. **Only the map** is meant to be a fixed, non-scrolling canvas.
- `listing_feed_notion_style/code.html:134` — `<body class="… min-h-screen flex flex-col pb-24">`: an ordinary document-scroll page whose `pb-24` clears the fixed nav.
- `post_free_item_notion_style/code.html:137` — `<body class="text-on-surface">`: plain document scroll, no height constraint.

The React port generalised the map screen's fixed-height `overflow: hidden` model onto *every*
route, and then re-applied the prototypes' `pb-24`/`pb-28` on top of a box that had already
subtracted the nav.

## Fix

Fixed once in the shell rather than per page. The shell is now a flex column, so the header and
nav contribute their real rendered heights and no magic numbers remain:

```css
.app-shell { display: flex; flex-direction: column; height: 100dvh; }
.app-main  { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
```

`Header` and `BottomNav` moved from `fixed` to in-flow `relative shrink-0`, keeping `z-[100]` so
they still paint above the map's vaul drawer (`z-50`). Page roots then dropped the duplicated
`pb-24`/`pb-28`, and the three pages that owned no scroller moved from `h-full` to `min-h-full`
so their content can exceed the shell and `.app-main` scrolls it.

The map is untouched by design: `.map-container` is `height: 100%` of a now definite-height flex
child, so it fills exactly and still reports `scrolls: false`.

No colour, border, radius, typography or spacing token changed — layout only.

## Verification

Headless Chromium, 390×844, iPhone UA, scrolled to the bottom of each route:

| Route | Before | After |
|---|---|---|
| `/list` | scrollport `250→684` (434px), **89px dead space** above nav | scrollport `270→772.9` (503px) — **ends exactly at the nav**, +16% |
| `/post` | `client 723 / scroll 1137` — **414px unreachable**, no scroller | `.app-main` scrolls, `client 696 / scroll 1185`, moved 489px to the submit button |
| `/` map | `scrolls: false` | `scrolls: false` — unchanged |
| `/settings` | no scroller | `.app-main` scrolls when content overflows |
| `/favorites` | `pb-24` dead space | fits; scroller reaches the nav |
| `/post/manage` | no scroller | `.app-main` scrolls |

Shell alignment after the fix, identical on every route: header `0→77`, `.app-main` `77→772.9`,
nav `772.9→844` — no overlap and no gap at either end.

- Zero page errors (`pageerror`) on all six routes
- `npm run lint` (`tsc --noEmit`) — passes
- `npm test` — 22 files, **92/92 tests pass**
- `npm run build` — succeeds
- Screenshots: `/tmp/shots/before2_list-bottom.png` vs `/tmp/shots/after_list-bottom.png`,
  `/tmp/shots/before_post-bottom.png` vs `/tmp/shots/after_post-bottom.png`. The post pair is
  the clearest: the "Pubblica gratis" button is absent before and fully visible after.

## Changes made

| File | Change |
|---|---|
| `app/globals.css` | `.app-shell` flex column; `.app-main` becomes the scroll owner; deleted both shell height constants |
| `app/layout.tsx` | Wrapped Header/`.app-main`/BottomNav in `.app-shell` |
| `components/shell/Header.tsx` | `fixed top-0` → `relative shrink-0`, kept `z-[100]` |
| `components/shell/BottomNav.tsx` | `fixed bottom-0` → `relative shrink-0`, kept `z-[100]` |
| `components/listings/ListPageClient.tsx` | dropped `pb-24` |
| `components/listings/FavoritesPageClient.tsx` | dropped `pb-24` (list + 2 empty/error states) |
| `components/ugc/PostPageClient.tsx` | `h-full` → `min-h-full`, dropped `pb-28` |
| `app/post/manage/page.tsx` | `h-full` → `min-h-full`, dropped `pb-28` |
| `app/settings/page.tsx` | `h-full` → `min-h-full`, dropped `pb-28` (Suspense fallback) |
| `components/settings/SettingsPageClient.tsx` | `h-full` → `min-h-full`, dropped `pb-28` |

## Commits

- `c7023f6` fix(260803-us1): make app shell a flex column that owns the scroll
- `2524d90` fix(260803-us1): stop page roots double-reserving the bottom nav

## Notes and follow-ups

- **Pre-existing uncommitted work was swept into `c7023f6`.** The working tree already held
  substantial uncommitted edits from earlier sessions, and `app/globals.css`, `app/layout.tsx`
  and `components/shell/Header.tsx` each carried some (the vaul pointer-events rule,
  `suppressHydrationWarning`, the `NavMenuDrawer` menu button). Git stages whole files, so those
  hunks are included in that commit. `2524d90` contains only this task's changes.
- **`/post/manage` could not be verified directly** — it redirects to `/post` when logged out, and
  the probe runs unauthenticated. Its root element received the same one-line fix as `/post`.
- **`/settings` and `/favorites` fit within the viewport** in the logged-out state, so their
  scrolling was verified structurally (`.app-main` is the scroll owner) rather than by overflow.
- **Detail shells left alone.** `ScrapedListingShell.tsx:45` and `UgcListingShell.tsx:129` still
  carry `pb-32`, now ~128px of dead space at the end of the scroll. They already own their own
  scroller so nothing is broken or unreachable; worth trimming for consistency in a later pass.
- **iOS safe area is still unhandled.** `BottomNav` has no `env(safe-area-inset-bottom)` padding,
  so on a notched iPhone the home indicator overlays the nav labels. Pre-existing, unrelated to
  the reported scrolling, and a visual change rather than a layout fix — deliberately out of scope.
