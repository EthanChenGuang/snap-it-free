import { describe, expect, it } from 'vitest';
import {
  TRANSLATION_QUEUE_PAGE_SIZE,
  normalizeTranslationQueuePage,
  parseTranslationQueuePage,
  translationQueuePageHref,
  translationQueuePageRange,
  translationQueueTotalPages,
} from './translation-queue-pagination';

describe('translation-queue-pagination', () => {
  it('defaults invalid page params to 1', () => {
    expect(parseTranslationQueuePage(undefined)).toBe(1);
    expect(parseTranslationQueuePage('0')).toBe(1);
    expect(parseTranslationQueuePage('-2')).toBe(1);
    expect(parseTranslationQueuePage('abc')).toBe(1);
  });

  it('computes total pages from pending count', () => {
    expect(translationQueueTotalPages(0)).toBe(1);
    expect(translationQueueTotalPages(1)).toBe(1);
    expect(translationQueueTotalPages(100)).toBe(1);
    expect(translationQueueTotalPages(101)).toBe(2);
    expect(translationQueueTotalPages(964)).toBe(10);
  });

  it('clamps requested page to the last available page', () => {
    expect(normalizeTranslationQueuePage(12, 964)).toBe(10);
    expect(normalizeTranslationQueuePage(3, 250)).toBe(3);
  });

  it('builds clean hrefs for page 1 and later pages', () => {
    expect(translationQueuePageHref(1)).toBe('/admin/translation');
    expect(translationQueuePageHref(2)).toBe('/admin/translation?page=2');
  });

  it('returns the visible row range for the current page', () => {
    expect(translationQueuePageRange(1, 964)).toEqual({ from: 1, to: 100 });
    expect(translationQueuePageRange(10, 964)).toEqual({ from: 901, to: 964 });
    expect(translationQueuePageRange(1, 0)).toEqual({ from: 0, to: 0 });
    expect(translationQueuePageRange(2, 150, TRANSLATION_QUEUE_PAGE_SIZE)).toEqual({
      from: 101,
      to: 150,
    });
  });
});
