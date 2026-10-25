import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ITALIAN_CITIES } from '@/lib/geo/italian-cities';
import { PAST_DUE_GRACE_MS } from '@/lib/subscriptions/entitlement';

const sql = readFileSync(path.join(__dirname, '../../supabase/migrations/044_listings_paywall_rls.sql'), 'utf8');

describe('044 SQL mirrors the TypeScript rules', () => {
  it('teaser city table equals ITALIAN_CITIES (key, slug, bbox)', () => {
    const rows = [...sql.matchAll(/\('(\w+)', '(\w+)', ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)/g)].map((m) => [
      m[1],
      m[2],
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6]),
    ]);
    const expected = ITALIAN_CITIES.map((c) => [
      c.consumerKey,
      c.subitoSlug,
      c.bbox.latMin,
      c.bbox.latMax,
      c.bbox.lngMin,
      c.bbox.lngMax,
    ]);
    expect(rows).toEqual(expected);
  });

  it('past_due grace in has_active_subscription() equals PAST_DUE_GRACE_MS', () => {
    const days = Number(sql.match(/past_due_since \+ interval '(\d+) days'/)?.[1]);
    expect(days * 24 * 60 * 60 * 1000).toBe(PAST_DUE_GRACE_MS);
  });
});
