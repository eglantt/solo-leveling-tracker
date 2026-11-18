// v7.7.4: Длань «Перерождение» — уровень 1 и сброс всего, что меняется игрой; галочки — кредиты, характеристики, артефакты, предметы, прогресс, ранг, Летопись.
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
  const ART = "Object.keys(ARTEFACTS)";
  const RICH = `data.rulesAcknowledged = true; data.playerName = 'Dim'; data.dailyNotices.morning = true;
    data.level = 47; data.exp = 500; data.expDebt = 300; data.statPoints = 5; data.dailyTargetLevel = 47; data.credits = 6015;
    data.stats = { str: 60, agi: 30, sta: 40, int: 20, per: 15 };
    rankApply('c'); data.tnAdj = 50; data.rankHoldDays = 4;
    data.consecutiveDays = 49; data.bestStreak = 60; data.totalDays = 80; data.limitBreaksCount = 30; data.totalItemsSold = 3;
    totalStats.pushups = 12000; totalStats.steps = 50000; data.dailyExerciseLog = { '2026-11-01': { pushups: 100 } };
    data.inventory = ${ART}.slice(0, 3); data.equippedArtifacts = [data.inventory[0], null, null, null];
    data.consumables = { rune_protection: 2 }; data.boxes = { box_e: 1 }; data.keys = { key_e: 1 };
    data.history = { '2026-11-01': { status: 'success' } };
    data.penaltyStreak = 4; data.penaltyRun = 3; data.totalPenalties = 7; data.penaltyStack = [{ day: null, loss: 100, returned: 0 }];
    data.activeScroll = 'contract'; data.pendingScroll = 'transfer'; data.curseActiveToday = true; data.pendingCurse = true; data.expBoostToday = 0.2; data.insurance = true;
    data.beadStreak = 2; data.beadBlockUntil = Date.now() + 1e6; data.freezeNextAvailableAt = Date.now() + 1e6;
    data.completed = { pushups: 50 }; data.isGoalMet = true; data.limitBreaksToday = 1; data.progressNoticesShown = [20, 40];
    data.setTimer = true; data.setPrefs = { pushups: { work: 20 } }; data.theme = data.theme; data.fatigue.fast = 33; data.fatigue.t = Date.now();
    data.codexUnlocked.push('limit_break'); ${ART}.slice(0, 3).forEach(k => data.codexUnlocked.push('artifact_' + k));
    updateTitleStatus(); saveData(); render(); ${HIDE}`;
  const mk = async extra => { const w = boot(); await sleep(250); E(w, RICH + (extra || '')); await sleep(50); E(w, HIDE); return w; };
  const ST = w => J(w, `({ lv: data.level, exp: data.exp, debt: data.expDebt, sp: data.statPoints, tl: data.dailyTargetLevel, cr: data.credits, str: data.stats.str,
    rank: data.rank, tn: tnTotal(), hold: data.rankHoldDays, streak: data.consecutiveDays, best: data.bestStreak, days: data.totalDays, lbc: data.limitBreaksCount, sold: data.totalItemsSold,
    push: totalStats.pushups, log: Object.keys(data.dailyExerciseLog).length, inv: data.inventory.length, eq: data.equippedArtifacts.filter(Boolean).length,
    cons: Object.keys(data.consumables).length, boxes: Object.keys(data.boxes).length, keys: Object.keys(data.keys).length, hist: Object.keys(data.history).length,
    sev: data.penaltyStreak, run: data.penaltyRun, tp: data.totalPenalties, stack: data.penaltyStack.length,
    scr: data.activeScroll, pscr: data.pendingScroll, curse: data.curseActiveToday, pcurse: data.pendingCurse, boost: data.expBoostToday, ins: data.insurance,
    bead: data.beadStreak, beadB: data.beadBlockUntil, frzP: data.freezeNextAvailableAt, comp: Object.keys(data.completed).length, goal: data.isGoalMet, lbt: data.limitBreaksToday, pn: data.progressNoticesShown.length,
    titles: data.titlesUnlocked.slice().sort(), active: data.activeTitle, codex: data.codexUnlocked.slice(),
    id: data.playerId, nm: data.playerName, set: data.setTimer, prefs: JSON.stringify(data.setPrefs), fz: Math.round(fzValue ? fzValue() : data.fatigue.fast), theme: data.theme, rules: data.rulesAcknowledged })`);
  const START = ["daily_quota", "penalty", "chronicle", "shop", "boxes", "titles", "archive", "stats", "equipment"];

  // раздел и галочки
  {
    const w = await mk();
    E(w, 'sysToolsAuthorized = true; openSysTools();');
    const sec = J(w, `(() => { const s = document.getElementById('sysRebirth'); return { t: s.querySelector('.backup-section-title').textContent, rows: [...s.querySelectorAll('.sys-rb-row span')].map(x => x.textContent),
      on: s.querySelectorAll('.sound-checkbox.on').length, btn: [...s.querySelectorAll('button')].pop().textContent, notes: [...s.querySelectorAll('.sys-rb-note')].map(x => x.textContent), last: !s.nextElementSibling }; })()`);
    E(w, "sysRbToggle('credits'); sysRbToggle('rank'); sysRbToggle('rank'); sysRbToggle('history')");
    const t1 = J(w, "RB_KEYS.filter(k => document.getElementById('sysRb_' + k).classList.contains('on'))");
    E(w, 'closeSysTools(); openSysTools();');
    const t2 = E(w, "document.querySelectorAll('#sysRebirth .sound-checkbox.on').length");
    check('RB1 раздел «Перерождение» в конце Длани: подписи, 7 галочек по порядку, все сняты; кнопка «Начать путь заново»; галочки переключаются и снимаются при закрытии Длани',
      sec.t === 'Перерождение' && sec.rows.join() === 'Кредиты,Характеристики,Артефакты,Предметы,Прогресс,Ранг,Летопись' && sec.on === 0 && sec.btn === 'Начать путь заново' && sec.last
      && sec.notes[0] === 'Уровень 1, титулы, эффекты, штрафы, Кодекс, испытание ранга и дневное задание сбрасываются всегда.'
      && sec.notes[1] === 'Ранг — подтверждённый ранг, его главы Кодекса, титул «Пробужденный» и накопленная нагрузка для испытания.'
      && t1.join() === 'credits,history' && t2 === 0, JSON.stringify({ sec, t1, t2 }));
    E(w, 'sysRebirthAsk()');
    const a0 = E(w, "document.querySelector('#confirmOverlay .danger-text').textContent");
    const red = E(w, "!!document.querySelector('#confirmOverlay .danger-btn-confirm')");
    E(w, "closeConfirmModal(); sysRbToggle('credits'); sysRbToggle('items'); sysRbToggle('history'); sysRebirthAsk()");
    const a1 = E(w, "document.querySelector('#confirmOverlay .danger-text').textContent");
    E(w, 'closeConfirmModal()');
    const lv = E(w, 'data.level');
    check('RB2 окно «Запрос решения»: без галочек — две строки; с галочками — «Также будет сброшено: кредиты, предметы, Летопись.»; «Подтвердить» — красная; «Отмена» ничего не меняет',
      a0 === 'Уровень, опыт, титулы, эффекты, штрафы, Кодекс и дневное задание будут сброшены к началу.\nОтменить сброс нельзя — перед ним стоит сделать бэкап.'
      && a1 === 'Уровень, опыт, титулы, эффекты, штрафы, Кодекс и дневное задание будут сброшены к началу.\nТакже будет сброшено: кредиты, предметы, Летопись.\nОтменить сброс нельзя — перед ним стоит сделать бэкап.'
      && red && lv === 47, JSON.stringify({ a0, a1, lv }));
    w.close();
  }

  // всегда сбрасывается / сохраняется без галочек
  {
    const w = await mk();
    const b = ST(w);
    E(w, 'rebirthApply({})'); await sleep(5200);
    const a = ST(w);
    const noteQ = E(w, "notificationQueue.length + document.querySelectorAll('.sys-notice, .system-popup').length + (notificationActive ? 1 : 0)");
    check('RB3 всегда: уровень 1, опыт 0, долг 0, свободные очки 0, цели — уровня 1; задание дня, раунды и уведомления 20–80% — с нуля; эффекты (свитки, Бремя, бусина, паузы, руны) сняты; штрафы — к нулю',
      a.lv === 1 && a.exp === 0 && a.debt === 0 && a.sp === 0 && a.tl === 1 && a.comp === 0 && !a.goal && a.lbt === 0 && a.pn === 0
      && a.scr === null && a.pscr === null && !a.curse && !a.pcurse && a.boost === 0 && !a.ins && a.bead === 0 && a.beadB === null && a.frzP === null
      && a.sev === 0 && a.run === 0 && a.tp === 0 && a.stack === 0, JSON.stringify(a));
    check('RB4 без галочек сохраняются: кредиты, характеристики, артефакты (в Инвентаре, контур закрыт), предметы, прогресс, ранг (главы, «Пробужденный», нагрузка), Летопись; ID, имя, настройки, выбор таймера, усталость, Правила — не тронуты',
      a.cr === 6015 && a.str === 60 && a.inv === 3 && a.eq === 0 && a.cons === 1 && a.boxes === 1 && a.keys === 1 && a.streak === 49 && a.best === 60 && a.days === 80 && a.lbc === 30 && a.push === 12000 && a.log === 1
      && a.rank === 'c' && a.tn === b.tn && a.hold === 4 && a.titles.includes('Пробужденный') && ['rank_e', 'rank_d', 'rank_c'].every(c => a.codex.includes(E(w, `RANK_CODEX_MAP['${c.slice(5)}']`)))
      && a.hist === 1 && a.id === b.id && a.nm === 'Dim' && a.set === true && a.prefs === b.prefs && a.fz === b.fz && a.theme === b.theme && a.rules === true, JSON.stringify({ b, a }));
    const titleCh = J(w, "Object.values(TITLE_CODEX_MAP)");
    const extra = a.codex.filter(c => !START.includes(c));
    check('RB5 титулы и Кодекс: снято «Марафонцев» нет, остаются только титулы по сохранённому прогрессу (серия, упражнения, раунды Предела) и «Пробужденный» — тихо, без уведомлений; Кодекс — стартовые главы + главы рангов, титулов и оставленных артефактов; «Преодоление предела» — убрана',
      a.titles.includes('Целеустремлённый') && a.titles.includes('Непреклонный') && a.titles.includes('Сокрушитель') && a.titles.includes('Покоритель предела') && START.every(c => a.codex.includes(c))
      && !a.codex.includes('limit_break') && extra.every(c => c.startsWith('artifact_') || c.startsWith('rank_') || titleCh.includes(c) || c === 'title_probuzhdenny' || Object.values(J(w, 'RANK_CODEX_MAP')).includes(c)) && noteQ === 0,
      JSON.stringify({ titles: a.titles, extra, noteQ }));
    w.close();
  }

  // каждая галочка отдельно
  {
    const res = {};
    for (const k of ['credits', 'stats', 'artifacts', 'items', 'progress', 'rank', 'history']) {
      const w = await mk();
      E(w, `rebirthApply({ ${k}: true })`); await sleep(50);
      res[k] = ST(w); w.close();
    }
    const r = res;
    check('RB6 «Кредиты» — 0, остальное по галочкам не тронуто', r.credits.cr === 0 && r.credits.str === 60 && r.credits.inv === 3 && r.credits.cons === 1 && r.credits.streak === 49 && r.credits.rank === 'c' && r.credits.hist === 1, JSON.stringify(r.credits));
    check('RB7 «Характеристики» — все по 10, кредиты на месте', r.stats.str === 10 && r.stats.cr === 6015, JSON.stringify(r.stats));
    check('RB8 «Артефакты» — убраны из Инвентаря и контура, их главы Кодекса — тоже; предметы на месте', r.artifacts.inv === 0 && r.artifacts.eq === 0 && !r.artifacts.codex.some(c => c.startsWith('artifact_')) && r.artifacts.cons === 1, JSON.stringify(r.artifacts));
    check('RB9 «Предметы» — расходники, шкатулки, ключи; артефакты на месте', r.items.cons === 0 && r.items.boxes === 0 && r.items.keys === 0 && r.items.inv === 3, JSON.stringify(r.items));
    check('RB10 «Прогресс» — упражнения за всё время, дни, месяцы, серия и рекорд, раунды Предела, продажи; титулы по прогрессу не возвращаются (остаётся «Пробужденный» оставленного ранга, он заменяет «Новичка» — как в игре)',
      r.progress.push === 0 && r.progress.days === 0 && r.progress.log === 0 && r.progress.streak === 0 && r.progress.best === 0 && r.progress.lbc === 0 && r.progress.sold === 0
      && r.progress.titles.join() === 'Пробужденный' && r.progress.active === 'Пробужденный', JSON.stringify(r.progress));
    check('RB11 «Ранг» — «Без ранга», нагрузка 0, главы рангов и «Пробужденный» убраны', r.rank.rank === null && r.rank.tn === 0 && r.rank.hold === 0 && !r.rank.titles.includes('Пробужденный')
      && !Object.values(r.rank.codex).some(c => /^rank_/.test(c)) && !r.rank.codex.includes('title_probuzhdenny'), JSON.stringify({ rank: r.rank.rank, tn: r.rank.tn, codex: r.rank.codex }));
    check('RB12 «Летопись» — очищена', r.history.hist === 0 && r.history.cr === 6015, JSON.stringify(r.history));
  }

  // все галочки, ранг при «Без ранга», испытание, Заморозка, Пелена, перезапуск, бэкап
  {
    let w = await mk();
    E(w, "rebirthApply({ credits: true, stats: true, artifacts: true, items: true, progress: true, rank: true, history: true })"); await sleep(50);
    const a = ST(w);
    check('RB13 все галочки — как новый Игрок, но с тем же ID, именем и настройками', a.lv === 1 && a.cr === 0 && a.str === 10 && a.inv === 0 && a.cons === 0 && a.push === 0 && a.streak === 0 && a.rank === null && a.tn === 0 && a.hist === 0
      && a.titles.join() === 'Новичок' && a.active === 'Новичок' && a.codex.slice().sort().join() === START.slice().sort().join() && a.nm === 'Dim' && a.set === true, JSON.stringify(a));
    const seed = w.localStorage.getItem('sl_daily_v5_5_0'), stats = w.localStorage.getItem('sl_total_stats_v5_5_0');
    const code = E(w, 'buildSignedBackupCode()'); w.close();
    const w2 = boot(seed, stats); await sleep(300);
    const r2 = ST(w2);
    const imp = J(w2, `(() => { const c = sanitizeImportedData(parseBackupText(${JSON.stringify(code)})); return { lv: c.state.level, cr: c.state.credits, codex: c.state.codexUnlocked.length, nm: c.state.playerName }; })()`);
    check('RB14 после перезапуска и через бэкап — сброшенное состояние сохраняется', r2.lv === 1 && r2.cr === 0 && r2.push === 0 && r2.rank === null && r2.nm === 'Dim' && imp.lv === 1 && imp.cr === 0 && imp.codex === START.length && imp.nm === 'Dim', JSON.stringify({ r2, imp }));
    w2.close();

    w = await mk("rankApply(null); data.tnAdj = 80;"); E(w, HIDE);
    E(w, 'rebirthApply({})'); await sleep(50); const keepTn = E(w, 'tnTotal()'); w.close();
    w = await mk("rankApply(null); data.tnAdj = 80;"); E(w, HIDE);
    E(w, 'rebirthApply({ rank: true })'); await sleep(50); const zeroTn = E(w, 'tnTotal()'); const rk = E(w, 'data.rank'); w.close();
    check('RB15 «Без ранга»: без галочки «Ранг» нагрузка для испытания остаётся, с галочкой — обнуляется; ранг так и остаётся «Без ранга»', keepTn > 0 && zeroTn === 0 && rk === null, JSON.stringify({ keepTn, zeroTn }));

    w = await mk("rankApply(null); data.level = 20; data.exam = null; data.examPost = null; data.examLastOffer = null; saveData();");
    E(w, "examDeadlineTs = () => Date.now() + 8 * 3600000; examOffer(true); examAccept(); examStart();"); await sleep(1500);
    const before = J(w, "({ on: examOn(), exm: document.body.classList.contains('exm') })");
    E(w, 'rebirthApply({})'); await sleep(1500);
    const ex = J(w, "({ exam: data.exam, post: data.examPost, exm: document.body.classList.contains('exm'), wins: [1,2,3,4,5,6].some(n => exOv(n).style.display === 'flex'), icon: document.getElementById('exIcon') ? document.getElementById('exIcon').classList.contains('on') : false, pen: data.penaltyRun, lv: data.level, debt: data.expDebt })");
    check('RB16 во время испытания ранга: испытание снято без штрафа, экран испытания и его окна закрыты, уровень 1', before.on && before.exm && ex.exam === null && ex.post === null && !ex.exm && !ex.wins && !ex.icon && ex.pen === 0 && ex.lv === 1 && ex.debt === 0, JSON.stringify({ before, ex }));
    w.close();

    for (const kind of ['freeze', 'veil']) {
      w = await mk(kind === 'freeze' ? "data.activeScroll = 'freeze'; data.freezeEndTimestamp = Date.now() + 3 * 86400000; saveData(); render();" : "data.activeScroll = 'veil'; data.veilLifted = false; saveData(); render();");
      const held0 = E(w, 'dayEffectHold()');
      E(w, 'rebirthApply({})'); await sleep(50);
      const r = J(w, "({ hold: dayEffectHold(), scr: data.activeScroll, frz: data.freezeEndTimestamp, cards: document.querySelectorAll('.quest-item').length })");
      check(`RB17 ${kind === 'freeze' ? 'Заморозка' : 'Пелена покоя'} снимается — задание дня уровня 1 доступно`, !!held0 && !r.hold && r.scr === null && r.frz === null && r.cards >= 5, JSON.stringify({ held0, r }));
      w.close();
    }
  }

  // полный путь: кнопка → запрос → сбой окна Длани → значения в Длани; отложенные уведомления до сброса — не выводятся
  {
    const w = await mk();
    E(w, 'sysToolsAuthorized = true; openSysTools();');
    E(w, "fxNotice(() => showNotice('Старое уведомление', 'info'), 1500)");
    E(w, "sysRbToggle('credits'); sysRebirthAsk()");
    E(w, "document.querySelector('#confirmOverlay .danger-btn-confirm').click()");
    await sleep(500);
    const mid = J(w, "({ fx: !!themeFx, rb: !!(themeFx && themeFx.rebirth), lock: document.querySelector('#sysToolsOverlay .status-window').style.pointerEvents, lv: data.level })");
    E(w, "sysRbToggle('items')");   // нажатие во время сбоя — не действует
    await sleep(1600);
    const end0 = 1;
    await sleep(600);
    const end = J(w, `({ fx: !!themeFx, lock: document.querySelector('#sysToolsOverlay .status-window').style.pointerEvents, open: document.getElementById('sysToolsOverlay').style.display, lv: data.level, cr: data.credits, items: Object.keys(data.consumables).length,
      on: document.querySelectorAll('#sysRebirth .sound-checkbox.on').length, lvNow: document.getElementById('sysLevelNow').textContent, q: notificationQueue.length, log: data.notificationLog.some(n => /Старое уведомление/.test(n.text || n.body || '')) })`);
    check('RB18 «Подтвердить» → окно запроса уходит → сбой окна Длани (нажатия не действуют), сброс в момент потери сигнала; Длань остаётся открытой, галочки сняты, «Уровень 1» в Длани; уведомление, отложенное до сброса, не выводится',
      mid.fx && mid.rb && mid.lock === 'none' && !end.fx && end.lock === '' && end.open === 'flex' && end.lv === 1 && end.cr === 0 && end.items === 1 && end.on === 0 && /Уровень\s*1\b/.test(end.lvNow) && end.q === 0 && !end.log, JSON.stringify({ mid, end }));
    E(w, "sysRbToggle('credits'); sysRebirthAsk(); document.querySelector('#confirmOverlay .danger-btn-confirm').click()"); await sleep(600);
    E(w, 'closeSysTools()'); await sleep(50);
    const cl = J(w, "({ fx: !!themeFx, open: document.getElementById('sysToolsOverlay').style.display, lv: data.level })");
    check('RB19 Длань закрыта во время сбоя — сброс выполняется сразу, сбой обрывается', !cl.fx && cl.open === 'none' && cl.lv === 1, JSON.stringify(cl));
    w.close();
  }

  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
