# Codebase Concerns

**Analysis Date:** 2026-07-27

## Tech Debt

**UI-only draft with no backend:**
- Issue: The entire app runs on in-memory/localStorage state with static seed data. No Supabase, scraper, API layer, or server code exists despite Phase 1 plans (`01-01-PLAN.md` through `01-04-PLAN.md`) and roadmap dependency chain (Phase 2 depends on Phase 1).
- Files: `src/App.tsx`, `src/data/initialItems.ts`, entire `src/` tree
- Impact: Zero v1 requirements (34 total in `.planning/REQUIREMENTS.md`) are implemented; the app cannot validate the core value proposition with real Venice listings.
- Fix approach: Execute Phase 1 first (Supabase schema + Subito scraper), then wire Phase 2 UI to live API instead of extending the mock layer.

**Data model diverges from planned canonical schema:**
- Issue: `Item` in `src/types.ts` uses `category`, `condition`, `Owner`, `cost`, `district` — not the planned fields: `source` badge (`subito` / `facebook` / `ugc`), Venice zone tag (`Centro Storico` / `Mestre-Marghera` / `Lido-Murano`), `sourceUrl`, `expiresAt`, or scraped-vs-UGC distinction.
- Files: `src/types.ts`, `src/data/initialItems.ts`, `src/components/PostItemView.tsx`
- Impact: Every component assumes the wrong shape; Phase 2 integration will require type rewrites and prop drilling changes across all views.
- Fix approach: Define canonical listing types from Phase 1 schema first; refactor draft components to consume that interface rather than patching the AI Studio `Item` type.

**Mock seed data is off-domain:**
- Issue: 9 of 11 seed items are in Shanghai, Berlin, Tokyo, London, NYC, Paris, Seoul — not Venice. Zone chips in `MapView.tsx` mix `"Jing'an"` with partial Venice names. Two Venice items (`item-10`, `item-11`) display paid prices (`¥12,800`, `¥4,200`) despite the free-only premise and SCRP-05 filter requirement.
- Files: `src/data/initialItems.ts` (lines 297, 323), `src/components/MapView.tsx` (line 21)
- Impact: Misleading demo UX; false-positive "free" listings would fail ingestion filters in production.
- Fix approach: Replace seed data with Venice-only fixtures matching canonical schema, or remove seed data once live scraper feed exists.

**Map is decorative, not geospatial:**
- Issue: `MapView.tsx` renders a static background image and places pins by array index (`topPercent = 25 + ((index * 13) % 55)`) — ignoring `item.lat` / `item.lng`. No map library (Leaflet, Mapbox, Google Maps) is integrated.
- Files: `src/components/MapView.tsx` (lines 111–141)
- Impact: DISC-01 (map-first browsing with real pins) is unmet; users cannot trust pin placement for pickup navigation in Venice's bridge-heavy geography.
- Fix approach: Integrate a budget-conscious map provider per `.planning/research/STACK.md`; project lat/lng to map coordinates; center on Venice bounding box.

**Unused AI Studio scaffolding:**
- Issue: `@google/genai`, `express`, and `dotenv` are listed in `package.json` but never imported. `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` and `requestFramePermissions: ["geolocation"]`, but no Gemini calls or geolocation API usage exist. README is generic AI Studio boilerplate; package name is still `"react-example"`.
- Files: `package.json`, `metadata.json`, `README.md`, `.env.example`
- Impact: Confusing dependency surface; geolocation permission may be requested by hosting platform without app benefit; dead weight in bundle audit.
- Fix approach: Remove unused deps until Phase 3+ needs them; update `package.json` name, README, and metadata to reflect ShouManWu PWA scope.

**localStorage as sole persistence layer:**
- Issue: All items, zones, settings, and chat messages persist to `localStorage` via four `useEffect` hooks in `App.tsx`. No schema versioning, migration, or size guards.
- Files: `src/App.tsx` (lines 22–100)
- Impact: Data is device-local, unshareable, and lost on cache clear; posted images as base64 data URLs can exceed the ~5 MB localStorage quota.
- Fix approach: Replace with Supabase-backed state for listings/auth; keep localStorage only for ephemeral UI prefs if needed.

