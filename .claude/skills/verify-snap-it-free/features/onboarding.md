# Pre-browse onboarding

Four intro steps (welcome, how it works, city pick with a real-data teaser, alerts), then the paywall. Shown once when `NEXT_PUBLIC_PAYWALL_ENABLED=true`, or always with `?onboarding=1`.

## Sub-features

- `ob-gate` shows only with the flag or param, once per browser (`shoumanwu_onboarding_completed_v1`).
- `ob-nav` Continue, Back, Skip (to paywall), progress bar.
- `ob-city` 13 cities. Continue stays disabled until one is picked. The pick is written to `shoumanwu_filter_prefs`.
- `ob-teaser` real count and up to 4 real thumbnails from `listings_public`, with honest zero and error states.
- `ob-alerts` "Turn on notifications" calls the real push hook. A guest gets the sign-in message. "Not now" moves on.

## How to get to it (user POV)

- Open `/` on a flag-on build for the first time.
- Open `/?onboarding=1` on any build.

## Driving it with drive.mjs

Preconditions: doctor OK, `.env.local` present, fresh browser context (the script makes one per journey).

- **Walk.** `node scripts/drive.mjs onboarding --url $URL --out $OUT` clicks through by accessible names (`Continue`, `Back`, `Skip`, city radios, `Turn on notifications`, `Not now`) and asserts `data-screen` on `[data-testid=onboarding-overlay]`.
- **Teaser.** Clicks every city, logs `INFO teaser counts`, keeps the largest and asserts the count text and 1–4 `img` in `[data-testid=onboarding-teaser]`.
- **Once only.** `persist` on a flag-on build completes via Skip then Close, reloads, and asserts no overlay.

## Gotchas

- Counts move with the scraper. Assert format and presence, not fixed numbers.
- With every city non-empty, the zero-state screenshot is skipped. The zero copy is covered by `lib/paywall/teaser.test.ts`.
- One seller often lists the same kind of item several times, so near-identical thumbnails can be real, distinct listings.
