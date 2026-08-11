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
  applyCityFilterPrefs,
  clearMapFilterPrefs,
} from '@/lib/filter-prefs/mode-transitions';
import {
  DEFAULT_FILTER_PREFS,
  subscribeFilterPrefs,
  readFilterPrefs,
  writeFilterPrefs,
  type FilterPrefs,
} from '@/lib/filter-prefs/storage';
import { clearBrowseCenter } from '@/lib/browse-center/storage';

type FeedFilterContextValue = {
  applied: FilterPrefs;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  setCity: (city: FilterPrefs['city']) => void;
  toggleCategory: (slug: string) => void;
  clearCategories: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  dismissCity: () => void;
  dismissCategory: (slug: string) => void;
  dismissRadius: () => void;
};

const FeedFilterContext = createContext<FeedFilterContextValue | null>(null);

/** General filter-sheet conditions (category, city mode). Map/radius is indicated on the map pin. */
function computeHasActiveFilters(prefs: FilterPrefs): boolean {
  return (
    (prefs.mode === 'city' && prefs.city !== 'all') ||
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
  const [sheetOpen, setSheetOpenState] = useState(false);

  const setCity = useCallback(
    (city: FilterPrefs['city']) => {
      const categoryOnlyInMapMode = applied.mode === 'map' && city === 'all';

      if (categoryOnlyInMapMode) {
        writeFilterPrefs({ ...applied, city });
      } else {
        applyCityFilterPrefs({ ...applied, city });
      }
    },
    [applied],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      const next = applied.categories.includes(slug)
        ? applied.categories.filter((item) => item !== slug)
        : [...applied.categories, slug];
      writeFilterPrefs({ ...applied, categories: next });
    },
    [applied],
  );

  const clearCategories = useCallback(() => {
    writeFilterPrefs({ ...applied, categories: [] });
  }, [applied]);

  const resetFilters = useCallback(() => {
    const cleared = { ...DEFAULT_FILTER_PREFS };
    clearBrowseCenter();
    writeFilterPrefs(cleared);
  }, []);

  const dismissCity = useCallback(() => {
    applyCityFilterPrefs({ ...applied, city: 'all' });
  }, [applied]);

  const dismissCategory = useCallback(
    (slug: string) => {
      const next = applied.categories.filter((item) => item !== slug);
      writeFilterPrefs({ ...applied, categories: next });
    },
    [applied],
  );

  const dismissRadius = useCallback(() => {
    clearMapFilterPrefs();
  }, []);

  const setSheetOpen = useCallback((open: boolean) => {
    setSheetOpenState(open);
  }, []);

  const hasActiveFilters = useMemo(
    () => computeHasActiveFilters(applied),
    [applied],
  );

  const value = useMemo(
    () => ({
      applied,
      sheetOpen,
      setSheetOpen,
      setCity,
      toggleCategory,
      clearCategories,
      resetFilters,
      hasActiveFilters,
      dismissCity,
      dismissCategory,
      dismissRadius,
    }),
    [
      applied,
      sheetOpen,
      setSheetOpen,
      setCity,
      toggleCategory,
      clearCategories,
      resetFilters,
      hasActiveFilters,
      dismissCity,
      dismissCategory,
      dismissRadius,
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
