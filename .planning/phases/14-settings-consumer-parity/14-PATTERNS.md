# Phase 14: Settings Consumer Parity - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 11 (net-new/modified)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `supabase/migrations/022_user_notification_prefs.sql` | migration | CRUD | `supabase/migrations/017_user_locale.sql` | exact |
| `lib/user/notification-prefs.ts` | utility/service | CRUD + batch lookup | `lib/user/locale.ts` | exact |
| `lib/alerts/process-events.ts` (modified) | service | event-driven | itself (existing file, insertion point) | exact |
| `lib/account/delete-account.ts` | service | file-I/O + CRUD (multi-step orchestration) | `lib/supabase/service.ts` (client) + `lib/user/locale.ts` (`syncUserLocale`, for shape) | role-match |
| `app/api/user/notification-prefs/route.ts` | route (Next.js Route Handler) | request-response (GET/PATCH) | `app/api/user/locale/route.ts` | exact |
| `app/api/user/delete/route.ts` | route (Next.js Route Handler) | request-response (POST, destructive) | `app/api/user/locale/route.ts` (auth/validation shape) + `lib/supabase/service.ts` (service-role client usage) | role-match |
| `components/settings/NotificationsSection.tsx` (modified) | component | CRUD (fetch + auto-save PATCH) | itself (existing file) + `components/settings/ZonesSection.tsx` (fetch-based load pattern, not read in full — referenced by RESEARCH.md) | exact |
| `components/settings/AccountSection.tsx` | component | request-response (destructive action) | `components/settings/AdvancedSection.tsx` | exact |
| `components/settings/SettingsPageClient.tsx` (modified) | component (page composition) | — | itself (existing file) | exact |
| `messages/{zh,en,it}.ts` (modified) | config (i18n strings) | — | itself (existing files, `settings.push.*`/`settings.advanced.*` keys as shape reference) | exact |
| `supabase/migrations/022_....sql`'s `delete_account_data` RPC function | migration (SQL function) | CRUD (transactional multi-table delete) | `supabase/migrations/016_auth_alerts_push.sql`'s `enqueue_listing_event` (security definer pattern — not fully read this pass, referenced by RESEARCH.md L505) | role-match |

## Pattern Assignments

### `supabase/migrations/022_user_notification_prefs.sql` (migration, CRUD)

**Analog:** `supabase/migrations/017_user_locale.sql` (full file read, 32 lines)

**Table + RLS pattern** (lines 4-23 of `017_user_locale.sql`):
```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'zh' check (language in ('zh', 'en', 'it')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**Apply to new table:** Same shape — `user_notification_prefs(user_id pk references auth.users on delete cascade, dnd_enabled bool, quiet_start time, quiet_end time, updated_at timestamptz)` with three RLS policies named `notification_prefs_{select,insert,update}_own`, identical `user_id = auth.uid()` predicate. RESEARCH.md's Pattern 1 already has the exact SQL drafted — use it verbatim, just add it to migration `022_user_notification_prefs.sql` alongside the `delete_account_data` RPC function (RESEARCH.md Pattern 4).

**Critical inherited constraint:** RLS policies must be added at table-creation time (Pitfall 5 in RESEARCH.md) — do not forget `on delete cascade` on the FK, which `017` gets right but is easy to omit on a new table.

---

### `lib/user/notification-prefs.ts` (utility/service, CRUD + batch lookup)

**Analog:** `lib/user/locale.ts` (full file read, 102 lines)

**Imports pattern** (lines 1-5):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VeniceZone } from '@/lib/listings/types';
import type { AppLanguage } from '@/lib/settings/preferences';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { getMessages, zoneLabel as zoneLabelFor } from '@/messages';
```

