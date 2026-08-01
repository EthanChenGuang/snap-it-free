-- Guard UGC lifecycle status transitions (WR-03)

create or replace function public.enforce_ugc_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.source = 'ugc' and new.status is distinct from old.status then
    if new.status = 'claimed' and old.status <> 'active' then
      raise exception 'Can only reserve active listings';
    end if;
    if new.status = 'expired' and old.status not in ('active', 'claimed') then
      raise exception 'Can only mark active or claimed listings as delivered';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ugc_status_transition_guard on public.listings;

create trigger ugc_status_transition_guard
  before update on public.listings
  for each row
  when (old.source = 'ugc')
  execute function public.enforce_ugc_status_transition();
