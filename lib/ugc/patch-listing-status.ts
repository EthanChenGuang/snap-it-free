import {
  getOwnerListingStatusFromDb,
  updateOwnerListingStatusInDb,
} from '@/lib/listings/owner-db';
import { createClient } from '@/lib/supabase/server';
import type { ListingStatus, ListingStatusUpdate } from '@/lib/ugc/status';

export async function resolveOwnerListingStatus(
  listingId: string,
  ownerUserId: string,
): Promise<ListingStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('status')
    .eq('id', listingId)
    .eq('owner_user_id', ownerUserId)
    .eq('source', 'ugc')
    .maybeSingle();

  if (!error && data) {
    return data.status as ListingStatus;
  }

  return getOwnerListingStatusFromDb(listingId, ownerUserId);
}

export async function applyOwnerListingStatusUpdate(
  listingId: string,
  ownerUserId: string,
  update: ListingStatusUpdate,
): Promise<ListingStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .update(update)
    .eq('id', listingId)
    .eq('owner_user_id', ownerUserId)
    .select('status')
    .maybeSingle();

  if (!error && data) {
    return data.status as ListingStatus;
  }

  return updateOwnerListingStatusInDb(listingId, ownerUserId, update);
}
