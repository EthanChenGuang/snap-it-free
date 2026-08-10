# Phase 14: Settings Consumer Parity - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 delivers **Do Not Disturb (quiet hours)** and **Delete Account** for the consumer settings screen, while retaining everything already built (push toggle, language, sign out, zones/alerts, appearance, iOS A2HS). Requirements in scope: **SET-01–06**, **TD-01** (if low cost), **I18N-01** (partial — new strings).

**Key scouting finding:** most of ROADMAP's "Stitch-aligned settings ... restyled to Stitch settings layout" success criterion is **already done** — `components/settings/{GeneralSection,NotificationsSection,ZonesSection,LanguageSection,AdvancedSection}.tsx` already match `.planning/google-stitch-ui-design/setting_notion_style/screen.png` (card rows, toggle switches, section titles, language pill selector, two-step destructive confirm on Reset Cache & Data). The real net-new work this phase is **DND (SET-02)** and **Delete Account (SET-04)** — SET-01/03/05/06 are verification/retention, not implementation.

**Explicitly out of scope:** new capabilities beyond DND/delete-account (e.g. multi-device push management, account recovery/undo-delete flow, email confirmation of deletion, operator-account special-casing).

</domain>

<decisions>
## Implementation Decisions

### Quiet Hours / DND Mechanics (SET-02)

- **D-01:** Quiet hours state lives in a **new Supabase table** (pattern: `017_user_locale.sql` — per-user row, RLS `user_id = auth.uid()`), not `localStorage`. Required because enforcement happens server-side in the alert cron, which has no access to the browser's `localStorage`. — **Reversibility:** costly — migrating existing localStorage-based settings patterns to a DB table sets precedent; a later "move back to client-only" would require re-deriving all users' state.
- **D-02:** During quiet hours, a match **suppresses (drops) the push silently** — `fanOutMatchPush` is skipped entirely for that user in `lib/alerts/process-events.ts`. The `alert_matches` row is still created (visible in-app), so nothing is lost — just no push fires. No queue/retry/redelivery mechanism. — **Reversibility:** reversible — switching to "defer" later is additive (add a scheduled re-check pass).
- **D-03:** Timezone is **hardcoded `Europe/Rome`** server-side — no device-timezone capture or conversion logic. App only serves Venice/Padova. — **Reversibility:** reversible.
- **D-04:** Scope is **all server push** (currently only alert-match pushes exist, via `fanOutMatchPush`) — one rule, not alert-specific framing. — **Reversibility:** reversible.
- **D-05:** UI is a **custom start/end time picker** (e.g. two time inputs), not preset windows. — **Reversibility:** reversible.
- **D-06:** Quiet-hours toggle + time pickers are **nested inside `NotificationsSection`**, shown **only when Push Notifications is on** — avoids configuring DND for a channel that's off. — **Reversibility:** reversible.
- **D-07:** Changes **auto-save on change** (PATCH immediately), same pattern as every other toggle in this settings screen — no separate Save button. — **Reversibility:** reversible.
- **D-08:** DND has its **own on/off toggle**, separate from the start/end time values — turning it off preserves the saved times without re-entry (three-state: off / configured-but-paused / active). — **Reversibility:** reversible.

### Delete Account Data Handling (SET-04)

