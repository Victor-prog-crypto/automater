/**
 * Automater — Local-First Service Worker with Permanent CSE Packshot Cache
 *
 * Splits caching into two independent tiers:
 *   1. APP_SHELL_CACHE ('automater-shell-v9') — versioned HTML/JSON/manifest app shell
 *   2. PACKSHOT_FOREVER_CACHE ('automater-packshots-forever-v1') — NEVER deleted across
 *      app updates, using CacheFirst so CSE studio-white (#FFFFFF) product images and
 *      on-device WASM OCR language data stay stored on the cellphone forever with $0 re-transfer.
 */

const APP_SHELL_CACHE = 'automater-shell-v9';
const PACKSHOT_FOREVER_CACHE = 'automater-packshots-forever-v1';
const PROTECTED_CACHES = new Set([APP_SHELL_CACHE, PACKSHOT_FOREVER_CACHE]);

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/app-icon.svg',
  '/data/shoprite_stores_sa.json',
  '/data/shoprite_catalog.json',
  '/data/regional_sales.json'
];

function isPermanentMediaRequest(url) {
  return (
    url.pathname.startsWith('/products/') ||
    url.pathname.startsWith('/logos/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.traineddata.gz') ||
    url.pathname.endsWith('.wasm')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !PROTECTED_CACHES.has(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Background pre-warming of CSE product packshots into permanent cellphone storage
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'WARM_PACKSHOTS_FOREVER' || !Array.isArray(data.urls)) return;

  event.waitUntil(
    caches.open(PACKSHOT_FOREVER_CACHE).then(async (cache) => {
      for (const rawUrl of data.urls) {
        try {
          const existing = await cache.match(rawUrl);
          if (!existing) {
            const resp = await fetch(rawUrl, { cache: 'force-cache' });
            if (resp && resp.status === 200) {
              await cache.put(rawUrl, resp);
            }
          }
        } catch (_) {}
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navigation requests: NetworkFirst with instant offline SPA shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. Permanent CSE Packshots, Logos & On-Device OCR WASM/Traineddata: CacheFirst Forever
  if (url.origin === self.location.origin && isPermanentMediaRequest(url)) {
    event.respondWith(
      caches.open(PACKSHOT_FOREVER_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const netResp = await fetch(event.request);
          if (netResp && netResp.status === 200) {
            cache.put(event.request, netResp.clone());
          }
          return netResp;
        } catch (_) {
          if (url.pathname.startsWith('/products/') && url.pathname.endsWith('.jpg')) {
            const svgFallback = await cache.match(url.pathname.replace(/\.jpg$/, '.svg'));
            if (svgFallback) return svgFallback;
          }
          return Response.error();
        }
      })
    );
    return;
  }

  // 3. Versioned Vite bundles (/assets/**): CacheFirst
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const netResp = await fetch(event.request);
        if (netResp && netResp.status === 200) {
          cache.put(event.request, netResp.clone());
        }
        return netResp;
      })
    );
    return;
  }

  // 4. Other same-origin static data: StaleWhileRevalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
