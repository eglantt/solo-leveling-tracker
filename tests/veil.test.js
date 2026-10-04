const { JSDOM } = require('jsdom'); const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf-8');
let SEED = null;
function boot() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'u'; w.scrollTo = () => {};
      if (SEED) w.localStorage.setItem('sl_daily_v5_5_0', SEED);
    } });
  const w = dom.window;
  w.eval(`window.__N=[]; showNotice=(m)=>window.__N.push(m);`);
  return w;
}
const E = (w, c) => w.eval(c);
{ const w0 = boot(); SEED = E(w0, `JSON.stringify(Object.assign({}, data, {level:25, exp:3000, rulesAcknowledged:true, playerName:'T', lastReset: getLastResetThreshold(Date.now()), dailyTargetLevel:25, dailyNotices:{morning:true, complete:false}}))`); w0.close(); }
function fresh(extra) {
  const w = boot();
  E(w, `data.completed={}; data.isGoalMet=false; data.dailyNotices={morning:true,complete:false}; data.insurance=false; data.insuranceSourceId=null;
    data.activeScroll=null; data.pendingScroll=null; data.curseActiveToday=false; data.pendingCurse=false; data.streakShield=false; data.streakShieldSourceId=null;
    data.targetDiscountToday=false; data.targetDiscountRate=0; data.targetDiscountSourceId=null; data.insuranceHoldScroll=null;
    data.exp=3000; data.expDebt=0; data.consecutiveDays=20; data.bestStreak=20; data.totalPenalties=3; data.penaltyStack=[]; data.history={};
    data.expBoostToday=0; data.creditBoostToday=0; data.extraLimitBreaksToday=0; data.consumables={}; data.freezeNextAvailableAt=null; ${extra||''}`);
  return w;
}
const use = (w, id) => { E(w, `window.__N=[]; data.consumables['${id}']=(data.consumables['${id}']||0)+1; performUseItem('${id}')`); return { notice: E(w,'window.__N.join(" / ")'), spent: E(w,`!data.consumables['${id}']`) }; };
const reset = w => E(w, `window.__B=null; forceFullResetAction()`);
const complete = w => {
  E(w, `document.querySelectorAll('.quest-item').forEach(i=>{ if(i.style.display==='none')return; const id=i.dataset.id; data.completed[id]=getDynamicTarget(parseInt(i.dataset.target),data.dailyTargetLevel,id)-1; })`);
  const ids = E(w, `Array.from(document.querySelectorAll('.quest-item')).filter(i=>i.style.display!=='none').map(i=>i.dataset.id)`);
  ids.forEach(id => E(w, `document.querySelector('.quest-item[data-id="${id}"] .add').click()`));
};
const J = (w, c) => E(w, `JSON.stringify(${c})`);
const fullLoss = w => E(w, `Math.floor(getExpToNext(data.level)*Math.max(0.05,0.15-Math.floor(data.level/20)*0.03-Math.max(0,data.stats.str-10)*0.0025)*(data.curseActiveToday?3:1)*(isArtifactEquipped("amulet_will")?0.85:1))`);

