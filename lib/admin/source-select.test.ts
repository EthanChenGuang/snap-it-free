import { describe, expect, it } from 'vitest';
import { isMissingSessionEncColumn } from './source-select';

describe('isMissingSessionEncColumn', () => {
  it('detects Postgres undefined column code', () => {
    expect(isMissingSessionEncColumn({ code: '42703', message: 'column does not exist' })).toBe(
      true,
    );
  });

  it('detects PostgREST schema cache miss for session_enc', () => {
    expect(
      isMissingSessionEncColumn({
        code: 'PGRST204',
        message: "Could not find the 'session_enc' column of 'scraper_sources' in the schema cache",
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isMissingSessionEncColumn({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingSessionEncColumn(null)).toBe(false);
  });
});
