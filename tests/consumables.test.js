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
const fullLoss = w => E(w, `Math.floor(getExpToNext(data.level)*Math.max(0.05,0.15-Math.floor(data.level/20)*0.03-Math.max(0,data.stats.str-10)*0.0025)*(data.curseActiveToday?3:1)*(data.inventory.includes("amulet_will")?0.85:1))`);

const results = []; const check = (n, c, i) => results.push((c ? 'OK  ' : 'FAIL') + ' ' + n + (i !== undefined && !c ? '  → ' + i : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const warn = (w, id) => E(w, `getUseWarning('${id}')`);
const NAME = { rune_protection:'Руна Защиты', rune_protection_charged:'Руна Защиты (усиленная)', rune_protection_absolute:'Руна Абсолютной Защиты',
  rune_return:'Руна Возврата', potion_growth:'Зелье Роста', rune_growth_charged:'Руна Роста (усиленная)', crystal_impulse:'Кристалл Импульса', crystal_clarity:'Кристалл Ясности' };
const GEN = { rune_protection:'Руны Защиты', rune_protection_charged:'Руны Защиты (усиленной)', rune_protection_absolute:'Руны Абсолютной Защиты',
  rune_return:'Руны Возврата', potion_growth:'Зелья Роста', rune_growth_charged:'Руны Роста (усиленной)', crystal_impulse:'Кристалла Импульса', crystal_clarity:'Кристалла Ясности' };
const setIns = id => id ? `data.insurance=true; data.insuranceSourceId='${id}';` + (id==='rune_protection_absolute' ? ` data.streakShield=true; data.streakShieldSourceId='${id}';` : '') : '';
const failDayStatus = w => { reset(w); const h = JSON.parse(J(w,'data.history')); const k = Object.keys(h).sort().pop(); return h[k].status; };

(async () => {
// ===== A. Уровни защиты =====
const P = ['rune_protection','rune_protection_charged','rune_protection_absolute'];
const T = { rune_protection:1, rune_protection_charged:2, rune_protection_absolute:3 };
for (const a of P) for (const b of [null, ...P]) {
  const w = fresh(setIns(b));
  const wr = warn(w, a); const u = use(w, a);
  const label = `A ${NAME[a]} при ${b ? NAME[b] : 'без защиты'}`;
  if (!b) { check(label + ': активируется', u.spent && E(w,'data.insuranceSourceId') === a, u.notice); continue; }
  if (T[a] > T[b]) {
    check(label + ': поглощает (предупреждение)', wr === `${NAME[a]} поглотит действие ${GEN[b]}.`, wr);
    check(label + ': поглощает (результат)', u.spent && E(w,'data.insuranceSourceId') === a && u.notice.includes(`поглощено действие ${GEN[b]}`), u.notice);
    const st = failDayStatus(w);
    check(label + ': провал полностью защищён', st === 'protected', st);
  } else {
    const exp = T[a] < T[b] ? `Действует более сильная защита: ${NAME[b]}.` : (a === 'rune_protection_absolute' ? 'Обе защиты уже активны.' : 'Защита уже активирована.');
    check(label + ': отказ, не тратится', !u.spent && u.notice === exp && E(w,'data.insuranceSourceId') === b, u.notice);
  }
}
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection'; data.activeScroll='contract';`);
  use(w,'rune_protection_absolute');
  check('A Абсолютная поглощает спящую руну (Договор)', E(w,'data.insuranceSourceId==="rune_protection_absolute" && getInsuranceHoldScroll()===null'));
  check('A … и защищает провал под Договором', failDayStatus(w) === 'protected'); }
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection'; data.curseActiveToday=true;`);
  use(w,'rune_protection_absolute');
  check('A Абсолютная поглощает подавленную руну (Бремя) и защищает', failDayStatus(w) === 'protected'); }
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection_charged'; data.penaltyStack=[{day:'2026-09-01',loss:400,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`);
  const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check('A Усиленная при усиленной, но есть штраф: только возврат', u.spent && !E(w,'findReturnRecord(1)') && wr === 'Защита сейчас не может быть установлена: Руна Защиты (усиленная) уже активна. Руна сработает только для возврата опыта.', wr); }
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection_absolute'; data.penaltyStack=[{day:'2026-09-01',loss:400,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`);
  const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check('A Усиленная при Абсолютной, есть штраф: только возврат, Абсолютная цела', u.spent && E(w,'data.insuranceSourceId')==='rune_protection_absolute' && wr.includes('действует Руна Абсолютной Защиты'), wr); }

