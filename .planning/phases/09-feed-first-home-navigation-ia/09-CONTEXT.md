# Phase 9: Feed-First Home & Navigation IA - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers the v2.0 information-architecture pivot: **grid feed at `/`**, **four-tab bottom navigation** (Home · Post · Favorites · Settings), **unified feed header row** (language + search + filter stub + location), and **select-location secondary flow** at `/select-location` (center pin + Confirm — not a browse-all-pins map). Legacy `/list` merges into `/`. Map-first `/` and hamburger `NavMenuDrawer` are retired from consumer shell.

Requirements in scope: NAV-01–04 (with documented overrides), HOME-01–03, I18N-01 (partial — new chrome strings only).

**Explicitly out of scope (later phases):** filter bottom sheet + active pills (Phase 10), polished grid cards FREE badge/heart/distance (Phase 11), favorites category folders (Phase 12), full Select Location for UGC post + filter radius (Phase 13 expands), settings DND/delete/restyle (Phase 14).

</domain>

<decisions>
## Implementation Decisions

### Requirement Overrides (user-directed)

- **D-01:** **Bottom nav is 4 tabs: Home · Post · Favorites · Settings** — supersedes milestone-locked NAV-02 ("Post via drawer only"). Post is a primary bottom tab with `add_box` icon. — **Reversibility:** costly — nav IA touches routes, i18n, E2E, and AppChrome.
- **D-02:** **Location button opens `/select-location`** (fixed center pin + bottom Confirm), not a browse-all-listings map. This satisfies NAV-03's "map secondary" intent via location-setting UX; browse-on-map pins are **not** Phase 9. — **Reversibility:** reversible — route and component choice.
- **D-03:** **Filter button visible but stubbed** — tap shows trilingual toast ("Filters coming soon"); no filter sheet until Phase 10 (HOME-02 filter control present, FILT-* deferred).

### Unified Feed Header (HOME-02)

- **D-04:** Replace consumer **Header** with a unified **HOME-02 search row** on feed home: `[locale chip] [search field] [filter icon] [location icon]` left-to-right.
- **D-05:** **Compact locale chip** at row start (中 / EN / IT); tap opens full language picker (reuse `HeaderLanguageDropdown` behavior).
- **D-06:** **Always-visible inline search** field (not icon-only toggle). Phase 9 search matches **title + description** (and location label if present on listing).
- **D-07:** **Remove hamburger menu** — retire `NavMenuDrawer` from consumer shell; no overflow drawer in Phase 9.
- **D-08:** **Scroll-away header** on feed — search row hides on scroll down, reappears on scroll up; bottom nav stays fixed.
- **D-09:** **Desktop:** search row uses `max-w-container-max` centered layout (same controls as mobile).
- **D-10:** **No app title in feed header** — branding only on Settings tab (see Settings chrome).
- **D-11:** **Remove inline category chips** from feed (`SubitoCategoryFilterChips` off home); category selection waits for Phase 10 filter sheet.
- **D-12:** **No active filter pills** on feed in Phase 9 (FILT-03 deferred).
- **D-13:** **Zone filters map-only** — Venice zone / Padova chips appear on `/select-location` only; feed shows all zones until Phase 10.

### Bottom Navigation (NAV-01)

- **D-14:** Tab order: **Home · Post · Favorites · Settings** with hrefs `/`, `/post`, `/favorites`, `/settings`.
- **D-15:** Home tab icon: **`grid_view`** (grid feed, not house).
- **D-16:** Active tab: **filled Material icon + bold `text-primary`** (Stitch accent — not Snag red pill).
- **D-17:** **UnreadMatchBadge stays on Settings tab** (current behavior).
- **D-18:** **Post tab:** navigate to full-page `/post`; **auth gate on tap** — logged-out users see sign-in prompt before post flow.

### Select Location Secondary Flow (`/select-location`)

