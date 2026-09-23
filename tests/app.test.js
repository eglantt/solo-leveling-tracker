const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf-8');

let SEED=null;
function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.AudioContext = function(){ return { currentTime:0, destination:{}, state:'running', resume(){},
        createOscillator(){return {connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''}},
        createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}} }; };
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
      w.crypto.randomUUID = () => 'uuid-test';
      w.scrollTo = () => {};
      if (SEED) w.localStorage.setItem('sl_daily_v5_5_0', SEED);
    }
  });
  return dom.window;
}
const E = (w, c) => w.eval(c);
{ const w0 = boot(); SEED = w0.eval(`JSON.stringify(Object.assign({}, data, {level:20, exp:5000, rulesAcknowledged:true, playerName:'T', lastReset: Date.now(), dailyTargetLevel:20}))`); w0.close(); }
function setup(w, extra) {
  E(w, `data.completed={}; data.isGoalMet=false; data.dailyNotices.complete=false; data.insurance=false; data.insuranceSourceId=null;
        data.activeScroll=null; data.pendingScroll=null; data.curseActiveToday=false; data.pendingCurse=false; data.streakShield=false;
        data.targetDiscountToday=false; data.targetDiscountRate=0; data.targetDiscountSourceId=null; data.insuranceHoldScroll=null;
        data.exp=5000; data.expDebt=0; data.consecutiveDays=5; data.dailyTargetLevel=data.level; ${extra||''}`);
}
function completeDay(w) {
  // довести все 5 упражнений до цели реальными кликами «+»
  E(w, `document.querySelectorAll('.quest-item').forEach(item => {
      const id=item.dataset.id; const t=getDynamicTarget(parseInt(item.dataset.target), data.dailyTargetLevel, id);
      if (item.style.display==='none') return;
      data.completed[id] = t-1;
    });`);
  const ids = E(w, `Array.from(document.querySelectorAll('.quest-item')).filter(i=>i.style.display!=='none').map(i=>i.dataset.id)`);
  for (const id of ids) E(w, `document.querySelector('.quest-item[data-id="${id}"] .add').click()`);
}
function reset(w) { E(w, `forceFullResetAction()`); }
function effects(w) { return E(w, `JSON.stringify(getActiveEffects().filter(e=>/Руна/.test(e.name)).map(e=>e.name+' | '+e.text+(e.sparkCount?' | искр:'+e.sparkCount:'')))`); }
const st = w => E(w, `JSON.stringify({ins:data.insurance, src:data.insuranceSourceId, hold:data.insuranceHoldScroll, scroll:data.activeScroll, streak:data.consecutiveDays, lastLoss:(data.penaltyStack.length ? data.penaltyStack[data.penaltyStack.length-1].loss : 0), disc:data.targetDiscountToday})`);

const results = [];
function check(name, cond, info) { results.push((cond?'OK  ':'FAIL')+' '+name+(info?'  → '+info:'')); }

// базовый штраф без руны для сравнения
let w = boot(); setup(w); reset(w);
const baseLoss = E(w,'(data.penaltyStack.length ? data.penaltyStack[data.penaltyStack.length-1].loss : 0)');

// 1. Руна Защиты + Договор, успех → руна выжила и спит, затем провал обычного цикла → половина
w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection'; data.activeScroll='contract';`);
completeDay(w);
check('1a Договор+Руна, успех: руна жива, hold=contract, Договор погас', E(w,'data.insurance && data.insuranceHoldScroll==="contract" && data.activeScroll===null'), st(w));
check('1b Панель после угасания Договора: ожидает, искра, текст', /ожидает.*приостановлено Свитком Договора до следующего цикла.*искр:1/.test(effects(w)), effects(w));
reset(w);
check('1c После сброса: руна жива, hold очищен, день успешен', E(w,'data.insurance && data.insuranceHoldScroll===null && data.consecutiveDays===6'), st(w));
check('1d Панель на обычном цикле: руна без «ожидает»', !/ожидает/.test(effects(w)), effects(w));
const full1 = E(w,'(()=>{let p=Math.max(0.05,0.15-Math.floor(data.level/20)*0.03-Math.max(0,data.stats.str-10)*0.0025); if(data.inventory.includes("amulet_will"))p*=0.85; return Math.floor(getExpToNext(data.level)*p);})()');
reset(w);
check('1e Провал обычного цикла: штраф вдвое, руна сгорела, серия 0', E(w,`(data.penaltyStack.length ? data.penaltyStack[data.penaltyStack.length-1].loss : 0)===Math.floor(${full1}*0.5) && !data.insurance && data.consecutiveDays===0`), st(w)+' полный='+full1+' уровень='+E(w,'data.level'));

