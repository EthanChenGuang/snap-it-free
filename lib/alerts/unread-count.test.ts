import { describe, expect, it } from 'vitest';
import { countUnread } from './unread-count';

describe('countUnread', () => {
  it('counts rows where read_at is null', () => {
    const rows = [
      { read_at: null },
      { read_at: '2026-08-01T12:00:00Z' },
      { read_at: null },
    ];
    expect(countUnread(rows)).toBe(2);
  });

  it('returns zero when all matches are read', () => {
    const rows = [
      { read_at: '2026-08-01T12:00:00Z' },
      { read_at: '2026-08-01T13:00:00Z' },
    ];
    expect(countUnread(rows)).toBe(0);
  });

  it('returns zero for empty input', () => {
    expect(countUnread([])).toBe(0);
  });
});
