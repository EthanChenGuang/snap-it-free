-- UGC columns, messaging/report tables, RLS, Storage bucket (D-54, D-66, D-87)

alter table public.listings
  add column if not exists owner_user_id uuid references auth.users(id),
  add column if not exists description text,
  add column if not exists reserved_at timestamptz,
  add column if not exists report_count int not null default 0,
  add column if not exists hidden_reason text;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_user_id uuid not null references auth.users(id),
  seller_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_user_id)
);

grant insert, update on public.listings to authenticated;

create policy "ugc_insert_own"
  on public.listings for insert to authenticated
  with check (
    source = 'ugc'
    and owner_user_id = auth.uid()
  );

create policy "ugc_update_own"
  on public.listings for update to authenticated
  using (owner_user_id = auth.uid() and source = 'ugc')
  with check (owner_user_id = auth.uid());

create policy "ugc_select_own"
  on public.listings for select to authenticated
  using (owner_user_id = auth.uid());

alter table public.conversations enable row level security;

create policy "conversation_select_participant"
  on public.conversations for select to authenticated
  using (buyer_user_id = auth.uid() or seller_user_id = auth.uid());

create policy "conversation_insert_buyer"
  on public.conversations for insert to authenticated
  with check (buyer_user_id = auth.uid());

alter table public.messages enable row level security;

create policy "message_select_participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

create policy "message_insert_participant"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

alter table public.listing_reports enable row level security;

create policy "report_insert_own"
  on public.listing_reports for insert to authenticated
  with check (reporter_user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('ugc-photos', 'ugc-photos', true)
on conflict (id) do nothing;

create policy "ugc_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ugc-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ugc_photos_select_public"
  on storage.objects for select to public
  using (bucket_id = 'ugc-photos');

create or replace view public.listings_public
with (security_invoker = true)
as
select
  id,
  source,
  title,
  photo_url,
  external_url,
  lat,
  lng,
  zone,
  posted_at,
  expires_at,
  status
from public.listings
where (
  (status = 'active' and expires_at > now())
  or (status = 'claimed' and source = 'ugc' and expires_at > now())
)
and zone is not null;

grant select on public.listings_public to anon, authenticated;
