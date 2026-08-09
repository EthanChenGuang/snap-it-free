---
phase: 9
slug: feed-first-home-navigation-ia
status: approved
shadcn_initialized: false
preset: google-stitch-structured-minimalist
created: 2026-08-09
updated: 2026-08-09T13:30:00+02:00
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for **Feed-First Home & Navigation IA**. v2.0 pivot: grid feed at `/`, four-tab bottom nav, unified HOME-02 search row, select-location secondary flow. Extends Phase 2 UI authority; **Google Stitch Structured Minimalist** is mandatory.

**Requirement overrides (locked in 09-CONTEXT.md):** D-01 supersedes NAV-02 (Post is a bottom tab). D-02 satisfies NAV-03 via `/select-location` (not browse-all-pins map). D-03–D-48 govern chrome, grid, and deferred scope.

---

## Phase Scope

| Surface | Route | In Phase 9? | Notes |
|---------|-------|-------------|-------|
| Feed home (2-col grid) | `/` | Yes | Default home; replaces map-first `/` (D-29/D-32) |
| Legacy list redirect | `/list` | Yes | Permanent redirect → `/` (D-30) |
| Select location | `/select-location` | Yes | Fixed center pin; zone chips; Confirm CTA; no bottom nav (D-19–D-28) |
| Bottom navigation | consumer routes | Yes | Home · Post · Favorites · Settings (D-01/D-14) |
| Unified feed header row | `/` only | Yes | Locale chip + search + filter stub + location (D-04–D-13) |
| Favorites (interim grid) | `/favorites` | Yes | Simple title bar; 2-col grid; login gate (D-33–D-37) |
| Settings (chrome only) | `/settings` | Yes | Centered app title in title bar; content restyle deferred Phase 14 (D-44/D-45) |
| Post flow | `/post` | Yes | Bottom tab entry; auth gate on tap (D-18) |
| Listing detail | `/listing/[id]` | No chrome change | DetailTopBar unchanged; bottom nav hidden on detail |
| Admin | `/admin/*` | No change | No bottom nav; no feed header |
| Filter bottom sheet | — | No | Phase 10 (D-03) |
| Active filter pills | — | No | Phase 10 (D-12) |
| Category chips on feed | — | No | Removed from home (D-11) |
| Hamburger / NavMenuDrawer | — | Retired | Removed from consumer shell (D-07) |
| Map-first home + bottom sheet | `/` | Retired | MapExplorer browse pattern replaced by feed |

**Requirements covered:** NAV-01–04 (with documented overrides), HOME-01–03, I18N-01 (partial — new chrome strings only).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (manual install — no `components.json`) |
| Preset | `google-stitch-structured-minimalist` |
| Design authority | `.planning/google-stitch-ui-design/DESIGN.md` + `SKILL.md` |
| Component library | Radix (toast, slot) + vaul (drawer — admin/map legacy only) — restyled to Stitch tokens |
| Icon library | Material Symbols Outlined (weight 400, opsz 24; **FILL 1** on active bottom-nav tab and favorited heart) |
| Font | Inter via `next/font/google` + `@theme --font-sans` |
| Token source | `app/globals.css` `@theme` |
| UI copy module | `messages/{zh,en,it}.ts` — all new chrome strings trilingual (D-47/D-48) |

**shadcn gate:** No `components.json` detected. Do **not** run default shadcn init. Extend existing manually restyled primitives only.

**Snag benchmark rule:** Snag screenshots are interaction references only. **No** Snag red floating capsule nav, **no** saturated accent nav pills, **no** default shadcn theme.

---

## Screen Reference Map

