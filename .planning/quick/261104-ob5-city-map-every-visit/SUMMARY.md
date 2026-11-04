# Quick 261104-ob5 — City-level map + onboarding on every visit (Preview)

Guang (2026-11-04) decided:
1. `preview/recent-changes` is the **only** working branch. No other branches.
2. Map screen: **city-level map** (recommended option). Preview only; production untouched.
3. Non-subscribers see onboarding **every visit** on Preview.
4. (asked for a recommendation on the webhook-only test; see HANDOFF §3)
5. Authorized changing the Supabase production email templates (additive OTP line).
6. Removing the post-checkout "You're in" banner/toast (d79b531) **was his intent**.

## Why the map changed
Only Subito is enabled (`scraper_sources`), and Subito pages carry no coordinates, so
`scraper/src/shared/normalize.ts` falls back to the city's bbox centre. Every item in a city sits on
one point. Wallapop would give per-item coordinates (~100 m) but is disabled (launch scope).

## What changed (87ac2ca)
- `lib/paywall/onboarding-stats.ts`: `buildCityMap(rows)` — one bubble per city, real active count,
  busiest first. The old per-item `buildMapTeaser` is removed.
- `lib/geo/italy-outline.ts`: simplified coastlines (decorative) + projection; frame = north/central Italy.
- `SnagGapSteps.tsx`: `CityMapView` — bubble area ∝ count, top 3 cities labelled with their count;
  line "N free items in M cities right now". Uses all cities, not just Veneto.
- Copy (en/it/zh): map title/body/rows reworded; "how" row "Distance and posting time on every card"
  → "City and posting time on every card" (cards show location + time, not distance).
- `lib/paywall/gate.ts`: `isOnboardingEveryVisitEnv()` (non-production) + `everyVisit` in the gate; the
  locked feed passes it, so only non-subscribers are affected. Skipped on `?checkout=` returns.
- `drive.mjs`: map asserts `map-city-bubble`; persist step now expects onboarding again on reload.

## Verify
`npm run lint` clean, `npm test` 864/864. Preview drive: see STATE.md.
