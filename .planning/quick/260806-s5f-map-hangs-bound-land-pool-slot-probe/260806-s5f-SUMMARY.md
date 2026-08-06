---
quick_id: 260806-s5f
status: complete
commit: 1adefb2
---

# Summary: Map never loads / homepage hangs — unbounded land-pool slot probe

## Root cause

`landCoordForListing` (`lib/map/venice-land-coords.ts`) linear-probes for a free slot
in a fixed-size coordinate pool with no bound:

```ts
let slot = stableSlot(listing.id, pool.length);
while (reservedSlots.has(slot)) {
  slot = (slot + 1) % pool.length;   // no free slot left -> spins forever
}
```

`resolveGroupPins` shares one `reservedSlots` Set across every listing in a coordinate
group. Once the group holds more listings than the pool has slots, every slot is
reserved and the loop never exits. It runs inside `ListingMap`'s **first render**, so
the last thing painted is the map's `next/dynamic` fallback (`地图加载中…`) and
hydration never completes.

Pools: `CENTRO_STORICO_LAND` 48, `MESTRE_MARGHERA_LAND` 10, `LIDO_MURANO_LAND` 8.

## Not the previous cause

Two earlier quick tasks (`260805-r3k`, `260805-ws8`) fixed a dev-server chunk
truncation with the same user-visible symptom. Ruled out:

- `app/layout.js` is 1,362,707 bytes — still 734 KB under the 2 MiB cliff ws8 cleared.
- Parallel fetch of all six chunks the page pulls: no truncation, 3/3 rounds. Responses
  are chunked (no `Content-Length`); every body matched its on-disk size.
- Console showed `[HMR] connected` and **no** `SyntaxError`. Hydration started fine.

## Evidence

The renderer never yields, so the page target's own `Profiler` domain is unreachable
(`Profiler.stop` and even `page.evaluate` hang). Sampling had to come from
**browser-level `Tracing`** with `disabled-by-default-v8.cpu_profiler`, reassembled
from `ProfileChunk` events. 66,043 samples:

```
 48.0%  landCoordForListing     @ lib/map/venice-land-coords.ts
 45.4%  resolveListingMapCoord  @ lib/map/venice-land-coords.ts
  2.9%  (idle)
```

Stack, leaf → root:

```
landCoordForListing <- resolveListingMapCoord <- resolveGroupPins
  <- buildMapDisplayPins <- ListingMap.useMemo[displayPins] <- ListingMap
```

Live data from the homepage RSC payload — two groups independently exceed the pool:

| listings | coord | zone | pool | outcome |
|---|---|---|---|---|
| 102 | 45.406, 11.877 (Padova) | `null` | CENTRO_STORICO (48) | **hangs** |
| 94 | 45.434, 12.338 (Venice) | `centro_storico` | CENTRO_STORICO (48) | **hangs** |
| 1 | 45.486, 12.245 | `mestre_marghera` | MESTRE_MARGHERA (10) | fine |

Phase 08's Padova/Veneto expansion pushed both past 48.

## Fix

When the pool is exhausted, clear the reserved set and start a fresh round. Termination
is then provable — `reservedSlots.size < pool.length` on entry, so a free slot exists.
Overflow listings stack evenly across the pool instead of piling onto one coordinate,
and comparing against the *current* pool's length keeps it correct for groups that mix
zones with different pool sizes.

## Verification

- `npx vitest run lib/map/` — 13 tests pass in 21 ms. The three new overflow tests
  hung the vitest worker indefinitely before the fix (killed at 120 s; `--testTimeout`
  cannot interrupt a synchronous loop).
- Re-profiled: `landCoordForListing` gone from the profile entirely, main thread 44.7%
  idle, top consumer is MapLibre's tile-parsing worker (expected).
- Clean-profile Chrome on **http://localhost:3003** — map canvas mounts in 8.9 s,
  loading fallback gone, 3 markers, "197 listings in this area", zero console errors.

## Follow-ups (not fixed)

1. **Padova listings render in Venice.** `landPoolForZone(null)` falls back to
   `CENTRO_STORICO_LAND`, so the 102 zone-`null` Padova listings are relocated onto
   Venice sestieri coordinates — visible in the verification screenshot as a `102`
   cluster badge sitting on Venice. Needs a per-city land pool; that is a phase-08
   design decision, not a guess to make here.

2. **A leftover service worker breaks `http://localhost:3003` only.** `/sw.js` still
   serves a real 48 KB production Serwist worker built with `clientsClaim`,
   `skipWaiting`, `navigateFallback` and CacheFirst on `/_next/static/*`. A registration
   left over from an earlier `next start` keeps serving stale production chunks under
   dev's URLs. Registrations are per-origin, which is why the ngrok tunnel (different
   origin) was unaffected while localhost stayed broken. The uncommitted
   `DEV_UNREGISTER_SW_SCRIPT` blocks *new* registrations but cannot help once the SW is
   already serving the document from cache. A durable fix is to make `/sw.js` 404 in
   development so browsers drop the registration on their own.
