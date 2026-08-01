export type AlertMatchRow = {
  read_at: string | null;
};

/** D-113: count unread in-app matches for badge. */
export function countUnread(rows: AlertMatchRow[]): number {
  return rows.filter((row) => row.read_at === null).length;
}