| Route / Surface | Stitch prototype | Target component(s) | Adaptation notes |
|-----------------|------------------|---------------------|------------------|
| Feed home `/` | `listing_feed_notion_style/code.html` | `FeedHomeClient` (new), `FeedHeaderRow` (new), `ListListingCard` | **2-col mobile grid** (`grid-cols-2`, `gap-space-md`); **remove** prototype category chip row; **replace** prototype TopAppBar with unified HOME-02 row (no hamburger, no app title) |
| Select location `/select-location` | `map_explorer_notion_style/code.html` | `SelectLocationClient` (new/refactor from `MapExplorer`) | **Strip** bottom sheet + listing browse pins; **keep** zone chips + map canvas; add back chevron + bottom Confirm CTA; hide global header row + bottom nav |
| Favorites `/favorites` | `listing_feed_notion_style/code.html` (empty + grid) | `FavoritesPageClient` (restyle) | Simple centered title bar; 2-col grid; remove zone chips in Phase 9 |
| Settings title bar | `setting_notion_style/code.html` TopAppBar | `SettingsTitleBar` or route-conditional chrome in `AppChrome` | Centered **手慢无** only in title bar; page body unchanged |
| Bottom nav | `listing_feed_notion_style/code.html` BottomNavBar | `BottomNav.tsx` | 4 tabs: `grid_view` Home, `add_box` Post, `favorite` Favorites, `settings` Settings; thin top border; fixed |
| Feed empty state | `listing_feed_notion_style/code.html` + `ListPageClient` | inline in `FeedHomeClient` | Bordered panel + `inventory_2` icon + title/description (Stitch pattern) |
| Post auth gate | existing `AuthPromptModal` | reuse | Triggered on Post tab when logged out (D-18) |

**Layout shell:** `AppChrome.tsx` — route-conditional chrome: feed header row on `/` only; simple title bars on `/favorites` and `/settings`; **no** global `Header` hamburger; bottom nav on all consumer routes except `/select-location` and `/listing/[id]`.

---

## Visual Hierarchy

### Feed home (`/`) — focal point

**Primary focal point:** Two-column listing grid — `ListListingCard` images and titles dominate the scrollable canvas.

**Secondary:** Unified HOME-02 search row (locale chip, inline search, filter icon, location icon) — sticky until scroll-away hides it.

**Tertiary:** Fixed bottom nav; empty-state panel when no results; pull-to-refresh / poll refresh affordance (if wired).

**Hierarchy order (top → bottom attention):**

1. Listing card images (aspect-video, border-only cards)
2. Card titles + metadata row
3. Inline search field (always visible when header shown)
4. Locale chip + filter + location icon controls
5. Bottom navigation (fixed, never scrolls away)

### Select location (`/select-location`)

**Primary:** MapLibre canvas with **fixed center pin** overlay (user pans map under pin).

**Secondary:** Zone filter chips row (Centro / Mestre / Lido + Padova).

**Tertiary:** Top-left back chevron; Locate Me FAB; bottom **Confirm location** primary CTA bar.

**Hierarchy order:**

1. Center pin + map pan surface
2. Confirm location CTA (black primary, full-width bottom bar)
3. Zone chips
4. Back chevron + Locate Me

### Favorites (`/favorites`)

**Primary:** Two-column saved-listings grid (`ListListingCard` or equivalent card with `FavoriteButton`).

**Secondary:** Centered page title in simple title bar.

**Tertiary:** Login gate modal / sync banner when anonymous; empty state panel.

### Settings (`/settings`)

**Primary:** Existing settings page content (unchanged styling in Phase 9).

**Secondary:** Centered app title **手慢无** in title bar only (D-45).

**Tertiary:** Bottom nav Settings tab active state.

### Bottom navigation (all consumer routes with nav)

**Primary:** Active tab — filled Material icon + bold `text-primary` (D-16).

**Secondary:** Inactive tabs — outline icons + `text-secondary`.

**Tertiary:** `UnreadMatchBadge` dot on Settings tab (D-17).

---

## Component Inventory

All components MUST use Stitch tokens from `app/globals.css`. No default shadcn theme.

