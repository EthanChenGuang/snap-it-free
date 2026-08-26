'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import type { FilterPrefs } from '@/lib/filter-prefs/storage';
import { CONSUMER_CITY_FILTER_OPTIONS } from '@/lib/listings/filters';
import { consumerCityFilterLabelsFromMessages } from '@/lib/i18n/city-labels';
import { useMessages } from '@/lib/i18n/useMessages';
import {
  getSubitoCategoryLabel,
  SUBITO_CATEGORY_SLUGS,
} from '@/lib/listings/subito-categories';
import { cn } from '@/lib/utils';

const CITY_OPTIONS = CONSUMER_CITY_FILTER_OPTIONS;

function ConsumerCityChipSelector({
  value,
  onChange,
}: {
  value: FilterPrefs['city'];
  onChange: (city: FilterPrefs['city']) => void;
}) {
  const { messages } = useMessages();
  const labels = consumerCityFilterLabelsFromMessages(messages);

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
    applied,
    setCity,
    toggleCategory,
    clearCategories,
    resetFilters,
  } = useFeedFilter();

  const handleOpenChange = (open: boolean) => setSheetOpen(open);
  const allCategoriesSelected = applied.categories.length === 0;
  const allCategoryLabel = getSubitoCategoryLabel('all', language, { messages }) ?? 'All';

  return (
    <Drawer open={sheetOpen} onOpenChange={handleOpenChange} modal={false} handleOnly>
      <DrawerContent nonModal className="h-[85dvh] max-h-[85dvh] overflow-hidden">
        <DrawerHeader className="shrink-0 border-b border-outline-variant px-gutter pb-space-md pt-space-sm">
          <DrawerTitle className="text-xl">{messages.feed.filtersTitle}</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            data-vaul-no-drag
            className="filter-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y"
          >
            <section className="px-gutter py-space-md">
              <h3 className="mb-space-sm text-label-md font-medium text-on-surface-variant">
                {messages.feed.cityLabel}
              </h3>
              <p className="mb-3 mt-1 text-xs text-neutral-400 dark:text-on-surface-variant">
                {messages.feed.cityFilterMapHint}
              </p>
              <ConsumerCityChipSelector value={applied.city} onChange={setCity} />
            </section>

            <section className="px-gutter py-space-md pb-space-md">
              <div className="mb-space-sm flex items-center justify-between gap-space-sm">
                <h3 className="text-label-md font-medium text-on-surface-variant">
                  {messages.feed.categoriesLabel}
                </h3>
                {applied.categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearCategories()}
                    className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
                  >
                    {messages.feed.clearSelection}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  aria-pressed={allCategoriesSelected}
                  onClick={() => clearCategories()}
                  className={cn(
                    'flex min-h-11 items-center justify-center break-words rounded-xl border px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline',
                    allCategoriesSelected
                      ? 'border-primary bg-primary text-on-primary shadow-sm'
                      : 'border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {allCategoryLabel}
                </button>
                {SUBITO_CATEGORY_SLUGS.map((slug) => {
                  const checked = applied.categories.includes(slug);
                  const label = getSubitoCategoryLabel(slug, language, { messages }) ?? slug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleCategory(slug)}
                      className={cn(
                        'flex min-h-11 items-center justify-center break-words rounded-xl border px-3 py-2.5 text-center text-xs font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline',
                        checked
                          ? 'border-primary bg-primary text-on-primary shadow-sm'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <footer className="shrink-0 flex gap-3 border-t border-outline-variant bg-surface p-4 pt-3">
            <button
              type="button"
              className="flex-1 rounded-full bg-surface-container py-3.5 text-sm font-semibold text-on-surface transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline"
              onClick={() => {
                resetFilters();
              }}
            >
              {messages.feed.resetFilters}
            </button>
            <button
              type="button"
              className="flex-[2] rounded-full bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline"
              onClick={() => setSheetOpen(false)}
            >
              {messages.feed.applyFilters}
            </button>
          </footer>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
