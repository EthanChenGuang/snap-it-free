# UAT — Phase 5: Chinese contact assistant

## Checked (ran, passed)
- `npx vitest run`: 148 files / 939 tests passed (was 142 / 887). `npx tsc --noEmit`: exit 0.
- Unit: templates + gating table, translate parser (valid / missing field / non-JSON / too long), key sent in
  `x-goog-api-key` header and not the URL, route (401, 400 x5, 503, 200 compose + reply, 502 x2), detail CTA label.
- Component: default template, switching changes the preview, primary button copies the selected Italian text and
  opens `listing.external_url`, copy failure still opens the page and shows the hint, translate tab request bodies
  and results, 502 and 401 error states, thumbnail uses the watermark-free preset. Shell: zh/en open the sheet,
  `it` opens the seller's page directly.
- Visual: Next dev server + a temporary page (deleted) mounting the real sheet in Chromium. Screenshots in `screens/`:
  `sheet-zh-390-{send,translate}.png`, `sheet-zh-360-*`, `sheet-en-390-*`. No horizontal overflow at 360 or 390
  (documentElement.scrollWidth equals viewport width); primary button and steps are pinned. The translate result is
  a mocked response (route intercepted in Playwright).

## NOT verified
- eslint: the repo has no eslint config (`eslint` exits "couldn't find eslint.config"), so nothing was linted.
- Signed-in detail page end to end: `verify-snap-it-free` only drives a signed-out session and no accounts were
  created, so the button -> sheet wiring is covered by the mocked shell test only.
- Real Gemini output quality and latency (the API was never called); real clipboard on iOS Safari / WeChat browser;
  the seller's page opening in a new tab on a phone.
- Thumbnail in the screenshots is a broken-image placeholder (sandbox has no network; the URL is a dummy).
- On an 844px-tall screen the Italian preview card sits partly under the pinned footer and the list scrolls a little.
- The vaul overlay is transparent (existing `DrawerOverlay`), so the design's dimmed backdrop is not reproduced.

## Review round 2 (copy flow, limits, gating)
- Re-ran: vitest 148 files / 939 tests passed, tsc exit 0. Screenshots were not retaken: layout is unchanged
  (only hint/error wording and logic changed).
- Tests now assert: sync copy happens in the tap inside the `[role="dialog"]` and `openExternalListingUrl` is called
  with no flush while the async clipboard never resolves; async fallback toasts only after it resolves; all-paths-fail
  keeps the sheet open with the hint; tab resets to send on close; 403 message; route 403 / flag-off / subscriber / 502 log.

## To test on a real phone (not verifiable here)
- iPhone Safari: tap the primary button, paste into the seller's message box (copy must work with the page opening).
- Android Chrome: same; also check the new tab opens and the toast shows.
- WeChat in-app browser: same, and whether `window.open` with `_blank` opens at all.
- Translate tab copy buttons in all three.

## Daily cap
- Mocked-client tests: 429 with no Gemini call, fail-open with log on RPC error, pass on true, RPC untouched on 401/400/503/403,
  sheet shows the daily-limit message on 429.
- NOT verified: the migration and the real RPC (not applied, no DB access); the 200/day boundary against a real database.
