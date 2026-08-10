# Phase 13: Select Location Flow — Validation

**Phase gate:** Plan 04 (Wave 3)  
**Date:** 2026-08-10  
**Status:** Gate complete — ready for `/gsd-verify-work` with documented external debt

---

## Integration Audit

Static grep-based verification that Phase 13 did not introduce scope creep beyond locked decisions D-04, D-05, D-11, D-22, D-23, D-24, D-38, D-46.

### D-46 — AppChrome pathname-only gate (both contexts)

```bash
$ grep "pathname === '/select-location'" components/shell/AppChrome.tsx
  18:  const isSelectLocation = pathname === '/select-location';
```

**Result:** PASS — no `context` query-param branching added; full-viewport hide applies to browse and post identically.

### D-04 — FeedHeaderRow browse entry unchanged

```bash
$ grep -n "select-location\|/select-location" components/shell/FeedHeaderRow.tsx
133:          href="/select-location"
```

**Result:** PASS — pin-icon link still `href="/select-location"` with no query param; no center pill re-added. Zero commits touching this file in Plans 01–03 (`git log c339455 --not ee0e8fe^ -- components/shell/FeedHeaderRow.tsx` empty).

### D-11 — Zone derivation: no `zone-from-coords.ts`; server uses `tagZone`

```bash
$ test ! -f lib/geo/zone-from-coords.ts && echo "absent"
absent

$ grep -n "tagZone" app/api/ugc/listings/route.ts
3:import { loadZonePolygons, tagZone } from '@/lib/geo/zone-tag';
38:  const zone = tagZone(lat, lng, zones);
```

**Result:** PASS — Claude's Discretion resolved: no standalone `lib/geo/zone-from-coords.ts`; existing `tagZone(lat, lng, zones)` in UGC listings route remains the sole server-side zone-derivation path (D-11).

### D-24 — SelectLocationRedPin untouched in Phase 13

```bash
$ git diff c339455 -- components/map/SelectLocationRedPin.tsx | wc -c
0
```

**Result:** PASS — red pin + 400ms drop animation preserved as documented Stitch exception (D-24).

### D-23 — SelectLocationPinOverlay pixel-projection pattern intact

```bash
$ grep -n "map\.project\|move\|zoom\|resize" components/map/SelectLocationMapPane.tsx
85:      const projected = map.project([position.lng, position.lat]);
90:    map.on('move', update);
91:    map.on('zoom', update);
92:    map.on('resize', update);
94:      map.off('move', update);
95:      map.off('zoom', update);
96:      map.off('resize', update);
```

**Result:** PASS — `SelectLocationPinOverlay` uses `map.project()` + move/zoom/resize listeners unchanged; only `showRadiusControls` prop threads around overlay/radius UI (D-26/D-32).

### D-22 — Tap-to-place (verified, not re-implemented)

```bash
$ grep -n "onClick\|handleClick\|handleMapClick" components/map/SelectLocationMapPane.tsx components/map/SelectLocationClient.tsx
SelectLocationMapPane.tsx:272:            onClick={handleClick}
SelectLocationClient.tsx:138:  const handleMapClick = useCallback(
SelectLocationClient.tsx:140:      setMarkerPosition({ lat, lng });
```

**Result:** PASS — map click moves pin; pan-without-tap does not move pin (existing handler unchanged).

### D-38 — Back-without-confirm: no storage writes in effects/unmount

```bash
$ grep -n "writePostDraft\|applyMapFilterPrefs\|writeBrowseCenter\|writeFilterPrefs\|shoumanwu_" components/map/SelectLocationClient.tsx
18:import { readPostDraft, writePostDraft } from '@/lib/post-draft/storage';
174:      writePostDraft({
182:    applyMapFilterPrefs(
```

`writePostDraft` and `applyMapFilterPrefs` appear only inside `handleConfirm` (lines 168–189). Mount `useEffect` (line 97) calls `readPostDraft()` / `readBrowseCenter()` only — no writes.

```bash
$ grep -n "writePostDraft\|writeBrowseCenter\|writeFilterPrefs\|shoumanwu_" components/ugc/PostForm.tsx
(no matches — PostForm imports readPostDraft only)
```

**Result:** PASS — storage mutations occur only on explicit Confirm; back navigation has no side effects.

---

## Open Items

### D-12 — PostForm field loss across picker round trip (OPEN)

