# Phase 5 Research — Trilingual UI (Italian / English / Chinese)

**Researched:** 2026-08-04  
**Updated:** 2026-08-04 (codebase audit — gap-closure scope)  
**Phase:** 05-trilingual-ui-italian-english-chinese  
**Requirements:** I18N-01 (partial), I18N-02 (partial)

---

## User Constraints

Copied from `05-CONTEXT.md` — planner MUST honor. **Do not replan shipped work** (see Shipped Baseline).

### Default Language & First Visit
- **D-119:** Default language is Chinese (`zh`); update ROADMAP.md + REQUIREMENTS.md — **code shipped**, docs stale
- **D-120:** First visit: browser locale → zh/it/en; fallback `zh` — **NOT shipped**
- **D-121:** Server default `zh` when user preference unavailable — **shipped** (constants + SSR snapshot)
- **D-122:** Do not reset existing saved preferences — **must preserve** on browser-detect implementation

### Language Switcher (I18N-01)
- **D-123–D-128:** Header compact dropdown + Settings segment — **Settings shipped**, **header NOT shipped**

### Server, API & Push Locale
- **D-129:** Store UI language server-side for push — **NOT shipped** (no `profiles` table / no locale column on `push_subscriptions`)
- **D-130:** API errors stay server-locale — **shipped by design** (260804-hed D-QL-04)
- **D-131:** PWA manifest Chinese branding — **shipped** (`app/manifest.ts`)
- **D-132:** SSR zh snapshot; client hydrates — **shipped** (`useMessages` SERVER_SNAPSHOT + `DocumentLang`)

### Listing Content (Phase 6 Bridge)
- **D-133–D-136:** Locale columns with Italian fallback; push translated title — **NOT shipped** (no DB columns, no resolver, push hardcoded zh)

### Architecture
- **D-137:** Custom catalogs — **shipped** (260804-hed)
- **D-138:** I18N-02 audit (light) — **~70% shipped**, audit stragglers only

### UI Authority
- All UI follows `.planning/google-stitch-ui-design/` — port prototypes, `@theme` tokens

---

## Shipped Baseline (260804-hed — verified 2026-08-04)

[VERIFIED: codebase grep + vitest]

| Item | Evidence |
|------|----------|
| Catalogs zh/en/it | `messages/zh.ts` (390L), `en.ts` (394L), `it.ts` (430L incl. deprecated helpers) |
| `DEFAULT_LANGUAGE = 'zh'` | `messages/index.ts`, `DEFAULT_PREFERENCES.language` |
| Client hook | `lib/i18n/useMessages.ts` — 50+ components import |
| Settings switcher | `LanguageSection.tsx` — `writeAppPreferences({ language })` |
| Persistence | `shoumanwu_app_preferences` localStorage |
| Document lang | `DocumentLang.tsx` |
| Tests | `lib/i18n/get-messages.test.ts` — 7/7 pass |
| Push/cron zh-only | `lib/alerts/process-events.ts` L7–8 `getMessages('zh')` — **intentional gap for D-129/D-136** |
| No browser detect | `grep detectBrowser\|navigator.language` → zero matches |
| No header switcher | `Header.tsx` — menu + search only |
| No title_en/zh columns | `grep title_en` in migrations → zero |
| Docs stale | REQUIREMENTS I18N-01 still says "Italian (default)" |

**Requirement status estimate:**
- **I18N-01:** ~60% — Settings + persistence work; header + first-visit missing
- **I18N-02:** ~85% — chrome migrated; light audit for metadata + key parity

---

## Standard Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Message catalogs | `messages/{zh,en,it}.ts` | Shipped |
| Client hook | `useMessages()` | Shipped |
| Persistence | localStorage + (new) server profile sync | Partial |
| Header dropdown | Radix DropdownMenu + Stitch tokens | To build |
| Server push/cron | `getMessages(userLocale)` per fan-out | To build |
| Design | Stitch DESIGN.md + 05-UI-SPEC.md | Spec written |

**Do NOT introduce:** next-intl, react-i18next, `[locale]` routing, cookie SSR locale, catalog rebuild.

---

## Remaining Work (Planner Scope)

