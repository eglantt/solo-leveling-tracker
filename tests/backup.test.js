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

// ===== v6.10.4: Длань — опыт, кредиты, уровень =====
{ const w = freshB('data.level = 20; data.exp = 1500; data.expDebt = 0; data.credits = 500; data.totalPenalties = 2; data.consecutiveDays = 7; data.beadStreak = 1;');
  const D = w.document;
  const run = (fn, field, v) => { D.getElementById(field).value = String(v); E(w, fn + '(); updateSysCurrent()'); };
  run('subExpAction', 'sysExpInput', 1000);
  check('Y1 отнять EXP 1000 при 1500 → 500; уровень, долг, штрафы, серия, счётчик бусины — без изменений',
    E(w, 'data.exp') === 500 && E(w, 'data.level') === 20 && E(w, 'data.expDebt') === 0 && E(w, 'data.totalPenalties') === 2 && E(w, 'data.consecutiveDays') === 7 && E(w, 'data.beadStreak') === 1);
  E(w, 'data.exp = 300'); run('subExpAction', 'sysExpInput', -1000);
  check('Y2 отнять EXP «−1000» при 300 → 0, долг не создаётся', E(w, 'data.exp') === 0 && E(w, 'data.expDebt') === 0);
  E(w, 'data.exp = 0; data.expDebt = 300'); run('addExpAction', 'sysExpInput', 1000);
  check('Y3 добавить EXP при долге 300: +1000 → долг 0, опыт +700', E(w, 'data.expDebt') === 0 && E(w, 'data.exp') === 700);
  E(w, 'data.exp = 0; data.expDebt = 300'); run('addExpAction', 'sysExpInput', -200);
  check('Y4 добавить EXP «−200» при долге 300 → долг 100, опыт 0 (знак не учитывается)', E(w, 'data.expDebt') === 100 && E(w, 'data.exp') === 0);
  E(w, 'data.expDebt = 0; data.exp = 0; data.level = 20'); run('addExpAction', 'sysExpInput', E(w, 'getExpToNext(20)') + 5);
  check('Y5 добавить EXP поднимает уровень', E(w, 'data.level') === 21);
  E(w, 'data.credits = 500'); run('subCreditsAction', 'sysCreditsInput', 300);
  const c1 = E(w, 'data.credits'); E(w, 'data.credits = 100'); run('subCreditsAction', 'sysCreditsInput', -300);
  const c2 = E(w, 'data.credits'); run('addCreditsAction', 'sysCreditsInput', -250);
  check('Y6 кредиты: отнять 300 при 500 → 200, при 100 → 0, добавить «−250» → +250', c1 === 200 && c2 === 0 && E(w, 'data.credits') === 250, `${c1}/${c2}/${E(w, 'data.credits')}`);
  const before = E(w, 'JSON.stringify([data.exp, data.credits, data.level])');
  D.getElementById('sysExpInput').value = ''; D.getElementById('sysCreditsInput').value = 'abc';
  E(w, 'subExpAction(); addExpAction(); subCreditsAction(); addCreditsAction()');
  check('Y7 пустое поле и не-число — ничего не происходит', E(w, 'JSON.stringify([data.exp, data.credits, data.level])') === before);
  E(w, 'data.level = 37; data.exp = 980; data.expDebt = 0; data.credits = 8420; updateSysCurrent()');
  check('Y8 строки: опыт как в шапке, уровень, баланс со значком', D.getElementById('sysExpNow').textContent === `980 / ${E(w, 'getExpToNext(37)')} EXP`
    && D.getElementById('sysLevelNow').textContent === 'Уровень 37' && D.getElementById('sysCreditsNow').textContent.trim().startsWith('8420') && !!D.querySelector('#sysCreditsNow .cr-ic'));
  E(w, 'data.expDebt = 450; updateSysCurrent()');
  check('Y9 строка опыта при долге — как в шапке', D.getElementById('sysExpNow').textContent === 'Долг −450 EXP');
  E(w, 'data.expDebt = 0');
  const btns = [...D.querySelectorAll('.sys-btn-pair')].map(r => [...r.querySelectorAll('button')].map(b => b.textContent.trim()).join(' | '));
  check('Y10 пары кнопок в одну строку: «Отнять EXP | Добавить EXP», «Отнять ◈ | Добавить ◈» (значок кредитов)',
    btns[0] === 'Отнять EXP | Добавить EXP' && btns[1] === 'Отнять | Добавить' && D.querySelectorAll('.sys-btn-pair')[1].querySelectorAll('.cr-ic').length === 2
    && w.getComputedStyle(D.querySelector('.sys-btn-pair')).display === 'flex' && /\.sys-btn-pair \.backup-action-btn \{ flex: 1 1 0; min-width: 0; white-space: nowrap;/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('')), btns.join(' // '));
  E(w, `sysToolsAuthorized = true; document.getElementById('sysLevelInput').value = '12'; window.__btn = document.createElement('button'); sysToolsFlashThenRun(window.__btn, setLevelAction)`);
  await sleep(500);
  check('Y11 после «Установить уровень» строки обновились', E(w, 'data.level') === 12 && D.getElementById('sysLevelNow').textContent === 'Уровень 12'); }

