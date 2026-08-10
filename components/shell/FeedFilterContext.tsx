'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_FILTER_PREFS,
  readFilterPrefs,
  subscribeFilterPrefs,
  writeFilterPrefs,
  type FilterPrefs,
} from '@/lib/filter-prefs/storage';

type FeedFilterContextValue = {
  applied: FilterPrefs;
  draft: FilterPrefs;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  setDraft: (partial: Partial<FilterPrefs>) => void;
  resetDraftFromApplied: () => void;
  applyDraft: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  dismissCity: () => void;
};

const FeedFilterContext = createContext<FeedFilterContextValue | null>(null);

function computeHasActiveFilters(prefs: FilterPrefs): boolean {
  return (
    prefs.radiusEnabled ||
    prefs.city !== 'all' ||
    prefs.categories.length > 0
  );
}

/** Applied vs draft filter state; hydrates from shoumanwu_filter_prefs (D-75, D-51). */
export function FeedFilterProvider({ children }: { children: ReactNode }) {
  const applied = useSyncExternalStore(
    subscribeFilterPrefs,
    readFilterPrefs,
    () => DEFAULT_FILTER_PREFS,
  );
  const [draft, setDraftState] = useState<FilterPrefs>(DEFAULT_FILTER_PREFS);
  const [sheetOpen, setSheetOpenState] = useState(false);

  const resetDraftFromApplied = useCallback(() => {
    setDraftState(applied);
  }, [applied]);

  const setDraft = useCallback((partial: Partial<FilterPrefs>) => {
    setDraftState((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyDraft = useCallback(() => {
    writeFilterPrefs(draft);
    setSheetOpenState(false);
  }, [draft]);

  const resetFilters = useCallback(() => {
    const cleared = { ...DEFAULT_FILTER_PREFS };
    setDraftState(cleared);
    writeFilterPrefs(cleared);
  }, []);

  const dismissCity = useCallback(() => {
    writeFilterPrefs({ ...applied, city: 'all' });
  }, [applied]);

  const setSheetOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        resetDraftFromApplied();
      }
      setSheetOpenState(open);
    },
    [resetDraftFromApplied],
  );

  const hasActiveFilters = useMemo(
    () => computeHasActiveFilters(applied),
    [applied],
  );

  const value = useMemo(
    () => ({
      applied,
      draft,
      sheetOpen,
      setSheetOpen,
      setDraft,
      resetDraftFromApplied,
      applyDraft,
      resetFilters,
      hasActiveFilters,
      dismissCity,
    }),
    [
      applied,
      draft,
      sheetOpen,
      setSheetOpen,
      setDraft,
      resetDraftFromApplied,
      applyDraft,
      resetFilters,
      hasActiveFilters,
      dismissCity,
    ],
  );

  return (
    <FeedFilterContext.Provider value={value}>{children}</FeedFilterContext.Provider>
  );
}

export function useFeedFilter(): FeedFilterContextValue {
  const context = useContext(FeedFilterContext);
  if (!context) {
    throw new Error('useFeedFilter must be used within FeedFilterProvider');
  }
  return context;
}

export function useFeedFilterOptional(): FeedFilterContextValue | null {
  return useContext(FeedFilterContext);
}
