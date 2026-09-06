import { getListingsPool } from '@/lib/supabase/postgres';

export type UgcListingInsert = {
  id: string;
  title: string;
  photoUrl: string;
  photoUrls: string[];
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  description: string | null;
  category: string;
  ownerUserId: string;
  contentHash: string;
  postedAt: Date;
  expiresAt: Date;
};

export function isUgcRateLimitDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Rate limit exceeded');
}

export async function countRecentUgcPosts(ownerUserId: string): Promise<number> {
  const { rows } = await getListingsPool().query<{ n: number }>(
    `select count(*)::int as n
     from public.listings
     where source = 'ugc'
       and owner_user_id = $1
       and posted_at >= now() - interval '24 hours'`,
    [ownerUserId],
  );
  return rows[0]?.n ?? 0;
}

export async function insertUgcListing(row: UgcListingInsert): Promise<void> {
  const geom = `SRID=4326;POINT(${row.lng} ${row.lat})`;
  await getListingsPool().query(
    `insert into public.listings (
      id, source, external_id, title, photo_url, photo_urls, external_url,
      lat, lng, geom, zone, city, region, status, posted_at, expires_at,
      content_hash, owner_user_id, description, category
    ) values (
      $1::uuid, 'ugc', $2, $3, $4, $5, $6,
      $7, $8, ST_GeogFromText($9), null, $10, $11, 'active', $12, $13,
      $14, $15::uuid, $16, $17
    )`,
    [
      row.id,
      row.id,
      row.title,
      row.photoUrl,
      row.photoUrls,
      `/listing/${row.id}`,
      row.lat,
      row.lng,
      geom,
      row.city,
      row.region,
      row.postedAt.toISOString(),
      row.expiresAt.toISOString(),
      row.contentHash,
      row.ownerUserId,
      row.description,
      row.category,
    ],
  );
}
