-- Paid subscriptions for the hard paywall (Stripe web billing, decided 2026-10-25).
-- One row per user, written only by the Stripe webhook / checkout-return routes via the
-- service role. Users may read their own row; nobody else can read or write through the API.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  -- Stripe's status string; left unconstrained so a new Stripe status never fails a webhook write.
  status text not null,
  plan text check (plan in ('weekly', 'monthly', 'yearly')),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Time of the Stripe state this row reflects; older writes are ignored (webhooks can arrive out of order).
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies: only the service role (which bypasses RLS) writes.
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create or replace function public.apply_subscription_state(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_plan text,
  p_price_id text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_last_event_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  applied boolean;
begin
  insert into public.subscriptions as s (
    user_id, stripe_customer_id, stripe_subscription_id, status, plan, price_id,
    current_period_end, cancel_at_period_end, last_event_at
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_plan, p_price_id,
    p_current_period_end, coalesce(p_cancel_at_period_end, false), p_last_event_at
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    plan = excluded.plan,
    price_id = excluded.price_id,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_at = excluded.last_event_at,
    updated_at = now()
  where s.last_event_at <= excluded.last_event_at
  returning true into applied;

  return coalesce(applied, false);
end;
$$;

revoke all on function public.apply_subscription_state(
  uuid, text, text, text, text, text, timestamptz, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_subscription_state(
  uuid, text, text, text, text, text, timestamptz, boolean, timestamptz
) to service_role;
