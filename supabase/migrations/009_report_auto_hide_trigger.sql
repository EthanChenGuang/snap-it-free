-- Report counter increment + source-branching auto-hide via trigger only (D-80, D-81, D-86, 03-REVIEWS)
-- No GRANT EXECUTE to authenticated — prevents PostgREST RPC bypass of hide/increment

create or replace function public.handle_listing_report_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
  v_report_count int;
  v_threshold int;
begin
  update public.listings
  set report_count = report_count + 1
  where id = new.listing_id
  returning source::text, report_count into v_source, v_report_count;

  if v_source = 'ugc' then
    v_threshold := 3;
  else
    v_threshold := 2;
  end if;

  if v_report_count >= v_threshold then
    update public.listings
    set
      status = 'hidden',
      hidden_reason = case
        when v_source = 'ugc' then 'pending_review'
        else 'community_reports'
      end
    where id = new.listing_id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_listing_report_after_insert() from public;

drop trigger if exists listing_report_after_insert on public.listing_reports;

create trigger listing_report_after_insert
  after insert on public.listing_reports
  for each row
  execute function public.handle_listing_report_after_insert();
