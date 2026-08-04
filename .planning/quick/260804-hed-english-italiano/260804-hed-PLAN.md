---
quick_id: 260804-hed
slug: english-italiano
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - messages/it.ts
  - messages/zh.ts
  - messages/en.ts
  - messages/index.ts
  - lib/i18n/useMessages.ts
  - lib/i18n/get-messages.test.ts
  - lib/settings/preferences.ts
  - components/providers/AppThemeProvider.tsx
  - components/settings/LanguageSection.tsx
  - components/shell/BottomNav.tsx
  - app/layout.tsx
  - app/settings/page.tsx
  - app/post/manage/page.tsx
  - app/manifest.ts
  - app/api/alerts/route.ts
  - app/api/alerts/[id]/route.ts
  - app/api/ugc/listings/route.ts
  - app/api/ugc/listings/[id]/route.ts
  - app/api/messages/conversations/route.ts
  - lib/alerts/process-events.ts
  - components/**/*.tsx
must_haves:
  truths:
    - Selecting 中文 / English / Italiano in Settings immediately updates chrome and page copy across the app
    - Fresh installs (no localStorage) default to Chinese (`zh`)
    - LanguageSection no longer shows an "only Italian supported" limitation note
    - Locale helpers (zone, category, relative time) resolve from the active catalog
  artifacts:
    - messages/zh.ts
    - messages/en.ts
    - messages/index.ts
    - lib/i18n/useMessages.ts
  key_links:
    - preferences.language → getMessages / useMessages → UI strings
    - DEFAULT_PREFERENCES.language === 'zh'
---

# Quick 260804-hed: 中文 / English / Italiano switching

**As a** Venice free-finds user, **I want to** switch the app UI among 中文, English, and Italiano (default 中文), **so that** chrome and screens match my language without adding a heavy i18n framework.

Do **not** install `next-intl` / `react-i18next`. Extend the existing `messages/*.ts` + `lib/settings/preferences.ts` approach. Do **not** redesign LanguageSection visuals (Stitch UI stays; behavior becomes real). Focus on Next.js `app/` + `components/` — skip legacy Vite `src/` unless something still mounts it.

## Locked decisions

- D-QL-01: Languages are `zh` | `en` | `it` (already on `AppLanguage`)
- D-QL-02: Default language is **`zh`** (change from current `'it'`)
- D-QL-03: Lightweight custom catalogs + preference resolver — no new i18n library
- D-QL-04: Client UI fully switches; server/API/push use `getMessages('zh')` (or `DEFAULT_LANGUAGE`) — preferences live in localStorage, not on the server
- D-QL-05: Remove/stop showing `settings.languageNote` once switching works

<objective>
Ship real multi-locale UI copy: zh/en/it catalogs, preference-driven resolver/hook, migrate all static `@/messages/it` imports in user-facing UI, default to Chinese.
Purpose: LanguageSection already persists preference but UI ignores it — close that gap.
Output: Working language switch across app chrome + pages; default zh; SUMMARY.md
</objective>

