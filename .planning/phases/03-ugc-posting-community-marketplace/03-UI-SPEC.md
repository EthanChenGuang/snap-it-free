---
phase: 3
slug: ugc-posting-community-marketplace
status: approved
shadcn_initialized: false
preset: google-stitch-structured-minimalist
created: 2026-07-30
updated: 2026-07-30T23:55:00+02:00
reviewed_at: 2026-07-30T23:55:00+02:00
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for **UGC Posting & Community Marketplace**. Extends Phase 2 UI authority (`02-UI-SPEC.md`) and Google Stitch Structured Minimalist design system. All new surfaces port from Stitch prototypes and Vite interaction references — no redesign.

---

## Phase Scope

| Surface | Route / trigger | In Phase 3? | Notes |
|---------|-----------------|-------------|-------|
| Post — Quick Post tab | `/post` (default tab) | Yes | Photo + title + zone + pin; under 30s target (D-58) |
| Post — Street Dump tab | `/post?tab=street-dump` | Yes | GPS seeds pin; user confirms/drags on full map (D-57, D-64) |
| Poster manage listings | `/post/manage` | Yes | Owner-scoped list + lifecycle actions + hidden banner (D-83) |
| Inline auth prompt | `/post`, DM open | Yes | Magic-link modal; redirect back to intent (D-54, D-55) |
| UGC native detail | `/listing/[id]` when `source = 'ugc'` | Yes | Stitch `item_details` adapted; `Contatta` primary CTA (D-70–D-72) |
| Scraped detail shell | `/listing/[id]` when `source != 'ugc'` | Preserve | Unchanged from Phase 2 — no DM/report UI changes beyond overflow menu |
| DM bottom sheet | Detail `Contatta` | Yes | vaul drawer; poll 10s; not full-page route (D-74–D-76) |
| First-send safety modal | DM first message | Yes | Gate before send (D-77) |
| DM safety banner | Top of DM thread | Yes | Collapsible after first read (D-78) |
| Report overflow menu | Detail `more_horiz` | Yes | All listing types; auth required (D-79, D-82) |
| Reserved badge | Map/list cards + detail | Yes | Gray chip overlay; listing stays visible (D-69) |
| Hidden pending banner | Owner detail + `/post/manage` | Yes | `Nascosto — in revisione` (D-83) |
| Login wall on browse | — | No | Deferred Phase 4 (D-54) |
| Push notifications / Realtime DM | — | No | Poll-only Phase 3 (D-74) |

**Requirements covered:** UGC-01–04, CONT-01–05, MOD-01–03.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (manual install — no `components.json`) |
| Preset | `google-stitch-structured-minimalist` |
| Design authority | `.planning/google-stitch-ui-design/DESIGN.md` + `SKILL.md` |
| Component library | Radix (toast, slot) + vaul (drawer) — restyled to Stitch tokens (D-53) |
| Icon library | Material Symbols Outlined (weight 400, opsz 24; FILL 1 when active/tab selected) |
| Font | Inter via `next/font/google` + `@theme --font-sans` |
| Token source | `app/globals.css` `@theme` |
| UI copy module | `messages/it.ts` — Italian chrome only; listing titles user-authored (D-88) |

**shadcn gate:** No `components.json` detected. Continue manual primitive pattern from Phase 2. Do **not** run default shadcn init without preserving Stitch tokens. New Phase 3 surfaces may add Radix Dialog for auth/safety modals — copy restyle pattern from existing `drawer.tsx` / `button.tsx`.

