import { describe, expect, it, vi } from 'vitest';
import { parseTranslateResult, translateContactText } from './translate';

describe('parseTranslateResult', () => {
  const reply = (n: number) => ({
    meaning: 'm',
    replies: Array.from({ length: n }, (_, i) => ({ italian: `r${i}`, meaning: `rm${i}` })),
    extra: 'x',
  });

  it('parses a valid reply result and drops extra fields', () => {
    expect(parseTranslateResult('reply', JSON.stringify(reply(3)))).toEqual({
      meaning: 'm',
      replies: [0, 1, 2].map((i) => ({ italian: `r${i}`, meaning: `rm${i}` })),
    });
    expect(parseTranslateResult('reply', JSON.stringify(reply(1)))).toEqual({
      meaning: 'm',
      replies: [{ italian: 'r0', meaning: 'rm0' }],
    });
  });

  it('needs at least one valid reply and keeps the first three', () => {
    expect(parseTranslateResult('reply', JSON.stringify(reply(0)))).toBeNull();
    const four = parseTranslateResult('reply', JSON.stringify(reply(4))) as { replies: unknown[] };
    expect(four.replies).toHaveLength(3);
    expect(four.replies[2]).toEqual({ italian: 'r2', meaning: 'rm2' });
  });

  it('drops an invalid alternative instead of failing the call', () => {
    const raw = JSON.stringify({
      meaning: 'm',
      replies: [
        { italian: ' ', meaning: 'x' },
        { italian: 'ok', meaning: 'fine' },
        { italian: 'a'.repeat(401), meaning: 'x' },
        { italian: 'no meaning' },
        'junk',
      ],
    });
    expect(parseTranslateResult('reply', raw)).toEqual({ meaning: 'm', replies: [{ italian: 'ok', meaning: 'fine' }] });
  });

  it('rejects a reply result with no valid alternative or no meaning', () => {
    expect(parseTranslateResult('reply', '{"meaning":"m"}')).toBeNull();
    expect(parseTranslateResult('reply', '{"meaning":"m","replies":[{"italian":"r"}]}')).toBeNull();
    expect(parseTranslateResult('reply', '{"replies":[{"italian":"r","meaning":"x"}]}')).toBeNull();
  });

  it('parses a valid compose result', () => {
    expect(parseTranslateResult('compose', '{"italian":" Ciao "}')).toEqual({ italian: 'Ciao', unclear: false });
  });

  it('returns unclear for a compose input the model could not understand', () => {
    expect(parseTranslateResult('compose', '{"italian":"","unclear":true}')).toEqual({ italian: '', unclear: true });
  });

  it('rejects an empty compose result that is not flagged unclear', () => {
    expect(parseTranslateResult('compose', '{"italian":"","unclear":false}')).toBeNull();
  });

  it('rejects non-JSON and non-objects', () => {
    expect(parseTranslateResult('compose', 'not json')).toBeNull();
    expect(parseTranslateResult('compose', 'null')).toBeNull();
  });

  it('accepts a long field (a 1000-char input can translate to ~900+ chars)', () => {
    const italian = 'a'.repeat(900);
    expect(parseTranslateResult('compose', JSON.stringify({ italian }))).toEqual({ italian, unclear: false });
  });

  it('rejects fields that are too long', () => {
    expect(parseTranslateResult('compose', JSON.stringify({ italian: 'a'.repeat(2501) }))).toBeNull();
  });
});

describe('translateContactText', () => {
  it('sends the key in a header, not the URL', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"italian":"Ciao"}' }] } }] }), { status: 200 }),
    );
    const out = await translateContactText(
      { mode: 'compose', text: '你好', language: 'zh' },
      { apiKey: 'secret-key', fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(out).toEqual({ ok: true, result: { italian: 'Ciao', unclear: false } });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const config = JSON.parse(init.body as string).generationConfig;
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseSchema.required).toEqual(['italian', 'unclear']);
    expect(config.responseSchema.propertyOrdering).toEqual(['unclear', 'italian']);
    expect(url).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
  });

  it('returns ok:false when fetch throws (timeout or abort)', async () => {
    const fetchFn = vi.fn(async () => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    const out = await translateContactText(
      { mode: 'compose', text: 'x', language: 'zh' },
      { apiKey: 'k', fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(out.ok).toBe(false);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
