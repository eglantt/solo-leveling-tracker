// v7.7.5: Чаша Перерождения — реликвия: находка после закрытия дневного задания (100+, Shadow Monarch, выдержка 10 дней,
// шанс 10% + 4% за каждый день без находки), раздел Инвентаря «Реликвии», применение (Перерождение без галочек, вложенные очки — свободными),
// каталог Длани (не больше одной), бэкап и загрузка.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf-8');

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('OK   ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail !== undefined ? '  → ' + detail : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(seed) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'uuid-test';
      w.scrollTo = () => {};
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      if (seed) w.localStorage.setItem('sl_daily_v5_5_0', seed);
    }
  });
  const w = dom.window;
  if (process.env.SL_THEME !== 'system') w.eval("setTheme('classic')");
  return w;
}
const E = (w, c) => w.eval(c);
const J = (w, c) => JSON.parse(E(w, `JSON.stringify(${c})`));
const HIDE = "document.querySelectorAll('.status-overlay').forEach(o => o.style.display = 'none'); notificationQueue.length = 0; notificationActive = false;";
const TOP = `data.rulesAcknowledged = true; data.playerName = 'Dim'; data.dailyNotices.morning = true; data.paceControl = false; data.fatigueOn = false;
  data.level = 100; data.exp = 100; data.dailyTargetLevel = 100; rankApply('monarch'); data.rankHoldDays = 10; data.completed = {}; data.isGoalMet = false; data.dailyNotices.complete = false;
  saveData(); render(); ${HIDE}`;
const complete = w => {
  E(w, `document.querySelectorAll('.quest-item').forEach(i=>{ if(i.style.display==='none')return; const id=i.dataset.id; data.completed[id]=getDynamicTarget(parseInt(i.dataset.target),data.dailyTargetLevel,id)-1; })`);
  const ids = J(w, `Array.from(document.querySelectorAll('.quest-item')).filter(i=>i.style.display!=='none').map(i=>i.dataset.id)`);
  ids.forEach(id => E(w, `document.querySelector('.quest-item[data-id="${id}"] .add').click()`));
};
const mk = async extra => { const w = boot(); await sleep(250); E(w, TOP + (extra || '')); await sleep(30); E(w, HIDE); return w; };

