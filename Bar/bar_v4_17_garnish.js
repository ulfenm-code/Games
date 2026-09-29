'use strict';
/* Bar Game v4.17 garnish renderer for Piña Colada, Jungle Bird and IBA Tiki.
   Only garnish assets valid for the active drink/glass are rendered. */
(function(){
  const defs={
    pinaColada:{
      url:'./bartender_installningar_garneringPinaColada.json',
      groupId:'highballGroup',
      parent:'highballGlass',
      parts:{pineapple:'garnishPineapple',cherry:'garnishCherry'},
      copiesFor:'cherry'
    },
    jungleBird:{
      url:'./bartender_installningar_garneringJungleBird.json',
      groupId:'rocksGroup',
      parent:'rocksGlass',
      parts:{pineapple:'garnishPineapple'}
    },
    ibaTiki:{
      url:'./bartender_installningar_garneringIBAtiki.json',
      groupId:'tikiGroup',
      parent:'tikiGlass',
      parts:{lime:'garnishLime',pineapple:'garnishPineapple'}
    }
  };
  const cache=new Map();
  const clone=v=>JSON.parse(JSON.stringify(v));
  function canon416(v){return typeof canon==='function'?canon(v):String(v??'').trim().toLocaleLowerCase('sv-SE')}
  function asset416(file){return String(file||'')==='ananasskiva_stor-4.png'?'ananasskiva_stor.png':String(file||'')}
  async function load(drinkId){
    const d=defs[drinkId];if(!d)throw new Error('Okänd garneringsdrink: '+drinkId);
    if(!cache.has(drinkId))cache.set(drinkId,fetch(d.url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(d.url+' HTTP '+r.status);return r.json()}));
    return clone(await cache.get(drinkId))
  }
  function layerFor(drinkId){
    const d=defs[drinkId],g=document.getElementById(d?.groupId||'');if(!g)return null;
    let l=g.querySelector(':scope > .drinkGarnish416');
    if(!l){l=document.createElement('div');l.className='drinkGarnish416';g.appendChild(l)}
    return l
  }
  function clear(drinkId){
    const l=layerFor(drinkId);if(l)l.innerHTML=''
  }
  function add(layer,p){
    if(!layer||!p||!p.file)return false;
    const wrap=document.createElement('div');wrap.className='drinkGarnishSprite416';
    wrap.style.left=Number(p.x||0)+'%';wrap.style.top=Number(p.y||0)+'%';wrap.style.width=Number(p.w||0)+'%';
    wrap.style.transformOrigin=(p.px??50)+'% '+(p.py??50)+'%';
    wrap.style.transform='translate(-50%,-50%) rotate('+(Number(p.r)||0)+'deg)';
    wrap.style.zIndex=String(p.z??45);wrap.style.opacity=String(p.opacity??1);
    if(Number(p.blur)>0)wrap.style.filter='blur('+Number(p.blur)+'px)';
    const img=document.createElement('img');img.src=asset416(p.file);img.alt='';img.setAttribute('aria-hidden','true');
    wrap.appendChild(img);layer.appendChild(wrap);return true
  }
  function selectedFlags(drinkId,parts=[]){
    const set=new Set((parts||[]).map(canon416));
    if(drinkId==='pinaColada')return{pineapple:set.has(canon416('Ananasskiva')),cherry:set.has(canon416('Cocktailkörsbär'))};
    if(drinkId==='jungleBird')return{pineapple:set.has(canon416('Ananasskiva'))};
    if(drinkId==='ibaTiki')return{lime:set.has(canon416('Lime')),pineapple:set.has(canon416('Ananasskiva'))};
    return{}
  }
  async function render(drinkId,parts=[]){
    const d=defs[drinkId];if(!d)return 0;
    const cfg=await load(drinkId),l=layerFor(drinkId);if(!l)return 0;l.innerHTML='';
    const flags=selectedFlags(drinkId,parts),items=cfg?.glassSystem?.items||{},copies=Array.isArray(cfg?.glassSystem?.copies)?cfg.glassSystem.copies:[];
    let count=0;
    for(const [flag,key] of Object.entries(d.parts)){
      if(!flags[flag])continue;
      const p=items[key];
      if(p?.parent===d.parent&&add(l,p))count++;
      if(d.copiesFor===flag){
        for(const cp of copies){
          if(cp?.parent===d.parent&&String(cp.source||'')===String(key)&&add(l,cp))count++
        }
      }
    }
    return count
  }
  const style=document.createElement('style');
  style.textContent='.drinkGarnish416{position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:8}.drinkGarnishSprite416{position:absolute;aspect-ratio:1/1;max-width:none;pointer-events:none;user-select:none}.drinkGarnishSprite416 img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:fill;max-width:none;pointer-events:none;user-select:none;-webkit-user-drag:none}';
  document.head.appendChild(style);
  const api={defs,load,render,clear,asset:asset416};window.__barGarnish417=api;window.__barGarnish416=api;
})();