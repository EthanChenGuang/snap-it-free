-- Alert city scope: consumer city keys (13 Italian cities), alongside legacy venice_zone.

alter table public.alerts
  add column if not exists city text;

alter table public.alerts
  drop constraint if exists alerts_keyword_or_zone_check;

alter table public.alerts
  drop constraint if exists alerts_check;

alter table public.alerts
  add constraint alerts_keyword_zone_or_city_check
  check (keyword is not null or zone is not null or city is not null);

create index if not exists alerts_user_city_idx
  on public.alerts (user_id, city)
  where city is not null and enabled = true;
