'use client';

import { consumerCityFilterLabelsFromMessages } from '@/lib/i18n/city-labels';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { CONSUMER_CITY_FILTER_ORDER } from '@/lib/listings/filters';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

const CITY_OPTIONS: (ConsumerCityKey | null)[] = [null, ...CONSUMER_CITY_FILTER_ORDER];

type AlertCityChipSelectorProps = {
  value: ConsumerCityKey | null;
  onChange: (city: ConsumerCityKey | null) => void;
  className?: string;
};

export function AlertCityChipSelector({ value, onChange, className }: AlertCityChipSelectorProps) {
  const { messages } = useMessages();
  const labels = consumerCityFilterLabelsFromMessages(messages);

  return (
    <div className={cn('flex flex-wrap gap-space-sm', className)} role="group" aria-label={messages.settings.alerts.cityLabel}>
      {CITY_OPTIONS.map((city) => {
        const isActive = value === city;
        const label = city === null ? labels.all : labels[city];
        return (
          <button
            key={city ?? 'all'}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(city)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline',
              isActive
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
