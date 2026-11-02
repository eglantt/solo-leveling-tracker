// v7.6.0: ранг отдельно от уровня — ТН, режим, перенос, Длань «Испытание ранга», бусина, Реестр, бэкап.
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
function boot(seed, stats) {
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
      if (stats) w.localStorage.setItem('sl_total_stats_v5_5_0', stats);
    }
  });
  const w = dom.window;
  if (process.env.SL_THEME !== 'system') w.eval("setTheme('classic')");
  return w;
}
const E = (w, c) => w.eval(c);
const J = (w, c) => JSON.parse(E(w, `JSON.stringify(${c})`));
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

(async () => {
  // ---- шаблон: свежая установка ----
  const w0 = boot(); await sleep(200);
  const fresh = J(w0, `{ rank: data.rank, tn: data.tn, tnToday: data.tnToday, tnAdj: data.tnAdj, tnMul: data.tnMul, ov: data.tnRegimeOverride, v: data.rankSysV, t: data.titlesUnlocked, a: data.activeTitle, hdr: document.getElementById('hdrRank').textContent, top: document.getElementById('hdrTop').className }`);
  check('R1 свежая установка: без ранга, ТН 0, режим ×1, перенос уже отмечен', fresh.rank === null && Object.values(fresh.tn).every(v => v === 0) && fresh.tnToday === 0 && fresh.tnAdj === 0 && fresh.tnMul === 1 && fresh.ov === null && fresh.v === 1, JSON.stringify(fresh));
  check('R2 шапка: «Без ранга», цвет E', fresh.hdr === 'Без ранга' && fresh.top === 'sc-top rk-e', fresh.hdr + ' ' + fresh.top);
  const base = JSON.parse(E(w0, `JSON.stringify(Object.assign({}, data, { rulesAcknowledged: true, playerName: 'T', lastReset: getLastResetThreshold(Date.now()) }))`));
  w0.close();

  // ---- перенос старого сохранения ----
  const old = Object.assign({}, base, { level: 34, dailyTargetLevel: 34, titlesUnlocked: ['Пробужденный', 'Торговец Врат'], activeTitle: 'Пробужденный',
    codexUnlocked: ['daily_quota', 'rank_d', 'penalty', 'rank_c', 'title_probuzhdenny', 'rank_b', 'chronicle'] });
  ['rank', 'tn', 'tnToday', 'tnAdj', 'tnMul', 'tnRegimeOverride', 'rankSysV'].forEach(k => delete old[k]);
  const stats = JSON.stringify({ pushups: 1234, squats: 600, pullups: 80, press: 250, steps: 12345 });
  let w = boot(JSON.stringify(old), stats); await sleep(200);
  let m = J(w, `{ rank: data.rank, tn: data.tn, v: data.rankSysV, t: data.titlesUnlocked, a: data.activeTitle, c: data.codexUnlocked, mul: data.tnMul, today: data.tnToday }`);
  check('R3 перенос: ранг снят, ТН = статистика ÷ нормы без множителя',
    m.rank === null && m.v === 1 && near(m.tn.pushups, 12.34) && near(m.tn.squats, 5) && near(m.tn.pullups, 2) && near(m.tn.press, 2.5) && near(m.tn.steps, 1.2345) && m.today === 0, JSON.stringify(m));
  check('R4 перенос: главы рангов и «Пробужденный» убраны, порядок остальных — прежний', JSON.stringify(m.c.slice(0, 3)) === JSON.stringify(['daily_quota', 'penalty', 'chronicle']) && !m.c.some(c => /^rank_|title_probuzhdenny/.test(c)), JSON.stringify(m.c));
  check('R5 перенос: «Пробужденный» снят, активным стал значимый оставшийся (Торговец Врат), «Новичок» не вернулся', JSON.stringify(m.t) === '["Торговец Врат"]' && m.a === 'Торговец Врат', JSON.stringify(m));
  check('R6 перенос уведомлений не показывает', E(w, 'notificationQueue.filter(q => /ранг|Пробужден|Кодекс/i.test(q.body)).length') === 0, J(w, 'notificationQueue.map(q => q.body)'));
  await sleep(2500);   // шкала опыта и уровень в шапке доезжают анимацией
  check('R7 шапка и Статус после переноса: «Без ранга», 34-й уровень', E(w, `document.getElementById('hdrRank').textContent`) === 'Без ранга' && E(w, `document.getElementById('stRank').textContent`) === 'Без ранга' && E(w, `document.getElementById('hdrLevel').textContent`) === '34');
  // повторная загрузка — перенос второй раз не выполняется
  E(w, `data.tn.pushups = 99; saveData()`);
  const saved = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
  w = boot(saved, stats); await sleep(200);
  check('R8 перенос — один раз (ТН не пересчитываются при следующей загрузке)', near(E(w, 'data.tn.pushups'), 99));
  w.close();
  // только «Пробужденный» → возвращается «Новичок»
  const old2 = Object.assign({}, old, { titlesUnlocked: ['Пробужденный'], activeTitle: 'Пробужденный' });
  w = boot(JSON.stringify(old2), stats); await sleep(200);
  check('R9 других титулов нет — «Новичок» вернулся и активен', JSON.stringify(J(w, 'data.titlesUnlocked')) === '["Новичок"]' && E(w, 'data.activeTitle') === 'Новичок');
  w.close();

  // ---- ТН ----
  w = boot(JSON.stringify(Object.assign({}, base, { level: 20, dailyTargetLevel: 20 }))); await sleep(200);
  const prep = `data.completed = {}; data.isGoalMet = false; data.activeScroll = null; data.pendingScroll = null; data.curseActiveToday = false; data.targetDiscountToday = false; data.targetDiscountRate = 0;
    data.stats.sta = 10; data.tn = { pushups: 0, squats: 0, pullups: 0, press: 0, steps: 0 }; data.tnToday = 0; data.tnMul = 1; data.paceControl = false; render();`;
  const clickN = (id, times) => { for (let i = 0; i < times; i++) E(w, `document.querySelector('.quest-item[data-id="${id}"] .add').click()`); };
  E(w, prep);
  const tgt = id => E(w, `getDynamicTarget(parseInt(document.querySelector('.quest-item[data-id="${id}"]').dataset.target), data.dailyTargetLevel, '${id}')`);
  const val = id => E(w, `parseInt(document.querySelector('.quest-item[data-id="${id}"] .add').dataset.value)`);
  E(w, `data.completed.pushups = 0`); clickN('pushups', 1);
  const v1 = val('pushups');
  check('R10 нажатие «+»: ТН = повторения ÷ 100 (отжимания), ТН сегодня — столько же', near(E(w, 'data.tn.pushups'), v1 / 100) && near(E(w, 'data.tnToday'), v1 / 100), `${E(w, 'data.tn.pushups')} ${v1}`);
  const norms = { squats: 120, pullups: 40, press: 100, steps: 10000 };
  const okN = Object.keys(norms).every(id => { E(w, `data.completed.${id} = 0`); const v = val(id); clickN(id, 1); return near(E(w, `data.tn.${id}`), v / norms[id]); });
  check('R11 нормы: приседания 120, подтягивания 40, пресс 100, бег 10000', okN, JSON.stringify(J(w, 'data.tn')));
  // Выносливость: в пределах цели × (цель без / цель с)
  E(w, prep + ` data.stats.sta = 410; render();`);
  const k = E(w, 'tnStaFactor()');
  check('R12 Выносливость 410: коэффициент 1/0,8 = 1,25', near(k, 1.25), k);
  E(w, `data.stats.sta = 410; data.targetDiscountToday = true; data.targetDiscountRate = 0.25; data.targetDiscountSourceId = 'rune_relief';`);
  const k2 = E(w, 'tnStaFactor()');
  check('R13 с руной облегчения 25%: (1 − 0,25) / (1 − 0,45) — руна не компенсируется', near(k2, 0.75 / 0.55), k2);
  E(w, `data.targetDiscountToday = false; data.activeScroll = 'renunciation'`);
  check('R14 под Отречением Выносливость не действует — коэффициент 1', E(w, 'tnStaFactor()') === 1);
  E(w, prep + ` data.stats.sta = 410;`);
  E(w, `tnAdd('pushups', 10, 95, 100)`);   // 5 в пределах цели, 5 сверх
  check('R15 в пределах цели — с компенсацией, сверх цели (Предел) — без: (5×1,25 + 5) / 100', near(E(w, 'data.tn.pushups'), (5 * 1.25 + 5) / 100), E(w, 'data.tn.pushups'));
  E(w, prep + ` data.tnMul = 1.25;`); E(w, `tnAdd('press', 100, 0, 1000)`);
  check('R16 цикл режима: ТН ×1,25', near(E(w, 'data.tn.press'), 1.25));
  // Предел: раунд — те же нажатия
  E(w, prep); E(w, `data.completed.pullups = 0`);
  const tp = tgt('pullups'); E(w, `data.completed.pullups = ${tp}`);
  const before = E(w, 'data.tn.pullups');
  E(w, `data.completed.pullups = 0`); clickN('pullups', 1);
  check('R17 повторения считаются при каждом засчитанном нажатии (раунд Предела — тот же обработчик)', E(w, 'data.tn.pullups') > before);
  // Длань ТН не добавляет повторениями; ТН не уменьшаются от игры
  E(w, prep);
  E(w, `data.completed.squats = 5; render(); document.querySelector('.quest-item[data-id="squats"] .add').click()`);
  const tsq = E(w, 'data.tn.squats');
  E(w, `data.completed.squats = 0; render()`);
  check('R18 ТН не уменьшаются, когда счётчик дня сброшен', E(w, 'data.tn.squats') === tsq && tsq > 0);

  // ---- режим ----
  const hist = (arr) => `(() => { data.history = {}; const t0 = data.lastReset; ${JSON.stringify(arr)}.forEach((st, i) => { data.history[dateKeyFromTimestamp(t0 - (i + 1) * 86400000)] = { status: st, donePercent: 100 }; }); })()`;
  E(w, hist(['success', 'success', 'veil', 'success', 'frozen', 'penalty', 'success', 'success', 'protected', 'success', 'success', 'success', 'success', 'success', 'success', 'penalty']));
  E(w, 'data.tnRegimeOverride = null');
  check('R19 режим: 14 рабочих дней (Пелена и Заморозка не входят), выполнено 11 → ×1,25', JSON.stringify(J(w, 'regimeCount()')) === '{"work":14,"done":11}' && E(w, 'regimeMulNow()') === 1.25, JSON.stringify(J(w, 'regimeCount()')));
  E(w, hist(['success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'penalty', 'penalty', 'protected', 'penalty', 'penalty', 'success', 'success']));
  check('R20 режим: 9 из 14 (день под руной защиты не засчитан) → ×1; дни старше окна не считаются', JSON.stringify(J(w, 'regimeCount()')) === '{"work":14,"done":9}' && E(w, 'regimeMulNow()') === 1);
  E(w, `data.history[dateKeyFromTimestamp(data.lastReset)] = { status: 'success' }`);
  check('R21 текущий цикл в окно не входит', E(w, 'regimeCount().done') === 9);
  // сброс дня: tnToday → 0, множитель нового цикла — по Летописи
  E(w, hist(['penalty', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success']));   // вчерашний — перезапишется выполненным
  E(w, `data.completed = {}; for (const id of TN_IDS) data.completed[id] = 999999; data.isGoalMet = true; data.tnToday = 3.3; data.tnMul = 1; data.lastReset -= 86400000; data.tnRegimeOverride = null; checkMissedDays()`);
  check('R22 сброс дня: ТН сегодня = 0, вчерашний выполненный день дал 10 из 10 рабочих → множитель ×1,25 на новый цикл', E(w, 'data.tnToday') === 0 && E(w, 'data.tnMul') === 1.25, `${E(w, 'data.tnToday')} ${E(w, 'data.tnMul')} ${JSON.stringify(J(w, 'regimeCount()'))}`);

  // ---- Длань ----
  E(w, `openSysTools ? 0 : 0`);
  E(w, `data.rank = null; data.tnAdj = 0; data.tn = { pushups: 10, squats: 5, pullups: 0, press: 3.6, steps: 0 }; data.level = 20; data.tnRegimeOverride = null; data.tnMul = 1;
        data.titlesUnlocked = ['Новичок']; data.activeTitle = 'Новичок'; data.codexUnlocked = ['daily_quota', 'penalty']; updateSysCurrent()`);
  const info = () => E(w, `document.getElementById('sysRankInfo').textContent`);
  check('R23 Длань: ранг «Без ранга», «−» и «Снять ранг» выключены', E(w, `document.getElementById('sysRankV').textContent`) === 'Без ранга' && E(w, `document.getElementById('sysRankM').disabled`) && E(w, `document.getElementById('sysRankClear').disabled`));
  check('R24 Длань: ТН всего, по упражнениям, сегодня, режим, порог, допуск, что держит', /ТН всего: 18,6/.test(info()) && /Отжимания: 10,0/.test(info()) && /Бег: 0,0/.test(info()) && /ТН сегодня:/.test(info())
    && /Рабочих дней выполнено: \d+ из 14 · множитель цикла ×1/.test(info()) && /До E: 25 ТН, набрано 18,6/.test(info()) && /Допуск: нет/.test(info()) && /E-Rank держит: ТН/.test(info()), info());
  E(w, `sysTnChange(10)`);
  check('R25 ТН +10 → 28,6, допуск до E', /ТН всего: 28,6/.test(info()) && /Допуск: до E-Rank/.test(info()) && /Поправка Длани: \+10,0/.test(info()), info());
  E(w, `sysTnChange(-10); sysTnChange(-10); sysTnChange(-10)`);
  check('R26 ТН −: не ниже 0', near(E(w, 'tnTotal()'), 0), E(w, 'tnTotal()'));
  E(w, `sysTnChange(100); sysTnChange(100); sysTnChange(100); sysTnChange(100); sysTnChange(100)`);
  check('R27 500 ТН на 20-м уровне: допуск до B-Rank', /Допуск: до B-Rank/.test(info()), info());
  E(w, `data.level = 15; updateSysCurrent()`);
  check('R28 500 ТН на 15-м уровне: допуск до C, «B» держит уровень', /Допуск: до C-Rank/.test(info()), info());
  E(w, `data.rank = 's'; data.level = 99; data.rankHoldDays = 45; sysTnChange(4000); updateSysCurrent()`);   // v7.6.1: выдержка в ранге выполнена
  check('R29 группа 3: из S — допуск только до National (прыжков нет)', /Допуск: до National Level/.test(info()), info());
  E(w, `data.rank = 'a'; updateSysCurrent()`);
  check('R30 из A при любых ТН — допуск до S, National держит предыдущий ранг', /Допуск: до S-Rank/.test(info()), info());
  E(w, `data.rank = 'national'; updateSysCurrent()`); const adN = J(w, 'rankAdmission()');
  check('R31 из National — только SSS', adN.top === 'sss', JSON.stringify(adN));
  E(w, `data.rank = 'b'; data.level = 25; data.tnAdj = 0; data.tn = { pushups: 0, squats: 0, pullups: 0, press: 0, steps: 0 }; sysTnChange(900); updateSysCurrent()`);
  check('R31a «держит»: S-Rank — ТН и уровень', /A-Rank держит: уровень \(нужен 30-й\)/.test(info()), info());
  // регим из Длани
  E(w, `sysRegimeSet('full')`);
  check('R32 «Заполнить 14 из 14»: 14 из 14, множитель цикла ×1,25 сразу', /Рабочих дней выполнено: 14 из 14 · множитель цикла ×1,25/.test(info()), info());
  E(w, `sysRegimeSet('empty')`);
  check('R33 «Обнулить»: 0 из 14, ×1', /Рабочих дней выполнено: 0 из 14 · множитель цикла ×1(?!,)/.test(info()), info());
  // ранг из Длани
  E(w, `data.rank = null; data.titlesUnlocked = ['Новичок']; data.activeTitle = 'Новичок'; data.codexUnlocked = ['daily_quota', 'penalty']; data.exp = 100; data.credits = 50; data.boxes = {}; notificationQueue.length = 0; sysRankStep(1)`);
  let st = J(w, `{ r: data.rank, c: data.codexUnlocked, t: data.titlesUnlocked, a: data.activeTitle, e: data.exp, cr: data.credits, b: data.boxes, q: notificationQueue.length, hdr: document.getElementById('hdrRank').textContent }`);
  check('R34 «+» в Длани: E-Rank, глава E, титул «Пробужденный» вместо «Новичка», без опыта, кредитов, шкатулок и уведомлений',
    st.r === 'e' && JSON.stringify(st.c) === '["daily_quota","penalty","rank_e","title_probuzhdenny"]' && JSON.stringify(st.t) === '["Пробужденный"]' && st.a === 'Пробужденный' && st.e === 100 && st.cr === 50 && JSON.stringify(st.b) === '{}' && st.q === 0 && st.hdr === 'E-Rank', JSON.stringify(st));
  E(w, `sysRankStep(1); sysRankStep(1); sysRankStep(1)`);
  st = J(w, `{ r: data.rank, c: data.codexUnlocked, top: document.getElementById('hdrTop').className, v: document.getElementById('sysRankV').className }`);
  check('R35 до B: главы E, D, C, B по порядку, шапка цвета B', st.r === 'b' && JSON.stringify(st.c.filter(c => /^rank_/.test(c))) === '["rank_e","rank_d","rank_c","rank_b"]' && st.top === 'sc-top rk-b' && /rk-b/.test(st.v), JSON.stringify(st));
  E(w, `sysRankStep(-1)`);
  check('R36 понижение до C — глава B убрана', E(w, 'data.rank') === 'c' && !J(w, 'data.codexUnlocked').includes('rank_b'));
  E(w, `data.codexUnlocked.push('limit_break'); sysRankStep(1)`);
  check('R37 глава, открытая заново, — в конце списка', J(w, 'data.codexUnlocked').slice(-1)[0] === 'rank_b', JSON.stringify(J(w, 'data.codexUnlocked')));
  E(w, `data.titlesUnlocked.push('Торговец Врат'); sysSetRank(null)`);
  st = J(w, `{ r: data.rank, c: data.codexUnlocked, t: data.titlesUnlocked, a: data.activeTitle, hdr: document.getElementById('hdrRank').textContent }`);
  check('R38 «Снять ранг»: без ранга, главы и «Пробужденный» убраны, активен оставшийся титул', st.r === null && !st.c.some(c => /^rank_|title_probuzhdenny/.test(c)) && JSON.stringify(st.t) === '["Торговец Врат"]' && st.a === 'Торговец Врат' && st.hdr === 'Без ранга', JSON.stringify(st));
  E(w, `sysSetRank('monarch')`);
  check('R39 до Shadow Monarch: «+» выключен, все 9 глав', E(w, `document.getElementById('sysRankP').disabled`) && J(w, 'data.codexUnlocked').filter(c => /^rank_/.test(c)).length === 9 && /Высший ранг подтверждён/.test(info()));
  check('R40 Кодекс: главы рангов без пропусков в нумерации', (() => { E(w, 'openCodex()'); const t = J(w, `[...document.querySelectorAll('.codex-chapter-title')].map(e => e.textContent)`); return t.every((x, i) => x.startsWith(`Глава ${i + 1}: `)) && t.some(x => /E-Ранг$/.test(x)); })());

  // ---- уровень больше ранг не меняет ----
  E(w, `sysSetRank(null); data.level = 9; data.exp = getExpToNext(9); notificationQueue.length = 0; checkLevelUp(); updateTitleStatus()`);
  check('R41 10-й уровень: ни ранга, ни «Пробужденного», ни главы', E(w, 'data.level') === 10 && E(w, 'data.rank') === null && !J(w, 'data.titlesUnlocked').includes('Пробужденный') && !J(w, 'data.codexUnlocked').some(c => /^rank_|title_probuzhdenny/.test(c)));

  // ---- бусина ----
  check('R42 бусина: каждый день до 49-го, каждый 2-й с 50-го', [1, 10, 49, 50, 80, 100, 150].map(l => E(w, `beadEvery(${l})`)).join(',') === '1,1,1,2,2,2,2');

  // ---- Реестр ----
  check('R43 карточка Реестра — без строки ранга', !/item-desc rank/.test(E(w, `leaderboardCard({ rank: 1, name: 'A', level: 55, bestStreak: 2 }, false)`)));

  // ---- тексты ----
  check('R44 описание «Пробужденного» и глава', E(w, `TITLES_DB['Пробужденный'].desc`) === 'Первый ранг подтверждён испытанием. Весь получаемый опыт увеличен на 3%.'
    && E(w, 'CODEX_CHAPTERS.title_probuzhdenny.content') === 'Титул нового рубежа: первый ранг подтверждён испытанием. Опыт, получаемый отныне, чуть весомее прежнего.');
  check('R45 главы рангов: девять, у D…Monarch «испытани…» (E — свой текст), SSS и Shadow Monarch — согласованные тексты',
    J(w, `Object.values(RANK_CODEX_MAP).map(k => CODEX_CHAPTERS[k] && CODEX_CHAPTERS[k].content)`).every((t, i) => t && (i === 0 || /испытани/i.test(t)))
    && E(w, 'CODEX_CHAPTERS.rank_sss.content') === 'Испытание завершено, и предел человеческих возможностей оставлен позади. Физическая сила, выносливость и воля Игрока достигли абсолютного пика в рамках существующего мира.'
    && E(w, 'CODEX_CHAPTERS.rank_monarch.content').endsWith('Статус Shadow Monarch.') && E(w, 'CODEX_CHAPTERS.rank_e.title') === 'E-Ранг');
  const texts = J(w, `[TITLES_DB['Пробужденный'].desc, CODEX_CHAPTERS.title_probuzhdenny.content, RANK_POPUP_LINES.e].concat(Object.values(RANK_CODEX_MAP).map(k => CODEX_CHAPTERS[k].content))`);
  check('R46 в новых текстах нет тире и «фиксир…»', texts.every(t => !/—|фиксир/i.test(t)), texts.filter(t => /—|фиксир/i.test(t)).join(' | '));

  // ---- бэкап ----
  E(w, `sysSetRank('d'); data.tn = { pushups: 1.5, squats: 2, pullups: 0, press: 0, steps: 0.25 }; data.tnToday = 0.7; data.tnAdj = -0.5; data.tnMul = 1.25; data.tnRegimeOverride = 'full'; saveData()`);
  const code = E(w, 'buildSignedBackupCode()');
  const back = J(w, `parseBackupText(${JSON.stringify(code)}).state`);
  check('R47 бэкап: ранг, ТН, сегодня, поправка, множитель, подмена, отметка переноса сохраняются',
    back.rank === 'd' && back.tn.pushups === 1.5 && back.tn.steps === 0.25 && back.tnToday === 0.7 && back.tnAdj === -0.5 && back.tnMul === 1.25 && back.tnRegimeOverride === 'full' && back.rankSysV === 1, JSON.stringify(back));
  const bad = J(w, `sanitizeImportedData({ state: Object.assign({}, data, { rank: 'zz', tn: { pushups: -5, squats: 'x' }, tnToday: -1, tnMul: 7, tnRegimeOverride: 'abc', rankSysV: 9 }), total: totalStats }).state`);
  check('R48 импорт: кривые поля — к безопасным значениям, без отметки переноса', bad.rank === null && bad.tn.pushups === 0 && bad.tn.squats === 0 && bad.tn.steps === 0 && bad.tnToday === 0 && bad.tnMul === 1 && bad.tnRegimeOverride === null && bad.rankSysV === 0, JSON.stringify(bad));
  w.close();
  // старый бэкап (без полей) проходит тот же перенос при загрузке
  const oldB = Object.assign({}, old);
  w = boot(JSON.stringify(oldB), stats); await sleep(200);
  const imp = J(w, `sanitizeImportedData({ state: ${JSON.stringify(oldB)}, total: ${stats} }).state`);
  check('R49 старый бэкап: без отметки переноса (перенос выполнится при загрузке)', imp.rankSysV === 0 && imp.rank === null);
  w.close();

  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
