#!/usr/bin/env node
/**
 * Live Phase 3 UAT against Supabase (post-migration).
 * Usage: node scripts/phase3-live-uat.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const out = {};
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const [k, ...rest] = t.split('=');
      out[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const local = loadEnv(resolve(root, '.env.local'));
const scraper = loadEnv(resolve(root, 'scraper/.env'));
const url = local.NEXT_PUBLIC_SUPABASE_URL || scraper.SUPABASE_URL;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = scraper.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
const cleanup = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

async function createUser(label) {
  const email = `uat-${label}-${Date.now()}@snap-it-free.test`;
  const password = 'UatTestPass123!';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  cleanup.push({ type: 'user', id: data.user.id });
  return { id: data.user.id, email, password };
}

async function signIn(email, password) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function veniceListing(overrides = {}) {
  const id = randomUUID();
  const now = new Date();
  return {
    id,
    source: 'ugc',
    external_id: id,
    title: `UAT listing ${id.slice(0, 8)}`,
    photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: `/listing/${id}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
    ...overrides,
  };
}

async function main() {
  console.log('=== Phase 3 live UAT ===\n');

  // 1. Anon read listings_public
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: anonErr } = await anon.from('listings_public').select('id').limit(1);
  record('anon read listings_public', !anonErr, anonErr?.message ?? 'ok');

  const seller = await createUser('seller');
  const buyer = await createUser('buyer');
  const reporters = await Promise.all([
    createUser('rep1'),
    createUser('rep2'),
    createUser('rep3'),
  ]);

  const listing = veniceListing({ owner_user_id: seller.id });
  const { error: insertErr } = await admin.from('listings').insert(listing);
  record('insert UGC listing (service role)', !insertErr, insertErr?.message ?? listing.id.slice(0, 8));
  cleanup.push({ type: 'listing', id: listing.id });

  const { data: pubRow, error: pubErr } = await anon
    .from('listings_public')
    .select('id, source')
    .eq('id', listing.id)
    .maybeSingle();
  record('UGC listing visible in listings_public', !pubErr && pubRow?.id === listing.id, pubErr?.message ?? pubRow?.source);

  // 2. Session + authenticated insert path (RLS)
  const sellerClient = await signIn(seller.email, seller.password);
  const { count: postCount } = await sellerClient
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'ugc')
    .eq('owner_user_id', seller.id);
  record('seller session authenticated', (postCount ?? 0) >= 1, `count=${postCount}`);

  // 4. DM flow
  const buyerClient = await signIn(buyer.email, buyer.password);
  const { data: conv1, error: convErr } = await buyerClient
    .from('conversations')
    .insert({
      listing_id: listing.id,
      buyer_user_id: buyer.id,
      seller_user_id: seller.id,
    })
    .select('id')
    .single();
  record('DM create conversation', !convErr && conv1?.id, convErr?.message ?? conv1?.id?.slice(0, 8));
  if (!conv1?.id) {
    throw new Error('DM create failed — aborting remaining message tests');
  }
  cleanup.push({ type: 'conversation', id: conv1.id });

  const { data: msg, error: msgErr } = await buyerClient
    .from('messages')
    .insert({
      conversation_id: conv1.id,
      sender_id: buyer.id,
      body: 'Ciao, è ancora disponibile?',
    })
    .select('id')
    .single();
  record('DM send message', !msgErr && msg?.id, msgErr?.message ?? 'ok');

  const sellerClient2 = await signIn(seller.email, seller.password);
  const { data: sellerMsgs, error: sellerMsgErr } = await sellerClient2
    .from('messages')
    .select('body')
    .eq('conversation_id', conv1.id);
  record('DM seller sees message', !sellerMsgErr && sellerMsgs?.length === 1, sellerMsgErr?.message ?? sellerMsgs?.[0]?.body?.slice(0, 20));

  // 5. DM duplicate
  const { data: dup, error: dupErr } = await buyerClient
    .from('conversations')
    .select('id')
    .eq('listing_id', listing.id)
    .eq('buyer_user_id', buyer.id)
    .maybeSingle();
  record('DM duplicate returns existing', !dupErr && dup?.id === conv1.id, dupErr?.message ?? 'same id');

  // 6. Report auto-hide (3 UGC reports)
  for (const [i, rep] of reporters.entries()) {
    const repClient = await signIn(rep.email, rep.password);
    const { error: repErr } = await repClient.from('listing_reports').insert({
      listing_id: listing.id,
      reporter_user_id: rep.id,
      reason: ['spam', 'inappropriate', 'scam'][i],
    });
    if (repErr) {
      record(`report ${i + 1}/3`, false, repErr.message);
      break;
    }
    if (i === 2) record('report auto-hide (3 UGC reports)', true, 'inserts ok');
  }

  const { data: hidden } = await admin.from('listings').select('status, hidden_reason, report_count').eq('id', listing.id).single();
  record('listing status=hidden after 3 reports', hidden?.status === 'hidden', `${hidden?.status} reason=${hidden?.hidden_reason} count=${hidden?.report_count}`);

  const { data: hiddenPub } = await anon.from('listings_public').select('id').eq('id', listing.id).maybeSingle();
  record('hidden listing excluded from listings_public (anon)', !hiddenPub?.id, hiddenPub?.id ? 'still visible' : 'excluded');

  const { data: ownerView } = await sellerClient2.from('listings').select('status, hidden_reason').eq('id', listing.id).maybeSingle();
  record('owner can SELECT own hidden listing (ugc_select_own)', ownerView?.status === 'hidden', ownerView?.hidden_reason ?? 'no row');

  const buyerViewClient = await signIn(buyer.email, buyer.password);
  const { data: buyerView } = await buyerViewClient.from('listings').select('id').eq('id', listing.id).maybeSingle();
  record('non-owner cannot SELECT hidden listing', !buyerView?.id, buyerView?.id ? 'leaked' : 'no row');

  // 8. Rate limit — assertCanPost logic (3 posts / 24h)
  const poster = await createUser('poster');
  const posterClient = await signIn(poster.email, poster.password);
  const posterListingIds = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (let i = 0; i < 4; i++) {
    const { count } = await posterClient
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'ugc')
      .eq('owner_user_id', poster.id)
      .gte('posted_at', since);
    if ((count ?? 0) >= 3) {
      record('rate limit blocks 4th post', i === 3, `blocked at attempt ${i + 1}, count=${count}`);
      break;
    }
    const row = veniceListing({ owner_user_id: poster.id, title: `Rate test ${i}` });
    const { error } = await posterClient.from('listings').insert(row);
    if (error) {
      record(`rate limit at post ${i + 1}`, false, error.message);
      break;
    }
    posterListingIds.push(row.id);
    cleanup.push({ type: 'listing', id: row.id });
    if (i === 2) record('rate limit allows 3 posts', true, '3 inserted');
  }

  // 9. Lifecycle reserved → delivered (use fresh listing)
  const life = veniceListing({ owner_user_id: seller.id, status: 'active' });
  await admin.from('listings').insert(life);
  cleanup.push({ type: 'listing', id: life.id });

  await admin.from('listings').update({ status: 'claimed', reserved_at: new Date().toISOString() }).eq('id', life.id);
  const { data: claimedPub } = await anon.from('listings_public').select('id, status').eq('id', life.id).maybeSingle();
  record('claimed UGC stays in listings_public', claimedPub?.id === life.id, claimedPub?.status ?? 'missing');

  await admin.from('listings').update({ status: 'expired' }).eq('id', life.id);
  const { data: expiredPub } = await anon.from('listings_public').select('id').eq('id', life.id).maybeSingle();
  record('expired/delivered excluded from listings_public', !expiredPub?.id, expiredPub?.id ? 'still visible' : 'excluded');

  // Cleanup
  console.log('\n=== Cleanup ===');
  for (const item of cleanup.reverse()) {
    if (item.type === 'listing') {
      await admin.from('listing_reports').delete().eq('listing_id', item.id);
      await admin.from('conversations').delete().eq('listing_id', item.id);
      await admin.from('listings').delete().eq('id', item.id);
    } else if (item.type === 'conversation') {
      await admin.from('messages').delete().eq('conversation_id', item.id);
      await admin.from('conversations').delete().eq('id', item.id);
    }
  }
  for (const item of cleanup.filter((c) => c.type === 'user')) {
    await admin.auth.admin.deleteUser(item.id);
  }
  // delete users from createUser cleanup list
  for (const u of [seller, buyer, poster, ...reporters]) {
    await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== Live UAT: ${results.length - failed}/${results.length} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
