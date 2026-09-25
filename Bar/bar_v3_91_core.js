'use strict';

/* Bar Game 3.91 core.
   Important design rule: this file does NOT interpret free player language.
   No keyword/regex classification of player utterances is used for chat,
   ordering, recipe answers, help, repeats, serving size or amounts.
   Free-language understanding is delegated to the AI layer. The local core
   owns only recipe truth, scoring, progression, buttons and physical actions. */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens=$$('.screen');
const show=id=>screens.forEach(s=>s.classList.toggle('active',s.id===id));

const state={
  name:'',age:18,under18:false,difficulty:'easy',mood:'tropical',bar:'tropical',
  phase:'start',drink:null,step:0,correct:0,wrong:0,points:0,startedAt:0,
  serving:null,questionFails:0,amountFails:0,sensorOK:false,action:null,
  afterAction:null,shakeProgress:0,muddleProgress:0,drinkProgress:0,lastMotion:0,
  lastMuddle:0,baselineBeta:null,baselineGamma:null,waitingPortrait:false,
  waitingLandscape:false,returning:false,idleTimer:null,lastRecipeQuestion:'',
  lastPhrase:'',aiCorrectParts:[],idleTurnsV388:0,activityEpochV388:0
};

const drinkMenuCatalog=[
{id:'maiTai',name:'Mai Tai',minAge:18,buildable:false},
{id:'pinaColada',name:'Piña Colada',minAge:18,buildable:false},
{id:'jungleBird',name:'Jungle Bird',minAge:18,buildable:false},
{id:'ibaTiki',name:'IBA Tiki',minAge:18,buildable:false},
{id:'mojito',name:'Mojito',minAge:18,buildable:true}
];
const buildableDrinkIds=new Set(drinkMenuCatalog.filter(d=>d.buildable).map(d=>d.id));

