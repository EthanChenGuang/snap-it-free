---
phase: 2
slug: map-list-core-browsing
status: approved
shadcn_initialized: false
preset: google-stitch-structured-minimalist
created: 2026-07-28
updated: 2026-07-28T19:03:00+02:00
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for **Map + List Core Browsing**. Retroactively authored against implemented Next.js App Router UI + Google Stitch Structured Minimalist. Extends Phase 1 UI authority (`01-UI-SPEC.md`).

---

## Phase Scope

| Surface | Route | In Phase 2? | Notes |
|---------|-------|-------------|-------|
| Map home + bottom sheet | `/` | Yes | MapLibre pins, vaul drawer 25%/75% snap, zone chips |
| Full-screen list feed | `/list` | Yes | Same cards/chips as sheet; manual refresh button |
| Scraped listing detail shell | `/listing/[id]` | Yes | Canonical metadata + iframe attempt + Subito external CTAs |
| Favorites | `/favorites` | Yes | localStorage IDs → Supabase hydrate; zone filter |
| Post stub | `/post` | Yes | Non-blocking "Accedi per pubblicare" (D-50) |
| Settings stub | `/settings` | Yes | Guest profile placeholder (D-50) |
| App shell | all routes | Yes | `Header` + `BottomNav` in root layout |
| Auth / login wall | — | No | Deferred Phase 4 (D-49) |
| UGC post / DM / report | — | No | Deferred Phase 3 |

**Requirements covered:** DISC-01–07, SCRP-04 (48h expiry visible via query filter).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (manual install — no `components.json`) |
| Preset | `google-stitch-structured-minimalist` |
| Design authority | `.planning/google-stitch-ui-design/DESIGN.md` + `SKILL.md` |
| Component library | Radix (toast, slot) + vaul (drawer) — restyled to Stitch tokens (D-53) |
| Icon library | Material Symbols Outlined (weight 400, opsz 24; FILL 1 when active/favorited) |
| Font | Inter via `next/font/google` + `@theme --font-sans` |
| Token source | `app/globals.css` `@theme` (ported from `src/index.css`) |
| UI copy module | `messages/it.ts` (Italian chrome only; listing titles remain scraped Italian — D-51/D-52) |

**shadcn gate:** No `components.json` detected. shadcn primitives (`drawer`, `button`, `toast`) were added manually and restyled — do **not** run default shadcn init without preserving Stitch tokens.

---

## Screen Reference Map

| Route / Surface | Stitch prototype | Implemented component(s) | Vite reference (port source) |
|-----------------|------------------|--------------------------|------------------------------|
| `/` map + bottom sheet | `map_explorer_notion_style/code.html` | `MapExplorer`, `ListingMap`, `ZoneFilterChips`, `ListingFeed`, `ListingCard` | `src/components/MapView.tsx` |
| `/list` full feed | `listing_feed_notion_style/code.html` | `ListPageClient`, `ListingFeed`, `ListingCard`, `ZoneFilterChips` | `src/components/ListView.tsx` |
| `/listing/[id]` detail shell | `item_details_notion_style/code.html` | `ScrapedListingShell`, `DetailTopBar`, `HeroMetadata` | `src/components/ItemDetailView.tsx` (chrome only; no UGC claim/DM) |
| `/favorites` | `listing_feed_notion_style/code.html` (empty + grid variants) | `FavoritesPageClient`, `ListingFeed` | — (new; extends feed pattern) |
| App header | `map_explorer_notion_style/code.html` TopAppBar | `components/shell/Header.tsx` | `src/components/Header.tsx` |
| Bottom nav | all prototypes BottomNavBar | `components/shell/BottomNav.tsx` | `src/components/BottomNav.tsx` |
| `/post` stub | `post_free_item_notion_style/code.html` (layout only) | `app/post/page.tsx` | `src/components/PostItemView.tsx` (stub copy only) |
| `/settings` stub | `setting_notion_style/code.html` (layout only) | `app/settings/page.tsx` | `src/components/SettingsView.tsx` (profile section only) |
| Map pin popup | — (compact card extension) | `ListingPopup` | — |
| Favorite affordance | item_details heart control | `FavoriteButton` | — |

