'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { SettingsToggle } from '@/components/settings/SettingsUi';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import type { FilterPrefs } from '@/lib/filter-prefs/storage';
import { DEFAULT_FILTER_PREFS } from '@/lib/filter-prefs/storage';
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
          <Button
            key={city}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => onChange(city)}
          >
            {labels[city]}
          </Button>
        );
      })}
    </div>
  );
}

/** Filter bottom sheet — draft until Apply (D-51, D-53, D-57). */
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

  const handleRadiusToggle = (enabled: boolean) => {
    setDraft({
      radiusEnabled: enabled,
      radiusKm: enabled ? draft.radiusKm || DEFAULT_FILTER_PREFS.radiusKm : draft.radiusKm,
    });
  };

  return (
    <Drawer open={sheetOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh] pb-space-xl">
        <DrawerHeader className="border-b border-outline-variant">
          <DrawerTitle>{messages.feed.filtersTitle}</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <section className="border-b border-outline-variant px-gutter py-space-md">
            <h3 className="mb-space-sm text-label-md font-medium text-on-surface-variant">
              {messages.feed.radiusLabel}
            </h3>
            <div className="flex items-center justify-between gap-space-md">
              <span className="text-body-md text-on-surface">
                {draft.radiusEnabled ? messages.feed.withinKm(draft.radiusKm) : messages.feed.radiusOff}
              </span>
              <SettingsToggle
                checked={draft.radiusEnabled}
                onChange={handleRadiusToggle}
                ariaLabel={messages.feed.radiusEnabledLabel}
              />
            </div>
            {draft.radiusEnabled && (
              <div className="mt-space-md flex flex-col gap-space-sm">
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={draft.radiusKm}
                  onChange={(event) =>
                    setDraft({ radiusKm: Number.parseInt(event.target.value, 10) })
                  }
                  className="w-full accent-primary"
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={draft.radiusKm}
                  aria-label={messages.feed.radiusLabel}
                />
                <span className="text-label-sm text-on-surface-variant">
                  {messages.feed.withinKm(draft.radiusKm)}
                </span>
              </div>
            )}
          </section>

          <section className="border-b border-outline-variant px-gutter py-space-md">
            <h3 className="mb-space-sm text-label-md font-medium text-on-surface-variant">
              {messages.feed.cityLabel}
            </h3>
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
                const label = getSubitoCategoryLabel(slug, language);
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
