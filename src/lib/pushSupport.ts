export type PushAvailability = 'available' | 'install-first' | 'unsupported' | 'blocked';

export interface PushEnvironment {
  hasPushApi: boolean;
  /** Launched from the Home Screen; iOS only allows push there. */
  standalone: boolean;
  permission: NotificationPermission;
  hasKey: boolean;
}

/** Whether the reminder toggle can be offered (business rule 17). */
export function pushAvailability(env: PushEnvironment): PushAvailability {
  if (!env.hasPushApi || !env.hasKey) return 'unsupported';
  if (!env.standalone) return 'install-first';
  if (env.permission === 'denied') return 'blocked';
  return 'available';
}

/** VAPID public keys are base64url; PushManager wants raw bytes. */
export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Reads the live browser state for pushAvailability. */
export function currentPushEnvironment(vapidKey: string | undefined): PushEnvironment {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    hasPushApi: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    standalone: nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true,
    permission: 'Notification' in window ? Notification.permission : 'denied',
    hasKey: !!vapidKey,
  };
}