// 2. То же с Переносом
w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection_charged'; data.activeScroll='transfer'; data.transferExerciseId='steps'; data.transferStreakDays=1; document.querySelector('.quest-item[data-id="steps"]').style.display='none';`);
completeDay(w);
check('2a Перенос+усиленная, успех: руна жива, спит', E(w,'data.insurance && getInsuranceHoldScroll()==="transfer"'), st(w));
check('2b Панель: Свитком Переноса', /ожидает.*Свитком Переноса до следующего цикла/.test(effects(w)), effects(w));
reset(w);
check('2c После сброса Перенос снят, руна жива', E(w,'data.insurance && data.activeScroll===null && data.insuranceHoldScroll===null'), st(w));
reset(w);
check('2d Провал обычного цикла: усиленная защищает полностью', E(w,'!data.insurance && data.history && Object.values(data.history).slice(-1)[0].status==="protected"'), st(w));

// 3. Провал под Договором — как в v6.5.30
w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection'; data.activeScroll='contract';`);
reset(w);
check('3 Провал под Договором: полный штраф, руна жива', E(w,`(data.penaltyStack.length ? data.penaltyStack[data.penaltyStack.length-1].loss : 0)===${baseLoss} && data.insurance`), st(w));

// 4. Без свитка, успех → руна гаснет как раньше
w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection';`);
completeDay(w);
check('4 Без свитка, успех: руна гаснет как раньше', E(w,'!data.insurance && data.insuranceHoldScroll===null'), st(w));

// 5. Бремя + Договор: руна не спит, при успехе гаснет
w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection'; data.activeScroll='contract'; data.curseActiveToday=true;`);
completeDay(w);
check('5 Бремя+Договор, успех: руна не спит, погасла', E(w,'!data.insurance && data.insuranceHoldScroll===null'), st(w));

// 6. Руна Снятия Бремени + Договор, успех: проснулась, в конце цикла сгорает
w = boot(); setup(w, `data.targetDiscountToday=true; data.targetDiscountRate=0.25; data.targetDiscountSourceId='rune_burden_release'; data.activeScroll='contract';`);
check('6a Панель при Договоре: до окончания действия Свитка Договора', /Снятия Бремени \(ожидает\) \| Действие руны приостановлено до окончания действия Свитка Договора\./.test(effects(w)), effects(w));
completeDay(w);
const t = E(w,'getDynamicTarget(100, data.dailyTargetLevel, "pushups")'), tNo = E(w,'(()=>{const d=data.targetDiscountToday;data.targetDiscountToday=false;const r=getDynamicTarget(100,data.dailyTargetLevel,"pushups");data.targetDiscountToday=d;return r;})()');
check('6b После выполнения руна проснулась (скидка действует)', t < tNo && !/ожидает/.test(effects(w)), `цель ${t} vs без руны ${tNo}`);
reset(w);
check('6c На сбросе руна сгорела', E(w,'!data.targetDiscountToday'), st(w));

// 7. Руна Снятия Бремени + Договор, провал: пережила цикл
w = boot(); setup(w, `data.targetDiscountToday=true; data.targetDiscountRate=0.25; data.targetDiscountSourceId='rune_burden_release'; data.activeScroll='contract';`);
reset(w);
check('7 Договор, провал: руна пережила цикл', E(w,'data.targetDiscountToday && data.targetDiscountSourceId==="rune_burden_release"'), st(w));

