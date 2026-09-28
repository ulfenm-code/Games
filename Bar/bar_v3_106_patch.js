'use strict';
/* Bar Game v3.106: Mai Tai garnish config + AI taste-ready gate. */
(function(){
  const scene=window.__barSceneConfig3105||window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const glassval=window.__barGlassval3103||window.__barGlassval3101;
  const START_POUR_URL='./bartender_installningar_start&stopDrink.json';
  const START12_URL='./bartender_installningar_start12.json';
  const MAITAI_GARNISH_URL='./bartender_installningar_garneringMaiTai.json';
  const SHAKER_START_FALLBACK={x:383.7049663252007,y:275.92103955945794,w:54.50820006082035,r:0,px:50,py:50,z:15,lidOn:true};
  const SHAKER_SYSTEM_FALLBACK={
    parent:'shaker',
    parts:{
      shakerBase:{x:6.81383168,y:0,w:91.6816818083751,r:0,px:50,py:50,z:0},
      shakerLid:{x:16.892259323496646,y:-42.02527255306482,w:71.31672762268055,r:0,px:50,py:50,z:1}
    }
  };
  let start12Promise=null;
  let maiTaiGarnishPromise=null;

  /* Reference = Highball in bartender_installningar_glasval.json. */
  const GLASSVAL_ANCHOR={centerX:256.33360967441587,bottomY:325.98736344742747};
  const DOUBLE_ROCKS={w:30.262883694654807,aspect:1402/1122};
  const DOUBLE_ROCKS_POS={
    x:GLASSVAL_ANCHOR.centerX-DOUBLE_ROCKS.w/2,
    y:GLASSVAL_ANCHOR.bottomY-DOUBLE_ROCKS.w*DOUBLE_ROCKS.aspect,
    w:DOUBLE_ROCKS.w,r:0,px:50,py:50,z:25
  };

  let maiTaiReturnBusy=false;
  let shakerAnswerBusy=false;

  function lockDifficulty(){
    state.difficulty='medium';
    document.querySelectorAll('.difficultyBtn').forEach(btn=>{
      const locked=btn.dataset.difficulty==='easy'||btn.dataset.difficulty==='hard';
      btn.disabled=locked;
      btn.classList.toggle('lockedDifficulty',locked);
      btn.classList.toggle('selected',btn.dataset.difficulty==='medium');
      btn.setAttribute('aria-disabled',locked?'true':'false');
    });
    const help=document.getElementById('difficultyHelp');
    if(help)help.textContent='Medel: svara fritt med text eller röst.';
  }
  lockDifficulty();

  const menuMai=drinkMenuCatalog.find(d=>d.id==='maiTai');
  if(menuMai)menuMai.buildable=true;
  buildableDrinkIds.add('maiTai');
  if(!drinks.some(d=>d.id==='maiTai')){
    drinks.unshift({id:'maiTai',name:'Mai Tai',minAge:18,alcoholic:true,steps:[
      {q:'Vilket verktyg ska användas?',a:'Shaker',opts:['Shaker','Muddler','Barsked']},
      {q:'Vilken rom ska i först?',a:'Lagrad jamaicansk rom',opts:['Lagrad jamaicansk rom','Vit kubansk rom','Blackstrap-rom']},
      {q:'Vilken rom ska i därefter?',a:'Martinique Molasses Rhum',opts:['Martinique Molasses Rhum','Ron Smoky Havana Club','Vit kubansk rom']},
      {q:'Vilken likör ska tillsättas?',a:'Orange Curaçao',opts:['Orange Curaçao','Amaretto','Frangelico']},
      {
        q:'Trevalsfråga: Vilka tre ingredienser ska tillsättas nu?',
        a:'Orgeat och färsk limejuice och sockerlag',
        opts:[
          'Orgeat och färsk limejuice och sockerlag',
          'Orgeat och färsk limejuice och grenadin',
          'Orgeat och citronjuice och sockerlag'
        ],
        directChoices:true
      },
      {q:'Vad ska läggas i shakern nu?',a:'Is',opts:['Is','Salt','Mer socker'],action:'shake'},
      {q:'Vilket glas ska användas?',a:'Double Rocks-glas',opts:['Double Rocks-glas','Highballglas','Rocksglas']},
      {
        q:'Jag lägger i lite limezest. Nu får du välja två ytterligare garneringar. Vilka två väljer du?',
        a:'Ananasskiva och mynta',
        opts:['Ananasskiva och mynta','Apelsinskiva och körsbär','Citron och basilika']
      }
    ]});
  }

  const objectLayer=document.getElementById('barObjectLayer');
  const barScene=document.getElementById('barScene');
  let shaker=document.getElementById('maiTaiShaker');
  if(!shaker&&objectLayer){
    shaker=document.createElement('div');
    shaker.id='maiTaiShaker';
    shaker.className='toolSelectable';
    shaker.setAttribute('role','button');
    shaker.setAttribute('tabindex','0');
    shaker.setAttribute('aria-label','Shaker');
    shaker.innerHTML='<img class="bottleBase shakerBaseSprite" src="ShakerUnderdel.png" alt=""><img class="bottleCap shakerLidSprite" src="ShakerLock.png" alt="">';
    objectLayer.appendChild(shaker);
  }

  function scale(){return window.__barScale359?.finalGameFactor||1}
  function placeModel(el,p,aspect=1,yOffset=4){
    if(!el||!p)return;
    const s=scale(),cx=260,cy=250,w=Number(p.w)*s;
    el.style.left=(cx+(Number(p.x)-cx)*s)+'px';
    el.style.top=(cy+(Number(p.y)-cy)*s+yOffset)+'px';
    el.style.width=w+'px';
    el.style.height=(w*aspect)+'px';
    el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    el.style.transform='rotate('+(p.r||0)+'deg)';
    el.style.zIndex=String(p.z??15);
    el.style.display='block';
  }

  function clone(v){return JSON.parse(JSON.stringify(v))}
  async function start12(){
    if(!start12Promise){
      start12Promise=scene?.loadConfig
        ? scene.loadConfig(START12_URL).catch(err=>{console.error('Start12 kunde inte läsas',err);return null})
        : Promise.resolve(null);
    }
    const cfg=await start12Promise;
    return cfg?clone(cfg):null
  }
  async function maiTaiGarnishConfig(){
    if(!maiTaiGarnishPromise){
      maiTaiGarnishPromise=scene?.loadConfig
        ? scene.loadConfig(MAITAI_GARNISH_URL).catch(err=>{console.error('Mai Tai garnish-config kunde inte läsas',err);return null})
        : Promise.resolve(null);
    }
    const cfg=await maiTaiGarnishPromise;
    return cfg?clone(cfg):null
  }
  function maiTaiGarnishAsset(file){
    /* Simulatorfilens -4-sprite är byte-identisk med repo-filen utan suffix. */
    return String(file||'')==='ananasskiva_stor-4.png'?'ananasskiva_stor.png':String(file||'')
  }
  function ensureMaiTaiGarnishLayer(container){
    if(!container)return null;
    let layer=container.querySelector(':scope > .maiTaiGarnishLayer3106');
    if(!layer){
      layer=document.createElement('div');
      layer.className='maiTaiGarnishLayer3106';
      container.appendChild(layer);
    }
    return layer
  }
  function addMaiTaiGarnishSprite(layer,p){
    if(!layer||!p||p.parent!=='doubleRocksGlass')return;
    const wrap=document.createElement('div');
    wrap.className='maiTaiGarnishSprite3106';
    wrap.style.left=Number(p.x||0)+'%';
    wrap.style.top=Number(p.y||0)+'%';
    wrap.style.width=Number(p.w||0)+'%';
    wrap.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    wrap.style.transform='translate(-50%,-50%) rotate('+(Number(p.r)||0)+'deg)';
    wrap.style.zIndex=String(p.z??45);
    wrap.style.opacity=String(p.opacity??1);
    if(Number(p.blur)>0)wrap.style.filter='blur('+Number(p.blur)+'px)';
    const img=document.createElement('img');
    img.src=maiTaiGarnishAsset(p.file);
    img.alt='';
    img.setAttribute('aria-hidden','true');
    wrap.appendChild(img);
    layer.appendChild(wrap);
  }
  function renderMaiTaiGarnishInto(container,cfg,{mint=false,pineapple=false}={}){
    const layer=ensureMaiTaiGarnishLayer(container);if(!layer)return;
    layer.innerHTML='';
    const gs=cfg?.glassSystem;if(!gs)return;
    if(mint){
      addMaiTaiGarnishSprite(layer,gs.items?.garnishMint);
      (Array.isArray(gs.copies)?gs.copies:[])
        .filter(x=>x?.source==='garnishMint')
        .forEach(x=>addMaiTaiGarnishSprite(layer,x));
    }
    if(pineapple)addMaiTaiGarnishSprite(layer,gs.items?.garnishPineapple)
  }
  async function renderMaiTaiGarnishState(){
    const cfg=await maiTaiGarnishConfig();if(!cfg)return;
    const parts=Array.isArray(state.maiTaiGarnishParts)?state.maiTaiGarnishParts:[];
    const mint=parts.some(x=>canon(x)===canon('Mynta'));
    const pineapple=parts.some(x=>canon(x)===canon('Ananasskiva'));
    renderMaiTaiGarnishInto(document.getElementById('doubleRocksGroup'),cfg,{mint,pineapple});
    if(maiTaiFinalGroup)renderMaiTaiGarnishInto(maiTaiFinalGroup,cfg,{mint,pineapple})
  }

  function shakerPartData(cfg){
    return cfg?.shakerSystem?.parts||SHAKER_SYSTEM_FALLBACK.parts
  }
  function applyShakerPartElement(img,p){
    if(!img||!p)return;
    img.style.left=Number(p.x)+'%';
    img.style.top=Number(p.y)+'%';
    img.style.width=Number(p.w)+'%';
    img.style.height=Number(p.w)+'%';
    img.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    img.style.transform='rotate('+(p.r||0)+'deg)';
    img.style.zIndex=String(p.z??0);
  }
  function applyShakerSystem(container,cfg){
    if(!container)return;
    const parts=shakerPartData(cfg);
    applyShakerPartElement(container.querySelector('.shakerBaseSprite,.shakeSpriteBase'),parts.shakerBase);
    applyShakerPartElement(container.querySelector('.shakerLidSprite,.shakeSpriteLid'),parts.shakerLid);
  }
  async function syncShakerSystem(container=shaker){
    const cfg=await start12();
    applyShakerSystem(container,cfg);
    return cfg
  }

  function hideAllBarGlasses(){
    for(const id of ['highballGroup','doubleRocksGroup','rocksGroup','tikiGroup']){
      const el=document.getElementById(id);
      if(!el)continue;
      el.style.display='none';
      el.style.pointerEvents='none';
      el.setAttribute('aria-hidden','true');
      el.classList.remove('maiTaiSelectedGlass');
    }
  }

  function ensureMaiTaiContent(){
    const group=document.getElementById('doubleRocksGroup');
    if(!group)return null;
    let clip=group.querySelector('.maiTaiContentClip');
    if(!clip){
      clip=document.createElement('div');
      clip.className='maiTaiContentClip';
      clip.innerHTML='<div class="maiTaiLiquid"></div><div class="maiTaiIce"><span></span><span></span><span></span><span></span><span></span><span></span></div>';
      group.appendChild(clip);
    }
    return {
      group,
      clip,
      liquid:clip.querySelector('.maiTaiLiquid'),
      ice:clip.querySelector('.maiTaiIce')
    };
  }

  function resetMaiTaiContent(){
    const c=ensureMaiTaiContent();if(!c)return;
    c.liquid.style.transition='none';
    c.liquid.style.height='0%';
    c.ice.style.display='none';
  }

  function fillMaiTaiGlass(duration=2000){
    const c=ensureMaiTaiContent();if(!c)return;
    c.ice.style.display='block';
    c.liquid.style.transition='none';
    c.liquid.style.height='0%';
    void c.liquid.offsetHeight;
    c.liquid.style.transition='height '+Math.max(250,Number(duration)||2000)+'ms linear';
    requestAnimationFrame(()=>{c.liquid.style.height='84%'});
  }

  function placeShakerStart(){
    if(!shaker)return;
    state.maiTaiShakerMode='start';
    shakerAnswerBusy=false;
    shaker.classList.remove('lidOff');
    shaker.classList.add('toolSelectable');
    placeModel(shaker,SHAKER_START_FALLBACK,1,4);
    applyShakerSystem(shaker,null);
    start12().then(cfg=>{
      if(!cfg||state.maiTaiShakerMode!=='start')return;
      const p=cfg.objects?.shaker||SHAKER_START_FALLBACK;
      placeModel(shaker,p,1,4);
      applyShakerSystem(shaker,cfg);
      shaker.classList.toggle('lidOff',p.lidOn===false);
    }).catch(()=>{});
  }

  placeShakerStart();
  hideAllBarGlasses();
  resetMaiTaiContent();

  async function applyMaiTaiToolPose(){
    if(!glassval||!shaker)throw new Error('Glasval/shaker saknas');
    state.maiTaiShakerMode='glassval';
    shaker.classList.add('lidOff');
    shaker.classList.remove('toolSelectable');
    await syncShakerSystem(shaker);
    return glassval.apply('shaker');
  }

  async function resolvedPourStart(){
    const previousTarget=scene.activeBottleElement?.()||'whiteRumBottle';
    try{
      scene.setActiveBottleElement?.('maiTaiShaker');
      const cfg=await scene.loadConfig(START_POUR_URL);
      const prepared=await scene.prepareConfig(cfg);
      const resolved=scene.resolveAttachments(cfg,prepared);
      return resolved.objects.whiteRum;
    }finally{
      scene.setActiveBottleElement?.(previousTarget);
    }
  }

  async function placeShakerAtPourStart(){
    if(!shaker)return;
    const p=await resolvedPourStart();
    state.maiTaiShakerMode='pourStart';
    shaker.classList.remove('toolSelectable');
    shaker.classList.add('lidOff');
    await syncShakerSystem(shaker);
    placeModel(shaker,p,1,p.attachedTo?0:4);
  }

  function placeChosenDoubleRocks(){
    hideAllBarGlasses();
    resetMaiTaiContent();
    const group=document.getElementById('doubleRocksGroup');if(!group)return;
    placeModel(group,DOUBLE_ROCKS_POS,DOUBLE_ROCKS.aspect,4);
    group.classList.add('maiTaiSelectedGlass');
    group.style.display='block';
    group.style.pointerEvents='none';
    group.setAttribute('aria-hidden','false');
  }

  function currentStep(){return state.phase==='recipe'&&state.drink?state.drink.steps[state.step]:null}
  function isMai(stepIndex,answer){
    const s=currentStep();
    return state.drink?.id==='maiTai'&&state.step===stepIndex&&(!answer||canon(s?.a)===canon(answer));
  }

  function answerShaker(){
    if(shakerAnswerBusy||!isMai(0,'Shaker'))return;
    shakerAnswerBusy=true;
    answerKnownChoice('Shaker',shaker);
  }

  /* Direct element binding remains for keyboard/desktop. */
  shaker?.addEventListener('click',answerShaker);
  shaker?.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&isMai(0,'Shaker')){
      e.preventDefault();answerShaker();
    }
  });

  /*
   * Mobile-safe shaker hit testing.
   * The visual object lives inside pointer-events:none scene roots, so we capture
   * pointerdown on the bar scene and compare the touch point to the shaker rect.
   */
  barScene?.addEventListener('pointerdown',e=>{
    if(!isMai(0,'Shaker')||!shaker||shaker.style.display==='none')return;
    const r=shaker.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    answerShaker();
  },true);

  /*
   * A bottle tap is a recipe answer. Stop the currently spoken recipe question
   * before the long bottle overlay/pour starts, otherwise an old question can
   * finish after the pour and sound as if the same rum is asked again.
   */
  barScene?.addEventListener('pointerdown',e=>{
    if(state.drink?.id!=='maiTai'||![1,2,3].includes(state.step))return;
    const bottle=e.target?.closest?.('[data-spirit]');
    if(!bottle)return;
    if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:false});
    if(typeof markUserActivityV388==='function')markUserActivityV388();
  },true);

  /* Direct-choice options are rendered by the base AI flow only after the spoken question has completed. */
  const previousRenderStep=renderStep;
  renderStep=function(newStep=false){
    const s=state.drink?.steps?.[state.step];

    if(state.drink?.id==='maiTai'&&state.step===7&&s){
      if(newStep){
        state.questionFails=0;
        state.amountFails=0;
        state.aiCorrectParts=[];
        state.recipeHelpV119=false;
      }
      state.lastRecipeQuestion=s.q;
      $('#dialogControls').innerHTML='';
      $('#dialogText').textContent=s.q;
      if(typeof renderRecipeControlsV119==='function')renderRecipeControlsV119();
      if(newStep&&typeof barPlayTtsV337==='function'){
        barPlayTtsV337(s.q).catch(err=>console.error('Mai Tai limezest TTS',err));
      }
      return;
    }

    return previousRenderStep(newStep);
  };

  const previousAdvanceStep=advanceStep;
  advanceStep=function(s){
    if(state.drink?.id==='maiTai'){
      const step=state.step;
      if(step===0&&canon(s?.a)===canon('Shaker')){
        applyMaiTaiToolPose()
          .then(()=>previousAdvanceStep(s))
          .catch(err=>{console.error('Mai Tai glasval/shaker',err);previousAdvanceStep(s)});
        return;
      }
      if(step===6&&canon(s?.a)===canon('Double Rocks-glas')){
        placeChosenDoubleRocks();
        const run=window.__barBottle396?.playCorrect;
        if(typeof run==='function'){
          Promise.resolve(run('maiTaiShaker','mai-tai-shaker')).then(()=>{
            if(shaker)shaker.style.display='none';
            previousAdvanceStep(s);
          }).catch(err=>{
            console.error('Mai Tai shaker-pour',err);
            if(shaker)shaker.style.display='none';
            previousAdvanceStep(s);
          });
        }else{
          if(shaker)shaker.style.display='none';
          previousAdvanceStep(s);
        }
        return;
      }
    }
    return previousAdvanceStep(s);
  };

  /*
   * Finish Mai Tai shaking deterministically. Cancel the active physical
   * instruction first and do not enqueue a physical_complete AI turn.
   */
  const previousFinishPhysical=finishPhysical;
  finishPhysical=function(kind){
    if(state.drink?.id==='maiTai'&&kind==='shake'){
      if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:false});
      if(typeof markUserActivityV388==='function')markUserActivityV388();
      ['muddleStage','shakeStage','drinkStage'].forEach(id=>$('#'+id).classList.add('hidden'));
      $('#returnStage').classList.remove('hidden');
      state.waitingLandscape=true;
      $('#returnText').textContent='Momentet är klart. Vrid tillbaka telefonen vågrätt. Spelet fortsätter automatiskt när landscape upptäcks.';
      tryOrientation('landscape',false);
      setTimeout(()=>{if(isLandscape())finalizeLandscapeReturn()},350);
      return;
    }
    return previousFinishPhysical(kind);
  };

  const previousFinalizeLandscapeReturn=finalizeLandscapeReturn;
  finalizeLandscapeReturn=function(force=false){
    const maiShake=state.drink?.id==='maiTai'&&state.action==='shake'&&state.waitingLandscape;
    if(!maiShake)return previousFinalizeLandscapeReturn(force);
    if(maiTaiReturnBusy)return;
    maiTaiReturnBusy=true;
    placeShakerAtPourStart()
      .catch(err=>console.error('Mai Tai pour-start',err))
      .finally(()=>{
        maiTaiReturnBusy=false;
        previousFinalizeLandscapeReturn(force);
      });
  };

  const shakeStage=document.querySelector('#shakeStage .shaker');
  const originalShakeMarkup=shakeStage?.innerHTML||'';
  function useRealShakeSprite(on){
    const stage=document.querySelector('#shakeStage .shaker');if(!stage)return;
    if(on){
      stage.innerHTML='<img class="shakeSpriteBase" src="ShakerUnderdel.png" alt=""><img class="shakeSpriteLid" src="ShakerLock.png" alt="">';
      applyShakerSystem(stage,null);
      start12().then(cfg=>{
        if(state.drink?.id==='maiTai'&&state.action==='shake')applyShakerSystem(stage,cfg)
      }).catch(()=>{});
    }else if(originalShakeMarkup){
      stage.innerHTML=originalShakeMarkup;
    }
  }

  const previousShowPhysicalStage=showPhysicalStage;
  showPhysicalStage=function(){
    previousShowPhysicalStage();
    const stage=document.getElementById('shakeStage');
    const on=state.drink?.id==='maiTai'&&state.action==='shake'&&!stage?.classList.contains('hidden');
    stage?.classList.toggle('maiTaiShake',Boolean(on));
    useRealShakeSprite(Boolean(on));
    if(on){
      const h=stage.querySelector('h2');if(h)h.textContent='Skaka Mai Tai!';
      const p=stage.querySelector('p');if(p)p.textContent='Skaka hela telefonen som en riktig shaker.';
    }
  };

  document.addEventListener('barpourphase',e=>{
    const d=e?.detail||{};
    if(d.bottleId!=='maiTaiShaker'||d.spiritId!=='mai-tai-shaker')return;
    if(d.phase==='pour-hold')fillMaiTaiGlass(d.holdMs||2000);
  });


  /* Physical tasting uses the same selected Double Rocks glass and Mai Tai contents. */
  const drinkStage=document.getElementById('drinkStage');
  let maiTaiFinalGroup=document.getElementById('maiTaiFinalGroup');

  function ensureMaiTaiFinalGroup(){
    if(maiTaiFinalGroup)return maiTaiFinalGroup;
    if(!drinkStage)return null;
    maiTaiFinalGroup=document.createElement('div');
    maiTaiFinalGroup.id='maiTaiFinalGroup';
    maiTaiFinalGroup.setAttribute('aria-hidden','true');
    maiTaiFinalGroup.innerHTML=
      '<img src="DoubleRocks.png" alt="" aria-hidden="true">'+
      '<div class="maiTaiFinalClip">'+
        '<div class="maiTaiLiquid"></div>'+
        '<div class="maiTaiIce"><span></span><span></span><span></span><span></span><span></span><span></span></div>'+
      '</div>'+
      '<div class="maiTaiGarnishLayer3106"></div>';
    const legacy=drinkStage.querySelector('.legacyDrinkGlass');
    if(legacy)drinkStage.insertBefore(maiTaiFinalGroup,legacy);
    else drinkStage.appendChild(maiTaiFinalGroup);
    return maiTaiFinalGroup
  }

  function setMaiTaiFinalMode(on){
    if(!drinkStage)return;
    const group=ensureMaiTaiFinalGroup();
    drinkStage.classList.toggle('maiTaiFinal',Boolean(on));
    if(group)group.setAttribute('aria-hidden',on?'false':'true');
    if(on)renderMaiTaiGarnishState().catch(err=>console.error('Mai Tai garnish final',err));
  }

  function updateMaiTaiFinalDrink(){
    if(state?.drink?.id!=='maiTai'||!drinkStage?.classList.contains('maiTaiFinal'))return;
    const group=ensureMaiTaiFinalGroup();if(!group)return;
    const p=Math.max(0,Math.min(100,Number(state.drinkProgress||0)));
    const liquid=group.querySelector('.maiTaiLiquid');
    const ice=group.querySelector('.maiTaiIce');
    if(liquid)liquid.style.height=(84*(1-p/100))+'%';
    if(ice)ice.style.display=p>=98?'none':'block';
  }

  const previousStartPhysicalActionV104=startPhysicalAction;
  startPhysicalAction=function(type,afterAction){
    const maiTaste=type==='drink'&&state?.drink?.id==='maiTai';
    setMaiTaiFinalMode(maiTaste);
    if(maiTaste){
      state.drinkProgress=0;
      updateMaiTaiFinalDrink();
    }
    return previousStartPhysicalActionV104(type,afterAction);
  };

  const previousUpdateDrinkV104=updateDrink;
  updateDrink=function(){
    previousUpdateDrinkV104();
    updateMaiTaiFinalDrink();
  };

  /* Mai Tai garnish: game controls visibility; v89 config controls geometry. */
  const MAITAI_TASTE_INTENT='Jag vill smaka eller dricka den färdiga drinken';
  state.maiTaiGarnishParts=[];
  state.maiTaiTasteReady=false;
  state.maiTaiGarnishComplete=false;

  function setMaiTaiGlassTasteReady(on){
    const group=document.getElementById('doubleRocksGroup');if(!group)return;
    group.classList.toggle('maiTaiTasteReady',Boolean(on));
    group.style.pointerEvents=on?'auto':'none';
    group.tabIndex=on?0:-1;
    group.setAttribute('role',on?'button':'presentation');
    group.setAttribute('aria-label',on?'Smaka Mai Tai':'');
  }

  function beginMaiTaiTaste(){
    if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai')return;
    state.maiTaiTasteReady=false;
    setMaiTaiGlassTasteReady(false);
    stopIdle?.();
    $('#dialogControls').innerHTML='';
    startPhysicalAction('drink','result')
  }

  async function handleMaiTaiTasteInput(raw,options={}){
    if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai'||state.aiBusy)return;
    const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
    markUserActivityV388?.();
    const silent=Boolean(options?.silent);
    const input=$('#specialText');if(input)input.value='';
    const status=$('#specialStatus');
    const token='taste:'+state.recipeSessionV119+':maiTai:'+state.step;
    setAiBusyV119(true);
    if(status)status.textContent='Alex tolkar…';
    const voice=silent?null:createStreamingSpeechV119();
    try{
      const data=await callAiStreamV119(text,{
        phase:'recipe',
        currentQuestion:'Spelaren har en färdig Mai Tai framför sig. Avgör om spelaren vill börja smaka eller dricka den nu.',
        expectedAnswer:MAITAI_TASTE_INTENT,
        answerMode:'single',
        answerParts:[MAITAI_TASTE_INTENT],
        alreadyCorrectParts:[],
        stepToken:token
      },(full,delta)=>{
        streamDialogV119(full);
        voice?.push(delta)
      });
      if(voice){voice.finish();setAiBusyV119(false)}else setAiBusyV119(false);
      const turn=data.turn||{};
      streamDialogV119(turn.reply||'');
      if(voice)await voice.done;
      if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai')return;
      const candidates=Array.isArray(turn.candidate_parts)?turn.candidate_parts:[];
      const wantsTaste=turn.context_token===token&&turn.action==='recipe_attempt'&&
        candidates.some(x=>canon(x)===canon(MAITAI_TASTE_INTENT));
      if(wantsTaste){beginMaiTaiTaste();return}
      renderMaiTaiTasteControls()
    }catch(err){
      voice?.cancel();
      setAiBusyV119(false);
      console.error('Mai Tai taste intent',err);
      if(status)status.textContent='Kunde inte nå bartendern. Försök igen.';
    }
  }

  function renderMaiTaiTasteControls(){
    if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai')return;
    stopIdle?.();
    $('#dialogControls').innerHTML=
      '<div class="freeAnswerRow">'+
      '<input id="specialText" placeholder="Säg att du vill smaka eller dricka">'+
      '<button class="btn" id="specialSend">Säg</button>'+
      '<button class="btn secondary" id="specialMic">🎙️</button>'+
      '<div class="recipeTalkNote">Tryck på glaset eller säg med egna ord att du vill smaka.</div>'+
      '<div class="freeAnswerStatus" id="specialStatus"></div>'+
      '</div>';
    const input=$('#specialText'),send=$('#specialSend'),mic=$('#specialMic'),status=$('#specialStatus');
    if(send&&input)send.onclick=()=>handleMaiTaiTasteInput(input.value);
    if(input)input.onkeydown=e=>{if(e.key==='Enter')handleMaiTaiTasteInput(e.target.value)};
    if(mic)mic.onclick=()=>recognize(alts=>handleMaiTaiTasteInput(alts[0]||''),mic,status)
  }

  function activateMaiTaiTasteReady(){
    if(state.drink?.id!=='maiTai'||!state.maiTaiGarnishComplete)return;
    state.maiTaiTasteReady=true;
    setMaiTaiGlassTasteReady(true);
    renderMaiTaiTasteControls();
    /* alexEvent schedules idle after its callback; cancel it on the next task. */
    setTimeout(()=>{if(state.maiTaiTasteReady)stopIdle?.()},0)
  }

  function announceMaiTaiReady(){
    const token='taste-ready:'+state.recipeSessionV119+':maiTai:'+state.step;
    return alexEventV388('recipe_transition',{
      fact:'Mai Tai är nu helt färdig. Limezest är redan tillagd och spelaren valde ananasskiva och mynta som garnering.',
      nextIntent:'Säg naturligt att Mai Tai är färdig och att spelaren kan smaka eller dricka den när hen vill. Ställ ingen ny receptfråga och upprepa inte limezest-instruktionen.'
    },{
      target:'#dialogText',phase:'recipe',forceVoice:true,
      extra:{currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:token},
      after:data=>{
        if(state.drink?.id!=='maiTai'||!state.maiTaiGarnishComplete)return;
        if(data)activateMaiTaiTasteReady();
        else{
          $('#dialogControls').innerHTML='<button type="button" class="btn" id="maiTaiReadyRetry">Försök igen</button>';
          $('#maiTaiReadyRetry')?.addEventListener('click',()=>announceMaiTaiReady())
        }
      }
    })
  }

  function completeMaiTaiGarnish(step){
    if(state.maiTaiGarnishComplete||!step)return;
    state.maiTaiGarnishComplete=true;
    state.correct++;
    state.points+=10;
    state.aiCorrectParts=[];
    state.recipeHelpV119=false;
    state.questionFails=0;
    state.amountFails=0;
    state.lastRecipeQuestion='';
    state.step++;
    $('#dialogControls').innerHTML='';
    if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:false});
    if(typeof markUserActivityV388==='function')markUserActivityV388();
    renderMaiTaiGarnishState().catch(err=>console.error('Mai Tai garnish render',err));
    announceMaiTaiReady()
  }

  document.getElementById('doubleRocksGroup')?.addEventListener('click',e=>{
    if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai')return;
    e.preventDefault();e.stopImmediatePropagation();beginMaiTaiTaste()
  });
  document.getElementById('doubleRocksGroup')?.addEventListener('keydown',e=>{
    if(!state.maiTaiTasteReady||state.drink?.id!=='maiTai')return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();beginMaiTaiTaste()}
  });

  document.addEventListener('click',e=>{
    if(!isMai(7,'Ananasskiva och mynta'))return;
    const zone=e.target.closest?.('[data-ingredient-zone]');if(!zone)return;
    const id=zone.dataset.ingredientZone;
    if(id!=='mynta'&&id!=='ananasGarnish')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const selected=id==='mynta'?'Mynta':'Ananasskiva';
    const current=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];
    if(!current.some(x=>canon(x)===canon(selected)))current.push(selected);
    state.aiCorrectParts=current;
    state.maiTaiGarnishParts=current.slice();
    zone.classList.add('good');
    renderMaiTaiGarnishState().catch(err=>console.error('Mai Tai garnish selection',err));

    const hasMint=current.some(x=>canon(x)===canon('Mynta'));
    const hasPine=current.some(x=>canon(x)===canon('Ananasskiva'));
    if(hasMint&&hasPine){
      const step=currentStep();
      if(!step)return;
      completeMaiTaiGarnish(step)
    }
  },true);

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.drinkChoice');
    if(!b)return;
    state.recipeReads=(state.recipeReads||0)+1;
    if(state.drink)state.recipePenalty=(state.recipePenalty||0)+5;
    else state.pendingRecipePenalty=(state.pendingRecipePenalty||0)+5;
    toast('Recept −5 poäng');
  },true);

  const previousOrderDrink=orderDrink;
  orderDrink=function(d){
    const pending=Number(state.pendingRecipePenalty||0);
    state.maiTaiGarnishParts=[];
    state.maiTaiTasteReady=false;
    state.maiTaiGarnishComplete=false;
    setMaiTaiGlassTasteReady(false);
    shakerAnswerBusy=false;
    hideAllBarGlasses();
    resetMaiTaiContent();
    setMaiTaiFinalMode(false);
    if(shaker){shaker.style.display='block';placeShakerStart()}
    if(d?.id==='maiTai')maiTaiGarnishConfig().catch(()=>{});
    const result=previousOrderDrink(d);
    state.recipePenalty=pending;
    state.recipePenaltyApplied=false;
    state.pendingRecipePenalty=0;
    return result;
  };

  const previousShowResult=showResult;
  showResult=function(){
    if(!state.recipePenaltyApplied){
      state.points-=Number(state.recipePenalty||0);
      state.recipePenaltyApplied=true;
    }
    return previousShowResult();
  };

  function resetSceneExtras(){
    state.maiTaiGarnishParts=[];
    state.maiTaiTasteReady=false;
    state.maiTaiGarnishComplete=false;
    setMaiTaiGlassTasteReady(false);
    hideAllBarGlasses();
    resetMaiTaiContent();
    const barLayer=document.querySelector('#doubleRocksGroup > .maiTaiGarnishLayer3106');
    if(barLayer)barLayer.innerHTML='';
    setMaiTaiFinalMode(false);
    useRealShakeSprite(false);
    shakerAnswerBusy=false;
    if(shaker){shaker.style.display='block';placeShakerStart()}
  }
  document.getElementById('anotherBtn')?.addEventListener('click',resetSceneExtras,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',resetSceneExtras,true);

  window.__barMaiTai3106={
    shaker,
    placeShakerStart,
    placeShakerAtPourStart,
    placeChosenDoubleRocks,
    fillMaiTaiGlass,
    hideAllBarGlasses,
    renderMaiTaiGarnishState,
    activateMaiTaiTasteReady,
    ensureMaiTaiFinalGroup,
    updateMaiTaiFinalDrink,
    glassvalAnchor:{...GLASSVAL_ANCHOR},
    doubleRocksPosition:{...DOUBLE_ROCKS_POS},
    recipePenalty:5,
    shakerSprites:{base:'ShakerUnderdel.png',lid:'ShakerLock.png'},
    shakerSystemFallback:clone(SHAKER_SYSTEM_FALLBACK)
  };
})();
