// Bump this on every release that changes any cached file, so old
// clients pick up the new version instead of being stuck on a stale cache.
const CACHE_VERSION = 'v5-7-17';
const APP_CACHE = `solo-leveling-app-${CACHE_VERSION}`;
const FONT_CACHE = 'solo-leveling-fonts';

const FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Roboto+Mono:wght@400;700&display=swap';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)),
      // Best-effort: the stylesheet URL varies by requesting browser, so this
      // just warms the cache for the current one. Missing this isn't fatal —
      // the fetch handler below will cache it on first real request anyway.
      caches.open(FONT_CACHE).then((cache) =>
        cache.add(FONT_STYLESHEET).catch(() => {})
      )
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Cross-origin font requests (stylesheet + no-cors font files) often come
// back as "opaque" responses — status can't be inspected, but they're still
// safe and worth caching.
function isCacheable(response) {
  return response && (response.ok || response.type === 'opaque' || response.type === 'opaqueredirect');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Fonts stylesheet: check network first so a font-weight change
  // in a future update is picked up, but fall back to cache when offline.
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(event.request, FONT_CACHE));
    return;
  }

  // Actual font files are immutable (hashed URLs) — safe to cache-first.
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, FONT_CACHE));
    return;
  }

  // App shell and anything else same-origin.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, APP_CACHE));
  }
});