// ===== B. Усиленная: возврат при невозможной защите (3.4) =====
const B_CASES = [
  ['задание выполнено', '', 'задание уже выполнено', 'Задание уже выполнено — защита не нужна.'],
  ['Бремя', 'data.curseActiveToday=true;', 'действует Бремя Аномалии', 'Обычная защита бессильна против Бремени Аномалии.'],
  ['Договор', "data.activeScroll='contract';", 'активен Свиток Договора', 'Активен Свиток Договора. Его условия не допускают обычной защиты от штрафа до следующего цикла.'],
  ['Перенос', "data.activeScroll='transfer'; data.transferExerciseId='steps'; data.transferStreakDays=1;", 'активен Свиток Переноса', 'Активен Свиток Переноса. Его условия не допускают обычной защиты от штрафа до следующего цикла.']];
for (const [label, extra, reason, refusal] of B_CASES) {
  let w = fresh(`data.penaltyStack=[{day:'2026-09-01',loss:500,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}]; ${extra}`); if (label === 'задание выполнено') complete(w);
  const expBefore = E(w,'data.exp'); const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check(`B Усиленная, ${label}, штраф есть: предупреждение`, wr === `Защита сейчас не может быть установлена: ${reason}. Руна сработает только для возврата опыта.`, wr);
  check(`B Усиленная, ${label}, штраф есть: только возврат`, u.spent && !E(w,'data.insurance') && !E(w,'findReturnRecord(1)') && E(w,'data.exp') > expBefore && u.notice.includes(`Защита не установлена: ${reason}.`), u.notice);
  w = fresh(extra); if (label === 'задание выполнено') complete(w);
  const u2 = use(w,'rune_protection_charged');
  check(`B Усиленная, ${label}, штрафа нет: согласованный отказ`, !u2.spent && u2.notice === refusal, u2.notice);
}

// ===== C. Баннер штрафа (настоящий showPenaltyBanner) =====
const bannerText = w => E(w, `document.getElementById('penaltyContent').textContent.replace(/\\s+/g,' ').trim()`);
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection';`); reset(w); await sleep(3200);
  const t = bannerText(w);
  check('C Один день с Руной Защиты: фактический процент и строка руны', /\(-6%\)/.test(t) && t.includes('Руна Защиты: штраф снижен вдвое.'), t); }
{ const w = fresh(`data.level=10; data.dailyTargetLevel=10; data.insurance=true; data.insuranceSourceId='rune_protection';`); reset(w); await sleep(3200);
  const t = bannerText(w); check('C Дробный процент с запятой (7,5%)', t.includes('(-7,5%)'), t); }
{ const w = fresh(); reset(w); await sleep(3200);
  const t = bannerText(w); check('C Один день без руны: полный процент, без строки руны', /\(-12%\)/.test(t) && !t.includes('Руна Защиты'), t); }
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection';`); E(w,'data.lastReset -= 2*86400000'); reset(w); await sleep(3200);
  const t = bannerText(w);
  check('C Три дня: без процента, дни и строка руны', !/%/.test(t) && t.includes('Пропущено дней: 3') && t.includes('Руна Защиты снизила штраф за один из дней вдвое.'), t); }

