---
quick_id: 260805-ws8
status: complete
---

# Summary: Dev-server chunk truncation (map stuck loading / homepage hangs)

## Root cause

Next's dev server rewrites `app/layout.js` while it is still streaming that file to
the browser. The response headers carry the pre-rewrite `Content-Length`, but the
body ends early on a 64 KB boundary. The browser gets unparseable JavaScript.

Failure chain:

```
oversized app/layout.js
  -> truncated response (Content-Length lies)
  -> "Uncaught SyntaxError: Invalid or unexpected token"
  -> React never hydrates
  -> Fast Refresh: "full reload because your application had an unrecoverable error"
  -> full reload triggers recompile -> rewrite during serve -> truncation again
  -> self-sustaining loop; homepage hangs, map stranded on its next/dynamic fallback
```

The dev server logged **280** `GET /` requests from this loop, and the browser
console showed **452** `[Fast Refresh] rebuilding` cycles with no source edits.

## Evidence

Truncation needs **concurrency + a cold read** — a serial `curl` always passes,
which is why it looked intermittent. Parallel fetch of the chunks a page load pulls:

```
app/layout.js   declared=2393630  actual=2162688  *** TRUNCATED ***   (33 x 64 KB)
```

1:1 correlation between "file rewritten during the request" and "response truncated":

```
run1 declared=2393626 actual=2359296 TRUNC | mtime REWRITTEN during request
run2 declared=2393626 actual=2393626 OK    | mtime unchanged
run3 declared=2393626 actual=2393626 OK    | mtime unchanged
```

Ruling out alternatives:

- Byte-identical before/after the rewrite (2393626 -> 2393626): webpack re-emits
  an unchanged chunk. The rebuild is pure waste.
- Serving the same file from a plain Node `createReadStream` server returned all
  2393626 bytes 3/3 times. The file, ext4, and disk I/O are all fine.
- Not memory pressure (36 GB free).
- Writes into `.playwright-mcp/` do not trigger rebuilds (measured: 0% CPU), so
  the observed loop was not a measurement artifact.

Observed truncation always landed on a 64 KB boundary, and the largest complete
`layout.js` cut was `2097152` = exactly 2 MiB.

## Fix

Split the two heaviest closed-by-default overlay components out of the root layout
chunk with `next/dynamic` — the pattern already documented in this codebase
(`FavoritesMergeProvider`, `IosGuideAutoOpen`). A bare `import()` does not split in
Next's dev webpack build; `next/dynamic` does.

- `components/shell/Header.tsx` — `NavMenuDrawer` and `HeaderLanguageDropdown`
- `components/providers/PwaOnboardingProvider.tsx` — `IosInstallGuide`

Both drag in the radix/vaul overlay stack (`react-remove-scroll`, radix primitives,
dialog/drawer) and both start closed.

Also added `onDemandEntries` to `next.config.ts` (`maxInactiveAge` 1 h,
`pagesBufferLength` 25) to stop the dev server disposing and re-emitting entries
after the default 60 s idle. This reduces rebuild churn but was **not** sufficient
on its own — chunk size was the deciding factor.

## Result

```
app/layout.js  2,393,630 -> 1,362,707 bytes  (-43%, 734 KB under the 2 MiB cliff)
```

Parallel cold-load repro: **no truncation in any round** (3 rounds x 5 chunks).
Browser console: 0 syntax errors, 0 full reloads, no rebuild loop (was 452).

- `npx tsc --noEmit`: no errors in changed files (24 pre-existing errors remain in
  `lib/admin/cleanup.ts`, `lib/i18n/listing-fields.test.ts`, `scraper-admin/*` —
  all untouched uncommitted work).
- `npx vitest run`: 43 files, 214 tests passed.

## Not verified

The map still shows `地图加载中…` in the automation browser used for testing, with
the renderer pinned at ~102% CPU. That browser has no GPU and falls back to
software WebGL (`swiftshader`), which MapLibre needs. This could not be
distinguished from a real defect without a GPU-backed browser. **Needs a check in
a real browser.** If it still hangs there, it is a separate bug from the
truncation fixed here.

## Also found, not fixed

- `/manifest.webmanifest` intermittently returned **500** with
  `SyntaxError: Unexpected end of JSON input` (`page: '/manifest.webmanifest'`).
  It returns 200 when the server is healthy, so it may be collateral from the
  rebuild loop.
- `.next` had grown to **977 MB** and was serving corrupt state (`Manifest file is
  empty`). It was deleted and rebuilt clean; worth doing whenever dev gets weird.
- `lib/pwa/dev-unregister-sw-script.ts` (uncommitted) and
  `SerwistProvider.useUnregisterServiceWorkerInDev` both call `location.reload()`
  when `sw.controller` is set — two independent reload paths worth consolidating.

## Repro script

`bash /tmp/partest3003.sh` — parallel cold fetch of every chunk the homepage pulls;
truncation shows as `actual < declared` on a 64 KB boundary.
