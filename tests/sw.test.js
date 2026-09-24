const vm = require('vm'); const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'sw.js'), 'utf-8');
const APP_NAME = 'solo-leveling-app-' + code.match(/CACHE_VERSION = '([^']+)'/)[1];
const BASE = 'https://eglantt.github.io/solo-leveling-tracker/';
const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i ? '  → ' + i : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeEnv(opts) {
  const store = new Map(); // cacheName -> Map(url -> Response)
  const abs = u => new URL(typeof u === 'string' ? u : u.url, BASE).href;
  const strip = u => u.split('?')[0];
  class Cache {
    constructor(m) { this.m = m; }
    async match(req, o = {}) { const k = abs(req); for (const [u, r] of this.m) if (u === k || (o.ignoreSearch && strip(u) === strip(k))) return r.clone(); return undefined; }
    async put(req, res) { this.m.set(abs(req), res.clone ? res.clone() : res); }
    async addAll(reqs) { const rs = await Promise.all(reqs.map(async r => { const res = await env.fetch(r); if (!res.ok) throw new TypeError('addAll failed ' + abs(r)); return [r, res]; })); for (const [r, res] of rs) await this.put(r, res); }
  }
  const caches = {
    async open(n) { if (!store.has(n)) store.set(n, new Map()); return new Cache(store.get(n)); },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
  };
  const log = [];
  const env = {
    store, log, opts,
    fetch: async (req, init = {}) => {
      const url = abs(req); const cacheMode = init.cache || (req.cache) || 'default';
      log.push({ url, cacheMode });
      if (opts.offline) throw new TypeError('offline');
      const delay = opts.delay?.(url) || 0; if (delay) await sleep(delay);
      if (opts.missing?.includes(url.replace(BASE, './'))) return new Response('nf', { status: 404 });
      return new Response('body:' + url.replace(BASE, './') + ':' + (opts.version || 'new'), { status: 200 });
    }
  };
  const listeners = {};
  const self = {
    location: new URL(BASE + 'sw.js'),
    addEventListener: (t, f) => (listeners[t] = f),
    skipWaiting: async () => { env.skipped = true; },
    clients: { claim: async () => { env.claimed = true; } },
  };
  class SWRequest extends Request { constructor(u, i) { super(typeof u === 'string' ? new URL(u, BASE).href : u, i); } }
  const ctx = { self, caches, fetch: (...a) => env.fetch(...a), Request: SWRequest, Response, URL, setTimeout, Promise, console };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  env.fire = (type, extra = {}) => {
    const waits = []; let responded = null;
    const ev = Object.assign({ waitUntil: p => waits.push(p), respondWith: p => (responded = p) }, extra);
    listeners[type](ev);
    return { waits, responded, all: () => Promise.all(waits) };
  };
  env.nav = (path = './index.html') => { const r = new Request(new URL(path, BASE).href); Object.defineProperty(r, 'mode', { value: 'navigate' }); return env.fire('fetch', { request: r }); };
  env.get = path => env.fire('fetch', { request: new Request(new URL(path, BASE).href) });
  return env;
}

