import { describe, expect, it } from 'vitest';
import { getMessages } from '@/messages';
import { detailPrimaryCtaLabel } from './detail-metadata';

const messages = getMessages('en');

describe('detailPrimaryCtaLabel', () => {
  it('keeps the existing labels when no language is given', () => {
    expect(detailPrimaryCtaLabel({ source: 'subito', isUgc: false, messages })).toBe(messages.detail.snagIt);
    expect(detailPrimaryCtaLabel({ source: 'vinted', isUgc: false, messages })).toBe(messages.detail.openOnVinted);
    expect(detailPrimaryCtaLabel({ source: 'ugc', isUgc: true, messages })).toBe(messages.detail.messageOwner);
  });

  it('uses the contact label for zh/en scraped listings', () => {
    for (const language of ['zh', 'en'] as const) {
      expect(detailPrimaryCtaLabel({ source: 'subito', isUgc: false, messages, language })).toBe(
        messages.detail.contactSeller,
      );
    }
  });

  it('leaves Italian and UGC unchanged', () => {
    expect(detailPrimaryCtaLabel({ source: 'subito', isUgc: false, messages, language: 'it' })).toBe(
      messages.detail.snagIt,
    );
    expect(detailPrimaryCtaLabel({ source: 'ugc', isUgc: true, messages, language: 'zh' })).toBe(
      messages.detail.messageOwner,
    );
  });
});
