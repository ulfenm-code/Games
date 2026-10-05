'use strict';
/* Bar Game v4.17 shared mixer/shaker tools: Mojito/Mai-Tai style taste-ready flow for finished glasses. */
(function(){
 const scene=window.__barSceneConfig3105||window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
 const glassval=window.__barGlassval3103||window.__barGlassval3101;
 const START_URL='./bartender_installningar_start16.json';
 const PM_START='./bartender_installningar_pourMixerstart&stop_2.json';
 const PM_END='./bartender_installningar_pourMixer_2.json';
 const barScene=document.getElementById('barScene'), objectLayer=document.getElementById('barObjectLayer');
 const shaker=window.__barMaiTai3106?.shaker||document.getElementById('maiTaiShaker');
 const MIXER={x:365,y:298.72,w:74,r:0,px:50,py:50,z:18};
 const MIXSYS={parts:{mixerJar:{x:-19.965320573170843,y:-41.17791488841881,w:78,r:0,px:50,py:50,z:2},mixerBase:{x:-14.877045432152984,y:1.0781491246830988,w:62.36582138791622,r:0,px:50,py:50,z:1}}};
 const GLASS_ASPECT=1402/1122;
 let startPromise=null,busy=false,raf=0,returnBusy=false;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const scale=()=>window.__barScale359?.finalGameFactor||1;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function start(){if(!startPromise)startPromise=scene.loadConfig(START_URL);return startPromise.then(clone)}
 function ensureMixer(){let g=document.getElementById('mixerGroup414');if(g)return g;g=document.createElement('div');g.id='mixerGroup414';g.style.cssText='position:absolute;overflow:visible;pointer-events:none';g.innerHTML='<img class="mixerBase414" src="MixerBas.png" alt=""><div class="mixerContent415" aria-hidden="true"><div class="mixerLiquid415"></div><div class="mixerIce415"></div><div class="mixerFoam415"></div></div><img class="mixerJar414" src="MixerKanna.png" alt="">';objectLayer?.appendChild(g);return g}
 function part(img,p){if(!img||!p)return;img.style.cssText+=';position:absolute;height:auto;max-width:none;pointer-events:none';img.style.left=p.x+'%';img.style.top=p.y+'%';img.style.width=p.w+'%';img.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';img.style.transform='rotate('+(p.r||0)+'deg)';img.style.zIndex=String(p.z??0)}
 function placeMixer(cfg){const g=ensureMixer(),p=cfg?.objects?.mixer||MIXER,sys=cfg?.mixerSystem||MIXSYS,s=scale(),cx=260,cy=250,w=p.w*s;g.style.left=(cx+(p.x-cx)*s)+'px';g.style.top=(cy+(p.y-cy)*s)+'px';g.style.width=w+'px';g.style.height=w+'px';g.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';g.style.transform='rotate('+(p.r||0)+'deg)';g.style.zIndex=String(p.z??18);g.style.display='block';const jp=sys.parts?.mixerJar||MIXSYS.parts.mixerJar;part(g.querySelector('.mixerJar414'),jp);part(g.querySelector('.mixerBase414'),sys.parts?.mixerBase);const mc=g.querySelector('.mixerContent415'),jh=Number(jp.w)*(1223/1286);if(mc){mc.style.left=(Number(jp.x)+Number(jp.w)*.23)+'%';mc.style.top=(Number(jp.y)+jh*.12)+'%';mc.style.width=(Number(jp.w)*.42)+'%';mc.style.height=(jh*.66)+'%'}}
 function mixerJar(on){const g=ensureMixer(),e=g.querySelector('.mixerJar414'),mc=g.querySelector('.mixerContent415');if(e)e.style.visibility=on?'visible':'hidden';if(mc)mc.style.visibility=on?'visible':'hidden'}
 start().then(placeMixer).catch(e=>console.error('v4.14 mixer',e));
 window.addEventListener('resize',()=>start().then(placeMixer).catch(()=>{}));
 const flakes=document.querySelector('[data-ingredient-zone="iceFlakes"]');if(flakes){flakes.disabled=true;flakes.style.display='none';flakes.style.pointerEvents='none'}
 const menu=document.getElementById('drinkMenuSprite');
 (function(){
   if(!menu)return;let ctx=null,w=0,h=0;
   function prep(){if(!(menu.naturalWidth>0&&menu.naturalHeight>0))return;const cv=document.createElement('canvas');w=cv.width=menu.naturalWidth;h=cv.height=menu.naturalHeight;ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(menu,0,0,w,h)}
   if(menu.complete)prep();else menu.addEventListener('load',prep,{once:true});
   document.addEventListener('click',e=>{if(e.target!==menu||!ctx)return;const r=menu.getBoundingClientRect();if(!r.width||!r.height)return;const x=Math.max(0,Math.min(w-1,Math.floor((e.clientX-r.left)/r.width*w))),y=Math.max(0,Math.min(h-1,Math.floor((e.clientY-r.top)/r.height*h)));let a=255;try{a=ctx.getImageData(x,y,1,1).data[3]}catch(_){return}if(a<24){e.preventDefault();e.stopImmediatePropagation()}},true)
 })();
 function hit(el,e){
   if(!el)return false;
   const nodes=el.id==='mixerGroup414'?[el,...el.querySelectorAll('img')]:[el];
   const rs=nodes.map(n=>n.getBoundingClientRect?.()).filter(r=>r&&r.width>0&&r.height>0);if(!rs.length)return false;
   const box={left:Math.min(...rs.map(r=>r.left)),top:Math.min(...rs.map(r=>r.top)),right:Math.max(...rs.map(r=>r.right)),bottom:Math.max(...rs.map(r=>r.bottom))};
   return e.clientX>=box.left&&e.clientX<=box.right&&e.clientY>=box.top&&e.clientY<=box.bottom
 }
 function placeModel(el,p,aspect=1,yo=4){if(!el||!p)return;const s=scale(),cx=260,cy=250,w=p.w*s;el.style.left=(cx+(p.x-cx)*s)+'px';el.style.top=(cy+(p.y-cy)*s+yo)+'px';el.style.width=w+'px';el.style.height=(w*aspect)+'px';el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';el.style.transform='rotate('+(p.r||0)+'deg)';el.style.zIndex=String(p.z??25);el.style.display='block';el.setAttribute('aria-hidden','false')}
 function hideGlasses(){for(const id of ['highballGroup','doubleRocksGroup','rocksGroup','tikiGroup']){const e=document.getElementById(id);if(e){e.style.display='none';e.style.pointerEvents='none';e.setAttribute('aria-hidden','true')}}}
 async function showGlass(kind){/* v4.29: selected glass moves; other shelf glasses stay visible. */if(kind==='highball'){await glassval.apply('highballGlass');const g=document.getElementById('highballGroup');g.style.display='block';g.setAttribute('aria-hidden','false');return g}const cfg=await start(),a=window.__barMaiTai3106?.glassvalAnchor||{centerX:256.33360967441587,bottomY:325.98736344742747};const key=kind==='rocks'?'rocksGlass':'tikiGlass',g=document.getElementById(kind==='rocks'?'rocksGroup':'tikiGroup'),src=cfg.objects[key],w=src.w;placeModel(g,{...src,x:a.centerX-w/2,y:a.bottomY-w*GLASS_ASPECT},GLASS_ASPECT,4);return g}
 async function selectShaker(){if(!shaker)return;shaker.style.display='block';shaker.classList.add('lidOff');shaker.classList.remove('toolSelectable');await glassval.apply('shaker')}
 async function pourShaker(id){await window.__barBottle396?.playCorrect?.('maiTaiShaker',id);if(shaker)shaker.style.display='none'}
 const ROT=(x,y,d)=>{const a=d*Math.PI/180;return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}};
 const lerp=(a,b,t)=>Number(a)+(Number(b)-Number(a))*t, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, ad=(a,b)=>((b-a+540)%360)-180, la=(a,b,t)=>((a+ad(a,b)*t)%360+360)%360;
 const ratios={uaR:105/132,laR:110/172,hR:74/105};
 function ratio(k){const e=document.querySelector('#bartenderRig .'+k);return e?.naturalWidth?e.naturalHeight/e.naturalWidth:ratios[k]}
 function pivot(c,k){const p=c.parts[k],r=ratio(k);return{x:p.x+p.w*p.px/100,y:p.y+p.w*r*p.py/100}}
 function setPivot(c,k,pt,r){const p=c.parts[k],ar=ratio(k);p.r=r;p.x=pt.x-p.w*p.px/100;p.y=pt.y-p.w*ar*p.py/100}
 function local(c,a,b){const p=pivot(c,a),q=pivot(c,b),v=ROT(q.x-p.x,q.y-p.y,-c.parts[a].r);return v}
 function frame(a,b,t){const f=clone(a),u=ease(Math.max(0,Math.min(1,t))),up={x:lerp(pivot(a,'uaR').x,pivot(b,'uaR').x,u),y:lerp(pivot(a,'uaR').y,pivot(b,'uaR').y,u)},ur=la(a.parts.uaR.r,b.parts.uaR.r,u);setPivot(f,'uaR',up,ur);const av=local(a,'uaR','laR'),bv=local(b,'uaR','laR'),lv={x:lerp(av.x,bv.x,u),y:lerp(av.y,bv.y,u)},lp=ROT(lv.x,lv.y,ur),lpt={x:up.x+lp.x,y:up.y+lp.y},lr=la(a.parts.laR.r,b.parts.laR.r,u);setPivot(f,'laR',lpt,lr);const ah=local(a,'laR','hR'),bh=local(b,'laR','hR'),hv={x:lerp(ah.x,bh.x,u),y:lerp(ah.y,bh.y,u)},hp=ROT(hv.x,hv.y,lr),hpt={x:lpt.x+hp.x,y:lpt.y+hp.y},hr=la(a.parts.hR.r,b.parts.hR.r,u);setPivot(f,'hR',hpt,hr);f.objects.whiteRum={...f.objects.whiteRum,attachedTo:a.objects.whiteRum.attachedTo,attachX:a.objects.whiteRum.attachX,attachY:a.objects.whiteRum.attachY,attachR:a.objects.whiteRum.attachR};return f}
 function pose(base,src){const f=clone(base);for(const k of ['uaR','laR','hR'])f.parts[k]=clone(src.parts[k]);f.objects={whiteRum:clone(src.objects.whiteRum)};return f}
 function cap(el,on){const c=el?.querySelector?.('.bottleCap');if(c)c.style.display=on?'none':''}
 function animate(a,b,prep,bottle){return new Promise((res,rej)=>{const st=performance.now();function tick(now){try{const t=Math.min(1,(now-st)/1500);scene.renderPoseFrame(frame(a,b,t),prep,{showGlass:null});cap(bottle,true);if(t>=1){raf=0;res();return}raf=requestAnimationFrame(tick)}catch(e){raf=0;rej(e)}}raf=requestAnimationFrame(tick)})}
 function emitMixerPour(phase,bottle,spiritId,extra={}){document.dispatchEvent(new CustomEvent('barpourmixerphase',{detail:{phase,bottleId:bottle?.id||null,spiritId:String(spiritId||''),moveMs:1500,holdMs:2000,...extra}}))}
 async function pourMixer(bottleId,spiritId){if(busy)return false;const bottle=document.getElementById(bottleId||'whiteRumBottle');if(!bottle)throw new Error('Pour Mixer: flaska saknas');busy=true;const oldCfg=scene.activeConfig?clone(scene.activeConfig):await start(),oldPrep=scene.currentPrepared?.()||await scene.prepareConfig(oldCfg),oldTarget=scene.activeBottleElement?.()||'whiteRumBottle',oldStyle=bottle.getAttribute('style'),c=bottle.querySelector?.('.bottleCap'),oldCap=c?.style.display??'';try{scene.setActiveBottleElement?.(bottle.id);const [rs,re]=await Promise.all([scene.loadConfig(PM_START),scene.loadConfig(PM_END)]),a=pose(oldCfg,rs),b=pose(oldCfg,re),prep=await scene.prepareConfig(a);scene.renderPoseFrame(a,prep,{showGlass:null});cap(bottle,true);emitMixerPour('ready',bottle,spiritId,{holdMs:220});await wait(220);emitMixerPour('move-to-pour',bottle,spiritId);await animate(a,b,prep,bottle);scene.renderPoseFrame(b,prep,{showGlass:null});cap(bottle,true);emitMixerPour('pour-hold',bottle,spiritId,{holdMs:2000});await wait(2000);emitMixerPour('return',bottle,spiritId);await animate(b,a,prep,bottle);emitMixerPour('complete',bottle,spiritId);return true}catch(err){emitMixerPour('error',bottle,spiritId,{message:String(err&&err.message?err.message:err)});throw err}finally{if(oldStyle==null)bottle.removeAttribute('style');else bottle.setAttribute('style',oldStyle);if(c)c.style.display=oldCap;scene.setActiveBottleElement?.(oldTarget);scene.renderPoseFrame(oldCfg,oldPrep,{showGlass:null});placeMixer(oldCfg);busy=false}}
 function pitcher(){let e=document.getElementById('mixerJarPour414');if(e)return e;e=document.createElement('div');e.id='mixerJarPour414';e.style.cssText='position:absolute;display:none;pointer-events:none;overflow:visible';e.innerHTML='<div class="mixerPitcherVisual415"><div class="pitcherContent415"><div class="pitcherLiquid415"></div><div class="pitcherIce415"></div></div><img src="MixerKanna.png" alt=""></div>';objectLayer?.appendChild(e);return e}
 async function pourPitcher(){const p=pitcher();mixerJar(false);p.style.display='block';try{await window.__barBottle396?.playCorrect?.('mixerJarPour414','pina-mixer')}finally{p.style.display='none';mixerJar(true)}}
 function applyShakePart416(el,p){if(!el||!p)return;el.style.position='absolute';el.style.left=Number(p.x||0)+'%';el.style.top=Number(p.y||0)+'%';el.style.width=Number(p.w||0)+'%';el.style.height=Number(p.w||0)+'%';el.style.objectFit='contain';el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';el.style.transform='rotate('+(Number(p.r)||0)+'deg)';el.style.zIndex=String(p.z??0);el.style.display='block'}
 const oldShow=showPhysicalStage;showPhysicalStage=function(){oldShow();const stage=document.getElementById('shakeStage');const real=(state.drink?.id==='jungleBird'||state.drink?.id==='ibaTiki')&&state.action==='shake'&&!stage?.classList.contains('hidden');stage?.classList.toggle('realShaker416',Boolean(real));if(real){const s=stage.querySelector('.shaker');if(s){s.innerHTML='<img class="shakeSpriteBase" src="ShakerUnderdel.png" alt=""><img class="shakeSpriteLid" src="ShakerLock.png" alt="">';const ps=window.__barMaiTai3106?.shakerSystemFallback?.parts||{};applyShakePart416(s.querySelector('.shakeSpriteBase'),ps.shakerBase);applyShakePart416(s.querySelector('.shakeSpriteLid'),ps.shakerLid)}const h=stage.querySelector('h2'),p=stage.querySelector('p');if(h)h.textContent=state.drink.id==='ibaTiki'?'Skaka kraftigt!':'Skaka Jungle Bird!';if(p)p.textContent=state.drink.id==='ibaTiki'?'Skaka telefonen mycket kraftigt som en riktig shaker.':'Skaka telefonen som en riktig shaker.'}}
 const oldReturn=finalizeLandscapeReturn;finalizeLandscapeReturn=function(force=false){const n=(state.drink?.id==='jungleBird'||state.drink?.id==='ibaTiki')&&state.action==='shake'&&state.waitingLandscape;if(!n)return oldReturn(force);if(returnBusy)return;returnBusy=true;Promise.resolve(window.__barMaiTai3106?.placeShakerAtPourStart?.()).catch(()=>{}).finally(()=>{returnBusy=false;oldReturn(force)})}
 function wireDrinkGlassHit416(drinkId,groupId){const group=()=>document.getElementById(groupId);document.addEventListener('pointerdown',e=>{if(state.drink?.id!==drinkId||state.phase!=='recipe')return;const s=state.drink?.steps?.[state.step];if(!s||canon(s.a)!==canon('Dricka'))return;const g=group();if(!g||g.style.display==='none')return;const r=g.getBoundingClientRect();if(!(r.width>0&&r.height>0)||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Dricka',g)},true);group()?.addEventListener('keydown',e=>{if(state.drink?.id===drinkId&&state.phase==='recipe'&&canon(state.drink?.steps?.[state.step]?.a)===canon('Dricka')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();answerKnownChoice('Dricka',group())}})}
 const glassHomes416=new Map();
 function setDrinkReady416(groupId,on=true,label='Drick'){const g=document.getElementById(groupId);if(!g)return;if(on){g.classList.add('drinkReady416');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',label)}else{g.classList.remove('drinkReady416');g.removeAttribute('role');g.removeAttribute('tabindex');g.removeAttribute('aria-label')}}
 function moveGlassToDrinkStage416(groupId){const g=document.getElementById(groupId),stage=document.getElementById('drinkStage');if(!g||!stage)return null;if(!glassHomes416.has(groupId))glassHomes416.set(groupId,{parent:g.parentNode,next:g.nextSibling,style:g.getAttribute('style'),role:g.getAttribute('role'),tab:g.getAttribute('tabindex'),aria:g.getAttribute('aria-label')});const ref=document.getElementById('drinkMojitoGroup')||stage.querySelector('.legacyDrinkGlass');if(ref)stage.insertBefore(g,ref);else stage.appendChild(g);const img=g.querySelector('img'),ratio=img?.naturalWidth>0?img.naturalHeight/img.naturalWidth:1.25,w=Math.min(170,Math.max(110,window.innerWidth*.32));g.style.position='relative';g.style.left='auto';g.style.top='auto';g.style.width=w+'px';g.style.height=(w*ratio)+'px';g.style.transform='none';g.style.transformOrigin='50% 50%';g.style.margin='8px auto 12px';g.style.display='block';g.style.pointerEvents='none';g.style.zIndex='10';stage.classList.add('actualGlassDrink416');g.classList.add('actualDrinkGlass416');return g}
 function restoreGlass416(groupId){const g=document.getElementById(groupId),stage=document.getElementById('drinkStage'),home=glassHomes416.get(groupId);if(!g||!home)return;if(home.next&&home.next.parentNode===home.parent)home.parent.insertBefore(g,home.next);else home.parent?.appendChild(g);if(home.style==null)g.removeAttribute('style');else g.setAttribute('style',home.style);if(home.role==null)g.removeAttribute('role');else g.setAttribute('role',home.role);if(home.tab==null)g.removeAttribute('tabindex');else g.setAttribute('tabindex',home.tab);if(home.aria==null)g.removeAttribute('aria-label');else g.setAttribute('aria-label',home.aria);g.classList.remove('actualDrinkGlass416');glassHomes416.delete(groupId);if(!glassHomes416.size)stage?.classList.remove('actualGlassDrink416')}
 const tasteDefs417=new Map();
 function tasteIntent417(raw){const s=(typeof canon==='function'?canon(String(raw||'')):String(raw||'').trim().toLocaleLowerCase('sv-SE')).replace(/[.!?,;:]+/g,' ').replace(/\s+/g,' ').trim();return new Set(['dricka','drick','smaka','smaka på den','jag vill dricka','jag vill smaka','jag dricker','jag smakar','ja','ja tack','gärna','kör','kör på']).has(s)}
 function setTasteReady417(drinkId,on){
   const d=tasteDefs417.get(drinkId);if(!d)return;
   const g=document.getElementById(d.groupId);if(!g)return;
   g.classList.toggle('tasteReady417',Boolean(on));
   if(on){
     state.tasteReady417=drinkId;
     g.style.cursor='pointer';
     g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',d.label||('Smaka '+(state.drink?.name||'drinken')));g.setAttribute('aria-hidden','false')
   }else{
     if(state.tasteReady417===drinkId)state.tasteReady417=null;
     g.style.cursor='default';g.removeAttribute('role');g.removeAttribute('tabindex');g.removeAttribute('aria-label')
   }
 }
 function startTaste417(drinkId){
   if(state.tasteReady417!==drinkId||state.drink?.id!==drinkId)return;
   setTasteReady417(drinkId,false);
   try{stopIdle?.()}catch(_){}
   try{stopSpeech?.()}catch(_){}
   const dc=document.getElementById('dialogControls');if(dc)dc.innerHTML='';
   startPhysicalAction('drink','result')
 }
 function enterTasteReady417(drinkId){
   const d=tasteDefs417.get(drinkId);if(!d||state.drink?.id!==drinkId)return;
   if(state.tasteReady417===drinkId)return;
   state.phase='chat';state.lastRecipeQuestion='';
   const dc=document.getElementById('dialogControls'),dt=document.getElementById('dialogText');if(dc)dc.innerHTML='';if(dt)dt.textContent='';
   setTasteReady417(drinkId,true);
   if(typeof renderConversationInput==='function')renderConversationInput(false);
   const ai=window.__barAI388?.event;
   if(typeof ai==='function'){
     ai('taste_ready',{drinkName:state.drink?.name||drinkId,glassClickable:true},{
       target:'#dialogText',phase:'chat',
       after:()=>{if(state.tasteReady417===drinkId)try{scheduleIdle?.()}catch(_){}}
     })
   }else if(dt)dt.textContent=(state.drink?.name||'Drinken')+' är färdig. Tryck på glaset eller säg att du vill dricka.'
 }
 function registerTaste417(drinkId,groupId,label){
   tasteDefs417.set(drinkId,{groupId,label});
   const g=document.getElementById(groupId);if(!g||g.dataset.taste417Bound==='1')return;
   g.dataset.taste417Bound='1';
   g.addEventListener('click',e=>{if(state.tasteReady417!==drinkId||state.drink?.id!==drinkId)return;e.preventDefault();e.stopImmediatePropagation();startTaste417(drinkId)});
   g.addEventListener('keydown',e=>{if(state.tasteReady417!==drinkId||state.drink?.id!==drinkId)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();startTaste417(drinkId)}})
 }
 const oldRenderTaste417=renderStep;
 renderStep=function(newStep=false){
   const id=state.drink?.id,d=tasteDefs417.get(id);
   if(d&&state.drink&&state.step>=state.drink.steps.length){enterTasteReady417(id);return}
   return oldRenderTaste417(newStep)
 };
 const oldHandleConversation417=handleConversation;
 handleConversation=async function(raw,options={}){
   const id=state.tasteReady417;
   if(id&&state.drink?.id===id&&tasteIntent417(raw)){startTaste417(id);return}
   return oldHandleConversation417(raw,options)
 };
 const oldOrderTaste417=orderDrink;
 orderDrink=function(d){
   for(const id of tasteDefs417.keys())setTasteReady417(id,false);
   state.tasteReady417=null;
   return oldOrderTaste417(d)
 };
 function resetTaste417(){for(const id of tasteDefs417.keys())setTasteReady417(id,false);state.tasteReady417=null}
 document.getElementById('anotherBtn')?.addEventListener('click',resetTaste417,true);
 document.getElementById('changeMoodBtn')?.addEventListener('click',resetTaste417,true);
 const style=document.createElement('style');style.textContent=`
#mixerGroup414 img{display:block;max-width:none;user-select:none;-webkit-user-drag:none}
.mixerContent415{position:absolute;overflow:hidden;pointer-events:none;z-index:4;clip-path:polygon(7% 0,95% 0,88% 100%,12% 100%);border-radius:8% 8% 16% 16%;mix-blend-mode:multiply}
.mixerLiquid415,.pitcherLiquid415{position:absolute;left:-12%;right:-12%;bottom:0;height:0;opacity:.9;background:linear-gradient(to top,rgba(251,219,112,.96),rgba(255,239,174,.88));transition:height .7s ease,background .7s ease,opacity .4s ease;transform-origin:50% 100%}
.mixerFoam415{position:absolute;left:2%;right:2%;bottom:0;height:0;opacity:0;background:radial-gradient(ellipse at 50% 85%,rgba(255,252,224,.95),rgba(255,242,184,.1) 70%);transition:height .5s ease,opacity .5s ease;pointer-events:none}
.mixerIce415,.pitcherIce415{position:absolute;inset:0;display:none;pointer-events:none;z-index:3}
.mixerIce415 span,.pitcherIce415 span{position:absolute;width:18%;height:12%;border:1px solid rgba(255,255,255,.88);background:linear-gradient(135deg,rgba(255,255,255,.76),rgba(184,226,239,.34));box-shadow:inset 0 0 2px rgba(255,255,255,.72);clip-path:polygon(14% 0,100% 12%,82% 100%,0 82%)}
.mixerContent415.mixing415 .mixerLiquid415{animation:pinaMixerSwirl415 .34s linear infinite}
.mixerContent415.mixing415 .mixerIce415 span{animation:pinaIceSwirl415 .46s ease-in-out infinite alternate}
.mixerContent415.mixing415 .mixerFoam415{opacity:.75;height:22%}
@keyframes pinaMixerSwirl415{0%{transform:translateX(-6%) skewX(-8deg) scaleY(.98)}25%{transform:translateX(5%) skewX(7deg) scaleY(1.02)}50%{transform:translateX(-3%) skewX(-5deg) scaleY(.97)}75%{transform:translateX(6%) skewX(8deg) scaleY(1.03)}100%{transform:translateX(-6%) skewX(-8deg) scaleY(.98)}}
@keyframes pinaIceSwirl415{from{transform:translate(-3px,-2px) rotate(-18deg)}to{transform:translate(5px,4px) rotate(22deg)}}
#shakeStage.realShaker416 .shaker{position:relative;width:min(48vw,235px);height:min(48vw,235px);max-height:52vh;margin:8px auto;filter:drop-shadow(0 12px 24px #0009);animation:realShakerIdle416 .55s ease-in-out infinite alternate}
#shakeStage.realShaker416 .shakeSpriteBase,#shakeStage.realShaker416 .shakeSpriteLid{position:absolute;object-fit:contain;pointer-events:none;user-select:none;display:block}
@keyframes realShakerIdle416{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
#drinkStage.actualGlassDrink416 #drinkMojitoGroup,#drinkStage.actualGlassDrink416 .legacyDrinkGlass{display:none!important}
.drinkReady416{cursor:pointer!important}
#highballGroup.tasteReady417,#rocksGroup.tasteReady417,#tikiGroup.tasteReady417{
  pointer-events:auto!important;
  cursor:pointer!important;
  touch-action:manipulation
}
#highballGroup.tasteReady417:focus-visible,#rocksGroup.tasteReady417:focus-visible,#tikiGroup.tasteReady417:focus-visible{
  outline:3px solid rgba(255,255,255,.9);
  outline-offset:4px
}

#mixerJarPour414 .mixerPitcherVisual415{position:absolute;left:0;top:18%;width:100%;height:63.4%;transform:scaleX(-1);transform-origin:50% 50%;overflow:visible}
#mixerJarPour414 .mixerPitcherVisual415>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;z-index:2}
.pitcherContent415{position:absolute;left:23%;top:12%;width:42%;height:66%;overflow:hidden;clip-path:polygon(7% 0,95% 0,88% 100%,12% 100%);z-index:4;mix-blend-mode:multiply}
`;document.head.appendChild(style);
 const api={scene,start,shaker,barScene,hit,placeMixer,mixerJar,showGlass,selectShaker,pourShaker,pourMixer,pourPitcher,hideGlasses,pitcher,mixerElement:ensureMixer,mixerContent:()=>ensureMixer().querySelector('.mixerContent415'),wireDrinkGlassHit:wireDrinkGlassHit416,setDrinkReady:setDrinkReady416,moveGlassToDrinkStage:moveGlassToDrinkStage416,restoreGlass:restoreGlass416,registerTaste:registerTaste417,enterTasteReady:enterTasteReady417,startTaste:startTaste417,setTasteReady:setTasteReady417};
 window.__barTools417=api;window.__barTools416=api;window.__barTools415=api;window.__barTools414=api;
})();