**Discretion resolutions (Claude's Discretion → locked for executor):**

| Topic | Decision | Rationale |
|-------|----------|-----------|
| DM routing | Modal-only bottom sheet from detail; no `/listing/[id]/chat` route | D-76; keeps detail context visible |
| Poster manage | `/post/manage` sub-route linked from post page header when authenticated | Keeps posting domain cohesive vs settings stub |
| Reserved badge | Gray chip overlay on card image — **no** title strikethrough | Monochrome chip matches Stitch tags; reserved ≠ gone |
| Quick Post pin map | MapLibre mini-map centered on selected zone | Reuses Phase 2 MapLibre setup; consistent drag UX with Street Dump |
| Report auth | Login required to submit report (no anonymous fingerprint UI) | Aligns with D-82 `reporter_user_id`; simpler v1 |

---

## Screen Reference Map

| Route / Surface | Stitch prototype | Target component(s) | Vite reference (interaction only) |
|-----------------|------------------|---------------------|-------------------------------------|
| `/post` Quick Post | `post_free_item_notion_style/code.html` | `PostPageClient`, `PostForm`, `PinMap` | `src/components/PostItemView.tsx` (upload + notion-input; **drop** category/condition) |
| `/post` Street Dump tab | `post_free_item_notion_style` + map overlay | `StreetDumpForm`, `PinMap` (full Venice) | GPS confirm pattern from CONTEXT Pitfall 8 |
| `/post/manage` | `listing_feed_notion_style` (list variant) | `ManageListingsClient`, `PosterListingRow` | — |
| UGC detail | `item_details_notion_style/code.html` | `UgcListingShell`, `DetailTopBar` (extended) | `src/components/ItemDetailView.tsx` (layout); **no** external claim CTAs |
| DM sheet | — (overlay) | `DmDrawer`, `SafetyBanner` | `src/components/ChatModal.tsx` (structure + quick replies) |
| Safety modal | — (centered dialog) | `SafetyModal` | — |
| Auth prompt | Stitch modal pattern (monochrome border) | `AuthPromptModal` | — |
| Report menu | — (dropdown from top bar) | `ReportListingMenu` | — |
| Reserved badge | — (card extension) | `ListingCard`, `HeroMetadata` | — |
| Hidden banner | — (inline alert strip) | `HiddenReviewBanner` | — |

**Layout shell:** Unchanged — `app/layout.tsx` sticky `Header`, `app-main`, fixed `BottomNav`, `Toaster`.

---

## Visual Hierarchy

### `/post` — focal point

**Primary focal point:** Dashed photo upload zone (16:9) — largest interactive target; establishes posting intent immediately.

**Secondary:** Tab row (`Pubblica` | `Street Dump`) directly below page title; active tab uses black underline + semibold label.

**Tertiary:** Title notion-input, zone chip row (Quick Post) or map canvas (Street Dump), optional details expander, primary submit button.

**Hierarchy order:**

1. Photo upload / preview
2. Tab selector
3. Title input
4. Zone chips (Quick Post) OR full map (Street Dump)
5. Pin mini-map (Quick Post only)
6. `Aggiungi dettagli` expander → description textarea
7. `Pubblica gratis` primary button
8. Community guidelines footnote

### UGC detail — focal point

**Primary focal point:** Hero photo (16:9, border-only container) with status/source badges overlaid top-left.

**Secondary:** Sticky sidebar action card — status row + `Contatta` primary CTA (black). For owner view, lifecycle buttons replace `Contatta`.

**Tertiary:** Title, zone metadata, optional description article, map snippet (zone only — no exact address).

### DM bottom sheet — focal point

**Primary focal point:** Message thread scroll area (flex-1).

**Secondary:** Collapsible safety banner (top of thread), item preview strip below header.

**Tertiary:** Quick-reply chip row, compose input + send icon button.

### Icon-only controls — aria-label fallbacks

All Phase 3 icon-only buttons MUST expose accessible names via `aria-label` sourced from `messages/it.ts`. Visible text labels are omitted; aria-label is the sole name for screen readers. Extends Phase 2 pattern (`02-UI-SPEC.md`).

| Control | Component | `messages/it.ts` key | Fallback string |
|---------|-----------|----------------------|-----------------|
| Photo remove | `PostForm` | `post.removePhoto` | `Rimuovi foto` |
| DM drawer close | `DmDrawer` | `dm.close` | `Chiudi messaggi` |
| DM send | `DmDrawer` | `dm.send` | `Invia messaggio` |
| Detail overflow | `DetailOverflowMenu` | `report.menuTrigger` | `Altre opzioni` |
| Safety banner collapse | `SafetyBanner` | `safety.collapse` | `Nascondi consigli di sicurezza` |
| Safety banner expand | `SafetyBanner` | `safety.expand` | `Mostra consigli di sicurezza` |
| Auth modal close | `AuthPromptModal` | `auth.close` | `Chiudi` |
| Report dialog close | `ReportListingMenu` | `report.close` | `Chiudi` |

If a key is missing at runtime, use the Fallback string column (Italian, matches `messages/it.ts` defaults).

---

## Component Inventory

Phase 3 additions. All MUST use Stitch tokens from `app/globals.css`.

| Component | Path | Primitive | Stitch restyling rules |
|-----------|------|-----------|------------------------|
| **PostPageClient** | `components/ugc/PostPageClient.tsx` | native | Tab state; auth gate wrapper; max-w 800px centered column |
| **PostForm** | `components/ugc/PostForm.tsx` | native + Button | Dashed upload via `.custom-dashed` (globals.css); notion-input title; zone single-select chips; details `<details>` expander |
| **StreetDumpForm** | `components/ugc/StreetDumpForm.tsx` | native + PinMap | Same upload/title; full-height map section min 240px |
| **PinMap** | `components/ugc/PinMap.tsx` | react-map-gl/maplibre | Draggable orange pin; zone boundary optional overlay; `border border-outline-variant rounded` |
| **AuthPromptModal** | `components/ugc/AuthPromptModal.tsx` | Radix Dialog (new) | `bg-surface`, `border-outline-variant`, `rounded-lg`, `shadow-none`; overlay `bg-black/40`; email input 1px border |
| **UgcListingShell** | `components/detail/UgcListingShell.tsx` | native + Button | Two-column grid from item_details; no iframe; no Subito CTAs |
| **DetailOverflowMenu** | `components/detail/DetailOverflowMenu.tsx` | native popover | `more_horiz` trigger; report + share items |
| **ReportListingMenu** | `components/detail/ReportListingMenu.tsx` | native | Reason radio list; confirm button |
| **DmDrawer** | `components/messages/DmDrawer.tsx` | vaul Drawer | `max-h-[80dvh]`; `bottom-0` on detail (above BottomNav on mobile: `bottom-16`); port ChatModal layout |
| **SafetyModal** | `components/messages/SafetyModal.tsx` | Radix Dialog | Centered; safety icon + bullet list + `Ho capito` primary |
| **SafetyBanner** | `components/messages/SafetyBanner.tsx` | native | `bg-surface-container-low border-b`; collapse chevron |
| **HiddenReviewBanner** | `components/ugc/HiddenReviewBanner.tsx` | native | `bg-error-container text-on-error-container border border-outline-variant`; full-width strip |
| **ManageListingsClient** | `components/ugc/ManageListingsClient.tsx` | native | Feed-style rows with status + action buttons |
| **ReservedBadge** | `components/listings/ReservedBadge.tsx` | native | Gray chip: `bg-surface-container-highest text-on-surface-variant` |
| **ListingCard** (extend) | `components/listings/ListingCard.tsx` | native | UGC source badge variant; reserved overlay |
| **Dialog** (new primitive) | `components/ui/dialog.tsx` | Radix Dialog | Match drawer token pattern — no default shadcn theme |

**Extended Phase 2 components:**

| Component | Phase 3 change |
|-----------|----------------|
| `ListingCard` | Branch badge: `source === 'ugc'` → gray `Community` chip; `status === 'claimed'` → `ReservedBadge` top-left stack |
| `DetailTopBar` | Add `more_horiz` overflow for report; hide Subito button when UGC |
| `HeroMetadata` | UGC variant: community source block; reserved status pulse → static gray dot |
| `messages/it.ts` | New namespaces: `post.*`, `ugc.*`, `dm.*`, `safety.*`, `report.*`, `auth.*`, `manage.*` |

---

## Interaction Contracts

### Auth prompt (inline modal — D-55)

| Interaction | Behavior |
|-------------|----------|
| Trigger | Unauthenticated user taps `/post` submit, `Contatta`, or report confirm |
| Layout | Centered dialog mobile; max-w-md; monochrome border; no card shadow |
| Fields | Email input only (magic link — D-54) |
| Primary CTA | `Invia link di accesso` — triggers `signInWithOtp` |
| Success | Inline message: `Controlla la tua email per il link di accesso` |
| Redirect | After callback, return to `/post`, `/listing/[id]`, or open DM drawer per stored intent |
| Dismiss | Ghost close button; no global auth wall on browse |

### `/post` — tabbed post flow

| Interaction | Behavior |
|-------------|----------|
| Default tab | `Pubblica` (Quick Post) |
| Tab switch | Preserves photo + title across tabs; resets pin context per tab |
| Auth | If logged out, show auth modal on submit attempt (not on page load) |
| Required fields | Photo, title, zone (Quick Post), valid pin inside Venice (both tabs) — D-58 |
| Photo upload | Tap dashed zone or drag-drop; JPEG/PNG/WebP max 5 MB; preview with remove `×` |
| Upload progress | Disable submit; button label `Caricamento…` |
| Zone selection (Quick Post) | Single-select zone chips (no `Tutti`); selecting zone re-centers mini-map |
| Pin placement (Quick Post) | Drag pin on zone-centered MapLibre; lat/lng required at publish |
| Street Dump | Request geolocation; seed pin on full Venice map; user must drag-adjust before publish — never auto-publish (D-57) |
| Pin validation error | Inline below map: `Sposta il pin dentro Venezia` (D-65) |
| Optional description | Collapsed `<details>` / button `Aggiungi dettagli` reveals textarea |
| Submit | POST upload → POST create listing; disabled until required fields valid |
| Success | Toast `Annuncio pubblicato` + navigate `/listing/[id]` (D-59) |
| Rate limit hit | Toast error `Hai raggiunto il limite di 3 annunci al giorno` (D-85) |
| Manage link | Authenticated users see text link `I miei annunci` → `/post/manage` in page header |

### `/post/manage` — poster lifecycle

| Interaction | Behavior |
|-------------|----------|
| Auth | Required; redirect to auth modal if logged out |
| List | Owner's UGC listings sorted `posted_at` desc |
| Row actions | `Segna riservato` → `status = claimed`; `Segna consegnato` → `status = expired` (D-68) |
| Reserved row | Show gray `Riservato` chip; actions: only `Segna consegnato` |
| Hidden row | `HiddenReviewBanner` inline; no public actions except view detail |
| Empty | `Non hai ancora pubblicato annunci` + CTA `Pubblica il primo` → `/post` |

### UGC detail (`/listing/[id]`, `source = 'ugc'`)

| Interaction | Behavior |
|-------------|----------|
| Branch | Server renders `UgcListingShell`; scraped path unchanged (D-70) |
| Top bar | Back, Favorite, Share, `more_horiz` overflow (report) — no Subito button |
| Hero badges | Gray `Community` source chip + relative time chip; if claimed → gray `Riservato` |
| Metadata shown | Title, photo, zone, posted time, optional description, status — **no** home address (D-72) |
| Buyer primary CTA | `Contatta` — black full-width; opens DM drawer (D-71) |
| Buyer auth | If logged out, auth modal first; then open DM |
| Owner view | Replace `Contatta` with `Segna riservato` / `Segna consegnato` stacked secondary+primary |
| Hidden owner view | `HiddenReviewBanner` above hero; read-only metadata |
| Reserved listing | `Contatta` disabled with helper `Questo annuncio è riservato` |
| Share | Same Web Share flow as Phase 2 |

### DM bottom sheet (D-76)

| Interaction | Behavior |
|-------------|----------|
| Open | From `Contatta` on UGC detail |
| Container | vaul Drawer; mobile: slide from bottom full-width; desktop: max-w-lg centered bottom sheet |
| Height | `max-h-[80dvh]`; clears BottomNav (`bottom-16` on mobile) |
| Header | Listing thumbnail + title truncate; close `×` |
| FCFS notice | If another buyer thread exists: read-only banner `Qualcuno potrebbe già essere in contatto` — input disabled (D-75) |
| Safety banner | Persistent top strip; collapses after first dismiss; re-expand via info icon (D-78) |
| First send | Typing + send triggers `SafetyModal` before API call (D-77) |
| Quick replies | Horizontal scroll chips: `È ancora disponibile?`, `Posso passare questo weekend`, `Che orario ti va?` |
| Messages | User bubbles: black bg white text right-aligned; other party: white bg border left-aligned |
| Poll | Refetch messages every 10 000 ms while drawer open (D-74) |
| Send | Enter or send icon; empty disabled |
| Rate limit | Toast `Troppi messaggi — riprova tra un'ora` on 5 conv/hour limit (D-85) |
| Close | Swipe down or `×`; returns to detail |

### Safety modal (first send — D-77)

| Interaction | Behavior |
|-------------|----------|
| Trigger | First message send attempt per conversation |
| Content | Icon `shield` + 3 bullet safety rules (see Copywriting) |
| Primary | `Ho capito` — dismisses modal and sends pending message |
| Dismiss without send | Secondary `Annulla` — returns to compose without sending |
| Storage | `localStorage` key per `conversation_id` or server flag `safety_ack_at` |

### Report menu (D-79)

| Interaction | Behavior |
|-------------|----------|
| Trigger | `more_horiz` on detail top bar — all sources |
| Auth | Login required; auth modal if logged out |
| Reasons | Radio list: `Già preso / non più disponibile`, `Non è gratis`, `Spam o truffa` |
| Confirm | Primary `Invia segnalazione` |
| Duplicate | Toast `Hai già segnalato questo annuncio` (unique per reporter — D-82) |
| Success | Toast `Segnalazione inviata — grazie`; soft-hide listing from reporter feed (D-84) |
| Auto-hide | Server-side; no user-facing countdown UI |

### Reserved badge on cards (D-69)

| Interaction | Behavior |
|-------------|----------|
| Visibility | UGC with `status = claimed` remains on map/list |
| Card overlay | Top-left stack: source badge + `Riservato` gray chip below |
| Chip style | `bg-surface-container-highest text-on-surface-variant border border-outline-variant`; uppercase label 10px |
| Title | **No** strikethrough — title remains full weight |
| Map pin | Same orange dot; popup includes `Riservato` chip |
| Detail | Sidebar status: gray dot + `Riservato` (no green pulse) |

### Hidden pending banner (D-83)

| Interaction | Behavior |
|-------------|----------|
| Audience | Listing owner only |
| Surfaces | UGC detail owner view, `/post/manage` row |
| Copy | `Nascosto — in revisione` |
| Style | `bg-error-container/30` tint + `border-outline-variant`; icon `visibility_off` |
| Body | `Il tuo annuncio non è visibile agli altri utenti mentre lo verifichiamo.` |

---

## Spacing Scale

Inherited unchanged from Phase 2 (`02-UI-SPEC.md` / DESIGN.md):

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | Icon gaps, inline padding |
| space-sm | 8px | Chip gaps, card internal gaps, DM bubble padding |
| space-md | 16px | Default spacing, form section gaps, modal padding |
| space-lg | 24px | Section padding, gutter, post form vertical rhythm |
| space-xl | 48px | Post page major breaks |
| gutter | 24px | Horizontal page padding |
| container-max | 1200px | Detail grid max width |
| post-max | 800px | Post form column max width (Stitch prototype) |

**Phase 3 exceptions:**

| Exception | Value | Usage |
|-----------|-------|-------|
| Post form max width | 800px | `max-w-[800px]` centered on `/post` |
| DM drawer height | 80dvh max | Message thread viewport |
| Pin map min height | 240px | Quick Post mini-map; Street Dump map section |
| Upload zone aspect | 16:9 | Photo dashed upload and preview |
| Tab underline offset | 2px | Active tab indicator below label — **decorative exception** (not layout grid; 2px hairline per Stitch tab pattern) |
| Icon touch target | 36–44px | Unchanged from Phase 2 |
| BottomNav clearance | `pb-28` | Post/manage pages content padding |

---

## Typography

Inherited contract from Phase 2 — **4 semantic sizes, 2 weights**. No new sizes.

| Token | Size | Weight | Line Height | Phase 3 usage |
|-------|------|--------|-------------|---------------|
| **label** | 12px | 400 / 600 | 1.2–1.4 | Tab labels, badges, timestamps, quick replies, form hints, safety bullets |
| **body** | 15px | 400 | 1.6 | Description, DM messages, modal body, manage row metadata |
| **heading** | 24px | 600 | 1.3–1.4 | Post page title, DM drawer title, safety modal heading |
| **display** | 32px | 600 | 1.2 | UGC detail listing title (`text-h1-mobile`) |

**Input typography:** Title field uses `text-h3` (24px semibold) with `.notion-input` bottom-border focus — matches Stitch post prototype.

**Weights:** 400 regular, 600 semibold only.

---

## Color

Inherited 60/30/10 monochrome + semantic orange from Phase 2. Phase 3 additions:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) — surface | `#f9f9f8` | Post form, detail, DM drawer, modals |
| Secondary (30%) — containers | `#eeeeed` / `#f4f4f3` / `#f1f1f0` | Upload hover, DM thread bg, safety banner, chip inactive |
| UGC source badge | `#e2e2e1` bg (`surface-container-highest`) + `#444748` text | `Community` chip on UGC cards/detail — **not** orange |
| Reserved badge | `#e2e2e1` bg + `#444748` text | `Riservato` chip — gray, not error red |
| Primary CTA | `#000000` bg / `#ffffff` text | `Pubblica gratis`, `Contatta`, `Ho capito`, `Invia link di accesso` |
| Accent orange | `#df6b05` | Unchanged: map pins, `Gratis` tag, favorited heart — **not** UGC source badge |
| Destructive | `#ba1a1a` (`error`) | Report confirm only when reason selected; hidden banner icon accent |
| Error container | `#ffdad6` | Hidden-review banner tint |
| DM user bubble | `#1a1c1c` bg / white text | Sent messages |
| DM other bubble | white bg / `#e5e5e5` border | Received messages |
| Modal overlay | `rgba(0,0,0,0.4)` | Auth + safety modals |

