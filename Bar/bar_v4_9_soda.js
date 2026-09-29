'use strict';
/* Bar Game v4.9: SodaSifon click-only pour animation. The siphon never attaches to a hand. */
(function(){
  const START_URL='./bartender_installningar_start&stopDrink.json';
  const POUR_SODA_URL='./bartender_installningar_pourSoda.json';
  const HOME_URL='./bartender_installningar_start13.json';
  const MOVE_MS=1500;
  const START_HOLD_MS=220;
  const POUR_HOLD_MS=2000;
  const scene=window.__barSceneConfig49||window.__barSceneConfig3105||window.__barSceneConfig385;
  const siphon=document.getElementById('sodaSifon');
  if(!scene||!siphon)return;

  let busy=false;
  let rafId=0;
  const FALLBACK_RATIOS={uaL:105/132,laL:110/172,hL:74/105};

  function clone(v){return JSON.parse(JSON.stringify(v))}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function lerp(a,b,t){return Number(a)+(Number(b)-Number(a))*t}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function angleDelta(a,b){return ((Number(b)-Number(a)+540)%360)-180}
  function lerpAngle(a,b,t){return ((Number(a)+angleDelta(a,b)*t)%360+360)%360}
  function rotateVector(x,y,deg){
    const a=Number(deg||0)*Math.PI/180;
    return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}
  }
  function ratioFor(key){
    const cls=key==='uaL'?'.uaL':key==='laL'?'.laL':'.hL';
    const el=document.querySelector('#bartenderRig '+cls);
    if(el?.naturalWidth>0&&el?.naturalHeight>0)return el.naturalHeight/el.naturalWidth;
    return FALLBACK_RATIOS[key]||1
  }
  function partPivot(cfg,key){
    const p=cfg.parts[key],ratio=ratioFor(key);
    return {x:Number(p.x)+Number(p.w)*Number(p.px)/100,y:Number(p.y)+Number(p.w)*ratio*Number(p.py)/100}
  }
  function setPartPivot(cfg,key,pt,r){
    const p=cfg.parts[key],ratio=ratioFor(key);
    p.r=r;
    p.x=pt.x-Number(p.w)*Number(p.px)/100;
    p.y=pt.y-Number(p.w)*ratio*Number(p.py)/100
  }
  function localJointVector(cfg,parent,child){
    const pp=partPivot(cfg,parent),cp=partPivot(cfg,child);
    return rotateVector(cp.x-pp.x,cp.y-pp.y,-Number(cfg.parts[parent].r))
  }
  function mixVec(a,b,t){return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)}}
  function addVec(a,b){return {x:a.x+b.x,y:a.y+b.y}}

  /* In the rig, uaL/laL/hL is the bartender's visually/anatomically right arm. */
  function rightArmFrame(start,end,t){
    const f=clone(start);
    const u=ease(Math.max(0,Math.min(1,t)));
    const uaPivot=mixVec(partPivot(start,'uaL'),partPivot(end,'uaL'),u);
    const uaR=lerpAngle(start.parts.uaL.r,end.parts.uaL.r,u);
    setPartPivot(f,'uaL',uaPivot,uaR);
    const laLocal=mixVec(localJointVector(start,'uaL','laL'),localJointVector(end,'uaL','laL'),u);
    const laPivot=addVec(uaPivot,rotateVector(laLocal.x,laLocal.y,uaR));
    const laR=lerpAngle(start.parts.laL.r,end.parts.laL.r,u);
    setPartPivot(f,'laL',laPivot,laR);
    const handLocal=mixVec(localJointVector(start,'laL','hL'),localJointVector(end,'laL','hL'),u);
    const handPivot=addVec(laPivot,rotateVector(handLocal.x,handLocal.y,laR));
    const handR=lerpAngle(start.parts.hL.r,end.parts.hL.r,u);
    setPartPivot(f,'hL',handPivot,handR);
    return f
  }
  function animate(start,end,prepared){
    return new Promise((resolve,reject)=>{
      const begun=performance.now();
      function tick(now){
        try{
          const t=Math.min(1,(now-begun)/MOVE_MS);
          scene.renderBartenderPoseFrame(rightArmFrame(start,end,t),prepared);
          if(t>=1){rafId=0;resolve();return}
          rafId=requestAnimationFrame(tick)
        }catch(err){rafId=0;reject(err)}
      }
      rafId=requestAnimationFrame(tick)
    })
  }
  function isSodaStep(step){return Boolean(step&&typeof canon==='function'&&canon(step.a||'')===canon('Sodavatten'))}
  function currentStep(){return state?.phase==='recipe'?state.drink?.steps?.[state.step]||null:null}
  async function restore(previousCfg,previousPrepared,homeCfg){
    try{
      if(previousCfg&&previousPrepared)scene.renderBartenderPoseFrame(previousCfg,previousPrepared)
    }catch(e){console.error('Soda: bartender restore',e)}
    try{
      if(homeCfg?.objects?.sodaSifon)scene.applyObjectOnly('sodaSifon',homeCfg.objects.sodaSifon)
    }catch(e){console.error('Soda: sifon restore',e)}
  }
  async function playCorrect(step){
    if(busy||!isSodaStep(step))return false;
    busy=true;
    const previousCfg=scene.activeConfig?clone(scene.activeConfig):null;
    const previousPrepared=scene.currentPrepared?.()||null;
    let homeCfg=null;
    try{
      const [startCfg,endCfg,home]=await Promise.all([
        scene.loadConfig(START_URL),
        scene.loadConfig(POUR_SODA_URL),
        scene.loadConfig(HOME_URL)
      ]);
      homeCfg=home;
      const [startPrepared,endPrepared]=await Promise.all([
        scene.prepareConfig(startCfg),
        scene.prepareConfig(endCfg)
      ]);

      /* Move the independent siphon to the bottle work position once. It stays still during the arm animation. */
      scene.applyObjectOnly('sodaSifon',endCfg.objects.sodaSifon);
      scene.renderBartenderPoseFrame(startCfg,startPrepared);
      await wait(START_HOLD_MS);
      await animate(startCfg,endCfg,startPrepared);
      scene.renderBartenderPoseFrame(endCfg,endPrepared);
      await wait(POUR_HOLD_MS);
      await animate(endCfg,startCfg,startPrepared);
      scene.renderBartenderPoseFrame(startCfg,startPrepared);
      await restore(previousCfg,previousPrepared,homeCfg);
      return true
    }catch(err){
      console.error('SodaSifon-animation misslyckades',err);
      await restore(previousCfg,previousPrepared,homeCfg);
      return false
    }finally{
      busy=false
    }
  }
  async function activate(){
    if(busy)return;
    const step=currentStep();
    if(!isSodaStep(step))return;
    try{window.__barAI391?.interrupt?.({resumeVoice:true})}catch(_){}
    await playCorrect(step);
    if(state.phase==='recipe'&&state.drink&&state.drink.steps[state.step]===step){
      completeRecipeStep(step,false)
    }
  }

  siphon.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activate()});
  siphon.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();activate()}
  });

  window.__barSodaPour49={
    startUrl:START_URL,
    pourUrl:POUR_SODA_URL,
    homeUrl:HOME_URL,
    playCorrect,
    activate,
    busy:()=>busy,
    isSodaStep
  };
})();