// ===== D. Усиления опыта: все 25 пар =====
const X = ['rune_return','potion_growth','rune_growth_charged','crystal_impulse','crystal_clarity'];
const R = { rune_return:0.15, potion_growth:0.20, rune_growth_charged:0.35, crystal_impulse:0.35, crystal_clarity:0.55 };
const setBoost = b => `data.expBoostToday=${R[b]}; data.expBoostSourceId='${b}';` + (b==='crystal_impulse' ? ` data.creditBoostToday=0.35; data.creditBoostSourceId='crystal_impulse';` : '');
for (const a of X) for (const b of X) {
  const label = `D ${NAME[a]} при ${NAME[b]}`;
  if (a === 'rune_return') {
    // без штрафа — отказ; со штрафом — только возврат
    let w = fresh(setBoost(b)); const u = use(w, a);
    const exp = b === 'rune_return' ? 'Возвращать нечего. Увеличение получаемого опыта уже действует: активен эффект Руны Возврата.'
                                    : `Возвращать нечего. Действует более высокое увеличение получаемого опыта: активен эффект ${GEN[b]}.`;
    check(label + ', штрафа нет: отказ', !u.spent && u.notice === exp, u.notice);
    w = fresh(setBoost(b) + ` data.penaltyStack=[{day:'2026-09-01',loss:300,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`); const wr = warn(w, a); const u2 = use(w, a);
    const head = b === 'rune_return' ? 'Увеличение получаемого опыта уже действует' : 'Действует более высокое увеличение получаемого опыта';
    check(label + ', штраф есть: только возврат', u2.spent && !E(w,'findReturnRecord(1)') && E(w,'data.expBoostSourceId')===b
      && wr === `${head}: активен эффект ${GEN[b]}. Руна сработает только для возврата опыта.` && u2.notice === 'Руна использована. Опыт восстановлен.', wr + ' | ' + u2.notice);
    continue;
  }
  const w = fresh(setBoost(b)); const wr = warn(w, a); const u = use(w, a);
  if (R[a] > R[b]) {
    let expW = `${NAME[a]} поглотит действие ${GEN[b]}: получаемый опыт будет увеличен на ${Math.round(R[a]*100)}%`;
    if (b === 'crystal_impulse') expW += ', а увеличение получаемых кредитов на 35% исчезнет';
    check(label + ': поглощает (предупреждение)', wr === expW + '.', wr);
    check(label + ': поглощает (результат)', u.spent && E(w,'data.expBoostToday')===R[a] && E(w,'data.expBoostSourceId')===a
      && (b !== 'crystal_impulse' || E(w,'data.creditBoostToday')===0), J(w,'{e:data.expBoostToday,s:data.expBoostSourceId,c:data.creditBoostToday}'));
  } else {
    const exp = (R[a] === R[b] ? 'Действует равное увеличение получаемого опыта' : 'Действует более высокое увеличение получаемого опыта') + `: активен эффект ${GEN[b]}.`;
    check(label + ': отказ, не тратится', !u.spent && u.notice === exp && E(w,'data.expBoostSourceId')===b, u.notice);
  }
}
{ const w = fresh(); const u = use(w,'crystal_impulse');
  check('D Импульс без усилений: опыт и кредиты +35%', u.spent && E(w,'data.expBoostToday')===0.35 && E(w,'data.creditBoostToday')===0.35); }
{ const w = fresh(`data.penaltyStack=[{day:'2026-09-01',loss:300,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`); const u = use(w,'rune_return');
  check('D Руна Возврата без усилений: возврат и +15%', u.spent && E(w,'data.expBoostToday')===0.15 && !E(w,'findReturnRecord(1)') && u.notice==='Руна использована. Потерянный опыт восстановлен, получаемый опыт увеличен до следующего сброса.', u.notice); }

// ===== E. Заморозка =====
{ const w = fresh(); complete(w); const u = use(w,'scroll_freeze');
  check('E Заморозка после выполнения (без Предела): в очереди', u.notice === 'Заморозка вступит в силу со следующего цикла.' && E(w,'data.pendingScroll')==='freeze' && E(w,'data.activeScroll')===null, u.notice);
  E(w,'window.__N=[]'); const st = failDayStatus(w); await sleep(3300);
  check('E … выполненный день записан как выполненный', st === 'success', st);
  check('E … в первый замороженный день нет стартового уведомления', E(w,'data.activeScroll')==='freeze' && !E(w,'window.__N.join("|")').includes('Получено задание'), E(w,'window.__N.join(" | ")'));
  for (let i=0;i<5;i++) reset(w);
  E(w,'data.freezeEndTimestamp = Date.now()-1; window.__N=[]'); reset(w); await sleep(3300);
  const n = E(w,'window.__N.join(" | ")');
  check('E … после окончания: «Заморозка завершилась.» и стартовое уведомление', n.includes('Заморозка завершилась.') && !n.includes('Задание возобновлено') && n.includes('Получено задание на день'), n);
  check('E … флаг выполнения не пережил Заморозку', !E(w,'data.dailyNotices.complete') && !E(w,'allQuestsDone()')); }
{ const w = fresh(`data.completed={pushups:50};`); const u = use(w,'scroll_freeze');
  check('E Заморозка посреди задания: сразу', E(w,'data.activeScroll')==='freeze', u.notice);
  for (let i=0;i<6;i++) reset(w);
  E(w,'data.freezeEndTimestamp = Date.now()-1; window.__N=[]'); reset(w); await sleep(3300);
  const n = E(w,'window.__N.join(" | ")');
  check('E … после окончания: «Задание возобновлено», без стартового, прогресс цел', n.includes('Заморозка завершилась. Задание возобновлено.') && !n.includes('Получено задание') && E(w,'data.completed.pushups')===50, n); }
{ const w = fresh(`data.isGoalMet=true;`); use(w,'scroll_freeze');
  check('E Заморозка во время Предела: в очереди', E(w,'data.pendingScroll')==='freeze'); }