**Layout shell:** `app/layout.tsx` — sticky `Header`, `app-main` content (`calc(100dvh - 128px)`), fixed `BottomNav`, `Toaster`.

---

## Visual Hierarchy

### Map home (`/`) — focal point

**Primary focal point:** Map canvas with orange pin markers (`accent-orange` dots on OpenFreeMap `liberty` style). The map occupies the full viewport behind the sheet and is the first visual anchor on load.

**Secondary:** Bottom sheet (`ListingFeed`, zone chips, sheet heading). Provides browse context without competing with the map for attention — 25% snap keeps pins visible; 75% snap expands list while map remains partially visible.

**Tertiary:** Header chrome (brand, favorites link), `LocateMeButton`, map popup on pin select, BottomNav.

**Hierarchy order (top → bottom attention):**

1. Orange map pins (interactive affordance + accent color)
2. Selected pin popup + highlighted card ring
3. Map canvas / pan-zoom surface
4. Zone filter chips (horizontal row above sheet content)
5. Sheet heading + listing card grid
6. App shell (Header, BottomNav)

### Icon-only controls — aria-label fallbacks

All icon-only buttons MUST expose accessible names via `aria-label` sourced from `messages/it.ts`. Visible text labels are omitted; aria-label is the sole name for screen readers.

| Control | Component | `messages/it.ts` key | Fallback string |
|---------|-----------|----------------------|-----------------|
| Header menu | `Header` | `header.menu` | `Menu` |
| Header favorites | `Header` | `header.favorites` | `Preferiti` |
| Detail back | `DetailTopBar` | `detail.back` | `Indietro` |
| Detail share | `DetailTopBar` | `detail.share` | `Condividi` |
| Favorite toggle | `FavoriteButton` | `detail.favorite` | `Preferiti` |
| Locate me | `LocateMeButton` | `locateMe.label` | `La mia posizione` |

If a key is missing at runtime, use the Fallback string column (Italian, matches `messages/it.ts` defaults).

---

## Component Inventory

shadcn/Radix primitives used in Phase 2. All MUST use Stitch tokens from `app/globals.css`, not default shadcn theme.

| Component | Path | Primitive | Stitch restyling rules |
|-----------|------|-----------|------------------------|
| **Drawer** | `components/ui/drawer.tsx` | vaul | `bg-surface`, `border-outline-variant`, `rounded-t-lg`, drag handle `bg-outline-variant`; overlay transparent; `max-h-[95dvh]`; `bottom-16` clears BottomNav; `modal={false}` + `body[data-vaul-drawer]` pointer-events fix in globals.css |
| **Button** | `components/ui/button.tsx` | Radix Slot + CVA | Variants: `default` = black primary; `secondary` = white + 1px border; `ghost` = hover `surface-container`; `chip` / `chipActive` = zone filter pills (inactive: white+border; active: black fill) |
| **Toast** | `components/ui/toast.tsx`, `toaster.tsx` | Radix Toast | `border-outline-variant`, `bg-surface`, `shadow-none`, `text-label-sm`; viewport above BottomNav (`bottom-20`) |
| **ListingCard** | `components/listings/ListingCard.tsx` | native | 1px border card, no shadow; source badge `bg-accent-orange`; free tag orange tint; image hover scale per Stitch |
| **ZoneFilterChips** | `components/map/ZoneFilterChips.tsx` | Button chip variants | Horizontal scroll, `no-scrollbar`; labels from `messages.zones` |
| **FavoriteButton** | `components/listings/FavoriteButton.tsx` | Button ghost | Heart Material Symbol; filled orange when favorited; stops propagation on cards |
| **ListingMap** | `components/map/ListingMap.tsx` | react-map-gl/maplibre | Orange pin dots (`bg-accent-orange`); popup border-only, no MapLibre default shadow |
| **ScrapedListingShell** | `components/detail/ScrapedListingShell.tsx` | native + Button | Two-column detail grid from item_details prototype; sticky sidebar CTA |

