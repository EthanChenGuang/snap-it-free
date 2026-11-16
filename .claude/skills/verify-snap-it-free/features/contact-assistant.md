# Chinese contact assistant (phase 5)

Bottom sheet on a signed-in scraped-listing detail page (zh/en only; `it` and non-Subito sources open the seller page directly). Tab **Send** (4 ready Italian messages, the Italian text shown inside the selected row, compact 3-step guide and the primary copy + open button in the pinned footer, next-step notice at the top after sending) and tab **Translate** (zh tab label "翻译") (paste the seller's reply -> meaning + 1-3 alternative replies; write in your language -> Italian). Code: `components/detail/ContactAssistantSheet.tsx`, `lib/contact/*`, `app/api/contact/translate/route.ts`; onboarding step `onboarding.contact` (free mode, zh/en only).

## Sub-features

- `ca-entry` primary button label "联系卖家" / "Contact the seller" opens the sheet; `it` opens the seller URL in a new tab; disabled for non-available or non-allowed URLs; signed out = guest sign-in card.
- `ca-send` default template, the Italian text inside the selected row is exactly what is copied; primary button copies it (sync `execCommand`, async clipboard fallback), restores focus to itself, opens the seller URL, no toast; the sheet stays open with the next-step notice (top of the scroll area, footer height unchanged) and a "go to Translate" button that focuses the Translate tab and scrolls to the top; copy failure keeps the sheet open with a hint and selectable text. 390x844: rows + Italian + steps fit without scrolling; 320x568 scrolls and every row is reachable.
- `ca-translate` reply (hint where to find the seller's reply; meaning + 1-3 picks each with its own copy button; AI honesty note) and compose (Italian, or "couldn't understand"; honesty note); 401/403/429/502/503/network messages; loading disables the button; a result/error/spinner is shown only while the text still equals the text it was requested for (edit, edit while in flight, restore the same text); counter under the field in an always-mounted `role=status` (neutral `1000/1000`; "rest was not kept" only after an over-long paste, driven with a real Ctrl+V); text survives tab switches; closing resets everything.
- `ca-layout` 320x568 to 430x932, landscape 844x390, dark, 200% text, keyboard-shrunk viewport; hover contrast of the shared primary Button in dark and light on the detail page, /settings, /favorites (the feed has no default primary button).
- `ca-a11y` focus in/out, Escape, tab order, radio arrows, ARIA tabs, names, 44px targets, live regions, axe-core.
- `ca-onboarding` the free-mode onboarding contact step between favorites and trust.

## "Mocked auth": how a signed-in page is reached without an account

No sign-up, no DB write, no production call. `scripts/contact-harness.mjs`:

1. A **cookie-stripping reverse proxy** fronts `next start`. The forged Supabase session (unsigned JWT, future `exp`, fake user id) lives only in the browser cookie `sb-<ref>-auth-token` (`base64-` + base64url JSON, one chunk); the proxy removes every `Cookie` header, so the server's `supabase.auth.getUser()` never sends the forged token to the real project. (Without the proxy the server would.)
2. `page.route` answers `/auth/v1/**` locally; any other Supabase request carrying the forged bearer gets an empty valid answer; only anonymous publishable-key reads go through; realtime websockets are closed. The journey asserts that 0 requests leaked the forged token.
3. `/api/contact/translate` is scripted per scenario (the real route would 401 and call Gemini). The real Gemini API is never called.
4. The seller's site is stubbed, so popups never reach the real marketplace.
5. Listing states the live data does not have (expired, other source, no photo, long title, bad URL) are made by rewriting the server-rendered listing JSON in the proxy ("mocked SSR payload").

This proves the UI, not the server auth. Chromium only (no WebKit, no real phone, no WeChat browser).

## Driving it

Build once with the onboarding flag (needed for the `F` rows) and the paywall flag off:

```
NEXT_PUBLIC_ONBOARDING_ENABLED=true scripts/launch.sh --build --flag off
PLAYWRIGHT_CORE=/opt/node22/lib/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scripts/drive.mjs contact --url $URL --out .planning/phases/05-chinese-contact-assistant/verification [--rows ABCDEFG]
```

`--rows` picks matrix rows (A entry points, B send, C translate, D layout, E accessibility, F onboarding, G copy). axe-core runs when `@axe-core/playwright` resolves (`AXE_PLAYWRIGHT`, default `/tmp/claude-0/axe/node_modules/@axe-core/playwright`; install it into a scratch dir, never the repo); otherwise it logs `INFO ... axe not run`.

## Gotchas

- The copy strings in `contact-journey.mjs` mirror `messages/{zh,en}.ts`; update both when copy changes.
- The language chip exists only on the first onboarding screen, so the journey switches language there; a mid-step switch is covered by `OnboardingFlow.free.test.tsx`.
- The sheet is `90dvh`; the simulated keyboard shrinks the viewport, which is stricter than iOS (where only the visual viewport shrinks).
- Realtime/other authenticated browser calls from the detail page: none were observed (0 answered locally).
