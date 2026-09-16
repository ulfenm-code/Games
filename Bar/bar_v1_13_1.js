'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens=$$('.screen');
const show=id=>screens.forEach(s=>s.classList.toggle('active',s.id===id));
const state={name:'',age:18,under18:false,difficulty:'easy',mood:'tropical',bar:'tropical',phase:'start',drink:null,step:0,correct:0,wrong:0,points:0,startedAt:0,serving:null,questionFails:0,amountFails:0,conversationIndex:0,conversationAnswers:{},sensorOK:false,action:null,afterAction:null,shakeProgress:0,muddleProgress:0,drinkProgress:0,lastMotion:0,lastMuddle:0,baselineBeta:null,baselineGamma:null,waitingPortrait:false,waitingLandscape:false,returning:false,idleTimer:null,lastRecipeQuestion:'',lastPhrase:'',recipeChatTurns:0};
const drinks=[
{id:'mojito',name:'Mojito',minAge:18,alcoholic:true,intro:'Mojito! Friskt och klassiskt.',steps:[
{q:'Vilken bassprit börjar vi med?',a:'Vit rom',opts:['Vit rom','Gin','Tequila'],amount:{base:4,unit:'cl',label:'vit rom'}},{q:'Vilken citrus ska i?',a:'Lime',opts:['Lime','Citron','Apelsin'],amount:{base:2,unit:'cl',label:'limejuice'}},{q:'Vilken ört hör hemma i en Mojito?',a:'Mynta',opts:['Mynta','Basilika','Rosmarin'],amount:{base:8,unit:'blad',label:'mynta'}},{q:'Vad använder vi för sötma?',a:'Socker',opts:['Socker','Salt','Kaffe'],amount:{base:2,unit:'tsk',label:'socker'}},{q:'Hur behandlar vi lime och mynta först?',a:'Muddla försiktigt',opts:['Muddla försiktigt','Koka','Mixa hårt'],action:'muddle'},{q:'Nu ska allt kylas och blandas. Vad gör vi?',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},{q:'Vilket glas passar bäst?',a:'Highballglas',opts:['Highballglas','Martiniglas','Shotglas']},{q:'Vad toppar vi med?',a:'Sodavatten',opts:['Sodavatten','Mjölk','Cola'],amount:{base:4,unit:'cl',label:'sodavatten'}},{q:'Sista detaljen: vad dekorerar vi med?',a:'Lime och mynta',opts:['Lime och mynta','Oliv','Kanelstång']}]},
{id:'margarita',name:'Margarita',minAge:18,alcoholic:true,intro:'Margarita. Då håller vi koll på syra, sötma och salt.',steps:[{q:'Vilken bassprit börjar vi med?',a:'Tequila',opts:['Tequila','Vodka','Whisky'],amount:{base:4,unit:'cl',label:'tequila'}},{q:'Vilken citrus ska i?',a:'Lime',opts:['Lime','Citron','Grapefrukt'],amount:{base:2,unit:'cl',label:'limejuice'}},{q:'Vilken apelsinlikör används ofta?',a:'Triple sec',opts:['Triple sec','Amaretto','Kahlúa'],amount:{base:2,unit:'cl',label:'triple sec'}},{q:'Vad gör vi med glaskanten?',a:'Saltkant',opts:['Saltkant','Sockerkant','Ingen kant']},{q:'Nu ska den kylas ordentligt.',a:'Skaka',opts:['Skaka','Värm','Rör med sugrör'],action:'shake'},{q:'Vilket glas är rätt?',a:'Margaritaglas',opts:['Margaritaglas','Ölsejdel','Shotglas']},{q:'Vilken garnish passar?',a:'Limeklyfta',opts:['Limeklyfta','Oliv','Myntabukett']}]},
{id:'manhattan',name:'Manhattan',minAge:18,alcoholic:true,intro:'Manhattan. Nu går vi åt det klassiska hållet.',steps:[{q:'Vilken bassprit är grunden?',a:'Whisky',opts:['Whisky','Rom','Gin'],amount:{base:4,unit:'cl',label:'whisky'}},{q:'Vilken förstärkt vin-ingrediens används?',a:'Söt vermouth',opts:['Söt vermouth','Torr cider','Porter'],amount:{base:2,unit:'cl',label:'söt vermouth'}},{q:'Vilken bitter används ofta?',a:'Angostura bitters',opts:['Angostura bitters','Tonic','Grenadin'],amount:{base:2,unit:'stänk',label:'Angostura bitters'}},{q:'Hur blandar vi en klassisk Manhattan?',a:'Rör med is',opts:['Rör med is','Skaka hårt','Mixa']},{q:'Vilket glas serveras den i?',a:'Cocktailglas',opts:['Cocktailglas','Highballglas','Ölglas']},{q:'Vilken garnish passar?',a:'Cocktailkörsbär',opts:['Cocktailkörsbär','Selleri','Gurka']}]},
{id:'virgin_mojito',name:'Virgin Mojito',minAge:0,alcoholic:false,intro:'Virgin Mojito! Friskt och helt alkoholfritt.',steps:[{q:'Vilken citrus börjar vi med?',a:'Lime',opts:['Lime','Citron','Apelsin'],amount:{base:2,unit:'cl',label:'limejuice'}},{q:'Vilken ört använder vi?',a:'Mynta',opts:['Mynta','Timjan','Dill'],amount:{base:8,unit:'blad',label:'mynta'}},{q:'Vad använder vi för sötma?',a:'Sockerlag',opts:['Sockerlag','Saltlag','Kaffe'],amount:{base:2,unit:'cl',label:'sockerlag'}},{q:'Hur behandlar vi lime och mynta?',a:'Muddla försiktigt',opts:['Muddla försiktigt','Koka','Mosa till puré'],action:'muddle'},{q:'Nu ska den kylas och blandas.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},{q:'Vad toppar vi med?',a:'Sodavatten',opts:['Sodavatten','Mjölk','Tomatjuice'],amount:{base:8,unit:'cl',label:'sodavatten'}},{q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Champagneflöjt']}]},
{id:'shirley',name:'Shirley Temple',minAge:0,alcoholic:false,intro:'Shirley Temple – festlig, söt och alkoholfri.',steps:[{q:'Vilken bas använder vi?',a:'Ginger ale',opts:['Ginger ale','Espresso','Tonic'],amount:{base:12,unit:'cl',label:'ginger ale'}},{q:'Vilken söt röd ingrediens ska i?',a:'Grenadin',opts:['Grenadin','Soja','Bitters'],amount:{base:2,unit:'cl',label:'grenadin'}},{q:'Vilken citrus passar?',a:'Lime eller citron',opts:['Lime eller citron','Tomat','Gurka'],amount:{base:1,unit:'cl',label:'citrusjuice'}},{q:'Vilket glas passar?',a:'Highballglas',opts:['Highballglas','Shotglas','Whiskyglas']},{q:'Vad kan vi dekorera med?',a:'Körsbär',opts:['Körsbär','Oliv','Rosmarin']}]},
{id:'tropical_cooler',name:'Tropical Cooler',minAge:0,alcoholic:false,intro:'Tropical Cooler. Fruktigt och friskt.',steps:[{q:'Vilken juice ger tropisk bas?',a:'Ananasjuice',opts:['Ananasjuice','Tomatjuice','Kaffe'],amount:{base:6,unit:'cl',label:'ananasjuice'}},{q:'Vilken citrus ger syra?',a:'Lime',opts:['Lime','Rödbeta','Vanilj'],amount:{base:2,unit:'cl',label:'limejuice'}},{q:'Vilken andra juice passar?',a:'Apelsinjuice',opts:['Apelsinjuice','Mjölk','Soja'],amount:{base:6,unit:'cl',label:'apelsinjuice'}},{q:'Nu kyler vi ordentligt.',a:'Skaka',opts:['Skaka','Värm','Låt stå'],action:'shake'},{q:'Vilket glas?',a:'Highballglas',opts:['Highballglas','Shotglas','Espressokopp']},{q:'Vilken garnish?',a:'Apelsin eller lime',opts:['Apelsin eller lime','Oliv','Kanelstång']}]}
];
const moodToBar={party:'rooftop',tropical:'tropical',classic:'manhattan',elegant:'hotel'};
const moodLines={party:'Festligt? Då behöver vi lite mer puls. Häng med!',tropical:'Tropiskt? Då ska vi ha sol, palmer och bambu. Följ med!',classic:'Lugnt och klassiskt. Då känner jag precis rätt ställe på Manhattan.',elegant:'Elegant och exklusivt. Då flyttar vi oss till en finare hotellbar.',surprise:'Överraska dig? Det är farligt att säga till en bartender. Nu kör vi.'};
const convo=[{key:'how',q:n=>`Så ${n}, hur är läget med dig idag?`},{key:'day',q:()=>`Hur har dagen varit hittills?`},{key:'from',q:()=>`Var kommer du ifrån?`},{key:'work',q:()=>`Vad brukar du göra om dagarna?`},{key:'plans',q:()=>`Och vad händer efter det här – lugn kväll eller något mer på gång?`}];
function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9,.?! ]/g,' ').replace(/\s+/g,' ').trim().replace(/whiskey/g,'whisky').replace(/high ball/g,'highball').replace(/soda vatten/g,'sodavatten').replace(/trippel sek|trippelsek/g,'triple sec')}
function pick(arr){if(!arr.length)return'';let choices=arr.filter(x=>x!==state.lastPhrase);if(!choices.length)choices=arr;const v=choices[Math.floor(Math.random()*choices.length)];state.lastPhrase=v;return v}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function stopSpeech(){try{speechSynthesis.cancel()}catch(e){}}
function speak(text,onEnd){try{if(!('speechSynthesis'in window)){if(onEnd)setTimeout(onEnd,Math.min(4500,900+text.length*38));return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='sv-SE';u.rate=.96;u.pitch=.96;if(onEnd){let done=false;const finish=()=>{if(done)return;done=true;onEnd()};u.onend=finish;u.onerror=finish;setTimeout(finish,Math.max(2300,Math.min(9000,1000+text.length*58)))}speechSynthesis.speak(u)}catch(e){if(onEnd)setTimeout(onEnd,1200)}}
function stopIdle(){clearTimeout(state.idleTimer);state.idleTimer=null}
function scheduleIdle(){stopIdle();if(state.phase!=='chat')return;state.idleTimer=setTimeout(()=>{const line=pick(['Ingen brådska. Jag står kvar här.','Rätt skönt tempo i baren just nu faktiskt.','Säg till om du kommer på något du undrar över.','Du kan beställa mitt i snacket också, jag hänger med.']);$('#dialogText').textContent=line;speak(line,()=>renderConversationInput())},10500+Math.random()*4000)}
function tryOrientation(mode,fullscreen=false){try{screen.orientation?.unlock?.()}catch(e){}const doLock=()=>{try{const p=screen.orientation?.lock?.(mode);if(p&&p.catch)p.catch(()=>{})}catch(e){}};if(fullscreen){try{if(document.fullscreenElement)doLock();else if(document.documentElement.requestFullscreen){const p=document.documentElement.requestFullscreen();if(p&&p.then)p.then(doLock).catch(()=>{});else doLock()}else doLock()}catch(e){doLock()}}else doLock()}
const isPortrait=()=>matchMedia('(orientation: portrait)').matches,isLandscape=()=>matchMedia('(orientation: landscape)').matches;
function updateOrientationBanner(){const b=$('#orientationBanner');if(b)b.style.display=isPortrait()?'flex':'none'}
async function requestSensors(){let ok=true;try{if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function')ok=(await DeviceMotionEvent.requestPermission())==='granted'&&ok;if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')ok=(await DeviceOrientationEvent.requestPermission())==='granted'&&ok}catch(e){ok=false}state.sensorOK=ok;toast(ok?'Sensorer aktiverade.':'Sensorer kunde inte aktiveras – reservknappar finns.');return ok}
function makeBottles(){const labels=['ROM','GIN','TEQ','WHISKY','VERM','SEC','BITTER','SIRAP','JUICE','SODA'],colors=['#eee8d8','#72a67f','#c89a55','#82502f','#ad4b43','#edb06e','#49302b','#d64d68','#e8a346','#9bdde5'];$('#bottles').innerHTML=labels.map((x,i)=>`<div class="bottle" data-label="${x}" style="background:${colors[i]}"></div>`).join('')}
function barName(b){return({tropical:'strandbar',manhattan:'Manhattan-bar',rooftop:'rooftop-bar',hotel:'hotellbar'})[b]||'bar'}
function diffLabel(){return state.difficulty==='easy'?'Lätt':state.difficulty==='medium'?'Medel':'Svår'}
function updateHud(){const serv=state.difficulty==='hard'&&state.serving&&state.drink?.alcoholic?` · ${state.serving}:a`:'';$('#hudPlayer').textContent=`${state.name} · ${state.under18?'alkoholfritt':'18+'} · ${diffLabel()}${serv}`;$('#hudDrink').textContent=state.drink?state.drink.name:'Ingen beställning ännu'}
function isRepeatRequest(text){const x=normalize(text);return /upprepa|sag igen|ta om|fragan igen|vad sa du|vad var fragan|kan du ta den igen|en gang till|va\??$/.test(x)}
function answerBartenderQuestion(x){if(/hur ar laget med dig|hur mar du|sjalv da|och du|hur har du det|laget med dig/.test(x))return pick(['Med mig är det fint, tack. Lagom med folk och bra musik – svårt att klaga då.','Jo tack, bra faktiskt. Lite spring bakom baren, men det är ju halva charmen.','Jag mår bra. Har fått i mig kaffe och ingen har tappat ett glas än, så dagen är godkänd.']);if(/har du haft en bra dag|hur har din dag varit|fin dag/.test(x))return pick(['Jodå, bra dag. Lite hektiskt en stund, men nu är tempot bättre.','Faktiskt en rätt fin dag. Sådana ska man ta vara på.','Jo, absolut. Jag har haft värre pass bakom baren, om man säger så.']);if(/var kommer du ifran|var ar du ifran/.test(x))return pick(['Jag brukar säga att jag kommer från den här sidan av bardisken. Jag har jobbat på några olika ställen och snappat upp lite överallt.','Lite här och där faktiskt. Bartendrar flyttar runt mer än man tror.','Från början? Det håller jag nästan lite mystiskt. Men jag har stått bakom fler bardiskar än den här.']);if(/vad gor du|vad jobbar du med/.test(x))return pick(['Just nu försöker jag hålla koll på glas, is, flaskor och samtalet med dig. Ganska typiskt bartenderjobb.','Jag blandar drinkar och lyssnar på folk. Ibland är den andra delen nästan större än den första.','Ungefär det här – håller baren flytande och försöker komma ihåg vem som beställde vad.']);if(/vad heter du|vem ar du/.test(x))return pick(['Du kan kalla mig bartendern tills vidare. Lite mystik måste jag få behålla.','Bartendern duger fint. Namnskylten verkar ha fått ledigt idag.']);return''}
function recipeOptionGuess(text,opts){
  const x=normalize(text); if(!x)return null;
  let best=null,bestScore=0;
  for(const o of opts){const sc=scoreMatch(text,o);if(sc>bestScore){bestScore=sc;best=o}}
  return bestScore>=62?{option:best,score:bestScore}:null
}
function explicitAnswerIntent(text){const x=normalize(text);return /^(jag tror|jag sager|mitt svar|svaret ar|det ar|jag valjer|jag tar|kanske|nog |vi tar|vi kor|ta )\b/.test(x)}
function looksLikeSmallTalk(text,step=null){
  const x=normalize(text); if(!x)return false;
  if(isRepeatRequest(text))return false;
  if(step&&recipeOptionGuess(text,step.opts))return false;
  if(/[?]$/.test(x))return true;
  if(/^(hej|tjena|halla|hallå|laget|läget|hur|varfor|varför|var|vem|nar|när|kanner du|känner du|bor du|brukar du|har du|ar du|är du|kan du|gillar du|tycker du|vad heter|vad gor|vad gör|vad gillar|vad tycker|vilken ar din|vilken är din)/.test(x))return true;
  if(/\b(kalle|kompis|van|vän|familj|barn|fru|man|sambo|bor|stan|hemma|jobb|musik|fotboll|vader|väder|semester|ledig|helg|kul har|roligt har|mycket folk|lugnt har|bra musik)\b/.test(x))return true;
  return !explicitAnswerIntent(text)
}
function extractKnownPerson(x){
  const m=x.match(/kann?er du\s+([a-zåäö][a-zåäö-]{1,20})/i);return m?m[1]:''
}
function answerBartenderQuestionV110(text){
  const x=normalize(text), who=extractKnownPerson(x);
  if(who){const cap=who.charAt(0).toUpperCase()+who.slice(1);return pick([`${cap}? Namnet låter bekant, men här passerar rätt mycket folk. Är det någon som brukar hänga här?`,`${cap}... jag känner igen namnet, men jag vågar inte svära på att det är samma person.`,`${cap}? Kanske. Beskriv personen lite, så kanske poletten trillar ner.`])}
  if(/var bor du|vart bor du/.test(x))return pick(['Jag bor inne i stan, ungefär en kvart härifrån. Smidigt när man jobbar sena kvällar.','Ganska centralt faktiskt. Jag vill kunna ta mig hem utan ett helt projekt efter stängning.','Inte långt härifrån. Några kvarter bort åt stan till.']);
  if(/bor du i stan|bor du har|bor du här/.test(x))return pick(['Ja, ganska centralt. Det passar rätt bra med de här arbetstiderna.','Japp, inne i stan. Jag har kortare väg hem än många av gästerna.','Ungefär. Inte mitt i smeten, men tillräckligt nära för att kunna gå hem.']);
  if(/hur lange har du jobbat|hur länge har du jobbat|jobbat har lange|jobbat här länge/.test(x))return pick(['Några år nu. Tillräckligt länge för att känna igen stamgästerna på stegen.','Ett bra tag. Man lär sig ganska snabbt vem som vill prata och vem som bara vill ha sitt glas.','Flera år bakom disk totalt. Just här har det blivit ett tag också.']);
  if(/gillar du jobbet|trivs du|kul att jobba/.test(x))return pick(['Ja, faktiskt. Det bästa är blandningen av hantverket och alla märkliga samtal man hamnar i.','Jag trivs. Ingen kväll är riktigt den andra lik.','Absolut. Jag hade inte stått kvar annars. Folk är halva jobbet.']);
  if(/favoritdrink|favorit drink|vad dricker du|vad gillar du att dricka/.test(x))return pick(['En riktigt bra Manhattan är svårslagen när jag är ledig.','Jag varierar, men något enkelt och välbalanserat slår det mesta.','Beror på kvällen. Jag gillar drinkar där man faktiskt känner råvarorna.']);
  if(/har du barn|familj|sambo|fru|man/.test(x))return pick(['Jag håller lite på privatlivet bakom baren, men jag har folk jag gärna kommer hem till efter passet.','Lite hemligheter får bartendern behålla också. Men ja, jag har människor nära mig.','Det där är nästan en andra-drinken-fråga. Men jag är inte helt ensam i världen.']);
  const direct=answerBartenderQuestion(x); if(direct)return direct;
  return ''
}
function smallTalkReply(text){
  const x=normalize(text),direct=answerBartenderQuestionV110(text);if(direct)return direct;
  if(/^(hej|tjena|halla|hallå)/.test(x))return pick(['Tjena! Jag är med dig.','Hej där. Jag lyssnar.','Jajamän, jag är kvar.']);
  if(/^(laget|läget)|hur ar laget/.test(x))return pick(['Jo tack, fint. Lite lagom tempo bakom baren just nu.','Bra faktiskt. Jag gillar när man hinner prata samtidigt som man jobbar.','Det är bra. Jag står här och försöker se ut som att jag har full koll.']);
  if(/bra|fint|toppen|kanon|perfekt/.test(x))return pick(['Härligt. Det hörs nästan på rösten.','Bra! Sånt gillar man att höra.','Skönt att höra.']);
  if(/daligt|jobbigt|trott|stress|sliten/.test(x))return pick(['Då tar vi det lite lugnt här. Ingen brådska.','Jag fattar. Då får baren vara en liten paus.','Sådana dagar finns. Vi håller tempot behagligt.']);
  if(/[?]$/.test(x)||/^(vad|vem|var|hur|nar|när|varfor|varför|kan|har|ar|är|gillar|tycker)/.test(x))return pick(['Bra fråga. Jag får fundera en sekund... jag har inget klockrent svar, men jag lyssnar gärna på din version.','Det där har jag faktiskt inte tänkt så mycket på. Vad tror du själv?','Haha, den frågan får jag inte varje kväll. Berätta hur du tänker.']);
  return pick(['Jaså? Berätta mer.','Jag hör dig. Fortsätt.','Mm, jag fattar. Vad hände sen?','Det där låter som en historia. Kör vidare.','Okej, nu blev jag nyfiken. Berätta.'])
}
function bridgeBackToQuestion(q){return pick([`När du vill fortsätta med drinken ligger frågan kvar: ${q}`,`Ingen stress med receptet. Frågan ligger kvar när du är redo: ${q}`,`Vi kan snacka vidare. Drinkfrågan väntar: ${q}`])}
function spokenAlias(text){let x=normalize(text);const map=[[/^rom$/,'vit rom'],[/^soda$/,'sodavatten'],[/^highball$/,'highballglas'],[/^martini$/,'martiniglas'],[/^cocktail$/,'cocktailglas'],[/^salt$/,'saltkant'],[/^ror$|^rora$/,'ror med is']];for(const[r,v]of map)if(r.test(x))return v;return x}
function scoreMatch(a,b){const h=spokenAlias(a),o=normalize(b);if(!h||!o)return 0;if(h===o)return 100;if(o.includes(h)||h.includes(o))return 90;const hs=new Set(h.split(' ')),os=new Set(o.split(' '));let c=0;hs.forEach(t=>{if(os.has(t))c++});return c?70*c/Math.max(1,Math.min(hs.size,os.size)):0}
function bestOption(text,opts){let best=null,score=0;for(const o of opts){const s=scoreMatch(text,o);if(s>score){score=s;best=o}}return score>=55?best:null}
const mediumAliases={
  'muddla forsiktigt':['muddla','muddla mynta','muddla lime','stöta','stota','mosa lite'],
  'ror med is':['ror','rora','ror om','stirra'],
  'saltkant':['salt','salta kanten','salt pa kanten'],
  'sot vermouth':['vermouth','sot vermouth'],
  'angostura bitters':['angostura','bitters'],
  'triple sec':['triple sec','apelsinlikor','apelsinlikör'],
  'cocktailkorsbar':['korsbar','cocktailkorsbar'],
  'limeklyfta':['lime','limeklyfta'],
  'lime eller citron':['lime','citron'],
  'apelsin eller lime':['apelsin','lime'],
  'highballglas':['highball','highballglas'],
  'margaritaglas':['margarita glas','margaritaglas'],
  'cocktailglas':['cocktail','cocktailglas']
};
function stripLeadIn(text){return normalize(text).replace(/^(jag tror|jag sager|mitt svar ar|svaret ar|det ar|jag valjer|jag tar|kanske|nog|vi tar|vi kor)\s+/,'').trim()}
function correctForDifficulty(text,s){
  const x=stripLeadIn(text),a=normalize(s.a);
  if(!x)return false;
  if(state.difficulty==='hard'){
    const required=a.split(' ').filter(w=>!['och','eller','med','i','en','ett'].includes(w));
    return required.every(w=>x.includes(w));
  }
  if(x===a||a.includes(x)||x.includes(a)){
    if(a.includes(' och ')){
      const req=a.split(' och ').map(v=>v.trim()); return req.every(v=>x.includes(v));
    }
    return true
  }
  const aliases=mediumAliases[a]||[];
  return aliases.some(v=>x===normalize(v)||x.includes(normalize(v)))
}
function wrongOptionForStep(text,s){
  const guess=recipeOptionGuess(text,s.opts);if(!guess)return null;
  return normalize(guess.option)!==normalize(s.a)?guess.option:null
}
