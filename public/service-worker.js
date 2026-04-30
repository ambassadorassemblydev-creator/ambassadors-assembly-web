const CACHE_NAME = 'ambassadors-v2';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_192,h_192,g_auto,f_auto,q_auto/v1775200226/IMG-20260304-WA0059_telyum.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// High IQ Fetch Strategy with Offline Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // PWABuilder Timeout Fix: Immediately serve offline page for check
  if (url.search.includes('pwabuilder-offline-check')) {
    event.respondWith(caches.match('/offline'));
    return;
  }

  // Strategy: Network First for API and dynamic pages
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api') || url.pathname === '/my-account')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Strategy: Stale-While-Revalidate with Offline Fallback for Navigation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request).then((networkResponse) => {
        // Only cache successful GET requests
        if (request.method === 'GET' && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // If navigation request fails, show offline page
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
      });

      return cachedResponse || networkFetch;
    })
  );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Ambassadors Assembly', body: 'A new message from the sanctuary.' };
  
  const options = {
    body: data.body,
    icon: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_192,h_192,g_auto,f_auto,q_auto/v1775200226/IMG-20260304-WA0059_telyum.jpg',
    badge: 'https://res.cloudinary.com/dxwhpacz7/image/upload/c_fill,w_96,h_96,g_auto,f_auto,q_auto/v1775200226/IMG-20260304-WA0059_telyum.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };


  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});


