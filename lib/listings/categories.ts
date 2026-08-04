/** Client-side category chips for Elenco — listings have no DB category yet. */
export type ListingCategory =
  | 'All'
  | 'furniture'
  | 'tech'
  | 'apparel'
  | 'books'
  | 'home_decor';

export const LISTING_CATEGORIES: ListingCategory[] = [
  'All',
  'furniture',
  'tech',
  'apparel',
  'books',
  'home_decor',
];

const KEYWORDS: Record<Exclude<ListingCategory, 'All'>, string[]> = {
  furniture: [
    'sedia',
    'tavolo',
    'divano',
    'armadio',
    'letto',
    'mobile',
    'scaffale',
    'chair',
    'table',
    'sofa',
    'desk',
    'lamp',
    'lampada',
  ],
  tech: [
    'computer',
    'pc',
    'laptop',
    'keyboard',
    'tastiera',
    'monitor',
    'telefono',
    'phone',
    'tablet',
    'tv',
    'televisore',
    'cuffie',
    'audio',
  ],
  apparel: [
    'scarpe',
    'giacca',
    'cappotto',
    'vestito',
    'abbigliamento',
    'maglietta',
    'pantaloni',
    'shoes',
    'jacket',
    'dress',
    'clothing',
  ],
  books: ['libro', 'libri', 'book', 'books', 'rivista', 'magazine', 'journal'],
  home_decor: [
    'vaso',
    'tappeto',
    'specchio',
    'quadro',
    'decor',
    'candela',
    'vase',
    'mirror',
    'frame',
    'decorazione',
  ],
};

export function inferListingCategory(title: string): Exclude<ListingCategory, 'All'> | null {
  const normalized = title.toLowerCase();
  for (const category of LISTING_CATEGORIES) {
    if (category === 'All') continue;
    if (KEYWORDS[category].some((word) => normalized.includes(word))) {
      return category;
    }
  }
  return null;
}

export function matchesListingCategory(
  title: string,
  selected: ListingCategory,
): boolean {
  if (selected === 'All') return true;
  return inferListingCategory(title) === selected;
}
