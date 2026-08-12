-- Translation API usage log — real token counts and cost per successful call

create table public.translation_usage_log (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  provider text not null check (provider in ('gemini', 'openrouter')),
  model text not null,
  input_tokens int not null check (input_tokens >= 0),
  output_tokens int not null check (output_tokens >= 0),
  cost_usd numeric(12, 6) not null check (cost_usd >= 0),
  duration_ms int check (duration_ms is null or duration_ms >= 0),
  source text not null default 'retry'
    check (source in ('retry', 'ingest', 'rescue', 'backfill')),
  created_at timestamptz not null default now()
);

create index translation_usage_log_created_at_idx
  on public.translation_usage_log (created_at desc);

create index translation_usage_log_listing_id_idx
  on public.translation_usage_log (listing_id)
  where listing_id is not null;

alter table public.translation_usage_log enable row level security;

create policy "operators_read_translation_usage_log"
  on public.translation_usage_log for select to authenticated
  using (public.is_operator());

-- Service role (scraper / admin retry) bypasses RLS for inserts.

create or replace function public.get_translation_cost_summary()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with bounds as (
    select
      date_trunc('month', timezone('utc', now())) as month_start,
      date_trunc('day', timezone('utc', now())) as day_start,
      date_trunc('month', timezone('utc', now())) - interval '1 month' as last_month_start
  ),
  month_agg as (
    select
      coalesce(sum(l.cost_usd), 0)::numeric as month_total_usd,
      coalesce(sum(l.input_tokens + l.output_tokens), 0)::bigint as total_tokens,
      count(*)::int as translated_this_month
    from public.translation_usage_log l, bounds b
    where l.created_at >= b.month_start
  ),
  today_agg as (
    select
      coalesce(sum(l.cost_usd), 0)::numeric as today_usd,
      count(*)::int as translations_today
    from public.translation_usage_log l, bounds b
    where l.created_at >= b.day_start
  ),
  last_month_agg as (
    select coalesce(sum(l.cost_usd), 0)::numeric as last_month_usd
    from public.translation_usage_log l, bounds b
    where l.created_at >= b.last_month_start
      and l.created_at < b.month_start
  ),
  provider_agg as (
    select
      l.provider,
      coalesce(sum(l.cost_usd), 0)::numeric as cost_usd,
      count(*)::int as call_count
    from public.translation_usage_log l, bounds b
    where l.created_at >= b.month_start
    group by l.provider
  ),
  latest_model as (
    select l.model
    from public.translation_usage_log l
    order by l.created_at desc
    limit 1
  )
  select jsonb_build_object(
    'month_total_usd', (select month_total_usd from month_agg),
    'today_usd', (select today_usd from today_agg),
    'total_tokens', (select total_tokens from month_agg),
    'translated_this_month', (select translated_this_month from month_agg),
    'translations_today', (select translations_today from today_agg),
    'last_month_usd', (select last_month_usd from last_month_agg),
    'providers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'provider', p.provider,
            'cost_usd', p.cost_usd,
            'call_count', p.call_count
          )
          order by p.cost_usd desc
        )
        from provider_agg p
      ),
      '[]'::jsonb
    ),
    'latest_model', (select model from latest_model)
  );
$$;

revoke execute on function public.get_translation_cost_summary() from anon;
grant execute on function public.get_translation_cost_summary() to authenticated;
