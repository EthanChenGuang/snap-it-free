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
    favorites: 'Preferiti',
  },
  favorites: {
    added: 'Aggiunto ai preferiti',
    removed: 'Rimosso dai preferiti',
    pageTitle: 'Preferiti',
    emptyTitle: 'Nessun preferito',
    emptyDescription: 'Salva gli annunci che ti interessano toccando il cuore su mappa o elenco.',
    browseMap: 'Esplora la mappa',
    count: (n: number) =>
      n === 1 ? '1 annuncio salvato' : `${n} annunci salvati`,
  },
  list: {
    pageTitle: 'Elenco completo',
    refresh: 'Aggiorna',
    refreshing: 'Aggiornamento…',
  },
  post: {
    title: 'Pubblica un annuncio',
    stubTitle: 'Accedi per pubblicare',
    stubDescription:
      'La pubblicazione di annunci gratuiti sarà disponibile nella Fase 3. Per ora puoi sfogliare la mappa e salvare i preferiti.',
    phaseNote: 'Accesso account — Fase 4',
  },
  settings: {
    title: 'Impostazioni',
    profileTitle: 'Profilo',
    profileStub:
      'Accedi per gestire il profilo, le notifiche e le preferenze. Funzionalità disponibile nella Fase 4.',
    profilePlaceholder: 'Ospite — nessun account collegato',
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
  detail: {
    pageTitle: 'Dettaglio annuncio',
    back: 'Indietro',
    favorite: 'Preferiti',
    share: 'Condividi',
    shareCopied: 'Link copiato negli appunti',
    shareShared: 'Condiviso',
    shareFailed: 'Impossibile condividere',
    openOnSubito: 'Apri su Subito',
    claimOnSubito: 'Reclama su Subito',
    embedBlocked:
      "L'annuncio Subito non può essere incorporato qui. Usa Apri su Subito o Reclama su Subito per visualizzarlo e contattare il venditore.",
    statusLabel: 'Stato',
    statusAvailable: 'Disponibile',
    costLabel: 'Prezzo',
    sourceLabel: 'Fonte',
    externalLinkUnavailable: 'Link esterno non disponibile',
  },
  listing: {
    sourceSubito: 'Subito',
    free: 'Gratis',
    approximateZone: 'Zona approssimativa',
    viewOnSubito: 'Vedi su Subito',
    viewDetail: 'Vedi dettaglio',
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
