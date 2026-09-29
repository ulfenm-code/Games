'use strict';
/* Bar Game v4.14 Piña Colada. */
(function(){
 const api=window.__barTools414;if(!api)return;
 const menu=drinkMenuCatalog.find(d=>d.id==='pinaColada');if(menu)menu.buildable=true;buildableDrinkIds.add('pinaColada');
 if(!drinks.some(d=>d.id==='pinaColada'))drinks.unshift({id:'pinaColada',name:'Piña Colada',minAge:18,alcoholic:true,steps:[
  {q:'Vilket verktyg ska användas?',a:'Mixer',opts:['Mixer','Shaker','Barsked']},
  {q:'Vilken rom ska hällas i mixern?',a:'Vit rom',opts:['Vit rom','Blackstrap-rom','Lagrad jamaicansk rom']},
  {q:'Trevalsfråga: vilka två ingredienser ska tillsättas tillsammans?',a:'Kokosgrädde och ananasjuice',opts:['Kokosgrädde och ananasjuice','Kokosgrädde och apelsinjuice','Ananasjuice och limejuice'],directChoices:true},
  {q:'Vad ska läggas i mixern före mixningen?',a:'Is',opts:['Is','Salt','Mynta']},
  {q:'Vad gör vi nu?',a:'Mixa kraftigt',opts:['Mixa kraftigt','Skaka','Rör om'],directChoices:true,action:'blend'},
  {q:'Vilket glas ska användas?',a:'Highballglas',opts:['Highballglas','Rocks-glas','Tiki-glas']},
  {q:'Vad ska Piña Coladan garneras med?',a:'Ananasskiva och cocktailkörsbär',opts:['Ananasskiva och cocktailkörsbär','Ananasskiva och mynta','Lime och cocktailkörsbär']},
  {q:'Piña Coladan är färdig. Vad vill du göra?',a:'Dricka',opts:['Dricka','Vänta','Göra om']}
 ]});
 const group=()=>document.getElementById('mixerGroup414'),glass=()=>document.getElementById('highballGroup');
 api.barScene?.addEventListener('pointerdown',e=>{if(state.drink?.id!=='pinaColada')return;const s=state.drink.steps[state.step];if((canon(s?.a)===canon('Mixer')||canon(s?.a)===canon('Mixa kraftigt'))&&api.hit(group(),e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice(canon(s.a)===canon('Mixer')?'Mixer':'Mixa kraftigt',group())}else if(canon(s?.a)===canon('Dricka')&&api.hit(glass(),e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Dricka',glass())}},true);
 let poured=false;
 if(window.__barBottle396?.playCorrect){const old=window.__barBottle396.playCorrect;window.__barBottle396.playCorrect=function(id,spirit){if(state.drink?.id==='pinaColada'&&state.step===1){poured=true;return api.pourMixer(id,spirit)}return old(id,spirit)}}
 const oldAdvance=advanceStep;advanceStep=function(s){if(state.drink?.id!=='pinaColada')return oldAdvance(s);const step=state.step;if(step===1&&canon(s?.a)===canon('Vit rom')&&!poured){poured=true;api.pourMixer('whiteRumBottle','white-rum').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===5&&canon(s?.a)===canon('Highballglas')){api.showGlass('highball').then(()=>api.pourPitcher()).then(()=>oldAdvance(s)).catch(e=>{console.error('Piña pitcher',e);oldAdvance(s)});return}return oldAdvance(s)};
 const oldShow=showPhysicalStage;showPhysicalStage=function(){oldShow();if(state.drink?.id==='pinaColada'&&state.action==='blend'){const st=document.getElementById('muddleStage'),h=st?.querySelector('h2'),p=st?.querySelector('p'),b=document.getElementById('muddleFallback');st?.classList.add('pinaBlend414');if(h)h.textContent='Mixa kraftigt!';if(p)p.textContent='Dra snabbt och kraftigt fram och tillbaka med fingret – betydligt kraftigare än när du muddlar en Mojito.';if(b)b.textContent='Simulera kraftig mixning'}};
 document.addEventListener('click',e=>{if(state.drink?.id!=='pinaColada')return;const s=state.drink.steps[state.step];if(canon(s?.a)!==canon('Ananasskiva och cocktailkörsbär'))return;const z=e.target.closest?.('[data-ingredient-zone]');if(!z||!['ananasGarnish','korsbar'].includes(z.dataset.ingredientZone))return;e.preventDefault();e.stopImmediatePropagation();const part=z.dataset.ingredientZone==='ananasGarnish'?'Ananasskiva':'Cocktailkörsbär',cur=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];if(!cur.some(x=>canon(x)===canon(part)))cur.push(part);state.aiCorrectParts=cur;z.classList.add('good');if(cur.some(x=>canon(x)===canon('Ananasskiva'))&&cur.some(x=>canon(x)===canon('Cocktailkörsbär')))answerKnownChoice('Ananasskiva och cocktailkörsbär',z)},true);
 const oldOrder=orderDrink;orderDrink=function(d){if(d?.id==='pinaColada'){poured=false;api.hideGlasses();api.start().then(cfg=>{api.placeMixer(cfg);api.scene.loadAndApply?.('./bartender_installningar_start14.json',{showGlass:false}).catch(()=>{})}).catch(()=>{})}return oldOrder(d)};
 const style=document.createElement('style');style.textContent='#muddleStage.pinaBlend414 #muddleGlass{background:url(\'MixerKanna.png\') center/contain no-repeat;animation:pinaBlend414 .32s ease-in-out infinite alternate}#muddleStage.pinaBlend414 #muddleGlass>*{opacity:.12}@keyframes pinaBlend414{from{transform:translateX(-3px) rotate(-1deg)}to{transform:translateX(3px) rotate(1deg)}}';document.head.appendChild(style);
})();
