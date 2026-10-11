// v7.0.0: тема «Система» — разметка окон и главного экрана, значок «!», красные схемы, возврат к «Классике»,
// геометрия рамки (выравнивание краёв, тонкие колонны, повтор зубцов, предел утолщения), стили полос и Заморозки.
// Механика в теме «Система» проверяется прежними наборами: node consumables.test.js --system, node veil.test.js --system.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'index.html'), 'utf-8');
let SEED = null;
let STORE = null;   // v7.0.2: { ключ: значение } вместо SEED — для проверок памяти браузера
function boot() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'u'; w.scrollTo = () => {};
      if (STORE) Object.keys(STORE).forEach(k => w.localStorage.setItem(k, STORE[k])); else if (SEED) w.localStorage.setItem('sl_daily_v5_5_0', SEED);
    } });
  return dom.window;
}
const E = (w, c) => w.eval(c);
const J = (w, c) => E(w, `JSON.stringify(${c})`);
const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i !== undefined && !c ? '  → ' + i : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tick = () => sleep(15);   // окна «одеваются» по слежению за стилем оверлея — отложенно
{ const w0 = boot(); SEED = E(w0, `JSON.stringify(Object.assign({}, data, {level:37, exp:2220, credits:9000, rulesAcknowledged:true, playerName:'T', lastReset: getLastResetThreshold(Date.now()), dailyTargetLevel:37, dailyNotices:{morning:true, complete:false}}))`); }
const closeAll = w => E(w, `document.querySelectorAll('.status-overlay').forEach(o => { if (o.style.display === 'flex') o.style.display = 'none'; })`);
// «подпись» разметки окна: порядок и классы прямых потомков (без служебных классов темы)
const SIG = `(() => { const sig = el => [...el.children].map(c => c.tagName + '.' + [...c.classList].sort().join('.') + (c.id ? '#' + c.id : '')).join(' > ');
  const o = { main: sig(document.querySelector('.quest-panel')), mainCls: document.querySelector('.quest-panel').className, title: sig(document.querySelector('.header-top-row')) };
  document.querySelectorAll('.status-overlay').forEach(ov => { const win = ov.firstElementChild; o[ov.id] = win.className + ' :: ' + sig(win); });
  return o; })()`;

