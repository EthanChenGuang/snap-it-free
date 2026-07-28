-- SCRP-04 housekeeping: flip stale active rows to expired (D-41)
-- UI query-time filter (D-40) is authoritative for user visibility; this job is operator housekeeping only.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'expire-stale-listings',
  '0 3 * * *',
  $$
    update public.listings
    set status = 'expired'
    where status = 'active'
      and expires_at < now();
  $$
);
