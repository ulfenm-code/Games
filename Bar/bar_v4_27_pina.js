'use strict';
/* Bar Game v4.17 Piña Colada – Mojito-style taste-ready flow and simulator-accurate garnish. */
(function(){
 const api=window.__barTools417||window.__barTools416||window.__barTools415||window.__barTools414,gar=window.__barGarnish417||window.__barGarnish416;if(!api)return;
 const menu=drinkMenuCatalog.find(d=>d.id==='pinaColada');if(menu)menu.buildable=true;buildableDrinkIds.add('pinaColada');
 if(!drinks.some(d=>d.id==='pinaColada'))drinks.unshift({id:'pinaColada',name:'Piña Colada',minAge:18,alcoholic:true,steps:[
  {q:'Vilket verktyg ska användas?',a:'Mixer',opts:['Mixer','Shaker','Barsked']},
  {q:'Vilken rom ska hällas i mixern?',a:'Vit rom',opts:['Vit rom','Blackstrap-rom','Lagrad jamaicansk rom']},
  {q:'Trevalsfråga: vilka två ingredienser ska tillsättas tillsammans?',a:'Kokosgrädde och ananasjuice',opts:['Kokosgrädde och ananasjuice','Kokosgrädde och apelsinjuice','Ananasjuice och limejuice'],directChoices:true},
  {q:'Vad ska läggas i mixern före mixningen?',a:'Is',opts:['Is','Salt','Mynta']},
  {q:'Vad gör vi nu?',a:'Mixa kraftigt',opts:['Mixa kraftigt','Skaka','Rör om'],directChoices:true},
  {q:'Vilket glas ska användas?',a:'Highballglas',opts:['Highballglas','Rocks-glas','Tiki-glas']},
  {q:'Vad ska Piña Coladan garneras med?',a:'Ananasskiva och cocktailkörsbär',opts:['Ananasskiva och cocktailkörsbär','Ananasskiva och mynta','Lime och cocktailkörsbär']}
 ]});

 const group=()=>document.getElementById('mixerGroup414');
 const content=()=>api.mixerContent?.()||group()?.querySelector('.mixerContent415');
 const mixerLiquid=()=>content()?.querySelector('.mixerLiquid415');
 const mixerIce=()=>content()?.querySelector('.mixerIce415');
 const mixerFoam=()=>content()?.querySelector('.mixerFoam415');
 const glass=()=>document.getElementById('highballGroup');
 const glassFill=()=>document.getElementById('glassLiquidFill');
 const glassIce=()=>document.getElementById('glassIceLayer');
 const garnish=()=>document.getElementById('glassGarnishLayer');
 let poured=false,mixBusy=false,glassHome=null,mixerLevel=0;

 function current(){return state.drink?.id==='pinaColada'?state.drink.steps?.[state.step]||null:null}
 function setTransition(el,ms){if(el)el.style.transition='height '+Math.max(0,Number(ms)||0)+'ms ease,background .6s ease,opacity .35s ease'}
 function setMixerLevel(level,ms=600,kind='pina'){
   mixerLevel=Math.max(0,Math.min(100,Number(level)||0));
   const l=mixerLiquid();if(!l)return;setTransition(l,ms);
   l.style.opacity=mixerLevel>0?'.92':'0';
   l.style.background=kind==='rum'?'linear-gradient(to top,rgba(239,245,234,.46),rgba(255,255,245,.30))':kind==='mixed'?'linear-gradient(to top,rgba(255,222,112,.98),rgba(255,247,196,.94))':'linear-gradient(to top,rgba(249,204,78,.97),rgba(255,235,148,.90))';
   requestAnimationFrame(()=>{l.style.height=mixerLevel+'%'})
 }
 function buildIce(layer,count=9){
   if(!layer)return;layer.innerHTML='';
   const pos=[[13,67,-16],[38,58,12],[63,72,-7],[24,42,19],[52,36,-20],[70,49,8],[15,25,-8],[42,20,15],[65,18,-12],[31,76,7]];
   for(let i=0;i<count;i++){const s=document.createElement('span'),p=pos[i%pos.length];s.style.left=p[0]+'%';s.style.top=p[1]+'%';s.style.transform='rotate('+p[2]+'deg)';s.style.animationDelay=(i*.04)+'s';layer.appendChild(s)}
 }
 function showMixerIce(on){const l=mixerIce();if(!l)return;if(on&&!l.children.length)buildIce(l,10);l.style.display=on?'block':'none';l.style.opacity=on?'1':'0'}
 function resetMixer(){const c=content();if(c)c.classList.remove('mixing415');setMixerLevel(0,0,'rum');showMixerIce(false);const f=mixerFoam();if(f){f.style.height='0';f.style.opacity='0'}}
 function animateJuices(){const el=document.getElementById('dialogText');if(el)el.textContent='Kokosgrädde och ananasjuice hälls i mixern.';setMixerLevel(68,1150,'pina');return new Promise(r=>setTimeout(r,1180))}
 function animateIce(){showMixerIce(true);setMixerLevel(76,650,'pina');return new Promise(r=>setTimeout(r,700))}
 async function mixInBar(){
   if(mixBusy)return false;mixBusy=true;
   const c=content(),controls=document.getElementById('dialogControls'),el=document.getElementById('dialogText');
   if(controls)controls.innerHTML='';if(el)el.textContent='Nu mixar jag kraftigt i kannan.';
   if(c)c.classList.add('mixing415');setMixerLevel(76,250,'mixed');
   const speech=typeof barPlayTtsV337==='function'?Promise.resolve(barPlayTtsV337('Nu mixar jag kraftigt i kannan.')).catch(()=>{}):Promise.resolve();
   await Promise.all([speech,new Promise(r=>setTimeout(r,2400))]);
   if(c)c.classList.remove('mixing415');const f=mixerFoam();if(f){f.style.height='9%';f.style.opacity='.32'}setMixerLevel(76,300,'mixed');mixBusy=false;return true
 }

 function prepareGlass(){
   const g=glass(),fill=glassFill(),ice=glassIce(),gar=garnish();if(!g||!fill)return;
   g.classList.add('pinaGlass415');g.style.pointerEvents='none';g.removeAttribute('role');g.removeAttribute('tabindex');
   fill.style.height='0%';fill.style.opacity='.94';fill.style.background='linear-gradient(to top,rgba(255,215,87,.98),rgba(255,244,183,.92))';fill.style.filter='blur(.15px)';
   for(const id of ['glassMintCloud','glassLimeSugarCloud','glassBubbles']){const e=document.getElementById(id);if(e){e.style.display='none';e.innerHTML=''}}
   if(ice){ice.innerHTML='';ice.style.display='none';ice.style.opacity='1'}if(gar)gar.innerHTML=''
 }
 function setGlassLevel(level,ms=650){const f=glassFill();if(!f)return;const v=Math.max(0,Math.min(100,Number(level)||0));setTransition(f,ms);f.style.opacity=v>0?'.94':'0';requestAnimationFrame(()=>{f.style.height=v+'%'})}
 function showGlassIce(on){
   const l=glassIce();if(!l)return;
   if(on&&!l.children.length){const pos=[[12,72,-16],[44,66,12],[68,74,-7],[28,48,19],[58,45,-20],[18,30,-8],[50,26,15]];pos.forEach(p=>{const s=document.createElement('span');s.style.left=p[0]+'%';s.style.top=p[1]+'%';s.style.width='17%';s.style.height='10%';s.style.transform='rotate('+p[2]+'deg)';l.appendChild(s)})}
   l.style.display=on?'block':'none'
 }
 function pitcherLiquid(){return api.pitcher?.()?.querySelector('.pitcherLiquid415')}
 function pitcherIce(){return api.pitcher?.()?.querySelector('.pitcherIce415')}
 function setPitcherLevel(level,ms=0){const l=pitcherLiquid();if(!l)return;setTransition(l,ms);l.style.opacity=Number(level)>0?'.94':'0';l.style.background='linear-gradient(to top,rgba(255,222,112,.98),rgba(255,247,196,.94))';requestAnimationFrame(()=>{l.style.height=Math.max(0,Math.min(100,Number(level)||0))+'%'})}
 function showPitcherIce(on){const l=pitcherIce();if(!l)return;if(on&&!l.children.length)buildIce(l,8);l.style.display=on?'block':'none'}

 document.addEventListener('barpourmixerphase',e=>{if(state.drink?.id!=='pinaColada'||String(e.detail?.spiritId||'')!=='white-rum')return;if(e.detail?.phase==='pour-hold')setMixerLevel(22,Number(e.detail.holdMs)||2000,'rum');if(e.detail?.phase==='complete')setMixerLevel(22,0,'rum')});
 document.addEventListener('barpourphase',e=>{
   if(state.drink?.id!=='pinaColada'||e.detail?.bottleId!=='mixerJarPour414')return;
   const phase=e.detail?.phase;
   if(phase==='ready'){setPitcherLevel(76,0);showPitcherIce(true);setGlassLevel(0,0)}
   else if(phase==='pour-hold'){const ms=Number(e.detail?.holdMs)||2000;setPitcherLevel(0,ms);setGlassLevel(88,ms);showGlassIce(true)}
   else if(phase==='complete'){setPitcherLevel(0,0);setGlassLevel(88,0);setMixerLevel(0,0,'mixed');showMixerIce(false)}
 });

 api.barScene?.addEventListener('pointerdown',e=>{
   if(state.drink?.id!=='pinaColada')return;const s=current();if(!s)return;
   if((canon(s.a)===canon('Mixer')||canon(s.a)===canon('Mixa kraftigt'))&&api.hit(group(),e)){e.preventDefault();e.stopImmediatePropagation();if(!mixBusy)answerKnownChoice(canon(s.a)===canon('Mixer')?'Mixer':'Mixa kraftigt',group())}
 },true);
 api.registerTaste?.('pinaColada','highballGroup','Smaka Piña Colada');

 if(window.__barBottle396?.playCorrect){const old=window.__barBottle396.playCorrect.bind(window.__barBottle396);window.__barBottle396.playCorrect=function(id,spirit){if(state.drink?.id==='pinaColada'&&state.step===1){poured=true;return api.pourMixer(id,spirit)}return old(id,spirit)}}

 function renderGarnish(parts){return gar?.render?.('pinaColada',parts)||Promise.resolve(0)}
 const oldAdvance=advanceStep;
 advanceStep=function(s){
   if(state.drink?.id!=='pinaColada')return oldAdvance(s);
   const n=state.step;
   if(n===1&&canon(s?.a)===canon('Vit rom')&&!poured){poured=true;api.pourMixer('whiteRumBottle','white-rum').then(()=>oldAdvance(s)).catch(e=>{console.error('Piña rum pour',e);oldAdvance(s)});return}
   if(n===2&&canon(s?.a)===canon('Kokosgrädde och ananasjuice')){animateJuices().then(()=>oldAdvance(s));return}
   if(n===3&&canon(s?.a)===canon('Is')){animateIce().then(()=>oldAdvance(s));return}
   if(n===4&&canon(s?.a)===canon('Mixa kraftigt')){mixInBar().then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}
   if(n===5&&canon(s?.a)===canon('Highballglas')){api.showGlass('highball').then(()=>{prepareGlass();return api.pourPitcher()}).then(()=>oldAdvance(s)).catch(e=>{console.error('Piña pitcher',e);oldAdvance(s)});return}
   if(n===6&&canon(s?.a)===canon('Ananasskiva och cocktailkörsbär')){Promise.resolve(renderGarnish(['Ananasskiva','Cocktailkörsbär'])).catch(()=>{}).finally(()=>oldAdvance(s));return}
   return oldAdvance(s)
 };

 document.addEventListener('click',e=>{
   if(state.drink?.id!=='pinaColada'||canon(current()?.a)!==canon('Ananasskiva och cocktailkörsbär'))return;
   const z=e.target.closest?.('[data-ingredient-zone]');if(!z||!['ananasGarnish','korsbar'].includes(z.dataset.ingredientZone))return;
   e.preventDefault();e.stopImmediatePropagation();
   const part=z.dataset.ingredientZone==='ananasGarnish'?'Ananasskiva':'Cocktailkörsbär',cur=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];
   if(!cur.some(x=>canon(x)===canon(part)))cur.push(part);state.aiCorrectParts=cur;z.classList.add('good');Promise.resolve(renderGarnish(cur)).catch(()=>{});
   if(cur.some(x=>canon(x)===canon('Ananasskiva'))&&cur.some(x=>canon(x)===canon('Cocktailkörsbär')))answerKnownChoice('Ananasskiva och cocktailkörsbär',z)
 },true);

 function moveExistingGlassToDrinkStage(){const g=api.moveGlassToDrinkStage?.('highballGroup');document.getElementById('drinkStage')?.classList.add('pinaFinal415');return g}
 function restoreGlassHome(){api.restoreGlass?.('highballGroup');document.getElementById('drinkStage')?.classList.remove('pinaFinal415')}


 const oldStartPhysical=startPhysicalAction;
 startPhysicalAction=function(type,afterAction){if(type==='drink'&&state.drink?.id==='pinaColada')moveExistingGlassToDrinkStage();return oldStartPhysical(type,afterAction)};
 const oldUpdateDrink=updateDrink;
 updateDrink=function(){oldUpdateDrink();if(state.drink?.id==='pinaColada'&&document.getElementById('drinkStage')?.classList.contains('pinaFinal415')){const p=Math.max(0,Math.min(100,Number(state.drinkProgress)||0));setGlassLevel(88*(1-p/100),120)}};

 const oldOrder=orderDrink;
 orderDrink=function(d){
   restoreGlassHome();const r=oldOrder(d);
   if(d?.id==='pinaColada'){poured=false;mixBusy=false;gar?.clear?.('pinaColada');api.hideGlasses();api.start().then(cfg=>{api.placeMixer(cfg);resetMixer();api.scene.loadAndApply?.('./bartender_installningar_start15.json',{showGlass:false}).catch(()=>{})}).catch(()=>{})}
   return r
 };
 const resetAll=()=>{restoreGlassHome();resetMixer();gar?.clear?.('pinaColada')};
 document.getElementById('anotherBtn')?.addEventListener('click',resetAll,true);
 document.getElementById('changeMoodBtn')?.addEventListener('click',resetAll,true);

 const style=document.createElement('style');
 style.textContent="#highballGroup.pinaGlass415{overflow:visible}#highballGroup.pinaGlass415.drinkReady415{cursor:pointer}#drinkStage.pinaFinal415 #highballGroup{display:block!important}";
 document.head.appendChild(style);
})();