| Component | Path (target) | Primitive / base | Stitch restyling rules |
|-----------|---------------|------------------|------------------------|
| **FeedHeaderRow** | `components/shell/FeedHeaderRow.tsx` (new) | native + compact locale chip | Single row: `[locale chip] [search input flex-1] [filter btn] [location btn]`; `max-w-container-max mx-auto px-gutter py-space-md`; `border-b border-outline-variant bg-surface`; scroll-away via transform/visibility on feed scroll (D-08) |
| **CompactLocaleChip** | `components/shell/CompactLocaleChip.tsx` (new) or inline | wraps `HeaderLanguageDropdown` logic | Pill/chip: `中` / `EN` / `IT`; `bg-surface-container` + `border-outline-variant`; tap opens full language picker |
| **FeedHomeClient** | `components/listings/FeedHomeClient.tsx` (new) | port from `ListPageClient` | `grid grid-cols-2 gap-space-md`; no `SubitoCategoryFilterChips`; search filters title + description (+ location label if present); `useListingsPoll`; Stitch empty state |
| **ListListingCard** | `components/listings/ListListingCard.tsx` | existing | Reuse as-is (D-39); Phase 11 polishes badge/heart/distance |
| **BottomNav** | `components/shell/BottomNav.tsx` | Next `Link` | 4 tabs per D-14; icons: `grid_view`, `add_box`, `favorite`, `settings`; active FILL 1 + bold; hide entirely on `/select-location` |
| **AppChrome** | `components/shell/AppChrome.tsx` | layout | Route-conditional: feed header on `/`; title bars on favorites/settings; no `Header` hamburger; no bottom nav on select-location |
| **SimpleTitleBar** | `components/shell/SimpleTitleBar.tsx` (new) | native | Centered `text-h3 font-semibold`; favorites = page title; settings = `messages.app.title` |
| **SelectLocationClient** | `components/map/SelectLocationClient.tsx` (new) | refactor `MapExplorer` | Full viewport map; fixed center pin SVG; zone chips; Locate Me; back chevron; bottom Confirm bar; no bottom sheet |
| **ZoneFilterChips** | `components/map/ZoneFilterChips.tsx` | Button chip variants | **Select-location only** in Phase 9 (D-13/D-22); same Stitch chip active/inactive as Phase 2 |
| **LocateMeButton** | `components/map/LocateMeButton.tsx` | existing | Reuse on select-location |
| **FavoriteButton** | `components/listings/FavoriteButton.tsx` | Button ghost | Heart on favorites grid cards (D-37) |
| **AuthPromptModal** | `components/ugc/AuthPromptModal.tsx` | existing | Post tab auth gate (D-18) |
| **Button** | `components/ui/button.tsx` | Radix Slot + CVA | Primary = black; secondary = white + border; ghost for icon buttons |
| **Toast** | `components/ui/toast.tsx` | Radix Toast | Filter stub message; viewport above bottom nav |

**Retired from consumer shell (Phase 9):** `Header.tsx` hamburger + `NavMenuDrawer` on feed/favorites/settings routes.

---

## Interaction Contracts

### Feed home (`/`)

| Interaction | Behavior |
|-------------|----------|
| Initial load | Newest-first active listings (`posted_at` desc); load all rows, no pagination (D-41/D-42) |
| Grid layout | Mobile default: `grid-cols-2`, `gap-space-md` (D-38/D-40); wider breakpoints may add columns at planner discretion |
| Card tap | Navigate to `/listing/[id]` |
| Search | Always-visible inline field; filters title + description + location label when present (D-06); client-side only |
| Filter icon (`tune`) | Stub: toast trilingual "Filters coming soon" (D-03); no sheet |
| Location icon (`my_location`) | Navigate to `/select-location` (D-19) |
| Locale chip | Tap → full language picker (reuse `HeaderLanguageDropdown` behavior) (D-05) |
| Scroll-away header | On scroll down, hide feed header row; on scroll up, show again; bottom nav stays fixed (D-08) |
| Category chips | **Not rendered** on feed (D-11) |
| Filter pills | **Not rendered** (D-12) |
| Poll / refresh | `useListingsPoll` 5-min poll; retain pull-to-refresh if already wired (D-42) |
| Empty — no listings | Stitch bordered panel: icon + `messages.feed.emptyTitle` + `messages.feed.emptyDescription` (D-43) |
| Empty — search no match | Same panel pattern with search-specific copy |
| Desktop | Header row + grid use `max-w-container-max mx-auto` (D-09) |