- **D-09:** Full **hard delete** of everything the user owns: their `listings` (owner_user_id), `alerts`, `user_favorites`, `push_subscriptions` (the latter three already `ON DELETE CASCADE` per `016_auth_alerts_push.sql`), and any `conversations`/`messages` tied to their owned listings. — **Reversibility:** one-way — deletion is destructive by nature; no soft-delete/recovery path exists.
- **D-10:** **Counterparty conversations** — when the deleting user is the *buyer* on someone else's listing, the whole `conversations` row and its `messages` are **deleted entirely**, even though the seller loses that thread. No anonymize-and-keep-for-the-other-party path. — **Reversibility:** one-way — same rationale as D-09; also means `conversations`/`messages`/`listing_reports` (migration 007) need **new explicit delete logic** since they lack `ON DELETE CASCADE` to `auth.users` today.
- **D-11:** `listing_reports` rows where the user is `reporter_user_id` are deleted as part of the same hard-delete flow (consistent with D-09/D-10). — **Reversibility:** one-way.
- **D-12:** Confirmation UX is **two-step inline**, matching the existing `AdvancedSection` "Reset Cache & Data" pattern exactly (tap → button label changes to "tap again to confirm" → tap again). No modal, no typed confirmation. — **Reversibility:** reversible — UX-only, can be hardened later without touching the delete logic.
- **D-13:** Delete Account lives in a **new "Account" danger-zone section**, positioned **right after General**, ahead of Zones/Language; the existing generic "Advanced" (cache reset) section **stays last**. Full section order: General → Notifications (with nested DND) → Zones → Language → Account (danger zone) → Advanced. — **Reversibility:** reversible.
- **D-14:** After successful deletion: client calls `supabase.auth.signOut()`, clears local state (`resetLocalAppData()` — favorites/prefs/reported listings/iOS dismissed flag), and `router.push('/')`. — **Reversibility:** reversible.
- **D-15:** Storage cleanup is **included** — the delete flow also removes the user's objects from the `ugc-photos` bucket (folder keyed by `auth.uid()` per `007_ugc_messaging_reports.sql`'s storage policy) so no orphaned public image URLs remain. — **Reversibility:** one-way — file deletion is unrecoverable.
- **D-16:** Deletion is **immediate and irreversible** — no grace period, no "pending deletion" state, no scheduled job, no undo-by-relogin flow. — **Reversibility:** one-way (explicit product choice, not just a side effect).
- **D-17 (Active Claim Safeguard):** If the user owns a listing with `status = 'claimed'` (an in-progress pickup with a buyer), the two-step confirm shows an **extra warning line** ("You have N active claim(s) in progress — deleting will end those conversations.") but does **not block** deletion — user can still confirm and proceed. — **Reversibility:** reversible — the warning itself is UX-only; can be upgraded to a hard block later without changing the delete pipeline (D-09/D-10 already delete claimed-listing conversations regardless).

### Settings Layout Placement

- **D-18:** TD-01 (`04-VERIFICATION.md`) is **included in this phase's plan if low-cost**, per REQUIREMENTS.md's "carry-forward, execute if low cost" framing — not a blocking dependency for DND/delete-account work. — **Reversibility:** reversible.

### Claude's Discretion

