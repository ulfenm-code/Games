'use strict';
/* Bar Game v4.20 Jungle Bird: visible Rocks ice/liquid through pour and tasting. */
(function(){
 const api=window.__barTools417||window.__barTools416||window.__barTools415||window.__barTools414,gar=window.__barGarnish417||window.__barGarnish416;if(!api)return;
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
  {q:'Vad ska Jungle Bird garneras med?',a:'Ananasskiva',opts:['Ananasskiva','Mynta','Cocktailkörsbär']}
 ]});
 const glass=()=>document.getElementById('rocksGroup');
 function ensureJungleContent420(){
   const g=glass();if(!g)return null;
   let layer=g.querySelector(':scope > .jungleContent420');
   if(!layer){
     layer=document.createElement('div');layer.className='jungleContent420';
     layer.innerHTML='<div class="jungleLiquid420"></div><div class="jungleIce420"><span></span><span></span><span></span><span></span><span></span><span></span></div>';
     const img=document.getElementById('rocksGlass');
     if(img){img.classList.add('jungleGlassImage420');g.insertBefore(layer,img)}else g.prepend(layer)
   }
   return layer
 }
 function setJungleIce420(on){
   const layer=ensureJungleContent420(),ice=layer?.querySelector('.jungleIce420');if(ice)ice.style.display=on?'block':'none'
 }
 function setJungleLiquid420(percent,duration=0){
   const layer=ensureJungleContent420(),liq=layer?.querySelector('.jungleLiquid420');if(!liq)return;
   liq.style.transitionDuration=Math.max(0,Number(duration)||0)+'ms';
   requestAnimationFrame(()=>{liq.style.height=Math.max(0,Math.min(100,Number(percent)||0))+'%'})
 }
 function resetJungleContent420(){
   const layer=ensureJungleContent420();if(!layer)return;
   const liq=layer.querySelector('.jungleLiquid420'),ice=layer.querySelector('.jungleIce420');
   if(liq){liq.style.transitionDuration='0ms';liq.style.height='0%'}
   if(ice)ice.style.display='none'
 }
 function syncJungleDrink420(){
   if(state.drink?.id!=='jungleBird')return;
   const g=glass(),stage=document.getElementById('drinkStage');if(!g||g.parentNode!==stage)return;
   const p=Math.max(0,Math.min(100,Number(state.drinkProgress||0)));
   const layer=ensureJungleContent420(),liq=layer?.querySelector('.jungleLiquid420'),ice=layer?.querySelector('.jungleIce420');
   if(liq){liq.style.transitionDuration='120ms';liq.style.height=(76*(1-p/100))+'%'}
   if(ice)ice.style.display=p>=98?'none':'block'
 }
 ensureJungleContent420();

 api.barScene?.addEventListener('pointerdown',e=>{if(state.drink?.id!=='jungleBird')return;const s=state.drink.steps[state.step];if(canon(s?.a)===canon('Shaker')&&api.shaker&&api.hit(api.shaker,e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Shaker',api.shaker)}},true);api.registerTaste?.('jungleBird','rocksGroup','Smaka Jungle Bird');
 const oldAdvance=advanceStep;advanceStep=function(s){if(state.drink?.id!=='jungleBird')return oldAdvance(s);const step=state.step;if(step===0&&canon(s?.a)===canon('Shaker')){api.selectShaker().then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===6&&canon(s?.a)===canon('Rocks-glas')){api.showGlass('rocks').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}if(step===7&&canon(s?.a)===canon('Is')){setJungleIce420(true);setJungleLiquid420(0,0);api.pourShaker('jungle-bird-shaker').then(()=>oldAdvance(s)).catch(e=>{console.error('Jungle pour',e);oldAdvance(s)});return}if(step===8&&canon(s?.a)===canon('Ananasskiva')){Promise.resolve(gar?.render?.('jungleBird',['Ananasskiva'])).catch(()=>{}).finally(()=>oldAdvance(s));return}return oldAdvance(s)};
 const oldStartPhysical=startPhysicalAction;startPhysicalAction=function(type,afterAction){if(type==='drink'&&state.drink?.id==='jungleBird'){setJungleLiquid420(76,0);setJungleIce420(true);api.moveGlassToDrinkStage?.('rocksGroup')}const r=oldStartPhysical(type,afterAction);if(type==='drink'&&state.drink?.id==='jungleBird')syncJungleDrink420();return r};
 const oldUpdateDrink=updateDrink;updateDrink=function(){const r=oldUpdateDrink();syncJungleDrink420();return r};
 document.addEventListener('barpourphase',e=>{const d=e?.detail||{};if(state.drink?.id!=='jungleBird'||d.spiritId!=='jungle-bird-shaker')return;if(d.phase==='pour-hold'){setJungleIce420(true);setJungleLiquid420(76,d.holdMs||2000)}},true);
 const restoreJungle=()=>{api.restoreGlass?.('rocksGroup');gar?.clear?.('jungleBird');resetJungleContent420()};
 const oldOrder=orderDrink;orderDrink=function(d){restoreJungle();if(d?.id==='jungleBird'){api.hideGlasses();if(api.shaker){api.shaker.style.display='block';window.__barMaiTai3106?.placeShakerStart?.()}}return oldOrder(d)};
 document.getElementById('anotherBtn')?.addEventListener('click',restoreJungle,true);
 document.getElementById('changeMoodBtn')?.addEventListener('click',restoreJungle,true);
 const style=document.createElement('style');
 style.textContent=`
#rocksGroup{overflow:visible}
#rocksGroup .jungleContent420{position:absolute;left:14%;right:14%;top:18%;bottom:8%;overflow:hidden;clip-path:polygon(7% 1%,93% 1%,86% 100%,14% 100%);z-index:2;pointer-events:none}
#rocksGroup .jungleGlassImage420{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;z-index:4;pointer-events:none}
#rocksGroup .jungleLiquid420{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(to top,rgba(123,43,28,.94),rgba(208,92,48,.9) 55%,rgba(236,139,74,.86));transition-property:height;transition-timing-function:ease-out;z-index:1}
#rocksGroup .jungleLiquid420:after{content:'';position:absolute;left:0;right:0;top:0;height:8%;background:rgba(255,211,154,.42)}
#rocksGroup .jungleIce420{position:absolute;inset:0;display:none;z-index:2}
#rocksGroup .jungleIce420 span{position:absolute;width:25%;aspect-ratio:1/1;border:1px solid rgba(255,255,255,.82);background:rgba(224,244,248,.38);box-shadow:inset 0 0 3px rgba(255,255,255,.75);clip-path:polygon(12% 6%,94% 16%,86% 92%,5% 80%)}
#rocksGroup .jungleIce420 span:nth-child(1){left:8%;bottom:8%;transform:rotate(-13deg)}
#rocksGroup .jungleIce420 span:nth-child(2){left:35%;bottom:5%;transform:rotate(17deg)}
#rocksGroup .jungleIce420 span:nth-child(3){right:6%;bottom:13%;transform:rotate(-24deg)}
#rocksGroup .jungleIce420 span:nth-child(4){left:18%;bottom:33%;transform:rotate(28deg)}
#rocksGroup .jungleIce420 span:nth-child(5){left:49%;bottom:34%;transform:rotate(-8deg)}
#rocksGroup .jungleIce420 span:nth-child(6){right:11%;bottom:46%;transform:rotate(15deg)}
`;
 document.head.appendChild(style);
})();
