-- Enforce Venice bounds, zone, and post rate limit on direct UGC inserts (CR-02)

drop policy if exists "ugc_insert_own" on public.listings;

create policy "ugc_insert_own"
  on public.listings for insert to authenticated
  with check (
    source = 'ugc'
    and owner_user_id = auth.uid()
    and zone is not null
    and lat >= 45.0 and lat <= 45.7
    and lng >= 12.1 and lng <= 12.6
  );

create or replace function public.enforce_ugc_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if new.source <> 'ugc' then
    return new;
  end if;

  select count(*)::int into v_count
  from public.listings
  where source = 'ugc'
    and owner_user_id = new.owner_user_id
    and posted_at >= now() - interval '24 hours';

  if v_count >= 3 then
    raise exception 'Rate limit exceeded: max 3 posts per 24 hours';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ugc_post_rate_limit() from public;

drop trigger if exists ugc_post_rate_limit on public.listings;

create trigger ugc_post_rate_limit
  before insert on public.listings
  for each row
  when (new.source = 'ugc')
  execute function public.enforce_ugc_post_rate_limit();