const drinks=[
{id:'mojito',name:'Mojito',minAge:18,alcoholic:true,steps:[
{q:'Vilket glas ska användas?',a:'Highballglas',opts:['Highballglas','Martiniglas','Shotglas']},
{q:'Vilken ört ska läggas i glaset?',a:'Mynta',opts:['Mynta','Basilika','Rosmarin']},
{q:'Vad ska läggas till?',a:'Socker och limejuice',opts:['Socker och limejuice','Salt och citronjuice','Socker och apelsinjuice'],directChoices:true},
{q:'Vad gör vi nu?',a:'Blanda',opts:['Blanda','Skaka','Sila'],afterAi:{fact:'Bartendern häller själv i en liten skvätt sodavatten.',nextIntent:'Bekräfta kort att sodavattnet hälls i. Ställ inte nästa receptfråga i samma replik.'}},
{q:'Vad ska läggas i glaset innan rommen?',a:'Is',opts:['Is','Salt','Mer socker']},
{q:'Vilken sprit ska jag hälla i?',a:'Vit kubansk rom',opts:['Vit kubansk rom','Gin','Tequila'],amount:{base:4.5,unit:'cl',label:'vit kubansk rom'}},
{q:'Vad ska vi toppa med?',a:'Sodavatten',opts:['Sodavatten','Cola','Tonic']},
{q:'Vad gör vi nu?',a:'Rör om lätt',opts:['Rör om lätt','Skaka','Sila']},
{q:'Vad ska vi garnera med? Ledtråd: det är två saker.',a:'Mynta och lime',opts:['Mynta och lime','Citron och basilika','Apelsin och rosmarin']}
]},
{id:'margarita',name:'Margarita',minAge:18,alcoholic:true,steps:[
{q:'Vilken bassprit börjar vi med?',a:'Tequila',opts:['Tequila','Vodka','Whisky'],amount:{base:4,unit:'cl',label:'tequila'}},
{q:'Vilken citrus ska i?',a:'Lime',opts:['Lime','Citron','Grapefrukt'],amount:{base:2,unit:'cl',label:'limejuice'}},
{q:'Vilken apelsinlikör används ofta?',a:'Triple sec',opts:['Triple sec','Amaretto','Kahlúa'],amount:{base:2,unit:'cl',label:'triple sec'}},
{q:'Vad gör vi med glaskanten?',a:'Saltkant',opts:['Saltkant','Sockerkant','Ingen kant']},
{q:'Nu ska den kylas ordentligt.',a:'Skaka',opts:['Skaka','Värm','Rör med sugrör'],action:'shake'},
{q:'Vilket glas är rätt?',a:'Margaritaglas',opts:['Margaritaglas','Ölsejdel','Shotglas']},
{q:'Vilken garnish passar?',a:'Limeklyfta',opts:['Limeklyfta','Oliv','Myntabukett']}]},
{id:'manhattan',name:'Manhattan',minAge:18,alcoholic:true,steps:[
{q:'Vilken bassprit är grunden?',a:'Whisky',opts:['Whisky','Rom','Gin'],amount:{base:4,unit:'cl',label:'whisky'}},
{q:'Vilken förstärkt vin-ingrediens används?',a:'Söt vermouth',opts:['Söt vermouth','Torr cider','Porter'],amount:{base:2,unit:'cl',label:'söt vermouth'}},
{q:'Vilken bitter används ofta?',a:'Angostura bitters',opts:['Angostura bitters','Tonic','Grenadin'],amount:{base:2,unit:'stänk',label:'Angostura bitters'}},
{q:'Hur blandar vi en klassisk Manhattan?',a:'Rör med is',opts:['Rör med is','Skaka hårt','Mixa']},
{q:'Vilket glas serveras den i?',a:'Cocktailglas',opts:['Cocktailglas','Highballglas','Ölglas']},
{q:'Vilken garnish passar?',a:'Cocktailkörsbär',opts:['Cocktailkörsbär','Selleri','Gurka']}]},
{id:'virgin_mojito',name:'Virgin Mojito',minAge:0,alcoholic:false,steps:[
{q:'Vilken citrus börjar vi med?',a:'Lime',opts:['Lime','Citron','Apelsin'],amount:{base:2,unit:'cl',label:'limejuice'}},
{q:'Vilken ört använder vi?',a:'Mynta',opts:['Mynta','Timjan','Dill'],amount:{base:8,unit:'blad',label:'mynta'}},
{q:'Vad använder vi för sötma?',a:'Sockerlag',opts:['Sockerlag','Saltlag','Kaffe'],amount:{base:2,unit:'cl',label:'sockerlag'}},
{q:'Hur behandlar vi lime och mynta?',a:'Muddla försiktigt',opts:['Muddla försiktigt','Koka','Mosa till puré'],action:'muddle'},
{q:'Nu ska den kylas och blandas.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},
{q:'Vad toppar vi med?',a:'Sodavatten',opts:['Sodavatten','Mjölk','Tomatjuice'],amount:{base:8,unit:'cl',label:'sodavatten'}},
{q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Champagneflöjt']}]},
{id:'shirley',name:'Shirley Temple',minAge:0,alcoholic:false,steps:[
{q:'Vilken bas använder vi?',a:'Ginger ale',opts:['Ginger ale','Espresso','Tonic'],amount:{base:12,unit:'cl',label:'ginger ale'}},
{q:'Vilken söt röd ingrediens ska i?',a:'Grenadin',opts:['Grenadin','Soja','Bitters'],amount:{base:2,unit:'cl',label:'grenadin'}},
{q:'Vilken citrus passar?',a:'Lime eller citron',opts:['Lime eller citron','Tomat','Gurka'],amount:{base:1,unit:'cl',label:'citrusjuice'}},
{q:'Vilket glas passar?',a:'Highballglas',opts:['Highballglas','Shotglas','Whiskyglas']},
{q:'Vad kan vi dekorera med?',a:'Körsbär',opts:['Körsbär','Oliv','Rosmarin']}]},
{id:'tropical_cooler',name:'Tropical Cooler',minAge:0,alcoholic:false,steps:[
{q:'Vilken juice ger tropisk bas?',a:'Ananasjuice',opts:['Ananasjuice','Tomatjuice','Kaffe'],amount:{base:6,unit:'cl',label:'ananasjuice'}},
{q:'Vilken citrus ger syra?',a:'Lime',opts:['Lime','Rödbeta','Vanilj'],amount:{base:2,unit:'cl',label:'limejuice'}},
{q:'Vilken andra juice passar?',a:'Apelsinjuice',opts:['Apelsinjuice','Mjölk','Soja'],amount:{base:6,unit:'cl',label:'apelsinjuice'}},
{q:'Nu kyler vi ordentligt.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},
{q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Espressokopp']},
{q:'Vilken garnish?',a:'Apelsin eller lime',opts:['Apelsin eller lime','Oliv','Kanelstång']}]}
];

const moodToBar={party:'rooftop',tropical:'tropical',classic:'manhattan',elegant:'hotel'};
function canon(s){return String(s??'').trim().toLocaleLowerCase('sv-SE').normalize('NFC')}
function pick(arr){if(!arr.length)return'';let c=arr.filter(x=>x!==state.lastPhrase);if(!c.length)c=arr;const v=c[Math.floor(Math.random()*c.length)];state.lastPhrase=v;return v}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
const barTalkHeadState385={active:false,saved:'neutral',timer:null,current:null};
function barTalkDelay385(){return 350+Math.random()*300}
function barTalkNext385(current){
  if(current!=='forvanad')return 'forvanad';
  const r=Math.random();
  if(r<0.30)return 'pratar1';
  if(r<0.60)return 'pratar2';
  if(r<0.80)return 'neutral';
  return 'blink'
}
function barTalkTick385(){
  const s=barTalkHeadState385;if(!s.active)return;
  const api=window.__barSceneConfig385;
  if(!api?.setHeadVariant){
    s.timer=setTimeout(barTalkTick385,120);
    return
  }
  const current=api.currentHead?.()||s.current||s.saved||'neutral';
  const next=barTalkNext385(current);
  if(api.setHeadVariant(next)){
    s.current=next;
    s.timer=setTimeout(barTalkTick385,barTalkDelay385())
  }else{
    s.timer=setTimeout(barTalkTick385,120)
  }
}
function startTalkingHead385(){
  const s=barTalkHeadState385;if(s.active)return true;
  const api=window.__barSceneConfig385;
  s.saved=api?.currentHead?.()||'neutral';
  s.current=s.saved;
  s.active=true;
  s.timer=setTimeout(barTalkTick385,barTalkDelay385());
  return true
}
function stopTalkingHead385(){
  const s=barTalkHeadState385;
  if(s.timer){clearTimeout(s.timer);s.timer=null}
  if(!s.active)return;
  s.active=false;
  const restore=s.saved||'neutral';
  s.saved='neutral';s.current=null;
  window.__barSceneConfig385?.setHeadVariant?.(restore)
}
window.__barSpeechHead385={start:startTalkingHead385,stop:stopTalkingHead385,state:barTalkHeadState385};
const BAR_TTS_URL_V337='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-tts-v2';
let barTtsAudioV337=null,barTtsAbortV337=null;
function stopSpeech(options={}){
  const keepTalkingHead=Boolean(options?.keepTalkingHead);
  try{speechSynthesis.cancel()}catch(_){}
  try{barTtsAbortV337?.abort()}catch(_){}
  barTtsAbortV337=null;
  try{if(barTtsAudioV337){barTtsAudioV337.pause();barTtsAudioV337.src=''}}catch(_){}
  barTtsAudioV337=null;
  if(!keepTalkingHead)stopTalkingHead385()
}
async function barPlayTtsV337(text,options={}){
  const s=String(text||'').trim();if(!s)return;
  const manageHead=options?.manageHead!==false;
  const onPlaybackStart=typeof options?.onPlaybackStart==='function'?options.onPlaybackStart:null;
  stopSpeech({keepTalkingHead:!manageHead});
  const controller=new AbortController();barTtsAbortV337=controller;
  let url=null,audio=null,headStarted=false,playbackNotified=false;
  const notifyPlayback=()=>{
    if(playbackNotified)return;
    playbackNotified=true;
    if(manageHead){startTalkingHead385();headStarted=true}
    try{onPlaybackStart?.()}catch(e){console.error('TTS playback start callback',e)}
  };
  try{
    const r=await fetch(BAR_TTS_URL_V337,{method:'POST',headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V119},body:JSON.stringify({input:s}),signal:controller.signal});
    if(!r.ok)throw new Error('TTS HTTP '+r.status);
    const blob=await r.blob();if(controller.signal.aborted)return;
    url=URL.createObjectURL(blob);audio=new Audio(url);barTtsAudioV337=audio;
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;cleanup();resolve()};
      const fail=e=>{if(settled)return;settled=true;cleanup();reject(e)};
      const onAbort=()=>{try{audio.pause();audio.src=''}catch(_){}finish()};
      const onPlaying=()=>notifyPlayback();
      const cleanup=()=>{audio.onended=null;audio.onerror=null;audio.onplaying=null;controller.signal.removeEventListener('abort',onAbort)};
      audio.onplaying=onPlaying;
      audio.onended=finish;
      audio.onerror=fail;
      controller.signal.addEventListener('abort',onAbort,{once:true});
      audio.play().then(()=>{if(!audio.paused)notifyPlayback()}).catch(fail)
    });
  }finally{
    if(url)URL.revokeObjectURL(url);
    if(barTtsAudioV337===audio)barTtsAudioV337=null;
    if(barTtsAbortV337===controller)barTtsAbortV337=null;
    if(manageHead&&headStarted)stopTalkingHead385()
  }
}
function speak(text,onEnd){
  let done=false;const finish=()=>{if(done)return;done=true;if(onEnd)onEnd()};
  barPlayTtsV337(text).then(finish).catch(e=>{if(e?.name!=='AbortError')console.error('OpenAI TTS',e);finish()})
}
function stopIdle(){clearTimeout(state.idleTimer);state.idleTimer=null}
function scheduleIdle(){
  stopIdle();if(state.phase!=='chat'&&state.phase!=='recipe')return;
  const delay=state.idleTurnsV388>0?18000+Math.random()*10000:12000+Math.random()*4000;
  const epoch=state.activityEpochV388;
  state.idleTimer=setTimeout(()=>{
    if(epoch!==state.activityEpochV388)return;
    state.idleTurnsV388++;
    const p=window.__barAI388?.idle?.(epoch);
    if(p&&typeof p.finally==='function')p.finally(()=>{if(epoch===state.activityEpochV388) scheduleIdle()});
    else scheduleIdle();
  },delay)
}
function tryOrientation(mode,fullscreen=false){try{screen.orientation?.unlock?.()}catch(_){ }const doLock=()=>{try{screen.orientation?.lock?.(mode)?.catch?.(()=>{})}catch(_){}};if(fullscreen){try{if(document.fullscreenElement)doLock();else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().then(doLock).catch(()=>doLock());else doLock()}catch(_){doLock()}}else doLock()}
const isPortrait=()=>matchMedia('(orientation: portrait)').matches,isLandscape=()=>matchMedia('(orientation: landscape)').matches;
function updateOrientationBanner(){const b=$('#orientationBanner');if(b)b.style.display=isPortrait()?'flex':'none'}
async function requestSensors(){let ok=true;try{if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function')ok=(await DeviceMotionEvent.requestPermission())==='granted'&&ok;if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')ok=(await DeviceOrientationEvent.requestPermission())==='granted'&&ok}catch(_){ok=false}state.sensorOK=ok;toast(ok?'Sensorer aktiverade.':'Sensorer kunde inte aktiveras – reservknappar finns.');return ok}
function makeBottles(){const labels=['ROM','GIN','TEQ','WHISKY','VERM','SEC','BITTER','SIRAP','JUICE','SODA'],colors=['#eee8d8','#72a67f','#c89a55','#82502f','#ad4b43','#edb06e','#49302b','#d64d68','#e8a346','#9bdde5'];$('#bottles').innerHTML=labels.map((x,i)=>`<div class="bottle" data-label="${x}" style="background:${colors[i]}"></div>`).join('')}
function barName(b){return({tropical:'strandbar',manhattan:'Manhattan-bar',rooftop:'rooftop-bar',hotel:'hotellbar'})[b]||'bar'}
function diffLabel(){return state.difficulty==='easy'?'Lätt':state.difficulty==='medium'?'Medel':'Svår'}
function updateHud(){const serv=state.difficulty==='hard'&&state.serving&&state.drink?.alcoholic?` · ${state.serving}:a`:'';$('#hudPlayer').textContent=`${state.name} · ${state.under18?'alkoholfritt':'18+'} · ${diffLabel()}${serv}`;$('#hudDrink').textContent=state.drink?state.drink.name:'Ingen beställning ännu'}

function recipeSpec(s){
  const a=String(s?.a||'');
  if(a.includes(' och '))return {mode:'all',parts:a.split(' och ').map(x=>x.trim()).filter(Boolean)};
  if(a.includes(' eller '))return {mode:'any',parts:a.split(' eller ').map(x=>x.trim()).filter(Boolean)};
  return {mode:'single',parts:[a].filter(Boolean)}
}

function expectedAmount(s){return Number(s?.amount?.base||0)*((state.serving||4)/4)}
function fmt(n,u){const v=Number.isInteger(n)?String(n):String(Math.round(n*10)/10).replace('.',',');return `${v} ${u}`}

$$('.difficultyBtn').forEach(btn=>btn.onclick=()=>{
  state.difficulty=btn.dataset.difficulty;
  $$('.difficultyBtn').forEach(b=>b.classList.toggle('selected',b===btn));
  $('#difficultyHelp').textContent=state.difficulty==='easy'?'Lätt: välj mellan tre alternativ eller säg svaret.':state.difficulty==='medium'?'Medel: svara fritt med text eller röst.':'Svår: fritt svar plus mängder och proportioner.'
});
$('#sensorBtn').onclick=requestSensors;
$('#enterBtn').onclick=()=>{
  const name=$('#nameInput').value.trim(),age=Number($('#ageInput').value);
  if(!name||!age||age<1||age>120){$('#startError').textContent='Fyll i namn och en rimlig ålder.';return}
  state.name=name;state.age=age;state.under18=age<18;state.phase='mood';$('#startError').textContent='';
  $('#moodHello').textContent=`Hej ${name}! Välkommen.`;$('#moodPrompt').textContent='Välj vilket mood du är på idag.';
  show('moodScreen');
  window.__barAI388?.activity?.()
};
$$('.mood').forEach(btn=>btn.onclick=()=>selectMood(btn.dataset.mood));

function selectMood(mood){
  if(state.phase!=='mood')return;
  state.phase='chat';state.mood=mood;state.bar=mood==='surprise'?['tropical','manhattan','rooftop','hotel'][Math.floor(Math.random()*4)]:moodToBar[mood];
  window.__barAI388?.activity?.();
  $$('.mood').forEach(b=>b.disabled=true);enterBar();tryOrientation('landscape',true);setTimeout(()=>$$('.mood').forEach(b=>b.disabled=false),1200)
}
function enterBar(){
  stopIdle();makeBottles();$('#barScene').className=state.bar;state.drink=null;state.serving=null;state.aiCorrectParts=[];updateHud();show('barScreen');updateOrientationBanner();
  $('#dialogText').textContent='';$('#dialogControls').innerHTML='';
  const done=()=>{if(state.phase==='chat')renderConversationInput(false)};
  const p=window.__barAI388?.event?.('bar_entered',{bar:barName(state.bar),mood:state.mood,playerName:state.name,under18:state.under18},{target:'#dialogText',phase:'chat',after:done});
  if(!p)done()
}
function renderConversationInput(_ask=true){
  if(state.phase!=='chat')return;
  $('#dialogControls').innerHTML=`<div class="inputRow"><input id="chatInput" placeholder="Prata med Alex eller beställ"><button class="btn" id="chatSendBtn">Säg</button><button class="btn secondary" id="chatMicBtn">🎙️</button></div><div class="small">Fri konversation – AI:n tolkar hela meningen.</div>`;
  $('#chatSendBtn').onclick=()=>handleConversation($('#chatInput').value);
  $('#chatInput').onkeydown=e=>{if(e.key==='Enter')handleConversation(e.target.value)};
  $('#chatMicBtn').onclick=()=>recognize(alts=>handleConversation(alts[0]||''),$('#chatMicBtn'));
  scheduleIdle()
}

function sayOrderUnavailable(facts){
  $('#dialogText').textContent='';
  const done=()=>{if(state.phase==='chat')renderConversationInput(false)};
  const p=window.__barAI388?.event?.('order_unavailable',facts,{target:'#dialogText',phase:'chat',after:done});
  if(!p)done()
}
function orderDrinkById(id){
  const menuItem=drinkMenuCatalog.find(x=>x.id===id);
  if(!menuItem){sayOrderUnavailable({requestedId:id,reason:'unknown_drink'});return false}
  if(!menuItem.buildable){
    sayOrderUnavailable({requestedId:id,drinkName:menuItem.name,reason:'listed_but_not_buildable'});
    return false
  }
  const d=drinks.find(x=>x.id===id);
  if(!d){sayOrderUnavailable({requestedId:id,drinkName:menuItem.name,reason:'recipe_missing'});return false}
  if(state.under18&&d.minAge>=18){sayOrderUnavailable({requestedId:id,drinkName:d.name,reason:'underage_alcohol'});return false}
  orderDrink(d);return true
}
function orderDrink(d){
  stopIdle();state.phase='recipe';state.drink=d;state.step=0;state.correct=0;state.wrong=0;state.points=0;state.startedAt=Date.now();state.serving=null;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];updateHud();$('#dialogControls').innerHTML='';
  if(state.difficulty==='hard')askServing();else renderStep(true)
}

