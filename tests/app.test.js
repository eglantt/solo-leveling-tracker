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
{ const w0 = boot(); SEED = w0.eval(`JSON.stringify(Object.assign({}, data, {level:20, exp:5000, rulesAcknowledged:true, playerName:'T', lastReset: getLastResetThreshold(Date.now()), dailyTargetLevel:20}))`); w0.close(); }
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
const full1 = E(w,'(()=>{let p=Math.max(0.05,0.15-Math.floor(data.level/20)*0.03-Math.max(0,data.stats.str-10)*0.0025); if(isArtifactEquipped("amulet_will"))p*=0.85; return Math.floor(getExpToNext(data.level)*p);})()');
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





















// ===== v6.8.4: Свиток Отречения подавляет артефакты и Силу; подавленные в панели =====
async function renunciationTests() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mk = async (extra) => { const w = boot(); await sleep(250);
    E(w, `data.level = 80; data.inventory = Object.keys(ARTEFACTS); data.curseActiveToday = false; data.pendingCurse = false; data.insurance = false; data.insuranceSourceId = null;
          data.stats.str = 60; data.stats.int = 10; data.stats.agi = 10; data.stats.sta = 10; data.expBoostToday = 0; data.creditBoostToday = 0; data.paceControl = false; ${extra || ''}; render();`); return w; };
  { const w = await mk(`data.equippedArtifacts = ['crystal_shadow', null, null, null]`);
    const exp = (r, eq) => E(w, `(() => { data.activeScroll = ${r ? "'renunciation'" : 'null'}; data.equippedArtifacts = ${eq ? "['crystal_shadow', null, null, null]" : '[null, null, null, null]'}; return getDynamicExp(1000, 1, 'pushups'); })()`);
    check('R1 опыт: Кристалл Теней (+5%) действует без Отречения и не действует под ним',
      exp(false, true) - exp(false, false) === 50 && exp(true, true) === exp(true, false), `${exp(false, true)}-${exp(false, false)} / ${exp(true, true)}-${exp(true, false)}`); }
  { const creds = async r => { const w = await mk(`data.equippedArtifacts = ['crystal_shadow', null, null, null]; data.activeScroll = ${r ? "'renunciation'" : 'null'}; data.activeTitle = 'Новичок';
        data.completed = { pushups: getDynamicTarget(100, data.dailyTargetLevel, 'pushups') - 1 }; data.credits = 0; data.isGoalMet = false;`);
      E(w, `Math.random = () => 0.99; render()`); w.document.querySelector('.quest-item[data-id="pushups"] .add').click(); return E(w, 'data.credits'); };
    const c0 = await creds(false), c1 = await creds(true);
    check('R2 кредиты: Кристалл Теней (+15%) под Отречением не действует', Math.abs(c0 / c1 - 1.15) < 0.02, `${c0} / ${c1}`); }
  { const box = async r => { const w = await mk(`data.equippedArtifacts = ['crystal_shadow', null, null, null]; data.activeScroll = ${r ? "'renunciation'" : 'null'}; data.boxes = {}; data.isGoalMet = false; data.dailyNotices.complete = false;
        data.completed = {}; document.querySelectorAll('.quest-item').forEach(i => { data.completed[i.dataset.id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, i.dataset.id); }); data.completed.pushups -= 1;`);
      E(w, `Math.random = () => 0; render()`); w.document.querySelector('.quest-item[data-id="pushups"] .add').click(); return [E(w, "data.boxes['box_obsidian'] || 0"), E(w, 'data.activeScroll')]; };
    const b0 = await box(false), b1 = await box(true);
    check('R3 шкатулка Кристалла Теней за полный день: без Отречения есть, под Отречением нет (Отречение снято)', b0[0] === 1 && b1[0] === 0 && b1[1] === null, JSON.stringify([b0, b1])); }
  { const pen = async (r, eq) => { const w = await mk(`data.equippedArtifacts = ${JSON.stringify(eq)}; data.activeScroll = ${r ? "'renunciation'" : 'null'}; data.exp = 90000;`);
      return E(w, `computePenaltyAndApply('2026-09-01').loss`); };
    const expected = async (useStr, useAmulet) => { const w = await mk(''); return E(w, `(() => { const base = 0.15 - Math.floor(data.level / 20) * 0.03; let p = Math.max(0.05, base - ${useStr ? '(data.stats.str - 10) * 0.0025' : '0'}); ${useAmulet ? 'p *= 0.85;' : ''} return Math.floor(getExpToNext(data.level) * p); })()`); };
    const withAll = await pen(false, ['amulet_will', null, null, null]), renounced = await pen(true, ['amulet_will', null, null, null]);
    check('R4 штраф без Отречения: Сила и Амулет Воли снижают', withAll === await expected(true, true), `${withAll} vs ${await expected(true, true)}`);
    check('R5 штраф под Отречением: без Силы и без Амулета Воли', renounced === await expected(false, false), `${renounced} vs ${await expected(false, false)}`); }
  { const w = await mk(`data.equippedArtifacts = ['amulet_will', null, null, null]; data.activeScroll = 'renunciation'; data.isGoalMet = false; data.completed = {}; data.exp = 90000; data.lastReset -= 86400000;`);
    E(w, 'checkMissedDays()');
    const st = JSON.parse(E(w, 'JSON.stringify(data.penaltyStack[data.penaltyStack.length - 1])'));
    const exp = await (async () => { const w2 = await mk(''); return E(w2, `Math.floor(getExpToNext(data.level) * Math.max(0.05, 0.15 - Math.floor(data.level / 20) * 0.03))`); })();
    check('R6 проваленный день под Отречением: штраф на сбросе без Силы и Амулета Воли', st && st.loss === exp, `${st && st.loss} vs ${exp}`); }
  { const w = await mk(`data.equippedArtifacts = ['seal_limit', null, null, null]; data.activeScroll = 'renunciation'`);
    check('R7 Печать Предела под Отречением действует', E(w, 'getDailyLimitBreakCap()') === 2 + E(w, 'data.extraLimitBreaksToday || 0'));
    E(w, `data.equippedArtifacts = ['seal_growth', 'sphere_growth', 'crystal_shadow', null]; data.statPoints = 0; data.exp = getExpToNext(data.level); checkLevelUp()`);
    check('R8 очки при повышении уровня под Отречением те же (5+3+4+6)', E(w, 'data.statPoints') === 18, E(w, 'data.statPoints')); }
  { const w = await mk(`data.equippedArtifacts = ['crystal_insight', 'crystal_speed', 'amulet_continuity', null]; data.stats.int = 50`);
    const exp = r => E(w, `(() => { data.activeScroll = ${r ? "'renunciation'" : 'null'}; if (!data.titlesUnlocked.includes('Целеустремлённый')) data.titlesUnlocked.push('Целеустремлённый'); data.activeTitle = 'Целеустремлённый'; return getDynamicExp(1000, 1, 'pushups'); })()`);
    check('R9 ранее отключаемое (Интеллект, титул, Прозрения, Непрерывности) по-прежнему отключено', exp(true) === 1000 && exp(false) > 1000, `${exp(true)} / ${exp(false)}`); }
  // панель
  { const w = await mk(`data.equippedArtifacts = ['crystal_shadow', 'seal_growth', 'amulet_will', 'seal_limit']; data.activeScroll = 'renunciation'`);
    const eff = () => JSON.parse(E(w, 'JSON.stringify(window.__activeEffectsCache.map(e => ({ n: e.name, t: e.text, s: !!e.isSuppressed, a: !!e.isArtifact, ti: !!e.isTitle })))'));
    const list = eff(), arts = list.filter(e => e.a), title = list.find(e => e.ti);
    check('R10 подавлены ровно Кристалл Теней и Амулет Воли; Печать Развития и Печать Предела — обычные',
      JSON.stringify(arts.map(e => [e.n, e.s])) === JSON.stringify([['Артефакт: Кристалл Теней (подавлен)', true], ['Артефакт: Печать Развития', false], ['Артефакт: Амулет Воли (подавлен)', true], ['Артефакт: Печать Предела', false]]), JSON.stringify(arts));
    check('R11 титул подавлен: «(подавлен)» и строка о Свитке Отречения', !!title && title.s && / \(подавлен\)$/.test(title.n) && title.t.endsWith('\nДействие титула подавляется эффектом Свитка Отречения.'), title && JSON.stringify(title));
    check('R12 подробности артефакта: эффект, затем строка о Свитке Отречения', arts[0].t === E(w, `artifactEffectText('crystal_shadow')`) + '\nДействие артефакта подавляется эффектом Свитка Отречения.');
    const btns = [...w.document.querySelectorAll('#effectsRow .effect-icon-btn')];
    const dim = btns.map(b => b.querySelector('img').classList.contains('suppressed') ? 'D' : '.').join(''), dots = btns.filter(b => b.querySelector('.eff-dot')).length;
    check('R13 тусклые иконки только у подавленных; точки-метки на месте', dim.endsWith('DD.D.') && dots === 5, `${dim}, точек ${dots}`);
    check('R14 перенос строки в подробностях', w.getComputedStyle(w.document.getElementById('effectDetailText')).whiteSpace === 'pre-line');
    E(w, `data.activeScroll = null; render()`);
    check('R15 после снятия Отречения всё обычное', eff().every(e => !e.s && !/подавлен/.test(e.n)));
    E(w, `data.pendingScroll = 'renunciation'; render()`);
    check('R16 ожидающее Отречение ничего не подавляет', eff().filter(e => e.a || e.ti).every(e => !e.s)); }
  { const w = await mk('');
    check('R17 описание Шкатулки Тёмного Кварца', E(w, `BOX_CATALOG.box_dark_quartz.desc`).includes('включая более сильные версии расходников') && !E(w, `BOX_CATALOG.box_dark_quartz.desc`).includes('усиленн')); }
}

