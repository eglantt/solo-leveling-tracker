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
// бусина: «потрачена» — если стало на одну меньше (без подкладывания лишней)
const useB = w => { let b = E(w, 'data.consumables.bone_bead || 0'); if (!b) { E(w, 'data.consumables.bone_bead = 1'); b = 1; }
  E(w, "window.__N = []; flashThenRun = (sel, fn) => fn(); performUseItem('bone_bead')"); return { notice: N(w), spent: E(w, 'data.consumables.bone_bead || 0') === b - 1 }; };
const lastDay = w => { const k = Object.keys(E(w, 'data.history')).sort().pop(); return E(w, `data.history['${k}'].status`); };
(async () => {
// ===== v6.10.0 / v6.10.2: Костяная бусина и «Пелена покоя» =====
// --- предмет и тексты ---
{ const w = fresh();
  check('B1 предмет: название, ранг E, тип, не продаётся и не выпадает из шкатулок',
    E(w, "getConsumableInfo('bone_bead').name") === 'Костяная бусина' && E(w, "ITEM_META.bone_bead.rank") === 'E' && E(w, "ITEM_META.bone_bead.type") === 'Особый расходный предмет'
    && E(w, "!SHOP_CATALOG.bone_bead") && !require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8').match(/"box_[a-z_]+": \[[^\]]*bone_bead/));
  check('B2 описание (v6.10.2)', E(w, "getConsumableInfo('bone_bead').desc") === 'Следующий цикл проходит без задания: наград и штрафа нет, серия дней не прерывается и не растёт. Может быть получена за выполненное дневное задание.');
  const pv = E(w, "itemPreviewText('bone_bead')");
  check('B3 превью: «Одноразовое использование», без строки перерыва', pv.includes('Применение: Одноразовое использование') && !pv.includes('Перерыв') && pv.includes('Эффект: Следующий цикл проходит без задания'), pv);
  const fw = J(w, "[1,14,22,24,38,101].map(h => formatWaitRu(h * 3600000))");
  check('B5 формат ожидания: часы до суток, дальше дни и часы', fw === JSON.stringify(['1 час', '14 часов', '22 часа', '1 день', '1 день и 14 часов', '4 дня и 5 часов']), fw);
  check('B7 глава Кодекса (v6.10.2)', E(w, "CODEX_CHAPTERS.bone_bead.content") === 'Костяная бусина — знак, который Игрок может получить за выполненное дневное задание. Её использование активирует на следующий цикл эффект «Пелена покоя»: пока он действует, Система не назначает упражнений, не выдаёт наград и не начисляет штраф, а серия не прерывается и не растёт — Игрок может восстановить силы. Бусин немного: чем дальше путь Игрока, тем реже они ему попадаются.');
  check('B7a панель: описания «действует» и «ожидает» (v6.10.2)', E(w, 'VEIL_TEXTS.descActive') === 'Действует эффект «Пелена покоя»: задание не назначено, наград и штрафа нет, серия дней не прерывается и не растёт.'
    && E(w, 'VEIL_TEXTS.descPending') === 'Эффект «Пелена покоя» наступит с началом следующего цикла: задания не будет, наград и штрафа нет, серия дней не прерывается и не растёт.'); }
// --- получение: порог по рангу, «подряд без штрафа» ---
{ const w = fresh();
  const need = J(w, `(() => { const r = []; for (const lv of [1, 39, 40, 49, 50, 79, 80, 99, 100, 140]) { data.level = lv; data.beadStreak = 0; data.consumables.bone_bead = 0; data.activeScroll = null; let n = 1; while (!grantBoneBead()) n++; r.push(n); } return r; })()`);
  check('C1 порог по рангу: E–B каждый, A 2-й, S/National 3-й, SSS 4-й, Monarch 5-й', need === '[1,1,2,2,3,3,4,4,5,5]', need); }
{ const w = fresh("data.level = 1; data.codexUnlocked = data.codexUnlocked.filter(c => c !== 'bone_bead'); data.consumables.bone_bead = 0; data.beadStreak = 0; render();");
  complete(w); await sleep(4700);
  check('C2 E–B: бусина за выполненный день, уведомление, глава Кодекса', E(w, 'data.consumables.bone_bead') === 1 && N(w).includes('Получен предмет: Костяная бусина') && E(w, "data.codexUnlocked.includes('bone_bead')") && E(w, 'data.beadStreak') === 0, N(w)); }
{ const w = fresh('data.level = 45; data.consumables.bone_bead = 0; data.beadStreak = 0;');
  complete(w); const a1 = E(w, 'data.consumables.bone_bead'), s1 = E(w, 'data.beadStreak'); reset(w);
  complete(w); const a2 = E(w, 'data.consumables.bone_bead');
  check('C3 A-ранг: за первый день нет, за второй подряд — есть', a1 === 0 && s1 === 1 && a2 === 1 && E(w, 'data.beadStreak') === 0, `${a1}/${s1}/${a2}`); }
{ const w = fresh('data.level = 45; data.consumables.bone_bead = 0; data.beadStreak = 0;');
  complete(w); reset(w); reset(w);
  check('C4 штраф обнуляет счётчик', lastDay(w) === 'penalty' && E(w, 'data.beadStreak') === 0); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 0; data.beadStreak = 0;");
  complete(w); reset(w); E(w, "data.insurance = true; data.insuranceSourceId = 'rune_protection_charged'"); reset(w);
  check('C5 срыв, прикрытый руной, тоже обнуляет', lastDay(w) === 'protected' && E(w, 'data.beadStreak') === 0); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 1; data.beadStreak = 0;");
  complete(w); useB(w); reset(w); const s0 = E(w, 'data.beadStreak');
  reset(w); const sAfterVeil = E(w, 'data.beadStreak');
  complete(w);
  check('C6 Пелена (не снята) счётчик не трогает: путь к бусине продолжается', s0 === 1 && sAfterVeil === 1 && lastDay(w) === 'veil' && E(w, 'data.consumables.bone_bead') === 1 && E(w, 'data.beadStreak') === 0, `${s0}/${sAfterVeil}`); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 1; data.beadStreak = 0;");
  complete(w); useB(w); reset(w); await sleep(3200); E(w, 'liftVeil()'); await sleep(4800);
  const before = E(w, 'data.consumables.bone_bead'); complete(w); await sleep(4700);
  check('C7 снятая и выполненная Пелена: шага нет, бусины нет', E(w, 'data.beadStreak') === 1 && E(w, 'data.consumables.bone_bead') === before, `${E(w, 'data.beadStreak')}`);
  const exp = E(w, 'data.exp'); reset(w);
  check('C7a … и день — успех, серия +1', lastDay(w) === 'success'); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 1; data.beadStreak = 0;");
  complete(w); useB(w); reset(w); await sleep(3200); E(w, 'liftVeil()'); await sleep(4800); reset(w);
  check('C8 снятая и не выполненная Пелена: без штрафа и без сброса счётчика', lastDay(w) === 'veil' && E(w, 'data.beadStreak') === 1); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 0; data.beadStreak = 0;");
  complete(w); reset(w);
  E(w, "data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 3 * 86400000; data.freezeStartTimestamp = Date.now();"); reset(w); reset(w);
  check('C9 Заморозка счётчик не трогает', E(w, 'data.beadStreak') === 1); }
{ const w = fresh("data.level = 1; data.consumables.bone_bead = 3; data.beadStreak = 0;"); complete(w); await sleep(4700);
  check('C10 запас полный: бусины нет, счётчик всё равно заново, без уведомления', E(w, 'data.consumables.bone_bead') === 3 && E(w, 'data.beadStreak') === 0 && !N(w).includes('Костяная бусина')); }
{ const w = fresh("data.level = 45; data.consumables.bone_bead = 0; data.beadStreak = 0;");
  complete(w); reset(w); reset(w); const s0 = E(w, 'data.beadStreak');
  E(w, "data.consumables.rune_correction = 1"); use(w, 'rune_correction');
  check('C11 исправление дня руной счётчик не возвращает', s0 === 0 && E(w, 'data.beadStreak') === 0 && lastDay(w) === 'success'); }
// --- использование ---
{ const w = fresh('data.consumables.bone_bead = 1;'); const u = useB(w);
  check('U1 использование: ожидает следующего цикла, текст, бусина потрачена', E(w, 'data.pendingScroll') === 'veil' && u.spent && u.notice === 'Костяная бусина использована. Пелена покоя наступит с началом следующего цикла.', u.notice);
  const r = [['data.curseActiveToday = true;', 'Эффект недоступен, пока действует Бремя Аномалии.'], ["data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 1e8;", 'Эффект недоступен во время Заморозки.'],
    ['data.pendingCurse = true;', 'Следующий цикл уже занят Аномалией.'], ["data.pendingScroll = 'contract';", 'Следующий цикл уже занят ожидающим свитком.'], ["data.pendingScroll = 'veil';", 'Следующий цикл уже занят: ожидает Пелена покоя.']];
  const bad = r.filter(([setup, txt]) => { const x = fresh('data.consumables.bone_bead = 1; ' + setup); const v = useB(x); return v.spent || v.notice !== txt; }).map(x => x[1]);
  check('U2 отказы и их тексты, бусина не тратится', bad.length === 0, bad.join(' | '));
  const y = fresh("data.consumables.bone_bead = 1; data.activeScroll = 'contract';"); const vy = useB(y);
  check('U3 при действующем свитке — можно, эффект ожидает', vy.spent && E(y, 'data.pendingScroll') === 'veil' && E(y, 'data.activeScroll') === 'contract');
  const z = fresh("data.pendingScroll = 'veil'; data.consumables.scroll_contract = 1;"); const vz = use(z, 'scroll_contract');
  check('U4 свиток при ожидающей Пелене — отказ с её названием', !vz.spent && vz.notice === 'Следующий цикл уже занят: ожидает Пелена покоя.', vz.notice); }
{ const w = fresh('data.level = 85; data.consumables.bone_bead = 2;'); complete(w); useB(w); reset(w);
  const during = useB(w);
  check('U5 во время Пелены — «Активация … будет доступна через …»', !during.spent && /^Активация Костяной бусины будет доступна через /.test(during.notice), during.notice);
  reset(w); const after = useB(w);
  check('U6 паузы ранга нет: на следующий обычный день можно сразу (даже SSS)', after.spent && E(w, 'data.pendingScroll') === 'veil'); }
// --- досрочное снятие и блок ---
{ const w = fresh('data.consumables.bone_bead = 1;'); complete(w); useB(w); reset(w); await sleep(3200);
  E(w, `window.__C = null; showConfirm = (m, ok) => { window.__C = m; window.__OK = ok; }; onVeilTap()`);
  check('L1 касание пелены — подтверждение (текст без изменений)', E(w, 'window.__C') === 'Действует эффект «Пелена покоя». Снять его досрочно? Задание станет доступно до сброса: при выполнении Игрок получит награду, при невыполнении штрафа не будет. Бусина не возвращается.');
  E(w, 'window.__N = []; window.__OK()');
  check('L2 блок активации: до границы 05:00 после следующего цикла', E(w, 'data.beadBlockUntil === getNextCleanReset(Date.now()) + 86400000'));
  check('L3 снятие: пелена уходит, бусина рассыпается пылью (30)', E(w, "document.getElementById('veilOverlay').classList.contains('leaving')") && E(w, "document.querySelectorAll('#effectsRow .bead-eff .bdp').length") === 30);
  await sleep(4800);
  check('L4 уведомление после снятия — с фразой о двух днях', N(w).includes('Пелена покоя снята. Задание доступно до сброса. Следующая активация Костяной бусины будет доступна через два дня.') && !N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')), N(w));
  E(w, 'data.consumables.bone_bead = 1'); reset(w);
  const blocked = useB(w);
  check('L5 на следующий день активация закрыта', !blocked.spent && /^Активация Костяной бусины будет доступна через /.test(blocked.notice), blocked.notice);
  E(w, 'const _now = data.beadBlockUntil + 60000; Date.now = () => _now;');
  const open = useB(w);
  check('L6 после границы блока — снова можно', open.spent); }
{ const w = fresh('data.consumables.bone_bead = 1;'); complete(w); useB(w);
  check('L7 без снятия блока нет', E(w, 'data.beadBlockUntil') === null); }
// --- день Пелены без снятия ---
{ const w = fresh('data.level = 1; data.consumables.bone_bead = 1; data.beadStreak = 0;'); complete(w); useB(w); E(w, 'window.__N = []'); reset(w); await sleep(3200);
  check('P1 сброс: наступает Пелена без уведомления о задании', E(w, 'data.activeScroll') === 'veil' && !N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')));
  check('P2 пелена: 40 звёзд, переливы; полоса «Пелена покоя рассеется через»', E(w, "document.querySelectorAll('#veilStars i').length") === 40 && E(w, "!!document.querySelector('#veilOverlay .vo-shim')")
    && (E(w, 'updateTimerInner()'), E(w, "document.querySelector('#resetTimerContainer .reset-label').innerHTML")) === 'Пелена покоя<br class="br-narrow"> рассеется через');
  check('P3 панель: «Костяная бусина», 14 искорок', E(w, "window.__activeEffectsCache.some(e => e.name === 'Костяная бусина' && e.text === VEIL_TEXTS.descActive)") && E(w, "document.querySelectorAll('#effectsRow .bead-eff .bsp').length") === 14);
  const add = E(w, "(() => { const b = document.querySelector('.quest-item[data-id=\"pushups\"] .add'); b.onclick({ target: b }); return data.completed.pushups || 0; })()");
  check('P4 «+» в обход пелены не засчитывается', add === 0, add);
  const exp = E(w, 'data.exp'), pen = E(w, 'data.totalPenalties'), streak = E(w, 'data.consecutiveDays'), beads = E(w, 'data.consumables.bone_bead');
  E(w, 'window.__N = []'); reset(w); await sleep(3200);
  check('P5 конец Пелены: день «Пелена покоя», ни награды, ни штрафа, серия на месте, бусины нет, затем обычное задание',
    lastDay(w) === 'veil' && E(w, 'data.exp') === exp && E(w, 'data.totalPenalties') === pen && E(w, 'data.consecutiveDays') === streak && E(w, 'data.consumables.bone_bead') === beads && N(w).includes(E(w, 'STARTUP_NOTICE_TEXT')));
  complete(w); await sleep(4700);
  check('P6 следующий обычный выполненный день бусину снова даёт', E(w, 'data.consumables.bone_bead') === beads + 1); }
{ const w = fresh('data.consumables.bone_bead = 1;'); complete(w); useB(w); E(w, 'data.pendingCurse = true;'); reset(w);
  check('P7 Бремя, выпавшее при ожидающей Пелене, ждёт её окончания', E(w, 'data.activeScroll') === 'veil' && !E(w, 'data.curseActiveToday') && E(w, 'data.pendingCurse'));
  reset(w); check('P8 после Пелены Бремя наступает', E(w, 'data.curseActiveToday') === true); }
{ const w = fresh('data.consumables.bone_bead = 1;'); complete(w); useB(w); reset(w); await sleep(3200); E(w, 'liftVeil()'); await sleep(4800);
  const add = E(w, "(() => { const b = document.querySelector('.quest-item[data-id=\"pushups\"] .add'); b.onclick({ target: b }); return data.completed.pushups || 0; })()");
  check('P9 после снятия «+» засчитывается; след и полоса «До сброса без штрафа»', add > 0 && E(w, "document.querySelector('.quest-list').classList.contains('veil-trace')")
    && (E(w, 'updateTimerInner()'), E(w, "document.querySelector('#resetTimerContainer .reset-label').innerHTML")) === 'До сброса без штрафа', add); }
// --- метка на старых штрафах ---
{ const mk = (status) => { const w = fresh("data.penaltyStack = [{ day: '2026-09-01', loss: 100, returned: 0, fixedBy: null, brokeStreak: true, streakBefore: 5, streakHandled: false, chainBroken: false }];"); return w; };
  const w = mk(); E(w, "data.consumables.bone_bead = 1"); complete(w); useB(w); reset(w); reset(w);
  check('G1 день Пелены не ставит метку на старых штрафах (Руна Исправления сможет склеить серию)', lastDay(w) === 'veil' && E(w, 'data.penaltyStack[0].chainBroken') === false && E(w, 'canGlueStreak(data.penaltyStack[0])') === true);
  const w2 = mk(); E(w2, "data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 3 * 86400000; data.freezeStartTimestamp = Date.now();"); reset(w2);
  check('G2 Заморозка метку по-прежнему ставит', E(w2, 'data.penaltyStack[0].chainBroken') === true); }
// --- Летопись, бэкап, Длань, старое сохранение ---
{ const w = fresh();
  check('B31 Летопись: статус «Пелена покоя» допустим в бэкапе, пункт легенды', E(w, "sanitizeImportedData.toString()").includes("'frozen', 'veil'")
    && E(w, "[...document.querySelectorAll('#legendBody > span')].some(s => s.textContent.trim() === 'Пелена покоя' && s.querySelector('.cal-swatch').getAttribute('style').includes('#b8ccff'))"));
  const clean = JSON.parse(J(w, `sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { history: { '2026-09-01': { status: 'veil' } }, beadStreak: -3, beadBlockUntil: 'x', veilLifted: true, activeScroll: null }), total: {} })`));
  check('B32 бэкап: день «veil» сохраняется, неверный счётчик → 0, неверный блок → null, «снята» без Пелены → нет', clean.state.history['2026-09-01'].status === 'veil' && clean.state.beadStreak === 0 && clean.state.beadBlockUntil === null && clean.state.veilLifted === false);
  E(w, "data.consumables.bone_bead = 3; openFullCatalog()");
  const card = E(w, "(() => { const c = document.querySelector('[data-cat-id=\"bone_bead\"]'); return c ? [...c.querySelectorAll('button')].map(b => b.textContent + (b.disabled ? ':off' : ':on')).join(',') : null; })()");
  E(w, "devAddItem('bone_bead')");
  check('B33 Длань: «+1» неактивна на 3, больше 3 не добавить', card === '-1:on,+1:off' && E(w, 'data.consumables.bone_bead') === 3, card);
  E(w, "sysToolsAuthorized = true; data.beadBlockUntil = Date.now() + 1e7; openSysTools()");
  check('B34 Длань: «Сбросить паузу Костяной бусины» снимает блок после снятия', !E(w, "document.getElementById('resetBeadPauseBtn').disabled") && (E(w, "data.beadBlockUntil = null; openSysTools()"), E(w, "document.getElementById('resetBeadPauseBtn').disabled")));
  const legacy = JSON.parse(SEED); legacy.beadAvailableAt = Date.now() + 5e8; delete legacy.beadStreak; delete legacy.beadBlockUntil; legacy.consumables = { bone_bead: 9 };
  const saved = SEED; SEED = JSON.stringify(legacy); const w2 = boot(); SEED = saved;
  check('B35 сохранение 6.10.0: прежняя пауза снята, счётчик 0, блока нет, запас обрезан до 3', E(w2, "data.beadAvailableAt === undefined") && E(w2, 'data.beadStreak') === 0 && E(w2, 'data.beadBlockUntil') === null && E(w2, 'data.consumables.bone_bead') === 3);
  const u = useB(w2);
  check('B36 после перехода бусину можно использовать сразу', u.spent); }

// ===== v6.10.6: дневные эффекты во время Пелены покоя и Заморозки =====
const warn = (w, id) => E(w, `getUseWarning('${id}')`);
const HOLD = { potion_growth: ['Зелье Роста', 'Зелья Роста'], rune_growth_charged: ['Руна Роста', 'Руны Роста'], rune_return: ['Руна Возврата', 'Руны Возврата'], crystal_clarity: ['Кристалл Ясности', 'Кристалла Ясности'],
  crystal_impulse: ['Кристалл Импульса', 'Кристалла Импульса'], rune_freedom: ['Руна Освобождения', 'Руны Освобождения'], rune_burden_release: ['Руна Снятия Бремени', 'Руны Снятия Бремени'] };
const live = (w, id) => ['rune_freedom', 'rune_burden_release'].includes(id) ? E(w, 'data.targetDiscountToday === true') : E(w, 'data.expBoostToday > 0');
const intoVeil = async (setup) => { const w = fresh('data.consumables.bone_bead = 1; ' + (setup || '')); complete(w); useB(w); reset(w); await sleep(3200); return w; };
for (const [id, [nm, gen]] of Object.entries(HOLD)) {
  const w = await intoVeil();
  const u = use(w, id);
  const txt = `Эффект ${gen} начнёт действовать после окончания или досрочного снятия Пелены покоя.`;
  check(`H ${nm}: во время Пелены — уведомление ожидания`, u.spent && u.notice === txt, u.notice);
  check(`H ${nm}: в панели «(ожидает)», с искрой, текст ожидания`, E(w, `window.__activeEffectsCache.some(e => e.name === '${nm} (ожидает)' && e.isPending && e.sparkCount === 1 && e.text === ${JSON.stringify(txt)})`));
  reset(w);
  check(`H ${nm}: Пелена закончилась — эффект не сгорел и действует (без «ожидает»)`, live(w, id) && E(w, `window.__activeEffectsCache.some(e => e.name === '${nm}')`));
  reset(w);
  check(`H ${nm}: на сбросе следующего цикла — сгорел`, !live(w, id));
}
{ const w = await intoVeil(); use(w, 'potion_growth'); E(w, 'liftVeil()'); await sleep(4800);
  check('H досрочное снятие: ожидающий эффект сразу активен', E(w, "window.__activeEffectsCache.some(e => e.name === 'Зелье Роста')") && E(w, "!window.__activeEffectsCache.some(e => /ожидает/.test(e.name) && /Зелье/.test(e.name))"));
  const before = E(w, 'data.exp'); complete(w); const got = E(w, 'data.exp') - before;
  reset(w);
  check('H после снятия задание выполнено — опыт с увеличением; на сбросе сгорел', got > 0 && E(w, 'data.expBoostToday') === 0); }
{ const w = await intoVeil(); use(w, 'rune_burden_release'); E(w, 'liftVeil()'); await sleep(4800);
  const tWith = E(w, "getDynamicTarget(100, data.dailyTargetLevel, 'pushups')"); reset(w);
  check('H после снятия руна нагрузки активна (цель снижена), задание не выполнено — сгорела', E(w, 'data.targetDiscountToday') === false && tWith < E(w, "getDynamicTarget(100, data.dailyTargetLevel, 'pushups')")); }
{ const w = await intoVeil(); use(w, 'rune_growth_charged'); const warnTxt = warn(w, 'crystal_clarity'); use(w, 'crystal_clarity');
  check('H старшинство во время Пелены: Ясность поглощает ожидающую Руну Роста с прежним предупреждением', /поглотит действие Руны Роста/.test(warnTxt) && E(w, 'data.expBoostSourceId') === 'crystal_clarity', warnTxt); }
{ const w = fresh('data.consumables.bone_bead = 1;'); complete(w); use(w, 'potion_growth'); useB(w); reset(w);
  check('H эффект, использованный в день перед Пеленой, сгорает на своём сбросе', E(w, 'data.activeScroll') === 'veil' && E(w, 'data.expBoostToday') === 0); }
// --- расходники предела ---
for (const [id, acc] of [['shard_limit', 'Осколок Предела'], ['shard_limit_double', 'Осколок Преодоления Предела'], ['rune_limit_charged', 'Руну Преодоления Предела']]) {
  const w = await intoVeil(); const u = use(w, id);
  check(`H ${id}: во время Пелены — отказ, не тратится`, !u.spent && u.notice === `Использовать ${acc} невозможно, пока действует эффект «Пелена покоя».`, u.notice);
  E(w, 'liftVeil()'); await sleep(4800); E(w, `data.consumables.${id} = 0`); complete(w); const u2 = use(w, id);
  check(`H ${id}: после досрочного снятия — работает`, u2.spent);
}
{ const w = fresh("data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 3 * 86400000;");
  const u = use(w, 'shard_limit');
  check('H расходник предела при Заморозке — отказ', !u.spent && u.notice === 'Использовать Осколок Предела невозможно, пока действует эффект Свитка Заморозки.', u.notice);
  const w2 = fresh("data.pendingScroll = 'freeze';"); complete(w2); const u2 = use(w2, 'shard_limit');
  check('H при ожидающей (ещё не наступившей) Заморозке — как обычно', u2.spent); }
// --- Заморозка: вид ожидания, механика прежняя ---
{ const w = fresh("data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 3 * 86400000; data.freezeStartTimestamp = Date.now();");
  const u = use(w, 'crystal_impulse');
  const txt = 'Эффект Кристалла Импульса начнёт действовать после окончания или досрочного снятия Заморозки.';
  check('H Заморозка: уведомление и панель — ожидание', u.spent && u.notice === txt && E(w, `window.__activeEffectsCache.some(e => e.name === 'Кристалл Импульса (ожидает)' && e.isPending && e.text === ${JSON.stringify(txt)})`), u.notice);
  reset(w);
  check('H Заморозка: эффект доживает до конца Заморозки (не сгорает в замороженные дни)', E(w, 'data.expBoostToday') > 0 && E(w, 'data.creditBoostToday') > 0); }
// --- руны защиты и Стабильности переживают Пелену ---
{ const w = await intoVeil(); use(w, 'rune_protection'); use(w, 'rune_stability'); reset(w);
  check('H руна защиты и Руна Стабильности переживают Пелену', E(w, 'data.insurance') === true && E(w, 'data.streakShield') === true && E(w, 'data.activeScroll') === null); }
console.log(results.join('\n'));
console.log(`Итого: ${results.filter(r => r.startsWith('OK')).length} OK, ${results.filter(r => r.startsWith('FAIL')).length} FAIL`);
process.exit(0);
})();
