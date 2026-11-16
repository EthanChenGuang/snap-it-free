# VERIFICATION — Phase 5: Chinese contact assistant

Journey: `node .claude/skills/verify-snap-it-free/scripts/drive.mjs contact` (recipe: `.claude/skills/verify-snap-it-free/features/contact-assistant.md`).
Final run on the build of commit `15b938d`: **`RESULT contact: 263/263 checks passed`**. Screenshots: `verification/` (c01-c10 send/translate states, d-* layout/dark/zoom/keyboard, f-* onboarding).
Build: `NEXT_PUBLIC_ONBOARDING_ENABLED=true launch.sh --build --flag off`, Node 22, Chromium from `/opt/pw-browsers`.

## What this proves, and what it does not

- Every signed-in check is **"mocked auth"**: a forged, unsigned Supabase session cookie in the browser, a cookie-stripping proxy in front of `next start` (the server never sees it), `/auth/v1/**` and any forged-bearer request answered locally. Safety checks in the journey: every Cookie header stripped before the Next server; 0 requests carried the forged bearer to the real Supabase host. No account, no DB write, no production call. This proves the UI, not the server auth/subscription gate.
- `/api/contact/translate` was scripted per scenario. **Real Gemini was never called**, so translation quality, latency and the new `responseSchema` against the real model are not verified. The route's own behaviour is covered by vitest with mocked `fetch`.
- The seller's site is stubbed; the popup URL is asserted, the real marketplace was never contacted. Whether the real page has a "Contatta" button, and what its sign-up looks like, is **not verified** (needs a real phone/browser).
- **Chromium only.** Safari/WebKit, iOS clipboard behaviour, Android Chrome, the WeChat in-app browser and real phones are not covered. The keyboard test shrinks the viewport (stricter than iOS, which only shrinks the visual viewport).
- States the live data lacks (expired listing, other source, bad URL, no photo, long title) were made by rewriting the server-rendered listing JSON in the proxy ("mocked SSR payload").

## Matrix

| Row | Checks run | Result |
| --- | --- | --- |
| A Entry points | zh/en label and sheet opens; `it` opens the seller URL in a new tab, no sheet; expired listing (disabled "已领取", no sheet); non-allowed URL (disabled); non-Subito source (direct open, "在 Vinted 打开", no sheet); signed out (sign-in guest card, no contact button/sheet). 11 PASS | PASS |
| B Send tab | default template; radio group label; each of 4 templates in zh and en updates the preview (exact Italian) with meaning in the app language; for all 4 templates the clipboard holds exactly the Italian text and a new tab opens the listing's seller URL; success toast; after send the sheet stays open with a next-step message and a button to Translate; copy failure (permission denied + `execCommand` false): page still opens, sheet stays, hint shown, no false toast, text selectable. 29 PASS (2 FAIL before the fixes, see D1) | PASS |
| C Translate | reply success (3 alternatives, each copy button copies exactly its text); compose success with emoji/mixed zh-it text sent unchanged and copied exactly; "couldn't understand"; 401/403/429/502/503/network failure in zh and en with the right message; retry clears the error; 12 s slow response (button "翻译中…" disabled, one request, sheet closable, no page error when the reply arrives later); empty/whitespace disabled; 1001 chars capped at 1000 and the limit is announced; 1994-char result scrollable and copied exactly; tab switch keeps text; close/reopen resets to Send. 37 PASS | PASS |
| D Layout | 320x568, 360x640, 390x844, 430x932, 844x390 x zh/en x send/translate (+ long title and no photo at 320 and 390): no horizontal overflow, nothing outside the sheet, primary visible, template and preview each scrollable into view, textareas and buttons reachable; keyboard-shrunk viewport (390x380) both textareas and buttons reachable; light and dark text contrast >= 4.5:1 on both tabs incl. results/error; 200% text at 390x844 and 320x568. 114 PASS | PASS |
| E Accessibility | focus into sheet and back to trigger; Escape; Tab order close > tab > radio > primary and trapped; radio arrows; tablist label, `aria-selected`, ARIA arrow keys; no unnamed control (accessibility snapshot); all buttons/tabs/radio rows >= 44x44; live regions for copy, translation result, error; axe-core 0 violations on both tabs (zh; installed into a scratch dir outside the repo). 29 PASS | PASS |
| F Onboarding step | zh/en: order `... favorites > contact > trust`, `it` skips it; 320/360/390/430 widths: three rows + Italian example, no overflow, Continue visible; Back/Continue; Skip is present and lands on the preview (same as other steps); language chip on the first screen removes/adds the step (dots 8 -> 7). 36 PASS. A language change *on* the contact step cannot happen in the UI (the chip only exists on screen 1); that case is covered by `OnboardingFlow.free.test.tsx` only | PASS |
| G Copy | Automated: no marketplace name in the sheet's own copy (zh/en, both tabs), "Contatta" quoted. Manual review below. 4 PASS | PASS (see owner decisions) |

## Defects found and fixed

Commits: `d106dd3` (alternatives item), `15b938d` (UX/accessibility fixes). Before-fix evidence is the first `contact` runs on the same build family (failing lines quoted).

