-- Prevent owners from mutating server-managed moderation fields (CR-01)

create or replace function public.enforce_ugc_owner_update()
returns trigger
language plpgsql
as $$
begin
  if new.report_count is distinct from old.report_count
     or new.hidden_reason is distinct from old.hidden_reason
     or (old.status = 'hidden' and new.status <> old.status)
  then
    raise exception 'Moderation fields are server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists ugc_owner_update_guard on public.listings;

create trigger ugc_owner_update_guard
  before update on public.listings
  for each row
  when (old.source = 'ugc' and old.owner_user_id = auth.uid())
  execute function public.enforce_ugc_owner_update();
