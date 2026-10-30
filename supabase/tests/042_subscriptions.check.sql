-- Run against a throwaway database after applying 042_subscriptions.sql:
--   psql -v ON_ERROR_STOP=1 -f supabase/migrations/042_subscriptions.sql -f supabase/tests/042_subscriptions.check.sql
-- Raises on the first failed expectation; prints CHECKS PASSED otherwise. Rolls back its data.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.test');

set local role service_role;
do $$
begin
  assert public.apply_subscription_state('00000000-0000-0000-0000-0000000000a1', 'cus_a', 'sub_a', 'active',
    'yearly', 'price_y', '2027-10-25T00:00:00Z', false, '2026-10-25T10:00:00Z'), 'first write applies';
  assert not public.apply_subscription_state('00000000-0000-0000-0000-0000000000a1', 'cus_a', 'sub_a', 'incomplete',
    'yearly', 'price_y', null, false, '2026-10-25T09:00:00Z'), 'older event is ignored';
  assert (select status from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000a1') = 'active',
    'status kept after stale event';
  assert public.apply_subscription_state('00000000-0000-0000-0000-0000000000a1', 'cus_a', 'sub_a', 'canceled',
    'yearly', 'price_y', '2027-10-25T00:00:00Z', false, '2026-10-25T11:00:00Z'), 'newer event applies';
  assert public.apply_subscription_state('00000000-0000-0000-0000-0000000000b2', 'cus_b', 'sub_b', 'active',
    'weekly', 'price_w', '2026-11-01T00:00:00Z', false, '2026-10-25T10:00:00Z'), 'second user row';
end $$;
reset role;

set local role authenticated;
-- Both forms: newer auth.uid() reads request.jwt.claims, the bare image's reads request.jwt.claim.sub.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$
begin
  assert (select count(*) from public.subscriptions) = 1, 'authenticated user sees only own row';
  assert (select status from public.subscriptions) = 'active', 'own row is readable';
  begin
    insert into public.subscriptions (user_id, stripe_customer_id, status, last_event_at)
      values ('00000000-0000-0000-0000-0000000000b2', 'cus_x', 'active', now());
    raise exception 'authenticated insert should be denied';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.apply_subscription_state('00000000-0000-0000-0000-0000000000b2', 'cus_b', 'sub_b', 'active',
      'yearly', 'price_y', null, false, now());
    raise exception 'authenticated must not execute apply_subscription_state';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role anon;
do $$
begin
  assert (select count(*) from public.subscriptions) = 0, 'anon sees no rows';
end $$;
reset role;

select 'CHECKS PASSED';
rollback;