function naturalQuestion(s){return s.q}
function recipeInputHTML(placeholder){return `<div class="freeAnswerRow"><input id="recipeText" placeholder="${placeholder}"><button class="btn" id="recipeSend">Svara</button><button class="btn secondary" id="recipeMic">🎙️</button><div class="recipeTalkNote">Prata fritt. Spelet använder ingen lokal nyckelordsanalys av din mening.</div><div class="freeAnswerStatus" id="recipeStatus"></div></div>`}
function renderStep(newStep=false){
  if(state.step>=state.drink.steps.length){startPhysicalAction('drink','result');return}
  if(newStep){state.questionFails=0;state.amountFails=0;state.aiCorrectParts=[]}
  const s=state.drink.steps[state.step];state.lastRecipeQuestion=naturalQuestion(s);$('#dialogText').textContent='';
  if(state.difficulty==='easy')renderEasy(s);else renderFree(s)
}
function renderEasy(s){
  $('#dialogControls').innerHTML=`<div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>${recipeInputHTML('Skriv svar eller prata med Alex')}`;
  $$('.choice').forEach(b=>b.onclick=()=>answerKnownChoice(b.textContent,b));wireRecipeInput()
}
function renderFree(s,message=''){
  const hint=state.questionFails>=3?`<div class="hintTitle">Tre fel – här får du tre alternativ. Ett är rätt.</div><div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`:'';
  $('#dialogControls').innerHTML=`${recipeInputHTML('Skriv svaret själv eller prata')}${hint}`;
  const st=$('#recipeStatus');if(st)st.textContent=message||'Frågan ligger kvar medan ni pratar.';
  $$('.choice').forEach(b=>b.onclick=()=>answerKnownChoice(b.textContent,b));wireRecipeInput()
}
function wireRecipeInput(){
  const input=$('#recipeText'),send=$('#recipeSend'),mic=$('#recipeMic');
  if(send&&input)send.onclick=()=>handleRecipeInput(input.value);
  if(input)input.onkeydown=e=>{if(e.key==='Enter')handleRecipeInput(e.target.value)};
  if(mic)mic.onclick=()=>recognize(alts=>handleRecipeInput(alts[0]||''),mic,$('#recipeStatus'))
}
function answerKnownChoice(answer,btn){
  const s=state.drink?.steps?.[state.step];if(!s)return;
  const ok=canon(answer)===canon(s.a);
  if(!ok){btn?.classList.add('bad');registerWrongAnswer(s);return}
  btn?.classList.add('good');completeRecipeStep(s,true)
}
function registerWrongAnswer(s){
  state.wrong++;state.points=Math.max(0,state.points-2);state.questionFails++;
  if(state.difficulty==='easy')renderEasy(s);else if(state.questionFails>=3)renderFree(s,'Tre fel – välj ett av alternativen eller fortsätt prata.')
}
function completeRecipeStep(s,withPraise=false){
  state.correct++;state.points+=10;state.aiCorrectParts=[];
  if(state.difficulty==='hard'&&s.amount){askAmount(s);return}
  if(withPraise){advanceStep(s);return}
  advanceStep(s)
}
function advanceStep(s){state.step++;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];if(s.action)startPhysicalAction(s.action,'continue');else renderStep(true)}
function showHelpOptions(s,message=''){if(state.difficulty==='easy')renderEasy(s);else{state.questionFails=Math.max(state.questionFails,3);renderFree(s,message||'Här får du tre alternativ.')}}

