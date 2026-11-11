# Quick 261108-ob7 — Curated, photo-only cards on the "how" screen

Guang, 2026-11-07/08: the "how" screen's two cards were just the newest rows (often worn furniture). He asked
for one premium-looking computer item and one pet, then for the cards to drop the title and age
("iMac del 2009/10 · 27 days ago" undersold it).

- `pickShowcase` (`lib/paywall/onboarding-stats.ts`): pinned iMac `9f15b82a…` + Ragdoll kitten `71c423ec…`
  while active; then newest premium-looking computer item (skips wanted ads, accessories, broken/old) and newest
  pet, photo required. Region teaser exposes it as `showcase`; cards wait for it instead of flashing other rows.
- `MiniFeedCard photoOnly`: photo + FREE badge only. Design: Stitch screen `f1f5f2efd70249d998424107d1f55eca`
  (`stitch/how-photo-only.png`). Only the card treatment was adopted; Stitch's extra taglines/footer were not
  (some were untrue, e.g. "No subscription required").
- Also this round: "how" title "Free finds, made easy"; interest chips Electronics, Pets, Kids & toys,
  Furniture, Appliances, Books, Clothes, Everything; alerts step skipped where push can't work in the tab.

## Hook collage (2026-11-08, later)
Guang: the hook photos loaded slowly and were all worn furniture. The collage now uses six illustrative product
photos generated in Stitch (screen `e4a2b5963d1c456e891fa29b9418b36d`, `stitch/hook-collage.png`): puppy, laptop,
kitten, books, armchair, headphones. Bundled as ~10 KB webp in `public/images/onboarding/hook/`, no data fetch.
They illustrate categories; the live count under the headline stays the real number. Stitch's draft copy named
Subito and claimed "No credit card required"; neither was used. Hook body no longer says "one colourful feed".

## Other dynamic images (2026-11-08, later)
Guang: same treatment for any other screen that loads photos. Now bundled Stitch photos:
- "how": computer + ragdoll kitten (`public/images/onboarding/how/`), `PhotoCard` (photo + FREE). Replaces the
  pinned-listing picker (`pickShowcase`, removed) and the extra full listings download it needed.
- favourites: bike, table lamp, guitar (`.../favorites/`). Illustrative, so cards show only a short item name
  (no listing title, age or place). Design: Stitch screen `afff87b6644f4a2ca34d3a447637af4b` (`stitch/favorites-static.png`).
- alerts example: bookshelf + espresso machine thumbnails (`.../alerts/`); the mock is already labelled Example.
  Stitch screen `7369a0681b2d4fc093ccbd77cab5a28b` (`stitch/alerts-static.png`).
Kept real on purpose: the personal preview and paywall strip (blurred photos of the actual locked items behind
"N free items in <city>").

## Real photos instead of Stitch images (2026-11-08, later)
Guang: the Stitch images looked fake and too polished. Each bundled image is now the most appealing real
listing photo of its type (picked by eye from ~15k live listings with photos), cropped to its frame, small webp.
Open points for launch/legal: the photos belong to the people who posted them (used here as fixed promo
images, not as listings), and a few originals carried a faint source watermark (not deliberately removed;
frame crops hide most of it). Source listings:

| File (public/images/onboarding/) | Listing title | Listing id |
|---|---|---|
| hook/puppy.webp | Adozione Femmina di Golden Retriever Americana | d8f1756f-6b4d-422a-a3be-ca2b0d756976 |
| hook/computer.webp | Case per computer nuovo imballato | f4da53a3-8dc5-4d08-80b7-0feb55d5fd32 |
| hook/kitten.webp | micini 2mesi | 95e4adf1-4bd0-4b93-8e9d-91bc693c17e7 |
| hook/books.webp | libri da leggere | cae8ad4a-655b-46fa-b867-649ffb7433cc |
| hook/armchair.webp | Poltroncina maisondumonde | 6f5c75b0-f47f-4b7d-bf10-7e8756a9dde7 |
| hook/camera.webp | Canon EOS-3 | 58d93c3a-bdb3-42db-b648-7a7e525fb90f |
| how/computer.webp | iMac del 2009/10 | 9f15b82a-ce81-4225-83d2-6d0eab6c2894 |
| how/ragdoll.webp | Adozione del cuore cucciolo Ragdoll | 71c423ec-72bb-4a10-9f0d-67a43bf93ccd |
| favorites/bike.webp | Mountain Bike | 9a95e061-e8d0-41c0-a9d9-31c0f6de919f |
| favorites/lamp.webp | lampada da tavolo metallica | 93d35325-83ac-4dac-a629-bd411f441a15 |
| favorites/guitar.webp | Chitarra elettrica Maxine nera | d82efc3b-fac5-449b-9b62-4d663c4c280e |
| alerts/bookshelf.webp | Libreria | fdd98357-7f35-4b7f-b2b9-10590f3b2009 |
| alerts/espresso.webp | Macchina espresso Saeco | 95b7b1d9-1278-4093-af61-6a4bb5bce0d2 |

Swaps (Guang, same day): puppy → golden retriever, city bike → mountain bike, Bluetooth speakers → Canon camera.
Bike photo reframed around the bike (Guang chose this, 2026-11-08) so the source watermark falls outside the card.
