'use strict';
(function(){
  const rig=document.getElementById('bartenderRig');
  const objectLayer=document.getElementById('barObjectLayer');
  const glassGroup=document.getElementById('highballGroup');
  const glassImg=document.getElementById('highballGlass');
  const PARTS={torso:'.torso',head:'.headSprite',uaL:'.uaL',laL:'.laL',hL:'.hL',uaR:'.uaR',laR:'.laR',hR:'.hR'};
  const START_URL='./bartender_installningar_start6.json';
  const GAME_CALIBRATION_FACTOR=1.21;
  const REFERENCE_BAR_SCENE_HEIGHT=710;
  const GAME_BOTTLE_Y_OFFSET_PX=4;
  const GLASS_Y_OFFSET_PX=4;
  let activationGeneration=0;

  const initialRect=document.getElementById('barScene')?.getBoundingClientRect();
  const initialSceneFactor=(initialRect&&initialRect.height>0)?initialRect.height/REFERENCE_BAR_SCENE_HEIGHT:1;
  const GAME_SCALE_FACTOR=GAME_CALIBRATION_FACTOR*initialSceneFactor;
  window.__barScale359={
    referenceSceneHeight:REFERENCE_BAR_SCENE_HEIGHT,
    sceneWidth:initialRect?.width??null,
    sceneHeight:initialRect?.height??null,
    sceneFactor:initialSceneFactor,
    calibrationFactor:GAME_CALIBRATION_FACTOR,
    finalGameFactor:GAME_SCALE_FACTOR
  };

  const diagnostics={
    activeUrl:null,
    activeVersion:null,
    appliedParts:[],
    appliedObjects:[],
    unrenderedObjects:[],
    loadCount:0,
    applyCount:0,
    lastHighball:null,
    lastGeneration:0,
    error:null
  };

  function finite(v){return typeof v==='number'&&Number.isFinite(v)}
  function scale(){return window.__barScale359?.finalGameFactor||1}
  function reveal(){
    if(rig)rig.style.visibility='visible';
    if(objectLayer)objectLayer.style.visibility='visible';
  }
  function setOptionalVisuals(el,p){
    if(!el||!p)return;
    if(finite(p.opacity))el.style.opacity=String(p.opacity);else el.style.removeProperty('opacity');
    if(finite(p.blur)&&p.blur>0)el.style.filter='blur('+p.blur+'px)';else el.style.removeProperty('filter');
    if(typeof p.visible==='boolean')el.style.visibility=p.visible?'visible':'hidden';else el.style.removeProperty('visibility');
  }
  function validatePart(p,key){
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig bartenderdel: '+key);
  }
  function validateObject(p,key){
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltigt objekt: '+key);
  }
  async function loadImageMetrics(file){
    if(!file)return null;
    const img=new Image();
    img.src=file;
    await new Promise((resolve,reject)=>{
      if(img.complete&&img.naturalWidth>0){resolve();return}
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',()=>reject(new Error('Kunde inte läsa bild: '+file)),{once:true});
    });
    if(!(img.naturalWidth>0&&img.naturalHeight>0))throw new Error('Ogiltig bildstorlek: '+file);
    return {width:img.naturalWidth,height:img.naturalHeight,ratio:img.naturalHeight/img.naturalWidth};
  }
  async function fetchConfig(url,generation){
    const join=url.includes('?')?'&':'?';
    const response=await fetch(url+join+'sceneGeneration='+generation,{cache:'no-store'});
    if(!response.ok)throw new Error('Config HTTP '+response.status+' för '+url);
    diagnostics.loadCount++;
    return response.json();
  }
  async function loadConfig(url){
    const generation=activationGeneration+1;
    return fetchConfig(url,generation);
  }
  async function prepareConfig(cfg){
    if(!cfg?.parts||!cfg?.objects)throw new Error('Config saknar parts eller objects');
    if(!finite(cfg.scalePct)||!cfg.bartenderOffset||!finite(cfg.bartenderOffset.x)||!finite(cfg.bartenderOffset.y))throw new Error('Config saknar giltig skala/offset');
    for(const key of Object.keys(PARTS))if(!cfg.parts[key])throw new Error('Config saknar bartenderdel: '+key);
    for(const [key,p] of Object.entries(cfg.parts))if(PARTS[key])validatePart(p,key);
    for(const [key,p] of Object.entries(cfg.objects))validateObject(p,key);
    if(!cfg.headSystem?.master?.anchor||!cfg.headSystem?.neutral||!cfg.headSystem?.blink)throw new Error('Config saknar giltigt headSystem');

    const activeHead=cfg.headSystem.active==='headBlink'?'blink':'neutral';
    const hv=cfg.headSystem[activeHead];
    const headMetrics=await loadImageMetrics(hv.file);
    const glassMetrics=cfg.objects.highballGlass?await loadImageMetrics(glassImg?.getAttribute('src')||'sim_highball_glas.png'):null;
    return {activeHead,hv,headMetrics,glassMetrics};
  }
  function applyPart(key,p){
    const el=rig?.querySelector(PARTS[key]);
    if(!el)throw new Error('Saknad DOM-del: '+key);
    if(p.file&&el.getAttribute('src')!==p.file)el.src=p.file;
    el.style.left=p.x+'px';
    el.style.top=p.y+'px';
    el.style.width=p.w+'px';
    el.style.transformOrigin=p.px+'% '+p.py+'%';
    el.style.setProperty('--px',p.px+'%');
    el.style.setProperty('--py',p.py+'%');
    el.style.setProperty('--r',p.r+'deg');
    el.style.setProperty('--z',String(p.z));
    el.style.zIndex=String(p.z);
    el.style.transform='rotate('+p.r+'deg) scaleX('+(p.flipX?-1:1)+')';
    setOptionalVisuals(el,p);
    diagnostics.appliedParts.push(key);
  }
  function applyHeadSystem(cfg,prepared){
    const hv=prepared.hv;
    const headEl=rig?.querySelector(PARTS.head);
    if(!headEl)throw new Error('Huvudelementet saknas');
    const hw=Number(cfg.headSystem.master.w),hr=Number(cfg.headSystem.master.r);
    const hpx=Number(hv.px),hpy=Number(hv.py),ratio=prepared.headMetrics?.ratio;
    if(!finite(hw)||!finite(hr)||!finite(hpx)||!finite(hpy)||!finite(ratio))throw new Error('Ogiltiga headSystem-parametrar');
    const hh=hw*ratio;
    const hx=Number(cfg.headSystem.master.anchor.x)-hw*hpx/100;
    const hy=Number(cfg.headSystem.master.anchor.y)-hh*hpy/100;
    applyPart('head',{...cfg.parts.head,file:hv.file,x:hx,y:hy,w:hw,r:hr,px:hpx,py:hpy,z:cfg.parts.head.z});
  }
  function applyWhiteRum(p){
    const el=document.getElementById('whiteRumBottle');
    if(!el)throw new Error('White Rum-objektet saknas i DOM');
    const s=scale(),cx=260,cy=250;
    el.style.left=(cx+(p.x-cx)*s)+'px';
    el.style.top=(cy+(p.y-cy)*s+GAME_BOTTLE_Y_OFFSET_PX)+'px';
    el.style.width=(p.w*s)+'px';
    el.style.height=(p.w*1.5*s)+'px';
    el.style.transformOrigin=p.px+'% '+p.py+'%';
    el.style.transform='rotate('+p.r+'deg)';
    el.style.zIndex=String(p.z);
    setOptionalVisuals(el,p);
    diagnostics.appliedObjects.push('whiteRum');
  }
  function applyDrinkMenu(p){
    const el=document.getElementById('drinkMenuSprite');
    if(!el)throw new Error('Drinklista-objektet saknas i DOM');
    const s=scale(),cx=260,cy=250,w=p.w*s;
    el.style.left=(cx+(p.x-cx)*s)+'px';
    el.style.top=(cy+(p.y-cy)*s)+'px';
    el.style.width=w+'px';
    el.style.height=(w*(1193/1041))+'px';
    el.style.transformOrigin=p.px+'% '+p.py+'%';
    el.style.transform='rotate('+p.r+'deg)';
    el.style.zIndex=String(p.z);
    setOptionalVisuals(el,p);
    diagnostics.appliedObjects.push('drinkMenu');
  }
  function applyHighball(p,showGlass,prepared){
    if(!glassGroup||!glassImg)throw new Error('Highballgruppen saknas i DOM');
    const s=scale(),cx=260,cy=250,w=p.w*s;
    const ratio=prepared.glassMetrics?.ratio||2.4;
    const left=cx+(p.x-cx)*s;
    const top=cy+(p.y-cy)*s+GLASS_Y_OFFSET_PX;
    glassGroup.style.left=left+'px';
    glassGroup.style.top=top+'px';
    glassGroup.style.width=w+'px';
    glassGroup.style.height=(w*ratio)+'px';
    glassGroup.style.transformOrigin=p.px+'% '+p.py+'%';
    glassGroup.style.transform='rotate('+p.r+'deg)';
    glassGroup.style.zIndex=String(p.z);
    setOptionalVisuals(glassGroup,p);
    if(typeof showGlass==='boolean'){
      glassGroup.style.display=showGlass?'block':'none';
      glassGroup.setAttribute('aria-hidden',showGlass?'false':'true');
    }
    diagnostics.lastHighball={
      source:{x:p.x,y:p.y,w:p.w,r:p.r,px:p.px,py:p.py,z:p.z},
      applied:{left,top,width:w,height:w*ratio},
      glassYOffsetPx:GLASS_Y_OFFSET_PX,
      scale:s
    };
    diagnostics.appliedObjects.push('highballGlass');
  }
  function applyPreparedConfig(cfg,prepared,{url=null,showGlass=null,generation=0}={}){
    diagnostics.appliedParts=[];
    diagnostics.appliedObjects=[];
    diagnostics.unrenderedObjects=[];
    diagnostics.error=null;

    const s=scale(),rigScale=(cfg.scalePct/100)*s;
    rig.style.setProperty('left','50%','important');
    rig.style.setProperty('top','49%','important');
    rig.style.setProperty('width','520px','important');
    rig.style.setProperty('height','500px','important');
    rig.style.setProperty('transform-origin','50% 50%','important');
    rig.style.setProperty('transform','translate(-50%,-50%) translate('+(cfg.bartenderOffset.x*s)+'px,'+(cfg.bartenderOffset.y*s)+'px) scale('+rigScale+')','important');

    for(const key of Object.keys(PARTS)){
      if(key!=='head')applyPart(key,cfg.parts[key]);
    }
    applyHeadSystem(cfg,prepared);

    for(const [key,p] of Object.entries(cfg.objects)){
      if(key==='whiteRum')applyWhiteRum(p);
      else if(key==='drinkMenu')applyDrinkMenu(p);
      else if(key==='highballGlass')applyHighball(p,showGlass,prepared);
      else diagnostics.unrenderedObjects.push(key);
    }

    diagnostics.activeUrl=url;
    diagnostics.activeVersion=cfg.version??null;
    diagnostics.applyCount++;
    diagnostics.lastGeneration=generation;
    window.__barActiveConfig379=cfg;
    window.__barActiveGlassSystem379=cfg.glassSystem||null;
    api.activeConfig=cfg;
    api.activeUrl=url;
    reveal();
    document.dispatchEvent(new CustomEvent('barconfigapplied',{detail:{url,cfg,showGlass,generation}}));
    return cfg;
  }
  async function loadAndApply(url,options={}){
    const generation=++activationGeneration;
    try{
      const cfg=await fetchConfig(url,generation);
      if(generation!==activationGeneration)return {cfg,applied:false,stale:true};
      const prepared=await prepareConfig(cfg);
      if(generation!==activationGeneration)return {cfg,applied:false,stale:true};
      applyPreparedConfig(cfg,prepared,{...options,url,generation});
      return {cfg,applied:true,stale:false};
    }catch(err){
      if(generation===activationGeneration){
        diagnostics.error=String(err&&err.message?err.message:err);
        console.error('Bar v3.79 scene config:',err);
        reveal();
      }
      throw err;
    }
  }

  const api=window.__barSceneConfig379={
    startUrl:START_URL,
    loadConfig,
    loadAndApply,
    activeConfig:null,
    activeUrl:null,
    diagnostics,
    activationGeneration:()=>activationGeneration
  };

  loadAndApply(START_URL,{showGlass:false}).catch(()=>{});
})();