function renderSpecialPrompt(prompt,placeholder,onSubmit){
  $('#dialogText').textContent=prompt;
  $('#dialogControls').innerHTML=`<div class="freeAnswerRow"><input id="specialText" placeholder="${placeholder}"><button class="btn" id="specialSend">Svara</button><button class="btn secondary" id="specialMic">🎙️</button><div class="freeAnswerStatus" id="specialStatus"></div></div>`;
  const input=$('#specialText'),status=$('#specialStatus'),send=$('#specialSend'),mic=$('#specialMic');
  send.onclick=()=>{const v=input.value.trim();if(v){input.value='';onSubmit(v,status)}};
  input.onkeydown=e=>{if(e.key==='Enter'){const v=e.target.value.trim();if(v){e.target.value='';onSubmit(v,status)}}};
  mic.onclick=()=>recognize(alts=>{const v=alts[0]||'';if(v)onSubmit(v,status)},mic,status)
}

function renderServingChoices(status){
  const wrap=document.createElement('div');wrap.className='choices';
  [4,6,8].forEach(n=>{const b=document.createElement('button');b.className='choice';b.textContent=state.drink?.alcoholic?`${n}:a`:n===4?'Liten':n===6?'Mellan':'Stor';b.onclick=()=>acceptServingValue(n);wrap.appendChild(b)});
  status?.after(wrap)
}
function acceptServingValue(n){if(![4,6,8].includes(Number(n)))return;state.serving=Number(n);updateHud();renderStep(true)}
function renderAmountHints(s,status){
  const e=expectedAmount(s),unit=s.amount.unit;const delta=unit==='blad'?2:unit==='stänk'?1:1;
  const values=[Math.max(0,e-delta),e,e+delta];
  const wrap=document.createElement('div');wrap.className='choices';
  values.forEach(v=>{const b=document.createElement('button');b.className='choice';b.textContent=fmt(v,unit);b.onclick=()=>{if(Math.abs(v-e)<0.001){completeAmountStep(s)}else registerAmountWrong(s,status)};wrap.appendChild(b)});status?.after(wrap)
}
function registerAmountWrong(s,status){state.wrong++;state.points=Math.max(0,state.points-2);state.amountFails++;if(status)status.textContent=state.amountFails>=3?'Tre fel – välj ett alternativ.':`Inte rätt mängd. (${state.amountFails}/3)`;if(state.amountFails>=3)renderAmountHints(s,status)}
function completeAmountStep(s){const status=$('#specialStatus');if(status)status.textContent=`Rätt: ${fmt(expectedAmount(s),s.amount.unit)}.`;advanceStep(s)}