const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i !== undefined && !c ? '  → ' + i : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const N = w => E(w, 'window.__N.join(" / ")');
(async () => {
// ===== v6.10.0: Костяная бусина и «Пелена покоя» =====
{ const w = fresh();
  check('B1 предмет: название, ранг E, тип, не продаётся и не выпадает из шкатулок',
    E(w, "getConsumableInfo('bone_bead').name") === 'Костяная бусина' && E(w, "ITEM_META.bone_bead.rank") === 'E' && E(w, "ITEM_META.bone_bead.type") === 'Особый расходный предмет'
    && E(w, "!SHOP_CATALOG.bone_bead") && E(w, "!JSON.stringify(Object.values(typeof BOX_CONTENTS !== 'undefined' ? BOX_CONTENTS : {})).includes('bone_bead')") && !require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8').match(/"box_[a-z_]+": \[[^\]]*bone_bead/));
  check('B2 описание', E(w, "getConsumableInfo('bone_bead').desc") === 'Следующий цикл проходит без задания: штрафа нет, серия дней сохраняется. Выдаётся за выполненное дневное задание.');
  const pv = E(w, "itemPreviewText('bone_bead')");
  check('B3 превью: «Одноразовое использование», перерыв в днях по рангу', pv.includes('Применение: Одноразовое использование') && pv.includes('Перерыв между использованиями: 1 день') && pv.includes('Эффект: Следующий цикл проходит без задания'), pv);
  const pd = J(w, "[1,9,29,30,49,50,79,80,99,100,140].map(beadPauseDays)");
  check('B4 пауза по рангу (вариант Б) на границах', pd === '[1,1,1,2,2,3,3,4,4,6,6]', pd);
  const fw = J(w, "[1,14,22,24,38,101].map(h => formatWaitRu(h * 3600000))");
  check('B5 формат ожидания: часы до суток, дальше дни и часы', fw === JSON.stringify(['1 час', '14 часов', '22 часа', '1 день', '1 день и 14 часов', '4 дня и 5 часов']), fw);
  E(w, "data.level = 35"); check('B6 превью на 35 ур.: 2 дня', E(w, "itemPreviewText('bone_bead')").includes('Перерыв между использованиями: 2 дня'));
  check('B7 глава Кодекса — текст', E(w, "CODEX_CHAPTERS.bone_bead.content") === 'Костяная бусина — знак, который Игрок может получить за выполненное дневное задание. Её использование активирует эффект «Пелена покоя»: в следующем цикле Система не назначает упражнений, не начисляет штраф и не прерывает серию, а Игрок может восстановить силы. Бусин немного, и пользоваться ими можно не чаще, чем позволяет ранг: чем сильнее Игрок, тем реже можно применять интервалы между заданиями.'); }
// --- выдача ---
{ const w = fresh("data.codexUnlocked = data.codexUnlocked.filter(c => c !== 'bone_bead'); render();");
  complete(w); await sleep(4700);
  check('B8 за выполненный день +1 бусина, уведомление и глава Кодекса', E(w, "data.consumables.bone_bead") === 1 && N(w).includes('Получен предмет: Костяная бусина') && E(w, "data.codexUnlocked.includes('bone_bead')"), N(w));
  const w2 = fresh("data.consumables.bone_bead = 3;"); complete(w2); await sleep(4700);
  check('B9 при запасе 3 — не выдаётся и без уведомления', E(w2, "data.consumables.bone_bead") === 3 && !N(w2).includes('Костяная бусина')); }
// --- использование и отказы ---
{ const w = fresh(); const u = use(w, 'bone_bead');
  check('B10 использование: ожидает следующего цикла, текст, бусина потрачена', E(w, "data.pendingScroll") === 'veil' && u.spent && u.notice === 'Костяная бусина использована. Пелена покоя наступит с началом следующего цикла.', u.notice);
  check('B11 пауза: конец Пелены + (N−1) дней', E(w, "data.beadAvailableAt === getNextCleanReset(getNextCleanReset(Date.now()))"));
  const r = [['data.curseActiveToday = true;', 'Эффект недоступен, пока действует Бремя Аномалии.'], ["data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 1e8;", 'Эффект недоступен во время Заморозки.'],
    ['data.pendingCurse = true;', 'Следующий цикл уже занят Аномалией.'], ["data.pendingScroll = 'contract';", 'Следующий цикл уже занят ожидающим свитком.']];
  const bad = r.filter(([setup, txt]) => { const x = fresh(setup); const v = use(x, 'bone_bead'); return v.spent || v.notice !== txt; }).map(x => x[1]);
  check('B12 отказы: Бремя, Заморозка, Аномалия назначена, свиток ожидает — бусина не тратится', bad.length === 0, bad.join(' | '));
  const x = fresh('data.beadAvailableAt = Date.now() + 38 * 3600000 - 60000;'); const v = use(x, 'bone_bead');
  check('B13 отказ во время паузы — время в днях и часах', !v.spent && v.notice === 'Костяная бусина будет доступна через 1 день и 14 часов.', v.notice);
  const y = fresh("data.activeScroll = 'contract';"); const vy = use(y, 'bone_bead');
  check('B14 при действующем свитке — можно, эффект ожидает', vy.spent && E(y, "data.pendingScroll") === 'veil' && E(y, "data.activeScroll") === 'contract');
  const z = fresh("data.pendingScroll = 'veil';"); const vz = use(z, 'scroll_contract');
  check('B15 свиток при ожидающей Пелене — отказ с её названием', !vz.spent && vz.notice === 'Следующий цикл уже занят: ожидает Пелена покоя.', vz.notice); }
// --- цикл с Пеленой ---
{ const w = fresh(); complete(w); use(w, 'bone_bead'); const streak = E(w, 'data.consecutiveDays');
  E(w, 'window.__N = []'); reset(w); await sleep(3200);
  const days = () => Object.keys(E(w, 'data.history')).sort();
  check('B16 сброс: день выполнен (успех), наступает Пелена, без уведомления о задании', E(w, "data.activeScroll") === 'veil' && E(w, "data.pendingScroll") === null
    && E(w, `data.history['${days().pop()}'].status`) === 'success' && !N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')), N(w));
  const s2 = E(w, 'data.consecutiveDays'), exp = E(w, 'data.exp'), pen = E(w, 'data.totalPenalties');
  check('B17 пелена над карточками: 40 звёзд, переливы', E(w, "document.getElementById('veilOverlay').classList.contains('active')") && E(w, "document.querySelectorAll('#veilStars i').length") === 40 && E(w, "!!document.querySelector('#veilOverlay .vo-shim')"));
  E(w, 'updateTimerInner()');
  check('B18 полоса таймера: «Пелена покоя рассеется через» с переносом на узких', E(w, "document.querySelector('#resetTimerContainer .reset-label').innerHTML") === 'Пелена покоя<br class="br-narrow"> рассеется через');
  const fx = JSON.parse(J(w, "window.__activeEffectsCache.filter(e => /bone_bead/.test(e.icon)).map(e => ({ n: e.name, t: e.text }))"));
  check('B19 панель: «Костяная бусина» и описание эффекта, много искорок', fx.length === 1 && fx[0].n === 'Костяная бусина' && fx[0].t === 'Действует эффект «Пелена покоя»: задание не назначено, штрафа нет, серия дней сохраняется.'
    && E(w, "document.querySelectorAll('#effectsRow .bead-eff .bsp').length") === 14, JSON.stringify(fx));
  E(w, 'window.__N = []'); reset(w); await sleep(3200);
  check('B20 конец Пелены: день «Пелена покоя», без штрафа, серия не рвётся и не растёт, затем обычное задание',
    E(w, `data.history['${days().pop()}'].status`) === 'veil' && E(w, 'data.exp') === exp && E(w, 'data.totalPenalties') === pen && E(w, 'data.consecutiveDays') === s2
    && E(w, "data.activeScroll") === null && N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')), `${s2} → ${E(w, 'data.consecutiveDays')}; ${N(w)}`);
  check('B21 серия на сбросе с выполненным днём выросла, а на дне Пелены — нет', s2 === streak + 1); }
{ const w = fresh(); complete(w); use(w, 'bone_bead'); E(w, 'data.pendingCurse = true;'); reset(w);
  check('B22 Бремя, выпавшее при ожидающей Пелене, ждёт её окончания', E(w, 'data.activeScroll') === 'veil' && !E(w, 'data.curseActiveToday') && E(w, 'data.pendingCurse'));
  reset(w); check('B23 после Пелены Бремя наступает', E(w, 'data.curseActiveToday') === true && E(w, 'data.activeScroll') === null); }
// --- досрочное снятие ---
{ const w = fresh(); complete(w); use(w, 'bone_bead'); reset(w); await sleep(3200);
  E(w, `window.__C = null; showConfirm = (m, ok) => { window.__C = m; window.__OK = ok; }; onVeilTap()`);
  check('B24 касание пелены — подтверждение с текстом', E(w, 'window.__C') === 'Действует эффект «Пелена покоя». Снять его досрочно? Задание станет доступно до сброса: при выполнении Игрок получит награду, при невыполнении штрафа не будет. Бусина не возвращается.');
  E(w, 'window.__N = []; window.__OK()');
  check('B25 снятие: пелена уходит, бусина рассыпается пылью (30 частиц)', E(w, "document.getElementById('veilOverlay').classList.contains('leaving')") && E(w, "document.querySelector('#effectsRow .bead-eff').classList.contains('bead-out')")
    && E(w, "document.querySelectorAll('#effectsRow .bead-eff .bdp').length") === 30 && E(w, 'data.veilLifted') && E(w, 'data.dailyNotices.morning'));
  const css = E(w, "[...document.querySelectorAll('style')].map(x => x.textContent).join('')");
  check('B26 пелена уходит «звёзды гаснут по одной» за 4,5 с, размытие уходит вместе с ней', /\.veil-overlay\.leaving \{ animation: veilUnblur 4\.5s/.test(css) && /\.veil-overlay\.leaving \.vo-stars i \{ animation: veilStarOut/.test(css));
  await sleep(4800);
  check('B27 после снятия: уведомление, без «Получено задание», след — лунная рамка и звёзды, остаточные частицы',
    N(w).includes('Пелена покоя снята. Задание доступно до сброса.') && !N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')) && E(w, "document.querySelector('.quest-list').classList.contains('veil-trace')")
    && E(w, "document.querySelectorAll('.quest-list > .quest-item .veil-rs').length") >= 12 && E(w, "!!document.querySelector('#effectsRow .bead-trace')") && E(w, 'beadResidualTimer !== null'), N(w));
  E(w, 'updateTimerInner()');
  check('B28 полоса: «До сброса без штрафа»; панель: остаточный эффект', E(w, "document.querySelector('#resetTimerContainer .reset-label').innerHTML") === 'До сброса без штрафа'
    && E(w, "window.__activeEffectsCache.some(e => e.name === 'Костяная бусина (остаточный эффект)' && e.text === 'Эффект «Пелена покоя» снят досрочно: при выполнении задания Игрок получит награду, при невыполнении штрафа не будет.')"));
  const exp = E(w, 'data.exp'), pen = E(w, 'data.totalPenalties'); reset(w);
  const last = Object.keys(E(w, 'data.history')).sort().pop();
  check('B29 снята и не выполнена — без штрафа, день «Пелена покоя», след убран', E(w, `data.history['${last}'].status`) === 'veil' && E(w, 'data.exp') >= exp && E(w, 'data.totalPenalties') === pen && !E(w, "document.querySelector('.quest-list').classList.contains('veil-trace')")); }
{ const w = fresh(); complete(w); use(w, 'bone_bead'); reset(w); await sleep(3200); E(w, 'liftVeil()'); await sleep(4800);
  const streak = E(w, 'data.consecutiveDays'), beads = E(w, 'data.consumables.bone_bead || 0');
  complete(w); await sleep(4700); reset(w);
  const last = Object.keys(E(w, 'data.history')).sort().pop();
  check('B30 снята и выполнена — успех, серия +1, новая бусина', E(w, `data.history['${last}'].status`) === 'success' && E(w, 'data.consecutiveDays') === streak + 1 && E(w, 'data.consumables.bone_bead') === beads + 1); }
// --- Летопись, бэкап, Длань, старое сохранение ---
{ const w = fresh();
  check('B31 Летопись: статус «Пелена покоя» допустим в бэкапе, цвет дня и пункт легенды', E(w, "sanitizeImportedData.toString()").includes("'frozen', 'veil'")
    && E(w, "[...document.querySelectorAll('#legendBody > span')].some(s => s.textContent.trim() === 'Пелена покоя' && s.querySelector('.cal-swatch').getAttribute('style').includes('#b8ccff'))"));
  const clean = JSON.parse(J(w, `sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { history: { '2026-09-01': { status: 'veil' } }, beadAvailableAt: 'x', veilLifted: true, activeScroll: null }), total: {} })`));
  check('B32 бэкап: день «veil» сохраняется, неверная пауза → null, «снята» без Пелены → нет', clean.state.history['2026-09-01'].status === 'veil' && clean.state.beadAvailableAt === null && clean.state.veilLifted === false);
  E(w, "data.consumables.bone_bead = 3; openFullCatalog()");
  const card = E(w, "(() => { const c = document.querySelector('[data-cat-id=\"bone_bead\"]'); return c ? [...c.querySelectorAll('button')].map(b => b.textContent + (b.disabled ? ':off' : ':on')).join(',') : null; })()");
  E(w, "devAddItem('bone_bead')");
  check('B33 Длань: «+1» неактивна на 3, больше 3 не добавить', card === '-1:on,+1:off' && E(w, 'data.consumables.bone_bead') === 3, card);
  E(w, "data.beadAvailableAt = Date.now() + 1e7; openSysTools && openSysTools()");
  check('B34 Длань: кнопка сброса паузы бусины', !!E(w, "document.getElementById('resetBeadPauseBtn')"));
  const legacy = JSON.parse(SEED); delete legacy.beadAvailableAt; delete legacy.veilLifted; legacy.consumables = { bone_bead: 9 };
  const saved = SEED; SEED = JSON.stringify(legacy); const w2 = boot(); SEED = saved;
  check('B35 старое сохранение: поля по умолчанию, запас обрезан до 3', E(w2, 'data.beadAvailableAt') === null && E(w2, 'data.veilLifted') === false && E(w2, 'data.consumables.bone_bead') === 3); }
console.log(results.join('\n'));
console.log(`Итого: ${results.filter(r => r.startsWith('OK')).length} OK, ${results.filter(r => r.startsWith('FAIL')).length} FAIL`);
process.exit(0);
})();