### Select location (`/select-location`)

| Interaction | Behavior |
|-------------|----------|
| Entry | Location button from feed header (D-19) |
| Chrome | Hide HOME-02 row and bottom nav (D-23); no bottom tab highlighted (D-25) |
| Map | MapLibre; user pans/zooms; **fixed center pin** marks selection (D-20) |
| Zone chips | Filter map context only (Centro / Mestre / Lido + Padova) (D-22); does not filter feed in Phase 9 |
| Locate Me | Recenter on browser geolocation (D-21) |
| Back chevron | Returns to feed `/` (D-24) |
| Confirm location | Primary CTA bottom bar; persists `{ lat, lng, label? }` to browse-center state + `localStorage`; returns to `/` (D-20/D-27); **does not filter feed** until Phase 10 |
| Search | Feed search does not apply here (D-26) |
| Exit alternate | Location button toggles off when already on select-location → return to feed (D-24) |

### Bottom navigation

| Tab | Route | Icon | Active state |
|-----|-------|------|--------------|
| Home | `/` | `grid_view` | FILL 1 + bold `text-primary` when `pathname === '/'` (D-15/D-16) |
| Post | `/post` | `add_box` | Prefix match; auth gate before navigation if logged out (D-18) |
| Favorites | `/favorites` | `favorite` | Prefix match |
| Settings | `/settings` | `settings` | Prefix match + `UnreadMatchBadge` (D-17) |

Nav bar: `border-t border-outline-variant bg-surface`; fixed bottom; **not** Snag red capsule; **not** floating pill container.

### Favorites (`/favorites`)

| Interaction | Behavior |
|-------------|----------|
| Title bar | Simple centered `messages.favorites.pageTitle` — **not** HOME-02 row (D-35) |
| Grid | Two-column mobile grid; reuse listing card + unfavorite toggle (D-33/D-37) |
| Login gate | Anonymous users: existing auth-gated behavior / modal (D-34) |
| Zone chips | Remove from favorites in Phase 9 (interim flat grid) |
| Empty | Stitch panel: heart or `inventory_2` + existing empty copy; update CTA to browse feed not map |
| Folders teaser | **None** (D-36) |

### Settings (`/settings`)

| Interaction | Behavior |
|-------------|----------|
| Title bar | Centered app title **手慢无** / localized `messages.app.title` only (D-45) |
| Page content | **No restyle** in Phase 9 — DND, delete account, layout polish deferred Phase 14 (D-44) |
| Manage my posts | Link added to settings body (replacing drawer entry) (D-46) |

### Route migration

| Interaction | Behavior |
|-------------|----------|
| `/list` | Permanent redirect to `/` (D-30) |
| Bookmarked map `/` | Users land on feed grid (D-32) |

---

## Spacing Scale

Declared values (4px grid — from DESIGN.md / `app/globals.css`):

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, nav label margin, chip internal padding |
| space-sm | 8px | Compact spacing, header control gaps |
| space-md | 16px | **Feed grid gap** (`gap-space-md`), card padding, header row padding |
| space-lg | 24px | Section padding, gutter alias, feed top padding |
| space-xl | 48px | Empty state panel padding |
| gutter | 24px | Horizontal page padding (`px-gutter`) |
| container-max | 1200px | Max content width (`max-w-container-max`) |

Exceptions:

| Exception | Value | Usage |
|-----------|-------|-------|
| Icon touch target | 44px min (`min-h-11 min-w-11`) | Filter, location, locale chip, back chevron |
| Bottom nav clearance | `pb-space-xl` (48px) + fixed nav height (~56px) on scroll containers | Scrollable feed/favorites above fixed nav; do not use Tailwind `pb-24` (96px) |
| Feed header row height | ~56–64px | Sticky/scroll-away header band |
| Select-location Confirm bar | full-width bottom safe-area | Primary CTA above home indicator |
| Bottom nav icon size | 20px | Match existing `BottomNav` density |