// 8. Бремя + Перенос: руна спит до следующего цикла
w = boot(); setup(w, `data.targetDiscountToday=true; data.targetDiscountRate=0.25; data.targetDiscountSourceId='rune_burden_release'; data.activeScroll='transfer'; data.curseActiveToday=true; data.transferExerciseId='steps'; data.transferStreakDays=1;`);
check('8a Панель: Свитком Переноса до следующего цикла', /Действие руны приостановлено Свитком Переноса до следующего цикла\./.test(effects(w)), effects(w));
reset(w);
check('8b Бремя+Перенос: руна пережила цикл', E(w,'data.targetDiscountToday'), st(w));


// ===== v6.5.32 =====
const eff = w => JSON.parse(E(w, `JSON.stringify(getActiveEffects().filter(e=>/Руна/.test(e.name)))`));
const tgt = w => E(w,'getDynamicTarget(100, data.dailyTargetLevel, "pushups")');
const tgtNoRune = w => E(w,'(()=>{const d=data.targetDiscountToday;data.targetDiscountToday=false;const r=getDynamicTarget(100,data.dailyTargetLevel,"pushups");data.targetDiscountToday=d;return r;})()');
const FREE = `data.targetDiscountToday=true; data.targetDiscountRate=0.1; data.targetDiscountSourceId='rune_freedom';`;

