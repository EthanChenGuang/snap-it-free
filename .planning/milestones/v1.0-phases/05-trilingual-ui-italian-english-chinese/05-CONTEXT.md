# Phase 5: Trilingual UI (Italian / English / Chinese) - Context

**Gathered:** 2026-08-04
**Updated:** 2026-08-04 (codebase audit — gap-closure scope)
**Status:** Ready for planning (gap-closure, not greenfield)

<domain>
## Phase Boundary

Phase 5 **closes remaining i18n gaps** so users can use the entire app in Italian, English, or Chinese. Quick task `260804-hed` (2026-08-04) already shipped ~70% of the work — catalogs, client hook, Settings switcher, and full UI chrome migration. Phase 5 delivers what is still missing: browser-locale first visit, header quick switch (I18N-01 “from anywhere”), server/push locale, listing-field locale bridge (Phase 6), doc alignment, and a light I18N-02 audit.

Requirements in scope: I18N-01 (partial — finish), I18N-02 (partial — audit + close gaps).

Out of scope: Rebuilding catalogs or migrating components again; ingest-time translation (Phase 6); admin console UI; UGC auto-translate; next-intl / `[locale]` routing.

</domain>

<shipped>
## Already Shipped (260804-hed — do NOT replan)

Verified in codebase 2026-08-04:

| Capability | Status | Location |
|------------|--------|----------|
| zh/en/it message catalogs (~390 lines each) | ✅ Shipped | `messages/{zh,en,it}.ts` |
| `getMessages()` + `DEFAULT_LANGUAGE = 'zh'` | ✅ Shipped | `messages/index.ts` |
| `useMessages()` client hook | ✅ Shipped | `lib/i18n/useMessages.ts` |
| Settings 3-button language segment (Stitch) | ✅ Shipped | `components/settings/LanguageSection.tsx` |
| Preference persistence (localStorage) | ✅ Shipped | `lib/settings/preferences.ts` |
| Instant client re-render on language change | ✅ Shipped | `useMessages()` + preference store |
| ~50 client components on `useMessages()` | ✅ Shipped | `components/**/*.tsx` |
| `html[lang]` sync | ✅ Shipped | `components/shell/DocumentLang.tsx` |
| Locale helpers (zone, category, relative time) | ✅ Shipped | `messages/index.ts` |
| PWA manifest zh branding | ✅ Shipped | `app/manifest.ts` |
| Resolver unit tests (7 passing) | ✅ Shipped | `lib/i18n/get-messages.test.ts` |
| Default `zh` in code constants | ✅ Shipped | `preferences.ts`, `messages/index.ts` |

**I18N-02:** Largely satisfied for UI chrome. Remaining audit items only (see gaps).

**I18N-01 partial:** Settings switch works; header switch and browser first-visit do not.

</shipped>

<gaps>
## Remaining Gaps (Phase 5 scope)

| Gap | Decision IDs | Priority |
|-----|--------------|----------|
| Header language dropdown on all main pages | D-123–D-128 | P0 — closes I18N-01 |
| Browser locale on first visit (no localStorage) | D-120, D-122 | P0 |
| ROADMAP/REQUIREMENTS "Italian default" doc drift | D-119 | P1 |
| Server-side language storage (profile / push) | D-129 | P1 |
| Push notifications in user locale + translated title | D-136 | P1 |
| Listing field resolver (title_en/zh fallback) | D-133 | P2 — bridge until Phase 6 columns |
| Light I18N-02 audit (metadata, key parity) | D-138 | P2 |

**Explicitly NOT gaps:** catalog creation, component migration, Settings segment, next-intl, cookie SSR locale.

</gaps>

<decisions>
## Implementation Decisions

### Default Language & First Visit
- **D-119:** **Default language is Chinese (`zh`)** — update `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` to replace "Italian (default)" with Chinese default — **Reversibility:** reversible — documentation + constant alignment.
- **D-120:** **First visit (no saved preference):** detect browser locale — use `zh` if browser language is Chinese, `it` if Italian, `en` if English; **fallback `zh`** for all other locales — **Reversibility:** reversible.
- **D-121:** **Server-side default locale is `zh`** when user preference is unavailable (SSR snapshot, API module-scope messages, cron workers without user context) — **Reversibility:** reversible.
- **D-122:** **Do not reset existing users** — keep saved `shoumanwu_app_preferences.language` as-is; browser-detect applies only when no valid preference exists — **Reversibility:** reversible.

