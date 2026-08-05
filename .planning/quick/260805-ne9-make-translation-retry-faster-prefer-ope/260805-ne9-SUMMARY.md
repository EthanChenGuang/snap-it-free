---
quick_id: 260805-ne9
status: complete
one_liner: Bound OpenRouter/Gemini translation calls to an 8s timeout each and deduped the fetch logic into single-source helpers, keeping OpenRouter as the first-tried, cost-preferred provider.
tech_stack:
  patterns:
    - AbortSignal.timeout() for fetch-based provider timeouts
    - "@google/genai config.httpOptions.timeout for client-side Gemini call bounds"
key_files:
  modified:
    - lib/admin/translate.ts
    - lib/admin/translate.test.ts
decisions:
  - "8000ms timeout for both OpenRouter and Gemini translation provider calls"
  - "No racing/parallel provider calls — OpenRouter stays first-tried, Gemini fallback only on failure (user-locked cost preference)"
metrics:
  duration: "15 min"
  completed: "2026-08-05"
---

# Quick Task 260805-ne9: Make translation retry faster (prefer OpenRouter, add timeout, no unbounded double-provider calls) Summary

Bounded OpenRouter/Gemini translation provider calls with 8-second client-side timeouts and
deduplicated the previously-duplicated OpenRouter fetch logic into a single helper, so a hung
or slow provider now fails fast into the fallback path instead of blocking the retry
indefinitely.

## What Was Done

### Task 1: Add bounded timeouts to both providers and dedupe the OpenRouter fetch logic

- Added `export const OPENROUTER_TIMEOUT_MS = 8000;` and `export const GEMINI_TIMEOUT_MS = 8000;`
  near `MAX_INPUT_CHARS` in `lib/admin/translate.ts`.
- Extracted a private `callOpenRouterProvider(prompt, options)` helper containing the
  fetch-and-parse body that was previously duplicated in `translateListingWithProviders`'s
  `openRouterGenerate` and in `translateListingFields`'s `provider === 'openrouter'` branch.
  The helper's `fetchFn(...)` call now includes `signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)`
  alongside `method`/`headers`/`body`, so a hung/slow OpenRouter response aborts after 8s
  instead of blocking indefinitely. The existing `try { ... } catch { return null; }` wrapper
  treats an abort the same as any other provider failure.
- Extracted a private `callGeminiProvider(prompt, options)` helper containing the body
  previously inlined in `translateListingWithProviders`'s `geminiGenerate`. Added
  `httpOptions: { timeout: GEMINI_TIMEOUT_MS }` to the `config` object passed to
  `ai.models.generateContent(...)`, alongside the existing `systemInstruction` and
  `temperature` keys, so the Gemini fallback call is also bounded.
- `translateListingWithProviders` now calls `callGeminiProvider(prompt, options)` and
  `callOpenRouterProvider(prompt, options)` from its `deps` object instead of inlining the
  logic. `translateListingFields`'s `provider === 'openrouter'` branch now calls
  `callOpenRouterProvider(prompt, options)` instead of its duplicated fetch block;
  `geminiGenerate: async () => null` is unchanged there (openrouter-only mode still
  intentionally skips Gemini entirely).
- `translateListing`'s call order (OpenRouter awaited first, Gemini awaited only on
  OpenRouter failure) is byte-for-byte unchanged — this is the user-locked "prefer
  OpenRouter for cost" behavior.
- `app/api/admin/translation/retry/route.ts`'s existing
  `translateListingFields(input, 'gemini', options)` call site is unchanged — it already
  routes through the now-bounded `translateListingWithProviders`.

### Task 2: Add tests covering the timeout wiring

- Added `translateListingWithProviders` to the import from `./translate` in
  `lib/admin/translate.test.ts`.
- Added a `describe('translateListingWithProviders timeout wiring', ...)` block with two new
  tests, alongside the existing three `translateListing` tests (all five now pass):
  1. `'passes an AbortSignal to every OpenRouter fetch call'` — asserts
     `fetchFn.mock.calls[0][1].signal instanceof AbortSignal` is `true` on the normal success
     path.
  2. `'treats an aborted OpenRouter call as a failure and still reports the queue signal'` —
     asserts an aborted OpenRouter fetch (no `geminiApiKey` supplied, so Gemini short-circuits
     to `null` without any network call) still yields
     `{ ok: false, queue: true, error: 'All translation providers failed' }`.

## Pre-Existing Working-Tree Context

Per the task's `important_context`, `lib/admin/translate.ts` and `lib/admin/translate.test.ts`
already had pre-existing uncommitted changes on disk before this task started (OpenRouter
reordered ahead of Gemini, model default `google/gemini-3.5-flash`, renamed test
descriptions). This task built on top of that content as-is and did not revert it; the
commit for this task includes those pre-existing hunks alongside the new timeout/dedup
changes, since nothing else in the working tree touched these two files.

## Verification

- `npx vitest run lib/admin/translate.test.ts` — **5 passed, 0 failed** (3 existing + 2 new),
  all completing in ~5ms (no real timeout/network wait).
- `grep -c "AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)" lib/admin/translate.ts` — `1` (single
  source of truth, no duplicate fetch block left).
- `grep -c "httpOptions: { timeout: GEMINI_TIMEOUT_MS }" lib/admin/translate.ts` — `1`.
- `npx tsc --noEmit` (via `npm run lint`) — **no errors in `translate.ts` or
  `translate.test.ts`**. The full project-wide `tsc --noEmit` run does surface pre-existing
  errors in unrelated files (`lib/i18n/listing-fields.test.ts`, `scraper-admin/src/components/Sidebar.tsx`,
  `scraper-admin/src/main.tsx`, `scraper-admin/vite.config.ts`) — confirmed pre-existing via
  `git diff --name-only` (no diff against those files) and out of scope for this task per the
  Scope Boundary rule. Logged to
  `.planning/quick/260805-ne9-make-translation-retry-faster-prefer-ope/deferred-items.md`.

## Deviations from Plan

None — plan executed exactly as written. The pre-existing OpenRouter-primary reordering in the
working tree (noted above) was inherited context, not a deviation introduced by this task.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: lib/admin/translate.ts (edited, contains `OPENROUTER_TIMEOUT_MS`, `GEMINI_TIMEOUT_MS`,
  `callOpenRouterProvider`, `callGeminiProvider`)
- FOUND: lib/admin/translate.test.ts (edited, contains new `describe('translateListingWithProviders timeout wiring', ...)` block)
- FOUND: commit 5e25f21 (`git log --oneline` confirms `perf(quick-260805-ne9): bound translation provider timeouts and dedupe fetch logic`)
