-- Idempotent apply-all for 零元 / ZeroDollar / ZeroEuro (safe to re-run)
-- Run in Supabase Dashboard → SQL Editor

-- 001 PostGIS
create extension if not exists postgis with schema extensions;

-- 002 listings schema (skip if exists)
do $$ begin
  create type listing_source as enum ('subito', 'facebook', 'ugc');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type listing_status as enum ('active', 'claimed', 'expired', 'hidden');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type venice_zone as enum ('centro_storico', 'mestre_marghera', 'lido_murano');
exception when duplicate_object then null;
end $$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  source listing_source not null,
  external_id text not null,
  title text not null,
  photo_url text not null,
  external_url text not null,
  lat double precision,
  lng double precision,
  geom geography(point, 4326),
  zone venice_zone,
  status listing_status not null default 'active',
  posted_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  expires_at timestamptz not null,
  content_hash text not null,
  raw_payload jsonb,
  unique (source, external_id)
);

create index if not exists listings_geom_idx on public.listings using gist (geom);
create index if not exists listings_zone_status_idx on public.listings (zone, status) where status = 'active';
create index if not exists listings_expires_at_idx on public.listings (expires_at) where status = 'active';

-- 003 audit tables
create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success', 'failed', 'partial')),
  listings_found int not null default 0,
  listings_inserted int not null default 0,
  listings_updated int not null default 0,
  listings_skipped int not null default 0,
  listings_rejected int not null default 0,
  failure_reason text,
  selector_hit_rate numeric(4,3)
);

create table if not exists public.scrape_rejects (
  id uuid primary key default gen_random_uuid(),
  scrape_run_id uuid references public.scrape_runs(id),
  external_id text,
  reject_reason text not null,
  raw_snippet jsonb not null,
  created_at timestamptz not null default now()
);

-- 004 RLS
alter table public.listings enable row level security;

grant select on public.listings to anon;
grant select on public.listings to authenticated;

drop policy if exists "public_read_active_non_expired" on public.listings;

create policy "public_read_active_non_expired"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  and expires_at > now()
);

-- 005 pg_cron (requires pg_cron extension enabled in Dashboard → Database → Extensions)
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'expire-stale-listings';

select cron.schedule(
  'expire-stale-listings',
  '0 3 * * *',
  $$
    update public.listings
    set status = 'expired'
    where status = 'active'
      and expires_at < now();
  $$
);
