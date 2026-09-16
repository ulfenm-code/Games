(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const mode = {
    difficulty: 'easy',
    drink: '',
    serving: null,
    sizePromptedFor: ''
  };

  const difficultyText = {
    easy: 'Lätt: välj mellan tre alternativ eller säg svaret.',
    medium: 'Medel: inga svarsalternativ visas. Skriv eller säg svaret själv.',
    hard: 'Svår: inga svarsalternativ visas. Du måste också kunna mängderna i receptet.'
  };

  const hardRecipes = {
    'Mojito': {
      alcoholic: true,
      amounts: [
        {q:'Vilken bassprit börjar vi med?', answer:'Vit rom', label:'vit rom', base:4, unit:'cl'},
        {q:'Vilken citrus ska i?', answer:'Lime', label:'limejuice', base:2, unit:'cl'},
        {q:'Vilken ört hör hemma i en Mojito?', answer:'Mynta', label:'mynta', base:8, unit:'blad'},
        {q:'Vad använder vi för sötma?', answer:'Socker', label:'socker', base:2, unit:'tsk'},
        {q:'Vad toppar vi med?', answer:'Sodavatten', label:'sodavatten', base:4, unit:'cl'}
      ]
    },
    'Margarita': {
      alcoholic: true,
      amounts: [
        {q:'Vilken bassprit börjar vi med?', answer:'Tequila', label:'tequila', base:4, unit:'cl'},
        {q:'Vilken citrus ska i?', answer:'Lime', label:'limejuice', base:2, unit:'cl'},
        {q:'Vilken apelsinlikör används ofta?', answer:'Triple sec', label:'triple sec', base:2, unit:'cl'}
      ]
    },
    'Manhattan': {
      alcoholic: true,
      amounts: [
        {q:'Vilken bassprit är grunden?', answer:'Whisky', label:'whisky', base:4, unit:'cl'},
        {q:'Vilken förstärkt vin-ingrediens används?', answer:'Söt vermouth', label:'söt vermouth', base:2, unit:'cl'},
        {q:'Vilken bitter används ofta?', answer:'Angostura bitters', label:'Angostura bitters', base:2, unit:'stänk'}
      ]
    },
    'Virgin Mojito': {
      alcoholic: false,
      amounts: [
        {q:'Vilken citrus börjar vi med?', answer:'Lime', label:'limejuice', base:2, unit:'cl'},
        {q:'Vilken ört använder vi?', answer:'Mynta', label:'mynta', base:8, unit:'blad'},
        {q:'Vad använder vi för sötma?', answer:'Sockerlag', label:'sockerlag', base:2, unit:'cl'},
        {q:'Vad toppar vi med?', answer:'Sodavatten', label:'sodavatten', base:8, unit:'cl'}
      ]
    },
    'Shirley Temple': {
      alcoholic: false,
      amounts: [
        {q:'Vilken bas använder vi?', answer:'Ginger ale', label:'ginger ale', base:12, unit:'cl'},
        {q:'Vilken söt röd ingrediens ska i?', answer:'Grenadin', label:'grenadin', base:2, unit:'cl'},
        {q:'Vilken citrus passar?', answer:'Lime eller citron', label:'citrusjuice', base:1, unit:'cl'}
      ]
    },
    'Tropical Cooler': {
      alcoholic: false,
      amounts: [
        {q:'Vilken juice ger tropisk bas?', answer:'Ananasjuice', label:'ananasjuice', base:6, unit:'cl'},
        {q:'Vilken citrus ger syra?', answer:'Lime', label:'limejuice', base:2, unit:'cl'},
        {q:'Vilken andra juice passar?', answer:'Apelsinjuice', label:'apelsinjuice', base:6, unit:'cl'}
      ]
    }
  };

  function normalize(text){
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9,. ]/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .replace(/whiskey/g,'whisky')
      .replace(/high ball/g,'highball')
      .replace(/martini glas/g,'martiniglas')
      .replace(/cocktail glas/g,'cocktailglas')
      .replace(/margarita glas/g,'margaritaglas')
      .replace(/soda vatten/g,'sodavatten')
      .replace(/trippel sek|trippelsek/g,'triple sec');
  }

  function spokenAlias(text){
    const x = normalize(text);
    const aliases = [
      [/^rom$/, 'vit rom'],
      [/^soda$/, 'sodavatten'],
      [/^highball$/, 'highballglas'],
      [/^martini$/, 'martiniglas'],
      [/^cocktail$/, 'cocktailglas'],
      [/^salt$/, 'saltkant'],
      [/^muddla$/, 'muddla forsiktigt'],
      [/^ror$|^rora$|^rora med is$/, 'ror med is'],
      [/^lime mynta$|^lime och mynta$/, 'lime och mynta'],
      [/^lime citron$|^lime eller citron$/, 'lime eller citron'],
      [/^apelsin lime$|^apelsin eller lime$/, 'apelsin eller lime']
    ];
    for(const [re,val] of aliases) if(re.test(x)) return val;
    return x;
  }

  function scoreMatch(heard, option){
    const h = spokenAlias(heard);
    const o = normalize(option);
    if(!h || !o) return 0;
    if(h === o) return 100;
    if(o.includes(h) || h.includes(o)) return 90;
    const ht = new Set(h.split(' ').filter(Boolean));
    const ot = new Set(o.split(' ').filter(Boolean));
    let common = 0;
    ht.forEach(t => { if(ot.has(t)) common++; });
    return common ? Math.round(70 * common / Math.max(1, Math.min(ht.size,ot.size))) : 0;
  }

  function bestChoice(text, choices){
    let best = null, score = 0;
    for(const b of choices){
      const s = scoreMatch(text,b.textContent);
      if(s > score){ score=s; best=b; }
    }
    return score >= 55 ? best : null;
  }

  function speak(text){
    try{
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang='sv-SE'; u.rate=.97;
      speechSynthesis.speak(u);
    }catch(e){}
  }

  function recognize(onResult, button, status){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ if(status) status.textContent='Taligenkänning stöds inte i den här webbläsaren.'; return; }
    try{
      if('speechSynthesis' in window) speechSynthesis.cancel();
      const r = new SR();
      r.lang='sv-SE'; r.interimResults=false; r.maxAlternatives=3;
      const old = button ? button.textContent : '';
      r.onstart=()=>{ if(button){button.textContent='🎙️ Lyssnar…';button.disabled=true;} if(status)status.textContent='Jag lyssnar…'; };
      r.onerror=e=>{ if(status)status.textContent=e.error==='not-allowed'?'Mikrofonen är blockerad. Tillåt mikrofonåtkomst och försök igen.':'Jag hörde inte tydligt. Försök igen.'; };
      r.onend=()=>{ if(button&&document.body.contains(button)){button.textContent=old;button.disabled=false;} };
      r.onresult=e=>{
        const alternatives=[];
        for(let i=0;i<e.results[0].length;i++) alternatives.push(e.results[0][i].transcript);
        onResult(alternatives);
      };
      r.start();
    }catch(e){ if(status) status.textContent='Mikrofonen kunde inte startas.'; }
  }

  $$('.difficultyBtn').forEach(btn=>btn.addEventListener('click',()=>{
    mode.difficulty=btn.dataset.difficulty;
    $$('.difficultyBtn').forEach(x=>x.classList.toggle('selected',x===btn));
    $('#difficultyHelp').textContent=difficultyText[mode.difficulty];
    try{sessionStorage.setItem('barDifficulty',mode.difficulty)}catch(e){}
  }));

  try{
    const saved=sessionStorage.getItem('barDifficulty');
    if(['easy','medium','hard'].includes(saved)){
      mode.difficulty=saved;
      $$('.difficultyBtn').forEach(x=>x.classList.toggle('selected',x.dataset.difficulty===saved));
      $('#difficultyHelp').textContent=difficultyText[saved];
    }
  }catch(e){}

  function modeLabel(){return mode.difficulty==='easy'?'Lätt':mode.difficulty==='medium'?'Medel':'Svår'}

  function decorateHud(){
    const hud=$('#hudPlayer');
    if(!hud || !hud.textContent || hud.textContent==='Spelare') return;
    const base=hud.textContent.replace(/ · (Lätt|Medel|Svår)( · [468]:a)?$/,'');
    const size=mode.difficulty==='hard'&&mode.serving&&hardRecipes[mode.drink]?.alcoholic?` · ${mode.serving}:a`:'';
    hud.textContent=`${base} · ${modeLabel()}${size}`;
  }

  function injectEasyVoice(controls, choices){
    if(controls.querySelector('#answerMicBtn15')) return;
    const row=document.createElement('div');
    row.className='freeAnswerRow'; row.style.marginTop='10px';
    const btn=document.createElement('button'); btn.className='btn secondary'; btn.id='answerMicBtn15'; btn.textContent='🎙️ Säg svaret';
    const status=document.createElement('span'); status.className='freeAnswerStatus'; status.textContent='Tryck på ett alternativ eller säg svaret.';
    btn.onclick=()=>recognize(alts=>{
      let found=null, heard=alts[0]||'';
      for(const a of alts){const m=bestChoice(a,choices);if(m){found=m;heard=a;break;}}
      if(found){status.textContent=`Jag hörde: “${heard}” → ${found.textContent}`;setTimeout(()=>found.click(),250)}
      else status.textContent=`Jag hörde: “${heard}”, men kunde inte koppla det till något svar.`;
    },btn,status);
    row.append(btn,status);controls.appendChild(row);
  }

  function getQuestionText(choices){return choices.dataset.question15 || $('#dialogText')?.textContent || ''}

  function renderFreeAnswer(controls, choices){
    if(controls.querySelector('#freeAnswerRow15')) return;
    choices.style.display='none';
    choices.dataset.question15 = $('#dialogText')?.textContent || '';
    const row=document.createElement('div'); row.id='freeAnswerRow15'; row.className='freeAnswerRow';
    const input=document.createElement('input'); input.id='freeAnswer15'; input.placeholder=mode.difficulty==='hard'?'Skriv svaret själv':'Skriv ingrediensen eller svaret';
    const send=document.createElement('button'); send.className='btn'; send.textContent='Svara';
    const mic=document.createElement('button'); mic.className='btn secondary'; mic.textContent='🎙️';
    const status=document.createElement('div'); status.className='freeAnswerStatus'; status.textContent=mode.difficulty==='hard'?'Svår: inga alternativ visas.':'Medel: inga alternativ visas.';
    const submit=text=>submitFreeAnswer(text,choices,status);
    send.onclick=()=>submit(input.value);
    input.onkeydown=e=>{if(e.key==='Enter')submit(input.value)};
    mic.onclick=()=>recognize(alts=>{input.value=alts[0]||'';submit(alts[0]||'')},mic,status);
    row.append(input,send,mic,status);controls.appendChild(row);
  }

  function parseNumber(text){
    let x=normalize(text).replace(',','.');
    const words={
      'en':1,'ett':1,'ettan':1,'tva':2,'två':2,'tre':3,'fyra':4,'fyran':4,'fem':5,'sex':6,'sexa':6,'sexan':6,'sju':7,'atta':8,'åtta':8,'attan':8,'nian':9,'nio':9,'tio':10,'tolv':12,'sexton':16
    };
    if(words[x]!==undefined) return words[x];
    for(const [w,n] of Object.entries(words)) if(x.includes(w)) return n;
    const m=x.match(/\d+(?:\.\d+)?/);
    return m?Number(m[0]):NaN;
  }

  function formatAmount(n,unit){
    const val=Number.isInteger(n)?String(n):String(Math.round(n*10)/10).replace('.',',');
    return `${val} ${unit}`;
  }

  function currentRecipe(){return hardRecipes[mode.drink]||null}

  function amountSpec(question, choiceText){
    const r=currentRecipe(); if(!r) return null;
    return r.amounts.find(a=>normalize(question).startsWith(normalize(a.q)) && normalize(choiceText)===normalize(a.answer)) || null;
  }

  function ensureHardServing(){
    if(mode.difficulty!=='hard') return;
    const drink=$('#hudDrink')?.textContent?.trim();
    if(!drink || drink==='Ingen beställning ännu' || !hardRecipes[drink]) return;
    if(mode.drink!==drink){mode.drink=drink;mode.serving=null;mode.sizePromptedFor='';}
    if(mode.serving || mode.sizePromptedFor===drink) return;
    mode.sizePromptedFor=drink;
    setTimeout(()=>showServingPrompt(drink),100);
  }

  function showOverlay(title,text,placeholder,onSubmit){
    document.querySelector('.hardPromptOverlay')?.remove();
    const wrap=document.createElement('div'); wrap.className='hardPromptOverlay';
    wrap.innerHTML=`<div class="hardPromptCard"><h3>${title}</h3><p>${text}</p><div class="hardPromptRow"><input id="hardPromptInput" placeholder="${placeholder}"><button class="btn" id="hardPromptSend">Svara</button><button class="btn secondary" id="hardPromptMic">🎙️</button></div><div class="hardPromptStatus" id="hardPromptStatus"></div></div>`;
    document.body.appendChild(wrap);
    const input=$('#hardPromptInput'),send=$('#hardPromptSend'),mic=$('#hardPromptMic'),status=$('#hardPromptStatus');
    const submit=()=>onSubmit(input.value,status,wrap);
    send.onclick=submit; input.onkeydown=e=>{if(e.key==='Enter')submit()};
    mic.onclick=()=>recognize(alts=>{input.value=alts[0]||'';onSubmit(input.value,status,wrap)},mic,status);
    setTimeout(()=>input.focus(),120);
    return wrap;
  }

  function showServingPrompt(drink){
    const r=hardRecipes[drink]; if(!r) return;
    const text=r.alcoholic
      ? `${drink}. På svår nivå bestämmer vi först basmängden. Vill du göra en fyra, sexa eller åtta? Skriv eller säg 4, 6 eller 8.`
      : `${drink}. På svår nivå bestämmer vi först storleken. Vill du göra en liten, mellan eller stor?`;
    speak(text);
    showOverlay('Bartendern',text,r.alcoholic?'4, 6 eller 8':'liten, mellan eller stor',(value,status,wrap)=>{
      let n;
      const x=normalize(value);
      if(!r.alcoholic){if(x.includes('liten'))n=4;else if(x.includes('mellan'))n=6;else if(x.includes('stor'))n=8;}
      if(!n)n=parseNumber(value);
      if(![4,6,8].includes(n)){status.textContent=r.alcoholic?'Svara 4, 6 eller 8.':'Svara liten, mellan eller stor.';return;}
      mode.serving=n; decorateHud(); wrap.remove();
      const reply=r.alcoholic?`${n}:a, perfekt. Då skalar vi resten av receptet efter det.`:`Bra. Då kör vi ${n===4?'liten':n===6?'mellan':'stor'}.`;
      speak(reply);
    });
  }

  function askAmount(spec,button,question,status){
    const scale=(mode.serving||4)/4;
    const expected=spec.base*scale;
    const sizeText=hardRecipes[mode.drink]?.alcoholic?`${mode.serving}:an`:mode.serving===4?'den lilla':mode.serving===6?'mellanstorleken':'den stora';
    const text=`Bra, ${button.textContent}. Hur mycket ${spec.label} ska vi ha till ${sizeText}?`;
    speak(text);
    showOverlay('Bartendern',text,`Mängd i ${spec.unit}`,(value,st,wrap)=>{
      const n=parseNumber(value);
      if(!Number.isFinite(n) || Math.abs(n-expected)>.11){
        st.textContent='Inte riktigt. Försök igen.';
        speak('Inte riktigt. Tänk på proportionerna och försök igen.');
        return;
      }
      st.textContent=`Rätt: ${formatAmount(expected,spec.unit)}.`;
      status.textContent=`Rätt mängd: ${formatAmount(expected,spec.unit)}.`;
      speak(`Precis. ${formatAmount(expected,spec.unit)}.`);
      setTimeout(()=>{wrap.remove();button.click();},600);
    });
  }

  function submitFreeAnswer(text,choices,status){
    const buttons=[...choices.querySelectorAll('.choice')];
    const match=bestChoice(text,buttons);
    if(!match){status.textContent=`Jag känner inte igen “${text}” som ett svar på frågan.`;return;}
    status.textContent=`Jag tolkar ditt svar som: ${match.textContent}.`;
    if(mode.difficulty==='hard'){
      ensureHardServing();
      if(!mode.serving){status.textContent='Välj först storlek/styrka i bartenderns fråga.';return;}
      const q=getQuestionText(choices);
      const spec=amountSpec(q,match.textContent);
      if(spec){askAmount(spec,match,q,status);return;}
    }
    setTimeout(()=>match.click(),220);
  }

  function enhanceQuestion(){
    decorateHud();
    const controls=$('#dialogControls'); if(!controls) return;
    const choices=controls.querySelector('.choices'); if(!choices) return;
    if(!choices.dataset.question15) choices.dataset.question15=$('#dialogText')?.textContent||'';
    if(mode.difficulty==='easy'){
      choices.style.display='grid';
      injectEasyVoice(controls,[...choices.querySelectorAll('.choice')]);
    }else{
      renderFreeAnswer(controls,choices);
      if(mode.difficulty==='hard') ensureHardServing();
    }
  }

  const controls=$('#dialogControls');
  if(controls){new MutationObserver(()=>setTimeout(enhanceQuestion,0)).observe(controls,{childList:true,subtree:true});}
  const drinkHud=$('#hudDrink');
  if(drinkHud){new MutationObserver(()=>{
    const d=drinkHud.textContent.trim();
    if(d!==mode.drink){mode.drink=d;mode.serving=null;mode.sizePromptedFor='';}
    setTimeout(()=>{decorateHud();enhanceQuestion();},50);
  }).observe(drinkHud,{childList:true,characterData:true,subtree:true});}
  const playerHud=$('#hudPlayer'); if(playerHud)new MutationObserver(decorateHud).observe(playerHud,{childList:true,characterData:true,subtree:true});

  setInterval(()=>{decorateHud();enhanceQuestion();},900);
  setTimeout(enhanceQuestion,400);
})();