// 10. Освобождение + Договор, успех
w = boot(); setup(w, FREE + `data.activeScroll='contract';`);
check('10a Освобождение спит при Договоре', /Руна Освобождения \(ожидает\).*до окончания действия Свитка Договора\./.test(JSON.stringify(eff(w))) && tgt(w)===tgtNoRune(w), JSON.stringify(eff(w)));
completeDay(w);
check('10b После выполнения проснулась, скидка 10%', tgt(w) < tgtNoRune(w) && eff(w).some(e=>e.name==='Руна Освобождения' && e.text==='Дневная нагрузка снижена на 10% до следующего сброса.'), `цель ${tgt(w)} vs ${tgtNoRune(w)}`);
reset(w);
check('10c На сбросе сгорела', E(w,'!data.targetDiscountToday'), st(w));
// 11. Освобождение + Договор, провал
w = boot(); setup(w, FREE + `data.activeScroll='contract';`); reset(w);
check('11 Договор, провал: Освобождение пережила цикл', E(w,'data.targetDiscountToday && data.targetDiscountSourceId==="rune_freedom"'), st(w));
// 12. Бремя + Перенос
w = boot(); setup(w, FREE + `data.activeScroll='transfer'; data.curseActiveToday=true; data.transferExerciseId='steps'; data.transferStreakDays=1;`);
const e12 = eff(w);
check('12a Бремя+Перенос: спит, текст Переноса, без строки про Бремя', e12.length===1 && e12[0].text==='Действие руны приостановлено Свитком Переноса до следующего цикла.', JSON.stringify(e12));
reset(w);
check('12b Пережила цикл', E(w,'data.targetDiscountToday && data.targetDiscountSourceId==="rune_freedom"'), st(w));
// 13. Строка про Бремя у проснувшихся рун
w = boot(); setup(w, `data.targetDiscountToday=true; data.targetDiscountRate=0.25; data.targetDiscountSourceId='rune_burden_release'; data.curseActiveToday=true;`);
check('13a Снятие Бремени при Бремени: + строка', eff(w)[0].text==='Дневная нагрузка снижена на 25% до следующего сброса. Тяжесть Бремени Аномалии облегчена.', eff(w)[0].text);
E(w,'data.curseActiveToday=false; data.pendingCurse=true;');
check('13b Бремя только ожидает: строки нет', eff(w)[0].text==='Дневная нагрузка снижена на 25% до следующего сброса.', eff(w)[0].text);
w = boot(); setup(w, FREE + `data.curseActiveToday=true;`);
check('13c Освобождение при Бремени: + строка', eff(w)[0].text==='Дневная нагрузка снижена на 10% до следующего сброса. Тяжесть Бремени Аномалии облегчена.', eff(w)[0].text);
// 14. Подавленная Руна Защиты
for (const rid of ['rune_protection','rune_protection_charged']) {
  w = boot(); setup(w, `data.insurance=true; data.insuranceSourceId='${rid}'; data.curseActiveToday=true;`);
  const e = eff(w)[0];
  E(w,'renderActiveEffects()');
  const html = E(w,'document.getElementById("effectsRow").innerHTML');
  check(`14a ${rid} при Бремени: (подавлена), без искр, приглушена`, /\(подавлена\)$/.test(e.name) && e.text==='Бремя Аномалии подавляет действие руны. При провале цикла она будет поглощена без эффекта.' && /suppressed/.test(html) && !/spark-ring-wrap/.test(html), e.name);
  E(w,'data.curseActiveToday=false; data.pendingCurse=true;');
  check(`14b ${rid} при ожидающем Бремени: обычный текст`, eff(w)[0].name.indexOf('подавлена')<0, eff(w)[0].name+' | '+eff(w)[0].text);
  // с Бременем + Договор руна не спит, а подавлена
  E(w,'data.curseActiveToday=true; data.pendingCurse=false; data.activeScroll="contract";');
  check(`14c ${rid} Бремя+Договор: подавлена, не спит`, /подавлена/.test(eff(w)[0].name), eff(w)[0].name);
}
// 15. Тексты магазина и активных эффектов
w = boot();
const T = JSON.parse(E(w, `JSON.stringify(['rune_protection','rune_protection_charged','rune_burden_release','rune_freedom'].map(id=>[getConsumableInfo(id).desc, getConsumableInfo(id).effectDesc]))`));
check('15a Магазин: Руна Защиты', T[0][0]==='Снижает штраф за провал на следующий цикл вдвое. Серия дней при провале прерывается.');
check('15b Магазин: усиленная', T[1][0]==='Полностью защищает от штрафа за провал следующего цикла и сохраняет серию дней. При активации возвращает опыт, потерянный из-за последнего штрафа.');
check('15c Магазин: Снятия Бремени', T[2][0]==='Снижает дневную нагрузку на 25% до следующего сброса. Бремя Аномалии не снимает, но облегчает его тяжесть.');
check('15d Магазин: Освобождения', T[3][0]==='Снижает дневную нагрузку на 10% до следующего сброса. Бремя Аномалии не снимает, но немного облегчает его тяжесть.');
setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection';`);
check('15e Эффект работающей Руны Защиты', eff(w)[0].text==='При провале цикла штраф будет снижен вдвое. Серия дней прервётся.', eff(w)[0].text);
setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection_charged';`);
check('15f Эффект работающей усиленной', eff(w)[0].text==='При провале цикла штраф будет полностью поглощён. Серия дней сохранится.', eff(w)[0].text);
const shopHtml = E(w,'(()=>{ try { renderShop && renderShop(); } catch(e){} return document.body.innerHTML; })()');
check('15g В разметке нет старой фразы', shopHtml.indexOf('недоступна во время активации')<0);


