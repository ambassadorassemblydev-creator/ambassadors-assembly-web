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
  // - Supabase (Auth/DB)
  // - Admin paths (to prevent preloader hangs)
  // - Chrome Extensions
  const EXCLUDED_URLS = [
    'supabase.co',
    '/api/auth',
    '/admin',
    'chrome-extension'
  ];

  const isExcluded = (url) => EXCLUDED_URLS.some(e => url.includes(e));

  // 3. CACHING STRATEGIES

  // A. Static Assets (Cache-First)
  // Fonts, Images (Cloudinary/Unsplash), and internal static files
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
  // Ensure users get the latest content but can still see the page offline
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
  // We NEVER want to cache API responses or Supabase calls
  workbox.routing.registerRoute(
    ({ url }) => isExcluded(url.href) || url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkOnly()
  );

} else {
  console.error('[SW] Workbox failed to load. Falling back to basic fetch.');
  
  // Minimal fallback to prevent breaking the site
  self.addEventListener('fetch', (event) => {
    // Pass-through
  });
}