---

## Typography

Inter only. **Contract:** 4 semantic sizes, 2 weights — aligned with Phase 2 consolidated scale.

### Contract scale (authoritative)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **label** | 12px | 400 / 600 | 1.2–1.4 | Nav labels, timestamps, locale chip, empty state secondary, toast |
| **body** | 15px | 400 | 1.6 | Search placeholder/input, card titles, empty descriptions |
| **heading** | 24px | 600 | 1.3–1.4 | Favorites/Settings title bar, empty state title |
| **display** | 32px | 600 | 1.2 | Reserved — not used in Phase 9 chrome |

**Weights:** 400 (regular), 600 (semibold — title bars, nav active, empty title). No 500/700 in new UI.

### Phase 9-specific mapping

| Element | Classes | Notes |
|---------|---------|-------|
| Feed search input | `text-body-md` | Inline, always visible |
| Locale chip | `text-label-sm font-semibold` | Compact 中/EN/IT |
| Bottom nav labels | `text-label-sm font-semibold` when active; `text-label-sm` when inactive | 12px contract label only |
| Simple title bar | `text-h3 font-semibold text-on-surface` | Centered |
| Confirm location CTA | `text-label-sm font-semibold` | 12px/600 on black primary button |
| Filter stub toast | `text-label-sm` | Radix toast restyled |

---

## Color

60/30/10 monochrome-first; semantic orange retained from v1 for listing semantics only (not nav).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) — surface | `#f9f9f8` (`surface`, `background`) | Page canvas, cards, nav bar, header rows |
| Secondary (30%) — containers | `#eeeeed` / `#f4f4f3` / `#f1f1f0` | Image placeholders, hover states, locale chip bg, inactive chip hover |
| On-surface | `#1a1c1c` | Primary text, primary button bg, active nav |
| On-surface-variant | `#444748` | Metadata, inactive nav, placeholder text |
| Border | `#e5e5e5` / `outline-variant` `#c4c7c7` | All structural divisions (`.notion-border`, card borders) |
| Primary CTA | `#000000` bg / `#ffffff` text | Confirm location, existing card CTAs, active zone chip |
| Accent orange | `#df6b05` (`accent-orange`) | **Listing semantics only** — source badges, gratis tags, favorited heart — **NOT** bottom nav |
| Destructive | `#ba1a1a` (`error`) | No new destructive UI in Phase 9 |

**Accent reserved for (10% budget):** favorited heart, listing FREE/gratis indicators, source badges on cards — **never** bottom nav active state, **never** Snag red capsule, **never** filter/location icon fills.

**Bottom nav active state:** filled black icon + bold black label on surface — **not** a colored pill or red capsule (D-16, NAV-01).

---

## Copywriting Contract

All new strings in **zh / en / it** (D-47/D-48). Keys below are canonical; executor adds to `messages/*.ts`.

### Navigation labels (D-47)

| Key | zh | en | it |
|-----|----|----|-----|
| `nav.home` | 首页 | Home | Home |
| `nav.post` | 发布 | Post | Pubblica |
| `nav.favorites` | 收藏 | Favorites | Preferiti |
| `nav.settings` | 设置 | Settings | Impostazioni |

*(Retire `nav.map` / `nav.list` from bottom nav — may remain in files for admin/legacy until cleanup.)*

### Feed header & stub (HOME-02)

| Element | Key | zh | en | it |
|---------|-----|----|----|-----|
| Search placeholder | `feed.searchPlaceholder` | 搜索附近的免费物品… | Search free items near you… | Cerca oggetti gratis vicino a te… |
| Filter stub toast | `feed.filterComingSoon` | 筛选功能即将推出 | Filters coming soon | Filtri in arrivo |
| Location button aria | `feed.openSelectLocation` | 选择浏览位置 | Choose browse location | Scegli posizione di navigazione |
| Filter button aria | `feed.openFilters` | 筛选 | Filters | Filtri |

### Select location (D-20/D-48)

