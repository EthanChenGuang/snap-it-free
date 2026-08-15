-- Phase 18 Plan 02: session_enc for operator Facebook cookies + 6-URL seed matrix (D-18-11/23/32)

ALTER TABLE public.scraper_sources
  ADD COLUMN IF NOT EXISTS session_enc jsonb;

COMMENT ON COLUMN public.scraper_sources.session_enc IS
  'AES-256-GCM encrypted Playwright storageState or cookie JSON (operator-managed FB session)';

UPDATE public.scraper_sources
SET
  implementation_status = 'live',
  enabled = false,
  interval_minutes = 90,
  anti_block_preset = 'conservative',
  target_urls = ARRAY[
    'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/venice/search/?query=regalo&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/venice/search/?query=free&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=gratis&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=regalo&sortBy=creation_time_descend',
    'https://www.facebook.com/marketplace/padova/search/?query=free&sortBy=creation_time_descend'
  ]
WHERE slug = 'facebook';
