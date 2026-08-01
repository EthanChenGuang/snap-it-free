import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export type MatchNotificationPayload = {
  title: string;
  body: string;
  url: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  if (!subject || !publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isVapidConfigured(): boolean {
  return configureVapid();
}

/** D-107/D-108: send match push; delete stale subscription on 410 Gone. */
export async function sendMatchNotification(
  supabase: SupabaseClient,
  row: PushSubscriptionRow,
  payload: MatchNotificationPayload,
): Promise<void> {
  if (!configureVapid()) {
    console.warn('[web-push] VAPID env missing — skipping push send (alert_matches still written)');
    return;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify(payload),
    );
  } catch (error: unknown) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    if (statusCode === 410) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', row.id);

      if (deleteError) {
        console.error('[web-push] Failed to delete stale subscription:', deleteError.message);
      }
      return;
    }

    console.error('[web-push] sendNotification failed:', error);
  }
}

export async function fanOutMatchPush(
  supabase: SupabaseClient,
  userId: string,
  payload: MatchNotificationPayload,
): Promise<void> {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    console.error('[web-push] Failed to load push_subscriptions:', error.message);
    return;
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) return;

  await Promise.allSettled(rows.map((row) => sendMatchNotification(supabase, row, payload)));
}
