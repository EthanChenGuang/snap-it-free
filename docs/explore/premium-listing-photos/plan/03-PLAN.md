---
phase: featured-picks
plan: 03
type: execute
wave: 2
depends_on: ["01", "02"]
files_modified:
  - scraper/src/featured/select-candidates.ts
  - scraper/src/featured/run-featured-tick.ts
  - scraper/src/featured/prune.ts
  - scraper/src/featured/*.test.ts
  - scraper/src/alert/notify.ts
  - scraper/src/worker.ts
  - .github/workflows/featured-picks.yml
autonomous: true
requirements: [FEAT-01, FEAT-03, FEAT-05, FEAT-06]
user_setup: []
must_haves:
  truths:
    - "a tick selects ≤15 candidates per consumer city from listings posted in the last 24 h, excluding animali and already-processed listings"
    - "only images with pass=true are uploaded and inserted as status=pending"
    - "the owner gets one message per tick with the number of new candidates and the review link"
    - "the job stops starting new images after 25 minutes"
    - "objects of rejected picks and of listings no longer in listings_public are deleted"
  artifacts:
    - scraper/src/featured/run-featured-tick.ts
    - .github/workflows/featured-picks.yml
  key_links:
    - "worker.ts --featured-tick → runFeaturedTick → python cli.py → storage upload → featured_candidates insert → notifyOperatorText"
---

<objective>
Daily orchestrator in the existing TypeScript worker plus a GitHub Actions workflow to run it.
</objective>

<context>
@docs/explore/premium-listing-photos/plan/RESEARCH.md
@.github/workflows/subito-scheduler.yml
@scraper/src/worker.ts
@scraper/src/alert/notify.ts
@lib/listings/filters.ts
</context>

<tasks>
<task type="auto">
  <name>Task 1: Candidate selection (pure, tested)</name>
  <files>scraper/src/featured/select-candidates.ts, select-candidates.test.ts</files>
  <action>
  Query `listings` (service role) for `source='subito'`, `status='active'`, `posted_at > now()-24h`,
  `category <> 'animali'`, `photo_url is not null`, not in `featured_candidates`. Map with
  `listingConsumerCity()`; drop `null`. Group by city, newest first, cap 15 per city. Build source URL by
  swapping `rule=` to `gallery-desktop-2x-auto`; reject any URL whose host is not `images.sbito.it`.
  </action>
  <verify>`npx vitest run scraper/src/featured`</verify>
  <acceptance_criteria>
    - test: non-sbito host is skipped; animali skipped; cap 15 enforced
  </acceptance_criteria>
  <done>Selection tested.</done>
</task>

<task type="auto">
  <name>Task 2: runFeaturedTick + prune + notifyOperatorText</name>
  <files>run-featured-tick.ts, prune.ts, notify.ts, worker.ts, tests</files>
  <action>
  Download sources to a temp dir as `<listing_id>.jpg` (timeout 15 s each, max 5 MB), stop scheduling new
  downloads/processing after `FEATURED_MAX_MINUTES` (default 25). Run
  `python scraper/featured/cli.py --in tmp/in --out tmp/out --report tmp/report.json` via `child_process.spawn`
  (runner injectable for tests). For pass rows: upload `featured-photos/<batch_date>/<listing_id>.webp`
  (contentType image/webp, upsert false), insert `featured_candidates` (status pending, gate = reasons/timing).
  Prune: delete objects + rows for `rejected` older than 1 day and for rows whose listing is no longer in
  `listings_public`. Add `notifyOperatorText(supabase, { subject, text })` to `notify.ts` reusing routing and
  channels; message: "今日精选：N 件新候选待审核 → {APP_URL}/admin/featured". Skip message when N = 0.
  Wire `--featured-tick` flag in `worker.ts`.
  </action>
  <verify>`npx vitest run scraper/src/featured scraper/src/alert`</verify>
  <acceptance_criteria>
    - test with mocked runner: pass rows uploaded+inserted, fail rows not
    - test: time budget exceeded → remaining candidates untouched, no partial rows
    - existing notify tests still pass
  </acceptance_criteria>
  <done>Orchestrator tested.</done>
</task>

<task type="auto">
  <name>Task 3: .github/workflows/featured-picks.yml</name>
  <files>.github/workflows/featured-picks.yml</files>
  <action>
  `on: schedule: cron '23 5 * * *'` (daily, off the hour, away from the 12-hourly scheduler) + `workflow_dispatch`.
  `concurrency: featured-picks`, `timeout-minutes: 40`. Steps: checkout, setup-node 22 (scraper cache),
  `npm ci` in scraper, setup-python 3.12 with pip cache, install pinned requirements (+ `--no-deps` file),
  `actions/cache` for `~/.u2net` keyed `u2net-birefnet-general-lite-v1`, `python -m pytest -q scraper/featured`
  (fail fast), then `node --import tsx src/worker.ts -- --featured-tick` with the same secrets as
  subito-scheduler (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, alert channel secrets, APP_URL).
  </action>
  <verify>`actionlint` if available; YAML parses.</verify>
  <acceptance_criteria>
    - workflow contains `timeout-minutes: 40` and `U2NET_HOME` or `~/.u2net` cache
  </acceptance_criteria>
  <done>Workflow committed; first run triggered manually by owner via workflow_dispatch (phone: GitHub app → Actions).</done>
</task>
</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| SSRF / arbitrary download via crafted photo_url | host allowlist `images.sbito.it`, size + timeout caps |
| Service-role key exposure | only in Actions secrets; never sent to Python step env |
| Actions minutes exhausted, starving ingest | 25-min work budget, 40-min hard timeout, separate concurrency group |
| Notification spam | one message per tick, none when 0 candidates |
</threat_model>

<verification>
- [ ] `npx vitest run scraper/src/featured scraper/src/alert`
- [ ] `npx tsc --noEmit` — no new errors
</verification>
