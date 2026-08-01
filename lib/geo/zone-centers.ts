import type { VeniceZone } from '@/lib/listings/types';

export const ZONE_CENTERS: Record<VeniceZone, { lat: number; lng: number }> = {
  centro_storico: { lat: 45.434, lng: 12.338 },
  mestre_marghera: { lat: 45.486, lng: 12.245 },
  lido_murano: { lat: 45.406, lng: 12.372 },
};
