/*
 * AMBASSADORS ASSEMBLY - SERVICE WORKER
 * Robust caching, offline support, and API safety.
 */

const CACHE_NAME = 'aa-v1-manual';
const OFFLINE_URL = '/offline';
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/js/pwa-handler.js',
  '/css/style.min.css'
];

// 1. INSTALL: Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && !cacheName.startsWith('workbox')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clientsClaim();
});

// 3. LOAD WORKBOX
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  console.log('[SW] Workbox is loaded.');

  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // EXCLUSIONS
  const EXCLUDED_URLS = ['supabase.co', '/api/auth', '/admin', 'chrome-extension'];
  const isExcluded = (url) => EXCLUDED_URLS.some(e => url.includes(e));

  // A. Static Assets (Stale-While-Revalidate)
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
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      ],
    })
  );

  // B. Pages (Network-First with Offline Fallback)
  const pageStrategy = new workbox.strategies.NetworkFirst({
    cacheName: 'aa-pages',
    networkTimeoutSeconds: 5,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [200] }),
    ],
  });

  workbox.routing.registerRoute(
    ({ request, url }) => !isExcluded(url.href) && request.destination === 'document',
    async (params) => {
      try {
        return await pageStrategy.handle(params);
      } catch (error) {
        return caches.match(OFFLINE_URL);
      }
    }
  );

  // C. API (Network-Only)
  workbox.routing.registerRoute(
    ({ url }) => isExcluded(url.href) || url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkOnly()
  );

} else {
  // FALLBACK FETCH HANDLER (If Workbox fails to load)
  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(OFFLINE_URL);
        })
      );
    } else {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
    }
  });
}

// 4. PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  let data = { title: 'Ambassadors Assembly', body: 'A new update from the sanctuary.', url: '/' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }

  const options = {
    body: data.body,
    icon: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_192,h_192/v1775200226/IMG-20260304-WA0059_telyum.png',
    badge: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_96,h_96/v1775200226/IMG-20260304-WA0059_telyum.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: [
      { action: 'open', title: 'View Update' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
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
