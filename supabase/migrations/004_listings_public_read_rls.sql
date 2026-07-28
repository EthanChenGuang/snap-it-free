-- Public anon read: active, non-expired listings only (D-37, D-40)
-- App layer additionally filters zone IS NOT NULL (D-36)

alter table public.listings enable row level security;

grant select on public.listings to anon;
grant select on public.listings to authenticated;

create policy "public_read_active_non_expired"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  and expires_at > now()
);