**Non-shadcn UI:** MapLibre map canvas, Next.js `Image`, Next.js `Link` for navigation.

---

## Interaction Contracts

### Map home (`/`)

| Interaction | Behavior |
|-------------|----------|
| Initial view | Venice center 45.44°N, 12.33°E, zoom 11; OpenFreeMap `liberty` style (D-31/D-32) |
| Bottom sheet | Always open; snap `[0.25, 0.75]`; not dismissible; map pannable in both snaps (D-28) |
| Zone chips | Filter pins + sheet list simultaneously; default `Tutti` (D-34/D-35) |
| Pin tap | Select pin, flyTo zoom 14, show popup, scroll matching card into view (D-29) |
| Card tap | Navigate to `/listing/[id]` |
| Card select (from pin) | `border-primary ring-1 ring-primary` highlight |
| Locate me | `LocateMeButton` — re-centers map; does not filter listings (D-32) |
| Poll refresh | Client poll every 300000 ms via `useListingsPoll` (D-38) |
| Zero listings | Centered banner: `messages.empty.noListings` |

### List feed (`/list`)

| Interaction | Behavior |
|-------------|----------|
| Layout | Full-screen feed below page header; same `ListingCard` grid as sheet |
| Zone filter | Same chip row as map |
| Refresh | Secondary button `Aggiorna elenco` / `Aggiornamento…` — manual pull-to-refresh substitute (RESEARCH discretion) |
| Poll | Shared 5-min poll with map |

### Detail shell (`/listing/[id]`)

| Interaction | Behavior |
|-------------|----------|
| Top bar | Back (history or `/`), Favorite, Share, `Apri su Subito` when URL allowed (D-43) |
| Primary CTA | `Reclama su Subito` — opens `external_url` new tab (D-44) |
| iframe | Best-effort 5s timeout; sandbox restrictive; fallback panel with Italian copy (D-42) |
| Metadata | Title, zone, posted time, hero photo from DB — not iframe (D-45) |
| Share | Web Share API → clipboard fallback → toast feedback |

### Favorites (`/favorites`)

| Interaction | Behavior |
|-------------|----------|
| Storage | `localStorage` key `shoumanwu_favorites` UUID array (D-46) |
| Toggle | Available on card, popup, detail top bar without navigation (D-47) |
| Hydrate | Fetch by ID; prune stale/expired IDs after RLS filter |
| Empty | Heart icon + heading + CTA `Esplora la mappa` (D-48) |
| Zone filter | Same chips on saved subset |

### Stubs (`/post`, `/settings`)

| Interaction | Behavior |
|-------------|----------|
| Post | Centered stub card; no login redirect; link back to map (D-50) |
| Settings | Guest profile row + explanatory copy; no auth form (D-50) |

### BottomNav

| Tab | Route | Active state |
|-----|-------|--------------|
| Mappa | `/` | `bg-surface-container`, filled icon |
| Elenco | `/list` | prefix match |
| Pubblica | `/post` | prefix match |
| Impostazioni | `/settings` | prefix match |

Favorites accessed via Header heart → `/favorites` (not a BottomNav tab).

---

## Spacing Scale

Declared values (4px grid — from DESIGN.md / `app/globals.css`):

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, inline padding, nav label margin |
| space-sm | 8px | Compact spacing, chip gaps, card internal gaps |
| space-md | 16px | Default element spacing, card grid gap, header padding |
| space-lg | 24px | Section padding, gutter alias, detail column gap |
| space-xl | 48px | Major section breaks, detail page vertical rhythm |
| gutter | 24px | Horizontal page padding (`px-gutter`) |
| container-max | 1200px | Max content width (`max-w-container-max`) |

Exceptions:

| Exception | Value | Usage |
|-----------|-------|-------|
| Icon touch target | 36–44px | `Button size="icon"` (h-9 w-9), BottomNav tap areas |
| BottomNav clearance | `pb-24` / `pb-28` | Content above fixed nav on list/favorites/post/settings |
| App main height | `calc(100dvh - 128px)` | Header + BottomNav reserved (`.app-main`) |
| Drawer max height | 95dvh | Overrides shadcn default 80vh for 25% snap visibility |

