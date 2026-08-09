'use client';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
import type { VeniceZone, ZoneChip } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

const ZONE_CHIPS: ZoneChip[] = ['All', 'centro_storico', 'mestre_marghera', 'lido_murano'];

export type SelectLocationZone = VeniceZone | 'padova';

const SELECT_LOCATION_ZONES: SelectLocationZone[] = [
  'centro_storico',
  'mestre_marghera',
  'lido_murano',
  'padova',
];

type ZoneFilterChipsProps = {
  selectedZone: ZoneChip;
  onZoneChange: (zone: ZoneChip) => void;
  className?: string;
};

export function ZoneFilterChips({ selectedZone, onZoneChange, className }: ZoneFilterChipsProps) {
  const { zoneLabel } = useMessages();

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

type SelectLocationZoneChipsProps = {
  selectedZone: SelectLocationZone | null;
  onZoneChange: (zone: SelectLocationZone) => void;
  className?: string;
};

/** Venice zone chips + Padova for `/select-location` only (D-13/D-22). */
export function SelectLocationZoneChips({
  selectedZone,
  onZoneChange,
  className,
}: SelectLocationZoneChipsProps) {
  const { messages, zoneLabel } = useMessages();

  return (
    <div className={cn('flex gap-space-sm overflow-x-auto no-scrollbar py-space-xs', className)}>
      {SELECT_LOCATION_ZONES.map((zone) => {
        const isActive = selectedZone === zone;
        const label = zone === 'padova' ? messages.zones.padova : zoneLabel(zone);
        return (
          <Button
            key={zone}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => onZoneChange(zone)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
