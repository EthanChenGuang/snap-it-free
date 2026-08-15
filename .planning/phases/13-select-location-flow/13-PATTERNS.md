# Phase 13: Select Location Flow - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 8
**Analogs found:** 8 / 8 (all modify-in-place existing files; no net-new component files, one net-new lib util recommended)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `components/map/SelectLocationClient.tsx` | component (client, controller-like) | request-response + local-storage CRUD | itself (existing file, extend with `context` branching) | exact — self-modify |
| `components/map/SelectLocationMapPane.tsx` | component (map/interactive-control) | event-driven (map click/move) | itself (existing file, add `showRadiusControls` prop) | exact — self-modify |
| `components/ugc/PostForm.tsx` | component (form) | request-response + sessionStorage CRUD | itself (existing file, replace GPS toggle section) | exact — self-modify |
| `lib/geo/resolve-city-label.ts` (new, promoted util) | utility | transform | `resolveCityLabel` fn currently inlined in `SelectLocationClient.tsx` lines 23-34 | exact — extraction of existing logic |
| `lib/post-draft/storage.ts` (new, if not present) | utility/service | file-I/O (sessionStorage) | `lib/browse-center/storage.ts` (localStorage CRUD wrapper) | role-match — same read/write/subscribe shape, different storage backend |
| `lib/geo/zone-from-coords.ts` (new, optional per Claude's Discretion) | utility | transform | `lib/geo/nearest-zone.ts` (`nearestVeniceZone`) | exact — same nearest-centroid pattern |
| `messages/en.ts`, `messages/it.ts`, `messages/zh.ts` | config (i18n) | CRUD (static data) | existing `selectLocation` / `post` blocks in same files | exact — add sibling keys |
| `components/shell/FeedHeaderRow.tsx` | component | request-response (nav link) | itself — unchanged, reference only (D-04 confirms no change needed) | n/a — no modification required |

## Pattern Assignments

### `components/map/SelectLocationClient.tsx` (component, request-response)

**Analog:** itself — `components/map/SelectLocationClient.tsx` (existing implementation to extend)

**Imports pattern** (lines 1-17):
```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MapRef } from 'react-map-gl/maplibre';
import {
  fitMapToRadius,
  SelectLocationMapPane,
  type SelectLocationMapViewState,
} from '@/components/map/SelectLocationMapPane';
import { applyMapFilterPrefs } from '@/lib/filter-prefs/mode-transitions';
import {
  readFilterPrefs,
  SELECT_LOCATION_RADIUS_OPTIONS,
} from '@/lib/filter-prefs/storage';
import { readBrowseCenter } from '@/lib/browse-center/storage';
import { useMessages } from '@/lib/i18n/useMessages';
```
For post-context wiring, add `useSearchParams` from `next/navigation` (D-01 uses `?context=post`) and a new import for the post-draft storage util (see `lib/post-draft/storage.ts` below).

**Context/mode branching pattern to add** — no existing branching precedent in this file; follow the `FilterMode`-style union pattern used in `lib/filter-prefs/storage.ts` (`export type FilterMode = 'city' | 'map';`) — introduce `type SelectLocationContext = 'browse' | 'post'` and derive it once via `useSearchParams().get('context') === 'post' ? 'post' : 'browse'` (D-01: missing/invalid defaults to browse).

**City-label resolution (extract to shared util)** (lines 23-34, current inline function — promote per Claude's Discretion):
```typescript
function resolveCityLabel(
  lat: number,
  lng: number,
  cityLabels: { venice: string; padova: string },
): string {
  const padovaCenter = { lat: 45.41, lng: 11.88 };
  const padovaDist =
    (lat - padovaCenter.lat) ** 2 + (lng - padovaCenter.lng) ** 2;
  const veniceDist =
    (lat - VENICE_CENTER.lat) ** 2 + (lng - VENICE_CENTER.lng) ** 2;
  return padovaDist < veniceDist ? cityLabels.padova : cityLabels.venice;
}
```
Move to `lib/geo/resolve-city-label.ts`, export `VENICE_CENTER` alongside (currently module-local const at line 19), import back into `SelectLocationClient.tsx`. Use in both the confirm handler (existing) and the new live-preview row (D-14/D-15).

**Confirm handler branching pattern** (lines 157-171, existing browse-only handler to fork):
```typescript
const handleConfirm = () => {
  const label = resolveCityLabel(markerPosition.lat, markerPosition.lng, {
    venice: messages.feed.cityVenice,
    padova: messages.feed.cityPadova,
  });
  applyMapFilterPrefs(
    { lat: markerPosition.lat, lng: markerPosition.lng, label },
    radiusKm,
  );
  router.back();
};
```
For post context (D-36), branch to write `{ lat, lng, label, locationConfirmed: true }` via the new post-draft storage util and `router.push('/post')` instead of `applyMapFilterPrefs` + `router.back()`.

**Bootstrap/init effect pattern** (lines 91-129) — the saved-position → GPS → default fallback chain is the exact template for D-03 (post initial position: saved draft → GPS → Venice default). Currently reads `readBrowseCenter()`; for post context, read from the post-draft store instead, same fallback shape (`if (saved) {...} else if (no geolocation) {...} else { getCurrentPosition(...) }`).

**Header title / CTA copy branching** (lines 174-189, 237-243) — swap `messages.selectLocation.title` → `messages.selectLocation.postTitle` and `messages.selectLocation.confirm` → `messages.selectLocation.confirmPickup` based on `context`, per D-08/D-37.

**Bottom panel Stitch-fix** (lines 224-245) — current `rounded-xl ... shadow-[0_4px_24px_rgba(0,0,0,0.08)]` (line 225) must become `rounded-lg border border-outline-variant` with no shadow class, per D-40 / UI-SPEC Color correction #2.

**Live preview `aria-live` pattern to add** (currently static placeholder text at line 234, `messages.selectLocation.selectedLocationLabel`) — replace with live city string computed via `resolveCityLabel(markerPosition.lat, markerPosition.lng, {...})`, wrap the `<span>` at line 233 with `aria-live="polite"` per D-20; render nothing until `ready` (D-21, `ready` state already exists at line 57/192).

---

### `components/map/SelectLocationMapPane.tsx` (component, event-driven)

**Analog:** itself — `components/map/SelectLocationMapPane.tsx` (existing, add `showRadiusControls` prop)

**Props pattern** (lines 49-63) — add `showRadiusControls: boolean` to `SelectLocationMapPaneProps`, default `true`, gate the radius Source/Layer JSX blocks (lines 274-314) and the radius chip bar JSX (lines 325-355) behind it for D-26/D-32. Do not gate the pin overlay or locate-me FAB — both stay in both contexts (D-25).

**Radius chip bar — Stitch translucency fix** (lines 325-355):
```typescript
<div
  className="pointer-events-auto flex gap-1 rounded-full border border-outline-variant bg-surface-container-lowest/95 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm"
  ...
>
  ...
  className={cn(
    'min-h-9 touch-manipulation rounded-full px-space-md py-space-xs text-label-sm font-medium transition-colors',
    ...
```
Fix per D-43 / UI-SPEC Color correction #1: drop `/95` opacity and `backdrop-blur-sm` → solid `bg-surface-container-lowest`, no shadow class listed in D-43 (verify against DESIGN.md flat-chip rule). Fix per Typography correction: `font-medium` (500) → `font-normal` (400) on the label span at line 343.

**Locate-me FAB — shadow fix** (lines 357-366):
```typescript
<button
  type="button"
  onClick={onLocateMe}
  aria-label={locateMeAriaLabel}
  className="absolute bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity active:opacity-90"
>
```
Per D-44: reduce/remove `shadow-[0_2px_8px_rgba(0,0,0,0.12)]` — prefer border-only, no shadow.

**Pin overlay pattern (unchanged, reuse verbatim)** (lines 65-114) — `SelectLocationPinOverlay` projects lat/lng to pixel coords via `map.project()`, re-subscribes on `move`/`zoom`/`resize`. This is the template for any future overlay-positioned UI; no changes needed for Phase 13 besides passing `showRadiusControls` through unaffected props.

**`fitMapToRadius` export (unchanged, reuse verbatim)** (lines 372-385) — keep calling this from `SelectLocationClient` on locate-me and radius-preset change (D-29); when `showRadiusControls` is false (post context), this can still be called for general fit/GPS-fly behavior since it only depends on `radiusKm`/center, not on chip visibility.

---

### `components/ugc/PostForm.tsx` (component, request-response + sessionStorage)

**Analog:** itself — `components/ugc/PostForm.tsx` (existing, replace GPS-toggle block)

**Section to remove** (lines 331-353, current GPS toggle row + checkbox):
```typescript
<div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
  <div className="flex items-center gap-space-md">
    <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
    <div>
      <p className="text-label-md text-primary">{messages.post.pinCurrentLocation}</p>
      <p className="text-label-sm text-secondary">
        {pinLocation ? locationLine : messages.post.pinLocationDefault}
      </p>
      {geoError && pinLocation && (
        <p className="mt-space-xs text-label-sm text-error">{geoError}</p>
      )}
    </div>
  </div>
  <label className="relative inline-flex cursor-pointer items-center">
    <input type="checkbox" className="peer sr-only" checked={pinLocation} onChange={...} />
    <div className="relative h-6 w-11 rounded-full bg-outline-variant after:..." />
  </label>
</div>
```
Also remove the supporting state/effects: `pinLocation` state (line 57), `requestGeolocation` callback (lines 75-101), the `pinLocation`-driven effect (lines 103-111), and `locationLine`/`nearestVeniceZone`/`zoneLabel` usage (lines 113-116, D-11 hides zone labels). Keep `geoError`/`setGeoError` state only if the new location row still surfaces geolocation errors (UI-SPEC "unresolved" — planner discretion); otherwise remove.

**Replacement pattern — same visual shell, different content/action** (row structure to reuse, icon+label+row wrapper from lines 331-334, minus toggle):
```typescript
<div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
  <div className="flex items-center gap-space-md">
    <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
    <p className="text-label-md font-normal text-on-surface">
      {locationConfirmed ? cityLabel : messages.post.locationRowPending}
    </p>
  </div>
  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
</div>
```
Wrap the whole row in a `<button type="button" onClick={() => router.push('/select-location?context=post')}>` (D-02) instead of a static div — follow the button styling conventions used elsewhere in this file (e.g., condition-pill buttons at lines 313-326: `rounded-full border px-space-md py-space-xs text-label-md transition-colors`, adapted here to a full-width row button).

**Mount-time draft hydration pattern to add** — no existing precedent in this file; follow `lib/browse-center/storage.ts` `readBrowseCenter()` read-on-mount shape (see below) inside a `useEffect(() => { const draft = readPostDraft(); if (draft) { setLat(draft.lat); setLng(draft.lng); ...} }, [])`.

**Submit validation pattern** (lines 134-146, existing `if (!photoFile || !title.trim())` early-return-with-setError block) — add a parallel check for D-39:
```typescript
if (!photoFile || !title.trim()) {
  setError(messages.post.missingFields);
  return;
}
// new, per D-39:
if (!locationConfirmed) {
  setError(messages.post.locationRequiredError);
  return;
}
```
This directly follows the existing validation-before-submit pattern already in the file (lines 138-146) — same `setError` + early `return`, no new error-handling shape needed.

**Error rendering pattern (reuse verbatim)** (line 356):
```typescript
{error && <p className="text-label-sm text-error">{error}</p>}
```
Already generic — no change needed, `locationRequiredError` message flows through the same `error` state.

---

### `lib/post-draft/storage.ts` (new utility, sessionStorage CRUD)

**Analog:** `lib/browse-center/storage.ts` (localStorage CRUD wrapper — closest existing shape; swap `localStorage` for `sessionStorage`, drop the cross-tab `storage` event listener since sessionStorage is single-tab)

**Full pattern to mirror** (lines 1-72 of `lib/browse-center/storage.ts`):
```typescript
export type BrowseCenter = {
  lat: number;
  lng: number;
  label?: string;
};

export const BROWSE_CENTER_STORAGE_KEY = 'shoumanwu_browse_center';
export const BROWSE_CENTER_CHANGE_EVENT = 'shoumanwu-browse-center-change';

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parseBrowseCenter(raw: string | null): BrowseCenter | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BrowseCenter>;
    if (!isValidCoordinate(parsed.lat, -90, 90) || !isValidCoordinate(parsed.lng, -180, 180)) {
      return null;
    }
    const label = typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : undefined;
    return { lat: parsed.lat, lng: parsed.lng, ...(label ? { label } : {}) };
  } catch {
    return null;
  }
}

export function readBrowseCenter(): BrowseCenter | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(BROWSE_CENTER_STORAGE_KEY);
  ...
}

export function writeBrowseCenter(center: BrowseCenter): BrowseCenter {
  if (typeof window === 'undefined') return center;
  const raw = JSON.stringify(center);
  localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, raw);
  ...
}
```
Adapt for `shoumanwu_post_draft` key (D-36) with shape `{ lat, lng, label, locationConfirmed: boolean }` — add `isValidCoordinate` reuse plus a boolean-guard for `locationConfirmed` (default to `false`/treat-as-unconfirmed on malformed draft, per UI-SPEC "partial" row resolution). No `subscribeX`/cross-tab event needed unless PostForm needs to react to draft changes while mounted (unlikely — draft written only by `/select-location`, read only on `PostForm` mount).

**Simpler alternative analog for sessionStorage specifically** — `lib/pwa/ios-detect.ts` lines 34-39 and `components/messages/SafetyBanner.tsx` lines 18-27 show the project's existing lightweight `sessionStorage.getItem`/`setItem` usage (no JSON, flag-only) — useful if the draft util is kept minimal rather than following the full `BrowseCenter`-style typed wrapper.

---

### `lib/geo/resolve-city-label.ts` (new utility, transform) — promoted from inline

**Analog:** `lib/geo/nearest-zone.ts` (`nearestVeniceZone`) — same nearest-centroid-by-squared-distance pattern, already extracted to a shared lib file:
```typescript
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import type { VeniceZone } from '@/lib/listings/types';

export function nearestVeniceZone(lat: number, lng: number): VeniceZone {
  let best: VeniceZone = 'centro_storico';
  let bestDist = Infinity;

  for (const zone of Object.keys(ZONE_CENTERS) as VeniceZone[]) {
    const center = ZONE_CENTERS[zone];
    const dist = (lat - center.lat) ** 2 + (lng - center.lng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = zone;
    }
  }
  return best;
}
```
Follow this exact file/function shape for the promoted `resolveCityLabel` (currently inline in `SelectLocationClient.tsx` lines 23-34) — pure function, no side effects, imported constants for centers.

---

### `lib/geo/zone-from-coords.ts` (optional new utility — D-11 zone derivation)

**Analog:** `lib/geo/nearest-zone.ts` (`nearestVeniceZone`, full file shown above) — D-11 requires deriving a zone enum from lat/lng at API submit time; this is functionally identical to the existing `nearestVeniceZone` helper already used client-side. Per Claude's Discretion (CONTEXT.md), either reuse `nearestVeniceZone` directly server-side (if importable in the API route) or duplicate the pattern into a server-safe module if `nearestVeniceZone` has client-only dependencies (it does not — `lib/geo/zone-centers.ts` is a plain data file, safe to import anywhere).

---

### `messages/{en,zh,it}.ts` (i18n config)

**Analog:** existing `selectLocation` and `post` blocks in the same files.

**en.ts excerpt** (lines 79-142, current keys to extend):
```typescript
selectLocation: {
  title: 'Select Location',
  confirm: 'Confirm location',
  back: 'Back',
  selectedLocationLabel: 'Selected location',
  locateMe: 'Go to my location',
  radiusLabel: 'Search radius',
  radiusOption: (km: number) => `${km} km`,
},
post: {
  ...
  pinCurrentLocation: 'Use current location',   // retire, D-02
  pinLocationDefault: 'Venice, Historic Center', // retire, D-02
  zoneLabel: 'Zone',                             // retire, D-11
  ...
  missingFields: 'Add a photo and title to continue.',
  ...
  pinOutsideVenice: 'Move the pin inside Venice',
  mapLoading: 'Loading map…',
  ...
  geolocationDenied: '...',
  geolocationTimeout: '...',
  geolocationUnavailable: '...',
},
```
Add sibling keys per UI-SPEC Copywriting Contract:
- `selectLocation.postTitle` = "Set pickup location"
- `selectLocation.confirmPickup` = "Confirm pickup location"
- `post.locationRowPending` = "Tap to set pickup location"
- `post.locationRequiredError` = "Set a pickup location to continue."

Mirror the exact same additions in `messages/zh.ts` and `messages/it.ts` at the equivalent `selectLocation`/`post` block locations, matching existing tone/cadence per each file's current entries for `selectLocation.title`/`post.pinCurrentLocation` etc. Retire (or leave orphaned) `pinCurrentLocation`, `pinLocationDefault`, `zoneLabel`, `pinLabel` per UI-SPEC — do not delete without confirming no other consumer references them (`grep -rn "post\.zoneLabel\|post\.pinCurrentLocation\|post\.pinLocationDefault\|post\.pinLabel"` before removal).

---

## Shared Patterns

### Context-branching via query param
**Source:** New pattern (no existing analog in codebase); closest structural precedent is `FilterMode` union type in `lib/filter-prefs/storage.ts` (`export type FilterMode = 'city' | 'map';`).
**Apply to:** `SelectLocationClient.tsx` (`context: 'browse' | 'post'` derived from `useSearchParams`)
```typescript
export type FilterMode = 'city' | 'map';
```

### localStorage/sessionStorage read-write-validate wrapper
**Source:** `lib/browse-center/storage.ts` (full file, lines 1-72)
**Apply to:** New `lib/post-draft/storage.ts` — same `isValidCoordinate` guard, `parseX`/`readX`/`writeX` triad, `typeof window === 'undefined'` SSR guard on every export.

### Nearest-centroid derivation
**Source:** `lib/geo/nearest-zone.ts` (`nearestVeniceZone`, full file above) and inline `resolveCityLabel` in `SelectLocationClient.tsx` (lines 23-34)
**Apply to:** Promoted `lib/geo/resolve-city-label.ts` and optional `lib/geo/zone-from-coords.ts`

### Confirm-panel Stitch flat-card styling
**Source:** `components/map/SelectLocationClient.tsx` lines 224-245 (current, needs D-40 fix applied in place)
**Apply to:** Same file's bottom panel — target end-state: `rounded-lg border border-outline-variant bg-surface-container-lowest p-space-md` (no shadow class)

### Material Symbols icon + label row (used for both PostForm location row and select-location preview row)
**Source:** `components/map/SelectLocationClient.tsx` lines 226-236 (preview row) and `components/ugc/PostForm.tsx` lines 331-343 (GPS toggle row, being replaced)
**Apply to:** New PostForm location row (button variant) and updated live-preview row
```typescript
<span className="material-symbols-outlined shrink-0 text-[20px] text-on-surface-variant" aria-hidden>
  location_on
</span>
<span className="text-body-md text-on-surface-variant">{...}</span>
```

### Inline validation error rendering
**Source:** `components/ugc/PostForm.tsx` line 356
**Apply to:** `post.locationRequiredError` display (D-39) — reuse verbatim: `{error && <p className="text-label-sm text-error">{error}</p>}`

## No Analog Found

None — all files in scope either self-modify an existing implementation or have a strong role-match analog elsewhere in `lib/`. The only genuinely new file (`lib/post-draft/storage.ts`) has two viable analogs of differing complexity (full typed wrapper vs. minimal flag-style sessionStorage usage) — planner/executor should pick based on whether cross-component reactivity to draft changes is needed (unlikely, per D-36 read-once-on-mount usage).

## Metadata

**Analog search scope:** `components/map/`, `components/ugc/`, `components/shell/`, `lib/browse-center/`, `lib/filter-prefs/`, `lib/geo/`, `lib/pwa/`, `components/messages/`, `messages/`
**Files scanned:** 11 (`SelectLocationClient.tsx`, `SelectLocationMapPane.tsx`, `PostForm.tsx`, `FeedHeaderRow.tsx`, `browse-center/storage.ts`, `filter-prefs/mode-transitions.ts`, `filter-prefs/storage.ts`, `geo/nearest-zone.ts`, `geo/zone-centers.ts`, `pwa/ios-detect.ts`, `messages/SafetyBanner.tsx`) plus `messages/en.ts` key inventory
**Pattern extraction date:** 2026-08-10
</content>
