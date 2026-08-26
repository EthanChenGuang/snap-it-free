-- Pause Wallapop scraping (proxy cost / CloudFront blocks; D-25-02 deferred)

update public.scraper_sources
set
  implementation_status = 'coming_soon',
  enabled = false,
  use_proxy_url = false
where slug = 'wallapop';

update public.scrape_jobs
set
  status = 'skipped',
  message = 'Source paused (Wallapop proxy cost)',
  completed_at = now()
where source_slug = 'wallapop'
  and status = 'pending';
