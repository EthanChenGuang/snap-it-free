-- Operator decision: pause Facebook Marketplace scraping until proxy/session strategy is ready.
-- Keeps session_enc + target_urls for future re-enable; blocks cron and manual worker runs.

UPDATE public.scraper_sources
SET
  implementation_status = 'coming_soon',
  enabled = false
WHERE slug = 'facebook';