| Element | Key | zh | en | it |
|---------|-----|----|----|-----|
| Primary CTA | `selectLocation.confirm` | 确认位置 | Confirm location | Conferma posizione |
| Back button aria | `selectLocation.back` | 返回 | Back | Indietro |

### Feed empty states (D-43)

| Element | Key | zh | en | it |
|---------|-----|----|----|-----|
| Empty heading (no listings) | `feed.emptyTitle` | 暂无活跃物品 | No active listings | Nessun annuncio attivo |
| Empty body | `feed.emptyDescription` | 稍后再来看看，或调整搜索关键词。 | Check back later or try a different search. | Riprova più tardi o modifica la ricerca. |
| Empty heading (search) | `feed.emptySearchTitle` | 未找到匹配物品 | No matching items | Nessun risultato |
| Empty body (search) | `feed.emptySearchDescription` | 试试其他关键词。 | Try different keywords. | Prova altre parole chiave. |
| Refreshing | `list.refreshing` | (reuse) | Refreshing… | Aggiornamento… |

### Favorites (interim)

| Element | Key | Notes |
|---------|-----|-------|
| Page title | `favorites.pageTitle` | reuse |
| Empty heading/body | `favorites.emptyTitle` / `emptyDescription` | reuse; CTA text should point to feed home (`feed.browseFeed`) not map |
| Browse feed CTA | `feed.browseFeed` | zh: 浏览首页 · en: Browse feed · it: Sfoglia feed |

### Settings title bar (D-45)

| Element | Key | Notes |
|---------|-----|-------|
| App title | `app.title` | 手慢无 — centered in title bar only on Settings |

### Destructive confirmation

N/A — Phase 9 introduces no new destructive actions.

---

## Accessibility

All icon-only controls MUST expose accessible names via `aria-label` from `messages/*`. Visible text labels omitted on icon buttons; aria-label is the sole name.

| Control | Component | Message key | Fallback (en) |
|---------|-----------|-------------|-----------------|
| Locale chip | `CompactLocaleChip` | `header.languageMenu` | Choose language |
| Search field | `FeedHeaderRow` input | `header.search` | Search |
| Filter (stub) | `FeedHeaderRow` | `feed.openFilters` | Filters |
| Location | `FeedHeaderRow` | `feed.openSelectLocation` | Choose browse location |
| Back (select-location) | `SelectLocationClient` | `selectLocation.back` | Back |
| Locate me | `LocateMeButton` | `locateMe.label` | My location |
| Bottom nav tabs | `BottomNav` | `nav.home` / `nav.post` / `nav.favorites` / `nav.settings` | Tab names |
| Favorite toggle | `FavoriteButton` | `detail.favorite` | Favorites |
| Post auth gate | `AuthPromptModal` | existing keys | — |

**Scroll-away header:** When hidden, search field must remain reachable via scroll-up reveal; do not trap focus in hidden header.

**Grid cards:** `ListListingCard` retains `role="link"` + keyboard activation (Enter/Space).

**Select-location map:** Confirm CTA must be reachable without map-only pointer gestures; back chevron provides non-map exit.

---

## Anti-Patterns (BLOCKING)

Inherited from Stitch SKILL + Phase 9 scope:

- Snag red floating capsule bottom nav or saturated nav accent pills
- Default shadcn/Tailwind theme colors or rounded-xl/2xl cards
- Box shadows on static listing cards or feed empty panels
- Hamburger menu / `NavMenuDrawer` on consumer feed shell
- App title **手慢无** in feed header row (Settings title bar only — D-10/D-45)
- Category filter chips or active filter pills on feed home (Phase 10)
- Filter bottom sheet wired in Phase 9 (stub toast only — D-03)
- Map-first home at `/` or browse-all-pins map as location flow (D-02)
- Bottom sheet listing browse on `/select-location`
- `/list` as standalone nav destination (redirect only)
- Hardcoded hex outside `@theme` tokens (except documented `#e5e5e5` notion-border)
- Orange accent on bottom nav active tab
- Card drop shadows
- Glassmorphism, gradients, neon accents

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | button, toast (manually copied in-repo) | not required — no `components.json` |
| third-party | none | not required |

