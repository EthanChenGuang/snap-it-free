-- Per-user daily cap for the contact assistant's translate API (phase 5).
-- Rows are written only through bump_contact_translation(); no client policies.

create table if not exists public.contact_translation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.contact_translation_usage enable row level security;

-- Counts one call for the signed-in user and reports whether it is within p_limit.
-- A caller passing a larger p_limit only raises their own counter; the API route
-- always checks with its own limit, so the cap cannot be bypassed.
create or replace function public.bump_contact_translation(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null or p_limit is null or p_limit < 1 then
    return false;
  end if;

  insert into public.contact_translation_usage as u (user_id, day, count)
  values (v_uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.bump_contact_translation(integer) from public, anon;
grant execute on function public.bump_contact_translation(integer) to authenticated;