### P0 — I18N-01 completion
1. **Header language dropdown** in `Header.tsx` — reuse `LANGUAGES` from `LanguageSection` (extract shared constant)
2. **Browser first-visit detect** in `preferences.ts` — only when localStorage key absent; never overwrite saved pref (D-122)
3. **Doc alignment** — ROADMAP + REQUIREMENTS default language wording (D-119)

### P1 — Server / push locale
4. Migration: `profiles.language` and/or `push_subscriptions.locale`
5. Sync API on language change (authenticated) + on push subscribe
6. `process-events.ts`: per-user `getMessages(locale)` + `resolveListingTitle()`

### P2 — Bridge + audit
7. `lib/i18n/listing-fields.ts` — fallback-safe resolver (works before Phase 6 columns)
8. Wire cards/detail to resolver when locale ≠ it
9. `messages/key-parity.test.ts` + fix `app/layout.tsx` metadata straggler

---

## Architecture Patterns

### Shared language labels (DRY)

Extract from `LanguageSection.tsx`:

```typescript
// lib/i18n/languages.ts
export const LANGUAGES: { id: AppLanguage; label: string; sublabel: string }[] = [...]
```

Header dropdown + Settings both import this.

### Browser Locale Detection (D-120)

```typescript
export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'zh';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('en')) return 'en';
  return 'zh';
}
```

Call once on first visit: if `!localStorage.getItem(APP_PREFERENCES_KEY)`, seed with detect result.

### Server Locale (D-129) — recommended

- `profiles` table (create if absent) with `language text check (language in ('zh','en','it')) default 'zh'`
- `push_subscriptions.locale` column — copy from profile on subscribe
- `POST /api/user/preferences` or extend existing profile PATCH — sync on language change

### Push (D-136)

Replace module-scope `messages` in `process-events.ts` with per-user resolution inside fan-out loop.

### Listing resolver (D-133)

```typescript
export function resolveListingTitle(
  row: { title: string; title_en?: string | null; title_zh?: string | null },
  locale: AppLanguage,
): string {
  if (locale === 'en' && row.title_en) return row.title_en;
  if (locale === 'zh' && row.title_zh) return row.title_zh;
  return row.title; // Italian original / fallback
}
```

Select optional columns in listing queries; TypeScript optional fields handle pre-Phase-6 DB.

---

## Don't Hand-Roll

| Problem | Use Instead |
|---------|-------------|
| Re-migrate components | Already on `useMessages()` — audit only |
| i18n framework | Existing catalogs |
| Language persistence | `writeAppPreferences` + server sync |
| Dropdown a11y | Radix restyled to Stitch |
| UI styling | `.planning/google-stitch-ui-design/` |

---

## Common Pitfalls

1. **Rebuilding catalogs or re-migrating components** — wasted scope; 260804-hed already done
2. **Resetting existing users** — browser detect only when no localStorage key
3. **Default shadcn Select colors** on header dropdown — Stitch violation
4. **Planning full I18N-02 rewrite** — audit stragglers only
5. **Blocking on Phase 6 columns** — resolver must fallback gracefully

---

## Validation Architecture

| Dimension | Requirement | Tooling |
|-----------|-------------|---------|
| D1 | Browser detect + resolver | Vitest `lib/i18n/*.test.ts` |
| D2 | Header ↔ Settings sync | Unit + manual |
| D3 | Key parity zh/en/it | Vitest `messages/key-parity.test.ts` |
| D4 | Push locale per user | Unit test mocked profile |
| D5 | Stitch header dropdown | Visual vs 05-UI-SPEC.md |
| D6 | No replan of shipped migration | Plan must not touch 50+ components unless audit finds gap |

---

## Suggested Plan Decomposition (3 plans, tracer-first)

| Plan | Wave | Scope |
|------|------|-------|
| 05-01 tracer | 1 | Header dropdown + browser first-visit + doc alignment → I18N-01 E2E |
| 05-02 | 2 | Server locale migration + sync + push fan-out locale |
| 05-03 | 3 | Listing resolver bridge + I18N-02 audit (key parity, metadata) |

---

## RESEARCH COMPLETE
