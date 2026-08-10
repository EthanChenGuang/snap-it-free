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
  userNotificationPrefs?: Array<{
    user_id: string;
    dnd_enabled: boolean;
    quiet_start: string;
    quiet_end: string;
  }>;
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
      case 'user_notification_prefs':
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: config.userNotificationPrefs ?? [],
              error: null,
            }),
          }),
        };
      default:
        throw new Error(`unexpected table ${table}`);
    }
  });

  return { from, alertMatchesUpsert: upsert };
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
        title: 'Divano gratis',
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
        title: 'Divano',
        body: expect.stringContaining('新的免费物品'),
      }),
    );
  });

  it('skips fanOutMatchPush during active quiet hours but still upserts alert_matches', async () => {
    const userId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const listingId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const eventId = '10101010-1010-1010-1010-101010101010';
    const alertId = '20202020-2020-2020-2020-202020202020';

    const { from, alertMatchesUpsert } = createSupabaseMock({
      events: [{ id: eventId, listing_id: listingId }],
      alerts: [{ id: alertId, user_id: userId, keyword: 'Sofa', zone: null }],
      listing: {
        id: listingId,
        title: 'Free sofa',
        zone: 'mestre_marghera',
      },
      profiles: [{ user_id: userId, language: 'en' }],
      userNotificationPrefs: [
        {
          user_id: userId,
          dnd_enabled: true,
          quiet_start: '00:00',
          quiet_end: '23:59',
        },
      ],
    });

    const { processPendingListingEvents } = await import('./process-events');
    const processed = await processPendingListingEvents({ from } as never);

    expect(processed).toBe(1);
    expect(alertMatchesUpsert).toHaveBeenCalledTimes(1);
    expect(fanOutMatchPush).not.toHaveBeenCalled();
  });

  it('still sends push when user has no notification prefs row', async () => {
    const userId = '30303030-3030-3030-3030-303030303030';
    const listingId = '40404040-4040-4040-4040-404040404040';
    const eventId = '50505050-5050-5050-5050-505050505050';
    const alertId = '60606060-6060-6060-6060-606060606060';

    const { from } = createSupabaseMock({
      events: [{ id: eventId, listing_id: listingId }],
      alerts: [{ id: alertId, user_id: userId, keyword: 'Chair', zone: null }],
      listing: {
        id: listingId,
        title: 'Free chair',
        zone: 'mestre_marghera',
      },
      profiles: [{ user_id: userId, language: 'en' }],
      userNotificationPrefs: [],
    });

    const { processPendingListingEvents } = await import('./process-events');
    await processPendingListingEvents({ from } as never);

    expect(fanOutMatchPush).toHaveBeenCalledTimes(1);
    expect(fanOutMatchPush).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        title: 'Free chair',
        url: `/listing/${listingId}`,
      }),
    );
  });
});
