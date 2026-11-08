---
phase: featured-picks
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/042_featured_picks.sql
  - lib/featured/types.ts
  - lib/featured/queries.ts
  - lib/featured/queries.test.ts
autonomous: false
requirements: [FEAT-01, FEAT-04, FEAT-05, FEAT-07]
user_setup:
  - "Apply supabase/migrations/042_featured_picks.sql in the Supabase SQL editor: https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/sql/new"
must_haves:
  truths:
    - "anon can read only approved picks whose listing is still in listings_public"
    - "anon cannot read featured_candidates rows with status pending or rejected"
    - "featured-photos bucket is public-read and has no insert/update/delete policy for anon/authenticated"
  artifacts:
    - supabase/migrations/042_featured_picks.sql
    - lib/featured/queries.ts
  key_links:
    - "featured_picks_public joins listings_public on listing_id"
---

<objective>
Data layer for featured picks: candidate table, public view of approved picks, storage bucket, typed
query helpers. Output: migration 042 + `lib/featured/*`.
</objective>

<context>
@docs/explore/premium-listing-photos/featured-picks-CONTEXT.md
@docs/explore/premium-listing-photos/plan/RESEARCH.md
@supabase/migrations/007_ugc_messaging_reports.sql
@supabase/migrations/020_subito_location_category.sql
@lib/listings/filters.ts
@lib/listings/queries.ts
</context>

<tasks>
<task type="auto">
  <name>Task 1: Migration 042 — featured_candidates, featured_picks_public, featured-photos bucket</name>
  <files>supabase/migrations/042_featured_picks.sql</files>
  <read_first>supabase/migrations/007_ugc_messaging_reports.sql, supabase/migrations/020_subito_location_category.sql</read_first>
  <action>
  Create `public.featured_candidates`:
  `id uuid pk default gen_random_uuid()`, `listing_id uuid not null references public.listings(id) on delete cascade`,
  `consumer_city text not null`, `batch_date date not null`, `studio_path text not null` (object path in
  `featured-photos`), `gate jsonb not null default '{}'`, `status text not null default 'pending'
  check (status in ('pending','approved','rejected'))`, `created_at timestamptz default now()`,
  `reviewed_at timestamptz`, `reviewed_by text`; `unique (listing_id)`; index on `(consumer_city, status, reviewed_at desc)`.
  Enable RLS with **no** policies for anon/authenticated (service role only).
  Create view `public.featured_picks_public` (security_invoker = false) selecting
  `c.id, c.listing_id, c.consumer_city, c.studio_path, c.reviewed_at, l.title, l.title_en, l.title_zh, l.city, l.category`
  from `featured_candidates c join listings_public l on l.id = c.listing_id where c.status = 'approved'`;
  `grant select on public.featured_picks_public to anon, authenticated`.
  Bucket: `insert into storage.buckets (id, name, public) values ('featured-photos','featured-photos', true) on conflict (id) do nothing;`
  plus `featured_photos_select_public` select policy only. Make the file idempotent (`if not exists`, `drop policy if exists`).
  </action>
  <verify>SQL parses: `npx supabase db lint` if available, else review; grep checks below.</verify>
  <acceptance_criteria>
    - file contains `check (status in ('pending','approved','rejected'))`
    - file contains `where c.status = 'approved'`
    - file contains no `for insert` policy on `storage.objects`
  </acceptance_criteria>
  <done>Migration ready to apply.</done>
</task>

<task type="auto">
  <name>Task 2: lib/featured types + getFeaturedPicks()</name>
  <files>lib/featured/types.ts, lib/featured/queries.ts, lib/featured/queries.test.ts</files>
  <read_first>lib/listings/queries.ts, lib/listings/filters.ts, lib/supabase</read_first>
  <action>
  `FeaturedPick` type (fields of the view + `imageUrl`). `getFeaturedPicks({ limitPerCity = 20 })` reads
  `featured_picks_public` ordered by `reviewed_at desc`, builds `imageUrl` with
  `storage.from('featured-photos').getPublicUrl(studio_path)`, caps per `consumer_city`.
  Pure helper `selectPicksForCity(picks, city: ConsumerCity)`: `all` → all cities newest first (cap 20);
  `other` → []; key → that city only. Errors return [] and log (feed must never break).
  </action>
  <verify>`npx vitest run lib/featured`</verify>
  <acceptance_criteria>
    - tests cover `all`, `other`, a city key, empty result, and query error → []
  </acceptance_criteria>
  <done>Helpers tested.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <what>Owner applies migration 042 in Supabase (phone browser works).</what>
  <how>Open https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/sql/new , paste the file, Run.</how>
  <resume-signal>"migration applied"</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| Unreviewed (possibly watermarked) image becomes public | view filters `status = 'approved'`; table has RLS with no anon policy |
| Anyone uploads to the bucket | only a select policy; writes require service role |
| Pick for an expired/removed listing stays visible | view joins `listings_public` (active-only) |
</threat_model>

<verification>
- [ ] `npx vitest run lib/featured`
- [ ] `npx tsc --noEmit` — no new errors
</verification>