**Simulated business logic:**
- Issue: Claim (`handleClaimItem`), chat (`handleSendMessage` with `setTimeout` auto-reply), and post (`PostItemView` with fake owner `"You (Current User)"`) are client-side demos with no server validation.
- Files: `src/App.tsx` (lines 109–203), `src/components/PostItemView.tsx` (lines 56–93), `src/components/ItemDetailView.tsx`, `src/components/ChatModal.tsx`
- Impact: UX patterns (claim, DM, reserve) will mislead stakeholders about what's real; CONT-01 through CONT-05 and MOD-01 through MOD-03 are entirely absent.
- Fix approach: Gate or label demo flows clearly until backend exists; implement real flows in Phase 3 with auth and moderation.

**Partial i18n stub:**
- Issue: Language setting (`zh` / `en` / `it`) only translates four BottomNav labels in `BottomNav.tsx`. All other UI strings are hardcoded English (or Chinese in `index.html` title). Default language is `'zh'` in `App.tsx`, but PROJECT.md specifies Italian as primary.
- Files: `src/components/BottomNav.tsx`, `src/App.tsx` (line 56), `index.html` (line 2), `src/components/SettingsView.tsx`
- Impact: I18N-01 and I18N-02 (Phase 5) require full rewrite; current setting gives false impression of multilingual support.
- Fix approach: Introduce i18n library (e.g. react-i18next) in Phase 5; default to `'it'`; do not expand partial inline translations.

**Non-functional settings:**
- Issue: `appearance` toggle cycles Light/Dark/System in settings state but no CSS/dark-mode classes are applied. `pushNotifications` and `soundAlerts` toggles persist locally but trigger no service worker or audio. `pinLocation` checkbox in `PostItemView.tsx` does not change GPS behavior (coords are hardcoded to Shanghai: `lat: 31.23, lng: 121.45`).
- Files: `src/components/SettingsView.tsx`, `src/components/PostItemView.tsx` (lines 243–266, 86–87)
- Impact: Settings UI promises capabilities (NOTF-01–05, UGC-02 Street Dump) that do not exist.
- Fix approach: Hide or disable non-functional toggles until wired; implement Street Dump with `navigator.geolocation` when Phase 3 starts.

## Known Bugs

**Paid items shown as free listings:**
- Symptoms: Items `item-10` and `item-11` display `cost: '¥12,800'` and `cost: '¥4,200'` in list cards, map drawer, and detail view while marked available and claimable.
- Files: `src/data/initialItems.ts` (lines 297, 323)
- Trigger: Browse any view showing these items.
- Workaround: None in app; manual localStorage reset restores same bad seed data.

**Share/deep-link does not reference a listing:**
- Symptoms: Header share button copies `window.location.href` — the root URL with no item ID or route. Opening a shared link does not restore item detail view.
- Files: `src/components/Header.tsx` (lines 62–67), `src/App.tsx` (no router)
- Trigger: Share from detail view on any item.
- Workaround: None; DISC-05 deep-link to source also unimplemented.

**Zone filter semantics mismatch:**
- Symptoms: Map area chips (`Centro Storico`, `Mestre`, `Lido`, `Jing'an`) filter by substring match on `item.location` / `item.district`, not canonical zone tags. Settings "Zones Management" creates alert-monitoring zones unrelated to DISC-03 Venice zone filter.
- Files: `src/components/MapView.tsx` (lines 21–33), `src/components/SettingsView.tsx` (lines 144–198), `src/types.ts` (`Zone` interface)
- Trigger: Filter map by zone or manage zones in settings.
- Workaround: None; two different "zone" concepts conflated in UI.

## Security Considerations

**Hardcoded personal email in UI:**
- Risk: Profile modal displays `ethan.chen.guang@gmail.com` as if it were the logged-in user — a real email address baked into source.
- Files: `src/components/SettingsView.tsx` (line 282)
- Current mitigation: None; visible to anyone running the app.
- Recommendations: Remove hardcoded PII; replace with placeholder or auth-derived profile once AUTH-01 ships.

