---
phase: quick-260811-nwf
plan: 01
subsystem: scraper
tags: [supabase, vitest, concurrency, translation, performance]

requires: []
provides:
  - "translateBatch/loadTranslateBatchState/translateOneListing/runWithConcurrencyLimit in scraper/src/translate/ingest.ts"
  - "Batch-scoped, bounded-concurrency post-persist translation dispatch wired into persistBatch"
affects: [scraper-translate, scraper-persist]

tech-stack:
  added: []
  patterns:
    - "Batch-scoped config/cap load + in-memory synchronous reservation instead of per-item DB read-then-write, to avoid concurrency races without a DB transaction"
    - "Hand-rolled bounded-concurrency worker pool (runWithConcurrencyLimit) instead of a new dependency"

key-files:
  created:
    - scraper/src/translate/ingest.test.ts
  modified:
    - scraper/src/translate/ingest.ts
    - scraper/src/shared/persist.ts
    - scraper/src/shared/persist.test.ts

key-decisions:
  - "Cap reservation done via a synchronous, no-await function (reserveTranslationSlot) so Node's single-threaded event loop cannot interleave concurrent callers — no DB transaction needed for cap safety under concurrency."
  - "translations_today is flushed to Supabase exactly once per batch, after all dispatched translation work has settled, instead of once per listing — eliminates the out-of-order-write race where a later reservation's write could land before an earlier one's."
  - "Concurrency default set to 4 (DEFAULT_TRANSLATE_CONCURRENCY) — bounds simultaneous Gemini/OpenRouter calls to protect provider rate limits and the daily cap from a request burst, while still cutting wall-clock time roughly 4x versus fully sequential dispatch."

patterns-established:
  - "translateBatch is the sole entry point translate/ingest.ts exposes for post-persist translation; persist.ts never talks to scraper_global_config directly."

requirements-completed: [QUICK-260811-NWF]

coverage:
  - id: D1
    description: "A persistBatch call touching N listings issues exactly one scraper_global_config SELECT for translate config/cap, not one per listing."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > loads scraper_global_config exactly once per batch regardless of item count"
        status: pass
    human_judgment: false
  - id: D2
    description: "The daily translation cap is never exceeded even when multiple listings' translations are dispatched concurrently within the same persistBatch call."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > stops dispatching once the daily cap is exhausted mid-batch, with no over-count from concurrent dispatch"
        status: pass
    human_judgment: false
  - id: D3
    description: "auto_translate=false and empty-batch paths make zero DB writes and zero LLM calls, identical to current behavior."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > makes zero LLM calls and zero further writes when auto_translate is false"
        status: pass
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > returns immediately for an empty work list without any Supabase calls"
        status: pass
    human_judgment: false
  - id: D4
    description: "Up to DEFAULT_TRANSLATE_CONCURRENCY listings' translation calls run concurrently instead of strictly one at a time, while row upsert/content-hash checks stay sequential."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > caps concurrent translateListingFields invocations at the configured limit"
        status: pass
    human_judgment: false
  - id: D5
    description: "A translation failure still queues into translation_queue with incrementing attempts, exactly as before."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/translate/ingest.test.ts#translateBatch > still queues a translation failure into translation_queue with incrementing attempts"
        status: pass
    human_judgment: false
  - id: D6
    description: "persistBatch's existing sequential row-upsert/content-hash loop is unchanged; translation dispatch happens once, strictly after the loop, and persistBatch does not resolve until it settles."
    requirement: QUICK-260811-NWF
    verification:
      - kind: unit
        ref: "scraper/src/shared/persist.test.ts (all 4 existing tests, unchanged, still pass)"
        status: pass
      - kind: other
        ref: "manual code check: persistBatch for-loop untouched except appended translationWork.push + single trailing await translateBatch(...) call"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-11
status: complete
---

# Quick Task 260811-nwf: Speed Up Scraper Post-Persist Translation Summary

**Batch-scoped translate config/cap loading (1 SELECT per batch instead of up to 4×N round trips) plus a hand-rolled bounded-concurrency dispatcher (default 4-in-flight) replacing the old fully-blocking per-listing translation call.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 3 (`ingest.ts`, `persist.ts`, `persist.test.ts`)
- **Files created:** 1 (`ingest.test.ts`)

## Accomplishments

- Replaced per-listing `loadTranslateConfig` + `checkAndIncrementUsage` (up to 4 Supabase round trips per listing: 1 config SELECT + 1 cap SELECT + up to 2 UPDATEs) with `loadTranslateBatchState`, one SELECT (plus an at-most-once rollover UPDATE) per **entire batch**.
- Added a hand-rolled `runWithConcurrencyLimit` worker pool (no new dependency) and `translateBatch`, which dispatches up to `DEFAULT_TRANSLATE_CONCURRENCY` (4) listings' LLM translation calls concurrently instead of fully `await`-ing each one in sequence.
- Cap enforcement moved to an in-memory, synchronous `reserveTranslationSlot` check-and-increment — safe under concurrent dispatch because it contains no `await`, so Node's event loop cannot interleave two callers' read-then-write (the old per-listing DB pattern was racy the moment more than one translation could be in flight).
- `translations_today` is now flushed to `scraper_global_config` exactly **once per batch**, after all dispatched work has settled, instead of once per listing — removing the theoretical write-ordering race where a later (higher) count's UPDATE could land before an earlier one's.
- `persistBatch`'s sequential row-upsert/content-hash-check loop is untouched; it now collects `TranslationWorkItem`s per non-skipped listing and fires them through one `translateBatch(...)` call after the loop, awaited before `persistBatch` returns.
- New `scraper/src/translate/ingest.test.ts` (no prior file existed) with 8 passing tests covering: single-load-per-batch, `auto_translate=false` and empty-batch no-op paths, cap-exhaustion-under-concurrency with zero over-count, failure-queueing regression (incrementing `attempts`), and concurrency-limit enforcement.

