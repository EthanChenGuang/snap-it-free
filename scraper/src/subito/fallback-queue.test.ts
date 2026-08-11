import { describe, expect, it } from 'vitest';
import type { EarlyStopListing } from './early-stop.js';
import {
  detailBudgetCap,
  remainingDetailBudget,
  selectDetailCandidates,
  shouldVisitDetail,
} from './fallback-queue.js';

function listing(overrides: Partial<EarlyStopListing> = {}): EarlyStopListing {
  return {
    external_id: '123',
    title: 'Divano gratis',
    photo_url: 'https://images.example/1.jpg',
    external_url: 'https://www.subito.it/foo-123.htm',
    lat: 45.44,
    lng: 12.33,
    posted_at: '2026-08-11T10:00:00.000Z',
    price: '0',
    ...overrides,
  };
}

describe('shouldVisitDetail', () => {
  it('returns false when centroid coords present and price is clear free', () => {
    expect(shouldVisitDetail(listing())).toBe(false);
  });

  it('returns true when coords are null after centroid resolution', () => {
    expect(shouldVisitDetail(listing({ lat: null, lng: null }))).toBe(true);
  });

  it('returns true when price is missing', () => {
    expect(shouldVisitDetail(listing({ price: '' }))).toBe(true);
  });

  it('returns true when title has paid signal keywords', () => {
    expect(shouldVisitDetail(listing({ title: 'Vendesi divano €50' }))).toBe(true);
  });

  it('returns true when price is ambiguous (non-zero digits)', () => {
    expect(shouldVisitDetail(listing({ price: '25' }))).toBe(true);
  });
});

describe('detailBudgetCap', () => {
  it('caps at 10% ceiling', () => {
    expect(detailBudgetCap(100)).toBe(10);
    expect(detailBudgetCap(7)).toBe(1);
    expect(detailBudgetCap(0)).toBe(0);
  });
});

describe('remainingDetailBudget', () => {
  it('subtracts used visits from cap', () => {
    expect(remainingDetailBudget(100, 3)).toBe(7);
    expect(remainingDetailBudget(100, 10)).toBe(0);
    expect(remainingDetailBudget(100, 15)).toBe(0);
  });
});

describe('selectDetailCandidates', () => {
  it('defers overflow beyond 10% cap', () => {
    const workQueue = Array.from({ length: 15 }, (_, i) =>
      listing({
        external_id: String(i),
        external_url: `https://www.subito.it/foo-${i}.htm`,
        lat: null,
        lng: null,
      }),
    );

    const { selected, deferred } = selectDetailCandidates(workQueue, detailBudgetCap(100));

    expect(selected).toHaveLength(10);
    expect(deferred).toHaveLength(5);
  });

  it('skips listings that do not need detail enrichment', () => {
    const workQueue = [
      listing(),
      listing({ external_id: '456', lat: null, lng: null }),
    ];

    const { selected, deferred } = selectDetailCandidates(workQueue, 5);

    expect(selected).toHaveLength(1);
    expect(selected[0].external_id).toBe('456');
    expect(deferred).toHaveLength(0);
  });
});
