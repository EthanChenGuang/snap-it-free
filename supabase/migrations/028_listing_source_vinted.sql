-- Phase 17 (D-17-23): extend listing_source enum with 'vinted'.
-- One-way Postgres enum extension — removing the value later requires a migration.
-- Note: plan named this 024; that number is taken (024_scrape_runs_operator_rls.sql),
-- so it ships as 028 (next free).
alter type listing_source add value if not exists 'vinted';
