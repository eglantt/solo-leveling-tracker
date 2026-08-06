// Bump this on every release that changes any cached file, so old
// clients pick up the new version instead of being stuck on a stale cache.
const CACHE_VERSION = 'v5-9-5';
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
  './icons/favicon-16.png',
  './icons/items/title_novice.png',
  './icons/items/title_awakened.png',
  './icons/items/title_determined.png',
  './icons/items/title_limitbreaker.png',
  './icons/items/title_wanderer.png',
  './icons/items/crystal_speed.png',
  './icons/items/amulet_will.png',
  './icons/items/seal_growth.png',
  './icons/items/rune_cleansing.png',
  './icons/items/rune_protection.png',
  './icons/items/potion_restoration.png',
  './icons/items/rune_freedom.png',
  './icons/items/rune_stability.png',
  './icons/items/potion_growth.png',
  './icons/items/box_basalt.png',
  './icons/items/box_onyx.png',
  './icons/items/box_obsidian.png',
  './icons/items/box_dark_quartz.png',
  './icons/items/box_scarlet.png',
  './icons/items/box_crimson.png',
  './icons/items/seal_limit.png',
  './icons/items/sphere_growth.png',
  './icons/items/shard_limit.png',
  './icons/items/rune_restoration_charged.png',
  './icons/items/rune_growth_charged.png',
  './icons/items/rune_protection_charged.png',
  './icons/items/rune_limit_charged.png',
  './icons/items/crystal_restoration.png',
  './icons/items/crystal_clarity.png',
  './icons/items/key_scarlet.png',
  './icons/items/key_crimson.png',
  './icons/items/amulet_continuity.png',
  './icons/items/crystal_insight.png',
  './icons/items/crystal_shadow.png',
  './icons/items/box_purple.png',
  './icons/items/box_shadow.png',
  './icons/items/key_purple.png',
  './icons/items/key_shadow.png',
  './icons/items/rune_redemption.png',
  './icons/items/rune_correction.png',
  './icons/items/rune_fate_cleansing.png',
  './icons/items/rune_cleansing_full.png',
  './icons/items/potion_restoration_full.png',
  './icons/items/shard_limit_double.png',
  './icons/items/rune_protection_absolute.png',
  './icons/items/rune_burden_release.png',
  './icons/items/rune_return.png',
  './icons/items/crystal_impulse.png'
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
