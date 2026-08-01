-- Bind seller_user_id to listing owner on conversation insert (CR-03)

drop policy if exists "conversation_insert_buyer" on public.conversations;

create policy "conversation_insert_buyer"
  on public.conversations for insert to authenticated
  with check (
    buyer_user_id = auth.uid()
    and seller_user_id = (
      select l.owner_user_id
      from public.listings l
      where l.id = listing_id
        and l.source = 'ugc'
    )
  );
