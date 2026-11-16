const CACHE = 'roma-static-v7';
const PAGES = ['/', '/game', '/missions', '/cards', '/map', '/duel', '/mystery', '/memories', '/recap', '/achievements', '/settings'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PAGES.map(async page => {
      try {
        const response = await fetch(page);
        if (!response.ok) return;
        await cache.put(page, response.clone());
        const html = await response.text();
        const assets = [...html.matchAll(/(?:src|href|component-url|renderer-url)="(\/_astro\/[^"]+)"/g)].map(match => match[1]);
        await Promise.all(assets.map(async asset => {
          try {
            const file = await fetch(asset);
            if (!file.ok) return;
            await cache.put(asset, file.clone());
            if (asset.endsWith('.js')) {
              const source = await file.text();
              const chunks = [...source.matchAll(/\.\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.js)/g)].map(match => `/_astro/${match[1]}`);
              await Promise.all(chunks.map(chunk => cache.add(chunk).catch(() => {})));
            }
          } catch { /* Retry on the next visit. */ }
        }));
      } catch { /* A failed precache should not prevent installation. */ }
    }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('roma-static-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/map', self.location.origin);
  const target = destination.origin === self.location.origin ? destination.href : new URL('/map', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const openWindow = windows.find(client => 'focus' in client);
    if (openWindow) {
      if ('navigate' in openWindow) await openWindow.navigate(target);
      return openWindow.focus();
    }
    return self.clients.openWindow(target);
  }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;
  const local = url.origin === self.location.origin;
  if (!local && !['images.unsplash.com', 'thumb.wikimedia.org', 'tile.openstreetmap.org', 'a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: local && event.request.mode === 'navigate' });
    if (!local && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && (local || response.type === 'cors')) cache.put(event.request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await cache.match('/')) || Response.error();
      return Response.error();
    }
  })());
});
