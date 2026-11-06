// Hittar banorna och startar spelet med den valda.
// Banorna ligger som filer: hc_level_NN_VV.json (bana NN, version VV). Spelet letar upp bana 01, 02, 03 …
// tills en saknas, och tar för varje bana den högsta versionen. Ingen lista behövs: en ny fil i mappen räcker.
// Träningsbanor: hc_train_NN_VV.json (T1, T2 …). De är alltid öppna och har ingen topplista.
// ?level=N väljer bana, ?level=tN träningsbana. ?test=1 spelar banan som editorn sparat i webbläsaren (provspel, ingen topplista).
// Bana 1 är alltid öppen; en klarad bana låser upp nästa (hc_done i telefonen). hc_unlock_all öppnar alla.
// Next level går T1 → T2 → … → bana 1 → bana 2 …
// Startsidan: banorna är en rad kort som man bläddrar mellan (Training 1, 2 … och sedan Level 1, 2 …). Kortet som
// stannar i mitten blir den valda banan (sidan laddas inte om). Spelet laddas först när man trycker Start: i själva
// trycket startas ljudet, frågas om lutningssensorn (iPhone) och slås helskärm på, eftersom webbläsaren bara
// tillåter det direkt i ett tryck. Sedan hämtas spelet med den valda banan och startar av sig självt.
(async function(){
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  // Lås upp alla banor (för den som bygger banorna): länken på startsidan, med lösenord. Sparas i telefonen;
  // samma länk låser igen. Sidan laddas om så att banvalet visas på nytt.
  const UNLOCK_PASSWORD='abc';
  const unlocked=()=>{try{return localStorage.getItem('hc_unlock_all')==='1'}catch(err){return false}};
  const ul=$('unlockLink');ul.textContent=unlocked()?'Lock the levels again':'Unlock all levels';
  ul.onclick=e=>{
    e.preventDefault();
    const pw=prompt('Password:');if(pw===null)return;
    if(pw!==UNLOCK_PASSWORD){alert('Wrong password.');return}
    try{if(unlocked())localStorage.removeItem('hc_unlock_all');else localStorage.setItem('hc_unlock_all','1')}catch(err){}
    location.reload();
  };
  const q=new URLSearchParams(location.search);
  const has=async url=>{try{return (await fetch(url,{method:'HEAD',cache:'no-cache'})).ok}catch(err){return false}};
  // Fält som en bana kan sakna får tomma standardvärden
  const normalize=(L,id,hs)=>({links:[],curves:[],pits:[],gaps:[],cracks:[],gates:[],signs:[],doors:[],seeds:[],tube:null,lift:null,wheel:null,
    ...L,name:L.name||'Untitled',id,hs});
  // Ljud, sensor och helskärm i trycket på Start (spelet tar över dem när det har laddats)
  function inGesture(which){
    try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){window.HC_AUDIO=new AC();if(window.HC_AUDIO.resume)window.HC_AUDIO.resume().catch(()=>{})}}catch(err){}
    if(which==='go'&&typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      try{window.HC_PERM=DeviceOrientationEvent.requestPermission();window.HC_PERM.catch(()=>{})}catch(err){}
    }
    if(matchMedia('(pointer:coarse)').matches){
      const el=document.documentElement, req=el.requestFullscreen||el.webkitRequestFullscreen;
      const lock=()=>{try{const o=screen.orientation;if(o&&o.lock)o.lock('portrait').catch(()=>{})}catch(err){}};
      if(req)try{const r=req.call(el,{navigationUI:'hide'});if(r&&r.then)r.then(lock).catch(()=>{});else lock()}catch(err){}
    }
  }
  let begun=false, getLevel=null, levelOk=false;   // getLevel: ger banan som ska spelas (ett löfte)
  const goBtn=$('go'), noBtn=$('nomotion'), goText=goBtn.textContent;
  function setButtons(){goBtn.disabled=noBtn.disabled=begun||!levelOk}
  function begin(which){
    if(begun||!levelOk)return;
    begun=true;setButtons();goBtn.textContent='Loading …';
    inGesture(which);
    getLevel().then(L=>{
      window.HC_LEVEL=L;window.HC_AUTOSTART=which;
      const s=document.createElement('script');s.src='hc_game_39.js';
      s.onerror=()=>{begun=false;goBtn.textContent=goText;setButtons();$('levelMsg').textContent='The game could not be loaded. Please try again.'};
      document.body.appendChild(s);
    }).catch(()=>{begun=false;goBtn.textContent=goText;setButtons();$('levelMsg').textContent='The level could not be read. Please try again.'});
  }
  goBtn.onclick=()=>begin('go');noBtn.onclick=()=>begin('nomotion');
  if(q.get('test')){
    let L=null;try{L=JSON.parse(localStorage.getItem('hc_test_level'))}catch(err){}
    if(!L){$('levelMsg').textContent='No test level found. Open it from the level editor.';return}
    $('levelMsg').textContent='Test run: '+(L.name||'Untitled');
    $('editorLink').style.display='';   // (länken till editorn finns bara vid provspel)
    getLevel=()=>Promise.resolve(normalize(L,'test',null));levelOk=true;setButtons();return;
  }
  // bana 01, 02 … tills en saknas, och för varje bana den högsta versionen
  async function find(kind){
    const out=[];
    for(let n=1;n<=99;n++){
      let v=0;while(v<99&&await has(`hc_${kind}_${pad(n)}_${pad(v+1)}.json`))v++;
      if(!v)break;
      out.push({n,v,file:`hc_${kind}_${pad(n)}_${pad(v)}.json`,id:kind==='train'?'t'+n:String(n),train:kind==='train'});
    }
    return out;
  }
  const ss=(k,v)=>{try{if(v===undefined)return JSON.parse(sessionStorage.getItem(k)||'null');sessionStorage.setItem(k,JSON.stringify(v))}catch(err){return null}};
  const found=await Promise.all([find('train'),find('level')]);
  const [trains,levels]=found;
  if(!levels.length&&!trains.length){$('levelMsg').textContent='No levels yet. Build one in the level editor!';return}
  let done=new Set(),all=false;
  try{done=new Set(JSON.parse(localStorage.getItem('hc_done')||'[]'));all=localStorage.getItem('hc_unlock_all')==='1'}catch(err){}
  // öppen: den första, eller banan före är klarad
  levels.forEach((l,i)=>{l.open=all||i===0||done.has(levels[i-1].n);l.done=done.has(l.n)});
  trains.forEach(l=>{l.open=true;l.done=false});
  const want=q.get('level')||'', open=[...trains,...levels].filter(l=>l.open);
  // utan val: den första öppna banan som inte är klarad (annars den sista öppna); finns inga banor, T1
  const openLv=levels.filter(l=>l.open);
  const cur=open.find(l=>l.id===want)||openLv.find(l=>!l.done)||openLv[openLv.length-1]||trains[0];
  window.HC_LEVELS={list:[...trains,...levels].map(l=>l.id)};
  // Banvalet: en rad kort att bläddra mellan. Namnen hämtas i bakgrunden (och sparas till nästa laddning).
  // Den valda banans fil hämtas i förväg, så att Start går fort.
  let sel=cur;
  const fetchLevel=l=>l.p||(l.p=fetch(l.file,{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(J=>{
    names[l.file]=J.name||'Untitled';ss('hc_names',names);cards[cardL.indexOf(l)].querySelector('span').textContent=names[l.file];return J}));
  const box=$('levels'), names=ss('hc_names')||{};
  const wrap=document.createElement('div');wrap.className='lvlWrap';
  const track=document.createElement('div');track.className='lvlTrack';
  const cardL=[...trains,...levels];
  const cards=cardL.map(l=>{
    const b=document.createElement('button');b.className='lvc'+(l===cur?' on':'')+(l.open?'':' locked');b.dataset.level=l.id;
    const title=(l.train?'Training ':'Level ')+l.n;
    const t=document.createElement('b');t.textContent=title;
    const nm=document.createElement('span');nm.textContent=names[l.file]||'';
    const st=document.createElement('i');st.textContent=l.done?'✓ Finished':l.open?'':`🔒 Finish level ${l.n-1} first`;
    b.append(t,nm,st);b.setAttribute('aria-label',title+(l.open?'':', locked'));
    b.onclick=()=>goTo(b,true);
    track.appendChild(b);return b;
  });
  const arrow=(cls,txt,lab,step)=>{const a=document.createElement('button');a.className='lvlArrow '+cls;a.textContent=txt;a.setAttribute('aria-label',lab);
    a.onclick=()=>{const i=cards.indexOf(middle())+step;if(cards[i])goTo(cards[i],true)};return a};
  const prev=arrow('l','‹','Previous level',-1), next=arrow('r','›','Next level',1);
  wrap.append(track,prev,next);box.appendChild(wrap);
  function goTo(b,smooth){track.scrollTo({left:b.offsetLeft+b.offsetWidth/2-track.clientWidth/2,behavior:smooth?'smooth':'auto'})}
  function middle(){const m=track.scrollLeft+track.clientWidth/2;let best=cards[0],bd=1e9;
    for(const b of cards){const d=Math.abs(b.offsetLeft+b.offsetWidth/2-m);if(d<bd){bd=d;best=b}}return best}
  // när kortet i mitten har stannat: en öppen bana blir den valda (adressen följer med, så att en omladdning
  // står kvar på den), en låst bana går inte att starta
  function settle(){
    const b=middle(),i=cards.indexOf(b),l=cardL[i];
    prev.disabled=i===0;next.disabled=i===cards.length-1;
    if(l.open&&l!==sel){
      sel=l;cards.forEach((c,j)=>c.classList.toggle('on',cardL[j]===sel));fetchLevel(sel).catch(()=>{});
      try{history.replaceState(null,'','?level='+sel.id)}catch(err){}
    }
    levelOk=l.open;setButtons();$('levelMsg').textContent='';
  }
  let tmr=0;track.addEventListener('scroll',()=>{clearTimeout(tmr);tmr=setTimeout(settle,180)},{passive:true});
  goTo(cards[cardL.indexOf(cur)],false);requestAnimationFrame(()=>{goTo(cards[cardL.indexOf(cur)],false);settle()});
  // Topplistan gäller bana och version: ändras banan börjar listan om (träningsbanor: ingen topplista)
  getLevel=()=>{const l=sel;return fetchLevel(l).then(J=>normalize(J,l.id,l.train?null:`hc_${pad(l.n)}_${pad(l.v)}`))};
  fetchLevel(cur).catch(()=>{});
  // de andra banornas namn
  cardL.filter(l=>l!==cur&&!(l.file in names)).forEach(l=>fetch(l.file,{cache:'no-cache'}).then(r=>r.json()).then(J=>{
    names[l.file]=J.name||'Untitled';ss('hc_names',names);cards[cardL.indexOf(l)].querySelector('span').textContent=names[l.file];
  }).catch(()=>{}));
  $('levelMsg').textContent='';levelOk=true;setButtons();
})();
