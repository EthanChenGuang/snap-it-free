-- One in-progress scrape_run per manual job (prevents duplicate "运行中" rows).
create unique index if not exists scrape_runs_active_job_id_idx
  on public.scrape_runs (job_id)
  where job_id is not null and finished_at is null;
