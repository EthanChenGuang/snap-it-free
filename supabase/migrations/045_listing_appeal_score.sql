-- 045: AI "appeal" score per listing (Guang, 2026-11-09: put valuable-looking items and pets first).
-- 1 = junk/parts/unclear photo … 5 = very desirable item with a clear photo. NULL = not scored yet; the
-- feed then falls back to keyword rules (lib/listings/appeal.ts). Additive only: a nullable column, and the
-- public view gains it as its LAST column (CREATE OR REPLACE VIEW may only append). The view keeps its
-- current definition otherwise; 044 (paywall gate) also lists the column so applying it later keeps it.

alter table public.listings
  add column if not exists appeal_score smallint check (appeal_score between 1 and 5),
  add column if not exists appeal_scored_at timestamptz;

-- Finds the newest unscored live listings quickly for the daily scorer.
create index if not exists listings_appeal_unscored_idx
  on public.listings (posted_at desc)
  where appeal_score is null and status = 'active';

create or replace view public.listings_public
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
  status,
  appeal_score
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