---

## Typography

Inter only. **Contract:** 4 semantic sizes, 2 weights — consolidated from DESIGN.md roles while preserving existing `@theme` Tailwind classes.

### Contract scale (authoritative)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **label** | 12px | 400 / 600 | 1.2–1.4 | Captions, nav labels, timestamps, badges, button text, metadata, zone chips |
| **body** | 15px | 400 | 1.6 | Card titles, body copy, embed fallback, stub descriptions |
| **heading** | 24px | 600 | 1.3–1.4 | Sheet heading, page headers, brand in Header, post/settings titles |
| **display** | 32px | 600 | 1.2 | Detail listing title (mobile); desktop detail title may render at 40px via `text-h1` |

**Weights:** 400 (regular — body, labels at rest), 600 (semibold — headings, brand, nav active, badge emphasis). No additional weights in new UI.

### DESIGN.md / `@theme` role mapping

Existing Tailwind tokens remain in `app/globals.css`; multiple roles share a contract token rather than introducing distinct contract sizes.

| `@theme` role | Contract token | Tailwind class | Notes |
|---------------|----------------|----------------|-------|
| label-sm | label | `text-label-sm` | 12px — canonical label size |
| label-md | label | `text-label-md` | 14px in theme; maps to **label** (slightly larger metadata/buttons) |
| micro | label | `text-[10px]` / badge utilities | 10px badges share **label** token; use 600 weight for uppercase emphasis |
| body-md | body | `text-body-md` | 15px — canonical body size |
| body-lg | body | `text-body-lg` | 17px in theme; maps to **body** (longer stub copy) |
| h3 | heading | `text-h3` | 24px — canonical heading size |
| h2 | heading | `text-h2` | 30px in theme; maps to **heading** (stub page titles) |
| h1-mobile | display | `text-h1-mobile` | 32px — canonical display size |
| h1 | display | `text-h1` | 40px in theme; maps to **display** (desktop detail title only) |
| BottomNav labels | label | `text-[11px]` | 11px nav labels share **label** token |

**Weight mapping:** `@theme` values 500 → contract **400** (regular labels/buttons); 700 → contract **600** (semibold headings/brand). Do not add 500 or 700 in new components.

---

## Color

60/30/10 monochrome-first with semantic orange from Vite Stitch port.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) — surface | `#f9f9f8` (`surface`, `background`) | Page canvas, cards, header, drawer |
| Secondary (30%) — containers | `#eeeeed` / `#f4f4f3` / `#f1f1f0` | Map backdrop, hover states, image placeholders, inactive nav hover |
| On-surface | `#1a1c1c` | Primary text, primary buttons background |
| On-surface-variant | `#444748` | Metadata, secondary text, ghost icons |
| Border | `#e5e5e5` / `outline-variant` `#c4c7c7` | All structural divisions (`.notion-border`) |
| Primary CTA | `#000000` bg / `#ffffff` text | Primary buttons, active zone chip, map pin label bg |
| Accent orange | `#df6b05` (`accent-orange`) | Map pins, source badges, "Gratis" tags, brand mark, favorited heart, available status, inline "Vedi dettaglio" links |
| Accent orange tint | `#fff5eb` bg + `#fde3cf` border | Free price pill backgrounds (cards + detail) |
| Destructive | `#ba1a1a` (`error`) | Reserved — no destructive UI in Phase 2 |

Accent orange reserved for: **source badges**, **free/gratis indicators**, **map pin dots**, **brand logo tile**, **favorited heart**, **availability pulse**, **secondary inline links on map popup** — NOT for general primary buttons (those stay black).

Accent blue (DESIGN.md links): deferred; external actions use black primary or orange semantic tags.

---

## Copywriting Contract

All strings from `messages/it.ts`. Listing titles remain scraped Italian (D-52).

