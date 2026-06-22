export const runtime = 'nodejs';

export async function GET() {
  const swCode = `const CACHE_NAME = 'famille-sync-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// Listen for messages from clients (update request)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail if assets can't be cached (network issue during install)
      });
    })
  );
  // Don't skip waiting automatically - let the user decide via the UI
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first for API calls (Supabase)
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()))
            );
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.match(/\\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i) ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((fetchResponse) => {
          event.waitUntil(
            caches.open(CACHE_NAME).then((c) => c.put(request, fetchResponse.clone()))
          );
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Default: network-first with fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});`;

  return new Response(swCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
