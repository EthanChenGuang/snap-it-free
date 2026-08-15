#!/usr/bin/env node
/**
 * Phase 17 autonomous UAT — migrations, admin source config, mixed feed, consumer contracts.
 * Usage: E2E_BASE_URL=http://localhost:3000 node scripts/phase17-uat-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

function loadEnv(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
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
const url = local.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = local.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const results = [];
const cleanup = { listings: [] };

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

function vintedListing(overrides = {}) {
  const id = randomUUID();
  const externalId = `uat-vinted-${Date.now()}`;
  const now = new Date();
  return {
    id,
    source: 'vinted',
    external_id: externalId,
    title: 'UAT Vinted free chair',
    title_en: 'UAT Vinted free chair',
    photo_url: 'https://images1.vinted.net/t/x/f800/1.jpeg?s=a',
    external_url: `https://www.vinted.it/items/${externalId}`,
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    city: 'venezia',
    category: 'casa',
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
    ...overrides,
  };
}

async function cleanupAll() {
  for (const id of cleanup.listings) {
    await admin.from('listings').delete().eq('id', id);
  }
}

async function main() {
  console.log(`=== Phase 17 UAT (${BASE}) ===\n`);

  // Migration 028 — enum
  const probe = vintedListing();
  const { error: enumErr } = await admin.from('listings').insert(probe).select('id').single();
  if (!enumErr) {
    cleanup.listings.push(probe.id);
    record('migration 028: listing_source includes vinted', true);
  } else {
    record('migration 028: listing_source includes vinted', false, enumErr.message);
  }

  // Migration 029 — admin source config
  const { data: source, error: srcErr } = await admin
    .from('scraper_sources')
    .select('implementation_status, enabled, interval_minutes, target_urls')
    .eq('slug', 'vinted')
    .maybeSingle();

  record(
    'migration 029: vinted source live + disabled default (D-17-34)',
    !srcErr && source?.implementation_status === 'live' && source?.enabled === false,
    srcErr?.message ?? `live=${source?.implementation_status} enabled=${source?.enabled}`,
  );
  record(
    'migration 029: 34 URL matrix seeded (D-17-19)',
    !srcErr && Array.isArray(source?.target_urls) && source.target_urls.length === 34,
    srcErr?.message ?? `count=${source?.target_urls?.length ?? 0}`,
  );
  record(
    'migration 029: 90 min interval (D-17-35)',
    !srcErr && source?.interval_minutes === 90,
    srcErr?.message ?? `interval=${source?.interval_minutes}`,
  );

  // Mixed feed — insert subito + vinted, verify chronological public read
  const subitoId = randomUUID();
  const vintedId = randomUUID();
  const now = new Date();
  const subitoRow = {
    id: subitoId,
    source: 'subito',
    external_id: `uat-subito-${Date.now()}`,
    title: 'UAT Subito lamp',
    photo_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    external_url: 'https://www.subito.it/annunci-veneto/regalo/uat-lamp.htm',
    lat: 45.434,
    lng: 12.338,
    geom: 'SRID=4326;POINT(12.338 45.434)',
    zone: 'centro_storico',
    status: 'active',
    posted_at: new Date(now.getTime() - 3600000).toISOString(),
    expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
    content_hash: randomUUID().replace(/-/g, ''),
  };
  const vintedRow = vintedListing({
    id: vintedId,
    posted_at: now.toISOString(),
  });

  const { error: mixInsertErr } = await admin.from('listings').insert([subitoRow, vintedRow]);
  if (!mixInsertErr) {
    cleanup.listings.push(subitoId, vintedId);
  }
  record('mixed feed seed insert', !mixInsertErr, mixInsertErr?.message ?? 'ok');

  const { data: feedRows, error: feedErr } = await anon
    .from('listings_public')
    .select('id, source, posted_at')
    .in('id', [subitoId, vintedId])
    .order('posted_at', { ascending: false });

  const hasVinted = feedRows?.some((r) => r.source === 'vinted');
  const hasSubito = feedRows?.some((r) => r.source === 'subito');
  record(
    'mixed feed: vinted + subito visible in listings_public (D-17-25)',
    !feedErr && hasVinted && hasSubito,
    feedErr?.message ?? `sources=${feedRows?.map((r) => r.source).join(',')}`,
  );

  // External URL allowlist contract
  const extUrlSrc = readFileSync(resolve(root, 'lib/listings/external-url.ts'), 'utf8');
  record(
    'external URL allowlist includes vinted.it (D-17-28)',
    /vinted\.it/.test(extUrlSrc),
    'vinted.it in external-url.ts',
  );

  // FilterSheet — no source filter (grep-style check via filesystem)
  const filterSrc = readFileSync(resolve(root, 'components/listings/FilterSheet.tsx'), 'utf8');
  record(
    'FilterSheet has no source-only filter (D-17-27)',
    !/source.*filter|filter.*source|sourceVinted/i.test(filterSrc),
    'no source filter match',
  );

  // Admin page SSR smoke (optional if dev server up; auth redirect is OK)
  try {
    const res = await fetch(`${BASE}/admin/sources/vinted`, { redirect: 'manual' });
    const html = res.status === 200 ? await res.text() : '';
    record(
      'admin /admin/sources/vinted responds',
      res.status === 200 || res.status === 307 || res.status === 308,
      `status=${res.status}`,
    );
    if (res.status === 200) {
      record(
        'admin page mentions Vinted matrix UI',
        /Vinted|vinted|catalog\/1918/i.test(html),
        html.includes('Vinted') || html.includes('vinted') ? 'found' : 'not in SSR html',
      );
    } else {
      record(
        'admin page auth redirect (operator login required for UI)',
        res.status === 307 || res.status === 308,
        'DB config verified above',
      );
    }
  } catch (e) {
    record('admin /admin/sources/vinted responds', false, e.message);
  }

  // Feed page smoke (retry — dev server may compile on first hit after DB writes)
  let feedOk = false;
  for (let attempt = 0; attempt < 3 && !feedOk; attempt++) {
    try {
      const res = await fetch(`${BASE}/`);
      feedOk = res.status === 200;
      if (feedOk) {
        record('feed home responds', true, `status=${res.status}`);
        break;
      }
      if (attempt === 2) record('feed home responds', false, `status=${res.status}`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      if (attempt === 2) record('feed home responds', false, e.message);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log('\n=== Summary ===');
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL: ${f.name} — ${f.detail}`);
    await cleanupAll();
    process.exit(1);
  }

  await cleanupAll();
  console.log('\nPhase 17 UAT: ALL PASSED');
}

main().catch(async (err) => {
  console.error(err);
  await cleanupAll();
  process.exit(1);
});
