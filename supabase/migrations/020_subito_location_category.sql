-- Phase 8: city/region columns + listings_public D-28 visibility (D-25, D-26, D-28)
-- Operator applies before Plan 03 persist verification. No URL auto-seed (D-12).

alter table public.listings
  add column if not exists city text,
  add column if not exists region text;

create index if not exists listings_city_idx
  on public.listings (city)
  where status = 'active';

create index if not exists listings_category_idx
  on public.listings (category)
  where status = 'active';

create or replace view public.listings_public
with (security_invoker = false)
as
select
  id,
  source,
  title,
  title_en,
  title_zh,
  photo_url,
  external_url,
  lat,
  lng,
  zone,
  city,
  region,
  category,
  category_en,
  category_zh,
  posted_at,
  expires_at,
  status
from public.listings
where (
  (status = 'active' and expires_at > now())
  or (status = 'claimed' and source = 'ugc' and expires_at > now())
)
and (
  zone is not null
  or (city is not null and lat is not null and lng is not null)
);

grant select on public.listings_public to anon, authenticated;
