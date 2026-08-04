import { describe, expect, it, vi } from 'vitest';
import {
  buildMatchPushContent,
  isValidAppLanguage,
  resolveListingTitle,
  syncUserLocale,
} from './locale';

describe('isValidAppLanguage', () => {
  it('accepts zh, en, it', () => {
    expect(isValidAppLanguage('zh')).toBe(true);
    expect(isValidAppLanguage('en')).toBe(true);
    expect(isValidAppLanguage('it')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidAppLanguage('fr')).toBe(false);
    expect(isValidAppLanguage(null)).toBe(false);
    expect(isValidAppLanguage(undefined)).toBe(false);
  });
});

describe('resolveListingTitle', () => {
  const row = { title: 'Divano', title_en: 'Free sofa', title_zh: '免费沙发' };

  it('uses title_en for en locale when present', () => {
    expect(resolveListingTitle(row, 'en')).toBe('Free sofa');
  });

  it('uses title_zh for zh locale when present', () => {
    expect(resolveListingTitle(row, 'zh')).toBe('免费沙发');
  });

  it('falls back to title when translation column is null', () => {
    expect(resolveListingTitle({ title: 'Sofa' }, 'en')).toBe('Sofa');
  });

  it('uses original title for it locale', () => {
    expect(resolveListingTitle(row, 'it')).toBe('Divano');
  });
});

describe('buildMatchPushContent', () => {
  it('builds English push body for en locale', () => {
    const { title, body } = buildMatchPushContent(
      {
        title: 'Divano',
        title_en: 'Free sofa',
        zone: 'mestre_marghera',
      },
      'en',
    );

    expect(title).toBe('Free sofa');
    expect(body).toContain('New free item');
  });

  it('builds Chinese push body for zh locale', () => {
    const { body } = buildMatchPushContent(
      {
        title: 'Divano',
        title_zh: '免费沙发',
        zone: 'mestre_marghera',
      },
      'zh',
    );

    expect(body).toContain('新的免费物品');
  });
});

describe('syncUserLocale', () => {
  it('upserts profile and updates push subscriptions', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const from = vi.fn((table: string) => {
      if (table === 'profiles') return { upsert };
      if (table === 'push_subscriptions') return { update };
      throw new Error(`unexpected table ${table}`);
    });

    const supabase = { from } as never;
    const result = await syncUserLocale(supabase, 'user-1', 'en');

    expect(result.error).toBeNull();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', language: 'en' }),
      { onConflict: 'user_id' },
    );
    expect(update).toHaveBeenCalledWith({ locale: 'en' });
  });
});
