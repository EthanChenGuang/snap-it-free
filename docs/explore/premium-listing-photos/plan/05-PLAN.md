---
phase: featured-picks
plan: 05
type: execute
wave: 2
depends_on: ["01"]
files_modified:
  - components/listings/FeaturedStrip.tsx
  - components/listings/FeaturedStrip.test.tsx
  - components/listings/FeedHomeClient.tsx
  - app/page.tsx
  - messages/zh.ts
  - messages/en.ts
  - messages/it.ts
  - lib/admin/quota-usage.ts
autonomous: false
requirements: [FEAT-04, FEAT-06, FEAT-07, FEAT-08]
user_setup: []
must_haves:
  truths:
    - "the strip renders above the feed grid only when the applied city has ≥1 approved active pick"
    - "cards are 4:5, 40% wide, no text over images, title + city below, tap opens /listing/{id}"
    - "header shows 今日精选 and 店主每日挑选 · {real count}"
    - "cards reveal with 70 ms stagger; no animation under prefers-reduced-motion"
    - "a failure loading picks never breaks the feed"
    - "quota card lists featured-photos bucket size"
  artifacts:
    - components/listings/FeaturedStrip.tsx
  key_links:
    - "app/page.tsx getFeaturedPicks() → FeedHomeClient → selectPicksForCity(applied.city) → FeaturedStrip"
---

<objective>
Ship variant A′ on the home feed, behind real data, plus quota visibility.
</objective>

<context>
@docs/explore/premium-listing-photos/sketch-featured-final.html
@DESIGN.md
@components/listings/FeedHomeClient.tsx
@components/listings/ListingPhoto.tsx
@lib/featured/queries.ts
@lib/admin/quota-usage.ts
</context>

<tasks>
<task type="auto">
  <name>Task 1: FeaturedStrip component</name>
  <files>components/listings/FeaturedStrip.tsx, FeaturedStrip.test.tsx, messages/*.ts</files>
  <action>
  Implement A′ exactly as in `sketch-featured-final.html`: horizontal scroll-snap row, `scroll-padding-left: 16px`,
  item `flex-basis: 40%`, 4:5 media with radius 14 px and the faint shadow, neutral surface background,
  accent dot + title `featured.title` (今日精选 / Today's picks / Selezione di oggi) + subtitle
  `featured.subtitle` with `{count}` (店主每日挑选 · {count} 件 / Picked daily by the curator · {count} /
  Scelti ogni giorno · {count}). Use `ListingPhoto`-style shimmer while loading (native img, lazy except first 2).
  Framer-motion stagger 0.07 s, disabled with `useReducedMotion()`. Return null for 0 picks.
  </action>
  <verify>`npx vitest run components/listings/FeaturedStrip messages`</verify>
  <acceptance_criteria>
    - test: 0 picks → renders nothing; 3 picks → 3 links to /listing/{id}; count text uses real length
    - `messages/key-parity.test.ts` passes
    - component contains no absolutely positioned text over the image
  </acceptance_criteria>
  <done>Component tested.</done>
</task>

<task type="auto">
  <name>Task 2: Wire into home + quota card</name>
  <files>app/page.tsx, components/listings/FeedHomeClient.tsx, lib/admin/quota-usage.ts</files>
  <action>
  `app/page.tsx`: fetch `getFeaturedPicks()` in the existing `Promise.all` (errors → []). Pass `featuredPicks`
  to `FeedHomeClient`; derive `selectPicksForCity(featuredPicks, applied.mode === 'city' ? applied.city : 'all')`;
  render `FeaturedStrip` above the grid, hidden while a search query is active. Extend quota snapshot to
  report the `featured-photos` bucket (object count + bytes).
  </action>
  <verify>`npx vitest run components/listings lib/admin`; Playwright 390×844 screenshot of `/` with seeded picks.</verify>
  <acceptance_criteria>
    - feed still renders when `getFeaturedPicks` throws (test)
  </acceptance_criteria>
  <done>Strip live behind data.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Home strip on the Vercel preview of `claude/featured-picks` after at least one approved pick.</what-built>
  <how-to-verify>On your phone open the preview home, pick a city with approved picks, swipe the strip, open a card.</how-to-verify>
  <resume-signal>"approved" or describe issues</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| Unapproved image shown | data only from `featured_picks_public` (approved + active) |
| Feed outage caused by featured query | isolated try/catch → [] |
| Layout shift / jank | fixed 4:5 aspect boxes; transform/opacity-only animation |
</threat_model>

<verification>
- [ ] `npx vitest run` (full suite)
- [ ] `npx tsc --noEmit` — no new errors
</verification>
