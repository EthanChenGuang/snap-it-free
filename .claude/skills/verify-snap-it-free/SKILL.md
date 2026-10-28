---
name: verify-snap-it-free
description: Launch the 零元 / ZeroDollar Next.js PWA (snap-it-free) locally as a production build and drive it with Playwright to prove user-facing behavior, starting with the flagged pre-browse onboarding and hard paywall. Use when you need real-app evidence (screenshots and asserted checks), not just unit tests.
---

# Verify snap-it-free

The surface is the mobile-first web PWA served by `next start`. All helpers live in `scripts/` and take explicit arguments.

## One-time tools (outside the repo)

- Node 22 is required to build. The root layout's `PwaOnboardingProvider` reads `navigator` during render, which is only a global from Node 21. On Node 20, `npm run build` fails prerendering `/favorites` and `/_not-found` (this fails on `main` too). If `node -v` is below 22, install one into a scratch dir and export its bin dir:
  `mkdir -p /tmp/verify-tools && npm i --prefix /tmp/verify-tools node@22 playwright-core && export VERIFY_NODE_DIR=/tmp/verify-tools/node_modules/node/bin`
- Playwright drives the cached Chromium in `~/.cache/ms-playwright` through `playwright-core`. The installed version must ship the same Chromium revision as the cache. `PLAYWRIGHT_CORE` overrides the module path (default `/tmp/verify-tools/node_modules/playwright-core`).
- `.env.local` must hold the public Supabase URL and publishable key. Never print it. Without it the feed is empty and teaser and locked-count checks fail.

## Launch

`scripts/launch.sh --build --flag off|on [--port N] [--repo DIR]`

- Builds with `NEXT_PUBLIC_PAYWALL_ENABLED=true` when `--flag on` (the flag is inlined at build time, so switching it means rebuilding) and records the flag in `.next/VERIFY_PAYWALL_FLAG`.
- Starts `next start` under `setsid` on a free port. Ready means `GET /` returns 200. Prints `RUN_DIR=` and `URL=`.
- `--repo` points at another checkout, e.g. a `git worktree add /tmp/verify-snap-it-free/main-wt origin/main` baseline (symlink `node_modules`, copy `.env.local`).
- Isolation: one `.next` per checkout, so one flag variant per checkout at a time. Several servers on different ports are fine.

## Doctor

`scripts/doctor.sh RUN_DIR` checks that the process is alive, `/` returns 200, the build id is unchanged since launch, and prints the built flag and git revision. It ends with `DOCTOR_OK` or `DOCTOR_FAIL`. Run it first whenever results look odd.

## Drive

`node scripts/drive.mjs <journey> --url URL --out DIR [--base URL]`. Each check prints `PASS`/`FAIL` and the run ends with `RESULT <journey>: n/m`, exiting non-zero on any failure. Feature recipes are in `features/`.

| Journey | Build | Proves |
| --- | --- | --- |
| `flag-off` | off | no overlay, feed open, real listing cards, Terms without subscription text (`00-flag-off.png`) |
| `onboarding` | off | `?onboarding=1` walk of all steps, real teaser, alerts, hard paywall, coming-soon CTA, locked feed and detail, zh copy (`01`–`13`) |
| `desktop-paywall` | off | 1280x800 centered paywall card (`14`) |
| `compare` | off, twice | home DOM identical to the `--base` server once scripts are dropped |
| `persist` | on | shows without a param, not again after completion + reload, locked feed/favorites, no listing payload in HTML, subscription Terms/Privacy, real city teaser (`15`–`20`) |

## Data-layer checks (migrations and RLS)

`supabase/tests/run-local.sh [PORT]` proves the database side without any remote access. It starts a throwaway `supabase/postgres:17` container, applies `supabase/tests/support/hosted-supabase-shim.sql` (test-only stand-ins for `storage.*`, `auth.jwt()`, `auth.uid()` and `auth.role()` as the hosted stack defines them), then every numbered migration in order, then each `supabase/tests/*.check.sql`. The container is removed on exit. Every check prints `PASS ...` lines and ends with `CHECKS PASSED`. A failed assertion stops the script non-zero.

- The runner drops `listings_public` before any migration that uses `create or replace view` on it, because 020 reorders its columns, which Postgres rejects. 021, 035 and 036 recreate it anyway.
- Never point it at a real project. It never reads `.env*`.

## Evidence

Screenshots go to `--out` (the onboarding work uses `/workspace/snag-research/ours/`). Keep the console output: the `PASS` lines are the proof, the PNGs are for humans. Proof standard: drive the user path (clicks, reloads), assert storage and URL side effects, and never set internal state directly except the language preference seed.

## Cleanup

`scripts/cleanup.sh RUN_DIR` stops only the process group that `launch.sh` started and leaves evidence in place. Never kill `next-server` by name, because other sessions on this machine run their own. Remove a baseline worktree with `git worktree remove --force /tmp/verify-snap-it-free/main-wt`.
