# Phase 5: Trilingual UI (Italian / English / Chinese) - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 completes consumer-facing internationalization so users can use the entire app in Italian, English, or Chinese. It delivers: browser-locale-aware first visit with Chinese fallback, persistent language preference, quick language switching from header and Settings, full UI chrome translation in all three languages (I18N-01, I18N-02), locale-aware push notifications, and locale-aware display of scraped listing fields when Phase 6 translation columns exist.

Requirements in scope: I18N-01, I18N-02.

Out of scope: Ingest-time translation pipeline (Phase 6 D-24–D-27, D-43–D-44); admin console UI (Phase 6); auto-translating UGC user-authored titles; closed Chinese community scraping; native mobile app (v2).

**Partial implementation note:** Quick task `260804-hed` already shipped zh/en/it message catalogs, `useMessages()` hook, client UI migration, and Settings language segment. Phase 5 planning should treat that work as foundation — not greenfield — and focus on gaps: default-locale policy alignment, header switcher, server/push locale storage, listing-field locale resolution (Phase 6 bridge), and I18N-02 coverage audit.

</domain>

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
- **D-137:** Continue **custom message catalogs** in `messages/{zh,en,it}.ts` + `getMessages()` / `useMessages()` — **no next-intl** (D-QL-03) — **Reversibility:** costly — framework switch would touch every component.
- **D-138:** **I18N-02 completion bar:** all user-facing UI chrome (nav, forms, buttons, modals, onboarding, settings, empty states, toasts) translated in zh/en/it; audit and close any remaining hardcoded strings or SSR pages still importing `getMessages('zh')` at module scope without client hydration path — **Reversibility:** reversible.

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

### Reusable Assets
- `messages/{zh,en,it}.ts` + `messages/index.ts` — full catalogs already populated (quick task 260804-hed)
- `lib/i18n/useMessages.ts` — preference-subscribed hook; all client components migrated
- `components/settings/LanguageSection.tsx` — working 3-button language switcher
- `lib/settings/preferences.ts` — localStorage persistence + cross-tab sync events
- `components/shell/DocumentLang.tsx` — maps zh→zh-CN, en→en, it→it on `<html lang>`
- `lib/i18n/get-messages.test.ts` — test coverage for resolver and helpers

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
- Quick task 260804-hed is foundation; Phase 5 closes policy gaps and I18N-02 audit, not rebuild from scratch

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
