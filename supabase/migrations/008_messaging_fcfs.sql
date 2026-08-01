-- FCFS check bypasses participant-only conversation RLS (D-75, D-87)

create or replace function public.listing_has_other_buyer_conversation(
  p_listing_id uuid,
  p_buyer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations
    where listing_id = p_listing_id
      and buyer_user_id <> p_buyer_id
  );
$$;

grant execute on function public.listing_has_other_buyer_conversation(uuid, uuid) to authenticated;
