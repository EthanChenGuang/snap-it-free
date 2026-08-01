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
    loadError: 'Impossibile caricare i preferiti. Riprova.',
    retry: 'Riprova',
    zoneEmpty: 'Nessun preferito in questa zona. Prova un altro filtro.',
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
    subtitle: 'Condividi qualcosa che non ti serve più con la community.',
    photoLabel: 'Foto principale',
    uploadHint: 'Clicca per caricare o trascina qui',
    titleLabel: 'Titolo',
    titlePlaceholder: 'Cosa stai regalando?',
    zoneLabel: 'Zona',
    pinLabel: 'Posizione del pin',
    addDetails: 'Aggiungi dettagli',
    descriptionLabel: 'Descrizione',
    descriptionPlaceholder: 'Condizioni, dimensioni, note per il ritiro…',
    submit: 'Pubblica gratis',
    submitting: 'Pubblicazione…',
    guidelines: 'Pubblicando accetti le linee guida della community.',
    successToast: 'Annuncio pubblicato',
    missingFields: 'Aggiungi foto e titolo per continuare.',
    uploadError: 'Caricamento foto non riuscito.',
    createError: 'Pubblicazione non riuscita. Riprova.',
    pinOutsideVenice: 'Sposta il pin dentro Venezia',
    mapLoading: 'Caricamento mappa…',
    rateLimitPost: 'Hai raggiunto il limite di 3 annunci al giorno',
    manageLink: 'I miei annunci',
    tabs: {
      publish: 'Pubblica',
      streetDump: 'Street Dump',
    },
    streetDump: {
      pinLabel: 'Posizione sulla mappa',
      helper: 'Conferma la posizione sulla mappa — non pubblichiamo automaticamente.',
      confirmPin: 'Conferma posizione',
    },
    geolocationDenied:
      'Posizione non disponibile — attiva i permessi o usa la scheda Pubblica.',
    geolocationTimeout:
      'Impossibile rilevare la posizione — riprova o seleziona manualmente sulla mappa.',
    geolocationUnavailable:
      'Geolocalizzazione non supportata — usa la scheda Pubblica per selezionare la zona.',
  },
  auth: {
    modalTitle: 'Accedi per pubblicare',
    modalDescription: 'Ti invieremo un link magico via email — nessuna password.',
    emailLabel: 'Email',
    emailPlaceholder: 'tua@email.it',
    sendLink: 'Invia link di accesso',
    sending: 'Invio…',
    checkEmail: 'Controlla la tua email e clicca il link per continuare.',
    sendError: 'Invio non riuscito. Riprova.',
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
    descriptionLabel: 'Descrizione',
    contact: 'Contatta',
    contactReserved: 'Questo annuncio è riservato',
    markReserved: 'Segna riservato',
    markDelivered: 'Segna consegnato',
    reservedToast: 'Segnato come riservato',
    deliveredConfirmTitle: 'Segna come consegnato?',
    deliveredConfirmBody: "L'annuncio non sarà più visibile.",
    deliveredConfirmAction: 'Segna consegnato',
    cancel: 'Annulla',
  },
  dm: {
    drawerTitle: 'Messaggi',
    close: 'Chiudi messaggi',
    send: 'Invia messaggio',
    emptyThread: 'Scrivi al proprietario per organizzare il ritiro.',
    quickReply1: 'È ancora disponibile?',
    quickReply2: 'Posso passare questo weekend',
    quickReply3: 'Che orario ti va?',
    inputPlaceholder: 'Scrivi un messaggio…',
    fcfsNotice: 'Qualcuno potrebbe già essere in contatto',
    rateLimit: 'Troppi messaggi — riprova tra un\'ora',
    sendError: 'Impossibile inviare — riprova',
    bannerShort: 'Incontra in un luogo pubblico. Non pagare per oggetti gratuiti.',
  },
  safety: {
    modalTitle: 'Incontra in sicurezza',
    bullet1: 'Scegli un luogo pubblico e ben illuminato.',
    bullet2: 'Tieni la conversazione nell\'app — non condividere numeri di telefono subito.',
    bullet3: 'Non pagare mai per un oggetto che dovrebbe essere gratis.',
    acknowledge: 'Ho capito',
    cancel: 'Annulla',
    collapse: 'Nascondi consigli di sicurezza',
    expand: 'Mostra consigli di sicurezza',
    bannerShort: 'Incontra in un luogo pubblico. Non pagare per oggetti gratuiti.',
  },
  report: {
    menuTrigger: 'Altre opzioni',
    menuItem: 'Segnala annuncio',
    dialogTitle: 'Segnala annuncio',
    reasonAlreadyTaken: 'Già preso / non più disponibile',
    reasonNotFree: 'Non è gratis',
    reasonSpam: 'Spam o truffa',
    confirm: 'Invia segnalazione',
    close: 'Chiudi',
    successToast: 'Segnalazione inviata — grazie',
    duplicateToast: 'Hai già segnalato questo annuncio',
    errorToast: 'Impossibile inviare la segnalazione — riprova',
  },
  manage: {
    pageTitle: 'I miei annunci',
    emptyTitle: 'Non hai ancora pubblicato annunci',
    emptyCta: 'Pubblica il primo',
    hiddenBannerTitle: 'Nascosto — in revisione',
    hiddenBannerBody:
      'Il tuo annuncio non è visibile agli altri utenti mentre lo verifichiamo.',
    markReserved: 'Segna riservato',
    markDelivered: 'Segna consegnato',
    reservedToast: 'Segnato come riservato',
    deliveredConfirmTitle: 'Segna come consegnato?',
    deliveredConfirmBody: "L'annuncio non sarà più visibile.",
    deliveredConfirmAction: 'Segna consegnato',
    cancel: 'Annulla',
    viewDetail: 'Vedi dettaglio',
    actionError: 'Impossibile aggiornare lo stato — riprova',
  },
  listing: {
    sourceSubito: 'Subito',
    sourceCommunity: 'Community',
    reserved: 'Riservato',
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
