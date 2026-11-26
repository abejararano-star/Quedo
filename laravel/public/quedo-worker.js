const offlineCache = 'quedo-offline-v1';
const offlinePage = new URL('sin-conexion.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(offlineCache).then(cache => cache.add(offlinePage)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('quedo-offline-') && key !== offlineCache)
      .map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate'
      || new URL(event.request.url).origin !== self.location.origin) return;
  // Pages, responses, forms and session data always stay on the network.
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(offlinePage, { cacheName: offlineCache })) || Response.error()
  ));
});