**Batch lookup pattern** (lines 50-71, `loadUserLocales`):
```typescript
export async function loadUserLocales(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AppLanguage>> {
  const localeByUser = new Map<string, AppLanguage>();
  if (userIds.length === 0) return localeByUser;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, language')
    .in('user_id', userIds);

  if (error) return localeByUser;

  for (const row of data ?? []) {
    if (isValidAppLanguage(row.language)) {
      localeByUser.set(row.user_id, row.language);
    }
  }

  return localeByUser;
}
```
**Apply directly** as the shape for `loadUserQuietHours(supabase, userIds)` — fail-open on error (empty map = DND off for everyone, matching D-08's "off" default). RESEARCH.md's Pattern 3 already has the near-identical draft.

**Single-row upsert pattern** (lines 73-101, `syncUserLocale`):
```typescript
export async function syncUserLocale(
  supabase: SupabaseClient,
  userId: string,
  language: AppLanguage,
): Promise<{ error: string | null }> {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      language,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  return { error: null };
}
```
**Apply directly** as the shape for `syncUserNotificationPrefs(supabase, userId, { dndEnabled, quietStart, quietEnd })` — same `{ error: string | null }` return contract, same `upsert` + `onConflict: 'user_id'` mechanics. Skip the second `push_subscriptions` update call (that's locale-specific, not applicable here).

**Also add:** `isQuietHoursActive()` pure function — no direct analog exists in codebase (this is genuinely net-new logic), but RESEARCH.md Pattern 2 has a fully-specified implementation using `Intl.DateTimeFormat` with `timeZone: 'Europe/Rome'`, matching the existing single-source-of-truth convention in `lib/admin/format.ts`'s `formatRomeTooltip` (referenced but not read this pass — RESEARCH.md already extracted the pattern).

---

### `lib/alerts/process-events.ts` (modified — service, event-driven)

**Analog:** itself (full file read, 139 lines) — this is a modification, not a new file with an external analog.

**Existing structure to extend** (`processOneEvent`, lines 43-102): the function already does a batch locale lookup (`loadUserLocales`) right before the `Promise.allSettled` push fan-out loop:
```typescript
const userIds = [...new Set(matches.map((alert) => alert.user_id))];
const localeByUser = await loadUserLocales(supabase, userIds);

await Promise.allSettled(
  userIds.map(async (userId) => {
    const locale: AppLanguage = localeByUser.get(userId) ?? 'zh';
    const { title, body } = buildMatchPushContent(listingRow, locale);

    await fanOutMatchPush(supabase, userId, {
      title,
      body,
      url: `/listing/${listingRow.id}`,
    });
  }),
);
```

**Modification pattern:** Add a second batch lookup (`loadUserQuietHours(supabase, userIds)`) alongside `loadUserLocales`, then guard the `fanOutMatchPush` call inside the loop:
```typescript
const localeByUser = await loadUserLocales(supabase, userIds);
const quietHoursByUser = await loadUserQuietHours(supabase, userIds);

await Promise.allSettled(
  userIds.map(async (userId) => {
    if (isQuietHoursActive(quietHoursByUser.get(userId))) return; // D-02: silently skip
    const locale: AppLanguage = localeByUser.get(userId) ?? 'zh';
    const { title, body } = buildMatchPushContent(listingRow, locale);
    await fanOutMatchPush(supabase, userId, { title, body, url: `/listing/${listingRow.id}` });
  }),
);
```
Note: the `alert_matches` upsert (lines 68-81) stays **before and unconditional** — D-02 requires the match row to always be created, only the push is suppressed.

---

### `lib/account/delete-account.ts` (service, orchestration)

**Analog (client pattern):** `lib/supabase/service.ts` (full file read, 18 lines)
```typescript
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from './env';

export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```
**Apply:** `deleteAccountData(serviceClient, userId)` receives a `createServiceClient()` instance from the route handler — do not instantiate the service client inside `lib/account/delete-account.ts` itself; follow the existing convention of route handlers constructing the client and passing it into `lib/` functions (see `app/api/user/locale/route.ts` below).

**Analog (error-return contract):** `syncUserLocale`'s `{ error: string | null }` shape (see above) — reuse the same contract for `deleteAccountData`'s return value, matching every other `lib/` mutation function in this codebase.

**No direct analog for the 3-step Storage→RPC→admin.deleteUser orchestration** — this is genuinely new to the codebase. RESEARCH.md's "Pattern 4" (fully drafted, verified against Context7 + GitHub issue) is the primary source; treat it as pre-vetted code, not just research narrative.

---

### `app/api/user/notification-prefs/route.ts` (route, request-response)

**Analog:** `app/api/user/locale/route.ts` (full file read, 34 lines)
```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isValidAppLanguage, syncUserLocale } from '@/lib/user/locale';

export async function PATCH(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const language =
    body && typeof body === 'object' && 'language' in body
      ? (body as { language: unknown }).language
      : undefined;

  if (!isValidAppLanguage(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await syncUserLocale(supabase, user.id, language);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, language });
}
```
**Apply directly:** copy this exact auth-guard → JSON-parse-guard → field-validate-guard → cookie-client-call → error-check → success-response chain for both `GET` (fetch current prefs) and `PATCH` (write `dndEnabled`/`quietStart`/`quietEnd`) handlers on `/api/user/notification-prefs`. Use `createClient()` (cookie-based, RLS-scoped) — **not** the service-role client — since this route only ever touches the caller's own row (RLS enforces `user_id = auth.uid()`).

**Auth pattern:** `requireAuth()` from `lib/supabase/auth.ts` (lines 4-10):
```typescript
export async function requireAuth(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

---

### `app/api/user/delete/route.ts` (route, request-response — destructive)

**Analog:** `app/api/user/locale/route.ts` (auth-guard shape, same excerpt as above) + `lib/supabase/service.ts` (service-role client, same excerpt as above).

**Composition:** unlike `/api/user/locale`, this route must use `createServiceClient()` (not the cookie client) because `deleteAccountData` needs to bypass RLS across multiple tables and call `auth.admin.deleteUser()`. Still derive `userId` exclusively from `requireAuth()`'s session (never from request body) — this is the IDOR mitigation called out in RESEARCH.md's Security Domain section.
```typescript
export async function POST() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const serviceClient = createServiceClient();
  const result = await deleteAccountData(serviceClient, user.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

---

### `components/settings/NotificationsSection.tsx` (modified, component)

**Analog:** itself (full file read, 203 lines) — modification, insertion point identified.

**Existing row-shape to replicate for the DND sub-block** (Sound Alerts row, lines 184-198):
```typescript
<div className="flex items-center justify-between gap-space-md p-space-md">
  <div className="min-w-0 flex-1">
    <p className="text-body-md font-medium text-on-surface">{messages.settings.sound.title}</p>
    <p className="text-label-sm text-secondary">{messages.settings.sound.description}</p>
  </div>
  <SettingsToggle
    checked={preferences.soundAlerts}
    onChange={(soundAlerts) => writeAppPreferences({ soundAlerts })}
    ariaLabel={
      preferences.soundAlerts
        ? messages.settings.sound.enabledLabel
        : messages.settings.sound.disabledLabel
    }
  />
</div>
```
**Divider pattern between rows** (Push row uses `border-b border-outline-variant`, line 158) — the new DND row(s) go inside the same `SettingsCard`, below Sound Alerts, so DND becomes the new last row (no bottom divider needed on it, matching how Sound currently has none).

**Async-load-then-render pattern** (existing `refreshSubscription`/`useEffect`, lines 81-104):
```typescript
const refreshSubscription = useCallback(async () => {
  if (!canSubscribe) {
    setLoading(false);
    return;
  }
  try {
    const active = await getPushSubscriptionActive();
    setPushEnabled(active);
  } catch {
    setPushEnabled(false);
  } finally {
    setLoading(false);
  }
}, [canSubscribe]);

useEffect(() => {
  if (!isLoggedIn) {
    setPushEnabled(false);
    setLoading(false);
    return;
  }
  void refreshSubscription();
}, [isLoggedIn, refreshSubscription]);
```
**Apply the same shape** for fetching saved DND prefs on mount via `GET /api/user/notification-prefs` — default to `dndEnabled: false` while loading (matches "loading" state resolution in UI-SPEC.md).

**Error display pattern** (line 166): `{error && <p className="mt-space-xs text-label-sm text-error">{error}</p>}` — reuse verbatim for `settings.dnd.saveError`.

**Toggle gating condition:** `pushEnabled` (component state, line 45) is the exact boolean to gate the whole DND sub-block's visibility on, per D-06.

---

### `components/settings/AccountSection.tsx` (new, component)

**Analog:** `components/settings/AdvancedSection.tsx` (full file read, 43 lines) — this is the primary, near-total analog per UI-SPEC.md's explicit direction ("pattern to replicate, not a component to import").

**Full two-step confirm pattern** (lines 1-43):
```typescript
'use client';

import { useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsUi';
import { useMessages } from '@/lib/i18n/useMessages';

export function AdvancedSection() {
  const { messages } = useMessages();
  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    resetLocalAppData();
    // ...local reset side effects
    setConfirming(false);
  };

  return (
    <section className="pb-space-xl">
      <SettingsCard className="border-error/20 bg-error-container/30 p-space-md">
        <h3 className="text-body-md font-bold text-error">{messages.settings.advanced.title}</h3>
        <p className="mb-space-md text-label-sm text-secondary">{messages.settings.advanced.description}</p>
        <button
          type="button"
          onClick={handleReset}
          onBlur={() => setConfirming(false)}
          className="rounded-lg border border-error bg-surface-container-lowest px-space-md py-space-xs text-label-md text-error transition-all hover:bg-error hover:text-on-error"
        >
          {confirming ? messages.settings.advanced.confirmReset : messages.settings.advanced.resetButton}
        </button>
      </SettingsCard>
    </section>
  );
}
```
**Apply with these deltas (per D-12, D-17, and error-state requirements in UI-SPEC.md):**
1. Add `SettingsSectionTitle` above the card (AdvancedSection has none — it's the last section already titled by context; AccountSection needs `messages.settings.account.sectionTitle` = "Account" per UI-SPEC.md).
2. `handleDelete` becomes `async` — first tap sets `confirming`, second tap calls `POST /api/user/delete`, awaits, and on success calls `supabase.auth.signOut()` + `resetLocalAppData()` + `router.push('/')` (D-14). On failure, reset `confirming` to `false` and set an error message (do not leave stuck in confirm state — UI-SPEC.md explicit requirement).
3. Insert the conditional active-claims warning line (D-17) between the description `<p>` and the button, rendered only when `n > 0`, styled `text-label-sm text-error` (same weight/color as the description line, per UI-SPEC.md's explicit "not bolded" instruction).
4. Add inline error `<p>` below the button using the same `text-label-sm text-error` pattern already used in `NotificationsSection.tsx` line 166.

---

### `components/settings/SettingsPageClient.tsx` (modified, component)

**Analog:** itself (full file read, 26 lines).

**Current section order** (lines 20-24):
```tsx
<GeneralSection />
<NotificationsSection />
<ZonesSection autoOpenCreate={autoOpenCreate} />
<LanguageSection />
<AdvancedSection />
```
**Apply per D-13's "Full section order" resolution** (UI-SPEC.md flags this as the authoritative reading — Account 5th, right before Advanced):
```tsx
<GeneralSection />
<NotificationsSection />
<ZonesSection autoOpenCreate={autoOpenCreate} />
<LanguageSection />
<AccountSection />
<AdvancedSection />
```
Add `import { AccountSection } from '@/components/settings/AccountSection';` alongside the other section imports (lines 4-8), keeping the existing alphabetical-ish import grouping style.

---

### `messages/{zh,en,it}.ts` (modified, config)

**Analog:** existing `settings.push.*` / `settings.advanced.*` key shapes (not re-read in full this pass — referenced via `NotificationsSection.tsx`/`AdvancedSection.tsx` usages already extracted above: `messages.settings.push.title`, `.description`, `.enabledLabel`, `.disabledLabel`, `.subscribeError`; `messages.settings.advanced.title`, `.description`, `.resetButton`, `.confirmReset`).

**Apply:** add `settings.dnd.*` (title, description, startLabel, endLabel, enabledLabel, disabledLabel, saveError) as a sibling object to `settings.push`, and `settings.account.*` (sectionTitle, deleteTitle, deleteDescription, deleteButton, confirmDelete, deleteError, activeClaimsWarning as a function) as a sibling to `settings.advanced`. Exact key list and copy are specified in `14-UI-SPEC.md`'s Copywriting Contract section (lines 112-128) — treat that as the literal spec, this PATTERNS.md only maps the *shape* (nested object under `settings`, matching existing sibling sections).

**Verification:** `messages/key-parity.test.ts` (existing, unread this pass) automatically enforces key-parity across all three locale files — no manual cross-check needed beyond running the test.

---

## Shared Patterns

### Auth guard for Route Handlers
**Source:** `lib/supabase/auth.ts` `requireAuth()` (lines 4-10) + `app/api/user/locale/route.ts` (lines 6-9)
**Apply to:** `app/api/user/notification-prefs/route.ts`, `app/api/user/delete/route.ts`
```typescript
const user = await requireAuth();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Error-return contract for `lib/` mutation functions
**Source:** `lib/user/locale.ts`'s `syncUserLocale` (lines 73-101)
**Apply to:** `lib/user/notification-prefs.ts`'s `syncUserNotificationPrefs`, `lib/account/delete-account.ts`'s `deleteAccountData`
```typescript
export async function syncX(...): Promise<{ error: string | null }> {
  const { error } = await supabase.from('table').upsert(...);
  if (error) return { error: error.message };
  return { error: null };
}
```

### Batch per-user lookup (fail-open)
**Source:** `lib/user/locale.ts`'s `loadUserLocales` (lines 50-71)
**Apply to:** `lib/user/notification-prefs.ts`'s `loadUserQuietHours`
```typescript
export async function loadX(supabase, userIds: string[]): Promise<Map<string, X>> {
  const map = new Map();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase.from('table').select('...').in('user_id', userIds);
  if (error) return map; // fail-open
  for (const row of data ?? []) map.set(row.user_id, /* shape */);
  return map;
}
```

### Two-step inline destructive confirm (no modal)
**Source:** `components/settings/AdvancedSection.tsx` (full file, 43 lines — see excerpt above)
**Apply to:** `components/settings/AccountSection.tsx`
- `confirming` boolean state; first click sets it true; second click executes; `onBlur` resets to false.
- Button label swaps between an idle string and a "tap again to confirm" string.
- Danger-box styling: `border-error/20 bg-error-container/30` wrapping `SettingsCard`, `text-error` heading/button.

### Settings row shape (label + description + control)
**Source:** `components/settings/NotificationsSection.tsx` Sound Alerts row (lines 184-198)
**Apply to:** DND toggle row, DND time-input row
```tsx
<div className="flex items-center justify-between gap-space-md p-space-md">
  <div className="min-w-0 flex-1">
    <p className="text-body-md font-medium text-on-surface">{label}</p>
    <p className="text-label-sm text-secondary">{description}</p>
  </div>
  <Control />
</div>
```

### Service-role client construction (server-only, bypasses RLS)
**Source:** `lib/supabase/service.ts` (full file, 18 lines — see excerpt above)
**Apply to:** `app/api/user/delete/route.ts` (constructs the client, passes into `deleteAccountData`)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/user/notification-prefs.ts`'s `isQuietHoursActive()` | utility | transform (pure time-range comparison) | Genuinely new logic — no existing time-range/wrap-aware comparison exists in the codebase. Use RESEARCH.md's Pattern 2 (fully specified, ready to copy) as the source of truth instead of a codebase analog. |
| `lib/account/delete-account.ts`'s 3-step orchestration (Storage → RPC → `admin.deleteUser`) | service | file-I/O + event-driven (multi-system teardown) | No existing multi-step destructive orchestration exists in this codebase (all prior deletes are single-table). Use RESEARCH.md's Pattern 4 (Context7 + GitHub-issue-verified) as the source of truth. |
| `supabase/migrations/022_...sql`'s `delete_account_data(uuid)` SQL function | migration (SQL function) | CRUD (transactional) | The one `security definer` precedent in the codebase (`enqueue_listing_event` in migration 016) was not read in full this pass — planner/implementer should read `supabase/migrations/016_auth_alerts_push.sql`'s function body directly before writing the new RPC to match its exact `security definer` + `search_path` hardening convention (RESEARCH.md Open Question 2 flags this explicitly). RESEARCH.md's Pattern 4 SQL is otherwise ready to use as-is. |

## Metadata

**Analog search scope:** `components/settings/`, `lib/user/`, `lib/alerts/`, `lib/supabase/`, `app/api/user/`, `supabase/migrations/`
**Files scanned (fully read):** `AdvancedSection.tsx`, `NotificationsSection.tsx`, `SettingsUi.tsx`, `SettingsPageClient.tsx`, `lib/user/locale.ts`, `lib/alerts/process-events.ts`, `lib/supabase/service.ts`, `app/api/user/locale/route.ts`, `lib/supabase/auth.ts` (excerpt), `supabase/migrations/017_user_locale.sql`, `lib/settings/preferences.ts` (excerpt)
**Pattern extraction date:** 2026-08-10
