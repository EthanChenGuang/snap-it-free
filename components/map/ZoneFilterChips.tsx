'use client';

import { Button } from '@/components/ui/button';
import { zoneLabel } from '@/messages/it';
import type { ZoneChip } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

const ZONE_CHIPS: ZoneChip[] = ['All', 'centro_storico', 'mestre_marghera', 'lido_murano'];

type ZoneFilterChipsProps = {
  selectedZone: ZoneChip;
  onZoneChange: (zone: ZoneChip) => void;
  className?: string;
};

export function ZoneFilterChips({ selectedZone, onZoneChange, className }: ZoneFilterChipsProps) {
  return (
    <div className={cn('flex gap-space-sm overflow-x-auto no-scrollbar py-space-xs', className)}>
      {ZONE_CHIPS.map((zone) => {
        const isActive = selectedZone === zone;
        return (
          <Button
            key={zone}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => onZoneChange(zone)}
          >
            {zoneLabel(zone)}
          </Button>
        );
      })}
    </div>
  );
}
