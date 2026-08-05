import { describe, expect, it, vi } from 'vitest';
import { translateListing, translateListingWithProviders } from './translate';

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

  it('returns OpenRouter result on success', async () => {
    const result = await translateListing(input, {
      openRouterGenerate: vi.fn().mockResolvedValue(JSON.stringify(SAMPLE_OUTPUT)),
      geminiGenerate: vi.fn(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.translations.title_en).toBe('Free sofa');
    }
  });

  it('falls back to Gemini when OpenRouter fails', async () => {
    const result = await translateListing(input, {
      openRouterGenerate: vi.fn().mockRejectedValue(new Error('OpenRouter down')),
      geminiGenerate: vi.fn().mockResolvedValue(JSON.stringify(SAMPLE_OUTPUT)),
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

describe('translateListingWithProviders timeout wiring', () => {
  const input = {
    title: 'Divano gratis',
    description: 'Buone condizioni',
    category: 'Arredamento',
  };

  it('passes an AbortSignal to every OpenRouter fetch call', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(SAMPLE_OUTPUT) } }] }),
    });

    const result = await translateListingWithProviders(input, {
      openRouterApiKey: 'key',
      fetchFn,
    });

    expect(result.ok).toBe(true);
    expect(fetchFn.mock.calls[0][1].signal instanceof AbortSignal).toBe(true);
  });

  it('treats an aborted OpenRouter call as a failure and still reports the queue signal', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    const result = await translateListingWithProviders(input, {
      openRouterApiKey: 'key',
      fetchFn,
    });

    expect(result).toEqual({
      ok: false,
      queue: true,
      error: 'All translation providers failed',
    });
  });
});