**Accent orange reserved for:** map pins, `Gratis` price pill, favorited heart, brand mark — NOT for UGC source identity, reserved state, or primary CTAs.

**Accent blue (DESIGN.md links):** Deferred; inline links use `text-on-surface underline`.

---

## Copywriting Contract

All chrome strings in `messages/it.ts`. Listing titles/descriptions remain user-authored.

### Post flow

| Element | Copy (Italian) |
|---------|----------------|
| Page title | `Pubblica un annuncio` |
| Tab Quick Post | `Pubblica` |
| Tab Street Dump | `Street Dump` |
| Photo label | `Foto principale` |
| Photo upload hint | `Tocca per caricare o trascina qui` |
| Photo format hint | `JPG, PNG o WebP — max 5 MB` |
| Title placeholder | `Cosa regali?` |
| Zone label | `Zona` |
| Details expander | `Aggiungi dettagli` |
| Description placeholder | `Condizione, dimensioni, note per il ritiro…` |
| Primary CTA | `Pubblica gratis` |
| Submit loading | `Pubblicazione…` |
| Upload loading | `Caricamento…` |
| Guidelines footnote | `Pubblicando accetti le linee guida della community.` |
| Pin error | `Sposta il pin dentro Venezia` |
| Success toast | `Annuncio pubblicato` |
| Rate limit post | `Hai raggiunto il limite di 3 annunci al giorno` |
| Manage link | `I miei annunci` |
| Street Dump helper | `Conferma la posizione sulla mappa — non pubblichiamo automaticamente.` |
| Geolocation denied | `Posizione non disponibile — attiva i permessi o usa la scheda Pubblica.` |
| Geolocation timeout | `Impossibile rilevare la posizione — riprova o seleziona manualmente sulla mappa.` |
| Geolocation unavailable | `Geolocalizzazione non supportata — usa la scheda Pubblica per selezionare la zona.` |
| Upload invalid file | `File non valido — max 5 MB, JPG/PNG/WebP` |

