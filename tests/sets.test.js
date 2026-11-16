// v7.7.0: подходы и бег по таймеру (настройка в Архиве, карточки, слой подходов и бега, остановки, сохранение, бэкап).
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
  const HIDE = "document.querySelectorAll('.status-overlay').forEach(o => o.style.display = 'none'); notificationQueue.length = 0; notificationActive = false;";
  const base = extra => `data.rulesAcknowledged = true; data.playerName = 'Тест'; data.level = 20; data.dailyTargetLevel = 20; data.completed = {}; data.exam = null; data.examPost = null; data.activeScroll = null; data.curseActiveToday = false; data.paceWindow = emptyPaceWindow(); ${extra || ''} saveData(); render(); ${HIDE}`;
  const mk = async extra => { const w = boot(); await sleep(250); E(w, base(extra)); return w; };
  const RUN = id => `data.setRun.${id}`;
  const at = (w, id, v) => { E(w, `(() => { const s = ${RUN(id)}; s.vB = ${v}; s.rB = Date.now(); setsTick(); sxDraw(); })()`); };   // виртуальное время фазы, сек
  const lay = w => J(w, `(() => { const g = i => document.getElementById(i); const t = x => x ? x.textContent : null; return { on: sxLayer.classList.contains('on'), ph: t(g('sxPh')), sub: t(g('sxSub')), cur: t(g('sxCur')), tt: g('sxT') ? g('sxT').dataset.t : null,
    inp: [...document.querySelectorAll('#sxLayer [data-add]')].map(b => !b.disabled), go: g('sxGo') ? !g('sxGo').disabled : null, again: g('sxAgain') ? !g('sxAgain').disabled : null, list: t(g('sxList')) }; })()`);
  const tgt = (w, id) => E(w, `sxTarget('${id}')`);

  // настройка
  {
    const w = await mk();
    const off = J(w, "({ btn: document.querySelectorAll('.sx-btn').length, cls: document.body.classList.contains('sx-on'), def: data.setTimer })");
    E(w, "openBackupModal()");
    const row0 = E(w, "document.getElementById('setTimerRow') && document.getElementById('setTimerRow').textContent.replace('✓', '').trim()");
    E(w, "toggleSetTimer()");
    const row1 = E(w, "document.getElementById('setTimerRow').textContent.replace('✓', '').trim()");
    const on = J(w, "({ btn: document.querySelectorAll('.sx-btn').length, cls: document.body.classList.contains('sx-on'), set: data.setTimer })");
    const order = E(w, "(() => { const r = document.getElementById('setTimerRow'); return (r.previousElementSibling && r.previousElementSibling.id === 'fzPopupRow') + '|' + r.nextElementSibling.classList.contains('theme-row'); })()");
    check('SX1 по умолчанию выключено: кнопок нет; строка Архива «Кнопка таймера упражнений: выключена.» после шкалы усталости, перед темой; включение — 5 кнопок, «…: включена.»',
      off.btn === 0 && !off.cls && off.def === false && row0 === 'Кнопка таймера упражнений: выключена.' && row1 === 'Кнопка таймера упражнений: включена.' && on.btn === 5 && on.cls && on.set === true && order === 'true|true', JSON.stringify({ off, row0, row1, on, order }));
    w.close();
  }

  // подходы: выбор, фазы, ввод
  {
    const w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-btn').click()");
    const setup = E(w, "document.querySelector('#sxLayer .setup').textContent.replace(/\\s+/g, ' ').trim()");
    const defs = J(w, "[...document.querySelectorAll('#sxLayer .chips button.on')].map(b => b.textContent)");
    E(w, "document.querySelector('[data-k=work][data-v=\"30\"]').click(); document.querySelector('[data-k=rest][data-v=\"180\"]').click()");
    const prefs = J(w, 'data.setPrefs.pushups');
    E(w, "document.getElementById('sxStart').click()");
    const r0 = lay(w), s0 = J(w, RUN('pushups'));
    check('SX2 выбор: тексты, по умолчанию 40 с и 4:00; выбор сохраняется (30 с, 3:00); старт — подготовка 10 с, ввод закрыт, «Подход 1: —»',
      setup === 'Подход:30 с40 сОтдых между подходами:3:003:304:004:305:00 Перед первым подходом — подготовка 10 с. Повторения вносятся во время отдыха после подхода. Начать подходы'
      && defs.join() === '40 с,4:00' && prefs.work === 30 && prefs.rest === 180 && s0.ph === 'prep' && s0.work === 30 && s0.rest === 180 && r0.ph === 'Подготовка' && r0.sub === 'Подход 1 через' && r0.cur === 'Подход 1: —' && r0.inp.every(x => !x), JSON.stringify({ setup, defs, prefs, s0, r0 }));
    E(w, "document.querySelector('.quest-item[data-id=pushups] .add[data-value=\"1\"]').click()");
    const pre = J(w, `({ c: data.completed.pushups, sets: ${RUN('pushups')}.sets })`);
    check('SX3 «+» на карточке в подготовке перед первым подходом — только в задание', pre.c === 1 && pre.sets.length === 0, JSON.stringify(pre));
    at(w, 'pushups', 11); const r1 = lay(w);
    E(w, "document.querySelector('.quest-item[data-id=pushups] .add[data-value=\"5\"]').click()");
    const work = J(w, `${RUN('pushups')}.sets`);
    check('SX4 подход 1: ввод в слое закрыт; «+» на карточке во время подхода — в подход', r1.ph === 'Подход 1' && r1.inp.every(x => !x) && work.join() === '5', JSON.stringify({ r1, work }));
    at(w, 'pushups', 41); const r2 = lay(w);
    E(w, "document.querySelector('#sxLayer [data-add=\"5\"]').click()");
    const r2b = lay(w);
    check('SX5 отдых: ввод открыт, внесённое из слоя — в подход 1, «Подход 1: 10»; «Начать подход 2» до 30 с отдыха неактивна', r2.ph === 'Отдых' && r2.sub === 'Подготовка — за 10 с до подхода' && r2.inp.every(x => x) && r2b.cur === 'Подход 1: 10' && r2.go === false, JSON.stringify({ r2, r2b }));
    at(w, 'pushups', 10 + 30 + 175); const r3 = lay(w);
    check('SX6 последние 10 с отдыха — «Подготовка», «Подход 2 через», ввод открыт', r3.ph === 'Подготовка' && r3.sub === 'Подход 2 через' && r3.inp.every(x => x) && r3.tt === '0:05', JSON.stringify(r3));
    at(w, 'pushups', 10 + 30 + 180 + 1); const r4 = lay(w);
    check('SX7 после отдыха — сразу «Подход 2»', r4.ph === 'Подход 2' && J(w, `${RUN('pushups')}.sets`).join() === '10,0', JSON.stringify(r4));
    at(w, 'pushups', 10 + 30 + 180 + 30 + 40);
    const g0 = lay(w);
    E(w, "document.querySelector('#sxLayer [data-add=\"10\"]').click()");
    const g1 = lay(w);
    E(w, "document.getElementById('sxGo').click()");
    const g2 = lay(w);
    check('SX8 «Начать подход 3»: после 30 с отдыха и внесённых повторений — доступна, отдых сокращается до 10 с подготовки', g0.go === false && g1.go === true && g2.ph === 'Подготовка' && g2.tt === '0:10' && g2.inp.every(x => x) && g2.go === false, JSON.stringify({ g0, g1, g2 }));
    E(w, "sxCloseView(); setsCards()");
    const sum = E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-sum').textContent");
    const live = J(w, "(() => { const b = document.querySelector('.quest-item[data-id=pushups] .sx-btn'); return { live: b.classList.contains('live'), tm: b.querySelector('.tm').dataset.t }; })()");
    check('SX9 карточка: «Подходы: 10 · 10», на кнопке — время до подхода', sum === 'Подходы: 10 · 10' && live.live && live.tm === '0:10', JSON.stringify({ sum, live }));
    // норма
    E(w, `data.completed.pushups = sxTarget('pushups') - 5; saveData(); render();`);
    E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-btn').click()");
    at(w, 'pushups', 10 + 30 + 180 + 30 + 40 + 11);   // подход 3
    at(w, 'pushups', 10 + 30 + 180 + 30 + 40 + 10 + 31);   // отдых
    E(w, "document.querySelector('#sxLayer [data-add=\"5\"]').click(); setsTick()");
    const fin = J(w, `({ fin: ${RUN('pushups')}.fin, on: sxLayer.classList.contains('on'), dis: document.querySelector('.quest-item[data-id=pushups] .sx-btn').disabled, done: data.completed.pushups >= sxTarget('pushups') })`);
    check('SX10 норма набрана — отсчёт прекращается, слой закрывается, кнопка на карточке неактивна', fin.fin && !fin.on && fin.dis && fin.done, JSON.stringify(fin));
    w.close();
  }

  // бег
  {
    const w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=steps] .sx-btn').click()");
    const setup = E(w, "document.querySelector('#sxLayer .setup').textContent.replace(/\\s+/g, ' ').trim()");
    E(w, "document.querySelector('[data-k=lim][data-v=\"20\"]').click(); document.getElementById('sxStart').click()");
    const p0 = lay(w);
    at(w, 'steps', 15); const r1 = lay(w);
    E(w, "document.querySelector('#sxLayer [data-add=\"1000\"]').click()");
    const r1b = lay(w);
    at(w, 'steps', 10 + 1200 + 5); const r2 = lay(w);
    at(w, 'steps', 10 + 1200 + 601); const r3 = lay(w);
    E(w, "document.querySelector('#sxLayer [data-add=\"500\"]').click()");
    const r3b = lay(w);
    check('SX11 бег: выбор («Время бега:», текст), подготовка — ввод закрыт; бег — «Время бега — 20 мин», ввод открыт; «Завершение» / «Внесите шаги»; «Бег окончен» — ввод открыт, «Бежать ещё» доступна, «Шаги за пробежку: 1500»',
      setup === 'Время бега:10 мин20 мин30 мин40 мин60 мин Перед бегом — подготовка 10 с. Шаги можно вносить во время бега и после. Начать бег'
      && p0.ph === 'Подготовка' && p0.inp.every(x => !x) && r1.ph === 'Бег' && r1.sub === 'Время бега — 20 мин' && r1.inp.every(x => x) && r1b.cur === 'Шаги за пробежку: 1000'
      && r2.ph === 'Завершение' && r2.sub === 'Внесите шаги' && r3.ph === 'Бег окончен' && r3.inp.every(x => x) && r3.again === true && r3b.cur === 'Шаги за пробежку: 1500', JSON.stringify({ setup, p0, r1, r1b, r2, r3, r3b }));
    E(w, "document.getElementById('sxAgain').click()");
    const ag = J(w, "({ setup: !!document.querySelector('#sxLayer .setup'), sel: document.querySelector('[data-k=lim].on').dataset.v, day: data.completed.steps })");
    check('SX12 «Бежать ещё» — к выбору, прежнее время (20 мин) выбрано, шаги дня сохранены', ag.setup && ag.sel === '20' && ag.day === 1500, JSON.stringify(ag));
    E(w, "document.getElementById('sxStart').click()"); at(w, 'steps', 15);
    E(w, `data.completed.steps = sxTarget('steps') - 100; saveData(); render(); sxDraw();`);
    E(w, "document.querySelector('#sxLayer [data-add=\"100\"]').click(); setsTick()");
    const fin = J(w, `({ fin: ${RUN('steps')}.fin, on: sxLayer.classList.contains('on') })`);
    check('SX13 бег: норма набрана — слой закрывается', fin.fin && !fin.on, JSON.stringify(fin));
    w.close();
  }

  // пауза, перезапуск
  {
    const w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=squats] .sx-btn').click(); document.getElementById('sxStart').click()");
    at(w, 'squats', 60);   // отдых, 10 с от начала
    E(w, "document.getElementById('sxPause').click()");
    const v1 = E(w, `sxVt(${RUN('squats')})`); await sleep(600); const v2 = E(w, `sxVt(${RUN('squats')})`);
    const pz = lay(w);
    E(w, "document.getElementById('sxPause').click()");
    check('SX14 пауза: время стоит, «Пауза», кнопка «Продолжить»', Math.abs(v2 - v1) < 1e-6 && pz.ph === 'Пауза' && E(w, "document.getElementById('sxPause').textContent") === 'Пауза', JSON.stringify({ v1, v2, pz }));
    E(w, `(() => { const s = ${RUN('squats')}; s.vB = sxVt(s); s.rB = Date.now() - 400 * 1000; saveData(); })()`);   // Система была закрыта 400 с
    const seed = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
    const w2 = boot(seed); await sleep(400);
    const st = J(w2, `({ ph: ${RUN('squats')}.ph, n: ${RUN('squats')}.n, live: document.querySelector('.quest-item[data-id=squats] .sx-btn').classList.contains('live') })`);
    check('SX15 перезапуск через 400 с: отсчёт по часам продолжается (отдых после подхода 2 при отдыхе 4:00), кнопка на карточке показывает отсчёт', st.ph === 'rest' && st.n === 2 && st.live, JSON.stringify(st));
    w2.close();
  }

  // остановки
  {
    const R = {};
    let w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=press] .sx-btn').click(); document.getElementById('sxStart').click()"); at(w, 'press', 11);
    E(w, "document.querySelector('.quest-item[data-id=press] .add[data-value=\"10\"]').click()");
    E(w, "toggleSetTimer()");
    R.off = J(w, `({ fin: ${RUN('press')}.fin, sets: ${RUN('press')}.sets, on: sxLayer.classList.contains('on'), btn: document.querySelectorAll('.sx-btn').length })`);
    E(w, "toggleSetTimer()");
    E(w, "forceFullResetAction()"); E(w, HIDE);
    R.reset = J(w, "({ run: Object.keys(data.setRun).length, prefs: !!data.setPrefs })");
    w.close();
    w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=press] .sx-btn').click(); document.getElementById('sxStart').click()");
    E(w, "data.exam = null; data.examPost = null; data.examLastOffer = null; examDeadlineTs = () => Date.now() + 8 * 3600000; examOffer(true); examAccept(); examStart();");
    R.exam = J(w, `({ fin: ${RUN('press')}.fin, hidden: [...document.querySelectorAll('.sx-btn')].every(b => b.style.display === 'none') })`);
    w.close();
    w = await mk('data.setTimer = true;');
    E(w, "document.querySelector('.quest-item[data-id=press] .sx-btn').click(); document.getElementById('sxStart').click()");
    E(w, "data.consumables = { scroll_transfer: 1 }; showExerciseChoice = (ids, cb) => cb('press'); performUseItem('scroll_transfer')"); await sleep(300);
    R.transfer = J(w, `({ fin: ${RUN('press')}.fin, scroll: data.activeScroll, tid: data.transferExerciseId })`);
    w.close();
    w = await mk("data.setTimer = true; data.activeScroll = 'freeze';");
    R.freeze = J(w, "[...document.querySelectorAll('.sx-btn')].every(b => b.style.display === 'none')");
    w.close();
    w = await mk("data.setTimer = true; data.activeScroll = 'veil'; data.veilLifted = false;");
    R.veil = J(w, "[...document.querySelectorAll('.sx-btn')].every(b => b.style.display === 'none')");
    w.close();
    check('SX16 выключение настройки во время отсчёта — отсчёт остановлен, подходы дня остаются, кнопок нет', R.off.fin && R.off.sets.join() === '10' && !R.off.on && R.off.btn === 0, JSON.stringify(R.off));
    check('SX17 сброс дня — отсчёты и подходы обнулены, выбор времени остаётся', R.reset.run === 0 && R.reset.prefs, JSON.stringify(R.reset));
    check('SX18 старт испытания ранга — отсчёт остановлен, кнопок на экране нет', R.exam.fin && R.exam.hidden, JSON.stringify(R.exam));
    check('SX19 Свиток Переноса — отсчёт снятого упражнения остановлен', R.transfer.fin && R.transfer.scroll === 'transfer' && R.transfer.tid === 'press', JSON.stringify(R.transfer));
    check('SX20 Заморозка и Пелена покоя — кнопок нет', R.freeze && R.veil, JSON.stringify(R));
  }

  // Предел, темп, цвета
  {
    let w = await mk('data.setTimer = true; data.level = 5; data.limitBreaksToday = 0;');
    E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-btn').click(); document.getElementById('sxStart').click()"); at(w, 'pushups', 11);
    E(w, "document.querySelector('.quest-item[data-id=pushups] .add[data-value=\"10\"]').click()");
    E(w, "['pushups','squats','pullups','press','steps'].forEach(id => data.completed[id] = sxTarget(id)); data.isGoalMet = true; saveData(); render();");
    E(w, "showConfirm = (m, fn) => fn(); document.getElementById('limitBreakBtn').onclick()");
    const lim = J(w, "({ run: Object.keys(data.setRun).length, sum: document.querySelector('.quest-item[data-id=pushups] .sx-sum').textContent, c: data.completed.pushups || 0 })");
    check('SX21 раунд Предела — отсчёты остановлены, строка подходов для раунда начинается заново', lim.run === 0 && lim.sum === '' && lim.c === 0, JSON.stringify(lim));
    w.close();
    w = await mk('data.setTimer = true; data.paceControl = true;');
    E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-btn').click(); document.getElementById('sxStart').click()"); at(w, 'pushups', 51);
    E(w, "data.completed.pushups = 1; data.paceWindow.start = Date.now(); data.paceWindow.used = 1.95; saveData();");
    E(w, "document.querySelector('.quest-item[data-id=pushups] .add[data-value=\"1\"]').click()");   // подход 1 — 1 повторение (для ввода в слое)
    E(w, "data.paceWindow.used = 1.99; document.querySelector('#sxLayer [data-add=\"10\"]').click(); sxDraw()");
    const pace = J(w, "({ hot: [...document.querySelectorAll('#sxLayer [data-add]')].every(b => b.classList.contains('pace-hot')), card: [...document.querySelectorAll('.quest-item[data-id=pushups] .add')].every(b => b.classList.contains('pace-hot')), c: data.completed.pushups })");
    check('SX22 «перегрев» контроля темпа — кнопки «+» оранжевые и в слое, и на карточке; внесение не засчитано', pace.hot && pace.card && pace.c === 2, JSON.stringify(pace));
    E(w, "data.curseActiveToday = true; data.activeScroll = 'contract'; saveData(); render(); sxDraw()");
    const tint = J(w, "({ red: document.body.classList.contains('sx-red'), num: document.getElementById('sxP').className, card: document.querySelector('.quest-item[data-id=pushups] .counter').className })");
    E(w, "data.curseActiveToday = false; saveData(); render(); sxDraw()");
    const tint2 = J(w, "({ red: document.body.classList.contains('sx-red'), num: document.getElementById('sxP').className })");
    check('SX23 число нормы в слое окрашено как на карточке (Бремя + свиток — cursed-scroll; свиток — scroll-tinted); под Бременем слой и кнопки красные', tint.red && /cursed-scroll/.test(tint.num) && /cursed-scroll/.test(tint.card) && !tint2.red && /scroll-tinted/.test(tint2.num), JSON.stringify({ tint, tint2 }));
    w.close();
  }

  // бэкап, старое сохранение
  {
    let w = await mk("data.setTimer = true; data.setPrefs = { pushups: { work: 30, rest: 300 }, steps: { lim: 60 } };");
    E(w, "document.querySelector('.quest-item[data-id=press] .sx-btn').click(); document.getElementById('sxStart').click()");
    const code = E(w, "buildSignedBackupCode()");
    const imp = J(w, `(() => { const r = parseBackupText(${JSON.stringify('')} + ${'`'}${'$'}{buildSignedBackupCode()}${'`'}); const c = sanitizeImportedData(r); return { t: c.state.setTimer, p: c.state.setPrefs, r: c.state.setRun }; })()`);
    check('SX24 бэкап: настройка и выбор времени переносятся, отсчёты — нет', imp.t === true && imp.p.pushups.work === 30 && imp.p.pushups.rest === 300 && imp.p.steps.lim === 60 && JSON.stringify(imp.r) === '{}', JSON.stringify(imp));
    E(w, "(() => { const d = JSON.parse(localStorage.getItem('sl_daily_v5_5_0')); delete d.setTimer; delete d.setPrefs; delete d.setRun; localStorage.setItem('sl_daily_v5_5_0', JSON.stringify(d)); })()");
    const seed = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
    const w2 = boot(seed); await sleep(300);
    const old = J(w2, "({ t: data.setTimer, p: data.setPrefs, r: data.setRun })");
    E(w2, "data.setRun = { pushups: { m: 'run', ph: 'zzz' }, steps: { m: 'run', ph: 'run', t0: 0, vB: 5, rB: 1, sets: ['x', 3] } }; data.setPrefs = { pushups: { work: 33, rest: 240 } }; saveData();");
    const seed2 = w2.localStorage.getItem('sl_daily_v5_5_0'); w2.close();
    const w3 = boot(seed2); await sleep(300);
    const bad = J(w3, "({ r: Object.keys(data.setRun), steps: data.setRun.steps && data.setRun.steps.sets, p: data.setPrefs })");
    check('SX25 сохранение без новых полей — по умолчанию (выключено, пусто); кривые записи отбрасываются при загрузке', old.t === false && JSON.stringify(old.p) === '{}' && JSON.stringify(old.r) === '{}' && bad.r.join() === 'steps' && bad.steps.join() === '3' && JSON.stringify(bad.p) === '{"pushups":{"rest":240}}', JSON.stringify({ old, bad }));
    w3.close();
  }


  // v7.7.2: шкала усталости на слое таймера — как на главном экране (4 с после внесения, с 70 — постоянно)
  {
    const w = await mk('data.setTimer = true; data.fatigueOn = true; data.fzPopup = true; data.fatigue = emptyFatigue(); data.paceControl = false;');
    const bar = () => J(w, "(() => { fzDraw(false); return { on: fzBar.classList.contains('on'), ex: fzBar.classList.contains('fz-ex') }; })()");
    E(w, "data.fatigue.fast = 19; data.fatigue.t = Date.now(); fzPopUntil = 0;");
    E(w, "document.querySelector('.quest-item[data-id=pushups] .sx-btn').click(); document.getElementById('sxStart').click()");
    const idle19 = bar();
    E(w, "(() => { const s = data.setRun.pushups; s.vB = 55; s.rB = Date.now(); setsTick(); sxDraw(); })()");
    E(w, "document.querySelector('#sxLayer [data-add=\"5\"]').click()");
    const added = bar(), popSet = E(w, "fzPopUntil > Date.now() && fzPopUntil <= Date.now() + FZ.popMs");
    E(w, "fzPopUntil = Date.now() - 1;");
    const after4 = bar();
    E(w, "data.fatigue.fast = 75; data.fatigue.slow = 0; data.fatigue.t = Date.now();");
    const high = bar();
    E(w, "data.fatigue = emptyFatigue(); data.fatigue.fast = 19; data.fatigue.t = Date.now(); sxCloseView(); document.querySelector('.quest-item[data-id=steps] .sx-btn').click(); document.getElementById('sxStart').click();");
    E(w, "(() => { const s = data.setRun.steps; s.vB = 30; s.rB = Date.now(); setsTick(); [...document.querySelectorAll('#sxLayer button')].find(x => /Карманный/.test(x.textContent)).click(); })()");
    const pk19 = bar();
    E(w, "fzPopUntil = Date.now() + FZ.popMs;");
    const pkPop = bar();
    E(w, "sxPocket(false); sxCloseView(); fzPopUntil = 0;");
    const main19 = bar();
    E(w, "fzPopUntil = Date.now() + FZ.popMs;");
    const mainPop = bar();
    check('SX26 v7.7.2: шкала на слое таймера и в карманном режиме — как на главном экране: 19 без внесения — нет; внесение в слое — видна 4 с поверх слоя, затем гаснет; 75 — видна; главный экран — то же правило',
      !idle19.on && idle19.ex && added.on && added.ex && popSet && !after4.on && high.on && !pk19.on && pkPop.on && pkPop.ex && !main19.on && !main19.ex && mainPop.on && !mainPop.ex,
      JSON.stringify({ idle19, added, popSet, after4, high, pk19, pkPop, main19, mainPop }));
    w.close();
  }

  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