// ===== v6.8.2: артефакты в панели эффектов, четыре контура =====
async function effectsPanelTests() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const w = boot(); await sleep(250);
  const D = w.document, $ = id => D.getElementById(id), cs = el => w.getComputedStyle(el);
  E(w, `data.level = 80; data.inventory = Object.keys(ARTEFACTS); data.activeScroll = null; data.curseActiveToday = false; data.pendingCurse = false;
        data.insurance = true; data.insuranceSourceId = 'rune_protection'; data.expBoostToday = 0.55; data.expBoostSourceId = 'crystal_clarity';
        if (!data.titlesUnlocked.includes('Целеустремлённый')) data.titlesUnlocked.push('Целеустремлённый'); data.activeTitle = 'Целеустремлённый';
        data.equippedArtifacts = ['crystal_shadow', 'amulet_will', 'crystal_insight', null]; render();`);
  const names = () => JSON.parse(E(w, 'JSON.stringify(window.__activeEffectsCache.map(e => e.name))'));
  const n1 = names(), iT = n1.findIndex(n => n.startsWith('Титул: '));
  check('EP1 порядок: временные → титул → артефакты в порядке контуров',
    iT > 0 && JSON.stringify(n1.slice(iT + 1)) === JSON.stringify(['Артефакт: Кристалл Теней', 'Артефакт: Амулет Воли', 'Артефакт: Кристалл Прозрения']) && n1.slice(0, iT).every(n => !n.startsWith('Артефакт') && !n.startsWith('Титул')), n1.join(' | '));
  const btns = [...D.querySelectorAll('#effectsRow .effect-icon-btn')];
  const dots = btns.map(b => b.querySelector('.eff-dot') ? (b.querySelector('.eff-dot').classList.contains('art') ? 'A' : 'T') : '-').join('');
  check('EP2 точки: у артефактов голубая, у титула зелёная, у остальных нет', dots === '-'.repeat(iT) + 'TAAA', dots);
  const d = btns[iT + 1].querySelector('.eff-dot');
  check('EP3 точка 7px справа снизу, цвета', cs(d).width === '7px' && cs(d).right === '-1px' && cs(d).bottom === '-1px' && cs(d).backgroundColor.replace(/\s/g, '') === 'rgb(64,192,255)'
    && cs(btns[iT].querySelector('.eff-dot')).backgroundColor.replace(/\s/g, '') === 'rgb(64,255,170)');
  E(w, `toggleActiveEffect(${iT + 1})`);
  check('EP4 подробности артефакта: «Артефакт: …» и эффект без приставки', $('effectDetailName').textContent === 'Артефакт: Кристалл Теней'
    && $('effectDetailText').textContent === E(w, `artifactEffectText('crystal_shadow')`) && !$('effectDetailText').textContent.includes('При размещении'));
  check('EP5 у артефактов нет разрядов, у руны есть', btns.slice(iT).every(b => !b.querySelector('.rune-bolt')) && btns.some(b => b.querySelector('.rune-bolt')));
  const row = $('effectsRow'), rs = cs(row);
  check('EP6 одна строка с прокруткой вбок, без полос прокрутки', rs.flexWrap === 'nowrap' && rs.overflowX === 'auto' && rs.scrollbarWidth === 'none');
  check('EP7 запас под свечение 12/10px компенсирован (размер панели прежний)', rs.paddingTop === '12px' && rs.paddingLeft === '10px' && rs.marginTop === '-12px' && rs.marginLeft === '-10px');
  // затухание (jsdom не считает раскладку — подставляем размеры)
  Object.defineProperty(row, 'scrollWidth', { configurable: true, get: () => 600 }); Object.defineProperty(row, 'clientWidth', { configurable: true, get: () => 300 });
  row.scrollLeft = 0; E(w, 'updateEffectsFade()');
  const f1 = [row.style.getPropertyValue('--fl'), row.style.getPropertyValue('--fr')];
  row.scrollLeft = 120; E(w, 'updateEffectsFade()');
  const f2 = [row.style.getPropertyValue('--fl'), row.style.getPropertyValue('--fr')];
  row.scrollLeft = 300; E(w, 'updateEffectsFade()');
  const f3 = [row.style.getPropertyValue('--fl'), row.style.getPropertyValue('--fr')];
  Object.defineProperty(row, 'scrollWidth', { configurable: true, get: () => 300 }); row.scrollLeft = 0; E(w, 'updateEffectsFade()');
  const f4 = [row.style.getPropertyValue('--fl'), row.style.getPropertyValue('--fr')];
  check('EP8 затухание 26px: в начале — только справа; сдвинули — с обеих сторон; в конце — только слева; без переполнения — нет',
    f1.join() === '0px,26px' && f2.join() === '26px,26px' && f3.join() === '26px,0px' && f4.join() === '0px,0px', JSON.stringify([f1, f2, f3, f4]));
  row.scrollLeft = 77; const keep = btns[1];
  E(w, `toggleActiveEffect(1)`);
  check('EP9 открытие подробностей не перерисовывает строку (прокрутка сохраняется)', $('effectsRow').querySelectorAll('.effect-icon-btn')[1] === keep && row.scrollLeft === 77);
  E(w, `extractArtifact('amulet_will')`);
  check('EP10 извлечённый артефакт исчезает из панели', !names().includes('Артефакт: Амулет Воли'));
  E(w, `equipArtifact('seal_growth', 1)`);
  check('EP11 снаряжённый появляется на месте своего контура', JSON.stringify(names().filter(n => n.startsWith('Артефакт'))) === JSON.stringify(['Артефакт: Кристалл Теней', 'Артефакт: Печать Развития', 'Артефакт: Кристалл Прозрения']));
  E(w, `data.insurance = false; data.insuranceSourceId = null; data.expBoostToday = 0; data.expBoostSourceId = null; data.activeTitle = 'Новичок'; render()`);
  check('EP12 панель видна, когда временных эффектов нет (только титул и артефакты)', $('effectsContainer').style.display === 'block' && names().every(n => n.startsWith('Артефакт') || n.startsWith('Титул')) && names().some(n => n.startsWith('Артефакт')));
  // «СТАТУС»: уведомление до 10-го уровня
  const w2 = boot(); await sleep(250);
  E(w2, `data.level = 5; data.inventory = []; data.equippedArtifacts = [null,null,null,null]; window.__N = []; const _sn = showNotice; showNotice = (m, t, x, s) => { window.__N.push([m, t]); return _sn(m, t, x, s); }; updateStatusUI();`);
  const cells = [...w2.document.querySelectorAll('#eqSlots .eq-slot')];
  cells[2].click(); cells[0].click(); cells[3].click();
  const N = JSON.parse(E(w2, 'JSON.stringify(window.__N)'));
  check('EP13 до 10-го: «Контур снаряжения недоступен на этом уровне.», информационный тон, без повторов', N.length === 1 && N[0][0] === 'Контур снаряжения недоступен на этом уровне.' && N[0][1] === 'info', JSON.stringify(N));
  E(w2, `data.level = 30; data.inventory = Object.keys(ARTEFACTS).filter(k => ARTEFACTS[k].level <= 30); window.__N = []; updateStatusUI();`);
  w2.document.querySelectorAll('#eqSlots .eq-slot.locked').forEach(c => c.click());
  check('EP14 с 10-го уровня закрытые контуры не реагируют', JSON.parse(E(w2, 'JSON.stringify(window.__N)')).length === 0 && w2.document.getElementById('equipOverlay').style.display !== 'flex');
}

// ===== v6.8.1: раздел «Контроль темпа» в Длани =====
async function paceSectionTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 250));
  const D = w.document;
  const titles = [...D.querySelectorAll('.backup-section-title')].map(t => t.textContent.trim());
  const iR = titles.indexOf('Реестр Игроков'), iP = titles.indexOf('Контроль темпа'), iS = titles.indexOf('Сбросы');
  check('PS1 порядок: «Реестр Игроков» → «Контроль темпа» → «Сбросы»', iR >= 0 && iP === iR + 1 && iS === iP + 1, titles.join(' | '));
  const tP = [...D.querySelectorAll('.backup-section-title')].find(t => t.textContent.trim() === 'Контроль темпа');
  const tR = [...D.querySelectorAll('.backup-section-title')].find(t => t.textContent.trim() === 'Реестр Игроков');
  const cs = el => w.getComputedStyle(el);
  check('PS2 заголовок в том же стиле, что у соседних разделов', tP.className === tR.className && cs(tP).fontFamily === cs(tR).fontFamily && cs(tP).fontSize === cs(tR).fontSize);
  const lbl = D.getElementById('paceControlLabel'), cb = D.getElementById('paceControlCheckbox');
  check('PS3 контроль включён: «Контроль: включён.», галочка', lbl.textContent === 'Контроль: включён.' && cb.classList.contains('on'));
  E(w, 'togglePaceControl()');
  check('PS4 контроль выключен: «Контроль: выключен.», галочки нет', lbl.textContent === 'Контроль: выключен.' && !cb.classList.contains('on'));
  E(w, 'togglePaceControl()');
  check('PS5 снова включён', lbl.textContent === 'Контроль: включён.' && cb.classList.contains('on'));
  const row = lbl.parentElement;
  check('PS6 строка оформлена как настройки Архива (тот же класс и раскладка)', row.classList.contains('backup-summary') && row.style.display === 'flex' && row.style.justifyContent === 'space-between'
    && row.querySelector('.sound-checkbox-zone .sound-checkbox') === cb);
}

