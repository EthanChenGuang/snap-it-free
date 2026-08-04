import type { SupabaseClient } from '@supabase/supabase-js';
import { alertMatchesListing } from './matcher';
import type { VeniceZone } from '@/lib/listings/types';
import { fanOutMatchPush } from '@/lib/notifications/web-push';
import { buildMatchPushContent, loadUserLocales } from '@/lib/user/locale';
import type { AppLanguage } from '@/lib/settings/preferences';

const BATCH_LIMIT = 50;

type PendingEvent = {
  id: string;
  listing_id: string;
};

type ListingRow = {
  id: string;
  title: string;
  title_en?: string | null;
  title_zh?: string | null;
  zone: VeniceZone | null;
};

type EnabledAlert = {
  id: string;
  user_id: string;
  keyword: string | null;
  zone: VeniceZone | null;
};

async function markEvent(
  supabase: SupabaseClient,
  eventId: string,
  status: 'processed' | 'failed',
): Promise<void> {
  const { error } = await supabase
    .from('listing_events')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    console.error(`Failed to mark listing_event ${eventId} as ${status}:`, error.message);
  }
}

async function processOneEvent(
  supabase: SupabaseClient,
  event: PendingEvent,
  alerts: EnabledAlert[],
): Promise<boolean> {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, title_en, title_zh, zone')
    .eq('id', event.listing_id)
    .maybeSingle();

  if (listingError || !listing) {
    await markEvent(supabase, event.id, 'failed');
    return false;
  }

  const listingRow = listing as ListingRow;
  const matches = alerts.filter((alert) =>
    alertMatchesListing(
      { keyword: alert.keyword, zone: alert.zone },
      { title: listingRow.title, zone: listingRow.zone },
    ),
  );

  if (matches.length > 0) {
    const rows = matches.map((alert) => ({
      user_id: alert.user_id,
      alert_id: alert.id,
      listing_id: listingRow.id,
    }));

    const { error: insertError } = await supabase
      .from('alert_matches')
      .upsert(rows, { onConflict: 'user_id,alert_id,listing_id', ignoreDuplicates: true });

    if (insertError) {
      await markEvent(supabase, event.id, 'failed');
      return false;
    }

    const userIds = [...new Set(matches.map((alert) => alert.user_id))];
    const localeByUser = await loadUserLocales(supabase, userIds);

    const notifiedUsers = new Set<string>();

    await Promise.allSettled(
      matches.map(async (alert) => {
        if (notifiedUsers.has(alert.user_id)) return;
        notifiedUsers.add(alert.user_id);

        const locale: AppLanguage = localeByUser.get(alert.user_id) ?? 'zh';
        const { title, body } = buildMatchPushContent(listingRow, locale);

        await fanOutMatchPush(supabase, alert.user_id, {
          title,
          body,
          url: `/listing/${listingRow.id}`,
        });
      }),
    );
  }

  await markEvent(supabase, event.id, 'processed');
  return true;
}

/** D-106/D-136: batch match pending listing_events → alert_matches + locale-aware push. */
export async function processPendingListingEvents(
  supabase: SupabaseClient,
): Promise<number> {
  const { data: events, error: eventsError } = await supabase
    .from('listing_events')
    .select('id, listing_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const pending = (events ?? []) as PendingEvent[];
  if (pending.length === 0) {
    return 0;
  }

  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('id, user_id, keyword, zone')
    .eq('enabled', true);

  if (alertsError) {
    throw new Error(alertsError.message);
  }

  const enabledAlerts = (alerts ?? []) as EnabledAlert[];
  const results = await Promise.allSettled(
    pending.map((event) => processOneEvent(supabase, event, enabledAlerts)),
  );

  return results.filter((result) => result.status === 'fulfilled' && result.value).length;
}
