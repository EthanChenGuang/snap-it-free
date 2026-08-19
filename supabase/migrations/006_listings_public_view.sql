-- Restrict anon API surface to browse-safe columns (WR-05)
-- Base table retains full columns for service-role scraper writes.

create or replace view public.listings_public
with (security_invoker = true)
as
select
  id,
  source,
  title,
  photo_url,
  external_url,
  lat,
  lng,
  zone,
  posted_at,
  expires_at
from public.listings
where status = 'active'
  and expires_at > now();

revoke select on public.listings from anon;
grant select on public.listings_public to anon, authenticated;