// ===== v6.8.0: контроль темпа =====
async function paceTests() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mk = async () => {
    const w = boot(); await sleep(250);
    E(w, `window.__t = Date.now(); Date.now = () => window.__t; window.__denied = 0; const _ps = playSound; playSound = n => { if (n === 'denied') window.__denied++; return _ps(n); };
          data.dailyTargetLevel = 80; data.completed = {}; data.isGoalMet = false; data.activeScroll = null; data.curseActiveToday = false; data.paceControl = true; data.paceWindow = emptyPaceWindow(); render();`);
    return w;
  };
  const tap = (w, id, v, n = 1) => { for (let i = 0; i < n; i++) { const b = w.document.querySelector(`.quest-item[data-id="${id}"] .add[data-value="${v}"]`); if (b && !b.disabled) b.click(); } };
  const cnt = (w, id) => E(w, `data.completed['${id}'] || 0`);
  const hot = (w, id) => [...w.document.querySelectorAll(`.quest-item[data-id="${id}"] .add`)].every(b => b.classList.contains('pace-hot'));
  const adv = (w, ms) => E(w, `window.__t += ${ms}; paceTick()`);
  { const w = await mk();
    check('PC0 контроль включён по умолчанию, чекбокс в Длани отмечен', E(w, 'data.paceControl') === true && w.document.getElementById('paceControlCheckbox').classList.contains('on'));
    tap(w, 'pushups', 10, 15);
    check('PC1 натыкать нельзя: 15 × «+10» отжиманий → засчитано 120 (два подхода)', cnt(w, 'pushups') === 120, cnt(w, 'pushups'));
    check('PC2 после отказа все три кнопки отжиманий перегреты, остаются нажимаемыми', hot(w, 'pushups') && [...w.document.querySelectorAll('.quest-item[data-id="pushups"] .add')].every(b => !b.disabled));
    check('PC3 кнопки приседаний до нажатия не перегреты', !hot(w, 'squats'));
    tap(w, 'squats', 1);
    check('PC4 окно закрыто для всех: «+1» приседаний — отказ, их кнопки перегреваются', cnt(w, 'squats') === 0 && hot(w, 'squats'));
    check('PC5 звук отказа на каждое отклонённое нажатие', E(w, 'window.__denied') === 4, E(w, 'window.__denied'));
    const n = E(w, `(currentNotificationBody === PACE_NOTICE ? 1 : 0) + notificationQueue.filter(x => x.body === PACE_NOTICE).length`);
    check('PC6 уведомление о темпе одно, при нескольких отказах подряд', n === 1, n);
    check('PC7 текст и тон уведомления', E(w, `PACE_NOTICE`) === 'Зафиксирован недопустимый темп. Последнее внесение не засчитано — Система восстанавливает контроль.'
      && E(w, `(notificationQueue.find(x => x.body === PACE_NOTICE) || { tone: 'warn' }).tone`) === 'warn');
    tap(w, 'steps', 1000, 80);
    check('PC8 шаги без ограничений: вся норма разом, запас окна не тратится', cnt(w, 'steps') >= E(w, `getDynamicTarget(10000, data.dailyTargetLevel, 'steps')`) && !hot(w, 'steps'));
    adv(w, 2 * 60000 + 10);
    check('PC9 конец окна: все кнопки остыли, окно пустое', !hot(w, 'pushups') && !hot(w, 'squats') && E(w, 'data.paceWindow.start') === null);
    tap(w, 'pushups', 10, 1);
    check('PC10 после остывания внесение снова засчитывается', cnt(w, 'pushups') === 130); }
  { const w = await mk();
    tap(w, 'pushups', 10, 6); tap(w, 'squats', 10, 8);
    check('PC11 общий запас: 60 отжиманий + 80 приседаний засчитаны', cnt(w, 'pushups') === 60 && cnt(w, 'squats') === 80);
    tap(w, 'press', 1);
    check('PC12 следующее нажатие любого упражнения — отказ', cnt(w, 'press') === 0 && hot(w, 'press')); }
  { const w = await mk();
    tap(w, 'pushups', 10, 1); adv(w, 60 * 60000); tap(w, 'pushups', 10, 20);
    check('PC13 запас не копится: +10, час перерыва, дальше подряд — засчитано ещё только 120', cnt(w, 'pushups') === 130, cnt(w, 'pushups')); }
  { const w = await mk();
    const target = E(w, `getDynamicTarget(100, data.dailyTargetLevel, 'pushups')`);
    let guard = 0; while (cnt(w, 'pushups') < target && guard++ < 50) { tap(w, 'pushups', 10, 3); adv(w, 150000); }
    check('PC14 честно по подходу (30) с перерывами 2,5 мин — ни одного отказа', cnt(w, 'pushups') >= target && E(w, 'window.__denied') === 0, `${cnt(w, 'pushups')} / ${target}`);
    const w2 = await mk();
    for (let i = 0; i < 60; i++) { tap(w2, 'press', 1); adv(w2, 3000); }
    check('PC15 по одному повторению каждые 3 с — ни одного отказа', cnt(w2, 'press') === 60 && E(w2, 'window.__denied') === 0); }
  { const w = await mk();
    tap(w, 'pushups', 10, 15);
    E(w, `data.completed = {}; document.querySelectorAll('.quest-item').forEach(i => { data.completed[i.dataset.id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, i.dataset.id); }); data.dailyNotices.complete = true; render()`);
    w.document.getElementById('limitBreakBtn').click(); w.document.querySelector('#confirmContent .confirm-btn-continue').click();
    check('PC16 начало раунда Предела сбрасывает окно', E(w, 'data.paceWindow.start') === null && !E(w, 'data.paceWindow.locked') && E(w, 'data.limitBreakRoundPending'));
    tap(w, 'pushups', 10, 15);
    check('PC17 в раунде Предела правило то же', cnt(w, 'pushups') === 120, cnt(w, 'pushups')); }
  { const w = await mk();
    tap(w, 'pushups', 10, 15);
    E(w, `data.lastReset -= 86400000; checkMissedDays()`);
    check('PC18 суточный сброс обнуляет окно', E(w, 'data.paceWindow.start') === null && !E(w, 'data.paceWindow.locked'));
    tap(w, 'pushups', 10, 15);
    E(w, `resetDailyProgressAction()`);
    check('PC19 инструмент Длани «сбросить прогресс» сбрасывает и окно (инструменты контролем не ограничены)', E(w, 'data.paceWindow.start') === null); }
  { const w = await mk();
    tap(w, 'pushups', 10, 15);
    E(w, `togglePaceControl()`);
    check('PC20 выключение в Длани: чекбокс снят, перегрев снят, сохранено', !w.document.getElementById('paceControlCheckbox').classList.contains('on') && !hot(w, 'pushups')
      && JSON.parse(w.localStorage.getItem('sl_daily_v5_5_0')).paceControl === false);
    tap(w, 'squats', 10, 15);
    check('PC21 при выключенном контроле всё засчитывается', cnt(w, 'squats') === 150 && !hot(w, 'squats'));
    E(w, `togglePaceControl()`);
    check('PC22 включение обратно', E(w, 'data.paceControl') === true && w.document.getElementById('paceControlCheckbox').classList.contains('on')); }
  { const w = await mk();
    check('PC23 Кодекс: глава «Дневное Задание» дополнена', E(w, `CODEX_CHAPTERS.daily_quota.content`).endsWith('Выполненное задание приносит опыт и кредиты. Система следит за темпом выполнения: повторения, внесённые быстрее, чем их возможно совершить, не засчитываются.'));
    const legacy = JSON.parse(SEED); delete legacy.paceControl; delete legacy.paceWindow; const saved = SEED; SEED = JSON.stringify(legacy); const w2 = boot(); SEED = saved; await sleep(250);
    check('PC24 старое сохранение: контроль включён, окно пустое', E(w2, 'data.paceControl') === true && E(w2, 'JSON.stringify(data.paceWindow)') === JSON.stringify({ start: null, used: 0, locked: false, hot: [] }));
    const bad = JSON.parse(E(w, `JSON.stringify([ sanitizePaceWindow({ start: Date.now() + 999999, used: 1, locked: true, hot: ['pushups'] }),
      sanitizePaceWindow({ start: Date.now() - 1000, used: -5, locked: 1, hot: ['pushups', 'steps', 'evil', 'pushups'] }) ])`));
    check('PC25 бэкап: окно из будущего → пустое; отрицательный запас → 0; шаги и чужое из перегрева убраны',
      bad[0].start === null && bad[1].used === 0 && bad[1].locked === true && JSON.stringify(bad[1].hot) === '["pushups"]', JSON.stringify(bad));
    const clean = JSON.parse(E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { paceControl: 'yes' }), total: {} }))`));
    check('PC26 бэкап с неверным флагом → контроль включён', clean.state.paceControl === true); }
}

// ===== v6.7.3: кредиты не уходят в минус =====
async function creditsFloorTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 250));
  const D = w.document;
  const add = v => { D.getElementById('sysCreditsInput').value = String(v); E(w, 'addCreditsAction()'); return E(w, 'data.credits'); };
  E(w, 'data.credits = 500'); const a = add(-800);
  E(w, 'data.credits = 500'); const b = add(-300);
  E(w, 'data.credits = 500'); const c = add(300);
  check('CF1 Длань: −800 при 500 → 0; −300 → 200; +300 → 800', a === 0 && b === 200 && c === 800, `${a}, ${b}, ${c}`);
  const legacy = JSON.parse(SEED); legacy.credits = -1200; const saved = SEED; SEED = JSON.stringify(legacy); const w2 = boot(); SEED = saved;
  await new Promise(r => setTimeout(r, 250));
  check('CF2 отрицательный баланс в сохранении → 0 при загрузке', E(w2, 'data.credits') === 0);
  const clean = JSON.parse(E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { credits: -50 }), total: {} }))`));
  check('CF3 бэкап с отрицательным балансом → 0', clean.state.credits === 0);
  E(w, `data.credits = 10; window.__N = []; const _sn = showNotice; showNotice = (m) => window.__N.push(m); buyItem(Object.keys(SHOP_CATALOG)[0])`);
  check('CF4 покупка без нужной суммы отклоняется, баланс не меняется', E(w, 'data.credits') === 10 && E(w, 'window.__N.includes("Недостаточно кредитов.")'), E(w, 'JSON.stringify(window.__N)'));
}

