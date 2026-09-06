import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * D-07-32 / D-07-50 / T-07-05 regression: external alert cron must authenticate via
 * `Authorization: Bearer $CRON_SECRET`. A valid Bearer returns 200 with a processed
 * count; a missing or incorrect Bearer must return 401. This test locks that boundary
 * so a future change cannot silently weaken cron auth (e.g. by relying on a spoofable
 * User-Agent as the primary check).
 */

const processPendingListingEvents = vi.fn().mockResolvedValue(0);
const createServiceClient = vi.fn().mockReturnValue({});

vi.mock('@/lib/alerts/process-events', () => ({
  processPendingListingEvents,
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient,
}));

const ORIGINAL_ENV = { ...process.env };

describe('GET /api/cron/match-alerts — Bearer auth (D-07-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns 200 with processed count when Bearer matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret-123';
    processPendingListingEvents.mockResolvedValueOnce(3);

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/cron/match-alerts', {
      headers: { authorization: 'Bearer test-secret-123' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 3 });
    expect(processPendingListingEvents).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'test-secret-123';

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/cron/match-alerts');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(processPendingListingEvents).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'test-secret-123';

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/cron/match-alerts', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(processPendingListingEvents).not.toHaveBeenCalled();
  });

  it('does not authorize a spoofed vercel-cron User-Agent outside production (external cron must use Bearer)', async () => {
    process.env.CRON_SECRET = 'test-secret-123';

    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/cron/match-alerts', {
      headers: { 'user-agent': 'vercel-cron/1.0' },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(processPendingListingEvents).not.toHaveBeenCalled();
  });
});
