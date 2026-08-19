-- Fix anon/authenticated read through listings_public (WR-05)
-- security_invoker requires SELECT on base table listings, which anon lacks after 006.

alter view public.listings_public set (security_invoker = false);
