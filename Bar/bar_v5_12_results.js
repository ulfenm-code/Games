'use strict';
/* Bar Game v5.12 — result summary, Crazy Bar scoring and dedicated top-10 highscore. */
(function(){
  if(typeof state==='undefined')return;

  const HIGHSCORE_API='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-highscore-v1';
  const PUBLIC_KEY='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function fmtTime(sec){
    const s=Math.max(0,Math.round(Number(sec)||0));
    const m=Math.floor(s/60),r=s%60;
    return m+':'+String(r).padStart(2,'0')
  }
  function missPenalty(missed){
    const m=Math.max(0,Math.trunc(Number(missed)||0));
    if(m===0)return 0;
    if(m===1)return 1;
    if(m===2)return 3;
    return 5
  }
  function modeInfo(){
    const custom=Boolean(state.egenDrink&&state.drink?.v51Custom);
    const crazy=Boolean(window.__crazyBarModeV41);
    const key=custom?(crazy?'custom_crazy':'custom'):(crazy?'crazy':'bar');
    const label=key==='bar'?'Bar':key==='crazy'?'Crazy Bar':key==='custom'?'Egen drink':'Egen drink + Crazy Bar';
    return {key,label,custom,crazy}
  }
  function baseScore(){
    const max=Math.max(1,(state.drink?.steps?.length||0)*10);
    const accuracy=Number(state.correct||0)/(Number(state.correct||0)+Number(state.wrong||0)||1);
    return clamp(Math.round((Number(state.points||0)/max)*75+accuracy*25),0,100)
  }
  function ensureStats(){
    if(!state.v512CrazyStats)state.v512CrazyStats={
      bottleRounds:0,bottleMissed:0,bottlePenalty:0,
      beeRounds:0,beeMissed:0,beePenalty:0,
      excludedMs:0
    };
    return state.v512CrazyStats
  }
  function resetResultState(){
    state.v512CrazyStats={
      bottleRounds:0,bottleMissed:0,bottlePenalty:0,
      beeRounds:0,beeMissed:0,beePenalty:0,
      excludedMs:0
    };
    state.v512ResultSubmitted=false;
    state.v512FinalResult=null;
    state.v512HelpUses=0;
    state.v512HelpPenalty=0
  }

  document.addEventListener('barcrazyresult',e=>{
    if(!state.drink||!state.startedAt)return;
    const d=e.detail||{},stats=ensureStats();
    const missed=Math.max(0,Math.trunc(Number(d.missed)||0));
    const penalty=missPenalty(missed);
    stats.excludedMs+=Math.max(0,Number(d.durationMs)||0);
    if(d.kind==='bottles'){
      stats.bottleRounds++;
      stats.bottleMissed+=missed;
      stats.bottlePenalty+=penalty
    }else if(d.kind==='bees'){
      stats.beeRounds++;
      stats.beeMissed+=missed;
      stats.beePenalty+=penalty
    }
  });

  const previousOrderDrink510=orderDrink;
  orderDrink=function(d){
    const result=previousOrderDrink510(d);
    resetResultState();
    return result
  };

  function resultData(){
    const stats=ensureStats();
    const elapsedMs=Math.max(0,Date.now()-Number(state.startedAt||Date.now()));
    const relevantSeconds=Math.max(0,Math.round((elapsedMs-Math.min(elapsedMs,stats.excludedMs))/1000));
    const freeSeconds=Math.max(120,(state.drink?.steps?.length||0)*25);
    const timePenalty=relevantSeconds>freeSeconds?Math.min(3,Math.ceil((relevantSeconds-freeSeconds)/60)):0;
    const recipeReads=Math.max(0,Math.trunc(Number(state.recipeReads)||0));
    const recipePenalty=recipeReads*5;
    const helpUses=Math.max(0,Math.trunc(Number(state.v512HelpUses)||0));
    const helpPenalty=Math.max(0,Math.trunc(Number(state.v512HelpPenalty)||0));
    const base=baseScore();
    const totalPenalty=recipePenalty+helpPenalty+stats.bottlePenalty+stats.beePenalty+timePenalty;
    const score=clamp(base-totalPenalty,0,100);
    const mode=modeInfo();
    return {
      player_name:String(state.name||'Spelare').trim().slice(0,24)||'Spelare',
      score,
      base_score:base,
      game_mode:mode.key,
      game_mode_label:mode.label,
      drink_name:String(state.drink?.name||'Drink').trim().slice(0,120)||'Drink',
      is_custom:mode.custom,
      time_seconds:relevantSeconds,
      free_time_seconds:freeSeconds,
      correct:Math.max(0,Math.trunc(Number(state.correct)||0)),
      wrong:Math.max(0,Math.trunc(Number(state.wrong)||0)),
      recipe_reads:recipeReads,
      recipe_penalty:recipePenalty,
      help_uses:helpUses,
      help_penalty:helpPenalty,
      crazy_bottle_missed:stats.bottleMissed,
      crazy_bottle_penalty:stats.bottlePenalty,
      crazy_bottle_rounds:stats.bottleRounds,
      crazy_bee_missed:stats.beeMissed,
      crazy_bee_penalty:stats.beePenalty,
      crazy_bee_rounds:stats.beeRounds,
      time_penalty:timePenalty,
      total_penalty:totalPenalty
    }
  }

  function addCell(grid,value,label){
    const d=document.createElement('div');
    const b=document.createElement('b');b.textContent=String(value);
    const br=document.createElement('br');
    const s=document.createElement('small');s.textContent=label;
    d.append(b,br,s);grid.appendChild(d)
  }
  function renderSummary(r){
    const title=document.getElementById('resultTitle');
    const value=document.getElementById('scoreValue');
    const line=document.getElementById('resultLine');
    const modeLine=document.getElementById('v512ModeLine');
    const grid=document.getElementById('scoreGrid');
    if(title)title.textContent=r.drink_name+' klar!';
    if(value)value.textContent=String(r.score);
    if(modeLine)modeLine.textContent=r.is_custom
      ? 'Spelläge: '+r.game_mode_label+' · Egen drink: '+r.drink_name
      : 'Spelläge: '+r.game_mode_label;
    if(line)line.textContent='';
    if(grid){
      grid.innerHTML='';
      addCell(grid,r.base_score,'grundpoäng');
      addCell(grid,r.correct,'rätt');
      addCell(grid,r.wrong,'fel');
      addCell(grid,fmtTime(r.time_seconds),'speltid');
      addCell(grid,'−'+r.recipe_penalty,'recept ('+r.recipe_reads+'×)');
      if(r.help_penalty>0)addCell(grid,'−'+r.help_penalty,'vet ej / hjälp ('+r.help_uses+'×)');
      if(r.game_mode==='crazy'||r.game_mode==='custom_crazy'){
        addCell(grid,'−'+r.crazy_bottle_penalty,'flaskor · '+r.crazy_bottle_missed+' missade');
        addCell(grid,'−'+r.crazy_bee_penalty,'bin · '+r.crazy_bee_missed+' missade');
      }
      addCell(grid,'−'+r.time_penalty,'tidsavdrag');
      addCell(grid,'−'+r.total_penalty,'totala avdrag');
    }
    const note=document.getElementById('v512TimeRule');
    if(note)note.textContent='Tidsavdrag börjar efter '+fmtTime(r.free_time_seconds)+' och är högst −3. Crazy Bar-tid räknas bort.'
  }

  async function hsRequest(method='GET',body=null){
    const opts={method,headers:{'apikey':PUBLIC_KEY}};
    if(body){
      opts.headers['Content-Type']='application/json';
      opts.body=JSON.stringify(body)
    }
    const res=await fetch(HIGHSCORE_API,opts);
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data?.error||'highscore_failed');
    return data
  }
  function displayMode(key){
    return key==='bar'?'Bar':key==='crazy'?'Crazy Bar':key==='custom'?'Egen drink':key==='custom_crazy'?'Egen + Crazy':'Bar'
  }
  function renderHighscores(rows,target){
    if(!target)return;
    target.innerHTML='';
    const title=document.createElement('h3');title.textContent='Highscore · topp 10';target.appendChild(title);
    if(!Array.isArray(rows)||!rows.length){
      const p=document.createElement('p');p.className='v512HsEmpty';p.textContent='Ingen highscore ännu.';target.appendChild(p);return
    }
    const table=document.createElement('div');table.className='v512HsTable';
    const head=document.createElement('div');head.className='v512HsRow v512HsHead';
    ['#','Namn','Poäng','Spelläge','Drink','Tid'].forEach(x=>{const c=document.createElement('span');c.textContent=x;head.appendChild(c)});
    table.appendChild(head);
    rows.slice(0,10).forEach((row,i)=>{
      const line=document.createElement('div');line.className='v512HsRow';
      const vals=[i+1,row.player_name,row.score,displayMode(row.game_mode),row.drink_name,fmtTime(row.time_seconds)];
      vals.forEach(v=>{const c=document.createElement('span');c.textContent=String(v??'');line.appendChild(c)});
      table.appendChild(line)
    });
    target.appendChild(table)
  }
  async function loadHighscores(target){
    if(!target)return;
    target.textContent='Laddar highscore…';
    try{
      const data=await hsRequest('GET');
      renderHighscores(data.highscores||[],target)
    }catch(err){
      console.error('v5.12 highscore load',err);
      target.textContent='Highscore kunde inte hämtas just nu.'
    }
  }
  async function submitResult(r){
    if(state.v512ResultSubmitted)return;
    state.v512ResultSubmitted=true;
    const target=document.getElementById('v512ResultHighscore');
    if(target)target.textContent='Sparar resultat och laddar highscore…';
    try{
      const data=await hsRequest('POST',{
        player_name:r.player_name,
        base_score:Math.max(0,r.base_score-r.help_penalty),
        game_mode:r.game_mode,
        drink_name:r.drink_name,
        is_custom:r.is_custom,
        time_seconds:r.time_seconds,
        correct:r.correct,
        wrong:r.wrong,
        recipe_reads:r.recipe_reads,
        help_uses:r.help_uses,
        crazy_bottle_missed:r.crazy_bottle_missed,
        crazy_bottle_penalty:r.crazy_bottle_penalty,
        crazy_bee_missed:r.crazy_bee_missed,
        crazy_bee_penalty:r.crazy_bee_penalty,
        time_penalty:r.time_penalty
      });
      if(Number.isFinite(Number(data.score))&&Number(data.score)!==r.score){
        console.warn('v5.12 server score differed',r.score,data.score)
      }
      renderHighscores(data.highscores||[],target)
    }catch(err){
      console.error('v5.12 highscore save',err);
      if(target){
        target.textContent='Resultatet kunde inte sparas i highscore just nu.';
        const retry=document.createElement('button');
        retry.type='button';retry.className='btn secondary v512Retry';retry.textContent='Försök igen';
        retry.onclick=()=>{state.v512ResultSubmitted=false;submitResult(r)};
        target.appendChild(document.createElement('br'));target.appendChild(retry)
      }
    }
  }

  showResult=function(){
    state.phase='result';
    const r=resultData();
    state.v512FinalResult=r;
    show('resultScreen');
    renderSummary(r);
    window.__barAI388?.event?.('result',{
      drinkName:r.drink_name,
      score:r.score,
      correct:r.correct,
      wrong:r.wrong,
      timeSeconds:r.time_seconds,
      gameMode:r.game_mode_label,
      recipePenalty:r.recipe_penalty,
      helpPenalty:r.help_penalty,
      crazyBottlePenalty:r.crazy_bottle_penalty,
      crazyBeePenalty:r.crazy_bee_penalty,
      timePenalty:r.time_penalty
    },{target:'#resultLine',phase:'result'}).catch?.(()=>{});
    setTimeout(()=>renderSummary(r),0);
    submitResult(r)
  };

  function installUi(){
    if(document.getElementById('v512ResultsStyle'))return;
    const style=document.createElement('style');style.id='v512ResultsStyle';
    style.textContent=[
      '.resultCard{width:min(94vw,820px)!important;max-height:92vh;overflow:auto}',
      '#v512ModeLine{font-weight:800;margin:4px 0 8px}',
      '#v512TimeRule{font-size:12px;opacity:.72;margin:8px 0 12px}',
      '#v512ResultHighscore{margin-top:18px;text-align:left}',
      '#v512ResultHighscore h3,#v512HighscorePanel h3{margin:0 0 10px;text-align:center}',
      '.v512HsTable{display:grid;gap:4px;font-size:13px}',
      '.v512HsRow{display:grid;grid-template-columns:30px minmax(80px,1.05fr) 58px minmax(90px,1fr) minmax(100px,1.25fr) 54px;gap:6px;align-items:center;padding:7px 8px;border-radius:9px;background:#ffffff0a}',
      '.v512HsHead{font-weight:900;background:#ffffff16}',
      '.v512HsRow span:nth-child(3),.v512HsRow span:nth-child(6){text-align:right}',
      '.v512HsEmpty{text-align:center;opacity:.75}',
      '.v512HighscoreRow{display:flex;justify-content:center;margin-top:10px}',
      '#v512HighscoreBtn{width:min(100%,430px)}',
      '#v512HighscoreOverlay{position:fixed;inset:0;z-index:2400;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(5,6,10,.84);backdrop-filter:blur(3px)}',
      '#v512HighscoreOverlay.open{display:flex}',
      '#v512HighscoreCard{width:min(94vw,820px);max-height:88vh;overflow:auto;background:#17191f;border:1px solid #ffffff2b;border-radius:20px;padding:18px;box-shadow:0 20px 70px #000b}',
      '.v512HsTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}',
      '.v512HsTop h2{margin:0}',
      '#v512HighscoreClose{width:44px;height:44px;border-radius:12px}',
      '.v512Retry{margin-top:8px}',
      '@media(max-width:620px){.v512HsTable{font-size:11px}.v512HsRow{grid-template-columns:24px minmax(62px,1fr) 44px minmax(70px,.9fr) minmax(80px,1.1fr) 44px;gap:4px;padding:6px 5px}}'
    ].join('');
    document.head.appendChild(style);

    const card=document.querySelector('#resultScreen .resultCard');
    if(card&&!document.getElementById('v512TimeRule')){
      const mode=document.createElement('div');mode.id='v512ModeLine';
      const note=document.createElement('div');note.id='v512TimeRule';
      const hs=document.createElement('div');hs.id='v512ResultHighscore';
      const grid=card.querySelector('#scoreGrid');
      if(grid)card.insertBefore(mode,grid);else card.appendChild(mode);
      const row=card.querySelector('.row.centerRow');
      card.insertBefore(note,row||null);card.insertBefore(hs,row||null)
    }

    const startCard=document.querySelector('#startScreen .card');
    if(startCard&&!document.getElementById('v512HighscoreBtn')){
      const row=document.createElement('div');row.className='v512HighscoreRow';
      const b=document.createElement('button');b.id='v512HighscoreBtn';b.type='button';b.className='btn secondary';b.textContent='Highscore';
      row.appendChild(b);
      const customRow=startCard.querySelector('.v51EntryRow');
      if(customRow)customRow.after(row);else startCard.appendChild(row)
    }

    if(!document.getElementById('v512HighscoreOverlay')){
      const ov=document.createElement('div');ov.id='v512HighscoreOverlay';ov.setAttribute('aria-hidden','true');
      const card=document.createElement('div');card.id='v512HighscoreCard';
      const top=document.createElement('div');top.className='v512HsTop';
      const h=document.createElement('h2');h.textContent='Highscore';
      const close=document.createElement('button');close.id='v512HighscoreClose';close.type='button';close.className='btn secondary';close.textContent='×';close.setAttribute('aria-label','Stäng highscore');
      const panel=document.createElement('div');panel.id='v512HighscorePanel';
      top.append(h,close);card.append(top,panel);ov.appendChild(card);document.body.appendChild(ov);
      close.onclick=()=>{ov.classList.remove('open');ov.setAttribute('aria-hidden','true')};
      ov.addEventListener('click',e=>{if(e.target===ov)close.click()})
    }
    document.getElementById('v512HighscoreBtn')?.addEventListener('click',()=>{
      const ov=document.getElementById('v512HighscoreOverlay'),panel=document.getElementById('v512HighscorePanel');
      ov?.classList.add('open');ov?.setAttribute('aria-hidden','false');loadHighscores(panel)
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi);else installUi();

  window.__barResults510={
    resultData,
    loadHighscores,
    missPenalty,
    get final(){return state.v512FinalResult||null}
  };
})();