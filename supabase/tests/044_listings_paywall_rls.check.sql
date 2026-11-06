-- Run on a throwaway database after every migration through 044 (supabase/tests/run-local.sh).
-- Raises on the first failed expectation; prints one line per passed group. Rolls back its data.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'active@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'none@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'grace-in@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'grace-out@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'author@example.test'),
  ('00000000-0000-0000-0000-00000000000f', 'expired@example.test');

insert into public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, last_event_at, past_due_since) values
  ('00000000-0000-0000-0000-00000000000a', 'cus_a', 'sub_a', 'active', now() + interval '20 days', now(), null),
  ('00000000-0000-0000-0000-00000000000c', 'cus_c', 'sub_c', 'past_due', now() + interval '25 days', now(), now() - interval '3 days' + interval '1 minute'),
  ('00000000-0000-0000-0000-00000000000d', 'cus_d', 'sub_d', 'past_due', now() + interval '25 days', now(), now() - interval '3 days' - interval '1 minute'),
  ('00000000-0000-0000-0000-00000000000f', 'cus_f', 'sub_f', 'active', now() - interval '1 minute', now(), null);

-- 7 visible rows: 5 Milano (one geocoded in Rome), 1 Venice zone, 1 UGC owned by the author.
-- 2 invisible rows: expired, hidden.
insert into public.listings (id, source, external_id, content_hash, title, photo_url, external_url, lat, lng, zone, city, posted_at, expires_at, status, owner_user_id) values
  ('10000000-0000-0000-0000-000000000001', 'subito', 'm1', 'h-m1', 'Sedia', 'https://img.test/m1.jpg', 'https://subito.test/1', 45.45, 9.15, null, 'milano', now() - interval '1 hour', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000002', 'subito', 'm2', 'h-m2', 'Tavolo', 'https://img.test/m2.jpg', 'https://subito.test/2', 45.46, 9.16, null, 'milano', now() - interval '2 hours', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000003', 'subito', 'm3', 'h-m3', 'Lampada', 'https://img.test/m1.jpg', 'https://subito.test/3', 45.47, 9.17, null, 'milano', now() - interval '3 hours', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000004', 'subito', 'm4', 'h-m4', 'Divano', 'https://img.test/m4.jpg', 'https://subito.test/4', 41.9, 12.5, null, 'milano', now() - interval '4 hours', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000005', 'subito', 'm5', 'h-m5', 'Bici', 'https://img.test/m5.jpg', 'https://subito.test/5', 45.48, 9.18, null, 'milano', now() - interval '5 hours', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000006', 'subito', 'v1', 'h-v1', 'Armadio', 'https://img.test/v1.jpg', 'https://subito.test/6', 45.44, 12.33, 'centro_storico', null, now() - interval '6 hours', now() + interval '1 day', 'active', null),
  ('10000000-0000-0000-0000-000000000007', 'ugc', 'u1', 'h-u1', 'Libri', 'https://img.test/u1.jpg', 'https://app.test/u1', 45.46, 9.19, null, 'milano', now() - interval '7 hours', now() + interval '1 day', 'active', '00000000-0000-0000-0000-00000000000e'),
  ('10000000-0000-0000-0000-000000000008', 'subito', 'x1', 'h-x1', 'Scaduto', 'https://img.test/x1.jpg', 'https://subito.test/8', 45.45, 9.15, null, 'milano', now() - interval '8 hours', now() - interval '1 minute', 'active', null),
  ('10000000-0000-0000-0000-000000000009', 'subito', 'x2', 'h-x2', 'Nascosto', 'https://img.test/x2.jpg', 'https://subito.test/9', 45.45, 9.15, null, 'milano', now() - interval '9 hours', now() + interval '1 day', 'hidden', null);

create temp table expect (who text, user_id text, view_rows int, table_rows int, entitled boolean) on commit drop;
insert into expect values
  ('anon', null, 0, null, false),
  ('authenticated, no subscription', '00000000-0000-0000-0000-00000000000b', 0, 0, false),
  ('active subscriber', '00000000-0000-0000-0000-00000000000a', 7, 7, true),
  ('past_due 3 days minus 1 minute (in grace)', '00000000-0000-0000-0000-00000000000c', 7, 7, true),
  ('past_due 3 days plus 1 minute (grace over)', '00000000-0000-0000-0000-00000000000d', 0, 0, false),
  ('active but period ended', '00000000-0000-0000-0000-00000000000f', 0, 0, false),
  ('author without subscription', '00000000-0000-0000-0000-00000000000e', 1, 1, false);
grant select on expect to anon, authenticated, service_role;

create or replace function pg_temp.probe(p_role text, p_user text) returns table (view_rows int, table_rows int, entitled boolean)
language plpgsql as $$
declare
  t int;
begin
  perform set_config('role', p_role, true);
  perform set_config('request.jwt.claims',
    case when p_user is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_user, 'role', p_role)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user, ''), true);
  begin
    execute 'select count(*) from public.listings' into t;
  exception when insufficient_privilege then t := null;
  end;
  return query select (select count(*)::int from public.listings_public), t, public.has_active_subscription();
  perform set_config('role', 'postgres', true);
