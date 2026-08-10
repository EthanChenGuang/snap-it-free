'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import {
  FAVORITES_CHANGE_EVENT,
  pruneMissingFavoriteIds,
  readFavoriteIds,
} from '@/lib/favorites/storage';
import { fetchListingsByIdsClient } from '@/lib/listings/client-queries';
import type { ListingRow } from '@/lib/listings/types';
import { haversineKm } from '@/lib/geo/haversine';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';

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
  const { messages } = useMessages();
  const { center } = useDistanceCenter(false);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const loadFavorites = useCallback(async (authed: boolean) => {
    const ids = await fetchFavoriteIds(authed);
    if (ids.length === 0) {
      setListings([]);
      setLoaded(true);
      return;
    }

    try {
      const rows = await fetchListingsByIdsClient(ids);
      if (!authed) {
        pruneMissingFavoriteIds(ids, rows.map((row) => row.id));
      }
      setListings(rows);
    } catch {
      // E5 backstop: fall back to empty state without broken layout
      setListings([]);
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

  const syncBanner = !isAuthed && listings.length > 0 ? (
    <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm rounded border border-outline-variant bg-surface-container px-space-md py-space-sm">
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

  if (listings.length === 0) {
    return (
      <>
        <main className="flex h-full flex-col overflow-y-auto px-gutter pb-space-xl pt-space-md">
          <div className="border border-outline-variant bg-surface-container-lowest p-space-xl text-center">
            <span className="material-symbols-outlined mb-space-sm text-4xl text-on-surface-variant">
              favorite
            </span>
            <p className="text-body-md font-semibold text-on-surface">
              {messages.favorites.emptyTitle}
            </p>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">
              {messages.favorites.emptyDescription}
            </p>
            {!isAuthed && (
              <Button
                type="button"
                className="mt-space-md"
                onClick={() => setAuthOpen(true)}
              >
                {messages.settings.signIn}
              </Button>
            )}
            <Link
              href="/"
              className="mt-space-md inline-block rounded border border-primary bg-primary px-space-md py-space-sm text-label-md font-medium text-on-primary hover:bg-primary-container"
            >
              {messages.feed.browseFeed}
            </Link>
          </div>
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
        <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-xl pt-space-md">
          {syncBanner}
          <section className="grid grid-cols-2 gap-3">
            {listings.map((listing) => {
              const distanceMeters =
                listing.lat != null && listing.lng != null && center
                  ? haversineKm(center, { lat: listing.lat, lng: listing.lng }) * 1000
                  : null;
              return (
                <ListListingCard
                  key={listing.id}
                  listing={listing}
                  distanceMeters={distanceMeters}
                />
              );
            })}
          </section>
        </div>
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
