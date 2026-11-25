// v8.1.3: Выносливость повышает цели (+0,05% за очко выше 10, до +20%) и награду (+0,1% за очко, до +40%).
// Запуск: node stamina.test.js [--system]
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const SYS_THEME = process.argv.includes('--system');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
let SEED = null;
function boot(seed) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'u'; w.scrollTo = () => {};
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      const s = seed || SEED; if (s) w.localStorage.setItem('sl_daily_v5_5_0', s);
    } });
  const w = dom.window;
  if (!SYS_THEME) w.eval("setTheme('classic')");
  w.eval(`window.__N=[]; showNotice=(m)=>window.__N.push(m);`);
  return w;
}
const E = (w, c) => w.eval(c);
{ const w0 = boot(); SEED = E(w0, `JSON.stringify(Object.assign({}, data, {level:10, exp:0, rulesAcknowledged:true, playerName:'T', lastReset: getLastResetThreshold(Date.now()), dailyTargetLevel:10, dailyNotices:{morning:true, complete:false}}))`); w0.close(); }
function fresh(extra) {
  const w = boot();
  E(w, `data.completed={}; data.isGoalMet=false; data.activeScroll=null; data.pendingScroll=null; data.curseActiveToday=false; data.pendingCurse=false;
    data.targetDiscountToday=false; data.targetDiscountRate=0; data.paceControl=false; data.paceWindow=emptyPaceWindow(); data.runUnit='steps';
    data.level=10; data.dailyTargetLevel=10; data.stats={str:10,agi:10,sta:10,int:10,per:10}; data.dailyTargetSta=10; data.activeTitle=null;
    data.expBoostToday=0; data.creditBoostToday=0; data.equippedArtifacts=[null,null,null,null]; data.fatigueOn=false; ${extra || ''}; render();`);
  return w;
}
const BTN = { pushups: [10, 5, 1] };
function add(w, id, n) { for (const v of BTN[id]) while (n >= v) { E(w, `document.querySelector('.quest-item[data-id="${id}"] .add[data-value="${v}"]').click()`); n -= v; } }
const T = (w, id) => E(w, `getDynamicTarget(${({pushups:100, steps:10000})[id]}, data.dailyTargetLevel, '${id}')`);
const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i !== undefined && !c ? '  → ' + i : ''));

// S1 цели по запомненной Выносливости (уровень 10, рост целей ×1)
{ const w = fresh(); const v = [10, 60, 210, 410, 610].map(s => { E(w, `data.dailyTargetSta=${s}`); return T(w, 'pushups'); });
  check('S1 цели: Выносливость 10/60/210/410/610 → 100/102/110/120/120 (+0,05% за очко, потолок 20%)', JSON.stringify(v) === '[100,102,110,120,120]', JSON.stringify(v));
  E(w, 'data.dailyTargetSta=410'); const st = T(w, 'steps');
  check('S1a бег: цель кратна 110 и повышена (10000 × 1,2 = 12000 → 11990)', st === 11990, st); w.close(); }
// S2 очко посреди дня целей не меняет, закрытое упражнение не открывается
{ const w = fresh(); add(w, 'pushups', 100); const c0 = E(w, 'countDoneQuests()');
  E(w, 'data.stats.sta=410; render()');
  check('S2 Выносливость посреди дня: цель прежняя (100), закрытое отжимание остаётся закрытым', T(w, 'pushups') === 100 && E(w, 'countDoneQuests()') === c0 && c0 === 1, [T(w, 'pushups'), c0]); w.close(); }
// S3 награда: опыт и кредиты закрытого упражнения
{ const r = sta => { const w = fresh(`data.stats.sta=${sta}`); const e0 = E(w, 'getDynamicExp(80, 10, "pushups")'); const c0 = E(w, 'data.credits'); add(w, 'pushups', 100); const dc = E(w, 'data.credits') - c0; w.close(); return [e0, dc]; };
  const a = r(10), b = r(410), m = r(210), x = r(810);
  check('S3 опыт: 116 → ×1,4 = 162 (Выносливость 410), ×1,2 = 139 (210), потолок +40% (810)', a[0] === 116 && b[0] === 162 && m[0] === 139 && x[0] === 162, JSON.stringify([a, m, b, x]));
  check('S3a кредиты за закрытое упражнение: 40 → 56 (410), 48 (210)', a[1] === 40 && b[1] === 56 && m[1] === 48, JSON.stringify([a[1], m[1], b[1]])); }
// S3b порядок с Силой: множители перемножаются
{ const w = fresh('data.stats.str=110; data.stats.sta=110'); const e = E(w, 'getDynamicExp(80, 10, "pushups")');
  check('S3b Сила × Выносливость: floor(80 × 1,45 × 1,15 × 1,1) = 146', e === Math.floor(80 * 1.45 * 1.15 * 1.1), e); w.close(); }
// S4 раунд Предела: без роста целей и прибавки, прежние +2% за очко
{ const w = fresh('data.stats.sta=410; data.dailyTargetSta=410; data.isGoalMet=true');
  const e = E(w, 'getDynamicExp(80, 10, "pushups")'), t = T(w, 'pushups'), k = E(w, 'staRewardMul()');
  check('S4 Предел: цель 100, множитель награды 1, опыт 80 × (1,45 + 8) = 756', t === 100 && k === 1 && e === 756, [t, k, e]); w.close(); }
