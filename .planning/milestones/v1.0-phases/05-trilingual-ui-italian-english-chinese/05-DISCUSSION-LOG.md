# Phase 5: Trilingual UI (Italian / English / Chinese) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 5-Trilingual UI (Italian / English / Chinese)
**Areas discussed:** Default language, Language switcher placement, Server/push locale, Listing content scope

---

## Default Language & First Visit

| Option | Description | Selected |
|--------|-------------|----------|
| Always Chinese on first visit | Simple, predictable zh default | |
| Detect browser locale | zh if zh-CN, it if it-IT, en otherwise | |
| Detect browser if zh/en/it, else zh | Browser-detect with zh fallback | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Update ROADMAP to Chinese default | Align docs with code and user intent | ✓ |
| Keep ROADMAP Italian default | Treat zh as implementation override only | |
| You decide | Planner picks doc alignment | |

| Option | Description | Selected |
|--------|-------------|----------|
| Server default zh | API/push/SSR use zh when locale unknown | ✓ |
| Server default Italian | Align with original ROADMAP | |
| Accept-Language header | Per-request server locale | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing saved preferences | No forced reset for returning users | ✓ |
| Reset unset users to zh | Migration on next visit | |

**User's choice:** Chinese default; browser-detect zh/en/it on first visit with zh fallback; update ROADMAP; server defaults zh; keep existing saved prefs.
**Notes:** User explicitly chose Chinese over Italian despite ROADMAP saying Italian default.

---

## Language Switcher Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Compact text dropdown in header | "中文 / EN / IT" tap to switch | ✓ |
| Translate icon + popover | Icon opens language menu | |
| Nav drawer only | No separate header control | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Settings 3-button segment | Existing control unchanged | ✓ |
| Replace with header dropdown only | Single pattern everywhere | |
| Complementary both | Header quick + Settings full | ✓ (implicit) |

| Option | Description | Selected |
|--------|-------------|----------|
| All main pages via Header | Map, list, detail, settings | ✓ |
| Map/list only | Less chrome elsewhere | |
| Hide on /post and /settings | Settings has own control | |

| Option | Description | Selected |
|--------|-------------|----------|
| Instant switch, no toast | useMessages re-render | ✓ |
| Instant + toast | Confirm language changed | |
| Full page reload | SSR picks up locale | |

**Follow-up (more switcher questions):**

| Option | Description | Selected |
|--------|-------------|----------|
| Native script labels | 中文 / English / Italiano | ✓ |
| Short codes | ZH / EN / IT | |
| Current language only when closed | Full list on tap | |

| Option | Description | Selected |
|--------|-------------|----------|
| Header right cluster | Next to favorites/menu | ✓ |
| Header left | Near app title | |
| Header center | Between title and actions | |

| Option | Description | Selected |
|--------|-------------|----------|
| 44px min touch target | Mobile PWA sizing | ✓ |
| Smaller on desktop | Responsive sizing | |
| You decide | Match existing Header | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same shoumanwu_app_preferences | Header + Settings instant sync | ✓ |

**User's choice:** Header compact dropdown (native script, right cluster, 44px touch) on all pages; Settings keeps segment; instant sync via preference store.

---

## Server-side & Push Locale

| Option | Description | Selected |
|--------|-------------|----------|
| Store language on profile/subscription | Push matches user UI language | ✓ |
| Push always Chinese | Keep getMessages('zh') | |
| Push always Italian | Original primary audience | |

| Option | Description | Selected |
|--------|-------------|----------|
| API errors server zh; client maps codes | No profile storage for API strings | ✓ |
| Accept-Language per request | Server reads header | |
| Store in Supabase profile | API uses profile locale | |

| Option | Description | Selected |
|--------|-------------|----------|
| PWA manifest stays Chinese | Fixed install branding | ✓ |
| Manifest multilang | i18n name fields | |
| Manifest Italian | Original audience branding | |

| Option | Description | Selected |
|--------|-------------|----------|
| SSR zh snapshot + client hydrate | Current pattern | ✓ |
| Cookie-based SSR locale | Server renders user language | |
| Convert SSR pages to client | Eliminate module-scope getMessages | |

**User's choice:** Store user language server-side for push; API stays zh-default with client mapping; manifest zh; SSR hydrates client preference.

---

## Listing Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep scraped titles Italian (UI chrome only) | Phase 2 D-52 | |
| Auto-translate at display time | Gemini on read | |
| Refer to Phase 6 | Ingest-time translation columns | ✓ (user free-text) |

| Option | Description | Selected |
|--------|-------------|----------|
| UGC as user wrote | Phase 3 D-88 | ✓ (refer Phase 6 — scraped only) |
| Auto-translate UGC | Viewer locale | |

| Option | Description | Selected |
|--------|-------------|----------|
| Zone/category in catalogs | Already translated | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Push title translated when available | User locale + Phase 6 columns | ✓ |
| Push title always original | Italian listing title | |

**User's choice:** Scraped listing translation is Phase 6 ingest work (D-24/D-30); Phase 5 reads locale columns with fallback. UGC stays user-authored. Push uses translated title when available.

---

## Claude's Discretion

- Browser locale parsing edge cases (zh-TW, en-US, etc.)
- Profile column vs push_subscriptions locale field
- Header dropdown UI primitive selection
- When to sync language to server (on change vs on login)

## Deferred Ideas

- Cookie SSR locale
- Display-time listing translation
- UGC auto-translate
- next-intl adoption
- Admin console consumer i18n (Phase 6 separate track)
