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
  check(`14a ${rid} при Бремени: (подавлена), без искр, приглушена`, /\(подавлена\)$/.test(e.name) && e.text==='Бремя Аномалии подавляет действие руны. При провале дневного задания она будет поглощена без эффекта.' && /suppressed/.test(html) && !/spark-ring-wrap/.test(html), e.name);
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
check('15e Эффект работающей Руны Защиты', eff(w)[0].text==='При провале дневного задания штраф будет снижен вдвое. Серия дней прервётся.', eff(w)[0].text);
setup(w, `data.insurance=true; data.insuranceSourceId='rune_protection_charged';`);
check('15f Эффект работающей усиленной', eff(w)[0].text==='При провале дневного задания штраф будет полностью предотвращён. Серия дней сохранится.', eff(w)[0].text);
const shopHtml = E(w,'(()=>{ try { renderShop && renderShop(); } catch(e){} return document.body.innerHTML; })()');
check('15g В разметке нет старой фразы', shopHtml.indexOf('недоступна во время активации')<0);






// ===== v6.6.3: «Бег (шаги)», уборка стилей старого окна характеристик =====
async function cleanupTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, html = D.documentElement.outerHTML;
  check('C1 карточка называется «Бег (шаги)»', D.querySelector('.quest-item[data-id="steps"] .quest-name').textContent === 'Бег (шаги)');
  check('C2 название для Летописи и уведомлений — «Бег (шаги)»', E(w, 'QUEST_DISPLAY_NAMES.steps') === 'Бег (шаги)');
  check('C3 «Пробежка» нигде не осталась', !html.includes('Пробежка'));
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const gone = ['stat-row', 'stat-label', 'stat-value', 'stat-points-info'];
  check('C4 стили старого окна характеристик удалены', gone.every(c => !new RegExp('\\.' + c + '\\b').test(css)), gone.filter(c => new RegExp('\\.' + c + '\\b').test(css)).join(','));
  check('C5 и нигде не используются', gone.every(c => !D.querySelector('.' + c)));
}

