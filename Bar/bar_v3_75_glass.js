'use strict';
(function(){
  const HIGHBALL_CONFIG_URL='./bartender_installningar_highballglass3.json';
  const GARNISH_CONFIG_URL='./bartender_installningar_mojitogarnering.json';
  const GLASS_Y_OFFSET_PX=4;

  const barGroup=document.getElementById('highballGroup');
  const barGlass=document.getElementById('highballGlass');
  const barRefs={
    fill:document.getElementById('glassLiquidFill'),
    mint:document.getElementById('glassMintCloud'),
    limeSugar:document.getElementById('glassLimeSugarCloud'),
    bubbles:document.getElementById('glassBubbles'),
    ice:document.getElementById('glassIceLayer')
  };
  const barGarnish=document.getElementById('glassGarnishLayer');

  const drinkStage=document.getElementById('drinkStage');
  const finalGroup=document.getElementById('drinkMojitoGroup');
  const finalGlass=document.getElementById('drinkMojitoGlass');
  const finalRefs={
    fill:document.getElementById('drinkGlassLiquidFill'),
    mint:document.getElementById('drinkGlassMintCloud'),
    limeSugar:document.getElementById('drinkGlassLimeSugarCloud'),
    bubbles:document.getElementById('drinkGlassBubbles'),
    ice:document.getElementById('drinkGlassIceLayer')
  };
  const finalGarnish=document.getElementById('drinkGlassGarnishLayer');

  const diagnostics={
    highballConfigUrl:HIGHBALL_CONFIG_URL,
    garnishConfigUrl:GARNISH_CONFIG_URL,
    loaded:false,
    visible:false,
    state:null,
    position:null,
    garnishCountBar:0,
    garnishCountFinal:0,
    finalActive:false,
    error:null
  };

  const visual={
    mint:false,
    limeSugar:false,
    littleSoda:false,
    ice:false,
    rum:false,
    soda:false,
    mixed:false,
    stirred:false,
    garnish:false
  };

  let highballCfgCache=null;
  let garnishCfgCache=null;
  let bubblePattern=[];
  let icePattern=[];

  function finite(v){return typeof v==='number'&&Number.isFinite(v)}
  function currentScale(){return window.__barScale359?.finalGameFactor||1}
  function resetVisual(){
    visual.mint=false;
    visual.limeSugar=false;
    visual.littleSoda=false;
    visual.ice=false;
    visual.rum=false;
    visual.soda=false;
    visual.mixed=false;
    visual.stirred=false;
    visual.garnish=false;
    bubblePattern=[];
    icePattern=[];
  }
  function liquidHeight(){
    if(visual.soda)return 84;
    if(visual.rum)return 68;
    if(visual.ice)return 54;
    if(visual.littleSoda)return 48;
    if(visual.limeSugar)return 38;
    if(visual.mint)return 26;
    return 0;
  }
  function makeBubblePattern(count){
    const out=[];
    for(let i=0;i<count;i++){
      out.push({
        x:7+Math.random()*86,
        y:4+Math.random()*91,
        size:1.2+Math.random()*3.8,
        opacity:.28+Math.random()*.62
      });
    }
    return out;
  }
  function ensureBubblePattern(){
    const wanted=visual.soda?26:visual.littleSoda?13:0;
    while(bubblePattern.length<wanted)bubblePattern.push(...makeBubblePattern(1));
    if(bubblePattern.length>wanted)bubblePattern=bubblePattern.slice(0,wanted);
  }
  function renderBubblePattern(layer){
    if(!layer)return;
    ensureBubblePattern();
    layer.innerHTML='';
    bubblePattern.forEach(b=>{
      const dot=document.createElement('span');
      dot.style.left=b.x+'%';
      dot.style.bottom=b.y+'%';
      dot.style.width=b.size+'px';
      dot.style.height=b.size+'px';
      dot.style.opacity=String(b.opacity);
      layer.appendChild(dot);
    });
  }
  function ensureIcePattern(){
    if(icePattern.length)return;
    for(let i=0;i<9;i++){
      icePattern.push({
        x:10+Math.random()*76,
        y:5+Math.random()*62,
        w:11+Math.random()*11,
        h:8+Math.random()*9,
        r:-28+Math.random()*56,
        opacity:.34+Math.random()*.34
      });
    }
  }
  function renderIcePattern(layer){
    if(!layer)return;
    layer.innerHTML='';
    if(!visual.ice){layer.style.display='none';return}
    ensureIcePattern();
    icePattern.forEach(b=>{
      const cube=document.createElement('span');
      cube.style.left=b.x+'%';
      cube.style.bottom=b.y+'%';
      cube.style.width=b.w+'%';
      cube.style.height=b.h+'%';
      cube.style.opacity=String(b.opacity);
      cube.style.transform='rotate('+b.r+'deg)';
      layer.appendChild(cube);
    });
    layer.style.display='block';
  }
  function renderContentTarget(refs,remain=1){
    if(!refs?.fill||!refs?.mint||!refs?.limeSugar||!refs?.bubbles||!refs?.ice)return;
    const keep=Math.max(0,Math.min(1,Number(remain)||0));
    const base=liquidHeight();
    const h=base*keep;

    refs.fill.style.height=h+'%';
    refs.fill.style.opacity=h?String(visual.stirred?.72:visual.mixed?.66:.58):'0';
    if(visual.stirred){
      refs.fill.style.background='linear-gradient(to top,rgba(78,143,67,.80),rgba(171,216,145,.52) 58%,rgba(232,248,224,.30))';
    }else if(visual.mixed){
      refs.fill.style.background='linear-gradient(to top,rgba(63,126,53,.82),rgba(151,202,121,.50) 62%,rgba(229,247,221,.26))';
    }else{
      refs.fill.style.background='linear-gradient(to top,rgba(122,181,91,.68),rgba(233,249,226,.24))';
    }

    const mintBase=visual.stirred?Math.max(32,base*.72):visual.mixed?Math.max(30,base*.64):30;
    const mintH=Math.min(h,mintBase*keep);
    refs.mint.style.display=visual.mint&&mintH>0?'block':'none';
    refs.mint.style.height=mintH+'%';
    refs.mint.style.opacity=visual.stirred?'.62':visual.mixed?'.74':'.98';
    refs.mint.style.filter=visual.stirred?'blur(1.4px)':visual.mixed?'blur(1px)':'blur(.55px)';

    const limeBase=visual.stirred?Math.max(34,base*.82):visual.mixed?Math.max(32,base*.72):30;
    const limeH=Math.min(h,limeBase*keep);
    refs.limeSugar.style.display=visual.limeSugar&&limeH>0?'block':'none';
    refs.limeSugar.style.height=limeH+'%';
    refs.limeSugar.style.opacity=visual.stirred?'.58':visual.mixed?'.70':'.90';
    refs.limeSugar.style.filter=visual.stirred?'blur(1.4px)':visual.mixed?'blur(1px)':'blur(.65px)';

    refs.bubbles.style.display=(visual.littleSoda||visual.soda)&&h>0?'block':'none';
    refs.bubbles.style.height=h+'%';
    refs.bubbles.style.opacity=visual.soda?'.82':'.58';
    if(refs.bubbles.style.display==='block')renderBubblePattern(refs.bubbles);else refs.bubbles.innerHTML='';
    renderIcePattern(refs.ice);
  }
  function renderBarContent(){renderContentTarget(barRefs,1)}
  function renderFinalContent(){
    const p=Math.max(0,Math.min(100,Number(state?.drinkProgress)||0));
    renderContentTarget(finalRefs,1-p/100);
  }
  function updateDiagnostics(){
    diagnostics.state={...visual,liquidHeight:liquidHeight(),drinkProgress:Number(state?.drinkProgress)||0};
  }
  function renderAllContent(){
    renderBarContent();
    renderFinalContent();
    updateDiagnostics();
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

  async function applyBarGlassObject(p){
    if(!barGroup||!barGlass)throw new Error('Highballgruppen saknas i DOM');
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig highballGlass-konfiguration');
    await waitImage(barGlass);
    const s=currentScale(),cx=260,cy=250;
    const adjustedY=p.y+GLASS_Y_OFFSET_PX;
    const w=p.w*s;
    const ratio=(barGlass.naturalWidth>0&&barGlass.naturalHeight>0)?barGlass.naturalHeight/barGlass.naturalWidth:2.4;
    barGroup.style.left=(cx+(p.x-cx)*s)+'px';
    barGroup.style.top=(cy+(adjustedY-cy)*s)+'px';
    barGroup.style.width=w+'px';
    barGroup.style.height=(w*ratio)+'px';
    barGroup.style.transformOrigin=p.px+'% '+p.py+'%';
    barGroup.style.transform='rotate('+p.r+'deg)';
    barGroup.style.zIndex=String(p.z);
    diagnostics.position={x:cx+(p.x-cx)*s,y:cy+(adjustedY-cy)*s,w,h:w*ratio,r:p.r,px:p.px,py:p.py,z:p.z};
  }

  async function applyFinalGeometry(){
    if(!finalGroup||!finalGlass)return;
    await waitImage(finalGlass);
    const ratio=(finalGlass.naturalWidth>0&&finalGlass.naturalHeight>0)?finalGlass.naturalHeight/finalGlass.naturalWidth:2.4;
    const w=finalGroup.getBoundingClientRect().width||170;
    finalGroup.style.height=(w*ratio)+'px';
  }

  function clearLayer(layer){
    if(layer)layer.innerHTML='';
  }
  function addGarnishSprite(layer,p){
    if(!layer||!p||!p.file)return false;
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
    layer.appendChild(img);
    return true;
  }
  function renderGarnishInto(layer,cfg){
    clearLayer(layer);
    const items=Object.values(cfg?.glassSystem?.items||{});
    const copies=Array.isArray(cfg?.glassSystem?.copies)?cfg.glassSystem.copies:[];
    let count=0;
    [...items,...copies]
      .sort((a,b)=>Number(a.z||0)-Number(b.z||0))
      .forEach(p=>{if(addGarnishSprite(layer,p))count++});
    return count;
  }
  function clearGarnish(){
    clearLayer(barGarnish);
    clearLayer(finalGarnish);
    diagnostics.garnishCountBar=0;
    diagnostics.garnishCountFinal=0;
  }
  function renderGarnish(cfg){
    diagnostics.garnishCountBar=renderGarnishInto(barGarnish,cfg);
    diagnostics.garnishCountFinal=renderGarnishInto(finalGarnish,cfg);
  }

  function showBarGroup(){
    if(barGroup){barGroup.style.display='block';barGroup.setAttribute('aria-hidden','false')}
    diagnostics.visible=true;
  }
  function hideBarGroup(){
    if(barGroup){barGroup.style.display='none';barGroup.setAttribute('aria-hidden','true')}
    diagnostics.visible=false;
  }
  function setFinalMode(on){
    if(drinkStage)drinkStage.classList.toggle('mojitoFinal',!!on);
    diagnostics.finalActive=!!on;
  }

  const ready=Promise.all([
    fetch(HIGHBALL_CONFIG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Highball config HTTP '+r.status);return r.json()}),
    fetch(GARNISH_CONFIG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Garnering config HTTP '+r.status);return r.json()})
  ]).then(([highballCfg,garnishCfg])=>{
    if(!highballCfg?.objects?.highballGlass)throw new Error('Highballglass3 saknar objects.highballGlass');
    if(!garnishCfg?.objects?.highballGlass||!garnishCfg?.glassSystem)throw new Error('Mojitogarnering saknar glas/glassSystem');
    highballCfgCache=highballCfg;
    garnishCfgCache=garnishCfg;
    diagnostics.loaded=true;
    return {highballCfg,garnishCfg};
  }).catch(err=>{
    diagnostics.error=String(err&&err.message?err.message:err);
    console.error('Bar v3.75 glass system:',err);
    throw err;
  });

  async function showEmptyHighball(){
    const {highballCfg}=await ready;
    clearGarnish();
    await applyBarGlassObject(highballCfg.objects.highballGlass);
    renderAllContent();
    showBarGroup();
  }
  async function showMojitoGarnish(){
    const {garnishCfg}=await ready;
    await applyBarGlassObject(garnishCfg.objects.highballGlass);
    await applyFinalGeometry();
    renderGarnish(garnishCfg);
    visual.garnish=true;
    renderAllContent();
    showBarGroup();
  }
  async function prepareFinalDrink(){
    if(state?.drink?.id!=='mojito'){setFinalMode(false);return}
    setFinalMode(true);
    await ready;
    await applyFinalGeometry();
    if(visual.garnish&&garnishCfgCache){
      diagnostics.garnishCountFinal=renderGarnishInto(finalGarnish,garnishCfgCache);
    }
    renderFinalContent();
    updateDiagnostics();
  }
  function resetAll(){
    resetVisual();
    clearGarnish();
    renderAllContent();
    hideBarGroup();
    setFinalMode(false);
  }

  const originalAdvanceStep=advanceStep;
  advanceStep=function(s){
    if(state?.drink?.id==='mojito'){
      const step=state.step;
      if(step===0&&s?.a==='Highballglas'){
        showEmptyHighball().catch(()=>{});
      }else if(step===1&&s?.a==='Mynta'){
        visual.mint=true;
        renderAllContent();
      }else if(step===2&&s?.a==='Socker och limejuice'){
        visual.limeSugar=true;
        renderAllContent();
      }else if(step===3&&s?.a==='Blanda'){
        visual.mixed=true;
        visual.littleSoda=true;
        renderAllContent();
      }else if(step===4&&s?.a==='Is'){
        visual.ice=true;
        renderAllContent();
      }else if(step===5&&s?.a==='Vit kubansk rom'){
        visual.rum=true;
        renderAllContent();
      }else if(step===6&&s?.a==='Sodavatten'){
        visual.soda=true;
        renderAllContent();
      }else if(step===7&&s?.a==='Rör om lätt'){
        visual.mixed=true;
        visual.stirred=true;
        renderAllContent();
      }else if(step===8&&s?.a==='Mynta och lime'){
        /* Show the finished garnish in the bar before moving to the drinking screen. */
        showMojitoGarnish()
          .then(()=>setTimeout(()=>originalAdvanceStep(s),900))
          .catch(()=>originalAdvanceStep(s));
        return;
      }
    }
    return originalAdvanceStep(s);
  };

  const originalOrderDrink=orderDrink;
  orderDrink=function(d){
    resetAll();
    return originalOrderDrink(d);
  };

  const originalStartPhysicalAction=startPhysicalAction;
  startPhysicalAction=function(type,afterAction){
    if(type==='drink'&&state?.drink?.id==='mojito'){
      prepareFinalDrink().catch(()=>{});
    }else if(type==='drink'){
      setFinalMode(false);
    }
    return originalStartPhysicalAction(type,afterAction);
  };

  const originalUpdateDrink=updateDrink;
  updateDrink=function(){
    originalUpdateDrink();
    if(state?.drink?.id==='mojito'&&drinkStage?.classList.contains('mojitoFinal')){
      renderFinalContent();
      updateDiagnostics();
    }
  };

  document.getElementById('anotherBtn')?.addEventListener('click',resetAll,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',resetAll,true);
  window.addEventListener('resize',()=>{if(diagnostics.finalActive)applyFinalGeometry().then(renderFinalContent).catch(()=>{})});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(diagnostics.finalActive)applyFinalGeometry().then(renderFinalContent).catch(()=>{})},120));

  resetAll();
  window.__barGlass375={
    diagnostics,
    ready,
    showEmpty:()=>showEmptyHighball(),
    showGarnish:()=>showMojitoGarnish(),
    prepareFinal:()=>prepareFinalDrink(),
    reset:resetAll,
    visual
  };
})();