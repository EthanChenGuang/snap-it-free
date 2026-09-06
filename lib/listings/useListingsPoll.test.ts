/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchActiveListingsClient, fetchActiveListingsCountClient } from './client-queries';
import { useListingsPoll } from './useListingsPoll';
import type { ListingRow } from './types';

vi.mock('./client-queries', () => ({
  fetchActiveListingsClient: vi.fn(),
  fetchActiveListingsCountClient: vi.fn(),
}));

const mockFetch = vi.mocked(fetchActiveListingsClient);
const mockFetchCount = vi.mocked(fetchActiveListingsCountClient);

const initialEmpty: ListingRow[] = [];

const padovaListing: ListingRow = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  source: 'subito',
  title: 'Scrivania gratis Padova',
  photo_url: 'https://example.com/photo.jpg',
  external_url: 'https://subito.it/annunci/1',
  lat: 45.406,
  lng: 11.877,
  zone: null,
  city: 'padova',
  posted_at: '2026-08-01T10:00:00.000Z',
  expires_at: '2026-08-03T10:00:00.000Z',
  status: 'active',
};

function listing(id: string, postedAt: string): ListingRow {
  return { ...padovaListing, id, posted_at: postedAt };
}

function mountUseListingsPoll(initialListings: ListingRow[]) {
  const hookRef: { current: ReturnType<typeof useListingsPoll> | null } = { current: null };
  let seed = initialListings;

  function Harness() {
    const hook = useListingsPoll(seed);
    hookRef.current = hook;
    return null;
  }

  const container = document.createElement('div');
  const root: Root = createRoot(container);

  act(() => {
    root.render(createElement(Harness));
  });

  return {
    get hook() {
      if (!hookRef.current) {
        throw new Error('useListingsPoll hook not mounted');
      }
      return hookRef.current;
    },
    rerender(nextInitial: ListingRow[]) {
      seed = nextInitial;
      act(() => {
        root.render(createElement(Harness));
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('useListingsPoll', () => {
  let mounted: ReturnType<typeof mountUseListingsPoll> | undefined;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetchCount.mockReset();
    mockFetch.mockResolvedValue([padovaListing]);
    mockFetchCount.mockResolvedValue(42);
  });

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it('refresh fetches active listings and updates state', async () => {
    mounted = mountUseListingsPoll(initialEmpty);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetchCount).toHaveBeenCalledTimes(1);
    expect(mounted.hook.listings).toContainEqual(padovaListing);
    expect(mounted.hook.totalCount).toBe(42);
    expect(mounted.hook.isRefreshing).toBe(false);
  });

  it('refresh on mount does not wipe existing listings when fetch returns empty', async () => {
    mockFetch.mockResolvedValue([]);
    mockFetchCount.mockResolvedValue(0);
    mounted = mountUseListingsPoll([padovaListing]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mounted.hook.listings).toContainEqual(padovaListing);
  });

  it('does not replace a full client snapshot with a shorter SSR seed', async () => {
    const ssrNewest = listing('ssr-1', '2026-09-06T10:00:00.000Z');
    const fullFeed = [
      listing('a', '2026-09-06T10:00:00.000Z'),
      listing('b', '2026-08-01T10:00:00.000Z'),
      listing('c', '2026-04-01T10:00:00.000Z'),
    ];
    mockFetch.mockResolvedValue(fullFeed);
    mockFetchCount.mockResolvedValue(fullFeed.length);
    mounted = mountUseListingsPoll([ssrNewest]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.hook.listings).toHaveLength(3);

    mounted.rerender([listing('ssr-2', '2026-09-06T10:05:00.000Z')]);

    expect(mounted.hook.listings).toHaveLength(3);
    expect(mounted.hook.listings.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });
});
