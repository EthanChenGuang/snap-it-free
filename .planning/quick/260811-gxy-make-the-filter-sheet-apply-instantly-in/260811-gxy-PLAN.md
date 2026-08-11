---
phase: quick-260811-gxy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/shell/FeedFilterContext.tsx
  - components/listings/FilterSheet.tsx
autonomous: true
requirements: [INSTANT-01, INSTANT-02, INSTANT-03, INSTANT-04, INSTANT-05]
user_setup: []

must_haves:
  truths:
    - "Tapping a 城市 chip in the filter sheet updates the feed list behind the sheet immediately, without tapping 应用 (INSTANT-01)."
    - "Tapping a 分类 chip updates the feed list behind the sheet immediately, without tapping 应用 (INSTANT-01)."
    - "Tapping 重置 clears all filters immediately and the sheet stays open (INSTANT-03, unchanged from today)."
    - "Tapping 应用 only closes the sheet — it triggers no filter-state change because the tapped filters were already committed (INSTANT-03)."
    - "Swiping the sheet closed without tapping 应用 leaves the just-tapped filters applied, not discarded — an intentional behavior change from today (INSTANT-05)."
    - "No parallel `draft` filter object exists anymore; the sheet's chip highlighting reads directly from `applied` (INSTANT-04)."
    - "FeedHomeClient / FeedHeaderRow need zero code changes — they already read only `applied` via useSyncExternalStore and re-render reactively (INSTANT-02)."
  artifacts:
    - components/shell/FeedFilterContext.tsx
    - components/listings/FilterSheet.tsx
  key_links:
    - "ConsumerCityChipSelector onChange -> FeedFilterContext.setCity -> writeFilterPrefs (map-mode-preserving branch) or applyCityFilterPrefs (city-switch branch) -> applied updates -> useSyncExternalStore notifies FeedHomeClient/FeedHeaderRow (INSTANT-01, INSTANT-02)"
    - "Category chip onClick -> FeedFilterContext.toggleCategory -> writeFilterPrefs({...applied, categories: next}) -> applied updates -> feed re-filters live (INSTANT-01)"
    - "应用 button onClick -> setSheetOpen(false) only; no filter write (INSTANT-03)"
---

<objective>
Make `components/listings/FilterSheet.tsx` apply every chip tap instantly to the real filter state instead of buffering it in a `draft` object until 应用 is pressed, so the feed list behind the sheet updates live as the user taps 城市/分类 chips.

Purpose: today `setDraft(...)` only updates local UI highlighting; the feed (`FeedHomeClient` / `FeedHeaderRow`) only reads `applied` via `useFeedFilter()`, so nothing visibly changes until 应用 commits the draft. The user wants Snapchat/iOS-style live filtering: tap a chip, see the list update immediately, right behind the still-open sheet.

Output: `FeedFilterContext.tsx` gains per-tap instant-commit functions (`setCity`, `toggleCategory`, `clearCategories`) that reuse the exact `mode: 'map'` vs `mode: 'city'` branching logic that used to live inside `applyDraft`, and loses the now-dead `draft` state entirely. `FilterSheet.tsx` derives all chip highlighting from `applied` and wires every chip directly to the new instant-commit functions. 应用 becomes a close-only action; 重置 is unchanged.
</objective>

<execution_context>
@/home/guang/Projects/Experiments/snap-it-free/.cursor/gsd-core/workflows/execute-plan.md
@/home/guang/Projects/Experiments/snap-it-free/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/shell/FeedFilterContext.tsx
@components/listings/FilterSheet.tsx
@lib/filter-prefs/storage.ts
@lib/filter-prefs/mode-transitions.ts
</context>

<recon_findings>
Read during planning — treat as established fact, do not re-derive.

