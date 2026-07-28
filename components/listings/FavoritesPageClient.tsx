'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListingFeed } from '@/components/listings/ListingFeed';
import { ZoneFilterChips } from '@/components/map/ZoneFilterChips';
import { readFavoriteIds, pruneFavoriteIds } from '@/lib/favorites/storage';
import { fetchListingsByIdsClient } from '@/lib/listings/client-queries';
import { filterByZone } from '@/lib/listings/filters';
import type { ListingRow, ZoneChip } from '@/lib/listings/types';
import { messages } from '@/messages/it';

export function FavoritesPageClient() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneChip>('All');
  const [loaded, setLoaded] = useState(false);

  const loadFavorites = useCallback(async () => {
    const ids = readFavoriteIds();
    if (ids.length === 0) {
      setListings([]);
      setLoaded(true);
      return;
    }

    try {
      const rows = await fetchListingsByIdsClient(ids);
      pruneFavoriteIds(rows.map((row) => row.id));
      setListings(rows);
    } catch {
      setListings([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const reload = () => void loadFavorites();
    window.addEventListener('shoumanwu-favorites-change', reload);
    return () => window.removeEventListener('shoumanwu-favorites-change', reload);
  }, [loadFavorites]);

  const filteredListings = useMemo(
    () => filterByZone(listings, selectedZone),
    [listings, selectedZone],
  );

  if (!loaded) {
    return (
      <main className="flex h-full items-center justify-center px-gutter">
        <p className="text-body-md text-on-surface-variant">{messages.list.refreshing}</p>
      </main>
    );
  }

  if (listings.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-space-md px-gutter pb-24 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">favorite</span>
        <div>
          <h1 className="text-h3 font-bold text-on-surface">{messages.favorites.emptyTitle}</h1>
          <p className="mt-space-sm max-w-sm text-body-md text-on-surface-variant">
            {messages.favorites.emptyDescription}
          </p>
        </div>
        <Link
          href="/"
          className="rounded border border-primary bg-primary px-space-md py-space-sm text-label-md font-medium text-on-primary hover:bg-primary-container"
        >
          {messages.favorites.browseMap}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col overflow-hidden pb-24">
      <div className="shrink-0 border-b border-outline-variant px-gutter py-space-md">
        <h1 className="text-h3 font-bold text-on-surface">{messages.favorites.pageTitle}</h1>
        <p className="text-label-sm text-on-surface-variant">
          {messages.favorites.count(listings.length)}
        </p>
        <div className="mt-space-md">
          <ZoneFilterChips selectedZone={selectedZone} onZoneChange={setSelectedZone} />
        </div>
      </div>
      <ListingFeed listings={filteredListings} selectedId={null} />
    </main>
  );
}
