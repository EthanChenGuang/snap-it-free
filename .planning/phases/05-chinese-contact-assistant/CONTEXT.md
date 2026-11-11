# CONTEXT — Phase 5: Chinese contact assistant

## Problem (Guang, 2026-11-11)

Every scraped listing lives on an Italian marketplace. The primary button on the detail page
(`detail.snagIt`) opens the seller's page there. A Chinese user cannot register, write to the
seller, or read the answer. After paying, this feels like a dead end (refund risk).

We cannot change the seller's site and phone browsers have no extensions, so the help has to
live **in our app**: prepare the user before they leave, and help again when they come back.

## Decisions

- **Where:** a bottom sheet in our app, opened by the primary button on scraped listings.
  Not a plugin, not an iframe of the seller's site.
- **Who:** app language `zh` or `en`. Language `it` keeps today's behaviour (open the seller's
  page directly). UGC listings are untouched.
- **Tab 1 "Send a message":** pick a ready Italian message (meaning shown in the user's
  language), preview the Italian text, one button copies it and opens the seller's page.
  A 3-step guide and a note that the first time needs an account on the seller's page.
- **Tab 2 "Translate":** (a) paste the seller's Italian reply → meaning in the user's language
  plus one suggested Italian answer with its meaning; (b) write in your own language → Italian.
  Both results have a copy button.
- **AI:** Gemini `gemini-flash-lite-latest` through the existing `GEMINI_API_KEY`
  (already in Vercel Preview + Production). Text only, a fraction of a cent per call.
  No DB writes, nothing stored.
- **Wording:** do not name the source marketplace in new copy; say "seller's page" /
  "卖家页面". The Italian button label `Contatta` may be quoted (it is what the user must tap).
- **Design:** Stitch project `196004169049733920`, screen `f67256342fa44d9591389d8631a2a1ee`
  (`stitch/contact-sheet.png`, `stitch/contact-sheet.html`). Drop the two decorative labels
  "轻触切换" and "精准意式地道表达" (no made-up claims).
- **Branch:** `preview/recent-changes` only. **Not merged to `main`** until Guang says so.
- **Models (Guang):** plan with Fable, build with Sonnet, review with Opus.

## Already there (do not rebuild)

- `title_zh` / `description_zh` exist and the detail page already shows them
  (`lib/i18n/listing-fields.ts`). Coverage is ~50% of live listings; raising it is a separate
  job for the translation pipeline, not this phase.

## Out of scope

- Contacting sellers on the user's behalf, showing seller phone numbers, embedding the
  seller's site.
- Annotated screenshots of the seller's page (needs real screenshots from Guang's phone;
  the exact button labels there are unverified from this sandbox).
- Paywall copy that sells this feature (follow-up, with Guang).
