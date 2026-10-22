// Hittar banorna och startar spelet med den valda.
// Banorna ligger som filer: hc_level_NN_VV.json (bana NN, version VV). Spelet letar upp bana 01, 02, 03 …
// tills en saknas, och tar för varje bana den högsta versionen. Ingen lista behövs: en ny fil i mappen räcker.
// ?level=N väljer bana. ?test=1 spelar banan som editorn sparat i webbläsaren (provspel, ingen topplista).
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
    const s=document.createElement('script');s.src='hc_game_02.js';
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
  const want=parseInt(q.get('level'))||1, cur=levels.find(l=>l.n===want)||levels[0];
  let L;
  try{L=await (await fetch(cur.file,{cache:'no-cache'})).json()}catch(err){$('levelMsg').textContent='The level '+cur.file+' could not be read.';return}
  // Knapparna på startskärmen (spelet markerar den valda och byter bana vid tryck). Namnen läses bara för
  // den valda banan; de andra visas med nummer tills de väljs.
  const box=$('levels');
  for(const l of levels){
    const b=document.createElement('button');b.className='lvl';b.dataset.level=String(l.n);
    b.textContent=l===cur?`${l.n}. ${L.name||'Level '+l.n}`:`Level ${l.n}`;box.appendChild(b);
  }
  $('levelMsg').textContent='';
  // Topplistan gäller bana och version: ändras banan börjar listan om
  start(normalize(L,String(cur.n),`hc_${pad(cur.n)}_${pad(cur.v)}`));
})();
