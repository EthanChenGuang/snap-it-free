-- Records when a subscription entered past_due, for the 3-day grace window (Guang, 2026-10-25 23:14 Rome).
-- Additive and safe to apply any time after 042, before or independently of the go-live 044. 042 stays frozen.
-- Until this is applied, apply_subscription_state (042) keeps working and past_due simply gets no grace.

-- Stripe advances current_period_end when it attempts the renewal, so a failed renewal leaves a fresh
-- period end; "period end + 3 days" would grant most of another period. The past_due start is the anchor.
alter table public.subscriptions
  add column if not exists past_due_since timestamptz;

update public.subscriptions
set past_due_since = last_event_at
where status = 'past_due' and past_due_since is null;

-- Same signature as 042, so the webhook code is identical before and after this migration.
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
    current_period_end, cancel_at_period_end, last_event_at, past_due_since
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_plan, p_price_id,
    p_current_period_end, coalesce(p_cancel_at_period_end, false), p_last_event_at,
    case when p_status = 'past_due' then p_last_event_at end
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
    -- Keep the original start while the subscription stays past_due; clear it on any other status.
    past_due_since = case
      when excluded.status <> 'past_due' then null
      when s.status = 'past_due' and s.past_due_since is not null then s.past_due_since
      else excluded.last_event_at
    end,
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