<execution_context>
@/home/guang/Projects/Experiments/.cursor/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@messages/it.ts
@lib/settings/preferences.ts
@components/settings/LanguageSection.tsx
@components/providers/AppThemeProvider.tsx
@app/layout.tsx
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Catalogs, resolver, default zh (tracer path)</name>
  <files>messages/it.ts, messages/zh.ts, messages/en.ts, messages/index.ts, lib/i18n/get-messages.test.ts, lib/settings/preferences.ts, lib/i18n/useMessages.ts, components/settings/LanguageSection.tsx, components/shell/BottomNav.tsx, components/providers/AppThemeProvider.tsx</files>
  <behavior>
    - getMessages('zh'|'en'|'it') returns the matching catalog; unknown falls back to zh
    - DEFAULT_PREFERENCES.language is 'zh'
    - zoneLabel / categoryLabel / formatRelativeTime take an explicit messages catalog (or language) and read strings from that catalog — not a hardcoded Italian map
    - useMessages() re-renders when writeAppPreferences({ language }) fires APP_PREFERENCES_CHANGE_EVENT
  </behavior>
  <action>
    1. Keep `messages/it.ts` as the Italian catalog. Export `Messages` as `typeof messages` (or equivalent) so zh/en can be typed against it.
    2. Add `messages/zh.ts` and `messages/en.ts` with the **same key tree and function signatures** as Italian (full translation — every string key present). Mirror helpers out of per-locale files; put shared helpers in `messages/index.ts` instead.
    3. Create `messages/index.ts` per D-QL-03:
       - `DEFAULT_LANGUAGE = 'zh'`
       - `catalogs: Record<AppLanguage, Messages>`
       - `getMessages(lang?: AppLanguage): Messages` — default/fallback `zh` (D-QL-02)
       - `zoneLabel(zone, messages)`, `categoryLabel(category, messages)`, `formatRelativeTime(iso, messages, now?)` — move logic from `messages/it.ts` helpers; category labels must come from the catalog (extend `messages` with a `categories` map covering `All` / furniture / tech / apparel / books / home_decor if not already complete — post.categories exists but list chips use a separate map today).
       - Re-export types; leave `messages/it.ts` export of bare `messages` for gradual migration but prefer index.
    4. Change `DEFAULT_PREFERENCES.language` from `'it'` to `'zh'` in `lib/settings/preferences.ts` (D-QL-02). Update `AppThemeProvider` SSR/getServerSnapshot object to `language: 'zh'`.
    5. Add `lib/i18n/useMessages.ts`: `useSyncExternalStore(subscribeAppPreferences, readAppPreferences, serverSnapshot)` → return `{ language, messages, zoneLabel, categoryLabel, formatRelativeTime }` bound to the active catalog.
    6. Tracer UI path (D-QL-01): switch `LanguageSection` and `BottomNav` from static `@/messages/it` to `useMessages()`. In LanguageSection, stop rendering `messages.settings.languageNote` (D-QL-05) — delete the conditional note block. Move BottomNav `navItems` labels inside the component (module-level `messages.nav.*` will not react to language).
    7. Add `lib/i18n/get-messages.test.ts` covering getMessages fallback and one helper per locale.
  </action>
  <verify>
    <automated>npx vitest run lib/i18n/get-messages.test.ts && npm run lint</automated>
  </verify>
  <done>Resolver returns zh/en/it; default preference is zh; LanguageSection + BottomNav copy change when language is selected; languageNote UI gone.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate all client UI to useMessages</name>
  <files>components/**/*.tsx, app/settings/page.tsx, app/post/manage/page.tsx</files>
  <action>
    Replace every remaining client-component `import { … } from '@/messages/it'` under `components/` with `useMessages()` (or destructure helpers from it). Rules:
    - Only call the hook inside client components (`'use client'`).
    - Do not leave module-scope reads of `messages.*` that bake in one locale at import time (same BottomNav pitfall).
    - Preserve Stitch markup/classes — string source change only.
    - For thin server wrappers that only pass title strings into Suspense fallbacks (`app/settings/page.tsx`, `app/post/manage/page.tsx`): use `getMessages('zh')` for fallback copy (D-QL-04), or move titles fully into the client child that already uses the hook.
    - Grep gate after: no client UI file under `components/` should still import `@/messages/it` except intentional re-exports if any.
  </action>
  <verify>
    <automated>rg -l "from '@/messages/it'" components/ | wc -l; test "$(rg -l "from '@/messages/it'" components/ | wc -l)" -eq 0 && npm run lint</automated>
  </verify>
  <done>All `components/` UI strings resolve through useMessages; switching language updates map/list/post/settings/detail/DM chrome.</done>
</task>

<task type="auto">
  <name>Task 3: Server/API helpers, html lang, SUMMARY</name>
  <files>app/api/alerts/route.ts, app/api/alerts/[id]/route.ts, app/api/ugc/listings/route.ts, app/api/ugc/listings/[id]/route.ts, app/api/messages/conversations/route.ts, lib/alerts/process-events.ts, app/manifest.ts, app/layout.tsx, components/shell/DocumentLang.tsx, .planning/quick/260804-hed-english-italiano/260804-hed-SUMMARY.md</files>
  <action>
    1. Server/API/push (D-QL-04): replace `@/messages/it` with `getMessages('zh')` (or `getMessages(DEFAULT_LANGUAGE)`) in API routes, `lib/alerts/process-events.ts`, and `app/manifest.ts`. Do not invent cookie/header locale plumbing in this quick task.
    2. Add a tiny client `DocumentLang` (or equivalent) that sets `document.documentElement.lang` from `preferences.language` (`zh`→`zh-CN`, `en`→`en`, `it`→`it`) and mount it under providers in `app/layout.tsx`. Change static html `lang="it"` to `lang="zh"` as SSR default (D-QL-02), keep `suppressHydrationWarning`.
    3. Confirm `settings.languageNote` is unused in UI; empty string or delete key from all three catalogs if nothing references it.
    4. Write `260804-hed-SUMMARY.md` listing catalogs, resolver, default zh, and migration approach.
  </action>
  <verify>
    <automated>npm run lint && npx vitest run lib/i18n/</automated>
  </verify>
  <done>Server strings use getMessages(zh); html lang tracks preference; SUMMARY written; lint + i18n tests pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → UI | User-controlled preference JSON parsed client-side |
| API error strings → client | Server returns localized copy using fixed default locale |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-hed-01 | Tampering | preferences parse | low | mitigate | Keep existing whitelist parse (`zh`\|`en`\|`it` only) in preferences.ts |
| T-hed-02 | Information disclosure | API error messages | low | accept | Errors are generic UX strings, not secrets; fixed zh locale is fine for quick task |
| T-hed-SC | Tampering | npm installs | high | accept | No new packages in this plan |
</threat_model>

<verification>
- Select each language in Settings → BottomNav + Settings headers update immediately
- Clear site data → app loads in Chinese
- `rg "from '@/messages/it'" components/` returns empty
- `npx vitest run lib/i18n/` and `npm run lint` pass
</verification>

<success_criteria>
- UI language switch works for zh, en, it
- Default language is zh
- No next-intl / react-i18next added
- LanguageSection visuals unchanged; limitation note removed
</success_criteria>

<output>
Create `.planning/quick/260804-hed-english-italiano/260804-hed-SUMMARY.md` when execution finishes
</output>
