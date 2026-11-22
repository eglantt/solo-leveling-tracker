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
    check('TR2 версия 8.0.0 (APP_VERSION и заголовок)', E(w, 'APP_VERSION') === '8.0.0' && /v8\.0\.0/.test(w.document.title));
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
  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
