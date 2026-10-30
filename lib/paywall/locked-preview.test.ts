import { describe, expect, it, vi } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { fetchPaywallTeaser, teaserFromListings } from './locked-preview';

const row = (id: string, photo_url: string): ListingRow => ({
  id,
  source: 'subito',
  title: `Private title ${id}`,
  photo_url,
  external_url: 'https://subito.it/annunci/1',
  lat: 45.44,
  lng: 12.33,
  zone: null,
  posted_at: '2026-10-25T10:00:00.000Z',
  expires_at: '2026-10-27T10:00:00.000Z',
  status: 'active',
});

function rpcClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as never, rpc };
}

describe('fetchPaywallTeaser', () => {
  it('passes city, lookback and the 6-photo cap to the SQL function and keeps only count + urls', async () => {
    const { client, rpc } = rpcClient({
      data: [{ listing_count: '3965', photo_urls: ['https://img/a.jpg', 'https://img/b.jpg'] }],
      error: null,
    });
    expect(await fetchPaywallTeaser(client, { city: 'roma', since: '2026-04-28T00:00:00.000Z' })).toEqual({
      count: 3965,
      photoUrls: ['https://img/a.jpg', 'https://img/b.jpg'],
    });
    expect(rpc.mock.calls).toEqual([
      ['listings_paywall_teaser', { p_city: 'roma', p_since: '2026-04-28T00:00:00.000Z', p_limit: 6 }],
    ]);
  });

  it('returns null before migration 044 so the caller falls back', async () => {
    const { client } = rpcClient({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.listings_paywall_teaser' },
    });
    expect(await fetchPaywallTeaser(client)).toBeNull();
  });
});

describe('teaserFromListings', () => {
  it('keeps distinct photos only, skipping rows without one', () => {
    const teaser = teaserFromListings(
      [row('a', 'https://img/a.jpg'), row('b', ''), row('c', 'https://img/a.jpg'), row('d', 'https://img/d.jpg')],
      12748,
    );
    expect(teaser).toEqual({ count: 12748, photoUrls: ['https://img/a.jpg', 'https://img/d.jpg'] });
  });
});
