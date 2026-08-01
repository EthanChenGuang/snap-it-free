-- One conversation per listing for FCFS (CR-04)

create unique index if not exists conversations_one_per_listing
  on public.conversations (listing_id);
