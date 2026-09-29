'use strict';
/* Bar Game v4.14 – Piña Colada, Jungle Bird, IBA Tiki, mixer and Pour Mixer. */
(function(){
  const scene=window.__barSceneConfig3105||window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const glassval=window.__barGlassval3103||window.__barGlassval3101;
  const shakerApi=window.__barMaiTai3106;
  const objectLayer=document.getElementById('barObjectLayer');
  const barScene=document.getElementById('barScene');
  const START14_URL='./bartender_installningar_start14.json';
  const POUR_MIXER_START='./bartender_installningar_pourMixerstart&stop_2.json';
  const POUR_MIXER_END='./bartender_installningar_pourMixer_2.json';
  const POUR_DRINK_START='./bartender_installningar_start&stopDrink.json';
  const POUR_DRINK_END='./bartender_installningar_poorDrink.json';
  const JAR_ASPECT=1223/1286;
  const GLASS_ASPECT=1402/1122;
  const MOVE_MS=1500,HOLD_MS=2000,START_HOLD_MS=220;
  let start14Promise=null,pourBusy=false,newShakeReturnBusy=false;

  function clone(v){return JSON.parse(JSON.stringify(v))}
  function cv(v){return typeof canon==='function'?canon(v):String(v??'').trim().toLocaleLowerCase('sv-SE')}
  function sc(){return window.__barScale359?.finalGameFactor||1}
  function wait(ms){return new Promise(r=>setTimeout(r,ms))}
  const lerp=(a,b,t)=>Number(a)+(Number(b)-Number(a))*t;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const ad=(a,b)=>((Number(b)-Number(a)+540)%360)-180;
  const la=(a,b,t)=>((Number(a)+ad(a,b)*t)%360+360)%360;
  function rot(x,y,d){const a=Number(d||0)*Math.PI/180;return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}}
  const mix=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});

  async function start14(){
    if(!start14Promise)start14Promise=scene?.loadConfig?scene.loadConfig(START14_URL):fetch(START14_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Start14 HTTP '+r.status);return r.json()});
    return clone(await start14Promise)
  }

  function ensureMixer(){
    if(!objectLayer)return null;
    let g=document.getElementById('mixerGroupV414');
    if(!g){
      g=document.createElement('div');g.id='mixerGroupV414';g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label','Mixer');
      g.innerHTML='<img id="mixerBaseV414" class="mixerBaseSpriteV414" src="MixerBas.png" alt=""><img id="mixerJarV414" class="mixerJarSpriteV414" src="MixerKanna.png" alt="">';
      objectLayer.appendChild(g)
    }
    return g
  }
  const mixer=ensureMixer();
  const base=()=>document.getElementById('mixerBaseV414');
  const jar=()=>document.getElementById('mixerJarV414');

  function place(el,p,aspect=1,yOff=0){
    if(!el||!p)return;
    const s=sc(),cx=260,cy=250,w=Number(p.w)*s;
    el.style.position='absolute';el.style.left=(cx+(Number(p.x)-cx)*s)+'px';el.style.top=(cy+(Number(p.y)-cy)*s+yOff)+'px';
    el.style.width=w+'px';el.style.height=(w*aspect)+'px';el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    el.style.transform='rotate('+(Number(p.r)||0)+'deg)';el.style.zIndex=String(p.z??15);el.style.display='block'
  }
  function part(el,p){
    if(!el||!p)return;
    el.style.position='absolute';el.style.left=Number(p.x)+'%';el.style.top=Number(p.y)+'%';el.style.width=Number(p.w)+'%';el.style.height='auto';el.style.maxWidth='none';
    el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';el.style.transform='rotate('+(Number(p.r)||0)+'deg)';el.style.zIndex=String(p.z??0);el.style.pointerEvents='none'
  }
  function applyMixer(cfg){
    if(!mixer||!cfg?.objects?.mixer)return;
    place(mixer,cfg.objects.mixer,1,0);
    const ps=cfg.mixerSystem?.parts||{};part(jar(),ps.mixerJar);part(base(),ps.mixerBase)
  }
  async function applyStart(){
    const cfg=await start14();
    if(scene?.loadAndApply)await scene.loadAndApply(START14_URL,{showGlass:false});
    applyMixer(cfg);return cfg
  }

  const defs=[
    {id:'pinaColada',name:'Piña Colada',steps:[
      {q:'Vilket verktyg ska användas?',a:'Mixer',opts:['Mixer','Shaker','Barsked']},
      {q:'Vilken sprit ska hällas i mixern?',a:'Vit rom',opts:['Vit rom','Blackstrap-rom','Ron Smoky Havana Club']},
      {q:'Trevalsfråga: Vilka två ingredienser ska tillsättas efter rommen?',a:'Kokosgrädde och ananasjuice',opts:['Kokosgrädde och ananasjuice','Kokosmjölk och apelsinjuice','Grädde och limejuice'],directChoices:true},
      {q:'Vad ska läggas i mixern nu?',a:'Isbitar',opts:['Isbitar','Krossad is','Salt']},
      {q:'Vad gör vi nu?',a:'Mixa kraftigt',opts:['Mixa kraftigt','Skaka','Rör om'],action:'blend'},
      {q:'Vilket glas ska användas?',a:'Stort glas',opts:['Stort glas','Rocks-glas','Tiki-glas']},
      {q:'Vad ska vi garnera med? Ledtråd: två saker.',a:'Ananasskiva och cocktailkörsbär',opts:['Ananasskiva och cocktailkörsbär','Lime och mynta','Apelsinskiva och mynta']}
    ]},
    {id:'jungleBird',name:'Jungle Bird',steps:[
      {q:'Vilket verktyg ska användas?',a:'Shaker',opts:['Shaker','Mixer','Barsked']},
      {q:'Vilken rom ska i först?',a:'Blackstrap-rom',opts:['Blackstrap-rom','Vit rom','Ron Profundo Havana Club']},
      {q:'Vilken bitter aperitif ska tillsättas?',a:'Campari',opts:['Campari','Amaretto','Frangelico']},
      {q:'Trevalsfråga: Vilka tre ingredienser ska tillsättas nu?',a:'Ananasjuice och limejuice och demerarasockerlag',opts:['Ananasjuice och limejuice och demerarasockerlag','Apelsinjuice och limejuice och sockerlag','Ananasjuice och citronjuice och grenadin'],directChoices:true},
      {q:'Vad ska läggas i shakern?',a:'Isbitar',opts:['Isbitar','Krossad is','Salt']},
      {q:'Vad gör vi nu?',a:'Skaka',opts:['Skaka','Mixa','Rör om'],action:'shake'},
      {q:'Vilket glas ska användas?',a:'Rocks-glas',opts:['Rocks-glas','Double Rocks-glas','Tiki-glas']},
      {q:'Vad ska läggas i glaset före upphällningen?',a:'Isbitar',opts:['Isbitar','Krossad is','Salt']},
      {q:'Vad ska drinken garneras med?',a:'Ananasskiva',opts:['Ananasskiva','Cocktailkörsbär','Mynta']}
    ]},
    {id:'ibaTiki',name:'IBA Tiki',steps:[
      {q:'Vilket verktyg ska användas?',a:'Shaker',opts:['Shaker','Mixer','Barsked']},
      {q:'Vad ska läggas i shakern först?',a:'Ingefära',opts:['Ingefära','Mynta','Ananas']},
      {q:'Vilken rom ska tillsättas först?',a:'Ron Profundo Havana Club',opts:['Ron Profundo Havana Club','Blackstrap-rom','Vit rom']},
      {q:'Vilken rom ska tillsättas därefter?',a:'Ron Smoky Havana Club',opts:['Ron Smoky Havana Club','Lagrad jamaicansk rom','Vit rom']},
      {q:'Vilken likör ska tillsättas nu?',a:'Amaretto',opts:['Amaretto','Campari','Orange Curaçao']},
      {q:'Vilken nötlikör ska tillsättas?',a:'Frangelico',opts:['Frangelico','Amaretto','Campari']},
      {q:'Vilken maraschinolikör ska tillsättas?',a:'Maraschino Luxardo',opts:['Maraschino Luxardo','Orange Curaçao','Frangelico']},
      {q:'Trevalsfråga: Vilka tre ingredienser ska tillsättas nu?',a:'Passionsfruktspuré och ananasjuice och limejuice',opts:['Passionsfruktspuré och ananasjuice och limejuice','Passionsfruktspuré och apelsinjuice och citronjuice','Ananasjuice och limejuice och grenadin'],directChoices:true},
      {q:'Vad ska läggas i shakern?',a:'Isbitar',opts:['Isbitar','Krossad is','Salt']},
      {q:'Hur ska drinken skakas?',a:'Skaka kraftigt',opts:['Skaka kraftigt','Rör försiktigt','Mixa'],action:'shake'},
      {q:'Vilket glas ska användas?',a:'Tiki-glas',opts:['Tiki-glas','Rocks-glas','Highballglas']},
      {q:'Vilken is ska läggas i glaset?',a:'Krossad is',opts:['Krossad is','Isbitar','Ingen is']},
      {q:'Vad ska drinken garneras med? Ledtråd: två saker.',a:'Lime och ananasskiva',opts:['Lime och ananasskiva','Mynta och cocktailkörsbär','Apelsinskiva och mynta']}
    ]}
  ];
  for(const d of defs){
    const m=drinkMenuCatalog.find(x=>x.id===d.id);if(m)m.buildable=true;buildableDrinkIds.add(d.id);
    if(!drinks.some(x=>x.id===d.id))drinks.unshift({id:d.id,name:d.name,minAge:18,alcoholic:true,steps:d.steps})
  }

  const step=()=>state.phase==='recipe'&&state.drink?state.drink.steps?.[state.step]||null:null;
  const is=(id,n,a=null)=>state.drink?.id===id&&state.step===n&&(!a||cv(step()?.a)===cv(a));
  function unionRect(){
    const rs=[mixer,base(),jar()].filter(Boolean).map(x=>x.getBoundingClientRect()).filter(r=>r.width&&r.height);if(!rs.length)return null;
    return{left:Math.min(...rs.map(r=>r.left)),top:Math.min(...rs.map(r=>r.top)),right:Math.max(...rs.map(r=>r.right)),bottom:Math.max(...rs.map(r=>r.bottom))}
  }
  const inside=(e,r)=>r&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  function answerMixer(){
    if(is('pinaColada',0,'Mixer'))answerKnownChoice('Mixer',mixer);
    else if(is('pinaColada',4,'Mixa kraftigt'))answerKnownChoice('Mixa kraftigt',mixer)
  }
  barScene?.addEventListener('pointerdown',e=>{
    if(!(is('pinaColada',0,'Mixer')||is('pinaColada',4,'Mixa kraftigt'))||!inside(e,unionRect()))return;
    e.preventDefault();e.stopImmediatePropagation();answerMixer()
  },true);
  mixer?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&(is('pinaColada',0,'Mixer')||is('pinaColada',4,'Mixa kraftigt'))){e.preventDefault();answerMixer()}});

  const newShaker=()=>state.drink?.id==='jungleBird'||state.drink?.id==='ibaTiki';
  function answerShaker(){
    if(newShaker()&&state.step===0&&cv(step()?.a)===cv('Shaker'))answerKnownChoice('Shaker',shakerApi?.shaker)
  }
  barScene?.addEventListener('pointerdown',e=>{
    const sh=shakerApi?.shaker;if(!sh||!newShaker()||state.step!==0)return;
    const r=sh.getBoundingClientRect();if(!inside(e,{left:r.left,top:r.top,right:r.right,bottom:r.bottom}))return;
    e.preventDefault();e.stopImmediatePropagation();answerShaker()
  },true);
  shakerApi?.shaker?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&newShaker()&&state.step===0){e.preventDefault();answerShaker()}});

  function hideGlasses(){
    for(const id of ['highballGroup','doubleRocksGroup','rocksGroup','tikiGroup']){
      const el=document.getElementById(id);if(el){el.style.display='none';el.style.pointerEvents='none';el.setAttribute('aria-hidden','true')}
    }
  }
  async function placeGlass(key){
    const cfg=await start14(),group=document.getElementById(key==='rocksGlass'?'rocksGroup':'tikiGroup'),p=cfg.objects?.[key];if(!group||!p)return false;
    hideGlasses();
    const a=shakerApi?.glassvalAnchor||{centerX:256.33360967441587,bottomY:325.98736344742747},w=Number(p.w);
    place(group,{x:Number(a.centerX)-w/2,y:Number(a.bottomY)-w*GLASS_ASPECT,w,r:0,px:50,py:50,z:25},GLASS_ASPECT,4);
    group.style.display='block';group.setAttribute('aria-hidden','false');return true
  }

  const flakes=document.querySelector('[data-ingredient-zone="iceFlakes"]');if(flakes){flakes.style.display='none';flakes.style.pointerEvents='none'}

  /* Exact visible-pixel hit test for Drink_list.png. */
  (function(){
    const sprite=document.getElementById('drinkMenuSprite');if(!sprite)return;let ctx=null,w=0,h=0;
    function prep(){if(!(sprite.naturalWidth>0&&sprite.naturalHeight>0))return;const cv=document.createElement('canvas');w=cv.width=sprite.naturalWidth;h=cv.height=sprite.naturalHeight;ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(sprite,0,0,w,h)}
    if(sprite.complete)prep();else sprite.addEventListener('load',prep,{once:true});
    document.addEventListener('click',e=>{
      if(e.target!==sprite||!ctx)return;const r=sprite.getBoundingClientRect();if(!r.width||!r.height)return;
      const x=Math.max(0,Math.min(w-1,Math.floor((e.clientX-r.left)/r.width*w))),y=Math.max(0,Math.min(h-1,Math.floor((e.clientY-r.top)/r.height*h)));
      let a=255;try{a=ctx.getImageData(x,y,1,1).data[3]}catch(_){return}
      if(a<24){e.preventDefault();e.stopImmediatePropagation()}
    },true)
  })();

  function ratio(key){
    const el=document.querySelector('#bartenderRig .'+key);if(el?.naturalWidth>0&&el?.naturalHeight>0)return el.naturalHeight/el.naturalWidth;
    return key.startsWith('ua')?105/132:key.startsWith('la')?110/172:74/105
  }
  function pivot(cfg,key){const p=cfg.parts[key],r=ratio(key);return{x:Number(p.x)+Number(p.w)*Number(p.px)/100,y:Number(p.y)+Number(p.w)*r*Number(p.py)/100}}
  function setPivot(cfg,key,pt,r){const p=cfg.parts[key],q=ratio(key);p.r=r;p.x=pt.x-Number(p.w)*Number(p.px)/100;p.y=pt.y-Number(p.w)*q*Number(p.py)/100}
  function local(cfg,a,b){const p=pivot(cfg,a),q=pivot(cfg,b);return rot(q.x-p.x,q.y-p.y,-Number(cfg.parts[a].r))}
  function frame(start,end,t,keys){
    const [ua,lo,hand]=keys,f=clone(start),u=ease(Math.max(0,Math.min(1,t))),up=mix(pivot(start,ua),pivot(end,ua),u),ur=la(start.parts[ua].r,end.parts[ua].r,u);
    setPivot(f,ua,up,ur);
    const ll=mix(local(start,ua,lo),local(end,ua,lo),u),lp=add(up,rot(ll.x,ll.y,ur)),lr=la(start.parts[lo].r,end.parts[lo].r,u);setPivot(f,lo,lp,lr);
    const hl=mix(local(start,lo,hand),local(end,lo,hand),u),hp=add(lp,rot(hl.x,hl.y,lr)),hr=la(start.parts[hand].r,end.parts[hand].r,u);setPivot(f,hand,hp,hr);
    if(f.objects?.whiteRum&&start.objects?.whiteRum)f.objects.whiteRum={...f.objects.whiteRum,attachedTo:start.objects.whiteRum.attachedTo,attachX:start.objects.whiteRum.attachX,attachY:start.objects.whiteRum.attachY,attachR:start.objects.whiteRum.attachR};
    return f
  }
  function objAspect(el){if(el?.id==='mixerJarV414')return JAR_ASPECT;if(el?.classList?.contains('family-liqueur')||el?.classList?.contains('family-aperitif'))return 1.667;return 1.5}
  function positionObject(el,p,aspect,mirror=false,resolveAspect=aspect){
    if(!el||!p)return;const s=sc(),cx=260,cy=250,w=Number(p.w)*s;let y=Number(p.y);
    if(p.attachedTo&&resolveAspect!==aspect)y+=Number(p.w)*(resolveAspect-aspect)*Number(p.py??50)/100;
    el.style.position='absolute';el.style.left=(cx+(Number(p.x)-cx)*s)+'px';el.style.top=(cy+(y-cy)*s+(p.attachedTo?0:4))+'px';el.style.width=w+'px';el.style.height=(w*aspect)+'px';el.style.maxWidth='none';
    el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';el.style.transform='rotate('+(Number(p.r)||0)+'deg)'+(mirror?' scaleX(-1)':'');el.style.zIndex=String(p.z??16);el.style.display='block';el.style.visibility='visible'
  }
  const cap=(el,hide)=>{const c=el?.querySelector?.('.bottleCap');if(c)c.style.display=hide?'none':''};
  async function animate(start,end,prepared,keys,el,aspect,mirror,resolveAspect){
    return new Promise((resolve,reject)=>{const begun=performance.now();function tick(now){try{const t=Math.min(1,(now-begun)/MOVE_MS),f=frame(start,end,t,keys);scene.renderBartenderPoseFrame(f,prepared);positionObject(el,scene.resolveAttachments(f,prepared).objects?.whiteRum,aspect,mirror,resolveAspect);if(t>=1)return resolve();requestAnimationFrame(tick)}catch(e){reject(e)}}requestAnimationFrame(tick)})
  }
  async function playAttached({startUrl,endUrl,keys,el,aspect,mirror=false,detach=false,resolveAspect=aspect}){
    if(pourBusy)return false;if(!el)throw new Error('Animationsobjekt saknas');pourBusy=true;
    const prevCfg=scene.activeConfig?clone(scene.activeConfig):null,prevPrepared=scene.currentPrepared?.()||null,prevTarget=scene.activeBottleElement?.()||'whiteRumBottle';
    const oldStyle=el.getAttribute('style'),oldParent=el.parentNode,oldNext=el.nextSibling,oldCap=el.querySelector?.('.bottleCap')?.style.display??'';
    try{
      if(detach&&objectLayer&&el.parentNode!==objectLayer)objectLayer.appendChild(el);
      scene.setActiveBottleElement?.(el.id);cap(el,true);
      const [s,e]=await Promise.all([scene.loadConfig(startUrl),scene.loadConfig(endUrl)]),prepared=await scene.prepareConfig(s);
      scene.renderBartenderPoseFrame(s,prepared);positionObject(el,scene.resolveAttachments(s,prepared).objects?.whiteRum,aspect,mirror,resolveAspect);await wait(START_HOLD_MS);
      await animate(s,e,prepared,keys,el,aspect,mirror,resolveAspect);await wait(HOLD_MS);await animate(e,s,prepared,keys,el,aspect,mirror,resolveAspect);return true
    }finally{
      if(oldStyle==null)el.removeAttribute('style');else el.setAttribute('style',oldStyle);
      const cp=el.querySelector?.('.bottleCap');if(cp)cp.style.display=oldCap;
      if(detach&&oldParent){if(oldNext&&oldNext.parentNode===oldParent)oldParent.insertBefore(el,oldNext);else oldParent.appendChild(el)}
      scene.setActiveBottleElement?.(prevTarget);if(prevCfg&&prevPrepared)scene.renderBartenderPoseFrame(prevCfg,prevPrepared);pourBusy=false
    }
  }
  const playPourMixer=bottle=>playAttached({startUrl:POUR_MIXER_START,endUrl:POUR_MIXER_END,keys:['uaR','laR','hR'],el:bottle,aspect:objAspect(bottle)});
  const playJarPour=()=>playAttached({startUrl:POUR_DRINK_START,endUrl:POUR_DRINK_END,keys:['uaL','laL','hL'],el:jar(),aspect:JAR_ASPECT,mirror:true,detach:true,resolveAspect:1.5});

  if(window.__barBottle396?.playCorrect){
    const oldPlay=window.__barBottle396.playCorrect.bind(window.__barBottle396);
    window.__barBottle396.playCorrect=async function(id,spirit){
      if(state.drink?.id==='pinaColada'&&state.step===1&&String(spirit)==='white-rum')return playPourMixer(document.getElementById(id));
      return oldPlay(id,spirit)
    }
  }

  async function prepShaker(){await glassval.apply('shaker');shakerApi?.shaker?.classList.add('lidOff')}
  async function pourShaker(spirit){const sh=shakerApi?.shaker,run=window.__barBottle396?.playCorrect;if(!sh||typeof run!=='function')return false;await Promise.resolve(run(sh.id,spirit));sh.style.display='none';return true}

  const oldAdvance=advanceStep;
  advanceStep=function(s){
    const id=state.drink?.id,n=state.step;
    if((id==='jungleBird'||id==='ibaTiki')&&n===0&&cv(s?.a)===cv('Shaker')){prepShaker().then(()=>oldAdvance(s)).catch(e=>{console.error('v4.14 shaker-val',e);oldAdvance(s)});return}
    if(id==='ibaTiki'&&n===1&&cv(s?.a)===cv('Ingefära')){
      const line='Nu muddlar jag ingefäran i shakern.',el=document.getElementById('dialogText');if(el)el.textContent=line;
      Promise.resolve(typeof barPlayTtsV337==='function'?barPlayTtsV337(line):null).catch(()=>{}).then(()=>oldAdvance(s));return
    }
    if(id==='jungleBird'&&n===6&&cv(s?.a)===cv('Rocks-glas')){placeGlass('rocksGlass').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}
    if(id==='jungleBird'&&n===7&&cv(s?.a)===cv('Isbitar')){pourShaker('jungle-bird-shaker').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}
    if(id==='ibaTiki'&&n===10&&cv(s?.a)===cv('Tiki-glas')){placeGlass('tikiGlass').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}
    if(id==='ibaTiki'&&n===11&&cv(s?.a)===cv('Krossad is')){pourShaker('iba-tiki-shaker').then(()=>oldAdvance(s)).catch(()=>oldAdvance(s));return}
    if(id==='pinaColada'&&n===5&&cv(s?.a)===cv('Stort glas')){hideGlasses();playJarPour().then(()=>oldAdvance(s)).catch(e=>{console.error('Piña kanna-pour',e);oldAdvance(s)});return}
    return oldAdvance(s)
  };

  const oldFinalize=finalizeLandscapeReturn;
  finalizeLandscapeReturn=function(force=false){
    const hit=newShaker()&&state.action==='shake'&&state.waitingLandscape;if(!hit)return oldFinalize(force);if(newShakeReturnBusy)return;
    newShakeReturnBusy=true;Promise.resolve(shakerApi?.placeShakerAtPourStart?.()).catch(()=>{}).finally(()=>{newShakeReturnBusy=false;oldFinalize(force)})
  };

  const oldMuddleMarkup=document.getElementById('muddleGlass')?.innerHTML||'',oldShow=showPhysicalStage;
  showPhysicalStage=function(){
    oldShow();
    const st=document.querySelector('#shakeStage .shaker');
    if(newShaker()&&state.action==='shake'&&st){
      st.innerHTML='<img class="shakeSpriteBase" src="ShakerUnderdel.png" alt=""><img class="shakeSpriteLid" src="ShakerLock.png" alt="">';
      const ps=shakerApi?.shakerSystemFallback?.parts||{},ap=(el,p)=>{if(!el||!p)return;el.style.position='absolute';el.style.left=Number(p.x)+'%';el.style.top=Number(p.y)+'%';el.style.width=Number(p.w)+'%';el.style.height=Number(p.w)+'%';el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';el.style.transform='rotate('+(p.r||0)+'deg)';el.style.zIndex=String(p.z??0)};
      ap(st.querySelector('.shakeSpriteBase'),ps.shakerBase);ap(st.querySelector('.shakeSpriteLid'),ps.shakerLid);
      const h=document.querySelector('#shakeStage h2'),p=document.querySelector('#shakeStage p');if(h)h.textContent=state.drink?.id==='ibaTiki'?'Skaka IBA Tiki kraftigt!':'Skaka Jungle Bird!';if(p)p.textContent=state.drink?.id==='ibaTiki'?'Skaka telefonen tydligt kraftigare än normalt.':'Skaka telefonen som en riktig shaker.'
    }
    const mg=document.getElementById('muddleGlass');
    if(mg&&state.drink?.id==='pinaColada'&&state.action==='blend'){
      if(!mg.classList.contains('pinaBlendV414')){mg.innerHTML='<img class="blendBaseV414" src="MixerBas.png" alt=""><img class="blendJarV414" src="MixerKanna.png" alt="">';mg.classList.add('pinaBlendV414')}
    }else if(mg?.classList.contains('pinaBlendV414')){mg.innerHTML=oldMuddleMarkup;mg.classList.remove('pinaBlendV414')}
  };

  document.addEventListener('click',e=>{
    const z=e.target.closest?.('[data-ingredient-zone]');if(!z||state.phase!=='recipe')return;
    const spec=state.drink?.id==='pinaColada'&&state.step===6?{need:[['ananasGarnish','Ananasskiva'],['korsbar','cocktailkörsbär']],answer:'Ananasskiva och cocktailkörsbär'}:
      state.drink?.id==='ibaTiki'&&state.step===12?{need:[['lime','Lime'],['ananasGarnish','ananasskiva']],answer:'Lime och ananasskiva'}:null;
    if(!spec)return;e.preventDefault();e.stopImmediatePropagation();
    const f=spec.need.find(x=>x[0]===z.dataset.ingredientZone),s=step();
    if(!f){if(typeof registerWrongIngredientV388==='function')registerWrongIngredientV388(s,z.getAttribute('aria-label')||z.dataset.ingredientZone);return}
    const cur=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];if(!cur.some(x=>cv(x)===cv(f[1])))cur.push(f[1]);state.aiCorrectParts=cur;z.classList.add('good');
    if(spec.need.every(x=>cur.some(v=>cv(v)===cv(x[1]))))answerKnownChoice(spec.answer,z);else if(typeof registerPartialIngredientV391==='function')registerPartialIngredientV391(s,f[1])
  },true);

  const oldOrder=orderDrink;
  orderDrink=function(d){const r=oldOrder(d);applyStart().catch(e=>console.error('v4.14 start14',e));return r};
  const reset=()=>applyStart().catch(e=>console.error('v4.14 reset',e));
  document.getElementById('anotherBtn')?.addEventListener('click',reset,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',reset,true);
  applyStart().catch(e=>console.error('v4.14 initial start14',e));

  window.__barV414={startUrl:START14_URL,mixer,applyStart,playPourMixer,playJarPour,placeGlass,buildable:['pinaColada','jungleBird','ibaTiki']};
})();