(async () => {
  // S1: установка при недоступной предметной иконке и медленных ассетах
  let env = makeEnv({ missing: ['./icons/items/rune_freedom.png'], delay: u => u.includes('/items/') ? 2000 : 0 });
  env.store.set('solo-leveling-app-old', new Map([[BASE + 'index.html', new Response('old')]]));
  env.store.set('solo-leveling-assets-v1', new Map([[BASE + 'fonts/orbitron-latin-500-normal.woff2', new Response('font')]]));
  let t0 = Date.now(); let ev = env.fire('install'); await ev.all();
  const app = env.store.get(APP_NAME);
  check('S1 install прошёл быстро, без предметных иконок', env.skipped && Date.now() - t0 < 500 && app.size === 10, `${Date.now() - t0}мс, файлов ${app.size}`);
  check('S1 каркас качался мимо HTTP-кэша', env.log.every(l => l.cacheMode === 'reload'), env.log.map(l => l.cacheMode).join(','));
  // S2: активация
  t0 = Date.now(); ev = env.fire('activate'); await ev.all();
  check('S2 activate удалил старый кэш, оставил кэш картинок, быстро', !env.store.has('solo-leveling-app-old') && env.store.has('solo-leveling-assets-v1') && env.claimed && Date.now() - t0 < 200, [...env.store.keys()].join(', '));
  // S3: навигация онлайн — свежая страница, no-cache, кладётся в кэш
  env.log.length = 0; env.opts.version = 'fresh';
  ev = env.nav('./index.html'); let res = await ev.responded;
  check('S3 навигация онлайн: свежая страница', (await res.text()) === 'body:./index.html:fresh');
  check('S3 запрос страницы с cache:no-cache', env.log[0].cacheMode === 'no-cache', env.log[0].cacheMode);
  // фоновая докачка: идёт, ошибка одной иконки не мешает, кэшированный шрифт не качается
  await Promise.all(ev.waits);
  const assets = env.store.get('solo-leveling-assets-v1');
  const ASSET_COUNT = (code.match(/const ASSET_FILES = \[([\s\S]*?)\];/)[1].match(/'\.\//g) || []).length;
  check(`S3 фоновая докачка: ${ASSET_COUNT - 1} из ${ASSET_COUNT} (одна 404), шрифт не перекачивался`, assets.size === ASSET_COUNT - 1 && !env.log.some(l => l.url.endsWith('orbitron-latin-500-normal.woff2')), `в кэше ${assets.size}`);
  check('S3 страница легла в кэш', (await (await env.store.get(APP_NAME).get(BASE + 'index.html')).clone().text()) === 'body:./index.html:fresh');
  // повторная навигация не запускает докачку заново
  env.log.length = 0; ev = env.nav(); await ev.responded; await Promise.all(ev.waits);
  check('S3 докачка один раз за жизнь воркера', env.log.filter(l => l.url.includes('/items/')).length === 0, env.log.length + ' запросов');
  // S4: медленная сеть — через 3.5с кэш, поздний ответ всё равно в кэше
  env.opts.delay = u => u.endsWith('index.html') ? 5000 : 0; env.opts.version = 'late';
  t0 = Date.now(); ev = env.nav(); res = await ev.responded; const dt = Date.now() - t0;
  check('S4 медленная сеть: через ~3.5с отдан кэш', dt >= 3400 && dt < 4200 && (await res.text()) === 'body:./index.html:fresh', dt + 'мс');
  await Promise.all(ev.waits);
  check('S4 поздний ответ сети лёг в кэш', (await env.store.get(APP_NAME).get(BASE + 'index.html').clone().text()) === 'body:./index.html:late');
  // S5: офлайн
  env.opts.offline = true; env.opts.delay = null;
  ev = env.nav('./index.html?source=pwa'); res = await ev.responded;
  check('S5 офлайн: страница из кэша (и с query)', res.ok && (await res.text()) === 'body:./index.html:late');
  res = await env.get('./icons/items/rune_protection.png').responded;
  check('S5 офлайн: иконка предмета из кэша картинок', res.ok);
  res = await env.get('./manifest.json').responded;
  check('S5 офлайн: манифест из кэша каркаса', res.ok);
  // S6: сеть 404 на страницу + кэш есть → кэш; кэша нет → ответ сети
  env.opts.offline = false; env.opts.missing = ['./index.html'];
  res = await env.nav().responded;
  check('S6 сервер 404: отдан кэш', res.ok);
  env = makeEnv({ missing: ['./index.html'] });
  res = await env.nav().responded;
  check('S6 404 и пустой кэш: отдан ответ сети (не ошибка)', res.status === 404);
  // S7: провал каркаса — install падает (старый воркер остаётся, повтор при следующей проверке)
  env = makeEnv({ missing: ['./manifest.json'] });
  let failed = false; try { await env.fire('install').all(); } catch (e) { failed = true; }
  check('S7 недоступен файл каркаса: install отклоняется, skipWaiting не вызван', failed && !env.skipped);
  console.log(results.join('\n'));
  const nFail = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\nИтого: ${results.length - nFail} OK, ${nFail} FAIL`);
  process.exit(nFail ? 1 : 0);
})();