- **D-19:** Route **`/select-location`** (not `/map`). Location (📍) button in header navigates here.
- **D-20:** **Fixed center pin** on MapLibre map; user pans map to position pin (select-location pattern). Bottom primary button **「Confirm location」** (zh: 确认位置 / en: Confirm location / it: Conferma posizione) returns to feed `/`.
- **D-21:** **Locate Me** control retained (recenter on browser geolocation).
- **D-22:** **Zone chips on select-location view** (Centro / Mestre / Lido + Padova filter).
- **D-23:** **Minimal chrome:** hide HOME-02 search row and **hide bottom nav** on `/select-location`.
- **D-24:** **Exit paths:** top-left back chevron **and** location button toggles off (returns to feed).
- **D-25:** **No bottom tab highlighted** while on `/select-location`.
- **D-26:** **Feed search does not apply** to select-location map (search is feed-only).
- **D-27:** **Confirm persists `{ lat, lng, label? }`** to browse-center state (React context + `localStorage` hydrate); **does not filter or sort feed** until Phase 10 radius/distance.
- **D-28:** **Refactor `MapExplorer`** — strip bottom sheet; reuse MapLibre pin rendering + zone chip patterns for select-location (planner discretion on file split).

### Route Migration (HOME-03, NAV-04)

- **D-29:** **`/` renders two-column mobile grid feed** (new feed home client — port from `ListPageClient` patterns).
- **D-30:** **`/list` → `/` permanent redirect** (Next.js redirect); remove List from all nav surfaces.
- **D-31:** **`/post`, `/favorites`, `/settings`, `/listing/[id]`, `/admin/*` unchanged** in routing shape; admin keeps separate chrome (no bottom nav).
- **D-32:** Accept v2 pivot: users who bookmarked map-first **`/`** now land on feed grid.

### Favorites Tab (interim — Phase 12 deferred)

- **D-33:** Favorites tab shows **restyled flat favorites** in **two-column grid** (not category folders yet).
- **D-34:** **Login gate** for anonymous users (current auth-gated favorites behavior).
- **D-35:** Favorites uses **simple title bar** (not HOME-02 search row).
- **D-36:** **No "folders coming soon" teaser**; Phase 12 adds folders silently.
- **D-37:** **Unfavorite toggle** on favorites grid cards (reuse `FavoriteButton`).

### Feed Grid Shell (HOME-01)

- **D-38:** Mobile **two-column grid** (`grid-cols-2` from default mobile breakpoint).
- **D-39:** Reuse **`ListListingCard`** as-is; Phase 11 polishes FREE badge / heart / distance metadata.
- **D-40:** Grid gap **`gap-space-md`** (16px).
- **D-41:** Sort **newest first** (`posted_at` descending — current query order).
- **D-42:** **Load all active listings** (no pagination/infinite scroll); reuse **`useListingsPoll`** + pull-to-refresh.
- **D-43:** **Stitch empty state** — bordered panel + icon + title/description (current `ListPageClient` pattern).

### Settings Chrome (Phase 14 content deferred)

- **D-44:** Phase 9 **nav chrome only** for Settings — page content restyle (DND, delete account) stays Phase 14.
- **D-45:** Settings shows **centered app title 「手慢无」** in title bar (only consumer screen with app name in header).
- **D-46:** **「Manage my posts」** link moves to Settings screen (replacing drawer entry).

### Internationalization (I18N-01 partial)

- **D-47:** New nav labels in **zh / en / it**: Home / Post / Favorites / Settings (zh: 首页 / 发布 / 收藏 / 设置).
- **D-48:** Trilingual **filter stub toast**, **Confirm location** button, and all new header chrome strings.

### Claude's Discretion

- Bottom nav active-state micro-interactions (within D-16 Stitch filled + bold constraint).
- Exact `localStorage` key name for browse center (e.g. `shoumanwu_browse_center`).
- Pull-to-refresh vs poll-only emphasis (prefer keeping both if already wired on list).
- `MapExplorer` refactor file layout (`SelectLocationClient` vs trimmed explorer).
- Post tab `add_box` icon sizing to match Stitch density.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 milestone goals; note D-01 overrides Post-via-drawer table row
- `.planning/REQUIREMENTS.md` — NAV-01–04, HOME-01–03, I18N-01 traceability
- `.planning/ROADMAP.md` — Phase 9 goal, success criteria, v1→v2 route mapping table
- `.planning/STATE.md` — current phase pointer