// ===== v6.10.5: строки Длани — по правому краю, цвета как в шапке =====
{ const w = freshB('data.level = 37; data.exp = 980; data.expDebt = 0; data.credits = 8420;'); const D = w.document, cs = el => w.getComputedStyle(el);
  E(w, 'updateSysCurrent()');
  const rgb = el => cs(el).color.replace(/\s/g, '');
  check('Z1 строки по правому краю', ['sysExpNow', 'sysLevelNow', 'sysCreditsNow'].every(id => cs(D.getElementById(id)).textAlign === 'right'));
  check('Z2 опыт — мятный, кредиты — золотые', ['#88ffcc', 'rgb(136,255,204)'].includes(rgb(D.querySelector('#sysExpNow .sv'))) && ['#ffd700', 'rgb(255,215,0)'].includes(rgb(D.querySelector('#sysCreditsNow .sv'))));
  E(w, 'data.expDebt = 450; updateSysCurrent()');
  check('Z3 долг — красный', ['#ff5555', 'rgb(255,85,85)'].includes(rgb(D.querySelector('#sysExpNow .sv'))) && D.querySelector('#sysExpNow .sv').textContent === 'Долг −450 EXP');
  E(w, 'data.expDebt = 0');
  const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const want = { 9: 'e', 10: 'd', 19: 'd', 20: 'c', 29: 'c', 30: 'b', 39: 'b', 40: 'a', 49: 'a', 50: 's', 59: 's', 60: 'national', 79: 'national', 80: 'sss', 99: 'sss', 100: 'monarch' };
  const bad = Object.entries(want).filter(([lv, rk]) => { E(w, `data.level = ${lv}; updateSysCurrent()`); const v = D.querySelector('#sysLevelNow .sv.lvl'); return !v || !v.classList.contains('rk-' + rk) || v.textContent !== String(lv); }).map(x => x[0]);
  check('Z4 уровень — в цвет ранга на всех границах, цвет только у числа', bad.length === 0 && D.querySelector('#sysLevelNow .sl').textContent === 'Уровень' && /\.sys-current \.sv\.lvl \{ color: var\(--rk\); \}/.test(css) && /\.sys-current \.sl \{[^}]*color: #88ddff;/.test(css), bad.join(','));
  E(w, `sysToolsAuthorized = true; data.level = 49; document.getElementById('sysLevelInput').value = '50'; sysToolsFlashThenRun(document.createElement('button'), setLevelAction)`);
  await sleep(500);
  check('Z5 после «Установить уровень» число перекрашено в новый ранг', D.querySelector('#sysLevelNow .sv.lvl').classList.contains('rk-s') && D.querySelector('#sysLevelNow .sv.lvl').textContent === '50'); }

// ===== v6.10.7: Архив — «Настройки» после «Уведомлений», перед «Экспортом» =====
{ const w = freshB('data.soundEnabled = true; data.notificationsEnabled = true;'); const D = w.document;
  E(w, "backupModalStep = 'main'; renderBackupModal()");
  const titles = [...D.querySelectorAll('#backupOverlay .backup-section-title, .backup-section-title')].map(t => t.textContent.trim());
  const arch = titles.slice(titles.indexOf('Версия'));
  const want = ['Версия', 'Правила', 'Игрок', 'Уведомления', 'Настройки', 'Экспорт', 'Импорт', 'Опасная зона'];
  check('A1 порядок разделов Архива', JSON.stringify(arch.slice(0, 8)) === JSON.stringify(want), arch.join(' | '));
  check('A2 раздел «Настройки» ровно один', titles.filter(t => t === 'Настройки').length === 1);
  const rows = () => [...D.querySelectorAll('.backup-section')].find(sec => sec.querySelector('.backup-section-title') && sec.querySelector('.backup-section-title').textContent.trim() === 'Настройки');
  const txt = () => [...rows().querySelectorAll('.backup-summary span')].map(x => x.textContent).join(' | ');
  const t0 = txt();
  E(w, 'toggleSound()'); const t1 = txt(); const snd = E(w, 'data.soundEnabled');
  E(w, 'toggleNotifications()'); const t2 = txt(); const ntf = E(w, 'data.notificationsEnabled');
  check('A3 галочки «Настроек» работают и меняют текст', t0 === 'Звуковые сигналы Системы: включены. | Уведомления Системы: включены. | Оформление Системы: выключено.' && snd === false && t1.startsWith('Звуковые сигналы Системы: выключены.')
    && ntf === false && t2.includes('Уведомления Системы: выключены.'), `${t0} → ${t1} → ${t2}`); }

// ===== v6.11.0: уведомление в оформлении Системы =====
{ const w0 = freshB('');
  check('N1 оформление Системы по умолчанию выключено (новый игрок)', E(w0, 'data.systemDesign') === false);
  const legacy = JSON.parse(SEED); delete legacy.systemDesign; const saved = SEED; SEED = JSON.stringify(legacy); const wl = boot(); SEED = saved;
  check('N2 старое сохранение без поля — выключено', E(wl, 'data.systemDesign') === false);
  const imp = JSON.parse(J(w0, `sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { systemDesign: 'yes' }), total: {} })`));
  const imp2 = JSON.parse(J(w0, `sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { systemDesign: true }), total: {} })`));
  const imp3 = JSON.parse(J(w0, `(() => { const st = JSON.parse(${JSON.stringify(SEED)}); delete st.systemDesign; return sanitizeImportedData({ state: st, total: {} }); })()`));
  check('N3 бэкап: true сохраняется, мусор и отсутствие → выключено', imp2.state.systemDesign === true && imp.state.systemDesign === false && imp3.state.systemDesign === false); }
{ const w = freshB('data.curseActiveToday = false; data.notificationsEnabled = true;'); const D = w.document;
  const show = (body, extra) => { E(w, `document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); displayNotificationNow(Object.assign({ body: ${JSON.stringify(body)}, tone: 'info', skipLog: false }, ${JSON.stringify(extra || {})}))`); return D.querySelector('.sys-notice') || D.querySelector('.system-popup'); };
  let p = show('Получен предмет: Руна Роста');
  check('N4 выключено — прежнее уведомление', p.classList.contains('system-popup') && !D.querySelector('.sys-notice'));
  E(w, 'data.systemDesign = true');
  p = show('Получен предмет: Руна Роста');
  check('N5 включено — окно Системы: рамка, фон, панель, табличка, текст', p.classList.contains('sys-notice') && p.classList.contains('sn-blue') && !D.querySelector('.system-popup')
    && p.querySelectorAll(':scope > svg.sf-under').length === 1 && p.querySelectorAll(':scope > svg.sf-over').length === 1 && !!p.querySelector(':scope > .sf-screen .sf-shim')
    && p.querySelector('.sn-tt').textContent === 'УВЕДОМЛЕНИЕ' && !!p.querySelector('.sn-ic svg') && p.querySelector('.sf-panel > .gp-inner .sn-body').textContent === 'Получен предмет: Руна Роста'
    && p.querySelectorAll('.sf-energy').length === 2 && !p.dataset.glitch);
  check('N6 журнал — прежний текст', E(w, 'data.notificationLog[0].text') === 'Получен предмет: Руна Роста');
  p.click();
  check('N7 касание — плавный уход, окно освобождается, затем удаляется', p.classList.contains('sn-out') && E(w, 'notificationActive') === false);
  await sleep(420);
  check('N8 … и удалено из страницы', !p.isConnected);
  E(w, 'data.curseActiveToday = true');
  p = show('Получен предмет: Руна Роста');
  check('N9 Бремя — всё окно красное, «наводка», 3 полосы среза и помехи', p.classList.contains('sn-red') && p.dataset.sfScheme === 'red' && p.dataset.glitch === 'anomaly'
    && p.querySelectorAll('.sf-panel > .gp-slice').length === 3 && !!p.querySelector(':scope > .gp-noise'));
  check('N10 сбой начинается после развёртки окна', !p.classList.contains('glitch'));
  await sleep(760);
  const fxA = [...p.classList].filter(c => c.startsWith('gfx-')).sort().join(',');
  check('N11 … затем сбой всего окна: все пять приёмов', p.classList.contains('glitch') && fxA === 'gfx-flicker,gfx-noise,gfx-shake,gfx-slice,gfx-split', fxA);
  p.click();
  check('N12 закрытие останавливает таймеры сбоя', p._glitchStopped === true && p._glitchTimers.length === 0);
  p = show(E(w, 'PACE_NOTICE'), { tone: 'warn' });
  check('N13 темп во время Бремени — красное', p.classList.contains('sn-red') && p.dataset.glitch === 'anomaly');
  E(w, 'data.curseActiveToday = false');
  p = show(E(w, 'PACE_NOTICE'), { tone: 'warn' });
  check('N14 темп без Бремени — всё окно оранжевое, без срезов, оранжевый текст', p.classList.contains('sn-orange') && p.dataset.glitch === 'pace' && !p.querySelector('.gp-slice')
    && !!p.querySelector(':scope > .gp-noise') && p.querySelector('.sn-body').classList.contains('tone-warn'));
  await sleep(760);
  const fxP = [...p.classList].filter(c => c.startsWith('gfx-')).sort().join(',');
  check('N15 … сбой: расслоение и помехи', fxP === 'gfx-noise,gfx-split', fxP);
  await sleep(700);
  check('N16 … всплеск снят, повторов нет', !p.classList.contains('glitch') && p._glitchTimers.length === 0);
  p = show(E(w, 'SYSTEM_NOTICES.complete[0]'), { check: true });
  check('N17 выполнение дня — чекбокс внутри панели, зелёный', !!p.querySelector('.sf-panel > .gp-inner > .notice-check') && !p.querySelector('.notice-check.red'));
  E(w, 'data.curseActiveToday = true'); p = show(E(w, 'SYSTEM_NOTICES.complete[0]'), { check: true });
  check('N18 … под Бременем — красная галочка', !!p.querySelector('.sf-panel > .gp-inner > .notice-check.red'));
  E(w, 'data.curseActiveToday = false; data.notificationsEnabled = false; window.__q = 0; const _pq = processNotificationQueue;');
  E(w, "document.querySelectorAll('.sys-notice').forEach(n => n.remove()); displayNotificationNow({ body: 'x', tone: 'info', skipLog: true })");
  check('N19 уведомления выключены — окна нет', !D.querySelector('.sys-notice'));
  E(w, 'data.notificationsEnabled = true');
  const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  check('N20 появление — развёртка; размер рамки без учёта анимации (offsetWidth)', /\.sys-notice \{[^}]*animation: snUnfold \.65s[^}]*backwards/.test(css) && /const w = win\.offsetWidth, s = w \/ G\.W;/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8')));
  // переключатель в Архиве → Настройки
  E(w, "data.systemDesign = false; backupModalStep = 'main'; renderBackupModal()");
  const row = () => [...D.querySelectorAll('.backup-summary span')].find(x => x.textContent.startsWith('Оформление Системы'));
  const t0 = row().textContent; E(w, 'toggleSystemDesign()'); const t1 = row().textContent;
  check('N21 Архив → Настройки: «Оформление Системы» переключается', t0 === 'Оформление Системы: выключено.' && t1 === 'Оформление Системы: включено.' && E(w, 'data.systemDesign') === true); }
console.log(results.join('\n'));
console.log(`Итого: ${results.filter(r => r.startsWith('OK')).length} OK, ${results.filter(r => r.startsWith('FAIL')).length} FAIL`);
process.exit(0);
})();
