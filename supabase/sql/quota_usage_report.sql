-- Manual quota report (Supabase Dashboard → SQL Editor, or psql).
-- Same data as get_quota_usage_snapshot() RPC used by Admin + report-quota-usage script.

select public.get_quota_usage_snapshot() as snapshot;

-- Or run the pieces separately:

-- Total database size (Free tier limit: 500 MB)
select pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Per-table sizes (public schema)
select
  c.relname as table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  pg_total_relation_size(c.oid) as total_bytes,
  greatest(c.reltuples::bigint, 0) as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;

-- UGC photo storage (Free tier limit: 1 GB)
select
  count(*) as object_count,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as storage_size,
  coalesce(sum((metadata->>'size')::bigint), 0) as storage_bytes
from storage.objects
where bucket_id = 'ugc-photos';