---

## UI Considerations

> Populated by ui-phase Step 9.5 probe. Empty/error **copy** lives in `## Copywriting Contract`; this section records **state coverage** only.

Applicable state considerations resolved: **28 covered**, **3 backstop**, **2 dismissed**, **0 unresolved**

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | E1 feed grid | ✅ covered | Zero listings → Stitch bordered panel (`feed.emptyTitle` / `feed.emptyDescription`); search no-match → `feed.emptySearchTitle` / `feed.emptySearchDescription` |
| loading | E1 feed grid | ✅ covered | Poll refresh shows `list.refreshing` centered label while `isRefreshing`; initial SSR render shows grid or empty without skeleton |
| error | E1 feed grid | 🧪 backstop | Server fetch failure logs and renders empty feed — no dedicated error banner in Phase 9; verify graceful empty vs error distinction in E2E |
| populated | E1 feed grid | ✅ covered | Two-column `ListListingCard` grid, newest-first, typical Venice volume |
| partial | E1 feed grid | — dismissed | Listing rows are atomic; no partial-row UI in Phase 9 |
| overflow | E1 feed grid | ✅ covered | Main column scrolls vertically; header scroll-away; card titles truncate in `ListListingCard` |
| zero-one-many | E1 feed grid | ✅ covered | 0 → empty panel; 1 → single grid cell; many → 2-col grid with `gap-space-md` |
| long-text | E1 feed grid | ✅ covered | Card titles truncate with ellipsis; metadata single line |
| empty | E2 feed header | — dismissed | Empty search field is normal initial state, not an empty-state surface |
| loading | E2 feed header | — dismissed | Header controls are static; no async header load |
| overflow | E2 feed header | ✅ covered | Single flex row; search input flex-1; icon buttons fixed 44px; desktop `max-w-container-max` |
| long-text | E2 feed header | ✅ covered | Search input scrolls long query text; locale chip fixed width (中/EN/IT) |
| loading | E3 select-location | ✅ covered | MapLibre dynamic import shows `post.mapLoading` centered label (reuse MapHome pattern) |
| error | E3 select-location | 🧪 backstop | Locate Me geolocation denial — verify existing locate error/toast or silent no-op is acceptable |
| populated | E3 select-location | ✅ covered | Full-bleed map + fixed center pin + zone chips + bottom Confirm bar |
| overflow | E3 select-location | ✅ covered | Zone chips horizontal scroll (`no-scrollbar`); map pans for overflow |
| populated | E4 bottom nav | ✅ covered | Four tabs always visible; active tab FILL 1 + bold primary |
| overflow | E4 bottom nav | ✅ covered | Fixed four equal tabs; labels short i18n strings |
| long-text | E4 bottom nav | ✅ covered | Nav labels capped at 1–2 words per locale (`nav.*` keys) |
| empty | E5 favorites | ✅ covered | Logged-out → auth gate; logged-in zero saves → `favorites.emptyTitle` panel + browse feed CTA |
| loading | E5 favorites | ✅ covered | Hydrating saved IDs shows existing favorites loading/empty transition |
| error | E5 favorites | 🧪 backstop | Supabase favorites fetch failure — verify falls back to empty state without broken layout |
| populated | E5 favorites | ✅ covered | Two-column grid of saved cards with unfavorite toggle |
| overflow | E5 favorites | ✅ covered | Page scrolls vertically above fixed bottom nav |
| zero-one-many | E5 favorites | ✅ covered | 0 empty / 1 single cell / many 2-col — same grid rules as feed |
| long-text | E5 favorites | ✅ covered | Reuses `ListListingCard` title truncation |
| overflow | E6 settings | ✅ covered | Existing settings page body scrolls; title bar fixed |
| long-text | E6 settings | ✅ covered | Centered `app.title` only — short brand string |
| populated | E7 filter stub toast | ✅ covered | Tap filter icon → trilingual toast `feed.filterComingSoon`; auto-dismiss via Radix toast |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-09