// ===== F. Скрижаль Пересмотра =====
const TW = 'Сброс характеристик изменит цели текущего задания. Уже закрытые упражнения могут снова стать незакрытыми.';
{ const w = fresh(`data.stats.sta=30; data.completed={pushups:10};`); check('F Скрижаль: прогресс есть, задание не выполнено — предупреждение', warn(w,'tablet_of_reassessment') === TW); }
{ const w = fresh(`data.stats.sta=30;`); check('F Скрижаль: прогресса нет — без предупреждения', warn(w,'tablet_of_reassessment') === ''); }
{ const w = fresh(`data.stats.sta=30;`); complete(w); check('F Скрижаль: задание выполнено — без предупреждения', warn(w,'tablet_of_reassessment') === ''); }
{ const w = fresh(`data.completed={pushups:10};`); E(w,'data.stats={str:10,agi:10,sta:10,int:10,per:10}'); check('F Скрижаль: очки не вложены — без предупреждения', warn(w,'tablet_of_reassessment') === ''); }

// ===== G. Осколки Предела =====
for (const id of ['shard_limit','shard_limit_double','rune_limit_charged']) {
  let w = fresh();
  check(`G ${id}: до выполнения — предупреждение`, warn(w,id) === 'Преодоление предела будет доступно только после выполнения задания. Неиспользованные попытки исчезнут с началом нового цикла.', warn(w,id));
  w = fresh(); complete(w); const u = use(w,id);
  check(`G ${id}: после выполнения — без предупреждения, хвост в уведомлении`, warn(w,id) === '' && u.notice.endsWith(' Неиспользованные попытки исчезнут с началом нового цикла.'), u.notice);
  w = fresh(`data.activeScroll='freeze';`);
  check(`G ${id}: во время Заморозки — свой текст`, warn(w,id) === 'Преодоление предела будет доступно после окончания Заморозки и выполнения задания.');
}

// ===== H. Окно подтверждения =====
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection'; data.consumables={rune_protection_absolute:1};`);
  E(w,`useItem('rune_protection_absolute')`);
  const t = E(w,`document.getElementById('confirmContent').textContent`);
  check('H Предупреждение попадает в окно «ЗАПРОС РЕШЕНИЯ» вторым абзацем', t.includes('Использовать «Руна Абсолютной Защиты»?\n\nРуна Абсолютной Защиты поглотит действие Руны Защиты.'), t); }
{ const w = fresh(`data.consumables={potion_growth:1};`); E(w,`useItem('potion_growth')`);
  const t = E(w,`document.getElementById('confirmContent').textContent`);
  check('H Без предупреждения окно прежнее', t.includes('Использовать «Зелье Роста»?') && !t.includes('\n\n'), t); }


// ===== I. Этап 4: стопка штрафов, возврат, Искупление, Исправление =====
const DAY = 86400000;
// Подменённые часы приложения: сутки проматываются по одной, у каждого дня свой ключ в Летописи.
function clock(w) {
  E(w, `(()=>{ const R = Date; let off = 0; window.__adv = ms => { off += ms; };
    class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } }
    Date = D; })()`);
}
const nextDay = (w, outcome) => { if (outcome === 'success') complete(w); E(w, `window.__adv(${DAY}); checkMissedDays()`); };
const stack = w => JSON.parse(J(w, 'data.penaltyStack'));
const lastRec = w => { const st = stack(w); return st[st.length - 1]; };
const detail = (w, key) => E(w, `buildDayDetail('${key}', data.history['${key}'], false)`);
const tw = (extra) => { const w = fresh(extra); clock(w); return w; };

// --- стопка ---
{ const w = tw(); E(w, `window.__adv(${3*DAY}); checkMissedDays()`);
  const st = stack(w);
  check('I1 Три пропущенных дня — три записи с разными днями', st.length === 3 && new Set(st.map(r => r.day)).size === 3, J(w,'data.penaltyStack.map(r=>r.day)')); }
{ const w = tw(); nextDay(w,'fail'); nextDay(w,'success'); nextDay(w,'fail');
  check('I2 Успешный день между штрафами — старый штраф остаётся', stack(w).length === 2, stack(w).length); }
{ const w = tw(); nextDay(w,'fail'); const first = lastRec(w).day; for (let i=0;i<20;i++) nextDay(w,'fail');
  const st = stack(w);
  check('I3 21-й штраф вытесняет самый старый (помнит 20)', st.length === 20 && !st.some(r => r.day === first), st.length); }
{ const w = tw(); E(w,'applyPenaltyAction()');
  check('I4 Кнопка штрафа в Длани тоже создаёт запись', stack(w).length === 1); }

