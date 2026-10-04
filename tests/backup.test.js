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
const freshB = s => { const w = fresh(s); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; return w; };   // в настоящих браузерах есть всегда, в jsdom — нет
(async () => {
// ===== v6.10.3: счётчик бусины при полном запасе =====
{ const w = fresh('data.level = 45; data.consumables.bone_bead = 3; data.beadStreak = 1;'); complete(w); await sleep(4700);
  check('F1 запас 3: выполненный день счётчик не двигает и держит на нуле, бусины нет', E(w, 'data.beadStreak') === 0 && E(w, 'data.consumables.bone_bead') === 3 && !N(w).includes('Костяная бусина')); }
{ const w = fresh('data.level = 45; data.consumables.bone_bead = 3; data.beadStreak = 0;');
  complete(w); reset(w); E(w, 'data.consumables.bone_bead = 2');
  complete(w); const a = E(w, 'data.consumables.bone_bead'), s1 = E(w, 'data.beadStreak'); reset(w);
  complete(w);
  check('F2 A-ранг: после траты снова полный порог (2 дня)', a === 2 && s1 === 1 && E(w, 'data.consumables.bone_bead') === 3, `${a}/${s1}/${E(w, 'data.consumables.bone_bead')}`); }
{ const w = fresh();
  const r = J(w, `(() => { data.level = 100; data.consumables.bone_bead = 3; data.beadStreak = 0; data.activeScroll = null;
    const full = [1, 2, 3].map(() => grantBoneBead() || data.beadStreak);
    data.consumables.bone_bead = 2; let n = 1; while (!grantBoneBead()) n++; return { full, n }; })()`);
  check('F3 Монарх: при полном запасе счётчик стоит, после траты — 5 дней', r === JSON.stringify({ full: [0, 0, 0], n: 5 }), r); }
{ const w = fresh('data.level = 45; data.consumables.bone_bead = 1; data.beadStreak = 1;');
  E(w, "devAddItem('bone_bead'); devAddItem('bone_bead')"); await sleep(900); E(w, "flashThenRun && 0"); E(w, 'data.consumables.bone_bead = 3'); complete(w);
  check('F4 запас стал 3 через Длань при набранном счётчике — на ближайшем выполненном дне счётчик обнуляется', E(w, 'data.beadStreak') === 0 && E(w, 'data.consumables.bone_bead') === 3); }
// ===== v6.10.3: подписанный бэкап .slbackup =====
const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8');
{ const w = freshB('data.level = 37; data.credits = 1234;');
  const code = E(w, 'buildSignedBackupCode()');
  const inner = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  check('K1 код бэкапа: base64 от {fmt, payload, sig}, payload — данные, подпись совпадает', inner.fmt === 'slb1' && JSON.parse(inner.payload).state.level === 37 && inner.sig === E(w, `backupSigOf(${JSON.stringify(inner.payload)})`) && /^[0-9a-f]{28}$/.test(inner.sig), inner.sig);
  check('K2 файл и код — одно и то же; имя .slbackup', /new Blob\(\[buildSignedBackupCode\(\)\]/.test(html) && /const base64Code = buildSignedBackupCode\(\);/.test(html) && /\.slbackup`;/.test(html) && E(w, 'buildBackupFilename()').endsWith('.slbackup'));
  check('K3 подписанный бэкап разбирается в те же данные', J(w, `parseBackupText(${JSON.stringify(code)}).state.credits`) === '1234');
  const tampered = Buffer.from(JSON.stringify(Object.assign({}, inner, { payload: inner.payload.replace('"level":37', '"level":99') })), 'utf8').toString('base64');
  check('K4 подменённая цифра при прежней подписи — отказ', E(w, `parseBackupText(${JSON.stringify(tampered)}) === null`) && inner.payload.includes('"level":37'));
  const unsigned = Buffer.from(inner.payload, 'utf8').toString('base64');   // подпись снята, остались голые данные
  check('K5 подпись снята: до 5.11.2026 принимается как старый', E(w, `parseBackupText(${JSON.stringify(unsigned)}).state.level`) === 37);
  const legacyJson = inner.payload, legacyPretty = JSON.stringify(JSON.parse(inner.payload), null, 2);
  check('K6 старые .json (в том числе с отступами) и старые коды — принимаются молча до 5.11.2026', E(w, `parseBackupText(${JSON.stringify(legacyPretty)}).state.level`) === 37 && E(w, `parseBackupText(${JSON.stringify(legacyJson)}).state.level`) === 37);
  E(w, `window.__realNow = Date.now; Date.now = () => new Date(2026, 10, 5, 23, 59).getTime();`);
  check('K7 5 ноября 23:59 — старый ещё принимается', E(w, `parseBackupText(${JSON.stringify(legacyPretty)}) !== null`));
  E(w, `Date.now = () => new Date(2026, 10, 6, 0, 1).getTime();`);
  check('K8 с 6 ноября — старые и снятая подпись: отказ; подписанный — принимается', E(w, `parseBackupText(${JSON.stringify(legacyPretty)}) === null && parseBackupText(${JSON.stringify(unsigned)}) === null && parseBackupText(${JSON.stringify(code)}) !== null`));
  E(w, `Date.now = window.__realNow;`);
  check('K9 мусор и испорченный base64 — отказ', E(w, `parseBackupText('привет') === null && parseBackupText('@@@###') === null && parseBackupText('') === null && parseBackupText(${JSON.stringify(code.slice(0, -12))}) === null`));
  check('K10 выбор файла: .slbackup и .json', /accept="\.slbackup,\.json,/.test(html));
  // вставка кода и выбор файла — через настоящие обработчики
  E(w, `backupModalStep = 'importCodeInput'; renderBackupModal(); document.getElementById('importCodeInputField').value = ${JSON.stringify(code)}; submitImportCode();`);
  check('K11 вставка подписанного кода — переход к подтверждению импорта', E(w, 'backupModalStep') === 'importConfirm' && E(w, 'pendingImport && pendingImport.state.level') === 37);
  E(w, `window.__N = []; pendingImport = null; backupModalStep = 'importCodeInput'; renderBackupModal(); document.getElementById('importCodeInputField').value = ${JSON.stringify(tampered)}; submitImportCode();`);
  check('K12 вставка подменённого кода — отказ с прежним текстом', E(w, 'pendingImport') === null && N(w).includes('Ошибка: неверный код бэкапа или данные повреждены.'), N(w));
  E(w, `window.__N = []; pendingImport = null; handleBackupFileSelected({ target: { files: [new File([${JSON.stringify(code)}], 'b.slbackup')], value: '' } });`);
  await sleep(100);
  check('K13 файл .slbackup — принимается', E(w, 'pendingImport && pendingImport.state.level') === 37);
  E(w, `window.__N = []; pendingImport = null; handleBackupFileSelected({ target: { files: [new File([${JSON.stringify(tampered)}], 'b.slbackup')], value: '' } });`);
  await sleep(100);
  check('K14 изменённый файл — отказ с прежним текстом', E(w, 'pendingImport') === null && N(w).includes('Ошибка: файл повреждён или это не бэкап этого приложения.'), N(w));
  E(w, `window.__N = []; pendingImport = null; handleBackupFileSelected({ target: { files: [new File([${JSON.stringify(legacyPretty)}], 'old.json')], value: '' } });`);
  await sleep(100);
  check('K15 старый файл .json — принимается молча', E(w, 'pendingImport && pendingImport.state.level') === 37 && !N(w)); }
console.log(results.join('\n'));
console.log(`Итого: ${results.filter(r => r.startsWith('OK')).length} OK, ${results.filter(r => r.startsWith('FAIL')).length} FAIL`);
process.exit(0);
})();