1. **`applyDraft`'s branching is a value-equality check, not an action check.** Today: `const categoryOnlyInMapMode = applied.mode === 'map' && draft.city === 'all' && draft.city === applied.city;`. Because map mode always forces `city: 'all'` (see `applyCityFilterPrefs` / `applyMapFilterPrefs` in `lib/filter-prefs/mode-transitions.ts`), `applied.city` is always `'all'` whenever `applied.mode === 'map'`. So the condition collapses to `applied.mode === 'map' && draft.city === 'all'` — it cannot distinguish "user explicitly tapped the All chip" from "user never touched city at all". **The per-tap port must preserve this exact collapsed condition**, not react to "did the user tap a chip" as an event — i.e. `setCity(city)` must check `applied.mode === 'map' && city === 'all'`, using the *incoming* value, not a before/after diff.
2. **Only two files in the entire repo reference `draft`/`setDraft`/`applyDraft`/`resetDraftFromApplied`**: `components/shell/FeedFilterContext.tsx` and `components/listings/FilterSheet.tsx` (confirmed via repo-wide grep). No test files reference them and none exist for either component today. The scope is exactly these two files — no test files to update.
3. **`FeedHomeClient.tsx` and `FeedHeaderRow.tsx` only ever destructure `applied`, `dismissCategory`, `dismissCity`, `dismissRadius`, `hasActiveFilters`, and `setSheetOpen` from `useFeedFilter()`** (confirmed via grep) — never `draft`. Zero changes needed on the feed-read side; `useSyncExternalStore(subscribeFilterPrefs, readFilterPrefs, ...)` already re-renders them the instant `writeFilterPrefs` fires its `CustomEvent`.
4. **`dismissCategory` in `FeedFilterContext.tsx` is already the instant-commit pattern to copy**: `writeFilterPrefs({ ...applied, categories: next })` with no draft step. `toggleCategory` and the new `clearCategories` follow the identical shape.
5. **`applyCityFilterPrefs(prefs)` already normalizes `mode: 'city'`, `radiusEnabled: false`, `radiusKm: DEFAULT_FILTER_PREFS.radiusKm`, and calls `clearBrowseCenter()` internally** (`lib/filter-prefs/mode-transitions.ts`). Callers only need to pass `{ ...applied, city }` — do not manually set `mode`/`radiusEnabled` on the call site, that would be redundant with what the helper already does.
6. **`writeFilterPrefs` alone never touches `mode`, `city`, `radiusEnabled`, or `radiusKm`** unless the caller explicitly changes them in the spread — so `writeFilterPrefs({ ...applied, categories: next })` is inherently mode-preserving. This is why a category-only commit never needs the `applyCityFilterPrefs` path, in any current mode.
7. **No `## Package Legitimacy Audit` gate applies** — this plan installs zero packages.
</recon_findings>

<tasks>

<task type="tracer">
  <name>Task 1: FeedFilterContext — replace draft-then-Apply with instant-commit functions</name>
  <files>components/shell/FeedFilterContext.tsx</files>
  <action>
This is the tracer slice: it proves the instant-commit wiring end-to-end at the state-management layer before Task 2 rewires the UI on top of it.

In `FeedFilterContextValue`, remove `draft`, `setDraft`, `resetDraftFromApplied`, and `applyDraft`. Add three new members: `setCity: (city: FilterPrefs['city']) => void`, `toggleCategory: (slug: string) => void`, `clearCategories: () => void`.

In `FeedFilterProvider`:
- Delete the `draft` `useState` and the `resetDraftFromApplied` / `setDraft` / `applyDraft` callbacks entirely.
- Add `setCity`, implementing the exact collapsed branching from recon finding 1 (using the incoming `city` argument, not a diff against a draft):
  - `categoryOnlyInMapMode = applied.mode === 'map' && city === 'all'`
  - if true: `writeFilterPrefs({ ...applied, city })` (mode-preserving, matches recon finding 6)
  - else: `applyCityFilterPrefs({ ...applied, city })` (matches recon finding 5 — do not add `mode`/`radiusEnabled` manually)
- Add `toggleCategory(slug)`: `next = applied.categories.includes(slug) ? applied.categories.filter((item) => item !== slug) : [...applied.categories, slug]`, then `writeFilterPrefs({ ...applied, categories: next })` — same shape as the existing `dismissCategory` (recon finding 4).
- Add `clearCategories()`: `writeFilterPrefs({ ...applied, categories: [] })`.
- Simplify `setSheetOpen` to just `setSheetOpenState(open)` — no draft to sync on open/close now that `draft` is gone.
- Keep `resetFilters`, `dismissCity`, `dismissCategory`, `dismissRadius`, `hasActiveFilters`, `computeHasActiveFilters` byte-identical (INSTANT-03 requires 重置 behavior to stay unchanged).
- Update the `useMemo` value object and its dependency array to drop `draft`/`setDraft`/`resetDraftFromApplied`/`applyDraft` and add `setCity`/`toggleCategory`/`clearCategories`.
  </action>
  <verify>
    <automated>bash -c 'set -e; cd /home/guang/Projects/Experiments/snap-it-free; npx tsc --noEmit; F=components/shell/FeedFilterContext.tsx; B=$(grep -vE "^\s*(//|\*|/\*)" "$F"); ! echo "$B" | grep -qE "\bdraft\b|setDraft|applyDraft|resetDraftFromApplied" || { echo "FAIL: draft-model code survived"; exit 1; }; echo "$B" | grep -q "setCity" || { echo "FAIL: setCity missing"; exit 1; }; echo "$B" | grep -q "toggleCategory" || { echo "FAIL: toggleCategory missing"; exit 1; }; echo "$B" | grep -q "clearCategories" || { echo "FAIL: clearCategories missing"; exit 1; }; echo "$B" | grep -q "applied.mode === .map. && city === .all." || { echo "FAIL: collapsed map-mode branch missing/altered"; exit 1; }; echo OK'</automated>
  </verify>
  <done>`npx tsc --noEmit` passes. `FeedFilterContext.tsx` exposes `setCity`/`toggleCategory`/`clearCategories` that write directly to `writeFilterPrefs`/`applyCityFilterPrefs` per tap, with zero remaining references to `draft`, `setDraft`, `applyDraft`, or `resetDraftFromApplied`.</done>
