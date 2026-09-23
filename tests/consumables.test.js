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
{ const w0 = boot(); SEED = E(w0, `JSON.stringify(Object.assign({}, data, {level:25, exp:3000, rulesAcknowledged:true, playerName:'T', lastReset: Date.now(), dailyTargetLevel:25, dailyNotices:{morning:true, complete:false}}))`); w0.close(); }
function fresh(extra) {
  const w = boot();
  E(w, `data.completed={}; data.isGoalMet=false; data.dailyNotices={morning:true,complete:false}; data.insurance=false; data.insuranceSourceId=null;
    data.activeScroll=null; data.pendingScroll=null; data.curseActiveToday=false; data.pendingCurse=false; data.streakShield=false; data.streakShieldSourceId=null;
    data.targetDiscountToday=false; data.targetDiscountRate=0; data.targetDiscountSourceId=null; data.insuranceHoldScroll=null;
    data.exp=3000; data.expDebt=0; data.consecutiveDays=20; data.bestStreak=20; data.totalPenalties=3; data.lastExpLoss=0; data.history={};
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
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection_charged'; data.lastExpLoss=400;`);
  const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check('A Усиленная при усиленной, но есть штраф: только возврат', u.spent && E(w,'data.lastExpLoss')===0 && wr === 'Защита сейчас не может быть установлена: Руна Защиты (усиленная) уже активна. Руна сработает только для возврата опыта.', wr); }
{ const w = fresh(`data.insurance=true; data.insuranceSourceId='rune_protection_absolute'; data.lastExpLoss=400;`);
  const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check('A Усиленная при Абсолютной, есть штраф: только возврат, Абсолютная цела', u.spent && E(w,'data.insuranceSourceId')==='rune_protection_absolute' && wr.includes('действует Руна Абсолютной Защиты'), wr); }

// ===== B. Усиленная: возврат при невозможной защите (3.4) =====
const B_CASES = [
  ['задание выполнено', '', 'задание уже выполнено', 'Задание уже выполнено — защита не нужна.'],
  ['Бремя', 'data.curseActiveToday=true;', 'действует Бремя Аномалии', 'Обычная защита бессильна против Бремени Аномалии.'],
  ['Договор', "data.activeScroll='contract';", 'активен Свиток Договора', 'Активен Свиток Договора. Его условия не допускают обычной защиты от штрафа до следующего цикла.'],
  ['Перенос', "data.activeScroll='transfer'; data.transferExerciseId='steps'; data.transferStreakDays=1;", 'активен Свиток Переноса', 'Активен Свиток Переноса. Его условия не допускают обычной защиты от штрафа до следующего цикла.']];
for (const [label, extra, reason, refusal] of B_CASES) {
  let w = fresh(`data.lastExpLoss=500; ${extra}`); if (label === 'задание выполнено') complete(w);
  const expBefore = E(w,'data.exp'); const wr = warn(w,'rune_protection_charged'); const u = use(w,'rune_protection_charged');
  check(`B Усиленная, ${label}, штраф есть: предупреждение`, wr === `Защита сейчас не может быть установлена: ${reason}. Руна сработает только для возврата опыта.`, wr);
  check(`B Усиленная, ${label}, штраф есть: только возврат`, u.spent && !E(w,'data.insurance') && E(w,'data.lastExpLoss')===0 && E(w,'data.exp') > expBefore && u.notice.includes(`Защита не установлена: ${reason}.`), u.notice);
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
    const exp = b === 'rune_return' ? 'Возвращать нечего. Усиление опыта уже действует: активен эффект Руны Возврата.'
                                    : `Возвращать нечего. Действует более высокое усиление опыта: активен эффект ${GEN[b]}.`;
    check(label + ', штрафа нет: отказ', !u.spent && u.notice === exp, u.notice);
    w = fresh(setBoost(b) + ' data.lastExpLoss=300;'); const wr = warn(w, a); const u2 = use(w, a);
    const head = b === 'rune_return' ? 'Усиление опыта уже действует' : 'Действует более высокое усиление опыта';
    check(label + ', штраф есть: только возврат', u2.spent && E(w,'data.lastExpLoss')===0 && E(w,'data.expBoostSourceId')===b
      && wr === `${head}: активен эффект ${GEN[b]}. Руна сработает только для возврата опыта.` && u2.notice === 'Руна использована. Опыт восстановлен.', wr + ' | ' + u2.notice);
    continue;
  }
  const w = fresh(setBoost(b)); const wr = warn(w, a); const u = use(w, a);
  if (R[a] > R[b]) {
    let expW = `${NAME[a]} поглотит действие ${GEN[b]}: усиление опыта станет +${Math.round(R[a]*100)}%`;
    if (b === 'crystal_impulse') expW += ', а усиление кредитов +35% исчезнет';
    check(label + ': поглощает (предупреждение)', wr === expW + '.', wr);
    check(label + ': поглощает (результат)', u.spent && E(w,'data.expBoostToday')===R[a] && E(w,'data.expBoostSourceId')===a
      && (b !== 'crystal_impulse' || E(w,'data.creditBoostToday')===0), J(w,'{e:data.expBoostToday,s:data.expBoostSourceId,c:data.creditBoostToday}'));
  } else {
    const exp = (R[a] === R[b] ? 'Действует равное усиление опыта' : 'Действует более высокое усиление опыта') + `: активен эффект ${GEN[b]}.`;
    check(label + ': отказ, не тратится', !u.spent && u.notice === exp && E(w,'data.expBoostSourceId')===b, u.notice);
  }
}
{ const w = fresh(); const u = use(w,'crystal_impulse');
  check('D Импульс без усилений: опыт и кредиты +35%', u.spent && E(w,'data.expBoostToday')===0.35 && E(w,'data.creditBoostToday')===0.35); }
{ const w = fresh(`data.lastExpLoss=300;`); const u = use(w,'rune_return');
  check('D Руна Возврата без усилений: возврат и +15%', u.spent && E(w,'data.expBoostToday')===0.15 && E(w,'data.lastExpLoss')===0 && u.notice==='Руна использована. Опыт восстановлен и увеличен на сегодня.', u.notice); }

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

console.log(results.join('\n'));
const nFail = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nИтого: ${results.length - nFail} OK, ${nFail} FAIL`);
process.exit(nFail ? 1 : 0);
})();
