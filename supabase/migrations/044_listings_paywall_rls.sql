-- Hard paywall at the data layer (decided by Guang 2026-10-25, confirmed 23:14 Rome: "1-6 按推荐做").
-- GO-LIVE ONLY: apply together with NEXT_PUBLIC_PAYWALL_ENABLED=true, never before. Requires 042 and 043.
--
-- Afterwards the anon key and signed-in non-subscribers read no listing rows through PostgREST. A row is
-- readable by its own author, or by a user whose subscription is active/trialing (period not ended) or
-- past_due for less than 3 days. The service role bypasses RLS on the table and is exempted in the view,
-- so the scraper, cron jobs and admin tooling are unaffected. The locked teaser (count + up to 6 photo
-- URLs, nothing else) comes from listings_paywall_teaser().

-- 1. Entitlement for the calling user only (no argument, so nobody can probe another user).
--    Must match lib/subscriptions/entitlement.ts (PAST_DUE_GRACE_MS = 3 days).
create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = (select auth.uid())
      and (
        (s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'past_due'
          and s.past_due_since is not null
          and now() < s.past_due_since + interval '3 days')
      )
  );
$$;

revoke all on function public.has_active_subscription() from public;
grant execute on function public.has_active_subscription() to anon, authenticated, service_role;

-- 2. Base table: authenticated direct reads need a subscription too (ugc_select_own still lets
--    authors read their own rows). anon has no table grant since 006.
drop policy if exists "public_read_active_non_expired" on public.listings;
drop policy if exists "subscriber_read_active_non_expired" on public.listings;
create policy "subscriber_read_active_non_expired"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  and expires_at > now()
  and (select public.has_active_subscription())
);

-- 3. listings_public runs as its owner (security_invoker = false, see 010), so RLS above does not
--    reach it; the same gate goes into its WHERE. Columns and order are unchanged from 036.
--    security_barrier stops caller-supplied filters from being evaluated before the gate.
create or replace view public.listings_public
with (security_invoker = false, security_barrier = true)
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
)
and (
  (select public.has_active_subscription())
  or owner_user_id = (select auth.uid())
  or (select auth.role()) = 'service_role'
);

grant select on public.listings_public to anon, authenticated;

-- 4. Locked teaser: the visible-listing count and up to 6 distinct photo URLs. No ids, titles,
--    locations or other columns leave the function. p_city uses the consumer city keys and the
--    same mapping as listingConsumerCity() in lib/listings/filters.ts (Venice zones first, then
--    city slug or key with an optional bbox check). The city table must match
--    lib/geo/italian-cities.ts (enforced by lib/paywall/teaser-sql-parity.test.ts).
create or replace function public.listings_paywall_teaser(
  p_city text default null,
  p_since timestamptz default null,
  p_limit integer default 6
)
returns table (listing_count bigint, photo_urls text[])
language sql
stable
security definer
set search_path = ''
as $$
  with cities (key, slug, lat_min, lat_max, lng_min, lng_max) as (
    values
      ('venice', 'venezia', 45.0, 45.7, 12.1, 12.6),
      ('padova', 'padova', 45.3, 45.5, 11.7, 12.0),
      ('milano', 'milano', 45.35, 45.55, 9.0, 9.3),
      ('firenze', 'firenze', 43.7, 43.85, 11.15, 11.35),
      ('roma', 'roma', 41.75, 42.05, 12.35, 12.65),
      ('napoli', 'napoli', 40.75, 40.95, 14.1, 14.45),
      ('perugia', 'perugia', 43.0, 43.22, 12.3, 12.5),
      ('torino', 'torino', 44.95, 45.15, 7.55, 7.85),
      ('prato', 'prato', 43.82, 43.95, 11.02, 11.18),
      ('bologna', 'bologna', 44.37, 44.61, 11.19, 11.49),
      ('brescia', 'brescia', 45.42, 45.66, 10.07, 10.37),
      ('genova', 'genova', 44.29, 44.53, 8.78, 9.08),
      ('verona', 'verona', 45.32, 45.56, 10.84, 11.14)
  ),
  visible as (
    select l.posted_at, l.zone, l.city, l.lat, l.lng,
      coalesce(
        (select u from unnest(l.photo_urls) as u where nullif(btrim(u), '') is not null limit 1),
        nullif(btrim(l.photo_url), '')
      ) as photo
    from public.listings l
    where (
      (l.status = 'active' and l.expires_at > now())
      or (l.status = 'claimed' and l.source = 'ugc' and l.expires_at > now())
    )
    and (
      l.zone is not null
      or (l.city is not null and l.lat is not null and l.lng is not null)
      or (l.source = 'ugc' and l.lat is not null and l.lng is not null)
    )
    and (p_since is null or l.posted_at >= p_since)
  ),
  scoped as (
    select v.*
    from visible v
    where p_city is null
      or (p_city = 'venice' and v.zone::text in ('centro_storico', 'mestre_marghera', 'lido_murano'))
      or (
        coalesce(v.zone::text, '') not in ('centro_storico', 'mestre_marghera', 'lido_murano')
        and exists (
          select 1 from cities c
          where c.key = p_city
            and lower(v.city) in (c.slug, c.key)
            and (
              v.lat is null or v.lng is null
              or (v.lat between c.lat_min and c.lat_max and v.lng between c.lng_min and c.lng_max)
            )
        )
      )
  ),
  photos as (
    select photo, max(posted_at) as latest
    from scoped
    where photo is not null
    group by photo
    order by latest desc
    limit least(greatest(coalesce(p_limit, 6), 0), 6)
  )
  select
    (select count(*) from scoped),
    coalesce((select array_agg(photo order by latest desc) from photos), array[]::text[]);
$$;

revoke all on function public.listings_paywall_teaser(text, timestamptz, integer) from public;
grant execute on function public.listings_paywall_teaser(text, timestamptz, integer)
  to anon, authenticated, service_role;
