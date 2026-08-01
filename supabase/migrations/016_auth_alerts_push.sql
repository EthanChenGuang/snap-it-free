-- Phase 4: auth alerts, push subscriptions, listing_events outbox, alert_matches (D-95, D-98, D-103, D-112)
-- INSERT trigger on listings ships in Plan 05 (D-106)

-- user_favorites (D-95)
create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.user_favorites enable row level security;

create policy "favorites_select_own"
  on public.user_favorites for select to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.user_favorites for insert to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.user_favorites for delete to authenticated
  using (user_id = auth.uid());

-- alerts (D-98)
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text,
  zone venice_zone,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (keyword is not null or zone is not null)
);

create index alerts_user_enabled_idx on public.alerts (user_id) where enabled = true;

alter table public.alerts enable row level security;

create policy "alerts_select_own"
  on public.alerts for select to authenticated
  using (user_id = auth.uid());

create policy "alerts_insert_own"
  on public.alerts for insert to authenticated
  with check (user_id = auth.uid());

create policy "alerts_update_own"
  on public.alerts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "alerts_delete_own"
  on public.alerts for delete to authenticated
  using (user_id = auth.uid());

-- push_subscriptions (D-103)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- listing_events outbox (D-106 prep — trigger in Plan 05)
create table public.listing_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index listing_events_pending_idx
  on public.listing_events (created_at)
  where status = 'pending';

alter table public.listing_events enable row level security;

-- alert_matches (D-112)
create table public.alert_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, alert_id, listing_id)
);

alter table public.alert_matches enable row level security;

create policy "alert_matches_select_own"
  on public.alert_matches for select to authenticated
  using (user_id = auth.uid());

create policy "alert_matches_update_own"
  on public.alert_matches for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- D-106/D-100: INSERT-only outbox enqueue (scraper upsert UPDATE path does not fire)
create or replace function public.enqueue_listing_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.expires_at > now() then
    insert into public.listing_events (listing_id, status)
    values (new.id, 'pending');
  end if;
  return new;
end;
$$;

create trigger listings_insert_event
  after insert on public.listings
  for each row execute function public.enqueue_listing_event();