| # | What the user experienced | Root cause | Fix |
| --- | --- | --- | --- |
| D1 | After "copy and open", the sheet closed. Back on this tab there was nothing about the next step (the Translate tab was hidden behind a second tap of the primary button, which reopens on Send). Check "back on the original tab the next step is visible" FAILED. | `ContactAssistantSheet.tsx` `SendTab` called `onDone()` -> close | Sheet stays open; a live-region message tells the user to paste, send, then come back and open Translate, with a "去翻译回复" / "Go to Translate" button (`SendFooter`). Cleared when another template is picked. Tests in `ContactAssistantSheet.test.tsx`. |
| D2 | On 320x568 the scrolling area was 81-110 px; in landscape 844x390 it was 32 px: the templates and Italian preview could not be reached and the primary button fell off screen. At 200% text and 320x568: 32 px, primary not visible. | Header, item row, tabs and the tall pinned footer (steps + button + note) took the whole sheet height; only the middle scrolled | Item row, tabs and content scroll together above a small pinned footer; the 3 steps moved into the scroll body as a vertical list (the horizontal list also collided with its arrows at 320 px). |
| D3 | Text typed on Translate vanished after a look at the Send tab. | Tab panels were unmounted on switch | Both panels stay mounted (hidden); closing the sheet still resets. |
| D4 | Pasting more than 1000 characters silently cut the end of the seller's message. | `maxLength=1000` with no feedback | `CharCount`: "n/1000" from 800, and a "limit is 1,000 characters, the rest was not kept" message (zh/en/it). |
| D5 | Keyboard/screen-reader users: focus stayed on the (aria-hidden) button behind the sheet when it opened and was dropped on close; focused first stop was an unnamed 48x6 px button (axe `button-name`, critical). | vaul `autoFocus` defaults off; the shared drawer grabber was a `<button>` without a name or handler (`components/ui/drawer.tsx`) | `autoFocus` + focus restored to the opener in the sheet; the grabber is a decorative `div` unless `onHandleClick` is given (the map sheet keeps its button). |
| D6 | Tabs were not operable with arrow keys (ARIA tabs pattern); no announcement of copy success in the sheet, of translation results, or of loading. | Plain buttons, constant `aria-label` on copy buttons, no live regions | Roving tabindex + Arrow/Home/End; `role=status` regions for copy, loading, results. |
| D7 | In dark mode on a mouse device, the primary and "翻译" buttons turned unreadable on hover (text 1.9:1). | Shared `Button` default: `hover:bg-primary-container` with `text-on-primary`; `#48484a` vs `#1c1c1e` in dark | Sheet buttons override hover (`hover:bg-primary hover:opacity-90`). The shared `Button` is unchanged (see below). |

Not a defect: the 401 console error seen in the harness comes from other app requests with the cookie stripped by the proxy.

## Alternatives item (coordinator request, commit `d106dd3`)

`reply` mode returns `{ meaning, replies: [{ italian, meaning }] }` (1-3 alternatives; the parser rejects 0 or >3, drops extra fields, each field non-empty and capped at 400 chars, `meaning` at 2500). The prompt forbids inventing times, dates, vehicles, household facts or promises, asks for genuinely different answers (yes / no / question back), keeps names, streets, numbers and times in Latin script, informal "tu" unless the seller used "Lei", and one neutral reply for non-Italian input. `compose` returns `{ italian, unclear }`; `unclear: true` yields 200 and the sheet shows "这句话我们没看懂，请换个说法再试" (new key `composeUnclear`), not "unavailable"; 502 stays for upstream failures. Gemini `responseSchema` (OBJECT/ARRAY with `required`) is sent for both modes with `responseMimeType`. The sheet renders "选一条回复 / Pick a reply" with one row per alternative: Italian, meaning, own copy button (44 px, container-aware sync copy). Tests: parser (0/1/3/4 replies, missing/empty/too long, unclear), route (alternatives, unclear 200, schema in the request), sheet (3 alternatives each copying its own text, one alternative, unclear). Journey fixtures use the new shape. **Not verified against real Gemini** (the coordinator re-runs the live cases).

## Unfixed / owner decisions

1. **Copy added (please review, new meaning-bearing text):** `sentNext`, `goTranslate`, `limitReached`, `pickReply`, `composeUnclear` in zh/en/it. The `it` strings are unreviewed by a native speaker (the sheet is never shown in `it`).
2. **zh tab label "翻译回复"** also hosts "write your own message -> Italian", which the label does not suggest; `翻译` (as in en "Translate") would fit. Left as is because `sentNext` quotes it; change both together.
3. **Step 2 "点 Contatta"** and the "first time you need an account" note are unverified against the real seller page (needs a real phone).
4. **No AI disclosure:** nothing tells the user that the translation is machine-made and may be wrong, or that the pasted text goes to Google's API (privacy wording).
5. **Shared `Button` default hover in dark mode** (`components/ui/button.tsx`) is unreadable app-wide (1.9:1) on mouse devices; fixed only inside this sheet to avoid changing other screens. Owner call whether to fix the token pairing globally.
6. **Steps guide is below the fold at 390x844** (previously pinned above the button); it scrolls into view above the pinned button. Trade-off for D2; say if the guide must be always visible.
7. Where the user finds the seller's reply (email/app notifications of the seller's site) is not explained on the Translate tab.
8. A stale translation result stays visible after the pasted text is edited (cosmetic, not changed).
9. Not verifiable here: real phones, iOS/WeChat clipboard and `window.open` (a blocked popup would still show "copied"; the next-step text deliberately does not claim the page opened), real Gemini, the real 200/day cap (RPC) and the subscription 403 against the server.
10. No eslint config in the repo, so nothing was linted.

## Test suites

`npx vitest run`: `Test Files  155 passed (155)` / `Tests  1019 passed (1019)`. `npx tsc --noEmit`: exit 0.
