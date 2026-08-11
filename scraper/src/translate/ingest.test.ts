import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { translateBatch, loadTranslateBatchState, DEFAULT_TRANSLATE_CONCURRENCY } from './ingest.js';
import type { TranslationWorkItem } from './ingest.js';
import { translateListingFields } from './engine.js';

vi.mock('./engine.js', () => ({
  translateListingFields: vi.fn(),
}));

const mockedTranslateListingFields = vi.mocked(translateListingFields);

const FIXED_TRANSLATION = {
  title_en: 'Lamp',
  title_zh: '灯',
  description_en: 'A lamp',
  description_zh: '一盏灯',
  category_en: 'Home',
  category_zh: '家居',
};

function createMockSupabase(config: {
  autoTranslate: boolean;
  translationsToday: number;
  dailyCap: number;
  resetDate?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const configRow = {
    auto_translate: config.autoTranslate,
    translation_provider: 'gemini',
    translations_today: config.translationsToday,
    translations_reset_date: config.resetDate ?? today,
    daily_translation_cap: config.dailyCap,
  };

  const configMaybeSingle = vi.fn().mockResolvedValue({ data: configRow, error: null });
  const configSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ maybeSingle: configMaybeSingle }),
  });

  const configUpdates: Record<string, unknown>[] = [];
  const configUpdate = vi.fn((payload: Record<string, unknown>) => {
    configUpdates.push(payload);
    return { eq: vi.fn().mockResolvedValue({ error: null }) };
  });

  const listingsUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const queueAttempts = new Map<string, number>();
  const queueSelect = vi.fn().mockReturnValue({
    eq: vi.fn((_col: string, listingId: string) => ({
      maybeSingle: vi.fn().mockResolvedValue(
        queueAttempts.has(listingId)
          ? { data: { attempts: queueAttempts.get(listingId) } }
          : { data: null },
      ),
    })),
  });

  const queueUpserts: Record<string, unknown>[] = [];
  const queueUpsert = vi.fn((payload: Record<string, unknown>) => {
    queueUpserts.push(payload);
    return Promise.resolve({ error: null });
  });

  const queueDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const from = vi.fn((table: string) => {
    if (table === 'scraper_global_config') {
      return { select: configSelect, update: configUpdate };
    }
    if (table === 'listings') {
      return { update: listingsUpdate };
    }
    if (table === 'translation_queue') {
      return { select: queueSelect, upsert: queueUpsert, delete: queueDelete };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    supabase: { from } as unknown as SupabaseClient,
    configSelect,
    configMaybeSingle,
    configUpdate,
    configUpdates,
    listingsUpdate,
    queueUpsert,
    queueUpserts,
    queueDelete,
    setQueueAttempts: (listingId: string, attempts: number) => queueAttempts.set(listingId, attempts),
  };
}

function buildItems(count: number): TranslationWorkItem[] {
  return Array.from({ length: count }, (_, i) => ({
    listingId: `listing-${i}`,
    fields: { title: `Title ${i}`, description: `Description ${i}`, category: null },
  }));
}

describe('translateBatch', () => {
  beforeEach(() => {
    mockedTranslateListingFields.mockReset();
  });

  it('loads scraper_global_config exactly once per batch regardless of item count', async () => {
    const items = buildItems(5);
    const { supabase, configSelect, configMaybeSingle } = createMockSupabase({
      autoTranslate: true,
      dailyCap: 100,
      translationsToday: 0,
    });
    mockedTranslateListingFields.mockResolvedValue({ ok: true, translations: FIXED_TRANSLATION });

    await translateBatch(supabase, items);

    expect(configSelect).toHaveBeenCalledOnce();
    expect(configMaybeSingle).toHaveBeenCalledOnce();
    expect(mockedTranslateListingFields).toHaveBeenCalledTimes(5);
  });

  it('makes zero LLM calls and zero further writes when auto_translate is false', async () => {
    const items = buildItems(3);
    const { supabase, configSelect, listingsUpdate } = createMockSupabase({
      autoTranslate: false,
      dailyCap: 100,
      translationsToday: 0,
    });

    await translateBatch(supabase, items);

    expect(configSelect).toHaveBeenCalledOnce();
    expect(mockedTranslateListingFields).not.toHaveBeenCalled();
    expect(listingsUpdate).not.toHaveBeenCalled();
  });

  it('returns immediately for an empty work list without any Supabase calls', async () => {
    const { supabase, configSelect } = createMockSupabase({
      autoTranslate: true,
      dailyCap: 100,
      translationsToday: 0,
    });

    await translateBatch(supabase, []);

    expect(configSelect).not.toHaveBeenCalled();
    expect(mockedTranslateListingFields).not.toHaveBeenCalled();
  });

  it('stops dispatching once the daily cap is exhausted mid-batch, with no over-count from concurrent dispatch', async () => {
    const items = buildItems(5);
    const { supabase, configUpdates } = createMockSupabase({
      autoTranslate: true,
      dailyCap: 2,
      translationsToday: 0,
    });
    mockedTranslateListingFields.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, translations: FIXED_TRANSLATION }), 5);
        }),
    );

    await translateBatch(supabase, items);

    expect(mockedTranslateListingFields).toHaveBeenCalledTimes(2);
    const finalUpdate = configUpdates[configUpdates.length - 1];
    expect(finalUpdate.translations_today).toBe(2);
  });

  it('still queues a translation failure into translation_queue with incrementing attempts', async () => {
    const items = buildItems(1);
    const { supabase, queueUpsert, queueUpserts, listingsUpdate, setQueueAttempts } = createMockSupabase({
      autoTranslate: true,
      dailyCap: 10,
      translationsToday: 0,
    });
    setQueueAttempts('listing-0', 2);
    mockedTranslateListingFields.mockResolvedValue({
      ok: false,
      queue: true,
      error: 'All translation providers failed',
    });

    await translateBatch(supabase, items);

    expect(queueUpsert).toHaveBeenCalledOnce();
    expect(queueUpserts[0]).toMatchObject({ attempts: 3, status: 'pending' });
    expect(listingsUpdate).not.toHaveBeenCalled();
  });

  it('caps concurrent translateListingFields invocations at the configured limit', async () => {
    const items = buildItems(8);
    const { supabase } = createMockSupabase({
      autoTranslate: true,
      dailyCap: 100,
      translationsToday: 0,
    });
    let inFlight = 0;
    let maxInFlight = 0;
    mockedTranslateListingFields.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { ok: true, translations: FIXED_TRANSLATION };
    });

    await translateBatch(supabase, items, 3);

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(mockedTranslateListingFields).toHaveBeenCalledTimes(8);
  });

  it('respects the default concurrency constant when no override is passed', () => {
    expect(DEFAULT_TRANSLATE_CONCURRENCY).toBe(4);
  });
});

describe('loadTranslateBatchState', () => {
  it('returns null when the config row is missing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const state = await loadTranslateBatchState(supabase);

    expect(state).toBeNull();
  });
});
