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

async function resolveAuthed(): Promise<boolean> {
  if (!getSupabaseEnv()) return false;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return Boolean(session);
  } catch {
    return false;
  }
}

async function syncAuthAndFavorites(force = false): Promise<boolean> {
  const authed = await resolveAuthed();
  if (authed !== snapshot.isAuthed || force) {
    setSnapshot({ isAuthed: authed });
    await loadFavorites(authed, { force: true });
  }
  return authed;
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

function applyLocalRemove(id: string): boolean {
  const ids = snapshot.favoriteIds.length > 0 ? snapshot.favoriteIds : readFavoriteIds();
  if (!ids.includes(id)) return true;

  const next = ids.filter((item) => item !== id);
  writeFavoriteIds(next);
  setSnapshot({ favoriteIds: next });
  return true;
}

/** Remove a favorite — used on /favorites where every card is already saved. */
export async function removeFavorite(id: string): Promise<boolean> {
  const authed = await syncAuthAndFavorites();

  if (authed) {
    try {
      await fetch(`/api/favorites?listingId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      // Network/offline — still drop locally so /favorites can prune the card.
    }
  }

  return applyLocalRemove(id);
}

async function applyLocalFavoriteChange(
  id: string,
  currentlyFavorited: boolean,
): Promise<boolean> {
  const current = readFavoriteIds();
  const next = currentlyFavorited
    ? current.filter((item) => item !== id)
    : current.includes(id)
      ? current
      : [...current, id];
  writeFavoriteIds(next);
  setSnapshot({ favoriteIds: next });
  return next.includes(id);
}

/** Returns the favorited state of `id` after the toggle. */
export async function toggleFavorite(
  id: string,
  currentlyFavorited: boolean,
): Promise<boolean> {
  const authed = await syncAuthAndFavorites();

  if (!authed) {
    return applyLocalFavoriteChange(id, currentlyFavorited);
  }

  const removing = currentlyFavorited;
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
    return applyLocalFavoriteChange(id, currentlyFavorited);
  }

  const next = removing
    ? snapshot.favoriteIds.filter((item) => item !== id)
    : snapshot.favoriteIds.includes(id)
      ? snapshot.favoriteIds
      : [...snapshot.favoriteIds, id];

  writeFavoriteIds(next);
  setSnapshot({ favoriteIds: next });
  return next.includes(id);
}

/** @internal Test-only reset for module state between unit tests. */
export function __resetFavoritesStoreForTests(): void {
  snapshot = SERVER_SNAPSHOT;
  started = false;
  loadToken = 0;
  loadedAuthed = null;
  listeners.clear();
}