// S5 Отречение
{ const w = fresh('data.stats.sta=410; data.dailyTargetSta=410; data.activeScroll="renunciation"');
  check('S5 Отречение: цель 100, опыт без Выносливости (116)', T(w, 'pushups') === 100 && E(w, 'getDynamicExp(80, 10, "pushups")') === 116, [T(w, 'pushups'), E(w, 'getDynamicExp(80, 10, "pushups")')]); w.close(); }
// S6 Бремя, Договор, руна облегчения
{ const w = fresh('data.dailyTargetSta=410'); const c = E(w, 'data.curseActiveToday=true; ' + `getDynamicTarget(100, 10, 'pushups')`);
  const k = E(w, `data.curseActiveToday=false; data.activeScroll='contract'; getDynamicTarget(100, 10, 'pushups')`);
  const r = E(w, `data.activeScroll=null; data.targetDiscountToday=true; data.targetDiscountRate=0.25; getDynamicTarget(100, 10, 'pushups')`);
  const r2 = E(w, `data.targetDiscountRate=0.45; getDynamicTarget(100, 10, 'pushups')`);
  check('S6 Бремя 120 → 168, Договор 120 → 150, руна 25% → 90, руна 45% → 66', c === 168 && k === 150 && r === 90 && r2 === 66, [c, k, r, r2]); w.close(); }
// S7 сброс дня запоминает текущую Выносливость
{ const w = fresh('data.stats.sta=210'); E(w, 'data.lastReset -= 86400000; checkMissedDays()');
  check('S7 сброс дня: запомнена Выносливость 210, цель 110', E(w, 'data.dailyTargetSta') === 210 && T(w, 'pushups') === 110, [E(w, 'data.dailyTargetSta'), T(w, 'pushups')]); w.close(); }
// S8 переход со старого сохранения: поля нет — 10 до первого сброса
{ const seed = JSON.parse(SEED); delete seed.dailyTargetSta; seed.stats = { str: 10, agi: 10, sta: 410, int: 10, per: 10 };
  const w = boot(JSON.stringify(seed));
  check('S8 старое сохранение: dailyTargetSta = 10, цель 100 при Выносливости 410', E(w, 'data.dailyTargetSta') === 10 && T(w, 'pushups') === 100, [E(w, 'data.dailyTargetSta'), T(w, 'pushups')]); w.close(); }
// S9 импорт бэкапа
{ const w = fresh(); const san = st => JSON.parse(E(w, `JSON.stringify(sanitizeImportedData({ state: ${JSON.stringify(st)}, total: {} }))`)).state;
  const base = JSON.parse(E(w, 'JSON.stringify(data)'));
  const a = san(Object.assign({}, base, { dailyTargetSta: 300 })).dailyTargetSta, b = san(Object.assign({}, base, { dailyTargetSta: 'x' })).dailyTargetSta;
  const c0 = Object.assign({}, base); delete c0.dailyTargetSta; const c = san(c0).dailyTargetSta, d = san(Object.assign({}, base, { dailyTargetSta: 3 })).dailyTargetSta;
  check('S9 импорт: 300 → 300, кривое / нет поля / 3 → 10', a === 300 && b === 10 && c === 10 && d === 10, [a, b, c, d]); w.close(); }
// S10 усталость: норма без Выносливости
{ const w = fresh('data.stats.sta=410; data.dailyTargetSta=410');
  check('S10 норма шкалы усталости — 100 (без Выносливости), облегчение 20%', E(w, 'fzNorm("pushups")') === 100 && Math.abs(E(w, 'fzSta()') - 0.2) < 1e-9, [E(w, 'fzNorm("pushups")'), E(w, 'fzSta()')]); w.close(); }
// S11 копилка ранга — настоящие повторения
{ const w = fresh('data.stats.sta=410; data.dailyTargetSta=410; data.tnMul=1; data.tn={pushups:0,squats:0,pullups:0,press:0,steps:0}'); add(w, 'pushups', 120);
  check('S11 нагрузка ранга: 120 отжиманий = 1,2 (без поправки)', Math.abs(E(w, 'data.tn.pushups') - 1.2) < 1e-9, E(w, 'data.tn.pushups')); w.close(); }
// S12 Перерождение и Скрижаль
{ const w = fresh('data.stats.sta=300; data.dailyTargetSta=300'); E(w, 'rebirthApply({})'); const a = E(w, 'data.dailyTargetSta');
  E(w, 'data.stats.sta=300; rebirthApply({stats:true})'); const b = E(w, 'data.dailyTargetSta');
  check('S12 Перерождение: характеристики оставлены — 300, сброшены — 10', a === 300 && b === 10, [a, b]); w.close(); }
{ const w = fresh('data.stats.sta=30; data.dailyTargetSta=30; data.completed={pushups:10}');
  check('S12a Скрижаль: предупреждения о целях нет', E(w, 'getUseWarning("tablet_of_reassessment")') === '', E(w, 'getUseWarning("tablet_of_reassessment")'));
  w.close(); }
// S13 тексты
{ const w = fresh();
  check('S13 описание Выносливости и глава «Характеристики» — новые тексты',
    E(w, 'STAT_LORE.sta.text').includes('С ростом Выносливости растут и цели дневного задания, но каждое выполненное упражнение приносит больше опыта и кредитов.')
    && E(w, 'CODEX_CHAPTERS.stats.content').includes('Выносливость повышает цели дневного задания и увеличивает опыт и кредиты за выполненные упражнения')
    && !/снижает повседневную нагрузку/.test(E(w, 'STAT_LORE.sta.text') + E(w, 'CODEX_CHAPTERS.stats.content'))); w.close(); }

results.forEach(r => console.log(r));
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nИтого: ${results.length - fails} OK, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
