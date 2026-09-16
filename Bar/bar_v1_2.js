(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const screens = $$('.screen');
  const show = id => screens.forEach(s => s.classList.toggle('active', s.id === id));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const state = {
    name:'', age:18, under18:false, mood:'tropical', bar:'tropical',
    drink:null, step:0, correct:0, wrong:0, points:0, startedAt:0,
    action:null, afterAction:null, sensorOK:false,
    shakeProgress:0, muddleProgress:0, drinkProgress:0,
    lastMotion:0, lastMuddle:0, baselineBeta:null, baselineGamma:null,
    idleTimer:null, restoreTimer:null, waitingPortrait:false
  };

  const drinks = [
    {id:'mojito', name:'Mojito', minAge:18, intro:'Mojito! Friskt, klassiskt och perfekt här.',
      steps:[
        {q:'Vilken bassprit börjar vi med?',a:'Vit rom',opts:['Vit rom','Gin','Tequila']},
        {q:'Vilken citrus ska i?',a:'Lime',opts:['Lime','Citron','Apelsin']},
        {q:'Vilken ört hör hemma i en Mojito?',a:'Mynta',opts:['Mynta','Basilika','Rosmarin']},
        {q:'Vad använder vi för sötma?',a:'Socker',opts:['Socker','Salt','Kaffe']},
        {q:'Hur behandlar vi lime och mynta först?',a:'Muddla försiktigt',opts:['Muddla försiktigt','Koka','Mixa hårt'],action:'muddle'},
        {q:'Nu ska allt kylas och blandas. Vad gör vi?',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},
        {q:'Vilket glas passar bäst?',a:'Highballglas',opts:['Highballglas','Martiniglas','Shotglas']},
        {q:'Vad toppar vi med?',a:'Sodavatten',opts:['Sodavatten','Mjölk','Cola']},
        {q:'Sista detaljen: vad dekorerar vi med?',a:'Lime och mynta',opts:['Lime och mynta','Oliv','Kanelstång']}
      ]},
    {id:'margarita', name:'Margarita', minAge:18, intro:'Margarita. Då håller vi koll på syra, sötma och salt.',
      steps:[
        {q:'Vilken bassprit börjar vi med?',a:'Tequila',opts:['Tequila','Vodka','Whisky']},
        {q:'Vilken citrus ska i?',a:'Lime',opts:['Lime','Citron','Grapefrukt']},
        {q:'Vilken apelsinlikör används ofta?',a:'Triple sec',opts:['Triple sec','Amaretto','Kahlúa']},
        {q:'Vad gör vi med glaskanten?',a:'Saltkant',opts:['Saltkant','Sockerkant','Ingen kant']},
        {q:'Nu ska den kylas ordentligt.',a:'Skaka',opts:['Skaka','Värm','Rör med sugrör'],action:'shake'},
        {q:'Vilket glas är rätt?',a:'Margaritaglas',opts:['Margaritaglas','Ölsejdel','Shotglas']},
        {q:'Vilken garnish passar?',a:'Limeklyfta',opts:['Limeklyfta','Oliv','Myntabukett']}
      ]},
    {id:'manhattan', name:'Manhattan', minAge:18, intro:'Manhattan. Nu går vi åt det klassiska hållet.',
      steps:[
        {q:'Vilken bassprit är grunden?',a:'Whisky',opts:['Whisky','Rom','Gin']},
        {q:'Vilken förstärkt vin-ingrediens används?',a:'Söt vermouth',opts:['Söt vermouth','Torr cider','Porter']},
        {q:'Vilken bitter används ofta?',a:'Angostura bitters',opts:['Angostura bitters','Tonic','Grenadin']},
        {q:'Hur blandar vi en klassisk Manhattan?',a:'Rör med is',opts:['Rör med is','Skaka hårt','Mixa']},
        {q:'Vilket glas serveras den i?',a:'Cocktailglas',opts:['Cocktailglas','Highballglas','Ölglas']},
        {q:'Vilken garnish passar?',a:'Cocktailkörsbär',opts:['Cocktailkörsbär','Selleri','Gurka']}
      ]},
    {id:'virgin_mojito', name:'Virgin Mojito', minAge:0, intro:'Virgin Mojito! Friskt och helt alkoholfritt.',
      steps:[
        {q:'Vilken citrus börjar vi med?',a:'Lime',opts:['Lime','Citron','Apelsin']},
        {q:'Vilken ört använder vi?',a:'Mynta',opts:['Mynta','Timjan','Dill']},
        {q:'Vad använder vi för sötma?',a:'Sockerlag',opts:['Sockerlag','Saltlag','Kaffe']},
        {q:'Hur behandlar vi lime och mynta?',a:'Muddla försiktigt',opts:['Muddla försiktigt','Koka','Mosa till puré'],action:'muddle'},
        {q:'Nu ska den kylas och blandas.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},
        {q:'Vad toppar vi med?',a:'Sodavatten',opts:['Sodavatten','Mjölk','Tomatjuice']},
        {q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Champagneflöjt']}
      ]},
    {id:'shirley', name:'Shirley Temple', minAge:0, intro:'Shirley Temple – festlig, söt och alkoholfri.',
      steps:[
        {q:'Vilken bas använder vi?',a:'Ginger ale',opts:['Ginger ale','Espresso','Tonic']},
        {q:'Vilken söt röd ingrediens ska i?',a:'Grenadin',opts:['Grenadin','Soja','Bitters']},
        {q:'Vilken citrus passar?',a:'Lime eller citron',opts:['Lime eller citron','Tomat','Gurka']},
        {q:'Vilket glas passar?',a:'Highballglas',opts:['Highballglas','Shotglas','Whiskyglas']},
        {q:'Vad kan vi dekorera med?',a:'Körsbär',opts:['Körsbär','Oliv','Rosmarin']}
      ]},
    {id:'tropical_cooler', name:'Tropical Cooler', minAge:0, intro:'Tropical Cooler. Fruktigt och friskt.',
      steps:[
        {q:'Vilken juice ger tropisk bas?',a:'Ananasjuice',opts:['Ananasjuice','Tomatjuice','Kaffe']},
        {q:'Vilken citrus ger syra?',a:'Lime',opts:['Lime','Rödbeta','Vanilj']},
        {q:'Vilken andra juice passar?',a:'Apelsinjuice',opts:['Apelsinjuice','Mjölk','Soja']},
        {q:'Nu kyler vi ordentligt.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},
        {q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Espressokopp']},
        {q:'Vilken garnish?',a:'Apelsin eller lime',opts:['Apelsin eller lime','Oliv','Kanelstång']}
      ]}
  ];

  const moodToBar={party:'rooftop',tropical:'tropical',classic:'manhattan',elegant:'hotel'};
  const moodLines={
    party:'Festligt? Då behöver vi lite mer puls. Häng med!',
    tropical:'Tropiskt? Då ska vi ha sol, palmer och bambu. Följ med!',
    classic:'Lugnt och klassiskt. Då känner jag precis rätt ställe på Manhattan.',
    elegant:'Elegant och exklusivt. Då flyttar vi oss till en finare hotellbar.',
    surprise:'Överraska dig? Det är farligt att säga till en bartender. Nu kör vi.'
  };
  const orderSmallTalk=[
    'Ta god tid på dig. Jag har ingen brådska – än.',
    'Jag brukar säga att den bästa drinken är den man faktiskt är sugen på.',
    'Ser du flaskorna där bakom? Snart är det du som ska hålla reda på dem.',
    'Du kan skriva din beställning eller trycka på mikrofonen och säga den.',
    'Jag lovar att inte döma dig om du väljer något enkelt. Nästan inte i alla fall.'
  ];
  const questionSmallTalk=[
    'Ingen stress. Titta på alternativen en gång till.',
    'Tänk på smaken och på vad som brukar vara basen i drinken.',
    'Jag väntar. En bra bartender chansar inte i onödan.',
    'Du kan också säga svaret högt om du vill.'
  ];

  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
  function speak(text){
    try{
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);u.lang='sv-SE';u.rate=.97;u.pitch=.96;
      speechSynthesis.speak(u);
    }catch(e){}
  }
  function stopIdle(){clearTimeout(state.idleTimer);clearTimeout(state.restoreTimer);state.idleTimer=null;state.restoreTimer=null}
  function scheduleIdle(kind, originalText){
    stopIdle();
    const pool=kind==='order'?orderSmallTalk:questionSmallTalk;
    state.idleTimer=setTimeout(()=>{
      if(!$('#barScreen').classList.contains('active')) return;
      const line=pool[Math.floor(Math.random()*pool.length)];
      $('#dialogText').textContent=line;speak(line);
      state.restoreTimer=setTimeout(()=>{
        if($('#barScreen').classList.contains('active')){
          $('#dialogText').textContent=originalText;
          scheduleIdle(kind,originalText);
        }
      },3300);
    },7200+Math.random()*2800);
  }

  async function requestSensors(){
    let ok=true;
    try{
      if(typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
        ok=(await DeviceMotionEvent.requestPermission())==='granted' && ok;
      }
      if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
        ok=(await DeviceOrientationEvent.requestPermission())==='granted' && ok;
      }
    }catch(e){ok=false}
    state.sensorOK=ok;toast(ok?'Sensorer aktiverade.':'Sensorer kunde inte aktiveras – reservknappar finns.');
    return ok;
  }

  async function requestOrientation(mode){
    try{
      if(document.documentElement.requestFullscreen && !document.fullscreenElement){
        await document.documentElement.requestFullscreen();
      }
    }catch(e){}
    try{
      if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      if(screen.orientation && screen.orientation.lock) await screen.orientation.lock(mode);
    }catch(e){}
  }
  const isPortrait=()=>window.matchMedia('(orientation: portrait)').matches;
  function updateBarOrientation(){ $('#orientationBanner').style.display=isPortrait()?'flex':'none'; }

  $('#sensorBtn').addEventListener('click',requestSensors);
  $('#enterBtn').addEventListener('click',()=>{
    const name=$('#nameInput').value.trim(), age=Number($('#ageInput').value);
    if(!name||!age||age<1||age>120){$('#startError').textContent='Fyll i namn och en rimlig ålder.';return}
    state.name=name;state.age=age;state.under18=age<18;$('#startError').textContent='';
    $('#moodHello').textContent=`Hej ${name}! Välkommen.`;
    $('#moodPrompt').textContent=state.under18?'Vilket mood är du på idag? Jag håller baren helt alkoholfri.':'Vilket mood är du på idag?';
    show('moodScreen');speak(`Hej ${name}! Välkommen. Vilket mood är du på idag?`);
  });
  $$('.mood').forEach(b=>b.addEventListener('click',()=>selectMood(b.dataset.mood)));

  async function selectMood(mood){
    state.mood=mood;
    state.bar=mood==='surprise'?['tropical','manhattan','rooftop','hotel'][Math.floor(Math.random()*4)]:moodToBar[mood];
    speak(moodLines[mood]);
    await sleep(650);
    enterBar();
  }

  function makeBottles(){
    const labels=['ROM','GIN','TEQ','WHISKY','VERM','SEC','BITTER','SIRAP','JUICE','SODA'];
    const colors=['#eee8d8','#72a67f','#c89a55','#82502f','#ad4b43','#edb06e','#49302b','#d64d68','#e8a346','#9bdde5'];
    $('#bottles').innerHTML=labels.map((x,i)=>`<div class="bottle" data-label="${x}" style="background:${colors[i]}"></div>`).join('');
  }
  function barName(b){return({tropical:'strandbar',manhattan:'Manhattan-bar',rooftop:'rooftop-bar',hotel:'hotellbar'})[b]||'bar'}

  function enterBar(){
    stopIdle();makeBottles();$('#barScene').className=state.bar;
    $('#hudPlayer').textContent=`${state.name} · ${state.under18?'alkoholfritt':'18+'}`;
    $('#hudDrink').textContent=state.drink?state.drink.name:'Ingen beställning ännu';
    show('barScreen');updateBarOrientation();
    const text=`Välkommen till min ${barName(state.bar)}. Vad får det lov att vara? Du kan skriva eller prata.`;
    $('#dialogText').textContent=text;$('#dialogControls').innerHTML=drinkInputControls();wireControls();speak(text);scheduleIdle('order',text);
  }

  function drinkInputControls(){
    const example=state.under18?'Virgin Mojito, Shirley Temple eller Tropical Cooler.':'Mojito, Margarita, Manhattan – eller en alkoholfri.';
    return `<div class="inputRow"><input id="drinkInput" placeholder="Skriv en drink"><button class="btn" id="orderBtn">Beställ</button><button class="btn secondary" id="micBtn">🎙️</button></div><div class="small">${example}</div>`;
  }
  function wireControls(){
    const order=$('#orderBtn'),inp=$('#drinkInput'),mic=$('#micBtn');
    if(order)order.onclick=()=>orderDrink(inp.value);
    if(inp)inp.onkeydown=e=>{if(e.key==='Enter')orderDrink(inp.value)};
    if(mic)mic.onclick=startRecognition;
    $$('.choice').forEach(b=>b.onclick=()=>answerStep(b.textContent,b));
  }
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').trim();

  function resolveDrink(q){
    const x=normalize(q),aliases={
      'mojito':'mojito','mohito':'mojito','margarita':'margarita','manhattan':'manhattan',
      'virgin mojito':'virgin_mojito','alkoholfri mojito':'virgin_mojito','mocktail mojito':'virgin_mojito',
      'shirley temple':'shirley','tropical cooler':'tropical_cooler','tropisk drink':'tropical_cooler'
    };
    const id=aliases[x] || Object.entries(aliases).find(([k])=>x.includes(k))?.[1];
    return drinks.find(d=>d.id===id);
  }
  function orderDrink(query){
    stopIdle();
    const d=resolveDrink(query);
    if(!d){const t='Den drinken finns inte i Version 1.2 ännu. Prova någon av exemplen under fältet.';$('#dialogText').textContent=t;speak(t);scheduleIdle('order',t);return}
    if(state.under18 && d.minAge>=18){const t='Den beställningen innehåller alkohol. Jag kan göra en Virgin Mojito, Shirley Temple eller Tropical Cooler istället.';$('#dialogText').textContent=t;speak(t);scheduleIdle('order',t);return}
    state.drink=d;state.step=0;state.correct=0;state.wrong=0;state.points=0;state.startedAt=Date.now();
    $('#hudDrink').textContent=d.name;
    const intro=`${d.intro} Du får hjälpa mig.`;
    $('#dialogText').textContent=intro;$('#dialogControls').innerHTML='';speak(intro);
    setTimeout(renderStep,1800);
  }

  function renderStep(){
    stopIdle();
    if(state.step>=state.drink.steps.length){ startPhysicalAction('drink','result'); return; }
    const s=state.drink.steps[state.step];
    $('#dialogText').textContent=s.q;
    $('#dialogControls').innerHTML=`<div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`;
    wireControls();speak(s.q);scheduleIdle('question',s.q);
  }

  async function answerStep(answer,btn){
    stopIdle();
    const s=state.drink.steps[state.step];
    if(normalize(answer)===normalize(s.a)){
      state.correct++;state.points+=10;btn.classList.add('good');
      const praise=['Precis.','Rätt.','Snyggt.','Där satt den.'][Math.floor(Math.random()*4)];
      speak(praise);
      await sleep(650);
      if(s.action){
        state.step++;
        startPhysicalAction(s.action,'continue');
      }else{
        state.step++;renderStep();
      }
    }else{
      state.wrong++;state.points=Math.max(0,state.points-2);btn.classList.add('bad');
      const t='Inte riktigt. Försök igen.';$('#dialogText').textContent=t;speak(t);
      await sleep(950);renderStep();
    }
  }

  function startPhysicalAction(type,afterAction){
    stopIdle();state.action=type;state.afterAction=afterAction;state.waitingPortrait=true;
    state.shakeProgress=0;state.muddleProgress=0;state.drinkProgress=0;state.baselineBeta=null;state.baselineGamma=null;
    show('actionScreen');
    ['muddleStage','shakeStage','drinkStage','returnStage'].forEach(id=>$('#'+id).classList.add('hidden'));
    $('#rotateStage').classList.remove('hidden');
    const names={muddle:'Nu ska du muddla myntan',shake:'Nu blir telefonen en shaker',drink:'Nu blir telefonen glaset'};
    $('#rotateTitle').textContent=names[type];
    $('#rotateHint').textContent='Det här momentet görs i stående läge.';
    speak(`${names[type]}. Vrid telefonen till stående.`);
  }

  $('#startPortraitBtn').addEventListener('click',async()=>{
    await requestSensors();
    await requestOrientation('portrait');
    if(isPortrait()) showPhysicalStage(); else {
      toast('Vrid telefonen till stående.');
      state.waitingPortrait=true;
    }
  });

  function showPhysicalStage(){
    if(!$('#actionScreen').classList.contains('active'))return;
    state.waitingPortrait=false;$('#rotateStage').classList.add('hidden');
    ['muddleStage','shakeStage','drinkStage','returnStage'].forEach(id=>$('#'+id).classList.add('hidden'));
    if(state.action==='muddle'){
      $('#muddleStage').classList.remove('hidden');updateMuddle();speak('Tryck och gnugga myntan och limen försiktigt med fingret.');
    }else if(state.action==='shake'){
      $('#shakeStage').classList.remove('hidden');updateShake();speak('Skaka ordentligt!');
    }else if(state.action==='drink'){
      $('#drinkStage').classList.remove('hidden');updateDrink();speak('Lyft telefonen mot munnen och luta den för att smaka.');
    }
  }

  function finishPhysical(label){
    ['muddleStage','shakeStage','drinkStage'].forEach(id=>$('#'+id).classList.add('hidden'));
    $('#returnStage').classList.remove('hidden');
    $('#returnText').textContent=label+' Vrid tillbaka telefonen vågrätt och tryck på knappen.';
    speak(label);
  }

  $('#returnBarBtn').addEventListener('click',async()=>{
    await requestOrientation('landscape');
    if(state.afterAction==='result'){showResult();return}
    show('barScreen');updateBarOrientation();renderStep();
  });
  $('#tryLandscapeBtn').addEventListener('click',async()=>{await requestOrientation('landscape');updateBarOrientation()});

  function addMuddle(){
    const now=performance.now();if(now-state.lastMuddle<55)return;state.lastMuddle=now;
    state.muddleProgress=Math.min(100,state.muddleProgress+7);
    $('#muddleGlass').classList.add('hit');setTimeout(()=>$('#muddleGlass').classList.remove('hit'),90);
    updateMuddle();
    if(state.muddleProgress>=100)finishPhysical('Perfekt. Myntan är varsamt muddlad.');
  }
  $('#muddleGlass').addEventListener('pointerdown',e=>{e.preventDefault();addMuddle()});
  $('#muddleGlass').addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch'){e.preventDefault();addMuddle()}});
  $('#muddleFallback').addEventListener('click',()=>{state.muddleProgress=Math.min(100,state.muddleProgress+18);updateMuddle();if(state.muddleProgress>=100)finishPhysical('Perfekt. Myntan är varsamt muddlad.')});
  function updateMuddle(){$('#muddleFill').style.width=state.muddleProgress+'%';$('#muddleStatus').textContent=Math.round(state.muddleProgress)+'%'}

  window.addEventListener('devicemotion',e=>{
    if(state.action!=='shake'||$('#shakeStage').classList.contains('hidden'))return;
    const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;
    const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
    const now=performance.now();
    if(mag>15 && now-state.lastMotion>95){state.lastMotion=now;state.shakeProgress=Math.min(100,state.shakeProgress+7);updateShake();if(state.shakeProgress>=100)finishPhysical('Där satt den. Bra skakat!')}
  });
  $('#shakeFallback').addEventListener('click',()=>{state.shakeProgress=Math.min(100,state.shakeProgress+18);updateShake();if(state.shakeProgress>=100)finishPhysical('Där satt den. Bra skakat!')});
  function updateShake(){$('#shakeFill').style.width=state.shakeProgress+'%';$('#shakeStatus').textContent=Math.round(state.shakeProgress)+'%'}

  window.addEventListener('deviceorientation',e=>{
    if(state.action!=='drink'||$('#drinkStage').classList.contains('hidden'))return;
    if(state.baselineBeta===null){state.baselineBeta=e.beta||0;state.baselineGamma=e.gamma||0;return}
    const db=Math.abs((e.beta||0)-state.baselineBeta),dg=Math.abs((e.gamma||0)-state.baselineGamma);
    const tilt=Math.max(db,dg);
    state.drinkProgress=Math.max(state.drinkProgress,Math.min(100,(tilt-8)/58*100));
    updateDrink();
    if(state.drinkProgress>=98)finishPhysical('Glaset är tomt. Inte illa!');
  });
  $('#drinkFallback').addEventListener('click',()=>{state.drinkProgress=Math.min(100,state.drinkProgress+20);updateDrink();if(state.drinkProgress>=100)finishPhysical('Glaset är tomt. Inte illa!')});
  function updateDrink(){
    const p=Math.max(0,Math.min(100,state.drinkProgress));
    $('#drinkFill').style.width=p+'%';$('#liquid').style.height=(78*(1-p/100))+'%';
    $('#drinkStatus').textContent=p<20?'Glaset är fullt.':p<70?'Du dricker…':p<98?'Nästan tomt…':'Tomt!';
  }

  function showResult(){
    show('resultScreen');
    const max=state.drink.steps.length*10;
    const accuracy=state.correct/(state.correct+state.wrong||1);
    const time=Math.round((Date.now()-state.startedAt)/1000);
    const score=Math.max(0,Math.min(100,Math.round((state.points/max)*75 + accuracy*25)));
    $('#scoreValue').textContent=score;
    $('#resultTitle').textContent=`${state.drink.name} klar!`;
    $('#resultLine').textContent=score>=90?'Bartendern nickar imponerat.':score>=70?'Bra jobbat – den hade kunnat serveras.':'Du tog dig igenom drinken. Nästa blir bättre.';
    $('#scoreGrid').innerHTML=`<div><b>${state.correct}</b><br><small>rätt</small></div><div><b>${state.wrong}</b><br><small>fel</small></div><div><b>${time}s</b><br><small>tid</small></div>`;
    speak($('#resultLine').textContent);
  }

  $('#anotherBtn').addEventListener('click',()=>{state.drink=null;enterBar()});
  $('#changeMoodBtn').addEventListener('click',()=>{state.drink=null;stopIdle();show('moodScreen');speak(`Vilket mood är du på nu, ${state.name}?`)});

  function startRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('Taligenkänning stöds inte i den här webbläsaren.');return}
    try{
      const r=new SR();r.lang='sv-SE';r.interimResults=false;r.maxAlternatives=1;
      r.onstart=()=>toast('Jag lyssnar…');
      r.onerror=()=>toast('Jag hörde inte. Försök igen.');
      r.onresult=e=>{
        const text=e.results[0][0].transcript;
        if($('#drinkInput')){$('#drinkInput').value=text;orderDrink(text)}
        else{
          const s=state.drink?.steps[state.step];
          if(!s)return;
          const match=s.opts.find(o=>normalize(text).includes(normalize(o))||normalize(o).includes(normalize(text)));
          if(match){const b=$$('.choice').find(x=>x.textContent===match);answerStep(match,b)}else toast(`Jag hörde: "${text}"`);
        }
      };
      r.start();
    }catch(e){toast('Mikrofonen kunde inte startas.')}
  }

  window.addEventListener('orientationchange',()=>{
    setTimeout(()=>{
      updateBarOrientation();
      if(state.waitingPortrait && isPortrait() && $('#actionScreen').classList.contains('active'))showPhysicalStage();
    },220);
  });
  window.matchMedia('(orientation: portrait)').addEventListener?.('change',e=>{
    updateBarOrientation();
    if(e.matches && state.waitingPortrait && $('#actionScreen').classList.contains('active'))showPhysicalStage();
  });

  updateBarOrientation();
})();