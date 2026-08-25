-- UGC multi-photo gallery: photo_urls[1] mirrors photo_url for backward compatibility.

alter table public.listings
  add column if not exists photo_urls text[];

update public.listings
set photo_urls = array[photo_url]
where photo_urls is null and photo_url is not null;

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
  photo_urls,
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
  or (source = 'ugc' and lat is not null and lng is not null)
);

grant select on public.listings_public to anon, authenticated;
