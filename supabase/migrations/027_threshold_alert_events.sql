-- Threshold alert cooldown log for platform usage monitoring

create table if not exists public.threshold_alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  message text not null,
  channel text not null check (channel in ('telegram', 'email')),
  severity text not null default 'warning' check (severity in ('warning', 'critical')),
  triggered_at timestamptz not null default timezone('utc', now())
);

create index if not exists threshold_alert_events_key_triggered_idx
  on public.threshold_alert_events (alert_key, triggered_at desc);

alter table public.threshold_alert_events enable row level security;

drop policy if exists "operators_read_threshold_alert_events" on public.threshold_alert_events;
create policy "operators_read_threshold_alert_events"
  on public.threshold_alert_events for select to authenticated
  using (public.is_operator());

revoke all on table public.threshold_alert_events from anon;
grant select on table public.threshold_alert_events to authenticated;
grant all on table public.threshold_alert_events to service_role;
