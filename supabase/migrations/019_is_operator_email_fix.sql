-- Fix is_operator() when OAuth JWT omits top-level email claim (Google, etc.)
create or replace function public.is_operator()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.operator_allowlist o
    where lower(o.email) = lower(
      coalesce(
        nullif(auth.jwt() ->> 'email', ''),
        (select u.email from auth.users u where u.id = auth.uid())
      )
    )
  );
$$;

revoke execute on function public.is_operator() from anon;
grant execute on function public.is_operator() to authenticated;
