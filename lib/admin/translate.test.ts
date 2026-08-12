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

function mockFetchResponse(body: unknown, ok = true) {
  const text = JSON.stringify(body);
  return {
    ok,
    status: ok ? 200 : 500,
    text: async () => text,
    json: async () => body,
  };
}

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
    const fetchFn = vi.fn().mockResolvedValue(
      mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(SAMPLE_OUTPUT) } }],
        usage: { prompt_tokens: 320, completion_tokens: 130 },
      }),
    );

    const result = await translateListingWithProviders(input, {
      openRouterApiKey: 'key',
      openRouterModel: 'test/model',
      fetchFn,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.usage.inputTokens).toBe(320);
      expect(result.usage.outputTokens).toBe(130);
      expect(result.usage.costUsd).toBeGreaterThan(0);
    }
    expect(fetchFn.mock.calls[0][1].signal instanceof AbortSignal).toBe(true);
  });

  it('returns as soon as the first provider succeeds (parallel race)', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('generativelanguage.googleapis.com')) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockFetchResponse({
          candidates: [{ content: { parts: [{ text: JSON.stringify(SAMPLE_OUTPUT) }] } }],
          usageMetadata: { promptTokenCount: 320, candidatesTokenCount: 130 },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockFetchResponse({
        choices: [{ message: { content: JSON.stringify(SAMPLE_OUTPUT) } }],
      });
    });

    const start = Date.now();
    const result = await translateListingWithProviders(input, {
      geminiApiKey: 'gemini-key',
      openRouterApiKey: 'or-key',
      openRouterModel: 'test/model',
      geminiModel: 'gemini-flash-latest',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(Date.now() - start).toBeLessThan(400);
  });

  it('treats an aborted OpenRouter call as a failure and still reports the queue signal', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    const result = await translateListingWithProviders(input, {
      openRouterApiKey: 'key',
      openRouterModel: 'test/model',
      fetchFn,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('OpenRouter (test/model)');
    }
  });
});
