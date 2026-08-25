import type { AppLanguage } from '@/lib/settings/preferences';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_USER_AGENT = 'ZeroDollar/1.0 (location-picker; +https://github.com/snap-it-free)';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

export type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

const LOCALITY_KEYS: (keyof NominatimAddress)[] = [
  'city',
  'town',
  'village',
  'municipality',
  'county',
];

/** Pick the most specific locality label from a Nominatim address block. */
export function extractLocalityLabel(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  for (const key of LOCALITY_KEYS) {
    const value = address[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function resolvePlaceLabelFromNominatim(
  payload: NominatimReverseResponse,
): string | null {
  const locality = extractLocalityLabel(payload.address);
  if (locality) return locality;
  const displayName = payload.display_name?.trim();
  if (!displayName) return null;
  return displayName.split(',')[0]?.trim() || null;
}

function nominatimAcceptLanguage(language: AppLanguage): string {
  switch (language) {
    case 'zh':
      return 'zh-CN,zh;q=0.9,en;q=0.8';
    case 'it':
      return 'it,it-IT;q=0.9,en;q=0.8';
    default:
      return 'en,en-US;q=0.9';
  }
}

export async function fetchReverseGeocodeLabel(
  lat: number,
  lng: number,
  language: AppLanguage,
): Promise<string | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '14');

  const response = await fetch(url, {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      'Accept-Language': nominatimAcceptLanguage(language),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as NominatimReverseResponse;
  return resolvePlaceLabelFromNominatim(payload);
}
