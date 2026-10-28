# Pre-browse onboarding (Snag-modelled, quick 261028-ob2)

Ten screens: **hook → how it works → interests → mobility → city → preview → account → alerts → paywall → (after = locked feed)**. Shown once when `NEXT_PUBLIC_PAYWALL_ENABLED=true`, or always with `?onboarding=1`. The progress bar covers the 8 intro steps; the paywall is the climax.

## Sub-features

- `ob-gate` shows only with the flag or param, once per browser (`shoumanwu_onboarding_completed_v2`).
- `ob-nav` Continue, Back, Skip (to the **preview**, never past the account gate), 8-segment progress bar.
- `ob-hook` real-photo collage + a live "N free items active in Veneto" line (hidden at 0 or on error).
- `ob-interests` multi-select quiz; Continue gated until ≥1; "Everything" is exclusive. Written to `shoumanwu_filter_prefs.categories` as real Subito slugs.
- `ob-mobility` single-select; sets the default `radiusKm`.
- `ob-city` 13 cities, **Venice + Padova lead** (P1-2 fix). Continue gated until one is picked; written to `shoumanwu_filter_prefs.city`.
- `ob-preview` "building your feed" only while the real teaser is in flight, then the real count + blurred real photos (RPC on flag-on, rows fallback otherwise). "Save my feed" → account; "See plans" → paywall.
- `ob-account` **required** sign-up (no "Not now"): real Google OAuth + email OTP. Resume across the redirect via `shoumanwu_onboarding_resume_v2`.
- `ob-alerts` labelled **Example** notifications, then "Turn on alerts" (real push hook). "Not now" → paywall. On success an honest alert is created from the answers.
- `ob-paywall` personalized headline (real city count), blurred photo strip, real 7-day Veneto proof line, computed+floored savings tag (66%), billed line, always-visible ✕. Fixes P1-3 (empty band) and P2-3 (IT badge wrap).

## QA stub for the required account step

The account step is a hard gate. For verification only, `drive.mjs` sets `localStorage['shoumanwu_onboarding_stub_auth']='1'`, which the account step honors **only under `?onboarding=1`**. It lets the walk pass the step without creating a real account; it grants no listing access (the SSR gate is independent). Never signs up against the shared Supabase DB.

## How to get to it (user POV)

- Open `/` on a flag-on build for the first time.
- Open `/?onboarding=1` on any build.

## Driving it with drive.mjs

Preconditions: doctor OK, `.env.local` present, fresh browser context (the script makes one per journey).

- **Walk.** `node scripts/drive.mjs onboarding --url $URL --out $OUT` walks all ten screens (stubbed account), asserting `data-screen` on `[data-testid=onboarding-overlay]`, the P1-2 city order, the real preview count (`[data-testid=preview-count]`), the personalized paywall headline, the true savings tag, and the completed-`v2` + persisted prefs. Shots `01`–`13`.
- **Once only.** `persist` (flag-on) completes as a guest via Skip → See plans → Close, reloads, asserts no overlay, and re-checks the real preview count through `walkToPreview`.
- **Desktop.** `desktop-paywall` reaches the paywall via Skip → See plans and checks the centered ≤440px card.

## Gotchas

- Counts move with the scraper. Assert format and presence, not fixed numbers.
- The hook/preview/paywall figures are derived from real rows; with no Supabase env they are hidden, not faked.
- The alerts "Example" cards are decorative and labelled; they are never presented as real matches.
