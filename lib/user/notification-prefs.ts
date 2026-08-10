export const ROME_TIMEZONE = 'Europe/Rome';

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
