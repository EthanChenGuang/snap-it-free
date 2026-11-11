# SUMMARY — Phase 5: Chinese contact assistant

## Files
Added: `lib/contact/templates.ts` (+test), `lib/contact/translate.ts` (+test), `app/api/contact/translate/route.ts`
(+test), `components/detail/ContactAssistantSheet.tsx` (+test), `components/detail/ScrapedListingShell.test.tsx`,
`lib/listings/detail-metadata.test.ts`, `screens/`, UAT.md, SUMMARY.md.
Changed: `components/detail/ScrapedListingShell.tsx`, `components/detail/ListingDetailContent.tsx`,
`lib/listings/detail-metadata.ts` (`language` input), `messages/{zh,en,it}.ts` (`contactAssistant`, `detail.contactSeller`),
`vitest.config.ts`, `.planning/ROADMAP.md`.

## Decisions
- `vitest.config.ts` now includes `app/api/contact/**/*.test.ts`; otherwise the route test would never run.
- Steps (copy -> tap Contatta -> paste) sit in the pinned footer above the button, not in the scrolling body, so
  they stay visible on a 844px screen (the Stitch layout has them there too).
- Colours come from app tokens (black primary button), not Stitch's green.
- Copy starts synchronously in the tap; the page opens in the same tap; the toast/hint follows the copy result.
  On success the sheet closes.
- Gemini output is parsed into capped string fields only; user text goes in a separate JSON part of the prompt.
- `it` messages for the new block are Italian; `it` users never see the sheet.

## Follow-ups
- Add an eslint config or drop the lint expectation. Signed-in check on the preview deploy with a real phone.
- Dimmed backdrop for this sheet; paywall copy for the feature (out of scope, with Guang).
- Optional per-user rate limit on `/api/contact/translate` (auth only today; cost is a fraction of a cent per call).
