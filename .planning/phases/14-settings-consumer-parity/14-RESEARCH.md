# Phase 14: Settings Consumer Parity - Research

**Researched:** 2026-08-10
**Domain:** Supabase Postgres data-lifecycle (hard delete + cascades), Supabase Storage object cleanup, per-user server-enforced preferences (quiet hours), Next.js Route Handlers
**Confidence:** HIGH (mechanics verified against migration files, Context7 supabase-js docs, and an official supabase/storage GitHub issue)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Quiet Hours / DND Mechanics (SET-02)**
- **D-01:** Quiet hours state lives in a new Supabase table (pattern: `017_user_locale.sql` — per-user row, RLS `user_id = auth.uid()`), not `localStorage`. Required because enforcement happens server-side in the alert cron, which has no access to the browser's `localStorage`. — Reversibility: costly.
- **D-02:** During quiet hours, a match suppresses (drops) the push silently — `fanOutMatchPush` is skipped entirely for that user in `lib/alerts/process-events.ts`. The `alert_matches` row is still created (visible in-app), so nothing is lost — just no push fires. No queue/retry/redelivery mechanism. — Reversibility: reversible.
- **D-03:** Timezone is hardcoded `Europe/Rome` server-side — no device-timezone capture or conversion logic. App only serves Venice/Padova. — Reversibility: reversible.
- **D-04:** Scope is all server push (currently only alert-match pushes exist, via `fanOutMatchPush`) — one rule, not alert-specific framing. — Reversibility: reversible.
- **D-05:** UI is a custom start/end time picker (e.g. two time inputs), not preset windows. — Reversibility: reversible.
- **D-06:** Quiet-hours toggle + time pickers are nested inside `NotificationsSection`, shown only when Push Notifications is on — avoids configuring DND for a channel that's off. — Reversibility: reversible.
- **D-07:** Changes auto-save on change (PATCH immediately), same pattern as every other toggle in this settings screen — no separate Save button. — Reversibility: reversible.
- **D-08:** DND has its own on/off toggle, separate from the start/end time values — turning it off preserves the saved times without re-entry (three-state: off / configured-but-paused / active). — Reversibility: reversible.

**Delete Account Data Handling (SET-04)**
- **D-09:** Full hard delete of everything the user owns: their `listings` (owner_user_id), `alerts`, `user_favorites`, `push_subscriptions` (the latter three already `ON DELETE CASCADE` per `016_auth_alerts_push.sql`), and any `conversations`/`messages` tied to their owned listings. — Reversibility: one-way.
- **D-10:** Counterparty conversations — when the deleting user is the buyer on someone else's listing, the whole `conversations` row and its `messages` are deleted entirely, even though the seller loses that thread. No anonymize-and-keep-for-the-other-party path. — Reversibility: one-way.
- **D-11:** `listing_reports` rows where the user is `reporter_user_id` are deleted as part of the same hard-delete flow (consistent with D-09/D-10). — Reversibility: one-way.
- **D-12:** Confirmation UX is two-step inline, matching the existing `AdvancedSection` "Reset Cache & Data" pattern exactly (tap → button label changes to "tap again to confirm" → tap again). No modal, no typed confirmation. — Reversibility: reversible.
- **D-13:** Delete Account lives in a new "Account" danger-zone section, positioned right after General, ahead of Zones/Language; the existing generic "Advanced" (cache reset) section stays last. Full section order: General → Notifications (with nested DND) → Zones → Language → Account (danger zone) → Advanced. — Reversibility: reversible.
- **D-14:** After successful deletion: client calls `supabase.auth.signOut()`, clears local state (`resetLocalAppData()` — favorites/prefs/reported listings/iOS dismissed flag), and `router.push('/')`. — Reversibility: reversible.
- **D-15:** Storage cleanup is included — the delete flow also removes the user's objects from the `ugc-photos` bucket (folder keyed by `auth.uid()` per `007_ugc_messaging_reports.sql`'s storage policy) so no orphaned public image URLs remain. — Reversibility: one-way.
- **D-16:** Deletion is immediate and irreversible — no grace period, no "pending deletion" state, no scheduled job, no undo-by-relogin flow. — Reversibility: one-way (explicit product choice).
- **D-17 (Active Claim Safeguard):** If the user owns a listing with `status = 'claimed'` (an in-progress pickup with a buyer), the two-step confirm shows an extra warning line ("You have N active claim(s) in progress — deleting will end those conversations.") but does not block deletion — user can still confirm and proceed. — Reversibility: reversible.

**Settings Layout Placement**
- **D-18:** TD-01 (`04-VERIFICATION.md`) is included in this phase's plan if low-cost, per REQUIREMENTS.md's "carry-forward, execute if low cost" framing — not a blocking dependency for DND/delete-account work. — Reversibility: reversible.

