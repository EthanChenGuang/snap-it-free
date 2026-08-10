import type { SupabaseClient } from '@supabase/supabase-js';

export const ROME_TIMEZONE = 'Europe/Rome';

const QUIET_HOURS_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type QuietHoursPrefs = {
  dndEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

export function isValidQuietHoursPayload(value: unknown): value is QuietHoursPrefs {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.dndEnabled === 'boolean' &&
    typeof record.quietStart === 'string' &&
    QUIET_HOURS_TIME_RE.test(record.quietStart) &&
    typeof record.quietEnd === 'string' &&
    QUIET_HOURS_TIME_RE.test(record.quietEnd)
  );
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function currentRomeMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export function isQuietHoursActive(
  prefs: { dndEnabled: boolean; quietStart: string; quietEnd: string } | undefined,
  nowMinutes: number = currentRomeMinutes(),
): boolean {
  if (!prefs?.dndEnabled) return false;
  const start = timeToMinutes(prefs.quietStart);
  const end = timeToMinutes(prefs.quietEnd);
  if (start === end) return true;
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  return nowMinutes >= start || nowMinutes < end;
}

export async function loadUserQuietHours(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, QuietHoursPrefs>> {
  const quietHoursByUser = new Map<string, QuietHoursPrefs>();
  if (userIds.length === 0) return quietHoursByUser;

  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('user_id, dnd_enabled, quiet_start, quiet_end')
    .in('user_id', userIds);

  if (error) return quietHoursByUser;

  for (const row of data ?? []) {
    quietHoursByUser.set(row.user_id, {
      dndEnabled: row.dnd_enabled,
      quietStart: row.quiet_start,
      quietEnd: row.quiet_end,
    });
  }

  return quietHoursByUser;
}

export async function syncUserNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
  prefs: QuietHoursPrefs,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('user_notification_prefs').upsert(
    {
      user_id: userId,
      dnd_enabled: prefs.dndEnabled,
      quiet_start: prefs.quietStart,
      quiet_end: prefs.quietEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
