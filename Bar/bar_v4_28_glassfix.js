'use strict';
/* Bar Game v4.28: robust clickable glasses + persistent unselected shelf glasses. */
(function(){
  const START_URL='./bartender_installningar_start15.json';
  const scene=window.__barSceneConfig3105||window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const barScreen=document.getElementById('barScreen');
  if(!scene||!barScreen)return;

  const defs=[
    {groupId:'highballGroup',key:'highballGlass',answer:'Highballglas',spoken:'Highballglas'},
    {groupId:'doubleRocksGroup',key:'doubleRocksGlass',answer:'Double Rocks-glas',spoken:'Double Rocks-glas'},
    {groupId:'rocksGroup',key:'rocksGlass',answer:'Rocks-glas',spoken:'Rocks-glas'},
    {groupId:'tikiGroup',key:'tikiGlass',answer:'Tiki-glas',spoken:'Tiki-glas'}
  ];
  const byAnswer=new Map(defs.map(d=>[canon(d.answer),d]));
  let cfgPromise=null;
  let selectedGroupId=null;
  let ensureTimers=[];
  let suppressGlassClickUntil=0;
  let syntheticTasteClick=false;

  const style=document.createElement('style');
  style.textContent=
    '#highballGroup,#doubleRocksGroup,#rocksGroup,#tikiGroup{pointer-events:auto!important;touch-action:manipulation;cursor:pointer}';
  document.head.appendChild(style);

  function config(){
    if(!cfgPromise)cfgPromise=scene.loadConfig(START_URL);
    return cfgPromise;
  }
  function scale(){return window.__barScale359?.finalGameFactor||1}
  function aspect(def){
    const img=document.querySelector('#'+def.groupId+' > img');
    if(img?.naturalWidth>0)return img.naturalHeight/img.naturalWidth;
    if(def.groupId==='highballGroup'){
      const hi=document.getElementById('highballGlass');
      if(hi?.naturalWidth>0)return hi.naturalHeight/hi.naturalWidth;
      return 2.4;
    }
    return 1402/1122;
  }
  function placeHome(def,p){
    const g=document.getElementById(def.groupId);
    if(!g||!p||def.groupId===selectedGroupId)return;
    if(g.parentElement?.id!=='barObjectLayer')return;
    const s=scale(),cx=260,cy=250,w=Number(p.w)*s;
    g.classList.remove('maiTaiSelectedGlass');
    g.style.left=(cx+(Number(p.x)-cx)*s)+'px';
    g.style.top=(cy+(Number(p.y)-cy)*s+4)+'px';
    g.style.width=w+'px';
    g.style.height=(w*aspect(def))+'px';
    g.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    g.style.transform='rotate('+(Number(p.r)||0)+'deg)';
    g.style.zIndex=String(p.z??25);
    g.style.display='block';
    g.style.pointerEvents='auto';
    g.style.cursor='pointer';
    g.setAttribute('aria-hidden','false');
    g.setAttribute('role','button');
    g.setAttribute('tabindex','0');
    g.setAttribute('aria-label',def.spoken);
  }
  async function ensureUnselectedHome(){
    try{
      const c=await config();
      defs.forEach(d=>placeHome(d,c.objects?.[d.key]));
    }catch(e){console.error('v4.28 startglas',e)}
  }
  function queueEnsure(){
    ensureTimers.forEach(clearTimeout);
    ensureTimers=[
      setTimeout(ensureUnselectedHome,0),
      setTimeout(ensureUnselectedHome,90),
      setTimeout(ensureUnselectedHome,300),
      setTimeout(ensureUnselectedHome,800)
    ];
  }
  function currentStep(){
    if(state.phase!=='recipe'||!state.drink||!Array.isArray(state.drink.steps))return null;
    return state.drink.steps[state.step]||null;
  }
  function isGlassQuestion(s=currentStep()){
    return Boolean(s&&byAnswer.has(canon(s.a||'')));
  }
  function pointInside(r,x,y){
    return r.width>0&&r.height>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  }
  function glassAtPoint(x,y){
    const hits=[];
    for(const d of defs){
      const g=document.getElementById(d.groupId);
      if(!g||getComputedStyle(g).display==='none')continue;
      const r=g.getBoundingClientRect();
      if(pointInside(r,x,y))hits.push({d,r,area:r.width*r.height});
    }
    hits.sort((a,b)=>a.area-b.area);
    return hits[0]?.d||null;
  }
  function blockedUiTarget(target){
    if(!(target instanceof Element))return false;
    return Boolean(target.closest(
      '#dialogControls,.dialog,.hud,#drinkBookOverlay.open,#instructionOverlay.open,#crazyFallOverlay.active'
    ));
  }
  function speakGlass(def){
    const text='Det är ett '+def.spoken+'.';
    try{
      if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:true});
      else if(typeof stopSpeech==='function')stopSpeech();
    }catch(_){}
    try{
      if(typeof barPlayTtsV337==='function')Promise.resolve(barPlayTtsV337(text)).catch(()=>{});
      else if(typeof speak==='function')speak(text);
    }catch(_){}
  }
  function startTasteIfReady(def){
    if(state?.drink?.id==='mojito'&&state?.mojitoReadyToTaste&&def.groupId==='highballGroup'){
      window.__barTaste385?.start?.();
      return true;
    }
    if(state?.tasteReady417&&state?.drink?.id===state.tasteReady417){
      const map={
        pinaColada:'highballGroup',
        jungleBird:'rocksGroup',
        ibaTiki:'tikiGroup'
      };
      if(map[state.tasteReady417]===def.groupId){
        window.__barTools417?.startTaste?.(state.tasteReady417);
        return true;
      }
    }
    if(state?.drink?.id==='maiTai'&&state?.maiTaiTasteReady&&def.groupId==='doubleRocksGroup'){
      const g=document.getElementById(def.groupId);
      if(g){
        syntheticTasteClick=true;
        try{g.click()}finally{syntheticTasteClick=false}
      }
      return true;
    }
    return false;
  }
  function handleGlassPointer(e){
    if(!barScreen.classList.contains('active'))return;
    if(blockedUiTarget(e.target))return;
    const def=glassAtPoint(Number(e.clientX),Number(e.clientY));
    if(!def)return;

    suppressGlassClickUntil=performance.now()+900;
    e.preventDefault();
    e.stopImmediatePropagation();

    if(startTasteIfReady(def))return;

    const s=currentStep();
    if(isGlassQuestion(s)){
      answerKnownChoice(def.answer,null);
      return;
    }
    speakGlass(def);
  }

  document.addEventListener('pointerdown',handleGlassPointer,true);
  document.addEventListener('click',e=>{
    if(syntheticTasteClick)return;
    if(performance.now()>suppressGlassClickUntil)return;
    if(!barScreen.classList.contains('active'))return;
    const def=glassAtPoint(Number(e.clientX),Number(e.clientY));
    if(!def)return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);

  const previousAdvanceStep=advanceStep;
  advanceStep=function(s){
    const d=byAnswer.get(canon(s?.a||''));
    if(d)selectedGroupId=d.groupId;
    const r=previousAdvanceStep(s);
    queueEnsure();
    return r;
  };

  const previousRenderStep=renderStep;
  renderStep=function(newStep=false){
    const r=previousRenderStep(newStep);
    queueEnsure();
    return r;
  };

  const previousOrderDrink=orderDrink;
  orderDrink=function(d){
    selectedGroupId=null;
    const r=previousOrderDrink(d);
    queueEnsure();
    return r;
  };

  document.addEventListener('barconfigapplied',queueEnsure);
  window.addEventListener('resize',queueEnsure);
  window.addEventListener('orientationchange',()=>setTimeout(queueEnsure,120));

  const observer=new MutationObserver(()=>{
    if(barScreen.classList.contains('active'))queueEnsure();
  });
  observer.observe(barScreen,{attributes:true,attributeFilter:['class']});

  for(const id of ['anotherBtn','changeMoodBtn']){
    document.getElementById(id)?.addEventListener('click',()=>{
      selectedGroupId=null;
      setTimeout(queueEnsure,100);
    },true);
  }

  queueEnsure();
  window.__barGlassFix428={
    ensureUnselectedHome,
    selected:()=>selectedGroupId,
    hit:(x,y)=>glassAtPoint(x,y)?.groupId||null
  };
})();
