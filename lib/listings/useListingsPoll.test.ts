/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchActiveListingsClient } from './client-queries';
import { useListingsPoll } from './useListingsPoll';
import type { ListingRow } from './types';

vi.mock('./client-queries', () => ({
  fetchActiveListingsClient: vi.fn(),
}));

const mockFetch = vi.mocked(fetchActiveListingsClient);

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

function mountUseListingsPoll(initialListings: ListingRow[]) {
  const hookRef: { current: ReturnType<typeof useListingsPoll> | null } = { current: null };

  function Harness() {
    const hook = useListingsPoll(initialListings);
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
    mockFetch.mockResolvedValue([padovaListing]);
  });

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it('refresh fetches active listings and updates state', async () => {
    mounted = mountUseListingsPoll(initialEmpty);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mounted.hook.listings).toEqual([]);

    await act(async () => {
      await mounted!.hook.refresh();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mounted.hook.listings).toContainEqual(padovaListing);
    expect(mounted.hook.isRefreshing).toBe(false);
  });
});
