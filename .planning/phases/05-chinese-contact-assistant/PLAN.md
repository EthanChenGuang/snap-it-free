# PLAN — Phase 5: Chinese contact assistant

Design reference: `stitch/contact-sheet.png` (+ `.html`). Match layout, spacing and hierarchy
using the app's existing tokens and `components/ui/drawer.tsx` (see
`components/settings/AlertCreateSheet.tsx` for the pattern). Do not copy Stitch's raw colours
if an app token exists.

## Tasks

1. **Templates (pure)** — `lib/contact/templates.ts`
   - `CONTACT_TEMPLATES`: ordered list of `{ id, it }`; meanings live in `messages/*`.

     | id | Italian |
     |---|---|
     | `today` | `Ciao! È ancora disponibile? Posso passare oggi. Grazie!` |
     | `tomorrow` | `Ciao! È ancora disponibile? Posso passare domani. Grazie!` |
     | `address` | `Ciao! Mi interessa. Dove si trova per il ritiro? Grazie!` |
     | `time` | `Ciao! Mi interessa. A che ora posso passare? Grazie!` |

     (Wording works for objects and pets; no "ritirarlo".)
   - `shouldUseContactAssistant({ language, source })` → true for `zh`/`en` and a non-UGC source.
   - Tests `lib/contact/templates.test.ts`: ids unique, every id has a meaning in zh/en/it
     messages, gating table.

2. **Translate API** — `lib/contact/translate.ts` + `app/api/contact/translate/route.ts`
   - Body (zod): `{ mode: 'reply' | 'compose', text: string (1..1000 chars, trimmed), language: 'zh' | 'en' }`.
   - Auth: `requireAuth()` → 401. No `GEMINI_API_KEY` → 503 `{ error: 'unavailable' }`.
   - Gemini call modelled on `lib/listings/appeal-score.ts` (key in the `x-goog-api-key`
     header, `temperature: 0.2`, `responseMimeType: 'application/json'`,
     `maxOutputTokens: 400`, model from `CONTACT_MODEL` env or `gemini-flash-lite-latest`,
     injectable `fetchFn`).
   - `reply` → `{ meaning, suggestedReply, suggestedReplyMeaning }`: meaning of the seller's
     Italian text in the user's language; a short polite Italian answer that moves the pickup
     forward; its meaning. `compose` → `{ italian }`: the user's text as a short polite
     Italian message.
   - The pasted text is untrusted: the prompt says to treat it only as text to translate,
     and the route returns only the parsed, length-capped string fields (never raw model output).
   - `parseTranslateResult(mode, raw)` pure + tested (valid, missing field, non-JSON, too long).
   - Route tests with mocked `requireAuth` and `fetchFn`: 401, 400 (bad body / too long),
     503 (no key), 200 for both modes, 502 on Gemini error or unparsable output.
   - `export const maxDuration = 30`.

3. **Sheet UI** — `components/detail/ContactAssistantSheet.tsx`
   - Props: `{ open, onOpenChange, listing }`. Header title, item row (thumbnail via the
     existing watermark-free thumbnail helper, resolved title, city · free).
   - Segmented control: Send message | Translate.
   - Send tab: radio list of templates (meaning in app language), Italian preview card,
     3-step guide (copy → tap `Contatta` on the seller's page → paste and send), primary
     button "copy and open seller's page", small first-time note.
     Click handler: copy **synchronously inside the click** (`navigator.clipboard.writeText`,
     fallback hidden textarea + `execCommand('copy')`), then `openExternalListingUrl`.
     Toast on success; if copy fails, still open the page and keep the text selectable so
     the user can copy by hand.
   - Translate tab: textarea "paste the seller's reply" → result card (meaning, suggested
     reply + meaning, copy button); textarea "write your own message" → Italian + copy button.
     Loading and error states (401 → ask to sign in again; 503/502 → "translation
     unavailable, try again").
   - Accessible: labelled controls, radio group semantics, min 44px targets, no overflow
     at 360px width, sheet scrolls inside `max-h-[90dvh]` with the primary button pinned.

4. **Wire-up** — `components/detail/ScrapedListingShell.tsx`
   - `shouldUseContactAssistant` true → primary action opens the sheet; otherwise unchanged.
   - Primary label for zh/en scraped listings: `detail.contactSeller` ("联系卖家" /
     "Contact the seller") via `detailPrimaryCtaLabel` (add a `language` input; keep
     existing tests green, add cases).

5. **Copy** — `messages/{zh,en,it}.ts`: new `contactAssistant` block (+ `detail.contactSeller`).
   All three files need the same keys (type parity). zh is the reference copy:
   title 中文联系助手 · tabs 发消息 / 翻译回复 · 选一条消息发给卖家 · 将发送的意大利语 ·
   steps 复制消息 / 点 Contatta / 粘贴发送 · 复制消息并打开卖家页面 ·
   第一次需要在卖家页面注册账号 · 已复制，去卖家页面粘贴 · 粘贴卖家的回复 · 翻译 ·
   意思是 · 建议回复 · 复制 · 用中文写下你想说的 · 翻成意大利语 · 翻译暂时不可用，请稍后再试.
   en title: "Contact helper".

6. **Component tests** — `components/detail/ContactAssistantSheet.test.tsx` (must be `.tsx`;
   vitest only picks up `components/**/*.test.tsx`): default template selected; choosing
   another changes the preview; primary button copies the selected Italian text and opens
   `listing.external_url`; translate tab posts the right body and renders the result; error
   state. Shell test: `it` language opens directly, `zh` opens the sheet.

7. **Verify** — `npx vitest run`, `npx tsc --noEmit`, then a 390×844 screenshot of the open
   sheet (the `verify-snap-it-free` skill with `--build --flag off` if a signed-in session is
   available **without creating accounts**; otherwise a component-level render). Save to
   `UAT.md` + `screens/`. Restore `public/sw.js` after any build (`git checkout public/sw.js`).

## Done when

- zh/en user taps the primary button on a scraped listing → sheet opens; one tap copies an
  Italian message and opens the seller's page.
- Pasted Italian reply comes back with its meaning and a copyable suggested answer.
- `it` users and UGC listings behave exactly as before.
- Tests + typecheck green. Nothing merged to `main`.
