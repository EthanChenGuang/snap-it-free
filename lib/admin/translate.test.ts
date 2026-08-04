import { describe, expect, it, vi } from 'vitest';
import { translateListing } from './translate';

const SAMPLE_OUTPUT = {
  title_en: 'Free sofa',
  title_zh: '免费沙发',
  description_en: 'Good condition',
  description_zh: '状况良好',
  category_en: 'Furniture',
  category_zh: '家具',
};

describe('translateListing', () => {
  const input = {
    title: 'Divano gratis',
    description: 'Buone condizioni',
    category: 'Arredamento',
  };

  it('returns Gemini result on success (D-26)', async () => {
    const result = await translateListing(input, {
      geminiGenerate: vi.fn().mockResolvedValue(JSON.stringify(SAMPLE_OUTPUT)),
      openRouterGenerate: vi.fn(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.translations.title_en).toBe('Free sofa');
    }
  });

  it('falls back to OpenRouter when Gemini fails (D-27)', async () => {
    const result = await translateListing(input, {
      geminiGenerate: vi.fn().mockRejectedValue(new Error('Gemini down')),
      openRouterGenerate: vi.fn().mockResolvedValue(JSON.stringify(SAMPLE_OUTPUT)),
    });
    expect(result.ok).toBe(true);
  });

  it('returns queue signal when both providers fail (D-27)', async () => {
    const result = await translateListing(input, {
      geminiGenerate: vi.fn().mockResolvedValue(null),
      openRouterGenerate: vi.fn().mockResolvedValue(null),
    });
    expect(result).toEqual({
      ok: false,
      queue: true,
      error: 'All translation providers failed',
    });
  });
});
