-- Phase 3 remote apply bundle: 006 → 007 → 008 → 009
-- Safe to re-run where statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT.
-- Requires: migrations 001–005 already applied (listings table exists).

\i supabase/migrations/006_listings_public_view.sql
\i supabase/migrations/007_ugc_messaging_reports.sql
\i supabase/migrations/008_messaging_fcfs.sql
\i supabase/migrations/009_report_auto_hide_trigger.sql
