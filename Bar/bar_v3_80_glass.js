'use strict';
(function(){
  const START_CONFIG_URL='./bartender_installningar_start10e.json';
  const HIGHBALL_CONFIG_URL='./bartender_installningar_highballglass3.json';
  const GARNISH_CONFIG_URL='./bartender_installningar_mojitogarnering2.json';

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
    if(visual.stirred)return 100;
    if(visual.soda)return 95;
    if(visual.rum)return 85;
    if(visual.ice)return 70;
    if(visual.mixed)return 55;
    if(visual.limeSugar)return 65;
    if(visual.mint)return 50;
    return 0;
  }
  function makeBubblePattern(count){
    const out=[];
    for(let i=0;i<count;i++){
      out.push({
        x:7+Math.random()*86,
        y:4+Math.random()*91,
        size:.55+Math.random()*1.65,
        opacity:.28+Math.random()*.62
      });
    }
    return out;
  }
  function ensureBubblePattern(){
    const wanted=visual.soda?34:visual.littleSoda?18:0;
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
    for(let i=0;i<72;i++){
      icePattern.push({
        x:3+Math.random()*91,
        y:2+Math.random()*64,
        w:6.5+Math.random()*6,
        h:5.5+Math.random()*5,
        r:-48+Math.random()*96,
        opacity:.40+Math.random()*.42,
        shape:Math.floor(Math.random()*5),
        a:8+Math.random()*22,
        b:65+Math.random()*28,
        c:65+Math.random()*28,
        d:8+Math.random()*22
      });
    }
  }
  function iceClip(b){
    if(b.shape===0)return 'polygon('+b.a+'% 0,100% 14%, '+b.c+'% 100%,0 '+b.b+'%)';
    if(b.shape===1)return 'polygon(50% 0,100% '+b.b+'%,'+b.c+'% 100%,0 82%,'+b.a+'% 24%)';
    if(b.shape===2)return 'polygon('+b.a+'% 0,100% '+b.d+'%,72% 100%,8% '+b.c+'%,0 28%)';
    if(b.shape===3)return 'polygon(10% 0,92% 6%,100% '+b.b+'%,'+b.c+'% 100%,18% 92%,0 '+b.d+'%)';
    return 'polygon(34% 0,100% 24%,78% 100%,6% '+b.c+'%,0 42%)';
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
      cube.style.clipPath=iceClip(b);
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

    const mintH=visual.mint?h:0;
    refs.mint.style.display=visual.mint&&mintH>0?'block':'none';
    refs.mint.style.height=mintH+'%';
    refs.mint.style.opacity=visual.stirred?'.62':visual.mixed?'.74':'.98';
    refs.mint.style.filter=visual.stirred?'blur(1.4px)':visual.mixed?'blur(1px)':'blur(.55px)';

    const limeH=visual.limeSugar?h:0;
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
  function animateStirTarget(refs){
    if(!refs)return;
    const duration=1550;
    refs.fill?.animate?.([
      {transform:'translateX(0) skewX(0deg)'},
      {transform:'translateX(4px) skewX(-3deg)'},
      {transform:'translateX(-4px) skewX(3deg)'},
      {transform:'translateX(0) skewX(0deg)'}
    ],{duration,easing:'ease-in-out'});
    refs.mint?.animate?.([
      {transform:'translateX(0) rotate(0deg)'},
      {transform:'translateX(7px) rotate(6deg)'},
      {transform:'translateX(-6px) rotate(-5deg)'},
      {transform:'translateX(0) rotate(0deg)'}
    ],{duration,easing:'ease-in-out'});
    refs.limeSugar?.animate?.([
      {transform:'translateX(0) rotate(0deg)'},
      {transform:'translateX(-6px) rotate(-5deg)'},
      {transform:'translateX(7px) rotate(6deg)'},
      {transform:'translateX(0) rotate(0deg)'}
    ],{duration,easing:'ease-in-out'});
    [...(refs.ice?.children||[])].forEach((cube,i)=>{
      const dir=i%2?1:-1;
      cube.animate?.([
        {transform:cube.style.transform||'rotate(0deg)'},
        {transform:'translate('+(dir*(5+i%4))+'px,-'+(2+i%3)+'px) rotate('+(dir*(12+i%5*3))+'deg)'},
        {transform:'translate('+(dir*-4)+'px,'+(1+i%2)+'px) rotate('+(dir*-8)+'deg)'},
        {transform:cube.style.transform||'rotate(0deg)'}
      ],{duration:900+(i%4)*80,easing:'ease-in-out'});
    });
    [...(refs.bubbles?.children||[])].forEach((bubble,i)=>{
      const dir=i%2?1:-1;
      bubble.animate?.([
        {transform:'translate(-50%,50%)',opacity:bubble.style.opacity||'.6'},
        {transform:'translate(calc(-50% + '+(dir*(3+i%5))+'px),calc(50% - '+(5+i%7)+'px))',opacity:'1'},
        {transform:'translate(calc(-50% + '+(dir*-2)+'px),calc(50% - '+(9+i%9)+'px))',opacity:'.35'},
        {transform:'translate(-50%,50%)',opacity:bubble.style.opacity||'.6'}
      ],{duration:800+(i%6)*70,easing:'ease-in-out'});
    });
  }
  function animateStir(){
    requestAnimationFrame(()=>animateStirTarget(barRefs));
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

  const sceneConfig=window.__barSceneConfig380;
  const ready=Promise.all([
    sceneConfig?.loadConfig?sceneConfig.loadConfig(HIGHBALL_CONFIG_URL):fetch(HIGHBALL_CONFIG_URL,{cache:'no-store'}).then(r=>r.json()),
    sceneConfig?.loadConfig?sceneConfig.loadConfig(GARNISH_CONFIG_URL):fetch(GARNISH_CONFIG_URL,{cache:'no-store'}).then(r=>r.json())
  ]).then(([highballCfg,garnishCfg])=>{
    if(!highballCfg?.objects?.highballGlass)throw new Error('Highballglass3 saknar objects.highballGlass');
    if(!garnishCfg?.objects?.highballGlass||!garnishCfg?.glassSystem)throw new Error('Mojitogarnering saknar glas/glassSystem');
    highballCfgCache=highballCfg;
    garnishCfgCache=garnishCfg;
    diagnostics.loaded=true;
    return {highballCfg,garnishCfg};
  }).catch(err=>{
    diagnostics.error=String(err&&err.message?err.message:err);
    console.error('Bar v3.76 glass system:',err);
    throw err;
  });

  function sameGlassSource(a,b){
    return Boolean(a&&b&&a.x===b.x&&a.y===b.y&&a.w===b.w&&a.r===b.r&&a.px===b.px&&a.py===b.py&&a.z===b.z);
  }
  async function activateAndVerifyScene(url,cfg){
    if(!sceneConfig?.loadAndApply)throw new Error('Scenens configmotor saknas');
    const result=await sceneConfig.loadAndApply(url,{showGlass:true});
    if(!result?.applied||sceneConfig.activeUrl!==url)throw new Error('Configen blev inte aktiv: '+url);
    if(cfg?.objects?.highballGlass&&!sameGlassSource(sceneConfig.diagnostics?.lastHighball?.source,cfg.objects.highballGlass)){
      throw new Error('Highballglasets applicerade configvärden matchar inte '+url);
    }
    return result;
  }
  async function showEmptyHighball(){
    const {highballCfg}=await ready;
    clearGarnish();
    await activateAndVerifyScene(HIGHBALL_CONFIG_URL,highballCfg);
    renderAllContent();
    showBarGroup();
  }
  async function showMojitoGarnish(){
    const {garnishCfg}=await ready;
    await activateAndVerifyScene(GARNISH_CONFIG_URL,garnishCfg);
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
        showEmptyHighball()
          .then(()=>originalAdvanceStep(s))
          .catch(err=>{
            console.error('Highball-config kunde inte aktiveras',err);
            const el=document.getElementById('dialogText');
            if(el)el.textContent='Highball-konfigurationen kunde inte läsas in. Försök välja Highballglas igen.';
          });
        return;
      }else if(step===1&&s?.a==='Mynta'){
        visual.mint=true;
        renderAllContent();
      }else if(step===2&&s?.a==='Socker och limejuice'){
        visual.limeSugar=true;
        renderAllContent();
      }else if(step===3&&s?.a==='Blanda'){
        visual.mixed=true;
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
        animateStir();
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

  document.addEventListener('barrecipeafterai',e=>{
    const d=e?.detail||{};
    if(d.drinkId==='mojito'&&d.answer==='Blanda'){
      visual.littleSoda=true;
      renderAllContent();
    }
  });

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

  function resetToStartScene(){
    resetAll();
    sceneConfig?.loadAndApply?.(START_CONFIG_URL,{showGlass:false}).catch(()=>{});
  }
  document.getElementById('anotherBtn')?.addEventListener('click',resetToStartScene,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',resetToStartScene,true);
  window.addEventListener('resize',()=>{if(diagnostics.finalActive)applyFinalGeometry().then(renderFinalContent).catch(()=>{})});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(diagnostics.finalActive)applyFinalGeometry().then(renderFinalContent).catch(()=>{})},120));

  resetAll();
  window.__barGlass380={
    diagnostics,
    ready,
    showEmpty:()=>showEmptyHighball(),
    showGarnish:()=>showMojitoGarnish(),
    prepareFinal:()=>prepareFinalDrink(),
    reset:resetAll,
    visual
  };
})();