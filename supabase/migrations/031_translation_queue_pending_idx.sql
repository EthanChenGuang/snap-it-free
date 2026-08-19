-- Translation queue only ever reads the pending/failed backlog ordered by updated_at.
-- Without this index both the count and the list degrade to a full scan + sort as the
-- backlog grows (964 rows already ~100ms each on the admin translation page).

create index if not exists translation_queue_status_updated_at_idx
  on public.translation_queue (status, updated_at desc);

-- Monthly translated-listing counts filter on scraped_at with title_en present.
create index if not exists listings_translated_scraped_at_idx
  on public.listings (scraped_at desc)
  where title_en is not null;
