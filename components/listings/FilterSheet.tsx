'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import type { FilterPrefs } from '@/lib/filter-prefs/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import {
  getSubitoCategoryLabel,
  SUBITO_CATEGORY_SLUGS,
} from '@/lib/listings/subito-categories';
import { cn } from '@/lib/utils';

const CITY_OPTIONS: FilterPrefs['city'][] = ['all', 'venice', 'padova'];

function ConsumerCityChipSelector({
  value,
  onChange,
}: {
  value: FilterPrefs['city'];
  onChange: (city: FilterPrefs['city']) => void;
}) {
  const { messages } = useMessages();

  const labels: Record<FilterPrefs['city'], string> = {
    all: messages.feed.cityAll,
    venice: messages.feed.cityVenice,
    padova: messages.feed.cityPadova,
  };

  return (
    <div className="flex flex-wrap gap-space-sm">
      {CITY_OPTIONS.map((city) => {
        const isActive = value === city;
        return (
          <button
            key={city}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(city)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline',
              isActive
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {labels[city]}
          </button>
        );
      })}
    </div>
  );
}

/** Filter bottom sheet — city + categories; radius lives on /select-location. */
export function FilterSheet() {
  const { messages, language } = useMessages();
  const {
    sheetOpen,
    setSheetOpen,
    draft,
    setDraft,
    resetDraftFromApplied,
    applyDraft,
    resetFilters,
  } = useFeedFilter();

  useEffect(() => {
    if (sheetOpen) {
      resetDraftFromApplied();
    }
  }, [sheetOpen, resetDraftFromApplied]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetDraftFromApplied();
    }
    setSheetOpen(open);
  };

  const toggleCategory = (slug: string) => {
    const next = draft.categories.includes(slug)
      ? draft.categories.filter((item) => item !== slug)
      : [...draft.categories, slug];
    setDraft({ categories: next });
  };

  return (
    <Drawer open={sheetOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-outline-variant px-gutter pb-space-md pt-space-sm">
          <DrawerTitle className="text-xl">{messages.feed.filtersTitle}</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <section className="px-gutter py-space-md">
            <h3 className="mb-space-sm text-label-md font-medium text-on-surface-variant">
              {messages.feed.cityLabel}
            </h3>
            <p className="mb-3 mt-1 text-xs text-neutral-400 dark:text-on-surface-variant">
              {messages.feed.cityFilterMapHint}
            </p>
            <ConsumerCityChipSelector
              value={draft.city}
              onChange={(city) => setDraft({ city })}
            />
          </section>

          <section className="px-gutter py-space-md">
            <div className="mb-space-sm flex items-center justify-between gap-space-sm">
              <h3 className="text-label-md font-medium text-on-surface-variant">
                {messages.feed.categoriesLabel}
              </h3>
              {draft.categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft({ categories: [] })}
                  className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
                >
                  {messages.feed.clearSelection}
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-space-xs">
              {SUBITO_CATEGORY_SLUGS.map((slug) => {
                const checked = draft.categories.includes(slug);
                const label = getSubitoCategoryLabel(slug, language, { messages }) ?? slug;
                return (
                  <li key={slug}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-space-sm rounded border border-outline-variant px-space-sm py-space-sm',
                        checked && 'border-primary bg-surface-container-lowest',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(slug)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-body-md text-on-surface">{label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <footer className="sticky bottom-0 flex gap-space-sm border-t border-outline-variant bg-surface px-gutter py-space-md">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => {
              resetFilters();
            }}
          >
            {messages.feed.resetFilters}
          </Button>
          <Button type="button" className="flex-1" onClick={applyDraft}>
            {messages.feed.applyFilters}
          </Button>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
