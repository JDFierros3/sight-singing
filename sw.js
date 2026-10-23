/* Shape Notes service worker — offline support without stranding users on a stale build.
 *
 * Strategy:
 *   - Navigations (the HTML page): NETWORK-FIRST → users always get the latest app when online,
 *     and fall back to the cached page only when offline.
 *   - Same-origin assets (js/css/json/media): STALE-WHILE-REVALIDATE → instant load from cache,
 *     refreshed in the background.
 *   - Cross-origin CDN libs + instrument samples (Tone.js, VexFlow, soundfonts, salamander):
 *     CACHE-FIRST → they live at versioned/immutable URLs, so first visit caches them for offline.
 *
 * Bump CACHE_VERSION to force every client onto a fresh cache on the next load.
 */
const CACHE_VERSION = 'lsn-v2';
const APP_SHELL = ['/', '/index.html', '/styles.css', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response);
  } catch (e) { /* ignore (e.g. opaque/partial) */ }
}

// Network-first: fresh page when online, cached page when offline.
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) putInCache(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || caches.match('/index.html');
  }
}

// Stale-while-revalidate: serve cache immediately, refresh in the background.
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) putInCache(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetching;
}

// Cache-first: for immutable cross-origin CDN assets.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) putInCache(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
