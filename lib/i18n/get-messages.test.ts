import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  categoryLabel,
  formatRelativeTime,
  getMessages,
  zoneLabel,
} from '@/messages';
import { DEFAULT_PREFERENCES } from '@/lib/settings/preferences';

describe('getMessages', () => {
  it('returns matching catalog for zh, en, and it', () => {
    expect(getMessages('it').nav.map).toBe('Mappa');
    expect(getMessages('en').nav.map).toBe('Map');
    expect(getMessages('zh').nav.map).toBe('地图');
    expect(getMessages('zh').nav.map).not.toBe(getMessages('it').nav.map);
  });

  it('falls back to zh for unknown or missing language', () => {
    expect(getMessages('fr' as 'zh')).toBe(getMessages('zh'));
    expect(getMessages()).toBe(getMessages('zh'));
    expect(getMessages(undefined)).toBe(getMessages(DEFAULT_LANGUAGE));
  });

  it('DEFAULT_LANGUAGE is zh', () => {
    expect(DEFAULT_LANGUAGE).toBe('zh');
  });
});

describe('DEFAULT_PREFERENCES', () => {
  it('defaults language to zh', () => {
    expect(DEFAULT_PREFERENCES.language).toBe('zh');
  });
});

describe('locale helpers', () => {
  it('zoneLabel reads strings from the given catalog', () => {
    expect(zoneLabel('centro_storico', getMessages('it'))).toBe('Centro Storico');
    expect(zoneLabel('All', getMessages('en'))).toBe('All');
    expect(zoneLabel('All', getMessages('zh'))).toBe('全部');
  });

  it('categoryLabel reads strings from the given catalog', () => {
    expect(categoryLabel('furniture', getMessages('it'))).toBe('Arredamento');
    expect(categoryLabel('All', getMessages('en'))).toBe('All');
    expect(categoryLabel('home_decor', getMessages('zh'))).toBe('家居');
  });

  it('formatRelativeTime reads strings from the given catalog', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    const iso = '2026-08-04T11:30:00Z';
    expect(formatRelativeTime(iso, getMessages('en'), now)).toBe('30 minutes ago');
    expect(formatRelativeTime(iso, getMessages('it'), now)).toBe('30 minuti fa');
    expect(formatRelativeTime(iso, getMessages('zh'), now)).toBe('30 分钟前');
  });
});
