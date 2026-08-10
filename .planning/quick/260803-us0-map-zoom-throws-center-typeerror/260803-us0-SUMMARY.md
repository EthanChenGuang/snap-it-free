---
quick_id: 260803-us0
status: complete
---

# Summary: Map zoom threw "reading 'center'" TypeError

Zooming the map threw two runtime errors. Both are gone; the cause was a dependency
incompatibility, not application code.

## Root cause

`@vis.gl/react-maplibre` 8.1.1 (pulled in by `react-map-gl` 8.1.1) read `map.transform`,
which **MapLibre 6 removed from the public API**.

Verified on the live 6.0.0 instance:

| check | value |
|-------|-------|
| `typeof map.transform` | `undefined` |
| own property `transform` | `false` |
| prototype descriptor | `false` |
| `map.getCenter()` | `[12.33, 45.44]` — works |

The wrapper read it in three places (`maplibre.js` lines 107, 311, 326), so every camera
event and resize threw. Reproduced stack:

```
TypeError: Cannot read properties of undefined (reading 'center')
    at transformToViewState (@vis.gl/react-maplibre/dist/utils/transform.js:9)
    at Maplibre._onCameraEvent (@vis.gl/react-maplibre/dist/maplibre/maplibre.js:107)
    at fire -> _fireEvent -> _fireEvents -> _updateMapTransform -> _applyChanges
    at TaskQueue.run -> Map._render
```

`@vis.gl/react-maplibre` declares `maplibre-gl: >=4.0.0` — an open-ended range written
before v6 existed — so npm installed 6.0.0 with no peer warning.

### The second error was fallout, not a separate bug

`TaskQueue.run()` has no `try/finally`:

```ts
const queue = this._currentlyRunning = this._queue;
for (const task of queue) { task.callback(timeStamp); }   // throws here
this._currentlyRunning = false;                            // never reached
```

Once a task callback throws, `_currentlyRunning` stays truthy, so **every subsequent frame**
throws `Attempting to run(), but is already running.` That is why one bad camera event
produced an endless second error. Fixing the TypeError fixed it.

## Fix

Upgraded `react-map-gl` 8.1.1 → 8.1.2, which pins `@vis.gl/react-maplibre` 8.1.2. Upstream
replaced the `map.transform` read with `getTransformLike(map)`, built from public getters:

```js
export function getTransformLike(map) {
    return {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        elevation: map.getCenterElevation?.() ?? 0,
        padding: map.getPadding()
    };
```

The installed 8.1.2 contains no `map.transform` read — only `transformCameraUpdate`, a real
public API. Declared range raised to `^8.1.2`: with MapLibre 6 this is a correctness floor,
not a routine bump. No application code changed.

## Verification

- Wheel zoom on `localhost:3003`: 8 zoom-ins + 4 zoom-outs → **0 errors** (was 2 on the
  first wheel tick); screenshot confirms street-level detail, so zoom really applied
- Pinch-zoom via synthetic touch events over the ngrok tunnel under mobile emulation
  (390×844): 3 pinch gestures → **0 errors**; screenshot confirms deep zoom
- Tiles still render; `npm run lint` (`tsc --noEmit`) passes
- `postinstall` re-copied `public/maplibre/` worker files after the install, confirming the
  hook from quick task 260803-ci2 survives dependency changes

## Changes made

- `package.json` / `package-lock.json` — `react-map-gl` `^8.1.1` → `^8.1.2`

## Still open (unrelated)

The Next.js dev overlay still reports 1 issue: a hydration attribute mismatch in the root
layout, present before this task and unrelated to the map.