### Auth modal

| Element | Copy (Italian) |
|---------|----------------|
| Title | `Accedi per continuare` |
| Body | `Inserisci la tua email — ti invieremo un link per accedere.` |
| Email placeholder | `nome@email.com` |
| Primary CTA | `Invia link di accesso` |
| Success | `Controlla la tua email per il link di accesso` |
| Error | `Impossibile inviare il link — riprova` |

### UGC detail

| Element | Copy (Italian) |
|---------|----------------|
| Primary CTA (buyer) | `Contatta` |
| Owner action reserved | `Segna riservato` |
| Owner action gone | `Segna consegnato` |
| Source badge | `Community` |
| Status available | `Disponibile` |
| Status reserved | `Riservato` |
| Reserved CTA disabled | `Questo annuncio è riservato` |
| Free label | `Gratis` (reuse `messages.listing.free`) |

### DM

| Element | Copy (Italian) |
|---------|----------------|
| Drawer title prefix | `Messaggi` |
| Empty thread | `Scrivi al proprietario per organizzare il ritiro.` |
| Quick reply 1 | `È ancora disponibile?` |
| Quick reply 2 | `Posso passare questo weekend` |
| Quick reply 3 | `Che orario ti va?` |
| Input placeholder | `Scrivi un messaggio…` |
| FCFS notice | `Qualcuno potrebbe già essere in contatto` |
| Rate limit | `Troppi messaggi — riprova tra un'ora` |
| Send error | `Impossibile inviare — riprova` |