// --- доводка возврата ---
{ const w = tw(); nextDay(w,'fail'); const loss = lastRec(w).loss;
  const a = use(w,'potion_restoration'); const b = use(w,'potion_restoration_full');
  check('I5 Зелье 50% → Полное: доводит до 100%', a.spent && b.spent && lastRec(w).returned === loss && b.notice === `Зелье использовано. Восстановлено ${loss - Math.floor(loss*0.5)} EXP.`, a.notice + ' | ' + b.notice); }
{ const w = tw(); nextDay(w,'fail'); nextDay(w,'success'); nextDay(w,'fail');
  const [older] = stack(w);
  use(w,'potion_restoration_full'); const c = use(w,'crystal_restoration');
  const st = stack(w);
  check('I6 Полное → Кристалл: Кристалл переходит к более старому штрафу, в уведомлении дата', c.spent && st[0].returned === Math.floor(older.loss*0.7) && c.notice.includes('(штраф за '), c.notice); }
{ const w = tw(); nextDay(w,'fail'); nextDay(w,'fail'); use(w,'potion_restoration_full');
  const p = use(w,'potion_restoration');
  check('I7 Зелье, когда последний штраф уже возвращён: отказ, не тратится, старый не тронут',
    !p.spent && p.notice === 'Зелье Восстановления действует только на последний штраф — по нему опыт уже возвращён.' && stack(w)[0].returned === 0, p.notice); }
{ const w = tw(); nextDay(w,'fail'); nextDay(w,'fail'); use(w,'potion_restoration');
  const st = stack(w);
  check('I8 Зелье работает только с последним штрафом', st[1].returned === Math.floor(st[1].loss*0.5) && st[0].returned === 0); }
{ const w = tw(); nextDay(w,'fail'); const loss = lastRec(w).loss; use(w,'potion_restoration'); const f = use(w,'rune_fate_cleansing');
  check('I9 Очищение Судьбы после Зелья доводит до 300%', lastRec(w).returned === loss*3 && f.notice.includes(`восстановлено ${loss*3 - Math.floor(loss*0.5)} EXP`), f.notice); }
{ const w = tw(); const p = use(w,'potion_restoration');
  check('I10 Штрафов нет: «Восстанавливать нечего»', !p.spent && p.notice === 'Восстанавливать нечего: потерь опыта нет.', p.notice); }

// --- Руна Искупления ---
{ const w = tw(`data.totalPenalties=0;`); nextDay(w,'fail'); const key = lastRec(w).day; const cnt = E(w,'data.totalPenalties');
  use(w,'potion_restoration'); const r = use(w,'rune_redemption');
  check('I11 Искупление после Зелья работает, счётчик −1', r.spent && E(w,'data.totalPenalties') === cnt - 1 && lastRec(w).fixedBy === 'redemption', r.notice);
  const d = detail(w, key);
  check('I12 Летопись после Искупления: своя строка, без «Снято штрафом», день засчитан',
    d.includes('Задание не выполнено, штраф отменён (Руна Искупления).') && !d.includes('Снято штрафом') && E(w,`data.history['${key}'].status`) === 'success', d);
  const r2 = use(w,'rune_redemption');
  check('I13 Повторное Искупление: отказ, не тратится', !r2.spent && r2.notice === 'Исправлять нечего: последний штраф уже исправлен.', r2.notice); }
{ const w = tw(); nextDay(w,'fail'); use(w,'rune_cleansing_full'); const cnt = E(w,'data.totalPenalties');
  const r = use(w,'rune_redemption');
  check('I14 Искупление после Руны Полного Очищения (счётчик 0) работает', cnt === 0 && r.spent && lastRec(w).fixedBy === 'redemption' && E(w,'data.totalPenalties') === 0, r.notice); }
{ const w = tw(); const r = use(w,'rune_redemption');
  check('I15 Искупление без штрафов: «штрафов нет»', !r.spent && r.notice === 'Исправлять нечего: штрафов нет.', r.notice); }

