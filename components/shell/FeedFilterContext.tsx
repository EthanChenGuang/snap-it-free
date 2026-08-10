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
  draft: FilterPrefs;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  setDraft: (partial: Partial<FilterPrefs>) => void;
  resetDraftFromApplied: () => void;
  applyDraft: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  dismissCity: () => void;
  dismissCategory: (slug: string) => void;
  dismissRadius: () => void;
};

const FeedFilterContext = createContext<FeedFilterContextValue | null>(null);

function computeHasActiveFilters(prefs: FilterPrefs): boolean {
  return (
    (prefs.mode === 'map' && prefs.radiusEnabled) ||
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
  const [draft, setDraftState] = useState<FilterPrefs>(DEFAULT_FILTER_PREFS);
  const [sheetOpen, setSheetOpenState] = useState(false);

  const resetDraftFromApplied = useCallback(() => {
    setDraftState(applied);
  }, [applied]);

  const setDraft = useCallback((partial: Partial<FilterPrefs>) => {
    setDraftState((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyDraft = useCallback(() => {
    const categoryOnlyInMapMode =
      applied.mode === 'map' &&
      draft.city === 'all' &&
      draft.city === applied.city;

    if (categoryOnlyInMapMode) {
      writeFilterPrefs({ ...applied, categories: draft.categories });
    } else {
      applyCityFilterPrefs({
        ...draft,
        mode: 'city',
        radiusEnabled: false,
      });
    }
    setSheetOpenState(false);
  }, [draft, applied]);

  const resetFilters = useCallback(() => {
    const cleared = { ...DEFAULT_FILTER_PREFS };
    setDraftState(cleared);
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

  const setSheetOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setDraftState(applied);
      } else {
        resetDraftFromApplied();
      }
      setSheetOpenState(open);
    },
    [applied, resetDraftFromApplied],
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
      dismissCategory,
      dismissRadius,
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
