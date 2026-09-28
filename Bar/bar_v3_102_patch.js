'use strict';
/* Bar Game v3.102 Mai Tai corrections. */
(function(){
  const scene=window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const glassval=window.__barGlassval3101;
  const START_POUR_URL='./bartender_installningar_start&stopDrink.json';
  const SHAKER_TOOL={x:383.7049663252007,y:275.92103955945794,w:52,r:0,px:50,py:50,z:15};
  const GLASSVAL_POS={x:239.59172810860673,y:275.76171875000006,r:0,px:50,py:50,z:25};
  const DOUBLE_ROCKS={w:30.262883694654807,aspect:1402/1122};
  let maiTaiReturnBusy=false;

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
  let shaker=document.getElementById('maiTaiShaker');
  if(!shaker&&objectLayer){
    shaker=document.createElement('div');
    shaker.id='maiTaiShaker';
    shaker.className='lidOff toolSelectable';
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
      group.insertBefore(clip,group.firstChild);
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

  function placeShakerTool(){
    if(!shaker)return;
    state.maiTaiShakerMode='tool';
    shaker.classList.add('lidOff','toolSelectable');
    placeModel(shaker,SHAKER_TOOL,1,4);
  }
  placeShakerTool();
  hideAllBarGlasses();
  resetMaiTaiContent();

  async function applyMaiTaiToolPose(){
    if(!glassval||!shaker)throw new Error('Glasval/shaker saknas');
    state.maiTaiShakerMode='glassval';
    shaker.classList.add('lidOff');
    shaker.classList.remove('toolSelectable');
    return glassval.apply('shaker');
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
    shaker.classList.remove('toolSelectable','lidOff');
    placeModel(shaker,p,1,p.attachedTo?0:4);
  }

  function placeChosenDoubleRocks(){
    hideAllBarGlasses();
    resetMaiTaiContent();
    const group=document.getElementById('doubleRocksGroup');if(!group)return;
    placeModel(group,{...GLASSVAL_POS,w:DOUBLE_ROCKS.w},DOUBLE_ROCKS.aspect,4);
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
    if(!isMai(0,'Shaker'))return;
    answerKnownChoice('Shaker',shaker);
  }
  shaker?.addEventListener('click',answerShaker);
  shaker?.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&isMai(0,'Shaker')){
      e.preventDefault();answerShaker();
    }
  });

  /* Direct-choice questions must display their choices immediately, not after speech ends. */
  const previousRenderStep=renderStep;
  renderStep=function(newStep=false){
    const s=state.drink?.steps?.[state.step];
    const direct=state.drink?.id==='maiTai'&&Boolean(s?.directChoices);
    const result=previousRenderStep(newStep);
    if(direct&&typeof renderRecipeControlsV119==='function'){
      requestAnimationFrame(()=>{
        if(state.phase==='recipe'&&state.drink?.id==='maiTai'&&state.drink.steps[state.step]===s){
          renderRecipeControlsV119();
        }
      });
    }
    return result;
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

  /* Mai Tai garnish can be picked in either order. No partial-selection toast. */
  state.maiTaiGarnishParts=[];
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
    zone.classList.add('good');

    const hasMint=current.some(x=>canon(x)===canon('Mynta'));
    const hasPine=current.some(x=>canon(x)===canon('Ananasskiva'));
    if(hasMint&&hasPine){
      answerKnownChoice('Ananasskiva och mynta',zone);
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
    hideAllBarGlasses();
    resetMaiTaiContent();
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

  function resetSceneExtras(){
    hideAllBarGlasses();
    resetMaiTaiContent();
    useRealShakeSprite(false);
    if(shaker){shaker.style.display='block';placeShakerTool()}
  }
  document.getElementById('anotherBtn')?.addEventListener('click',resetSceneExtras,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',resetSceneExtras,true);

  window.__barMaiTai3102={
    shaker,
    placeShakerTool,
    placeShakerAtPourStart,
    placeChosenDoubleRocks,
    fillMaiTaiGlass,
    hideAllBarGlasses,
    glassvalPosition:{...GLASSVAL_POS},
    recipePenalty:5,
    shakerSprites:{base:'ShakerUnderdel.png',lid:'ShakerLock.png'}
  };
})();
