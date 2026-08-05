import { describe, expect, it } from 'vitest';
import { isMislabeledFree } from './free-filter.js';
import { normalizeRawListing } from './normalize.js';
import type { RawListing } from '../subito/extract.js';

const baseRaw: RawListing = {
  external_id: '12345',
  title: 'Regalo divano buono stato',
  photo_url: 'https://images.sbito.it/example.jpg',
  external_url: 'https://www.subito.it/annunci/example-12345.htm',
  lat: 45.434,
  lng: 12.338,
  posted_at: '2026-07-28T10:00:00.000Z',
  description: 'Divano in ottime condizioni, ritiro in zona.',
};

describe('isMislabeledFree', () => {
  it('rejects titles with euro price markers', () => {
    const reason = isMislabeledFree('Divano regalo €50');
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/price pattern/i);
  });

  it('rejects trattativa privata in title', () => {
    const reason = isMislabeledFree('Divano in trattativa privata');
    expect(reason).not.toBeNull();
  });

  it('rejects a pagamento variants', () => {
    expect(isMislabeledFree('Mobili a pagamento')).not.toBeNull();
  });

  it('rejects description-only price signals when title is clean', () => {
    const reason = isMislabeledFree('Regalo divano', '€50 trattabile, contattare');
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/price pattern/i);
  });

  it('passes clean free listing titles and descriptions', () => {
    expect(isMislabeledFree('Regalo divano buono stato', 'Ritiro in zona, niente spese')).toBeNull();
  });
});

describe('normalizeRawListing', () => {
  it('rejects mislabeled listings with a reason string', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      title: 'Divano regalo €50',
    });
    expect(result).toEqual({ reject: expect.stringMatching(/price pattern/i) });
  });

  it('accepts clean listings and sets expires_at to posted_at plus 48 hours', () => {
    const postedAt = new Date('2026-07-28T10:00:00.000Z');
    const result = normalizeRawListing({
      ...baseRaw,
      posted_at: postedAt.toISOString(),
    });

    expect(result).not.toHaveProperty('reject');
    if ('reject' in result) throw new Error('expected canonical listing');

    expect(result.source).toBe('subito');
    expect(result.status).toBe('active');
    expect(result.expires_at.getTime()).toBe(postedAt.getTime() + 48 * 60 * 60 * 1000);
    expect(result.content_hash).toHaveLength(64);
  });

  it('rejects when description contains price language but title is clean', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      title: 'Regalo divano',
      description: '€50 trattabile',
    });
    expect(result).toEqual({ reject: expect.stringMatching(/price pattern/i) });
  });

  it('assigns zone from coordinates during normalization', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      lat: 45.434,
      lng: 12.338,
    });

    if ('reject' in result) throw new Error('expected canonical listing');
    expect(result.zone).toBe('centro_storico');
  });

  it('sets zone null when coordinates are missing', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      lat: null,
      lng: null,
    });

    if ('reject' in result) throw new Error('expected canonical listing');
    expect(result.zone).toBeNull();
  });

  it('sets city and region from source_category_url (D-25, D-26)', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      source_category_url:
        'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
      external_url: 'https://www.subito.it/informatica/monitor-padova-123.htm',
      lat: 45.41,
      lng: 11.88,
    });

    if ('reject' in result) throw new Error('expected canonical listing');
    expect(result.city).toBe('padova');
    expect(result.region).toBe('veneto');
    expect(result.category).toBe('informatica');
  });

  it('keeps zone null for Padova coords outside Venice polygons (D-21)', () => {
    const result = normalizeRawListing({
      ...baseRaw,
      source_category_url:
        'https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/',
      external_url: 'https://www.subito.it/informatica/monitor-padova-123.htm',
      lat: 45.41,
      lng: 11.88,
    });

    if ('reject' in result) throw new Error('expected canonical listing');
    expect(result.zone).toBeNull();
  });
});
