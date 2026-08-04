import { beforeEach, describe, expect, it, vi } from 'vitest';

const fanOutMatchPush = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/notifications/web-push', () => ({
  fanOutMatchPush,
}));

function createSupabaseMock(config: {
  events: Array<{ id: string; listing_id: string }>;
  alerts: Array<{
    id: string;
    user_id: string;
    keyword: string | null;
    zone: string | null;
  }>;
  listing: {
    id: string;
    title: string;
    title_en?: string | null;
    title_zh?: string | null;
    zone: string | null;
  } | null;
  profiles: Array<{ user_id: string; language: string }>;
}) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'listing_events':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: config.events, error: null }),
              }),
            }),
          }),
          update,
        };
      case 'alerts':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: config.alerts, error: null }),
          }),
        };
      case 'listings':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: config.listing, error: null }),
            }),
          }),
        };
      case 'alert_matches':
        return { upsert };
      case 'profiles':
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: config.profiles, error: null }),
          }),
        };
      default:
        throw new Error(`unexpected table ${table}`);
    }
  });

  return { from };
}

describe('processPendingListingEvents locale fan-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('sends English push copy for user with profiles.language=en', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const listingId = '22222222-2222-2222-2222-222222222222';
    const eventId = '33333333-3333-3333-3333-333333333333';
    const alertId = '44444444-4444-4444-4444-444444444444';

    const { from } = createSupabaseMock({
      events: [{ id: eventId, listing_id: listingId }],
      alerts: [{ id: alertId, user_id: userId, keyword: 'Divano', zone: null }],
      listing: {
        id: listingId,
        title: 'Divano gratis',
        title_en: 'Free sofa',
        title_zh: null,
        zone: 'mestre_marghera',
      },
      profiles: [{ user_id: userId, language: 'en' }],
    });

    const { processPendingListingEvents } = await import('./process-events');
    const processed = await processPendingListingEvents({ from } as never);

    expect(processed).toBe(1);
    expect(fanOutMatchPush).toHaveBeenCalledTimes(1);
    expect(fanOutMatchPush).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        title: 'Free sofa',
        body: expect.stringContaining('New free item'),
        url: `/listing/${listingId}`,
      }),
    );
  });

  it('falls back to zh catalog when profile locale is missing', async () => {
    const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const listingId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const eventId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const alertId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    const { from } = createSupabaseMock({
      events: [{ id: eventId, listing_id: listingId }],
      alerts: [{ id: alertId, user_id: userId, keyword: null, zone: 'mestre_marghera' }],
      listing: {
        id: listingId,
        title: 'Divano',
        title_en: null,
        title_zh: '免费沙发',
        zone: 'mestre_marghera',
      },
      profiles: [],
    });

    const { processPendingListingEvents } = await import('./process-events');
    await processPendingListingEvents({ from } as never);

    expect(fanOutMatchPush).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        title: '免费沙发',
        body: expect.stringContaining('新的免费物品'),
      }),
    );
  });
});
