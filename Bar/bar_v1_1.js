(() => {
  const $ = s => document.querySelector(s);
  const screens = [...document.querySelectorAll('.screen')];
  const show = id => { screens.forEach(s=>s.classList.toggle('active',s.id===id)); };
  const toast = msg => { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); };

  const state = {
    name:'', age:18, under18:false, mood:'tropical', bar:'tropical', drink:null,
    step:0, correct:0, wrong:0, points:0, sensorOK:false, action:null,
    shakeProgress:0, drinkProgress:0, lastMotion:0, lastDrinkBeta:null, startedAt:0,
    awaitingBarLandscape:false
  };

  const drinks = [
    {
      id:'mojito', name:'Mojito', minAge:18, moods:['tropical','party'], color:'#79cf83',
      intro:'Mojito! Friskt, klassiskt och perfekt för den här baren.',
      steps:[
        {q:'Vilken bassprit börjar vi med?', a:'Vit rom', opts:['Vit rom','Gin','Tequila']},
        {q:'Vilken citrus ska i?', a:'Lime', opts:['Lime','Citron','Apelsin']},
        {q:'Vilken ört hör hemma i en Mojito?', a:'Mynta', opts:['Mynta','Basilika','Rosmarin']},
        {q:'Vad använder vi för sötma?', a:'Socker', opts:['Socker','Salt','Kaffe']},
        {q:'Hur behandlar vi lime och mynta först?', a:'Muddla försiktigt', opts:['Muddla försiktigt','Koka','Mixa hårt']},
        {q:'Nu ska allt kylas och blandas. Vad gör vi?', a:'Skaka', opts:['Skaka','Värm','Låt stå'] , action:'shake'},
        {q:'Vilket glas passar bäst?', a:'Highballglas', opts:['Highballglas','Martiniglas','Shotglas']},
        {q:'Vad toppar vi med?', a:'Sodavatten', opts:['Sodavatten','Mjölk','Cola']},
        {q:'Sista detaljen: vad dekorerar vi med?', a:'Lime och mynta', opts:['Lime och mynta','Oliv','Kanelstång']}
      ]
    },
    {
      id:'margarita', name:'Margarita', minAge:18, moods:['party','elegant'], color:'#d7ef7b',
      intro:'Margarita. Då behöver du hålla koll på både syra, sötma och salt.',
      steps:[
        {q:'Vilken bassprit börjar vi med?', a:'Tequila', opts:['Tequila','Vodka','Whisky']},
        {q:'Vilken citrus ska i?', a:'Lime', opts:['Lime','Citron','Grapefrukt']},
        {q:'Vilken typ av apelsinlikör används ofta?', a:'Triple sec', opts:['Triple sec','Amaretto','Kahlúa']},
        {q:'Vad gör vi med glaskanten?', a:'Saltkant', opts:['Saltkant','Sockerkant','Ingen kant']},
        {q:'Nu ska den kylas ordentligt.', a:'Skaka', opts:['Skaka','Värm','Rör med sugrör'] , action:'shake'},
        {q:'Vilket glas är rätt här?', a:'Margaritaglas', opts:['Margaritaglas','Ölsejdel','Shotglas']},
        {q:'Vilken garnish passar bäst?', a:'Limeklyfta', opts:['Limeklyfta','Oliv','Myntabukett']}
      ]
    },
    {
      id:'manhattan', name:'Manhattan', minAge:18, moods:['classic','elegant'], color:'#b85f35',
      intro:'Manhattan. Nu går vi åt det klassiska hållet.',
      steps:[
        {q:'Vilken bassprit är grunden?', a:'Whisky', opts:['Whisky','Rom','Gin']},
        {q:'Vilken förstärkt vin-ingrediens används?', a:'Söt vermouth', opts:['Söt vermouth','Torr cider','Porter']},
        {q:'Vilken bitter används ofta?', a:'Angostura bitters', opts:['Angostura bitters','Tonic','Grenadin']},
        {q:'Hur blandar vi en klassisk Manhattan?', a:'Rör med is', opts:['Rör med is','Skaka hårt','Mixa']},
        {q:'Vilket glas serveras den vanligtvis i?', a:'Cocktailglas', opts:['Cocktailglas','Highballglas','Ölglas']},
        {q:'Vilken garnish passar bäst?', a:'Cocktailkörsbär', opts:['Cocktailkörsbär','Selleri','Gurka']}
      ]
    },
    {
      id:'virgin_mojito', name:'Virgin Mojito', minAge:0, moods:['tropical','party','surprise'], color:'#8ad792',
      intro:'Virgin Mojito! Samma friska känsla, men helt alkoholfri.',
      steps:[
        {q:'Vilken citrus börjar vi med?', a:'Lime', opts:['Lime','Citron','Apelsin']},
        {q:'Vilken ört använder vi?', a:'Mynta', opts:['Mynta','Timjan','Dill']},
        {q:'Vad använder vi för sötma?', a:'Sockerlag', opts:['Sockerlag','Saltlag','Kaffe']},
        {q:'Hur behandlar vi lime och mynta?', a:'Muddla försiktigt', opts:['Muddla försiktigt','Koka','Mosa till puré']},
        {q:'Nu ska den kylas och blandas.', a:'Skaka', opts:['Skaka','Värm','Låt stå'] , action:'shake'},
        {q:'Vad toppar vi med?', a:'Sodavatten', opts:['Sodavatten','Mjölk','Tomatjuice']},
        {q:'Vilket glas?', a:'Highballglas', opts:['Highballglas','Shotglas','Champagneflöjt']}
      ]
    },
    {
      id:'shirley', name:'Shirley Temple', minAge:0, moods:['party','elegant','surprise'], color:'#f07b79',
      intro:'Shirley Temple – festlig, söt och alkoholfri.',
      steps:[
        {q:'Vilken bas använder vi?', a:'Ginger ale', opts:['Ginger ale','Espresso','Tonic']},
        {q:'Vilken söt röd ingrediens ska i?', a:'Grenadin', opts:['Grenadin','Soja','Bitters']},
        {q:'Vilken citrus passar?', a:'Lime eller citron', opts:['Lime eller citron','Tomat','Gurka']},
        {q:'Vilket glas passar?', a:'Highballglas', opts:['Highballglas','Shotglas','Whiskyglas']},
        {q:'Vad kan vi dekorera med?', a:'Körsbär', opts:['Körsbär','Oliv','Rosmarin']}
      ]
    },
    {
      id:'tropical_cooler', name:'Tropical Cooler', minAge:0, moods:['tropical','surprise'], color:'#f7b45c',
      intro:'Tropical Cooler. Då ska vi bygga något fruktigt och friskt.',
      steps:[
        {q:'Vilken juice ger tropisk bas?', a:'Ananasjuice', opts:['Ananasjuice','Tomatjuice','Kaffe']},
        {q:'Vilken citrus ger syra?', a:'Lime', opts:['Lime','Rödbeta','Vanilj']},
        {q:'Vilken andra juice passar bra?', a:'Apelsinjuice', opts:['Apelsinjuice','Mjölk','Soja']},
        {q:'Nu kyler vi ordentligt.', a:'Skaka', opts:['Skaka','Värm','Låt stå'] , action:'shake'},
        {q:'Vilket glas?', a:'Highballglas', opts:['Highballglas','Shotglas','Espressokopp']},
        {q:'Vilken garnish?', a:'Apelsin eller lime', opts:['Apelsin eller lime','Oliv','Kanelstång']}
      ]
    }
  ];

  const moodToBar = {party:'rooftop',tropical:'tropical',classic:'manhattan',elegant:'hotel',surprise:'surprise'};
  const moodLines = {
    party:'Festligt? Då behöver vi lite mer puls än det här. Häng med!',
    tropical:'Tropiskt? Då ska du definitivt inte stå kvar här. Vi behöver sol, palmer och bambu.',
    classic:'Lugnt och klassiskt. Då känner jag precis rätt ställe – Manhattan-känsla.',
    elegant:'Elegant och exklusivt. Då flyttar vi oss till en lite finare bar.',
    surprise:'Överraska dig? Det är farligt att säga till en bartender. Nu kör vi.'
  };

  function speak(text){
    try{
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang='sv-SE'; u.rate=.98; u.pitch=.95;
      speechSynthesis.speak(u);
    }catch(e){}
  }

  async function requestSensors(){
    let ok=true;
    try{
      if(typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
        const r=await DeviceMotionEvent.requestPermission(); ok = ok && r==='granted';
      }
      if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
        const r=await DeviceOrientationEvent.requestPermission(); ok = ok && r==='granted';
      }
    }catch(e){ok=false}
    state.sensorOK=ok;
    toast(ok?'Rörelsesensorer är aktiverade.':'Sensoråtkomst kunde inte aktiveras. Spelet har reservknappar.');
    return ok;
  }

  $('#sensorBtn').addEventListener('click', requestSensors);

  $('#enterBtn').addEventListener('click', async()=>{
    const name=$('#nameInput').value.trim();
    const age=Number($('#ageInput').value);
    if(!name || !age || age<1 || age>120){ $('#startError').textContent='Fyll i ett namn och en rimlig ålder.'; return; }
    state.name=name; state.age=age; state.under18=age<18;
    $('#startError').textContent='';
    $('#moodHello').textContent=`Hej ${name}! Välkommen.`;
    $('#moodPrompt').textContent=state.under18 ? 'Vilket mood är du på idag? Jag håller baren helt alkoholfri för dig.' : 'Vilket mood är du på idag?';
    show('moodScreen');
    speak(`Hej ${name}! Välkommen. Vilket mood är du på idag?`);
  });

  document.querySelectorAll('.mood').forEach(btn=>btn.addEventListener('click',()=>selectMood(btn.dataset.mood)));

  async function requestLandscapeMode(){
    try{
      if(document.documentElement.requestFullscreen && !document.fullscreenElement){
        await document.documentElement.requestFullscreen();
      }
    }catch(e){}
    try{
      if(screen.orientation && typeof screen.orientation.lock==='function'){
        await screen.orientation.lock('landscape');
      }
    }catch(e){}
    return window.matchMedia('(orientation: landscape)').matches;
  }

  async function selectMood(mood){
    state.mood=mood;
    if(mood==='surprise'){
      const picks=['tropical','manhattan','rooftop','hotel'];
      state.bar=picks[Math.floor(Math.random()*picks.length)];
    } else state.bar=moodToBar[mood];
    speak(moodLines[mood]);
    await requestLandscapeMode();
    setTimeout(enterBar,220);
  }

  function makeBottles(){
    const labels=['ROM','GIN','TEQ','WHISKY','VERM','SEC','BITTERS','SIRAP','JUICE','SODA'];
    const colors=['#efefe3','#7fb18c','#caa15d','#8f4f2c','#b1453d','#efb16d','#4a2b26','#d54c66','#eda348','#9de1e8'];
    $('#bottles').innerHTML=labels.map((l,i)=>`<div class="bottle" data-label="${l}" style="background:${colors[i]}"></div>`).join('');
  }

  function enterBar(){
    makeBottles();
    $('#barScene').className=state.bar;
    $('#barScreen').classList.remove('allowPortrait');
    $('#hudPlayer').textContent=`${state.name} · ${state.under18?'alkoholfritt':'18+'}`;
    $('#hudDrink').textContent='Ingen beställning ännu';
    show('barScreen');

    const prompt=`Välkommen till min ${barName(state.bar)}. Vad får det lov att vara? Du kan skriva eller prata.`;
    $('#dialogText').textContent=prompt;
    $('#dialogControls').innerHTML=drinkInputControls();
    wireDialogControls();

    if(window.matchMedia('(orientation: portrait)').matches){
      state.awaitingBarLandscape=true;
      speak('Vrid telefonen vågrätt så fortsätter vi i baren.');
    }else{
      state.awaitingBarLandscape=false;
      speak(prompt);
    }
  }

  function barName(b){return ({tropical:'strandbar',manhattan:'Manhattan-bar',rooftop:'rooftop-bar',hotel:'hotellbar',surprise:'bar'})[b]||'bar'}

  function bartender(text, controls=''){
    $('#dialogText').textContent=text;
    $('#dialogControls').innerHTML=controls;
    speak(text);
    wireDialogControls();
  }

  function drinkInputControls(){
    return `<div class="inputRow"><input id="drinkInput" placeholder="Till exempel Mojito" /><button class="btn" id="orderBtn">Beställ</button><button class="btn secondary" id="micBtn">🎙️</button></div><div class="small">${state.under18?'Endast alkoholfria recept visas.':'Exempel: Mojito, Margarita, Manhattan.'}</div>`;
  }

  function wireDialogControls(){
    const order=$('#orderBtn'); if(order) order.addEventListener('click',()=>orderDrink($('#drinkInput').value));
    const inp=$('#drinkInput'); if(inp) inp.addEventListener('keydown',e=>{if(e.key==='Enter')orderDrink(inp.value)});
    const mic=$('#micBtn'); if(mic) mic.addEventListener('click',startRecognition);
    document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>answerStep(b.textContent,b)));
  }

  function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').trim()}

  function resolveDrink(query){
    const q=normalize(query);
    const aliases={
      'mojito':'mojito','mohito':'mojito','margarita':'margarita','manhattan':'manhattan',
      'virgin mojito':'virgin_mojito','alkoholfri mojito':'virgin_mojito','mocktail mojito':'virgin_mojito',
      'shirley temple':'shirley','tropical cooler':'tropical_cooler','tropisk drink':'tropical_cooler'
    };
    const id=aliases[q]||drinks.find(d=>normalize(d.name)===q)?.id;
    if(!id) return null;
    return drinks.find(d=>d.id===id);
  }

  function suggestedDrinks(){
    return drinks.filter(d=>d.minAge<=state.age && (d.moods.includes(state.mood)||d.moods.includes('surprise'))).slice(0,4);
  }

  function orderDrink(text){
    let d=resolveDrink(text);
    if(!d){
      const suggestions=suggestedDrinks();
      bartender(`Den har jag inte i Version 1 ännu. Prova någon av de här: ${suggestions.map(x=>x.name).join(', ')}.`, drinkInputControls());
      return;
    }
    if(state.under18 && d.minAge>=18){
      const alt = d.id==='mojito' ? drinks.find(x=>x.id==='virgin_mojito') : suggestedDrinks()[0];
      bartender(`Den gör vi inte med alkohol i det här spelläget. Jag kan göra ${alt.name} i stället.`, drinkInputControls());
      return;
    }
    startDrink(d);
  }

  function startDrink(d){
    state.drink=d; state.step=0; state.correct=0; state.wrong=0; state.points=0; state.startedAt=Date.now();
    $('#hudDrink').textContent=d.name;
    bartender(`${d.intro} Du får hjälpa mig bakom baren.`, `<button class="btn" id="beginRecipe">Börja blanda</button>`);
    $('#beginRecipe').addEventListener('click',showStep,{once:true});
  }

  function showStep(){
    const s=state.drink.steps[state.step];
    if(!s){ finishRecipe(); return; }
    const choices=[...s.opts].sort(()=>Math.random()-.5);
    bartender(s.q, `<div class="choices">${choices.map(o=>`<button class="choice">${o}</button>`).join('')}</div><div class="small">Du kan trycka på svaret. Röst för svarsalternativen kan byggas ut vidare.</div>`);
  }

  function answerStep(ans, btn){
    const s=state.drink.steps[state.step];
    const right=normalize(ans)===normalize(s.a);
    document.querySelectorAll('.choice').forEach(x=>x.disabled=true);
    if(right){
      state.correct++; state.points+=10; btn.classList.add('good');
      speak('Rätt!');
      setTimeout(()=>{
        if(s.action==='shake') startShakeAction();
        else { state.step++; showStep(); }
      },500);
    } else {
      state.wrong++; state.points=Math.max(0,state.points-2); btn.classList.add('bad');
      const correctBtn=[...document.querySelectorAll('.choice')].find(x=>normalize(x.textContent)===normalize(s.a)); if(correctBtn) correctBtn.classList.add('good');
      speak(`Inte riktigt. Rätt svar är ${s.a}.`);
      setTimeout(()=>{state.step++;showStep()},1100);
    }
  }

  function startShakeAction(){
    state.action='shake'; state.shakeProgress=0; state.lastMotion=0;
    $('#rotateStage').style.display='block'; $('#shakeStage').style.display='none'; $('#drinkStage').style.display='none';
    $('#rotateTitle').textContent='Vrid telefonen till stående';
    $('#rotateHint').textContent='Nu blir telefonen din shaker.';
    show('actionScreen');
    speak('Nu ska den skakas. Vrid telefonen till stående och skaka ordentligt.');
    if(window.matchMedia('(orientation: portrait)').matches) setTimeout(startShakeStage,350);
  }

  $('#continuePortraitBtn').addEventListener('click',()=>{
    if(state.action==='shake') startShakeStage(); else if(state.action==='drink') startDrinkStage();
  });

  function startShakeStage(){
    $('#rotateStage').style.display='none'; $('#shakeStage').style.display='block';
    state.shakeProgress=0; $('#shakeFill').style.width='0%'; $('#shakeStatus').textContent='0%';
  }

  window.addEventListener('devicemotion',e=>{
    if(!$('#actionScreen').classList.contains('active') || state.action!=='shake' || $('#shakeStage').style.display==='none') return;
    const a=e.accelerationIncludingGravity || e.acceleration;
    if(!a) return;
    const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
    const delta=Math.abs(mag-state.lastMotion); state.lastMotion=mag;
    if(delta>4.2){
      state.shakeProgress=Math.min(100,state.shakeProgress+Math.min(10,delta*.8));
      updateShake();
    }
  },true);

  function updateShake(){
    $('#shakeFill').style.width=state.shakeProgress+'%'; $('#shakeStatus').textContent=Math.round(state.shakeProgress)+'%';
    if(state.shakeProgress>=100){
      state.points+=10;
      setTimeout(()=>{ state.step++; show('barScreen'); bartender('Där ja! Bra skakat. Tillbaka till baren.', `<button class="btn" id="continueRecipe">Fortsätt</button>`); $('#continueRecipe').addEventListener('click',showStep,{once:true}); },350);
    }
  }
  $('#shakeFallback').addEventListener('click',()=>{state.shakeProgress=Math.min(100,state.shakeProgress+20);updateShake()});

  function finishRecipe(){
    bartender('Drinken är färdig. Men det viktigaste återstår – du måste smaka på den.', `<button class="btn" id="tasteBtn">Smaka</button>`);
    $('#tasteBtn').addEventListener('click',startDrinkAction,{once:true});
  }

  function startDrinkAction(){
    state.action='drink'; state.drinkProgress=0; state.lastDrinkBeta=null;
    $('#rotateStage').style.display='block'; $('#shakeStage').style.display='none'; $('#drinkStage').style.display='none';
    $('#rotateTitle').textContent='Vrid telefonen till stående';
    $('#rotateHint').textContent='Nu blir telefonen själva glaset.';
    show('actionScreen');
    speak('Vrid telefonen till stående. Telefonen är nu ditt glas.');
    if(window.matchMedia('(orientation: portrait)').matches) setTimeout(startDrinkStage,350);
  }

  function startDrinkStage(){
    $('#rotateStage').style.display='none'; $('#drinkStage').style.display='block';
    $('#liquid').style.background=`linear-gradient(rgba(255,255,255,.16),${state.drink.color||'#7dcc80'})`;
    updateDrinkVisual();
  }

  window.addEventListener('deviceorientation',e=>{
    if(!$('#actionScreen').classList.contains('active') || state.action!=='drink' || $('#drinkStage').style.display==='none') return;
    const beta=Math.abs(Number(e.beta)||0);
    if(state.lastDrinkBeta===null) state.lastDrinkBeta=beta;
    const tilt=Math.max(0,beta-25);
    if(tilt>18){ state.drinkProgress=Math.min(100,Math.max(state.drinkProgress,(tilt/65)*100)); updateDrinkVisual(); }
  },true);

  function updateDrinkVisual(){
    const p=Math.min(100,state.drinkProgress);
    $('#drinkFill').style.width=p+'%';
    $('#liquid').style.height=Math.max(0,90*(1-p/100))+'%';
    $('#drinkStatus').textContent=p<20?'Glaset är fullt.':p<60?'Du smakar...':p<95?'Nästan tomt...':'Tomt!';
    if(p>=95){
      state.points+=10;
      setTimeout(showResults,500);
    }
  }
  $('#drinkFallback').addEventListener('click',()=>{state.drinkProgress=Math.min(100,state.drinkProgress+20);updateDrinkVisual()});

  function showResults(){
    state.action=null;
    const totalSteps=state.drink.steps.length;
    const accuracy=totalSteps?Math.round(state.correct/totalSteps*70):0;
    const technique=(state.drink.steps.some(s=>s.action==='shake')?15:5) + 5;
    const speedBonus=Math.max(0,10-Math.floor((Date.now()-state.startedAt)/30000));
    const penalty=Math.min(20,state.wrong*4);
    const score=Math.max(0,Math.min(100,accuracy+technique+speedBonus-penalty));
    $('#scoreValue').textContent=score;
    $('#resultTitle').textContent=`${state.drink.name} klar!`;
    $('#resultLine').textContent = score>=90 ? 'Bartendern: Den där hade jag serverat utan att tveka.' : score>=70 ? 'Bartendern: Bra jobbat. Några småsaker kvar till perfektion.' : 'Bartendern: Helt okej – men nästa blir bättre.';
    $('#scoreGrid').innerHTML=`
      <div class="scoreItem">Rätta steg <b>${state.correct}/${totalSteps}</b></div>
      <div class="scoreItem">Felval <b>${state.wrong}</b></div>
      <div class="scoreItem">Teknik <b>${state.drink.steps.some(s=>s.action==='shake')?'Skakad':'Blandad'}</b></div>
      <div class="scoreItem">Smakprov <b>Klart</b></div>`;
    show('resultScreen');
    speak($('#resultLine').textContent);
  }

  $('#anotherBtn').addEventListener('click',()=>{
    show('barScreen'); $('#hudDrink').textContent='Ingen beställning ännu';
    bartender(`Nå ${state.name}, vad blir det nu?`, drinkInputControls());
  });
  $('#changeMoodBtn').addEventListener('click',()=>{
    show('moodScreen'); speak(`Okej ${state.name}, vilket mood vill du ha nu?`);
  });

  function startRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ toast('Taligenkänning stöds inte i den här webbläsaren.'); return; }
    const r=new SR(); r.lang='sv-SE'; r.interimResults=false; r.maxAlternatives=1;
    toast('Lyssnar…');
    r.onresult=e=>{ const t=e.results[0][0].transcript; const inp=$('#drinkInput'); if(inp) inp.value=t; orderDrink(t); };
    r.onerror=()=>toast('Jag hörde inte riktigt. Försök igen eller skriv.');
    try{r.start()}catch(e){}
  }

  $('#tryLandscapeBtn').addEventListener('click',async()=>{
    const ok=await requestLandscapeMode();
    if(!ok) toast('Automatisk rotation blockerades. Vrid mobilen 90° åt sidan.');
  });

  $('#portraitFallbackBtn').addEventListener('click',()=>{
    $('#barScreen').classList.add('allowPortrait');
    if(state.awaitingBarLandscape){
      state.awaitingBarLandscape=false;
      speak($('#dialogText').textContent);
    }
    setTimeout(()=>$('#drinkInput')?.focus(),150);
  });

  function handleOrientation(){
    const landscape=window.matchMedia('(orientation: landscape)').matches;
    if($('#barScreen').classList.contains('active') && landscape && state.awaitingBarLandscape){
      state.awaitingBarLandscape=false;
      $('#barScreen').classList.remove('allowPortrait');
      speak($('#dialogText').textContent);
      setTimeout(()=>$('#drinkInput')?.focus(),120);
    }
    if($('#actionScreen').classList.contains('active') && !landscape){
      if(state.action==='shake' && $('#rotateStage').style.display!=='none') setTimeout(startShakeStage,250);
      if(state.action==='drink' && $('#rotateStage').style.display!=='none') setTimeout(startDrinkStage,250);
    }
  }

  window.addEventListener('orientationchange',handleOrientation);
  window.addEventListener('resize',handleOrientation);
})();
