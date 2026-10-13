// Web Push for Resurface reminders, imported into the generated service
// worker (vite.config.ts, workbox.importScripts). Payload comes from
// supabase/functions/send-reminders: { title, body, url }.
self.addEventListener('push', (event) => {
  let data = { title: 'Smart Link', body: '', url: '/resurface' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Keep the defaults for an empty or malformed payload.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url },
      tag: 'resurface',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only same-origin paths; never follow a URL out of the app.
  const path = String(event.notification.data?.url ?? '/resurface');
  const target = new URL(path.startsWith('/') ? path : '/resurface', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
