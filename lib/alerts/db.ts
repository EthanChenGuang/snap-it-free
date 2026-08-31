import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import type { AlertRow } from '@/lib/alerts/schemas';
import type { VeniceZone } from '@/lib/listings/types';
import { decodeAlertKeyword, encodeAlertKeyword } from '@/lib/alerts/city-encoding';

export const ALERT_SELECT_WITH_CITY =
  'id, keyword, zone, city, enabled, created_at' as const;
export const ALERT_SELECT_LEGACY = 'id, keyword, zone, enabled, created_at' as const;

export function isMissingAlertsCityColumn(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes('city') && message.includes('column');
}

export function normalizeAlertRow(row: Record<string, unknown>): AlertRow {
  const rawKeyword = (row.keyword as string | null) ?? null;
  const rawCity = (row.city as ConsumerCityKey | null) ?? null;
  const decoded = rawCity ? { keyword: rawKeyword, city: rawCity } : decodeAlertKeyword(rawKeyword);

  return {
    id: String(row.id),
    keyword: decoded.keyword,
    zone: (row.zone as VeniceZone | null) ?? null,
    city: decoded.city,
    enabled: Boolean(row.enabled),
    created_at: String(row.created_at),
  };
}

export async function selectUserAlerts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: AlertRow[] | null; error: string | null; supportsCity: boolean }> {
  const withCity = await supabase
    .from('alerts')
    .select(ALERT_SELECT_WITH_CITY)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!withCity.error) {
    return {
      data: (withCity.data ?? []).map((row) => normalizeAlertRow(row as Record<string, unknown>)),
      error: null,
      supportsCity: true,
    };
  }

  if (!isMissingAlertsCityColumn(withCity.error)) {
    return { data: null, error: withCity.error.message, supportsCity: false };
  }

  const legacy = await supabase
    .from('alerts')
    .select(ALERT_SELECT_LEGACY)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (legacy.error) {
    return { data: null, error: legacy.error.message, supportsCity: false };
  }

  return {
    data: (legacy.data ?? []).map((row) => normalizeAlertRow(row as Record<string, unknown>)),
    error: null,
    supportsCity: false,
  };
}

export async function selectEnabledAlerts(
  supabase: SupabaseClient,
): Promise<{ data: Array<Record<string, unknown>> | null; error: string | null }> {
  const withCity = await supabase
    .from('alerts')
    .select('id, user_id, keyword, zone, city')
    .eq('enabled', true);

  if (!withCity.error) {
    return { data: withCity.data, error: null };
  }

  if (!isMissingAlertsCityColumn(withCity.error)) {
    return { data: null, error: withCity.error.message };
  }

  const legacy = await supabase
    .from('alerts')
    .select('id, user_id, keyword, zone')
    .eq('enabled', true);

  if (legacy.error) {
    return { data: null, error: legacy.error.message };
  }

  return {
    data: (legacy.data ?? []).map((row) => ({ ...row, city: null })),
    error: null,
  };
}

type AlertInsert = {
  user_id: string;
  keyword: string | null;
  zone: VeniceZone | null;
  city: ConsumerCityKey | null;
  enabled: boolean;
};

export async function insertAlert(
  supabase: SupabaseClient,
  row: AlertInsert,
): Promise<{ data: AlertRow | null; error: string | null; cityDropped: boolean }> {
  const withCity = await supabase
    .from('alerts')
    .insert(row)
    .select(ALERT_SELECT_WITH_CITY)
    .single();

  if (!withCity.error) {
    return {
      data: normalizeAlertRow(withCity.data as Record<string, unknown>),
      error: null,
      cityDropped: false,
    };
  }

  if (!row.city || !isMissingAlertsCityColumn(withCity.error)) {
    return { data: null, error: withCity.error.message, cityDropped: false };
  }

  const encodedKeyword = encodeAlertKeyword(row.keyword, row.city);
  const { city: _city, ...legacyRow } = { ...row, keyword: encodedKeyword };
  const legacy = await supabase
    .from('alerts')
    .insert(legacyRow)
    .select(ALERT_SELECT_LEGACY)
    .single();

  if (legacy.error) {
    return { data: null, error: legacy.error.message, cityDropped: true };
  }

  return {
    data: normalizeAlertRow(legacy.data as Record<string, unknown>),
    error: null,
    cityDropped: false,
  };
}

export async function updateAlertRow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ data: AlertRow | null; error: string | null }> {
  const withCity = await supabase
    .from('alerts')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(ALERT_SELECT_WITH_CITY)
    .single();

  if (!withCity.error) {
    return { data: normalizeAlertRow(withCity.data as Record<string, unknown>), error: null };
  }

  if (!('city' in patch) || !isMissingAlertsCityColumn(withCity.error)) {
    return { data: null, error: withCity.error.message };
  }

  const { city: _city, ...legacyPatch } = patch;
  const legacy = await supabase
    .from('alerts')
    .update(legacyPatch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(ALERT_SELECT_LEGACY)
    .single();

  if (legacy.error) {
    return { data: null, error: legacy.error.message };
  }

  return { data: normalizeAlertRow(legacy.data as Record<string, unknown>), error: null };
}

export async function selectAlertById(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const withCity = await supabase
    .from('alerts')
    .select('id, keyword, zone, city, enabled')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!withCity.error) {
    return { data: withCity.data, error: null };
  }

  if (!isMissingAlertsCityColumn(withCity.error)) {
    return { data: null, error: withCity.error.message };
  }

  const legacy = await supabase
    .from('alerts')
    .select('id, keyword, zone, enabled')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (legacy.error) {
    return { data: null, error: legacy.error.message };
  }

  return {
    data: legacy.data ? { ...legacy.data, city: null } : null,
    error: null,
  };
}