**Flagged planner assumption — not fully achievable this phase (surface to developer, do not silently claim done):** D-12 asks that "photo, title, etc." survive the navigate-out-and-back round trip. Verified against Next.js 16 docs (Context7 `/vercel/next.js/v16.2.9`): without the opt-in `cacheComponents` experimental flag (not enabled in this project's `next.config.ts`), a top-level App Router navigation between two distinct routes — `/post` and `/select-location` — fully unmounts and remounts the client component tree either way (`router.push` or `router.back()`), resetting all local `useState`, including `title`/`description`/`category`/`condition`, and `photoFile`/`photoPreview` (a `File`/object-URL cannot round-trip through JSON storage at all). CONTEXT.md's own Deferred Ideas list explicitly restricts this phase's session draft to "location fields only," which forecloses the one workaround (storing the other fields in sessionStorage too). Plan 02 does not attempt a fix — `photoFile`/`title`/`description`/`category`/`condition` reset to defaults after the round trip, same as any other unmount. This is a real UX regression versus the pre-Phase-13 inline-toggle flow (which never navigated away) and should be raised with the developer as a candidate for a follow-up phase (e.g. lifting the non-photo fields into a persistent layout-level context, or enabling Cache Components app-wide).

**Disposition:** OPEN — developer decision required before closing LOC-02 human-judgment items.

---

## Per-Task Verification Map

| Plan | Task | Verification | Result |
|------|------|--------------|--------|
| 13-01 | resolveCityLabel promotion | `npx vitest run lib/geo/resolve-city-label.test.ts` | ✅ 4/4 pass |
| 13-01 | post-draft storage CRUD | `npx vitest run lib/post-draft/storage.test.ts` | ✅ 8/8 pass |
| 13-02 | context branching + PostForm | `npx vitest run messages/key-parity.test.ts` + grep acceptance | ✅ 3/3 pass |
| 13-02 | post confirm / browse fork | grep `writePostDraft`, `showRadiusControls`, `context=post` | ✅ PASS |
| 13-03 | live preview + aria-live | grep `aria-live`, `disabled={!ready}` | ✅ PASS |
| 13-03 | Stitch flat-card corrections | grep no glassmorphism violations | ✅ PASS |
| 13-04 | integration audit greps | see Integration Audit above | ✅ PASS |
| 13-04 | full lib suite | `npm run test:lib` | ⚠️ 302/305 pass — 3 failures in `lib/admin/subito-regalo-catalog.test.ts` (pre-existing admin/scraper debt, unrelated to Phase 13) |
| 13-04 | production build | `npm run build` | ⚠️ FAIL — TypeScript error in `lib/admin/cleanup.ts:34` (pre-existing admin debt, unrelated to Phase 13) |

**Phase-scoped suite (all Phase 13 artifacts):**

```bash
$ npx vitest run lib/geo/resolve-city-label.test.ts lib/post-draft/storage.test.ts messages/key-parity.test.ts
 Test Files  3 passed (3)
      Tests  15 passed (15)
```

---

## ROADMAP Phase 13 Success Criteria

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | Select Location screen matches Stitch prototype patterns | Plan 03 flat-card corrections (D-40/D-43/D-44); UI-SPEC checker 6/6 dimensions approved pre-planning | ✅ Automated grep pass; manual visual UAT recommended |
| 2 | Confirm persists lat/lng + label for filter or post context | Plan 02: browse → `applyMapFilterPrefs`; post → `writePostDraft` + `router.push('/post')`; independent storage (D-07) | ✅ Unit + grep pass |
| 3 | Reuses MapLibre and existing pin components | `SelectLocationRedPin` zero Phase 13 diff; `SelectLocationPinOverlay` unchanged; `showRadiusControls` only addition | ✅ Verified |

---

## Requirements Traceability

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LOC-01 | ✅ Green (automated) + manual UAT notes | resolveCityLabel tests; live preview grep; context branching |
| LOC-02 | ✅ Green (automated) + D-12 open | post-draft storage tests; confirm handlers; D-12 field-loss documented |
| LOC-03 | ✅ Green | `?context=post` dispatch; FeedHeaderRow browse entry unchanged |
| I18N-01 (partial) | ✅ Green | `messages/key-parity.test.ts` — 4 new keys in zh/en/it |

---

## Manual-Only / Open Items

| Item | Type | Notes |
|------|------|-------|
| D-12 PostForm field loss | **Open — developer decision** | Photo/title/description reset on picker round trip; see Open Items section |
| Locate-me FAB silent failure | Claude's Discretion (resolved) | Empty catch on geolocation error; pin unchanged, no error UI (Plan 03) |
| Malformed draft as unconfirmed | Claude's Discretion (resolved) | `readPostDraft` returns partial object with `locationConfirmed: false` (Plan 01) |
| Live pin-move preview update | Manual UAT | aria-live + resolveCityLabel on markerPosition change |
| Pre-ready Confirm disabled | Manual UAT | `disabled={!ready}` on Confirm button |
| Flat-card visual diff vs Stitch | Manual UAT | Confirm panel, chip bar, locate-me FAB styling |
| Full post-context round trip | Manual UAT | sessionStorage write; browse prefs untouched |

---

## External Debt (Not Introduced by Phase 13)

| Surface | Failure | Impact on Phase 13 gate |
|---------|---------|---------------------------|
| `lib/admin/cleanup.ts:34` | Postgrest type cast error | `npm run build` fails at TypeScript check |
| `lib/admin/subito-regalo-catalog.test.ts` | 3 failing tests (Padova spike gate mismatch) | `npm run test:lib` exits 1 |

Phase 13 scoped tests (`resolve-city-label`, `post-draft/storage`, `key-parity`) all pass. Build and full lib suite failures are documented as external admin debt — not fixed in this phase per gate instructions.

---

## Nyquist Compliance

```yaml
nyquist_compliant: false
```

**Reason:** `npm run test:lib` exits 1 (admin catalog tests) and `npm run build` exits 1 (`lib/admin/cleanup.ts`). Phase 13 deliverables and scoped tests are green; gate documents external debt honestly rather than papering over failures.

---

## Gate Sign-Off (Task 2)

Command results captured 2026-08-10T21:16Z:

| Command | Exit code |
|---------|-----------|
| `npm run test:lib` | 1 (3 failures in `lib/admin/subito-regalo-catalog.test.ts`) |
| `npm run build` | 1 (`lib/admin/cleanup.ts:34` TypeScript error) |
| Phase-scoped vitest (15 tests) | 0 |
| Integration audit greps | 0 |

**Gate verdict:** Phase 13 deliverables verified; external admin debt documented. Ready for `/gsd-verify-work`.

---

*Validated: 2026-08-10 — Plan 04 phase gate*
