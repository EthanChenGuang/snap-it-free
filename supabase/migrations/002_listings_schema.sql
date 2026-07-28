create type listing_source as enum ('subito', 'facebook', 'ugc');
create type listing_status as enum ('active', 'claimed', 'expired', 'hidden');
create type venice_zone as enum ('centro_storico', 'mestre_marghera', 'lido_murano');

create table public.listings (
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

create index listings_geom_idx on public.listings using gist (geom);
create index listings_zone_status_idx on public.listings (zone, status) where status = 'active';
create index listings_expires_at_idx on public.listings (expires_at) where status = 'active';
