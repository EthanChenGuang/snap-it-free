---
phase: 05-trilingual-ui-italian-english-chinese
reviewed: 2026-08-04T18:10:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - supabase/migrations/017_user_locale.sql
  - app/api/user/locale/route.ts
  - app/api/push/subscribe/route.ts
  - lib/user/locale.ts
  - lib/user/locale-client.ts
  - lib/alerts/process-events.ts
  - lib/notifications/push-schemas.ts
  - lib/notifications/web-push.ts
  - lib/pwa/usePushSubscribe.ts
  - lib/settings/preferences.ts
  - lib/i18n/languages.ts
  - lib/i18n/detect-browser-language.ts
  - lib/i18n/listing-fields.ts
  - lib/i18n/useMessages.ts
  - components/shell/HeaderLanguageDropdown.tsx
  - components/shell/Header.tsx
  - components/settings/LanguageSection.tsx
  - components/listings/ListingCard.tsx
  - components/listings/ListListingCard.tsx
  - components/detail/HeroMetadata.tsx
  - components/detail/DetailArticle.tsx
  - app/layout.tsx
  - messages/key-parity.test.ts
  - lib/alerts/process-events.test.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-08-04T18:10:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 5 delivers header language switching, browser first-visit seeding, server profile locale sync, listing field resolvers, and per-user push localization. API input validation (`isValidAppLanguage`, Zod `locale` enum) and `profiles` RLS policies are sound. However, two blockers undermine production correctness: the match-alerts cron now selects translation columns that do not exist in the database schema, and `syncUserLocale` attempts to UPDATE `push_subscriptions` without an RLS UPDATE policy — leaving stored push locale permanently stale. A fire-and-forget PATCH race can also desync server `profiles.language` from the client when users switch languages quickly.

## Critical Issues

### CR-01: Cron selects non-existent `title_en` / `title_zh` columns

**File:** `lib/alerts/process-events.ts:52`
**Issue:** Phase 5 changed the listing SELECT from `'id, title, zone'` to `'id, title, title_en, title_zh, zone'`, but no migration adds these columns to `public.listings` (Phase 6 is deferred). PostgREST returns a column-not-found error, causing every pending `listing_event` to be marked `failed` and halting match-alert processing entirely.
**Fix:**
```typescript
// Until Phase 6 migration adds translation columns, keep the original SELECT:
.select('id, title, zone')
// buildMatchPushContent already falls back to row.title when title_en/zh are absent
```

### CR-02: Missing RLS UPDATE policy blocks `push_subscriptions.locale` sync

**File:** `supabase/migrations/017_user_locale.sql` (missing policy); `lib/user/locale.ts:99-102`
**Issue:** Migration 016 grants SELECT, INSERT, and DELETE on `push_subscriptions` but no UPDATE policy. `syncUserLocale` UPDATEs `push_subscriptions.locale` using the user-scoped Supabase client from `PATCH /api/user/locale`. RLS silently affects zero rows (no error returned), so the `locale` column written at subscribe time is never updated on language change. While current fan-out reads `profiles.language` (which upsert succeeds), the schema documents `push_subscriptions.locale` as synced on PATCH — any future reader or audit will see stale data, and the PATCH endpoint reports success despite incomplete sync.
**Fix:** Add to migration 017 (or a follow-up migration):
```sql
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Warnings

### WR-01: Out-of-order locale PATCH race desyncs server preference

**File:** `lib/user/locale-client.ts:7-27`
**Issue:** `setAppLanguage` writes localStorage synchronously then fires an unawaited, unordered PATCH. Rapid switches (e.g., zh → en → it) can complete network responses out of order, leaving `profiles.language` on the server different from the client's active locale. Push notifications would then use the wrong language until the user switches again.
**Fix:** Track a monotonic sequence number or use `AbortController` to cancel in-flight requests; only apply the latest intent:
```typescript
let syncGeneration = 0;

async function syncLocaleToServer(language: AppLanguage): Promise<void> {
  const generation = ++syncGeneration;
  // ... auth check ...
  const res = await fetch('/api/user/locale', { method: 'PATCH', /* ... */ });
  if (generation !== syncGeneration) return; // stale response
  if (!res.ok) { /* optional retry or telemetry */ }
}
```

### WR-02: Concurrent push dedup race in `processOneEvent`

**File:** `lib/alerts/process-events.ts:88-104`
**Issue:** `notifiedUsers` is checked and set inside `Promise.allSettled` over concurrent async callbacks. Two matching alerts for the same user can both pass `notifiedUsers.has()` before either calls `.add()`, sending duplicate push notifications.
**Fix:** Precompute unique user IDs before fan-out, or use a sequential loop / mutex:
```typescript
const userIds = [...new Set(matches.map((a) => a.user_id))];
for (const userId of userIds) {
  const locale = localeByUser.get(userId) ?? 'zh';
  const { title, body } = buildMatchPushContent(listingRow, locale);
  await fanOutMatchPush(supabase, userId, { title, body, url: `/listing/${listingRow.id}` });
}
```

### WR-03: Duplicate `resolveListingTitle` with divergent empty-string handling

**File:** `lib/user/locale.ts:12-19` vs `lib/i18n/listing-fields.ts:22-29`
**Issue:** Plan 03 introduced `lib/i18n/listing-fields.ts` with `nonEmpty()` trim checks, but `lib/user/locale.ts` retains a separate copy used by push fan-out. Whitespace-only translation values (`"   "`) render as blank push titles while UI cards fall back to the Italian original.
**Fix:** Re-export from the shared module:
```typescript
// lib/user/locale.ts
export { resolveListingTitle } from '@/lib/i18n/listing-fields';
```

### WR-04: Non-transactional `syncUserLocale` allows partial state

**File:** `lib/user/locale.ts:86-108`
**Issue:** Profile upsert and push-subscription update are separate statements with no transaction. If the push UPDATE fails after profile upsert (network blip, future constraint), the API returns 500 but the profile is already committed — client and push paths can disagree on locale source.
**Fix:** Wrap both operations in a Postgres RPC function executed atomically, or return partial-success metadata and retry push sync client-side.

### WR-05: Client ignores PATCH response status

**File:** `lib/user/locale-client.ts:20-24`
**Issue:** `syncLocaleToServer` never checks `response.ok`. Server sync failures (401 session expiry, 500 RLS/migration errors) are silently swallowed; logged-in users believe locale is synced when it is not.
**Fix:**
```typescript
const res = await fetch('/api/user/locale', { /* ... */ });
if (!res.ok) {
  console.warn('[locale] server sync failed', res.status);
  // optional: enqueue retry
}
```

## Info

### IN-01: `push_subscriptions.locale` column is written but never read

**File:** `lib/alerts/process-events.ts:86`, `lib/notifications/web-push.ts:80-98`
**Issue:** Fan-out resolves locale from `profiles.language` via `loadUserLocales`, not from `push_subscriptions.locale`. The column adds storage and sync complexity without current runtime effect.
**Fix:** Either read `push_subscriptions.locale` per subscription (supports per-device locale) or document the column as denormalized cache only.

### IN-02: SSR `<html lang>` hardcoded to `zh`

**File:** `app/layout.tsx:28`
**Issue:** Root layout sets `lang="zh"` while `DocumentLang` updates it client-side after hydration. First paint and crawlers always see Chinese regardless of saved preference or browser detect.
**Fix:** Acceptable for client-preference model per Phase 5 scope; consider cookie-based SSR locale in a future phase if SEO/a11y first-paint matters.

---

_Reviewed: 2026-08-04T18:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
