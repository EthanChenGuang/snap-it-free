-- Phase 17 Plan 05: flip Vinted source to live with category catalog seeds (D-17-09, D-17-34, D-17-35)
-- Replaces migration 018 keyword search_text=gratis/regalo seeds with 34 URL matrix.
-- Note: numbered 029 because 025_scrape_run_diagnostics.sql already exists.

UPDATE public.scraper_sources
SET
  implementation_status = 'live',
  enabled = false,
  crawl_interval_minutes = 90,
  target_urls = array[
    'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3474-piccoli-elettrodomestici-da-cucina?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/1193-bambini?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/1904-donna?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/2319-libri?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3584-accessori-per-computer?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/1907-giardino-e-bricolage?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/4332-sport-e-tempo-libero?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/2922-collezionismo?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/4376-ciclismo?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3605-audio-cuffie-e-hi-fi?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3661-telefoni?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/2931-musica-e-media?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3598-fotocamere?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/3560-videogiochi-e-console?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/2904-animali?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/1904-donna?order=newest_first&city=venezia',
    'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3474-piccoli-elettrodomestici-da-cucina?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/1193-bambini?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/1904-donna?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/2319-libri?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3584-accessori-per-computer?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/1907-giardino-e-bricolage?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/4332-sport-e-tempo-libero?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/2922-collezionismo?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/4376-ciclismo?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3605-audio-cuffie-e-hi-fi?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3661-telefoni?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/2931-musica-e-media?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3598-fotocamere?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/3560-videogiochi-e-console?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/2904-animali?order=newest_first&city=padova',
    'https://www.vinted.it/catalog/1904-donna?order=newest_first&city=padova'
  ]::text[]
WHERE slug = 'vinted';
