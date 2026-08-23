import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
  isMissingSessionEncColumn,
  selectSourceBySlug,
  selectSourcesForList,
} from './source-select';

const SUBITO_ROW = {
  slug: 'subito',
  display_name: 'Subito',
  implementation_status: 'live',
  enabled: true,
  interval_minutes: 90,
  anti_block_preset: 'standard',
  target_urls: ['https://www.subito.it/regalo/'],
  use_proxy_url: false,
  session_enc: null,
};

type SchemaOptions = {
  hasUseProxyUrl?: boolean;
  hasSessionEnc?: boolean;
  failWith?: { code: string; message: string };
};

/** Simulates PostgREST rejecting selects that reference a column absent from the schema. */
function mockSupabase(options: SchemaOptions = {}) {
  const { hasUseProxyUrl = true, hasSessionEnc = true, failWith } = options;
  const requestedSelects: string[] = [];

  const resolve = (fields: string) => {
    requestedSelects.push(fields);

    if (failWith) {
      return { data: null, error: failWith };
    }
    if (!hasUseProxyUrl && fields.includes('use_proxy_url')) {
      return {
        data: null,
        error: {
          code: '42703',
          message: 'column scraper_sources.use_proxy_url does not exist',
        },
      };
    }
    if (!hasSessionEnc && fields.includes('session_enc')) {
      return {
        data: null,
        error: {
          code: '42703',
          message: 'column scraper_sources.session_enc does not exist',
        },
      };
    }

    const row: Record<string, unknown> = { ...SUBITO_ROW };
    if (!hasUseProxyUrl) delete row.use_proxy_url;
    if (!hasSessionEnc) delete row.session_enc;
    return { data: row, error: null };
  };

  const client = {
    from: () => ({
      select: (fields: string) => ({
        eq: () => ({
          maybeSingle: async () => resolve(fields),
        }),
        order: async () => {
          const result = resolve(fields);
          return {
            data: result.data ? [result.data] : null,
            error: result.error,
          };
        },
      }),
    }),
  } as unknown as SupabaseClient;

  return { client, requestedSelects };
}

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

describe('selectSourceBySlug', () => {
  it('reads both optional columns when the schema is current', async () => {
    const { client } = mockSupabase();
    const result = await selectSourceBySlug(client, 'subito');

    expect(result.row?.slug).toBe('subito');
    expect(result.sessionEncAvailable).toBe(true);
    expect(result.useProxyUrlAvailable).toBe(true);
  });

  it('still returns the source when use_proxy_url is not migrated yet', async () => {
    const { client } = mockSupabase({ hasUseProxyUrl: false });
    const result = await selectSourceBySlug(client, 'subito');

    expect(result.row?.slug).toBe('subito');
    expect(result.row?.use_proxy_url).toBeNull();
    expect(result.useProxyUrlAvailable).toBe(false);
    expect(result.sessionEncAvailable).toBe(true);
  });

  it('still returns the source when session_enc is not migrated yet', async () => {
    const { client } = mockSupabase({ hasSessionEnc: false });
    const result = await selectSourceBySlug(client, 'subito');

    expect(result.row?.slug).toBe('subito');
    expect(result.row?.session_enc).toBeNull();
    expect(result.sessionEncAvailable).toBe(false);
    expect(result.useProxyUrlAvailable).toBe(true);
  });

  it('still returns the source when both optional columns are missing', async () => {
    const { client } = mockSupabase({ hasUseProxyUrl: false, hasSessionEnc: false });
    const result = await selectSourceBySlug(client, 'subito');

    expect(result.row?.slug).toBe('subito');
    expect(result.useProxyUrlAvailable).toBe(false);
    expect(result.sessionEncAvailable).toBe(false);
  });

  it('returns no row for errors unrelated to schema drift', async () => {
    const { client } = mockSupabase({
      failWith: { code: '42501', message: 'permission denied for table scraper_sources' },
    });
    const result = await selectSourceBySlug(client, 'subito');

    expect(result.row).toBeNull();
  });
});

describe('selectSourcesForList', () => {
  it('returns rows when the schema is current', async () => {
    const { client } = mockSupabase();
    const result = await selectSourcesForList(client);

    expect(result.rows?.[0]?.slug).toBe('subito');
    expect(result.useProxyUrlAvailable).toBe(true);
  });

  it('returns rows without use_proxy_url instead of failing the whole list', async () => {
    const { client } = mockSupabase({ hasUseProxyUrl: false });
    const result = await selectSourcesForList(client);

    expect(result.rows?.[0]?.slug).toBe('subito');
    expect(result.useProxyUrlAvailable).toBe(false);
  });

  it('returns null rows for errors unrelated to schema drift', async () => {
    const { client } = mockSupabase({
      failWith: { code: '42501', message: 'permission denied for table scraper_sources' },
    });
    const result = await selectSourcesForList(client);

    expect(result.rows).toBeNull();
  });
});