// ===== v6.7.2: Восприятие снижает шансы простых шкатулок (Б-мягкий) =====
async function boxOddsTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 250));
  const W = { box_basalt:70, box_onyx:30, box_obsidian:18, box_dark_quartz:10, box_scarlet:6, box_crimson:3, box_purple:2, box_shadow:1 };
  const expected = per => { const b = Math.max(0, per - 10), rare = 1 + 0.003 * b, w2 = {};
    for (const k in W) w2[k] = k === 'box_basalt' ? W[k] / (1 + 0.006 * b) : k === 'box_onyx' ? W[k] / (1 + 0.003 * b) : W[k] * rare;
    const t = Object.values(w2).reduce((a, x) => a + x, 0); const o = {}; for (const k in w2) o[k] = w2[k] / t; return o; };
  const sample = (lvl, per, n) => JSON.parse(E(w, `(() => { data.level = ${lvl}; data.stats.per = ${per}; const c = {}; for (let i = 0; i < ${n}; i++) { const x = rollBoxTier(); c[x] = (c[x] || 0) + 1; } return JSON.stringify(c); })()`));
  const N = 40000;
  for (const per of [10, 100, 200, 335]) {
    const c = sample(100, per, N), e = expected(per), bad = [];
    for (const k in W) { const got = (c[k] || 0) / N; if (Math.abs(got - e[k]) > 0.012) bad.push(`${k}: ${(got*100).toFixed(1)} vs ${(e[k]*100).toFixed(1)}`); }
    check(`BX Восприятие ${per}: шансы по таблице Б-мягкого`, bad.length === 0, bad.join(', '));
  }
  const e335 = expected(335);
  check('BX при Восприятии 335 Базальтовая ≈ 20%, Ониксовая ≈ 13%', Math.abs(e335.box_basalt - 0.201) < 0.002 && Math.abs(e335.box_onyx - 0.129) < 0.002);
  const e10 = expected(10);
  check('BX при Восприятии 10 — как прежде (50% / 21,4%)', Math.abs(e10.box_basalt - 0.5) < 1e-9 && Math.abs(e10.box_onyx - 30/140) < 1e-9);
  const low10 = sample(5, 10, N), low200 = sample(5, 200, N);
  check('BX до 10-го уровня (только две простые): Восприятие сдвигает к Ониксовой', (low200.box_onyx || 0) > (low10.box_onyx || 0) && Object.keys(low200).every(k => k === 'box_basalt' || k === 'box_onyx'),
    `${JSON.stringify(low10)} → ${JSON.stringify(low200)}`);
  check('BX Шкатулка Аномалии в выборе по весам не участвует', !Object.keys(sample(100, 335, 5000)).includes('box_anomaly'));
}

// ===== v6.7.1: превью артефактов, окно артефакта в «СТАТУСЕ», формулировка Сферы Роста =====
async function artifactPreviewTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 250));
  const D = w.document;
  E(w, `data.level = 80; data.inventory = Object.keys(ARTEFACTS); data.equippedArtifacts = ['sphere_growth', null, null, null]; render(); updateStatusUI();`);
  check('Q1 Сфера Роста: «если оба артефакта…» в описании и в главе',
    E(w, `ARTEFACTS.sphere_growth.desc`).endsWith('складывается с Печатью Развития, если оба артефакта размещены в контурах снаряжения.')
    && E(w, `CODEX_CHAPTERS.artifact_sphere_growth.content`).includes('если оба артефакта размещены в контурах снаряжения') && !E(w, `CODEX_CHAPTERS.artifact_sphere_growth.content`).includes('если обе'));
  const ids = JSON.parse(E(w, 'JSON.stringify(Object.keys(ARTEFACTS))'));
  const bad = [];
  for (const id of ids) {
    E(w, `showItemPreview('${id}', ARTEFACTS['${id}'].name)`);
    const t = D.getElementById('itemPreviewMeta').textContent.split('\n');
    if (t[2] !== 'Применение: Контур снаряжения' || !t[3] || !t[3].startsWith('Эффект: ') || t[3].includes('При размещении') || t.length !== 4) bad.push(id + ': ' + t.join(' / '));
  }
  check('Q2 превью всех 8 артефактов: «Применение: Контур снаряжения», «Эффект:» без приставки', bad.length === 0, bad.join(' | '));
  E(w, `showItemPreview('sphere_growth', 'Сфера Роста')`);
  check('Q3 пример — Сфера Роста', D.getElementById('itemPreviewMeta').textContent === 'Ранг: A\nТип: Артефакт восхождения\nПрименение: Контур снаряжения\nЭффект: +4 очка характеристик при повышении уровня; складывается с Печатью Развития, если оба артефакта размещены в контурах снаряжения.',
    D.getElementById('itemPreviewMeta').textContent);
  const rune = E(w, `itemPreviewText('rune_protection')`);
  check('Q4 превью других предметов не изменилось', /^Ранг: .+\nТип: .+\nПрименение: .+\nЭффект: /.test(rune) && !rune.includes('Контур снаряжения'), rune);
  D.querySelector('#eqSlots .eq-slot.filled').click();
  const meta = D.querySelector('#equipBody .item-preview-meta');
  check('Q5 окно артефакта в «СТАТУСЕ» — тот же текст, что в превью', !!meta && meta.textContent === E(w, `itemPreviewText('sphere_growth')`));
  check('Q6 текст окна по левому краю, строки сохраняются', w.getComputedStyle(meta).textAlign === 'left' && w.getComputedStyle(meta).whiteSpace === 'pre-line');
  const btnWrap = D.querySelector('#equipBody .eq-extract').parentElement;
  check('Q7 кнопка «ИЗВЛЕЧЬ» по центру', btnWrap.style.textAlign === 'center');
  E(w, `closeEquipOverlay(); data.equippedArtifacts = [null,null,null,null]; render(); updateStatusUI();`);
  D.querySelector('#eqSlots .eq-slot:not(.locked)').click();
  check('Q8 строка «Выберите артефакт:» осталась по центру', w.getComputedStyle(D.querySelector('#equipBody .eq-text')).textAlign === 'center');
  E(w, `closeEquipOverlay(); openInv()`);
  const card = [...D.querySelectorAll('#invContent .item-card')].find(c => c.querySelector('.item-name') && c.querySelector('.item-name').textContent.startsWith('Сфера Роста'));
  check('Q9 в Инвентаре описание полное, с приставкой', !!card && card.querySelector('.item-desc').textContent.startsWith('При размещении в контуре снаряжения: '));
}

