import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/auth', () => ({ requireAuth }));
const getSubscriptionActive = vi.hoisted(() => vi.fn());
vi.mock('@/lib/paywall/server-access', () => ({ getSubscriptionActive }));

import { POST } from './route';

const post = (body: unknown) =>
  POST(
    new Request('http://x.test/api/contact/translate', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const gemini = (text: string, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status }));

beforeEach(() => {
  requireAuth.mockResolvedValue({ id: 'u1' });
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'false');
  getSubscriptionActive.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/contact/translate', () => {
  it('403 without a subscription when the paywall flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    getSubscriptionActive.mockResolvedValue(false);
    const res = await post({ mode: 'compose', text: 'a', language: 'zh' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'subscription_required' });
  });

  it('allows a subscriber when the flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    getSubscriptionActive.mockResolvedValue(true);
    vi.stubGlobal('fetch', gemini('{"italian":"Ciao!"}'));
    expect((await post({ mode: 'compose', text: 'a', language: 'zh' })).status).toBe(200);
  });

  it('flag off: signed in is enough and no subscription lookup happens', async () => {
    vi.stubGlobal('fetch', gemini('{"italian":"Ciao!"}'));
    expect((await post({ mode: 'compose', text: 'a', language: 'zh' })).status).toBe(200);
    expect(getSubscriptionActive).not.toHaveBeenCalled();
  });

  it('502 when fetch throws, logging only the error string', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));
    expect((await post({ mode: 'compose', text: 'secret user text', language: 'zh' })).status).toBe(502);
    expect(spy).toHaveBeenCalledWith('[contact] translate failed:', 'timeout');
    spy.mockRestore();
  });

  it('401 when signed out', async () => {
    requireAuth.mockResolvedValue(null);
    expect((await post({ mode: 'compose', text: 'a', language: 'zh' })).status).toBe(401);
  });

  it('400 for invalid JSON, bad body and too-long text', async () => {
    expect((await post('{')).status).toBe(400);
    expect((await post({ mode: 'nope', text: 'a', language: 'zh' })).status).toBe(400);
    expect((await post({ mode: 'compose', text: '   ', language: 'zh' })).status).toBe(400);
    expect((await post({ mode: 'compose', text: 'a'.repeat(1001), language: 'zh' })).status).toBe(400);
    expect((await post({ mode: 'compose', text: 'a', language: 'it' })).status).toBe(400);
  });

  it('503 without an API key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await post({ mode: 'compose', text: 'a', language: 'zh' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'unavailable' });
  });

  it('200 for compose', async () => {
    vi.stubGlobal('fetch', gemini('{"italian":"Ciao!"}'));
    const res = await post({ mode: 'compose', text: '你好', language: 'zh' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ italian: 'Ciao!' });
  });

  it('200 for reply', async () => {
    vi.stubGlobal('fetch', gemini('{"meaning":"m","suggestedReply":"r","suggestedReplyMeaning":"rm"}'));
    const res = await post({ mode: 'reply', text: 'Sì, passa pure', language: 'en' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ meaning: 'm', suggestedReply: 'r', suggestedReplyMeaning: 'rm' });
  });

  it('502 on a Gemini error or unparsable output', async () => {
    vi.stubGlobal('fetch', gemini('{}', 500));
    expect((await post({ mode: 'compose', text: 'a', language: 'zh' })).status).toBe(502);
    vi.stubGlobal('fetch', gemini('not json'));
    expect((await post({ mode: 'compose', text: 'a', language: 'zh' })).status).toBe(502);
  });
});
