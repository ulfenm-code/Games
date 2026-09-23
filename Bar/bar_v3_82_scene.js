'use strict';
(function(){
  const rig=document.getElementById('bartenderRig');
  const objectLayer=document.getElementById('barObjectLayer');
  const glassGroup=document.getElementById('highballGroup');
  const glassImg=document.getElementById('highballGlass');
  const PARTS={torso:'.torso',head:'.headSprite',uaL:'.uaL',laL:'.laL',hL:'.hL',uaR:'.uaR',laR:'.laR',hR:'.hR'};
  const START_URL='./bartender_installningar_start10e.json';
  const GAME_CALIBRATION_FACTOR=1.21;
  const REFERENCE_BAR_SCENE_HEIGHT=710;
  const GAME_BOTTLE_Y_OFFSET_PX=4;
  const GLASS_Y_OFFSET_PX=4;
  let activationGeneration=0;
  const HEAD_VARIANTS=['neutral','blink','pratar1','pratar2','forvanad'];
  let canonicalHeadProfile=null;
  let activePrepared=null;
  let currentHeadVariant='neutral';

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
  function cloneHeadSystem(v){return JSON.parse(JSON.stringify(v))}
  function rememberCanonicalHead(cfg){
    canonicalHeadProfile={part:{...cfg.parts.head},headSystem:cloneHeadSystem(cfg.headSystem)};
  }
  function preserveCanonicalHead(cfg){
    if(!canonicalHeadProfile)return cfg;
    return {...cfg,parts:{...cfg.parts,head:{...canonicalHeadProfile.part}},headSystem:cloneHeadSystem(canonicalHeadProfile.headSystem)};
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
    if(!cfg.headSystem?.master?.anchor)throw new Error('Config saknar giltigt headSystem');
    for(const key of HEAD_VARIANTS)if(!cfg.headSystem[key]?.file||!finite(Number(cfg.headSystem[key].px))||!finite(Number(cfg.headSystem[key].py)))throw new Error('Config saknar huvudvariant: '+key);

    const rawActive=String(cfg.headSystem.active||'');
    const activeHead=rawActive==='headBlink'?'blink':HEAD_VARIANTS.includes(rawActive)?rawActive:'neutral';
    const headMetricsByKey={};
    await Promise.all(HEAD_VARIANTS.map(async key=>{headMetricsByKey[key]=await loadImageMetrics(cfg.headSystem[key].file)}));
    const hv=cfg.headSystem[activeHead];
    const headMetrics=headMetricsByKey[activeHead];
    const glassMetrics=cfg.objects.highballGlass?await loadImageMetrics(glassImg?.getAttribute('src')||'sim_highball_glas.png'):null;
    return {activeHead,hv,headMetrics,headMetricsByKey,glassMetrics};
  }
  function applyPart(key,p,record=true){
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
    if(record)diagnostics.appliedParts.push(key);
  }
  function applyHeadVariant(cfg,key,metrics,record=true){
    const hv=cfg.headSystem[key];
    const headEl=rig?.querySelector(PARTS.head);
    if(!headEl)throw new Error('Huvudelementet saknas');
    const masterW=Number(cfg.headSystem.master.w),hr=Number(cfg.headSystem.master.r);
    const hpx=Number(hv.px),hpy=Number(hv.py),ratio=metrics?.ratio;
    const variantScale=key==='forvanad'?0.928:1;
    const hw=masterW*variantScale;
    if(!finite(masterW)||!finite(hw)||!finite(hr)||!finite(hpx)||!finite(hpy)||!finite(ratio))throw new Error('Ogiltiga headSystem-parametrar');
    const hh=hw*ratio;
    const hx=Number(cfg.headSystem.master.anchor.x)-hw*hpx/100;
    const hy=Number(cfg.headSystem.master.anchor.y)-hh*hpy/100;
    applyPart('head',{...cfg.parts.head,file:hv.file,x:hx,y:hy,w:hw,r:hr,px:hpx,py:hpy,z:cfg.parts.head.z},record);
    currentHeadVariant=key;
    diagnostics.activeHead=key;
    return true;
  }
  function applyHeadSystem(cfg,prepared){
    return applyHeadVariant(cfg,prepared.activeHead,prepared.headMetrics,true);
  }
  function setHeadVariant(key){
    const cfg=api.activeConfig;
    const metrics=activePrepared?.headMetricsByKey?.[key];
    if(!cfg||!HEAD_VARIANTS.includes(key)||!cfg.headSystem?.[key]||!metrics)return false;
    return applyHeadVariant(cfg,key,metrics,false);
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
    activePrepared=prepared;
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
    window.__barActiveConfig382=cfg;
    window.__barActiveGlassSystem382=cfg.glassSystem||null;
    api.activeConfig=cfg;
    api.activeUrl=url;
    reveal();
    document.dispatchEvent(new CustomEvent('barconfigapplied',{detail:{url,cfg,showGlass,generation}}));
    return cfg;
  }
  async function loadAndApply(url,options={}){
    const generation=++activationGeneration;
    try{
      let cfg=await fetchConfig(url,generation);
      if(generation!==activationGeneration)return {cfg,applied:false,stale:true};
      if(url===START_URL)rememberCanonicalHead(cfg);else cfg=preserveCanonicalHead(cfg);
      const prepared=await prepareConfig(cfg);
      if(generation!==activationGeneration)return {cfg,applied:false,stale:true};
      applyPreparedConfig(cfg,prepared,{...options,url,generation});
      return {cfg,applied:true,stale:false};
    }catch(err){
      if(generation===activationGeneration){
        diagnostics.error=String(err&&err.message?err.message:err);
        console.error('Bar v3.82 scene config:',err);
        reveal();
      }
      throw err;
    }
  }

  const api=window.__barSceneConfig382={
    startUrl:START_URL,
    loadConfig,
    loadAndApply,
    activeConfig:null,
    activeUrl:null,
    diagnostics,
    setHeadVariant,
    currentHead:()=>currentHeadVariant,
    headVariants:()=>HEAD_VARIANTS.slice(),
    activationGeneration:()=>activationGeneration
  };

  loadAndApply(START_URL,{showGlass:false}).catch(()=>{});
})();