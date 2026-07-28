import type { VeniceZone } from '@/lib/listings/types';

export const messages = {
  app: {
    title: '手慢无',
  },
  nav: {
    map: 'Mappa',
    list: 'Elenco',
    post: 'Pubblica',
    settings: 'Impostazioni',
  },
  header: {
    menu: 'Menu',
    search: 'Cerca',
  },
  sheet: {
    newArrivals: 'Nuovi arrivi',
    itemsInArea: (count: number) =>
      count === 1 ? '1 annuncio in questa zona' : `${count} annunci in questa zona`,
  },
  zones: {
    all: 'Tutti',
    centro_storico: 'Centro Storico',
    mestre_marghera: 'Mestre-Marghera',
    lido_murano: 'Lido-Murano',
  } satisfies Record<'all', string> & Record<VeniceZone, string>,
  listing: {
    sourceSubito: 'Subito',
    free: 'Gratis',
    approximateZone: 'Zona approssimativa',
    viewOnSubito: 'Vedi su Subito',
    postedAgo: {
      justNow: 'Adesso',
      minutes: (n: number) => (n === 1 ? '1 minuto fa' : `${n} minuti fa`),
      hours: (n: number) => (n === 1 ? '1 ora fa' : `${n} ore fa`),
      days: (n: number) => (n === 1 ? '1 giorno fa' : `${n} giorni fa`),
    },
  },
  locateMe: {
    label: 'La mia posizione',
  },
  empty: {
    noListings: 'Nessun annuncio attivo — collega Supabase e applica le migration 004.',
  },
} as const;

export function zoneLabel(zone: VeniceZone | 'All'): string {
  if (zone === 'All') return messages.zones.all;
  return messages.zones[zone];
}

export function formatRelativeTimeItalian(isoDate: string, now = new Date()): string {
  const posted = new Date(isoDate);
  const diffMs = now.getTime() - posted.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return messages.listing.postedAgo.justNow;
  if (diffMinutes < 60) return messages.listing.postedAgo.minutes(diffMinutes);
  if (diffHours < 24) return messages.listing.postedAgo.hours(diffHours);
  return messages.listing.postedAgo.days(diffDays);
}
