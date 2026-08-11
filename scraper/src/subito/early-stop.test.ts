import { describe, expect, it } from 'vitest';
import { crawlHashForListing } from './crawl-hash.js';
import { applyEarlyStop, type EarlyStopListing } from './early-stop.js';
import { loadFixtureHtml, parseCategoryNextData } from './http-extract.js';

const SOURCE_URL =
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/';

function listing(id: string, title = `listing-${id}`): EarlyStopListing {
  return {
    external_id: id,
    title,
    photo_url: `https://images.sbito.it/${id}.jpg`,
    external_url: `https://www.subito.it/item-${id}.htm`,
    lat: 45.434,
    lng: 12.338,
    posted_at: '2026-08-11T10:00:00.000Z',
    price: '0 €',
    image_urls: [`https://images.sbito.it/${id}.jpg`],
  };
}

function knownMapFor(listings: EarlyStopListing[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of listings) {
    map.set(item.external_id, crawlHashForListing(item));
  }
  return map;
}

describe('applyEarlyStop', () => {
  it('stops after exactly K=5 consecutive known-unchanged listings', () => {
    const items = Array.from({ length: 8 }, (_, i) => listing(String(i + 1)));
    const known = knownMapFor(items.slice(0, 5));

    const result = applyEarlyStop({
      listings: items,
      knownMap: known,
      earlyStopK: 5,
      isFullRefresh: false,
    });

    expect(result.stoppedEarly).toBe(true);
    expect(result.listingsSkippedAtCrawl).toBe(5);
    expect(result.workQueue).toEqual([]);
    expect(result.touchCandidates).toEqual([]);
  });

  it('never early-stops with empty known Map', () => {
    const items = Array.from({ length: 6 }, (_, i) => listing(String(i + 1)));
    const result = applyEarlyStop({
      listings: items,
      knownMap: new Map(),
      earlyStopK: 5,
      isFullRefresh: false,
    });

    expect(result.stoppedEarly).toBe(false);
    expect(result.listingsSkippedAtCrawl).toBe(0);
    expect(result.workQueue).toEqual(items);
  });

  it('walks entire list when isFullRefresh=true without early break', () => {
    const items = Array.from({ length: 7 }, (_, i) => listing(String(i + 1)));
    const known = knownMapFor(items);

    const result = applyEarlyStop({
      listings: items,
      knownMap: known,
      earlyStopK: 5,
      isFullRefresh: true,
    });

    expect(result.stoppedEarly).toBe(false);
    expect(result.listingsSkippedAtCrawl).toBe(7);
    expect(result.workQueue).toEqual([]);
    expect(result.touchCandidates).toEqual(items);
  });

  it('resets consecutive counter when mid-list hash changes', () => {
    const head = Array.from({ length: 4 }, (_, i) => listing(`head-${i}`));
    const changed = listing('changed', 'new title');
    const tail = Array.from({ length: 4 }, (_, i) => listing(`tail-${i}`));
    const listings = [...head, changed, ...tail];
    const known = knownMapFor([...head, ...tail]);

    const result = applyEarlyStop({
      listings,
      knownMap: known,
      earlyStopK: 5,
      isFullRefresh: false,
    });

    expect(result.stoppedEarly).toBe(false);
    expect(result.workQueue.map((l) => l.external_id)).toEqual(['changed']);
    expect(result.listingsSkippedAtCrawl).toBe(8);
  });

  it('uses fixture JSON order for early-stop walk', () => {
    const html = loadFixtureHtml();
    const { listings } = parseCategoryNextData(html, SOURCE_URL);
    const known = knownMapFor([listings[0], listings[1]]);

    const result = applyEarlyStop({
      listings,
      knownMap: known,
      earlyStopK: 5,
      isFullRefresh: false,
    });

    expect(result.listingsSkippedAtCrawl).toBe(2);
    expect(result.workQueue.map((l) => l.external_id)).toEqual([listings[2].external_id]);
  });
});