### Design Authority (mandatory for UI)
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens, typography, monochrome rules
- `.planning/google-stitch-ui-design/listing_feed_notion_style/code.html` — feed grid + search row reference
- `.planning/google-stitch-ui-design/map_explorer_notion_style/code.html` — map chrome reference (adapt for select-location, strip bottom sheet)

### v1 Phase Context (patterns to port / retire)
- `.planning/milestones/v1.0-phases/02-map-list-core-browsing/02-CONTEXT.md` — map-first decisions being inverted (D-27, D-30); MapLibre + zone chip patterns to reuse
- `.planning/milestones/v1.0-phases/02-map-list-core-browsing/02-UI-SPEC.md` — Stitch component rules

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — Next.js `app/` routes, component locations
- `.planning/codebase/CONVENTIONS.md` — i18n, Stitch styling patterns
- `.planning/codebase/STACK.md` — Next.js App Router stack

### Implementation Touchpoints
- `components/shell/AppChrome.tsx` — header + bottom nav shell
- `components/shell/BottomNav.tsx` — current 4-tab map/list/post/settings (to restructure)
- `components/shell/Header.tsx` — current header (to replace on feed)
- `components/listings/ListPageClient.tsx` — feed grid + search patterns to port to `/`
- `components/map/MapExplorer.tsx` — map + sheet to refactor for `/select-location`
- `app/page.tsx` — currently map home (swap to feed)
- `app/list/page.tsx` — redirect target
- `messages/zh.ts`, `messages/en.ts`, `messages/it.ts` — nav + new chrome strings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ListPageClient` + `ListListingCard` — feed grid, search filter, poll refresh, empty state (port to new `/` home)
- `useListingsPoll` — 5-min poll + refresh semantics
- `MapExplorer` / MapLibre setup — map rendering, pins, zone chips (strip sheet for select-location)
- `BottomNav` + `AppChrome` — shell wiring; extend for 4-tab IA
- `FavoriteButton` — auth-gated heart (grid + favorites)
- `HeaderLanguageDropdown` — locale picker logic for compact chip
- `FavoritesPageClient` — flat favorites data layer (restyle to grid)

### Established Patterns
- Stitch `@theme` tokens via Tailwind semantic classes (`bg-surface`, `text-primary`, `gap-space-md`)
- Dynamic import heavy overlays (`NavMenuDrawer`, badges) to avoid layout chunk bloat — apply same caution to new header pieces
- i18n via `useMessages()` + `messages/{zh,en,it}.ts`
- Consumer routes use `AppChrome`; admin and listing detail omit bottom nav partially

### Integration Points
- **`app/page.tsx`** — swap `MapHomeClient` → feed home client
- **`app/list/page.tsx`** — replace with redirect to `/`
- **New `app/select-location/page.tsx`** — select-location flow
- **`components/shell/BottomNav.tsx`** — new tab set + icons + badge on Settings
- **`components/shell/Header.tsx`** — unified search row OR route-conditional chrome (feed vs favorites vs settings)
- **Retire consumer `NavMenuDrawer`** usage from Header

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose **4-tab bottom nav including Post**, overriding milestone NAV-02.
- Location flow: **pan map under fixed pin → Confirm location → back to feed** (Phase 13 will expand for UGC post + filter radius; Phase 9 persists center only).
- User rejected browse-all-pins map; select-location UX even if Phase 13 later adds more entry contexts.
- Reference app (Snag) is **interaction benchmark only** — Stitch monochrome, no red floating capsule nav.

</specifics>

<deferred>
## Deferred Ideas

- **Filter bottom sheet + radius slider + active pills** — Phase 10 (FILT-01–05)
- **Apply browse center to feed filtering/sorting** — Phase 10 haversine + radius
- **Grid card polish (FREE badge, distance metadata)** — Phase 11
- **Favorites category folder grid** — Phase 12
- **Full Select Location for UGC post coordinates** — Phase 13 (Phase 9 establishes route + confirm pattern)
- **Settings content restyle, DND, delete account** — Phase 14
- **Hamburger overflow menu** — removed; manage-post link moved to Settings
- **Browse-all-listings map view** — not requested; could be backlog if users want pin browsing later

</deferred>

---

*Phase: 9-Feed-First Home & Navigation IA*
*Context gathered: 2026-08-09*
