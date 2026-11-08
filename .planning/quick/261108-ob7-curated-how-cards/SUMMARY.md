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
