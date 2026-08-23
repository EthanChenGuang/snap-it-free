-- Per-source opt-in for using the shared Proxy URL.
-- Subito defaults direct; Vinted defaults to the globally configured proxy.

ALTER TABLE public.scraper_sources
  ADD COLUMN IF NOT EXISTS use_proxy_url boolean NOT NULL DEFAULT false;

UPDATE public.scraper_sources
SET use_proxy_url = false
WHERE slug = 'subito';

UPDATE public.scraper_sources
SET use_proxy_url = true
WHERE slug = 'vinted';

COMMENT ON COLUMN public.scraper_sources.use_proxy_url IS
  'When true, this source uses scraper_global_config.proxy_enc / PROXY_URL; when false it crawls direct.';
