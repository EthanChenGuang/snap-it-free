-- Allow UGC pickup anywhere in supported Italian city envelope (not Venice zone-only).
-- Bounds mirror lib/geo/pickup-location.ts UGC_PICKUP_* (+0.15° padding on catalog union).

drop policy if exists "ugc_insert_own" on public.listings;

create policy "ugc_insert_own"
  on public.listings for insert to authenticated
  with check (
    source = 'ugc'
    and owner_user_id = auth.uid()
    and lat is not null
    and lng is not null
    and lat >= 40.6 and lat <= 45.85
    and lng >= 7.4 and lng <= 14.6
  );

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
  or (source = 'ugc' and lat is not null and lng is not null)
);

grant select on public.listings_public to anon, authenticated;