// --- Руна Исправления ---
{ const w = tw(`data.consecutiveDays=20; data.bestStreak=20;`); nextDay(w,'fail'); const key = lastRec(w).day; const cnt = E(w,'data.totalPenalties');
  for (let i=0;i<5;i++) nextDay(w,'success');
  const c = use(w,'rune_correction');
  check('I16 20 → штраф → 5 дней → Исправление: серия 26, лучшая 26, счётчик −1',
    E(w,'data.consecutiveDays') === 26 && E(w,'data.bestStreak') === 26 && E(w,'data.totalPenalties') === cnt - 1 && c.notice.includes('серия дней восстановлена: 26'), c.notice);
  const d = detail(w, key);
  check('I17 Летопись после Исправления: «засчитано Руной Исправления», без «Снято штрафом»', d.includes('Задание засчитано Руной Исправления.') && !d.includes('Снято штрафом'), d);
  const c2 = use(w,'rune_correction');
  check('I18 Повторное Исправление: отказ, не тратится', !c2.spent && c2.notice === 'Исправлять нечего: последний штраф уже исправлен.', c2.notice); }
{ const w = tw(`data.consecutiveDays=20; data.bestStreak=20;`);
  nextDay(w,'fail'); for (let i=0;i<3;i++) nextDay(w,'success'); nextDay(w,'fail'); for (let i=0;i<5;i++) nextDay(w,'success');
  use(w,'rune_correction'); const s1 = E(w,'data.consecutiveDays'); use(w,'rune_correction'); const s2 = E(w,'data.consecutiveDays');
  check('I19 Две полосы: Исправление Б → 9, Исправление А → 30', s1 === 9 && s2 === 30, `${s1}, ${s2}`); }
{ const w = tw(`data.consecutiveDays=20; data.bestStreak=20; data.streakShield=true; data.streakShieldSourceId='rune_stability';`);
  nextDay(w,'fail'); const s0 = E(w,'data.consecutiveDays'); use(w,'rune_correction');
  check('I20 Штраф при Руне Стабильности: серия не прерывалась, Исправление даёт +1', s0 === 20 && E(w,'data.consecutiveDays') === 21, `${s0} → ${E(w,'data.consecutiveDays')}`); }
{ const w = tw(`data.consecutiveDays=20; data.bestStreak=20;`); nextDay(w,'fail'); const loss = lastRec(w).loss;
  E(w,'data.completed={pushups:5}'); use(w,'scroll_freeze'); for (let i=0;i<7;i++) nextDay(w,'fail');
  const sBefore = E(w,'data.consecutiveDays'); const expBefore = E(w,'data.exp + 0');
  const c = use(w,'rune_correction');
  check('I21 Заморозка после штрафа: серия не склеивается, возврат и Летопись — да',
    E(w,'data.activeScroll') === null && stack(w).length === 1 && E(w,'data.consecutiveDays') === sBefore && stack(w)[0].returned === loss && stack(w)[0].fixedBy === 'correction'
    && c.notice.endsWith('Серию восстановить нельзя: её прервала Заморозка.'), c.notice); }
{ const w = tw(`data.consecutiveDays=20; data.bestStreak=20;`); nextDay(w,'fail'); for (let i=0;i<2;i++) nextDay(w,'success');
  const cnt = E(w,'data.totalPenalties'); use(w,'rune_redemption'); const c = use(w,'rune_correction'); const r = lastRec(w);
  check('I22 Искупление → Исправление: 100%, серия, счётчик уменьшен один раз',
    c.spent && r.returned === r.loss && r.fixedBy === 'correction' && E(w,'data.totalPenalties') === cnt - 1 && E(w,'data.consecutiveDays') === 23, c.notice + ' | ' + J(w,'{s:data.consecutiveDays,p:data.totalPenalties}')); }
{ const w = tw(); nextDay(w,'fail'); use(w,'rune_correction'); const r = use(w,'rune_redemption');
  check('I23 Исправление → Искупление: отказ, не тратится', !r.spent && r.notice === 'Исправлять нечего: последний штраф уже исправлен.', r.notice); }

