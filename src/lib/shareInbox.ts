import type { SharePayload } from '@/lib/sharePayload';

// Written by public/share-target-sw.js; keep the names in sync.
const SHARE_CACHE = 'share-target-v1';

export interface SharedInbox {
  payload: SharePayload;
  files: File[];
}

/** What the service worker stored from the last Android share, if anything. */
export async function readSharedInbox(): Promise<SharedInbox | null> {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open(SHARE_CACHE);
  const metaRes = await cache.match('/__share/meta');
  if (!metaRes) return null;
  const meta = (await metaRes.json()) as SharePayload & { files?: number };
  const files: File[] = [];
  for (let i = 0; i < (meta.files ?? 0); i++) {
    const res = await cache.match(`/__share/file/${i}`);
    if (!res) continue;
    const name = decodeURIComponent(res.headers.get('X-File-Name') ?? `shared-${i}`);
    const blob = await res.blob();
    files.push(new File([blob], name, { type: blob.type }));
  }
  return { payload: { title: meta.title, text: meta.text, url: meta.url }, files };
}

/** Called once the share is saved, so it is not offered again. */
export async function clearSharedInbox(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(SHARE_CACHE);
}
