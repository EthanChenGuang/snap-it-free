# Feed home (flag off)

With the flag off and no param, `/` must be byte-for-byte what `main` renders: the open grid feed with real listings and no onboarding.

## Sub-features

- `home-open` real listing cards, no overlay, no lock.
- `home-parity` DOM identical to `main`.

## How to get to it (user POV)

- Open `/` on a default build.

## Driving it with drive.mjs

Preconditions: this branch launched with `--flag off`, and a `main` worktree launched with `--repo /tmp/verify-snap-it-free/main-wt --flag off`.

- **Open feed.** `node scripts/drive.mjs flag-off --url $URL --out $OUT` asserts no `onboarding-overlay`, no `locked-feed`, and some `a[href^="/listing/"]`.
- **Parity.** `node scripts/drive.mjs compare --base $MAIN_URL --url $URL --out $DIR` loads both at the same moment, strips scripts, links and styles, and asserts equal `body` HTML. It also saves both screenshots for a pixel diff.

## Gotchas

- Run both servers against the same Supabase at the same moment, or listing data and relative times drift.
