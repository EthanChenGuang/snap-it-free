// Padova visibility gate for Phase 8 SC3.
// Prints location-free diagnostics only — never echoes keys or seller fields.
//
// Run: cd scraper && node --import tsx scripts/check-padova-visible.mjs
// Exit non-zero when no Padova Subito rows with coords are visible in listings_public.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const MIN_VISIBLE_PADOVA = 1;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count: visiblePadova, error: e1 } = await supabase
  .from('listings_public')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito')
  .eq('city', 'padova')
  .not('lat', 'is', null)
  .not('lng', 'is', null);

if (e1) {
  console.error('listings_public padova count failed:', e1.message);
  process.exit(2);
}

const { count: padovaAnyCoords, error: e2 } = await supabase
  .from('listings')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito')
  .eq('city', 'padova')
  .eq('status', 'active')
  .not('lat', 'is', null)
  .not('lng', 'is', null);

if (e2) {
  console.error('listings active padova with coords count failed:', e2.message);
  process.exit(2);
}

const { count: padovaNoCoords, error: e3 } = await supabase
  .from('listings')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito')
  .eq('city', 'padova')
  .eq('status', 'active')
  .or('lat.is.null,lng.is.null');

if (e3) {
  console.error('listings active padova missing coords count failed:', e3.message);
  process.exit(2);
}

const visible = visiblePadova ?? 0;
console.log(`visible_padova_in_listings_public=${visible}`);
console.log(`active_padova_with_coords_in_listings=${padovaAnyCoords ?? 0}`);
console.log(`active_padova_missing_coords_in_listings=${padovaNoCoords ?? 0}`);

if (visible < MIN_VISIBLE_PADOVA) {
  console.error(
    `FAIL: visible Padova rows ${visible} < minimum ${MIN_VISIBLE_PADOVA}`,
  );
  process.exit(1);
}

console.log('PASS');