/* These are supplied by bar_v1_16_ai.js. They are intentionally placeholders
   only so the core contains no local free-language interpretation. */
async function handleConversation(_raw){throw new Error('AI-lagret har inte laddats')}
async function handleRecipeInput(_raw){throw new Error('AI-lagret har inte laddats')}
function askServing(){throw new Error('AI-lagret har inte laddats')}
function askAmount(_s){throw new Error('AI-lagret har inte laddats')}


/* v3.47 White Rum bottle interaction.
   Shelf placement is untouched. A visual clone is animated in a fixed overlay. */
(function(){
  const BOTTLE_SHOW_MS=3200;
  let bottleBusy=false;
  function currentRecipeStepV347(){
    if(state.phase!=='recipe'||!state.drink||!Array.isArray(state.drink.steps))return null;
    return state.drink.steps[state.step]||null;
  }
  function isWhiteRumQuestionV347(step){
    if(!step)return false;
    const answer=canon(step.a||'');
    return answer==='vit kubansk rom'||answer==='vit rom'||answer==='white rum';
  }
  function bottleOverlayV347(kind){
    const source=$('#whiteRumBottle'); if(!source)return null;
    const overlay=document.createElement('div');
    overlay.id='bottleCelebrationOverlay'; overlay.className=kind;
    const clone=source.cloneNode(true);
    clone.removeAttribute('id'); clone.removeAttribute('role'); clone.removeAttribute('tabindex');
    clone.className='celebrationBottle';
    overlay.appendChild(clone);
    if(kind==='correct'){
      const text=document.createElement('div'); text.className='correctText'; text.textContent='RÄTT!';
      overlay.appendChild(text);
      for(const c of ['f1','f2','f3']){const f=document.createElement('i');f.className='firework '+c;overlay.appendChild(f)}
    }
    document.body.appendChild(overlay); source.style.visibility='hidden';
    return {overlay,source};
  }
  function finishBottleOverlayV347(view,after){
    if(!view)return;
    view.overlay.remove(); view.source.style.visibility=''; bottleBusy=false;
    if(after)after();
  }
  function activateWhiteRumV347(){
    if(bottleBusy)return;
    window.__barAI391?.interrupt?.();
    const step=currentRecipeStepV347();
    const correctQuestion=isWhiteRumQuestionV347(step);
    bottleBusy=true;
    const view=bottleOverlayV347(correctQuestion?'correct':'heavenly');
    if(!view){bottleBusy=false;return}
    if(correctQuestion){
      /* v3.85: preserve the original full-screen RÄTT! bottle reward first.
         Only after it finishes do we start the bartender/White Rum arm sequence. */
      setTimeout(()=>finishBottleOverlayV347(view,()=>{
        bottleBusy=true;
        const animation=window.__barWhiteRum385?.playCorrect;
        if(typeof animation==='function'){
          Promise.resolve(animation()).then(()=>{
            bottleBusy=false;
            if(state.phase==='recipe'&&state.drink&&state.drink.steps[state.step]===step){
              completeRecipeStep(step,false);
            }
          }).catch(err=>{
            bottleBusy=false;
            console.error('White Rum-animation misslyckades',err);
            if(state.phase==='recipe'&&state.drink&&state.drink.steps[state.step]===step){
              completeRecipeStep(step,false);
            }
          });
        }else{
          bottleBusy=false;
          if(state.phase==='recipe'&&state.drink&&state.drink.steps[state.step]===step){
            completeRecipeStep(step,false);
          }
        }
      }),BOTTLE_SHOW_MS);
    }else{
      /* Free exploration: visual effect only, no score or recipe progression. */
      setTimeout(()=>finishBottleOverlayV347(view,null),BOTTLE_SHOW_MS);
    }
  }
  function bindBottleV347(){
    const b=$('#whiteRumBottle'); if(!b)return;
    b.addEventListener('click',activateWhiteRumV347);
    b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activateWhiteRumV347()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindBottleV347);else bindBottleV347();
})();
