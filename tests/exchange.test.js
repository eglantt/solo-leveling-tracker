// v7.6.15: обмен уровня (погашение долга понижением уровня) и итоги месяца Летописи в две строки.
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
  const SPY = "window.__N = []; { const o = showNotice; showNotice = (m, ...a) => { __N.push(m); return o(m, ...a); }; }";
  const HIDE = "document.querySelectorAll('.status-overlay').forEach(o => o.style.display = 'none'); notificationQueue.length = 0; notificationActive = false;";
  const setup = (lv, debt, cr, extra) => `data.rulesAcknowledged = true; data.playerName = 'Тест'; data.level = ${lv}; data.exp = 0; data.expDebt = ${debt}; data.credits = ${cr}; data.exam = null; data.examPost = null; ${extra || ''} contourRecheck(); saveData(); ${HIDE} ${SPY} updateStatusUI();`;
  const mk = async (lv, debt, cr, extra) => { const w = boot(); await sleep(250); E(w, setup(lv, debt, cr, extra)); return w; };
  const btn = w => J(w, "({ vis: dexBtn.style.display !== 'none', dis: dexBtn.disabled, txt: dexBtn.textContent })");

  // ступени
  {
    const w = await mk(2, 0, 0);
    const T = {};
    for (const l of [2, 10, 11, 20, 21, 30, 31, 95, 100, 101]) { E(w, `data.level = ${l}`); const s = J(w, 'dexStep()'); T[l] = [s.cap, s.price]; }
    check('DX1 ступени: 2–10 — 1500 за 5000, 11–20 — 3000 за 10000, 21–30 — 4500 за 15000, … 91–100 — 15000 за 50000, 101 — 16500 за 55000',
      String(T[2]) === '1500,5000' && String(T[10]) === '1500,5000' && String(T[11]) === '3000,10000' && String(T[20]) === '3000,10000' && String(T[21]) === '4500,15000'
      && String(T[30]) === '4500,15000' && String(T[31]) === '6000,20000' && String(T[95]) === '15000,50000' && String(T[100]) === '15000,50000' && String(T[101]) === '16500,55000', JSON.stringify(T));
    w.close();
  }

  // кнопка: когда видна и когда неактивна
  {
    const R = {};
    let w = await mk(34, 9000, 50000); R.ok = btn(w);
    E(w, 'data.expDebt = 2550; updateStatusUI()'); R.half = btn(w);          // ровно 50% (5100 × 0,5) — нет
    E(w, 'data.expDebt = 2551; updateStatusUI()'); R.over = btn(w);
    E(w, 'data.expDebt = 9000; data.credits = 19999; updateStatusUI()'); R.poor = btn(w);
    E(w, "data.credits = 50000; data.exam = { st: 'running', S: {} }; updateStatusUI()"); R.exam = btn(w);
    E(w, "data.exam = null; data.examPost = { kind: 'low', step: 1 }; updateStatusUI()"); R.post = btn(w);
    E(w, 'data.examPost = null; data.expDebt = 0; updateStatusUI()'); R.nodebt = btn(w);
    w.close();
    w = await mk(1, 900, 50000); R.l1 = btn(w); w.close();
    check('DX2 кнопка «Обменять уровень»: видна при долге больше 50% опыта до следующего уровня; при 50% и меньше, на 1-м уровне, во время испытания и до конца его итога, без долга — нет',
      R.ok.vis && !R.ok.dis && R.ok.txt === 'Обменять уровень' && !R.half.vis && R.over.vis && !R.exam.vis && !R.post.vis && !R.nodebt.vis && !R.l1.vis, JSON.stringify(R));
    check('DX3 кредитов меньше цены шага — кнопка видна, но неактивна; окно не открывается', R.poor.vis && R.poor.dis, JSON.stringify(R.poor));
  }

  // окно подтверждения — тексты
  {
    const T = {};
    let w = await mk(34, 9000, 50000); E(w, 'dexAsk()'); T.big = E(w, "confirmContent.querySelector('.danger-text').textContent"); T.btns = E(w, "[...confirmContent.querySelectorAll('button')].map(b => b.textContent).join('|')"); T.red = E(w, "!!confirmContent.querySelector('.danger-btn-confirm')"); w.close();
    w = await mk(34, 3500, 50000); E(w, 'dexAsk()'); T.small = E(w, "confirmContent.querySelector('.danger-text').textContent"); w.close();
    w = await mk(30, 4000, 30000); E(w, 'dexAsk()'); T.cut = E(w, "confirmContent.querySelector('.danger-text').textContent"); w.close();
    w = await mk(34, 9000, 1000); E(w, 'dexAsk()'); T.poor = E(w, "confirmOverlay.style.display"); w.close();
    check('DX4 окно: «Уровень будет понижен: 34 → 33. / Долг будет уменьшен на 6000 EXP. / Цена: 20000 ◈.»; кнопки «Отмена» / «Подтвердить» (красная); «необратимо» нет',
      /^Уровень будет понижен: 34 → 33\.\nДолг будет уменьшен на 6000 EXP\.\nЦена: 20000 ?\.$/.test(T.big) && !/необратим/.test(T.big + T.small + T.cut) && T.btns === 'Отмена|Подтвердить' && T.red, JSON.stringify(T));
    check('DX5 окно при погашении: «Долг будет погашен.» + «В опыт будет зачислено: 2500 EXP.»; вместимость контура — только при её уменьшении', /Долг будет погашен\.\nВ опыт будет зачислено: 2500 EXP\.\nЦена: 20000/.test(T.small) && !/Вместимость/.test(T.big + T.small)
      && /Цена: 15000.*\nВместимость контура снаряжения уменьшится\.$/s.test(T.cut) && T.poor !== 'flex', JSON.stringify(T));
  }

  // шаг: долг больше суммы шага
  {
    const w = await mk(34, 9000, 50000, "data.rank = 'c'; data.penaltyStreak = 4; data.penaltyRun = 3; data.consecutiveDays = 0; data.dailyTargetLevel = 34; data.statPoints = 7; data.stats.str = 22;");
    const before = J(w, '({ r: data.rank, ps: data.penaltyStreak, pr: data.penaltyRun, cd: data.consecutiveDays, t: data.dailyTargetLevel, sp: data.statPoints, st: data.stats, inv: data.inventory.length, tn: data.tn })');
    E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const a = J(w, '({ l: data.level, d: data.expDebt, e: data.exp, c: data.credits })');
    const after = J(w, '({ r: data.rank, ps: data.penaltyStreak, pr: data.penaltyRun, cd: data.consecutiveDays, t: data.dailyTargetLevel, sp: data.statPoints, st: data.stats, inv: data.inventory.length, tn: data.tn })');
    check('DX6 долг больше шага: 34 → 33, долг 9000 → 3000, опыт 0, кредиты 50000 → 30000', a.l === 33 && a.d === 3000 && a.e === 0 && a.c === 30000, JSON.stringify(a));
    check('DX7 ранг, тяжесть штрафа, «штрафов подряд», серия, цели дня, очки и значения характеристик, Инвентарь, ТН — без изменений', JSON.stringify(before) === JSON.stringify(after), JSON.stringify([before, after]));
    check('DX8 уведомление «Уровень понижен до 33. Долг уменьшен на 6000 EXP.» (в журнал — через очередь), о контуре — нет', E(w, '__N.join("|")') === 'Уровень понижен до 33. Долг уменьшен на 6000 EXP.', E(w, '__N.join("|")'));
    check('DX9 сохранено сразу', JSON.parse(w.localStorage.getItem('sl_daily_v5_5_0')).level === 33);
    // следующий шаг — снова кнопкой и подтверждением
    const vis = btn(w);
    E(w, 'runConfirmedAction()'); const same = E(w, 'data.level');
    E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    check('DX10 один шаг за подтверждение: повторное «Подтвердить» без окна ничего не делает; новый шаг — 33 → 32 (ступень 31–40: 6000), долг 3000 погашен, остаток 3000 — в опыт', vis.vis && same === 33 && E(w, 'data.level') === 32 && E(w, 'data.expDebt') === 0 && E(w, 'data.exp') === 3000, JSON.stringify(J(w, '({ l: data.level, d: data.expDebt, e: data.exp })')));
    w.close();
  }

  // долг меньше шага, остаток с потолком
  {
    let w = await mk(34, 3500, 50000); E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const a = J(w, '({ l: data.level, d: data.expDebt, e: data.exp, c: data.credits, n: __N })'); w.close();
    w = await mk(11, 900, 10000); E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const b = J(w, '({ l: data.level, d: data.expDebt, e: data.exp, c: data.credits, need: getExpToNext(data.level), n: __N })'); w.close();
    check('DX11 долг меньше шага: гасится, остаток 2500 — в опыт 33-го; уведомление «…Долг погашен. Остаток зачислен в опыт: 2500 EXP.»', a.l === 33 && a.d === 0 && a.e === 2500 && a.c === 30000 && a.n[0] === 'Уровень понижен до 33. Долг погашен. Остаток зачислен в опыт: 2500 EXP.', JSON.stringify(a));
    check('DX12 остаток больше опыта до повышения — зачисляется на 1 меньше (11 → 10: 2100 → 1499 из 1500), уровень сразу не возвращается', b.l === 10 && b.d === 0 && b.e === b.need - 1 && b.c === 0, JSON.stringify(b));
  }

  // контур снаряжения
  {
    const eq = "['crystal_insight', 'amulet_will'].forEach(a => { if (!data.inventory.includes(a)) data.inventory.push(a); }); data.equippedArtifacts = ['crystal_insight', 'amulet_will', null, null];";
    let w = await mk(30, 4000, 30000, eq); E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const a = J(w, "({ l: data.level, eq: data.equippedArtifacts, inv: data.inventory.includes('amulet_will'), on: isArtifactEquipped('amulet_will'), n: __N, locked: eqSlots.querySelectorAll('.eq-slot.locked').length })"); w.close();
    w = await mk(10, 1200, 5000); E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const b = J(w, '({ l: data.level, n: __N })'); w.close();
    check('DX13 30 → 29: ячейка контура закрывается, артефакт — в Инвентаре и не действует; уведомление «Вместимость контура снаряжения уменьшена.»',
      a.l === 29 && a.eq[0] === 'crystal_insight' && a.eq[1] === null && a.inv && !a.on && a.n[1] === 'Вместимость контура снаряжения уменьшена.' && a.locked === 3, JSON.stringify(a));
    check('DX14 10 → 9: вместимость уменьшается и при пустой ячейке', b.l === 9 && b.n[1] === 'Вместимость контура снаряжения уменьшена.', JSON.stringify(b));
  }

  // недоступно в момент подтверждения
  {
    let w = await mk(34, 9000, 50000); E(w, 'dexAsk(); data.credits = 100; runConfirmedAction()');
    const a = E(w, 'data.level'); w.close();
    w = await mk(34, 9000, 50000); E(w, "dexAsk(); data.exam = { st: 'running', S: {} }; runConfirmedAction()");
    const b = E(w, 'data.level'); w.close();
    check('DX15 условия проверяются в момент подтверждения (кредиты потрачены, испытание началось) — шага нет', a === 34 && b === 34, a + ' / ' + b);
  }

  // повторный набор уровня — обычные награды
  {
    const w = await mk(34, 3500, 50000, 'for (const k in ARTEFACTS) if (ARTEFACTS[k].level <= 34 && !data.inventory.includes(k)) data.inventory.push(k);'); E(w, 'dexAsk(); runConfirmedAction()'); await sleep(100);
    const b0 = J(w, '({ sp: data.statPoints, bx: Object.values(data.boxes).reduce((a, v) => a + v, 0), inv: data.inventory.length })');
    E(w, 'data.exp = getExpToNext(data.level); checkLevelUp(); saveData()'); await sleep(50);
    const b1 = J(w, '({ l: data.level, sp: data.statPoints, bx: Object.values(data.boxes).reduce((a, v) => a + v, 0), inv: data.inventory.length })');
    check('DX16 уровень набран снова — очки характеристик (+5) и шкатулка снова; артефакты не дублируются', b1.l === 34 && b1.sp === b0.sp + 5 && b1.bx >= b0.bx + 1 && b1.inv === b0.inv, JSON.stringify([b0, b1]));
    w.close();
  }

  // анимация в открытом «Статусе» (в тестовом браузере анимаций нет — проверяется итог)
  {
    const w = await mk(34, 3500, 50000); E(w, "statusOverlay.style.display = 'flex'; updateStatusUI(); dexAsk(); runConfirmedAction()");
    const busy = E(w, 'dexBusy'), dis = E(w, 'dexBtn.disabled');
    await sleep(2600);
    const a = J(w, "({ busy: dexBusy, lv: stLevel.textContent, exp: stExp.textContent, debt: stDebt.style.display, n: __N.length })");
    check('DX17 открытый «Статус»: во время анимации кнопка неактивна, после — 33, «2500 / 4950 EXP», строки долга нет, уведомление', busy && dis && !a.busy && a.lv === '33' && a.exp === '2500 / 4950 EXP' && a.debt === 'none' && a.n === 1, JSON.stringify(a));
    w.close();
  }

  // Летопись: итоги месяца в две строки
  {
    const w = boot(); await sleep(250);
    const mk2 = veil => E(w, `(() => { const d = new Date(); const y = d.getFullYear(), m = d.getMonth() + 1; const k = i => y + '-' + String(m).padStart(2, '0') + '-' + String(i).padStart(2, '0');
      data.history = {}; data.history[k(1)] = { status: 'success' }; data.history[k(2)] = { status: 'penalty' }; data.history[k(3)] = { status: 'protected' }; data.history[k(4)] = { status: 'frozen' };
      if (${veil}) data.history[k(5)] = { status: 'veil' }; calViewYear = y; calViewMonth = m - 1; calRenderCalendar();
      return [...calMonthSummary.querySelectorAll('.cms-l')].map(l => l.textContent).join('|') + '#' + calMonthSummary.querySelectorAll('.cms-i').length; })()`);
    const a = mk2(false), b = mk2(true);
    check('DX18 итоги месяца: строка 1 «В этом месяце: выполнено N · штрафов N», строка 2 «под защитой N · заморожено N» (+ «· пелена покоя N»); пункты не разрываются',
      a === 'В этом месяце: выполнено 1 · штрафов 1|под защитой 1 · заморожено 1#4' && b === 'В этом месяце: выполнено 1 · штрафов 1|под защитой 1 · заморожено 1 · пелена покоя 1#5', a + ' / ' + b);
    w.close();
  }

  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
