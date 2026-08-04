-- Phase 6: scraper admin control plane (D-02, D-28, D-32, D-44, D-08, D-51, D-52)
-- Note: numbered 018 because 017_user_locale.sql (Phase 5) already exists.

-- ---------------------------------------------------------------------------
-- Operator allowlist (D-28)
-- ---------------------------------------------------------------------------
create table public.operator_allowlist (
  email text primary key check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.operator_allowlist enable row level security;

-- ---------------------------------------------------------------------------
-- is_operator() security definer (D-02)
-- ---------------------------------------------------------------------------
create or replace function public.is_operator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.operator_allowlist o
    where lower(o.email) = lower((select auth.jwt() ->> 'email'))
  );
$$;

revoke execute on function public.is_operator() from anon;
grant execute on function public.is_operator() to authenticated;

create policy "operators_manage_allowlist"
  on public.operator_allowlist for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- Bootstrap: insert operator emails after apply, e.g.:
--   insert into public.operator_allowlist (email) values ('ops@example.com');
-- Set OPERATOR_BOOTSTRAP_EMAILS in .env.example and seed manually or via SQL editor.

-- ---------------------------------------------------------------------------
-- Global scraper config singleton
-- ---------------------------------------------------------------------------
create table public.scraper_global_config (
  id int primary key default 1 check (id = 1),
  global_pause boolean not null default false,
  auto_translate boolean not null default true,
  daily_translation_cap int not null default 500,
  translation_provider text not null default 'gemini'
    check (translation_provider in ('gemini', 'openrouter')),
  telegram_chat_id text,
  alert_email text,
  proxy_enc jsonb,
  translations_today int not null default 0,
  translations_reset_date date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table public.scraper_global_config enable row level security;

create policy "operators_manage_global_config"
  on public.scraper_global_config for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

insert into public.scraper_global_config (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Per-source configuration (D-08, D-09, D-13)
-- ---------------------------------------------------------------------------
create table public.scraper_sources (
  slug text primary key,
  display_name text not null,
  implementation_status text not null
    check (implementation_status in ('live', 'coming_soon')),
  enabled boolean not null default false,
  interval_minutes int not null check (interval_minutes between 30 and 1440),
  anti_block_preset text not null default 'standard'
    check (anti_block_preset in ('conservative', 'standard', 'aggressive')),
  target_urls text[] not null default '{}',
  next_run_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.scraper_sources enable row level security;

create policy "operators_manage_sources"
  on public.scraper_sources for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- ---------------------------------------------------------------------------
-- Manual run queue (D-19, D-33)
-- ---------------------------------------------------------------------------
create table public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null references public.scraper_sources(slug),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  requested_at timestamptz not null default now(),
  requested_by uuid references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  message text
);

create index scrape_jobs_pending_idx
  on public.scrape_jobs (requested_at)
  where status = 'pending';

alter table public.scrape_jobs enable row level security;

create policy "operators_manage_scrape_jobs"
  on public.scrape_jobs for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- ---------------------------------------------------------------------------
-- Translation retry queue (D-27)
-- ---------------------------------------------------------------------------
create table public.translation_queue (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'done')),
  attempts int not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.translation_queue enable row level security;

create policy "operators_manage_translation_queue"
  on public.translation_queue for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- ---------------------------------------------------------------------------
-- Audit + listing extensions (D-32, D-44)
-- ---------------------------------------------------------------------------
alter table public.scrape_runs
  add column if not exists source text not null default 'subito';

update public.scrape_runs set source = 'subito' where source is null;

alter table public.listings
  add column if not exists title_en text,
  add column if not exists title_zh text,
  add column if not exists description_en text,
  add column if not exists description_zh text,
  add column if not exists category text,
  add column if not exists category_en text,
  add column if not exists category_zh text;

-- ---------------------------------------------------------------------------
-- Seed sources (D-52 default URLs)
-- Subito URLs from scraper/src/subito/categories.ts (Phase 1 Venice regalo)
-- ---------------------------------------------------------------------------
insert into public.scraper_sources (
  slug, display_name, implementation_status, enabled,
  interval_minutes, anti_block_preset, target_urls, next_run_at
) values
(
  'subito',
  'Subito',
  'live',
  true,
  90,
  'standard',
  array[
    'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
    'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/venezia/venezia/',
    'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/venezia/venezia/'
  ],
  now()
),
(
  'facebook',
  'Facebook Marketplace',
  'coming_soon',
  false,
  90,
  'conservative',
  array[
    'https://www.facebook.com/marketplace/venice/search?query=gratis',
    'https://www.facebook.com/marketplace/venice/search?query=regalo',
    'https://www.facebook.com/marketplace/venice/search?query=free'
  ],
  null
),
(
  'vinted',
  'Vinted',
  'coming_soon',
  false,
  90,
  'standard',
  array[
    'https://www.vinted.it/catalog?search_text=gratis',
    'https://www.vinted.it/catalog?search_text=regalo',
    'https://www.vinted.it/catalog?search_text=0+euro'
  ],
  null
),
(
  'wallapop',
  'Wallapop',
  'coming_soon',
  false,
  90,
  'standard',
  array[
    'https://www.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155',
    'https://www.wallapop.com/app/search?keywords=regalo&latitude=45.4408&longitude=12.3155',
    'https://www.wallapop.com/app/search?keywords=free&latitude=45.4408&longitude=12.3155'
  ],
  null
),
(
  'ebay',
  'eBay.it',
  'coming_soon',
  false,
  90,
  'standard',
  array[
    'https://www.ebay.it/sch/i.html?_nkw=gratis&_stpos=30100&_sadis=15&LH_FS=1&_sop=10',
    'https://www.ebay.it/sch/i.html?_nkw=regalo&_stpos=30100&_sadis=15&LH_FS=1&_sop=10',
    'https://www.ebay.it/sch/i.html?_nkw=free&_stpos=30100&_sadis=15&LH_FS=1&_sop=10'
  ],
  null
)
on conflict (slug) do nothing;