// --- Договор при Бремени ---
const CW = 'Действует Бремя Аномалии: нагрузка и штраф будут выше обычного.';
{ const w = fresh(`data.curseActiveToday=true;`); check('I24 Договор сразу при действующем Бремени — предупреждение', warn(w,'scroll_contract') === CW); }
{ const w = fresh(`data.pendingCurse=true;`); complete(w); check('I25 Договор в очередь при ожидающем Бремени — предупреждение', warn(w,'scroll_contract') === CW); }
{ const w = fresh(`data.curseActiveToday=true;`); complete(w); check('I26 Договор в очередь, Бремя только сегодня — без предупреждения', warn(w,'scroll_contract') === ''); }
{ const w = fresh(`data.curseActiveToday=true; data.activeScroll='transfer';`); check('I27 Другой свиток активен — без предупреждения', warn(w,'scroll_contract') === ''); }
{ const w = fresh(); check('I28 Без Бремени — без предупреждения', warn(w,'scroll_contract') === ''); }

// --- перенос старых данных и импорт ---
{ const legacy = JSON.parse(SEED); delete legacy.penaltyStack; legacy.lastExpLoss = 400; legacy.history = { '2026-09-10': { status: 'penalty', donePercent: 0, expLost: 400 } };
  const saved = SEED; SEED = JSON.stringify(legacy); const w = boot(); SEED = saved;
  const st = JSON.parse(J(w,'data.penaltyStack'));
  check('I29 Старое сохранение: lastExpLoss → одна запись, поле убрано',
    st.length === 1 && st[0].loss === 400 && st[0].day === '2026-09-10' && st[0].streakHandled === true && E(w,"data.lastExpLoss === undefined"), J(w,'data.penaltyStack'));
  E(w,'data.consumables={rune_correction:1}; window.__N=[]'); const s0 = E(w,'data.consecutiveDays'); E(w,"performUseItem('rune_correction')");
  check('I30 … Исправление старой записи: опыт и Летопись, серия не меняется', E(w,'data.consecutiveDays') === s0 && E(w,"data.history['2026-09-10'].fixedBy") === 'correction', E(w,'window.__N.join("|")')); }
{ const w = fresh();
  const legacyBackup = { state: Object.assign(JSON.parse(SEED), { lastExpLoss: 250 }), total: {} };
  delete legacyBackup.state.penaltyStack;
  const clean = JSON.parse(E(w, `JSON.stringify(sanitizeImportedData(${JSON.stringify(legacyBackup)}))`));
  const saved = SEED; SEED = JSON.stringify(clean.state); const w2 = boot(); SEED = saved;
  check('I31 Импорт старого бэкапа: потеря становится записью в стопке', JSON.parse(J(w2,'data.penaltyStack')).length === 1 && JSON.parse(J(w2,'data.penaltyStack'))[0].loss === 250, J(w2,'data.penaltyStack')); }


