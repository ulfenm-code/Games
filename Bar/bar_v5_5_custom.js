'use strict';
/* Bar Game v5.5 — Gör din egen drink. Hardcoded answer-to-asset rules + family label templates. */
(function(){
  if(typeof state==='undefined')return;

  const CUSTOM_API='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-custom-drink-v55';
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
  const BOTTLE_FAMILIES=['rum','whiskey','clear-spirit','liqueur','aperitif','vermouth-wine','cognac','sparkling'];
  const FAMILY_NORMAL_W={rum:50.7,whiskey:50,'clear-spirit':50.7,liqueur:44,aperitif:43.48477963550001,'vermouth-wine':44,cognac:48,sparkling:42};
  const FAMILY_RATIO={rum:1.5,whiskey:1.48,'clear-spirit':1.5,liqueur:1.667,aperitif:1.667,'vermouth-wine':1.72,cognac:1.48,sparkling:1.82};
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
    return BOTTLE_FAMILIES.includes(f)?f:'clear-spirit'
  }
  function answerParts(v){return String(v||'').split(/\s+och\s+/i).map(n).filter(Boolean)}
  function hardcodedAssetForStep(step){
    const kind=String(step?.kind||''),answer=String(step?.a||'');
    if(kind==='glass')return GLASS[n(answer)]?String(answer):'';
    if(kind==='tool')return n(answer)==='shaker'?'Shaker':n(answer)==='mixer'?'Mixer':'';
    if(kind==='ingredient'||kind==='ice')return CLICKABLE_ANSWERS.get(n(answer))||'';
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
    if(kind==='ingredient'||kind==='ice')return CLICKABLE_ANSWERS.has(n(answer));
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
    '.v54GeneratedBottleLabel{object-fit:contain!important;filter:drop-shadow(0 1px 1px #0008)}',
    '.spiritBottle.family-whiskey .bottleLabel{left:17%;top:42%;width:66%;height:44%;object-fit:contain}',
    '.spiritBottle.family-clear-spirit .bottleLabel{left:19%;top:29%;width:62%;height:59%;object-fit:contain}',
    '.spiritBottle.family-vermouth-wine .bottleLabel{left:15%;top:43%;width:70%;height:44%;object-fit:contain}',
    '.spiritBottle.family-cognac .bottleLabel{left:15%;top:41%;width:70%;height:47%;object-fit:contain}',
    '.spiritBottle.family-sparkling .bottleLabel{left:14%;top:44%;width:72%;height:42%;object-fit:contain}',
    '@media(max-width:560px){.v51PrepRow{flex-direction:column}.v51PrepRow .btn{width:100%}}'
  ].join('');
  document.head.appendChild(style);
  const version=document.getElementById('versionLabel');
  if(version)version.textContent='VERSION 5.4';

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
  function safeAccent(value,fallback){
    const v=String(value||'').trim();
    return /^#[0-9a-f]{6}$/i.test(v)?v:fallback
  }
  function motifSvg(kind,color){
    const c=safeAccent(color,'#8b5a2b'),k=String(kind||'none');
    const common='stroke="'+c+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    if(k==='agave')return '<g fill="none" '+common+' transform="translate(90 25)"><path d="M0 14 0-9M0 7-11-7M0 7 11-7M-3 10-18 2M3 10 18 2M-1 12-8-14M1 12 8-14"/></g>';
    if(k==='citrus')return '<g transform="translate(90 25)"><circle r="15" fill="none" '+common+'/><circle r="11" fill="none" '+common+'/><path d="M0-11V11M-9.5-5.5 9.5 5.5M-9.5 5.5 9.5-5.5" fill="none" '+common+'/></g>';
    if(k==='cherry')return '<g transform="translate(90 25)" '+common+' fill="none"><path d="M-3-8C2-18 8-18 12-14M2-6C-2-14-8-16-12-12"/><circle cx="-7" cy="5" r="7" fill="'+c+'" opacity=".82"/><circle cx="7" cy="6" r="7" fill="'+c+'" opacity=".7"/></g>';
    if(k==='coffee')return '<g transform="translate(90 25)" '+common+'><ellipse cx="-8" cy="0" rx="8" ry="12" fill="none"/><path d="M-12 8C-6 3-6-3-4-9" fill="none"/><ellipse cx="9" cy="1" rx="8" ry="12" fill="none"/><path d="M5 9C11 4 11-3 13-9" fill="none"/></g>';
    if(k==='nut')return '<g transform="translate(90 25)" '+common+' fill="none"><path d="M-14 8C-20-2-12-15 0-12 12-15 20-2 14 8 7 18-7 18-14 8Z"/><path d="M0-12V15M-8-8C-3-4-3 4-8 9M8-8C3-4 3 4 8 9"/></g>';
    if(k==='juniper')return '<g transform="translate(90 25)" '+common+'><path d="M-16 12 14-12M-8 5-18-3M-4 1-1-11M4-5 15 1M9-9 5-18" fill="none"/><circle cx="-12" cy="-2" r="4" fill="'+c+'"/><circle cx="1" cy="-10" r="4" fill="'+c+'"/><circle cx="12" cy="1" r="4" fill="'+c+'"/></g>';
    if(k==='sugarcane')return '<g transform="translate(90 25)" '+common+' fill="none"><path d="M-8 15-4-16M5 15 9-16"/><path d="M-7 5-13 0M-5-5-11-10M7 5 14 0M8-6 15-11"/></g>';
    if(k==='grape')return '<g transform="translate(90 24)" '+common+'><path d="M0-14C3-21 10-20 14-17M1-13C-5-19-11-17-15-13" fill="none"/>'+[-8,-1,6].map((x,i)=>'<circle cx="'+x+'" cy="'+(i%2?0:-2)+'" r="5" fill="'+c+'" opacity="'+(.9-i*.08)+'"/>').join('')+'<circle cx="-4" cy="7" r="5" fill="'+c+'" opacity=".72"/><circle cx="4" cy="8" r="5" fill="'+c+'" opacity=".65"/><circle cx="0" cy="15" r="5" fill="'+c+'" opacity=".58"/></g>';
    if(k==='passionfruit')return '<g transform="translate(90 25)" '+common+'><circle r="15" fill="none"/><circle r="10" fill="none"/>'+[-5,0,5].map(x=>'<circle cx="'+x+'" cy="0" r="1.6" fill="'+c+'" stroke="none"/>').join('')+'<circle cx="-3" cy="5" r="1.6" fill="'+c+'" stroke="none"/><circle cx="4" cy="5" r="1.6" fill="'+c+'" stroke="none"/></g>';
    if(k==='vanilla')return '<g transform="translate(90 25)" '+common+' fill="none"><path d="M-14 12C-2 3 1-6 7-17M-5 14C5 5 10-3 14-13"/><path d="M-2-4C-12-8-13-16-5-18 1-18 4-11-2-4ZM4-7C12-12 18-8 16-1 12 4 6 1 4-7Z"/></g>';
    if(k==='botanical')return '<g transform="translate(90 25)" '+common+' fill="none"><path d="M-16 12 12-14"/><path d="M-9 5C-17 4-19-2-15-7-8-8-6-3-9 5ZM0-3C-2-11 3-16 9-14 12-8 8-4 0-3ZM7-9C10-17 17-18 20-12 19-6 14-5 7-9Z"/></g>';
    if(k==='mountain')return '<g transform="translate(90 26)" stroke="'+c+'" stroke-width="2.2" fill="none" stroke-linejoin="round"><path d="M-24 13-7-10 1 0 9-13 26 13Z"/><path d="M-7-10-2-2 2-6M9-13 14-4 18-7"/></g>';
    return ''
  }
  function labelTheme(family){
    const f=normalizeFamily(family);
    return {
      rum:{paper:'#f1dfb7',ink:'#2d1d12',border:'#704925',accent:'#9b6a32'},
      whiskey:{paper:'#e8cf9b',ink:'#2c1a0e',border:'#6d3f19',accent:'#9a5c22'},
      'clear-spirit':{paper:'#f1efe2',ink:'#22312b',border:'#53685f',accent:'#567a66'},
      liqueur:{paper:'#f1dfc6',ink:'#342035',border:'#72516f',accent:'#8a4f79'},
      aperitif:{paper:'#f2d0b2',ink:'#4a1713',border:'#8b2d23',accent:'#b4452d'},
      'vermouth-wine':{paper:'#f4eddb',ink:'#32291e',border:'#77644c',accent:'#8e6b4c'},
      cognac:{paper:'#e8d1a4',ink:'#26170d',border:'#6e461d',accent:'#a07732'},
      sparkling:{paper:'#f5edd4',ink:'#353126',border:'#9b8547',accent:'#b79a43'}
    }[f]
  }
  function makeClearSpiritLabelAsset(name,motif,accent){
    const a=safeAccent(accent,'#24579a');
    const lines=labelLines(name),main=lines.slice(0,Math.max(1,lines.length-1)),sub=lines.length>1?lines[lines.length-1]:'';
    const mainFs=main.some(x=>x.length>13)?16:20;
    const mainY=main.length===1?111:main.length===2?98:88;
    const texts=main.map((line,i)=>'<text x="70" y="'+(mainY+i*24)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+mainFs+'" font-weight="800" fill="#164b8d">'+esc(line)+'</text>').join('');
    const subText=sub?'<text x="70" y="159" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#315d92">'+esc(sub)+'</text>':'';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="140" height="190" viewBox="0 0 140 190">'+
      '<path d="M18 11H122L132 22V164Q111 179 70 184Q29 179 8 164V22Z" fill="#f7f0dc" stroke="#c49b4b" stroke-width="5"/>'+
      '<path d="M21 16H119L126 24V158Q106 170 70 175Q34 170 14 158V24Z" fill="none" stroke="#24579a" stroke-width="2.4"/>'+
      '<path d="M31 169Q45 164 53 170M87 170Q95 164 109 169" fill="none" stroke="#24579a" stroke-width="2"/>'+
      '<g transform="translate(-20 24) scale(.78)">'+motifSvg(motif,a)+'</g>'+texts+subText+
      '<text x="70" y="176" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="700" fill="#315d92">BAR GAME</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
  }
  function makeLabelAsset(name,family,motif,accent){
    const f=normalizeFamily(family);
    if(f==='clear-spirit')return makeClearSpiritLabelAsset(name,motif,accent);
    const t=labelTheme(f),a=safeAccent(accent,t.accent);
    const lines=labelLines(name),fs=lines.some(x=>x.length>14)?13:lines.length>2?14:16;
    const y0=lines.length===1?67:lines.length===2?59:51;
    const texts=lines.map((line,i)=>'<text x="90" y="'+(y0+i*18)+'" text-anchor="middle" font-family="Georgia,serif" font-size="'+fs+'" font-weight="700" fill="'+t.ink+'">'+esc(line)+'</text>').join('');
    const shape=f==='whiskey'
      ?'<path d="M22 14Q90 3 158 14L154 98Q90 109 26 98Z" fill="'+t.paper+'" stroke="'+t.border+'" stroke-width="4"/>'
      :f==='cognac'
      ?'<path d="M18 18Q90 2 162 18L153 99Q90 108 27 99Z" fill="'+t.paper+'" stroke="'+t.border+'" stroke-width="5"/>'
      :f==='sparkling'
      ?'<path d="M35 9Q90 1 145 9L156 100Q90 109 24 100Z" fill="'+t.paper+'" stroke="'+t.border+'" stroke-width="4"/>'
      :'<rect x="18" y="10" width="144" height="92" rx="'+(f==='aperitif'?8:14)+'" fill="'+t.paper+'" stroke="'+t.border+'" stroke-width="4"/>';
    const ornament=f==='rum'
      ?'<path d="M27 89Q42 76 55 91M153 89Q138 76 125 91" fill="none" stroke="'+a+'" stroke-width="2"/>'
      :f==='liqueur'
      ?'<circle cx="90" cy="25" r="18" fill="none" stroke="'+a+'" stroke-width="2" opacity=".45"/>'
      :f==='aperitif'
      ?'<path d="M27 23H153M27 89H153" stroke="'+a+'" stroke-width="3" opacity=".6"/>'
      :f==='vermouth-wine'
      ?'<path d="M30 18H150M30 94H150" stroke="'+a+'" stroke-width="1.8"/><path d="M42 14V98M138 14V98" stroke="'+a+'" stroke-width="1" opacity=".45"/>'
      :f==='sparkling'
      ?'<path d="M43 17Q90 29 137 17M38 92Q90 80 142 92" fill="none" stroke="'+a+'" stroke-width="2"/>'
      :'<path d="M31 18H149M31 94H149" stroke="'+a+'" stroke-width="1.5" opacity=".55"/>';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="112" viewBox="0 0 180 112">'+shape+ornament+motifSvg(motif,a)+texts+
      '<text x="90" y="99" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" letter-spacing="1.8" fill="'+t.border+'">BAR GAME</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
  }

  function bottleBaseSvg(family){
    const f=normalizeFamily(family);
    const specs={
      whiskey:{body:'#9b5d25',stroke:'#4a2c18',neck:'#744019'},
      'clear-spirit':{body:'#dcebef',stroke:'#78939b',neck:'#b7d0d7',clear:true},
      'vermouth-wine':{body:'#4f6a49',stroke:'#243526',neck:'#3b5038'},
      cognac:{body:'#a7682d',stroke:'#533116',neck:'#7b461f'},
      sparkling:{body:'#36543e',stroke:'#1e3226',neck:'#2c4434'}
    };
    const p=specs[f];if(!p)return '';
    const path=f==='sparkling'
      ?'M68 4H112L116 31Q137 45 145 72L151 145Q150 160 136 164H44Q30 160 29 145L35 72Q43 45 64 31Z'
      :f==='cognac'
      ?'M64 7H116L118 36Q140 47 150 77L146 150Q144 164 130 168H50Q36 164 34 150L30 77Q40 47 62 36Z'
      :f==='clear-spirit'
      ?'M68 4H112L114 35L132 48Q140 55 140 69V154Q138 167 126 170H54Q42 167 40 154V69Q40 55 48 48L66 35Z'
      :'M65 6H115L118 39Q136 48 144 68L147 153Q145 166 132 169H48Q35 166 33 153L36 68Q44 48 62 39Z';
    const opacity=p.clear?'.42':'1';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="'+p.stroke+'" stop-opacity="'+opacity+'"/><stop offset=".25" stop-color="'+p.body+'" stop-opacity="'+opacity+'"/><stop offset=".65" stop-color="'+p.body+'" stop-opacity="'+opacity+'"/><stop offset="1" stop-color="'+p.stroke+'" stop-opacity="'+opacity+'"/></linearGradient></defs><path d="'+path+'" fill="url(#g)" stroke="'+p.stroke+'" stroke-width="4" stroke-opacity="'+(p.clear?'.72':'1')+'"/><rect x="68" y="0" width="44" height="16" rx="4" fill="'+p.neck+'" fill-opacity="'+opacity+'"/><path d="M52 58Q90 45 128 58" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5"/></svg>')
  }
  function bottleBaseForFamily(family){
    const f=normalizeFamily(family);
    if(f==='liqueur')return 'Liquer.png';
    if(f==='aperitif')return 'Aperitif.png';
    if(f==='rum')return 'Genomskinlig%2520tom%2520glasflaska%2520i%2520glas.png';
    return bottleBaseSvg(f)||'Genomskinlig%2520tom%2520glasflaska%2520i%2520glas.png'
  }
  function familyClass(family){return 'family-'+normalizeFamily(family)}
  function familyNeedsCap(family){const f=normalizeFamily(family);return f==='rum'||f==='clear-spirit'}

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
        const family=normalizeFamily(b.family);
        const motif=String(b.label_motif||'none');
        const accent=String(b.accent_color||'');
        out.push({answer:name,family,motif,accent,labelSrc:makeLabelAsset(name,family,motif,accent),normalW:FAMILY_NORMAL_W[family]||FAMILY_NORMAL_W['clear-spirit'],required:true,newAsset:true});
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
      const clickable=rawStepClickable(s);
      s.direct_choices=!clickable;
      if(s.kind!=='bottle')s.asset=clickable?hardcodedAssetForStep(s):'';
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
      const clickable=rawStepClickable(s);
      const o={
        q:String(s.q),a:String(s.a),opts:clickable?[]:s.opts.map(String),
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
      setStatus('bottles','done','Flaskor: klara och randomiserade på 11 platser');

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
      const family=normalizeFamily(desc.family);
      el=document.createElement('div');
      el.className='spiritBottle '+familyClass(family);
      const base=document.createElement('img');base.className='bottleBase';base.src=bottleBaseForFamily(family);el.appendChild(base);
      const lab=document.createElement('img');lab.className='bottleLabel v54GeneratedBottleLabel';lab.src=desc.labelSrc;el.appendChild(lab);
      if(familyNeedsCap(family)){
        const cap=document.createElement('img');cap.className='bottleCap';cap.src='Detaljerad%2520gyllene%2520skruvkork%2520i%2520metall.png';el.appendChild(cap)
      }
    }
    el.removeAttribute('style');
    el.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    el.id='v51CustomBottle'+index;
    el.classList.add('v51CustomBottle');
    el.dataset.genericBottleBound='1';
    el.dataset.v51Answer=desc.answer;
    el.dataset.v51Family=normalizeFamily(desc.family);
    el.dataset.v51NormalW=String(Number(desc.normalW)||FAMILY_NORMAL_W[normalizeFamily(desc.family)]||FAMILY_NORMAL_W['clear-spirit']);
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
    return r
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

  window.__barCustomDrink55={
    get active(){return Boolean(state.egenDrink)},
    get prepared(){return state.egenDrinkPrepared},
    prepare,
    enter:enterCustomBar,
    reset:()=>resetCustomMode(true)
  };
})();