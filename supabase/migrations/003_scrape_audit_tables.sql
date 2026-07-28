create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success', 'failed', 'partial')),
  listings_found int not null default 0,
  listings_inserted int not null default 0,
  listings_updated int not null default 0,
  listings_skipped int not null default 0,
  listings_rejected int not null default 0,
  failure_reason text,
  selector_hit_rate numeric(4,3)
);

create table public.scrape_rejects (
  id uuid primary key default gen_random_uuid(),
  scrape_run_id uuid references public.scrape_runs(id),
  external_id text,
  reject_reason text not null,
  raw_snippet jsonb not null,
  created_at timestamptz not null default now()
);
