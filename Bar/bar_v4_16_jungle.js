'use strict';
/* Bar Game v4.16 Jungle Bird: real shaker, config garnish and robust same-glass drinking. */
(function(){
 const api=window.__barTools416||window.__barTools415||window.__barTools414,gar=window.__barGarnish416;if(!api)return;
 const menu=drinkMenuCatalog.find(d=>d.id==='jungleBird');if(menu)menu.buildable=true;buildableDrinkIds.add('jungleBird');
 if(!drinks.some(d=>d.id==='jungleBird'))drinks.unshift({id:'jungleBird',name:'Jungle Bird',minAge:18,alcoholic:true,steps:[
  {q:'Vilket verktyg ska användas?',a:'Shaker',opts:['Shaker','Mixer','Barsked']},
  {q:'Vilken rom ska i först?',a:'Blackstrap-rom',opts:['Blackstrap-rom','Vit rom','Ron Profundo Havana Club']},
  {q:'Vilken bitter aperitif ska tillsättas?',a:'Campari',opts:['Campari','Amaretto','Frangelico']},
  {q:'Trevalsfråga: vilka tre ingredienser ska tillsättas nu?',a:'Ananasjuice och limejuice och demerarasockerlag',opts:['Ananasjuice och limejuice och demerarasockerlag','Ananasjuice och apelsinjuice och sockerlag','Passionsfruktspuré och limejuice och orgeat'],directChoices:true},
  {q:'Vad ska läggas i shakern?',a:'Is',opts:['Is','Salt','Mynta']},
  {q:'Vad gör vi nu?',a:'Skaka',opts:['Skaka','Mixa','Rör om'],action:'shake'},
  {q:'Vilket glas ska användas?',a:'Rocks-glas',opts:['Rocks-glas','Highballglas','Tiki-glas']},
  {q:'Vad ska läggas i glaset innan drinken hälls upp?',a:'Is',opts:['Is','Salt','Socker']},
  {q:'Vad ska Jungle Bird garneras med?',a:'Ananasskiva',opts:['Ananasskiva','Mynta','Cocktailkörsbär']},
  {q:'Jungle Bird är färdig. Vad vill du göra?',a:'Dricka',opts:['Dricka','Vänta','Göra om']}
 ]});
 const glass=()=>document.getElementById('rocksGroup');
 api.barScene?.addEventListener('pointerdown',e=>{if(state.drink?.id!=='jungleBird')return;const s=state.drink.steps[state.step];if(canon(s?.a)===canon('Shaker')&&api.shaker&&api.hit(api.shaker,e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Shaker',api.shaker)}},true);api.wireDrinkGlassHit?.('jungleBird','rocksGroup');
 const oldAdvance=advanceStep;advanceStep=function(s){if(state.drink?.id!=='jungleBird')return oldAdvance(s);const step=state.step;if(step===0&&canon(s?.a)===canon('Shaker')){api.selectShaker().then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===6&&canon(s?.a)===canon('Rocks-glas')){api.showGlass('rocks').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===7&&canon(s?.a)===canon('Is')){api.pourShaker('jungle-bird-shaker').then(()=>oldAdvance(s)).catch(e=>{console.error('Jungle pour',e);oldAdvance(s)});return}if(step===8&&canon(s?.a)===canon('Ananasskiva')){Promise.resolve(gar?.render?.('jungleBird',['Ananasskiva'])).catch(()=>{}).finally(()=>{oldAdvance(s);setTimeout(()=>api.setDrinkReady?.('rocksGroup',true,'Drick Jungle Bird'),0)});return}return oldAdvance(s)};
 const oldStartPhysical=startPhysicalAction;startPhysicalAction=function(type,afterAction){if(type==='drink'&&state.drink?.id==='jungleBird')api.moveGlassToDrinkStage?.('rocksGroup');return oldStartPhysical(type,afterAction)};
 const restoreJungle=()=>{api.restoreGlass?.('rocksGroup');gar?.clear?.('jungleBird')};
 const oldOrder=orderDrink;orderDrink=function(d){restoreJungle();if(d?.id==='jungleBird'){api.hideGlasses();if(api.shaker){api.shaker.style.display='block';window.__barMaiTai3106?.placeShakerStart?.()}}return oldOrder(d)};
 document.getElementById('anotherBtn')?.addEventListener('click',restoreJungle,true);
 document.getElementById('changeMoodBtn')?.addEventListener('click',restoreJungle,true);
})();
