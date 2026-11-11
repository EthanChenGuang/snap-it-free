import { describe, expect, it } from 'vitest';
import { getMessages } from '@/messages';
import type { AppLanguage } from '@/lib/settings/preferences';
import type { ListingSource } from '@/lib/listings/types';
import { CONTACT_TEMPLATES, shouldUseContactAssistant } from './templates';

describe('CONTACT_TEMPLATES', () => {
  it('has unique ids and non-empty Italian text', () => {
    const ids = CONTACT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of CONTACT_TEMPLATES) expect(t.it.trim()).not.toBe('');
  });

  it.each(['zh', 'en', 'it'] as const)('has a meaning for every template in %s', (lang) => {
    const meanings = getMessages(lang).contactAssistant.templates;
    for (const t of CONTACT_TEMPLATES) expect(meanings[t.id]?.trim()).toBeTruthy();
  });
});

describe('shouldUseContactAssistant', () => {
  const cases: [AppLanguage, ListingSource, boolean][] = [
    ['zh', 'subito', true],
    ['en', 'subito', true],
    ['zh', 'vinted', false],
    ['en', 'facebook', false],
    ['zh', 'wallapop', false],
    ['it', 'subito', false],
    ['zh', 'ugc', false],
    ['en', 'ugc', false],
    ['it', 'ugc', false],
  ];
  it.each(cases)('language %s, source %s -> %s', (language, source, expected) => {
    expect(shouldUseContactAssistant({ language, source })).toBe(expected);
  });
});
