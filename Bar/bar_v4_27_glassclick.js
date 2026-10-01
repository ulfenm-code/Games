'use strict';
/* Bar Game v4.27: glasses visible from start, clickable glass answers and glass identification. */
(function(){
  const START_URL='./bartender_installningar_start15.json';
  const scene=window.__barSceneConfig3105||window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const barScene=document.getElementById('barScene');
  if(!scene||!barScene)return;

  const defs=[
    {groupId:'highballGroup',key:'highballGlass',answer:'Highballglas',spoken:'Highballglas',aspect:null},
    {groupId:'doubleRocksGroup',key:'doubleRocksGlass',answer:'Double Rocks-glas',spoken:'Double Rocks-glas',aspect:1402/1122},
    {groupId:'rocksGroup',key:'rocksGlass',answer:'Rocks-glas',spoken:'Rocks-glas',aspect:1402/1122},
    {groupId:'tikiGroup',key:'tikiGlass',answer:'Tiki-glas',spoken:'Tiki-glas',aspect:1402/1122}
  ];
  const answerSet=new Set(defs.map(d=>canon(d.answer)));
  let cfgPromise=null;
  let glassChosen=false;
  let showTimer=0;

  function cfg(){
    if(!cfgPromise)cfgPromise=scene.loadConfig(START_URL);
    return cfgPromise;
  }
  function scale(){return window.__barScale359?.finalGameFactor||1}
  function currentStep(){
    if(state.phase!=='recipe'||!state.drink||!Array.isArray(state.drink.steps))return null;
    return state.drink.steps[state.step]||null;
  }
  function isGlassQuestion(s=currentStep()){
    return Boolean(s&&answerSet.has(canon(s.a||'')));
  }
  function tasteContext(){
    return Boolean(state?.mojitoReadyToTaste||state?.tasteReady417);
  }
  function highballAspect(){
    const img=document.getElementById('highballGlass');
    return img?.naturalWidth>0?img.naturalHeight/img.naturalWidth:2.4;
  }
  function positionOne(def,p){
    const g=document.getElementById(def.groupId);if(!g||!p)return;
    const s=scale(),cx=260,cy=250,w=Number(p.w)*s,aspect=def.aspect||highballAspect();
    g.style.left=(cx+(Number(p.x)-cx)*s)+'px';
    g.style.top=(cy+(Number(p.y)-cy)*s+4)+'px';
    g.style.width=w+'px';
    g.style.height=(w*aspect)+'px';
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
  async function showShelfGlasses(){
    if(glassChosen)return;
    try{
      const c=await cfg();
      if(glassChosen)return;
      defs.forEach(d=>positionOne(d,c.objects?.[d.key]));
    }catch(e){console.error('v4.27 startglas',e)}
  }
  function scheduleShow(delay=0){
    clearTimeout(showTimer);
    showTimer=setTimeout(()=>{showTimer=0;showShelfGlasses()},delay);
  }
  function defFromTarget(target){
    if(!(target instanceof Element))return null;
    for(const d of defs){
      const g=document.getElementById(d.groupId);
      if(g&&(target===g||g.contains(target)))return d;
    }
    return null;
  }
  function speakGlass(def){
    const text='Det är ett '+def.spoken+'.';
    try{if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:true});else if(typeof stopSpeech==='function')stopSpeech()}catch(_){}
    try{
      if(typeof barPlayTtsV337==='function')Promise.resolve(barPlayTtsV337(text)).catch(()=>{});
      else if(typeof speak==='function')speak(text);
    }catch(_){}
  }
  function handleGlass(def,e){
    const s=currentStep();
    if(isGlassQuestion(s)){
      e?.preventDefault?.();e?.stopImmediatePropagation?.();
      answerKnownChoice(def.answer,null);
      return true;
    }
    if(tasteContext())return false;
    e?.preventDefault?.();e?.stopImmediatePropagation?.();
    speakGlass(def);
    return true;
  }

  barScene.addEventListener('pointerdown',e=>{
    const def=defFromTarget(e.target);if(!def)return;
    handleGlass(def,e);
  },true);

  defs.forEach(def=>{
    const g=document.getElementById(def.groupId);if(!g)return;
    g.addEventListener('keydown',e=>{
      if(e.key!=='Enter'&&e.key!==' ')return;
      e.preventDefault();handleGlass(def,e);
    });
  });

  const previousRenderStep=renderStep;
  renderStep=function(newStep=false){
    const r=previousRenderStep(newStep);
    if(!glassChosen)scheduleShow(0);
    return r;
  };

  const previousAdvanceStep=advanceStep;
  advanceStep=function(s){
    if(isGlassQuestion(s))glassChosen=true;
    return previousAdvanceStep(s);
  };

  const previousOrderDrink=orderDrink;
  orderDrink=function(d){
    glassChosen=false;
    const r=previousOrderDrink(d);
    scheduleShow(0);
    scheduleShow(250);
    return r;
  };

  document.addEventListener('barconfigapplied',()=>{
    if(!glassChosen)scheduleShow(0);
  });
  window.addEventListener('resize',()=>{if(!glassChosen)scheduleShow(0)});
  window.addEventListener('orientationchange',()=>{if(!glassChosen)scheduleShow(120)});

  for(const id of ['anotherBtn','changeMoodBtn']){
    document.getElementById(id)?.addEventListener('click',()=>{
      glassChosen=false;scheduleShow(80);
    },true);
  }

  scheduleShow(0);
  scheduleShow(300);
  window.__barGlassClick427={showShelfGlasses,isGlassQuestion,defs:defs.map(d=>({...d}))};
})();
