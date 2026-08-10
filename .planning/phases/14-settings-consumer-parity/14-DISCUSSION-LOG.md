# Phase 14: Settings Consumer Parity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 14-Settings Consumer Parity
**Areas discussed:** Quiet Hours Mechanics, Delete Account Data Handling, Settings Layout Placement, Active Claim Safeguard

---

## Quiet Hours Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| New Supabase table | Per-user table like `user_locale`, server cron reads it | ✓ |
| Extend `user_locale` table | Add columns to existing table | |
| Client-only (localStorage) | Device-scoped, cron can't see it | |

**User's choice:** New Supabase table
**Notes:** Required because server-side cron enforcement has no access to localStorage.

| Option | Description | Selected |
|--------|-------------|----------|
| Suppress (drop silently) | Skip push, keep `alert_matches` row | ✓ (Claude's discretion) |
| Defer until window ends | Queue + redeliver after window | |

**User's choice:** "You choose best option for me" → Claude selected Suppress (simplest, matches "suppress or defer" wording without a queue/retry mechanism)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed Europe/Rome | Hardcoded server-side | ✓ |
| Device-local timezone | Captured + converted | |

**User's choice:** Fixed Europe/Rome

| Option | Description | Selected |
|--------|-------------|----------|
| All push notifications | One rule, all server push | ✓ |
| Alert matches only, explicit | Narrower framing, same code path today | |

**User's choice:** All push notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Custom start/end time picker | Two time inputs | ✓ |
| Preset windows | Fixed choices (Night/Work/Off) | |

**User's choice:** Custom start/end time picker

| Option | Description | Selected |
|--------|-------------|----------|
| Hide when push is off | Nested inside NotificationsSection, conditional | ✓ |
| Always visible | Shown regardless of push state | |

**User's choice:** Hide when push is off

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save on change | PATCH immediately, same as other toggles | ✓ |
| Explicit Save button | Unsaved-changes pattern | |

**User's choice:** Auto-save on change

| Option | Description | Selected |
|--------|-------------|----------|
| Separate toggle + time range | Pause without losing saved times | ✓ |
| Time range implies enabled | One fewer control | |

**User's choice:** Separate toggle + time range

---

## Delete Account Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete everything owned | Listings, alerts, favorites, push_subs, conversations | ✓ |
| Anonymize owned listings, delete rest | Keep listings live, null owner | |

**User's choice:** Hard delete everything owned

| Option | Description | Selected |
|--------|-------------|----------|
| Delete conversation + messages entirely | Seller loses thread too | ✓ |
| Anonymize sender, keep for seller | Placeholder FK, GDPR-friendlier to counterparty | |

**User's choice:** Delete conversation + messages entirely

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step inline (Reset Cache & Data pattern) | Tap → confirm → tap again | ✓ |
| Modal with typed confirmation | Explains what's deleted, type DELETE | |

**User's choice:** Two-step inline

| Option | Description | Selected |
|--------|-------------|----------|
| New "Account" danger zone + sign-out + redirect home | Own section, separate from Advanced | ✓ |
| Fold into existing AdvancedSection | Second destructive action in same card | |

**User's choice:** New "Account" danger zone + sign-out + redirect home

| Option | Description | Selected |
|--------|-------------|----------|
| Delete storage objects too | Clean up `ugc-photos` bucket folder | ✓ |
| Leave photos orphaned | Skip storage cleanup | |

**User's choice:** Delete storage objects too

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate, irreversible | No grace period | ✓ |
| Grace period (7-day soft-delete) | Cron + undo flow | |

**User's choice:** Immediate, irreversible

---

## Settings Layout Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Account section after General, Advanced stays last | General → Notifications → Zones → Language → Account → Advanced | ✓ |
| Account section next to Advanced at bottom | Both danger zones grouped at the end | |

**User's choice:** Account section right after General, Advanced stays last

| Option | Description | Selected |
|--------|-------------|----------|
| Include TD-01 if low-cost | Planner assesses, folds in as doc task | ✓ |
| Defer TD-01 entirely | Note as still-open tech debt | |

**User's choice:** Include if low-cost

---

## Active Claim Safeguard (additional area, surfaced after initial three)

| Option | Description | Selected |
|--------|-------------|----------|
| Warn inline, allow anyway | Extra warning line in two-step confirm, no block | ✓ |
| Hard block until resolved | Pre-check + blocking error state | |

**User's choice:** Warn inline, allow anyway

---

## Claude's Discretion

- Suppress vs. defer semantics for quiet hours (user explicitly deferred to Claude) — chose Suppress
- Exact new Supabase table name/columns for quiet hours
- i18n key naming for new DND/Account strings
- Overnight time-range-wrap comparison logic
- Exact delete-account API route shape (transaction vs. sequential service-role calls)
- Debounce behavior for auto-save on time-input drag
- Post-delete toast/confirmation messaging (user declined to discuss as its own area — see Deferred Ideas)

## Deferred Ideas

- Anonymize-and-preserve counterparty conversations on delete (rejected in favor of full hard-delete)
- Grace period / soft-delete with undo for account deletion (rejected in favor of immediate/irreversible)
- Hard block on delete when active claims exist (rejected in favor of warn-not-block)
- Post-delete confirmation email (not discussed, not in scope)
- Operator-account special-casing on delete-account flow (surfaced during scouting, not selected for discussion)
- Preset quiet-hours windows (rejected in favor of custom time range)
