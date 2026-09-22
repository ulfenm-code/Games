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
  const configCache=new Map();

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
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z)){
      throw new Error('Ogiltig bartenderdel: '+key);
    }
  }
  function applyPart(key,p){
    validatePart(p,key);
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
  async function waitImage(img){
    if(!img)return;
    if(img.complete&&img.naturalWidth>0)return;
    await new Promise(resolve=>{
      const done=()=>resolve();
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
    });
  }
  function applyWhiteRum(p){
    const el=document.getElementById('whiteRumBottle');
    if(!el)throw new Error('White Rum-objektet saknas i DOM');
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig White Rum-konfiguration');
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
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig Drinklista-konfiguration');
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
  async function applyHighball(p,showGlass){
    if(!glassGroup||!glassImg)throw new Error('Highballgruppen saknas i DOM');
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig highballGlass-konfiguration');
    await waitImage(glassImg);
    const s=scale(),cx=260,cy=250,w=p.w*s;
    const ratio=(glassImg.naturalWidth>0&&glassImg.naturalHeight>0)?glassImg.naturalHeight/glassImg.naturalWidth:2.4;
    glassGroup.style.left=(cx+(p.x-cx)*s)+'px';
    glassGroup.style.top=(cy+((p.y+GLASS_Y_OFFSET_PX)-cy)*s)+'px';
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
    diagnostics.appliedObjects.push('highballGlass');
  }
  async function applyHeadSystem(cfg){
    if(!cfg.headSystem?.master?.anchor||!cfg.headSystem?.neutral||!cfg.headSystem?.blink)throw new Error('Config saknar giltigt headSystem');
    const active=cfg.headSystem.active==='headBlink'?'blink':'neutral';
    const hv=cfg.headSystem[active];
    const headEl=rig?.querySelector(PARTS.head);
    if(!headEl)throw new Error('Huvudelementet saknas');
    if(hv.file&&headEl.getAttribute('src')!==hv.file)headEl.src=hv.file;
    await waitImage(headEl);
    const hw=Number(cfg.headSystem.master.w),hr=Number(cfg.headSystem.master.r);
    const hpx=Number(hv.px),hpy=Number(hv.py);
    const ratio=(headEl.naturalWidth>0&&headEl.naturalHeight>0)?headEl.naturalHeight/headEl.naturalWidth:null;
    if(!finite(hw)||!finite(hr)||!finite(hpx)||!finite(hpy)||!ratio)throw new Error('Ogiltiga headSystem-parametrar');
    const hh=hw*ratio;
    const hx=Number(cfg.headSystem.master.anchor.x)-hw*hpx/100;
    const hy=Number(cfg.headSystem.master.anchor.y)-hh*hpy/100;
    applyPart('head',{...cfg.parts.head,file:hv.file,x:hx,y:hy,w:hw,r:hr,px:hpx,py:hpy,z:cfg.parts.head.z});
  }
  async function loadConfig(url){
    if(configCache.has(url))return configCache.get(url);
    const p=fetch(url,{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw new Error('Config HTTP '+r.status+' för '+url);
      const cfg=await r.json();
      diagnostics.loadCount++;
      return cfg;
    });
    configCache.set(url,p);
    try{return await p}catch(err){configCache.delete(url);throw err}
  }
  async function applyConfig(cfg,{url=null,showGlass=null}={}){
    if(!cfg?.parts||!cfg?.objects)throw new Error('Config saknar parts eller objects');
    if(!finite(cfg.scalePct)||!cfg.bartenderOffset||!finite(cfg.bartenderOffset.x)||!finite(cfg.bartenderOffset.y))throw new Error('Config saknar giltig skala/offset');
    diagnostics.appliedParts=[];
    diagnostics.appliedObjects=[];
    diagnostics.unrenderedObjects=[];
    diagnostics.error=null;

    const required=Object.keys(PARTS);
    for(const key of required)if(!cfg.parts[key])throw new Error('Config saknar bartenderdel: '+key);

    const s=scale();
    const rigScale=(cfg.scalePct/100)*s;
    rig.style.setProperty('left','50%','important');
    rig.style.setProperty('top','49%','important');
    rig.style.setProperty('width','520px','important');
    rig.style.setProperty('height','500px','important');
    rig.style.setProperty('transform-origin','50% 50%','important');
    rig.style.setProperty('transform','translate(-50%,-50%) translate('+(cfg.bartenderOffset.x*s)+'px,'+(cfg.bartenderOffset.y*s)+'px) scale('+rigScale+')','important');

    for(const key of required)applyPart(key,cfg.parts[key]);
    await applyHeadSystem(cfg);

    for(const [key,p] of Object.entries(cfg.objects)){
      if(key==='whiteRum')applyWhiteRum(p);
      else if(key==='drinkMenu')applyDrinkMenu(p);
      else if(key==='highballGlass')await applyHighball(p,showGlass);
      else diagnostics.unrenderedObjects.push(key);
    }

    diagnostics.activeUrl=url;
    diagnostics.activeVersion=cfg.version??null;
    diagnostics.applyCount++;
    window.__barActiveConfig376=cfg;
    window.__barActiveGlassSystem376=cfg.glassSystem||null;
    window.__barSceneConfig376.activeConfig=cfg;
    window.__barSceneConfig376.activeUrl=url;
    reveal();
    document.dispatchEvent(new CustomEvent('barconfigapplied',{detail:{url,cfg,showGlass}}));
    return cfg;
  }
  async function loadAndApply(url,options={}){
    try{
      const cfg=await loadConfig(url);
      return await applyConfig(cfg,{...options,url});
    }catch(err){
      diagnostics.error=String(err&&err.message?err.message:err);
      console.error('Bar v3.76 scene config:',err);
      reveal();
      throw err;
    }
  }

  window.__barSceneConfig376={
    startUrl:START_URL,
    loadConfig,
    applyConfig,
    loadAndApply,
    activeConfig:null,
    activeUrl:null,
    diagnostics
  };

  loadAndApply(START_URL,{showGlass:false}).catch(()=>{});
})();