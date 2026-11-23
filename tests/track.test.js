// v8.0.0: бег по треку (демо 124–124i) — карточка бега (расстояние / шаги, ⇄, одна кнопка режима, флажок),
// запреты во время трека, остановка при сбросе дня / Переносе / Перерождении, поля данных и бэкап, Длань, попутные правки.
// Поле трека и карман (холст, сигнал, компас) jsdom не рисует — их проверяют снимки в Chromium.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
const html = fs.readFileSync(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'index.html'), 'utf-8');

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('OK   ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail !== undefined ? '  → ' + detail : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(seed, pre) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    virtualConsole: new (require('jsdom').VirtualConsole)(),
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'uuid-test';
      w.scrollTo = () => {};
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      if (seed) w.localStorage.setItem('sl_daily_v5_5_0', seed);
      if (pre) pre(w);
    }
  });
  const w = dom.window;
  if (process.env.SL_THEME !== 'system' && !process.argv.includes('--system')) w.eval("setTheme('classic')");
  return w;
}
const E = (w, c) => w.eval(c);
const J = (w, c) => JSON.parse(E(w, `JSON.stringify(${c})`));
const HIDE = "document.querySelectorAll('.status-overlay').forEach(o => o.style.display = 'none'); notificationQueue.length = 0; notificationActive = false;";
const TOP = `data.rulesAcknowledged = true; data.playerName = 'Dim'; data.dailyNotices.morning = true; data.paceControl = false; data.fatigueOn = false; data.setTimer = true;
  data.level = 20; data.exp = 0; data.dailyTargetLevel = 20; data.completed = {}; data.isGoalMet = false; data.dailyNotices.complete = false;
  saveData(); render(); ${HIDE} window.__N = []; const __sn = showNotice; showNotice = function (t) { window.__N.push(t); return __sn.apply(this, arguments); };`;
const mk = async (extra, seed, pre) => { const w = boot(seed, pre); await sleep(250); E(w, TOP + (extra || '')); await sleep(30); E(w, HIDE); return w; };
const Q = (w, s) => w.document.querySelector(s);
const STEPS = '.quest-item[data-id="steps"]';
const LOCK = 'Идёт бег в режиме трека. Другие упражнения и ввод данных недоступны до завершения бега.';
const TMR = 'Идёт отсчёт таймера. Режим трека недоступен до его окончания.';
// точки «бега»: по прямой на север, шаг 3 м, раз в секунду, точность 5 м
const runPts = (w, n, from) => E(w, `(() => { const t0 = Date.now(); for (let i = 0; i < ${n}; i++) Track._t.fix(55.75 + (${from || 0} + i) * 3 / 111132, 37.6, 5, t0 + i * 1000); })()`);

