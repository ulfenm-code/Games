'use strict';
/* Bar Game v4.14 IBA Tiki. */
(function(){
 const api=window.__barTools414;if(!api)return;
 const menu=drinkMenuCatalog.find(d=>d.id==='ibaTiki');if(menu)menu.buildable=true;buildableDrinkIds.add('ibaTiki');
 if(!drinks.some(d=>d.id==='ibaTiki'))drinks.unshift({id:'ibaTiki',name:'IBA Tiki',minAge:18,alcoholic:true,steps:[
  {q:'Vilket verktyg ska användas?',a:'Shaker',opts:['Shaker','Mixer','Barsked']},
  {q:'Vilken färsk ingrediens börjar vi med?',a:'Ingefära',opts:['Ingefära','Mynta','Ananas']},
  {q:'Vilken rom ska i först?',a:'Ron Profundo Havana Club',opts:['Ron Profundo Havana Club','Vit rom','Blackstrap-rom']},
  {q:'Vilken rom ska i därefter?',a:'Ron Smoky Havana Club',opts:['Ron Smoky Havana Club','Lagrad jamaicansk rom','Vit rom']},
  {q:'Vilken likör ska tillsättas nu?',a:'Amaretto',opts:['Amaretto','Campari','Orange Curaçao']},
  {q:'Vilken nötlikör ska tillsättas?',a:'Frangelico',opts:['Frangelico','Amaretto','Campari']},
  {q:'Vilken likör ska tillsättas som några droppar?',a:'Maraschino Luxardo',opts:['Maraschino Luxardo','Orange Curaçao','Frangelico']},
  {q:'Trevalsfråga: vilka tre ingredienser ska tillsättas nu?',a:'Passionsfruktspuré och ananasjuice och limejuice',opts:['Passionsfruktspuré och ananasjuice och limejuice','Passionsfruktspuré och apelsinjuice och citronjuice','Ananasjuice och orgeat och sockerlag'],directChoices:true},
  {q:'Vad ska läggas i shakern?',a:'Is',opts:['Is','Salt','Socker']},
  {q:'Hur ska drinken skakas?',a:'Skaka kraftigt',opts:['Skaka kraftigt','Rör om','Mixa'],action:'shake'},
  {q:'Vilket glas ska användas?',a:'Tiki-glas',opts:['Tiki-glas','Rocks-glas','Highballglas']},
  {q:'Vilken is ska fylla glaset?',a:'Krossad is',opts:['Krossad is','Isbitar','Ingen is']},
  {q:'Vad ska IBA Tiki garneras med?',a:'Lime och ananasskiva',opts:['Lime och ananasskiva','Mynta och cocktailkörsbär','Apelsin och mynta']},
  {q:'IBA Tiki är färdig. Vad vill du göra?',a:'Dricka',opts:['Dricka','Vänta','Göra om']}
 ]});
 const glass=()=>document.getElementById('tikiGroup');
 api.barScene?.addEventListener('pointerdown',e=>{if(state.drink?.id!=='ibaTiki')return;const s=state.drink.steps[state.step];if(canon(s?.a)===canon('Shaker')&&api.shaker&&api.hit(api.shaker,e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Shaker',api.shaker)}else if(canon(s?.a)===canon('Dricka')&&api.hit(glass(),e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Dricka',glass())}},true);
 const oldAdvance=advanceStep;advanceStep=function(s){if(state.drink?.id!=='ibaTiki')return oldAdvance(s);const step=state.step;if(step===0&&canon(s?.a)===canon('Shaker')){api.selectShaker().then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===1&&canon(s?.a)===canon('Ingefära')){$('#dialogControls').innerHTML='';$('#dialogText').textContent='Nu muddlar jag ingefäran i shakern.';if(typeof barPlayTtsV337==='function')Promise.resolve(barPlayTtsV337('Nu muddlar jag ingefäran i shakern.')).catch(()=>{}).finally(()=>oldAdvance(s));else setTimeout(()=>oldAdvance(s),900);return}if(step===10&&canon(s?.a)===canon('Tiki-glas')){api.showGlass('tiki').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===11&&canon(s?.a)===canon('Krossad is')){api.pourShaker('iba-tiki-shaker').then(()=>oldAdvance(s)).catch(e=>{console.error('IBA pour',e);oldAdvance(s)});return}return oldAdvance(s)};
 document.addEventListener('click',e=>{if(state.drink?.id!=='ibaTiki')return;const s=state.drink.steps[state.step];if(canon(s?.a)!==canon('Lime och ananasskiva'))return;const z=e.target.closest?.('[data-ingredient-zone]');if(!z||!['lime','ananasGarnish'].includes(z.dataset.ingredientZone))return;e.preventDefault();e.stopImmediatePropagation();const part=z.dataset.ingredientZone==='lime'?'Lime':'Ananasskiva',cur=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];if(!cur.some(x=>canon(x)===canon(part)))cur.push(part);state.aiCorrectParts=cur;z.classList.add('good');if(cur.some(x=>canon(x)===canon('Lime'))&&cur.some(x=>canon(x)===canon('Ananasskiva')))answerKnownChoice('Lime och ananasskiva',z)},true);
 const oldOrder=orderDrink;orderDrink=function(d){if(d?.id==='ibaTiki'){api.hideGlasses();if(api.shaker){api.shaker.style.display='block';window.__barMaiTai3106?.placeShakerStart?.()}}return oldOrder(d)};
})();
