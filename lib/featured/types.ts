import type { ConsumerCityKey } from '@/lib/geo/italian-cities';

/** Row of `featured_picks_public` (approved picks whose listing is still active). */
export type FeaturedPickRow = {
  id: string;
  listing_id: string;
  consumer_city: ConsumerCityKey;
  studio_path: string;
  reviewed_at: string | null;
  title: string;
  title_en: string | null;
  title_zh: string | null;
  city: string | null;
  category: string | null;
};

export type FeaturedPick = FeaturedPickRow & {
  /** Public URL of the self-hosted studio WebP in the `featured-photos` bucket. */
  imageUrl: string;
};

export const FEATURED_PHOTOS_BUCKET = 'featured-photos';
export const FEATURED_PICKS_VIEW = 'featured_picks_public';
/** Max picks shown in the strip (per city, and for the "all" view). */
export const FEATURED_PICKS_CAP = 20;