**Unauthenticated posting and claiming:**
- Risk: Any visitor can post items, claim items, and send chat messages with no login gate — contradicts UGC-04, CONT-04, and AUTH-02.
- Files: `src/components/PostItemView.tsx`, `src/components/ListView.tsx`, `src/App.tsx`
- Current mitigation: Data is local-only, limiting cross-user harm.
- Recommendations: Add auth gates before Phase 3 UGC/contact; never ship multi-user DM without server-side authorization.

**Arbitrary image URL input:**
- Risk: Post flow accepts any URL for item images (`type="url"` input) with no domain allowlist. If proxied server-side later, this becomes an SSRF vector.
- Files: `src/components/PostItemView.tsx` (lines 127–138)
- Current mitigation: URLs load directly in `<img>` tags client-side only.
- Recommendations: Restrict uploads to controlled storage (Supabase Storage) with EXIF stripping (UGC-03); block arbitrary URL paste in production.

**localStorage stores full chat and item payloads:**
- Risk: Chat text and base64-encoded photos persist unencrypted in browser storage; accessible to any script on origin or physical device access.
- Files: `src/App.tsx`, `src/components/PostItemView.tsx` (FileReader → data URL)
- Current mitigation: Single-user demo scope.
- Recommendations: Move messages and media to authenticated backend; strip EXIF on upload.

## Performance Bottlenecks

**Synchronous localStorage on every state change:**
- Problem: Four `useEffect` hooks write full JSON snapshots on each items/zones/settings/messages update.
- Files: `src/App.tsx` (lines 86–100)
- Cause: No debouncing or differential persistence.
- Improvement path: Debounce writes; persist only changed keys; move listings off localStorage entirely.

**Base64 images in localStorage:**
- Problem: File uploads in `PostItemView.tsx` convert photos to data URLs stored inside the items array in localStorage.
- Files: `src/components/PostItemView.tsx` (lines 30–38, 50–54), `src/App.tsx`
- Cause: No server upload path.
- Improvement path: Upload to object storage; store URL references only.

**External image dependency:**
- Problem: All seed and default images load from `lh3.googleusercontent.com` and `images.unsplash.com` CDNs with no fallback or self-hosting.
- Files: `src/data/initialItems.ts`, `src/components/MapView.tsx` (line 65), `src/components/SettingsView.tsx`
- Cause: AI Studio generated asset URLs.
- Improvement path: Host scraped/UGC images in Supabase Storage; add loading/error states.

## Fragile Areas

**Monolithic state in App.tsx:**
- Files: `src/App.tsx` (~296 lines)
- Why fragile: All domain state, persistence, and handlers live in one component. Adding auth, API fetching, or routing will compound complexity quickly.
- Safe modification: Extract custom hooks (`useListings`, `useSettings`) or state library before Phase 2 API integration.
- Test coverage: None.

**MapView pin positioning:**
- Files: `src/components/MapView.tsx`
- Why fragile: Index-based layout breaks when items are filtered, reordered, or geolocated — pins jump arbitrarily and duplicate positions for similar indices.
- Safe modification: Do not extend current pin logic; replace with map-library coordinate projection.
- Test coverage: None.

**Item type as shared contract:**
- Files: `src/types.ts`, all `src/components/*.tsx`
- Why fragile: Every view imports `Item` directly; schema migration touches 8+ files simultaneously.
- Safe modification: Introduce adapter layer mapping API DTO → UI model during Phase 2 transition.
- Test coverage: None.

## Scaling Limits

**localStorage capacity:**
- Current capacity: Browser-dependent (~5–10 MB); a few base64 photos can fill quota.
- Limit: App throws silent failures or truncates when quota exceeded; `JSON.parse` in init can fail on corrupt data.
- Scaling path: Server-side listing store (Supabase); client cache with TTL only.

