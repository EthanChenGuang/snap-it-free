-- Allow operators to read scrape audit tables in admin console (runs + rejects pages).
-- Worker writes via service_role (bypasses RLS); admin reads via authenticated operator session.

alter table public.scrape_runs enable row level security;
alter table public.scrape_rejects enable row level security;

drop policy if exists "operators_read_scrape_runs" on public.scrape_runs;
create policy "operators_read_scrape_runs"
  on public.scrape_runs for select to authenticated
  using (public.is_operator());

drop policy if exists "operators_read_scrape_rejects" on public.scrape_rejects;
create policy "operators_read_scrape_rejects"
  on public.scrape_rejects for select to authenticated
  using (public.is_operator());
