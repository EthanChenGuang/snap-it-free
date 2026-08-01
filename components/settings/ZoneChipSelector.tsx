'use client';

import { Button } from '@/components/ui/button';
import { zoneLabel } from '@/messages/it';
import type { VeniceZone } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

const ZONE_OPTIONS: (VeniceZone | null)[] = [
  null,
  'centro_storico',
  'mestre_marghera',
  'lido_murano',
];

type ZoneChipSelectorProps = {
  value: VeniceZone | null;
  onChange: (zone: VeniceZone | null) => void;
  className?: string;
};

function chipLabel(zone: VeniceZone | null): string {
  if (zone === null) return zoneLabel('All');
  return zoneLabel(zone);
}

export function ZoneChipSelector({ value, onChange, className }: ZoneChipSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-space-sm', className)}>
      {ZONE_OPTIONS.map((zone) => {
        const isActive = value === zone;
        return (
          <Button
            key={zone ?? 'all'}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => onChange(zone)}
          >
            {chipLabel(zone)}
          </Button>
        );
      })}
    </div>
  );
}