## Task Commits

Each task was committed atomically:

1. **Task 1: Batch-scoped config/cap state** - `c19ce4c` (feat)
2. **Task 2: Bounded-concurrency dispatch wired into persistBatch** - `20af389` (feat)
3. **Task 3: New ingest.test.ts covering batching, cap-safety, failure-queueing, concurrency cap** - `742288d` (test)

_No plan-metadata commit — SUMMARY/STATE/ROADMAP commits are handled by the orchestrator per quick-task convention._

## Files Created/Modified

- `scraper/src/translate/ingest.ts` - `loadTranslateBatchState`, `reserveTranslationSlot`, `runWithConcurrencyLimit`, `translateOneListing`, `translateBatch`, `DEFAULT_TRANSLATE_CONCURRENCY`, `TranslationWorkItem` replace the old `loadTranslateConfig`/`checkAndIncrementUsage`/`translateAfterPersist`
- `scraper/src/shared/persist.ts` - `persistListing` no longer calls into translate/ingest at all; `persistBatch` collects `TranslationWorkItem`s during its loop and dispatches them via one `translateBatch(...)` call after the loop
- `scraper/src/shared/persist.test.ts` - mock updated from `translateAfterPersist` to `translateBatch`; zero test-case changes (verified_facts #1: existing tests never asserted on the mock's calls)
- `scraper/src/translate/ingest.test.ts` (new) - 8 tests covering the `must_haves.truths` from PLAN.md

## Decisions Made

- **Concurrency default = 4**: bounds simultaneous Gemini/OpenRouter fetches to protect provider rate limits and avoid bursting the daily spend cap, while still parallelizing the dominant per-batch wall-clock cost (LLM latency) roughly 4x versus one-at-a-time.
- **Single end-of-batch flush write** for `translations_today`, not one write per listing: the `TranslateBatchState` object is mutated in-memory by every concurrent `reserveTranslationSlot` call (synchronous, race-free), then flushed to Supabase exactly once after `runWithConcurrencyLimit` resolves — this guarantees exactly one writer per batch, sequenced strictly after everything it needs to reflect, eliminating any possibility of an out-of-order write between concurrent reservations.
- **`translation_provider` remains loaded-but-unused** in `TranslateBatchState`, matching pre-existing dead-field behavior (verified_facts #2) — out of scope to wire it into `translateListingFields`.

## Deviations from Plan

None - plan executed exactly as written. Task 1's expected transient non-type-checking state of `persist.ts` (calling the now-deleted `translateAfterPersist`) was confirmed and resolved by Task 2 as designed.

## Round-Trip Count: Before vs. After

**Before** (per batch of N non-skipped listings):
- `loadTranslateConfig`: 1 SELECT × N listings
- `checkAndIncrementUsage`: 1 SELECT + up to 2 UPDATEs (rollover + increment) × N listings
- **Total: up to 4N Supabase round trips**, plus N `translateListingFields` calls fully serialized (each blocking the next listing's persist entirely).

**After** (per batch, regardless of N):
- `loadTranslateBatchState`: 1 SELECT (+ at most 1 rollover UPDATE, once per batch, only if the reset date has rolled over)
- End-of-batch flush: 1 UPDATE (only if at least one translation was actually dispatched)
- **Total: 2–3 Supabase round trips for the entire batch**, with up to `DEFAULT_TRANSLATE_CONCURRENCY` (4) `translateListingFields` calls in flight simultaneously instead of one at a time.

Example for N=20 non-skipped listings: **80 round trips → 2–3 round trips**, with LLM dispatch bounded-parallel (4x) instead of fully sequential.

## Full Test Suite Result

`cd scraper && npm test` — **15 test files, 95 tests, all passing, zero regressions**:

```
✓ src/scheduler.test.ts (6 tests)
✓ src/subito/categories.test.ts (3 tests)
✓ src/worker-placeholder.test.ts (2 tests)
✓ src/shared/validate-run.test.ts (6 tests)
✓ src/admin/presets.test.ts (2 tests)
✓ src/shared/dedupe.test.ts (5 tests)
✓ src/alert/notify.test.ts (5 tests)
✓ src/subito/normalize.test.ts (4 tests)
✓ src/subito/extract.test.ts (16 tests)
✓ src/shared/schema.test.ts (4 tests)
✓ src/shared/zone-tag.test.ts (9 tests)
✓ src/translate/ingest.test.ts (8 tests)   <- new
✓ src/shared/persist.test.ts (4 tests)     <- unchanged, still green
✓ src/shared/normalize.test.ts (14 tests)
✓ src/config-loader.test.ts (7 tests)

Test Files  15 passed (15)
Tests  95 passed (95)
```

`npx tsc --noEmit` shows only pre-existing, unrelated errors (confirmed present on the pre-task baseline via `git stash`): `config-loader.ts`/`ingest.ts`'s cross-package `rootDir` warnings for `lib/admin/*.ts` imports, and a `zone-tag.ts` turf.js type mismatch. No new type errors were introduced by this task's changes.

## Issues Encountered

None.

## Next Phase Readiness

Post-persist translation dispatch is now batch-scoped and bounded-concurrent; no follow-up work required for this quick task's scope. The pre-existing dead `translation_provider` field and the unrelated in-progress changes visible in `git status` (touch-refresh on skip, Gemini model version bump, and various other files) were left untouched per task constraints.

## Self-Check: PASSED

All created/modified files confirmed on disk; all 3 task commit hashes (`c19ce4c`, `20af389`, `742288d`) confirmed in `git log`.

---
*Phase: quick-260811-nwf*
*Completed: 2026-08-11*