### Language Switcher (I18N-01)
- **D-123:** Add **compact text dropdown in shared Header** (right cluster, alongside favorites/menu) on **all main pages** — satisfies ROADMAP "switch from anywhere" alongside Settings — **Reversibility:** reversible.
- **D-124:** Header dropdown **closed state shows native script** of current language: `中文`, `English`, `Italiano`; open state lists all three — **Reversibility:** reversible.
- **D-125:** **Keep Settings 3-button segment control** (`LanguageSection`) — header and Settings are complementary, not redundant replacements — **Reversibility:** reversible.
- **D-126:** Header and Settings both call **`writeAppPreferences({ language })`** — same `shoumanwu_app_preferences` key; changes sync instantly via existing preference store — **Reversibility:** reversible.
- **D-127:** Header language control uses **minimum 44px touch target** — match mobile PWA header icon sizing — **Reversibility:** reversible.
- **D-128:** Language switch is **instant client re-render via `useMessages()`** — no toast, no full page reload — **Reversibility:** reversible.

### Server, API & Push Locale
- **D-129:** **Store user UI language server-side** (Supabase user profile column and/or `push_subscriptions` locale field) so push notifications use the user's chosen language — **Reversibility:** costly — migration + sync on preference change.
- **D-130:** **API Route Handler error strings** remain server-locale (`zh` default at module scope); client maps known error codes to translated user-facing messages where needed — **Reversibility:** reversible.
- **D-131:** **PWA manifest** (`app/manifest.ts`) stays **Chinese branding** — name/description via `getMessages('zh')` — **Reversibility:** reversible.
- **D-132:** **SSR pages** continue **zh snapshot at render**; client hydrates to user preference via `useMessages()` / `DocumentLang` — no cookie-based SSR locale in Phase 5 — **Reversibility:** reversible.

### Listing Content Display (Phase 6 Bridge)
- **D-133:** **Scraped listing fields** display by active user locale: read `title_en` / `title_zh` (and `description_*`, `category_*` equivalents) per Phase 6 D-30; **fallback to original Italian `title`** when translation column missing — Phase 5 does not run on-the-fly translation — **Reversibility:** costly — touches all listing card/detail/query selects once Phase 6 columns exist.
- **D-134:** **UGC listing titles/descriptions stay as user-authored** — Phase 6 ingest translation (D-24) applies to scraped supply only; no UGC auto-translate in Phase 5 — **Reversibility:** one-way — product boundary from Phase 3 D-88.
- **D-135:** **Zone and category labels** remain UI chrome via existing `messages/*.ts` catalogs (`zoneLabel`, `categoryLabel`) — no listing-field work — **Reversibility:** reversible.
- **D-136:** **Push notification title** uses **translated listing title** for user's stored locale when translation column available; fallback to original title — **Reversibility:** reversible.

### i18n Architecture (carry forward from quick task 260804-hed)
- **D-137:** Continue **custom message catalogs** in `messages/{zh,en,it}.ts` + `getMessages()` / `useMessages()` — **no next-intl** (D-QL-03) — **SHIPPED** by 260804-hed; Phase 5 extends only, does not replace — **Reversibility:** costly.
- **D-138:** **I18N-02 audit (light):** chrome migration is **shipped** (~50 components on `useMessages()`); Phase 5 runs key-parity test + fixes stragglers (e.g. `app/layout.tsx` metadata description) — **not** a full re-migration — **Reversibility:** reversible.

