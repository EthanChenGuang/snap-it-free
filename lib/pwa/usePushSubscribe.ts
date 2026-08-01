import { createClient } from '@/lib/supabase/client';
import { canOfferPush, canRequestPushPermission } from '@/lib/pwa/ios-detect';
import { urlBase64ToUint8Array } from '@/lib/pwa/vapid';

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'not_logged_in'
        | 'ios_not_ready'
        | 'unsupported'
        | 'vapid_missing'
        | 'permission_denied'
        | 'subscribe_error';
    };

/** D-110: gates permission + subscribe; call only from a user click handler. */
export async function requestPushPermissionAndSubscribe(): Promise<PushSubscribeResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'not_logged_in' };
  }

  if (!canOfferPush()) {
    return { ok: false, reason: 'unsupported' };
  }

  if (!canRequestPushPermission(true)) {
    return { ok: false, reason: 'ios_not_ready' };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapidPublicKey) {
    return { ok: false, reason: 'vapid_missing' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_denied' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      await subscription.unsubscribe();
      return { ok: false, reason: 'subscribe_error' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'subscribe_error' };
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function getPushSubscriptionActive(): Promise<boolean> {
  if (!canOfferPush()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
