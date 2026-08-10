import { describe, expect, it, vi } from 'vitest';
import {
  isQuietHoursActive,
  isValidQuietHoursPayload,
  loadUserQuietHours,
  syncUserNotificationPrefs,
} from './notification-prefs';

describe('isQuietHoursActive', () => {
  it('returns true during a same-day window and false outside it', () => {
    const prefs = { dndEnabled: true, quietStart: '09:00', quietEnd: '17:00' };

    expect(isQuietHoursActive(prefs, 12 * 60)).toBe(true);
    expect(isQuietHoursActive(prefs, 8 * 60 + 59)).toBe(false);
    expect(isQuietHoursActive(prefs, 17 * 60)).toBe(false);
  });

  it('returns true during an overnight window that crosses midnight', () => {
    const prefs = { dndEnabled: true, quietStart: '22:00', quietEnd: '08:00' };

    expect(isQuietHoursActive(prefs, 23 * 60 + 30)).toBe(true);
    expect(isQuietHoursActive(prefs, 9 * 60)).toBe(false);
    expect(isQuietHoursActive(prefs, 7 * 60 + 59)).toBe(true);
  });

  it('returns false when dndEnabled is false regardless of window', () => {
    const prefs = { dndEnabled: false, quietStart: '22:00', quietEnd: '08:00' };

    expect(isQuietHoursActive(prefs, 23 * 60 + 30)).toBe(false);
  });

  it('returns false when prefs is undefined', () => {
    expect(isQuietHoursActive(undefined, 23 * 60 + 30)).toBe(false);
  });

  it('returns true when quietStart equals quietEnd (24h always-on)', () => {
    const prefs = { dndEnabled: true, quietStart: '00:00', quietEnd: '00:00' };

    expect(isQuietHoursActive(prefs, 12 * 60)).toBe(true);
  });
});

describe('loadUserQuietHours', () => {
  it('returns an empty Map without querying when userIds is empty', async () => {
    const from = vi.fn();
    const supabase = { from } as never;

    const result = await loadUserQuietHours(supabase, []);

    expect(result.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it('returns a Map of quiet-hours prefs for each user', async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          dnd_enabled: true,
          quiet_start: '22:00',
          quiet_end: '08:00',
        },
        {
          user_id: 'u2',
          dnd_enabled: false,
          quiet_start: '09:00',
          quiet_end: '17:00',
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = { from } as never;
    const result = await loadUserQuietHours(supabase, ['u1', 'u2']);

    expect(from).toHaveBeenCalledWith('user_notification_prefs');
    expect(result.size).toBe(2);
    expect(result.get('u1')).toEqual({
      dndEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
    });
    expect(result.get('u2')).toEqual({
      dndEnabled: false,
      quietStart: '09:00',
      quietEnd: '17:00',
    });
  });

  it('returns an empty Map on query error (fail-open)', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = { from } as never;
    const result = await loadUserQuietHours(supabase, ['u1']);

    expect(result.size).toBe(0);
  });
});

describe('syncUserNotificationPrefs', () => {
  it('upserts prefs with onConflict user_id and returns no error on success', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    const supabase = { from } as never;
    const result = await syncUserNotificationPrefs(supabase, 'user-1', {
      dndEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
    });

    expect(result.error).toBeNull();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        dnd_enabled: true,
        quiet_start: '22:00',
        quiet_end: '08:00',
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' },
    );
  });

  it('returns error message on upsert failure', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'upsert failed' } });
    const from = vi.fn().mockReturnValue({ upsert });

    const supabase = { from } as never;
    const result = await syncUserNotificationPrefs(supabase, 'user-1', {
      dndEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
    });

    expect(result.error).toBe('upsert failed');
  });
});

describe('isValidQuietHoursPayload', () => {
  it('accepts a valid payload', () => {
    expect(
      isValidQuietHoursPayload({
        dndEnabled: true,
        quietStart: '22:00',
        quietEnd: '08:00',
      }),
    ).toBe(true);
  });

  it('rejects non-boolean dndEnabled', () => {
    expect(
      isValidQuietHoursPayload({
        dndEnabled: 'true',
        quietStart: '22:00',
        quietEnd: '08:00',
      }),
    ).toBe(false);
  });

  it('rejects invalid quietStart/quietEnd time formats', () => {
    expect(
      isValidQuietHoursPayload({
        dndEnabled: true,
        quietStart: '25:00',
        quietEnd: '08:00',
      }),
    ).toBe(false);
    expect(
      isValidQuietHoursPayload({
        dndEnabled: true,
        quietStart: '9:00',
        quietEnd: '08:00',
      }),
    ).toBe(false);
    expect(
      isValidQuietHoursPayload({
        dndEnabled: true,
        quietStart: 'abc',
        quietEnd: '08:00',
      }),
    ).toBe(false);
  });
});
