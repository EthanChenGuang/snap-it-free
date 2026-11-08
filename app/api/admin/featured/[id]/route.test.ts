import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const requireOperatorSession = vi.fn();
const decideFeaturedCandidate = vi.fn();

vi.mock('@/lib/admin/operator-route', () => ({ requireOperatorSession }));
vi.mock('@/lib/admin/operator-access', () => ({
  resolveUserEmail: (u: { email?: string }) => u.email ?? null,
}));
vi.mock('@/lib/featured/admin', async () => {
  const { z } = await import('zod');
  return {
    decideFeaturedCandidate,
    featuredDecisionSchema: z.object({ decision: z.enum(['approve', 'reject']) }),
  };
});

const ID = '11111111-2222-3333-4444-555555555555';

function post(body: unknown, contentType = 'application/json') {
  return new Request(`http://localhost/api/admin/featured/${ID}`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });

describe('POST /api/admin/featured/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperatorSession.mockResolvedValue({ user: { id: 'u1', email: 'op@x.it' }, supabase: {} });
  });

  it('rejects non-operators (including signed-out users) with 403', async () => {
    requireOperatorSession.mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const { POST } = await import('./route');
    const res = await POST(post({ decision: 'approve' }), ctx());
    expect(res.status).toBe(403);
    expect(decideFeaturedCandidate).not.toHaveBeenCalled();
  });

  it('400 on invalid body', async () => {
    const { POST } = await import('./route');
    expect((await POST(post({ decision: 'maybe' }), ctx())).status).toBe(400);
    expect((await POST(post('{not json'), ctx())).status).toBe(400);
  });

  it('400 on a non-uuid id', async () => {
    const { POST } = await import('./route');
    expect((await POST(post({ decision: 'approve' }), ctx('../x'))).status).toBe(400);
  });

  it('415 on non-JSON content type (CSRF hardening)', async () => {
    const { POST } = await import('./route');
    const res = await POST(post('decision=approve', 'application/x-www-form-urlencoded'), ctx());
    expect(res.status).toBe(415);
  });

  it('approve happy path records the reviewer', async () => {
    decideFeaturedCandidate.mockResolvedValue({ ok: true, status: 'approved' });
    const { POST } = await import('./route');
    const res = await POST(post({ decision: 'approve' }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'approved' });
    expect(decideFeaturedCandidate).toHaveBeenCalledWith({}, ID, 'approve', 'op@x.it');
  });

  it('reject happy path', async () => {
    decideFeaturedCandidate.mockResolvedValue({ ok: true, status: 'rejected' });
    const { POST } = await import('./route');
    const res = await POST(post({ decision: 'reject' }), ctx());
    expect(await res.json()).toEqual({ status: 'rejected' });
  });

  it('409 when the candidate was already decided', async () => {
    decideFeaturedCandidate.mockResolvedValue({ ok: false, code: 'not_pending' });
    const { POST } = await import('./route');
    expect((await POST(post({ decision: 'approve' }), ctx())).status).toBe(409);
  });
});
