---
quick_id: 260803-ci2
status: complete
---

# Summary: Map never loads on mobile

## Current stack

| Layer | Choice | Where |
|-------|--------|-------|
| Renderer | **MapLibre GL JS 6.0** | `maplibre-gl` |
| React wrapper | **react-map-gl 8.1** (`/maplibre` entry) | `ListingMap.tsx`, `PinMap.tsx` |
| Tiles | **OpenFreeMap** `liberty` style (free, no API key) | `https://tiles.openfreemap.org/styles/liberty` |
| Load strategy | `next/dynamic` + `ssr: false` (WebGL client-only) | `MapExplorer.tsx` |

Legacy Vite prototype (`src/components/MapView.tsx`) uses a **static image + fake pins** — not used in production.

## Root cause (corrected)

> The bundle-size theory below was **wrong**. The map was broken on every device and every
> origin, localhost included — not slow, permanently blank. Superseded by the finding here.

MapLibre resolves its tile-parsing worker from `import.meta.url` and accepts only an
`http(s)` value:

```js
function fi(){
  let e = import.meta.url;
  if (!/^https?:/.test(e)) return ``;   // bails out
  return new URL(`./maplibre-gl-worker.mjs`, e).href;
}
async function gi(){ let e = config.WORKER_URL || fi(); ... return new Worker(e, { type: 'module' }) }
```

Webpack inlines `import.meta.url` as a **build-machine `file://` path**. Confirmed in the
served chunk:

```js
let e = "file:///home/guang/Projects/.../node_modules/maplibre-gl/dist/maplibre-gl.mjs";
```

So `fi()` returns `''` and MapLibre runs `new Worker('')`, which loads the page's own HTML
as a worker script. Nothing throws: `loadTile` awaits `dispatcher.waitForInitComplete()`,
which never settles, so **no tile is ever requested** while the style, sprites and glyphs
load normally. Symptom is a permanently blank canvas with a clean console.

Applies to `next build` too — webpack inlines the same way, so the map never worked in
production either.

### Fix

- `scripts/copy-maplibre-worker.mjs` — copies `maplibre-gl-worker.mjs` + its only dependency
  `maplibre-gl-shared.mjs` into `public/maplibre/`; wired to `postinstall` and `prebuild`
  so it tracks the installed version.
- `lib/map/maplibreWorker.ts` — `setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')`, imported
  by `ListingMap`, `PinMap`, `StreetDumpPinMap`.
- `next.config.ts` — dropped `transpilePackages: ['maplibre-gl']`. It rewrote the package
  needlessly and inflated the dev chunk (1826 KB → 758 KB gzipped).

Verified: Venice tiles, roads and labels paint on localhost and over ngrok, including under
4× CPU throttling with mobile emulation (canvas ~4-5 s, first glyph ~6.8 s).

Note: worker-issued tile fetches do **not** appear in `performance.getEntriesByType('resource')`,
so a zero tile count in the page timeline is expected even when the map works.

## Original (incorrect) analysis

1. ~~**Heavy dev bundle over ngrok (primary)**~~ — the 7.8 MB dev chunk gzips to ~1.8 MB and
   transferred in ~1.2 s; parse completed in ~4 s at 4× CPU throttle. Never the blocker.
2. **No loading UI (fixed)** — `dynamic()` had no `loading` fallback. Added placeholder.
3. **Client-only mount** — real but minor.
4. ~~**WebGL requirement**~~ — WebGL2 confirmed available.

OpenFreeMap tiles themselves respond **HTTP 200** — tile CDN is not the blocker.

## Map library comparison (mobile PWA, Venice listing pins)

| Criterion | **MapLibre + react-map-gl** (current) | Leaflet + react-leaflet | Mapbox GL JS | OpenLayers |
|-----------|--------------------------------------|-------------------------|--------------|------------|
| License / cost | MIT, **$0** usage | BSD, **$0** | Proprietary, billed per load | BSD, **$0** |
| Bundle (gzip) | ~200–290 KB prod | **~42 KB** | ~300 KB + token | ~350 KB |
| Dev chunk (this repo) | **7.8 MB** / **553 KB prod** | smaller | similar to MapLibre | largest |
| Rendering | WebGL vector | Canvas/SVG raster | WebGL vector | Canvas mixed |
| Touch / mobile | Excellent on modern phones | Excellent, lighter | Excellent | Good, heavier |
| Pin + popup UX | Native Marker/Popup | Mature plugins | Same as MapLibre API | Verbose |
| Free tiles | OpenFreeMap, self-host | OSM raster, many CDNs | Mapbox tiles (limited free) | Many sources |
| Fits D-31 budget decision | **Yes — chosen in Phase 2** | Yes but raster-only | No — per-load billing | Overkill for pins |
| Best when | Vector style, smooth zoom, future density | Minimal map, max compatibility | Paid Mapbox ecosystem | GIS / projections |

## Recommendation

**Keep MapLibre GL JS + react-map-gl + OpenFreeMap.** This matches `.planning/research/STACK.md` and decision **D-31** — zero per-load billing, vector tiles, and headroom for dense pins. Leaflet is lighter but loses vector styling and was explicitly deferred unless bundle size becomes critical.

**For mobile testing now:** `npm run dev:tunnel` is fine — the map works in dev. A production
build is still faster to load, but it is no longer required to see a map at all.

## Changes made

- `components/map/MapExplorer.tsx` — added `loading` UI to `dynamic(ListingMap)`
- `scripts/copy-maplibre-worker.mjs` — serve MapLibre's worker from `public/maplibre/`
- `lib/map/maplibreWorker.ts` — `setWorkerUrl()` so MapLibre stops calling `new Worker('')`
- `components/map/ListingMap.tsx`, `components/ugc/PinMap.tsx`,
  `components/ugc/StreetDumpPinMap.tsx` — import the worker config
- `next.config.ts` — removed `transpilePackages: ['maplibre-gl']`
- `package.json` — `postinstall` / `prebuild` run the copy script
