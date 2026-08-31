import { describe, expect, it } from 'vitest';
import { isMissingAlertsCityColumn, normalizeAlertRow } from './db';

describe('isMissingAlertsCityColumn', () => {
  it('detects missing city column errors from PostgREST', () => {
    expect(
      isMissingAlertsCityColumn({
        message: 'column alerts.city does not exist',
      }),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isMissingAlertsCityColumn({ message: 'permission denied' })).toBe(false);
  });
});

describe('normalizeAlertRow', () => {
  it('defaults city to null when absent', () => {
    expect(
      normalizeAlertRow({
        id: 'abc',
        keyword: 'bike',
        zone: null,
        enabled: true,
        created_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'abc',
      keyword: 'bike',
      zone: null,
      city: null,
      enabled: true,
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('decodes legacy encoded keyword payloads', () => {
    expect(
      normalizeAlertRow({
        id: 'abc',
        keyword: '@city:venice@apple',
        zone: null,
        enabled: true,
        created_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'abc',
      keyword: 'apple',
      zone: null,
      city: 'venice',
      enabled: true,
      created_at: '2026-01-01T00:00:00Z',
    });
  });
});
