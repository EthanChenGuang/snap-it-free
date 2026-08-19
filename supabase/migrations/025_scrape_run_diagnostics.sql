-- Run diagnostics: trigger, job link, URL snapshot, per-URL breakdown (admin run detail)

alter table public.scrape_runs
  add column if not exists trigger_type text check (trigger_type in ('cron', 'manual')),
  add column if not exists job_id uuid references public.scrape_jobs(id),
  add column if not exists target_urls_snapshot text[],
  add column if not exists blocked_url_count int not null default 0,
  add column if not exists url_breakdown jsonb;

create index if not exists scrape_runs_started_at_idx
  on public.scrape_runs (started_at desc);
