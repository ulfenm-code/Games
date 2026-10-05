'use strict';
/* Bar Game v5.12 — Gör din egen drink. Mobile soda hit test + deterministic custom pose restore. */
(function(){
  if(typeof state==='undefined')return;

  const CUSTOM_API='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-custom-drink-v512';
  const PUBLIC_KEY='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';
  const IBA_LIST='https://iba-world.com/cocktails/';
  const tools=window.__barTools417||window.__barTools416||window.__barTools415||window.__barTools414;
  const scene=tools?.scene||window.__barSceneConfig3105||window.__barSceneConfig3100;
  const barScene=document.getElementById('barScene');
  const objectLayer=document.getElementById('barObjectLayer');

  const EXISTING=[
    {spiritId:'white-rum',domId:'whiteRumBottle',label:'Vit kubansk rom',family:'rum',normalW:51.07064202845506},
    {spiritId:'jamaican-rum',domId:'jamaicanRumBottle',label:'Lagrad jamaicansk rom',family:'rum',normalW:50.757449269512925},
    {spiritId:'martinique-rhum',domId:'martiniqueRhumBottle',label:'Martinique Molasses Rhum',family:'rum',normalW:50.58560862982878},
    {spiritId:'orange-curacao',domId:'orangeCuracaoBottle',label:'Orange Curaçao',family:'liqueur',normalW:47.84950309472529},
    {spiritId:'blackstrap-rum',domId:'blackstrapRumBottle',label:'Blackstrap-rom',family:'rum',normalW:50.71314459829922},
    {spiritId:'campari',domId:'campariBottle',label:'Campari',family:'aperitif',normalW:43.48477963550001},
    {spiritId:'ron-profundo',domId:'ronProfundoBottle',label:'Ron Profundo Havana Club',family:'rum',normalW:49.81134091690856},
    {spiritId:'ron-smoky',domId:'ronSmokyBottle',label:'Ron Smoky Havana Club',family:'rum',normalW:50.53427576326304},
    {spiritId:'amaretto',domId:'amarettoBottle',label:'Amaretto',family:'liqueur',normalW:45.56827513823934},
    {spiritId:'frangelico',domId:'frangelicoBottle',label:'Frangelico',family:'liqueur',normalW:42},
    {spiritId:'maraschino-luxardo',domId:'maraschinoLuxardoBottle',label:'Maraschino Luxardo',family:'liqueur',normalW:42}
  ];
  const BY_SPIRIT=new Map(EXISTING.map(x=>[x.spiritId,x]));
  const BASE_BOTTLES={
    clear:{
      id:'clear',family:'rum',image:'Genomskinlig%2520tom%2520glasflaska%2520i%2520glas.png',
      template:'clear_label',normalW:50.7,ratio:1.5,cap:true
    },
    liqueur:{
      id:'liqueur',family:'liqueur',image:'Liquer.png',
      template:'liqueur_label',normalW:44,ratio:1.667,cap:false
    },
    aperitif:{
      id:'aperitif',family:'aperitif',image:'Aperitif.png',
      template:'aperitif_label',normalW:43.48477963550001,ratio:1.667,cap:false
    }
  };
  const FAMILY_NORMAL_W={rum:BASE_BOTTLES.clear.normalW,liqueur:BASE_BOTTLES.liqueur.normalW,aperitif:BASE_BOTTLES.aperitif.normalW};
  const FAMILY_RATIO={rum:BASE_BOTTLES.clear.ratio,liqueur:BASE_BOTTLES.liqueur.ratio,aperitif:BASE_BOTTLES.aperitif.ratio};
  function baseProfile(id){return BASE_BOTTLES[String(id||'').toLowerCase()]||BASE_BOTTLES.clear}
  const ORIGINAL_BOTTLE_IDS=EXISTING.map(x=>x.domId);

  /* v5.2: use exactly the eleven real start15 bottle positions.
     The lower-left shelf intentionally has only two bottles. */
  const SHELF_SLOTS=[
    {x:99.09329171906771,y:135.39287126288554,w:50.71314459829922,r:0,px:50,py:50,z:15},
    {x:135.01630549299273,y:134.0746712470996,w:49.81134091690856,r:0,px:50,py:50,z:15},
    {x:180.5863558163654,y:132.26630325529447,w:50.53427576326304,r:0,px:50,py:50,z:15},
    {x:296.14536830357184,y:132.20703125000009,w:51.07064202845506,r:0,px:50,py:50,z:15},
    {x:340.58166244090654,y:131.3950101734291,w:50.757449269512925,r:0,px:50,py:50,z:15},
    {x:382.4770255876807,y:133.06161737459053,w:50.58560862982878,r:0,px:50,py:50,z:15},
    {x:108.81791872787274,y:211.02392516333418,w:42,r:0,px:50,py:50,z:15},
    {x:147.75809151785722,y:211.1088841145862,w:47.84950309472529,r:0,px:50,py:50,z:15},
    {x:328.62040443590354,y:214.1772615429709,w:43.48477963550001,r:0,px:50,py:50,z:15},
    {x:378.00807233735253,y:215.53983696025097,w:42,r:0,px:50,py:50,z:15},
    {x:409.82846260469336,y:211.76079454600105,w:45.56827513823934,r:0,px:50,py:50,z:15}
  ];

  const GLASS={
    'highballglas':{group:'highballGroup',kind:'highball'},
    'double rocks-glas':{group:'doubleRocksGroup',kind:'double'},
    'rocks-glas':{group:'rocksGroup',kind:'rocks'},
    'tiki-glas':{group:'tikiGroup',kind:'tiki'}
  };
  const GARNISH_FILES={
    'mynta':'MyntaBlad_garnering.png',
    'lime':'Lime_garnering.png',
    'ananasskiva':'ananasskiva_stor.png',
    'cocktailkörsbär':'Coktailkorsbar.png',
    'apelsinskiva':'Apelsinskiva.png'
  };
  const GARNISH_ZONE={
    mynta:'Mynta',
    lime:'Lime',
    ananasGarnish:'Ananasskiva',
    korsbar:'Cocktailkörsbär',
    apelsin:'Apelsinskiva'
  };
  const CLICKABLE_ANSWERS=new Map([
    ['lime','Lime'],['citron','Citron'],['apelsin','Apelsin'],['passionsfrukt','Passionsfrukt'],
    ['mynta','Mynta'],['ingefära','Ingefära'],
    ['ananas','Ananas'],['ananasskiva','Ananasskiva'],['torkad ananas','Torkad ananas'],
    ['körsbär','Körsbär'],['cocktailkörsbär','Cocktailkörsbär'],['apelsinskiva','Apelsinskiva'],
    ['is','Is'],['isbitar','Isbitar'],['krossad is','Krossad is'],['sodavatten','Sodavatten']
  ].map(([k,v])=>[n(k),v]));
  function normalizeFamily(v){
    const f=String(v||'').toLowerCase();
    return f==='liqueur'||f==='aperitif'?f:'rum'
  }
  function answerParts(v){return String(v||'').split(/\s+och\s+/i).map(n).filter(Boolean)}
  const SODA_ALIASES=new Set(['sodavatten','soda water','soda-water','soda','club soda'].map(n));
  function clickableKey(v){
    const k=n(v);
    return SODA_ALIASES.has(k)?n('Sodavatten'):k
  }
  function normalizeSpecialStep(step){
    if(!step)return step;
    if(SODA_ALIASES.has(n(step.a))){
      const old=String(step.a||'');
      step.a='Sodavatten';
      step.kind='ingredient';
      step.action='none';
      if(Array.isArray(step.opts)){
        const i=step.opts.findIndex(x=>n(x)===n(old));
        if(i>=0)step.opts[i]='Sodavatten'
      }
    }
    return step
  }
  function hardcodedAssetForStep(step){
    const kind=String(step?.kind||''),answer=String(step?.a||'');
    if(kind==='glass')return GLASS[n(answer)]?String(answer):'';
    if(kind==='tool')return n(answer)==='shaker'?'Shaker':n(answer)==='mixer'?'Mixer':'';
    if(kind==='ingredient'||kind==='ice'||SODA_ALIASES.has(n(answer)))return CLICKABLE_ANSWERS.get(clickableKey(answer))||'';
    if(kind==='garnish'){
      const parts=answerParts(answer);
      return parts.length===1?(CLICKABLE_ANSWERS.get(parts[0])||''):'';
    }
    return ''
  }
  function rawStepClickable(step){
    const kind=String(step?.kind||''),answer=String(step?.a||'');
    if(kind==='glass')return Boolean(GLASS[n(answer)]);
    if(kind==='bottle')return true;
    if(kind==='tool')return n(answer)==='shaker'||n(answer)==='mixer';
    if(SODA_ALIASES.has(n(answer)))return true;
    if(kind==='ingredient'||kind==='ice')return CLICKABLE_ANSWERS.has(clickableKey(answer));
    if(kind==='garnish'){
      const parts=answerParts(answer);
      return parts.length>0&&parts.every(p=>CLICKABLE_ANSWERS.has(p));
    }
    return false
  }

  state.egenDrink=false;
  state.egenDrinkData=null;
  state.egenDrinkPrepared=null;
  state.egenDrinkSelectedGlass=null;
  state.egenDrinkBottleElements=[];
  state.egenDrinkMixerMl=0;
  state.egenDrinkMixerHasIce=false;
  state.egenDrinkGlassMl=0;
  state.egenDrinkGlassHasIce=false;
  state.v512HelpUses=0;
  state.v512HelpPenalty=0;
  state.egenDrinkStablePose=null;

  function clonePose(v){return v?JSON.parse(JSON.stringify(v)):null}
  async function rememberStablePose(cfg=null,prepared=null){
    const source=cfg||scene?.activeConfig;
    if(!source||!scene?.prepareConfig)return;
    const copy=clonePose(source);
    const prep=prepared||await scene.prepareConfig(copy);
    state.egenDrinkStablePose={cfg:copy,prepared:prep}
  }
  function restoreStablePose(){
    const saved=state.egenDrinkStablePose;
    if(!saved?.cfg||!saved?.prepared||!scene)return;
    const cfg=clonePose(saved.cfg);
    if(typeof scene.renderBartenderPoseFrame==='function')scene.renderBartenderPoseFrame(cfg,saved.prepared);
    else if(typeof scene.renderPoseFrame==='function'){
      const poseCfg=clonePose(cfg);poseCfg.objects={};
      scene.renderPoseFrame(poseCfg,saved.prepared,{showGlass:null})
    }
    scene.activeConfig=clonePose(saved.cfg);
    window.__barActiveConfig385=clonePose(saved.cfg)
  }

  const style=document.createElement('style');
  const hideOriginals=ORIGINAL_BOTTLE_IDS.map(id=>'#barScene.v51CustomBar #'+id).join(',');
  style.textContent=[
    '.v51EntryRow{display:flex;justify-content:center;margin-top:10px}',
    '#customDrinkBtn{width:min(100%,430px);background:#e97a24!important;border-color:#ffab63!important;color:#fff!important;box-shadow:0 7px 20px #e97a2442!important}',
    '#customDrinkScreen{overflow:auto;padding:18px 0}',
    '#customDrinkScreen .customDrinkCard{width:min(92vw,680px);max-height:92vh;overflow-y:auto}',
    '.v51IbaLink{display:block;margin:14px 0;padding:11px 14px;border:1px solid #ffffff33;border-radius:12px;text-decoration:none;color:inherit;background:#ffffff0c;font-weight:800}',
    '.v51PrepRow{display:flex;gap:9px;margin-top:10px;align-items:stretch}',
    '.v51PrepRow input{flex:1;min-width:0}',
    '.v51Status{margin:15px 0 10px;display:grid;gap:7px;text-align:left}',
    '.v51StatusItem{padding:8px 10px;border-radius:10px;background:#ffffff0b;border:1px solid #ffffff18}',
    '.v51StatusItem[data-state="working"]{opacity:.85}',
    '.v51StatusItem[data-state="done"]{border-color:#8fd49a88}',
    '.v51StatusItem[data-state="error"]{border-color:#ff8a7a88}',
    '#customDrinkBar:disabled,#customDrinkCrazy:disabled{opacity:.34;filter:grayscale(.8);cursor:not-allowed}',
    '.v51Prepared{margin:12px 0;padding:11px;border-radius:12px;background:#ffffff0b;text-align:left;display:none}',
    '.v51Prepared.show{display:block}',
    hideOriginals+'{display:none!important}',
    '#barScene.v51CustomBar .v51CustomBottle{display:block!important}',
    '.v51GlassLiquid{position:absolute;left:18%;right:18%;bottom:10%;height:0;z-index:1;opacity:.9;pointer-events:none;transition:height .65s ease}',
    '.v512GlassIce{position:absolute;left:20%;right:20%;top:16%;bottom:12%;overflow:hidden;z-index:2;pointer-events:none}',
    '.v512GlassIce span{position:absolute;width:18%;height:12%;border:1px solid rgba(255,255,255,.88);background:linear-gradient(135deg,rgba(255,255,255,.76),rgba(184,226,239,.34));box-shadow:inset 0 0 2px rgba(255,255,255,.72);clip-path:polygon(14% 0,100% 12%,82% 100%,0 82%)}',
    '.v51CustomGarnishLayer{position:absolute;inset:0;overflow:visible;z-index:40;pointer-events:none}',
    '.v51CustomGarnish{position:absolute;height:auto;object-fit:contain;filter:drop-shadow(0 2px 2px #0007);pointer-events:none}',
    '.v56GeneratedBottleLabel{object-fit:contain!important;filter:drop-shadow(0 1px 1px #0008)}',
    '.v51CustomBottle.base-clear .bottleLabel{left:17%;top:39%;width:66%;height:46%;object-fit:contain}',
    '.v51CustomBottle.base-liqueur .bottleLabel{left:15%;top:40%;width:70%;height:43%;object-fit:contain}',
    '.v51CustomBottle.base-aperitif .bottleLabel{left:14%;top:39%;width:72%;height:45%;object-fit:contain}',
    '@media(max-width:560px){.v51PrepRow{flex-direction:column}.v51PrepRow .btn{width:100%}}'
  ].join('');
  document.head.appendChild(style);
  const version=document.getElementById('versionLabel');
  if(version)version.textContent='VERSION 5.12';

  const customBtn=document.getElementById('customDrinkBtn');
  const nameInput=document.getElementById('customDrinkName');
  const prepBtn=document.getElementById('customDrinkPrepare');
  const barBtn=document.getElementById('customDrinkBar');
  const crazyBtn=document.getElementById('customDrinkCrazy');
  const backBtn=document.getElementById('customDrinkBack');
  const errorEl=document.getElementById('customDrinkError');
  const previewEl=document.getElementById('customDrinkPrepared');
  const ibaLink=document.getElementById('customDrinkIbaLink');
  if(ibaLink)ibaLink.href=IBA_LIST;

  function n(v){
    return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv-SE').replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
  }
  function slug(v){return n(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'drink'}
  function shuffle(a){
    const b=a.slice();
    for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}
    return b
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  function setStatus(key,status,text){
    const el=document.querySelector('[data-v51-status="'+key+'"]');
    if(!el)return;
    el.dataset.state=status;
    el.textContent=(status==='done'?'✓ ':status==='error'?'✕ ':status==='working'?'… ':'')+text;
  }
  function resetPrepUi(){
    for(const b of [barBtn,crazyBtn])if(b){b.disabled=true;b.setAttribute('aria-disabled','true')}
    if(errorEl)errorEl.textContent='';
    if(previewEl){previewEl.classList.remove('show');previewEl.innerHTML=''}
    setStatus('recipe','idle','Recept: väntar');
    setStatus('bottles','idle','Flaskor: väntar');
    setStatus('steps','idle','Spelsteg: väntar');
    state.egenDrinkData=null;
    state.egenDrinkPrepared=null;
  }
  function readPlayer(){
    const player=document.getElementById('nameInput')?.value.trim()||'';
    const age=Number(document.getElementById('ageInput')?.value);
    const startError=document.getElementById('startError');
    if(!player||!age||age<1||age>120){
      if(startError)startError.textContent='Fyll i namn och en rimlig ålder.';
      return false;
    }
    if(startError)startError.textContent='';
    state.name=player;state.age=age;state.under18=age<18;
    return true
  }
  function openPrep(){
    if(!readPlayer())return;
    resetCustomMode(false);
    state.phase='custom-prep';
    resetPrepUi();
    show('customDrinkScreen');
    setTimeout(()=>nameInput?.focus(),0);
  }
  function closePrep(){
    resetCustomMode(false);
    state.phase='start';
    show('startScreen');
  }

  function preload(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(true);
      img.onerror=()=>reject(new Error('Kunde inte skapa flasketikett'));
      img.src=src;
      if(img.complete&&img.naturalWidth)resolve(true)
    })
  }

  function requiredBottleDescriptors(drink){
    const seen=new Set(),out=[];
    for(const b of drink.bottles||[]){
      const name=String(b.name||'').trim();if(!name)continue;
      const key=n(name);if(seen.has(key))continue;seen.add(key);
      const existing=BY_SPIRIT.get(String(b.existing_spirit_id||''));
      if(existing){
        out.push({answer:name,family:existing.family,sourceDomId:existing.domId,sourceSpiritId:existing.spiritId,normalW:existing.normalW,required:true});
      }else{
        const profile=baseProfile(b.base_bottle_id);
        const labelSrc=String(b.label_data_url||'');
        if(!/^data:image\/(?:webp|png|jpeg);base64,/i.test(labelSrc))throw new Error('AI-etikett saknas för '+name+'.');
        out.push({
          answer:name,
          baseBottleId:profile.id,
          family:profile.family,
          labelSrc,
          labelReferenceUrls:Array.isArray(b.label_reference_urls)?b.label_reference_urls.slice():[],
          normalW:profile.normalW,
          required:true,
          newAsset:true
        });
      }
    }
    return out
  }
  async function buildBottleSet(drink){
    const required=requiredBottleDescriptors(drink);
    if(required.length>11)throw new Error('Receptet kräver fler än 11 olika flaskor och ryms inte på hyllorna.');
    await Promise.all(required.filter(x=>x.newAsset).map(x=>preload(x.labelSrc)));
    const usedExisting=new Set(required.map(x=>x.sourceSpiritId).filter(Boolean));
    const distractors=shuffle(EXISTING.filter(x=>!usedExisting.has(x.spiritId))).map(x=>({
      answer:x.label,family:x.family,sourceDomId:x.domId,sourceSpiritId:x.spiritId,normalW:x.normalW,required:false
    }));
    const allExisting=shuffle(EXISTING).map(x=>({answer:x.label,family:x.family,sourceDomId:x.domId,sourceSpiritId:x.spiritId,normalW:x.normalW,required:false}));
    const set=required.slice();
    let di=0,ai=0;
    while(set.length<11){
      if(di<distractors.length)set.push(distractors[di++]);
      else set.push({...allExisting[(ai++)%allExisting.length],duplicate:true});
    }
    return shuffle(set.slice(0,11));
  }

  function resolveStepAmounts(raw){
    const ingredients=Array.isArray(raw?.ingredients)?raw.ingredients:[];
    const exact=new Map(),bySpirit=new Map();
    for(const ing of ingredients){
      const ml=Math.max(0,Number(ing?.amount_ml)||0);
      if(!ml)continue;
      const key=n(ing?.name||'');
      if(key)exact.set(key,ml);
      const sid=String(ing?.existing_spirit_id||'').trim();
      if(sid)bySpirit.set(sid,ml)
    }
    for(const s of raw?.steps||[]){
      if(Math.max(0,Number(s?.amount_ml)||0)>0)continue;
      let ml=0;
      const key=n(s?.a||'');
      if(key&&exact.has(key))ml=exact.get(key);
      if(!ml&&String(s?.kind||'')==='bottle'){
        const asset=String(s?.asset||'').trim();
        if(asset&&bySpirit.has(asset))ml=bySpirit.get(asset)
      }
      if(!ml&&key.length>=4){
        const candidates=ingredients.filter(ing=>{
          const k=n(ing?.name||'');
          return Number(ing?.amount_ml)>0&&(k.includes(key)||key.includes(k))
        });
        if(candidates.length===1)ml=Math.max(0,Number(candidates[0].amount_ml)||0)
      }
      if(ml>0)s.amount_ml=ml
    }
    return raw
  }

  function normalizeDrink(raw){
    if(!raw||raw.found!==true)throw new Error(raw?.message||'Drinken hittades inte i IBA:s officiella drinklista.');
    if(!String(raw.source_url||'').startsWith('https://iba-world.com/'))throw new Error('IBA-källan kunde inte verifieras.');
    if(!GLASS[n(raw.game_glass)])throw new Error('Spelet kunde inte välja ett av de fyra tillåtna glasen.');
    if(!Array.isArray(raw.steps)||raw.steps.length<2)throw new Error('Spelstegen blev inte kompletta.');
    resolveStepAmounts(raw);
    for(const b of raw.bottles||[]){
      if(!String(b.existing_spirit_id||'')&&!BASE_BOTTLES[String(b.base_bottle_id||'').toLowerCase()])throw new Error('AI valde en okänd grundflaska.');
    }
    if(raw.steps.some(s=>s.kind==='pour'||s.action==='pour'||n(s.a)==='häll upp'||n(s.a)==='sila upp'))throw new Error('Separata upphällningssteg är inte tillåtna.');
    for(const s0 of raw.steps){
      const s=normalizeSpecialStep(s0);
      if(!Array.isArray(s.opts)||s.opts.length!==3||new Set(s.opts.map(String)).size!==3)throw new Error('Ett spelsteg saknar tre tydliga svarsalternativ.');
      if(!s.opts.some(x=>String(x)===String(s.a)))throw new Error('Ett spelsteg saknar sitt rätta svar bland alternativen.');
      const clickable=rawStepClickable(s);
      s.direct_choices=!clickable;
      if(s.kind!=='bottle')s.asset=clickable?hardcodedAssetForStep(s):'';
      if(/\b(?:cl|ml)\b|centiliter|milliliter|hur\s+(?:mycket|många)/i.test(String(s.q||'')))throw new Error('Spelstegen innehåller en förbjuden mängdfråga.');
    }
    const glassIndex=raw.steps.findIndex(s=>s.kind==='glass');
    if(glassIndex<0)throw new Error('Glassteget saknas.');
    if(raw.prep_tool==='Shaker'){
      const shakeIndex=raw.steps.findIndex(s=>s.action==='shake');
      if(shakeIndex<0||glassIndex<=shakeIndex)throw new Error('Shakerordningen ska vara shake → glasval → automatisk pour.');
    }
    if(raw.prep_tool==='Mixer'){
      const mixIndex=raw.steps.findIndex(s=>s.action==='mix');
      if(mixIndex<0||glassIndex<=mixIndex)throw new Error('Mixerordningen ska vara mix → glasval → automatisk pour.');
    }
    return raw
  }
  function buildGameDrink(d){
    const id='egen-'+slug(d.name)+'-'+Date.now().toString(36);
    const steps=d.steps.map((s,idx)=>{
      const clickable=rawStepClickable(s);
      const o={
        q:String(s.q),a:String(s.a),opts:s.opts.map(String),
        directChoices:!clickable,
        v51Kind:String(s.kind||'choice'),
        v51Asset:clickable?(hardcodedAssetForStep(s)||String(s.asset||'')):'',
        v51Action:String(s.action||'none'),
        v51AmountMl:Math.max(0,Number(s.amount_ml)||0),
        v51Index:idx
      };
      if(s.action==='shake')o.action='shake';
      return o
    });
    return {id,name:String(d.name),minAge:d.alcoholic?18:0,alcoholic:Boolean(d.alcoholic),steps,v51Custom:true}
  }
  function showPrepared(d,bottleSet,gameDrink){
    if(!previewEl)return;
    const newNames=bottleSet.filter(x=>x.required&&x.newAsset).map(x=>x.answer);
    previewEl.innerHTML=
      '<b>'+esc(d.name)+'</b><br>'+
      '<span>Glas i spelet: '+esc(d.game_glass)+'</span><br>'+
      '<span>'+gameDrink.steps.length+' spelsteg klara · 11 flaskplatser förberedda</span><br>'+
      '<span>Nya flaskor: '+(newNames.length?newNames.map(esc).join(', '):'inga')+'</span><br>'+
      '<a class="v51IbaSource" href="'+esc(d.source_url)+'" target="_blank" rel="noopener">Öppna IBA-receptet</a>';
    previewEl.classList.add('show')
  }

  async function callCustomApi(payload,timeoutMs){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(timeoutMs)||70000));
    try{
      const res=await fetch(CUSTOM_API,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':PUBLIC_KEY},
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok){
        if(data?.error==='ai_error')throw new Error('IBA-receptet kunde inte förberedas just nu.');
        if(data?.error==='label_generation_failed')throw new Error('AI kunde inte skapa alla flasketiketter.');
        throw new Error(data?.error||'Kunde inte förbereda drinken.');
      }
      return data
    }finally{
      clearTimeout(timer)
    }
  }

  function bottleLabelKey(b){
    return n(b?.name)+'|'+String(b?.base_bottle_id||'').toLowerCase()
  }

  async function generateBottleLabels(drink){
    const pending=(drink.bottles||[]).filter(b=>!String(b?.existing_spirit_id||'').trim());
    if(!pending.length)return 0;

    let nextIndex=0,completed=0;
    const labels=new Array(pending.length);
    const workerCount=Math.min(3,pending.length);

    async function worker(){
      while(true){
        const i=nextIndex++;
        if(i>=pending.length)return;
        const b=pending[i];
        const data=await callCustomApi({
          action:'labels',
          bottles:[{
            name:String(b.name||''),
            base_bottle_id:String(b.base_bottle_id||''),
            existing_spirit_id:''
          }]
        },180000);
        const label=Array.isArray(data?.labels)?data.labels[0]:null;
        if(!label||!/^data:image\/(?:webp|png|jpeg);base64,/i.test(String(label.label_data_url||''))){
          throw new Error('AI-etikett saknas för '+String(b.name||'flaskan')+'.');
        }
        if(String(label.base_bottle_id||'').toLowerCase()!==String(b.base_bottle_id||'').toLowerCase()){
          throw new Error('AI-etiketten kom tillbaka för fel grundflaska.');
        }
        labels[i]=label;
        completed++;
        setStatus('bottles','working','Flaskor: AI-etiketter '+completed+'/'+pending.length+' klara')
      }
    }

    await Promise.all(Array.from({length:workerCount},()=>worker()));

    const byKey=new Map(labels.map(x=>[bottleLabelKey(x),x]));
    for(const b of pending){
      const label=byKey.get(bottleLabelKey(b));
      if(!label)throw new Error('AI-etikett saknas för '+String(b.name||'flaskan')+'.');
      b.label_data_url=String(label.label_data_url);
      b.label_reference_urls=Array.isArray(label.label_reference_urls)?label.label_reference_urls.slice():[];
    }
    return pending.length
  }

  async function prepare(){
    const wanted=String(nameInput?.value||'').trim();
    if(!wanted){if(errorEl)errorEl.textContent='Skriv namnet på en IBA-drink.';return}
    resetPrepUi();
    if(prepBtn)prepBtn.disabled=true;
    let stage='recipe';
    try{
      setStatus('recipe','working','Recept: hämtar och anpassar IBA-receptet');
      const data=await callCustomApi({action:'recipe',drink_name:wanted},70000);
      const drink=normalizeDrink(data.drink);
      if(state.under18&&drink.alcoholic)throw new Error('Den valda drinken innehåller alkohol och kan inte startas med angiven ålder.');
      state.egenDrinkData=drink;
      setStatus('recipe','done','Recept: '+drink.name+' från IBA är klart');

      stage='bottles';
      const newCount=(drink.bottles||[]).filter(b=>!String(b?.existing_spirit_id||'').trim()).length;
      if(newCount){
        setStatus('bottles','working','Flaskor: grundflaskor valda · AI skapar '+newCount+' etikett'+(newCount===1?'':'er'));
        await generateBottleLabels(drink);
      }else{
        setStatus('bottles','working','Flaskor: använder befintliga flaskor');
      }
      const bottleSet=await buildBottleSet(drink);
      setStatus('bottles','done','Flaskor: grundflaskor och etiketter klara på 11 platser');

      stage='steps';
      setStatus('steps','working','Spelsteg: kontrollerar hela spelordningen');
      const gameDrink=buildGameDrink(drink);
      if(!gameDrink.steps.length)throw new Error('Inga spelsteg skapades.');
      const liquidSteps=gameDrink.steps.filter(x=>['bottle','ingredient','choice'].includes(x.v51Kind)&&Number(x.v51AmountMl)>0);
      const totalLiquidMl=liquidSteps.reduce((sum,x)=>sum+Number(x.v51AmountMl||0),0);
      state.egenDrinkPrepared={drink,gameDrink,bottleSet,totalMixerMl:totalLiquidMl,totalGlassMl:totalLiquidMl,totalLiquidSteps:liquidSteps.length};
      setStatus('steps','done','Spelsteg: '+gameDrink.steps.length+' steg klara');
      showPrepared(drink,bottleSet,gameDrink);
      for(const b of [barBtn,crazyBtn])if(b){b.disabled=false;b.setAttribute('aria-disabled','false')}
    }catch(err){
      console.error('v5.12 custom prep',err);
      const msg=err?.name==='AbortError'?'Förberedelsen tog för lång tid. Försök igen.':String(err?.message||err||'Kunde inte förbereda drinken.');
      if(errorEl)errorEl.textContent=msg;
      for(const b of [barBtn,crazyBtn])if(b){b.disabled=true;b.setAttribute('aria-disabled','true')}
      if(stage==='recipe')setStatus('recipe','error','Recept: kunde inte slutföras');
      else if(stage==='bottles')setStatus('bottles','error','Flaskor: kunde inte slutföras');
      else setStatus('steps','error','Spelsteg: kunde inte slutföras');
    }finally{
      if(prepBtn)prepBtn.disabled=false;
    }
  }

  function clearCustomBottles(){
    for(const el of state.egenDrinkBottleElements||[])try{el.remove()}catch(_){}
    state.egenDrinkBottleElements=[];
  }
  function resetCustomGlass(){
    const groupId=state.egenDrinkSelectedGlass;
    if(groupId)tools?.restoreGlass?.(groupId);
    document.querySelectorAll('.v51GlassLiquid,.v512GlassIce,.v51CustomGarnishLayer').forEach(x=>x.remove());
    state.egenDrinkSelectedGlass=null
  }
  function resetCustomMode(clearPrepared=true){
    clearCustomBottles();resetCustomGlass();
    state.egenDrink=false;
    state.egenDrinkMixerMl=0;state.egenDrinkMixerHasIce=false;state.egenDrinkGlassMl=0;state.egenDrinkGlassHasIce=false;state.egenDrinkStablePose=null;
    barScene?.classList.remove('v51CustomBar');
    window.__crazyBarModeV41=false;
    if(clearPrepared){state.egenDrinkData=null;state.egenDrinkPrepared=null}
  }

  function scale(){return window.__barScale359?.finalGameFactor||1}
  function placeBottle(el,p){
    if(!el||!p)return;
    const s=scale(),cx=260,cy=250,baseW=Number(el.dataset.v51NormalW)||Number(p.w);
    const slotCenter=Number(p.x)+Number(p.w)/2;
    const nativeLeft=slotCenter-baseW/2;
    const w=baseW*s;
    const ratio=FAMILY_RATIO[normalizeFamily(el.dataset.v51Family)]||1.5;
    el.style.left=(cx+(nativeLeft-cx)*s)+'px';
    el.style.top=(cy+(Number(p.y)-cy)*s+4)+'px';
    el.style.width=w+'px';el.style.height=(w*ratio)+'px';
    el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    el.style.transform='rotate('+(p.r||0)+'deg)';
    el.style.zIndex=String(p.z??15);
  }
  function makeBottle(desc,index){
    let el=null;
    if(desc.sourceDomId){
      const src=document.getElementById(desc.sourceDomId);
      if(src)el=src.cloneNode(true)
    }
    if(!el){
      const profile=baseProfile(desc.baseBottleId);
      el=document.createElement('div');
      el.className='spiritBottle family-'+profile.family+' v56GeneratedBottle base-'+profile.id;
      const base=document.createElement('img');base.className='bottleBase';base.src=profile.image;el.appendChild(base);
      const lab=document.createElement('img');lab.className='bottleLabel v56GeneratedBottleLabel';lab.src=desc.labelSrc;el.appendChild(lab);
      if(profile.cap){
        const cap=document.createElement('img');cap.className='bottleCap';cap.src='Detaljerad%2520gyllene%2520skruvkork%2520i%2520metall.png';el.appendChild(cap)
      }
    }
    el.removeAttribute('style');
    el.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    el.id='v51CustomBottle'+index;
    el.classList.add('v51CustomBottle');
    el.dataset.genericBottleBound='1';
    el.dataset.v51Answer=desc.answer;
    const profile=desc.newAsset?baseProfile(desc.baseBottleId):null;
    const family=profile?.family||normalizeFamily(desc.family);
    el.dataset.v51Family=family;
    if(profile)el.dataset.v56BaseBottle=profile.id;
    el.dataset.v51NormalW=String(Number(desc.normalW)||profile?.normalW||FAMILY_NORMAL_W[family]||FAMILY_NORMAL_W.rum);
    el.dataset.v51Slot=String(index);
    el.dataset.spirit='v51-'+slug(desc.answer)+'-'+index;
    el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',desc.answer);
    el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();activateCustomBottle(el)});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activateCustomBottle(el)}});
    placeBottle(el,SHELF_SLOTS[index]);
    return el
  }
  function installBottleSet(){
    clearCustomBottles();
    const set=state.egenDrinkPrepared?.bottleSet||[];
    const normalBottleBoundary=document.getElementById('sodaSifon')||document.getElementById('highballGroup')||null;
    set.forEach((desc,i)=>{
      const el=makeBottle(desc,i);
      if(objectLayer){
        if(normalBottleBoundary&&normalBottleBoundary.parentNode===objectLayer)objectLayer.insertBefore(el,normalBottleBoundary);
        else objectLayer.appendChild(el);
      }
      state.egenDrinkBottleElements.push(el)
    })
  }
  function layoutCustomBottles(){
    if(!state.egenDrink)return;
    (state.egenDrinkBottleElements||[]).forEach((el,i)=>placeBottle(el,SHELF_SLOTS[i]))
  }

  function currentStep(){
    if(!state.egenDrink||state.phase!=='recipe'||!state.drink?.v51Custom)return null;
    return state.drink.steps?.[state.step]||null
  }
  function bottleFeedback(el,correct){
    const ov=document.createElement('div');ov.id='bottleCelebrationOverlay';ov.className=correct?'correct':'wrong';
    const clone=el.cloneNode(true);clone.removeAttribute('id');clone.removeAttribute('style');clone.classList.add('celebrationBottle');clone.classList.remove('v51CustomBottle');
    ov.appendChild(clone);
    if(correct){const t=document.createElement('div');t.className='correctText';t.textContent='RÄTT!';ov.appendChild(t)}
    document.body.appendChild(ov);
    return ()=>{try{ov.remove()}catch(_){}}
  }
  async function activateCustomBottle(el){
    const s=currentStep();
    const attempted=String(el.dataset.v51Answer||el.getAttribute('aria-label')||'');
    if(!s||s.v51Kind!=='bottle'){
      const normalBottleAnimation=window.__barSpiritInteraction396?.activateBottle;
      if(typeof normalBottleAnimation==='function')normalBottleAnimation(el);
      return
    }
    try{if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:false})}catch(_){}
    if(n(attempted)!==n(s.a)){
      const remove=bottleFeedback(el,false);
      if(typeof registerWrongAnswer==='function')registerWrongAnswer(s,false,attempted);
      setTimeout(remove,900);return
    }
    const remove=bottleFeedback(el,true);
    await new Promise(r=>setTimeout(r,850));remove();
    const prep=state.egenDrinkPrepared?.drink?.prep_tool;
    if(!state.egenDrinkStablePose){
      try{await rememberStablePose()}catch(err){console.error('v5.12 pose snapshot',err)}
    }
    try{
      if(prep==='Mixer'&&tools?.pourMixer){
        s.v51BottlePhysical=true;
        state.v51PendingMixerStep=s;
        try{await tools.pourMixer(el.id,el.dataset.spirit||'v51')}
        catch(err){s.v51BottlePhysical=false;throw err}
        finally{state.v51PendingMixerStep=null}
      }else if(window.__barBottle396?.playCorrect){
        s.v51BottlePhysical=true;
        await window.__barBottle396.playCorrect(el.id,el.dataset.spirit||'v51')
      }
    }catch(err){console.error('v5.1 bottle animation',err)}
    try{restoreStablePose()}catch(err){console.error('v5.12 pose restore',err)}
    if(state.phase==='recipe'&&state.drink?.steps?.[state.step]===s)completeRecipeStep(s,false)
  }

  function mixerContent(){return tools?.mixerContent?.()||document.querySelector('#mixerGroup414 .mixerContent415')}
  function mixerLiquid(){return mixerContent()?.querySelector('.mixerLiquid415')}
  function mixerIce(){return mixerContent()?.querySelector('.mixerIce415')}
  function mixerFoam(){return mixerContent()?.querySelector('.mixerFoam415')}
  function setMixerLevel(level,ms=650){
    const l=mixerLiquid();if(!l)return;
    const v=Math.max(0,Math.min(100,Number(level)||0));
    l.style.transition='height '+Math.max(0,Number(ms)||0)+'ms ease, background .45s ease, opacity .3s ease';
    l.style.background=state.egenDrinkPrepared?.drink?.liquid_color||'#d6a34c';
    l.style.opacity=v>0?'.9':'0';
    requestAnimationFrame(()=>{l.style.height=v+'%'})
  }
  function mixerTargetLevel(addMl){
    const total=Math.max(0.01,Number(state.egenDrinkPrepared?.totalMixerMl)||0.01);
    return Math.min(68,68*((state.egenDrinkMixerMl+Math.max(0,Number(addMl)||0))/total))
  }
  function addMixerLiquid(amount,ms=800){
    const a=Math.max(0,Number(amount)||0);if(a<=0)return;
    const target=mixerTargetLevel(a);state.egenDrinkMixerMl+=a;setMixerLevel(state.egenDrinkMixerHasIce?Math.max(76,target):target,ms)
  }
  function showMixerIce(){
    const layer=mixerIce();if(!layer)return;
    if(!layer.children.length){
      [[13,67,-16],[38,58,12],[63,72,-7],[24,42,19],[52,36,-20],[70,49,8],[15,25,-8],[42,20,15],[65,18,-12],[31,76,7]].forEach(p=>{
        const x=document.createElement('span');x.style.left=p[0]+'%';x.style.top=p[1]+'%';x.style.transform='rotate('+p[2]+'deg)';layer.appendChild(x)
      })
    }
    layer.style.display='block';layer.style.opacity='1';state.egenDrinkMixerHasIce=true;
    setMixerLevel(Math.max(76,Number(mixerLiquid()?.style.height?.replace('%',''))||0),550)
  }
  async function mixInBar(){
    const c=mixerContent();if(!c)return;
    const controls=document.getElementById('dialogControls'),text=document.getElementById('dialogText');
    if(controls)controls.innerHTML='';if(text)text.textContent='Nu mixar jag drinken i kannan.';
    c.classList.add('mixing415');setMixerLevel(state.egenDrinkMixerHasIce?76:68,250);
    const speech=typeof barPlayTtsV337==='function'?Promise.resolve(barPlayTtsV337('Nu mixar jag drinken i kannan.')).catch(()=>{}):Promise.resolve();
    await Promise.all([speech,new Promise(r=>setTimeout(r,2400))]);
    c.classList.remove('mixing415');
    const f=mixerFoam();if(f){f.style.height='9%';f.style.opacity='.28'}
  }
  document.addEventListener('barpourmixerphase',e=>{
    if(!state.egenDrink||!state.v51PendingMixerStep)return;
    if(e.detail?.phase==='pour-hold'){
      const s=state.v51PendingMixerStep;
      const target=mixerTargetLevel(s.v51AmountMl);
      setMixerLevel(target,Number(e.detail?.holdMs)||2000)
    }else if(e.detail?.phase==='complete'){
      const s=state.v51PendingMixerStep;
      state.egenDrinkMixerMl+=Math.max(0,Number(s.v51AmountMl)||0)
    }
  });

  function glassDef(answer){return GLASS[n(answer)]||null}
  async function applyGlassSelectionPoseOnly(){
    const gv=window.__barGlassval3103||window.__barGlassval3101;
    if(!gv?.load||!scene?.prepareConfig)return;
    const cfg=await gv.load();
    const prepared=await scene.prepareConfig(cfg);
    if(typeof scene.renderBartenderPoseFrame==='function'){
      scene.renderBartenderPoseFrame(cfg,prepared);
    }else if(typeof scene.renderPoseFrame==='function'){
      const poseCfg=JSON.parse(JSON.stringify(cfg));
      poseCfg.objects={};
      scene.renderPoseFrame(poseCfg,prepared,{showGlass:null});
    }
    await rememberStablePose(cfg,prepared)
  }
  async function selectGlass(answer){
    const d=glassDef(answer);if(!d)return;
    state.egenDrinkSelectedGlass=d.group;
    if(d.kind==='double'){
      window.__barMaiTai3106?.placeChosenDoubleRocks?.();
      await applyGlassSelectionPoseOnly();
    }else{
      await tools?.showGlass?.(d.kind);
      if(d.kind!=='highball')await applyGlassSelectionPoseOnly();
      else{
        const gv=window.__barGlassval3103||window.__barGlassval3101;
        if(gv?.load&&scene?.prepareConfig){
          const cfg=await gv.load(),prepared=await scene.prepareConfig(cfg);
          await rememberStablePose(cfg,prepared)
        }
      }
    }
    ensureGlassLiquid(d.group)
  }
  function ensureGlassLiquid(groupId){
    const g=document.getElementById(groupId);if(!g)return null;
    let l=g.querySelector('.v51GlassLiquid');
    if(!l){
      l=document.createElement('div');l.className='v51GlassLiquid';
      const firstImg=g.querySelector('img');
      if(firstImg)g.insertBefore(l,firstImg);else g.appendChild(l)
    }
    l.style.background=state.egenDrinkPrepared?.drink?.liquid_color||'#d6a34c';
    return l
  }
  function fillGlass(level=82,ms=1500){
    const l=ensureGlassLiquid(state.egenDrinkSelectedGlass);if(!l)return;
    l.style.transitionDuration=Math.max(0,Number(ms)||0)+'ms';
    l.style.opacity=Number(level)>0?'.9':'0';
    requestAnimationFrame(()=>{l.style.height=Math.max(0,Math.min(90,level))+'%'})
  }
  function glassTargetLevel(addMl){
    const total=Math.max(0,Number(state.egenDrinkPrepared?.totalGlassMl)||0);
    const add=Math.max(0,Number(addMl)||0);
    if(total>0)return Math.min(82,82*((state.egenDrinkGlassMl+add)/total));
    const steps=Math.max(1,Number(state.egenDrinkPrepared?.totalLiquidSteps)||1);
    return Math.min(82,82*((state.egenDrinkGlassMl+1)/steps))
  }
  function addGlassLiquid(amount,ms=700){
    const raw=Math.max(0,Number(amount)||0);
    const total=Math.max(0,Number(state.egenDrinkPrepared?.totalGlassMl)||0);
    const use=raw>0?raw:(total>0?0:1);
    if(use<=0)return;
    const target=glassTargetLevel(use);
    state.egenDrinkGlassMl+=use;
    fillGlass(target,ms)
  }
  function showGlassIce(){
    const g=document.getElementById(state.egenDrinkSelectedGlass||'');if(!g)return;
    let layer=g.querySelector('.v512GlassIce');
    if(!layer){
      layer=document.createElement('div');layer.className='v512GlassIce';
      const firstImg=g.querySelector('img');
      if(firstImg)g.insertBefore(layer,firstImg);else g.appendChild(layer)
    }
    if(!layer.children.length){
      [[13,67,-16],[38,58,12],[63,72,-7],[24,42,19],[52,36,-20],[70,49,8],[15,25,-8],[42,20,15]].forEach(p=>{
        const x=document.createElement('span');x.style.left=p[0]+'%';x.style.top=p[1]+'%';x.style.transform='rotate('+p[2]+'deg)';layer.appendChild(x)
      })
    }
    layer.style.display='block';state.egenDrinkGlassHasIce=true
  }
  async function stirInGlass(){
    const g=document.getElementById(state.egenDrinkSelectedGlass||'');if(!g)return;
    const fill=ensureGlassLiquid(state.egenDrinkSelectedGlass);
    const ice=g.querySelector('.v512GlassIce');
    const garnish=g.querySelector('.v51CustomGarnishLayer');
    const api=window.__barGlass512||window.__barGlass396;
    if(typeof api?.animateStirTarget==='function'){
      api.animateStirTarget({fill,mint:garnish,limeSugar:null,ice,bubbles:null})
    }else{
      fill?.animate?.([{transform:'translateX(0)'},{transform:'translateX(4px)'},{transform:'translateX(-4px)'},{transform:'translateX(0)'}],{duration:1550,easing:'ease-in-out'})
    }
    const text=document.getElementById('dialogText');if(text)text.textContent='Nu rör jag om drinken i glaset.';
    const speech=typeof barPlayTtsV337==='function'?Promise.resolve(barPlayTtsV337('Nu rör jag om drinken i glaset.')).catch(()=>{}):Promise.resolve();
    await Promise.all([speech,new Promise(r=>setTimeout(r,1600))])
  }
  async function pourToGlass(){
    if(!state.egenDrinkSelectedGlass)throw new Error('Pour stoppad: inget glas är valt.');
    const glass=document.getElementById(state.egenDrinkSelectedGlass);
    if(!glass||getComputedStyle(glass).display==='none')throw new Error('Pour stoppad: valt glas är inte framme.');
    const prep=state.egenDrinkPrepared?.drink?.prep_tool;
    if(prep==='Mixer'&&tools?.pourPitcher){
      const p=tools.pitcher?.(),pl=p?.querySelector?.('.pitcherLiquid415');
      if(pl)pl.style.background=state.egenDrinkPrepared?.drink?.liquid_color||'#d6a34c';
      const run=tools.pourPitcher();fillGlass(82,2000);await run;setMixerLevel(0,0)
    }else if(prep==='Shaker'&&tools?.pourShaker){
      fillGlass(82,2000);await tools.pourShaker('v51-custom-shaker')
    }else{
      fillGlass(82,700);await new Promise(r=>setTimeout(r,720))
    }
  }

  function garnishParts(answer){return String(answer||'').split(/\s+och\s+/i).map(x=>x.trim()).filter(Boolean)}
  function garnishFile(part){return GARNISH_FILES[n(part)]||null}
  function renderGarnish(parts){
    const g=document.getElementById(state.egenDrinkSelectedGlass||'');if(!g)return;
    let layer=g.querySelector('.v51CustomGarnishLayer');
    if(!layer){layer=document.createElement('div');layer.className='v51CustomGarnishLayer';g.appendChild(layer)}
    layer.innerHTML='';
    const real=parts.map(x=>({part:x,file:garnishFile(x)})).filter(x=>x.file);
    real.forEach((x,i)=>{
      const img=document.createElement('img');img.className='v51CustomGarnish';img.src=x.file;img.alt='';
      img.style.left=(42+i*18)+'%';img.style.top=(i%2?2:-3)+'%';img.style.width=(n(x.part)==='cocktailkörsbär'?'26':'42')+'%';
      img.style.transform='translate(-50%,-45%) rotate('+(i%2?14:-10)+'deg)';
      layer.appendChild(img)
    })
  }

  function showCustomDrinkList(){
    const overlay=document.getElementById('drinkBookOverlay'),content=document.getElementById('drinkBookContent');
    const d=state.egenDrinkPrepared?.drink;if(!overlay||!content||!d)return;
    content.innerHTML='';
    const grid=document.createElement('div');grid.className='drinkListGrid';
    const b=document.createElement('button');b.className='drinkChoice';b.type='button';b.textContent=d.name;b.addEventListener('click',showCustomRecipe);
    grid.appendChild(b);content.appendChild(grid);
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false')
  }
  function showCustomRecipe(){
    const content=document.getElementById('drinkBookContent'),d=state.egenDrinkPrepared?.drink;if(!content||!d)return;
    content.innerHTML='';
    const wrap=document.createElement('div');wrap.className='drinkRecipe';
    const h=document.createElement('h3');h.textContent=d.name;wrap.appendChild(h);
    const h4=document.createElement('h4');h4.textContent='Ingredienser';wrap.appendChild(h4);
    const ul=document.createElement('ul');
    (d.ingredients||[]).forEach(x=>{const li=document.createElement('li');li.textContent=(x.amount_text?x.amount_text+' ':'')+x.name;ul.appendChild(li)});
    wrap.appendChild(ul);
    const mh=document.createElement('h4');mh.textContent='Gör så här';wrap.appendChild(mh);
    const mp=document.createElement('p');mp.textContent=d.method+' Servera i '+d.game_glass+'.';wrap.appendChild(mp);
    const gh=document.createElement('h4');gh.textContent='Garnering';wrap.appendChild(gh);
    const gp=document.createElement('p');gp.textContent=d.garnish||'Ingen garnering angiven.';wrap.appendChild(gp);
    const src=document.createElement('a');src.href=d.source_url;src.target='_blank';src.rel='noopener';src.textContent='IBA-källa';src.className='v51IbaLink';wrap.appendChild(src);
    const back=document.createElement('button');back.type='button';back.className='drinkBack';back.textContent='← Till drinklistan';back.onclick=showCustomDrinkList;wrap.appendChild(back);
    content.appendChild(wrap)
  }

  async function enterCustomBar(crazy=false){
    const prepared=state.egenDrinkPrepared;if(!prepared)return;
    const chosenBtn=crazy?crazyBtn:barBtn;if(chosenBtn?.disabled)return;
    state.egenDrink=true;state.egenDrinkData=prepared.drink;
    window.__crazyBarModeV41=Boolean(crazy);
    state.phase='chat';state.mood='tropical';state.bar='tropical';state.egenDrinkMixerMl=0;state.egenDrinkMixerHasIce=false;state.egenDrinkGlassMl=0;state.egenDrinkGlassHasIce=false;state.v512HelpUses=0;state.v512HelpPenalty=0;
    barScene?.classList.add('v51CustomBar');
    show('barScreen');tryOrientation('landscape',true);
    try{
      if(scene?.loadAndApply){
        await scene.loadAndApply('./bartender_installningar_start15.json',{showGlass:true});
        await rememberStablePose()
      }
    }catch(err){console.error('v5.1 startconfig',err)}
    barScene?.classList.add('v51CustomBar');
    installBottleSet();layoutCustomBottles();
    const c=mixerContent();
    if(c){
      c.classList.remove('mixing415');
      const l=mixerLiquid();if(l){l.style.height='0';l.style.opacity='0'}
      const ice=mixerIce();if(ice){ice.innerHTML='';ice.style.display='none'}
      const foam=mixerFoam();if(foam){foam.style.height='0';foam.style.opacity='0'}
    }
    if(prepared.drink.prep_tool==='Shaker'){try{window.__barMaiTai3106?.placeShakerStart?.()}catch(_){}}
    orderDrink(prepared.gameDrink)
  }

  document.addEventListener('click',e=>{
    if(!state.egenDrink)return;
    const sprite=document.getElementById('drinkMenuSprite');
    if(e.target===sprite){e.preventDefault();e.stopImmediatePropagation();showCustomDrinkList()}
  },true);
  document.addEventListener('keydown',e=>{
    if(!state.egenDrink)return;
    const sprite=document.getElementById('drinkMenuSprite');
    if(e.target===sprite&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();showCustomDrinkList()}
  },true);

  barScene?.addEventListener('pointerdown',e=>{
    const s=currentStep();if(!s||s.v51Kind!=='tool'||!tools)return;
    if(n(s.a)==='shaker'&&tools.shaker&&tools.hit(tools.shaker,e)){
      e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Shaker',tools.shaker)
    }else if(n(s.a)==='mixer'){
      const m=tools.mixerElement?.();
      if(m&&tools.hit(m,e)){e.preventDefault();e.stopImmediatePropagation();answerKnownChoice('Mixer',m)}
    }
  },true);

  barScene?.addEventListener('pointerdown',e=>{
    const step=currentStep();
    if(!step||n(step.a)!==n('Sodavatten'))return;
    const siphon=document.getElementById('sodaSifon');
    if(!siphon||getComputedStyle(siphon).display==='none')return;
    const r=siphon.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:false})}catch(_){}
    Promise.resolve(window.__barSodaPour49?.activate?.()).catch(err=>console.error('v5.12 soda siphon',err))
  },true);

  document.addEventListener('click',e=>{
    if(!state.egenDrink||!state.drink?.v51Custom)return;
    const z=e.target?.closest?.('[data-ingredient-zone="ananasjuice"]');
    if(!z)return;
    e.preventDefault();e.stopImmediatePropagation();
    const t=document.getElementById('toast');
    if(t){t.textContent='Ananasen är inget receptval.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),900)}
  },true);

  document.addEventListener('click',e=>{
    const s=currentStep();if(!s||s.v51Kind!=='garnish')return;
    const z=e.target?.closest?.('[data-ingredient-zone]');if(!z)return;
    const part=GARNISH_ZONE[z.dataset.ingredientZone];if(!part)return;
    const expected=garnishParts(s.a),expectedNorm=expected.map(n);
    if(!expectedNorm.includes(n(part)))return;
    e.preventDefault();e.stopImmediatePropagation();
    const cur=Array.isArray(state.aiCorrectParts)?state.aiCorrectParts.slice():[];
    if(!cur.some(x=>n(x)===n(part)))cur.push(part);
    state.aiCorrectParts=cur;renderGarnish(cur);z.classList.add('good');
    if(expected.every(p=>cur.some(x=>n(x)===n(p))))answerKnownChoice(s.a,z);
    else if(typeof registerPartialIngredientV391==='function')registerPartialIngredientV391(s,part)
  },true);

  const previousShowHelpOptionsV512=showHelpOptions;
  showHelpOptions=function(s,message=''){
    const custom=Boolean(state.egenDrink&&state.drink?.v51Custom&&currentStep()===s);
    if(custom&&Number(state.questionFails||0)<3&&!s.v512HelpPenaltyApplied){
      s.v512HelpPenaltyApplied=true;
      state.v512HelpUses=Math.max(0,Number(state.v512HelpUses)||0)+1;
      state.v512HelpPenalty=Math.max(0,Number(state.v512HelpPenalty)||0)+5;
      const t=document.getElementById('toast');
      if(t){t.textContent='Vet ej / hjälp −5 poäng';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1100)}
    }
    return previousShowHelpOptionsV512(s,message)
  };

  const previousAdvance=advanceStep;
  advanceStep=function(s){
    if(!state.egenDrink||!state.drink?.v51Custom)return previousAdvance(s);
    const kind=s?.v51Kind,act=s?.v51Action,prep=state.egenDrinkPrepared?.drink?.prep_tool;
    const next=()=>previousAdvance(s);
    if(kind==='tool'&&n(s.a)==='shaker'&&tools?.selectShaker){
      Promise.resolve(tools.selectShaker()).then(async result=>{
        try{if(result?.cfg&&result?.prepared)await rememberStablePose(result.cfg,result.prepared);else await rememberStablePose()}catch(err){console.error('v5.12 shaker pose snapshot',err)}
        next()
      }).catch(next);return
    }
    if(kind==='bottle'&&prep==='Mixer'){
      if(!s.v51BottlePhysical)addMixerLiquid(s.v51AmountMl,0);
      s.v51BottlePhysical=false;next();return
    }
    if(kind==='bottle'&&prep!=='Mixer'&&prep!=='Shaker'){
      addGlassLiquid(s.v51AmountMl,700);next();return
    }
    if((kind==='ingredient'||kind==='choice')&&prep==='Mixer'&&Number(s.v51AmountMl)>0){
      addMixerLiquid(s.v51AmountMl,850);setTimeout(next,880);return
    }
    if((kind==='ingredient'||kind==='choice')&&prep!=='Mixer'&&prep!=='Shaker'&&Number(s.v51AmountMl)>0){
      addGlassLiquid(s.v51AmountMl,700);setTimeout(next,730);return
    }
    if(kind==='ice'&&prep==='Mixer'){showMixerIce();setTimeout(next,580);return}
    if(kind==='ice'&&prep!=='Mixer'&&prep!=='Shaker'){showGlassIce();setTimeout(next,350);return}
    if(act==='mix'){mixInBar().then(next).catch(next);return}
    if(act==='stir'){stirInGlass().then(next).catch(next);return}
    if(act==='muddle'){
      const text=document.getElementById('dialogText');if(text)text.textContent='Nu muddlar jag ingredienserna enligt receptet.';
      const p=typeof barPlayTtsV337==='function'?Promise.resolve(barPlayTtsV337('Nu muddlar jag ingredienserna enligt receptet.')).catch(()=>{}):Promise.resolve();
      p.finally(()=>setTimeout(next,250));return
    }
    if(kind==='glass'){
      (async()=>{
        await selectGlass(s.a);
        if(prep==='Shaker'||prep==='Mixer')await pourToGlass();
      })().then(next).catch(err=>{
        console.error('v5.12 automatic pour',err);
        const text=document.getElementById('dialogText');
        if(text)text.textContent='Upphällningen kunde inte spelas klart.';
        next()
      });
      return
    }
    if(kind==='garnish'){renderGarnish(garnishParts(s.a));setTimeout(next,250);return}
    return next()
  };

  function applyCustomShakePart(el,p){
    if(!el||!p)return;
    el.style.position='absolute';
    el.style.left=Number(p.x||0)+'%';
    el.style.top=Number(p.y||0)+'%';
    el.style.width=Number(p.w||0)+'%';
    el.style.height=Number(p.w||0)+'%';
    el.style.objectFit='contain';
    el.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    el.style.transform='rotate('+(Number(p.r)||0)+'deg)';
    el.style.zIndex=String(p.z??0);
    el.style.display='block'
  }
  const originalCustomAiEvent=window.__barAI388?.event;
  if(originalCustomAiEvent){
    window.__barAI388.event=function(type,facts={},options={}){
      const customAction=state.egenDrink&&state.drink?.v51Custom&&state.phase==='action';
      if(customAction&&(type==='physical_prepare'||type==='physical_instruction'))return Promise.resolve(null);
      return originalCustomAiEvent(type,facts,options)
    }
  }

  const previousShowPhysicalV53=showPhysicalStage;
  showPhysicalStage=function(){
    const r=previousShowPhysicalV53();
    const stage=document.getElementById('shakeStage');
    const customShake=Boolean(state.egenDrink&&state.drink?.v51Custom&&state.action==='shake'&&!stage?.classList.contains('hidden'));
    if(!customShake)return r;
    stage.classList.add('realShaker416');
    const shakerStage=stage.querySelector('.shaker');
    if(shakerStage){
      shakerStage.innerHTML='<img class="shakeSpriteBase" src="ShakerUnderdel.png" alt=""><img class="shakeSpriteLid" src="ShakerLock.png" alt="">';
      const parts=window.__barMaiTai3106?.shakerSystemFallback?.parts||{};
      applyCustomShakePart(shakerStage.querySelector('.shakeSpriteBase'),parts.shakerBase);
      applyCustomShakePart(shakerStage.querySelector('.shakeSpriteLid'),parts.shakerLid)
    }
    const h=stage.querySelector('h2'),p=stage.querySelector('p');
    if(h)h.textContent='Skaka!';
    if(p)p.textContent='Håll telefonen stadigt och skaka som en riktig shaker.';
    if(!state.egenDrinkShakeInstructionSpoken){
      state.egenDrinkShakeInstructionSpoken=true;
      if(typeof barPlayTtsV337==='function')Promise.resolve(barPlayTtsV337('Skaka telefonen ordentligt som en riktig shaker.')).catch(()=>{})
    }
    return r
  };

  const previousStartPhysical=startPhysicalAction;
  startPhysicalAction=function(type,afterAction){
    if(state.egenDrink&&state.drink?.v51Custom&&type==='shake')state.egenDrinkShakeInstructionSpoken=false;
    if(state.egenDrink&&state.drink?.v51Custom&&type==='drink'&&state.egenDrinkSelectedGlass)tools?.moveGlassToDrinkStage?.(state.egenDrinkSelectedGlass);
    return previousStartPhysical(type,afterAction)
  };

  const previousFinalizeCustom=finalizeLandscapeReturn;
  let customReturnBusy=false;
  finalizeLandscapeReturn=function(force=false){
    const customShake=state.egenDrink&&state.drink?.v51Custom&&state.action==='shake'&&state.waitingLandscape;
    if(!customShake)return previousFinalizeCustom(force);
    if(customReturnBusy)return;
    customReturnBusy=true;
    Promise.resolve(window.__barMaiTai3106?.placeShakerAtPourStart?.())
      .catch(err=>console.error('v5.12 shaker pour-start',err))
      .finally(()=>{
        customReturnBusy=false;
        previousFinalizeCustom(force)
      })
  };
  const previousUpdateDrink=updateDrink;
  updateDrink=function(){
    const r=previousUpdateDrink();
    if(state.egenDrink&&state.drink?.v51Custom&&state.egenDrinkSelectedGlass){
      const g=document.getElementById(state.egenDrinkSelectedGlass),l=g?.querySelector('.v51GlassLiquid');
      if(l){const p=Math.max(0,Math.min(100,Number(state.drinkProgress)||0));l.style.transitionDuration='120ms';l.style.height=(82*(1-p/100))+'%'}
    }
    return r
  };

  function restoreAfterCustomDrink(){
    if(!state.egenDrink)return;
    const g=state.egenDrinkSelectedGlass;if(g)tools?.restoreGlass?.(g)
  }
  document.getElementById('anotherBtn')?.addEventListener('click',restoreAfterCustomDrink,true);
  document.getElementById('changeMoodBtn')?.addEventListener('click',()=>resetCustomMode(true),true);
  document.getElementById('enterBtn')?.addEventListener('click',()=>resetCustomMode(true),true);
  document.getElementById('crazyBarBtn')?.addEventListener('click',()=>resetCustomMode(true),true);
  window.addEventListener('resize',layoutCustomBottles);
  window.addEventListener('orientationchange',()=>setTimeout(layoutCustomBottles,120));

  customBtn?.addEventListener('click',openPrep);
  backBtn?.addEventListener('click',closePrep);
  prepBtn?.addEventListener('click',prepare);
  nameInput?.addEventListener('keydown',e=>{if(e.key==='Enter')prepare()});
  barBtn?.addEventListener('click',()=>enterCustomBar(false));
  crazyBtn?.addEventListener('click',()=>enterCustomBar(true));

  window.__barCustomDrink512={
    get active(){return Boolean(state.egenDrink)},
    get prepared(){return state.egenDrinkPrepared},
    prepare,
    enter:enterCustomBar,
    reset:()=>resetCustomMode(true)
  };
})();