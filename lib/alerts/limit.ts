/** D-101: max active alerts per user. */
export const MAX_ALERTS = 5;

export function canCreateAlert(currentCount: number): boolean {
  return currentCount < MAX_ALERTS;
}
