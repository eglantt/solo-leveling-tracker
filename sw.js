// ============================================================================
// Service Worker — SLDT
//
// Два кэша (с v6.5.32):
//  • APP_CACHE    — каркас: страница, манифест, иконки приложения. Версия
//                   CACHE_VERSION бампается на КАЖДОМ релизе.
//  • ASSETS_CACHE — иконки предметов и шрифты (~14 МБ). Версия ASSETS_VERSION
//                   бампается ТОЛЬКО когда меняется содержимое уже
//                   существующей иконки или шрифта. Обычное обновление этот
//                   кэш не трогает.
//
// Установка качает только каркас (несколько файлов, мимо HTTP-кэша) — новый
// воркер встаёт за секунды. Страница (навигация) — network-first с таймаутом:
// онлайн всегда свежая, офлайн/медленная сеть — из кэша. Всё остальное —
// cache-first. Картинки докачиваются в фоне поштучно, не блокируя ни
// установку, ни активацию.
// ============================================================================

const CACHE_VERSION = 'v6-5-36';
const ASSETS_VERSION = 'v1';
const APP_CACHE = `solo-leveling-app-${CACHE_VERSION}`;
const ASSETS_CACHE = `solo-leveling-assets-${ASSETS_VERSION}`;
const NAV_TIMEOUT_MS = 3500;

// Каркас: без него нет первого кадра. Всё обязательное и маленькое.
const CORE_FILES = [
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

// Иконки предметов и шрифты — только для фоновой докачки (офлайн-запас).
// Файл, забытый в этом списке, всё равно попадёт в кэш при первом показе.
const ASSET_FILES = [
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
  './icons/items/crystal_impulse.png',
  './icons/items/box_anomaly.png',
  './icons/items/tablet_of_reassessment.png',
  './icons/items/title_marathoner.png',
  './icons/items/title_horizon_conqueror.png',
  './icons/items/title_tireless.png',
  './icons/items/title_unbreakable.png',
  './icons/items/title_breaker.png',
  './icons/items/title_unyielding.png',
  './icons/items/title_limit_conqueror.png',
  './icons/items/title_gate_trader.png',
  './icons/items/effect_anomaly_burden.png',
  './icons/items/effect_limit_break.png',
  './icons/items/scroll_transfer.png',
  './icons/items/scroll_renunciation.png',
  './icons/items/scroll_contract.png',
  './icons/items/scroll_freeze.png',
  './icons/items/mag_seal_transfer.png',
  './icons/items/mag_seal_renunciation.png',
  './icons/items/mag_seal_contract.png',
  './icons/items/mag_seal_freeze.png',
  './icons/items/ice_layer_freeze.png',
  './fonts/orbitron-latin-500-normal.woff2',
  './fonts/orbitron-latin-700-normal.woff2',
  './fonts/roboto-mono-latin-400-normal.woff2',
  './fonts/roboto-mono-latin-700-normal.woff2',
  './fonts/exo-2-cyrillic-500-normal.woff2',
  './fonts/exo-2-cyrillic-700-normal.woff2',
  './fonts/exo-2-cyrillic-400-normal.woff2',
  './fonts/exo-2-latin-400-normal.woff2',
  './fonts/exo-2-latin-700-normal.woff2'
];

function isAssetPath(pathname) {
  return pathname.includes('/icons/items/') || pathname.includes('/fonts/');
}

function isCacheable(response) {
  return response && response.ok;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      // cache: 'reload' — мимо HTTP-кэша браузера, чтобы в новый кэш не
      // легла 10-минутная копия прошлой версии с GitHub Pages.
      .then((cache) => cache.addAll(CORE_FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== ASSETS_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return Response.error();
  }
}

async function matchCachedPage(request) {
  const cache = await caches.open(APP_CACHE);
  return (await cache.match(request, { ignoreSearch: true })) ||
         (await cache.match('./index.html')) ||
         (await cache.match('./'));
}

// Навигация: сеть (с проверкой свежести у сервера) → при таймауте/ошибке кэш.
// Ответ сети, пришедший позже таймаута, всё равно ложится в кэш — следующее
// открытие будет уже свежим.
function handleNavigation(event) {
  const network = fetch(event.request, { cache: 'no-cache' }).then(async (response) => {
    if (isCacheable(response)) {
      const cache = await caches.open(APP_CACHE);
      await cache.put('./index.html', response.clone());
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));

  event.respondWith((async () => {
    let networkResponse = null;
    try {
      networkResponse = await Promise.race([
        network,
        new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS))
      ]);
      if (networkResponse && networkResponse.ok) return networkResponse;
    } catch (err) { /* сети нет — идём в кэш */ }
    const cached = await matchCachedPage(event.request);
    if (cached) return cached;
    if (networkResponse) return networkResponse;
    try { return await network; } catch (err) { return Response.error(); }
  })());
}

// Фоновая докачка картинок: один раз за жизнь воркера, поштучно, ошибка
// одного файла ни на что не влияет, уже скачанные пропускаются. Запускается
// из навигации, а НЕ из activate — иначе перезагруженная после обновления
// страница ждала бы, пока скачаются все 14 МБ.
let assetsPrefetchStarted = false;
function prefetchAssetsOnce() {
  if (assetsPrefetchStarted) return Promise.resolve();
  assetsPrefetchStarted = true;
  return (async () => {
    const cache = await caches.open(ASSETS_CACHE);
    for (const url of ASSET_FILES) {
      try {
        if (await cache.match(url)) continue;
        const response = await fetch(url);
        if (isCacheable(response)) await cache.put(url, response);
      } catch (err) { /* следующая попытка — при следующем запуске воркера */ }
    }
  })();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    handleNavigation(event);
    event.waitUntil(prefetchAssetsOnce());
    return;
  }
  event.respondWith(cacheFirst(request, isAssetPath(url.pathname) ? ASSETS_CACHE : APP_CACHE));
});
