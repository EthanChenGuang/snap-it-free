-- Operator quota visibility: DB + table sizes + ugc-photos storage (Free tier monitoring)

create or replace function public.get_quota_usage_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'captured_at', to_jsonb(timezone('utc', now())),
    'database_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'table', c.relname,
            'bytes', pg_total_relation_size(c.oid),
            'estimated_rows', greatest(c.reltuples::bigint, 0)
          )
          order by pg_total_relation_size(c.oid) desc
        ),
        '[]'::jsonb
      )
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
    ),
    'storage', jsonb_build_object(
      'bucket', 'ugc-photos',
      'object_count', (
        select count(*)::bigint
        from storage.objects o
        where o.bucket_id = 'ugc-photos'
      ),
      'bytes', (
        select coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
        from storage.objects o
        where o.bucket_id = 'ugc-photos'
      )
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_quota_usage_snapshot() from public;
grant execute on function public.get_quota_usage_snapshot() to service_role;