// ===== v6.7.0: снаряжение — контуры артефактов =====
async function equipmentTests() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mk = async (lvl, extra) => {
    const w = boot(); await sleep(250);
    E(w, `data.level = ${lvl}; data.inventory = Object.keys(ARTEFACTS).filter(k => ARTEFACTS[k].level <= ${lvl}); data.equippedArtifacts = [null,null,null,null]; ${extra || ''}; render(); updateStatusUI();`);
    return w;
  };
  // --- контуры по уровням ---
  { const w = await mk(1);
    const got = [9,10,29,30,49,50,69,70,80].map(l => E(w, `openContourCount(${l})`)).join(',');
    check('E1 контуры открываются на 10/30/50/70', got === '0,1,1,2,2,3,3,4,4', got); }
  { const bad = [];
    for (const [lvl, open] of [[5,0],[10,1],[30,2],[50,3],[70,4]]) {
      const w = await mk(lvl); const cells = [...w.document.querySelectorAll('#eqSlots .eq-slot')];
      const locked = cells.filter(c => c.classList.contains('locked')).length;
      if (cells.length !== 4 || locked !== 4 - open) bad.push(`${lvl}: ${cells.length}/${locked}`);
    }
    check('E2 (с v6.8.2) видны все 4 контура, закрытые — затемнены', bad.length === 0, bad.join(', ')); }
  // --- нажатия в «СТАТУСЕ» ---
  { const w = await mk(50); const D = w.document;
    E(w, `window.__N = []; const _sn = showNotice; showNotice = (m, t, x) => { window.__N.push(m); return _sn(m, t, x); }`);
    D.querySelector('#eqSlots .eq-slot.locked').click();
    check('E3 нажатие на закрытый контур ничего не делает', D.getElementById('equipOverlay').style.display !== 'flex');
    D.querySelectorAll('#eqSlots .eq-slot')[0].click();
    const opts = [...D.querySelectorAll('#equipBody .eq-opt')];
    check('E4 пустой контур → «Выберите артефакт:» со свободными артефактами', D.getElementById('equipOverlay').style.display === 'flex' && D.querySelector('#equipBody .eq-text').textContent === 'Выберите артефакт:' && opts.length === 5);
    opts[0].click();
    const first = E(w, 'data.equippedArtifacts[0]');
    check('E5 выбор размещает артефакт в контуре, окно закрывается, молча', !!first && D.getElementById('equipOverlay').style.display === 'none' && D.querySelector('#eqSlots .eq-slot.filled .eq-rk').textContent === E(w, `artifactRank('${first}')`) && E(w, 'window.__N.length') === 0);
    D.querySelector('#eqSlots .eq-slot.filled').click();
    check('E6 занятый контур → название, описание, «ИЗВЛЕЧЬ»', D.getElementById('equipHeader').textContent === E(w, `ARTEFACTS['${first}'].name`) && D.querySelector('#equipBody .eq-extract').textContent === 'ИЗВЛЕЧЬ');
    D.querySelector('#equipBody .eq-extract').click();
    check('E7 «ИЗВЛЕЧЬ» освобождает контур, молча', E(w, 'data.equippedArtifacts[0]') === null && !D.querySelector('#eqSlots .eq-slot.filled') && E(w, 'window.__N.length') === 0); }
  // --- Инвентарь ---
  { const w = await mk(50); const D = w.document;
    E(w, `openInv()`);
    const st = () => D.querySelector('#invContent .eq-state').textContent;
    check('E8 строка «Снаряжение: 0 из 3 контуров»', st() === 'Снаряжение: 0 из 3 контуров', st());
    const eqBtns = () => [...D.querySelectorAll('#invContent .eq-btn')];
    check('E9 у каждого артефакта кнопка «СНАРЯДИТЬ», ширина одинаковая', eqBtns().length === 5 && eqBtns().every(b => b.textContent === 'СНАРЯДИТЬ' && w.getComputedStyle(b).width === '96px'));
    const lastBtn = eqBtns()[4]; const lastId = lastBtn.getAttribute('onclick').match(/'([a-z_]+)'/)[1];
    lastBtn.click();
    const firstCard = D.querySelector('#invContent .eq-state').nextElementSibling;
    check('E10 снаряжённый — первым, голубая рамка, «●», кнопка «ИЗВЛЕЧЬ» той же ширины',
      firstCard.classList.contains('eq-on') && firstCard.querySelector('.item-name').textContent.endsWith(' ●') && firstCard.querySelector('.eq-btn').textContent === 'ИЗВЛЕЧЬ'
      && w.getComputedStyle(firstCard.querySelector('.eq-btn')).width === '96px' && E(w, `isArtifactEquipped('${lastId}')`) && st() === 'Снаряжение: 1 из 3 контуров');
    eqBtns().filter(b => b.textContent === 'СНАРЯДИТЬ').slice(0, 2).forEach(b => b.click());
    check('E11 заполнены все три открытых контура', st() === 'Снаряжение: 3 из 3 контуров');
    D.querySelector('#invContent .eq-btn:not(.eq-extract)').click();
    const repl = [...D.querySelectorAll('#equipBody .eq-opt')];
    check('E12 все заняты → «Все контуры заняты. Заменить:»', D.querySelector('#equipBody .eq-text').textContent === 'Все контуры заняты. Заменить:' && repl.length === 3);
    const before = E(w, 'JSON.stringify(data.equippedArtifacts)'); repl[1].click();
    check('E13 замена работает', E(w, 'JSON.stringify(data.equippedArtifacts)') !== before && E(w, 'data.equippedArtifacts.filter(Boolean).length') === 3); }
  { const w = await mk(5); E(w, `openInv()`);
    check('E14 до первого контура: без строки и без кнопок', !w.document.querySelector('#invContent .eq-state') && !w.document.querySelector('#invContent .eq-btn')); }
  // --- при пустом контуре всегда есть свободный артефакт ---
  { const bad = [];
    const w = await mk(10);
    for (let lvl = 10; lvl <= 80; lvl++) {
      const free = E(w, `(() => { data.level = ${lvl}; data.inventory = Object.keys(ARTEFACTS).filter(k => ARTEFACTS[k].level <= ${lvl});
        const open = openContourCount(${lvl}); data.equippedArtifacts = [null,null,null,null];
        for (let i = 0; i < open - 1; i++) data.equippedArtifacts[i] = data.inventory[i];
        return freeArtifacts().length; })()`);
      if (free < 1) bad.push(lvl);
    }
    check('E15 на уровнях 10–80 при пустом контуре свободный артефакт есть всегда', bad.length === 0, bad.join(','));
    const raw = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8');
    check('E16 текста «Все артефакты уже в снаряжении» нет', !raw.includes('Все артефакты уже в снаряжении')); }
  // --- действие каждого артефакта: размещён — есть, нет — нет ---
  { const w = await mk(80, `data.activeScroll = null; data.activeTitle = 'Целеустремлённый'; data.stats.int = 10;`);
    const exp = eq => E(w, `(() => { if (!data.titlesUnlocked.includes('Целеустремлённый')) data.titlesUnlocked.push('Целеустремлённый'); data.activeTitle = 'Целеустремлённый';
      data.equippedArtifacts = ${JSON.stringify(eq)}; return getDynamicExp(1000, 1, 'pushups'); })()`);
    const none = exp([null,null,null,null]);
    check('E17 Кристалл Прозрения: +8% опыта только в контуре', Math.abs(exp(['crystal_insight',null,null,null]) - none - 80) < 1, `${none} → ${exp(['crystal_insight',null,null,null])}`);
    check('E18 Кристалл Теней: +5% опыта только в контуре', Math.abs(exp(['crystal_shadow',null,null,null]) - none - 50) < 1);
    check('E19 Амулет Непрерывности: бонус «Целеустремлённого» ×1,5 только в контуре', Math.abs(exp(['amulet_continuity',null,null,null]) - none - 25) < 1);
    const cap = eq => E(w, `(() => { data.equippedArtifacts = ${JSON.stringify(eq)}; return getDailyLimitBreakCap(); })()`);
    check('E20 Печать Предела: +1 Преодоление только в контуре', cap(['seal_limit',null,null,null]) === cap([null,null,null,null]) + 1); }
  { const gain = async eq => { const w = await mk(40, `data.equippedArtifacts = ${JSON.stringify(eq)}; data.statPoints = 0;`);
      E(w, `data.exp = getExpToNext(data.level); checkLevelUp()`); return E(w, 'data.statPoints'); };
    const g0 = await gain([null,null,null,null]);
    check('E21 очки при повышении уровня: без артефактов 5', g0 === 5, g0);
    const g1 = await gain(['seal_growth',null,null,null]);
    check('E22 Печать Развития: +3 только в контуре', g1 === 8, g1);
    const w2 = await mk(80, `data.equippedArtifacts = ['seal_growth','sphere_growth','crystal_shadow',null]; data.statPoints = 0;`);
    E(w2, `data.exp = getExpToNext(data.level); checkLevelUp()`);
    check('E23 Печать Развития + Сфера Роста + Кристалл Теней в контурах: 5+3+4+6', E(w2, 'data.statPoints') === 18, E(w2, 'data.statPoints'));
    const w3 = await mk(80, `data.equippedArtifacts = [null,null,null,null]; data.statPoints = 0;`);
    E(w3, `data.exp = getExpToNext(data.level); checkLevelUp()`);
    check('E24 все артефакты лишь в Инвентаре — очков 5', E(w3, 'data.statPoints') === 5); }
  { const pen = async eq => { const w = await mk(40, `data.equippedArtifacts = ${JSON.stringify(eq)}; data.insurance = false; data.curseActiveToday = false; data.exp = 50000;`);
      return E(w, `computePenaltyAndApply('2026-09-01').loss`); };
    const p0 = await pen([null,null,null,null]), p1 = await pen(['amulet_will',null,null,null]);
    check('E25 Амулет Воли: штраф −15% только в контуре', p1 < p0 && Math.abs(p1 / p0 - 0.85) < 0.01, `${p0} → ${p1}`); }
  { const creds = async eq => { const w = await mk(40, `data.equippedArtifacts = ${JSON.stringify(eq)}; data.stats.agi = 10; data.creditBoostToday = 0; data.activeScroll = null; data.activeTitle = 'Новичок';
        data.completed = { steps: getDynamicTarget(10000, data.dailyTargetLevel, 'steps') - 1 }; data.credits = 0;`);
      E(w, `Math.random = () => 0.99; render()`); w.document.querySelector('.quest-item[data-id="steps"] .add').click(); return E(w, 'data.credits'); };
    const c0 = await creds([null,null,null,null]), c1 = await creds(['crystal_speed',null,null,null]), c2 = await creds(['crystal_shadow',null,null,null]);
    check('E26 Кристалл Ускорения: +10% кредитов за шаги только в контуре', Math.abs(c1 / c0 - 1.1) < 0.02, `${c0} → ${c1}`);
    check('E27 Кристалл Теней: +15% кредитов только в контуре', Math.abs(c2 / c0 - 1.15) < 0.02, `${c0} → ${c2}`); }
  { const box = async eq => { const w = await mk(80, `data.equippedArtifacts = ${JSON.stringify(eq)}; data.boxes = {}; data.isGoalMet = false; data.dailyNotices.complete = false;
        data.completed = {}; document.querySelectorAll('.quest-item').forEach(i => { data.completed[i.dataset.id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, i.dataset.id); });
        data.completed.pushups -= 1;`);
      E(w, `Math.random = () => 0; render()`); w.document.querySelector('.quest-item[data-id="pushups"] .add').click(); return E(w, "data.boxes['box_obsidian'] || 0"); };
    check('E28 Кристалл Теней: шанс шкатулки за полный день только в контуре', (await box(['crystal_shadow',null,null,null])) === 1 && (await box([null,null,null,null])) === 0); }
  // --- открытие контура: уведомление ---
  { const w = await mk(29); E(w, `window.__N = []; const _sn = showNotice; showNotice = (m) => window.__N.push(m); data.exp = getExpToNext(data.level); checkLevelUp()`);
    await sleep(4700);
    const n = JSON.parse(E(w, 'JSON.stringify(window.__N)'));
    check('E29 на 30-м уровне — «Открыт новый контур снаряжения.»', n.includes('Открыт новый контур снаряжения.'), n.join(' | '));
    const w2 = await mk(30); E(w2, `window.__N = []; const _sn = showNotice; showNotice = (m) => window.__N.push(m); data.exp = getExpToNext(data.level); checkLevelUp()`);
    await sleep(4700);
    check('E30 на 31-м — уведомления о контуре нет', !JSON.parse(E(w2, 'JSON.stringify(window.__N)')).includes('Открыт новый контур снаряжения.')); }
  // --- Кодекс, старое сохранение, бэкап, отсутствие уровней в текстах ---
  { const w = await mk(1);
    check('E31 глава «Снаряжение» доступна с начала игры', E(w, `data.codexUnlocked.includes('equipment') && CODEX_CHAPTERS.equipment.title === 'Снаряжение'`));
    const legacy = JSON.parse(SEED); legacy.level = 55; legacy.inventory = ['crystal_speed','amulet_will','seal_growth','seal_limit','sphere_growth']; delete legacy.equippedArtifacts;
    legacy.codexUnlocked = ['daily_quota']; const saved = SEED; SEED = JSON.stringify(legacy); const w2 = boot(); SEED = saved; await sleep(250);
    check('E32 старое сохранение: контуры пустые, артефакты не действуют, глава открыта',
      E(w2, `JSON.stringify(data.equippedArtifacts)`) === '[null,null,null,null]' && !E(w2, `isArtifactEquipped('amulet_will')`) && E(w2, `data.codexUnlocked.includes('equipment')`));
    const clean = JSON.parse(E(w, `JSON.stringify(sanitizeImportedData({ state: Object.assign(JSON.parse(${JSON.stringify(SEED)}), { level: 35, inventory: ['crystal_speed','amulet_will','seal_growth'], equippedArtifacts: ['crystal_shadow','amulet_will','amulet_will','seal_growth'] }), total: {} }))`));
    check('E33 бэкап: чужие, повторные и неоткрытые записи отбрасываются', JSON.stringify(clean.state.equippedArtifacts) === '[null,"amulet_will",null,null]', JSON.stringify(clean.state.equippedArtifacts));
    const texts = E(w, `CODEX_CHAPTERS.equipment.content`) + ' ' + 'Открыт новый контур снаряжения.';
    check('E34 в текстах снаряжения нет уровней и цифр', !/\d/.test(texts));
    const descs = JSON.parse(E(w, `JSON.stringify(Object.values(ARTEFACTS).map(a => a.desc))`));
    check('E35 описания артефактов: «При размещении в контуре снаряжения:», без «Постоянный эффект»', descs.every(d => d.startsWith('При размещении в контуре снаряжения: ')) && !descs.some(d => d.includes('Постоянный эффект')));
    check('E36 главы Сферы Роста и Амулета Непрерывности обновлены',
      E(w, `CODEX_CHAPTERS.artifact_sphere_growth.content`).includes('если оба артефакта размещены в контурах снаряжения') && E(w, `CODEX_CHAPTERS.artifact_amulet_continuity.content`).includes('пока амулет размещён в контуре снаряжения и активен титул')); }
}