// ===== J. v6.6.11: «увеличение получаемого» вместо «усиления», кредиты значком (19 согласованных текстов) =====
{ const w = fresh(); const t = [
    ['J10 Зелье Роста', 'potion_growth', 'Зелье использовано. Получаемый опыт увеличен до следующего сброса.'],
    ['J10 Руна Роста (усиленная)', 'rune_growth_charged', 'Руна использована. Получаемый опыт увеличен до следующего сброса.'] ];
  for (const [label, id, exp] of t) { const w1 = fresh(); const u = use(w1, id); check(label, u.notice === exp, u.notice); }
  const w2 = fresh(); const u2 = use(w2, 'crystal_clarity'); check('J10 Кристалл Ясности', u2.notice === 'Кристалл использован. Получаемый опыт увеличен до следующего сброса.', u2.notice);
  const w3 = fresh(); const u3 = use(w3, 'crystal_impulse'); check('J11 Кристалл Импульса', u3.notice === 'Кристалл использован. Получаемые опыт и кредиты увеличены до следующего сброса.', u3.notice);
  const w4 = fresh(`data.penaltyStack=[{day:'2026-09-01',loss:300,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`);
  const u4 = use(w4, 'rune_return'); check('J12 Руна Возврата: возврат и увеличение', u4.notice === 'Руна использована. Потерянный опыт восстановлен, получаемый опыт увеличен до следующего сброса.', u4.notice);
  const w5 = fresh(`data.penaltyStack=[{day:'2026-09-01',loss:300,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false},{day:'2026-09-02',loss:300,returned:300,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`);
  const u5 = use(w5, 'rune_return'); check('J12 Руна Возврата: с датой штрафа', /^Руна использована\. Потерянный опыт восстановлен, получаемый опыт увеличен до следующего сброса \(штраф за [^)]+\)\.$/.test(u5.notice), u5.notice);
  const w6 = fresh(); const u6 = use(w6, 'rune_return'); check('J13 Руна Возврата: только увеличение', u6.notice === 'Руна использована. Получаемый опыт увеличен до следующего сброса.', u6.notice);
  const w7 = fresh(`data.expBoostToday=0.55; data.expBoostSourceId='crystal_clarity'; data.penaltyStack=[{day:'2026-09-01',loss:300,returned:0,fixedBy:null,brokeStreak:true,streakBefore:0,streakHandled:false,chainBroken:false}];`);
  const u7 = use(w7, 'rune_return'); check('J Руна Возврата: только возврат (без изменений)', u7.notice === 'Руна использована. Опыт восстановлен.', u7.notice);
  const w8 = fresh(); E(w8, `window.__N=[]; useCreditBoostItem(0.35, 'Использовано', false, 'crystal_impulse'); useCreditBoostItem(0.35, 'Использовано', false, 'crystal_impulse')`);
  const n8 = JSON.parse(J(w8, 'window.__N'));
  check('J14 общая функция кредитов: успех', n8[0] === 'Использовано. Получаемые кредиты увеличены до следующего сброса.', n8[0]);
  check('J5 общая функция кредитов: отказ', n8[1] === 'Действует более высокое увеличение получаемых кредитов.', n8[1]);
  check('J15 описание Кристалла Импульса', E(w, "getConsumableInfo('crystal_impulse').desc") === 'Увеличивает получаемые опыт и кредиты на 35% до следующего сброса.');
  check('J16 описание Руны Возврата', E(w, "getConsumableInfo('rune_return').desc") === 'Полностью восстанавливает опыт от последнего штрафа и увеличивает получаемый опыт на 15% до следующего сброса.');
  // продажа: подтверждение и уведомление — значок вместо «кредитов»
  const w9 = fresh(`data.consumables={rune_protection:2};`);
  E(w9, `sellItem('rune_protection')`);
  const conf = w9.document.getElementById('confirmContent');
  check('J17 подтверждение продажи: значок, без «кредитов»', /^Продать «Руна Защиты» за \d+ \?$/.test(conf.querySelector('.danger-text').textContent.trim()) && !!conf.querySelector('.danger-text .cr-ic') && !conf.textContent.includes('кредит'),
    conf.querySelector('.danger-text').innerHTML);
  E(w9, `window.__N=[]; performSellItem('rune_protection')`);
  const sold = E(w9, 'window.__N[0]');
  check('J18 уведомление о продаже (метка → значок при выводе)', /^Продано: Руна Защиты\. \+\d+ ◈\.$/.test(sold) && E(w9, `creditsHtml(window.__N[0]).includes('cr-ic')`), sold);
  // сводка сохранения в Архиве
  E(w9, `data.credits=8420; data.consecutiveDays=12; backupModalStep='main'; renderBackupModal()`);
  const sum = [...w9.document.querySelectorAll('.backup-summary')].find(e => e.textContent.startsWith('Уровень'));
  check('J19 сводка Архива: значок, «серия дней N»', !!sum && !!sum.querySelector('.cr-ic') && /· 8420 · .* · серия дней 12$/.test(sum.textContent.replace(/\s+/g, ' ').trim()) && !sum.textContent.includes('кредит') && !sum.textContent.includes('дн.'),
    sum && sum.textContent);
  // экранирование в окне подтверждения
  E(w9, `showConfirm('<b id="evil2">x</b> за 5 ◈?', () => {})`);
  const c2 = w9.document.querySelector('#confirmContent .danger-text');
  check('J экранирование в окне подтверждения прежнее, значок на месте', !w9.document.getElementById('evil2') && c2.textContent.includes('<b id="evil2">x</b>') && !!c2.querySelector('.cr-ic'), c2.innerHTML);
  // не изменились
  check('J «Недостаточно кредитов.» осталось словом', /showNotice\("Недостаточно кредитов\.", 'warn', true\)/.test(html));
  check('J название «Руна Роста (усиленная)» не тронуто', E(w, "getConsumableInfo('rune_growth_charged').name") === 'Руна Роста (усиленная)');
  // сквозные проверки по всему коду
  const scripts = html.slice(html.indexOf('<script>'));
  const code = scripts.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  check('J нигде нет «усиление опыта/кредитов» в текстах', !/[Уу]силени[ея] (опыта|кредитов)/.test(code));
  check('J нигде нет суммы со словом «кредитов»', !/(\$\{[^}]*\}|\d)\s*кредит/.test(code));
}

console.log(results.join('\n'));
const nFail = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nИтого: ${results.length - nFail} OK, ${nFail} FAIL`);
process.exit(nFail ? 1 : 0);
})();
