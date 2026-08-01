import { describe, expect, it } from 'vitest';
import { shouldAutoHide, THRESHOLDS } from './auto-hide';

describe('THRESHOLDS', () => {
  it('uses 2 for scraped sources and 3 for ugc', () => {
    expect(THRESHOLDS.subito).toBe(2);
    expect(THRESHOLDS.facebook).toBe(2);
    expect(THRESHOLDS.ugc).toBe(3);
  });
});

describe('shouldAutoHide', () => {
  it('hides subito listing at report_count 2 with community_reports', () => {
    expect(shouldAutoHide('subito', 2)).toEqual({
      hide: true,
      hiddenReason: 'community_reports',
    });
  });

  it('does not hide subito listing at report_count 1', () => {
    expect(shouldAutoHide('subito', 1)).toEqual({
      hide: false,
      hiddenReason: null,
    });
  });

  it('hides facebook listing at report_count 2 with community_reports', () => {
    expect(shouldAutoHide('facebook', 2)).toEqual({
      hide: true,
      hiddenReason: 'community_reports',
    });
  });

  it('does not hide ugc listing at report_count 2', () => {
    expect(shouldAutoHide('ugc', 2)).toEqual({
      hide: false,
      hiddenReason: null,
    });
  });

  it('hides ugc listing at report_count 3 with pending_review', () => {
    expect(shouldAutoHide('ugc', 3)).toEqual({
      hide: true,
      hiddenReason: 'pending_review',
    });
  });
});
