import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { urlBase64ToUint8Array } from '@/lib/pushSupport';

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

/** Web Push subscription calls, exposed as `api.push`. */
export const pushApi = {
  async isSubscribed(): Promise<boolean> {
    const sub = await (await registration()).pushManager.getSubscription();
    return sub !== null;
  },

  /** Asks permission (only from a tap), subscribes, stores the device row. */
  async subscribe(): Promise<void> {
    if (!env.VITE_VAPID_PUBLIC_KEY) throw new Error('push not configured');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('permission denied');
    const sub = await (await registration()).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.VITE_VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !json.endpoint || !json.keys) throw new Error('subscription incomplete');
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { onConflict: 'endpoint' },
    );
    if (error) {
      await sub.unsubscribe();
      throw error;
    }
  },

  async unsubscribe(): Promise<void> {
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  },
};