### Claude's Discretion
- Exact browser locale detection logic (`navigator.language` parsing, `zh-CN` vs `zh-TW` handling)
- Whether user language lives on `profiles.language` vs `push_subscriptions.locale` vs both
- Header dropdown primitive (Radix Select vs custom popover restyled to Stitch)
- Sync preference to server on login only vs on every language change
- Order of language options in header dropdown (zh/en/it vs current locale first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Italian/English/Chinese audience, Chinese-student population, PWA-first
- `.planning/REQUIREMENTS.md` — I18N-01, I18N-02 (update default language to zh during Phase 5)
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria (update default to zh)

### Prior Phase Context
- `.planning/phases/02-map-list-core-browsing/02-CONTEXT.md` — D-51/D-52 Italian chrome pre-i18n, listing titles as scraped
- `.planning/phases/03-ugc-posting-community-marketplace/03-CONTEXT.md` — D-88 user-authored UGC titles
- `.planning/phases/04-auth-alerts-push-notifications/04-CONTEXT.md` — D-107 push Italian chrome (superseded by D-129/D-136), auth/profile patterns

### Phase 6 Bridge (listing translation columns — parallel, not blocking UI chrome)
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-CONTEXT.md` — D-24 ingest translation, D-30 consumer display by locale, D-44 column schema (`title_en`, `title_zh`, …)

### Quick Task Foundation
- `.planning/quick/260804-hed-english-italiano/260804-hed-SUMMARY.md` — existing catalogs, useMessages migration, D-QL-02/03/04 decisions

### Design Reference
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens for header dropdown
- `.planning/google-stitch-ui-design/setting_notion_style/code.html` — Settings language segment reference
- `.planning/google-stitch-ui-design/SKILL.md` — strict UI porting rules

### Code — i18n Infrastructure
- `messages/index.ts` — `DEFAULT_LANGUAGE`, `getMessages()`, helpers
- `messages/zh.ts`, `messages/en.ts`, `messages/it.ts` — message catalogs
- `lib/i18n/useMessages.ts` — client hook bound to preferences
- `lib/settings/preferences.ts` — `AppLanguage`, `writeAppPreferences`, localStorage key
- `components/settings/LanguageSection.tsx` — Settings 3-button segment
- `components/shell/Header.tsx` — header switcher integration point
- `components/shell/DocumentLang.tsx` — `html[lang]` sync
- `lib/alerts/process-events.ts` — push fan-out (needs user locale per D-129)
- `lib/i18n/get-messages.test.ts` — resolver unit tests

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (shipped — extend, do not rebuild)
- `messages/{zh,en,it}.ts` + `messages/index.ts` — full catalogs (260804-hed)
- `lib/i18n/useMessages.ts` — all client UI reads through this
- `components/settings/LanguageSection.tsx` — **reuse `LANGUAGES` array** for header dropdown labels
- `lib/settings/preferences.ts` — add browser detect on first visit only
- `components/shell/DocumentLang.tsx` — already wired
- `lib/i18n/get-messages.test.ts` — extend with browser-detect + key-parity tests

### Established Patterns
- Client components call `useMessages()` inside render — never bake `messages.*` at module scope in client components
- Server/API/cron use `getMessages('zh')` at module scope — needs user-locale path for push (D-129) and profile sync
- Listing content vs UI chrome split from Phase 2 D-52 — Phase 6 adds translated columns; Phase 5 reads by locale
- Stitch monochrome UI — header dropdown must use Stitch tokens, not default shadcn palette

### Integration Points
- `components/shell/Header.tsx` — add compact language dropdown (D-123–D-127)
- `lib/settings/preferences.ts` — extend first-visit browser locale detection (D-120)
- Supabase user profile or `push_subscriptions` — store language for server push (D-129)
- `lib/alerts/process-events.ts` — resolve push title/body by user stored locale + translated listing columns (D-136)
- Listing queries/cards/detail — select locale-appropriate title/description columns when Phase 6 migration lands (D-133)
- `.planning/ROADMAP.md` + `.planning/REQUIREMENTS.md` — update default language documentation (D-119)

</code_context>

<specifics>
## Specific Ideas

- Default audience skews Chinese (international students) — Chinese default is intentional, not an accident to revert
- Header quick switch + Settings segment — user wants both, not either/or
- Listing translation is Phase 6 ingest work; Phase 5 only reads translated columns by locale (user confirmed: refer to Phase 6)
- Push should show translated listing title when available — not always original Italian
- ~70% shipped via 260804-hed; Phase 5 is gap-closure (header, browser detect, server push, audit)
- UI design authority: `.planning/google-stitch-ui-design/` (user confirmed 2026-08-04)

</specifics>

<deferred>
## Deferred Ideas

- Cookie-based SSR locale — deferred; client hydration sufficient for Phase 5
- On-the-fly listing translation (Gemini at display time) — Phase 6 ingest-time only
- UGC title auto-translation — out of scope; user-authored content stays as posted
- next-intl or `[locale]` URL routing — rejected (D-QL-03)
- Email digest alerts in user locale — post-v1
- Admin console i18n — Phase 6 D-34 (Chinese-primary admin, separate from consumer app)

</deferred>

---

*Phase: 05-Trilingual UI (Italian / English / Chinese)*
*Context gathered: 2026-08-04*