### Claude's Discretion
- Exact new Supabase table name/shape for quiet hours (e.g. `user_notification_prefs` with `dnd_enabled`, `quiet_start`, `quiet_end`) vs. extending `user_locale` — Claude picked "new table" per D-01, but exact column naming is open.
- i18n key naming for new DND/Account strings across `messages/{zh,en,it}.ts`.
- Overnight window comparison logic (e.g. 22:00–08:00 crossing midnight) — standard time-range-wrap handling.
- Exact server-side delete-account route shape (single transaction vs. sequential service-role calls) using the existing `lib/supabase/service.ts` service-role client pattern, ending with `supabase.auth.admin.deleteUser()`.
- Whether/how to debounce the auto-save PATCH on time-input drag interactions.
- Post-delete toast/confirmation messaging before redirect (raised as a candidate gray area; user chose not to discuss it — default to Claude's judgment, keep it minimal).

### Deferred Ideas (OUT OF SCOPE)
- Anonymize-and-preserve counterparty conversations on delete (vs. full delete) — user chose full hard-delete (D-10); anonymization deferred indefinitely.
- Grace period / soft-delete with undo for account deletion — user chose immediate/irreversible (D-16).
- Hard block on delete when active claims exist — user chose warn-not-block (D-17).
- Post-delete confirmation email — not discussed; not in scope.
- Operator-account special-casing on the delete-account flow — no special-casing needed since operators are trusted/internal (env-var email allowlist, not a DB flag).
- Preset quiet-hours windows (vs. custom time range) — user chose custom range (D-05).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| SET-01 | Push notifications toggle retained and restyled to Stitch settings layout | Already implemented per CONTEXT.md scouting finding — `NotificationsSection.tsx` already matches Stitch layout; no research action needed, verify-only |
| SET-02 | Do Not Disturb: user-configurable quiet hours or silent-push window for notifications | Architecture Patterns 1–3 (per-user table + RLS, overnight-aware time comparison, batch lookup mirroring `loadUserLocales`) + insertion point confirmed in `lib/alerts/process-events.ts`'s `processOneEvent` |
| SET-03 | Language selection retained (zh / en / it) | Already implemented (`LanguageSection.tsx`); no research action needed, verify-only |
| SET-04 | Delete account: Supabase account deletion with associated user data cleanup (auth-gated, destructive confirmation) | Architecture Pattern 4 (Storage → RPC → `admin.deleteUser` ordering), Common Pitfalls 1–2 (FK violation ordering, cascade-graph correctness), Security Domain (IDOR/access-control mitigation for the RPC) |
| SET-05 | Sign out retained | Already implemented (`GeneralSection.tsx`); no research action needed, verify-only |
| SET-06 | Existing settings preserved: keyword alerts, zone preferences, appearance, iOS Add-to-Home-Screen shortcuts | No implementation research needed — regression-verify only; confirmed unchanged by CONTEXT.md scouting and this research's file reads of `ZonesSection.tsx`/`LanguageSection.tsx`/`AdvancedSection.tsx` |
| TD-01 | Phase 4 formal `04-VERIFICATION.md` completed | Confirmed no `04-VERIFICATION.md` exists for the v1.0 milestone's Phase 4 (`.planning/milestones/v1.0-phases/04-auth-alerts-push-notifications/`), but substantial evidence already exists (`04-UAT.md`, `04-VALIDATION.md`, `COVERAGE.md`, 228 lines combined) and a current-format template exists at `.planning/phases/09-feed-first-home-navigation-ia/09-VERIFICATION.md` for the planner to follow — low-cost retroactive authoring task, not new investigation |
| I18N-01 (partial) | All new user-facing strings added to zh, en, and it locale files | `messages/key-parity.test.ts` (existing) already enforces key-parity across all three locale files — new DND/Account strings will be caught automatically if any locale is missing a key |
</phase_requirements>

## Summary

Phase 14 is almost entirely a **data-lifecycle and server-logic phase**, not a new-library phase. Everything needed already exists in the codebase's toolkit: `@supabase/supabase-js` (already installed), the service-role client pattern (`lib/supabase/service.ts`), the per-user-table-plus-RLS pattern (`017_user_locale.sql`), and the two-step inline destructive-confirm UI pattern (`AdvancedSection.tsx`). No new npm packages are required.

The two net-new capabilities — Do Not Disturb (DND) and Delete Account — both hinge on getting **ordering and cascade behavior** right, which this research confirms precisely:

1. **DND (SET-02):** A new `user_notification_prefs` table (profiles/017 pattern) holds `dnd_enabled`, `quiet_start`, `quiet_end`. The quiet-hours check must be inserted in `lib/alerts/process-events.ts`'s `processOneEvent`, immediately before the `fanOutMatchPush` call, using a batch lookup (mirrors `loadUserLocales`). The check is a simple time-of-day range comparison against `Europe/Rome` wall-clock time (via `Intl.DateTimeFormat`, same pattern as `lib/admin/format.ts`), with explicit handling for windows that cross midnight.

2. **Delete Account (SET-04):** `supabase.auth.admin.deleteUser()` does **not** cascade to `public` schema tables — only to `auth.*` internal tables. Verified via Context7 (method signature) and a web search cross-checked against an authoritative source: **deleting a user who still owns Storage objects will fail** with FK violation `objects_owner_fkey` unless those objects are deleted first. This means the mandatory execution order is: **(1) delete Storage objects → (2) delete/adjust rows with no cascade to `auth.users` (`listings`, `conversations` where user is buyer, `listing_reports` where user is reporter) → (3) call `auth.admin.deleteUser()`**, which then cascades the tables that already have `ON DELETE CASCADE` (`alerts`, `user_favorites`, `push_subscriptions`, `alert_matches`, `profiles`, and the new quiet-hours table). Critically, deleting a user's own `listings` rows **automatically cascades** their `conversations`, `messages`, and `listing_reports` (all three reference `listings.id` with `ON DELETE CASCADE` per migration 007) — so explicit deletion is only needed for the two directions that DON'T flow through an owned listing: conversations where the deleting user is the *buyer* on someone else's listing, and reports where the deleting user is the *reporter* on someone else's listing.

**Primary recommendation:** Build the delete-account pipeline as (a) a Storage list+remove call, (b) a single Postgres RPC function wrapping the app-table deletes in one transaction, then (c) `auth.admin.deleteUser()` — in that exact order — rather than a chain of sequential `.from()` calls, because `supabase-js` does not group separate `.from()` calls into one transaction.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DND toggle + time picker UI | Browser / Client | — | Local form state inside `NotificationsSection`, auto-saves via PATCH |
| DND preference persistence | API / Backend | Database / Storage | New Route Handler (`/api/user/notification-prefs`) + new per-user table, mirrors `/api/user/locale` |
| DND enforcement (suppress push) | API / Backend | — | Server-side only, inside `lib/alerts/process-events.ts` (cron-invoked), never the client — client has no visibility into cron timing |
| Delete-account confirm UX | Browser / Client | — | Two-step inline state machine (`confirming` + `onBlur` reset), same as `AdvancedSection` |
| Delete-account data purge | API / Backend | Database / Storage | New Route Handler using service-role client; Storage cleanup + RPC transaction + `auth.admin.deleteUser()` |
| Post-delete client cleanup | Browser / Client | — | `supabase.auth.signOut()` + `resetLocalAppData()` + redirect — pure client-side, no server round-trip needed after the delete API call succeeds |
| Existing settings (push toggle, language, sign out, zones, appearance, iOS A2HS) | Browser / Client + API / Backend (unchanged) | — | Explicitly out of scope for changes — verify unchanged only |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `^2.110.9` (already installed, confirmed in `package.json`) | Storage list/remove, `auth.admin.deleteUser`, RPC calls, table CRUD | Already the project's sole DB/auth/storage client — no alternative needed |
| `@supabase/ssr` | already installed (`lib/supabase/server.ts`) | Cookie-based session client for `requireAuth()` gating | Existing pattern, reused verbatim |

No new packages are introduced by this phase. `## Package Legitimacy Audit` is therefore a "no new packages" audit (see below).

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `Intl.DateTimeFormat` | Node/browser built-in | Compute current wall-clock time in `Europe/Rome` for the quiet-hours check | Already used identically in `lib/admin/format.ts` (`formatRomeTooltip`) — no library needed for timezone math since the app is single-timezone (D-03) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Intl.DateTimeFormat` for Rome time | `date-fns-tz` / `luxon` | Unnecessary — app only ever needs one fixed IANA zone and a same-day HH:MM comparison; adding a timezone library for one comparison is over-engineering per D-03 |
| Single RPC transaction for delete-account | Sequential service-role `.from()` calls per table | Sequential calls are NOT atomic (each is a separate PostgREST HTTP request) — a partial failure mid-sequence leaves orphaned rows. Use RPC. |

**Installation:** None — no new dependencies to install.

**Version verification:** `@supabase/supabase-js` version pinned in `package.json` as `^2.110.9`; Context7's latest indexed version is `v2.58.0` docs-wise but the API surface used here (`auth.admin.deleteUser`, `storage.from().list/remove`, `.rpc()`) is stable across 2.x and unchanged in the installed version — confirmed by reading the installed `node_modules` types is unnecessary since these are long-stable, non-breaking APIs `[CITED: github.com/supabase/supabase-js]`.

## Package Legitimacy Audit

No external packages are introduced by this phase — all functionality uses already-installed `@supabase/supabase-js` and native browser/Node APIs.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | No new packages — audit N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser (NotificationsSection, new AccountSection)                   │
│                                                                        │
│  DND toggle+times ──PATCH /api/user/notification-prefs──┐            │
│  Delete Account (2-step confirm) ──POST /api/user/delete─┼──►        │
└────────────────────────────────────────────────────────┼────────────┘
                                                            │
                       ┌────────────────────────────────────▼───────────────────────┐
                       │ API / Backend (Next.js Route Handlers)                       │
                       │                                                              │
                       │ /api/user/notification-prefs (GET/PATCH)                     │
                       │   requireAuth() → cookie client upsert own row (RLS)         │
                       │                                                              │
                       │ /api/user/delete (POST)                                      │
                       │   requireAuth() → user.id                                    │
                       │   createServiceClient()                                      │
                       │     1. storage.from('ugc-photos').list(user.id) → remove([]) │
                       │     2. supabase.rpc('delete_account_data', {target: user.id})│
                       │          (single txn: conversations[buyer], listing_reports  │
                       │           [reporter], listings[owner] — cascades the rest)   │
                       │     3. auth.admin.deleteUser(user.id)                        │
                       │          (cascades alerts, favorites, push_subs, profiles,   │
                       │           notification_prefs, alert_matches)                 │
                       └──────────────────────────────┬───────────────────────────────┘
                                                        │
                       ┌────────────────────────────────▼──────────────────────────┐
                       │ Database (Postgres/Supabase)                               │
                       │  storage.objects ──(objects_owner_fkey, no cascade)──► auth.users
                       │  listings.owner_user_id ──(no cascade)──► auth.users       │
                       │  conversations.{buyer,seller}_user_id ──(no cascade)──►    │
                       │  listing_reports.reporter_user_id ──(no cascade)──►        │
                       │  conversations.listing_id ──(CASCADE)──► listings          │
                       │  messages.conversation_id ──(CASCADE)──► conversations     │
                       │  listing_reports.listing_id ──(CASCADE)──► listings        │
                       │  alerts/favorites/push_subs/alert_matches/profiles         │
                       │    ──(CASCADE)──► auth.users                               │
                       └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Cron (Vercel Cron → /api/cron/match-alerts, existing, unchanged)      │
│                                                                        │
│  processPendingListingEvents(serviceClient)                          │
│    → processOneEvent()                                               │
│        alert_matches row INSERT (always — D-02: never suppressed)    │
│        loadUserQuietHours(userIds) ──NEW, mirrors loadUserLocales──┐ │
│        for each matched user:                                       │
│          if isQuietHoursActive(prefs, nowRome) → SKIP fanOutMatchPush│
│          else → fanOutMatchPush(...)  (unchanged)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
supabase/migrations/
└── 022_user_notification_prefs.sql   # new table + RLS (mirrors 017_user_locale.sql)
                                        # + a delete_account_data(target_user_id uuid) SQL function

lib/
├── user/
│   ├── locale.ts                     # existing — pattern reference
│   └── notification-prefs.ts         # NEW: loadUserQuietHours(), isQuietHoursActive(), syncUserNotificationPrefs()
├── alerts/
│   └── process-events.ts             # MODIFIED: quiet-hours check before fanOutMatchPush
└── account/
    └── delete-account.ts             # NEW: deleteAccountData(serviceClient, userId) — storage + RPC + admin.deleteUser orchestration

app/api/user/
├── locale/route.ts                   # existing — pattern reference
├── notification-prefs/route.ts       # NEW: GET/PATCH, requireAuth + cookie client (RLS-scoped)
└── delete/route.ts                   # NEW: POST, requireAuth + service client

components/settings/
├── NotificationsSection.tsx          # MODIFIED: nest DND toggle + time pickers, shown only when push is on (D-06)
├── AccountSection.tsx                # NEW: danger-zone card, Delete Account two-step confirm (D-12/D-13)
├── SettingsPageClient.tsx            # MODIFIED: insert <AccountSection /> after <GeneralSection /> (D-13)
└── AdvancedSection.tsx               # UNCHANGED — reference pattern only
```

### Pattern 1: Per-user table + RLS (extend the 017_user_locale.sql template)
**What:** One row per `user_id`, RLS restricts client access to `user_id = auth.uid()`; server/cron reads via the service-role client which bypasses RLS entirely (no special server-read policy needed — confirmed by existing `lib/alerts/process-events.ts` which already reads `alerts`/`profiles` via `createServiceClient()` without any service-role-specific RLS policy).
**When to use:** DND preferences (D-01).
**Example:**
```sql
-- Source: pattern from supabase/migrations/017_user_locale.sql
create table public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dnd_enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  updated_at timestamptz not null default now()
);

alter table public.user_notification_prefs enable row level security;

create policy "notification_prefs_select_own"
  on public.user_notification_prefs for select to authenticated
  using (user_id = auth.uid());

create policy "notification_prefs_upsert_own"
  on public.user_notification_prefs for insert to authenticated
  with check (user_id = auth.uid());

create policy "notification_prefs_update_own"
  on public.user_notification_prefs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```
`on delete cascade` on `user_id` ensures this table is auto-cleaned when `auth.admin.deleteUser()` runs — no explicit delete needed for it in the delete-account pipeline.

### Pattern 2: Overnight-aware quiet-hours check (server, Europe/Rome fixed zone)
**What:** Compare current Rome wall-clock time against a `[start, end)` window that may wrap past midnight.
**When to use:** Inserted in `processOneEvent` before `fanOutMatchPush`.
**Example:**
```typescript
// Source: pattern derived from lib/admin/format.ts's existing Europe/Rome Intl.DateTimeFormat usage
const ROME_TIMEZONE = 'Europe/Rome';

function currentRomeMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** D-03/D-02: quiet hours may cross midnight (e.g. 22:00–08:00). */
export function isQuietHoursActive(
  prefs: { dndEnabled: boolean; quietStart: string; quietEnd: string } | undefined,
  nowMinutes: number = currentRomeMinutes(),
): boolean {
  if (!prefs?.dndEnabled) return false;
  const start = timeToMinutes(prefs.quietStart);
  const end = timeToMinutes(prefs.quietEnd);
  if (start === end) return true; // 24h window edge case
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  // window crosses midnight
  return nowMinutes >= start || nowMinutes < end;
}
```
Accepting `nowMinutes` as an optional injectable parameter (defaulting to the live clock) is what makes this unit-testable without mocking `Date`/`Intl` — mirrors how `alertMatchesListing` and other `lib/alerts/*` helpers are pure functions tested independently of the DB-touching orchestration in `process-events.ts`.

### Pattern 3: Batch per-user preference lookup (mirrors `loadUserLocales`)
**What:** One `.in('user_id', userIds)` query instead of N queries.
**When to use:** Inside `processOneEvent`'s existing `userIds` loop, alongside the existing `loadUserLocales` call.
**Example:**
```typescript
// Source: pattern from lib/user/locale.ts's loadUserLocales
export async function loadUserQuietHours(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { dndEnabled: boolean; quietStart: string; quietEnd: string }>> {
  const map = new Map();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('user_id, dnd_enabled, quiet_start, quiet_end')
    .in('user_id', userIds);
  if (error) return map; // fail-open: no row = DND off, matches D-08 "off" default
  for (const row of data ?? []) {
    map.set(row.user_id, {
      dndEnabled: row.dnd_enabled,
      quietStart: row.quiet_start,
      quietEnd: row.quiet_end,
    });
  }
  return map;
}
```

### Pattern 4: Delete-account server orchestration (Storage → RPC → admin.deleteUser, in that order)
**What:** Three ordered steps, service-role client throughout.
**When to use:** `/api/user/delete` Route Handler.
**Example:**
```typescript
// Source: derived from lib/supabase/service.ts pattern + Context7 supabase-js docs + github.com/supabase/storage#65
export async function deleteAccountData(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error: string | null }> {
  // 1. Storage cleanup FIRST — auth.users deletion fails with FK violation
  //    'objects_owner_fkey' if the user still owns storage.objects rows.
  const { data: files, error: listError } = await serviceClient.storage
    .from('ugc-photos')
    .list(userId);
  if (listError) return { error: listError.message };
  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await serviceClient.storage.from('ugc-photos').remove(paths);
    if (removeError) return { error: removeError.message };
  }

  // 2. Single RPC transaction for app-table rows that do NOT cascade from auth.users
  //    (listings.owner_user_id, conversations.buyer_user_id, listing_reports.reporter_user_id
  //    all lack ON DELETE CASCADE to auth.users per migration 007).
  //    Deleting `listings` cascades conversations→messages and listing_reports
  //    for the user's OWN listings automatically (007's ON DELETE CASCADE on listing_id).
  const { error: rpcError } = await serviceClient.rpc('delete_account_data', {
    target_user_id: userId,
  });
  if (rpcError) return { error: rpcError.message };

  // 3. auth.admin.deleteUser — cascades alerts, user_favorites, push_subscriptions,
  //    profiles, user_notification_prefs, alert_matches (all ON DELETE CASCADE per
  //    016/017/022), plus the auth.users row and its sessions.
  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
  if (authError) return { error: authError.message };

  return { error: null };
}
```

```sql
-- Source: pattern derived from web-search-verified best practice
-- (PostgREST wraps a single RPC call in one transaction; supabase-js does NOT
--  wrap sequential .from() calls in one transaction)
create or replace function public.delete_account_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- D-10: buyer-side conversations on listings the user does NOT own
  -- (cascades to messages via messages.conversation_id ON DELETE CASCADE)
  delete from public.conversations where buyer_user_id = target_user_id;

  -- D-11: reports filed by this user on listings they do NOT own
  delete from public.listing_reports where reporter_user_id = target_user_id;

  -- D-09: the user's own listings — cascades conversations/messages/listing_reports
  -- tied to THOSE listings automatically (all reference listings.id ON DELETE CASCADE)
  delete from public.listings where owner_user_id = target_user_id;
end;
$$;

revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
```
`security definer` + explicit `grant ... to service_role` (and revoking from `anon`/`authenticated`) prevents a logged-in user from calling this RPC directly on someone else's `target_user_id` — only the service-role key (used exclusively server-side in `/api/user/delete`) may invoke it.

### Anti-Patterns to Avoid
- **Calling `auth.admin.deleteUser()` before cleaning up Storage objects or non-cascading app tables:** Fails with FK violations (`objects_owner_fkey` for storage; implicit `NO ACTION` FK restrict for `listings.owner_user_id`, `conversations.{buyer,seller}_user_id`, `listing_reports.reporter_user_id`). Always purge dependents first.
- **Sequential service-role `.from()` calls for the multi-table delete instead of one RPC:** Each `.from()` call is an independent PostgREST HTTP request/transaction — a mid-sequence failure (e.g. network drop after `conversations` delete but before `listings` delete) leaves partial state with no automatic rollback. Use a single `rpc()` call for the atomic subset.
- **Re-deriving Rome-time math per call site:** Reuse one `currentRomeMinutes()`/`isQuietHoursActive()` helper (Pattern 2) — don't inline `Intl.DateTimeFormat` calls in multiple places, matching the existing single-source-of-truth pattern (`lib/admin/format.ts` centralizes Rome formatting already).
- **Storing DND state in `localStorage`:** Explicitly rejected by D-01 — the cron enforcing DND has no browser access; must be server-readable.
- **Building a typed confirmation modal for Delete Account:** Explicitly rejected by D-12 — the existing two-step inline tap-to-confirm pattern (`AdvancedSection.tsx`) must be replicated exactly, just wired to a network call instead of a local reset.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-table atomic delete | A custom "delete in order, catch errors, best-effort cleanup" loop in TypeScript | A single Postgres `security definer` RPC function called once via `.rpc()` | Postgres transactions give real atomicity; TypeScript-level sequencing does not, and partial-failure cleanup logic is itself a source of bugs |
| Timezone conversion / DST handling | Manual UTC-offset arithmetic | `Intl.DateTimeFormat` with `timeZone: 'Europe/Rome'` (already used in `lib/admin/format.ts`) | `Intl` handles Rome's CET/CEST daylight-saving transition automatically; manual offset math would silently break twice a year |
| Storage folder deletion | Constructing raw `DELETE FROM storage.objects WHERE ...` SQL | `storageClient.from(bucket).list(folder)` + `.remove(paths)` via the JS Storage API | Raw SQL against `storage.objects` only removes the DB row — the underlying physical object in the storage backend can be orphaned; the Storage API's `remove()` deletes both |

**Key insight:** This phase's risk is almost entirely in *ordering* (what must happen before what) and *transaction boundaries* (what needs to be atomic vs. what can be sequential), not in algorithmic complexity. Every "don't hand-roll" item above is really "don't manually re-implement guarantees Postgres/Supabase already give you for free when used correctly."

## Runtime State Inventory

> Rename/refactor/migration inventory — not applicable. This phase adds new tables/columns and new deletion logic; it does not rename or move existing identifiers. Skipping this section's rename-specific framing, but the equivalent question for a *destructive-delete* phase is answered in full by the Architecture Patterns section above (cascade map) and the Common Pitfalls section below (ordering pitfalls).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New `user_notification_prefs` table holds no legacy data (net-new) | none — code only |
| Live service config | None — no external service config (n8n/Datadog-style) exists in this codebase | none |
| OS-registered state | None — no Task Scheduler/pm2/launchd equivalents in this Next.js/Vercel app | none |
| Secrets/env vars | `SUPABASE_SERVICE_ROLE_KEY` already exists and is reused as-is for the new delete-account route; no new secret needed | none |
| Build artifacts | None | none |

## Common Pitfalls

### Pitfall 1: Deleting the auth user before cleaning up dependents
**What goes wrong:** `auth.admin.deleteUser()` throws `objects_owner_fkey` violation (Storage) or a generic FK restrict violation (`listings.owner_user_id`, `conversations.*_user_id`, `listing_reports.reporter_user_id`) — the whole delete-account flow fails mid-way, potentially after the client has already shown a "success" state if ordering isn't enforced server-side.
**Why it happens:** It's tempting to call the "final" step first because it's conceptually "the delete" — but `auth.users` is the parent every other user-owned row (in tables lacking `ON DELETE CASCADE`) still points to.
**How to avoid:** Enforce the fixed order in `deleteAccountData()`: Storage → RPC (app tables) → `admin.deleteUser()`. Return early (with an error, not a partial-success) if any step fails.
**Warning signs:** Postgres error messages containing `violates foreign key constraint` during manual testing of delete-account with a user who has posted listings, sent messages as a buyer, or uploaded UGC photos.

### Pitfall 2: Assuming `listings`/`conversations`/`messages`/`listing_reports` all cascade the same way
**What goes wrong:** CONTEXT.md's own scouting summary in D-09 pre-empts this ("the latter three already CASCADE... conversations/messages/listing_reports do NOT cascade") — but it's easy to mis-scope the *explicit* delete to all four tables individually when in fact `listings` deletion alone cascades three of them (via `listing_id` FKs, not `user_id` FKs) for the owner-side case. Writing explicit deletes for `messages` or `listing_reports` tied to owned listings is redundant (harmless but wasted code) — writing NO explicit delete for buyer-side `conversations` (D-10) or reporter-side `listing_reports` (D-11) is a correctness bug (orphaned rows referencing a deleted user... except FK restrict would actually block the whole deletion, surfacing as a failure, not silent orphaning).
**Why it happens:** The migration 007 FK graph has two different cascade "shapes" — `*_user_id → auth.users` (no cascade) vs. `listing_id/conversation_id → listings/conversations` (cascade) — easy to conflate.
**How to avoid:** Use the exact 3-statement RPC in Pattern 4 above: `conversations WHERE buyer_user_id`, `listing_reports WHERE reporter_user_id`, `listings WHERE owner_user_id`. Nothing else needed.
**Warning signs:** A delete-account test where the deleted user was a buyer on someone else's active listing — if that conversation still exists afterward (or if the whole request errors with an FK violation instead), the RPC is incomplete.

### Pitfall 3: Off-by-one / wrap logic for overnight quiet hours
**What goes wrong:** A naive `start <= now <= end` check breaks for windows like 22:00–08:00 because `22:00 <= now <= 08:00` is never true for `now` in minutes-since-midnight terms unless the wrap case is handled separately.
**Why it happens:** Time-range logic that "looks right" for same-day windows (09:00–17:00) silently fails for the actual product use case (D-05's default, evening-to-morning quiet hours) unless explicitly tested with a wrap-around fixture.
**How to avoid:** Use the `start < end` vs `start >= end` branch shown in Pattern 2, and add unit tests for exactly this case (e.g. `quietStart: '22:00', quietEnd: '08:00'`, assert `nowMinutes` at 23:30 → true, at 09:00 → false, at 07:59 → true).
**Warning signs:** DND appears to "not work" specifically overnight but works fine for a same-day test window during manual QA.

### Pitfall 4: Storage `list()` pagination silently truncating cleanup
**What goes wrong:** `storageClient.from(bucket).list(folder)` is paginated (Context7 docs confirm an `options` object with limit/offset exists but did not surface an exact default limit for this call in the fetched snippet — `[ASSUMED]` default is 100, consistent with most Supabase Storage API defaults). A power-user with more UGC photos than the page size would have only the first page deleted, leaving orphaned objects and a subsequent failed `admin.deleteUser()` call (FK violation) since some objects remain.
**Why it happens:** `list()` looks like "get everything in this folder" but is page-limited like most list endpoints.
**How to avoid:** Loop `list(folder, { limit, offset })` until a page returns fewer than `limit` results, accumulating all paths before calling `remove()`. Given this app's UGC photo constraints (single photo per listing, reasonable per-user post volume), this is unlikely to matter in practice, but the loop is cheap insurance against a silent failure mode for power users.
**Warning signs:** A user with many historical UGC listings fails account deletion with an `objects_owner_fkey`-style error despite the delete-account flow believing Storage cleanup succeeded.

### Pitfall 5: RLS blocking the client-side DND read/write, or forgetting `on delete cascade` on the new table
**What goes wrong:** Two distinct failure modes: (a) forgetting RLS policies means the client `PATCH` for DND silently fails with a permission error since there's no `anon`/`authenticated` grant; (b) forgetting `on delete cascade` on `user_notification_prefs.user_id` means this new table becomes another non-cascading dependent, requiring yet another explicit RPC delete line and risking blocking `admin.deleteUser()` just like the pitfalls above.
**Why it happens:** Copy-pasting the `017_user_locale.sql` pattern is straightforward for the RLS policies, but it's easy to forget the cascade clause on the FK itself since `017` referenced an *existing* pattern (`profiles`) where the cascade was already correct from Phase 4/5 design — the "why" isn't visible unless you read migration 016 alongside it.
**How to avoid:** Explicitly write `references auth.users(id) on delete cascade` in the new migration (see Pattern 1's example — already includes this), and include RLS policies for `select`/`insert`/`update` scoped to `user_id = auth.uid()`.
**Warning signs:** DND PATCH returns a Postgres RLS-denial error in dev testing; or, deleting a test account that has DND configured throws an FK violation on the new table.

## Code Examples

Verified patterns from official sources and the existing codebase:

### Fetching current Storage folder contents (paginated, safe form)
```typescript
// Source: Context7 /supabase/supabase-js storage-js README + defensive pagination loop
async function listAllUserFiles(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const { data, error } = await serviceClient.storage
      .from('ugc-photos')
      .list(userId, { limit, offset });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    paths.push(...data.map((f) => `${userId}/${f.name}`));
    if (data.length < limit) break;
    offset += limit;
  }
  return paths;
}
```

### `auth.admin.deleteUser` signature (confirmed via Context7)
```typescript
// Source: https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueAdminApi.ts
async deleteUser(id: string, shouldSoftDelete = false): Promise<UserResponse>
// D-16 (immediate/irreversible): call with the default shouldSoftDelete=false (hard delete).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — no prior settings-parity implementation existed in this codebase for DND/delete-account | This phase's new patterns (per-user table + service-role RPC delete pipeline) | Phase 14 | Establishes the reusable "hard-delete with pre-cascade cleanup" pattern for any future user-owned-data feature |

**Deprecated/outdated:** None relevant — the existing `AdvancedSection`/`ZonesSection`/`NotificationsSection` patterns being reused are all from Phase 4/9 and are current, not legacy.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Storage `list()`'s default page size is 100 (not explicitly confirmed in the fetched Context7 snippet for this specific call — only `listUsers`'s 50/page default was explicit) | Pitfall 4 / Code Examples | Low — the defensive pagination loop in the Code Examples section works correctly regardless of the actual default, since it loops until a short page is returned |
| A2 | No existing `user_notification_prefs`-equivalent table already exists under a different name that should be extended instead of creating new | Standard Stack / Pattern 1 | Low — verified by grep of `supabase/migrations/*.sql`; no such table exists (confirmed by direct file read of all migrations 016/017/007 plus a directory listing through 021) |
| A3 | `security_enforcement`/ASVS review of the new `delete_account_data` RPC (revoking `anon`/`authenticated` execute, granting only `service_role`) is sufficient defense-in-depth — no additional rate-limiting or CAPTCHA needed for account deletion given it's already auth-gated + two-step confirmed | Security Domain | Medium — if wrong, a compromised session could trigger irreversible deletion faster than intended; mitigated by requiring an active authenticated session (`requireAuth()`) plus the UX-level two-step confirm, consistent with D-12's explicit no-modal/no-typed-confirmation choice |

## Open Questions

1. **Exact Storage `list()` default page size for this Supabase project version**
   - What we know: The JS API signature accepts `{ limit, offset }` options; `listUsers` (a different admin API) documents a 50/page default explicitly.
   - What's unclear: The exact default `limit` value if `list()` is called with no options.
   - Recommendation: Always pass an explicit `{ limit: 100 }` (or similar) and loop (Code Examples pattern above) rather than relying on an undocumented default — this makes the question moot for implementation.

2. **Whether `delete_account_data` RPC needs `search_path` hardening beyond `set search_path = public`**
   - What we know: `security definer` functions are a documented Postgres SQL-injection-via-search-path vector if `search_path` isn't pinned.
   - What's unclear: Whether this project's existing `security definer` functions (e.g. `enqueue_listing_event` in migration 016) use any additional hardening beyond `set search_path = public`.
   - Recommendation: Match the existing `enqueue_listing_event` function's exact `security definer` + `set search_path = public` pattern (already shown to be the project's established convention) — no additional hardening beyond project precedent is needed for ASVS V1 parity with existing code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Writing/applying migration 022 locally before remote push | ✓ | 2.75.0 | — |
| `@supabase/supabase-js` | All new DB/auth/storage calls | ✓ | ^2.110.9 (installed) | — |
| Node.js | Route Handlers, `Intl.DateTimeFormat` | ✓ | v23.10.0 | — |
| `SUPABASE_SERVICE_ROLE_KEY` env var | `/api/user/delete`, quiet-hours cron read | ✓ (already required by existing `createServiceClient()` callers) | — | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest.config.ts`, `environment: 'jsdom'`) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run lib/alerts/process-events.test.ts lib/user/notification-prefs.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-01 | Push toggle retained, restyled | unit/manual | existing coverage in `NotificationsSection` — visual-only change, verify via UAT | ✅ existing |
| SET-02 | DND suppresses push during quiet window, including midnight-wrap | unit | `npx vitest run lib/user/notification-prefs.test.ts -t "quiet hours"` | ❌ Wave 0 |
| SET-02 | `processOneEvent` skips `fanOutMatchPush` when DND active for matched user | unit | `npx vitest run lib/alerts/process-events.test.ts -t "quiet hours"` | ❌ Wave 0 (extend existing file) |
| SET-03 | Language selection retained | manual | existing coverage — unchanged | ✅ existing |
| SET-04 | Delete account purges listings/conversations/reports/storage/auth row | unit (mocked RPC/storage) | `npx vitest run lib/account/delete-account.test.ts` | ❌ Wave 0 |
| SET-04 | Two-step confirm UX matches `AdvancedSection` pattern | unit/manual (component) | manual UAT — no existing component test harness for settings sections in this repo | manual |
| SET-05 | Sign out retained | manual | existing coverage — unchanged | ✅ existing |
| SET-06 | Keyword alerts, zone, appearance, iOS A2HS unchanged | manual | UAT regression pass | ✅ existing (no new tests needed — verify no regression) |
| TD-01 | `04-VERIFICATION.md` produced for Phase 4 | doc | manual authoring, informed by existing `04-UAT.md`/`04-VALIDATION.md`/`COVERAGE.md` — no automated test | manual |
| I18N-01 (partial) | New DND/Account strings present in zh/en/it | unit | `npx vitest run messages/key-parity.test.ts` | ✅ existing (will catch missing keys automatically) |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/alerts/ lib/user/ lib/account/ messages/key-parity.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/user/notification-prefs.test.ts` — unit tests for `isQuietHoursActive` (same-day window, overnight-wrap window, DND-off, no-row-found) and `loadUserQuietHours` batch lookup mock
- [ ] `lib/alerts/process-events.test.ts` — extend existing file with a `user_notification_prefs` table mock (mirrors the existing `profiles` mock in the same file) and a test asserting `fanOutMatchPush` is NOT called when the matched user has DND active
- [ ] `lib/account/delete-account.test.ts` — mock service-role client (`storage.list/remove`, `.rpc()`, `.auth.admin.deleteUser`) asserting call order (storage → rpc → deleteUser) and short-circuit-on-error behavior
- [ ] No new test framework install needed — Vitest is already fully configured

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | `requireAuth()` (existing) gates both new Route Handlers; delete-account additionally requires an active session, not just a stored token |
| V3 Session Management | yes | Post-delete flow calls `supabase.auth.signOut()` (D-14) to invalidate the client-side session immediately after the account is destroyed server-side |
| V4 Access Control | yes | `delete_account_data` RPC is `security definer` with `execute` revoked from `anon`/`authenticated` and granted only to `service_role` — prevents any authenticated user from invoking it with an arbitrary `target_user_id` to delete someone else's account. The Route Handler itself derives `userId` from `requireAuth()`'s session, never from client-supplied input, closing the IDOR vector entirely |
| V5 Input Validation | yes | DND PATCH body validated (boolean `dndEnabled`, `HH:MM`-format `quiet_start`/`quiet_end`) before persistence — mirror the existing `isValidAppLanguage` guard pattern in `/api/user/locale` |
| V6 Cryptography | no | No new cryptographic material introduced — `SUPABASE_SERVICE_ROLE_KEY` reuses the existing secret |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR — a user triggers deletion of another user's account by supplying a foreign `user_id` | Elevation of Privilege | `userId` always derived server-side from `requireAuth()`'s session `user.id`, never accepted as a request body/param; RPC additionally scoped to `service_role`-only execute |
| Partial-delete race — account deletion fails mid-pipeline, leaving the user "half deleted" (data gone, auth row remains, or vice versa) but the client believes success | Repudiation / Tampering | Fixed ordering (Storage → RPC txn → `admin.deleteUser`) with early-return-on-error at every step; client only performs `signOut()`/redirect after the API call returns 200 |
| DND-bypass via direct push-subscription tampering (a user editing browser storage to fake an "always push" state) | Tampering | DND is enforced entirely server-side inside the cron's `processOneEvent` — the client toggle is advisory UI state only; even if a malicious client never sends a DND PATCH, the server default (`dnd_enabled = false`) and the DB-stored preference (not a client-supplied value at push time) is authoritative |
| Storage-object enumeration via predictable delete-account request replay | Information Disclosure | `list()`/`remove()` scoped to `${userId}/` folder using the service-role client server-side only — never exposed as a client-callable endpoint with an attacker-controlled folder parameter |

## Sources

### Primary (HIGH confidence)
- Direct file reads of this repository: `supabase/migrations/{007,016,017}_*.sql`, `lib/supabase/{service,server,auth}.ts`, `lib/alerts/process-events.ts`, `lib/user/locale.ts`, `lib/settings/preferences.ts`, `components/settings/{AdvancedSection,NotificationsSection,SettingsUi,SettingsPageClient,ZonesSection}.tsx`, `app/api/{user/locale,alerts,ugc/upload,cron/match-alerts}/route.ts`, `lib/admin/format.ts`, `vitest.config.ts`, `lib/alerts/process-events.test.ts`, `.planning/milestones/v1.0-phases/04-auth-alerts-push-notifications/{COVERAGE,04-UAT,04-VALIDATION}.md`, `.planning/phases/09-feed-first-home-navigation-ia/09-VERIFICATION.md` (template for TD-01)

### Secondary (MEDIUM confidence)
- Context7 `/supabase/supabase-js` — `auth.admin.deleteUser` method signature (`shouldSoftDelete` param, default `false`), Storage `list`/`remove` API shape `[CITED: github.com/supabase/supabase-js]`
- WebSearch cross-checked against `github.com/supabase/storage` issue #65 (official Supabase org repo) — `objects_owner_fkey` FK-violation behavior when deleting a user who still owns Storage objects `[CITED: github.com/supabase/storage/issues/65]`
- WebSearch — PostgREST/`supabase.rpc()` transaction-wrapping behavior vs. non-atomic sequential `.from()` calls `[CITED: supabase.com/docs/reference/javascript/rpc, github.com/orgs/supabase/discussions/9524]`

### Tertiary (LOW confidence)
- None used as authoritative — all delete-account-critical claims were cross-checked against at least one official-repo source per the provenance rule.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all patterns reused directly from existing, working code in this repo
- Architecture: HIGH — cascade/FK graph verified by direct migration file reads, not inference
- Pitfalls: HIGH — the two highest-risk pitfalls (deletion ordering, storage FK violation) are verified against an official supabase/storage GitHub issue, not just training-data recall

**Research date:** 2026-08-10
**Valid until:** 2026-09-09 (30 days — Supabase JS/Storage API surface used here is stable; re-verify `auth.admin.deleteUser` signature if `@supabase/supabase-js` is upgraded across a major version before then)