| Element | Copy (Italian) |
|---------|----------------|
| Primary CTA (detail) | `Reclama su Subito` |
| Secondary external CTA | `Apri su Subito` |
| Favorites empty heading | `Nessun preferito` |
| Favorites empty body | `Salva gli annunci che ti interessano toccando il cuore su mappa o elenco.` |
| Favorites empty CTA | `Esplora la mappa` |
| List/map zero-data banner | `Nessun annuncio attivo — collega Supabase e applica le migration 004.` |
| iframe/embed blocked | `L'annuncio Subito non può essere incorporato qui. Usa Apri su Subito o Reclama su Subito per visualizzarlo e contattare il venditore.` |
| External link missing | `Link esterno non disponibile` |
| Favorite added toast | `Aggiunto ai preferiti` |
| Favorite removed toast | `Rimosso dai preferiti` |
| Share copied | `Link copiato negli appunti` |
| Share failed | `Impossibile condividere — riprova o copia il link manualmente` |
| Post stub title | `Accedi per pubblicare` |
| Post stub body | `La pubblicazione di annunci gratuiti sarà disponibile nella Fase 3. Per ora puoi sfogliare la mappa e salvare i preferiti.` |
| Settings guest | `Ospite — nessun account collegato` |
| List refresh | `Aggiorna elenco` / `Aggiornamento…` |
| Sheet heading | `Nuovi arrivi` |
| Zone chips | `Tutti`, `Centro Storico`, `Mestre-Marghera`, `Lido-Murano` |
| Approximate location badge | `Zona approssimativa` (listings with null lat/lng but zone set — D-33) |
| Destructive confirmation | N/A — Phase 2 has no destructive user actions |

---

## UI Considerations

Applicable state considerations resolved: 12 covered, 0 backstop, 0 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Map/list zero listings | ✅ covered | Banner `messages.empty.noListings` when Supabase returns no active rows |
| empty | Favorites page | ✅ covered | Heart icon + `emptyTitle` / `emptyDescription` + `browseMap` CTA |
| empty | Zone filter no matches | ✅ covered | Sheet/list heading shows `0 annunci in questa zona` via `itemsInArea(0)` |
| loading | Favorites hydrate | ✅ covered | `messages.list.refreshing` centered until localStorage + Supabase fetch completes |
| loading | List manual refresh | ✅ covered | Button disabled state + `refreshing` label |
| error | Share failure | ✅ covered | Toast `shareFailed` with recovery path (retry or manual copy) |
| error | iframe embed blocked | ✅ covered | Fallback panel + `embedBlocked` copy + `Apri su Subito` button |
| error | External URL disallowed | ✅ covered | `externalLinkUnavailable` in sidebar; no iframe attempt |
| populated | Map + sheet sync | ✅ covered | Selected card ring + scroll-into-view on pin select |
| partial | Favorites stale IDs | ✅ covered | `pruneFavoriteIds` after fetch drops RLS-hidden UUIDs |
| overflow | Long listing titles | ✅ covered | Card: `leading-snug` wrap; popup: `line-clamp-2`; detail: full title at h1 scale |
| overflow | Zone chip row | ✅ covered | Horizontal `overflow-x-auto no-scrollbar` |
| long-text | Scraped listing title on detail | ✅ covered | Full title at h1-mobile/h2 — no ellipsis |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | drawer, button, toast (manually copied) | not required — no `components.json`; components restyled in-repo |
| third-party | none | not required |

---

## Anti-Patterns (BLOCKING)

Inherited from Phase 1 `01-UI-SPEC.md` + Phase 2 implementation guardrails:

- Default shadcn/Tailwind theme colors or rounded-xl/2xl cards
- Box shadows on static listing cards (map popup included)
- Card drop shadows on feed items
- Login walls or auth modals on browse/favorite flows
- In-app contact/DM UI for scraped listings
- Re-tagging zones in UI (read-only from ingestion)
- Mock geo pins or non-Venice zone labels
- Hardcoded hex outside `@theme` tokens (except documented `#e5e5e5` notion-border)
- iframe with permissive sandbox (`allow-scripts`) without justification
- Relying on iframe as sole path to Subito (external CTA required)

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-28
