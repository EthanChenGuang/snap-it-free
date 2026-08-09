-- Phase 9 Plan 02: expose description columns on listings_public for D-06 feed search

drop view if exists public.listings_public;

create view public.listings_public
with (security_invoker = false)
as
select
  id,
  source,
  title,
  title_en,
  title_zh,
  description,
  description_en,
  description_zh,
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
