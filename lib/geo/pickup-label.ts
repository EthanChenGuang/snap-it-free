import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import type { Messages } from '@/messages';
import type { AppLanguage } from '@/lib/settings/preferences';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import {
  nearestCatalogCity,
  resolvePickupLocation,
  type PickupLocationResolution,
} from '@/lib/geo/pickup-location';

export function consumerCityLabelFromKey(
  key: ConsumerCityKey,
  messages: Messages,
): string {
  return consumerCityLabelsFromMessages(messages)[key];
}

/** Localized label for map pin / post form — nearest catalog city when outside bboxes. */
export function pickupDisplayLabel(
  lat: number,
  lng: number,
  messages: Messages,
  _language?: AppLanguage,
): string {
  return pickupDisplayLabelFromResolution(resolvePickupLocation(lat, lng), messages);
}

export function pickupDisplayLabelFromResolution(
  resolved: PickupLocationResolution,
  messages: Messages,
): string {
  const city = resolved.catalogCity ?? resolved.nearestCity;
  return consumerCityLabelFromKey(city.consumerKey, messages);
}

/** Geocode loading fallback — catalog city only when inside a bbox; empty for "other" areas. */
export function geocodeFallbackLabel(
  lat: number,
  lng: number,
  messages: Messages,
): string {
  const resolved = resolvePickupLocation(lat, lng);
  if (!resolved.catalogCity) return '';
  return consumerCityLabelFromKey(resolved.catalogCity.consumerKey, messages);
}

function normalizePlaceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** User-facing label: locality from reverse geocode + catalog city when they differ. */
export function formatCombinedPlaceLabel(
  locality: string,
  catalogCityLabel: string,
  format: (locality: string, catalogCity: string) => string = (a, b) => `${a} · ${b}`,
): string {
  const trimmedLocality = locality.trim();
  const trimmedCatalog = catalogCityLabel.trim();
  if (!trimmedLocality) return trimmedCatalog;
  if (!trimmedCatalog) return trimmedLocality;
  if (normalizePlaceName(trimmedLocality) === normalizePlaceName(trimmedCatalog)) {
    return trimmedLocality;
  }
  return format(trimmedLocality, trimmedCatalog);
}

export function combinedPickupDisplayLabel(
  locality: string,
  lat: number,
  lng: number,
  messages: Messages,
  format: (locality: string, catalogCity: string) => string,
): string {
  const catalogLabel = pickupDisplayLabel(lat, lng, messages);
  return formatCombinedPlaceLabel(locality, catalogLabel, format);
}

/** Backward-compatible two-city fallback — delegates to full catalog nearest lookup. */
export function resolveCityLabel(
  lat: number,
  lng: number,
  cityLabels: { venice: string; padova: string },
): string {
  const nearest = nearestCatalogCity(lat, lng);
  if (nearest.consumerKey === 'venice') return cityLabels.venice;
  if (nearest.consumerKey === 'padova') return cityLabels.padova;
  return nearest.labelIt;
}

export const VENICE_CENTER = { lat: 45.44, lng: 12.33 };
