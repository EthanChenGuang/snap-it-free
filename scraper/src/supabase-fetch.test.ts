import { describe, expect, it, vi } from 'vitest';
import { createSupabaseRetryFetch } from './supabase-fetch.js';

const pgrst303 = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), {
    status: 401,
  });

const ok = () => new Response('[]', { status: 200 });

function build(fetchImpl: ReturnType<typeof vi.fn>) {
  return createSupabaseRetryFetch({ fetchImpl, delayMs: 0, onRetry: () => {} });
}

describe('createSupabaseRetryFetch', () => {
  it('passes a successful response straight through', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries PGRST303 and returns the eventual success', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(pgrst303()).mockResolvedValueOnce(ok());

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries PGRST303 on writes too, since nothing was committed', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(pgrst303()).mockResolvedValueOnce(ok());

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings', {
      method: 'POST',
      body: '{}',
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt budget and returns the last response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(pgrst303());

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries a gateway 522 on GET', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>522</html>', { status: 522 }))
      .mockResolvedValueOnce(ok());

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a gateway 522 on POST — the write may have landed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>522</html>', { status: 522 }));

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings', {
      method: 'POST',
      body: '{}',
    });

    expect(response.status).toBe(522);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry an ordinary 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ code: 'PGRST301' }), { status: 401 }));

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 400', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('bad', { status: 400 }));

    const response = await build(fetchImpl)('https://example.test/rest/v1/listings');

    expect(response.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reads the method from a Request object', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>503</html>', { status: 503 }));
    const request = new Request('https://example.test/rest/v1/listings', { method: 'POST', body: '{}' });

    await build(fetchImpl)(request);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
