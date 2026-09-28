'use strict';
/* Bar Game v3.102 generic pour phases for glass-content animation. */
(function(){
  const START_URL='./bartender_installningar_start&stopDrink.json';
  const POUR_URL='./bartender_installningar_poorDrink.json';
  const START_HOLD_MS=220;
  const POUR_HOLD_MS=2000;
  const MOVE_MS=1500;
  const scene=window.__barSceneConfig396||window.__barSceneConfig385;
  let busy=false;
  let rafId=0;
  let restoreCurrent=null;

  const FALLBACK_RATIOS={uaL:105/132,laL:110/172,hL:74/105};

  function clone(v){return JSON.parse(JSON.stringify(v))}
  function lerp(a,b,t){return Number(a)+(Number(b)-Number(a))*t}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function angleDelta(a,b){return ((Number(b)-Number(a)+540)%360)-180}
  function lerpAngle(a,b,t){return ((Number(a)+angleDelta(a,b)*t)%360+360)%360}
  function rotateVector(x,y,deg){
    const a=Number(deg||0)*Math.PI/180;
    return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};
  }
  function ratioFor(key){
    const cls=key==='uaL'?'.uaL':key==='laL'?'.laL':'.hL';
    const el=document.querySelector('#bartenderRig '+cls);
    if(el?.naturalWidth>0&&el?.naturalHeight>0)return el.naturalHeight/el.naturalWidth;
    return FALLBACK_RATIOS[key]||1;
  }
  function partPivot(cfg,key){
    const p=cfg.parts[key],ratio=ratioFor(key);
    return {x:Number(p.x)+Number(p.w)*Number(p.px)/100,y:Number(p.y)+Number(p.w)*ratio*Number(p.py)/100};
  }
  function setPartPivot(cfg,key,pt,r){
    const p=cfg.parts[key],ratio=ratioFor(key);
    p.r=r;
    p.x=pt.x-Number(p.w)*Number(p.px)/100;
    p.y=pt.y-Number(p.w)*ratio*Number(p.py)/100;
  }
  function localJointVector(cfg,parent,child){
    const pp=partPivot(cfg,parent),cp=partPivot(cfg,child);
    return rotateVector(cp.x-pp.x,cp.y-pp.y,-Number(cfg.parts[parent].r));
  }
  function mixVec(a,b,t){return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)}}
  function addVec(a,b){return {x:a.x+b.x,y:a.y+b.y}}
  function sanitizeConfig(input){
    const cfg=clone(input);
    const objects={};
    if(cfg.objects?.whiteRum)objects.whiteRum=clone(cfg.objects.whiteRum);
    if(cfg.objects?.highballGlass)objects.highballGlass=clone(cfg.objects.highballGlass);
    cfg.objects=objects;
    return cfg;
  }
  function armFrame(start,end,t){
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
    f.objects.whiteRum={...f.objects.whiteRum,
      attachedTo:start.objects.whiteRum.attachedTo,
      attachX:start.objects.whiteRum.attachX,
      attachY:start.objects.whiteRum.attachY,
      attachR:start.objects.whiteRum.attachR
    };
    return f;
  }
  function selectedBottle(id){
    return document.getElementById(id||'whiteRumBottle')||document.getElementById('whiteRumBottle');
  }
  function setCapHidden(el,hidden){
    const cap=el?.querySelector?.('.bottleCap');
    if(cap)cap.style.display=hidden?'none':'';
  }
  function syncGarnish(cfg){
    const glass=window.__barGlass396||window.__barGlass385;
    if(glass?.visual?.garnish&&typeof glass.syncGarnishFromConfig==='function'){
      glass.syncGarnishFromConfig(cfg);
    }
  }
  function renderFrame(cfg,prepared,bottle){
    scene.renderPoseFrame(cfg,prepared,{showGlass:null});
    setCapHidden(bottle,true);
    syncGarnish(cfg);
  }
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function emitPourPhase(phase,bottle,spiritId,extra={}){
    document.dispatchEvent(new CustomEvent('barpourphase',{detail:{
      phase,
      bottleId:bottle?.id||null,
      spiritId:String(spiritId||''),
      moveMs:MOVE_MS,
      holdMs:POUR_HOLD_MS,
      ...extra
    }}));
  }
  function animate(start,end,prepared,bottle){
    return new Promise((resolve,reject)=>{
      const begun=performance.now();
      function tick(now){
        try{
          const t=Math.min(1,(now-begun)/MOVE_MS);
          renderFrame(armFrame(start,end,t),prepared,bottle);
          if(t>=1){rafId=0;resolve();return}
          rafId=requestAnimationFrame(tick);
        }catch(err){rafId=0;reject(err)}
      }
      rafId=requestAnimationFrame(tick);
    });
  }

  async function playCorrect(bottleElementId,spiritId){
    if(busy)return false;
    if(!scene?.loadConfig||!scene?.prepareConfig||!scene?.renderPoseFrame||!scene?.setActiveBottleElement){
      throw new Error('Generell flaskanimation saknar v3.96 scenmotor');
    }
    const bottle=selectedBottle(bottleElementId);
    if(!bottle)throw new Error('Vald flaska saknas');
    if(!bottle.id)bottle.id='activeSpiritBottle396';
    busy=true;

    const previousCfg=scene.activeConfig?clone(scene.activeConfig):null;
    const previousPrepared=scene.currentPrepared?.()||null;
    const previousTarget=scene.activeBottleElement?.()||'whiteRumBottle';
    const previousStyle=bottle.getAttribute('style');
    const cap=bottle.querySelector?.('.bottleCap');
    const previousCapDisplay=cap?.style.display??'';

    restoreCurrent=()=>{
      if(previousStyle==null)bottle.removeAttribute('style');else bottle.setAttribute('style',previousStyle);
      if(cap)cap.style.display=previousCapDisplay;
      scene.setActiveBottleElement(previousTarget);
      if(previousCfg&&previousPrepared){
        scene.renderPoseFrame(previousCfg,previousPrepared,{showGlass:null});
        syncGarnish(previousCfg);
      }
      restoreCurrent=null;
    };

    try{
      scene.setActiveBottleElement(bottle.id);
      setCapHidden(bottle,true);
      const [startRaw,endRaw]=await Promise.all([scene.loadConfig(START_URL),scene.loadConfig(POUR_URL)]);
      const startCfg=sanitizeConfig(startRaw),endCfg=sanitizeConfig(endRaw);
      const [startPrepared,endPrepared]=await Promise.all([scene.prepareConfig(startCfg),scene.prepareConfig(endCfg)]);
      renderFrame(startCfg,startPrepared,bottle);
      emitPourPhase('ready',bottle,spiritId,{holdMs:START_HOLD_MS});
      await wait(START_HOLD_MS);
      emitPourPhase('move-to-pour',bottle,spiritId);
      await animate(startCfg,endCfg,startPrepared,bottle);
      renderFrame(endCfg,endPrepared,bottle);
      emitPourPhase('pour-hold',bottle,spiritId,{holdMs:POUR_HOLD_MS});
      await wait(POUR_HOLD_MS);
      emitPourPhase('return',bottle,spiritId);
      await animate(endCfg,startCfg,startPrepared,bottle);
      restoreCurrent?.();
      emitPourPhase('complete',bottle,spiritId);
      return true;
    }catch(err){
      restoreCurrent?.();
      emitPourPhase('error',bottle,spiritId,{message:String(err&&err.message?err.message:err)});
      console.error('Bar v3.102 generic bottle animation:',err,'spirit=',spiritId);
      throw err;
    }finally{
      busy=false;
    }
  }

  function reset(){
    if(rafId){cancelAnimationFrame(rafId);rafId=0}
    restoreCurrent?.();
    busy=false;
  }

  if(typeof orderDrink==='function'){
    const originalOrderDrink=orderDrink;
    orderDrink=function(d){reset();return originalOrderDrink(d)};
  }
  document.getElementById('anotherBtn')?.addEventListener('click',reset,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',reset,true);

  window.__barBottle396={
    startUrl:START_URL,
    pourUrl:POUR_URL,
    playCorrect,
    reset,
    busy:()=>busy
  };
})();