</task>

<task type="auto">
  <name>Task 2: FilterSheet — wire chips to instant commit, derive highlighting from applied, make 应用 close-only</name>
  <files>components/listings/FilterSheet.tsx</files>
  <action>
Destructure `{ sheetOpen, setSheetOpen, applied, setCity, toggleCategory, clearCategories, resetFilters }` from `useFeedFilter()` instead of the old `draft`/`setDraft`/`resetDraftFromApplied`/`applyDraft` set.

Delete the `useEffect` that calls `resetDraftFromApplied()` when `sheetOpen` changes — there is no draft left to rehydrate.

Simplify `handleOpenChange` to `const handleOpenChange = (open: boolean) => setSheetOpen(open);` — no draft-discard step on close/swipe-dismiss. This is what makes INSTANT-05 true: since chips already committed to `applied` the instant they were tapped, closing (by any means, including swipe) has nothing left to discard.

`ConsumerCityChipSelector`: change the call site to `value={applied.city}` and `onChange={setCity}` (the component's own props/signature do not need to change, only what's passed in).

Delete the local `toggleCategory` function in `FilterSheet` (it becomes redundant — the context now owns this logic per Task 1). Update the category chip `onClick` to call the context's `toggleCategory(slug)` directly, and change `checked = draft.categories.includes(slug)` to `checked = applied.categories.includes(slug)`.

Change the "清除" / `messages.feed.clearSelection` button's condition from `draft.categories.length > 0` to `applied.categories.length > 0`, and its `onClick` from `() => setDraft({ categories: [] })` to `() => clearCategories()`.

应用 button: change `onClick={applyDraft}` to `onClick={() => setSheetOpen(false)}` — per INSTANT-03, all it does now is close the sheet, since every tap already committed. Keep the button element, its classes, and its `{messages.feed.applyFilters}` label exactly as-is (do not remove or relabel per task scope).

重置 button: leave `onClick={() => { resetFilters(); }}` untouched — `resetFilters()` in `FeedFilterContext.tsx` already writes immediately and never touches `sheetOpen`, so it keeps clearing filters live without closing the sheet (INSTANT-03, unchanged).

Do a final sweep of the file confirming zero remaining references to `draft`, `setDraft`, `resetDraftFromApplied`, or `applyDraft`.
  </action>
  <verify>
    <automated>bash -c 'set -e; cd /home/guang/Projects/Experiments/snap-it-free; npx tsc --noEmit; npm test; F=components/listings/FilterSheet.tsx; B=$(grep -vE "^\s*(//|\*|/\*)" "$F"); ! echo "$B" | grep -qE "\bdraft\b|setDraft|applyDraft|resetDraftFromApplied" || { echo "FAIL: draft-model code survived in FilterSheet"; exit 1; }; echo "$B" | grep -q "value={applied.city}" || { echo "FAIL: city chip not reading applied"; exit 1; }; echo "$B" | grep -q "onChange={setCity}" || { echo "FAIL: city chip not wired to setCity"; exit 1; }; echo "$B" | grep -q "applied.categories.includes(slug)" || { echo "FAIL: category chip not reading applied"; exit 1; }; echo "$B" | grep -q "onClick={() => toggleCategory(slug)}" || { echo "FAIL: category chip not wired to context toggleCategory"; exit 1; }; echo "$B" | grep -q "clearCategories()" || { echo "FAIL: clear-selection not wired to clearCategories"; exit 1; }; echo "$B" | grep -q "onClick={() => setSheetOpen(false)}" || { echo "FAIL: Apply button no longer close-only"; exit 1; }; echo "$B" | grep -q "messages.feed.applyFilters" || { echo "FAIL: Apply label/i18n removed"; exit 1; }; echo "$B" | grep -q "resetFilters();" || { echo "FAIL: Reset wiring changed"; exit 1; }; echo OK'</automated>
    <human-check>Run `npm run dev`, open the feed, tap the 筛选 filter control to open the sheet. (1) Tap a 城市 chip (e.g. Venice/Padova) — confirm the listing cards visible behind/through the sheet update immediately, sheet stays open, no 应用 tap needed. (2) Tap a 分类 chip — same live update. (3) Tap another category to deselect it — list updates again live. (4) Tap 重置 — all filters clear immediately, list updates, sheet stays open. (5) Tap a city or category chip, then close the sheet by swiping it down (not tapping 应用) — reopen the sheet or check the feed header pills and confirm the filter you tapped is still applied, not discarded. (6) Tap 应用 — sheet closes, filters unchanged (list should look identical right before and right after, since nothing new was written).</human-check>
  </verify>
  <done>`npx tsc --noEmit` and `npm test` both pass. Every chip commits to `applied` on tap (verified live in-browser per the human-check), 应用 only closes the sheet, 重置 is unchanged, and swipe-dismiss preserves already-tapped filters instead of discarding them.</done>
  <reversibility rating="reversible">Two-file behavioral refactor with no schema/storage-shape change (`FilterPrefs` and `writeFilterPrefs`/`applyCityFilterPrefs` signatures are untouched); reverting is one `git revert`.</reversibility>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user tap → localStorage | Chip taps now write to `localStorage` (via `writeFilterPrefs`/`applyCityFilterPrefs`) on every tap instead of only on 应用. Values are still constrained to compile-time enums (`CITY_OPTIONS`, `SUBITO_CATEGORY_SLUGS`) — no free-text input is introduced by this change. |