// ===== v6.6.12: бегущий разряд по работающим рунам =====
async function runeBoltTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = `data.insurance=false; data.insuranceSourceId=null; data.streakShield=false; data.streakShieldSourceId=null; data.activeScroll=null; data.pendingScroll=null;
    data.curseActiveToday=false; data.pendingCurse=false; data.targetDiscountToday=false; data.targetDiscountSourceId=null; data.expBoostToday=0; data.expBoostSourceId=null; data.creditBoostToday=0;`;
  const bolts = () => [...D.querySelectorAll('#effectsRow .rune-bolt')];
  const iconsWithBolt = () => bolts().map(b => b.parentElement.querySelector('img').getAttribute('src').replace('icons/items/', '').replace('.png', ''));
  // работающие руны — есть разряд; кристалл — нет
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; data.streakShield=true; data.streakShieldSourceId='rune_stability';
    data.targetDiscountToday=true; data.targetDiscountRate=0.1; data.targetDiscountSourceId='rune_freedom'; data.expBoostToday=0.55; data.expBoostSourceId='crystal_clarity'; render()`);
  const on = iconsWithBolt().sort().join(',');
  check('RB1 разряд у работающих рун (Защиты, Стабильности, Освобождения), у Кристалла Ясности — нет', on === 'rune_freedom,rune_protection,rune_stability', on);
  check('RB2 цвет: у обычных рун голубой (не отмечены как Абсолютная)', bolts().every(b => b.dataset.abs !== '1'));
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection_absolute'; data.streakShield=true; data.streakShieldSourceId='rune_protection_absolute'; render()`);
  const ab = bolts().find(b => b.parentElement.querySelector('img').src.includes('rune_protection_absolute'));
  check('RB3 у Абсолютной — отмечена для золотого разряда', !!ab && ab.dataset.abs === '1');
  // «спящая», «подавленная», ожидающие — без разряда
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; data.activeScroll='contract'; data.pendingCurse=true; render()`);
  check('RB4 «спящая» руна и ожидающее Бремя — без разряда', bolts().length === 0, iconsWithBolt().join(','));
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; data.curseActiveToday=true; render()`);
  check('RB5 «подавленная» руна — без разряда', bolts().length === 0, iconsWithBolt().join(','));
  // пробег
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; render()`);
  const svg = bolts()[0];
  E(w, `runRuneBolt(document.querySelector('#effectsRow .rune-bolt'))`);
  await sleep(150); const p1 = svg.querySelector('path') && svg.querySelector('path').getAttribute('d');
  await sleep(300); const p2 = svg.querySelector('path') && svg.querySelector('path').getAttribute('d');
  check('RB6 разряд появляется и движется', !!p1 && !!p2 && p1 !== p2);
  check('RB7 цвет голубой с белой сердцевиной', svg.querySelectorAll('path')[0].getAttribute('stroke') === '#40c0ff' && svg.querySelectorAll('path')[1].getAttribute('stroke') === '#ffffff');
  await sleep(700);
  check('RB8 через 0,9 с разряд исчезает', !svg.querySelector('path') && E(w, 'RUNE_BOLT_DURATION') === 900);
  check('RB9 видимость ограничена кругом иконки', !!svg.querySelector('clipPath circle') && svg.querySelector('g').getAttribute('clip-path').startsWith('url(#runeBoltClip'));
  const dirs = new Set(JSON.parse(E(w, `JSON.stringify(Array.from({length: 400}, () => Math.round(pickRuneBoltDirection() / (Math.PI / 4) * 1000) / 1000))`)));
  check('RB10 направления — только 8 допустимых', [...dirs].every(x => Number.isInteger(x) && x >= 0 && x <= 7) && dirs.size === 8, [...dirs].join(','));
  // интервал 8–15 с, независимый у каждой руны
  E(w, `window.__d = []; window.__cb = []; window.__st = setTimeout; setTimeout = (f, ms) => { window.__d.push(ms); window.__cb.push(f); return 0; };
        for (let i = 0; i < 60; i++) scheduleRuneBolt(document.querySelector('#effectsRow .rune-bolt')); setTimeout = window.__st;`);
  const delays = JSON.parse(E(w, 'JSON.stringify(window.__d)'));
  check('RB11 интервал каждой руны случайный в пределах 8–15 с', delays.length === 60 && delays.every(x => x >= 8000 && x <= 15000) && new Set(delays.map(Math.round)).size > 30, `${Math.min(...delays)}–${Math.max(...delays)}`);
  // свёрнутое приложение — пробег не запускается, но планируется следующий
  Object.defineProperty(D, 'hidden', { configurable: true, get: () => true });
  E(w, `window.__d = []; setTimeout = (f, ms) => { window.__d.push(ms); return 0; }; window.__cb[0](); setTimeout = window.__st;`);
  await sleep(120);
  check('RB12 пока приложение свёрнуто, пробег не запускается (следующий запланирован)', !svg.querySelector('path') && JSON.parse(E(w, 'JSON.stringify(window.__d)')).length === 1);
  Object.defineProperty(D, 'hidden', { configurable: true, get: () => false });
  // смена эффектов — старые таймеры сняты
  E(w, `clearRuneBolts()`);
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; data.streakShield=true; data.streakShieldSourceId='rune_stability'; render()`);
  const n1 = E(w, 'runeBoltTimers.length');
  E(w, base + `data.insurance=true; data.insuranceSourceId='rune_protection'; render()`);
  const n2 = E(w, 'runeBoltTimers.length');
  check('RB13 при смене эффектов старые таймеры снимаются, лишних не остаётся', n1 === 2 && n2 === 1, `${n1} → ${n2}`);
  E(w, base + `render()`);
  check('RB14 нет эффектов — нет таймеров', E(w, 'runeBoltTimers.length') === 0);
}

// ===== v6.6.10: значок кредитов вместо «◈» =====
async function creditIconTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, $ = id => D.getElementById(id), cs = el => w.getComputedStyle(el);
  const noDiamond = el => !el.textContent.includes('◈');
  const hasIcon = el => { const i = el.querySelector('.cr-ic'); return !!i && i.querySelector('use').getAttribute('href') === '#credSeal' && i.getAttribute('aria-label') === 'кредитов'; };
  check('W0 образец значка в разметке один', D.querySelectorAll('symbol#credSeal').length === 1);
  E(w, `data.credits = 8420; render(); updateStatusUI(); openShop()`);
  const places = { 'карточка': $('hdrCredits'), 'СТАТУС': $('stCredits'), 'баланс Магазина': $('shopBalance'), 'цена в Магазине': D.querySelector('#shopOverlay .item-price') };
  const bad = Object.entries(places).filter(([k, el]) => !el || !noDiamond(el) || !hasIcon(el)).map(([k]) => k);
  check('W1 карточка, «СТАТУС», баланс и цены: значок вместо «◈»', bad.length === 0, bad.join(', '));
  // всплывающее уведомление и журнал
  const waitPopup = async needle => { for (let i = 0; i < 80; i++) { const el = [...D.querySelectorAll('.system-popup-body')].find(b => b.textContent.includes(needle)); if (el) return el; await new Promise(r => setTimeout(r, 250)); } return null; };
  // проверяется вывод уведомления (не очередь) — вызываем показ напрямую
  E(w, `displayNotificationNow({ body: 'Договор исполнен: +10 EXP и +250 ◈.', tone: 'info', skipLog: true })`);
  const pop = await waitPopup('+250');
  check('W2 всплывающее уведомление: значок вместо «◈»', !!pop && noDiamond(pop) && hasIcon(pop) && pop.textContent.includes('+250'), pop && pop.innerHTML);
  // экранирование сохраняется
  E(w, `displayNotificationNow({ body: '<b id="evil">x</b> +5 ◈', tone: 'info', skipLog: true })`);
  const last = await waitPopup('evil');
  check('W3 экранирование прежнее: разметка из текста не исполняется, значок на месте', !D.getElementById('evil') && !!last && last.textContent.includes('<b id="evil">x</b>') && hasIcon(last), last && last.innerHTML);
  // журнал уведомлений, в т.ч. «старая» запись со «◈»
  E(w, `data.notificationLog.unshift({ time: '09:00', text: 'Старая запись: +120 ◈' }); backupModalStep = 'notifications'; renderBackupModal()`);
  const rows = [...D.querySelectorAll('.notif-log-text')];
  const old = rows.find(r => r.textContent.includes('Старая запись'));
  check('W4 журнал: старая запись со «◈» показана со значком', !!old && noDiamond(old) && hasIcon(old));
  check('W5 журнал: нигде нет видимого «◈»', rows.every(noDiamond));
  // COMPLETE
  E(w, `data.completed = { squats: getDynamicTarget(120, data.dailyTargetLevel, 'squats') - 1 }; render()`);
  D.querySelector('.quest-item[data-id="squats"] .add').click();
  const cp = D.querySelector('.quest-item[data-id="squats"] .complete-popup');
  check('W6 «COMPLETE»: значок вместо «◈»', !!cp && noDiamond(cp) && hasIcon(cp));
  // отблеск только на карточке и в «СТАТУСЕ»
  const gl = sel => cs(D.querySelector(sel + ' .cr-ic .gl')).display;
  check('W7 отблеск на карточке и в «СТАТУСЕ», в Магазине и уведомлениях — нет',
    gl('#hdrCredits') === 'block' && gl('#stCredits') === 'block' && gl('#shopBalance') === 'none' && gl('#shopOverlay .item-price') === 'none');
  const probe = D.createElement('div'); probe.className = 'system-popup-body'; probe.innerHTML = E(w, `creditsHtml('+1 ◈')`); D.body.appendChild(probe);
  check('W7a в уведомлениях значок неподвижен', cs(probe.querySelector('.cr-ic .gl')).display === 'none');
  const ic = cs(D.querySelector('#hdrCredits .cr-ic'));
  check('W8 размер значка 12px, стоит после числа', ic.width === '12px' && ic.height === '12px' && D.querySelector('#hdrCredits').lastElementChild.classList.contains('cr-ic'));
}

