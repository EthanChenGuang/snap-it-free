-- Phase 15: crawl-layer hash, scrape_runs efficiency metrics, global crawl config, job crawl_mode
-- SCRP-E02, SCRP-E03, SCRP-E07 (D-15-06, D-15-08, D-15-23, D-15-27)

-- listings: crawl-layer hash for early-stop (D-15-06, D-15-25)
alter table public.listings
  add column if not exists crawl_content_hash text;

create index if not exists listings_source_crawl_hash_idx
  on public.listings (source, external_id)
  include (crawl_content_hash);

-- scrape_runs metrics (D-15-27, SCRP-E07)
alter table public.scrape_runs
  add column if not exists listings_skipped_at_crawl int not null default 0,
  add column if not exists http_requests int,
  add column if not exists wall_time_seconds numeric(10,2),
  add column if not exists crawl_mode text check (crawl_mode in ('incremental', 'full')),
  add column if not exists degraded boolean not null default false,
  add column if not exists json_field_completeness numeric(4,3);

-- Typed columns match existing scraper_global_config style (D-15-27)
alter table public.scraper_global_config
  add column if not exists early_stop_k int not null default 5
    check (early_stop_k between 1 and 50),
  add column if not exists full_refresh_hours int not null default 24
    check (full_refresh_hours between 1 and 168),
  add column if not exists max_pages int not null default 1
    check (max_pages between 1 and 3),
  add column if not exists last_full_refresh_at timestamptz,
  add column if not exists last_block_reason text,
  add column if not exists degraded_run_count int not null default 0;

-- Full crawl trigger via jobs (D-15-08, D-15-32)
alter table public.scrape_jobs
  add column if not exists crawl_mode text not null default 'incremental'
    check (crawl_mode in ('incremental', 'full'));
