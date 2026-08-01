import { NextResponse } from 'next/server';
import type { VeniceZone } from '@/lib/listings/types';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export type MatchListItem = {
  listingId: string;
  title: string;
  zone: VeniceZone | null;
  keyword: string | null;
  alertZone: VeniceZone | null;
  createdAt: string;
};

/** D-114: recent unread matches for Settings list. */
export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alert_matches')
    .select(
      `
      listing_id,
      created_at,
      alerts ( keyword, zone ),
      listings ( title, zone )
    `,
    )
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type AlertEmbed = { keyword: string | null; zone: VeniceZone | null };
  type ListingEmbed = { title: string; zone: VeniceZone | null };

  type RawRow = {
    listing_id: string;
    created_at: string;
    alerts: AlertEmbed | AlertEmbed[] | null;
    listings: ListingEmbed | ListingEmbed[] | null;
  };

  function unwrapOne<T>(value: T | T[] | null): T | null {
    if (value == null) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  }

  const matches: MatchListItem[] = ((data ?? []) as unknown as RawRow[])
    .map((row) => {
      const listing = unwrapOne(row.listings);
      const alert = unwrapOne(row.alerts);
      if (!listing) return null;
      return {
        listingId: row.listing_id,
        title: listing.title,
        zone: listing.zone,
        keyword: alert?.keyword ?? null,
        alertZone: alert?.zone ?? null,
        createdAt: row.created_at,
      };
    })
    .filter((row): row is MatchListItem => row !== null);

  return NextResponse.json({ matches });
}
