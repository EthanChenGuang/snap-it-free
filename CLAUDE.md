# CLAUDE.md

## Working with the owner

- **When asking the owner for any information, credential, or setting, always include a
  direct clickable URL to the exact page where they can find it** (logged-in dashboard deep
  link, not a docs page). Examples:
  - Supabase API keys: https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/api-keys
  - Supabase usage / plan: https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/billing/usage
  - Supabase SQL editor: https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/sql/new
  - Supabase table editor: https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/editor
- Reply in Chinese (the owner writes in Chinese).
- Prefer the least-privileged credential that does the job (e.g. Supabase anon/publishable key
  for reads of public views) and say why.

## Product constraints

- **Never display watermarked listing photos.** Subito full-frame presets (`gallery-*`,
  `fullscreen-*`, `card-mobile-large-*`) burn the Subito logo in; only `*-new-*` card presets are
  watermark-free. See `lib/listings/subito-photo-url.ts` and its guard test.
- Listing images are hot-linked from the Subito CDN (native `<img>` / `unoptimized`), so they
  cost us no hosting or image-optimization fees. Anything that makes us host images ourselves
  (e.g. AI-processed photos) adds Supabase storage/egress cost — call that out.