- Exact new Supabase table name/shape for quiet hours (e.g. `user_notification_prefs` with `dnd_enabled`, `quiet_start`, `quiet_end`) vs. extending `user_locale` — Claude picked "new table" per D-01, but exact column naming is open.
- i18n key naming for new DND/Account strings across `messages/{zh,en,it}.ts`.
- Overnight window comparison logic (e.g. 22:00–08:00 crossing midnight) — standard time-range-wrap handling.
- Exact server-side delete-account route shape (single transaction vs. sequential service-role calls) using the existing `lib/supabase/service.ts` service-role client pattern, ending with `supabase.auth.admin.deleteUser()`.
- Whether/how to debounce the auto-save PATCH on time-input drag interactions.
- Post-delete toast/confirmation messaging before redirect (raised as a candidate gray area; user chose not to discuss it — default to Claude's judgment, keep it minimal).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 goals; "Settings parity" bullet (DND, delete account, Stitch restyle; retain alerts/zone/appearance/iOS A2HS)
- `.planning/REQUIREMENTS.md` — SET-01–06, TD-01, I18N-01 traceability
- `.planning/ROADMAP.md` §Phase 14 — goal, success criteria, dependency on Phase 9
- `.planning/STATE.md` — current phase pointer

### Design Authority (mandatory for UI)
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens, monochrome rules, documented exceptions
- `.planning/google-stitch-ui-design/setting_notion_style/screen.png` — Reference mockup: General/Profile, Push+Sound toggles, Zones cards, Language pills, red Advanced danger box. Note: mockup's "Zones Management" framing doesn't 1:1 match this app's alert-based zones (already reconciled in existing `ZonesSection.tsx`); mockup has **no DND or Delete Account rows** — those need new Stitch-consistent treatment per decisions above, not literal mockup copying.
- `.planning/google-stitch-ui-design/setting_notion_style/code.html` — Reference HTML/CSS for the above

### Database / Migrations (data-handling ground truth)
- `supabase/migrations/016_auth_alerts_push.sql` — `alerts`, `push_subscriptions`, `user_favorites`, `alert_matches`: all `ON DELETE CASCADE` to `auth.users` already
- `supabase/migrations/017_user_locale.sql` — Per-user table + RLS pattern to replicate for new quiet-hours table
- `supabase/migrations/007_ugc_messaging_reports.sql` — `conversations`, `messages`, `listing_reports`, `listings.owner_user_id`: reference `auth.users(id)` **without** `ON DELETE CASCADE` — the core reason Delete Account needs explicit application-level deletion logic (D-09–D-11); also defines the `ugc-photos` storage bucket + folder-per-`auth.uid()` policy relevant to D-15

### Prior Phase Context
- `.planning/phases/13-select-location-flow/13-CONTEXT.md` — Not directly settings-relevant, but establishes this milestone's per-user Supabase-table + RLS conventions and Stitch flat-card styling used again here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/settings/SettingsUi.tsx` — `SettingsToggle`, `SettingsCard`, `SettingsSectionTitle` — reuse directly for DND toggle/time picker rows and the new Account danger-zone card
- `components/settings/NotificationsSection.tsx` — Existing push toggle + sound toggle card; DND toggle/pickers nest here (D-06)
- `components/settings/AdvancedSection.tsx` — Existing two-step inline destructive-confirm pattern (`confirming` state + `onBlur` reset); copy this exact interaction model for Delete Account (D-12)
- `lib/settings/preferences.ts` — `resetLocalAppData()` already clears favorites/prefs/reported-listings/iOS-dismissed-flag; reuse verbatim in post-delete cleanup (D-14)
- `lib/supabase/service.ts` — Service-role Supabase client pattern (used elsewhere for admin ops) — reuse for the delete-account API route's `auth.admin.deleteUser()` call and cross-table deletes
- `lib/alerts/process-events.ts` — `processPendingListingEvents` / `processOneEvent` — insertion point for the quiet-hours suppress check before `fanOutMatchPush` (D-02)
- `lib/user/locale.ts` — `loadUserLocales` — pattern for a similarly-shaped `loadUserQuietHours`-style batch lookup by `user_id`

### Established Patterns
- Per-user Supabase table + `user_id = auth.uid()` RLS policies (migrations 016, 017) — replicate for quiet-hours table (D-01)
- Two-step inline confirm (no modal) for destructive local actions — extending to a destructive *server* action (delete account) per explicit user choice (D-12)
- `useSyncExternalStore` + custom `window` events for client-side preference reactivity (`lib/settings/preferences.ts`, `subscribeAppPreferences`) — NOT applicable to DND since it's server-stored; DND needs a fetch-based load like `ZonesSection`'s `/api/alerts` pattern instead
- Section = `SettingsSectionTitle` + one or more `SettingsCard` — consistent scaffold for the new Account section

### Integration Points
- `components/settings/SettingsPageClient.tsx` — Add new `AccountSection` between `GeneralSection` and `ZonesSection` per D-13's order
- `lib/alerts/process-events.ts` — `processOneEvent` — add quiet-hours check per user before `fanOutMatchPush` call
- New API routes needed: quiet-hours read/write (mirrors `/api/alerts` pattern), delete-account (service-role, multi-table + storage + `auth.admin.deleteUser`)
- New migration needed: quiet-hours table (mirrors `017_user_locale.sql` shape)

</code_context>

<specifics>
## Specific Ideas

- User confirmed "Recommended" options throughout except explicitly deferring the suppress-vs-defer choice to Claude's judgment (D-02) and declining to discuss post-delete confirmation messaging as its own area (left to discretion).
- The Stitch mockup (`setting_notion_style`) is treated as **interaction/visual reference, not literal spec** — it predates DND/delete-account existing as concepts in this app, consistent with PROJECT.md's "reference screenshots = interaction, not visual clone" rule.

</specifics>

<deferred>
## Deferred Ideas

- **Anonymize-and-preserve** counterparty conversations on delete (vs. full delete) — user chose full hard-delete (D-10); anonymization deferred indefinitely, not just to a future phase, unless privacy requirements change
- **Grace period / soft-delete with undo** for account deletion — user chose immediate/irreversible (D-16); could revisit in a future phase if accidental-deletion complaints arise
- **Hard block on delete when active claims exist** — user chose warn-not-block (D-17); could tighten later
- **Post-delete confirmation email** — not discussed; not in scope
- **Operator-account special-casing on the delete-account flow** — surfaced during scouting (operator status is an env-var email allowlist, not a DB flag) but user did not select it as a discussion area; Claude's default assumption is no special-casing needed since operators are trusted/internal
- **Preset quiet-hours windows** (vs. custom time range) — user chose custom range (D-05)

### Reviewed Todos (not folded)
None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-Settings Consumer Parity*
*Context gathered: 2026-08-10*
