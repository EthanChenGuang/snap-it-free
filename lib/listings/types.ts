export type ListingSource = 'subito' | 'facebook' | 'ugc';
export type ListingStatus = 'active' | 'claimed' | 'expired' | 'hidden';
export type VeniceZone = 'centro_storico' | 'mestre_marghera' | 'lido_murano';

export type ListingRow = {
  id: string;
  source: ListingSource;
  title: string;
  /** Phase 6 translation columns — optional until migration applied */
  title_en?: string | null;
  title_zh?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  zone: VeniceZone | null;
  /** Phase 8 location columns — optional until migration 020 applied */
  city?: string | null;
  region?: string | null;
  /** Phase 6/8 category columns — optional until migration applied */
  category?: string | null;
  category_en?: string | null;
  category_zh?: string | null;
  posted_at: string;
  expires_at: string;
  status: ListingStatus;
};

export type OwnerListingRow = ListingRow & {
  owner_user_id: string;
  hidden_reason: string | null;
  description: string | null;
};

export type ZoneChip = 'All' | VeniceZone;