**Single-page tab state:**
- Current capacity: One global `currentTab` and `selectedItem` — no multi-item tabs, no URL state, no back-button integration.
- Limit: PWA navigation expectations (back from detail, shareable URLs) break at ~10 lines of state.
- Scaling path: Add client router (React Router) with `/item/:id` routes in Phase 2.

## Dependencies at Risk

**@google/genai (^2.4.0):**
- Risk: Declared but unused; metadata implies server-side Gemini integration that does not exist.
- Impact: Confusion during Phase 1–2 execution; potential unnecessary API key exposure via `.env.example`.
- Migration plan: Remove until a concrete AI feature is scoped; do not block MVP on Gemini.

**Google AI Studio CDN image URLs:**
- Risk: `aida-public` URLs in seed data may expire or break outside AI Studio hosting context.
- Impact: Broken images across list, map, and detail views.
- Migration plan: Replace with stable hosted assets or scraper-sourced thumbnails.

**Vite 6 + React 19 stack:**
- Risk: Bleeding-edge versions with fewer ecosystem examples; no test runner configured to catch regressions.
- Impact: Upgrade friction; undetected breaking changes.
- Migration plan: Pin versions in lockfile; add Vitest before Phase 2 feature work.

## Missing Critical Features

**Phase 1 — Scraper & data pipeline (all SCRP-* requirements):**
- Problem: No Subito scraper, Supabase schema, zone tagging, free-filter, 48h expiry, or operator alerts.
- Blocks: Phase 2 cannot launch with real pins; entire roadmap blocked at step 1.

**Phase 2 — Core browsing (DISC-* requirements):**
- Problem: No real map, no bottom-sheet synced to geospatial data, no zone filter per canonical tags, no in-app WebView for scraped listings, no favorite persistence, no deep-link to Subito source.
- Blocks: Core "find free stuff in Venice" value proposition.

**Phase 3 — UGC & moderation (UGC-*, CONT-*, MOD-*):**
- Problem: Post flow is a local demo; no EXIF stripping, no login gate, no real DM, no reserve/gone states, no safety messaging, no report button or auto-hide.
- Blocks: Community supply and trust mechanics.

**Phase 4 — Auth & notifications (AUTH-*, NOTF-*):**
- Problem: No auth provider, no login prompts at action boundaries, no keyword alerts, no Web Push/VAPID, no iOS Add-to-Home-Screen onboarding, no in-app badge fallback.
- Blocks: User retention and alert-driven re-engagement.

**Phase 5 — Full i18n (I18N-*):**
- Problem: Only 4 nav labels translate; Italian default not enforced; UI chrome is overwhelmingly English.
- Blocks: Target audience (Italian residents + international students) usability.

**PWA infrastructure:**
- Problem: No `manifest.json`, service worker, or install prompt despite PWA launch strategy in PROJECT.md.
- Blocks: NOTF-02 (push requires installed PWA on iOS), offline shell, Add-to-Home-Screen flow.

## Test Coverage Gaps

**Entire application:**
- What's not tested: All user flows — browse, filter, claim, post, chat, settings, persistence, map rendering.
- Files: All of `src/`; no `*.test.*` or `*.spec.*` files; no test runner in `package.json`.
- Risk: Phase 2 API integration will regress silently; schema migrations unverified.
- Priority: High — Phase 1 plans reference "Wave 0 tests"; none exist in this repo yet.

**Linting:**
- What's not tested: Code style and React hooks rules — only `tsc --noEmit` via `npm run lint`; no ESLint/Biome config.
- Files: `package.json` (scripts), no `.eslintrc*` or `eslint.config.*`
- Risk: Latent bugs (missing deps in useEffect, stale closures in chat reply) go undetected.
- Priority: Medium — add ESLint before multi-phase parallel work.

**Build/CI:**
- What's not tested: No GitHub Actions or deploy pipeline; `npm run build` not verified in automation.
- Files: No `.github/workflows/`
- Risk: Production deploy breaks unnoticed.
- Priority: Medium — add CI when hosting target is chosen.

---

*Concerns audit: 2026-07-27*