| sheet open → feed re-render | `applied` now changes multiple times per sheet session (once per tap) instead of once on Apply. `useSyncExternalStore` + the existing `CustomEvent` dispatch already handle arbitrary-frequency updates; no new listener/timing surface is introduced. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260811gxy-01 | Denial of Service (perf) | `writeFilterPrefs` fired on every chip tap instead of once on Apply | low | accept | `writeFilterPrefs` is a synchronous `localStorage.setItem` + one `CustomEvent` dispatch — sub-millisecond, and chip taps are human-paced (not a hot loop); no debouncing needed. |
| T-260811gxy-02 | Tampering | `applied.city` / `applied.categories` values written per-tap | low | accept | Values still originate exclusively from the compile-time `CITY_OPTIONS` / `SUBITO_CATEGORY_SLUGS` constants passed through `setCity`/`toggleCategory` — this plan does not widen the accepted value set or add new input paths. |
| T-260811gxy-03 | Repudiation / lost state | Swipe-to-dismiss now silently preserves filters instead of discarding them (INSTANT-05) | low | accept | Intentional, explicitly required by the task (INSTANT-05); 重置 remains one tap away to fully clear, and 应用's label is unchanged so returning users are not confused about needing to press it. |
| T-260811gxy-SC | Tampering | npm/pip/cargo installs | high | accept | This plan installs zero packages — no new dependency surface. |

</threat_model>

<verification>
1. `npx tsc --noEmit` clean after both tasks.
2. `npm test` (full vitest suite) stays green — no test file references `draft`/`setDraft`/`applyDraft`/`resetDraftFromApplied` today (confirmed via repo-wide grep during planning), so no test updates are expected, but the full run catches any incidental breakage.
3. Structural greps per task, comment-filtered, confirm the draft model is fully removed and the new instant-commit wiring is in place.
4. Human-check in Task 2 walks the exact scenarios from the task's own VERIFICATION section: live city/category updates, 重置 behavior, 应用 as close-only, and swipe-dismiss preserving taps.
</verification>

<success_criteria>
- [ ] Tapping any 城市 or 分类 chip updates the feed list live, sheet still open (INSTANT-01)
- [ ] No feed-read-side files (`FeedHomeClient.tsx`, `FeedHeaderRow.tsx`) were touched — confirmed unnecessary via recon (INSTANT-02)
- [ ] 重置 clears instantly and keeps the sheet open; 应用 only closes the sheet (INSTANT-03)
- [ ] `draft` state, `resetDraftFromApplied`, and `applyDraft` are fully removed from both files; chip highlighting reads `applied` directly (INSTANT-04)
- [ ] Swipe-to-dismiss without tapping 应用 leaves just-tapped filters applied (INSTANT-05)
- [ ] `npx tsc --noEmit` and `npm test` pass
</success_criteria>

<output>
Create `.planning/quick/260811-gxy-make-the-filter-sheet-apply-instantly-in/260811-gxy-SUMMARY.md` when done.
</output>
