import { describe, expect, it } from 'vitest';
import { isHeroWorthy } from './ListListingCard';

type HeroInput = Parameters<typeof isHeroWorthy>[0];
const item = (category: string, title: string, photo_url = 'https://images.sbito.it/a.jpg'): HeroInput => ({
  photo_url,
  category,
  title,
});

describe('isHeroWorthy', () => {
  it('enlarges pets, tech, appliances and bikes', () => {
    expect(isHeroWorthy(item('animali', 'Gattino'))).toBe(true);
    expect(isHeroWorthy(item('biciclette', 'Bici da corsa'))).toBe(true);
  });

  it('enlarges real furniture but not household odds and ends', () => {
    expect(isHeroWorthy(item('arredamento-casalinghi', 'Divano Letto'))).toBe(true);
    expect(isHeroWorthy(item('arredamento-casalinghi', 'Tavolino in legno'))).toBe(true);
    expect(isHeroWorthy(item('arredamento-casalinghi', '2 supporti muro per tv'))).toBe(false);
    expect(isHeroWorthy(item('arredamento-casalinghi', 'lampadario fatto con 3 barattoli'))).toBe(true);
    expect(isHeroWorthy(item('arredamento-casalinghi', 'barattoli di vetro'))).toBe(false);
  });

  it('keeps other categories and photo-less listings as normal cards', () => {
    expect(isHeroWorthy(item('audio-video', 'TV'))).toBe(false);
    expect(isHeroWorthy(item('animali', 'Gattino', ''))).toBe(false);
  });
});
