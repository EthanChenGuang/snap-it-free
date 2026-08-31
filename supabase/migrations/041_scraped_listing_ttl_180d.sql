-- Extend scraped listing feed visibility from 30 to 180 days (6 months).
-- Re-activates TTL-expired rows still within the new window.

update public.listings
set
  expires_at = posted_at + interval '180 days',
  status = 'active'
where source <> 'ugc'
  and posted_at > now() - interval '180 days'
  and (
    status = 'expired'
    or expires_at < posted_at + interval '180 days'
  );