// ===== v6.6.2: цвет в Пределе, «Предел + свиток», свечение эмблемы в «СТАТУСЕ» =====
async function limitTintTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document;
  const tint = () => {
    const c = [...D.getElementById('pushups').classList].filter(x => x !== 'counter').join(',');
    const t = [...D.querySelector('.quest-item[data-id="pushups"] .target').classList].filter(x => x !== 'target').join(',');
    const b = [...D.querySelector('.quest-item[data-id="pushups"] .qbar-fill').classList].filter(x => x !== 'qbar-fill').join(',');
    return (c === t && t === b) ? c : `РАЗНОЕ counter=${c} target=${t} bar=${b}`;
  };
  const full = `data.completed = {pushups: getDynamicTarget(100, data.dailyTargetLevel, 'pushups')};`;
  const CASES = [
    ['основной раунд идёт', 'data.isGoalMet=false; data.limitBreakRoundPending=false; data.activeScroll=null; data.curseActiveToday=false; data.completed={pushups:10};', ''],
    ['основной раунд закрыт', 'data.isGoalMet=false; data.limitBreakRoundPending=false;' + full, ''],
    ['Предел идёт', 'data.isGoalMet=true; data.limitBreakRoundPending=true; data.completed={pushups:10};', 'limit-break'],
    ['Предел закрыт', 'data.isGoalMet=true; data.limitBreakRoundPending=false;' + full, 'limit-break'],
    ['следующий раунд Предела', 'data.isGoalMet=true; data.limitBreakRoundPending=true; data.completed={};', 'limit-break'],
    ['основной раунд с Переносом', "data.isGoalMet=false; data.limitBreakRoundPending=false; data.activeScroll='transfer'; data.transferExerciseId='steps';" + full, 'scroll-tinted'],
    ['Предел + Перенос идёт', "data.isGoalMet=true; data.limitBreakRoundPending=true; data.activeScroll='transfer'; data.completed={pushups:10};", 'limit-scroll'],
    ['Предел + Перенос закрыт', "data.isGoalMet=true; data.limitBreakRoundPending=false; data.activeScroll='transfer';" + full, 'limit-scroll'],
    ['Бремя + Предел', "data.activeScroll=null; data.curseActiveToday=true; data.isGoalMet=true;", 'cursed'],
    ['Бремя + Перенос + Предел', "data.activeScroll='transfer'; data.curseActiveToday=true; data.isGoalMet=true;", 'cursed-scroll'],
  ];
  for (const [label, code, exp] of CASES) {
    E(w, code + ' render()');
    check(`T ${label}: ${exp || 'обычный зелёный'}`, tint() === exp, tint());
  }
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  check('T «Предел + свиток»: пульсирующий ореол у цифр и цели, свечение у полоски',
    /\.counter\.limit-scroll \{ color: #40c0ff; animation: limitScrollPulse/.test(css) && /\.target\.limit-scroll \{[^}]*animation: limitScrollPulseTarget/.test(css) && /\.qbar-fill\.limit-scroll \{ background: #40c0ff;/.test(css));
  // свечение эмблемы в окне «СТАТУС» помещается в запас прокручиваемой области
  const maxR = name => { const m = css.match(new RegExp('@keyframes ' + name + ' \\{([^\\n]*)\\}')); return m ? Math.max(...[...m[1].matchAll(/drop-shadow\(0 0 (\d+)px/g)].map(x => +x[1])) : Infinity; };
  const pad = parseFloat(w.getComputedStyle(D.querySelector('#statusOverlay .status-body')).paddingTop);
  const rs = maxR('hexPulseSssCompact'), rm = maxR('hexPulseMonarchCompact');
  check('G1 наибольший радиус свечения SSS/Monarch в «СТАТУСЕ» меньше запаса окна', rs <= 12 && rm <= 12 && rs < pad && rm < pad, `SSS ${rs}px, Monarch ${rm}px, запас ${pad}px`);
  check('G2 в «СТАТУСЕ» используется компактная пульсация, на главном экране — прежняя',
    /#statusOverlay \.rk-sss \.sc-hexw \{ animation-name: hexPulseSssCompact; \}/.test(css) && /#statusOverlay \.rk-monarch \.sc-hexw \{ animation-name: hexPulseMonarchCompact; \}/.test(css)
    && /\n    \.rk-sss \.sc-hexw \{ animation: hexPulseSss 2\.4s/.test(css));
}

// ===== v6.6.0: карточка статуса, полоса таймера, окно «СТАТУС» =====
async function headerTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, $ = id => D.getElementById(id);
  // --- ранги, цвет, число в эмблеме ---
  const RANKS = [[5,'e','E-Rank','d1'],[15,'d','D-Rank','d2'],[26,'c','C-Rank','d2'],[35,'b','B-Rank','d2'],[45,'a','A-Rank','d2'],
                 [55,'s','S-Rank','d2'],[67,'national','National Level','d2'],[88,'sss','SSS-Rank','d2'],[100,'monarch','Shadow Monarch','d3'],[123,'monarch','Shadow Monarch','d3']];
  const bad = [];
  for (const [lv, cls, name, dcls] of RANKS) {
    E(w, `data.level=${lv}; render()`);
    if ($('hdrTop').className !== 'sc-top rk-' + cls || $('hdrRank').textContent !== name || $('hdrLevel').textContent !== String(lv) || $('hdrLevel').className !== dcls) bad.push(lv + ':' + $('hdrTop').className + '/' + $('hdrRank').textContent + '/' + $('hdrLevel').className);
  }
  check('H1 эмблема: уровень, класс цифр, цвет и название ранга для всех рангов', bad.length === 0, bad.join(', '));
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  check('H2 у SSS и Monarch пульсируют эмблема и название', /\.rk-sss \.sc-hexw \{ animation: hexPulseSss/.test(css) && /\.rk-monarch \.sc-hexw \{ animation: hexPulseMonarch/.test(css)
    && /\.rk-sss \.sc-rank \{ animation: auraPulseSss/.test(css) && /\.rk-monarch \.sc-rank \{ animation: auraPulseMonarch/.test(css));
  check('H3 у карточки нет уголков', !/\.status-card::(before|after)/.test(css) && !$('rankInfoBtn').classList.contains('hud-frame'));
  // --- имя, титул с иконкой, опыт, долг, кредиты, серия ---
  E(w, `data.playerName=''; data.activeTitle='Новичок'; data.level=26; data.exp=1250; data.expDebt=0; data.credits=8420.7; data.consecutiveDays=12; render()`);
  check('H4 имя по умолчанию «Игрок» без приставки', $('hdrName').textContent === 'Игрок', $('hdrName').textContent);
  E(w, `data.playerName='Святослав'; render()`);
  check('H5 имя игрока', $('hdrName').textContent === 'Святослав');
  const etn = E(w, 'getExpToNext(26)');
  const sp = t => t.replace(/[\u00a0\u202f]/g, ' ');
  check('H6 опыт «X / Y EXP» (без разделителя разрядов) и шкала', $('hdrExp').textContent === `1250 / ${etn} EXP` && Math.abs(parseFloat($('hdrBarFill').style.width) - 1250 / etn * 100) < 0.01, $('hdrExp').textContent);
  check('H7 кредиты целым числом с ◈ (без разделителя), «Серия дней» числом', $('hdrCredits').textContent === '8420 ◈' && $('hdrStreak').textContent === '12'
    && $('hdrStreak').previousElementSibling.textContent === 'Серия дней' && $('stStreak').previousElementSibling.textContent === 'Серия дней', $('hdrCredits').textContent + ' | ' + $('hdrStreak').textContent);
  const act = E(w, 'data.activeTitle'), hasIcon = E(w, `!!TITLE_ICON_IDS[data.activeTitle]`);
  check('H8 титул активный, иконка — если она есть у титула', $('hdrTitle').querySelector('span').textContent === act && !!$('hdrTitle').querySelector('img') === hasIcon, $('hdrTitle').innerHTML);
  E(w, `data.exp=0; data.expDebt=300; render()`);
  check('H9 долг: строка, красная шкала, строка долга', $('hdrExpRow').classList.contains('debt') && $('hdrExp').textContent === 'Долг −300 EXP' && $('hdrBar').classList.contains('debt')
    && $('hdrDebt').style.display === 'block' && $('hdrDebtVal').textContent === '300', $('hdrExp').textContent);
  E(w, `data.expDebt=0; render()`);
  check('H10 без долга строка долга скрыта', $('hdrDebt').style.display === 'none');
  E(w, `data.credits=1234567; data.exp=118400; render()`);
  check('H10a большие числа — без разделителя, как во всём приложении', $('hdrCredits').textContent === '1234567 ◈' && $('hdrExp').textContent.startsWith('118400 / ')
    && !/[\u00a0\u202f ]\d{3}\b/.test($('hdrCredits').textContent.replace(' ◈','')), $('hdrCredits').textContent + ' | ' + $('hdrExp').textContent);
  E(w, `data.credits=8420.7; data.exp=1250; render()`);
  // --- таймер ---
  E(w, `data.activeScroll=null; updateTimer()`);
  const cells = () => [...$('timer').children];
  check('H11 обычный таймер: 8 ячеек (6 цифр + 2 двоеточия), подпись', cells().length === 8 && cells().filter(c => c.classList.contains('col')).length === 2
    && $('resetTimerContainer').querySelector('.reset-label').textContent === 'Сброс задания через', cells().map(c => c.textContent).join(''));
  const exp24 = E(w, `(getNextResetTime() - Date.now()) / 86400000 * 100`);
  check('H12 линия — доля от 24 ч', Math.abs(parseFloat($('dayLineFill').style.width) - exp24) < 0.1, $('dayLineFill').style.width);
  const firstCell = cells()[0];
  E(w, `updateTimer()`);
  check('H13 при обновлении ячейки не пересоздаются', cells()[0] === firstCell);
  E(w, `data.activeScroll='freeze'; data.freezeEndTimestamp = Date.now() + (143*3600 + 12*60 + 5) * 1000; updateTimer()`);
  const txt = cells().map(c => c.textContent).join('');
  check('H14 Заморозка: 9 ячеек, часы трёхзначные, своя подпись', cells().length === 9 && /^14[23]:\d\d:\d\d$/.test(txt)
    && $('resetTimerContainer').querySelector('.reset-label').textContent === 'Заморозка закончится через', txt);
  check('H15 Заморозка: линия — доля от 7 суток, без красного', Math.abs(parseFloat($('dayLineFill').style.width) - (143*3600+12*60+5) / (7*86400) * 100) < 0.2 && !$('resetTimerContainer').classList.contains('warning'), $('dayLineFill').style.width);
  E(w, `data.activeScroll=null; updateTimer()`);
  check('H16 после Заморозки снова 8 ячеек', cells().length === 8);
  const warnNow = E(w, `(getNextResetTime() - Date.now()) < 3600000`);
  check('H17 красное состояние только при остатке меньше часа', $('resetTimerContainer').classList.contains('warning') === warnNow);
  check('H18 красное состояние: CSS для полосы, цифр и линии', /\.tstrip\.warning \{/.test(css) && /\.tstrip\.warning \.tc \{/.test(css) && /\.tstrip\.warning \.dayline i \{/.test(css));
  check('H19 цифры в ячейках одной ширины', /\.tbox \.tc\.dg \{ width: 0\.78em; \}/.test(css) && /\.tbox \{ margin-left: auto;/.test(css));
  // --- окно «СТАТУС» ---
  E(w, `data.statPoints=2; data.stats={str:18,agi:14,sta:22,int:12,per:15}; render()`);
  $('rankInfoBtn').click();
  check('H20 нажатие на карточку открывает «СТАТУС»', $('statusOverlay').style.display === 'flex' && D.querySelector('#statusOverlay .status-header').textContent === 'СТАТУС');
  check('H21 в окне та же карточка', $('stLevel').textContent === $('hdrLevel').textContent && $('stRank').textContent === $('hdrRank').textContent && $('stExp').textContent === $('hdrExp').textContent && $('stStreak').textContent === $('hdrStreak').textContent);
  check('H22 характеристики и свободные очки', $('valStr').textContent === '18' && $('valSta').textContent === '22' && $('statPoints').textContent === '2'
    && D.querySelector('#statusOverlay .st-free-k').textContent === 'Свободные очки характеристик');
  $('btnAgi').click();
  check('H23 «+» тратит очко и вспыхивает', $('valAgi').textContent === '15' && $('statPoints').textContent === '1' && $('btnAgi').classList.contains('stat-btn-flash'));
  $('btnAgi').click();
  check('H24 при нуле очков «+» неактивна', $('statPoints').textContent === '0' && $('btnStr').disabled);
  E(w, `window.__lore = null; const _o = showStatLore; showStatLore = id => { window.__lore = id; }`);
  D.querySelectorAll('#statusOverlay .st-k')[2].click();
  check('H25 касание названия открывает описание характеристики', E(w, 'window.__lore') === 'sta');
  const labels = [...D.querySelectorAll('#statusOverlay .st-k')].map(e => e.textContent).join(',');
  check('H26 названия характеристик по-русски', labels === 'Сила,Ловкость,Выносливость,Интеллект,Восприятие', labels);
  $('closeStatusBtn').click();
  check('H27 «ЗАКРЫТЬ» закрывает окно', $('statusOverlay').style.display === 'none');
  // --- шрифты новых элементов по правилу ---
  const fam = sel => w.getComputedStyle(D.querySelector(sel)).fontFamily;
  const textEls = ['.sc-title', '.sc-exp .k', '.sc-chip .k', '.tstrip .reset-label', '.st-k', '.st-free-k', '.sc-emb-cap'];
  const numEls = ['.sc-exp .n', '.sc-chip .n'];
  const badF = textEls.filter(s => !fam(s).includes('Exo 2 Text')).concat(numEls.filter(s => !fam(s).includes('Roboto Mono')));
  check('H28 шрифты: текст — Exo 2 Text, числа — Roboto Mono', badF.length === 0, badF.join(', '));
  const sb = D.querySelector('#statusOverlay .status-body'), cs = w.getComputedStyle(sb);
  check('H29a окно «СТАТУС»: у прокручиваемого блока запас под свечение эмблемы', cs.paddingTop === '16px' && cs.paddingLeft === '16px' && cs.marginTop === '-16px' && cs.marginLeft === '-16px',
    cs.padding + ' / ' + cs.margin);
  const other = D.querySelector('.status-overlay:not(#statusOverlay) .status-body');
  check('H29b другие окна запас не получили', !other || w.getComputedStyle(other).paddingTop !== '16px');
  check('H29 старой шапки в разметке нет', !D.querySelector('.header-bottom-row, .rank-info, #playerNameDisplay, #levelDisplay, #creditsVal, .reset-time'));
}

// ===== v6.5.36: дизайн =====
async function designTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document;
  // --- полоска прогресса ---
  const fillW = id => D.querySelector(`.quest-item[data-id="${id}"] .qbar-fill`).style.width;
  check('P1 полоска есть во всех пяти карточках, под «/ цель»', D.querySelectorAll('.quest-item .qbar .qbar-fill').length === 5
    && [...D.querySelectorAll('.quest-item')].every(q => q.querySelector('.target').nextElementSibling.classList.contains('qbar')));
  E(w, `data.completed={}; render()`);
  check('P2 0% при пустом прогрессе', fillW('pushups') === '0%', fillW('pushups'));
  E(w, `data.completed.pushups = Math.floor(getDynamicTarget(100, data.dailyTargetLevel, 'pushups') / 2); render()`);
  const t = E(w, `getDynamicTarget(100, data.dailyTargetLevel, 'pushups')`), half = Math.floor(t/2);
  check('P3 частичный прогресс = сделано ÷ цель', Math.abs(parseFloat(fillW('pushups')) - half / t * 100) < 0.01, fillW('pushups'));
  E(w, `data.completed.pushups = getDynamicTarget(100, data.dailyTargetLevel, 'pushups') + 7; render()`);
  check('P4 сверх цели — ровно 100%', fillW('pushups') === '100%', fillW('pushups'));
  const tintOf = () => [...D.querySelector('.quest-item[data-id="pushups"] .qbar-fill').classList].filter(c => c !== 'qbar-fill').join(',');
  const cases = [['обычный', 'data.curseActiveToday=false; data.activeScroll=null; data.limitBreakRoundPending=false;', ''],
                 ['свиток', "data.activeScroll='contract';", 'scroll-tinted'],
                 ['Предел', "data.activeScroll=null; data.limitBreakRoundPending=true;", 'limit-break'],
                 ['Бремя', "data.limitBreakRoundPending=false; data.curseActiveToday=true;", 'cursed'],
                 ['Бремя+свиток', "data.activeScroll='transfer'; data.transferExerciseId='steps';", 'cursed-scroll']];
  for (const [label, code, cls] of cases) {
    E(w, code + ' render()');
    const counterCls = [...D.getElementById('pushups').classList].join(',');
    check(`P5 цвет полоски = цвет цифр: ${label}`, tintOf() === cls && (cls === '' ? counterCls === 'counter' : counterCls.includes(cls)), tintOf() + ' | ' + counterCls);
  }
  // --- LEVEL UP ---
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const kf = (css.match(/@keyframes levelUp \{([^\n]*)\}/) || [])[1] || '';
  check('L1 центрирующий сдвиг внутри каждого кадра анимации', (kf.match(/translateX\(-50%\)/g) || []).length === 4, kf);
  const lu = (css.match(/\.levelup-popup \{([^}]*)\}/) || [])[1] || '';
  check('L2 одна строка и размер по ширине экрана', lu.includes('white-space:nowrap') && lu.includes('font-size:clamp(1.6rem, 11vw, 3.5rem)') && lu.includes('animation:levelUp 3s'), lu);
  // --- шрифты: по вычисленному стилю ---
  const fam = sel => { const el = D.querySelector(sel); return el ? w.getComputedStyle(el).fontFamily : null; };
  const probe = D.createElement('div'); probe.innerHTML = `
    <div class="item-card"><div class="item-info"><div class="item-name">x</div><div class="item-desc">x</div></div><button class="use-btn sell-btn">-1</button></div>
    <div class="item-preview-meta">x</div><div class="danger-text">x</div><ul class="danger-list"><li>x</li></ul>
    <div class="notif-log-row"><span class="notif-log-time">09:00</span><span class="notif-log-text">x</span></div>
    <div class="effect-detail-name">x</div><div class="effect-detail-text">x</div><div class="codex-chapter-text">x</div>
    <div class="stat-lore-text">x</div><div class="cal-month-summary">x</div><div class="legend">x</div><div class="cal-tooltip-body">x</div>
    <div class="system-popup-sub">x</div><div class="backup-summary">x</div><span class="restore-link">x</span>`;
  D.body.appendChild(probe);
  const TEXT = ['.item-name','.item-desc','.item-preview-meta','.danger-text','.danger-list','.notif-log-text','.effect-detail-name','.effect-detail-text',
                '.codex-chapter-text','.stat-lore-text','.cal-month-summary','.legend','.cal-tooltip-body','.system-popup-sub','.backup-summary','.restore-link',
                '.stats-container .stat-line > span','.stats-caption'];
  const bad = TEXT.filter(sel => !(fam(sel) || '').includes('Exo 2 Text'));
  check('F1 все текстовые элементы из таблицы — Exo 2 Text', bad.length === 0, bad.join(', '));
  const SIZES = { '.item-name':'1.03rem', '.item-desc':'0.81rem', '.item-preview-meta':'0.84rem', '.danger-text':'0.92rem', '.danger-list':'0.86rem', '.notif-log-text':'0.78rem',
                  '.effect-detail-name':'1.03rem', '.effect-detail-text':'0.81rem', '.codex-chapter-text':'0.86rem', '.stat-lore-text':'0.92rem',
                  '.cal-month-summary':'0.7rem', '.legend':'0.67rem', '.system-popup-sub':'0.81rem', '.backup-summary':'0.81rem', '.restore-link':'0.81rem' };
  const badSize = Object.entries(SIZES).filter(([sel, v]) => w.getComputedStyle(D.querySelector(sel)).fontSize !== v).map(([sel]) => sel + '=' + w.getComputedStyle(D.querySelector(sel)).fontSize);
  check('F2 размеры +8% по таблице', badSize.length === 0, badSize.join(', '));
  check('F3 межстрочный интервал Кодекса 1,55', w.getComputedStyle(D.querySelector('.codex-chapter-text')).lineHeight === '1.55');
  const NUM = ['#pushups', '.target', '.reward', '#hdrExp', '#hdrCredits', '#hdrStreak', '#totalDays', '.notif-log-time', '#timer .tc'];
  const badNum = NUM.filter(sel => D.querySelector(sel) && (fam(sel) || '').includes('Exo 2 Text'));
  check('F4 цифры и данные не перешли на Exo 2', badNum.length === 0, badNum.join(', '));
  const quest = fam('.quest-name') || '';
  check('F5 названия упражнений не изменились', !quest.includes('Exo 2 Text'), quest);
  check('F6 кнопки остались в Orbitron', (fam('.sell-btn') || '').includes('Orbitron'), fam('.sell-btn'));
  const faces = css.match(/@font-face \{[^}]*'Exo 2 Text'[^}]*\}/g) || [];
  const fs = require('fs'), path = require('path');
  const files = faces.map(f => f.match(/fonts\/([^']+)'/)[1]);
  check('F7 семейство Exo 2 Text: 4 начертания, файлы на месте', faces.length === 4 && files.every(f => fs.existsSync(path.join(__dirname, '..', 'fonts', f))), files.join(', '));
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf-8');
  check('F8 новые шрифты в списке докачки Service Worker', ['exo-2-cyrillic-400-normal.woff2','exo-2-latin-400-normal.woff2','exo-2-latin-700-normal.woff2'].every(f => sw.includes(`'./fonts/${f}'`)));
  const exo2Weights = (css.match(/@font-face \{[^}]*font-family: 'Exo 2';[^}]*\}/g) || []).map(f => f.match(/font-weight: (\d+)/)[1]).sort().join(',');
  check('F9 семейство Exo 2 для заголовков не тронуто (только 500 и 700)', exo2Weights === '500,700', exo2Weights);
}

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
  await designTests();
  await headerTests();
  await limitTintTests();
  await cleanupTests();
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\nИтого: ${results.length - failed} OK, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})();
