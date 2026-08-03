'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { ListingFeed } from '@/components/listings/ListingFeed';
import { ZoneFilterChips } from '@/components/map/ZoneFilterChips';
import {
  FAVORITES_CHANGE_EVENT,
  pruneMissingFavoriteIds,
  readFavoriteIds,
} from '@/lib/favorites/storage';
import { fetchListingsByIdsClient } from '@/lib/listings/client-queries';
import { filterByZone } from '@/lib/listings/filters';
import type { ListingRow, ZoneChip } from '@/lib/listings/types';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';

async function fetchFavoriteIds(isAuthed: boolean): Promise<string[]> {
  if (isAuthed) {
    const response = await fetch('/api/favorites');
    if (response.ok) {
      const data = (await response.json()) as { listingIds?: string[] };
      return data.listingIds ?? [];
    }
  }
  return readFavoriteIds();
}

export function FavoritesPageClient() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneChip>('All');
  const [loaded, setLoaded] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const loadFavorites = useCallback(async (authed: boolean) => {
    const ids = await fetchFavoriteIds(authed);
    if (ids.length === 0) {
      setListings([]);
      setFetchFailed(false);
      setLoaded(true);
      return;
    }

    try {
      const rows = await fetchListingsByIdsClient(ids);
      if (!authed) {
        pruneMissingFavoriteIds(ids, rows.map((row) => row.id));
      }
      setListings(rows);
      setFetchFailed(false);
    } catch {
      setFetchFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authed = Boolean(session);
      setIsAuthed(authed);
      await loadFavorites(authed);
    };

    void init();

    const reload = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authed = Boolean(session);
      setIsAuthed(authed);
      await loadFavorites(authed);
    };

    const onFavoritesChange = () => void reload();
    window.addEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = Boolean(session);
      setIsAuthed(authed);
      void loadFavorites(authed);
    });

    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);
      subscription.unsubscribe();
    };
  }, [loadFavorites]);

  const filteredListings = useMemo(
    () => filterByZone(listings, selectedZone),
    [listings, selectedZone],
  );

  const syncBanner = !isAuthed && listings.length > 0 ? (
    <div className="mt-space-md flex flex-wrap items-center justify-between gap-space-sm rounded border border-outline-variant bg-surface-container px-space-md py-space-sm">
      <p className="text-body-sm text-on-surface-variant">{messages.favorites.syncBanner}</p>
      <Button type="button" variant="secondary" size="sm" onClick={() => setAuthOpen(true)}>
        {messages.favorites.syncCta}
      </Button>
    </div>
  ) : null;

  if (!loaded) {
    return (
      <main className="flex h-full items-center justify-center px-gutter">
        <p className="text-body-md text-on-surface-variant">{messages.list.refreshing}</p>
      </main>
    );
  }

  if (fetchFailed && (isAuthed || readFavoriteIds().length > 0)) {
    return (
      <>
        <main className="flex h-full flex-col items-center justify-center gap-space-md px-gutter text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_off</span>
          <div>
            <h1 className="text-h3 font-bold text-on-surface">{messages.favorites.pageTitle}</h1>
            <p className="mt-space-sm max-w-sm text-body-md text-on-surface-variant">
              {messages.favorites.loadError}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadFavorites(isAuthed)}>
            {messages.favorites.retry}
          </Button>
        </main>
        <AuthPromptModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          redirectTo="/favorites"
          modalTitle={messages.auth.favoriteTitle}
        />
      </>
    );
  }

  if (listings.length === 0) {
    return (
      <>
        <main className="flex h-full flex-col items-center justify-center gap-space-md px-gutter text-center">
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
        <AuthPromptModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          redirectTo="/favorites"
          modalTitle={messages.auth.favoriteTitle}
        />
      </>
    );
  }

  return (
    <>
      <main className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-outline-variant px-gutter py-space-md">
          <h1 className="text-h3 font-bold text-on-surface">{messages.favorites.pageTitle}</h1>
          <p className="text-label-sm text-on-surface-variant">
            {messages.favorites.count(listings.length)}
          </p>
          <div className="mt-space-md">
            <ZoneFilterChips selectedZone={selectedZone} onZoneChange={setSelectedZone} />
          </div>
          {syncBanner}
        </div>
        {filteredListings.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-gutter text-center">
            <p className="max-w-sm text-body-md text-on-surface-variant">{messages.favorites.zoneEmpty}</p>
          </div>
        ) : (
          <ListingFeed listings={filteredListings} selectedId={null} />
        )}
      </main>
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/favorites"
        modalTitle={messages.auth.favoriteTitle}
      />
    </>
  );
}
