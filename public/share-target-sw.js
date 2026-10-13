// Android Web Share Target (capture channel #3). Imported into the generated
// service worker (vite.config.ts, workbox.importScripts) so this listener runs
// before Workbox's routes. A share arrives as a multipart POST; a static host
// cannot receive it, so the worker stores it in Cache Storage and redirects
// to /share, where the app reads it (src/lib/shareInbox.ts). Kept in sync with
// SHARE_CACHE and the key names there.
const SHARE_CACHE = 'share-target-v1';
const MAX_FILES = 10;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;

  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const cache = await caches.open(SHARE_CACHE);
        // One share at a time: drop anything left from an earlier one.
        for (const key of await cache.keys()) await cache.delete(key);

        const files = form
          .getAll('images')
          .filter((f) => f instanceof File && f.type.startsWith('image/'))
          .slice(0, MAX_FILES);
        for (const [i, file] of files.entries()) {
          await cache.put(
            `/__share/file/${i}`,
            new Response(file, {
              headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
            }),
          );
        }
        const meta = {
          title: String(form.get('title') ?? ''),
          text: String(form.get('text') ?? ''),
          url: String(form.get('url') ?? ''),
          files: files.length,
        };
        await cache.put('/__share/meta', new Response(JSON.stringify(meta)));
        return Response.redirect('/share?incoming=1', 303);
      } catch {
        return Response.redirect('/share?error=1', 303);
      }
    })(),
  );
});
