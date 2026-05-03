/*
 * AMBASSADORS ASSEMBLY - SERVICE WORKER (Workbox Edition)
 * Robust caching, offline support, and API safety.
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('[SW] Workbox is loaded, Ambassador.');

  // 1. Force immediate activation
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 2. EXCLUSIONS (High IQ: Never intercept these)
  const EXCLUDED_URLS = [
    'supabase.co',
    '/api/auth',
    '/admin',
    'chrome-extension'
  ];

  const isExcluded = (url) => EXCLUDED_URLS.some(e => url.includes(e));

  // 3. CACHING STRATEGIES

  // A. Static Assets (Cache-First)
  workbox.routing.registerRoute(
    ({ request, url }) => 
      !isExcluded(url.href) && 
      (request.destination === 'style' || 
       request.destination === 'script' || 
       request.destination === 'image' ||
       request.destination === 'font'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'aa-static-assets',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // B. Pages (Network-First)
  workbox.routing.registerRoute(
    ({ request, url }) => 
      !isExcluded(url.href) && 
      request.destination === 'document',
    new workbox.strategies.NetworkFirst({
      cacheName: 'aa-pages',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    })
  );

  // C. API / Dynamic (Network-Only)
  workbox.routing.registerRoute(
    ({ url }) => isExcluded(url.href) || url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkOnly()
  );

  // 4. PUSH NOTIFICATIONS
  self.addEventListener('push', (event) => {
    let data = { title: 'Ambassadors Assembly', body: 'A new update from the sanctuary.', url: '/' };
    if (event.data) {
      try {
        data = event.data.json();
      } catch (e) {
        data.body = event.data.text();
      }
    }

    const options = {
      body: data.body,
      icon: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_192,h_192/v1775200226/IMG-20260304-WA0059_telyum.png',
      badge: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_96,h_96/v1775200226/IMG-20260304-WA0059_telyum.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url
      },
      actions: [
        { action: 'open', title: 'View Update' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;

    const urlToOpen = event.notification.data.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
    );
  });

  // 5. BACKGROUND SYNC
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prayers') {
      console.log('[SW] Syncing pending prayers...');
      // Logic to retry failed prayer submissions
    }
  });

  // 6. PERIODIC SYNC
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-sermons') {
      console.log('[SW] Periodic update for sermons triggered.');
      // Logic to prefetch latest sermons
    }
  });

} else {
  console.error('[SW] Workbox failed to load. Falling back to basic fetch.');
  self.addEventListener('fetch', (event) => {});
}