end $$;

do $$
declare
  e record;
  got record;
begin
  for e in select * from expect loop
    select * into got from pg_temp.probe(case when e.user_id is null then 'anon' else 'authenticated' end, e.user_id);
    reset role;
    assert got.view_rows = e.view_rows, format('%s: listings_public rows %s, expected %s', e.who, got.view_rows, e.view_rows);
    assert got.table_rows is not distinct from e.table_rows, format('%s: listings rows %s, expected %s', e.who, got.table_rows, e.table_rows);
    assert got.entitled = e.entitled, format('%s: has_active_subscription %s, expected %s', e.who, got.entitled, e.entitled);
    raise notice 'PASS % -> view % rows, table % rows, entitled %', e.who, got.view_rows, coalesce(got.table_rows::text, 'no grant'), got.entitled;
  end loop;
end $$;

-- The author sees exactly their own row, and only that.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  assert (select array_agg(id::text) from public.listings_public) = array['10000000-0000-0000-0000-000000000007'],
    'author reads only their own listing through listings_public';
  raise notice 'PASS author reads exactly their own listing';
end $$;
reset role;

-- RLS performance: the subscription check and auth.uid() run once per query (InitPlan), not per row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare
  plan text := '';
  line text;
begin
  for line in execute 'explain (costs off) select id from public.listings_public' loop
    plan := plan || line || E'\n';
  end loop;
  assert plan like '%InitPlan%', format('gate is hoisted into an InitPlan, plan was:%s%s', E'\n', plan);
  assert plan not like '%SubPlan%', format('gate must not be a per-row SubPlan, plan was:%s%s', E'\n', plan);
  raise notice 'PASS listings_public gate evaluates once per query (InitPlan, no per-row SubPlan)';
end $$;
reset role;

-- Caller-supplied filters cannot leak gated rows (security_barrier).
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.listings_public where title = 'Sedia' or true) = 0, 'anon filter cannot bypass the gate';
  raise notice 'PASS anon filters cannot widen listings_public';
end $$;
reset role;

-- Service role: full CRUD on the table and every visible row through the view.
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
set local request.jwt.claim.sub = '';
do $$
declare
  n int;
begin
  insert into public.listings (id, source, external_id, content_hash, title, photo_url, external_url, lat, lng, city, posted_at, expires_at, status)
    values ('10000000-0000-0000-0000-0000000000aa', 'subito', 'sr1', 'h-sr1', 'Scraper', 'https://img.test/sr1.jpg', 'https://subito.test/aa', 45.45, 9.15, 'milano', now(), now() + interval '1 day', 'active');
  update public.listings set title = 'Scraper 2' where id = '10000000-0000-0000-0000-0000000000aa';
  get diagnostics n = row_count;
  assert n = 1, 'service role updates';
  assert (select count(*) from public.listings) = 10, 'service role selects every table row (9 + 1 inserted)';
  assert (select count(*) from public.listings_public) = 8, 'service role reads all 8 visible rows through the view';
  delete from public.listings where id = '10000000-0000-0000-0000-0000000000aa';
  get diagnostics n = row_count;
  assert n = 1, 'service role deletes';
  raise notice 'PASS service_role insert/update/delete/select on listings and full listings_public';
end $$;
reset role;

-- Teaser: callable by anon and authenticated, returns only a count and up to 6 photo URLs.
do $$
declare
  cols text;
begin
  select string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) into cols
  from pg_proc p
  cross join lateral unnest(p.proallargtypes, p.proargmodes, p.proargnames) with ordinality as a0(typ, mode, name, ord)
  join lateral (select a0.name as attname, a0.typ as atttypid, -1 as atttypmod, a0.ord as attnum) a on true
  where p.proname = 'listings_paywall_teaser' and a0.mode = 't';
  assert cols = 'listing_count bigint, photo_urls text[]', format('teaser output columns are only count + urls, got: %s', cols);
  assert (select prosecdef from pg_proc where proname = 'listings_paywall_teaser'), 'teaser is security definer';
  assert (select proconfig::text from pg_proc where proname = 'listings_paywall_teaser') like '%search_path=%', 'teaser has a fixed search_path';
  assert (select proconfig::text from pg_proc where proname = 'has_active_subscription') like '%search_path=%', 'helper has a fixed search_path';
  assert (select provolatile from pg_proc where proname = 'has_active_subscription') = 's', 'helper is STABLE';
  raise notice 'PASS teaser returns (%) and both functions are definer with fixed search_path', cols;
