'use client';

import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import {
  FAVORITES_CHANGE_EVENT,
  readFavoriteIds,
  toggleFavoriteId,
  writeFavoriteIds,
} from './storage';

export type FavoritesSnapshot = {
  favoriteIds: string[];
  hydrated: boolean;
  isAuthed: boolean;
};

const SERVER_SNAPSHOT: FavoritesSnapshot = {
  favoriteIds: [],
  hydrated: false,
  isAuthed: false,
};

// Module singleton: every FavoriteButton shares one session lookup, one
// /api/favorites fetch, and one auth subscription. Per-hook instances flooded
// the dev server with a request per rendered card (ERR_INSUFFICIENT_RESOURCES).
const listeners = new Set<() => void>();

let snapshot: FavoritesSnapshot = SERVER_SNAPSHOT;
let started = false;
let loadToken = 0;
let loadedAuthed: boolean | null = null;

function idsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function setSnapshot(patch: Partial<FavoritesSnapshot>): void {
  const next: FavoritesSnapshot = { ...snapshot, ...patch };
  const unchanged =
    next.hydrated === snapshot.hydrated &&
    next.isAuthed === snapshot.isAuthed &&
    idsEqual(next.favoriteIds, snapshot.favoriteIds);

  if (unchanged) return;

  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

async function fetchRemoteFavoriteIds(): Promise<string[] | null> {
  try {
    const response = await fetch('/api/favorites');
    if (!response.ok) return null;
    const data = (await response.json()) as { listingIds?: string[] };
    return data.listingIds ?? [];
  } catch {
    // Network error (offline, dev-server hiccup, navigation abort) — fall back to local snapshot
    return null;
  }
}

/**
 * Skips redundant work when the auth state has not flipped — otherwise the
 * INITIAL_SESSION / TOKEN_REFRESHED events would repeat the initial fetch.
 * `force` is for SIGNED_IN, where the login merge may have changed the server row.
 */
async function loadFavorites(
  authed: boolean,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  if (!force && loadedAuthed === authed) return;
  loadedAuthed = authed;

  const token = ++loadToken;

  if (authed) {
    const remoteIds = await fetchRemoteFavoriteIds();
    if (token !== loadToken) return;

    if (remoteIds !== null) {
      writeFavoriteIds(remoteIds);
      setSnapshot({ favoriteIds: remoteIds });
      return;
    }
  }

  setSnapshot({ favoriteIds: readFavoriteIds() });
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  const syncLocal = () => setSnapshot({ favoriteIds: readFavoriteIds() });
  window.addEventListener(FAVORITES_CHANGE_EVENT, syncLocal);
  window.addEventListener('storage', syncLocal);

  if (!getSupabaseEnv()) {
    setSnapshot({ favoriteIds: readFavoriteIds(), hydrated: true });
    return;
  }

  const supabase = createClient();

  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authed = Boolean(session);
      setSnapshot({ isAuthed: authed });
      await loadFavorites(authed);
    } catch {
      setSnapshot({ favoriteIds: readFavoriteIds() });
    } finally {
      setSnapshot({ hydrated: true });
    }
  })();

  supabase.auth.onAuthStateChange((event, session) => {
    const authed = Boolean(session);
    setSnapshot({ isAuthed: authed });
    void loadFavorites(authed, { force: event === 'SIGNED_IN' });
  });
}

export function subscribeFavorites(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  start();
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getFavoritesSnapshot(): FavoritesSnapshot {
  return snapshot;
}

export function getServerFavoritesSnapshot(): FavoritesSnapshot {
  return SERVER_SNAPSHOT;
}

/** Returns the favorited state of `id` after the toggle. */
export async function toggleFavorite(id: string): Promise<boolean> {
  if (!snapshot.isAuthed) {
    const next = toggleFavoriteId(id);
    setSnapshot({ favoriteIds: next });
    return next.includes(id);
  }

  const removing = snapshot.favoriteIds.includes(id);
  const response = removing
    ? await fetch(`/api/favorites?listingId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    : await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id }),
      });

  if (!response.ok) {
    return snapshot.favoriteIds.includes(id);
  }

  const next = removing
    ? snapshot.favoriteIds.filter((item) => item !== id)
    : [...snapshot.favoriteIds, id];

  writeFavoriteIds(next);
  setSnapshot({ favoriteIds: next });
  return !removing;
}

/** @internal Test-only reset for module state between unit tests. */
export function __resetFavoritesStoreForTests(): void {
  snapshot = SERVER_SNAPSHOT;
  started = false;
  loadToken = 0;
  loadedAuthed = null;
  listeners.clear();
}
