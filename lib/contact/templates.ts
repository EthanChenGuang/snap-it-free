import type { AppLanguage } from '@/lib/settings/preferences';
import type { ListingSource } from '@/lib/listings/types';

export type ContactTemplateId = 'today' | 'tomorrow' | 'address' | 'time';

export type ContactTemplate = { id: ContactTemplateId; it: string };

/** Italian texts sent to the seller; their meanings live in messages.contactAssistant.templates. */
export const CONTACT_TEMPLATES: readonly ContactTemplate[] = [
  { id: 'today', it: 'Ciao! È ancora disponibile? Posso passare oggi. Grazie!' },
  { id: 'tomorrow', it: 'Ciao! È ancora disponibile? Posso passare domani. Grazie!' },
  { id: 'address', it: 'Ciao! Mi interessa. Dove si trova per il ritiro? Grazie!' },
  { id: 'time', it: 'Ciao! Mi interessa. A che ora posso passare? Grazie!' },
];

/** Italian-language users keep opening the seller's page directly; UGC listings have no external seller. */
export function shouldUseContactAssistant({
  language,
  source,
}: {
  language: AppLanguage;
  source: ListingSource;
}): boolean {
  return (language === 'zh' || language === 'en') && source !== 'ugc';
}
