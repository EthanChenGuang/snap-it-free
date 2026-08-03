// Measurement tool for quick task 260803-whr.
// Prints location-free diagnostics only — never echoes keys or seller fields.
//
// Run: cd scraper && node --import tsx scripts/check-visible-listings.mjs
// Exit non-zero when fewer than 5 Subito rows are visible in listings_public.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const MIN_VISIBLE_SUBITO = 5;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count: publicSubito, error: e1 } = await supabase
  .from('listings_public')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito');

if (e1) {
  console.error('listings_public subito count failed:', e1.message);
  process.exit(2);
}

const { count: publicTotal, error: e2 } = await supabase
  .from('listings_public')
  .select('id', { count: 'exact', head: true });

if (e2) {
  console.error('listings_public total count failed:', e2.message);
  process.exit(2);
}

const { count: activeSubito, error: e3 } = await supabase
  .from('listings')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito')
  .eq('status', 'active');

if (e3) {
  console.error('listings active subito count failed:', e3.message);
  process.exit(2);
}

const { count: activeSubitoWithZone, error: e4 } = await supabase
  .from('listings')
  .select('id', { count: 'exact', head: true })
  .eq('source', 'subito')
  .eq('status', 'active')
  .not('zone', 'is', null);

if (e4) {
  console.error('listings active subito with zone count failed:', e4.message);
  process.exit(2);
}

const visibleSubito = publicSubito ?? 0;
console.log(`visible_subito_in_listings_public=${visibleSubito}`);
console.log(`visible_total_in_listings_public=${publicTotal ?? 0}`);
console.log(`active_subito_in_listings=${activeSubito ?? 0}`);
console.log(`active_subito_with_zone=${activeSubitoWithZone ?? 0}`);

if (visibleSubito < MIN_VISIBLE_SUBITO) {
  console.error(
    `FAIL: visible Subito rows ${visibleSubito} < minimum ${MIN_VISIBLE_SUBITO}`,
  );
  process.exit(1);
}

console.log('PASS');
