// v7.4.0: шкала усталости и новая формула Выносливости (0,05% за очко, потолок 20% на 410).
// Запуск: node fatigue.test.js [--system]
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const SYS_THEME = process.argv.includes('--system') || process.env.SL_THEME === 'system';
const html = fs.readFileSync(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'index.html'), 'utf-8');
let SEED = null;
function boot(seed) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'u'; w.scrollTo = () => {};
      const s = seed || SEED; if (s) w.localStorage.setItem('sl_daily_v5_5_0', s);
    } });
  const w = dom.window;
  if (!SYS_THEME) w.eval("setTheme('classic')");
  w.eval(`window.__N=[]; showNotice=(m)=>window.__N.push(m);`);
  return w;
}
const E = (w, c) => w.eval(c);
{ const w0 = boot(); SEED = E(w0, `JSON.stringify(Object.assign({}, data, {level:10, exp:0, rulesAcknowledged:true, playerName:'T', lastReset: getLastResetThreshold(Date.now()), dailyTargetLevel:10, dailyNotices:{morning:true, complete:false}}))`); w0.close(); }
// Часы под управлением теста: __T — «сейчас»
function fresh(extra) {
  const w = boot();
  E(w, `window.__T = Date.now(); Date.now = () => window.__T;
    data.completed={}; data.isGoalMet=false; data.activeScroll=null; data.pendingScroll=null; data.curseActiveToday=false; data.pendingCurse=false;
    data.targetDiscountToday=false; data.targetDiscountRate=0; data.paceControl=false; data.paceWindow=emptyPaceWindow();
    data.level=10; data.dailyTargetLevel=10; data.stats.sta=10; data.fatigueOn=true; data.fatigue=emptyFatigue(); fzPopUntil=0; ${extra || ''}; render();`);
  return w;
}
const BTN = { pushups: [10, 5, 1], squats: [10, 5, 1], pullups: [10, 5, 1], press: [20, 10, 1], steps: [1000, 500, 100] };
// Внести n повторений нажатиями «+» (крупные кнопки первыми), в один момент времени
function add(w, id, n) {
  for (const v of BTN[id]) while (n >= v) { E(w, `document.querySelector('.quest-item[data-id="${id}"] .add[data-value="${v}"]').click()`); n -= v; }
}
const min = (w, m) => E(w, `window.__T += ${m * 60000}`);
const F = w => E(w, 'fzValue()');
const P = w => E(w, 'JSON.stringify([data.fatigue.fast, data.fatigue.slow])');
const N = w => E(w, 'window.__N.join(" / ")');
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6);
const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i !== undefined && !c ? '  → ' + i : ''));

// ---- эталон: движок демо 107.5 с итоговыми числами (20/80, удобные 35/40/40/45, отдых 3 мин, +25%) ----
const C = { pushups: .35, squats: .40, pullups: .40, press: .45 };
function Ref(sta) {
  const eff = Math.min(.2, Math.max(0, sta - 10) * .0005);
  const S = { fast: 0, slow: 0, t: 0, last: null, lastEnd: 0 };
  const G = (x, id) => { const c = C[id], y = Math.max(0, x - c) / (1 - c); return 25 * x * (1 + 1.5 * y * y); };
  const adv = n => { const dt = (n - S.t) / 60000; if (dt > 0) { const rk = 1 + eff; S.fast *= Math.exp(-dt * rk / 20); S.slow *= Math.exp(-dt * rk / 80); } S.t = n; };
  return { S, F: () => S.fast + S.slow, adv,
    add(id, val, n, norm) { adv(n); const st = id === 'steps'; const L0 = S.last;
      if (!(L0 && L0.id === id && n - L0.t >= 0 && n - L0.t <= 30000)) { const rest = S.lastEnd ? (n - S.lastEnd) / 60000 : 999; S.last = { id, t: n, x: 0, d: st ? .5 : Math.max(0, Math.min(1, 1 - rest / 3)) }; }
      const L = S.last, x0 = L.x; L.x += val / norm; L.t = n; S.lastEnd = n;
      let g = st ? 35 * (L.x - x0) : (G(L.x, id) - G(x0, id)) * (1 + .25 * L.d); g *= 1 - eff; g = Math.max(0, Math.min(g, 100 - S.fast - S.slow));
      const sh = st ? .5 : Math.max(0, Math.min(1, .25 + .5 * L.d)); S.slow += g * sh; S.fast += g * (1 - sh); } };
}
// Сценарий демо: по каждому силовому упражнению n подходов с отдыхом rest мин (1 мин — сам подход)
function scen(w, n, rest, mult) {
  const ids = ['pushups', 'squats', 'pullups', 'press']; let peak = 0;
  const R = Ref(E(w, 'data.stats.sta')), t0 = E(w, '__T');
  ids.forEach(id => { const norm = E(w, `fzNorm('${id}')`), per = Math.ceil(norm * (mult || 1) / n);
    for (let i = 0; i < n; i++) { min(w, 1); E(w, 'data.completed={}'); add(w, id, per); R.add(id, per, E(w, '__T') - t0, norm); peak = Math.max(peak, F(w)); min(w, rest); } });
  return { peak, ref: R };
}

