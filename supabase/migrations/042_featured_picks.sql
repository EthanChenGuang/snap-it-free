-- 042: Featured picks (今日精选) — candidate table, public view, storage bucket.
--
-- Additive only: new table, new view, new bucket. Does not touch existing tables or views.
-- Safe to run more than once.
--
-- Security model:
--   * featured_candidates has RLS enabled and NO policies → only the service role
--     (scraper job, admin API) can read or write it. Pending/rejected candidates are
--     never visible to anon/authenticated users.
--   * featured_picks_public exposes only status = 'approved' rows whose listing is still
--     active and unexpired.
--   * featured-photos bucket is public-read; there are no insert/update/delete policies,
--     so only the service role can write objects.
--
-- The view joins public.listings directly (with the same active filter as listings_public)
-- instead of joining listings_public, so later migrations that drop/recreate
-- listings_public are not blocked by a dependent view.

create table if not exists public.featured_candidates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  consumer_city text not null,
  batch_date date not null,
  studio_path text not null,
  gate jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint featured_candidates_listing_unique unique (listing_id)
);

create index if not exists featured_candidates_city_status_reviewed_idx
  on public.featured_candidates (consumer_city, status, reviewed_at desc);

alter table public.featured_candidates enable row level security;

-- Explicitly no grants/policies for anon or authenticated on the table.
revoke all on public.featured_candidates from anon, authenticated;

create or replace view public.featured_picks_public
with (security_invoker = false)
as
select
  c.id,
  c.listing_id,
  c.consumer_city,
  c.studio_path,
  c.reviewed_at,
  l.title,
  l.title_en,
  l.title_zh,
  l.city,
  l.category
from public.featured_candidates c
join public.listings l on l.id = c.listing_id
where c.status = 'approved'
  and l.status = 'active'
  and l.expires_at > now();

grant select on public.featured_picks_public to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('featured-photos', 'featured-photos', true)
on conflict (id) do nothing;

drop policy if exists "featured_photos_select_public" on storage.objects;
create policy "featured_photos_select_public"
  on storage.objects for select to public
  using (bucket_id = 'featured-photos');
