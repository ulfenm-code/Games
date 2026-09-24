'use strict';
(function(){
  const START_URL='./bartender_installningar_whiterum_start&stop2.json';
  const POUR_URL='./bartender_installningar_whiterum_poor.json';
  const START_HOLD_MS=220;
  const POUR_HOLD_MS=2000;
  const MOVE_MS=1500;
  const scene=window.__barSceneConfig385;
  let busy=false;
  let rafId=0;

  const FALLBACK_RATIOS={
    uaL:105/132,
    laL:110/172,
    hL:74/105
  };

  function clone(v){return JSON.parse(JSON.stringify(v))}
  function lerp(a,b,t){return Number(a)+(Number(b)-Number(a))*t}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function angleDelta(a,b){return ((Number(b)-Number(a)+540)%360)-180}
  function lerpAngle(a,b,t){return ((Number(a)+angleDelta(a,b)*t)%360+360)%360}
  function rotateVector(x,y,deg){
    const a=Number(deg||0)*Math.PI/180;
    return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};
  }
  function ratioFor(key,p){
    const cls=key==='uaL'?'.uaL':key==='laL'?'.laL':'.hL';
    const el=document.querySelector('#bartenderRig '+cls);
    if(el?.naturalWidth>0&&el?.naturalHeight>0)return el.naturalHeight/el.naturalWidth;
    return FALLBACK_RATIOS[key]||1;
  }
  function partPivot(cfg,key){
    const p=cfg.parts[key],ratio=ratioFor(key,p);
    return {x:Number(p.x)+Number(p.w)*Number(p.px)/100,y:Number(p.y)+Number(p.w)*ratio*Number(p.py)/100};
  }
  function setPartPivot(cfg,key,pt,r){
    const p=cfg.parts[key],ratio=ratioFor(key,p);
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

    // Keep the attachment metadata from the start pose. The scene engine resolves
    // the White Rum bottle from the hand pivot every frame.
    f.objects.whiteRum={...f.objects.whiteRum,
      attachedTo:start.objects.whiteRum.attachedTo,
      attachX:start.objects.whiteRum.attachX,
      attachY:start.objects.whiteRum.attachY,
      attachR:start.objects.whiteRum.attachR
    };
    return f;
  }
  function setCapHidden(hidden){
    const cap=document.querySelector('#whiteRumBottle .bottleCap');
    if(cap)cap.style.display=hidden?'none':'';
  }
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function animate(start,end,prepared){
    return new Promise((resolve,reject)=>{
      const begun=performance.now();
      function tick(now){
        try{
          const t=Math.min(1,(now-begun)/MOVE_MS);
          scene.renderPoseFrame(armFrame(start,end,t),prepared,{showGlass:null});
          setCapHidden(true);
          if(t>=1){rafId=0;resolve();return}
          rafId=requestAnimationFrame(tick);
        }catch(err){rafId=0;reject(err)}
      }
      rafId=requestAnimationFrame(tick);
    });
  }
  async function playCorrect(){
    if(busy)return false;
    if(!scene?.loadAndApply||!scene?.loadConfig||!scene?.renderPoseFrame)throw new Error('White Rum-animation saknar v3.85 scenmotor');
    busy=true;
    try{
      setCapHidden(true);
      const endCfgPromise=scene.loadConfig(POUR_URL);
      const startResult=await scene.loadAndApply(START_URL,{showGlass:null});
      if(!startResult?.applied)throw new Error('White Rum startpose kunde inte aktiveras');
      setCapHidden(true);
      const startCfg=clone(scene.activeConfig);
      const endCfg=await endCfgPromise;
      const prepared=scene.currentPrepared();
      await wait(START_HOLD_MS);
      await animate(startCfg,endCfg,prepared);
      const endResult=await scene.loadAndApply(POUR_URL,{showGlass:null});
      if(!endResult?.applied)throw new Error('White Rum pour-pose kunde inte aktiveras');
      setCapHidden(true);

      // Hold the finished pour pose for about two seconds.
      await wait(POUR_HOLD_MS);

      // Return along the exact same interpolated arm path, reversed.
      const returnPrepared=scene.currentPrepared();
      await animate(endCfg,startCfg,returnPrepared);
      const returnResult=await scene.loadAndApply(START_URL,{showGlass:null});
      if(!returnResult?.applied)throw new Error('White Rum startpose kunde inte återställas');
      setCapHidden(true);
      return true;
    }catch(err){
      setCapHidden(false);
      console.error('Bar v3.85 White Rum animation:',err);
      throw err;
    }finally{
      busy=false;
    }
  }
  function reset(){
    if(rafId){cancelAnimationFrame(rafId);rafId=0}
    busy=false;
    setCapHidden(false);
  }

  // New drinks / result navigation restore the physical cork.
  if(typeof orderDrink==='function'){
    const originalOrderDrink=orderDrink;
    orderDrink=function(d){reset();return originalOrderDrink(d)};
  }
  document.getElementById('anotherBtn')?.addEventListener('click',reset,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',reset,true);

  window.__barWhiteRum385={
    startUrl:START_URL,
    pourUrl:POUR_URL,
    playCorrect,
    reset,
    capHidden:()=>document.querySelector('#whiteRumBottle .bottleCap')?.style.display==='none',
    busy:()=>busy
  };
})();