(async () => {
  // ---- каталог, тексты ----
  { const w = await mk();
    check('RL1 предмет: название, ранг Monarch, тип «Реликвия», применение', E(w, "getConsumableInfo('relic_rebirth').name") === 'Чаша Перерождения'
      && E(w, "ITEM_META.relic_rebirth.rank") === 'Monarch' && E(w, "ITEM_META.relic_rebirth.type") === 'Реликвия' && E(w, "ITEM_META.relic_rebirth.usage") === 'Используется один раз');
    check('RL2 окно предмета: Ранг / Тип / Применение / Эффект', E(w, "itemPreviewText('relic_rebirth')") === 'Ранг: Monarch\nТип: Реликвия\nПрименение: Используется один раз\nЭффект: Обращает время вспять: путь вновь начинается с первой ступени. Всё обретённое остаётся, а вложенная сила возвращается нерастраченной.');
    check('RL3 не в Магазине и не в шкатулках', E(w, "!SHOP_CATALOG.relic_rebirth && !UNIQUE_CATALOG.relic_rebirth") && !/"box_[a-z_]+": \[[^\]]*relic_rebirth/.test(html) && !/relic_rebirth[^\n]*RANK_BOX_LOOT|RANK_BOX_LOOT[^;]*relic_rebirth/.test(html));
    check('RL4 глава Кодекса — два абзаца, последний кончается «…вновь становятся свободными.»', /^Чаша была создана много веков назад Абсолютным Существом/.test(E(w, "CODEX_CHAPTERS.relic_rebirth.content"))
      && E(w, "CODEX_CHAPTERS.relic_rebirth.content.split('\\n\\n').length") === 2 && /вновь становятся свободными\.$/.test(E(w, "CODEX_CHAPTERS.relic_rebirth.content")));
    check('RL5 нет слов «откликается / отзывается», «Отменить нельзя», «Пути назад»', !/откликает|отзывает|Отменить нельзя|Пути назад/.test(E(w, "JSON.stringify([RELIC_TEXTS, RELIC_CATALOG, CODEX_CHAPTERS.relic_rebirth])")));
    check('RL6 иконки и докачка в воркере', fs.existsSync(path.join(__dirname, '..', 'icons/items/relic_rebirth.png')) && fs.existsSync(path.join(__dirname, '..', 'icons/items-s/relic_rebirth.png'))
      && /items\/relic_rebirth\.png/.test(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf-8')) && /items-s\/relic_rebirth\.png/.test(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf-8')));
    check('RL7 у нового Игрока подстраховка 0, Чаши нет', E(w, "data.relicMiss") === 0 && !E(w, "data.consumables.relic_rebirth"));
  }
  // ---- находка ----
  { const w = await mk();
    const r = J(w, `(() => { const o = {}; const save = { l: data.level, r: data.rank, h: data.rankHoldDays };
      data.level = 99; o.lv99 = relicCanFind(); data.level = 100;
      data.rank = 'sss'; o.sss = relicCanFind(); data.rank = 'monarch';
      data.rankHoldDays = 9; o.h9 = relicCanFind(); data.rankHoldDays = 10; o.ok = relicCanFind();
      data.consumables.relic_rebirth = 1; o.has = relicCanFind(); delete data.consumables.relic_rebirth; data.level = 140; o.lv140 = relicCanFind(); data.level = save.l; return o; })()`);
    check('RL8 условия находки: 100+, Shadow Monarch, выдержка 10, Чаши нет', !r.lv99 && !r.sss && !r.h9 && r.ok && !r.has && r.lv140, JSON.stringify(r));
    const ch = J(w, `(() => { const R = Math.random, out = []; data.relicMiss = 0;
      for (let i = 0; i < 4; i++) { Math.random = () => 0.999; relicTryFind(); out.push(data.relicMiss); }
      Math.random = () => 0.10 + 0.04 * 4 - 0.001; const hit = relicTryFind(); Math.random = R; return { out, hit, miss: data.relicMiss, n: data.consumables.relic_rebirth }; })()`);
    check('RL9 без находки — подстраховка растёт на 1; шанс 10% + 4% × дней', ch.out.join() === '1,2,3,4' && ch.hit === true && ch.miss === 0 && ch.n === 1, JSON.stringify(ch));
    const ch2 = J(w, `(() => { const R = Math.random; delete data.consumables.relic_rebirth; data.relicMiss = 2; Math.random = () => 0.18; const a = relicTryFind(); const m = data.relicMiss; Math.random = R; return { a, m }; })()`);
    check('RL10 граница шанса: при 2 днях без находки 0,18 — ещё нет (шанс 18%)', ch2.a === false && ch2.m === 3, JSON.stringify(ch2));
    check('RL11 глава Кодекса — вместе с Чашей', E(w, "data.codexUnlocked.includes('relic_rebirth')"));
  }
  // ---- находка при закрытии задания ----
  { const w = await mk("data.codexUnlocked = data.codexUnlocked.filter(c => c !== 'relic_rebirth'); window.__P = []; const _sp = showSystemPopup; showSystemPopup = (t, m) => { window.__P.push(t + ' | ' + m); };");
    E(w, "window.__R = Math.random; Math.random = () => 0.01;");
    complete(w);
    E(w, "Math.random = window.__R;");
    await sleep(9000);
    check('RL12 закрыто задание — Чаша найдена', E(w, "data.consumables.relic_rebirth") === 1 && E(w, "data.dailyNotices.complete") === true, J(w, '[data.consumables.relic_rebirth, data.isGoalMet, data.dailyNotices.complete]'));
    check('RL13 окно находки: «Получена реликвия: Чаша Перерождения» / «Путь пройден до вершины. Чаша обретена.»', E(w, "window.__P.join(' / ')") === 'Получена реликвия: Чаша Перерождения | Путь пройден до вершины. Чаша обретена.', E(w, "window.__P.join(' / ')"));
    // второе закрытие в тот же день (раунд Предела) — новой попытки нет
    const miss = E(w, "data.relicMiss");
    E(w, "delete data.consumables.relic_rebirth; data.completed = {}; data.isGoalMet = false; render();");
    complete(w);
    check('RL14 одна попытка в день (повторное закрытие — без находки и без шага подстраховки)', !E(w, "data.consumables.relic_rebirth") && E(w, "data.relicMiss") === miss);
  }
  { const w = await mk("data.rankHoldDays = 3;");
    E(w, "window.__R = Math.random; Math.random = () => 0.0;"); complete(w); E(w, "Math.random = window.__R;");
    check('RL15 выдержка меньше 10 — ни находки, ни шага подстраховки', !E(w, "data.consumables.relic_rebirth") && E(w, "data.relicMiss") === 0);
  }
  // ---- Инвентарь ----
  { const w = await mk("data.consumables = { rune_protection: 1 };");
    E(w, "openInv()");
    const t0 = J(w, "Array.from(document.querySelectorAll('#invContent .section-title')).map(x => x.textContent)");
    check('RL16 без Чаши раздела «Реликвии» нет', !t0.includes('Реликвии') && t0[1] === 'Артефакты', t0.join());
    E(w, HIDE + " data.consumables.relic_rebirth = 1; openInv()");
    const t1 = J(w, "Array.from(document.querySelectorAll('#invContent .section-title')).map(x => x.textContent)");
    check('RL17 с Чашей — «Реликвии» перед «Артефактами»', t1.indexOf('Реликвии') === t1.indexOf('Артефакты') - 1, t1.join());
    const card = J(w, `(() => { const c = document.querySelector('#invContent .item-card[data-consumable-id="relic_rebirth"]'); const sec = [...document.querySelectorAll('#invContent .section-title, #invContent .item-card')];
      const i = sec.indexOf(c); return { name: c.querySelector('.item-name').textContent, sell: !!c.querySelector('.sell-btn'), use: !!c.querySelector('.use-btn'), prev: sec[i - 1].textContent,
      inCons: [...document.querySelectorAll('#invContent .item-card[data-consumable-id="relic_rebirth"]')].length, fx: !!c.querySelector('.cfx .cfx-sweep') }; })()`);
    check('RL18 карточка: имя без «×1», без продажи, с «Использовать», одна (не в «Расходниках»)', card.name === 'Чаша Перерождения' && !card.sell && card.use && card.prev === 'Реликвии' && card.inCons === 1, JSON.stringify(card));
    check('RL19 на иконке — слой блика', card.fx === true);
    E(w, "showItemPreview('relic_rebirth', 'Чаша Перерождения')");
    check('RL20 окно предмета — слой блика (большой)', E(w, "!!document.getElementById('itemPreviewImg').parentElement.querySelector(':scope > .cfx.big .cfx-sweep')"));
    E(w, "showItemPreview('rune_protection', 'Руна Защиты')");
    check('RL21 другой предмет в окне — слоя нет', E(w, "!document.getElementById('itemPreviewImg').parentElement.querySelector(':scope > .cfx')"));
  }
  // ---- применение ----
  { const w = await mk(`data.exp = 5000; data.expDebt = 700; data.credits = 184260; data.statPoints = 6; data.stats = { str: 210, agi: 140, sta: 180, int: 95, per: 110 };
    data.consumables = { relic_rebirth: 1, rune_protection: 2, bone_bead: 1 }; data.inventory = Object.keys(ARTEFACTS).slice(0, 6); data.equippedArtifacts = data.inventory.slice(0, 4);
    data.history = { '2026-11-01': { status: 'success' } }; data.consecutiveDays = 214; data.bestStreak = 214; totalStats.pushups = 90000; data.relicMiss = 5;
    data.codexUnlocked.push('relic_rebirth'); data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 86400000; data.pendingScroll = 'veil'; data.pendingCurse = true; data.expBoostToday = 0.2; saveData();`);
    E(w, "relicUseAsk()");
    const ask = E(w, "document.getElementById('confirmContent').textContent.replace(/\\s+/g, ' ').trim()");
    check('RL22 окно подтверждения — текст и кнопки «Отмена» / «Испить» (красная)', ask === 'Испить из Чаши Перерождения? Путь начнётся с первого уровня. Всё обретённое сохранится, очки характеристик высвободятся. Действующие и ожидающие эффекты будут сняты. Чаша исчезнет. Отмена Испить'
      && E(w, "!!document.querySelector('#confirmContent .danger-btn-confirm')") && E(w, "document.querySelector('#confirmContent .danger-btn-confirm').textContent") === 'Испить', ask);
    E(w, "closeConfirmModal()");
    check('RL23 «Отмена» — ничего не изменилось', E(w, "data.level") === 100 && E(w, "data.consumables.relic_rebirth") === 1);
    E(w, "window.__N = []; const _sn = showNotice; showNotice = (m, t) => { window.__N.push(m); }; relicUseAsk(); runConfirmedAction();");
    await sleep(600);
    const s = J(w, `({ lv: data.level, exp: data.exp, debt: data.expDebt, sp: data.statPoints, st: data.stats, cr: data.credits, rank: data.rank, relic: data.consumables.relic_rebirth || 0,
      rp: data.consumables.rune_protection, bead: data.consumables.bone_bead, inv: data.inventory.length, eq: data.equippedArtifacts.filter(Boolean).length, hist: Object.keys(data.history).length,
      streak: data.consecutiveDays, push: totalStats.pushups, miss: data.relicMiss, ch: data.codexUnlocked.includes('relic_rebirth'), mon: data.codexUnlocked.includes('rank_monarch') || data.codexUnlocked.some(c => /monarch/.test(c)),
      scroll: data.activeScroll, pend: data.pendingScroll, curse: data.pendingCurse, boost: data.expBoostToday, frz: data.freezeEndTimestamp, tl: data.dailyTargetLevel })`);
    check('RL24 уровень 1, опыт и долг 0, цели — уровня 1', s.lv === 1 && s.exp === 0 && s.debt === 0 && s.tl === 1, JSON.stringify(s));
    check('RL25 характеристики 10, очки = свободные 6 + вложенные (200+130+170+85+100)', JSON.stringify(s.st) === '{"str":10,"agi":10,"sta":10,"int":10,"per":10}' && s.sp === 6 + 200 + 130 + 170 + 85 + 100, s.sp);
    check('RL26 остаются: кредиты, ранг, предметы, артефакты, Летопись, прогресс', s.cr === 184260 && s.rank === 'monarch' && s.rp === 2 && s.bead === 1 && s.inv === 6 && s.hist === 1 && s.streak === 214 && s.push === 90000 && s.mon);
    check('RL27 Чаша исчезла, подстраховка 0, глава Чаши осталась', s.relic === 0 && s.miss === 0 && s.ch);
    check('RL28 эффекты сняты — Заморозка, ожидающая Пелена, ожидающее Бремя, Зелье Роста', s.scroll === null && s.pend === null && s.curse === false && s.boost === 0 && s.frz === null, JSON.stringify(s));
    check('RL29 контур закрыт — артефакты в Инвентаре', s.eq === 0);
    check('RL30 уведомление через 3 с после эффекта', !E(w, "window.__N.join('|')").includes('испита'));
    await sleep(3100);
    check('RL31 «Чаша Перерождения испита. Путь начинается заново.»', E(w, "window.__N.join('|')") === 'Чаша Перерождения испита. Путь начинается заново.', E(w, "window.__N.join('|')"));
  }
  { const w = await mk("data.consumables = { relic_rebirth: 1 }; data.curseActiveToday = true;");
    E(w, "window.__N = []; showNotice = (m, t) => { window.__N.push(m + ' [' + t + ']'); }; relicUseAsk();");
    check('RL32 под Бременем — отказ, окна нет, Чаша на месте', E(w, "window.__N.join('|')") === 'Чашу Перерождения нельзя использовать: действует Бремя Аномалии. [warn]'
      && E(w, "document.getElementById('confirmOverlay').style.display") !== 'flex' && E(w, "data.consumables.relic_rebirth") === 1);
    E(w, "data.curseActiveToday = false; data.expDebt = 99999; relicUseAsk();");
    check('RL33 долг не мешает', E(w, "document.getElementById('confirmOverlay').style.display") === 'flex');
    E(w, "closeConfirmModal(); useItem('relic_rebirth')");
    check('RL34 «Использовать» в Инвентаре ведёт к тому же окну', E(w, "document.querySelector('#confirmContent .danger-btn-confirm').textContent") === 'Испить');
  }
  { const w = await mk("data.level = 7; data.rank = null; data.consumables = { relic_rebirth: 1 }; data.stats.str = 14; data.statPoints = 1;");
    E(w, "relicApply()");
    check('RL35 из каталога Длани — на любом уровне (7-й, без ранга)', E(w, "data.level") === 1 && E(w, "data.statPoints") === 5 && E(w, "data.stats.str") === 10 && !E(w, "data.consumables.relic_rebirth"));
    check('RL36 без Чаши применение ничего не делает', E(w, "relicApply()") === false);
  }
  // ---- Длань ----
  { const w = await mk("data.consumables = {};");
    E(w, "openFullCatalog()");
    const t = J(w, "Array.from(document.querySelectorAll('#fullCatalogContent .section-title')).map(x => x.textContent)");
    check('RL37 каталог Длани — раздел «Реликвии»', t.includes('Реликвии') && E(w, "!!document.querySelector('#fullCatalogContent [data-cat-id=\"relic_rebirth\"]')"), t.join());
    E(w, "flashThenRun = (sel, fn) => fn(); devAddItem('relic_rebirth'); devAddItem('relic_rebirth');");
    check('RL38 +1 — не больше одной; «+1» неактивна', E(w, "data.consumables.relic_rebirth") === 1 && E(w, "document.querySelector('#fullCatalogContent [data-cat-id=\"relic_rebirth\"] .item-btn-stack button:last-child').disabled") === true);
    E(w, "devRemoveItem('relic_rebirth')");
    check('RL39 −1 — Чаши нет, «+1» снова активна', !E(w, "data.consumables.relic_rebirth") && E(w, "document.querySelector('#fullCatalogContent [data-cat-id=\"relic_rebirth\"] .item-btn-stack button:last-child').disabled") === false);
  }
  // ---- Перерождение Дланью: глава Чаши остаётся ----
  { const w = await mk("data.codexUnlocked.push('relic_rebirth'); data.relicMiss = 7;");
    E(w, "rebirthApply({ rank: true, items: true })");
    check('RL40 Перерождение Дланью: глава Чаши остаётся, подстраховка 0', E(w, "data.codexUnlocked.includes('relic_rebirth')") && E(w, "data.relicMiss") === 0);
  }
  // ---- бэкап и загрузка ----
  { const w = await mk("data.consumables = { relic_rebirth: 1 }; data.relicMiss = 4; saveData();");
    const SAN = o => `sanitizeImportedData({ state: Object.assign(JSON.parse(JSON.stringify(data)), ${o}), total: {} }).state`;
    const clean = J(w, SAN("{ consumables: { relic_rebirth: 5, rune_protection: 2 }, relicMiss: 4 }"));
    check('RL41 импорт: Чаша — не больше одной, подстраховка переносится', clean.consumables.relic_rebirth === 1 && clean.consumables.rune_protection === 2 && clean.relicMiss === 4, JSON.stringify(clean.consumables) + ' ' + clean.relicMiss);
    const bad = J(w, `[${SAN("{ relicMiss: -3 }")}.relicMiss, ${SAN("{ relicMiss: 'x' }")}.relicMiss, ${SAN("{ relicMiss: 999 }")}.relicMiss]`);
    check('RL42 импорт: кривая подстраховка → 0…30', bad.join() === '0,0,30', bad.join());
    const seed = E(w, "JSON.stringify(Object.assign(JSON.parse(JSON.stringify(data)), { consumables: { relic_rebirth: 3 }, relicMiss: 2.7, codexUnlocked: data.codexUnlocked.filter(c => c !== 'relic_rebirth') }))");
    const w2 = boot(seed); await sleep(250);
    check('RL43 загрузка: Чаша не больше одной, подстраховка — целая, глава догоняется', E(w2, "data.consumables.relic_rebirth") === 1 && E(w2, "data.relicMiss") === 2 && E(w2, "data.codexUnlocked.includes('relic_rebirth')"));
    const old = E(w, "(() => { const o = JSON.parse(JSON.stringify(data)); delete o.relicMiss; return JSON.stringify(o); })()");
    const w3 = boot(old); await sleep(250);
    check('RL44 сохранение без поля — подстраховка 0', E(w3, "data.relicMiss") === 0);
  }
  // ---- пауза под окнами ----
  { const src = html;
    check('RL45 блёстки не появляются под открытым окном и в свёрнутом', /if \(!document\.hidden && !o\.closest\('\.anim-paused'\)\) relicGlint\(o\)/.test(src));
    check('RL46 стили Чаши — до блока v7.2.2 и до блока темы', src.indexOf('.cfx-sweep i {') > 0 && src.indexOf('.cfx-sweep i {') < src.indexOf('===== v7.2.2:') && src.indexOf('.cfx-sweep i {') < src.indexOf('ТЕМА «СИСТЕМА»'));
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
