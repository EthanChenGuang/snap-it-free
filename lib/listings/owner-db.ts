import { getListingsPool } from '@/lib/supabase/postgres';
import type { ListingStatusUpdate } from '@/lib/ugc/status';
import type { OwnerListingRow } from './types';

type OwnerListingDbRow = {
  id: string;
  source: OwnerListingRow['source'];
  title: string;
  photo_url: string;
  photo_urls: string[] | null;
  external_url: string;
  lat: number | null;
  lng: number | null;
  zone: OwnerListingRow['zone'];
  posted_at: Date | string;
  expires_at: Date | string;
  status: OwnerListingRow['status'];
  owner_user_id: string;
  hidden_reason: string | null;
  description: string | null;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapOwnerListingRow(row: OwnerListingDbRow): OwnerListingRow {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    photo_url: row.photo_url,
    photo_urls: row.photo_urls,
    external_url: row.external_url,
    lat: row.lat,
    lng: row.lng,
    zone: row.zone,
    posted_at: toIso(row.posted_at),
    expires_at: toIso(row.expires_at),
    status: row.status,
    owner_user_id: row.owner_user_id,
    hidden_reason: row.hidden_reason,
    description: row.description,
  };
}

export async function getOwnerListingFromDb(
  id: string,
  ownerUserId: string,
): Promise<OwnerListingRow | null> {
  const { rows } = await getListingsPool().query<OwnerListingDbRow>(
    `select
       id, source, title, photo_url, photo_urls, external_url,
       lat, lng, zone, posted_at, expires_at, status,
       owner_user_id, hidden_reason, description
     from public.listings
     where id = $1::uuid
       and owner_user_id = $2::uuid
       and source = 'ugc'
     limit 1`,
    [id, ownerUserId],
  );

  const row = rows[0];
  return row ? mapOwnerListingRow(row) : null;
}

const OWNER_LIST_SQL = `select
       id, source, title, photo_url, photo_urls, external_url,
       lat, lng, zone, posted_at, expires_at, status,
       owner_user_id, hidden_reason, description
     from public.listings
     where owner_user_id = $1::uuid
       and source = 'ugc'
     order by posted_at desc`;

export async function getOwnerListingsFromDb(
  ownerUserId: string,
): Promise<OwnerListingRow[]> {
  const { rows } = await getListingsPool().query<OwnerListingDbRow>(OWNER_LIST_SQL, [
    ownerUserId,
  ]);
  return rows.map(mapOwnerListingRow);
}

export async function getOwnerListingStatusFromDb(
  id: string,
  ownerUserId: string,
): Promise<OwnerListingRow['status'] | null> {
  const { rows } = await getListingsPool().query<{ status: OwnerListingRow['status'] }>(
    `select status
     from public.listings
     where id = $1::uuid
       and owner_user_id = $2::uuid
       and source = 'ugc'
     limit 1`,
    [id, ownerUserId],
  );

  return rows[0]?.status ?? null;
}

export async function updateOwnerListingStatusInDb(
  id: string,
  ownerUserId: string,
  update: ListingStatusUpdate,
): Promise<OwnerListingRow['status'] | null> {
  const params: unknown[] = [id, ownerUserId, update.status];
  const setClauses = ['status = $3'];

  if (update.reserved_at !== undefined) {
    params.push(update.reserved_at);
    setClauses.push(`reserved_at = $${params.length}`);
  }

  const { rows } = await getListingsPool().query<{ status: OwnerListingRow['status'] }>(
    `update public.listings
     set ${setClauses.join(', ')}
     where id = $1::uuid
       and owner_user_id = $2::uuid
       and source = 'ugc'
     returning status`,
    params,
  );

  return rows[0]?.status ?? null;
}