(async () => {
const w = boot(); const D = w.document; await tick();

// ===== главный экран =====
{ const mw = D.querySelector('.quest-panel');
  check('T1 запуск: тема «Система» применена до отрисовки, «ожидание темы» снято',
    D.body.classList.contains('theme-sys') && !D.documentElement.classList.contains('theme-pending') && E(w, 'data.theme') === 'system');
  check('T2 главный экран — окно Системы: .sf-win.mwin.mscr > .sf-content > .sf-panel.mw, всё прежнее содержимое внутри панели',
    mw.classList.contains('sf-win') && mw.classList.contains('mwin') && mw.classList.contains('mscr') && mw.children.length === 1
    && !!mw.querySelector(':scope > .sf-content > .sf-panel.mw > .header') && !!mw.querySelector('.sf-panel.mw > .quest-list') && !!mw.querySelector('.sf-panel.mw > .sub-menu-grid'));
  const tt = mw.querySelector('.header-top-row > .mw-hdr > .title.mw-tt');
  check('T3 заголовок «ЕЖЕДНЕВНОЕ ЗАДАНИЕ» — табличка без значка «!»', !!tt && tt.textContent === 'ЕЖЕДНЕВНОЕ ЗАДАНИЕ' && !mw.querySelector('.header-top-row .sn-ic'));
  check('T4 в jsdom размеров нет — рамка не рисуется и ошибок нет (рисование проверяется снимками в браузере)', !mw.querySelector(':scope > svg.sf-frm'));
}

// ===== модальные окна =====
{ E(w, 'openShop()'); await tick();
  const win = D.querySelector('#shopOverlay > .status-window');
  check('T5 окно при открытии: рамочная разметка, заголовок в табличке, развёртка',
    win.classList.contains('sf-win') && win.classList.contains('mwin') && win.classList.contains('mw-in') && !win.classList.contains('mscr')
    && win.querySelector(':scope > .sf-content > .sf-panel.mw > .mw-hdr > .status-header.mw-tt').textContent === 'МАГАЗИН СИСТЕМЫ'
    && !!win.querySelector('.sf-panel.mw > .status-body #shopContent .item-card') && !!win.querySelector('.sf-panel.mw > .close-status'));
  check('T6 у обычного окна значка «!» нет (класс mw-ic не ставится)', !win.classList.contains('mw-ic') && !!win.querySelector('.mw-hdr > .sn-ic'));
  const before = E(w, 'data.credits'); win.querySelector('#shopContent .item-card .item-price').click(); await sleep(700);
  check('T7 покупка в «одетом» окне работает', E(w, 'data.credits') < before, `${before} → ${E(w, 'data.credits')}`);
  closeAll(w); await tick(); E(w, 'openShop()'); await tick();
  check('T8 повторное открытие: разметка не удваивается', win.querySelectorAll('.sf-content').length === 1 && win.querySelectorAll('.mw-hdr').length === 1 && win.querySelectorAll('.status-header').length === 1);
  closeAll(w); await tick(); }

{ const ic = async (js, id) => { closeAll(w); await tick(); E(w, js); await tick(); const win = D.getElementById(id).firstElementChild; return win.classList.contains('mw-ic') + '/' + win.classList.contains('sn-red'); };
  const r = {
    confirm: await ic("showConfirm('Вопрос?', () => {})", 'confirmOverlay'),
    choice: await ic("showExerciseChoice(['pushups', 'squats'], () => {})", 'exerciseChoiceOverlay'),
    name: await ic("document.getElementById('nameOverlay').style.display = 'flex'", 'nameOverlay'),
    auth: await ic('openSysToolsAuth()', 'sysToolsAuthOverlay'),
    rulesArchive: await ic("showRulesOverlay('archive')", 'rulesOverlay'),
    penalty: await ic('showPenaltyBanner(420, 10, 1, 2, false)', 'penaltyOverlay'),
    inv: await ic('openInv()', 'invOverlay'), status: await ic("document.getElementById('rankInfoBtn').click()", 'statusOverlay'),
    codex: await ic('openCodex()', 'codexOverlay'), archive: await ic('openBackupModal()', 'backupOverlay'), chron: await ic('openChronicle()', 'chronicleOverlay'),
    progress: await ic('openProgressModal()', 'progressOverlay')
  };
  check('T9 значок «!» — у «Запроса решения», «Запроса выбора», ввода имени и «Авторизации»',
    r.confirm === 'true/false' && r.choice === 'true/false' && r.name === 'true/false' && r.auth === 'true/false', JSON.stringify(r));
  check('T10 у правил из Архива, Инвентаря, Статуса, Кодекса, Архива, Летописи и Прогресса значка нет',
    [r.rulesArchive, r.inv, r.status, r.codex, r.archive, r.chron, r.progress].every(x => x === 'false/false'), JSON.stringify(r));
  check('T11 «Штраф Системы»: красная схема, без значка', r.penalty === 'false/true', r.penalty);
  closeAll(w); await tick();
  // правила при первом входе: окно-уведомление со значком; раскрывает его запуск Системы, а не развёртка окна
  E(w, "showRulesOverlay('onboarding')"); await tick();
  const rw = D.querySelector('#rulesOverlay > .status-window');
  check('T12 правила при первом входе: значок «!», своя развёртка не включается (окно раскрывает запуск Системы)',
    rw.classList.contains('mw-ic') && !rw.classList.contains('mw-in') && D.getElementById('rulesOverlay').classList.contains('sys-boot-black') && rw.querySelector('.mw-tt').textContent === 'УВЕДОМЛЕНИЕ');
  E(w, 'stopRulesAnimation(); stopSystemBoot(); closeRulesOverlay()'); await tick(); }

{ E(w, "const id = Object.keys(SHOP_CATALOG)[0]; showItemPreview(id, SHOP_CATALOG[id].name)"); await tick();
  const box = D.querySelector('#itemPreviewOverlay > .item-preview-box'), p = box.querySelector('.sf-panel.mw');
  check('T13 окно предмета: название — табличкой вверху, затем картинка и сведения',
    box.classList.contains('mwin') && p.children[0].classList.contains('mw-hdr') && !!p.children[0].querySelector('.item-preview-name.mw-tt') && p.children[1].tagName === 'IMG' && p.children[2].classList.contains('item-preview-meta'));
  closeAll(w); await tick();
  E(w, "showStatLore('str')"); await tick();
  const lore = D.querySelector('#statLoreOverlay > .stat-lore-box');
  check('T14 окно характеристики тоже в рамке', lore.classList.contains('mwin') && !!lore.querySelector('.sf-panel.mw > .mw-hdr > .stat-lore-header.mw-tt') && !!lore.querySelector('.sf-panel.mw > .stat-lore-text'));
  closeAll(w); await tick(); }

// ===== карточки и настройки =====
{ E(w, "data.consumables = { bone_bead: 1 }; const k = Object.keys(SHOP_CATALOG)[0]; data.consumables[k] = 1; openInv()"); await tick();
  const stacks = [...D.querySelectorAll('#invContent .item-card[data-consumable-id] .item-btn-stack')].map(s => s.closest('.item-card').dataset.consumableId + ':' + [...s.children].map(b => b.textContent).join('+'));
  check('T15 Инвентарь: у продаваемого предмета две кнопки, у Костяной бусины — одна «Использовать» (в теме «Система» встаёт справа)',
    stacks.some(x => /:ПРОДАТЬ\+ИСПОЛЬЗОВАТЬ$/.test(x)) && stacks.includes('bone_bead:ИСПОЛЬЗОВАТЬ'), stacks.join(' '));
  closeAll(w); await tick();
  E(w, 'openChronicle()'); await tick();
  let err = ''; try { E(w, "calShowTooltip(document.querySelector('#calDayGrid .day-cell'), 'x')"); } catch (e) { err = String(e); }
  check('T16 подсказка Летописи показывается без ошибок', err === '' && D.getElementById('calTooltip').style.display === 'block', err);
  closeAll(w); await tick(); }

// ===== Аномалия =====
{ E(w, 'data.curseActiveToday = true; render()');
  const red = D.body.classList.contains('sys-anom');
  const qb = [...D.querySelectorAll('.quest-item .qbar')].every(q => q.classList.contains('t-cursed'));
  E(w, 'openShop()'); await tick();
  const shopRed = D.querySelector('#shopOverlay > .status-window').classList.contains('sn-red');
  closeAll(w); E(w, 'data.curseActiveToday = false; render()');
  check('T17 Бремя Аномалии: главный экран красный (body.sys-anom), окна остаются синими; без Бремени — снова обычный',
    red && !shopRed && !D.body.classList.contains('sys-anom'));
  check('T18 цвет полосы упражнения — классом на самой полосе (обводка в цвет заливки)', qb && ![...D.querySelectorAll('.quest-item .qbar')].some(q => q.classList.contains('t-cursed')));
  await tick(); }

// ===== «Классика» и обратно =====
{ const wc = boot(); E(wc, "setTheme('classic')"); await tick();
  const base = JSON.parse(J(wc, SIG));          // классическая разметка, ни разу не «одетая»
  // в теме «Система» открываем все окна, затем уходим в «Классику»
  for (const js of ['openShop()', 'openInv()', "document.getElementById('rankInfoBtn').click()", 'openCodex()', 'openChronicle()', 'openBackupModal()', 'openProgressModal()',
    "showConfirm('?', () => {})", "showExerciseChoice(['pushups'], () => {})", 'showPenaltyBanner(1, 1, 1, 1, false)', "showStatLore('str')", "showRulesOverlay('archive')",
    "const id = Object.keys(SHOP_CATALOG)[0]; showItemPreview(id, 'x')", 'openSysToolsAuth()', 'sysToolsAuthorized = true; openSysTools()', 'openFullCatalog()',
    "document.getElementById('nameOverlay').style.display = 'flex'", "document.getElementById('leaderboardOverlay').style.display = 'flex'", 'onContourClick(0)']) {
    try { E(w, js); } catch (e) {} await tick(); closeAll(w); await tick(); }
  const dressed = [...D.querySelectorAll('.status-overlay')].filter(o => o.firstElementChild.classList.contains('mwin')).length;
  E(w, 'openBackupModal()'); await tick();
  E(w, "setTheme('classic')"); await tick();
  const back = JSON.parse(J(w, SIG));   // уведомление, уже показанное в виде окна Системы, досматривается как есть — его разметка в сверку не входит
  const diff = Object.keys(base).filter(k => base[k] !== back[k]);
  check('T19 «Классика»: разметка главного экрана и всех окон возвращается к исходной (сверка с ни разу не «одетой»)',
    dressed >= 18 && diff.length === 0 && !D.body.classList.contains('theme-sys') && !D.querySelector('.quest-panel .sf-content, .status-overlay .sf-content, .mw-hdr, .mw-tt, .mwin, .quest-panel svg.sf-frm, .status-overlay svg.sf-frm'), `одето ${dressed}; расхождения: ${diff.join(', ')}`);
  check('T20 Архив при смене темы остаётся открытым и уже в классическом виде', D.getElementById('backupOverlay').style.display === 'flex' && !D.querySelector('#backupOverlay .mwin'));
  E(w, "setTheme('system')"); await tick();
  check('T21 обратно в «Систему»: главный экран и открытый Архив снова в рамке',
    D.querySelector('.quest-panel').classList.contains('mscr') && D.querySelector('#backupOverlay > .status-window').classList.contains('mwin') && D.querySelectorAll('.quest-panel .sf-content').length === 1);
  closeAll(w); await tick();
  // уведомление по теме
  E(w, "document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationActive = false; data.notificationsEnabled = true; displayNotificationNow({ body: 'x', tone: 'info', skipLog: true })");
  const sysN = !!D.querySelector('.sys-notice') && !D.querySelector('.system-popup');
  E(w, "document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationActive = false; setTheme('classic'); displayNotificationNow({ body: 'x', tone: 'info', skipLog: true })");
  const clsN = !!D.querySelector('.system-popup') && !D.querySelector('.sys-notice');
  check('T22 уведомление: в «Системе» — окно Системы, в «Классике» — прежнее', sysN && clsN);
  E(w, "document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationActive = false; setTheme('system')"); await tick(); }

// ===== рамка: геометрия (размеры в jsdom подставляются вручную) =====
{ const mk = (wd, ht) => { const el = D.createElement('div'); el.className = 'sf-win'; el.innerHTML = '<div class="sf-content"><div class="sf-panel"></div></div>';
    Object.defineProperty(el, 'offsetWidth', { value: wd }); Object.defineProperty(el, 'offsetHeight', { value: ht }); D.body.appendChild(el); return el; };
  const clip = el => el.querySelector('.sf-screen').style.clipPath.replace(/^polygon\(|\)$/g, '').split(',').map(p => p.trim().split(' ').map(parseFloat));
  const pad = el => el.querySelector('.sf-content').style.padding.split(' ').map(parseFloat);
  // уведомление: как раньше — без параметров
  const n1 = mk(350, 190); E(w, 'window.__el = null'); w.__el = n1; E(w, "SysFrame.render(__el, 'blue')");
  const c1 = clip(n1), ys1 = c1.map(p => p[1]);
  const topY = Math.min(...ys1), botY = Math.max(...ys1);
  check('T23 края контура выровнены: верх и низ подложки строго горизонтальны',
    c1.filter(p => Math.abs(p[1] - topY) < 0.06).length === 2 && c1.filter(p => Math.abs(p[1] - botY) < 0.06).length === 2 && c1.length === 40, `точек ${c1.length}`);
  const pN = pad(n1);
  // окно: тонкие колонны и отступы
  const m1 = mk(350, 190); w.__el = m1; E(w, "SysFrame.render(__el, 'blue', { side: 0.45, gap: 0.45 })");
  const pM = pad(m1);
  check('T24 тонкая рамка: боковые отступы содержимого — 45% от отступов уведомления', Math.abs(pM[3] / pN[3] - 0.45) < 0.01 && Math.abs(pM[1] / pN[1] - 0.45) < 0.01 && pM[0] < pN[0], `${pN.join('/')} → ${pM.join('/')}`);
  // высокое окно: зубцы повторяются (нечётное число повторов), а не растягиваются
  const t1 = mk(390, 1600); w.__el = t1; E(w, "SysFrame.render(__el, 'blue', { side: 0.45, gap: 0.45 })");
  const t0 = mk(390, 1600); w.__el = t0; E(w, "SysFrame.render(__el, 'blue', { side: 0.45, gap: 0.45, tile: false })");
  const nT = clip(t1).length, nS = clip(t0).length, polysT = t1.querySelectorAll('svg.sf-under polygon:not([fill="none"])').length, polysS = t0.querySelectorAll('svg.sf-under polygon:not([fill="none"])').length;   // с v7.1.0 у колонн есть внутренние контуры (fill="none")
  const reps = nT / 40;
  check('T25 высокое окно: рисунок колонн повторяется нечётное число раз; с tile: false — растягивается, как раньше',
    nS === 40 && polysS === 4 && Number.isInteger(reps) && reps >= 3 && reps % 2 === 1 && polysT > 4 * reps - 1, `точек ${nT} (повторов ${reps}), фигур ${polysT} / ${polysS}`);
  const cT = clip(t1), xsL = cT.slice(0, nT / 2).map(p => p[0]);
  check('T26 повторы стыкуются: левая кромка подложки идёт сверху вниз без разрывов и возвратов', cT.slice(0, nT / 2).every((p, i, a) => i === 0 || p[1] >= a[i - 1][1] - 0.06) && Math.max(...xsL) < 390 * 0.2);
  // шире 460px рамка не утолщается
  const a460 = mk(460, 900); w.__el = a460; E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)");
  const a620 = mk(620, 900); w.__el = a620; E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)");
  const b620 = mk(620, 900); w.__el = b620; E(w, "SysFrame.render(__el, 'blue', { side: 0.45, gap: 0.45 })");
  const pa = pad(a460), pb = pad(a620), pc = pad(b620);
  check('T27 главный экран шире 460px: отступы и толщина рамки те же, что на 460px (без предела — толще)',
    pa.every((v, i) => Math.abs(v - pb[i]) < 0.01) && pc[0] > pb[0] * 1.3 && Math.max(...clip(a620).map(p => p[0])) > 600, `${pa.join('/')} | ${pb.join('/')} | ${pc.join('/')}`);
  check('T28 v7.1.5: в рамке нет SVG-фильтров (колонны без свечения, стекло полос без размытия, линии без ореола); энергия на месте',
    a620.querySelectorAll('svg.sf-frm [filter], svg.sf-frm filter, svg.sf-frm feGaussianBlur').length === 0 && a620.querySelectorAll('svg.sf-frm').length === 3
    && a620.querySelectorAll(':scope > .sf-en > .sf-energy').length === 2);
  { const ov = a620.querySelector('svg.sf-over'), un = a620.querySelector('svg.sf-under');
    const r1 = mk(390, 700); w.__el = r1; E(w, "SysFrame.render(__el, 'red', SYS_FRAME_OPT)");
    check('T52 v7.1.0 полосы по образцу (демо 91): энергия только по линиям (маски), нет прежней вспышки и штрих-кода, точки, тёмная линия, стекло; колонны с внутренним контуром; красная схема — красное стекло',
      ov.querySelectorAll('mask').length === 0 && r1.querySelectorAll(':scope > .sf-en').length === 2 && !ov.querySelector('ellipse, rect.core')
      && ov.querySelectorAll('rect.sf-dot').length >= 1 && ov.querySelectorAll('line').length === 1 && ov.querySelectorAll('polyline').length >= 15
      && un.querySelectorAll('polygon[fill="none"], polyline').length > 0 && /rgba\(5,16,50,\.7\)/.test(un.innerHTML)
      && /rgba\(196,28,56,/.test(r1.querySelector('svg.sf-over').innerHTML) && !/rgba\(34,112,236,/.test(r1.querySelector('svg.sf-over').innerHTML)
      && /\.sf-win > \.sf-pat \{ position: absolute; z-index: 3; pointer-events: none; \}/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('\n')));
    r1.remove();
    // v7.1.2 (демо 93): два стекла — среднее (линии, энергия) и ближнее (без линий, сдвинуто), высота ×1,1 наружу, засечек и дорожек нет
    const svgs = [...a620.querySelectorAll(':scope > svg.sf-over')], near = a620.querySelector(':scope > svg.sf-over.sf-near');
    const poly = s => s.split(' ').map(q => q.split(',').map(Number));
    const back = svgs[0], tMid = poly(back.querySelectorAll('polygon[fill^="url"]')[0].getAttribute('points'));
    const g2 = near.querySelectorAll('g[transform]'), tNear = poly(g2[0].querySelector('polygon').getAttribute('points'));
    const trT = g2[0].getAttribute('transform').match(/-?[\d.]+/g).map(Number), trB = g2[1].getAttribute('transform').match(/-?[\d.]+/g).map(Number);
    const tTop = Math.min(...tMid.map(p => p[1])), tBot = Math.max(...tMid.map(p => p[1]));
    check('T53 v7.1.2 два стекла: среднее с линиями и энергией, ближнее после него (поверх узора), без линий, вверху сдвинуто вверх-вправо, внизу вниз-влево; высота наружу; засечек нет',
      svgs.length === 2 && svgs[1] === near && near.querySelectorAll('polyline, .sf-energy').length === 0 && near.querySelectorAll('polygon').length === 6
      && back.querySelectorAll('.sf-energy').length === 0 && JSON.stringify(tNear) === JSON.stringify(tMid)
      && trT[0] > 0 && trT[1] < 0 && trB[0] < 0 && trB[1] > 0 && Math.abs(trT[1]) > Math.abs(trT[0])
      && tTop < 0.2 * tBot && !back.querySelector('rect[width="1.3"]') && !!near.querySelector('clipPath')
      && near.querySelector('g[clip-path]').getAttribute('opacity') === '0.3',
      `${svgs.length} ${trT} ${trB} ${tTop}/${tBot}`); }
  [n1, m1, t1, t0, a460, a620, b620].forEach(x => x.remove()); }

// ===== стили =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  check('T29 полосы темы «Система»: одна толщина — капсула 11px, зазор 3px (заливка 3px), обводка в цвет заливки',
    /body\.theme-sys \.sf-win\.mwin \.sc-bar, body\.theme-sys \.sf-win\.mwin \.dayline, body\.theme-sys \.sf-win\.mwin \.qbar \{ --f: #eaf8ff; box-sizing: border-box; height: 11px; padding: 3px;\s+border: 1px solid var\(--f\); border-radius: 999px;/.test(css)
    && !/body\.theme-sys[^{]*\.(qbar|dayline|sc-bar) \{[^}]*height: 1[2-9]px/.test(css));
  check('T30 Заморозка (обе темы): размытие подо льдом 1,5px — как у Пелены покоя; рисунок льда в ::before с прежней прозрачностью',
    /\.freeze-ice-overlay\.active \{ opacity: 1; display: block; -webkit-backdrop-filter: blur\(1\.5px\); backdrop-filter: blur\(1\.5px\); \}/.test(css)
    && /\.freeze-ice-overlay::before \{[^}]*ice_layer_freeze\.png[^}]*opacity: 0\.4;/.test(css) && /--vb, 1\.5px/.test(css));
  check('T31 цифра уровня вместо шестиугольника; у SSS и Монарха — компактная пульсация (старая отключена)',
    /body\.theme-sys \.sf-win\.mwin \.sc-hex \{ width: auto; height: auto; clip-path: none; background: none; \}/.test(css)
    && /body\.theme-sys \.sf-win\.mwin \.rk-sss \.sc-hexw, body\.theme-sys \.sf-win\.mwin \.rk-monarch \.sc-hexw \{ animation: none; filter: none; \}/.test(css) && /@keyframes lvPulse/.test(css));
  check('T32 все правила темы привязаны к body.theme-sys (в «Классике» не действуют), кроме выбора оформления',
    (() => { const i = css.indexOf('ТЕМА «СИСТЕМА»'); const block = css.slice(i); const sels = [...block.matchAll(/(?:^|\})\s*([^{}@/]+)\{/g)].map(m => m[1].trim()).filter(s => s && !/^(\d+%|from|to)(,|$| )/.test(s) && !/^\d/.test(s));
      const bad = sels.filter(s => s.split(',').some(p => { p = p.trim(); return p && !p.startsWith('body.theme-sys') && !p.startsWith('.theme-') ; }));
      return i > 0 && sels.length > 150 && bad.length === 0 ? true : (console.log('  T32:', bad.slice(0, 5)), false); })());
  check('T33 главный экран в теме «Система» — до 620px, окна — до 460px', /body\.theme-sys \.quest-panel\.mscr \{ width: min\(620px, 98vw\);/.test(css) && /body\.theme-sys \.sf-win\.mwin \{[^}]*width: min\(460px, 98vw\);/.test(css));
  check('T34 «перегрев» кнопок при недопустимом темпе остаётся оранжевым и в теме «Система» (общее правило кнопок темы его не перекрывает)',
    /body\.theme-sys \.sf-win\.mwin \.buttons button\.add\.pace-hot \{ --bc: #ffcc88; border-color: #ffaa44 !important; background: rgba\(80,45,0,\.45\) !important;/.test(css)
    && css.indexOf('button.add.pace-hot { --bc') > css.indexOf('body.theme-sys .sf-win.mwin button {'));
  // v7.0.1
  check('T35 окно — отдельным слоем отрисовки, пока открыто (на телефоне колонны рамки «мигали» в конце развёртки); главный экран — нет',
    /body\.theme-sys \.sf-win\.mwin:not\(\.mscr\) \{ will-change: transform; \}/.test(css) && (css.slice(css.indexOf('ТЕМА «СИСТЕМА»')).match(/will-change/g) || []).length === 1);
  check('T36 недоступная кнопка «Преодоление предела» остаётся серой при наведении и касании (цвет и рамка закреплены поверх общего правила кнопок)',
    /body\.theme-sys \.mscr #limitBreakBtn:disabled \{ color: #6f8296 !important; border-color: var\(--sl2\) !important; box-shadow: none !important; cursor: not-allowed; \}/.test(css)
    && /body\.theme-sys \.sf-win\.mwin button:hover \{[^}]*color: var\(--bc\) !important;/.test(css));
  check('T37 чекбокс на карточке упражнения в теме «Система» — 26px по оси ряда кнопок; в «Классике» — прежние 22px',
    /body\.theme-sys \.mscr \.quest-item \.qcheck \{ width: 26px; height: 26px; bottom: 17px; \}/.test(css)
    && /\n    \.quest-item \.qcheck \{ position: absolute; left: 16px; bottom: 19px; width: 22px; height: 22px; pointer-events: none; \}/.test(css)); }

// ===== v7.0.2 =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  check('T38 стартовое окно в теме «Система»: тёмный фон как в «Классике» (95% и размытие 10px), чёрная пауза — чёрная; правила из Архива — обычное затемнение',
    /body\.theme-sys #rulesOverlay\[data-notice="1"\] \{ background: rgba\(0,5,15,\.95\); -webkit-backdrop-filter: blur\(10px\); backdrop-filter: blur\(10px\); \}/.test(css)
    && /body\.theme-sys #rulesOverlay\[data-notice="1"\]\.sys-boot-black \{ background: #000; \}/.test(css));
  check('T39 стабилизация видна: полосы-копии и помехи поверх панели, расслоение рамки и заголовка',
    /#rulesOverlay \.status-window > \.sb-slice \{ z-index: 4; background: none; \}/.test(css) && /#rulesOverlay \.status-window > \.sb-noise \{ z-index: 5; \}/.test(css)
    && /#rulesOverlay \.status-window\.sys-boot-glitch > svg\.sf-frm \{ filter: drop-shadow/.test(css)); }
{ closeAll(w); await tick();
  E(w, "showRulesOverlay('onboarding')"); await tick();
  const ov = D.getElementById('rulesOverlay'), rw = ov.firstElementChild;
  const black = ov.classList.contains('sys-boot-black') && ov.dataset.notice === '1' && E(w, 'BOOT_BLACK_MS') === 1000;
  await sleep(1300);
  const mid = rw.classList.contains('sys-boot-glitch') && /px/.test(rw.style.translate) && /brightness/.test(rw.querySelector(':scope > .sf-content > .sf-panel').style.filter) && rw.querySelectorAll(':scope > .sb-slice').length === 3;
  await sleep(1500);
  const after = !rw.classList.contains('sys-boot-glitch') && rw.style.translate === '' && rw.querySelector(':scope > .sf-content > .sf-panel').style.filter === '' && !rw.querySelector('.sb-slice, .sb-noise');
  check('T40 первый запуск в теме «Система»: пауза 1 с, затем стабилизация с дрожью и мерцанием; после неё окно чистое', black && mid && after, `${black} ${mid} ${after}`);
  E(w, 'stopRulesAnimation(); closeRulesOverlay()'); await tick();
  E(w, "showRulesOverlay('archive')"); await tick();
  check('T41 правила из Архива — без пометки стартового окна (обычное затемнение темы)', ov.dataset.notice === '' && !ov.classList.contains('sys-boot-black'));
  closeAll(w); await tick(); }
// тема переживает «Сбросить всё»
{ const thm = async (store) => { STORE = store; const x = boot(); await tick(); const r = [J(x, 'data.theme'), x.document.body.classList.contains('theme-sys'), x.localStorage.getItem('sl_theme')]; STORE = null; return JSON.stringify(r); };
  const fresh = await thm({}), freshClassic = await thm({ sl_theme: 'classic' }), oldSave = await thm({ sl_theme: 'classic', sl_daily_v5_5_0: SEED });
  check('T42 новый игрок — «Система»; после сброса — тема, выбранная до него; у сохранённого игрока — его тема, отдельная запись выравнивается по ней',
    fresh === '["\\"system\\"",true,"system"]' && freshClassic === '["\\"classic\\"",false,"classic"]' && oldSave === '["\\"system\\"",true,"system"]', `${fresh} | ${freshClassic} | ${oldSave}`);
  STORE = null; const x = boot(); await tick();
  E(x, "setTheme('classic')"); const k1 = x.localStorage.getItem('sl_theme');
  E(x, 'clearAppStorage()'); const k2 = x.localStorage.getItem('sl_theme'), gone = x.localStorage.getItem('sl_daily_v5_5_0') === null;
  check('T43 выбор в Архиве записывается отдельно, и «Сбросить всё» эту запись не стирает', k1 === 'classic' && k2 === 'classic' && gone, `${k1} ${k2} ${gone}`); }
// уведомления ждут печать свитка
{ closeAll(w); await tick();
  E(w, "document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationQueue.length = 0; notificationActive = false; data.notificationsEnabled = true; data.consumables.scroll_contract = 1; data.activeScroll = null; data.pendingScroll = null; data.completed = {}; render()");
  E(w, "performUseItem('scroll_contract')");
  await sleep(1000);
  const seal = D.getElementById('fullscreenSealOverlay').classList.contains('show'), during = !D.querySelector('.sys-notice'), queued = E(w, 'notificationQueue.length') === 1;
  await sleep(2400);
  const n = D.querySelector('.sys-notice');
  check('T44 активация свитка: пока на экране печать (2,5 с), уведомление ждёт в очереди; после неё — показывается',
    seal && during && queued && !!n && /Цели повышены/.test(n.textContent) && !D.getElementById('fullscreenSealOverlay').classList.contains('show'), `${seal} ${during} ${queued} ${!!n}`);
  const css = [...D.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const order = ['renunciation', 'contract', 'freeze', 'transfer'].every(k => { const i = css.indexOf(`showFullscreenSeal('${k}'`); const j = css.indexOf('showNotice(', i); return i > 0 && j > i && css.lastIndexOf(`showFullscreenSeal('${k}'`) === i; });
  check('T45 у всех четырёх свитков печать запускается раньше уведомления о свитке', order);
  E(w, "document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationQueue.length = 0; notificationActive = false;"); }

// ===== v7.0.3 =====
{ closeAll(w); await tick(); E(w, 'sysToolsAuthorized = true; openSysTools()'); await tick();
  const win = D.querySelector('#sysToolsOverlay > .status-window');
  check('T46 Длань в теме «Система»: раздел «Характеристики» внутри окна Системы, шаг — строка той же сетки, кнопки «1» / «10» над «−» / «+», выбрана «1»; стили строк и выбранной кнопки есть в обеих темах',
    win.classList.contains('mwin') && !!win.querySelector('.sf-panel.mw #sysStatStep.sys-stat-row') && win.querySelectorAll('.sf-panel.mw .sys-stat-row').length === 7
    && [...win.querySelectorAll('#sysStatStep .sys-step-btn.backup-action-btn')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|') === '1*|10'
    && /\n    \.sys-stat-row \.sys-step-btn\.on \{/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('\n'))
    && /body\.theme-sys \.sf-win\.mwin \.sys-stat-row \.sys-step-btn\.on \{/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('\n'))
    && /\n    \.sys-stat-row \{ display: flex;/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('\n'))
    && /body\.theme-sys \.sf-win\.mwin \.sys-stat-row \.backup-action-btn \{/.test([...D.querySelectorAll('style')].map(x => x.textContent).join('\n')));
  closeAll(w); await tick(); }

// ===== v7.0.6: Реестр — «Лучшая серия дней» =====
{ closeAll(w); await tick();
  E(w, "renderLeaderboard([{ rank: 1, name: 'А', level: 50, bestStreak: 42 }, { rank: 2, name: 'Б', level: 30, bestStreak: 7 }], { rank: 15, name: 'Я', level: 12, bestStreak: 5 })");
  const lines = [...D.querySelectorAll('#leaderboardContent .item-card')].map(c => [...c.querySelectorAll('.item-desc')].pop().textContent);
  check('T47 Реестр: в карточках игроков — «Лучшая серия дней: N» (рекорд серии), и у своей карточки ниже топа', lines.join('|') === 'Лучшая серия дней: 42|Лучшая серия дней: 7|Лучшая серия дней: 5', lines.join('|'));
  check('T48 на главном экране и в «СТАТУСЕ» подпись прежняя — «Серия дней» (текущая серия)', [...D.querySelectorAll('.sc-chip.st .k')].every(k => k.textContent === 'Серия дней') && D.querySelectorAll('.sc-chip.st .k').length === 2); }

// ===== v7.0.7: Пелена покоя и лёд Заморозки — снизу так же, как сверху и по бокам =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  check('T49 тема «Система»: пелена и лёд выходят за карточки на 5px со всех сторон (inset: -5px), «Классика» прежняя',
    /body\.theme-sys \.mscr \.veil-overlay \{ inset: -5px; border-radius: 0; \}/.test(css)
    && /body\.theme-sys \.mscr \.freeze-ice-overlay, body\.theme-sys \.mscr \.freeze-tap-catcher \{ inset: -5px; \}/.test(css)
    && !/inset: -5px -5px 7px/.test(css)
    && /\.veil-overlay \{[^}]*inset: 10px 12px;/.test(css)); }

// ===== v7.0.8: свечение всех текстов в теме «Система» =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const i = css.indexOf('v7.0.8: свечение'), blk = i > 0 ? css.slice(i) : '';
  check('T50 тема «Система»: общее свечение (цвет надписи; v7.1.5 — 2 слоя; v7.1.7 — не наследуется, только у заголовков, цифр, имени), исключения и красное под Бременем',
    /body\.theme-sys \{\s*\/\*[^*]*\*\/\s*--tg: 0 0 \.2em color-mix\(in srgb, currentColor 58%, transparent\), 0 0 \.8em color-mix\(in srgb, currentColor 46%, transparent\);/.test(blk)
    && /--tgr: 0 0 \.2em rgba\(255,140,150,\.58\), 0 0 \.8em rgba\(230,60,80,\.46\);/.test(blk) && !/1\.08em/.test(blk)
    && /--tgr: [^;]*;\s*text-shadow: none;/.test(blk)
    && /body\.theme-sys \.sc-hex b, body\.theme-sys \.sc-hex \.sc-idq \{ text-shadow: none; \}/.test(blk)
    && /body\.theme-sys \.mscr \.quest-name, body\.theme-sys \.quest-item \.counter, body\.theme-sys \.quest-item \.target \{ text-shadow: var\(--tg\); \}/.test(blk)
    && /body\.theme-sys\.sys-anom \.mscr \.quest-name[^{]*\{ text-shadow: var\(--tgr\); \}/.test(blk)
    && /@keyframes sysCursedScrollPulse \{\s*0%, 100% \{ text-shadow: var\(--tg\), 0 0 10px rgba\(255,150,0,0\.55\)/.test(blk)
    && /@keyframes sysLimitScrollPulse/.test(blk)
    && /body\.theme-sys \.quest-item \.counter\.cursed-scroll \{ animation-name: sysCursedScrollPulse; \}/.test(blk)
    && /@keyframes cursedScrollPulse \{\s*0%, 100% \{ text-shadow: 0 0 4px rgba\(255,40,40,0\.7\)/.test(css)); }
// ===== v7.0.9: общее свечение вместо своего слабого =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  { const i9 = css.indexOf('/* ===== v7.0.9:'), r9 = i9 < 0 ? '' : css.slice(i9, css.indexOf('var(--tgd); }', i9));
    const kf = css.lastIndexOf('@keyframes', i9), kfEnd = css.indexOf('\n    }', kf);
    const need = ['.codex-chapter-title', '.section-title', '.backup-section-title.danger', '.st-sec-title', '.cal-month-label',
      '#stats > div:first-child', '#stats .stats-caption', '#stats .stat-line strong', '#hdrName', '#stRank', '#hdrTitle', '#hdrExp', '#hdrCredits', '#valPer', '#statPoints', '.mscr .effects-header']   // v7.1.7: без предметов, дней, серии, кнопок;
    check('T51 тема «Система» (7.0.9): общее свечение у заголовков разделов и глав, Летописи, Прогресса, названий предметов, шапки и «СТАТУСА»; правило вне @keyframes',
      i9 > 0 && kfEnd > 0 && kfEnd < i9 && need.every(x => r9.includes(x)) && /\{ text-shadow: var\(--tg\); \}/.test(r9)
      && r9.split('\n').filter(l => /^\s*body/.test(l)).every(l => l.trim().startsWith('body.theme-sys'))); } }


// ===== v7.1.3: облегчение для телефонов (демо 94) =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  check('T54 фон окон неподвижен (без дрейфа), пятна света — без живого размытия и наложения, на главном экране их нет',
    !/sfDrift/.test(css) && /\.sf-circ \{[^}]*\}/.test(css) && !/\.sf-circ \{[^}]*animation/.test(css) && !/\.sf-scr \{[^}]*animation/.test(css)
    && /\.sf-shim i \{[^}]*animation: sfShim/.test(css) && !/\.sf-shim i \{[^}]*filter:/.test(css) && !/mix-blend-mode: screen; \}\n\s*\.sf-shim i/.test(css) && !/\.sf-shim \{ mix-blend-mode/.test(css)
    && /body\.theme-sys \.mscr \.sf-shim \{ display: none; \}/.test(css));
  check('T55 правила паузы: под окном — обе темы (anim-paused); v7.1.7 — паузы во время прокрутки нет',
    /\.anim-paused, \.anim-paused \*, \.anim-paused \*::before, \.anim-paused \*::after \{ animation-play-state: paused !important; \}/.test(css)
    && !/sys-scrolling/.test(css));
  const src = [...D.querySelectorAll('script')].map(x => x.textContent).join('\n');
  check('T56 v7.1.7: узор — 4 заготовленных кадра с перетеканием (CSS, замирает под окном), живого цикла нет; пробег руны под окном пропускается; текстуры размыты заранее',
    /const PAT_FRAMES = 4, PAT_CYCLE = 12;/.test(src) && !/patLoop|requestAnimationFrame\(patLoop\)|AnimPause\.scrolling|sys-scrolling/.test(src)
    && /\.sf-win > \.sf-pat \{ opacity: 0; animation: sfPatX 12s linear infinite; will-change: opacity; \}/.test(css)
    && /@keyframes sfPatX \{ 0% \{ opacity: 0; \} 17\.5% \{ opacity: \.8; \} 25% \{ opacity: \.8; \} 42\.5% \{ opacity: 0; \} 100% \{ opacity: 0; \} \}/.test(css)
    && /!document\.hidden && !svg\.closest\('\.anim-paused'\)\) runRuneBolt/.test(src) && /const TEX_BLUR = 1\.2;/.test(src) && (src.match(/return texBake\(c\);/g) || []).length === 2); }
{ const mk = (cls) => { const el = D.createElement('div'); el.className = cls; el.innerHTML = '<div class="sf-content"><div class="sf-panel"></div></div>';
    Object.defineProperty(el, 'offsetWidth', { value: 380 }); Object.defineProperty(el, 'offsetHeight', { value: 900 }); D.body.appendChild(el); return el; };
  const mw = mk('sf-win mwin mscr'), ww = mk('sf-win mwin');
  w.__el = mw; E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)"); w.__el = ww; E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)");
  const cm = mw.querySelector('.sf-screen').style.clipPath, cw = ww.querySelector('.sf-screen').style.clipPath;
  const ins = (cm.match(/^inset\(([\d.]+)px ([\d.]+)px ([\d.]+)px ([\d.]+)px\)$/) || []).slice(1).map(Number), vg = mw.querySelector('.sf-screen > .sf-vig');
  check('T57 v7.1.5: фон главного экрана обрезан прямоугольником по внутренней границе края (10–25px), виньетка по тем же краям; у окон — по форме рамки',
    ins.length === 4 && ins.every(v => v >= 8 && v <= 30) && !!vg && vg.style.left === ins[3] + 'px' && vg.style.right === ins[1] + 'px' && /^polygon\(/.test(cw) && !ww.querySelector('.sf-vig'),
    `${cm} | ${cw.slice(0, 20)}`);
  mw.remove(); ww.remove();
  for (const theme of ['system', 'classic']) {
    E(w, `setTheme('${theme}')`); closeAll(w); await tick();
    const paused = () => [...D.querySelectorAll('.anim-paused')].map(e => e.id || e.className.split(' ')[0]).sort().join(',');
    const p0 = paused();
    E(w, 'openShop()'); await tick(); const p1 = paused();
    E(w, "showItemPreview('crystal_restoration', 'К')"); await tick(); const p2 = paused();
    E(w, "document.getElementById('itemPreviewOverlay').style.display = 'none'"); await tick(); const p3 = paused();
    closeAll(w); await tick(); const p4 = paused();
    check(`T58 пауза под окном (${theme === 'system' ? '«Система»' : '«Классика»'}): Магазин — замер главный экран; превью поверх — ещё и Магазин; закрыли превью — Магазин ожил; закрыли всё — пауз нет`,
      p0 === '' && p1 === 'system-container' && p2 === 'shopOverlay,system-container' && p3 === 'system-container' && p4 === '', [p0, p1, p2, p3, p4].join(' | '));
  }
  E(w, "setTheme('system')"); await tick();
  D.dispatchEvent(new w.Event('scroll')); await tick();
  check('T59 v7.1.7: прокрутка ничего не ставит на паузу (класса sys-scrolling нет)', !D.body.classList.contains('sys-scrolling') && typeof E(w, 'AnimPause.scrolling') === 'undefined'); }

// ===== v7.1.5 =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n'), src = [...D.querySelectorAll('script')].map(x => x.textContent).join('\n');
  check('T60 виньетка главного экрана 16px в цвет основы (под Бременем — красно-тёмная); «Проверки нагрузки» в Длани больше нет, её запись стирается',
    /body\.theme-sys \.mscr \.sf-vig \{[^}]*linear-gradient\(90deg, #030914, rgba\(3,9,20,0\) 16px, rgba\(3,9,20,0\) calc\(100% - 16px\), #030914\)/.test(css)
    && /body\.theme-sys\.sys-anom \.mscr \.sf-vig \{ background: linear-gradient\(90deg, #12040a, rgba\(18,4,10,0\) 16px/.test(css)
    && !D.getElementById('perfTestSection') && !/perf-tg|perf-col|perf-ico|perfTest/.test(css + src) && /localStorage\.removeItem\('sl_perf_test'\)/.test(src)); }

// ===== v7.1.6 =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n'), src = [...D.querySelectorAll('script')].map(x => x.textContent).join('\n');
  check('T61 фон главного экрана — одна картинка размером с экран (узоры с прежней прозрачностью, виньетка 16px, красная под Бременем), «прилипает» к экрану; без холста — прежние слои',
    /body\.theme-sys \.mscr > \.sf-screen \{ overflow: clip; \}/.test(css) && /body\.theme-sys \.mscr \.sf-mbg \{ position: sticky; top: 0; display: block; \}/.test(css)
    && /const MBG_PAT = 0\.55, MBG_VIG = 16;/.test(src) && /\[\[TEXC_CV, MBG_PAT \* \.9\], \[TEXS_CV, MBG_PAT \* \.85\]\]/.test(src)
    && /const base = red \? '#12040a' : '#030914'/.test(src) && /hue-rotate\(140deg\) saturate\(1\.3\)/.test(src) && /mbg = mainBg\(w, L, R, scheme === 'red'\);/.test(src)
    && /if \(mbg\) scr\.appendChild\(mbg\);\s+else scr\.innerHTML = `<div class="sf-base">/.test(src));
  const pool = J(w, 'SYSTEM_NOTICES.complete');
  check('T62 уведомление о выполнении задания: «Задание выполнено в полном объёме.» вместо «исполнено»',
    JSON.parse(pool).includes('Задание выполнено в полном объёме.') && !/Задание исполнено/.test(pool) && new Set(JSON.parse(pool)).size === 9, pool); }

// ===== v7.1.7 =====
{ const css = [...D.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const mk = () => { const el = D.createElement('div'); el.className = 'sf-win mwin'; el.innerHTML = '<div class="sf-content"><div class="sf-panel"></div></div>';
    Object.defineProperty(el, 'offsetWidth', { value: 390 }); Object.defineProperty(el, 'offsetHeight', { value: 600 }); D.body.appendChild(el); return el; };
  const e1 = mk(); w.__el = e1; E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)");
  const ens = [...e1.querySelectorAll(':scope > .sf-en')], kids = [...e1.children].map(c => c.classList.contains('sf-near') ? 'near' : c.classList.contains('sf-en') ? 'en' : c.classList.contains('sf-over') ? 'back' : '');
  const ok = ens.length === 2 && ens.every(d => /mask-image:\s*url\("data:image\/svg\+xml/.test(d.getAttribute('style')) && d.querySelector('i.sf-energy'))
    && ens[1].querySelector('i.sf-b') && /--a:-97\.5px;--z:487\.5px/.test(ens[0].querySelector('i').getAttribute('style'))
    && kids.indexOf('back') < kids.indexOf('en') && kids.lastIndexOf('en') < kids.indexOf('near');
  check('T63 энергия — отдельный слой с маской по линиям (2 полосы), вспышка от −25% до 125% ширины окна, между средним и ближним стеклом; в анимации — только transform',
    ok && /@keyframes sfEnergy \{ 0% \{ transform: translateX\(var\(--a\)\); \} 60%, 100% \{ transform: translateX\(var\(--z\)\); \} \}/.test(css)
    && /\.sf-en > \.sf-energy\.sf-b \{ animation-delay: -4\.4s; \}/.test(css), kids.join(','));
  E(w, "SysFrame.render(__el, 'blue', SYS_FRAME_OPT)"); const twice = e1.querySelectorAll(':scope > .sf-en').length;
  e1.remove();
  E(w, "setTheme('classic')"); await tick(); const leftC = D.querySelectorAll('.sf-en, .sf-pat, svg.sf-frm').length; E(w, "setTheme('system')"); await tick();
  check('T65 повторная отрисовка рамки не копит слои энергии; в «Классике» слоёв энергии и рамки не остаётся', twice === 2 && leftC === 0, `${twice} ${leftC}`);
  check('T64 свечение текста: на body нет; у заголовков окон, разделов, глав, «Активных эффектов», упражнений, цифр, имени/ранга/титула, опыта и кредитов — есть; у предметов, дней, кнопок, текста уведомлений — нет',
    /body\.theme-sys #hdrName, body\.theme-sys #stName, body\.theme-sys #hdrRank, body\.theme-sys #stRank, body\.theme-sys #hdrTitle, body\.theme-sys #stTitle,\s+body\.theme-sys #hdrExp, body\.theme-sys #stExp, body\.theme-sys #hdrCredits, body\.theme-sys #stCredits,/.test(css)
    && /body\.theme-sys \.sf-win\.mwin \.item-name \{[^}]*text-shadow: none;/.test(css)
    && /body\.theme-sys \.day-cell, body\.theme-sys #calStreakLine, body\.theme-sys \.sys-notice \.sn-body,[^{]*\{ text-shadow: none; \}/.test(css)
    && /letter-spacing: 1\.5px; text-shadow: none;   \/\* v7\.1\.7: кнопки без свечения \*\//.test(css)
    && !/\.sf-win\.mwin \.item-name, body/.test(css) && !/#btnStr/.test(css.slice(css.indexOf('v7.0.9:')))); }

// ===== v7.1.8: маленькие иконки (icons/items-s) =====
{ const root = path.join(__dirname, '..'), small = new Set(fs.readdirSync(path.join(root, 'icons', 'items-s')));
  const ids = J(w, `[...Object.keys(SHOP_CATALOG), ...Object.keys(UNIQUE_CATALOG), ...Object.keys(BOX_CATALOG), ...Object.keys(KEY_CATALOG), ...Object.keys(ARTEFACTS), ...Object.values(TITLE_ICON_IDS)]`);
  const src = [...D.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const effStatic = [...src.matchAll(/icon: 'icons\/items\/([\w-]+)\.png'/g)].map(m => m[1]);
  const need = [...new Set([...JSON.parse(ids), ...effStatic])], miss = need.filter(id => !small.has(id + '.png'));
  const big = fs.readdirSync(path.join(root, 'icons', 'items')).filter(f => f.endsWith('.png') && f !== 'ice_layer_freeze.png');
  check('T66 маленькая копия есть у каждого предмета, титула и значка эффекта (и у каждого оригинала, кроме льда)', miss.length === 0 && big.every(f => small.has(f)), miss.join(','));
  closeAll(w); await tick(); E(w, 'openShop()'); await tick();
  const shopSrc = [...D.querySelectorAll('#shopOverlay img.item-icon-img')].map(i => i.getAttribute('src'));
  E(w, "showItemPreview('crystal_restoration', 'К')"); await tick();
  const prevSrc = D.getElementById('itemPreviewImg').getAttribute('src');
  closeAll(w); await tick();
  E(w, "data.insurance = true; data.insuranceSourceId = 'rune_protection'; render()"); await tick();
  const eff = [...D.querySelectorAll('#effectsRow .effect-icon-btn')], effImgs = eff.map(b => b.querySelector('img').getAttribute('src'));
  const runeBtn = eff.find(b => /rune_protection\.png/.test(b.querySelector('img').getAttribute('src')));
  check('T67 Магазин и панель эффектов — маленькие иконки; признаки руны (глубокое свечение, разряд — по исходному адресу) сохранены; окно просмотра — оригинал',
    shopSrc.length > 3 && shopSrc.every(x => x.startsWith('icons/items-s/')) && effImgs.length > 0 && effImgs.every(x => x.startsWith('icons/items-s/'))
    && !!runeBtn && runeBtn.classList.contains('glow-deep') && E(w, `isWorkingRune({ icon: 'icons/items/rune_protection.png' })`) && prevSrc === 'icons/items/crystal_restoration.png',
    `${shopSrc[0]} | ${effImgs.join(' ')} | ${prevSrc}`);
  E(w, "data.insurance = false; data.insuranceSourceId = null; render()");
  const img = D.createElement('img'); img.setAttribute('src', 'icons/items-s/nope.png'); D.body.appendChild(img);
  img.dispatchEvent(new w.Event('error')); const after1 = img.getAttribute('src');
  img.dispatchEvent(new w.Event('error')); const after2 = img.getAttribute('src'); img.remove();
  check('T68 нет маленькой копии на сайте — картинка подменяется оригиналом (один раз, без зацикливания)', after1 === 'icons/items/nope.png' && after2 === 'icons/items/nope.png', after1);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8'), listed = new Set([...sw.matchAll(/'\.\/icons\/items-s\/([\w.-]+)'/g)].map(m => m[1]));
  check('T69 sw.js: маленькие копии — в фоновой докачке (все файлы папки) и в кэше картинок, а не каркаса',
    [...small].every(f => listed.has(f)) && listed.size === small.size && /pathname\.includes\('\/icons\/items-s\/'\)/.test(sw)); }

console.log(results.join('\n'));
console.log(`Итого: ${results.filter(r => r.startsWith('OK')).length} OK, ${results.filter(r => r.startsWith('FAIL')).length} FAIL`);
process.exit(0);
})();