// ===== v6.6.9: плашки «Кредиты» и «Серия дней» — подпись над числом =====
async function chipsTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, cs = el => w.getComputedStyle(el);
  const bad = [];
  for (const sel of ['#rankInfoBtn .sc-chip.cr', '#rankInfoBtn .sc-chip.st', '#statusOverlay .sc-chip.cr', '#statusOverlay .sc-chip.st']) {
    const ch = D.querySelector(sel), k = ch.querySelector('.k'), n = ch.querySelector('.n');
    if (cs(ch).flexDirection !== 'column' || cs(k).alignSelf !== 'flex-start' || cs(n).alignSelf !== 'flex-end' || cs(ch).flexGrow !== '1') bad.push(sel);
  }
  check('P1 плашки одинаковые, подпись сверху слева, число снизу справа — на карточке и в «СТАТУСЕ»', bad.length === 0, bad.join(', '));
  check('P2 подпись мельче числа', D.querySelector('#rankInfoBtn .sc-chip .k') && cs(D.querySelector('#rankInfoBtn .sc-chip .k')).fontSize === '0.72rem');
  E(w, `data.credits = 123456789; data.consecutiveDays = 1234; render(); updateStatusUI()`);
  check('P3 большие значения выводятся целиком', D.getElementById('hdrCredits').textContent.trim() === '123456789' && !!D.querySelector('#hdrCredits .cr-ic') && D.getElementById('stStreak').textContent === '1234');
}

