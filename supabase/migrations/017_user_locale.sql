-- Phase 5: user locale storage (D-129)
-- profiles.language is source of truth; push_subscriptions.locale copied on subscribe and sync

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'zh' check (language in ('zh', 'en', 'it')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.push_subscriptions
  add column locale text not null default 'zh' check (locale in ('zh', 'en', 'it'));

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