### Safety (D-77)

| Element | Copy (Italian) |
|---------|----------------|
| Modal title | `Incontra in sicurezza` |
| Bullet 1 | `Scegli un luogo pubblico e ben illuminato.` |
| Bullet 2 | `Tieni la conversazione nell'app — non condividere numeri di telefono subito.` |
| Bullet 3 | `Non pagare mai per un oggetto che dovrebbe essere gratis.` |
| Primary CTA | `Ho capito` |
| Cancel | `Annulla` |
| Banner short | `Incontra in un luogo pubblico. Non pagare per oggetti gratuiti.` |
| Banner expand | `Mostra consigli di sicurezza` |

### Report (D-79)

| Element | Copy (Italian) |
|---------|----------------|
| Menu trigger label | `Altre opzioni` |
| Menu item | `Segnala annuncio` |
| Dialog title | `Segnala annuncio` |
| Reason 1 | `Già preso / non più disponibile` |
| Reason 2 | `Non è gratis` |
| Reason 3 | `Spam o truffa` |
| Confirm CTA | `Invia segnalazione` |
| Success toast | `Segnalazione inviata — grazie` |
| Duplicate toast | `Hai già segnalato questo annuncio` |
| Error toast | `Impossibile inviare la segnalazione — riprova` |

### Manage / hidden (D-83)

