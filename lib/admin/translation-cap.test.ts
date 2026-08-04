import { describe, expect, it, vi } from 'vitest';
import { checkAndIncrementUsage, checkTranslationCap } from './translation-cap';

describe('checkTranslationCap', () => {
  it('at cap returns pauseTranslate true and scrapeAllowed true (D-43)', () => {
    const result = checkTranslationCap(500, 500);
    expect(result).toEqual({ pauseTranslate: true, scrapeAllowed: true });
  });

  it('below cap allows translation', () => {
    const result = checkTranslationCap(499, 500);
    expect(result).toEqual({ pauseTranslate: false, scrapeAllowed: true });
  });
});

describe('checkAndIncrementUsage', () => {
  it('increments usage when under cap', async () => {
    const update = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                translations_today: 10,
                translations_reset_date: new Date().toISOString().slice(0, 10),
                daily_translation_cap: 500,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: update,
        }),
      }),
    };

    const result = await checkAndIncrementUsage(supabase as never);
    expect(result).toEqual({ allowed: true, pausedAutoTranslate: false });
    expect(update).toHaveBeenCalled();
  });

  it('returns paused when at daily cap', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                translations_today: 500,
                translations_reset_date: new Date().toISOString().slice(0, 10),
                daily_translation_cap: 500,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await checkAndIncrementUsage(supabase as never);
    expect(result).toEqual({ allowed: false, pausedAutoTranslate: true });
  });
});