// ===== v6.6.8: активация Преодоления предела без перезагрузки страницы =====
async function limitActivateTests() {
  const raw = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8');
  const hStart = raw.indexOf("document.getElementById('limitBreakBtn').onclick");
  const handler = raw.slice(hStart, raw.indexOf('\n  };', hStart) + 5).split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  check('L0 в обработчике активации Предела нет перезагрузки страницы', handler.length > 0 && !/location\.reload\(/.test(handler) && /saveData\(\); render\(\);/.test(handler));
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, $ = id => D.getElementById(id);
  E(w, `data.level = 20; data.dailyTargetLevel = 20; data.isGoalMet = false; data.limitBreakRoundPending = false; data.limitBreaksToday = 0; data.activeScroll = null; data.curseActiveToday = false;
        data.completed = {}; document.querySelectorAll('.quest-item').forEach(i => { data.completed[i.dataset.id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, i.dataset.id); });
        data.dailyNotices.complete = true; render(); window.__marker = 'тот же документ'`);
  check('L1 кнопка Предела доступна после выполнения задания', !$('limitBreakBtn').disabled);
  const counterEl = $('pushups');
  $('limitBreakBtn').click();
  D.querySelector('#confirmContent .confirm-btn-continue').click();
  check('L2 страница не перезагружалась (тот же документ и те же элементы)', E(w, 'window.__marker') === 'тот же документ' && $('pushups') === counterEl);
  check('L3 состояние: Предел начат, раунд идёт, счётчик Преодолений +1', E(w, 'data.isGoalMet && data.limitBreakRoundPending && data.limitBreaksToday === 1'));
  check('L4 счётчики упражнений обнулены на экране', [...D.querySelectorAll('.quest-item .counter')].every(c => c.textContent === '0'));
  const tintBad = [...D.querySelectorAll('.quest-item')].filter(q => !q.querySelector('.counter').classList.contains('limit-break') || !q.querySelector('.qbar-fill').classList.contains('limit-break'));
  check('L5 цифры и полоски голубые', tintBad.length === 0, tintBad.length);
  check('L6 блок Предела: «Завершите текущий раунд…»', $('limitStatus').textContent === 'Завершите текущий раунд Преодоления предела' && $('limitBreakBtn').disabled, $('limitStatus').textContent);
  const saved = JSON.parse(w.localStorage.getItem('sl_daily_v5_5_0'));
  check('L7 данные сохранены', saved.isGoalMet === true && saved.limitBreakRoundPending === true && saved.limitBreaksToday === 1);
  E(w, `document.querySelectorAll('.quest-item').forEach(i => { data.completed[i.dataset.id] = getDynamicTarget(parseInt(i.dataset.target), data.dailyTargetLevel, i.dataset.id) - 1; }); render()`);
  D.querySelectorAll('.quest-item').forEach(i => i.querySelector('.add').click());
  check('L8 закрытие раунда Предела работает как обычно', E(w, '!data.limitBreakRoundPending && data.isGoalMet'), E(w, 'JSON.stringify({p:data.limitBreakRoundPending,g:data.isGoalMet})'));
}

// ===== v6.6.7: надпись «COMPLETE» =====
async function completeTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document;
  E(w, `data.completed = { pushups: getDynamicTarget(100, data.dailyTargetLevel, 'pushups') - 1 }; render()`);
  D.querySelector('.quest-item[data-id="pushups"] .add').click();
  const p = D.querySelector('.quest-item[data-id="pushups"] .complete-popup');
  check('K1 надпись появляется при закрытии упражнения', !!p && /^COMPLETE\+\d+ EXP \+\d+/.test(p.textContent.replace(/\s+/g, ' ').replace('COMPLETE ', 'COMPLETE')) && !!p.querySelector('.cr-ic'), p && p.textContent);
  const cs = w.getComputedStyle(p);
  check('K2 Orbitron жирный 1,6rem', /^["']?Orbitron/.test(cs.fontFamily) && cs.fontSize === '1.6rem' && cs.fontWeight === '700', `${cs.fontFamily} ${cs.fontSize} ${cs.fontWeight}`);
  check('K3 без переноса строк (опыт, кредиты, BONUS — одной строкой)', cs.whiteSpace === 'nowrap');
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const kf = (css.match(/@keyframes completeText \{([^\n]*)\}/) || [])[1] || '';
  check('K4 центрирующий сдвиг в каждом кадре анимации', (kf.match(/translate\(-50%,-50%\)/g) || []).length === 3, kf);
  check('K5 длительность прежняя (1,8 с)', /\.complete-popup \{[^}]*animation:completeText 1\.8s forwards/.test(css));
  await new Promise(r => setTimeout(r, 1900));
  check('K6 надпись исчезает через 1,8 с', !D.querySelector('.quest-item[data-id="pushups"] .complete-popup'));
}

// ===== v6.6.6: запуск «Г+Д+З», полоса таймера, шрифты карточек упражнений =====
async function bootTests() {
  const raw = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8');
  check('B1 состояние загрузки заложено в разметке (<html class="booting">)', /<html lang="ru" class="booting">/.test(raw));
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, $ = id => D.getElementById(id);
  check('B2 после первой отрисовки состояние загрузки снято', !D.documentElement.classList.contains('booting'));
  const css = [...D.querySelectorAll('style')].map(s => s.textContent).join('\n');
  check('B3 при загрузке скрыты значения карточки и упражнений, со страховкой через 5 с',
    /\.booting #hdrName,[^{]*\.booting \.quest-item \.counter, \.booting \.quest-item \.target, \.booting \.quest-item \.qbar-fill, \.booting \.quest-item \.reward \{\s*opacity: 0; animation: bootFailsafeShow 0s 5s forwards; \}/.test(css));
  check('B4 «Идентификация…» и «Синхронизация…» появляются через 0,25 с',
    /\.booting \.sc-idq \{[^}]*animation: bootAppear 0s 0\.25s forwards/.test(css) && /\.booting \.cap-id \{[^}]*bootAppear 0s 0\.25s/.test(css) && /\.booting \.boot-sync \{[^}]*bootAppear 0s 0\.25s/.test(css)
    && D.querySelector('.boot-sync').textContent === 'Синхронизация…' && D.querySelector('.cap-id').textContent === 'Идентификация…');
  check('B5 эмблема при загрузке серая, уровень скрыт со страховкой', /\.booting #hdrTop \{ --rk: #4a5b6e; \}/.test(css) && /\.booting #hdrLevel \{ visibility: hidden; animation: bootFailsafeVisible 0s 5s forwards; \}/.test(css));
  check('B6 вне загрузки служебные надписи скрыты', w.getComputedStyle(D.querySelector('.sc-idq')).display === 'none' && w.getComputedStyle(D.querySelector('.boot-sync')).display === 'none');
  // «З»: отсчёт уровня и печать имени
  E(w, `data.level = 26; data.playerName = 'Святослав'; render()`);
  check('B7 обычная отрисовка не запускает анимацию', $('hdrLevel').textContent === '26' && $('hdrName').textContent === 'Святослав');
  E(w, `playBootIntro()`);
  await new Promise(r => setTimeout(r, 120));
  const midLv = +$('hdrLevel').textContent, midNm = $('hdrName').textContent;
  check('B8 во время анимации уровень набегает, имя печатается', midLv >= 1 && midLv < 26 && midNm.length < 'Святослав'.length && 'Святослав'.startsWith(midNm), `${midLv} / «${midNm}»`);
  await new Promise(r => setTimeout(r, 900));
  check('B9 анимация заканчивается настоящими уровнем и именем', $('hdrLevel').textContent === '26' && $('hdrLevel').className === 'd2' && $('hdrName').textContent === 'Святослав');
  E(w, `playBootIntro()`); await new Promise(r => setTimeout(r, 60));
  E(w, `data.level = 31`); await new Promise(r => setTimeout(r, 120));
  check('B10 при изменении данных анимация прекращается и ставятся настоящие значения', $('hdrLevel').textContent === '31' && $('hdrName').textContent === 'Святослав', $('hdrLevel').textContent);
  // полоса таймера
  check('B11 место под время фиксированной высоты', w.getComputedStyle(D.querySelector('.tbox')).minHeight === '1.8rem');
  check('B12 полоса: минимальная высота под две строки (может расти)', /\.tstrip \{ min-height: calc\(0\.86rem \* 1\.25 \* 2 \+ 24px \+ 2px\); \}/.test(css) && !/\.tstrip \{[^}]*[^-]height: \d/.test(css.replace(/min-height/g, 'min_h')));
  check('B13 страховка узких экранов: перенос длинного слова', /\.tstrip \.reset-label \{ overflow-wrap: break-word; hyphens: auto; \}/.test(css));
  // шрифты
  const fam = sel => w.getComputedStyle(D.querySelector(sel)).fontFamily;
  const ORB = ['.quest-name', '.counter', '.target', '.reward', '.buttons button', '.sc-exp .n', '.sc-chip .n'];
  const badO = ORB.filter(sel => !/^["']?Orbitron/.test(fam(sel)));
  check('B14 названия упражнений и игровые числа — Orbitron', badO.length === 0, badO.map(x => x + '=' + fam(x)).join(', '));
  check('B15 названия упражнений: Orbitron + Exo 2 (кириллица)', /Orbitron["']?, ["']Exo 2["']/.test(fam('.quest-name')), fam('.quest-name'));
  const MONO = ['.notif-log-time'].concat(D.querySelector('#appVersionTag') ? ['#appVersionTag'] : []);
  const probe = D.createElement('span'); probe.className = 'notif-log-time'; D.body.appendChild(probe);
  const badM = MONO.filter(sel => !/Roboto Mono/.test(fam(sel)));
  check('B16 служебные числа (время в журнале, версия) — Roboto Mono', badM.length === 0, badM.join(','));
}

// ===== v6.6.5: окно имени (вариант Б), отступ под линией заголовка 10px =====
async function nameAndSpacingTests() {
  const w = boot(); await new Promise(r => setTimeout(r, 300));
  const D = w.document, $ = id => D.getElementById(id);
  const field = $('playerNameInput'), btn = $('nameConfirmBtn');
  const type = v => { field.value = v; field.dispatchEvent(new w.Event('input', { bubbles: true })); };
  E(w, `data.playerName=''; openNameModal()`);
  type('');
  check('N1 пустое поле — «Подтвердить» неактивна', btn.disabled);
  type('    ');
  check('N2 одни пробелы — неактивна', btn.disabled);
  type('<>"\'`');
  check('N3 одни запрещённые символы — неактивна', btn.disabled);
  type('Сон');
  check('N4 нормальное имя — активна', !btn.disabled);
  check('N5 подсказка под полем', D.querySelector('#nameOverlay .name-hint').textContent === 'Имя можно задать позже в Архиве.');
  E(w, `window.__fi = 0; finishInit = () => { window.__fi++; }`);
  type('   ');
  field.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  check('N6 Enter при неактивной кнопке ничего не делает', E(w, 'data.playerName') === '' && $('nameOverlay').style.display === 'flex');
  E(w, `submitPlayerName()`);
  check('N7 пустое имя подтвердить нельзя и программно', E(w, 'data.playerName') === '' && $('nameOverlay').style.display === 'flex');
  type('  Сон Джин-Ву  ');
  field.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  check('N8 Enter при активной кнопке сохраняет имя (без пробелов по краям)', E(w, 'data.playerName') === 'Сон Джин-Ву' && $('nameOverlay').style.display === 'none', E(w, 'data.playerName'));
  E(w, `data.playerName=''; openNameModal()`); type('Кто-то'); D.querySelector('#nameOverlay .danger-btn-cancel').click();
  check('N9 «Пропустить» — имя остаётся «Игрок», введённое не сохраняется', E(w, 'data.playerName') === '' && $('hdrName').textContent === 'Игрок');
  // --- отступы ---
  const cs = el => w.getComputedStyle(el), px = v => parseFloat(v) || 0;
  const headerMb = px(cs(D.querySelector('.status-header')).marginBottom);
  check('S1 отступ под линией заголовка — 10px', headerMb === 10, headerMb);
  const bal = D.querySelector('#shopOverlay .shop-balance');
  const toLine = px(cs(D.querySelector('#shopOverlay .status-header')).marginBottom) + px(cs(bal).marginTop);
  const toBody = px(cs(bal).marginBottom) + px(cs(D.querySelector('#shopOverlay .status-body')).marginTop);
  check('S2 Магазин: баланс в 8px от линии, до прокрутки 10px', toLine === 8 && toBody === 10, `${toLine} / ${toBody}`);
  const sb = cs(D.querySelector('#statusOverlay .status-body'));
  check('S3 «СТАТУС»: запас под свечение прежний (14px)', sb.paddingTop === '14px' && sb.paddingLeft === '14px');
  const all = [...D.querySelectorAll('.status-window')].filter(win => win.querySelector('.status-header') && win.querySelector('.status-body') && !win.querySelector('.shop-balance'));
  const bad = all.filter(win => px(cs(win.querySelector('.status-header')).marginBottom) + px(cs(win.querySelector('.status-body')).marginTop) !== 10).map(win => win.closest('.status-overlay').id);
  check('S4 во всех окнах от линии до прокрутки 10px', bad.length === 0 && all.length >= 8, bad.join(',') + ' / окон: ' + all.length);
}

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
  check('H7 кредиты целым числом со значком (без разделителя), «Серия дней» числом', $('hdrCredits').textContent.trim() === '8420' && !!$('hdrCredits').querySelector('.cr-ic') && $('hdrStreak').textContent === '12'
    && $('hdrStreak').previousElementSibling.textContent === 'Серия дней' && $('stStreak').previousElementSibling.textContent === 'Серия дней', $('hdrCredits').textContent + ' | ' + $('hdrStreak').textContent);
  const act = E(w, 'data.activeTitle'), hasIcon = E(w, `!!TITLE_ICON_IDS[data.activeTitle]`);
  check('H8 титул активный, иконка — если она есть у титула', $('hdrTitle').querySelector('span').textContent === act && !!$('hdrTitle').querySelector('img') === hasIcon, $('hdrTitle').innerHTML);
  E(w, `data.exp=0; data.expDebt=300; render()`);
  check('H9 долг: строка, красная шкала, строка долга', $('hdrExpRow').classList.contains('debt') && $('hdrExp').textContent === 'Долг −300 EXP' && $('hdrBar').classList.contains('debt')
    && $('hdrDebt').style.display === 'block' && $('hdrDebtVal').textContent === '300', $('hdrExp').textContent);
  E(w, `data.expDebt=0; render()`);
  check('H10 без долга строка долга скрыта', $('hdrDebt').style.display === 'none');
  E(w, `data.credits=1234567; data.exp=118400; render()`);
  check('H10a большие числа — без разделителя, как во всём приложении', $('hdrCredits').textContent.trim() === '1234567' && $('hdrExp').textContent.startsWith('118400 / ')
    && !/[\u00a0\u202f ]\d{3}\b/.test($('hdrCredits').textContent.trim()), $('hdrCredits').textContent + ' | ' + $('hdrExp').textContent);
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
  const badF = textEls.filter(s => !fam(s).includes('Exo 2 Text')).concat(numEls.filter(s => !/^["']?Orbitron/.test(fam(s))));
  check('H28 шрифты: текст — Exo 2 Text, игровые числа — Orbitron (с v6.6.6)', badF.length === 0, badF.join(', '));
  const cs = w.getComputedStyle(D.querySelector('#statusOverlay .status-body'));
  check('H29a «СТАТУС»: запас под свечение — 14px сверху и по бокам, снизу 0', cs.paddingTop === '14px' && cs.paddingLeft === '14px' && cs.paddingRight === '14px' && cs.paddingBottom === '0px', cs.padding);
  check('H29b «СТАТУС»: ширина содержимого прежняя (отступ компенсирован по горизонтали)', cs.marginLeft === '-14px' && cs.marginRight === '-14px');
  // края прокрутки: у всех окон одинаковые — (отступ под заголовком + верх области) и (низ области + отступ кнопки)
  const edges = id => {
    const win = D.getElementById(id), body = win.querySelector('.status-body'), hdr = win.querySelector('.status-header'), btn = win.querySelector('.close-status');
    const px = v => parseFloat(v) || 0, bs = w.getComputedStyle(body);
    return [px(w.getComputedStyle(hdr).marginBottom) + px(bs.marginTop), px(bs.marginBottom) + px(w.getComputedStyle(btn).marginTop)].join('/');
  };
  const E_ = ['statusOverlay', 'codexOverlay', 'shopOverlay', 'invOverlay'].map(id => id + '=' + edges(id));
  check('H29c края прокрутки «СТАТУСА» как у Кодекса, Инвентаря (10 под линией / 15 над кнопкой)', ['statusOverlay','codexOverlay','invOverlay'].every(id => E_.includes(id + '=10/15')), E_.join(', '));
  const other = ['codexOverlay', 'shopOverlay', 'invOverlay'].map(id => w.getComputedStyle(D.querySelector('#' + id + ' .status-body')));
  check('H29d другие окна не изменились', other.every(o => o.paddingTop === '0px' && o.marginLeft === '0px' && o.marginTop === '0px'), other.map(o => o.padding + '|' + o.margin).join(', '));
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
  await nameAndSpacingTests();
  await bootTests();
  await completeTests();
  await limitActivateTests();
  await chipsTests();
  await creditIconTests();
  await runeBoltTests();
  await equipmentTests();
  await artifactPreviewTests();
  await boxOddsTests();
  await creditsFloorTests();
  await paceTests();
  await paceSectionTests();
  await effectsPanelTests();
  await renunciationTests();
  console.log(results.join('\n'));
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\nИтого: ${results.length - failed} OK, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})();