// ===== v6.5.33: окно правил =====
async function rulesTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document;
  E(w, `showRulesOverlay('onboarding')`);
  const lines = [...D.querySelectorAll('#rulesText .rules-line')];
  check('R1 заголовок УВЕДОМЛЕНИЕ', D.getElementById('rulesHeader').textContent === 'УВЕДОМЛЕНИЕ');
  check('R2 8 строк, подзаголовок ПРАВИЛА:', lines.length === 8 && lines[4].classList.contains('rules-heading') && lines[4].textContent === 'ПРАВИЛА:', lines.length);
  const pens = [...D.querySelectorAll('#rulesText .rules-pen')].map(e => e.textContent);
  check('R3 красные «штраф» и «штрафа»', pens.join('|') === 'штраф|штрафа', pens.join('|'));
  check('R4 жирное «Кодексе»', D.querySelector('#rulesText strong').textContent === 'Кодексе');
  const ctlPending = () => [...D.querySelectorAll('#rulesOverlay .rules-controls')].every(e => e.classList.contains('pending'));
  check('R5 галочка и кнопка скрыты в начале', ctlPending());
  await new Promise(r => setTimeout(r, 1200));
  const on1 = D.querySelectorAll('#rulesText .rules-ch.on').length, all = D.querySelectorAll('#rulesText .rules-ch').length;
  check('R6 через 1.2 с напечатана часть текста', on1 > 0 && on1 < all, `${on1}/${all}`);
  D.getElementById('rulesText').click();
  check('R7 касание: весь текст и управление видны', D.querySelectorAll('#rulesText .rules-ch.on').length === all && !ctlPending());
  check('R8 «Принять» неактивна без галочки', D.getElementById('rulesAcceptBtn').disabled);
  D.querySelector('#rulesCheckboxRow .sound-checkbox-zone').click();
  D.getElementById('rulesAcceptBtn').click();
  check('R9 принятие: правила приняты, окно закрыто', E(w, 'data.rulesAcknowledged') === true && D.getElementById('rulesOverlay').style.display === 'none');
  // Полный хронометраж
  E(w, `showRulesOverlay('onboarding')`);
  const t0 = Date.now();
  await new Promise(res => { const iv = setInterval(() => { if (!ctlPending()) { clearInterval(iv); res(); } }, 50); });
  const dt = (Date.now() - t0) / 1000;
  check('R10 печать целиком ≈ 18 с', dt > 17.5 && dt < 18.8, dt.toFixed(1) + ' с');
  // Архив
  E(w, `showRulesOverlay('archive')`);
  const aLines = [...D.querySelectorAll('#rulesText .rules-line')].map(l => l.textContent);
  check('R11 Архив: заголовок ПРАВИЛА, 3 абзаца, без «Слабость» и подзаголовка',
    D.getElementById('rulesHeader').textContent === 'ПРАВИЛА' && aLines.length === 3 && aLines[0].startsWith('Протокол задания') && !aLines.some(t => /Слабость|ПРАВИЛА:/.test(t)), aLines.length);
  check('R12 Архив: без печати, «Закрыть» сразу видна', !D.getElementById('rulesText').classList.contains('rules-typing') && !ctlPending() && D.getElementById('rulesCloseBtn').style.display === 'block' && D.getElementById('rulesCheckboxRow').style.display === 'none');
  check('R13 Архив: «штраф» красный', D.querySelectorAll('#rulesText .rules-pen').length === 2);
  // Напоминания без «Система:»
  const pools = JSON.parse(E(w, 'JSON.stringify(SYSTEM_NOTICES)'));
  check('R14 в напоминаниях нет префикса «Система:»', !Object.values(pools).flat().some(t => t.startsWith('Система:')));
}

// 9. Уведомления при активации
function noticeFor(scroll, item) {
  const w = boot(); setup(w, `data.activeScroll='${scroll}'; data.consumables={'${item}':1}; data.level=30; data.dailyTargetLevel=30;`);
  E(w, `window.__n=[]; const _o=showNotice; showNotice=(m)=>window.__n.push(m); performUseItem('${item}');`);
  return new Promise(r => setTimeout(() => r(E(w,'window.__n.join(" / ")')), 900));
}
(async () => {
  for (const [sc, it] of [['contract','rune_burden_release'],['transfer','rune_burden_release'],['contract','rune_protection'],['transfer','rune_protection_charged'],['contract','rune_freedom'],['transfer','rune_freedom']]) {
    const n = await noticeFor(sc, it);
    check(`9 Уведомление ${it} при ${sc}`, sc==='contract' ? /^Активен Свиток Договора\./.test(n) : /^Активен Свиток Переноса\./.test(n), n);
  }
  await rulesTests();
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\nИтого: ${results.length - failed} OK, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})();
