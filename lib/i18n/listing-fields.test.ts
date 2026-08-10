import { describe, expect, it } from 'vitest';
import {
  resolveListingCategory,
  resolveListingDescription,
  resolveListingTitle,
} from '@/lib/i18n/listing-fields';

describe('resolveListingTitle', () => {
  it('returns title_en for English when present', () => {
    expect(resolveListingTitle({ title: 'Sofa', title_en: 'Free sofa' }, 'en')).toBe('Free sofa');
  });

  it('falls back to title for English when title_en absent', () => {
    expect(resolveListingTitle({ title: 'Sofa' }, 'en')).toBe('Sofa');
  });

  it('returns title_zh for Chinese when present', () => {
    expect(resolveListingTitle({ title: 'Divano', title_zh: '免费沙发' }, 'zh')).toBe('免费沙发');
  });

  it('falls back to title for Chinese when title_zh absent', () => {
    expect(resolveListingTitle({ title: 'Divano' }, 'zh')).toBe('Divano');
  });

  it('returns original title for Italian regardless of translation columns', () => {
    expect(
      resolveListingTitle({ title: 'Divano', title_en: 'Sofa', title_zh: '沙发' }, 'it'),
    ).toBe('Divano');
  });

  it('returns original title for UGC without translation columns', () => {
    expect(resolveListingTitle({ title: 'My old bike' }, 'en')).toBe('My old bike');
  });

  it('ignores empty translation columns', () => {
    expect(resolveListingTitle({ title: 'Sofa', title_en: '', title_zh: null }, 'en')).toBe('Sofa');
  });
});

describe('resolveListingDescription', () => {
  it('returns description_en for English when present', () => {
    expect(
      resolveListingDescription(
        { description: 'Descrizione', description_en: 'Description' },
        'en',
      ),
    ).toBe('Description');
  });

  it('falls back to description for English when description_en absent', () => {
    expect(resolveListingDescription({ description: 'Descrizione' }, 'en')).toBe('Descrizione');
  });

  it('returns description_zh for Chinese when present', () => {
    expect(
      resolveListingDescription({ description: 'Descrizione', description_zh: '描述' }, 'zh'),
    ).toBe('描述');
  });

  it('returns original description for Italian', () => {
    expect(
      resolveListingDescription(
        { description: 'Descrizione', description_en: 'Description' },
        'it',
      ),
    ).toBe('Descrizione');
  });

  it('returns null when no description fields provided', () => {
    expect(resolveListingDescription({}, 'en')).toBeNull();
  });
});

describe('resolveListingCategory', () => {
  it('returns category_en when locale en and column populated (D-31)', () => {
    expect(
      resolveListingCategory(
        { category: 'informatica', category_en: 'Computing', category_zh: '电脑' },
        'en',
      ),
    ).toBe('Computing');
  });

  it('returns category_zh when locale zh and column populated (D-31)', () => {
    expect(
      resolveListingCategory(
        { category: 'informatica', category_en: 'Computing', category_zh: '电脑' },
        'zh',
      ),
    ).toBe('电脑');
  });

  it('falls back to Italian catalog label when translation absent', () => {
    expect(resolveListingCategory({ category: 'informatica' }, 'en')).toBe('Informatica');
  });

  it('returns null when category and inference both absent', () => {
    expect(resolveListingCategory({ category: null, title: 'Misc item' }, 'it')).toBeNull();
  });

  it('returns Italian catalog label via inference when category null (D-07)', () => {
    expect(
      resolveListingCategory({ category: null, title: 'Monitor 24 pollici' }, 'it'),
    ).toBe('Informatica');
  });

  it('returns label for inferred slug when DB slug unknown (D-18 display)', () => {
    expect(
      resolveListingCategory(
        { category: 'bogus-slug', title: 'Monitor 24 pollici' },
        'it',
      ),
    ).toBe('Informatica');
  });
});