end $$;

insert into public.listings (id, source, external_id, content_hash, title, photo_url, external_url, lat, lng, city, posted_at, expires_at, status)
select ('20000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, 'subito', 'bulk' || g, 'h-bulk' || g, 'Bulk ' || g,
       'https://img.test/bulk' || g || '.jpg', 'https://subito.test/bulk' || g, 45.45, 9.15, 'milano',
       now() - interval '10 days' - g * interval '1 minute', now() + interval '1 day', 'active'
from generate_series(1, 10) g;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare
  t record;
begin
  select * into t from public.listings_paywall_teaser(null, null, 50);
  assert t.listing_count = 17, format('anon teaser total count 17 (7 + 10 bulk), got %s', t.listing_count);
  assert cardinality(t.photo_urls) = 6, format('teaser caps at 6 photos even when asked for 50, got %s', cardinality(t.photo_urls));
  assert t.photo_urls[1:3] = array['https://img.test/m1.jpg', 'https://img.test/m2.jpg', 'https://img.test/m4.jpg'],
    format('teaser photos are distinct (m3 reuses m1) and newest first, got %s', t.photo_urls);
  raise notice 'PASS anon teaser: count %, % urls: %', t.listing_count, cardinality(t.photo_urls), t.photo_urls;

  select * into t from public.listings_paywall_teaser('milano', now() - interval '1 day', 6);
  assert t.listing_count = 5, format('milano within 1 day is m1 m2 m3 m5 u1 (Rome-geocoded m4 and 10-day-old bulk excluded), got %s', t.listing_count);
  raise notice 'PASS milano teaser since 1 day: count % (Rome-geocoded row excluded, lookback applied)', t.listing_count;

  select * into t from public.listings_paywall_teaser('venice', null, 6);
  assert t.listing_count = 1 and t.photo_urls = array['https://img.test/v1.jpg'], 'venice teaser maps Venice zones';
  select * into t from public.listings_paywall_teaser('verona', null, 6);
  assert t.listing_count = 0 and t.photo_urls = array[]::text[], 'empty city reports zero honestly';
  raise notice 'PASS venice=1 and verona=0 teasers';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select listing_count from public.listings_paywall_teaser()) = 17, 'authenticated non-subscriber can call the teaser';
  raise notice 'PASS authenticated non-subscriber teaser count 17';
end $$;
reset role;

-- 043: apply_subscription_state stamps past_due_since on entry, keeps it, clears it on recovery.
set local role service_role;
do $$
declare
  u uuid := '00000000-0000-0000-0000-00000000000b';
begin
  perform public.apply_subscription_state(u, 'cus_b', 'sub_b', 'active', 'monthly', 'price_m', now() + interval '30 days', false, '2026-10-01T00:00:00Z');
  assert (select past_due_since from public.subscriptions where user_id = u) is null, 'active row has no past_due_since';
  perform public.apply_subscription_state(u, 'cus_b', 'sub_b', 'past_due', 'monthly', 'price_m', now() + interval '60 days', false, '2026-10-31T00:00:00Z');
  assert (select past_due_since from public.subscriptions where user_id = u) = '2026-10-31T00:00:00Z', 'entering past_due stamps the event time';
  perform public.apply_subscription_state(u, 'cus_b', 'sub_b', 'past_due', 'monthly', 'price_m', now() + interval '60 days', false, '2026-11-01T12:00:00Z');
  assert (select past_due_since from public.subscriptions where user_id = u) = '2026-10-31T00:00:00Z', 'repeated past_due keeps the original start';
  perform public.apply_subscription_state(u, 'cus_b', 'sub_b', 'active', 'monthly', 'price_m', now() + interval '60 days', false, '2026-11-02T00:00:00Z');
  assert (select past_due_since from public.subscriptions where user_id = u) is null, 'recovery clears past_due_since';
  raise notice 'PASS 043 apply_subscription_state stamps, keeps and clears past_due_since';
end $$;
reset role;

select 'CHECKS PASSED 044';
rollback;
