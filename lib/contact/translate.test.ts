import { describe, expect, it, vi } from 'vitest';
import { parseTranslateResult, translateContactText } from './translate';

describe('parseTranslateResult', () => {
  it('parses a valid reply result', () => {
    const raw = JSON.stringify({ meaning: 'm', suggestedReply: 'r', suggestedReplyMeaning: 'rm', extra: 'x' });
    expect(parseTranslateResult('reply', raw)).toEqual({ meaning: 'm', suggestedReply: 'r', suggestedReplyMeaning: 'rm' });
  });

  it('parses a valid compose result', () => {
    expect(parseTranslateResult('compose', '{"italian":" Ciao "}')).toEqual({ italian: 'Ciao' });
  });

  it('rejects a missing field', () => {
    expect(parseTranslateResult('reply', '{"meaning":"m","suggestedReply":"r"}')).toBeNull();
  });

  it('rejects non-JSON and non-objects', () => {
    expect(parseTranslateResult('compose', 'not json')).toBeNull();
    expect(parseTranslateResult('compose', 'null')).toBeNull();
  });

  it('accepts a long field (a 1000-char input can translate to ~900+ chars)', () => {
    const italian = 'a'.repeat(900);
    expect(parseTranslateResult('compose', JSON.stringify({ italian }))).toEqual({ italian });
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
    expect(out).toEqual({ ok: true, result: { italian: 'Ciao' } });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
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
