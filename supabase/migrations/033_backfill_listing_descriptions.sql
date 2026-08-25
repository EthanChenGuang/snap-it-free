-- Backfill scraped listing descriptions from raw_payload for detail page display

update public.listings
set description = nullif(trim(raw_payload->>'description'), '')
where description is null
  and raw_payload ? 'description'
  and length(trim(raw_payload->>'description')) > 0;