| Element | Copy (Italian) |
|---------|----------------|
| Page title | `I miei annunci` |
| Empty heading | `Non hai ancora pubblicato annunci` |
| Empty CTA | `Pubblica il primo` |
| Hidden banner title | `Nascosto — in revisione` |
| Hidden banner body | `Il tuo annuncio non è visibile agli altri utenti mentre lo verifichiamo.` |

### Destructive confirmation

| Action | Copy |
|--------|------|
| Mark reserved | No modal — immediate action with toast `Segnato come riservato` |
| Mark delivered | Confirm dialog: title `Segna come consegnato?`; body `L'annuncio non sarà più visibile.`; confirm `Segna consegnato`; cancel `Annulla` |
| Report | No destructive styling — neutral confirm via `Invia segnalazione` |

---

## UI Considerations

Applicable state considerations resolved: 18 covered, 1 backstop, 0 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | DM thread (no messages) | ✅ covered | Centered `dm.emptyThread` copy in scroll area |
| empty | `/post/manage` (no listings) | ✅ covered | Heading + `Pubblica il primo` CTA |
| empty | Photo not yet uploaded | ✅ covered | Dashed upload zone with hint copy |
| loading | Photo upload in progress | ✅ covered | Submit disabled + `Caricamento…` label |
| loading | Post submit | ✅ covered | Button `Pubblicazione…` disabled state |
| loading | DM poll refresh | ✅ covered | Silent background refetch; no skeleton (10s interval) |
| loading | Auth magic link send | ✅ covered | Button disabled + spinner during OTP request |
| error | Pin outside Venice | ✅ covered | Inline `post.pinError` below map |
| error | Post rate limit | ✅ covered | Toast `post.rateLimitPost` |
| error | DM rate limit | ✅ covered | Toast `dm.rateLimit` |
| error | Upload too large / wrong type | ✅ covered | Toast `post.uploadInvalid` — see Copywriting Contract |
| error | Street Dump geolocation denied/timeout | ✅ covered | Inline below map: `post.geolocationDenied` / `post.geolocationTimeout` / `post.geolocationUnavailable` |
| error | Report duplicate / failed | ✅ covered | Toasts in Copywriting Contract |
| populated | UGC vs scraped detail branch | ✅ covered | Server branch on `source`; distinct shells |
| populated | Reserved UGC on map/list | ✅ covered | Gray `Riservato` chip; card remains tappable |
| partial | FCFS active DM (other buyer) | ✅ covered | Read-only notice + disabled input |
| partial | Owner hidden listing | ✅ covered | `HiddenReviewBanner`; excluded from public feeds server-side |
| overflow | Long listing title in DM header | ✅ covered | `truncate max-w-[220px]` on preview strip |
| overflow | Quick reply chip row | ✅ covered | Horizontal `overflow-x-auto no-scrollbar` |
| long-text | User-authored description | 🧪 backstop | Render full text in article section; visual test at 2000 chars for layout break |
| zero-one-many | Multiple owner listings on manage | ✅ covered | Feed list pattern; one row per listing |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | drawer, button, toast (Phase 2 manual); dialog (Phase 3 — copy in-repo) | not required — no `components.json` |
| third-party | none | not required |

---

## Anti-Patterns (BLOCKING)

Inherited from Phase 1–2 plus Phase 3 guardrails:

- Default shadcn/Tailwind theme colors or rounded-xl/2xl card shadows on listing surfaces
- Category/condition pickers from Vite `PostItemView` or Stitch post prototype (removed per D-58)
- Auto-publish on Street Dump GPS seed without map confirm (D-57, Pitfall 8)
- Home address text field or exact address display on UGC detail (D-72)
- In-app DM or `Contatta` CTA on scraped (`subito`) listings (D-71)
- Global login wall on browse, favorites, or map (D-54)
- Supabase Realtime subscriptions for DM in Phase 3 (D-74)
- Orange accent on UGC source badge (reserved for scraped/free semantics)
- Title strikethrough for reserved listings (use gray chip per discretion lock)
- Storing/displaying EXIF location in client preview metadata
- iframe or external contact for UGC listings
- Box shadows on static cards (DM bubbles: border-only for received; no shadow-2xl)
- Hardcoded hex outside `@theme` tokens

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS (aria-label table added post-review)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS (2px tab underline documented as decorative exception)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-30
