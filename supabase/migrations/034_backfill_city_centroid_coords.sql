-- Backfill city bbox-center coords for Subito listings hidden by listings_public D-28.
-- Venice zone-tagged rows are unchanged; rows with existing coords are unchanged.

update public.listings
set
  lat = case city
    when 'venezia' then 45.35
    when 'padova' then 45.4
    when 'milano' then 45.45
    when 'firenze' then 43.775
    when 'roma' then 41.9
    when 'napoli' then 40.85
    when 'perugia' then 43.11
    when 'torino' then 45.05
    when 'prato' then 43.885
  end,
  lng = case city
    when 'venezia' then 12.35
    when 'padova' then 11.85
    when 'milano' then 9.15
    when 'firenze' then 11.25
    when 'roma' then 12.5
    when 'napoli' then 14.275
    when 'perugia' then 12.4
    when 'torino' then 7.7
    when 'prato' then 11.1
  end
where status = 'active'
  and source = 'subito'
  and zone is null
  and lat is null
  and lng is null
  and city in (
    'venezia',
    'padova',
    'milano',
    'firenze',
    'roma',
    'napoli',
    'perugia',
    'torino',
    'prato'
  );
