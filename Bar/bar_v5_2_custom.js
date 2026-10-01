'use strict';
/* Bar Game v5.2 — Gör din egen drink. Isolated from the five ordinary Tiki recipes. */
(function(){
  if(typeof state==='undefined')return;

  const CUSTOM_API='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-custom-drink-v52';
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
  const FAMILY_NORMAL_W={rum:50.7,spirit:50.7,liqueur:44,aperitif:43.48477963550001};
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

  state.egenDrink=false;
  state.egenDrinkData=null;
  state.egenDrinkPrepared=null;
  state.egenDrinkSelectedGlass=null;
  state.egenDrinkBottleElements=[];
  state.egenDrinkMixerMl=0;
  state.egenDrinkMixerHasIce=false;

  const style=document.createElement('style');
  const hideOriginals=ORIGINAL_BOTTLE_IDS.map(id=>'#barScene.v51CustomBar #'+id).join(',');
  style.textContent=[
    '.v51EntryRow{display:flex;justify-content:center;margin-top:10px}',
    '#customDrinkBtn{width:min(100%,430px)}',
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
    '.v51CustomGarnishLayer{position:absolute;inset:0;overflow:visible;z-index:40;pointer-events:none}',
    '.v51CustomGarnish{position:absolute;height:auto;object-fit:contain;filter:drop-shadow(0 2px 2px #0007);pointer-events:none}',
    '.v52GeneratedBottleLabel{left:14%!important;width:72%!important;object-fit:fill!important;transform:perspective(90px) scaleX(.96);transform-origin:50% 50%;filter:drop-shadow(0 1px 1px #0007)}',
    '@media(max-width:560px){.v51PrepRow{flex-direction:column}.v51PrepRow .btn{width:100%}}'
  ].join('');
  document.head.appendChild(style);
  const version=document.getElementById('versionLabel');
  if(version)version.textContent='VERSION 5.2';

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

  function labelLines(name){
    const words=String(name||'SPIRIT').toUpperCase().trim().split(/\s+/).filter(Boolean);
    if(words.length<=1)return words;
    const lines=[];let cur='';
    for(const w of words){
      const next=cur?cur+' '+w:w;
      if(next.length>17&&cur){lines.push(cur);cur=w}else cur=next;
    }
    if(cur)lines.push(cur);
    if(lines.length>3)return [lines[0],lines.slice(1,-1).join(' ').slice(0,17),lines[lines.length-1]];
    return lines;
  }
  function makeLabelAsset(name,family){
    const lines=labelLines(name),fs=lines.some(x=>x.length>14)?15:lines.length>2?16:18;
    const y0=lines.length===1?50:lines.length===2?40:31;
    const color=family==='aperitif'?'#7f251d':family==='liqueur'?'#3d273d':'#3b2817';
    const texts=lines.map((line,i)=>'<text x="90" y="'+(y0+i*22)+'" text-anchor="middle" font-family="Georgia,serif" font-size="'+fs+'" font-weight="700" fill="#2a160d">'+esc(line)+'</text>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="112" viewBox="0 0 180 112"><defs><linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f7148"/><stop offset=".12" stop-color="#d8c08e"/><stop offset=".28" stop-color="#f8edcc"/><stop offset=".5" stop-color="#fff4d5"/><stop offset=".72" stop-color="#f8edcc"/><stop offset=".88" stop-color="#d8c08e"/><stop offset="1" stop-color="#8f7148"/></linearGradient></defs><path d="M16 6 Q3 56 16 106 L164 106 Q177 56 164 6 Z" fill="url(#cyl)" stroke="'+color+'" stroke-width="6"/><path d="M24 15 Q14 56 24 97 L156 97 Q166 56 156 15 Z" fill="none" stroke="#8a6b3f" stroke-width="2" opacity=".8"/>'+texts+'<text x="90" y="94" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" letter-spacing="2" fill="'+color+'">BAR GAME</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
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
        const family=['rum','liqueur','aperitif','spirit'].includes(b.family)?b.family:'spirit';
        out.push({answer:name,family,labelSrc:makeLabelAsset(name,family),normalW:FAMILY_NORMAL_W[family]||FAMILY_NORMAL_W.spirit,required:true,newAsset:true});
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

  function normalizeDrink(raw){
    if(!raw||raw.found!==true)throw new Error(raw?.message||'Drinken hittades inte i IBA:s officiella drinklista.');
    if(!String(raw.source_url||'').startsWith('https://iba-world.com/'))throw new Error('IBA-källan kunde inte verifieras.');
    if(!GLASS[n(raw.game_glass)])throw new Error('Spelet kunde inte välja ett av de fyra tillåtna glasen.');
    if(!Array.isArray(raw.steps)||raw.steps.length<2)throw new Error('Spelstegen blev inte kompletta.');
    for(const s of raw.steps){
      if(!Array.isArray(s.opts)||s.opts.length!==3||new Set(s.opts.map(String)).size!==3)throw new Error('Ett spelsteg saknar tre tydliga svarsalternativ.');
      if(!s.opts.some(x=>String(x)===String(s.a)))throw new Error('Ett spelsteg saknar sitt rätta svar bland alternativen.');
      if(/\b(?:cl|ml)\b|centiliter|milliliter|hur\s+(?:mycket|många)/i.test(String(s.q||'')))throw new Error('Spelstegen innehåller en förbjuden mängdfråga.');
    }
    const glassIndex=raw.steps.findIndex(s=>s.kind==='glass');
    const pourIndexes=raw.steps.map((s,i)=>s.kind==='pour'||s.action==='pour'?i:-1).filter(i=>i>=0);
    if(pourIndexes.some(i=>glassIndex<0||i<glassIndex))throw new Error('Glaset måste väljas före upphällningen.');
    if(raw.prep_tool==='Shaker'&&pourIndexes.length){
      const shakeIndex=raw.steps.findIndex(s=>s.action==='shake');
      if(shakeIndex<0||glassIndex<=shakeIndex||pourIndexes.some(i=>i<=glassIndex))throw new Error('Shakerordningen är inte säker: shake → glas → pour krävs.');
    }
    if(raw.prep_tool==='Mixer'&&pourIndexes.length){
      const mixIndex=raw.steps.findIndex(s=>s.action==='mix');
      if(mixIndex<0||glassIndex<=mixIndex||pourIndexes.some(i=>i<=glassIndex))throw new Error('Mixerordningen är inte säker: mix → glas → pour krävs.');
    }
    return raw
  }
  function buildGameDrink(d){
    const id='egen-'+slug(d.name)+'-'+Date.now().toString(36);
    const steps=d.steps.map((s,idx)=>{
      const o={
        q:String(s.q),a:String(s.a),opts:s.opts.map(String),
        directChoices:Boolean(s.direct_choices),
        v51Kind:String(s.kind||'choice'),
        v51Asset:String(s.asset||''),
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

  async function prepare(){
    const wanted=String(nameInput?.value||'').trim();
    if(!wanted){if(errorEl)errorEl.textContent='Skriv namnet på en IBA-drink.';return}
    resetPrepUi();
    if(prepBtn)prepBtn.disabled=true;
    setStatus('recipe','working','Recept: hämtar och anpassar IBA-receptet');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),70000);
    try{
      const res=await fetch(CUSTOM_API,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':PUBLIC_KEY},
        body:JSON.stringify({drink_name:wanted}),
        signal:controller.signal
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data?.error==='ai_error'?'IBA-receptet kunde inte förberedas just nu.':(data?.error||'Kunde inte förbereda drinken.'));
      const drink=normalizeDrink(data.drink);
      if(state.under18&&drink.alcoholic)throw new Error('Den valda drinken innehåller alkohol och kan inte startas med angiven ålder.');
      state.egenDrinkData=drink;
      setStatus('recipe','done','Recept: '+drink.name+' från IBA är klart');

      setStatus('bottles','working','Flaskor: bygger etiketter och hylluppsättning');
      const bottleSet=await buildBottleSet(drink);
      setStatus('bottles','done','Flaskor: klara och randomiserade på 12 platser');

      setStatus('steps','working','Spelsteg: kontrollerar hela spelordningen');
      const gameDrink=buildGameDrink(drink);
      if(!gameDrink.steps.length)throw new Error('Inga spelsteg skapades.');
      const totalMixerMl=gameDrink.steps.reduce((sum,x)=>sum+(['bottle','ingredient','choice'].includes(x.v51Kind)&&Number(x.v51AmountMl)>0?Number(x.v51AmountMl):0),0);
      state.egenDrinkPrepared={drink,gameDrink,bottleSet,totalMixerMl};
      setStatus('steps','done','Spelsteg: '+gameDrink.steps.length+' steg klara');
      showPrepared(drink,bottleSet,gameDrink);
      for(const b of [barBtn,crazyBtn])if(b){b.disabled=false;b.setAttribute('aria-disabled','false')}
    }catch(err){
      console.error('v5.1 custom prep',err);
      const msg=err?.name==='AbortError'?'Förberedelsen tog för lång tid. Försök igen.':String(err?.message||err||'Kunde inte förbereda drinken.');
      if(errorEl)errorEl.textContent=msg;
      for(const b of [barBtn,crazyBtn])if(b){b.disabled=true;b.setAttribute('aria-disabled','true')}
      if(!state.egenDrinkData)setStatus('recipe','error','Recept: kunde inte slutföras');
    }finally{
      clearTimeout(timer);
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
    document.querySelectorAll('.v51GlassLiquid,.v51CustomGarnishLayer').forEach(x=>x.remove());
    state.egenDrinkSelectedGlass=null
  }
  function resetCustomMode(clearPrepared=true){
    clearCustomBottles();resetCustomGlass();
    state.egenDrink=false;
    state.egenDrinkMixerMl=0;state.egenDrinkMixerHasIce=false;
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
    const ratio=(el.dataset.v51Family==='liqueur'||el.dataset.v51Family==='aperitif')?1.667:1.5;
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
      el=document.createElement('div');
      const fam=desc.family==='liqueur'?'family-liqueur':desc.family==='aperitif'?'family-aperitif':'family-rum';
      el.className='spiritBottle '+fam;
      const base=document.createElement('img');base.className='bottleBase';
      base.src=desc.family==='liqueur'?'Liquer.png':desc.family==='aperitif'?'Aperitif.png':'Genomskinlig%2520tom%2520glasflaska%2520i%2520glas.png';
      el.appendChild(base);
      const lab=document.createElement('img');lab.className='bottleLabel v52GeneratedBottleLabel';lab.src=desc.labelSrc;el.appendChild(lab);
      if(desc.family!=='liqueur'&&desc.family!=='aperitif'){
        const cap=document.createElement('img');cap.className='bottleCap';cap.src='Detaljerad%2520gyllene%2520skruvkork%2520i%2520metall.png';el.appendChild(cap)
      }
    }
    el.removeAttribute('style');
    el.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    el.id='v51CustomBottle'+index;
    el.classList.add('v51CustomBottle');
    el.dataset.genericBottleBound='1';
    el.dataset.v51Answer=desc.answer;
    el.dataset.v51Family=desc.family;
    el.dataset.v51NormalW=String(Number(desc.normalW)||FAMILY_NORMAL_W[desc.family]||FAMILY_NORMAL_W.spirit);
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
    set.forEach((desc,i)=>{
      const el=makeBottle(desc,i);
      objectLayer?.appendChild(el);
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
    const s=currentStep();if(!s)return;
    const attempted=String(el.dataset.v51Answer||el.getAttribute('aria-label')||'');
    if(s.v51Kind!=='bottle'){
      const t=document.getElementById('toast');if(t){t.textContent=attempted;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),900)}
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
  async function selectGlass(answer){
    const d=glassDef(answer);if(!d)return;
    state.egenDrinkSelectedGlass=d.group;
    if(d.kind==='double')window.__barMaiTai3106?.placeChosenDoubleRocks?.();
    else await tools?.showGlass?.(d.kind);
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
    requestAnimationFrame(()=>{l.style.height=Math.max(0,Math.min(90,level))+'%'})
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
    state.phase='chat';state.mood='tropical';state.bar='tropical';state.egenDrinkMixerMl=0;state.egenDrinkMixerHasIce=false;
    barScene?.classList.add('v51CustomBar');
    show('barScreen');tryOrientation('landscape',true);
    try{if(scene?.loadAndApply)await scene.loadAndApply('./bartender_installningar_start15.json',{showGlass:true})}catch(err){console.error('v5.1 startconfig',err)}
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

  const previousAdvance=advanceStep;
  advanceStep=function(s){
    if(!state.egenDrink||!state.drink?.v51Custom)return previousAdvance(s);
    const kind=s?.v51Kind,act=s?.v51Action,prep=state.egenDrinkPrepared?.drink?.prep_tool;
    const next=()=>previousAdvance(s);
    if(kind==='tool'&&n(s.a)==='shaker'&&tools?.selectShaker){Promise.resolve(tools.selectShaker()).then(next).catch(next);return}
    if(kind==='bottle'&&prep==='Mixer'){
      if(!s.v51BottlePhysical)addMixerLiquid(s.v51AmountMl,0);
      s.v51BottlePhysical=false;next();return
    }
    if((kind==='ingredient'||kind==='choice')&&prep==='Mixer'&&Number(s.v51AmountMl)>0){
      addMixerLiquid(s.v51AmountMl,850);setTimeout(next,880);return
    }
    if(kind==='ice'&&prep==='Mixer'){showMixerIce();setTimeout(next,580);return}
    if(act==='mix'){mixInBar().then(next).catch(next);return}
    if(act==='muddle'){
      const text=document.getElementById('dialogText');if(text)text.textContent='Nu muddlar jag ingredienserna enligt receptet.';
      const p=typeof barPlayTtsV337==='function'?Promise.resolve(barPlayTtsV337('Nu muddlar jag ingredienserna enligt receptet.')).catch(()=>{}):Promise.resolve();
      p.finally(()=>setTimeout(next,250));return
    }
    if(kind==='glass'){selectGlass(s.a).then(next).catch(next);return}
    if(act==='pour'||kind==='pour'){
      pourToGlass().then(next).catch(err=>{
        console.error('v5.2 blocked pour',err);
        const text=document.getElementById('dialogText');if(text)text.textContent='Upphällningen stoppades eftersom inget valt glas är framme.';
      });return
    }
    if(kind==='garnish'){renderGarnish(garnishParts(s.a));setTimeout(next,250);return}
    return next()
  };

  const previousStartPhysical=startPhysicalAction;
  startPhysicalAction=function(type,afterAction){
    if(state.egenDrink&&state.drink?.v51Custom&&type==='drink'&&state.egenDrinkSelectedGlass)tools?.moveGlassToDrinkStage?.(state.egenDrinkSelectedGlass);
    return previousStartPhysical(type,afterAction)
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

  window.__barCustomDrink52={
    get active(){return Boolean(state.egenDrink)},
    get prepared(){return state.egenDrinkPrepared},
    prepare,
    enter:enterCustomBar,
    reset:()=>resetCustomMode(true)
  };
})();