(async () => {
// ===== 1. Выносливость: цели заданий =====
{ const w = fresh();
  const t = s => E(w, `data.stats.sta=${s}; getDynamicTarget(100, 10, 'pushups')`);
  const r = [10, 110, 210, 310, 410, 610].map(t);
  check('S1 цели: 0,05% за очко — 110 → −5%, 210 → −10%, 310 → −15%, 410 и выше → −20%', JSON.stringify(r) === '[100,95,90,85,80,80]', JSON.stringify(r));
  const tr = E(w, `data.stats.sta=410; data.activeScroll='renunciation'; getDynamicTarget(100, 10, 'pushups')`);
  check('S2 Отречение отключает снижение целей', tr === 100, tr);
  const cb = E(w, `data.activeScroll=null; data.stats.sta=410; data.targetDiscountToday=true; data.targetDiscountRate=0.45; getDynamicTarget(100, 10, 'pushups')`);
  check('S3 с руной общий потолок снижения — 60%', cb === 40, cb);
  const ef = [10, 210, 410, 610].map(s => E(w, `data.stats.sta=${s}; fzSta()`));
  check('S4 усталость: эффект Выносливости 0 / 10% / 20% / 20%', JSON.stringify(ef.map(x => +x.toFixed(4))) === '[0,0.1,0.2,0.2]', JSON.stringify(ef)); }

// ===== 2. Подход =====
{ const w = fresh(); add(w, 'pushups', 35);
  const [fa, sl] = JSON.parse(P(w));
  check('F1 удобный подход (35 отжиманий при норме 100): 25·0,35 = 8,75, в накопленную 25%', near(fa + sl, 8.75) && near(sl, 8.75 * .25), P(w));
  const w2 = fresh(); add(w2, 'pushups', 70);
  const y = (0.7 - .35) / .65, g = 25 * .7 * (1 + 1.5 * y * y);
  check('F2 большой подход: надбавка 1,5·y²', near(F(w2), g), F(w2) + ' / ' + g); }
{ const w = fresh(); add(w, 'pushups', 10); E(w, '__T += 20000'); add(w, 'pushups', 10); E(w, '__T += 25000'); add(w, 'pushups', 10);
  const R = Ref(10); R.add('pushups', 10, 0, 100); R.add('pushups', 10, 20000, 100); R.add('pushups', 10, 45000, 100);
  check('F3 склейка: нажатия по одному упражнению с паузами до 30 с — один подход', near(F(w), R.F(), 1e-9) && near(E(w, 'data.fatigue.last.x'), 0.3) && E(w, 'data.fatigue.last.d') === 0, F(w) + ' / ' + R.F()); }
{ const w = fresh(); add(w, 'pushups', 10); E(w, '__T += 31000'); add(w, 'pushups', 10);
  check('F4 пауза больше 30 с — новый подход (с надбавкой за короткий отдых)', near(E(w, 'data.fatigue.last.x'), .1) && E(w, 'data.fatigue.last.d') > 0.8, E(w, 'JSON.stringify(data.fatigue.last)')); }
{ const w = fresh(); add(w, 'pushups', 10); add(w, 'squats', 10);
  check('F5 другое упражнение сразу — новый подход', E(w, "data.fatigue.last.id") === 'squats' && near(E(w, 'data.fatigue.last.x'), 10 / 120)); }
{ // надбавка за короткий отдых: отдых 1 мин → d = 2/3, ×(1 + 0,25·2/3), в накопленную 25% + 50%·d
  const w = fresh(); add(w, 'pushups', 35); const f0 = JSON.parse(P(w)); min(w, 1); const dec = JSON.parse(E(w, 'fzAdvance(); JSON.stringify([data.fatigue.fast, data.fatigue.slow])'));
  add(w, 'squats', 48); const f1 = JSON.parse(P(w));
  const d = 2 / 3, g = 25 * .4 * (1 + .25 * d), sh = .25 + .5 * d;
  check('F6 отдых 1 мин: усталость ×(1 + 0,25·d), доля в накопленную 25% + 50%·d', near(f1[1] - dec[1], g * sh, 1e-6) && near(f1[0] - dec[0], g * (1 - sh), 1e-6), JSON.stringify([f1, dec, g, sh]));
  const w2 = fresh(); add(w2, 'pushups', 35); min(w2, 3); add(w2, 'squats', 48);
  check('F7 отдых 3 мин и больше — без надбавки', near(E(w2, 'data.fatigue.last.d'), 0)); }
{ const w = fresh(); add(w, 'steps', 1000);
  const [fa, sl] = JSON.parse(P(w));
  check('F8 шаги: 35·x, пополам в обе части, без надбавки за размер', near(fa, 1.75) && near(sl, 1.75), P(w));
  const w2 = fresh(); add(w2, 'steps', 7000);
  check('F9 шаги — без предупреждения о большом подходе', !N(w2).includes('перегрузка'), N(w2)); }

// ===== 3. Спад, закрытое приложение, часы назад, потолок =====
{ const w = fresh(); add(w, 'pushups', 35); const [fa, sl] = JSON.parse(P(w)); min(w, 20); E(w, 'fzTick()');
  const [fa2, sl2] = JSON.parse(P(w));
  check('D1 спад: за 20 мин свежей остаётся треть (e⁻¹), за 80 мин — накопленной', near(fa2, fa * Math.exp(-1)) && near(sl2, sl * Math.exp(-0.25)), P(w));
  min(w, -30); const v = F(w); E(w, 'fzTick()');
  check('D2 часы ушли назад — усталость не меняется', near(F(w), v)); }
{ const w = fresh(); add(w, 'pushups', 35); const v0 = F(w); E(w, 'saveData()');
  const saved = E(w, "localStorage.getItem('sl_daily_v5_5_0')"); const T = E(w, '__T');
  const w2 = boot(saved); E(w2, `window.__T = ${T + 80 * 60000}; Date.now = () => window.__T; fzTick();`);
  const [fa, sl] = [v0 * .75 * Math.exp(-4), v0 * .25 * Math.exp(-1)];
  check('D3 спад идёт и пока приложение закрыто (по часам)', near(F(w2), fa + sl, 1e-6), F(w2) + ' / ' + (fa + sl)); }
{ const w = fresh(); for (let i = 0; i < 6; i++) { E(w, 'data.completed={}; render()'); add(w, 'pushups', 100); }
  check('D4 потолок 100', near(F(w), 100, 1e-9) && F(w) <= 100, F(w)); }
{ const w = fresh(); add(w, 'pushups', 35); const v = F(w); E(w, 'forceFullResetAction()');
  check('D5 суточный сброс усталость не обнуляет', near(F(w), v, 1e-6), F(w)); }

// ===== 4. Сценарии демо 107.5 (Выносливость 10) — те же числа =====
{ const r = [];
  const cases = [['плотно (4 подхода, отдых 1 мин)', 4, 1, 70], ['обычно (4 подхода, 2 мин)', 4, 2, 50], ['по 2 подхода', 2, 2, 72], ['всё одним подходом', 1, 2, 100]];
  cases.forEach(([nm, n, rest, exp]) => { const w = fresh(); const s = scen(w, n, rest); r.push([nm, Math.round(s.peak), exp, Math.abs(F(w) - s.ref.F())]); });
  check('SC1 пики как в демо: 70 / 50 / 72 / 100', r.every(x => x[1] === x[2] && x[3] < 1e-6), JSON.stringify(r)); }
{ const w = fresh('data.stats.sta=210'); const s = scen(w, 4, 1); const w2 = fresh('data.stats.sta=410'); const s2 = scen(w2, 4, 1);
  const s0 = scen(fresh(), 4, 1);
  check('SC2 Выносливость 210 / 410: плотная тренировка легче (≈62 / ≈52 против 70) и совпадает с эталоном', s0.peak > s.peak && s.peak > s2.peak && Math.round(s.peak) === 62 && Math.round(s2.peak) === 52 && Math.abs(F(w) - s.ref.F()) < 1e-6 && Math.abs(F(w2) - s2.ref.F()) < 1e-6, [s0.peak, s.peak, s2.peak]);
  const rec = sta => { const w = fresh('data.stats.sta=' + sta); add(w, 'pushups', 35); const v0 = F(w); min(w, 20); E(w, 'fzTick()'); return F(w) / v0; };
  const r10 = rec(10), r610 = rec(610), r410 = rec(410);
  check('SC3 восстановление: на 410 и 610 одинаково быстрее, чем на 10', r410 < r10 && near(r410, r610), [r10, r410, r610]); }

// ===== 5. Пороги и предупреждения =====
{ const w = fresh(); E(w, 'data.fatigue.slow = 69'); add(w, 'pushups', 10);
  check('T1 70: «Зафиксирована высокая нагрузка…» — один раз', N(w) === 'Зафиксирована высокая нагрузка. Требуется время на восстановление сил Игрока.', N(w));
  E(w, 'window.__N=[]'); add(w, 'squats', 10);
  check('T2 выше 70 — без повтора', N(w) === '', N(w));
  E(w, 'data.fatigue.slow = 99; data.fatigue.fast = 0; window.__N=[]'); add(w, 'pullups', 10);
  check('T3 100: «Усталость достигла критической отметки…»', N(w).includes('Усталость достигла критической отметки. Система настоятельно рекомендует отдых.'), N(w));
  check('T4 у 100 и у большого подхода — оранжевый сбой', E(w, 'notificationGlitchKind(FZ_T100)') === 'pace' && E(w, 'notificationGlitchKind(FZ_TBIG)') === 'pace' && E(w, 'notificationGlitchKind(FZ_T70)') === null);
  E(w, 'window.__N=[]; data.fatigue.slow = 55; data.fatigue.fast = 0; fzTick()'); add(w, 'press', 1);
  check('T5 после спада до 55 (не ниже 50) — без повтора', N(w) === '', N(w));
  E(w, 'data.fatigue.slow = 40; fzTick(); data.fatigue.slow = 75; window.__N=[]'); add(w, 'press', 1);
  check('T6 после спада ниже 50 предупреждение 70 снова', N(w).includes('высокая нагрузка'), N(w)); }
{ const w = fresh(); add(w, 'pushups', 50); add(w, 'pushups', 5);
  check('T7 подход до 55% — без предупреждения о перегрузке', !N(w).includes('перегрузка'), N(w));
  add(w, 'pushups', 5);
  check('T8 подход дошёл до 60% — «Зафиксирована перегрузка…» один раз', N(w) === 'Зафиксирована перегрузка: объём одного подхода превышает рекомендуемый.', N(w));
  add(w, 'pushups', 10);
  check('T9 дальше в том же подходе — без повтора', N(w) === 'Зафиксирована перегрузка: объём одного подхода превышает рекомендуемый.', N(w)); }
{ const w = fresh(); add(w, 'pushups', 35); const ds = E(w, 'Object.keys(data.history).length');
  check('T10 в Летопись ничего не пишется, задание не блокируется', E(w, 'Object.keys(data.history).length') === ds && E(w, 'data.completed.pushups') === 35); }

// ===== 6. Что считается подходом =====
{ const w = fresh('data.paceControl = true'); add(w, 'pushups', 100); add(w, 'squats', 30); const v = F(w), c = E(w, 'data.completed.squats || 0');
  add(w, 'squats', 10); const v2 = F(w);
  check('P1 нажатие, отклонённое контролем темпа, усталость не добавляет', near(v, v2) && E(w, 'data.completed.squats || 0') === c && v > 0, [v, v2]); }
{ const w = fresh('data.activeScroll = "freeze"; data.freezeEndTimestamp = Date.now() + 86400000'); add(w, 'pushups', 10);
  check('P2 во время Заморозки нажатия не засчитываются — и усталости нет', F(w) === 0); }
{ const w = fresh(); ['pushups', 'squats', 'pullups', 'press', 'steps'].forEach(id => E(w, `data.completed['${id}'] = getDynamicTarget(${'{"pushups":100,"squats":120,"pullups":40,"press":100,"steps":10000}'}['${id}'], data.dailyTargetLevel, '${id}')`));
  E(w, 'render(); data.limitBreaksToday = 0'); E(w, "showConfirm = (m, ok) => ok(); document.getElementById('limitBreakBtn').disabled = false; document.getElementById('limitBreakBtn').onclick()");
  const lb = E(w, 'data.isGoalMet'); add(w, 'pushups', 35);
  check('P3 раунд Преодоления предела — подходы считаются', lb && near(F(w), 8.75), F(w)); }

// ===== 7. Шкала на экране и в «Статусе» =====
{ const w = fresh(); const z = () => E(w, "document.getElementById('fzBar').className");
  check('V1 без нагрузки шкала скрыта', !z().split(' ').includes('on'), z());
  add(w, 'pushups', 10);
  check('V2 после внесения ниже 70 — показана', z().split(' ').includes('on'), z());
  E(w, '__T += 4100; fzTick()');
  check('V3 через 4 с — скрыта', !z().split(' ').includes('on'), z());
  E(w, 'data.fatigue.slow = 75; fzTick()');
  check('V4 от 70 — видна постоянно, без пульсации', z().split(' ').includes('on') && !z().split(' ').includes('pulse'), z());
  E(w, 'data.fatigue.slow = 92; fzTick()');
  check('V5 от 90 — пульсация', z().split(' ').includes('pulse'), z());
  const col = E(w, "getComputedStyle(document.getElementById('fzBar')).getPropertyValue('--fc') || document.getElementById('fzBar').style.getPropertyValue('--fc')");
  check('V6 цвет плавный: 92 — между оранжевым и красным', col === E(w, 'fzColor(fzValue())') && E(w, 'fzColor(0)') === 'rgb(64,192,255)' && E(w, 'fzColor(70)') === 'rgb(255,196,77)' && E(w, 'fzColor(100)') === 'rgb(255,68,85)', col);
  E(w, "document.getElementById('statusOverlay').style.display = 'flex'; AnimPause.update()");
  check('V7 под открытым окном — скрыта, пульсация на паузе', !z().split(' ').includes('on') && z().split(' ').includes('anim-paused'), z());
  const st = E(w, "document.querySelector('#fzStatus .fz-v').textContent"), sd = E(w, "document.getElementById('fzStatus').style.display");
  check('V8 «Статус»: блок виден, значение в процентах слева от шкалы', st === Math.round(E(w, 'fzValue()')) + '%' && sd !== 'none' && E(w, "document.querySelector('#fzStatus .fz-v').nextElementSibling.className") === 'fz-cap', st);
  E(w, "document.getElementById('statusOverlay').style.display = 'none'; AnimPause.update()");
  check('V9 окно закрыто — шкала снова видна', z().split(' ').includes('on') && !z().split(' ').includes('anim-paused'), z());
  const ord = E(w, "Array.from(document.querySelectorAll('#statusOverlay .st-sec')).map(s => s.id || (s.querySelector('.st-grid') ? 'stats' : s.querySelector('#stExp') ? 'exp' : 'x')).join(',')");
  check('V10 блок в «Статусе» — после карточки игрока и опыта, перед характеристиками', ord.startsWith('exp,fzStatus,stats'), ord);
  check('V11 подпись «Усталость», без чисел на главном экране', E(w, "document.querySelector('#fzBar .fz-l').textContent") === 'Усталость' && !/\d/.test(E(w, "document.getElementById('fzBar').textContent")));
  check('V12 пульсация замирает под .anim-paused (общее правило)', /\.anim-paused \*::after/.test(html) && /animation: fzBreath 1\.2s/.test(html));
  check('V13 шкала — неподвижный слой вне главного экрана', E(w, "getComputedStyle(document.getElementById('fzBar')).position") === 'fixed' && E(w, "!document.getElementById('fzBar').closest('.system-container')")); }

// ===== 8. Длань, бэкап, старое сохранение =====
{ const w = fresh(); add(w, 'pushups', 35); E(w, 'data.fatigue.slow = 80; fzTick(); toggleFatigue()');
  check('A1 выключение: усталость 0, шкала и блок «Статуса» скрыты', F(w) === 0 && !E(w, "document.getElementById('fzBar').classList.contains('on')") && E(w, "document.getElementById('fzStatus').style.display") === 'none' && E(w, 'data.fatigueOn') === false);
  E(w, 'window.__N=[]'); add(w, 'squats', 100);
  check('A2 выключено: подходы не копятся, уведомлений нет', F(w) === 0 && N(w) === '', N(w));
  E(w, 'toggleFatigue()'); E(w, 'data.completed={}'); add(w, 'squats', 10);
  check('A3 снова включено — считает с нуля', E(w, 'data.fatigueOn') === true && F(w) > 0 && F(w) < 5);
  E(w, 'resetFatigueAction()');
  check('A4 «Сбросить усталость»', F(w) === 0 && E(w, 'data.fatigueOn') === true);
  const sec = E(w, "Array.from(document.querySelectorAll('#sysToolsOverlay .backup-section-title')).map(t => t.textContent).join('|')");
  check('A5 Длань: раздел «Шкала усталости» после «Контроля темпа», перед «Сбросами»', /Контроль темпа\|Шкала усталости\|Сбросы/.test(sec), sec);
  E(w, 'syncFatigueCheckbox()');
  check('A6 галочка и подпись', E(w, "document.getElementById('fatigueCheckbox').classList.contains('on')") && E(w, "document.getElementById('fatigueLabel').textContent") === 'Шкала: включена.'); }
{ const w = fresh(); add(w, 'pushups', 50);
  const s = E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign({}, data, { fatigueOn: false, fatigue: { fast: 50, slow: 30, t: Date.now() } }), total: totalStats }).state || sanitizeImportedData({ state: Object.assign({}, data, { fatigueOn: false }) }))`);
  const o = JSON.parse(s);
  check('B1 бэкап: усталость с нуля, переключатель — из копии', o.fatigueOn === false && o.fatigue && o.fatigue.fast === 0 && o.fatigue.slow === 0, s.slice(0, 200)); }
{ const w0 = boot(); const old = JSON.parse(SEED); delete old.fatigue; delete old.fatigueOn; w0.close();
  const w = boot(JSON.stringify(old));
  check('B2 старое сохранение: шкала включена, усталость 0', E(w, 'data.fatigueOn') === true && E(w, 'fzValue()') === 0 && E(w, 'typeof data.fatigue.t') === 'number');
  const bad = JSON.parse(SEED); bad.fatigue = { fast: 'x', slow: 500, t: Date.now() + 1e9, last: { id: 'zzz' } }; const w2 = boot(JSON.stringify(bad));
  check('B3 испорченные данные — в пределах', E(w2, 'fzValue()') <= 100 && E(w2, 'data.fatigue.last') === null && E(w2, 'data.fatigue.t') <= Date.now()); }

// ===== 9. Тексты =====
{ const w = fresh();
  check('X1 глава «Характеристики»', E(w, 'CODEX_CHAPTERS.stats.content').includes('Выносливость снижает повседневную нагрузку, увеличивает опыт при превышении задания, облегчает усталость и ускоряет восстановление.'));
  check('X2 описание Выносливости', E(w, 'STAT_LORE.sta.text').includes('Выносливость снижает повседневную нагрузку заданий, облегчает усталость и ускоряет восстановление, а также заметно увеличивает опыт, если Игрок решается преодолеть предел.'));
  check('X3 главы «Усталость» нет', E(w, '!Object.keys(CODEX_CHAPTERS).some(k => /fatigue|ustal/i.test(k))')); }

const fails = results.filter(r => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(`\nfatigue.test.js${SYS_THEME ? ' --system' : ''}: ${results.length - fails.length}/${results.length}`);
process.exit(fails.length ? 1 : 0);
})();
