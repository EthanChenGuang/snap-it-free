-- Phase 14: user notification prefs (DND quiet hours) + delete_account_data RPC (D-09/D-10/D-11)

-- Section 1: per-user quiet-hours table (D-01, mirrors 017_user_locale.sql RLS pattern)
create table public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dnd_enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  updated_at timestamptz not null default now()
);

alter table public.user_notification_prefs enable row level security;

create policy "notification_prefs_select_own"
  on public.user_notification_prefs for select to authenticated
  using (user_id = auth.uid());

create policy "notification_prefs_insert_own"
  on public.user_notification_prefs for insert to authenticated
  with check (user_id = auth.uid());

create policy "notification_prefs_update_own"
  on public.user_notification_prefs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Section 2: hard-delete RPC for non-cascading app tables (D-09/D-10/D-11)
create or replace function public.delete_account_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- D-10: buyer-side conversations on listings the user does not own
  delete from public.conversations where buyer_user_id = target_user_id;

  -- D-11: reports filed by this user on listings they do not own
  delete from public.listing_reports where reporter_user_id = target_user_id;

  -- D-09: the user's own listings (cascades conversations/messages/listing_reports via 007 FKs)
  delete from public.listings where owner_user_id = target_user_id;
end;
$$;

revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
