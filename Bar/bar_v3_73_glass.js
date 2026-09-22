'use strict';
(function(){
  const HIGHBALL_CONFIG_URL='./bartender_installningar_highballglass3.json';
  const GARNISH_CONFIG_URL='./bartender_installningar_mojitogarnering.json';
  const GLASS_Y_OFFSET_PX=4;

  const group=document.getElementById('highballGroup');
  const glass=document.getElementById('highballGlass');
  const fill=document.getElementById('glassLiquidFill');
  const mint=document.getElementById('glassMintCloud');
  const limeSugar=document.getElementById('glassLimeSugarCloud');
  const bubbles=document.getElementById('glassBubbles');
  const garnishLayer=document.getElementById('glassGarnishLayer');

  const diagnostics={
    highballConfigUrl:HIGHBALL_CONFIG_URL,
    garnishConfigUrl:GARNISH_CONFIG_URL,
    loaded:false,
    visible:false,
    state:null,
    position:null,
    garnishCount:0,
    error:null
  };

  const visual={
    mint:false,
    limeSugar:false,
    littleSoda:false,
    rum:false,
    soda:false,
    mixed:false,
    stirred:false,
    garnish:false
  };

  function finite(v){return typeof v==='number'&&Number.isFinite(v)}
  function currentScale(){return window.__barScale359?.finalGameFactor||1}
  function resetVisual(){
    visual.mint=false;visual.limeSugar=false;visual.littleSoda=false;visual.rum=false;
    visual.soda=false;visual.mixed=false;visual.stirred=false;visual.garnish=false;
  }
  function liquidHeight(){
    if(visual.soda)return 78;
    if(visual.rum)return 60;
    if(visual.littleSoda)return 36;
    if(visual.limeSugar)return 24;
    if(visual.mint)return 13;
    return 0;
  }
  function renderContent(){
    if(!fill||!mint||!limeSugar||!bubbles)return;
    const h=liquidHeight();
    fill.style.height=h+'%';
    fill.style.opacity=h?String(visual.stirred?.54:visual.mixed?.46:.32):'0';
    if(visual.stirred){
      fill.style.background='linear-gradient(to top,rgba(89,143,70,.66),rgba(183,219,158,.35) 58%,rgba(235,248,228,.18))';
    }else if(visual.mixed){
      fill.style.background='linear-gradient(to top,rgba(75,132,59,.64),rgba(157,203,132,.35) 62%,rgba(232,247,225,.16))';
    }else{
      fill.style.background='linear-gradient(to top,rgba(125,177,98,.42),rgba(236,249,231,.13))';
    }

    mint.style.display=visual.mint?'block':'none';
    mint.style.height=(visual.stirred?Math.max(18,h*.72):visual.mixed?Math.max(17,h*.60):13)+'%';
    mint.style.opacity=visual.stirred?'.36':visual.mixed?'.45':'.68';
    mint.style.filter=visual.stirred?'blur(3px)':visual.mixed?'blur(2px)':'blur(1.2px)';

    limeSugar.style.display=visual.limeSugar?'block':'none';
    limeSugar.style.height=(visual.stirred?Math.max(20,h*.80):visual.mixed?Math.max(18,h*.68):18)+'%';
    limeSugar.style.opacity=visual.stirred?'.34':visual.mixed?'.43':'.61';
    limeSugar.style.filter=visual.stirred?'blur(3px)':visual.mixed?'blur(2px)':'blur(1.4px)';

    bubbles.style.display=(visual.littleSoda||visual.soda)?'block':'none';
    bubbles.style.height=h+'%';
    bubbles.style.opacity=visual.soda?'.55':'.34';

    diagnostics.state={...visual,liquidHeight:h};
  }

  async function waitImage(img){
    if(img.complete&&img.naturalWidth>0)return;
    await new Promise(resolve=>{
      const done=()=>resolve();
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
    });
  }

  async function applyGlassObject(p){
    if(!group||!glass)throw new Error('Highballgruppen saknas i DOM');
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig highballGlass-konfiguration');
    await waitImage(glass);
    const s=currentScale(),cx=260,cy=250;
    const adjustedY=p.y+GLASS_Y_OFFSET_PX;
    const w=p.w*s;
    const ratio=(glass.naturalWidth>0&&glass.naturalHeight>0)?glass.naturalHeight/glass.naturalWidth:2.4;
    group.style.left=(cx+(p.x-cx)*s)+'px';
    group.style.top=(cy+(adjustedY-cy)*s)+'px';
    group.style.width=w+'px';
    group.style.height=(w*ratio)+'px';
    group.style.transformOrigin=p.px+'% '+p.py+'%';
    group.style.transform='rotate('+p.r+'deg)';
    group.style.zIndex=String(p.z);
    diagnostics.position={x:cx+(p.x-cx)*s,y:cy+(adjustedY-cy)*s,w,h:w*ratio,r:p.r,px:p.px,py:p.py,z:p.z};
  }

  function clearGarnish(){
    if(garnishLayer)garnishLayer.innerHTML='';
    diagnostics.garnishCount=0;
  }

  function addGarnishSprite(p){
    if(!garnishLayer||!p||!p.file)return;
    const img=document.createElement('img');
    img.src=p.file;
    img.alt='';
    img.setAttribute('aria-hidden','true');
    img.style.position='absolute';
    img.style.left=Number(p.x||0)+'%';
    img.style.top=Number(p.y||0)+'%';
    img.style.width=Number(p.w||0)+'%';
    img.style.height='auto';
    img.style.maxWidth='none';
    img.style.pointerEvents='none';
    img.style.transformOrigin=Number(p.px??50)+'% '+Number(p.py??50)+'%';
    img.style.transform='translate(-50%,-50%) rotate('+Number(p.r||0)+'deg)';
    img.style.opacity=String(p.opacity??1);
    img.style.filter=Number(p.blur||0)>0?'blur('+Number(p.blur)+'px)':'none';
    img.style.zIndex=String(p.z??40);
    garnishLayer.appendChild(img);
    diagnostics.garnishCount++;
  }

  function renderGarnish(cfg){
    clearGarnish();
    const items=Object.values(cfg?.glassSystem?.items||{});
    const copies=Array.isArray(cfg?.glassSystem?.copies)?cfg.glassSystem.copies:[];
    [...items,...copies].sort((a,b)=>Number(a.z||0)-Number(b.z||0)).forEach(addGarnishSprite);
  }

  function showGroup(){
    if(group){group.style.display='block';group.setAttribute('aria-hidden','false')}
    diagnostics.visible=true;
  }
  function hideGroup(){
    if(group){group.style.display='none';group.setAttribute('aria-hidden','true')}
    diagnostics.visible=false;
  }

  const ready=Promise.all([
    fetch(HIGHBALL_CONFIG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Highball config HTTP '+r.status);return r.json()}),
    fetch(GARNISH_CONFIG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Garnering config HTTP '+r.status);return r.json()})
  ]).then(([highballCfg,garnishCfg])=>{
    if(!highballCfg?.objects?.highballGlass)throw new Error('Highballglass3 saknar objects.highballGlass');
    if(!garnishCfg?.objects?.highballGlass||!garnishCfg?.glassSystem)throw new Error('Mojitogarnering saknar glas/glassSystem');
    diagnostics.loaded=true;
    return {highballCfg,garnishCfg};
  }).catch(err=>{
    diagnostics.error=String(err&&err.message?err.message:err);
    console.error('Bar v3.73 glass system:',err);
    throw err;
  });

  async function showEmptyHighball(){
    const {highballCfg}=await ready;
    clearGarnish();
    await applyGlassObject(highballCfg.objects.highballGlass);
    renderContent();
    showGroup();
  }
  async function showMojitoGarnish(){
    const {garnishCfg}=await ready;
    await applyGlassObject(garnishCfg.objects.highballGlass);
    renderGarnish(garnishCfg);
    visual.garnish=true;
    renderContent();
    showGroup();
  }
  function resetAll(){
    resetVisual();
    clearGarnish();
    renderContent();
    hideGroup();
  }

  const originalAdvanceStep=advanceStep;
  advanceStep=function(s){
    if(state?.drink?.id==='mojito'){
      const step=state.step;
      if(step===0&&s?.a==='Highballglas'){
        showEmptyHighball().catch(()=>{});
      }else if(step===1&&s?.a==='Mynta'){
        visual.mint=true;renderContent();
      }else if(step===2&&s?.a==='Socker och limejuice'){
        visual.limeSugar=true;renderContent();
      }else if(step===3&&s?.a==='Blanda'){
        visual.mixed=true;visual.littleSoda=true;renderContent();
      }else if(step===4&&s?.a==='Vit kubansk rom'){
        visual.rum=true;renderContent();
      }else if(step===5&&s?.a==='Sodavatten'){
        visual.soda=true;renderContent();
      }else if(step===6&&s?.a==='Rör om lätt'){
        visual.mixed=true;visual.stirred=true;renderContent();
      }else if(step===7&&s?.a==='Mynta och lime'){
        showMojitoGarnish().catch(()=>{});
      }
    }
    return originalAdvanceStep(s);
  };

  const originalOrderDrink=orderDrink;
  orderDrink=function(d){
    resetAll();
    return originalOrderDrink(d);
  };

  document.getElementById('anotherBtn')?.addEventListener('click',resetAll,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',resetAll,true);

  resetAll();
  window.__barGlass373={
    diagnostics,
    ready,
    showEmpty:()=>showEmptyHighball(),
    showGarnish:()=>showMojitoGarnish(),
    reset:resetAll,
    visual
  };
})();