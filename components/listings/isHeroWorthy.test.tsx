import { describe, expect, it } from 'vitest';
import { isHeroWorthy } from './ListListingCard';

const base = { photo_url: 'https://images.sbito.it/a.jpg', photo_urls: ['a', 'b'], category: 'arredamento-casalinghi' };

describe('isHeroWorthy', () => {
  it('enlarges photo-friendly categories with several photos', () => {
    expect(isHeroWorthy(base)).toBe(true);
    expect(isHeroWorthy({ ...base, category: 'animali' })).toBe(true);
  });

  it('keeps other categories, single-photo and photo-less listings as normal cards', () => {
    expect(isHeroWorthy({ ...base, category: 'audio-video' })).toBe(false);
    expect(isHeroWorthy({ ...base, photo_urls: ['a'] })).toBe(false);
    expect(isHeroWorthy({ ...base, photo_url: null })).toBe(false);
    expect(isHeroWorthy({ ...base, category: null })).toBe(false);
  });
});
