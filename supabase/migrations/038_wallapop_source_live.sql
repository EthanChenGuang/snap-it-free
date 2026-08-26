-- Quick task: activate Wallapop scraper (D-25-02 spike-gated)
-- listing_source enum + live source row with proxy + Venice €0 search seeds

alter type listing_source add value if not exists 'wallapop';

update public.scraper_sources
set
  implementation_status = 'live',
  use_proxy_url = true,
  enabled = true,
  target_urls = array[
    'https://it.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155&distance_in_km=15',
    'https://it.wallapop.com/app/search?keywords=regalo&latitude=45.4408&longitude=12.3155&distance_in_km=15',
    'https://it.wallapop.com/app/search?keywords=free&latitude=45.4408&longitude=12.3155&distance_in_km=15',
    'https://it.wallapop.com/app/search?latitude=45.4408&longitude=12.3155&distance_in_km=15'
  ]
where slug = 'wallapop';
