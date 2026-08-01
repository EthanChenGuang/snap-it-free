export type ListingSource = 'subito' | 'facebook' | 'ugc';
export type ListingStatus = 'active' | 'claimed' | 'expired' | 'hidden';
export type VeniceZone = 'centro_storico' | 'mestre_marghera' | 'lido_murano';

export type ListingRow = {
  id: string;
  source: ListingSource;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  zone: VeniceZone | null;
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
