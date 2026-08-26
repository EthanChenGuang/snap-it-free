-- Vinted scraper default: paused (enabled=false). Drain stale pending jobs so Fly worker
-- does not pick them up after operator disables the source.

UPDATE public.scraper_sources
SET enabled = false
WHERE slug = 'vinted';

UPDATE public.scrape_jobs
SET
  status = 'skipped',
  message = 'Source disabled (Vinted default paused)',
  completed_at = now()
WHERE source_slug = 'vinted'
  AND status = 'pending';
