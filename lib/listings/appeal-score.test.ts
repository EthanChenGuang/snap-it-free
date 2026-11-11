import { describe, expect, it, vi } from 'vitest';
import { parseAppealScore, scoreListingAppeal } from './appeal-score';

describe('parseAppealScore', () => {
  it('reads 1-5 from JSON and rejects anything else', () => {
    expect(parseAppealScore('{"score": 4}')).toBe(4);
    expect(parseAppealScore('```json\n{"score":"5"}\n```')).toBe(5);
    expect(parseAppealScore('{"score": 7}')).toBeNull();
    expect(parseAppealScore('nice sofa')).toBeNull();
  });
});

describe('scoreListingAppeal', () => {
  const image = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });

  it('sends the watermark-free thumbnail and the key in a header, and returns score and tokens', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.startsWith('https://images.sbito.it')) return image();
      expect(href).not.toContain('key=');
      expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
      const body = JSON.parse(String(init?.body));
      expect(body.contents[0].parts[2].inline_data.mime_type).toBe('image/jpeg');
      return Response.json({
        candidates: [{ content: { parts: [{ text: '{"score": 5}' }] } }],
        usageMetadata: { promptTokenCount: 420, candidatesTokenCount: 6 },
      });
    });
    const result = await scoreListingAppeal(
      { title: 'Divano', category: 'arredamento-casalinghi', photoUrl: 'https://images.sbito.it/x?rule=gallery-mobile-1x-auto' },
      { apiKey: 'k', model: 'gemini-test', fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(result).toEqual({ ok: true, score: 5, inputTokens: 420, outputTokens: 6 });
    expect(String(fetchFn.mock.calls[0][0])).toContain('rule=card-mobile-new-small-2x-auto');
  });

  it('fails softly when the photo or the model answer is unusable', async () => {
    const noPhoto = vi.fn(async () => new Response('x', { status: 404 }));
    expect(await scoreListingAppeal({ title: 't', photoUrl: 'https://images.sbito.it/x' }, { apiKey: 'k', fetchFn: noPhoto as unknown as typeof fetch })).toEqual({ ok: false, error: 'photo_unavailable' });
    const garbage = vi.fn(async (url: string | URL | Request) =>
      String(url).startsWith('https://images.sbito.it') ? image() : Response.json({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }),
    );
    expect(await scoreListingAppeal({ title: 't', photoUrl: 'https://images.sbito.it/x' }, { apiKey: 'k', fetchFn: garbage as unknown as typeof fetch })).toEqual({ ok: false, error: 'unparsable' });
  });
});
