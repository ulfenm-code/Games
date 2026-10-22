// Hittar banorna och startar spelet med den valda.
// Banorna ligger som filer: hc_level_NN_VV.json (bana NN, version VV). Spelet letar upp bana 01, 02, 03 …
// tills en saknas, och tar för varje bana den högsta versionen. Ingen lista behövs: en ny fil i mappen räcker.
// ?level=N väljer bana. ?test=1 spelar banan som editorn sparat i webbläsaren (provspel, ingen topplista).
// Bana 1 är alltid öppen; en klarad bana låser upp nästa (hc_done i telefonen). hc_unlock_all öppnar alla.
(async function(){
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const q=new URLSearchParams(location.search);
  const has=async url=>{try{return (await fetch(url,{method:'HEAD',cache:'no-cache'})).ok}catch(err){return false}};
  // Fält som en bana kan sakna får tomma standardvärden
  const normalize=(L,id,hs)=>({links:[],curves:[],pits:[],gaps:[],cracks:[],gates:[],signs:[],doors:[],seeds:[],tube:null,lift:null,wheel:null,
    ...L,name:L.name||'Untitled',id,hs});
  function start(L){
    window.HC_LEVEL=L;
    const s=document.createElement('script');s.src='hc_game_05.js';
    s.onload=()=>{$('go').disabled=false};
    document.body.appendChild(s);
  }
  if(q.get('test')){
    let L=null;try{L=JSON.parse(localStorage.getItem('hc_test_level'))}catch(err){}
    if(!L){$('levelMsg').textContent='No test level found. Open it from the level editor.';return}
    $('levelMsg').textContent='Test run: '+(L.name||'Untitled');
    $('editorLink').textContent='Back to the level editor';
    start(normalize(L,'test',null));return;
  }
  const levels=[];
  for(let n=1;n<=99;n++){
    let v=0;while(v<99&&await has(`hc_level_${pad(n)}_${pad(v+1)}.json`))v++;
    if(!v)break;
    levels.push({n,v,file:`hc_level_${pad(n)}_${pad(v)}.json`});
  }
  if(!levels.length){$('levelMsg').textContent='No levels yet. Build one in the level editor!';return}
  let done=new Set(),all=false;
  try{done=new Set(JSON.parse(localStorage.getItem('hc_done')||'[]'));all=localStorage.getItem('hc_unlock_all')==='1'}catch(err){}
  // öppen: den första, eller banan före är klarad
  levels.forEach((l,i)=>{l.open=all||i===0||done.has(levels[i-1].n);l.done=done.has(l.n)});
  const want=parseInt(q.get('level'))||0, open=levels.filter(l=>l.open);
  // utan val: den första öppna banan som inte är klarad (annars den sista öppna)
  const cur=open.find(l=>l.n===want)||open.find(l=>!l.done)||open[open.length-1];
  window.HC_LEVELS={list:levels.map(l=>l.n)};
  let L;
  try{L=await (await fetch(cur.file,{cache:'no-cache'})).json()}catch(err){$('levelMsg').textContent='The level '+cur.file+' could not be read.';return}
  // Knapparna på startskärmen (spelet markerar den valda och byter bana vid tryck). Namnen läses bara för
  // den valda banan; de andra visas med nummer tills de väljs.
  const box=$('levels');
  for(const l of levels){
    const b=document.createElement('button');b.className='lvl';b.dataset.level=String(l.n);
    b.textContent=(l===cur?`${l.n}. ${L.name||'Level '+l.n}`:`Level ${l.n}`)+(l.done?' ✓':l.open?'':' 🔒');
    if(!l.open){b.disabled=true;b.setAttribute('aria-label',`Level ${l.n}, locked. Finish level ${l.n-1} to open it.`)}
    box.appendChild(b);
  }
  $('levelMsg').textContent='';
  // Topplistan gäller bana och version: ändras banan börjar listan om
  start(normalize(L,String(cur.n),`hc_${pad(cur.n)}_${pad(cur.v)}`));
})();
