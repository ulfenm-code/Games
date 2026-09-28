'use strict';
(function(){
  const scene=window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const glassval=window.__barGlassval3101;
  const START_POUR_URL='./bartender_installningar_start&stopDrink.json';
  const SHAKER_TOOL={x:383.7049663252007,y:275.92103955945794,w:52,r:0,px:50,py:50,z:15};
  const GLASSVAL_POS={x:239.59172810860673,y:275.76171875000006,r:0,px:50,py:50,z:25};
  const DOUBLE_ROCKS={w:30.262883694654807,aspect:1402/1122};
  const START_GLASS_CANDIDATES={
    doubleRocksGroup:{x:432.277330229036,y:293.67720909460195,w:30.262883694654807,aspect:1402/1122,answer:'Double Rocks-glas'},
    rocksGroup:{x:402.1441869726672,y:295.4231102550719,w:26.733800030714423,aspect:1402/1122,answer:'Rocksglas'},
    highballGroup:{x:446.82969882422714,y:275.76171875000006,w:33.483763131618275,aspect:2.4,answer:'Highballglas'}
  };

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
      {q:'Vilka tre ingredienser ska tillsättas nu?',a:'Orgeat, färsk limejuice och sockerlag',opts:['Orgeat, färsk limejuice och sockerlag','Grenadin, citronjuice och honung','Kokosgrädde, ananasjuice och sockerlag'],forceChoices:true},
      {q:'Vad ska läggas i shakern nu?',a:'Is',opts:['Is','Salt','Mer socker'],action:'shake'},
      {q:'Vilket glas ska användas?',a:'Double Rocks-glas',opts:['Double Rocks-glas','Highballglas','Rocksglas']},
      {q:'Vad ska vi garnera med? Ledtråd: det är två saker.',a:'Ananasskiva och mynta',opts:['Ananasskiva och mynta','Apelsinskiva och körsbär','Citron och basilika']}
    ]});
  }

  const objectLayer=document.getElementById('barObjectLayer');
  let shaker=document.getElementById('maiTaiShaker');
  if(!shaker&&objectLayer){
    shaker=document.createElement('div');
    shaker.id='maiTaiShaker';
    shaker.className='lidOff toolSelectable';
    shaker.setAttribute('role','button');
    shaker.setAttribute('tabindex','0');
    shaker.setAttribute('aria-label','Shaker');
    shaker.innerHTML='<div class="bottleBase shakerCupVisual"></div><div class="bottleCap shakerLidVisual"></div>';
    objectLayer.appendChild(shaker);
  }

  function scale(){return window.__barScale359?.finalGameFactor||1}
  function placeModel(el,p,aspect=1.5,yOffset=4){
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
  function placeShakerTool(){
    if(!shaker)return;
    state.maiTaiShakerMode='tool';
    shaker.classList.add('lidOff','toolSelectable');
    placeModel(shaker,SHAKER_TOOL,1.5,4);
  }
  placeShakerTool();

  async function applyMaiTaiToolPose(){
    if(!glassval||!shaker)throw new Error('Glasval/shaker saknas');
    state.maiTaiShakerMode='glassval';
    shaker.classList.add('lidOff');
    shaker.classList.remove('toolSelectable');
    const r=await glassval.apply('shaker');
    return r;
  }

  async function resolvedPourStart(){
    const cfg=await scene.loadConfig(START_POUR_URL);
    const prepared=await scene.prepareConfig(cfg);
    const resolved=scene.resolveAttachments(cfg,prepared);
    return resolved.objects.whiteRum;
  }
  async function placeShakerAtPourStart(){
    if(!shaker)return;
    const p=await resolvedPourStart();
    state.maiTaiShakerMode='pourStart';
    shaker.classList.remove('toolSelectable');
    shaker.classList.remove('lidOff');
    placeModel(shaker,p,1.5,p.attachedTo?0:4);
  }

  function placeExtraGlass(group,p){
    if(!group)return;
    placeModel(group,p,p.aspect||1,4);
    group.setAttribute('aria-hidden','false');
  }
  function setGlassCandidates(on){
    for(const [id,p] of Object.entries(START_GLASS_CANDIDATES)){
      const el=document.getElementById(id);if(!el)continue;
      if(on){
        placeExtraGlass(el,p);
        el.classList.add('glassSelectable');
        el.style.pointerEvents='auto';
        el.setAttribute('role','button');
        el.setAttribute('tabindex','0');
        el.setAttribute('aria-label',p.answer);
      }else{
        el.classList.remove('glassSelectable');
        el.style.pointerEvents='none';
        el.removeAttribute('role');el.removeAttribute('tabindex');el.removeAttribute('aria-label');
        el.style.display='none';
      }
    }
  }
  function placeChosenDoubleRocks(){
    const el=document.getElementById('doubleRocksGroup');if(!el)return;
    setGlassCandidates(false);
    placeExtraGlass(el,{...GLASSVAL_POS,w:DOUBLE_ROCKS.w,aspect:DOUBLE_ROCKS.aspect});
    el.style.pointerEvents='none';
  }

  function currentStep(){return state.phase==='recipe'&&state.drink?state.drink.steps[state.step]:null}
  function isMai(stepIndex,answer){
    const s=currentStep();
    return state.drink?.id==='maiTai'&&state.step===stepIndex&&(!answer||canon(s?.a)===canon(answer));
  }

  function answerShaker(){
    if(!isMai(0,'Shaker'))return;
    answerKnownChoice('Shaker',shaker);
  }
  shaker?.addEventListener('click',answerShaker);
  shaker?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&isMai(0,'Shaker')){e.preventDefault();answerShaker()}});

  const previousRenderStep=renderStep;
  renderStep=function(newStep=false){
    const s=state.drink?.steps?.[state.step];
    if(state.drink?.id==='maiTai'&&s?.forceChoices){
      if(newStep){state.questionFails=0;state.amountFails=0;state.aiCorrectParts=[]}
      state.lastRecipeQuestion=naturalQuestion(s);$('#dialogText').textContent='';
      renderEasy(s);
      return;
    }
    if(state.drink?.id==='maiTai'&&state.step===6)setTimeout(()=>setGlassCandidates(true),0);
    return previousRenderStep(newStep);
  };

  const previousAdvanceStep=advanceStep;
  advanceStep=function(s){
    if(state.drink?.id==='maiTai'){
      const step=state.step;
      if(step===0&&canon(s?.a)===canon('Shaker')){
        applyMaiTaiToolPose().then(()=>previousAdvanceStep(s)).catch(err=>{console.error('Mai Tai glasval/shaker',err);previousAdvanceStep(s)});
        return;
      }
      if(step===6&&canon(s?.a)===canon('Double Rocks-glas')){
        placeChosenDoubleRocks();
        const run=window.__barBottle396?.playCorrect;
        if(typeof run==='function'){
          Promise.resolve(run('maiTaiShaker','mai-tai-shaker')).then(()=>{
            if(shaker)shaker.style.display='none';
            previousAdvanceStep(s);
          }).catch(err=>{console.error('Mai Tai shaker-pour',err);if(shaker)shaker.style.display='none';previousAdvanceStep(s)});
        }else{
          if(shaker)shaker.style.display='none';
          previousAdvanceStep(s);
        }
        return;
      }
    }
    return previousAdvanceStep(s);
  };

  const previousFinalizeLandscapeReturn=finalizeLandscapeReturn;
  finalizeLandscapeReturn=function(force=false){
    const maiShake=state.drink?.id==='maiTai'&&state.action==='shake'&&state.waitingLandscape;
    if(maiShake){
      placeShakerAtPourStart()
        .catch(err=>console.error('Mai Tai pour-start',err))
        .finally(()=>previousFinalizeLandscapeReturn(force));
      return;
    }
    return previousFinalizeLandscapeReturn(force);
  };

  const previousShowPhysicalStage=showPhysicalStage;
  showPhysicalStage=function(){
    previousShowPhysicalStage();
    const stage=document.getElementById('shakeStage');
    const on=state.drink?.id==='maiTai'&&state.action==='shake'&&!stage?.classList.contains('hidden');
    stage?.classList.toggle('maiTaiShake',Boolean(on));
    if(on){
      const h=stage.querySelector('h2');if(h)h.textContent='Skaka Mai Tai!';
      const p=stage.querySelector('p');if(p)p.textContent='Skaka hela telefonen som en riktig shaker.';
    }
  };

  for(const [id,p] of Object.entries(START_GLASS_CANDIDATES)){
    const el=document.getElementById(id);if(!el)continue;
    const answer=()=>{if(isMai(6,'Double Rocks-glas'))answerKnownChoice(p.answer,el)};
    el.addEventListener('click',answer);
    el.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&isMai(6,'Double Rocks-glas')){e.preventDefault();answer()}});
  }

  state.maiTaiGarnishParts=[];
  document.addEventListener('click',e=>{
    if(!isMai(7,'Ananasskiva och mynta'))return;
    const zone=e.target.closest?.('[data-ingredient-zone]');if(!zone)return;
    const id=zone.dataset.ingredientZone;
    if(id!=='mynta'&&id!=='ananasGarnish')return;
    e.preventDefault();e.stopImmediatePropagation();
    const part=id==='mynta'?'mynta':'ananasskiva';
    if(!state.maiTaiGarnishParts.includes(part))state.maiTaiGarnishParts.push(part);
    zone.classList.add('good');
    if(state.maiTaiGarnishParts.includes('mynta')&&state.maiTaiGarnishParts.includes('ananasskiva')){
      state.maiTaiGarnishParts=[];
      answerKnownChoice('Ananasskiva och mynta',zone);
    }else{
      toast(id==='mynta'?'Mynta vald – välj också ananas.':'Ananas vald – välj också mynta.');
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
    setGlassCandidates(false);
    if(shaker){shaker.style.display='block';placeShakerTool()}
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
  document.getElementById('anotherBtn')?.addEventListener('click',()=>{setGlassCandidates(false);if(shaker){shaker.style.display='block';placeShakerTool()}},true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',()=>{setGlassCandidates(false);if(shaker){shaker.style.display='block';placeShakerTool()}},true);

  window.__barMaiTai3101={
    shaker,
    placeShakerTool,
    placeShakerAtPourStart,
    placeChosenDoubleRocks,
    glassvalPosition:{...GLASSVAL_POS},
    recipePenalty:5
  };
})();
