# Featured Picks — Research

**Date:** 2026-11-08 · **Inputs:** `../featured-picks-CONTEXT.md`, `../phase-featured-picks.md`, spike 001.

## Findings that shape the plan

### Data
- `public.listings_public` (latest def: `supabase/migrations/020_subito_location_category.sql`) exposes
  `id, source, title, title_en, title_zh, photo_url, external_url, lat, lng, zone, city, region,
  category, category_en, category_zh, posted_at, expires_at, status`, filtered to active rows.
  `security_invoker = false`, granted to `anon, authenticated`. → A public featured view can join it.
- Stored `photo_url` carries `?rule=gallery-mobile-1x-auto`. The pipeline swaps the rule to
  `gallery-desktop-2x-auto` (full frame, ≤1240 px, **watermarked — pipeline input only**).
- Latest migration number: `041_scraped_listing_ttl_180d.sql` → new migration is `042_featured_picks.sql`.
- Consumer city mapping: `listingConsumerCity()` / `ConsumerCity` in `lib/listings/filters.ts`
  (keys + `all` + `other`). Per-city picks must use the same mapping so the strip matches the feed filter.

### Storage
- Pattern: `ugc-photos` bucket created in `supabase/migrations/007_ugc_messaging_reports.sql`
  (`insert into storage.buckets … public true` + `storage.objects` policies). Reuse for a
  `featured-photos` public-read bucket; writes only via service role (no insert policy for users).
- Free-tier limits already tracked in `lib/admin/quota-usage.ts` (`SUPABASE_FREE_LIMITS.storageBytes` = 1 GB).
  WebP 400×500 ≈ 12 KB → 15 picks × N cities × ~30 days retained stays in the low tens of MB.

### Compute
- Ingest already runs on GitHub Actions (`.github/workflows/subito-scheduler.yml`, every 12 h,
  `ubuntu-latest`, Node 22, `scraper/` deps, secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  alert channel secrets). Fly.io worker is `shared-cpu-1x / 256 MB` — too small for the model.
- Spike measured `birefnet-general-lite` at ~7 s/img CPU, 224 MB model; full BiRefNet OOM in 16 GB.
- Python deps that worked: `onnxruntime numpy pillow opencv-python-headless scipy pooch tqdm
  jsonschema numba scikit-image` + `rembg pymatting` (`--no-deps`; plain `pip install rembg[cpu]`
  stalled on dependency resolution). Model downloads from GitHub releases into `U2NET_HOME` → cache it
  with `actions/cache`.
- **Architecture choice:** Python does image work only (cutout → gate → WebP); the TypeScript worker
  orchestrates DB, Storage and notifications, reusing `scraper/` clients. Keeps service-role logic
  in one language and the Python step pure/testable.

### Notifications (deviation from CONTEXT D-09, same intent)
- CONTEXT said "reuse web-push". Web-push is per end-user subscription (`push_subscriptions`) and
  needs a mapping from the operator email to a subscribed user; `lib/notifications/web-push.ts`
  only implements match notifications.
- `scraper/src/alert/notify.ts` → `notifyOperator()` already reaches the owner through configured
  channels (Resend email, Telegram, WxPusher/WeChat, WhatsApp via CallMeBot), with routing from DB.
  Its `AlertPayload` is scrape-failure-specific → add a small generic `notifyOperatorText()`.
- **Recommendation:** use `notifyOperator` channels (works on a phone, no new infra). Flagged for
  the owner in the plan summary.

### Admin
- Routes under `app/admin/*/page.tsx`, shell `components/admin/AdminShell.tsx`, operator gating via
  `lib/admin/require-operator.ts` (page + route-handler helpers) and `operator_allowlist`.
  Admin strings live in `components/admin/admin-messages.ts` (Chinese).

### Home feed
- `app/page.tsx` (server, `force-dynamic`) loads listings via `lib/listings/queries.ts` and renders
  `FeedHomeClient`; city filter state is `applied.city` (`applied.mode === 'city'`).
- Consumer strings are trilingual: `messages/zh.ts`, `en.ts`, `it.ts` with `messages/key-parity.test.ts`.
- `components/listings/ListingPhoto.tsx` has the shimmer placeholder to reuse.

## Risks
| Risk | Mitigation |
|---|---|
| Actions minutes (≈1,500/2,000) | runtime cap 25 min, ≤15 candidates/city/day, skip already-processed listings |
| Watermark on studio image | never auto-publish; only `approved` rows are public; gate pre-filters watermark-zone overlap |
| Model download flakiness | `actions/cache` on `U2NET_HOME`; job fails soft (no partial rows) |
| Free egress (~5 GB, unverified) | 12 KB WebP; quota card shows bucket size; egress visible only in dashboard |
| Stale picks | public view joins `listings_public` → expired/removed listings disappear automatically; prune job deletes their objects |

## Validation architecture
- Python: `pytest` on 2 committed fixtures (one clean pass, one watermark-zone fallback) — runs in CI-less
  local check and in the workflow before processing.
- TypeScript: vitest for candidate selection, city mapping, orchestrator (mocked Supabase + Python runner),
  API route auth, strip visibility rules; `messages/key-parity.test.ts` for strings.
- Human: owner checks the review page and the strip on the Vercel preview from a phone.