(async () => {
  // ---- поля данных ----
  { const w = await mk();
    check('TR1 новый Игрок: бег — расстояние, фон чёрный, вид 3D', E(w, "data.runUnit") === 'km' && E(w, "data.trackBg") === 'black' && E(w, "data.trackView") === '3d');
    check('TR2 версия 8.1.1 (APP_VERSION и заголовок)', E(w, 'APP_VERSION') === '8.1.1' && /v8\.1\.1/.test(w.document.title));
    check('TR3 модуль трека подключён', E(w, "!!(window.Track && Track.ready)"));
    const raw = JSON.parse(E(w, "localStorage.getItem('sl_daily_v5_5_0')"));
    delete raw.runUnit; delete raw.trackBg; delete raw.trackView;
    const w2 = boot(JSON.stringify(raw)); await sleep(250);
    check('TR4 старое сохранение без полей: расстояние, чёрный, 3D', E(w2, "data.runUnit") === 'km' && E(w2, "data.trackBg") === 'black' && E(w2, "data.trackView") === '3d');
    raw.setRun = { steps: { m: 'run', ph: 'run', t0: 0, vB: 5, rB: Date.now(), p: false, cut: 0, n: 0, base: 0, sets: [], ran: 0, work: 40, rest: 180, lim: 30, fin: false } };
    const w3 = boot(JSON.stringify(raw)); await sleep(250);
    check('TR5 старое сохранение с идущим таймером бега — режим шагов (кнопка таймера не прячется)', E(w3, "data.runUnit") === 'steps');
    raw.runUnit = 'xx'; raw.trackBg = 7; raw.trackView = null; delete raw.setRun;
    const w4 = boot(JSON.stringify(raw)); await sleep(250);
    check('TR6 кривые значения — к значениям по умолчанию', E(w4, "data.runUnit") === 'km' && E(w4, "data.trackBg") === 'black' && E(w4, "data.trackView") === '3d');
    const s = E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign(JSON.parse(JSON.stringify(data)), { runUnit: 'steps', trackBg: 'vec', trackView: 'head' }), total: {} }).state)`);
    const s2 = E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign(JSON.parse(JSON.stringify(data)), { runUnit: 1, trackBg: 'osm', trackView: 'x' }), total: {} }).state)`);
    check('TR7 бэкап: поля сохраняются; кривые — по умолчанию', /"runUnit":"steps"/.test(s) && /"trackBg":"vec"/.test(s) && /"trackView":"head"/.test(s)
      && /"runUnit":"km"/.test(s2) && /"trackBg":"black"/.test(s2) && /"trackView":"3d"/.test(s2));
  }
  // ---- цель и карточка ----
  { const w = await mk();
    const ok = [1, 5, 10, 20, 50, 100].every(l => E(w, `getDynamicTarget(10000, ${l}, 'steps') % 110 === 0`));
    check('TR8 цель бега кратна 0,1 км (110 шагам) на любом уровне', ok, [1, 5, 10, 20, 50, 100].map(l => E(w, `getDynamicTarget(10000, ${l}, 'steps')`)).join(', '));
    check('TR9 другие упражнения не округляются', E(w, "getDynamicTarget(100, 20, 'pushups')") === E(w, "Math.floor(100 * getTargetGrowthMultiplier(20))"));
    const T = E(w, "getDynamicTarget(10000, data.dailyTargetLevel, 'steps')");
    const name = () => Q(w, STEPS + ' .quest-name').firstChild.textContent;
    check('TR10 «Бег»: число в км, цель «/ N км» и ⇄', name() === 'Бег' && Q(w, STEPS + ' .counter').textContent === '0,0'
      && Q(w, STEPS + ' .target').firstChild.textContent === '/ ' + (Math.floor(T / 110) / 10).toFixed(1).replace('.', ',') + ' км' && !!Q(w, STEPS + ' .target .run-sw'));
    const bv = [...w.document.querySelectorAll(STEPS + ' .buttons .add')].map(b => b.textContent + '=' + b.dataset.value).join(' ');
    check('TR11 кнопки «+100 м / +500 м / +1 км» = 110 / 550 / 1100 шагов', bv === '+100 м=110 +500 м=550 +1 км=1100', bv);
    const vis = sel => { const b = Q(w, STEPS + ' ' + sel); return !!b && b.style.display !== 'none'; };
    check('TR12 в режиме расстояния — одна кнопка: трек (таймера бега нет)', vis('.gp-btn') && !vis('.sx-btn') && vis !== null);
    check('TR13 у других упражнений таймер на месте', !!Q(w, '.quest-item[data-id="pushups"] .sx-btn') && Q(w, '.quest-item[data-id="pushups"] .sx-btn').style.display !== 'none');
    Q(w, STEPS + ' .buttons .add').click();
    check('TR14 «+100 м» засчитывает 110 шагов', E(w, "data.completed.steps") === 110 && Q(w, STEPS + ' .counter').textContent === '0,1');
    Q(w, STEPS + ' .counter').click();
    const bv2 = [...w.document.querySelectorAll(STEPS + ' .buttons .add')].map(b => b.textContent + '=' + b.dataset.value).join(' ');
    check('TR15 касание счётчика → «Бег (шаги)»: шаги, кнопки +100 / +500 / +1000, ⇄', E(w, "data.runUnit") === 'steps' && name() === 'Бег (шаги)'
      && Q(w, STEPS + ' .counter').textContent === '110' && Q(w, STEPS + ' .target').firstChild.textContent === '/ ' + T && !!Q(w, STEPS + ' .target .run-sw') && bv2 === '+100=100 +500=500 +1000=1000', bv2);
    check('TR16 в режиме шагов — одна кнопка: таймер (трека нет)', !vis('.gp-btn') && vis('.sx-btn'));
    check('TR17 выбор сохраняется в данных', JSON.parse(E(w, "localStorage.getItem('sl_daily_v5_5_0')")).runUnit === 'steps');
    Q(w, STEPS + ' .target').click();
    check('TR18 касание цели — обратно «Бег»', E(w, "data.runUnit") === 'km' && name() === 'Бег');
    check('TR19 кнопки трека и таймера — в шестиграннике', !!Q(w, STEPS + ' .gp-btn .hx') && !!Q(w, '.quest-item[data-id="pushups"] .sx-btn .hx'));
  }
  // ---- идёт таймер бега: переключение недоступно ----
  { const w = await mk("data.runUnit = 'steps'; render();");
    E(w, `data.setRun.steps = { m: 'run', ph: 'run', t0: 0, vB: 5, rB: sxNow(), p: false, cut: 0, n: 0, base: 0, sets: [], ran: 0, work: 40, rest: 180, lim: 30, fin: false }; render();`);
    Q(w, STEPS + ' .counter').click();
    check('TR20 идёт таймер бега — касание счётчика не переключает, уведомление', E(w, "data.runUnit") === 'steps' && J(w, 'window.__N').includes(TMR), J(w, 'window.__N'));
  }
  // ---- идёт таймер другого упражнения: трек не начать ----
  { const w = await mk();
    E(w, `data.setRun.pushups = { m: 'sets', ph: 'work', t0: 0, vB: 5, rB: sxNow(), p: false, cut: 0, n: 0, base: 0, sets: [0], ran: 0, work: 40, rest: 180, lim: 30, fin: false }; render();`);
    const b = Q(w, STEPS + ' .gp-btn');
    check('TR21 идёт таймер — кнопка трека неактивна', b.classList.contains('gp-dis'));
    b.click();
    check('TR22 нажатие — уведомление, слой не открылся', J(w, 'window.__N').includes(TMR) && !E(w, "Track.covers()"), J(w, 'window.__N'));
    E(w, "setsStopAll(true); render();");
    check('TR23 таймер остановлен — кнопка снова активна', !Q(w, STEPS + ' .gp-btn').classList.contains('gp-dis'));
  }
  // ---- трек: зачёт и запреты ----
  { const w = await mk("Track.simSet(false);");
    E(w, "Track._t.start(); render();");
    check('TR24 старт: бег идёт, уведомление «Трек запущен…»', E(w, "Track.live()") && J(w, 'window.__N').includes('Трек запущен. Расстояние засчитывается Системой.'));
    check('TR25 во время трека: «+» и таймеры выглядят неактивными (body.gp-busy)', w.document.body.classList.contains('gp-busy'));
    const pu = E(w, "data.completed.pushups || 0");
    E(w, "window.__N = []");
    Q(w, '.quest-item[data-id="pushups"] .add').click();
    Q(w, '.quest-item[data-id="squats"] .sx-btn').click();
    Q(w, STEPS + ' .counter').click();
    Q(w, STEPS + ' .add').click();
    check('TR26 «+» других упражнений не засчитан', E(w, "data.completed.pushups || 0") === pu);
    check('TR27 таймер не открылся, единицы не переключились, ручной ввод бега не засчитан', !E(w, "sxView") && E(w, "data.runUnit") === 'km' && (E(w, "data.completed.steps || 0") === 0));
    check('TR28 уведомление о запрете — одно на серию нажатий', J(w, 'window.__N').filter(t => t === LOCK).length === 1, J(w, 'window.__N'));
    runPts(w, 60);
    const st = E(w, "data.completed.steps || 0");
    check('TR29 трек засчитывает шаги порциями от 100 (тем же путём, что «+»)', st >= 100 && E(w, "totalStats.steps") >= st, st);
    check('TR30 шаги — по 0,9 м: 1 км = 1100 шагов', Math.abs(E(w, "Track._t.run().sf") / E(w, "Track._t.run().m") - 1.1) < 1e-6);
    check('TR31 трек хранится отдельно (sl_track_v8_0_0), не в данных Игрока', !!E(w, "localStorage.getItem('sl_track_v8_0_0')") && !/"runs"/.test(E(w, "localStorage.getItem('sl_daily_v5_5_0')")));
    E(w, "Track._t.pause(true)");
    E(w, "window.__N = []"); await sleep(4100);
    Q(w, '.quest-item[data-id="pushups"] .add').click();
    check('TR32 пауза — запреты остаются', E(w, "data.completed.pushups || 0") === pu && J(w, 'window.__N').includes(LOCK));
    E(w, "Track._t.finish(false); render();");
    Q(w, '.quest-item[data-id="pushups"] .add').click();
    check('TR33 «Завершить» — запреты сняты', E(w, "data.completed.pushups || 0") > pu && !w.document.body.classList.contains('gp-busy'));
  }
  // ---- цель достигнута: флажок ----
  { const w = await mk();
    E(w, "data.completed.steps = getDynamicTarget(10000, data.dailyTargetLevel, 'steps') - 110; render();");
    Q(w, STEPS + ' .add').click();
    const b = Q(w, STEPS + ' .gp-btn');
    check('TR34 задание по бегу выполнено — флажок, контур замкнут, кнопка доступна', b.classList.contains('fin') && b.dataset.ic === 'flag' && !b.disabled && b.querySelector('.hx .p').getAttribute('stroke-dashoffset') === '0');
    check('TR35 таймер бега недоступен (правило таймера)', E(w, "data.runUnit = 'steps'; render(); document.querySelector('" + STEPS + " .sx-btn').disabled") === true);
    E(w, "data.runUnit = 'km'; render();");
    E(w, "window.__N = []; Track._t.open(); document.getElementById('gpGo') ? document.getElementById('gpGo').click() : 0;");
    check('TR36 после выполнения новый трек не начинается: «Задание по бегу уже выполнено.», итог — без «Новый трек»', !E(w, "Track.live()") && J(w, 'window.__N').includes('Задание по бегу уже выполнено.') && !Q(w, '#gpNew'), J(w, 'window.__N'));
  }
  // ---- остановки ----
  { const w = await mk();
    E(w, "Track._t.start()"); runPts(w, 10);
    E(w, "data.lastReset = data.lastReset - 86400000; checkMissedDays();"); await sleep(50);
    check('TR37 новый цикл — бег остановлен, треки стёрты', !E(w, "Track.live()") && E(w, "Track._t.G().runs.length") === 0);
    E(w, HIDE + " Track._t.start()");
    E(w, "resetDailyProgressAction()");
    check('TR38 «Сбросить дневной прогресс» — бег остановлен', !E(w, "Track.live()"));
    E(w, "Track._t.start(); rebirthApply({});");
    check('TR39 Перерождение — бег остановлен; выбор «расстояние / шаги» не сбрасывается', !E(w, "Track.live()") && E(w, "data.runUnit") === 'km');
    E(w, "data.runUnit = 'steps'; rebirthApply({});");
    check('TR40 Перерождение не трогает режим шагов', E(w, "data.runUnit") === 'steps');
  }
  { const w = await mk("data.veilActive = true;");
    E(w, "render()");
    const veil = E(w, "dayEffectHold()");
    check('TR41 Пелена / Заморозка — кнопки трека нет', !veil || Q(w, STEPS + ' .gp-btn').style.display === 'none', veil);
    E(w, "data.activeScroll = 'freeze'; render();");
    check('TR42 Заморозка — кнопки трека нет', Q(w, STEPS + ' .gp-btn').style.display === 'none');
  }
  // ---- шкала усталости под слоем ----
  { const w = await mk("data.fatigueOn = true; data.fzPopup = true;");
    E(w, "fzPopUntil = Date.now() + 4000; fzDraw(false);");
    const before = Q(w, '#fzBar').classList.contains('on');
    E(w, "Track._t.start(); Track._t.open(); fzPopUntil = Date.now() + 4000; fzDraw(false);");
    check('TR43 слой трека открыт — шкала усталости не всплывает', before && E(w, "Track.covers()") && !Q(w, '#fzBar').classList.contains('on'));
  }
  // ---- Кодекс, Длань, карманы ----
  { const w = await mk();
    check('TR44 глава «Дневное Задание» — согласованный текст', /^Система назначает Игроку пять ежедневных упражнений: отжимания, приседания, подтягивания, пресс и бег\. Бег вносится Игроком или засчитывается Системой по треку: в этом режиме Система сама следит за перемещением Игрока\. Пока бег по треку не завершён, другие упражнения и ввод данных недоступны\. Объём задач возрастает/.test(E(w, "CODEX_CHAPTERS.daily_quota.content")));
    check('TR45 Длань: раздел «Бег по треку» — заготовленный маршрут вкл / выкл', !E(w, "Track.simState().on") && (E(w, "sysTrackSim(); Track.simState().on") === true) && E(w, "document.getElementById('sysTrackSimLabel').textContent") === 'Заготовленный маршрут: включён.');
    E(w, "sysTrackSpeed(20)");
    check('TR46 Длань: ускорение', E(w, "Track.simState().speed") === 20 && Q(w, '#sysTrackSpeed button[data-v="20"]').classList.contains('on'));
    E(w, "sysTrackSim()");
    E(w, `data.setRun.steps = { m: 'run', ph: 'run', t0: 0, vB: 5, rB: sxNow(), p: false, cut: 0, n: 0, base: 0, sets: [], ran: 0, work: 40, rest: 180, lim: 30, fin: false }; data.runUnit = 'steps'; sxOpenView('steps'); sxPocket(true);`);
    const hp = Q(w, '#sxPocket .hp');
    check('TR47 карман таймера: до касания заполнение кольца скрыто (нет чёрточки над замком)', !!hp && hp.style.opacity === '0');
    check('TR48 нет слов GPS в текстах для Игрока', !/GPS/.test(E(w, "CODEX_CHAPTERS.daily_quota.content")) && !/GPS/.test([...w.document.body.querySelectorAll('*:not(script):not(style)')].map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('')).join(' ')));
  }
  { const w = await mk();
    E(w, "Track._t.start(); Track._t.pocket(true);");
    const tg = Q(w, '#gpQTg');
    check('TR49 карман: под числом пройденного — цель «/ N км», строка «Шаги N · время» осталась', !!tg && /^\/ \d+,\d ?км$/.test(tg.textContent) && /^Шаги \d+ · /.test(Q(w, '#gpQ2').textContent), tg && tg.textContent);
    const hp = Q(w, '#gpPocket .hp');
    check('TR50 карман трека: до касания кольцо удержания скрыто', !!hp && hp.style.opacity === '0');
  }
  // ---- v8.0.1: слабый сигнал до первой точной точки ----
  { const w = await mk("Track.simSet(false);");
    E(w, "Track._t.open(); Track._t.start(); Track._t.fix(43.65, 51.17, 100, Date.now());");
    await sleep(400);
    check('TR51 неточная точка: в трек не идёт, но место Игрока запомнено (для вида поля)', E(w, "Track._t.run().pts.length") === 0 && J(w, "Track._t.run().any").join(',') === '43.65,51.17');
    check('TR52 значок — «слабый», надпись — «Сигнал слабый. Трек начнётся, когда точность улучшится.»', Q(w, '#gpSig').className === 'sig weak' && Q(w, '#gpMsg').textContent === 'Сигнал слабый. Трек начнётся, когда точность улучшится.', Q(w, '#gpMsg').textContent);
    const w2 = await mk("Track.simSet(false);", null, w => { Object.defineProperty(w.navigator, 'geolocation', { value: { watchPosition() { return 1; }, clearWatch() {} } }); Object.defineProperty(w, 'isSecureContext', { value: true }); });
    E(w2, "Track._t.open(); Track._t.start();"); await sleep(400);
    check('TR53 точек ещё нет — «Поиск сигнала…» и белая бегущая полоска', Q(w2, '#gpSig').className === 'sig search' && Q(w2, '#gpMsg').textContent === 'Поиск сигнала…');
  }
  // ---- v8.1.0: этап бега Испытания ранга по треку ----
  // испытание идёт: силовые этапы закрыты, бег не начат; время испытания двигаем вручную (exAdv), examTick — вручную
  const EXSET = `(() => { const e = data.exam = { st: 'running', adm: 'e', cyc: data.lastReset, dl: Date.now() + 8 * 3600000, vt: 0, vAt: Date.now(), sp: 1, act: null, rest: EX_REST('e'), fin: EX_FIN, tot: EX_TOTAL, S: {} };
    EX_IDS.forEach(id => { e.S[id] = EX_ST[id].run ? { st: 'idle', t0: 0, vals: [null, null, null, null], steps: 0, re: 1, auto: false } : { st: 'done', t0: 0, vals: [9, 9, 9, 9], steps: 0, re: 1, auto: false, cut: [0, 0, 0, 0], tUsed: 1050 }; });
    saveData(); examBuild(); examEnterUI(); })();`;
  const exAdv = (w, sec) => E(w, `(() => { const e = data.exam; e.vt = examNow() + ${sec}; e.vAt = Date.now(); examTick(); })()`);
  const good3 = w => E(w, "for (let i = 0; i < 3; i++) Track._t.fix(55.75 + i * 2 / 111132, 37.6, 5, Date.now() + i); examTick();");
  const exMk = async (extra, pre) => { const w = await mk("Track.simSet(false); data.examAccel = true; " + (extra || ''), null, pre || (w => { Object.defineProperty(w.navigator, 'geolocation', { value: { watchPosition() { w.__watch = (w.__watch || 0) + 1; return 1; }, clearWatch() {} } }); Object.defineProperty(w, 'isSecureContext', { value: true }); w.navigator.vibrate = p => { (w.__vib = w.__vib || []).push(JSON.stringify(p)); return true; }; }));
    E(w, EXSET); await sleep(30); return w; };
  { const w = await exMk();
    const bt = [...w.document.querySelectorAll('#exk_steps .ex-acts button')].map(b => b.textContent + (b.classList.contains('ex-ghost') ? '(скрыта)' : ''));
    check('TR54 карточка бега в испытании: «Трек» / «Таймер» (+ невидимая «Начать этап» задаёт ширину); у силовых — «Начать этап»',
      bt.join('|') === 'Трек|Таймер|Начать этап(скрыта)' && E(w, "(() => { data.exam.S.press.st = 'idle'; examCard('press'); return document.querySelector('#exk_press .ex-acts button').textContent; })()") === 'Начать этап');
    check('TR55 ширина «Трек» / «Таймер» — колонка по самой широкой кнопке (невидимая «Начать этап»): правило есть', /\.ex-card \.ex-acts\.ex-2 \{ display: grid; grid-template-columns: max-content;/.test(E(w, "document.querySelector('style').textContent")) && /button\.ex-ghost \{ visibility: hidden; pointer-events: none; \}/.test(E(w, "document.querySelector('style').textContent")) && /ex-2 button:first-child, \.ex-card \.ex-acts\.ex-2 button\.ex-ghost \{ grid-row: 1; grid-column: 1; \}/.test(E(w, "document.querySelector('style').textContent")));
    E(w, "examSetSpeed(5); data.exam.S.press.st = 'done'; examCard('press');");
    E(w, "document.querySelector('#exk_steps .ex-acts button').click()"); await sleep(50); E(w, "examTick()");
    const s = J(w, "data.exam.S.steps");
    check('TR56 «Трек»: поиск сигнала — время этапа стоит, слой трека открыт, табличка «ИСПЫТАНИЕ · БЕГ», скорость испытания ×1',
      s.mode === 'track' && s.t0 === null && E(w, "exPhase('steps').ph") === 'wait' && Q(w, '#gpLayer').classList.contains('on') && Q(w, '#gpTab').textContent === 'ИСПЫТАНИЕ · БЕГ' && E(w, "data.exam.sp") === 1, JSON.stringify(s));
    check('TR57 карточка во время поиска — «Поиск сигнала» и «Открыть этап»; ускоритель скрыт', /^Поиск сигнала/.test(Q(w, '#exk_steps .ex-tot').textContent) && /Открыть этап/.test(Q(w, '#exk_steps .ex-acts').textContent) && !Q(w, '#exAcc').classList.contains('on'));
    check('TR58 поиск: строка над цифрами и «Начать этап заново» недоступна', E(w, "Track._t.G().ex && true") && (E(w, "Track._t.open()"), true) && /Поиск сигнала\. Отсчёт этапа начнётся, когда сигнал станет устойчивым\./.test(Q(w, '#gpXph').textContent) && Q(w, '#gpRe').disabled === true);
    E(w, "for (let i = 0; i < 5; i++) Track._t.fix(55.75, 37.6, 60, Date.now() + i); examTick();");
    check('TR59 неточные точки (хуже 40 м) отсчёт этапа не запускают', E(w, "data.exam.S.steps.t0") === null);
    good3(w); await sleep(350);
    check('TR60 три точные точки подряд — подготовка 10 с («Подготовка: N»)', E(w, "data.exam.S.steps.t0") !== null && E(w, "exPhase('steps').ph") === 'prep' && /^Подготовка: \d+$/.test(Q(w, '#gpXph').textContent), Q(w, '#gpXph').textContent);
    check('TR61 во время подготовки карман не включается', !Q(w, '#gpPocket') || !Q(w, '#gpPocket').classList.contains('on'));
    exAdv(w, 10.5);
    check('TR62 после 10 с — бег: запись трека и карманный режим «ИСПЫТАНИЕ · БЕГ», без цели «/ N км»',
      E(w, "exPhase('steps').ph") === 'run' && E(w, "Track._t.G().ex.arm") === false && Q(w, '#gpPocket').classList.contains('on') && (E(w, "Track._t.pocket(true)"), Q(w, '#gpQPh').textContent === 'ИСПЫТАНИЕ · БЕГ' && Q(w, '#gpQTg').innerHTML === ''));
    const tot0 = E(w, "totalStats.steps"), cmp0 = E(w, "data.completed.steps || 0");
    runPts(w, 140);
    const mid = E(w, "data.exam.S.steps.steps"); exAdv(w, 0);
    check('TR63 во время бега шаги идут в этап (порциями), не в задание дня', E(w, "data.exam.S.steps.steps") >= 300 && (E(w, "data.completed.steps || 0") === cmp0), E(w, "data.exam.S.steps.steps") + ' / ' + mid);
    const m = E(w, "Track._t.G().ex.m"), sf = E(w, "Math.floor(Track._t.G().ex.sf)");
    exAdv(w, 1210);
    const d = J(w, "data.exam.S.steps");
    check('TR64 через 20 минут бега этап закрывается сам; остаток меньше 100 шагов тоже засчитан', d.st === 'done' && d.steps === sf && sf % 100 !== 0 && d.tUsed === 1210, JSON.stringify(d) + ' sf=' + sf + ' m=' + Math.round(m));
    check('TR65 шаги этапа — в «Прогресс» (не в задание), трек этапа не хранится, слой и карман закрыты',
      E(w, "totalStats.steps") === tot0 + sf && (E(w, "data.completed.steps || 0") === cmp0) && E(w, "Track._t.G().ex") === null && !Q(w, '#gpLayer').classList.contains('on') && !Q(w, '#gpPocket').classList.contains('on'));
    const ct = Q(w, '#exk_steps').textContent;
    check('TR66 закрытая карточка: «Время этапа: 20:10», «Расстояние: N км», «Шаги за бег», без флажка',
      /Время этапа: 20:10/.test(ct) && new RegExp('Расстояние: ' + (Math.floor(sf / 110) / 10).toFixed(1).replace('.', ',') + ' км').test(ct) && /Шаги за бег/.test(ct) && !Q(w, '#exk_steps button'), ct);
  }
  { const w = await exMk();
    E(w, "data.exam.S.steps = { st: 'done', t0: 0, vals: [null, null, null, null], steps: 2250, re: 1, auto: true, tUsed: 1300 }; examCard('steps');");
    check('TR67 «Таймер»: на закрытой карточке тоже «Расстояние: N км» (из шагов)', /Расстояние: 2,0 км/.test(Q(w, '#exk_steps').textContent));
    E(w, "data.exam.S.steps = { st: 'idle', t0: 0, vals: [null, null, null, null], steps: 0, re: 1, auto: false }; examBegin('steps'); examAccSync();");
    check('TR68 «Таймер» — этап как раньше (слой этапа, не трек; ускоритель есть)', E(w, "data.exam.S.steps.mode") === undefined && Q(w, '#exLayer').classList.contains('on') && !E(w, "!!Track._t.G().ex") && Q(w, '#exAcc').classList.contains('on'));
  }
  { const w = await exMk();
    E(w, "examBegin('steps', 'track')"); exAdv(w, 119);
    check('TR69 сигнал ещё не найден до 2 минут — окна нет', Q(w, '#exOv7').style.display !== 'flex');
    exAdv(w, 2);
    check('TR70 2 минуты без сигнала — окно «Сигнал не получен…» с кнопками «Продолжить по таймеру» / «Начать этап заново»; трек снят',
      Q(w, '#exOv7').style.display === 'flex' && /Сигнал не получен\. Этап можно продолжить по таймеру или начать заново\./.test(Q(w, '#exC7').textContent)
      && [...w.document.querySelectorAll('#exC7 button')].map(b => b.textContent).join('|') === 'Продолжить по таймеру|Начать этап заново' && E(w, "Track._t.G().ex") === null && Q(w, '#exOv7 .status-header').textContent.includes('ЗАПРОС РЕШЕНИЯ'));
    E(w, "[...document.querySelectorAll('#exC7 button')][1].click()");
    check('TR71 «Начать этап заново» — снова поиск, попытка не потрачена, окно закрыто', Q(w, '#exOv7').style.display === 'none' && E(w, "exPhase('steps').ph") === 'wait' && E(w, "data.exam.S.steps.re") === 1 && E(w, "!!Track._t.G().ex"));
    good3(w); exAdv(w, 11); runPts(w, 60);
    E(w, "Track._t.open(); document.getElementById('gpRe').click()");
    check('TR72 «Начать этап заново» в слое во время бега — попытка потрачена, снова поиск, трек с нуля', E(w, "data.exam.S.steps.re") === 0 && E(w, "exPhase('steps').ph") === 'wait' && E(w, "Track._t.G().ex.cr") === 0 && E(w, "Track._t.G().ex.pts.length") === 0);
    exAdv(w, 121);
    E(w, "[...document.querySelectorAll('#exC7 button')][0].click()");
    const s = J(w, "data.exam.S.steps");
    check('TR73 «Продолжить по таймеру» — обычный этап по таймеру с нуля (слой этапа), попытка не тратится', s.mode === undefined && typeof s.t0 === 'number' && s.steps === 0 && s.re === 0 && Q(w, '#exLayer').classList.contains('on') && Q(w, '#exOv7').style.display === 'none');
  }
  { const w = await exMk();
    E(w, "examBegin('steps', 'track'); Track.simSet(true); Track.sim('lostOn'); Track.sim('deny'); examTick();");
    check('TR74 доступ к местоположению запрещён — окно выбора сразу', Q(w, '#exOv7').style.display === 'flex' && E(w, "examNow()") < 5);
  }
  { const w = await exMk();
    E(w, "Track.simSet(true, 5); Track.sim('lostOn'); examBegin('steps', 'track')");
    check('TR75 Длань: заготовленный маршрут ×5 — этап по треку идёт с той же скоростью', E(w, "data.exam.sp") === 5);
    E(w, "Track.simSet(null, 20)"); const a = E(w, "data.exam.sp"); E(w, "Track.simSet(false)");
    check('TR76 смена ускорения / выключение маршрута — скорость этапа за ними (×20, затем ×1)', a === 20 && E(w, "data.exam.sp") === 1);
  }
  { const w = await exMk("window.__T = []; const __et = exTone; exTone = function (f) { window.__T.push(f); return __et.apply(this, arguments); };");
    E(w, "examBegin('steps', 'track')"); good3(w); exAdv(w, 11);
    E(w, "Track._t.G().ex.lastFix = Date.now() - 11000"); await sleep(400);
    const lost = E(w, "Track._t.G().ex.lost"), t1 = J(w, "window.__T.slice()"), v1 = J(w, "window.__vib || []");
    E(w, "Track._t.fix(55.76, 37.6, 5, Date.now())"); await sleep(400);
    check('TR77 сигнал пропал во время бега: отсчёт идёт, звук потери (660 → 440) и вибрация', lost === true && t1.slice(-2).join() === '660,440' && v1.includes('[300,150,300]') && E(w, "exPhase('steps').ph") === 'run', JSON.stringify([lost, t1, v1]));
    check('TR78 сигнал вернулся — другой звук (523 → 784) и короткая вибрация', E(w, "Track._t.G().ex.lost") === false && J(w, "window.__T.slice(-2)").join() === '523,784' && J(w, "window.__vib").includes('[120]'));
    check('TR79 в испытании нет паузы «Сигнал потерян» через 5 минут', (E(w, "Track._t.G().ex.lastFix = Date.now() - 6 * 60000"), await sleep(400), E(w, "Track._t.G().ex.st")) === 'run');
    E(w, "Track._t.pocket(true)");
    check('TR80 карман без сигнала — «ИСПЫТАНИЕ · БЕГ · НЕТ СИГНАЛА»', Q(w, '#gpQPh').textContent === 'ИСПЫТАНИЕ · БЕГ · НЕТ СИГНАЛА');
    E(w, "examRefuseAsk(false); examRefused();"); await sleep(400);
    check('TR81 испытание окончено иначе (отказ) — трек этапа снят без зачёта', E(w, "Track._t.G().ex") === null && E(w, "examOn()") === false);
  }
  { const w = await exMk();
    E(w, "examBegin('steps', 'track')"); good3(w); exAdv(w, 11); runPts(w, 20); E(w, "Track._t.G(); saveData()");
    E(w, "localStorage.setItem('sl_track_v8_0_0', JSON.stringify(Track._t.G()))");
    const ls = {}; for (const k of ['sl_daily_v5_5_0', 'sl_track_v8_0_0']) ls[k] = E(w, `localStorage.getItem('${k}')`);
    const w2 = boot(null, x => { for (const k in ls) x.localStorage.setItem(k, ls[k]); Object.defineProperty(x.navigator, 'geolocation', { value: { watchPosition() { x.__watch = (x.__watch || 0) + 1; return 1; }, clearWatch() {} } }); Object.defineProperty(x, 'isSecureContext', { value: true }); });
    await sleep(300);
    check('TR82 перезапуск посреди этапа по треку — этап идёт, трек на месте, сигнал включён снова', E(w2, "exTrk('steps') && !!Track._t.G().ex && Track._t.G().ex.st === 'run'") && E(w2, "window.__watch || 0") >= 1);
  }
  check('TR83 «Условия»: абзац про бег по треку и по таймеру', /Бег можно пройти по треку — отсчёт начнётся, когда будет получен устойчивый сигнал, и Система сама засчитает расстояние, преодолённое за 20 минут, — или по таймеру: тогда на внесение показаний шагомера отводится 5 минут\./.test(html));
  // ---- v8.1.0: бег по треку в задании ----
  { const w = await mk("Track.simSet(false);", null, x => { Object.defineProperty(x.navigator, 'geolocation', { value: { watchPosition() { x.__watch = (x.__watch || 0) + 1; return 1; }, clearWatch() {} } }); Object.defineProperty(x, 'isSecureContext', { value: true }); });
    const T = E(w, "getDynamicTarget(10000, data.dailyTargetLevel, 'steps')");
    E(w, `document.querySelectorAll('.quest-item').forEach(i => { const id = i.dataset.id; if (id !== 'steps') data.completed[id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, id); }); data.completed.steps = ${T} - 40; saveData(); render(); Track._t.start();`);
    runPts(w, 25);
    const left = E(w, "Math.floor(Track._t.run().sf) - Track._t.run().cr");
    E(w, "localStorage.setItem('sl_track_v8_0_0', JSON.stringify(Track._t.G()))");
    const ls = {}; for (const k of ['sl_daily_v5_5_0', 'sl_track_v8_0_0']) ls[k] = E(w, `localStorage.getItem('${k}')`);
    const w2 = boot(null, x => { for (const k in ls) x.localStorage.setItem(k, ls[k]); Object.defineProperty(x.navigator, 'geolocation', { value: { watchPosition() { x.__watch = (x.__watch || 0) + 1; return 1; }, clearWatch() {} } }); Object.defineProperty(x, 'isSecureContext', { value: true }); });
    await sleep(300);
    check('TR84 перезапуск посреди бега дня — сигнал включается сам', E(w2, "Track.live()") && E(w2, "window.__watch || 0") >= 1);
    const key = E(w, "dateKeyFromTimestamp(data.lastReset)");
    E(w, `${HIDE} data.lastReset -= 24 * 3600000; checkMissedDays();`);
    const h = J(w, `data.history['${E(w, "dateKeyFromTimestamp(data.lastReset - 24 * 3600000)")}'] || null`);
    check('TR85 сброс дня: остаток бега (меньше 100 шагов) засчитан в уходящий день до итога — задание закрыто, штрафа нет', left > 0 && left < 100 && !!h && h.status === 'success' && E(w, "data.penaltyRun") === 0, JSON.stringify([left, h]));
  }
  { const w = await mk();
    E(w, "Track._t.open(); Track._t.start();"); runPts(w, 50); await sleep(300);
    const dg = s => !!Q(w, s) && Q(w, s).querySelectorAll('.sx-dg').length > 0;
    check('TR86 цифры в ячейках постоянной ширины: расстояние, шаги, км/ч, время, темп, точность', ['#gpD', '#gpS', '#gpV', '#gpT', '#gpA'].every(dg), ['#gpD', '#gpS', '#gpV', '#gpT', '#gpA'].map(s => Q(w, s) && Q(w, s).innerHTML).join(' | '));
    E(w, "Track._t.pocket(true)");
    check('TR87 карман: большое число и строка «Шаги · время» — в ячейках; у темпа и точности — места постоянной ширины', dg('#gpQT') && dg('#gpQ2') && /#gpLayer \.r3 > span:nth-child\(2\) \{ display: inline-block; min-width: 6\.9em;/.test(html) && /#gpLayer \.r3 > span:nth-child\(3\) \{ display: inline-block; min-width: 3\.7em;/.test(html));
  }
  // ---- v8.1.0: Длань — штрафы за пропуски ----
  { const w = await mk();
    E(w, "sysPenaltiesSync()");
    check('TR88 по умолчанию штрафы начисляются: поле false, в Длани галочка стоит', E(w, "data.penaltiesOff") === false && Q(w, '#sysPenOffCheckbox').classList.contains('on') && Q(w, '#sysPenOffLabel').textContent === 'Штрафы за пропуски: начисляются.');
    E(w, "sysPenaltiesToggle()");
    check('TR89 галочка снята — «Штрафы за пропуски: не начисляются.»', E(w, "data.penaltiesOff") === true && !Q(w, '#sysPenOffCheckbox').classList.contains('on') && Q(w, '#sysPenOffLabel').textContent === 'Штрафы за пропуски: не начисляются.');
    E(w, "data.exp = 500; data.penaltyStreak = 2; data.penaltyRun = 2; data.totalPenalties = 3; data.insurance = true; data.insuranceSourceId = 'rune_protection'; data.curseActiveToday = true; data.completed = {}; data.isGoalMet = false; saveData();");
    const k = E(w, "dateKeyFromTimestamp(data.lastReset)");
    E(w, `${HIDE} data.lastReset -= 24 * 3600000; checkMissedDays();`);
    const h = J(w, `data.history['${E(w, "dateKeyFromTimestamp(data.lastReset - 24 * 3600000)")}']`);
    check('TR90 невыполненный день без штрафа: опыт, тяжесть, «подряд», общее число не меняются; день синий без руны; руна не потрачена (и под Бременем)',
      h && h.status === 'protected' && !h.protectedBy && E(w, "data.exp") === 500 && E(w, "data.penaltyStreak") === 2 && E(w, "data.penaltyRun") === 2 && E(w, "data.totalPenalties") === 3 && E(w, "data.insurance") === true && Q(w, '#penaltyOverlay').style.display !== 'flex', JSON.stringify(h));
    const raw = E(w, "localStorage.getItem('sl_daily_v5_5_0')"); const w2 = boot(raw); await sleep(250);
    check('TR91 настройка переживает перезапуск', E(w2, "data.penaltiesOff") === true);
    const im = E(w, `JSON.stringify(sanitizeImportedData({ state: JSON.parse(JSON.stringify(data)), total: {} }).state.penaltiesOff)`);
    check('TR92 импорт бэкапа — штрафы снова включены (тестовая настройка не переезжает)', im === 'false');
    const r = JSON.parse(raw); delete r.penaltiesOff; const w3 = boot(JSON.stringify(r)); await sleep(250);
    check('TR93 старое сохранение без поля — штрафы начисляются', E(w3, "data.penaltiesOff") === false);
    E(w, `${HIDE} data.curseActiveToday = false; data.exp = 500; applyPenaltyAction();`);
    check('TR94 «Применить штраф сейчас» работает и при выключенных штрафах', E(w, "data.exp") < 500 || E(w, "data.expDebt") > 0);
    E(w, `${HIDE} sysPenaltiesToggle(); data.exp = 900; data.insurance = false; data.curseActiveToday = false; data.completed = {}; data.isGoalMet = false; data.lastReset -= 24 * 3600000; checkMissedDays();`);
    check('TR95 галочка снова стоит — пропуск снова со штрафом', E(w, "data.penaltiesOff") === false && E(w, "data.exp") < 900);
  }
  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
