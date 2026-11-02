// v7.6.1: Испытание ранга — предложение, окна, этапы, время, оценка, награда, провал, засчитанный день, Летопись, шкатулки, бэкап.
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
function boot(seed) {
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
    }
  });
  const w = dom.window;
  if (process.env.SL_THEME !== 'system') w.eval("setTheme('classic')");
  return w;
}
const E = (w, c) => w.eval(c);
const J = (w, c) => JSON.parse(E(w, `JSON.stringify(${c})`));
const CLR = `notificationQueue.length = 0; document.querySelectorAll('.sys-notice,.system-popup').forEach(n => n.remove()); notificationActive = false;`;
const HIDE = `document.querySelectorAll('.status-overlay').forEach(o => o.style.display = 'none');`;

(async () => {
  const w0 = boot(); await sleep(200);
  const SEED = E(w0, `JSON.stringify(Object.assign({}, data, { rulesAcknowledged: true, playerName: 'T', level: 12, exp: 0, dailyTargetLevel: 12, lastReset: getLastResetThreshold(Date.now()), tnAdj: 30 }))`);
  w0.close();
  const mk = async (extra) => { const w = boot(SEED); await sleep(300); E(w, CLR + HIDE + (extra || '')); return w; };
  // базовое состояние для условий: шкала 80%, до сброса больше 5 часов
  const ready = `data.tnAdj = 30; data.exp = Math.ceil(getExpToNext(data.level) * 0.8); data.expDebt = 0; data.exam = null; data.examPost = null; data.examLastOffer = null; data.examDelayUntil = null; data.examNarrow = false;
    data.curseActiveToday = false; data.pendingCurse = false; data.activeScroll = null; data.pendingScroll = null; examDeadlineTs = () => Date.now() + 6 * 3600000;`;

  // ---- условия и допуск ----
  let w = await mk(ready);
  check('X1 условия выполнены — предложение можно выдать', E(w, 'examCanOffer()') === true, JSON.stringify(J(w, 'examConds()')));
  const fails = {
    bar: 'data.exp = Math.floor(getExpToNext(data.level) * 0.69)', debt: 'data.expDebt = 10', curse: 'data.curseActiveToday = true', pcurse: 'data.pendingCurse = true',
    scroll: "data.activeScroll = 'contract'", pscroll: "data.pendingScroll = 'veil'", delay: 'data.examDelayUntil = data.lastReset + 86400000',
    gap: 'data.examLastOffer = data.lastReset - 2 * 86400000', time: 'examDeadlineTs = () => Date.now() - 1', tn: 'data.tnAdj = 0' };
  const bad = Object.entries(fails).filter(([k, c]) => { E(w, ready + c); return E(w, 'examCanOffer()') !== false; }).map(x => x[0]);
  check('X2 каждое условие закрывает предложение: шкала < 70%, долг, Бремя (и ждущее), свиток (и ждущий), задержка, < 3 циклов, < 5 часов до сброса, ТН', bad.length === 0, bad.join(','));
  E(w, ready + 'data.examLastOffer = data.lastReset - 3 * 86400000');
  check('X3 через 3 цикла после прошлого предложения — можно', E(w, 'examCanOffer()') === true);
  E(w, ready + 'data.tnAdj = 300; data.tn = { pushups: 0, squats: 0, pullups: 0, press: 0, steps: 0 }; data.rank = null');
  check('X4 допуск: 300 ТН без ранга — до C (прыжок), после провала — сужение до ближайшего (E)', E(w, 'examAdmission()') === 'c' && (E(w, 'data.examNarrow = true; examAdmission()') === 'e'), E(w, 'examAdmission()'));
  E(w, ready + "data.examNarrow = false; data.rank = 's'; data.level = 60; data.tnAdj = 5000; data.rankHoldDays = 19");
  check('X5 National: выдержка в S 19 из 20 — допуска нет, 20 — есть; прыжка в группу 3 нет', E(w, 'examAdmission()') === null && E(w, 'data.rankHoldDays = 20; examAdmission()') === 'national'
    && E(w, "data.rank = 'a'; examAdmission()") === 's');
  w.close();

  // ---- предложение и окна ----
  w = await mk(ready);
  E(w, 'examOffer(false)');
  const l1 = J(w, "[...document.querySelectorAll('#exC1 .ex-line')].map(e => e.textContent)");
  check('X6 предложение: окно 1 с допуском и сроком', E(w, 'exOv1.style.display') === 'flex' && l1[0] === 'Открыт доступ к Испытанию ранга.' && l1[1] === 'Допуск: ранг E.' && /^Принять предложение можно до \d\d:\d\d\.$/.test(l1[2]) && E(w, 'data.exam.st') === 'offered', JSON.stringify(l1));
  check('X6a глава «Испытание ранга» — после окна 1 (не поверх него)', !J(w, 'data.codexUnlocked').includes('rank_trial'));
  E(w, 'examGo(2)');
  const c2 = E(w, 'exC2.textContent');
  check('X7 окно 2: условия дословно, «штраф» красным жирным', /Испытание включает пять этапов: отжимания, приседания, подтягивания, пресс и бег\. Порядок этапов определяет Игрок\./.test(c2)
    && /На всё испытание отводится 3 часа с момента начала\./.test(c2) && !!w.document.querySelector('#exC2 .ex-pen') && J(w, 'data.codexUnlocked').includes('rank_trial'), c2.slice(0, 80));
  E(w, 'examDecline()');
  check('X8 отказ от предложения — без штрафа, следующее не раньше чем через 3 цикла', E(w, 'data.exam') === null && E(w, 'data.examLastOffer') === E(w, 'data.lastReset') && E(w, 'examCanOffer()') === false && E(w, 'data.exp') === E(w, 'Math.ceil(getExpToNext(data.level) * 0.8)'));
  E(w, ready + 'examOffer(false); examGo(2); examAccept()');
  check('X9 «Принять» → окно 3: [Начать] [Подготовиться], ниже красная [Отказаться]', E(w, 'data.exam.st') === 'accepted' && E(w, 'exOv3.style.display') === 'flex'
    && E(w, "[...document.querySelectorAll('#exC3 .ex-pair button')].map(b => b.textContent).join('|')") === 'Начать|Подготовиться' && !!w.document.querySelector('#exC3 .ex-col button.ex-red'));
  E(w, 'examPrepare()'); await sleep(100);
  check('X10 «Подготовиться» → значок на главной', E(w, "exIcon.classList.contains('on')") && E(w, 'exOv3.style.display') === 'none');
  E(w, 'examRefuseAsk(true)');
  const loss70 = E(w, 'Math.round(getExpToNext(data.level) * 0.7)');
  check('X11 окно 4: штраф точным числом EXP, задержка 5 дней; «Вернуться» → окно 3', new RegExp(`Штраф: -${loss70} EXP\\.`).test(E(w, 'exC4.textContent')) && /не ранее чем через 5 дней/.test(E(w, 'exC4.textContent'))
    && (E(w, 'examRefuseBack(true); exOv3.style.display') === 'flex'));
  const saved = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
  w = boot(saved); await sleep(1200);
  check('X12 перезапуск с принятыми условиями — значок на главной', E(w, "exIcon.classList.contains('on')") && E(w, 'data.exam.st') === 'accepted');
  // срок старта истёк — «Срок упущен»
  E(w, CLR + HIDE + 'data.exp = 100; data.expDebt = 0; data.exam.dl = Date.now() - 1000'); await sleep(300);
  const toN = E(w, 'getExpToNext(data.level)');
  check('X13 срок старта истёк — «Срок упущен»: штраф 100%, нехватка в долг, задержка 7 дней, сужение', E(w, 'exPenOverlay.style.display') === 'flex' && /Итог: Срок упущен/.test(E(w, 'exPenContent.textContent'))
    && E(w, 'data.exp') === 0 && E(w, 'data.expDebt') === toN - 100 && E(w, 'data.examDelayUntil') === E(w, 'data.lastReset') + 7 * 86400000 && E(w, 'data.examNarrow') === true
    && /Испытание не начато в отведённый срок\. Допуск аннулирован\./.test(E(w, 'exPenContent.textContent')) && /Из них в долг: -\d+ EXP/.test(E(w, 'exPenContent.textContent')), E(w, 'exPenContent.textContent'));
  check('X14 штраф испытания не меняет тяжесть, «штрафов подряд» и серию; запись в журнале', E(w, 'data.penaltyStreak') === 0 && E(w, 'data.penaltyRun') === 0
    && /^Испытание ранга провалено: срок упущен\. Потеряно опыта: -\d+\. Из них в долг: -\d+ EXP\.$/.test(E(w, 'data.notificationLog[0].text')), E(w, 'data.notificationLog[0].text'));
  E(w, "showNotice('Тест уведомления', 'info')");
  check('X15 уведомления, пока открыт итог, копятся', E(w, 'exHeldN.length') >= 1 && E(w, "notificationQueue.every(q => q.body !== 'Тест уведомления')"));
  E(w, 'closeExamPenalty()'); await sleep(300);
  check('X16 после итога — выходят', E(w, 'exHeldN.length') === 0 && E(w, 'data.examPost') === null);
  w.close();

  // ---- экран испытания и этапы ----
  w = await mk(ready + 'examOffer(false); examGo(2); examAccept(); examStart();');
  await sleep(1300);
  check('X17 «Начать» → экран испытания: заголовок, «До конца испытания», допуск, пять карточек; Магазин и Инвентарь погашены, Архив — нет',
    E(w, "document.body.classList.contains('exm')") && E(w, "document.querySelector('.quest-panel .title').textContent") === 'ИСПЫТАНИЕ РАНГА' && /^0[23]:\d\d:\d\d$/.test(E(w, 'exTimer.textContent'))
    && E(w, "document.querySelectorAll('.ex-card').length") === 5 && E(w, "[...document.querySelectorAll('.sub-menu-grid button.ex-off')].map(b => b.textContent.trim()).join(',')") === 'МАГАЗИН,ИНВЕНТАРЬ', E(w, 'exTimer.textContent'));
  check('X18 Архив во время испытания: импорт и «Сбросить всё» заблокированы, тема — только во время этапа', (() => { E(w, 'openBackupModal()'); const imp = E(w, "[...document.querySelectorAll('#backupContent button')].find(b => b.textContent === 'Выбрать файл').disabled"),
    rst = E(w, "document.querySelector('#backupContent .reset-all').disabled"), th = E(w, "document.querySelector('#backupContent .theme-seg button').disabled"); E(w, 'closeBackupModal()'); return imp && rst && !th; })());
  E(w, "examBegin('pushups')");
  check('X19a v7.6.3: шкала усталости видна на открытом слое этапа (без внесённых повторений)', E(w, "fzPopUntil = 0; fzDraw(false); fzBar.classList.contains('on') && fzBar.classList.contains('fz-ex')"));
  E(w, 'examLayer(false)');
  check('X19b на экране испытания без открытого этапа — обычное правило (без повторений и ниже 70 — не видна)', E(w, "data.fatigue = emptyFatigue(); fzPopUntil = 0; fzDraw(false); !fzBar.classList.contains('on') && !fzBar.classList.contains('fz-ex')"));
  E(w, 'examLayer(true)');
  check('X19 «Начать этап» → слой этапа; остальные карточки неактивны', E(w, "exLayer.classList.contains('on')") && E(w, "exk_squats.classList.contains('ex-lock')") && /Этап идёт/.test(E(w, 'exk_pushups.textContent')));
  E(w, 'data.exam.S.pushups.t0 -= 55'); await sleep(250);
  E(w, "exFzAddCalls = 0; const oF = fzAdd; fzAdd = function () { exFzAddCalls++; return oF.apply(this, arguments); }; examAdd(10); examAdd(5); examAdd(-1)");
  check('X20 отдых раунда 1: ввод +1 +5 +10 / −1 −5 −10; шкала усталости — да', J(w, 'data.exam.S.pushups.vals')[0] === 14 && E(w, 'exFzAddCalls') === 2 && /Отдых/.test(E(w, "exLayer.querySelector('.lb').textContent")));
  E(w, 'data.exam.S.pushups.t0 -= 35'); await sleep(250);
  check('X21 не внесённый раунд — 0; во время работы ввод заблокирован', J(w, 'data.exam.S.pushups.vals')[0] === 14 && E(w, "exLayer.querySelector('[data-in]').disabled") === true && E(w, 'examAdd(5); data.exam.S.pushups.vals[1]') === null);
  E(w, 'data.exam.S.pushups.t0 -= 35'); await sleep(250);
  check('X22 отдых раунда 2 — раунд 2 засчитан нулём, если пропущен ввод; «Завершить» — только в окне после 4-го раунда', J(w, 'data.exam.S.pushups.vals')[1] === null && E(w, "exFinBtn.disabled") === true);
  const tn0 = E(w, 'data.tn.pushups'), st0 = E(w, 'totalStats.pushups');
  E(w, 'data.exam.S.pushups.t0 -= 200'); await sleep(300);
  check('X23 окно ввода истекло — этап закрыт сам; раунды без ввода — 0; повторения в ТН и «Прогресс»', E(w, 'data.exam.S.pushups.st') === 'done' && J(w, 'data.exam.S.pushups.vals').join(',') === '14,0,0,0'
    && Math.abs(E(w, 'data.tn.pushups') - tn0 - 0.14 * E(w, 'data.tnMul')) < 1e-9 && E(w, 'totalStats.pushups') === st0 + 14 && /Раунды: 14 · 0 · 0 · 0/.test(E(w, 'exk_pushups.textContent')));
  // бег, карманный режим, ускоритель
  E(w, "data.examAccel = true; examBegin('steps')"); E(w, 'data.exam.S.steps.t0 -= 12'); await sleep(300);
  check('X24a v7.6.3: шкала усталости в карманном режиме видна и лежит поверх него', E(w, "fzBar.classList.contains('on') && fzBar.classList.contains('fz-ex')") && w.getComputedStyle(w.document.getElementById('fzBar')).zIndex === '1955');
  check('X24 бег: карманный режим включается сам на старте; ускоритель виден и приглушён', E(w, "exPocket.classList.contains('on')") && E(w, "exAcc.classList.contains('on')") && E(w, "exAcc.classList.contains('dim')"));
  const v0 = E(w, 'examNow()'); E(w, "document.querySelector('#exAcc button[data-v=\"20\"]').click()"); E(w, 'data.exam.vAt -= 1000'); const v1 = E(w, 'examNow()');
  check('X25 ×20: за 1 с проходит 20 с испытания, без скачка при переключении', v1 - v0 > 19 && v1 - v0 < 21.5, v1 - v0);
  E(w, "openBackupModal()"); await sleep(250);
  check('X26 ускоритель прячется под открытым окном', E(w, "exAcc.classList.contains('on')") === false);
  E(w, 'closeBackupModal(); examSetSpeed(1); examPocket(false)');
  E(w, 'data.exam.S.steps.t0 -= 1210'); await sleep(250);
  E(w, 'examAdd(500); examAdd(500); examAdd(500); examAdd(500); examAdd(100); examAdd(-10)');
  check('X27 бег: ввод шагов +10 +100 +500 / −…; «Завершить этап» доступно', E(w, 'data.exam.S.steps.steps') === 2090 && E(w, 'exFinBtn.disabled') === false);
  await sleep(150);
  check('X27a v7.6.3: пока закрыты не все этапы, «Отказаться от испытания» доступна', E(w, 'exRefuseBtn.disabled') === false);
  E(w, 'examFinish()');
  // сброс дня снимает галочку ускорителя (проверка через examAtReset)
  check('X28 галочка ускорителя снимается при сбросе дня', (() => { E(w, 'data.examAccel = true; examAtReset({ status: "success" })'); return E(w, 'data.examAccel') === false; })());
  // оценка
  E(w, `['squats', 'pullups', 'press'].forEach((id, i) => { const s = data.exam.S[id]; s.st = 'done'; s.vals = [[13, 13, 12, 12], [3, 3, 3, 3], [10, 10, 10, 10]][i]; }); data.exam.S.pushups.vals = [8, 8, 7, 7]; data.exam.S.steps.steps = 2300;`);
  E(w, 'examRefuseSync()');
  { const xp0 = E(w, 'data.exp'), d0 = E(w, 'data.examDelayUntil');
    E(w, 'examRefuseAsk(false)'); const ov4 = E(w, "exOv4.style.display");
    E(w, 'examRefused()');
    check('X28a v7.6.3: все этапы закрыты — «Отказаться от испытания» заблокирована, окно отказа не открывается, штрафа нет', E(w, 'exRefuseBtn.disabled') === true && ov4 !== 'flex' && E(w, 'data.exp') === xp0 && E(w, 'data.examDelayUntil') === d0 && E(w, "data.exam && data.exam.st") === 'running', JSON.stringify([ov4, xp0, E(w, 'data.exp')])); }
  const sc = J(w, 'examScore()');
  check('X29 оценка: по упражнению — ранг по нормативу; среднее вниз; «слабейшее + 1»; допуск', JSON.stringify(sc.per) === '[1,1,1,1,1]' && sc.res === 1 && sc.ok === true, JSON.stringify(sc));
  E(w, "data.exam.adm = 'c'; data.exam.S.pushups.vals = [15, 15, 15, 15]; data.exam.S.squats.vals = [19, 19, 18, 18]; data.exam.S.pullups.vals = [3, 3, 3, 3]; data.exam.S.press.vals = [16, 16, 16, 16]; data.exam.S.steps.steps = 2700");
  const sc2 = J(w, 'examScore()');
  check('X30 «слабейшее + 1»: подтягивания на E держат итог на D', JSON.stringify(sc2.per) === '[3,3,1,3,3]' && sc2.avg === 2 && sc2.weak === 2 && sc2.res === 2, JSON.stringify(sc2));
  E(w, "data.exam.S.pullups.vals = [5, 5, 4, 4]");
  const sc3 = J(w, 'examScore()');
  check('X31 прыжок в пределах допуска: без ранга, допуск до C, все на C → C', sc3.res === 3 && sc3.ok, JSON.stringify(sc3));
  // успех с прыжком
  E(w, CLR + 'data.level = 12; data.exp = getExpToNext(12) - 50; data.expDebt = 0; data.boxes = {}; data.titlesUnlocked = ["Новичок"]; data.activeTitle = "Новичок"; examEvaluate()'); await sleep(2300);
  check('X32 «Система оценивает результат…» → ранг C, шкатулки за E, D, C, опыт 30% только за итоговый', E(w, 'data.rank') === 'c' && JSON.stringify(J(w, 'data.boxes')) === '{"box_rank_e":1,"box_rank_d":1,"box_rank_c":1}'
    && E(w, 'data.examPost.xp') === E(w, 'Math.round(getExpToNext(12) * 0.3)') && E(w, 'data.exam') === null, JSON.stringify(J(w, '[data.rank, data.boxes, data.examPost]')));
  { const xp0 = E(w, 'data.exp'); E(w, 'examRefuseAsk(false); examRefused()');
    check('X32a v7.6.3: после итога (окно ранга) кнопка отказа заблокирована, нажатие не даёт штрафа', E(w, 'exRefuseBtn.disabled') === true && E(w, 'data.exp') === xp0 && E(w, 'data.examPost.kind') === 'ok' && E(w, "exOv4.style.display") !== 'flex'); }
  await sleep(4000);
  const c5 = E(w, 'exC5.textContent').replace(/\s+/g, ' ');
  check('X33 окно ранга: «Ранг подтверждён: C-Rank», строка ранга, «Награда:», три шкатулки и опыт', E(w, 'exOv5.style.display') === 'flex' && /Ранг подтверждён: C-Rank/.test(c5) && /Прогресс стал устойчивым\./.test(c5)
    && /Шкатулка ранга E.*Шкатулка ранга D.*Шкатулка ранга C/.test(c5) && /\+\d+ EXP/.test(c5), c5);
  E(w, "window.__lv = []; const oLU = levelUpFx; levelUpFx = function () { window.__lv.push(Date.now()); return oLU.apply(this, arguments); }; window.__t0 = Date.now(); examRankClose()"); await sleep(1200);
  check('X33a v7.6.3: сразу после окна ранга LEVEL UP нет и глав ещё нет (пауза 2 с)', E(w, '__lv.length') === 0 && !J(w, 'data.codexUnlocked').includes('rank_c'));
  await sleep(1200);
  check('X33b через 2 с — LEVEL UP (уровень вырос), очередь строго: Кодекс E, D, C → титул → «Достигнут …-й уровень.»', E(w, '__lv.length') === 1 && E(w, '__lv[0] - __t0') >= 1950 && E(w, '__lv[0] - __t0') < 2600
    && (() => { const q = J(w, '[currentNotificationBody].concat(notificationQueue.map(x => x.body))').filter(Boolean).join(' | '); return /^Записано в Кодекс: E-Ранг \| Записано в Кодекс: D-Ранг \| Записано в Кодекс: C-Ранг \| Новый титул: Пробужденный.*Достигнут \d+-й уровень\./.test(q); })(), JSON.stringify(J(w, '[__lv.map(t => t - __t0), currentNotificationBody, notificationQueue.map(x => x.body)]')));
  check('X34 после окна: главы E, D, C и «Пробужденный» вместо «Новичка»', ['rank_e', 'rank_d', 'rank_c', 'title_probuzhdenny'].every(c => J(w, 'data.codexUnlocked').includes(c)) && JSON.stringify(J(w, 'data.titlesUnlocked')) === '["Пробужденный"]' && E(w, 'data.activeTitle') === 'Пробужденный');
  E(w, CLR + 'examAsk()');
  check('X35 вопрос о дневном задании (с Пределом с 3-го уровня)', E(w, 'exOv6.style.display') === 'flex' && /Испытание ранга пройдено\. Нагрузка испытания может быть засчитана вместо дневного задания: штрафа и награды за задание не будет, серия дней сохранится, Преодоление предела станет доступно\./.test(E(w, 'exC6.textContent')));
  E(w, 'data.consecutiveDays = 4; data.beadStreak = 0; data.consumables.bone_bead = 0; data.penaltyStreak = 4; data.penaltyRun = 2; examAnswer(true)'); await sleep(1200);
  check('X36 «Засчитать испытание»: день закрыт без награды; галочки, кнопки заблокированы; Предел доступен', E(w, 'data.isGoalMet') && E(w, 'data.examCredited') && E(w, "document.body.classList.contains('exm')") === false
    && E(w, "document.querySelector('.quest-item[data-id=\"pushups\"] .add').disabled") && E(w, "document.querySelector('.quest-item[data-id=\"pushups\"] .qcheck').classList.contains('done')") && E(w, 'allQuestsDone()'));
  E(w, 'data.lastReset -= 86400000; checkMissedDays()');
  const key = E(w, 'Object.keys(data.history).sort().pop()'), h = J(w, `data.history['${key}']`);
  check('X37 при сбросе: «выполнено» 100%, отметка испытания; серия +1, тяжесть −2 шага, «подряд» 0; бусины нет', h.status === 'success' && h.donePercent === 100 && h.exam && h.exam.ok && h.exam.rank === 'c'
    && E(w, 'data.consecutiveDays') === 5 && E(w, 'data.penaltyStreak') === 2 && E(w, 'data.penaltyRun') === 0 && (E(w, 'data.consumables.bone_bead') || 0) === 0 && E(w, 'data.examCredited') === false, JSON.stringify(h));
  check('X38 выдержка в ранге: рабочий день +1', E(w, 'data.rankHoldDays') === 1);
  E(w, HIDE + 'openChronicle()');
  check('X39 Летопись: клетка жёлтая, мини-шестигранник; подсказка «Испытание ранга пройдено. Подтверждён ранг C.»; две строки в «Обозначениях»',
    E(w, "document.querySelectorAll('.day-cell.exam-ok .cal-ex.ok').length") >= 1 && E(w, `buildDayDetail('${key}', data.history['${key}'], false)`).includes('Испытание ранга пройдено. Подтверждён ранг C.')
    && /Испытание ранга пройдено/.test(E(w, 'legendBody.textContent')) && E(w, "[...legendBody.children].filter(c => /Испытание ранга/.test(c.textContent)).length") === 2);
  // шкатулка ранга
  E(w, HIDE + 'data.credits = 0; data.consumables = {}; openInv(); performOpenRankBox("box_rank_c")'); await sleep(800);
  check('X40 шкатулка ранга C: 7000 кредитов и фиксированный набор', E(w, 'data.credits') === 7000 && JSON.stringify(J(w, 'data.consumables')) === '{"tablet_of_reassessment":1,"rune_protection_absolute":1,"shard_limit_double":1,"rune_redemption":1,"scroll_freeze":1}' && !E(w, 'data.boxes.box_rank_c'));
  check('X41 шкатулки ранга: при повышении уровня не выпадают; ранги NL / SSS / Monarch; одна иконка', !J(w, 'getAvailableBoxTiers()').some(id => /^box_rank/.test(id))
    && E(w, "ITEM_META.box_rank_national.rank + ITEM_META.box_rank_sss.rank + ITEM_META.box_rank_monarch.rank") === 'NLSSSMonarch' && E(w, "iconS('box_rank_sss')") === 'icons/items-s/box_rank.png'
    && /^Ранг: Monarch/.test(E(w, "itemPreviewText('box_rank_monarch')")));
  w.close();

  // ---- провалы ----
  w = await mk(ready + 'examOffer(false); examGo(2); examAccept(); examStart();'); await sleep(1300);
  E(w, CLR + 'data.exp = getExpToNext(data.level); examRefuseAsk(false)');
  check('X42 отказ с экрана испытания: окно 4 с «Продолжить испытание»', /Продолжить испытание/.test(E(w, 'exC4.textContent')));
  const before = E(w, 'data.exp'); E(w, 'examRefused()');
  check('X43 «Отказ»: штраф 70%, задержка 5 дней; окно провала', E(w, 'data.exp') === before - E(w, 'Math.round(getExpToNext(data.level) * 0.7)') && E(w, 'data.examDelayUntil') === E(w, 'data.lastReset') + 5 * 86400000 && /Итог: Отказ/.test(E(w, 'exPenContent.textContent')));
  E(w, 'closeExamPenalty()'); await sleep(1300);
  check('X44 после окна провала — сбой и главная', E(w, "document.body.classList.contains('exm')") === false && E(w, 'data.examToday.kind') === 'refuse');
  E(w, ready + 'examOffer(false); examGo(2); examAccept(); examStart();'); await sleep(1300);
  E(w, CLR + 'data.exam.vt = 3 * 3600 + 1'); await sleep(300);
  check('X45 3 часа истекли — «Не выполнено» (70%, 5 дней)', /Итог: Не выполнено/.test(E(w, 'exPenContent.textContent')) && /Испытание не завершено за отведённое время\. Оценка не проводилась\./.test(E(w, 'exPenContent.textContent')));
  E(w, 'closeExamPenalty()'); await sleep(1300);
  E(w, ready + 'examOffer(false); examGo(2); examAccept(); examStart();'); await sleep(1300);
  E(w, CLR + 'data.isGoalMet = false; data.completed = {}; sysExamEnd("low")'); await sleep(2500);
  check('X46 «Не пройдено»: 25%, 3 дня; после окна — вопрос «Испытание ранга завершено…»', /Итог: Не пройдено/.test(E(w, 'exPenContent.textContent')) && /Результат ниже порога ближайшего ранга\. Форма не подтверждена\./.test(E(w, 'exPenContent.textContent'))
    && E(w, 'data.examDelayUntil') === E(w, 'data.lastReset') + 3 * 86400000);
  E(w, 'closeExamPenalty()'); await sleep(600);
  check('X47 вопрос после «Не пройдено»', E(w, 'exOv6.style.display') === 'flex' && /^Испытание ранга завершено\./.test(E(w, 'exC6 .textContent'.replace(' ', '')).trim()));
  E(w, 'examAnswer(false)'); await sleep(1300);
  check('X48 «Продолжить задание» — обычный день', E(w, 'data.isGoalMet') === false && E(w, 'data.examCredited') === false);
  w.close();

  // ---- перезапуск: этап идёт → экран испытания с «Открыть этап»; закрытое приложение после 3 часов → «Не выполнено» ----
  w = await mk(ready + "examOffer(false); examGo(2); examAccept(); examStart();"); await sleep(1300);
  E(w, "examBegin('squats'); data.exam.S.squats.t0 -= 30; saveData()");
  let sv = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
  w = boot(sv); await sleep(2500); E(w, CLR);
  check('X49 перезапуск во время этапа — экран испытания, карточка «Этап идёт» с «Открыть этап»', E(w, "document.body.classList.contains('exm')") && /Этап идёт/.test(E(w, 'exk_squats.textContent')) && /Открыть этап/.test(E(w, 'exk_squats.textContent')) && !E(w, "exLayer.classList.contains('on')"));
  E(w, 'data.exam.vt = 4 * 3600; saveData()'); sv = w.localStorage.getItem('sl_daily_v5_5_0'); w.close();
  w = boot(sv); await sleep(1500);
  check('X50 приложение открыто после 3 часов — красное окно «Не выполнено»', E(w, 'exPenOverlay.style.display') === 'flex' && /Не выполнено/.test(E(w, 'exPenContent.textContent')) && E(w, 'data.exam') === null);
  w.close();

  // ---- бэкап ----
  w = await mk(ready);
  E(w, "data.examToday = { ok: false, kind: 'low' }; data.rankHoldDays = 7; data.examNarrow = true; data.examDelayUntil = data.lastReset + 3 * 86400000; data.examAccel = true; examOffer(true); saveData()");
  const st = J(w, 'sanitizeImportedData(parseBackupText(buildSignedBackupCode())).state');
  check('X51 бэкап: отметка дня, выдержка, задержка, сужение сохраняются; идущее испытание и галочка ускорителя — нет', st.examToday.kind === 'low' && st.rankHoldDays === 7 && st.examNarrow === true && st.examDelayUntil > 0 && st.exam === null && st.examAccel === undefined, JSON.stringify(st.examToday));
  const hs = J(w, `sanitizeImportedData({ state: Object.assign({}, data, { history: { '2026-10-01': { status: 'success', exam: { ok: true, rank: 'zz' } }, '2026-10-02': { status: 'penalty', exam: { ok: false, kind: 'late' } }, '2026-10-03': { status: 'success', exam: { ok: true, rank: 'b' }, examCredited: true } } }), total: totalStats }).state.history`);
  check('X52 импорт: отметки испытания проверяются', !hs['2026-10-01'].exam && hs['2026-10-02'].exam.kind === 'late' && hs['2026-10-03'].exam.rank === 'b' && hs['2026-10-03'].examCredited === true, JSON.stringify(hs));
  { const css = [...w.document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    check('X53a v7.6.3: у кнопок испытания в «Системе» свои наведение и нажатие (золото и красный)', /body\.theme-sys \.sf-win\.mwin button\.ex-gold:not\(:disabled\):hover[^{]*\{ background: rgba\(255,205,60,\.16\) !important; border-color: #fff0b8 !important; color: var\(--ac\) !important;/.test(css)
      && /body\.theme-sys \.sf-win\.mwin #exRefuseBtn:not\(:disabled\):hover[^{]*\{ background: rgba\(255,60,80,\.16\) !important;/.test(css) && /button\.ex-gold:not\(:disabled\):active/.test(css) && /#exRefuseBtn:not\(:disabled\):active/.test(css)); }
  check('X53 тексты: глава «Испытание ранга», глава «Шкатулки» без тире, описание шкатулки ранга', /^Ранг отражает не уровень, а подтверждённую силу Игрока\./.test(E(w, 'CODEX_CHAPTERS.rank_trial.content'))
    && /За каждый ранг, подтверждённый испытанием, Игрок получает шкатулку ранга\. Чем выше подтверждённый ранг, тем ценнее её содержимое\.$/.test(E(w, 'CODEX_CHAPTERS.boxes.content')) && !/—/.test(E(w, 'CODEX_CHAPTERS.boxes.content'))
    && E(w, 'BOX_CATALOG.box_rank_e.desc') === 'Награда за ранг, подтверждённый испытанием. Содержит кредиты и ценные предметы. Расходуется при открытии.');
  w.close();

  console.log(`\nИтого: ${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
