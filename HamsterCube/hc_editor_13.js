// Hamster Cube – banbyggaren (editorn)
// Man bygger kuben lager för lager på ett rutnät och ser hela kuben i 3D ovanför. Resultatet blir en
// banfil (hc_level_NN_VV.json) som spelet läser. Samma format som spelet använder:
//   segs: gångar, var och en med ett golv (riktning) och sina rutor. Rutor i samma gång bredvid varandra hänger ihop.
//   links: hål (genom golvet) och schakt (genom taket) mellan två gångar.
//   start {c, d}: rutan där hamstern börjar och hållet den tittar. exit {c, d}: rutan och sidan där utgången sitter.
// Items: frön, runda hål (röda, breda röda, blå), stora hål och schakt, hål i golvet och sprucket glas.
// Kurvor (kvartscirklar i ett lager) och rör (glasrör utanför kuben, flera per bana).
// Onda hamstrar: portar med patrullväg och grå hamstrar utan port. El: hjul, dörrar och hissar (flera av varje).
// Skyltar (under Items): text och en pil åt vänster eller höger.
// Riktningar: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
'use strict';
const $=id=>document.getElementById(id);
const DIRS=[[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]];
const dirIndex=(a,s)=>a*2+(s>0?0:1);
const neighbor=(c,d)=>{const n=c.slice();n[DIRS[d][0]]+=DIRS[d][1];return n};
const key=c=>c.join(',');
const AXN='XYZ';
const dirName=d=>(DIRS[d][1]>0?'+':'−')+AXN[DIRS[d][0]];
const SEG_COLORS=['#5ad1ff','#ffd166','#4ade80','#ff8c3a','#c084fc','#ff6b9a','#7dd3c0','#f4a261','#9db4ff','#e9e36b'];
const EXTRA_KEYS=['curves','tubes','pits','gaps','cracks','gates','enemies','wheels','lifts','doors','signs','seeds','buttons','grates','boxes','balldoors','keys'];

// ---------- Exempel: Twist & Turn (testbanan från FPA) ----------
const EXAMPLE={name:'Twist & Turn',N:8,
  segs:[
    {floor:3,cells:[[0,7,0],[1,7,0],[2,7,0],[3,7,0],[2,7,1],[5,7,2],[5,7,3],[5,7,4],[5,7,5],[4,7,5],[3,7,5],[2,7,5],[0,7,2],[1,7,2],[0,7,3],[1,7,3],[0,7,4],[1,7,4],[0,7,5],[1,7,5]]},
    {floor:1,cells:[[0,6,2],[0,5,2],[0,4,2],[0,3,2],[0,2,2],[0,2,3],[0,2,4],[0,2,5]]},
    {floor:3,cells:[[1,2,4],[1,2,3],[1,2,2],[2,2,4],[3,2,4],[4,2,4],[5,2,4],[5,2,5],[5,2,6],[5,2,7],[6,2,7],[7,2,7],[7,2,6],[7,2,5],[7,2,4],[7,2,3],[7,2,2],[7,2,1],[7,2,0]]},
    {floor:3,cells:[[7,1,0],[6,1,0],[5,1,0],[4,1,0],[3,1,0],[2,1,0],[1,1,0],[0,1,0]]},
  ],
  start:{c:[1,7,0],d:0},
  links:[[[0,2,4],[1,2,4],'shaft']],
  curves:[{a:{c:[2,7,1],d:4},b:{c:[5,7,4],d:1},center:[4.5,7,1.5]},{a:{c:[3,7,0],d:0},b:{c:[5,7,2],d:5},center:[3.5,7,1.5]}],
  pits:[{c:[1,7,4],kind:'red'},{c:[0,7,3],kind:'red'},{c:[0,7,2],kind:'blue'},{c:[7,2,5],kind:'red',wide:true}],
  gaps:[{c:[7,2,2]}],cracks:[{c:[5,2,6]},{c:[5,1,0]}],
  gates:[{c:[3,7,5],d:4,patrol:[[4,7,5],[0,7,4]]},{c:[2,1,0],d:4,patrol:[[4,1,0],[1,1,0]]}],
  lift:{a:[7,2,0],b:[7,1,0]},
  signs:[{c:[1,2,4],ahead:0,point:5,text:'HAMSTER WHEEL'}],
  wheel:{c:[1,2,2],open:4,run:0},
  doors:[{a:[2,2,4],b:[3,2,4]},{a:[4,2,4],b:[5,2,4]}],
  exit:{c:[0,1,0],d:1},
  seeds:[[2,7,0],[3,7,0],[2,7,1],[5,7,3],[5,7,5],[3,7,5],[1,7,5],[1,7,3],[0,5,2],[0,3,2],[0,2,3],[0,2,5],[1,2,3],[2,2,4],[3,2,4],[5,2,5],[5,2,7],[6,2,7],[7,2,6],[7,2,4],[7,2,3],[7,2,1],[6,1,0],[4,1,0],[3,1,0],[1,1,0]],
};

// ---------- Läget ----------
// lv: banan som byggs. ui: vad man tittar på (axel, lager, verktyg, vald gång). Sparas i webbläsaren hela tiden.
let lv, ui;
const blank=N=>({name:'',N,segs:[],links:[],start:null,exit:null,extra:{},exNum:1,exVer:1});
function fromFile(L){
  const o=blank(L.N||8);o.name=L.name||'';
  o.segs=(L.segs||[]).map(s=>({floor:s.floor,cells:s.cells.map(c=>c.slice())}));
  o.links=(L.links||[]).map(l=>[l[0].slice(),l[1].slice(),l[2]||'hole']);
  o.start=L.start&&L.start.c?{c:L.start.c.slice(),d:L.start.d}:null;
  o.exit=L.exit?{c:L.exit.c.slice(),d:L.exit.d}:null;
  for(const k of EXTRA_KEYS)if(L[k]!=null&&!(Array.isArray(L[k])&&!L[k].length))o.extra[k]=L[k];
  // (äldre banor: ett enda rör, hjul eller en enda hiss)
  if(L.tube)o.extra.tubes=[...(o.extra.tubes||[]),L.tube];
  if(L.wheel)o.extra.wheels=[...(o.extra.wheels||[]),L.wheel];
  if(L.lift)o.extra.lifts=[...(o.extra.lifts||[]),L.lift];
  return o;
}
function toFile(){
  const L={name:lv.name||'Untitled',N:lv.N,segs:lv.segs.map(s=>({floor:s.floor,cells:s.cells})),start:lv.start,links:lv.links};
  for(const k of EXTRA_KEYS)if(lv.extra[k]!=null)L[k]=lv.extra[k];
  L.exit=lv.exit;
  return L;
}
// Banfilen: en rad per del, så att den går att läsa
const fileText=()=>{const L=toFile();return '{\n'+Object.keys(L).map(k=>`  ${JSON.stringify(k)}:${JSON.stringify(L[k])}`).join(',\n')+'\n}\n'};
function save(){try{localStorage.setItem('hc_editor_state',JSON.stringify({lv,ui}))}catch(err){}}
function load(){
  try{const s=JSON.parse(localStorage.getItem('hc_editor_state'));if(s&&s.lv&&s.ui){lv=s.lv;ui=s.ui;return}}catch(err){}
  lv=blank(8);ui={axis:1,layer:7,sign:-1,tool:'draw',sel:-1,item:'seed',se:'start',pick:null};
}

// ---------- Hjälp om rutor ----------
let cellMap=new Map();   // "x,y,z" → gångens nummer
function reindex(){cellMap=new Map();lv.segs.forEach((s,i)=>s.cells.forEach(c=>cellMap.set(key(c),i)))}
const segAt=c=>cellMap.has(key(c))?cellMap.get(key(c)):-1;
const inside=c=>c.every(v=>v>=0&&v<lv.N);
const segAxis=s=>DIRS[s.floor][0];
const segLayer=s=>s.cells.length?s.cells[0][segAxis(s)]:-1;
const planeAxes=a=>[0,1,2].filter(x=>x!==a);
// Rutnätet: kolumn och rad för en ruta i lagret (Y: x åt höger, z nedåt; X: z åt höger, y uppåt; Z: x åt höger, y uppåt)
function gridToCell(col,row){
  const N=lv.N,c=[0,0,0];c[ui.axis]=ui.layer;
  if(ui.axis===1){c[0]=col;c[2]=row}else if(ui.axis===0){c[2]=col;c[1]=N-1-row}else{c[0]=col;c[1]=N-1-row}
  return c;
}
function cellToGrid(c){
  const N=lv.N;
  if(ui.axis===1)return [c[0],c[2]];if(ui.axis===0)return [c[2],N-1-c[1]];return [c[0],N-1-c[1]];
}
// riktningen i rutnätet (höger/vänster/ned/upp på skärmen) för en riktning i kuben
function dirToScreen(d){
  const a=DIRS[d][0],s=DIRS[d][1];if(a===ui.axis)return null;
  if(ui.axis===1)return a===0?[s,0]:[0,s];
  if(ui.axis===0)return a===2?[s,0]:[0,-s];
  return a===0?[s,0]:[0,-s];
}
const linkAt=(a,b)=>lv.links.findIndex(l=>(key(l[0])===key(a)&&key(l[1])===key(b))||(key(l[0])===key(b)&&key(l[1])===key(a)));
const openSame=(c,d)=>{const n=neighbor(c,d),s=segAt(c);return s>=0&&inside(n)&&segAt(n)===s};

// ---------- Ändringar ----------
function msg(t){$('status').textContent=t}
function changed(){reindex();save();drawGrid();build3d();showSign();$('issues').classList.add('hide');if(!stroke)snapshot()}
// Ångra och gör om: en bild av banan efter varje ändring (ett helt drag med fingret räknas som en ändring)
let undoSt=[],redoSt=[],lastSnap=null;
function snapshot(){
  const s=JSON.stringify(lv);
  if(lastSnap!==null&&s!==lastSnap){undoSt.push(lastSnap);if(undoSt.length>100)undoSt.shift();redoSt=[]}
  lastSnap=s;undoUi();
}
function undoUi(){$('undoBtn').disabled=!undoSt.length;$('redoBtn').disabled=!redoSt.length}
function restore(s){
  lv=JSON.parse(s);lastSnap=s;if(!lv.segs[ui.sel])ui.sel=-1;ui.layer=Math.min(ui.layer,lv.N-1);
  reindex();sizeGrid();showUi();save();build3d();$('issues').classList.add('hide');undoUi();
}
function selInfo(){
  const s=lv.segs[ui.sel];
  if(!s){msg('Start in an empty cell to draw a corridor. Its floor side is '+dirName(dirIndex(ui.axis,ui.sign))+'.');return}
  msg(`Corridor ${ui.sel+1} · floor ${dirName(s.floor)} · ${s.cells.length} ${s.cells.length===1?'cell':'cells'}`);
}
function addCell(si,c){if(segAt(c)>=0)return false;lv.segs[si].cells.push(c);cellMap.set(key(c),si);return true}
function removeCell(c){
  const si=segAt(c);if(si<0)return false;
  const s=lv.segs[si];s.cells=s.cells.filter(q=>key(q)!==key(c));
  lv.links=lv.links.filter(l=>key(l[0])!==key(c)&&key(l[1])!==key(c));
  if(lv.start&&key(lv.start.c)===key(c))lv.start=null;
  if(lv.exit&&key(lv.exit.c)===key(c))lv.exit=null;
  // frön, runda hål, hål i golvet och sprucket glas i rutan försvinner med den
  for(const k of ['pits','gaps','cracks'])if(lv.extra[k])lv.extra[k]=lv.extra[k].filter(o=>key(o.c)!==key(c));
  if(lv.extra.seeds)lv.extra.seeds=lv.extra.seeds.filter(q=>key(q)!==key(c));
  // kurvor och rör med en ände i rutan försvinner också
  for(const k of ['curves','tubes'])if(lv.extra[k]){lv.extra[k]=lv.extra[k].filter(o=>key(o.a.c)!==key(c)&&key(o.b.c)!==key(c));if(!lv.extra[k].length)delete lv.extra[k]}
  // portar, onda hamstrar (patrullrutor), hjul, dörrar och hissar i rutan också
  const kc=key(c),drop=(k,f)=>{if(lv.extra[k]){lv.extra[k]=lv.extra[k].filter(o=>!f(o));if(!lv.extra[k].length)delete lv.extra[k]}};
  drop('gates',G=>key(G.c)===kc);drop('enemies',E=>(E.patrol||[]).some(q=>key(q)===kc));
  for(const G of lv.extra.gates||[])G.patrol=(G.patrol||[]).filter(q=>key(q)!==kc);
  drop('signs',S=>key(S.c)===kc);ui.signSel=-1;
  // pusslet: knappar, grindar (knapparnas koppling räknas om), lådor, kuldörrar och nycklar i rutan
  {const gr=E_('grates');for(let i=gr.length-1;i>=0;i--)if(key(gr[i].a)===kc||key(gr[i].b)===kc)removeGrate(i)}
  drop('buttons',B=>key(B.c)===kc);ui.btnSel=-1;drop('balldoors',B=>key(B.c)===kc);
  if(lv.extra.boxes){lv.extra.boxes=lv.extra.boxes.filter(q=>key(q)!==kc);if(!lv.extra.boxes.length)delete lv.extra.boxes}
  if(lv.extra.keys){lv.extra.keys=lv.extra.keys.filter(q=>key(q)!==kc);if(!lv.extra.keys.length)delete lv.extra.keys}
  drop('wheels',W=>key(W.c)===kc);drop('doors',D=>key(D.a)===kc||key(D.b)===kc);drop('lifts',L=>key(L.a)===kc||key(L.b)===kc);
  ui.pick=null;
  if(!s.cells.length){
    lv.segs.splice(si,1);
    if(ui.sel===si)ui.sel=-1;else if(ui.sel>si)ui.sel--;
  }
  reindex();return true;
}

// ---------- Rutnätet ----------
const grid=$('grid'), gctx=grid.getContext('2d');
let gs=0;   // en rutas storlek i bildpunkter
function sizeGrid(){
  const w=grid.clientWidth, dpr=Math.min(2,devicePixelRatio||1);
  grid.width=Math.round(w*dpr);grid.height=Math.round(w*dpr);gctx.setTransform(dpr,0,0,dpr,0,0);
  gs=w/lv.N;drawGrid();
}
function drawGrid(){
  const N=lv.N,W=gs*N,g=gctx;
  g.clearRect(0,0,W,W);
  // rutnätet
  g.strokeStyle='#ffffff14';g.lineWidth=1;
  for(let i=0;i<=N;i++){g.beginPath();g.moveTo(i*gs,0);g.lineTo(i*gs,W);g.stroke();g.beginPath();g.moveTo(0,i*gs);g.lineTo(W,i*gs);g.stroke()}
  const extraCells=extraMarkers();
  for(let row=0;row<N;row++)for(let col=0;col<N;col++){
    const c=gridToCell(col,row),si=segAt(c),x=col*gs,y=row*gs;
    if(si<0)continue;
    const s=lv.segs[si];
    if(segAxis(s)!==ui.axis){
      // en gång på en annan vägg som går igenom lagret: randig, går inte att ändra här
      g.save();g.beginPath();g.rect(x+1,y+1,gs-2,gs-2);g.clip();g.strokeStyle='#ffffff30';g.lineWidth=2;
      for(let t=-gs;t<gs*2;t+=7){g.beginPath();g.moveTo(x+t,y);g.lineTo(x+t+gs,y+gs);g.stroke()}
      g.restore();continue;
    }
    const col0=SEG_COLORS[si%SEG_COLORS.length];
    g.fillStyle=col0+(si===ui.sel?'aa':'66');g.fillRect(x+1,y+1,gs-2,gs-2);
    // golvets sida: ▽ = golvet åt minus, △ = åt plus
    g.fillStyle='#06121fcc';g.font=`${Math.max(9,gs*.26)}px sans-serif`;g.textAlign='left';g.textBaseline='top';
    g.fillText(DIRS[s.floor][1]<0?'▽':'△',x+3,y+2);
  }
  // väggar: tjock linje där grannen inte är samma gång
  for(let row=0;row<N;row++)for(let col=0;col<N;col++){
    const c=gridToCell(col,row),si=segAt(c);if(si<0||segAxis(lv.segs[si])!==ui.axis)continue;
    const x=col*gs,y=row*gs;g.strokeStyle=si===ui.sel?'#ffffff':'#ffffffaa';g.lineWidth=si===ui.sel?3:2;
    for(const a of planeAxes(ui.axis))for(const s of [1,-1]){
      const d=dirIndex(a,s);if(openSame(c,d)||sideUse(c,d))continue;   // (kurvor och rör: en öppning)
      const [dx,dy]=dirToScreen(d);g.beginPath();
      if(dx>0){g.moveTo(x+gs,y);g.lineTo(x+gs,y+gs)}else if(dx<0){g.moveTo(x,y);g.lineTo(x,y+gs)}
      else if(dy>0){g.moveTo(x,y+gs);g.lineTo(x+gs,y+gs)}else{g.moveTo(x,y);g.lineTo(x+gs,y)}
      g.stroke();
    }
  }
  // hål och schakt
  for(const l of lv.links){
    for(const [c,o] of [[l[0],l[1]],[l[1],l[0]]]){
      if(c[ui.axis]!==ui.layer)continue;const si=segAt(c);if(si<0||segAxis(lv.segs[si])!==ui.axis)continue;
      const d=DIRS.findIndex((_,d)=>key(neighbor(c,d))===key(o));if(d<0)continue;
      const down=d===lv.segs[si].floor, [col,row]=cellToGrid(c), cx=(col+.5)*gs, cy=(row+.5)*gs;
      g.lineWidth=3;g.strokeStyle=down?'#5ad1ff':'#ffd166';g.beginPath();
      if(down)g.arc(cx,cy,gs*.28,0,Math.PI*2);else g.rect(cx-gs*.26,cy-gs*.26,gs*.52,gs*.52);g.stroke();
    }
  }
  // frön och saker i golvet, kurvor, rör, och det man håller på att välja
  drawItems(g);drawCurvesTubes(g);drawEnemiesPower(g);drawSigns(g);drawPuzzle(g);
  // start och utgång
  if(lv.start&&lv.start.c[ui.axis]===ui.layer){
    const [col,row]=cellToGrid(lv.start.c),cx=(col+.5)*gs,cy=(row+.5)*gs,v=dirToScreen(lv.start.d)||[0,0];
    g.fillStyle='#4ade80';g.beginPath();g.arc(cx,cy,gs*.2,0,Math.PI*2);g.fill();
    g.strokeStyle='#4ade80';g.lineWidth=3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+v[0]*gs*.42,cy+v[1]*gs*.42);g.stroke();
  }
  if(lv.exit&&lv.exit.c[ui.axis]===ui.layer){
    const [col,row]=cellToGrid(lv.exit.c),v=dirToScreen(lv.exit.d);
    if(v){const x=col*gs,y=row*gs;g.strokeStyle='#ffd166';g.lineWidth=6;g.beginPath();
      if(v[0]>0){g.moveTo(x+gs-3,y+4);g.lineTo(x+gs-3,y+gs-4)}else if(v[0]<0){g.moveTo(x+3,y+4);g.lineTo(x+3,y+gs-4)}
      else if(v[1]>0){g.moveTo(x+4,y+gs-3);g.lineTo(x+gs-4,y+gs-3)}else{g.moveTo(x+4,y+3);g.lineTo(x+gs-4,y+3)}g.stroke()}
    g.fillStyle='#ffd166';g.font=`bold ${Math.max(8,gs*.2)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';
    g.fillText('EXIT',(col+.5)*gs,(row+.5)*gs);
  }
  // övriga saker (från en öppnad fil): små tecken i rutan
  for(const [k,txt] of extraCells){
    const c=k.split(',').map(Number);if(c[ui.axis]!==ui.layer)continue;
    const [col,row]=cellToGrid(c);g.fillStyle='#ffffffdd';g.font=`${Math.max(8,gs*.22)}px sans-serif`;g.textAlign='right';g.textBaseline='bottom';
    g.fillText(txt,(col+1)*gs-3,(row+1)*gs-2);
  }
}
function drawItems(g){
  const here=c=>c[ui.axis]===ui.layer&&segAt(c)>=0&&segAxis(lv.segs[segAt(c)])===ui.axis;
  const mid=c=>{const [col,row]=cellToGrid(c);return [(col+.5)*gs,(row+.5)*gs]};
  for(const P of lv.extra.pits||[]){
    if(!here(P.c))continue;const [x,y]=mid(P.c);
    if(P.wide){g.strokeStyle='#ff4d5e';g.lineWidth=gs*.12;g.beginPath();g.arc(x,y,gs*.36,0,Math.PI*2);g.stroke()}
    else{g.fillStyle=P.kind==='blue'?'#5ad1ff':'#ff4d5e';g.beginPath();g.arc(x,y,gs*.24,0,Math.PI*2);g.fill();
      g.fillStyle='#06121f';g.beginPath();g.arc(x,y,gs*.13,0,Math.PI*2);g.fill()}
  }
  for(const H of lv.extra.gaps||[]){
    if(!here(H.c))continue;const [x,y]=mid(H.c);g.fillStyle='#000000cc';g.fillRect(x-gs*.36,y-gs*.36,gs*.72,gs*.72);
    g.strokeStyle='#ffffff55';g.lineWidth=1.5;g.strokeRect(x-gs*.36,y-gs*.36,gs*.72,gs*.72);
  }
  for(const H of lv.extra.cracks||[]){
    if(!here(H.c))continue;const [x,y]=mid(H.c);g.strokeStyle='#d8f3ff';g.lineWidth=1.5;g.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3+.3,r=gs*(.25+.12*(i%2));g.moveTo(x,y);g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}g.stroke();
  }
  for(const c of lv.extra.seeds||[]){
    if(!here(c))continue;const [x,y]=mid(c),sx=x+gs*.26,sy=y-gs*.26;
    g.save();g.translate(sx,sy);g.rotate(-.6);g.fillStyle='#1a1a1a';g.beginPath();g.ellipse(0,0,gs*.07,gs*.15,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#f2efe6';g.lineWidth=1;g.beginPath();g.moveTo(0,-gs*.13);g.lineTo(0,gs*.13);g.moveTo(-gs*.035,-gs*.11);g.lineTo(-gs*.035,gs*.11);g.moveTo(gs*.035,-gs*.11);g.lineTo(gs*.035,gs*.11);g.stroke();g.restore();
  }
}
// tecken för saker som editorn ännu inte bygger: skylt S
function extraMarkers(){
  const m=new Map(),add=(c,t)=>{const k=key(c);m.set(k,(m.get(k)||'')+t)};
  const E=lv.extra;
  return m;
}

// ---------- Fingret på rutnätet ----------
let stroke=null;   // {si, last:[col,row]}
function gridPos(e){const r=grid.getBoundingClientRect();return [Math.floor((e.clientX-r.left)/gs),Math.floor((e.clientY-r.top)/gs)]}
const inGrid=([col,row])=>col>=0&&row>=0&&col<lv.N&&row<lv.N;
grid.addEventListener('pointerdown',e=>{
  e.preventDefault();const gp=gridPos(e);if(!inGrid(gp))return;
  grid.setPointerCapture(e.pointerId);
  const c=gridToCell(...gp),si=segAt(c);
  if(ui.tool==='draw'){
    if(si>=0&&segAxis(lv.segs[si])!==ui.axis){msg('That cell belongs to a corridor on another wall. Switch to '+AXN[segAxis(lv.segs[si])]+' to change it.');return}
    let target=si;
    if(target<0){
      // börjar man i en tom ruta blir det alltid en ny gång (vägg mot gångar bredvid); börjar man på en gång blir den längre
      lv.segs.push({floor:dirIndex(ui.axis,ui.sign),cells:[]});target=lv.segs.length-1;
      addCell(target,c);
    }
    ui.sel=target;stroke={si:target,last:gp};changed();selInfo();
  }else if(ui.tool==='erase'){
    // suddet tar bara rutor i gångar på de väggar man bygger på (inte randiga gångar på andra väggar)
    stroke={erase:true,last:gp};
    if(si>=0&&segAxis(lv.segs[si])!==ui.axis){msg('That cell belongs to a corridor on another wall. Switch to '+AXN[segAxis(lv.segs[si])]+' to erase it.');return}
    if(removeCell(c))changed();
  }else if(ui.tool==='items'&&ui.item==='sign')signTap(c);
  else if(ui.tool==='items'){
    // ett tryck sätter saken (eller tar bort den om den redan är där); drar man fortsätter man göra samma sak
    const add=!itemThere(c,ui.item),why=setItem(c,ui.item,add);
    if(why){msg(why);return}
    stroke={item:ui.item,add,last:gp};changed();
    msg((add?'Placed a ':'Removed the ')+ITEM_NAMES[ui.item]+'.');
  }else if(ui.tool==='startexit'){if(ui.se==='exit')setExit(c);else setStart(c)}
  else if(ui.tool==='paths'){if(ui.path==='tube')tubeTap(c);else curveTap(c)}
  else if(ui.tool==='enemies'){if(ui.enemy==='grey')greyTap(c);else gateTap(c)}
  else if(ui.tool==='power'){if(ui.power==='door')doorTap(c);else if(ui.power==='lift')liftTap(c);else wheelTap(c)}
  else if(ui.tool==='puzzle')puzzleTap(c);
});
grid.addEventListener('pointermove',e=>{
  if(!stroke)return;const gp=gridPos(e);if(!inGrid(gp)||(gp[0]===stroke.last[0]&&gp[1]===stroke.last[1]))return;
  // alla rutor på vägen dit fingret flyttat (så att inget hoppas över när man drar fort)
  const [c0,r0]=stroke.last,n=Math.max(Math.abs(gp[0]-c0),Math.abs(gp[1]-r0));let any=false,prev=stroke.last;
  for(let i=1;i<=n;i++){
    let cell=[Math.round(c0+(gp[0]-c0)*i/n),Math.round(r0+(gp[1]-r0)*i/n)];
    // bara steg rakt åt sidan eller uppåt/nedåt, så att gången hänger ihop
    if(cell[0]!==prev[0]&&cell[1]!==prev[1]){const mid=[cell[0],prev[1]];any=apply(mid)||any}
    any=apply(cell)||any;prev=cell;
  }
  stroke.last=gp;if(any){changed();if(!stroke.erase&&!stroke.item)selInfo()}
  function apply(g){
    const c=gridToCell(...g);
    if(stroke.item){if(itemThere(c,stroke.item)===stroke.add||segAt(c)<0)return false;return !setItem(c,stroke.item,stroke.add)}
    if(stroke.erase){const si=segAt(c);return si>=0&&segAxis(lv.segs[si])===ui.axis&&removeCell(c)}
    return addCell(stroke.si,c);
  }
});
const endStroke=()=>{if(stroke){stroke=null;snapshot()}};
grid.addEventListener('pointerup',endStroke);grid.addEventListener('pointercancel',endStroke);

// riktningarna i gångens plan
const planeDirs=s=>planeAxes(segAxis(s)).flatMap(a=>[dirIndex(a,1),dirIndex(a,-1)]);
function setStart(c){
  const si=segAt(c);if(si<0){msg('Tap a corridor cell to put the start there.');return}
  const ds=planeDirs(lv.segs[si]);
  if(lv.start&&key(lv.start.c)===key(c)){lv.start.d=ds[(ds.indexOf(lv.start.d)+1)%ds.length]}
  else lv.start={c:c.slice(),d:ds.find(d=>openSame(c,d))??ds[0]};
  msg('The hamster starts here looking '+dirName(lv.start.d)+'. Tap again to turn it.');changed();
}
function setExit(c){
  const si=segAt(c);if(si<0){msg('Tap a corridor cell to put the exit there.');return}
  // utgången sitter i en vägg: en sida där gången inte fortsätter
  const ds=planeDirs(lv.segs[si]).filter(d=>!openSame(c,d)&&!lv.links.some(l=>(key(l[0])===key(c)&&key(l[1])===key(neighbor(c,d))))&&!['curve','tube'].includes(sideUse(c,d)));
  if(!ds.length){msg('The exit must be in a wall, and this cell has no wall.');return}
  if(lv.exit&&key(lv.exit.c)===key(c)&&ds.includes(lv.exit.d))lv.exit.d=ds[(ds.indexOf(lv.exit.d)+1)%ds.length];
  else lv.exit={c:c.slice(),d:ds.find(d=>!inside(neighbor(c,d)))??ds[0]};
  msg('The exit is in the '+dirName(lv.exit.d)+' wall. Tap again to move it to another wall.');changed();
}

// ---------- Saker i rutorna (Items) ----------
// Frön, och saker i golvet: rött hål (kostar ett liv), brett rött hål (fyller gången, måste hoppas över),
// blått hål (hamstern fastnar halvvägs och man vänder kuben ner till gången under), hål i golvet och sprucket glas.
// En ruta kan ha ett frö och högst en sak i golvet.
const ITEM_NAMES={seed:'sunflower seed',blue:'blue hole',hole:'big hole',shaft:'shaft',gap:'gap',red:'red hole',wide:'wide red hole',crack:'cracked glass',sign:'sign'};
const listOf=k=>lv.extra[k]||(lv.extra[k]=[]);
const tidy=()=>{for(const k of ['seeds','pits','gaps','cracks'])if(lv.extra[k]&&!lv.extra[k].length)delete lv.extra[k]};
// vad som ligger i golvet i rutan: 'red', 'wide', 'blue', 'gap', 'crack' eller null
function floorItem(c){
  const k=key(c),pt=(lv.extra.pits||[]).find(o=>key(o.c)===k);
  if(pt)return pt.kind==='blue'?'blue':pt.wide?'wide':'red';
  if((lv.extra.gaps||[]).some(o=>key(o.c)===k))return 'gap';
  if((lv.extra.cracks||[]).some(o=>key(o.c)===k))return 'crack';
  return null;
}
const hasSeed=c=>(lv.extra.seeds||[]).some(q=>key(q)===key(c));
function clearFloorItem(c){
  const k=key(c);
  for(const n of ['pits','gaps','cracks'])if(lv.extra[n])lv.extra[n]=lv.extra[n].filter(o=>key(o.c)!==k);
}
// Sätt (add=true) eller ta bort sak it i rutan c. Ger en förklaring om det inte går, annars null.
function setItem(c,it,add){
  const si=segAt(c);if(si<0)return 'Items go in corridor cells.';
  const s=lv.segs[si];if(segAxis(s)!==ui.axis)return 'Switch to '+AXN[segAxis(s)]+' to put items in that corridor.';
  if(it==='seed'){
    if(add===hasSeed(c))return null;
    if(add)listOf('seeds').push(c.slice());else lv.extra.seeds=lv.extra.seeds.filter(q=>key(q)!==key(c));
    tidy();return null;
  }
  // stort hål (hela golvet, ner till gången under) och schakt (i taket, upp till gången ovanför)
  if(it==='hole'||it==='shaft'){
    const n=neighbor(c,it==='hole'?s.floor:s.floor^1),i=linkAt(c,n);
    if(!add){if(i>=0)lv.links.splice(i,1);return null}
    if(i>=0)return null;
    if(!(inside(n)&&segAt(n)>=0&&segAt(n)!==si))return it==='hole'?'A big hole leads down to a corridor right below. Build one in the next layer first.':'A shaft leads up to a corridor right above. Build one in the next layer first.';
    if(it==='hole'&&floorItem(c))return 'There is already a '+ITEM_NAMES[floorItem(c)]+' in the floor here.';
    // ett schakt blir ett hål i golvet i gången ovanför om dess golv vetter mot rutan
    if(it==='shaft'&&lv.segs[segAt(n)].floor===(s.floor^1)&&floorItem(n))return 'The corridor above has a '+ITEM_NAMES[floorItem(n)]+' in that cell.';
    lv.links.push([c.slice(),n,it]);return null;
  }
  if(!add){if(floorItem(c)===it){clearFloorItem(c);tidy()}return null}
  if(floorItem(c)===it)return null;
  const down=neighbor(c,s.floor);
  if(linkAt(c,down)>=0)return 'There is already a big hole down to the next corridor here.';
  if(it==='blue'&&!(inside(down)&&segAt(down)>=0&&segAt(down)!==si))return 'A blue hole leads down to a corridor right below. Build one in the next layer first.';
  clearFloorItem(c);
  if(it==='red')listOf('pits').push({c:c.slice(),kind:'red'});
  else if(it==='wide')listOf('pits').push({c:c.slice(),kind:'red',wide:true});
  else if(it==='blue')listOf('pits').push({c:c.slice(),kind:'blue'});
  else if(it==='gap')listOf('gaps').push({c:c.slice()});
  else listOf('cracks').push({c:c.slice()});
  tidy();return null;
}
const itemThere=(c,it)=>{
  if(it==='seed')return hasSeed(c);
  if(it==='hole'||it==='shaft'){const si=segAt(c);if(si<0)return false;const f=lv.segs[si].floor;return linkAt(c,neighbor(c,it==='hole'?f:f^1))>=0}
  return floorItem(c)===it;
};

// ---------- Kurvor och rör ----------
// En kurva är en kvartscirkel i lagret: den går ut genom en vägg i rutan a och in genom en vägg i rutan b.
// Ett rör är ett glasrör utanför kuben: från en vägg i kubens yta till en annan. Banan kan ha flera av båda.
// ui.pick: det man håller på att välja ({tool, c, d} = första änden, {tool, ci/ti} = just skapad, där ett tryck
// på andra änden byter vägg).
const E_=k=>lv.extra[k]||[];
// Vad sidan d i rutan c används till: 'curve', 'tube', 'exit' eller null
function sideUse(c,d){
  const k=key(c),is=e=>key(e.c)===k&&e.d===d;
  if(E_('curves').some(C=>is(C.a)||is(C.b)))return 'curve';
  if(E_('tubes').some(T=>is(T.a)||is(T.b)))return 'tube';
  if(lv.exit&&is(lv.exit))return 'exit';
  if(E_('buttons').some(is))return 'button';
  if(E_('balldoors').some(is))return 'bdoor';
  if(E_('gates').some(is))return 'gate';
  return null;
}
// väggar i rutans plan som är lediga för en kurva eller ett rör (outside: bara väggar mot kubens utsida)
const freeSides=(c,outside)=>planeDirs(lv.segs[segAt(c)]).filter(d=>!openSame(c,d)&&!sideUse(c,d)&&(!outside||!inside(neighbor(c,d)))&&linkAt(c,neighbor(c,d))<0);
// Kvartscirkelns mittpunkt (i rutornas koordinater) för ändarna A och B, eller null om de inte bildar en.
// Bågen går ut ur A längs A.d och in i B mot B.d, så A.d och B.d står vinkelrätt i lagret och avståndet
// framåt är lika stort som åt sidan (radien, minst 1,5 rutor).
function curveCenter(A,B){
  const sa=segAt(A.c),sb=segAt(B.c);if(sa<0||sb<0)return null;
  const fa=segAxis(lv.segs[sa]),ia=DIRS[A.d][0],ib=DIRS[B.d][0];
  if(ia===fa||ib===fa||ia===ib||A.c[fa]!==B.c[fa])return null;
  const pa=A.c.slice(),pb=B.c.slice();pa[ia]+=DIRS[A.d][1]*.5;pb[ib]+=DIRS[B.d][1]*.5;
  const r1=(pb[ia]-pa[ia])*DIRS[A.d][1],r2=(pa[ib]-pb[ib])*DIRS[B.d][1];
  if(Math.abs(r1-r2)>1e-6||r1<1.4)return null;
  const c=[0,0,0];c[fa]=A.c[fa];c[ia]=pa[ia];c[ib]=pb[ib];
  return {center:c,r:r1,pa,pb};
}
// Punkter längs bågen (i rutornas koordinater), off = avstånd från mittlinjen utåt
function arcPts(cc,off=0,n=24){
  const u=[0,1,2].map(i=>(cc.pa[i]-cc.center[i])/cc.r),v=[0,1,2].map(i=>(cc.pb[i]-cc.center[i])/cc.r),pts=[];
  for(let i=0;i<=n;i++){const t=Math.PI/2*i/n,r=cc.r+off;pts.push([0,1,2].map(k=>cc.center[k]+u[k]*r*Math.cos(t)+v[k]*r*Math.sin(t)))}
  return pts;
}
// Varför kurvan inte går (text), eller null
function curveProblem(A,B){
  if(lv.segs[segAt(A.c)].floor!==lv.segs[segAt(B.c)].floor||A.c[segAxis(lv.segs[segAt(A.c)])]!==B.c[segAxis(lv.segs[segAt(B.c)])])
    return 'both ends must be in the same layer, in corridors with the same floor side.';
  if(openSame(A.c,A.d)||openSame(B.c,B.d))return 'a curve must go out through a wall.';
  const cc=curveCenter(A,B);if(!cc)return 'it must be a quarter circle: the ends must be as far apart forward as sideways (at least 1.5 cells).';
  for(const off of [-.45,0,.45])for(const q of arcPts(cc,off)){
    const cell=q.map(Math.round);if(key(cell)===key(A.c)||key(cell)===key(B.c))continue;
    if(!inside(cell))return 'it goes outside the cube.';
    if(segAt(cell)>=0)return 'it goes through another corridor at '+key(cell)+'.';
  }
  return null;
}
function curveTap(c){
  const si=segAt(c);
  if(si<0||segAxis(lv.segs[si])!==ui.axis){msg('Tap a corridor cell in this layer where the curve starts.');return}
  const P=ui.pick&&ui.pick.tool==='curve'?ui.pick:null, curves=E_('curves');
  // just skapad: ett tryck på andra änden byter vägg där (bland de väggar där kurvan går)
  if(P&&P.ci!=null&&curves[P.ci]&&key(curves[P.ci].b.c)===key(c)){
    const C=curves[P.ci],ok=planeDirs(lv.segs[si]).filter(d=>d===C.b.d||(!openSame(c,d)&&!sideUse(c,d)&&!curveProblem(C.a,{c,d})));
    C.b.d=ok[(ok.indexOf(C.b.d)+1)%ok.length];C.center=curveCenter(C.a,C.b).center;changed();msg('The curve comes in through the '+dirName(C.b.d)+' wall.');return;
  }
  // första änden vald: tryck igen byter vägg
  if(P&&P.c&&key(P.c)===key(c)){const ds=freeSides(c);P.d=ds[(ds.indexOf(P.d)+1)%ds.length];drawGrid();msg('The curve goes out through the '+dirName(P.d)+' wall. Now tap the cell where it ends.');return}
  if(P&&P.c){
    // andra änden: hitta väggar i båda ändarna som ger en kurva (helst den vägg som valts i första änden)
    if(segAt(P.c)<0){ui.pick=null;curveTap(c);return}
    const da=[P.d,...freeSides(P.c).filter(d=>d!==P.d)];let best=null,why=null;
    for(const a of da){for(const b of freeSides(c)){const w=curveProblem({c:P.c,d:a},{c,d:b});if(!w){best=[a,b];break}why=why||w}if(best)break}
    if(!best){msg('No curve fits here: '+(why||'there is no free wall.'));return}
    const C={a:{c:P.c.slice(),d:best[0]},b:{c:c.slice(),d:best[1]}};C.center=curveCenter(C.a,C.b).center;
    listOf('curves').push(C);ui.pick={tool:'curve',ci:curves.length};changed();
    msg('Curve made. Tap its end again to use another wall there, or tap a new cell to start another curve.');return;
  }
  // inget valt: ett tryck på en kurvas ände tar bort kurvan, annars börjar en ny kurva här
  const ci=curves.findIndex(C=>key(C.a.c)===key(c)||key(C.b.c)===key(c));
  if(ci>=0){curves.splice(ci,1);if(!curves.length)delete lv.extra.curves;ui.pick=null;changed();msg('Curve removed.');return}
  const ds=freeSides(c);if(!ds.length){msg('This cell has no free wall for a curve.');return}
  ui.pick={tool:'curve',c:c.slice(),d:ds[0]};drawGrid();save();
  msg('The curve goes out through the '+dirName(ds[0])+' wall (tap again for another wall). Now tap the cell where it ends.');
}
function tubeTap(c){
  const si=segAt(c);
  if(si<0||segAxis(lv.segs[si])!==ui.axis){msg('Tap a corridor cell at the outside of the cube.');return}
  const P=ui.pick&&ui.pick.tool==='tube'?ui.pick:null, tubes=E_('tubes');
  if(P&&P.ti!=null&&tubes[P.ti]&&key(tubes[P.ti].b.c)===key(c)){
    const T=tubes[P.ti],ds=[T.b.d,...freeSides(c,true)];T.b.d=ds[1%ds.length];
    changed();msg('The tube comes in through the '+dirName(T.b.d)+' wall.');return;
  }
  if(P&&P.c&&key(P.c)===key(c)){const ds=freeSides(c,true);P.d=ds[(ds.indexOf(P.d)+1)%ds.length];drawGrid();msg('The tube goes out through the '+dirName(P.d)+' wall. Now tap the cell where it comes back in (any layer).');return}
  if(P&&P.c){
    if(segAt(P.c)<0){ui.pick=null;tubeTap(c);return}
    const ds=freeSides(c,true);if(!ds.length){msg('A tube end must be at a wall on the outside of the cube.');return}
    listOf('tubes').push({a:{c:P.c.slice(),d:P.d},b:{c:c.slice(),d:ds[0]}});ui.pick={tool:'tube',ti:tubes.length};changed();
    msg('Tube made. Tap its end again to use another outside wall there.');return;
  }
  const ti=tubes.findIndex(T=>key(T.a.c)===key(c)||key(T.b.c)===key(c));
  if(ti>=0){tubes.splice(ti,1);if(!tubes.length)delete lv.extra.tubes;ui.pick=null;changed();msg('Tube removed.');return}
  const ds=freeSides(c,true);if(!ds.length){msg('A tube starts at a wall on the outside of the cube. This cell has none.');return}
  ui.pick={tool:'tube',c:c.slice(),d:ds[0]};drawGrid();save();
  msg('The tube goes out through the '+dirName(ds[0])+' wall (tap again for another). Now tap the cell where it comes back in – you can change layer first.');
}
// Rörets väg i 3D (rutans storlek 1, kubens mitt i origo): samma form som i spelet
function tubePts(T){
  const h=lv.N/2,P=c=>new THREE.Vector3(c[0]-h+.5,c[1]-h+.5,c[2]-h+.5),dv=d=>new THREE.Vector3().setComponent(DIRS[d][0],DIRS[d][1]);
  const na=dv(T.a.d),nb=dv(T.b.d),pa=P(T.a.c).addScaledVector(na,.5),pb=P(T.b.c).addScaledVector(nb,.5),m=pa.clone().add(pb).multiplyScalar(.5);
  let o=na.clone().add(nb);
  if(o.lengthSq()<.25){
    o=m.clone().addScaledVector(na,-m.dot(na));
    if(o.lengthSq()<.25){const ax=DIRS[T.a.d][0];o=new THREE.Vector3().setComponent(ax===1?2:1,1)}
    const a=[0,1,2].reduce((b,i)=>Math.abs(o.getComponent(i))>Math.abs(o.getComponent(b))?i:b,0);o=new THREE.Vector3().setComponent(a,Math.sign(o.getComponent(a)));
  }
  o.normalize();
  const ext=h*(Math.abs(o.x)+Math.abs(o.y)+Math.abs(o.z)),out=v=>v.addScaledVector(o,Math.max(0,ext+.58-v.dot(o)));
  const mid=out(m.clone().addScaledVector(o,-m.dot(o)).addScaledVector(o,ext+1.33));
  const pts=[pa,pa.clone().addScaledVector(na,.54)];
  if(na.dot(nb)<-.5)pts.push(out(pa.clone().addScaledVector(na,1)));
  pts.push(mid);
  if(na.dot(nb)<-.5)pts.push(out(pb.clone().addScaledVector(nb,1)));
  pts.push(pb.clone().addScaledVector(nb,.54),pb);
  return new THREE.CatmullRomCurve3(pts,false,'centripetal').getSpacedPoints(40);
}
// Rita kurvor och rörändar i rutnätet, och det man håller på att välja
function drawCurvesTubes(g){
  const toPx=q=>{const [col,row]=cellToGrid(q);return [(col+.5)*gs,(row+.5)*gs]};
  for(const C of E_('curves')){
    const sa=segAt(C.a.c);if(sa<0||segAxis(lv.segs[sa])!==ui.axis||C.a.c[ui.axis]!==ui.layer)continue;
    const cc=curveCenter(C.a,C.b);if(!cc)continue;
    const pts=arcPts(cc).map(toPx);
    g.lineCap='round';g.strokeStyle='#ff8c3a44';g.lineWidth=gs*.8;g.beginPath();pts.forEach((q,i)=>i?g.lineTo(...q):g.moveTo(...q));g.stroke();
    g.strokeStyle='#ff8c3a';g.lineWidth=2;g.beginPath();pts.forEach((q,i)=>i?g.lineTo(...q):g.moveTo(...q));g.stroke();g.lineCap='butt';
  }
  const sideBar=(c,d,color,txt)=>{
    if(c[ui.axis]!==ui.layer)return;const v=dirToScreen(d);if(!v)return;const [col,row]=cellToGrid(c),x=col*gs,y=row*gs;
    g.strokeStyle=color;g.lineWidth=6;g.beginPath();
    if(v[0]>0){g.moveTo(x+gs-3,y+4);g.lineTo(x+gs-3,y+gs-4)}else if(v[0]<0){g.moveTo(x+3,y+4);g.lineTo(x+3,y+gs-4)}
    else if(v[1]>0){g.moveTo(x+4,y+gs-3);g.lineTo(x+gs-4,y+gs-3)}else{g.moveTo(x+4,y+3);g.lineTo(x+gs-4,y+3)}g.stroke();
    if(txt){g.fillStyle=color;g.font=`bold ${Math.max(8,gs*.2)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,(col+.5+v[0]*.25)*gs,(row+.5+v[1]*.25)*gs)}
  };
  E_('tubes').forEach((T,i)=>{sideBar(T.a.c,T.a.d,'#7fe7ff','T'+(i+1));sideBar(T.b.c,T.b.d,'#7fe7ff','T'+(i+1))});
  // det man håller på att välja: streckad ram och väggen
  const P=ui.pick;
  if(P&&P.c&&(P.tool==='curve'||P.tool==='tube')&&P.tool===subTool()&&P.c[ui.axis]===ui.layer){
    const [col,row]=cellToGrid(P.c);g.setLineDash([5,4]);g.strokeStyle='#ffd166';g.lineWidth=2.5;g.strokeRect(col*gs+3,row*gs+3,gs-6,gs-6);g.setLineDash([]);
    sideBar(P.c,P.d,P.tool==='tube'?'#7fe7ff':'#ff8c3a','');
  }
}

// ---------- Onda hamstrar och el ----------
// Port (gates): en lucka i en vägg där en ond hamster rullar ut, och två rutor den patrullerar mellan.
// Grå hamster (enemies): en ond hamster utan port som finns från början och patrullerar mellan två rutor.
// Hjul (wheels): {c, open: sidan mot gången, run: hållet hamstern springer}. Alla hjul laddar samma batteri.
// Dörr (doors): {a, b} två rutor bredvid varandra i samma gång. Hiss (lifts): {a: övre, b: undre} rakt under i golvets riktning.
const subTool=()=>({paths:ui.path,enemies:ui.enemy,power:ui.power,puzzle:ui.puzzle})[ui.tool]||ui.tool;
const sameCell=(a,b)=>key(a)===key(b);
function inThisView(c,what){
  const si=segAt(c);
  if(si<0){msg('Tap a corridor cell'+(what?' '+what:'')+'.');return -1}
  if(segAxis(lv.segs[si])!==ui.axis){msg('Switch to '+AXN[segAxis(lv.segs[si])]+' to work on that corridor.');return -1}
  return si;
}
function gateTap(c){
  const si=inThisView(c);if(si<0)return;
  const gates=E_('gates'),P=ui.pick&&ui.pick.tool==='gate'?ui.pick:null,G=P?gates[P.gi]:null;
  if(G){
    // porten just satt: tryck på den igen = annan vägg; annars de två patrullrutorna
    if(sameCell(G.c,c)&&!G.patrol.length){const ds=[G.d,...freeSides(c)];G.d=ds[1%ds.length];changed();msg('The gate is in the '+dirName(G.d)+' wall. Now tap the first patrol cell.');return}
    if(segAt(c)!==segAt(G.c)){msg('The patrol cells must be in the same corridor as the gate.');return}
    G.patrol.push(c.slice());
    if(G.patrol.length>=2){ui.pick=null;changed();msg('Gate done. The grey hamster patrols between ① and ②.');}
    else{changed();msg('Now tap the second patrol cell.')}
    return;
  }
  const gi=gates.findIndex(G=>sameCell(G.c,c));
  if(gi>=0){gates.splice(gi,1);if(!gates.length)delete lv.extra.gates;ui.pick=null;changed();msg('Gate removed.');return}
  const ds=freeSides(c);if(!ds.length){msg('This cell has no free wall for a gate.');return}
  listOf('gates').push({c:c.slice(),d:ds[0],patrol:[]});ui.pick={tool:'gate',gi:E_('gates').length-1};changed();
  msg('Gate in the '+dirName(ds[0])+' wall (tap it again for another wall). Now tap the first patrol cell.');
}
function greyTap(c){
  const si=inThisView(c);if(si<0)return;
  const list=E_('enemies'),P=ui.pick&&ui.pick.tool==='grey'?ui.pick:null;
  if(P){
    const E=list[P.ei];if(segAt(c)!==segAt(E.patrol[0])){msg('Both patrol cells must be in the same corridor.');return}
    E.patrol.push(c.slice());ui.pick=null;changed();msg('Grey hamster done. It starts at ① and patrols to ②.');return;
  }
  const ei=list.findIndex(E=>sameCell(E.patrol[0],c));
  if(ei>=0){list.splice(ei,1);if(!list.length)delete lv.extra.enemies;changed();msg('Grey hamster removed.');return}
  listOf('enemies').push({patrol:[c.slice()]});ui.pick={tool:'grey',ei:E_('enemies').length-1};changed();
  msg('The grey hamster starts here (①). Now tap the cell it patrols to (②).');
}
// Hjul: tryck byter mellan alla sätt (öppning mot en grannruta i gången, och springriktning åt ena eller andra sidan), sist borta
function wheelTap(c){
  const si=inThisView(c);if(si<0)return;
  const ways=[];
  for(const o of planeDirs(lv.segs[si]))if(openSame(c,o))for(const r of planeDirs(lv.segs[si]))if(DIRS[r][0]!==DIRS[o][0])ways.push({open:o,run:r});
  if(!ways.length){msg('A wheel needs a corridor cell next to it, where the hamster rolls in.');return}
  const list=listOf('wheels'),wi=list.findIndex(W=>sameCell(W.c,c));
  if(wi<0){list.push({c:c.slice(),...ways[0]});changed();msg('Wheel: open towards '+dirName(ways[0].open)+', the hamster runs '+dirName(ways[0].run)+'. Tap again to turn it.');return}
  const W=list[wi],i=ways.findIndex(w=>w.open===W.open&&w.run===W.run);
  if(i+1>=ways.length){list.splice(wi,1);if(!list.length)delete lv.extra.wheels;changed();msg('Wheel removed.');return}
  Object.assign(W,ways[i+1]);changed();msg('Wheel: open towards '+dirName(W.open)+', the hamster runs '+dirName(W.run)+'.');
}
// Dörr: mellan rutan och en grannruta i samma gång; tryck flyttar den till nästa grannruta, sist borta
function doorTap(c){
  const si=inThisView(c);if(si<0)return;
  const nbs=planeDirs(lv.segs[si]).filter(d=>openSame(c,d)).map(d=>neighbor(c,d));
  if(!nbs.length){msg('A door goes between two cells next to each other in the same corridor.');return}
  const list=listOf('doors'),has=n=>list.findIndex(D=>(sameCell(D.a,c)&&sameCell(D.b,n))||(sameCell(D.a,n)&&sameCell(D.b,c)));
  const cur=nbs.findIndex(n=>has(n)>=0);
  if(cur>=0)list.splice(has(nbs[cur]),1);
  const next=cur+1<nbs.length?nbs[cur+1]:null;
  if(next){list.push({a:c.slice(),b:next.slice()});msg('Door between '+key(c)+' and '+key(next)+'. Tap again to move it.')}
  else msg('Door removed.');
  if(!list.length)delete lv.extra.doors;changed();
}
// Hiss: övre rutan, sedan (i ett annat lager) rutan rakt under i golvets riktning
function liftTap(c){
  const si=inThisView(c,'for the lift');if(si<0)return;
  const P=ui.pick&&ui.pick.tool==='lift'?ui.pick:null;
  if(P&&!sameCell(P.c,c)){
    const sa=segAt(P.c);if(sa<0){ui.pick=null;return}
    const fd=lv.segs[sa].floor,a=DIRS[fd][0],sg=DIRS[fd][1];
    const straight=[0,1,2].every(i=>i===a||P.c[i]===c[i]), steps=(c[a]-P.c[a])*sg;
    if(!straight||steps<1){msg('The lower cell must be right below the upper one (in the direction of its floor). Change layer with − and +.');return}
    if(lv.segs[si].floor!==fd){msg('Both lift cells must be in corridors with the same floor side.');return}
    for(let k=1;k<steps;k++){const m=P.c.slice();m[a]+=sg*k;if(segAt(m)>=0){msg('The lift shaft would go through a corridor at '+key(m)+'.');return}}
    listOf('lifts').push({a:P.c.slice(),b:c.slice()});ui.pick=null;changed();msg('Lift made. Every ride costs a full battery.');return;
  }
  const list=E_('lifts'),li=list.findIndex(L=>sameCell(L.a,c)||sameCell(L.b,c));
  if(li>=0&&!P){list.splice(li,1);if(!list.length)delete lv.extra.lifts;changed();msg('Lift removed.');return}
  ui.pick={tool:'lift',c:c.slice(),d:-1};drawGrid();save();
  msg('Upper lift cell chosen. Now go to the layer below (−/+) and tap the cell right below it.');
}
// Rita portar, patrullvägar, hjul, dörrar och hissar i rutnätet
function drawEnemiesPower(g){
  const here=c=>c[ui.axis]===ui.layer&&segAt(c)>=0&&segAxis(lv.segs[segAt(c)])===ui.axis;
  const mid=c=>{const [col,row]=cellToGrid(c);return [(col+.5)*gs,(row+.5)*gs]};
  const badge=(c,txt,bg,fg='#fff',dx=0,dy=0)=>{const [x,y]=mid(c);g.fillStyle=bg;g.beginPath();g.arc(x+dx*gs,y+dy*gs,gs*.17,0,Math.PI*2);g.fill();
    g.fillStyle=fg;g.font=`bold ${Math.max(8,gs*.2)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,x+dx*gs,y+dy*gs+1)};
  const dashed=(a,b,color)=>{if(!here(a)||!here(b))return;g.setLineDash([4,4]);g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(...mid(a));g.lineTo(...mid(b));g.stroke();g.setLineDash([])};
  const wallBar=(c,d,color,w=6)=>{
    if(!here(c))return;const v=dirToScreen(d);if(!v)return;const [col,row]=cellToGrid(c),x=col*gs,y=row*gs;
    g.strokeStyle=color;g.lineWidth=w;g.beginPath();
    if(v[0]>0){g.moveTo(x+gs-3,y+gs*.25);g.lineTo(x+gs-3,y+gs*.75)}else if(v[0]<0){g.moveTo(x+3,y+gs*.25);g.lineTo(x+3,y+gs*.75)}
    else if(v[1]>0){g.moveTo(x+gs*.25,y+gs-3);g.lineTo(x+gs*.75,y+gs-3)}else{g.moveTo(x+gs*.25,y+3);g.lineTo(x+gs*.75,y+3)}g.stroke();
  };
  E_('gates').forEach((G,i)=>{
    wallBar(G.c,G.d,'#9aa8b5',9);if(here(G.c))badge(G.c,'G'+(i+1),'#4a5866','#fff',-.22,-.22);
    const [p1,p2]=G.patrol||[];if(p1&&here(p1))badge(p1,'①','#ff4d5e');if(p2&&here(p2))badge(p2,'②','#ff4d5e');
    if(p1&&p2)dashed(p1,p2,'#ff4d5e');
  });
  for(const E of E_('enemies')){
    const [p1,p2]=E.patrol||[];if(p1&&here(p1))badge(p1,'①','#8a96a2');if(p2&&here(p2))badge(p2,'②','#8a96a2');if(p1&&p2)dashed(p1,p2,'#c4ccd4');
  }
  for(const W of E_('wheels')){
    if(!here(W.c))continue;const [x,y]=mid(W.c),v=dirToScreen(W.run)||[0,0];
    g.strokeStyle='#c9d6e3';g.lineWidth=2.5;g.beginPath();g.arc(x,y,gs*.32,0,Math.PI*2);g.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(x-Math.cos(a)*gs*.32,y-Math.sin(a)*gs*.32);g.lineTo(x+Math.cos(a)*gs*.32,y+Math.sin(a)*gs*.32);g.stroke()}
    g.strokeStyle='#4ade80';g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+v[0]*gs*.45,y+v[1]*gs*.45);g.stroke();   // springriktningen (batteriet sitter där)
  }
  for(const D of E_('doors')){
    for(const [c,o] of [[D.a,D.b],[D.b,D.a]]){const d=DIRS.findIndex((_,d)=>key(neighbor(c,d))===key(o));if(d>=0)wallBar(c,d,'#d98a2b',7)}
  }
  E_('lifts').forEach((L,i)=>{
    for(const [c,t] of [[L.a,'▼'],[L.b,'▲']]){if(!here(c))continue;const [col,row]=cellToGrid(c);
      g.strokeStyle='#ffd23a';g.lineWidth=3;g.strokeRect(col*gs+4,row*gs+4,gs-8,gs-8);badge(c,'L'+(i+1)+t,'#ffd23a','#06121f',.18,.22)}
  });
  // hissens övre ruta vald: markera den (även i andra lager syns den i 3D)
  const P=ui.pick;if(P&&P.tool==='lift'&&subTool()==='lift'&&here(P.c)){const [col,row]=cellToGrid(P.c);g.setLineDash([5,4]);g.strokeStyle='#ffd23a';g.lineWidth=2.5;g.strokeRect(col*gs+3,row*gs+3,gs-6,gs-6);g.setLineDash([])}
}

// ---------- Skyltar ----------
// {c, ahead, point, text}: hänger från taket vid öppningen 'ahead' (mot nästa ruta), så att den syns när man
// rullar dit. Pilen pekar åt 'point' (vänster eller höger sett av den som tittar mot skylten). Bara text och pil.
const signSides=c=>planeDirs(lv.segs[segAt(c)]).filter(d=>openSame(c,d)||sideUse(c,d));
// höger för den som tittar åt 'ahead' med huvudet bort från golvet
function rightDir(ahead,floor){
  const a=[0,0,0],u=[0,0,0];a[DIRS[ahead][0]]=DIRS[ahead][1];u[DIRS[floor^1][0]]=DIRS[floor^1][1];
  const r=[a[1]*u[2]-a[2]*u[1],a[2]*u[0]-a[0]*u[2],a[0]*u[1]-a[1]*u[0]],ax=r.findIndex(v=>v!==0);
  return dirIndex(ax,r[ax]);
}
const signFloor=S=>lv.segs[segAt(S.c)].floor;
function signTap(c){
  const si=inThisView(c);if(si<0)return;
  const signs=E_('signs'),i=signs.findIndex(S=>sameCell(S.c,c)),ds=signSides(c),fl=lv.segs[si].floor;
  if(i<0){
    if(!ds.length){msg('A sign hangs at an opening to the next cell. This cell has none.');return}
    listOf('signs').push({c:c.slice(),ahead:ds[0],point:rightDir(ds[0],fl),text:'THIS WAY'});ui.signSel=E_('signs').length-1;changed();
    msg('Sign placed. Write its text and choose the arrow below. Tap the cell again to hang it at another opening.');return;
  }
  // redan vald: flytta till nästa öppning (pilen behåller sidan)
  if(ui.signSel===i&&ds.length>1){
    const S=signs[i],right=S.point===rightDir(S.ahead,fl);S.ahead=ds[(ds.indexOf(S.ahead)+1)%ds.length];
    S.point=right?rightDir(S.ahead,fl):rightDir(S.ahead,fl)^1;changed();msg('The sign now hangs at the '+dirName(S.ahead)+' opening.');
  }else{ui.signSel=i;save();drawGrid();showSign();msg('Sign chosen. Tap the cell again to hang it at another opening.')}
}
function showSign(){
  const S=E_('signs')[ui.signSel],on=ui.tool==='items'&&ui.item==='sign'&&!!S&&segAt(S.c)>=0;
  $('signPanel').classList.toggle('hide',!on);if(!on)return;
  const inp=$('signText');if(document.activeElement!==inp)inp.value=S.text||'';
  const right=S.point===rightDir(S.ahead,signFloor(S));
  for(const b of document.querySelectorAll('#signPanel [data-arrow]')){const o=(b.dataset.arrow==='right')===right;b.classList.toggle('on',o);b.setAttribute('aria-pressed',o)}
}
$('signText').oninput=()=>{const S=E_('signs')[ui.signSel];if(!S)return;S.text=$('signText').value.toUpperCase().slice(0,16);save();drawGrid();build3d()};
$('signText').onchange=()=>snapshot();
for(const b of document.querySelectorAll('#signPanel [data-arrow]'))b.onclick=()=>{
  const S=E_('signs')[ui.signSel];if(!S)return;const r=rightDir(S.ahead,signFloor(S));S.point=b.dataset.arrow==='right'?r:r^1;changed();showSign();
};
$('signDel').onclick=()=>{const signs=E_('signs');if(!signs[ui.signSel])return;signs.splice(ui.signSel,1);if(!signs.length)delete lv.extra.signs;ui.signSel=-1;changed();showSign();msg('Sign removed.')};
function drawSigns(g){
  E_('signs').forEach((S,i)=>{
    if(S.c[ui.axis]!==ui.layer||segAt(S.c)<0||segAxis(lv.segs[segAt(S.c)])!==ui.axis)return;
    const v=dirToScreen(S.ahead),w=dirToScreen(S.point);if(!v||!w)return;
    const [col,row]=cellToGrid(S.c),cx=(col+.5+v[0]*.32)*gs,cy=(row+.5+v[1]*.32)*gs;
    // skylten: en gul list tvärs över öppningen, med pilen åt sidan
    const len=gs*.62,th=gs*.16;g.fillStyle=i===ui.signSel&&ui.item==='sign'&&ui.tool==='items'?'#ffd166':'#0b2a4a';
    g.strokeStyle='#ffd166';g.lineWidth=2;
    const rw=v[0]?th:len,rh=v[0]?len:th;g.fillRect(cx-rw/2,cy-rh/2,rw,rh);g.strokeRect(cx-rw/2,cy-rh/2,rw,rh);
    const ax=cx+w[0]*len*.5,ay=cy+w[1]*len*.5;g.fillStyle='#ffd166';g.beginPath();
    g.moveTo(ax+w[0]*gs*.14,ay+w[1]*gs*.14);g.lineTo(ax-w[1]*gs*.1,ay+w[0]*gs*.1);g.lineTo(ax+w[1]*gs*.1,ay-w[0]*gs*.1);g.closePath();g.fill();
  });
}

// ---------- Pusslet: knappar och grindar, trälådor, kuldörrar och nycklar ----------
// Knapp {c, d, g}: på sidoväggen d i rutan c; öppnar grinden grates[g] (med fullt batteri). Grind {a, b}: mellan två rutor.
// En ny grind kopplas till den valda knappen (den man satte eller tryckte på senast). Låda och nyckel: en ruta.
// Kuldörr {c, d}: i väggen d; släpper ut en stålkula när den låses upp med en nyckel.
function removeGrate(i){
  const gr=E_('grates');gr.splice(i,1);if(!gr.length)delete lv.extra.grates;
  for(const B of E_('buttons')){if(B.g===i)B.g=-1;else if(B.g>i)B.g--}
}
// väggar i rutan för en knapp eller kuldörr (den egna väggen räknas som ledig)
const wallChoices=(c,own)=>planeDirs(lv.segs[segAt(c)]).filter(d=>!openSame(c,d)&&linkAt(c,neighbor(c,d))<0&&(d===own||!sideUse(c,d)));
function puzzleTap(c){
  const si=inThisView(c);if(si<0)return;
  const it=ui.puzzle;
  if(it==='button'||it==='bdoor'){
    const K=it==='button'?'buttons':'balldoors',list=E_(K),i=list.findIndex(B=>sameCell(B.c,c)),name=it==='button'?'Button':'Ball door';
    if(i<0){
      const ds=wallChoices(c,-1);if(!ds.length){msg('This cell has no free wall for a '+name.toLowerCase()+'.');return}
      listOf(K).push(it==='button'?{c:c.slice(),d:ds[0],g:-1}:{c:c.slice(),d:ds[0]});
      if(it==='button')ui.btnSel=E_('buttons').length-1;
      changed();msg(it==='button'?`Button ${ui.btnSel+1} on the ${dirName(ds[0])} wall. Now place the gate it opens with 🚧 Gate. Tap the button again for another wall.`:'Ball door on the '+dirName(ds[0])+' wall. It needs a key 🔑. Tap again for another wall.');return;
    }
    // knappen väljs först (så att nya grindar kopplas till den); sedan byter tryck vägg, och sist tas den bort
    if(it==='button'&&ui.btnSel!==i){ui.btnSel=i;save();drawGrid();msg(`Button ${i+1} chosen. Gates you place now open with it. Tap again for another wall.`);return}
    const B=list[i],ds=wallChoices(c,B.d),j=ds.indexOf(B.d);
    if(j+1<ds.length){B.d=ds[j+1];changed();msg(name+' on the '+dirName(B.d)+' wall.');return}
    if(it==='button'){list.splice(i,1);if(!list.length)delete lv.extra.buttons;
      // grindarnas nummer följer knapparna: inget att räkna om, men den valda knappen försvinner
      ui.btnSel=-1}else{list.splice(i,1);if(!list.length)delete lv.extra.balldoors}
    changed();msg(name+' removed.');return;
  }
  if(it==='grate'){
    const nbs=planeDirs(lv.segs[si]).filter(d=>openSame(c,d)).map(d=>neighbor(c,d));
    if(!nbs.length){msg('A gate goes between two cells next to each other in the same corridor.');return}
    const gr=E_('grates'),has=n=>gr.findIndex(G=>(sameCell(G.a,c)&&sameCell(G.b,n))||(sameCell(G.a,n)&&sameCell(G.b,c)));
    const cur=nbs.findIndex(n=>has(n)>=0),btn=E_('buttons')[ui.btnSel];
    // en grind som redan finns: koppla den till den valda knappen om den inte redan är det
    if(cur>=0&&btn&&btn.g!==has(nbs[cur])){btn.g=has(nbs[cur]);changed();msg(`Gate ${btn.g+1} now opens with button ${ui.btnSel+1}.`);return}
    let gi=-1;if(cur>=0){gi=has(nbs[cur]);removeGrate(gi)}
    const next=cur+1<nbs.length?nbs[cur+1]:null;
    if(next){
      listOf('grates').push({a:c.slice(),b:next.slice()});const ni=E_('grates').length-1;
      const b2=E_('buttons')[ui.btnSel]||E_('buttons').find(B=>B.g===gi);if(b2)b2.g=ni;
      msg(b2?`Gate opened by button ${E_('buttons').indexOf(b2)+1}. Tap again to move it.`:'Gate placed, but no button is chosen: tap a button first (🔘 Button) and then the gate.');
    }else msg('Gate removed.');
    changed();return;
  }
  // låda och nyckel: tryck sätter eller tar bort
  const K=it==='box'?'boxes':'keys',list=E_(K),i=list.findIndex(q=>sameCell(q,c));
  if(i>=0){list.splice(i,1);if(!list.length)delete lv.extra[K];msg((it==='box'?'Box':'Key')+' removed.')}
  else{
    if(it==='box'&&lv.start&&sameCell(lv.start.c,c)){msg('Not on the start.');return}
    listOf(K).push(c.slice());msg(it==='box'?'Wooden box placed. The hamster or a steel ball pushes it one cell at a time.':'Key placed. A key opens one ball door.');
  }
  changed();
}
function drawPuzzle(g){
  const here=c=>c[ui.axis]===ui.layer&&segAt(c)>=0&&segAxis(lv.segs[segAt(c)])===ui.axis;
  const mid=c=>{const [col,row]=cellToGrid(c);return [(col+.5)*gs,(row+.5)*gs]};
  const atWall=(c,d,f)=>{const v=dirToScreen(d);if(!v)return;const [x,y]=mid(c);f(x+v[0]*gs*.38,y+v[1]*gs*.38,v)};
  const label=(x,y,t,col)=>{g.fillStyle=col;g.font=`bold ${Math.max(8,gs*.19)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(t,x,y)};
  for(const c of E_('boxes')){if(!here(c))continue;const [x,y]=mid(c),h=gs*.34;g.fillStyle='#a8743f';g.fillRect(x-h,y-h,2*h,2*h);g.strokeStyle='#5c3a18';g.lineWidth=2;g.strokeRect(x-h,y-h,2*h,2*h);g.beginPath();g.moveTo(x-h,y-h);g.lineTo(x+h,y+h);g.moveTo(x+h,y-h);g.lineTo(x-h,y+h);g.stroke()}
  for(const c of E_('keys')){if(!here(c))continue;const [x,y]=mid(c);g.font=`${Math.max(10,gs*.32)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('🔑',x-gs*.18,y+gs*.2)}
  E_('buttons').forEach((B,i)=>{if(!here(B.c))return;atWall(B.c,B.d,(x,y,v)=>{
    g.fillStyle='#ff4d5e';g.beginPath();g.arc(x,y,gs*.13,0,Math.PI*2);g.fill();
    if(i===ui.btnSel&&ui.tool==='puzzle'){g.strokeStyle='#ffd166';g.lineWidth=3;g.beginPath();g.arc(x,y,gs*.19,0,Math.PI*2);g.stroke()}
    label(x-v[0]*gs*.22,y-v[1]*gs*.22,'B'+(i+1),'#ffb3bb')})});
  E_('grates').forEach((G,i)=>{
    const d=DIRS.findIndex((_,d)=>key(neighbor(G.a,d))===key(G.b));if(d<0)return;
    const bi=E_('buttons').findIndex(B=>B.g===i),t=bi>=0?'B'+(bi+1):'?';
    let named=false;for(const [c,dd] of [[G.a,d],[G.b,d^1]]){if(!here(c))continue;const v=dirToScreen(dd);if(!v)continue;const [x,y]=mid(c),ex2=x+v[0]*gs*.5,ey2=y+v[1]*gs*.5;
      g.strokeStyle='#c4ccd4';g.lineWidth=2;for(let k2=-2;k2<=2;k2++){const o2=k2*gs*.09;g.beginPath();if(v[0]){g.moveTo(ex2-3,ey2+o2);g.lineTo(ex2+3,ey2+o2)}else{g.moveTo(ex2+o2,ey2-3);g.lineTo(ex2+o2,ey2+3)}g.stroke()}
      g.lineWidth=4;g.beginPath();if(v[0]){g.moveTo(ex2,ey2-gs*.3);g.lineTo(ex2,ey2+gs*.3)}else{g.moveTo(ex2-gs*.3,ey2);g.lineTo(ex2+gs*.3,ey2)}g.stroke();
      if(!named){named=true;label(x+v[0]*gs*.22,y+v[1]*gs*.22+gs*.2,'🚧'+t,'#e6ebf0')}}
  });
  for(const B of E_('balldoors')){if(!here(B.c))continue;atWall(B.c,B.d,(x,y)=>{g.fillStyle='#c9a227';g.beginPath();g.arc(x,y,gs*.15,0,Math.PI*2);g.fill();g.fillStyle='#1a1206';g.beginPath();g.arc(x,y-gs*.03,gs*.04,0,Math.PI*2);g.fill();g.fillRect(x-gs*.02,y-gs*.02,gs*.04,gs*.08)})}
}

// ---------- Kontroll ----------
function check(){
  const errs=[],warns=[];
  if(!lv.segs.length)errs.push('There are no corridors yet.');
  if(!lv.start)errs.push('There is no start. Use 🐹 Start/Exit.');
  else if(segAt(lv.start.c)<0)errs.push('The start is not in a corridor.');
  if(!lv.exit)errs.push('There is no exit. Use 🐹 Start/Exit.');
  else if(segAt(lv.exit.c)<0)errs.push('The exit is not in a corridor.');
  else if(openSame(lv.exit.c,lv.exit.d))errs.push('The exit is not in a wall.');
  // gångar som är delade i flera bitar (bitar som hänger ihop genom en kurva räknas som hela)
  const E=lv.extra;
  lv.segs.forEach((s,i)=>{
    const seen=new Set([key(s.cells[0])]),q=[s.cells[0]];
    while(q.length){const c=q.pop();
      const nb=[0,1,2,3,4,5].map(d=>neighbor(c,d));
      for(const C of E.curves||[]){if(key(C.a.c)===key(c))nb.push(C.b.c);if(key(C.b.c)===key(c))nb.push(C.a.c)}
      for(const n of nb)if(segAt(n)===i&&!seen.has(key(n))){seen.add(key(n));q.push(n)}}
    if(seen.size<s.cells.length)warns.push(`Corridor ${i+1} is in separate parts. They work as separate rooms; draw them as separate corridors to be clear.`);
  });
  // saker som pekar på rutor som inte finns
  const miss=(what,c)=>{if(segAt(c)<0)errs.push(`${what} at ${key(c)} is not in a corridor.`)};
  (E.curves||[]).forEach((C,i)=>{
    if(segAt(C.a.c)<0||segAt(C.b.c)<0){errs.push(`Curve ${i+1} has an end outside the corridors.`);return}
    const why=curveProblem(C.a,C.b);if(why)errs.push(`Curve ${i+1}: ${why}`);
  });
  (E.tubes||[]).forEach((T,i)=>{
    for(const e of [T.a,T.b]){
      if(segAt(e.c)<0)errs.push(`Tube ${i+1} has an end outside the corridors.`);
      else if(inside(neighbor(e.c,e.d)))errs.push(`Tube ${i+1}: the end at ${key(e.c)} is not at the outside of the cube.`);
    }
  });
  const TP=(E.tubes||[]).map(tubePts);
  for(let i=0;i<TP.length;i++)for(let j=i+1;j<TP.length;j++){
    let near=Infinity;for(const a of TP[i])for(const b of TP[j])near=Math.min(near,a.distanceTo(b));
    if(near<.55)warns.push(`Tube ${i+1} and tube ${j+1} come very close to each other outside the cube.`);
  }
  if(lv.exit&&['curve','tube'].includes(sideUse(lv.exit.c,lv.exit.d)))errs.push('The exit is in the same wall as a '+sideUse(lv.exit.c,lv.exit.d)+'.');
  (E.gates||[]).forEach((G,i)=>{miss('Gate '+(i+1),G.c);for(const c of G.patrol||[])miss('A patrol cell of gate '+(i+1),c);
    if((G.patrol||[]).length<2)errs.push(`Gate ${i+1} needs two patrol cells (tap them with 🚪 Gate).`);
    else if(G.patrol.some(q=>segAt(q)!==segAt(G.c)))errs.push(`Gate ${i+1}: the patrol cells must be in the same corridor as the gate.`);
    if(segAt(G.c)>=0&&openSame(G.c,G.d))errs.push(`Gate ${i+1} is not in a wall.`)});
  (E.enemies||[]).forEach((G,i)=>{for(const c of G.patrol||[])miss('A patrol cell of grey hamster '+(i+1),c);
    if((G.patrol||[]).length<2)errs.push(`Grey hamster ${i+1} needs two patrol cells.`)});
  (E.wheels||[]).forEach((W,i)=>{miss('Wheel '+(i+1),W.c);if(segAt(W.c)>=0&&!openSame(W.c,W.open))errs.push(`Wheel ${i+1} does not open towards the corridor.`)});
  (E.doors||[]).forEach((D,i)=>{miss('Door '+(i+1),D.a);miss('Door '+(i+1),D.b);
    if(segAt(D.a)>=0&&!DIRS.some((_,d)=>key(neighbor(D.a,d))===key(D.b)&&openSame(D.a,d)))errs.push(`Door ${i+1} is not between two cells next to each other in a corridor.`)});
  (E.lifts||[]).forEach((L,i)=>{miss('Lift '+(i+1),L.a);miss('Lift '+(i+1),L.b);
    if(segAt(L.a)>=0&&segAt(L.b)>=0&&lv.segs[segAt(L.a)].floor!==lv.segs[segAt(L.b)].floor)errs.push(`Lift ${i+1}: both cells must have the same floor side.`)});
  if(((E.doors||[]).length||(E.lifts||[]).length)&&!(E.wheels||[]).length)errs.push('There are doors or lifts but no hamster wheel to charge the battery.');
  // pusslet
  (E.buttons||[]).forEach((B,i)=>{miss('Button '+(i+1),B.c);if(!(E.grates||[])[B.g])warns.push(`Button ${i+1} does not open any gate.`)});
  (E.grates||[]).forEach((G,i)=>{miss('Gate '+(i+1),G.a);miss('Gate '+(i+1),G.b);
    if(!(E.buttons||[]).some(B=>B.g===i))warns.push(`Gate ${i+1} has no button, so it never opens.`)});
  if((E.buttons||[]).length&&!(E.wheels||[]).length)errs.push('Buttons need a full battery: add a hamster wheel.');
  for(const c of E.boxes||[])miss('A box',c);for(const c of E.keys||[])miss('A key',c);
  (E.balldoors||[]).forEach((B,i)=>miss('Ball door '+(i+1),B.c));
  if((E.balldoors||[]).length>(E.keys||[]).length)warns.push('There are more ball doors than keys, so some ball doors can never be opened.');
  if(lv.start&&(E.boxes||[]).some(q=>key(q)===key(lv.start.c)))errs.push('A box stands on the start.');
  (E.signs||[]).forEach((S,i)=>{miss('Sign '+(i+1),S.c);
    if(segAt(S.c)>=0&&!signSides(S.c).includes(S.ahead))errs.push(`Sign ${i+1} does not hang at an opening.`);
    if(!(S.text||'').trim())warns.push(`Sign ${i+1} has no text.`)});
  for(const l of lv.links)if(segAt(l[0])<0||segAt(l[1])<0)errs.push(`A hole or shaft at ${key(l[0])} has no corridor at one end.`);
  for(const P of E.pits||[]){
    const si=segAt(P.c);if(si<0){errs.push(`A ${P.kind} hole at ${key(P.c)} is not in a corridor.`);continue}
    const n=neighbor(P.c,lv.segs[si].floor);
    if(P.kind==='blue'&&!(inside(n)&&segAt(n)>=0&&segAt(n)!==si))errs.push(`The blue hole at ${key(P.c)} has no corridor below it.`);
  }
  if(lv.start&&floorItem(lv.start.c))warns.push('The start is on a '+ITEM_NAMES[floorItem(lv.start.c)]+'.');
  if(lv.exit&&floorItem(lv.exit.c))warns.push('The exit is in a cell with a '+ITEM_NAMES[floorItem(lv.exit.c)]+'.');
  // når man utgången? (åt alla håll, oavsett hur kuben behöver vändas)
  if(!errs.length){
    const adj=new Map(),link=(a,b)=>{for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(key(x)))adj.set(key(x),[]);adj.get(key(x)).push(y)}};
    for(const l of lv.links)link(l[0],l[1]);
    for(const C of E.curves||[])link(C.a.c,C.b.c);
    for(const L of E.lifts||[])link(L.a,L.b);
    for(const p of E.pits||[])if(p.kind==='blue'){const si=segAt(p.c);if(si>=0)link(p.c,neighbor(p.c,lv.segs[si].floor))}
    for(const D of [...(E.doors||[]),...(E.grates||[])])link(D.a,D.b);
    // hål i golvet och sprucket glas: faller ner i en gång under med samma golv
    for(const H of [...(E.gaps||[]),...(E.cracks||[])]){const si=segAt(H.c);if(si<0)continue;const n=neighbor(H.c,lv.segs[si].floor),ns=segAt(n);
      if(inside(n)&&ns>=0&&lv.segs[ns].floor===lv.segs[si].floor)link(H.c,n)}
    for(const T of E.tubes||[])link(T.a.c,T.b.c);
    const seen=new Set([key(lv.start.c)]),q=[lv.start.c];
    while(q.length){const c=q.pop();const nb=[...(adj.get(key(c))||[])];for(let d=0;d<6;d++)if(openSame(c,d))nb.push(neighbor(c,d));
      for(const n of nb)if(segAt(n)>=0&&!seen.has(key(n))){seen.add(key(n));q.push(n)}}
    if(!seen.has(key(lv.exit.c)))errs.push('The exit cannot be reached from the start. Connect the corridors with holes or shafts.');
    const lone=lv.segs.map((s,i)=>i).filter(i=>!lv.segs[i].cells.some(c=>seen.has(key(c))));
    if(lone.length)warns.push('Corridor '+lone.map(i=>i+1).join(', ')+' cannot be reached from the start.');
    // finns det ett hjul att ladda i innan första dörren eller hissen? (dörrar och hissar stängda)
    if((E.wheels||[]).length&&((E.doors||[]).length||(E.lifts||[]).length)){
      const door=(a,b)=>(E.doors||[]).some(D=>(key(D.a)===key(a)&&key(D.b)===key(b))||(key(D.a)===key(b)&&key(D.b)===key(a)));
      const lift=(a,b)=>(E.lifts||[]).some(L=>(key(L.a)===key(a)&&key(L.b)===key(b))||(key(L.a)===key(b)&&key(L.b)===key(a)));
      const s2=new Set([key(lv.start.c)]),q2=[lv.start.c];
      while(q2.length){const c=q2.pop();const nb=[...(adj.get(key(c))||[])].filter(n=>!lift(c,n));for(let d=0;d<6;d++)if(openSame(c,d)&&!door(c,neighbor(c,d)))nb.push(neighbor(c,d));
        for(const n of nb)if(segAt(n)>=0&&!s2.has(key(n))){s2.add(key(n));q2.push(n)}}
      if(!(E.wheels||[]).some(W=>s2.has(key(W.c))))errs.push('No hamster wheel can be reached before the first door or lift.');
    }
  }
  return {errs,warns};
}
function showIssues(){
  const {errs,warns}=check(),box=$('issues');box.textContent='';
  const h=document.createElement('h3');h.textContent='Check';box.append(h);
  if(!errs.length&&!warns.length){const p=document.createElement('p');p.className='ok';p.textContent='Everything looks fine. Play test it!';p.style.margin='0';box.append(p)}
  else{const ul=document.createElement('ul');for(const [t,c] of [...errs.map(t=>[t,'err']),...warns.map(t=>[t,'warn'])]){const li=document.createElement('li');li.className=c;li.textContent=t;ul.append(li)}box.append(ul)}
  box.classList.remove('hide');box.scrollIntoView({behavior:'smooth',block:'nearest'});
  return errs.length===0;
}

// ---------- 3D-bilden ----------
const v3=$('view3d');
const ren=new THREE.WebGLRenderer({antialias:true});ren.setPixelRatio(Math.min(2,devicePixelRatio||1));v3.append(ren.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a1a2b);
const cam=new THREE.PerspectiveCamera(40,1,.1,200);
scene.add(new THREE.HemisphereLight(0xffffff,0x334455,1.1));
const world=new THREE.Group();scene.add(world);
let content=null, yaw=-.7, pitch=.5;
function textSprite(t,color){
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;const g=cv.getContext('2d');
  g.fillStyle=color;g.font='bold 44px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,32,34);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),depthTest:false}));s.scale.set(.9,.9,.9);return s;
}
function build3d(){
  if(content){world.remove(content);content.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.map)o.material.map.dispose()})}
  content=new THREE.Group();world.add(content);
  const N=lv.N,h=N/2,P=c=>new THREE.Vector3(c[0]-h+.5,c[1]-h+.5,c[2]-h+.5);
  // kubens kanter och axlarna (X röd, Y grön, Z blå) från hörnet där alla är 0
  content.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(N,N,N)),new THREE.LineBasicMaterial({color:0x5ad1ff,transparent:true,opacity:.35})));
  const o=new THREE.Vector3(-h,-h,-h);
  [[0xff5a5a,'X'],[0x4ade80,'Y'],[0x6aa8ff,'Z']].forEach(([col,t],a)=>{
    const dir=new THREE.Vector3().setComponent(a,1);content.add(new THREE.ArrowHelper(dir,o,N*.35,col,.5,.3));
    const s=textSprite(t,'#'+col.toString(16).padStart(6,'0'));s.position.copy(o).addScaledVector(dir,N*.35+.5);content.add(s);
  });
  // lagret man bygger i
  const lay=[N,N,N];lay[ui.axis]=1;const lp=new THREE.Vector3();lp.setComponent(ui.axis,ui.layer-h+.5);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(...lay),new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,opacity:.06,depthWrite:false}));slab.position.copy(lp);content.add(slab);
  const slabE=new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry),new THREE.LineBasicMaterial({color:0xffd166,transparent:true,opacity:.4}));slabE.position.copy(lp);content.add(slabE);
  // gångarna: golvplattor i gångens färg, och en svag ram runt varje ruta
  const box=new THREE.EdgesGeometry(new THREE.BoxGeometry(.96,.96,.96));
  lv.segs.forEach((s,i)=>{
    const col=new THREE.Color(SEG_COLORS[i%SEG_COLORS.length]),inLayer=segAxis(s)===ui.axis&&segLayer(s)===ui.layer;
    const mat=new THREE.MeshLambertMaterial({color:col,transparent:true,opacity:inLayer||i===ui.sel?.95:.55,emissive:col,emissiveIntensity:i===ui.sel?.35:.05});
    const lmat=new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.25});
    const fa=segAxis(s),sz=[.9,.9,.9];sz[fa]=.07;const pg=new THREE.BoxGeometry(...sz);
    for(const c of s.cells){
      const m=new THREE.Mesh(pg,mat);m.position.copy(P(c)).setComponent(fa,P(c).getComponent(fa)+DIRS[s.floor][1]*.46);content.add(m);
      const e=new THREE.LineSegments(box,lmat);e.position.copy(P(c));content.add(e);
    }
  });
  // hål och schakt: gul stav mellan rutorna
  for(const l of lv.links){
    const a=P(l[0]),b=P(l[1]),m=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,a.distanceTo(b),10),new THREE.MeshLambertMaterial({color:0xffd166,emissive:0xffb020,emissiveIntensity:.4}));
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());content.add(m);
  }
  // svängda gångar (från en öppnad fil): en båge
  for(const C of lv.extra.curves||[]){
    const pa=P(C.a.c).addScaledVector(new THREE.Vector3().setComponent(DIRS[C.a.d][0],DIRS[C.a.d][1]),.5);
    const pb=P(C.b.c).addScaledVector(new THREE.Vector3().setComponent(DIRS[C.b.d][0],DIRS[C.b.d][1]),.5);
    const pc=P(C.center),u=pa.clone().sub(pc),r=u.length();u.normalize();const w=pb.clone().sub(pc).normalize();
    const ang=Math.acos(Math.max(-1,Math.min(1,u.dot(w)))),v=w.clone().addScaledVector(u,-u.dot(w)).normalize(),pts=[];
    for(let i=0;i<=24;i++){const t=ang*i/24;pts.push(pc.clone().addScaledVector(u,r*Math.cos(t)).addScaledVector(v,r*Math.sin(t)))}
    content.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff8c3a})));
  }
  // rör: genomskinliga glasrör utanför kuben
  for(const T of lv.extra.tubes||[]){
    if(segAt(T.a.c)<0||segAt(T.b.c)<0)continue;
    const curve=new THREE.CatmullRomCurve3(tubePts(T));
    content.add(new THREE.Mesh(new THREE.TubeGeometry(curve,60,.23,10,false),new THREE.MeshLambertMaterial({color:0x7fe7ff,transparent:true,opacity:.45,emissive:0x2a8fb0,emissiveIntensity:.3,depthWrite:false})));
  }
  // hjul (silverring), dörrar (orange skiva), hissar (gul stav), portar (grå lucka) och patrullrutor (röda prickar)
  const dv=d=>new THREE.Vector3().setComponent(DIRS[d][0],DIRS[d][1]);
  for(const W of lv.extra.wheels||[]){
    const m=new THREE.Mesh(new THREE.TorusGeometry(.38,.05,8,24),new THREE.MeshLambertMaterial({color:0xc9d6e3,emissive:0x556677,emissiveIntensity:.4}));
    m.position.copy(P(W.c));m.lookAt(P(W.c).add(dv(W.open)));content.add(m);
  }
  for(const D of lv.extra.doors||[]){
    const d=DIRS.findIndex((_,d)=>key(neighbor(D.a,d))===key(D.b));if(d<0)continue;
    const sz=[.9,.9,.9];sz[DIRS[d][0]]=.06;const m=new THREE.Mesh(new THREE.BoxGeometry(...sz),new THREE.MeshLambertMaterial({color:0xd98a2b,emissive:0x8a4a10,emissiveIntensity:.4}));
    m.position.copy(P(D.a)).addScaledVector(dv(d),.5);content.add(m);
  }
  for(const L of lv.extra.lifts||[]){
    const a=P(L.a),b=P(L.b),m=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,a.distanceTo(b)+.6,8),new THREE.MeshLambertMaterial({color:0xffd23a,emissive:0xffb800,emissiveIntensity:.5}));
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());content.add(m);
  }
  const dot=(c,col)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:.4}));m.position.copy(P(c));content.add(m)};
  for(const G of lv.extra.gates||[]){
    const m=new THREE.Mesh(new THREE.CircleGeometry(.3,20),new THREE.MeshLambertMaterial({color:0x9aa8b5,side:THREE.DoubleSide}));
    m.position.copy(P(G.c)).addScaledVector(dv(G.d),.48);m.lookAt(P(G.c));content.add(m);
    for(const c of G.patrol||[])dot(c,0xff4d5e);
  }
  for(const E of lv.extra.enemies||[])for(const c of E.patrol||[])dot(c,0x9aa3ad);
  // pusslet: lådor (trä), grindar (grå), knappar (röd prick på väggen), kuldörrar (mässing), nycklar (gula)
  for(const c of lv.extra.boxes||[]){const m=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshLambertMaterial({color:0xa8743f}));m.position.copy(P(c));content.add(m)}
  for(const G of lv.extra.grates||[]){
    const d=DIRS.findIndex((_,d)=>key(neighbor(G.a,d))===key(G.b));if(d<0)continue;
    const sz=[.9,.9,.9];sz[DIRS[d][0]]=.05;const m=new THREE.Mesh(new THREE.BoxGeometry(...sz),new THREE.MeshLambertMaterial({color:0x8b96a1,transparent:true,opacity:.8}));
    m.position.copy(P(G.a)).addScaledVector(dv(d),.5);content.add(m);
  }
  for(const B of lv.extra.buttons||[]){const m=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshLambertMaterial({color:0xff4d5e,emissive:0xff2233,emissiveIntensity:.5}));m.position.copy(P(B.c)).addScaledVector(dv(B.d),.45);content.add(m)}
  for(const B of lv.extra.balldoors||[]){const m=new THREE.Mesh(new THREE.CircleGeometry(.28,20),new THREE.MeshLambertMaterial({color:0xc9a227,side:THREE.DoubleSide}));m.position.copy(P(B.c)).addScaledVector(dv(B.d),.48);m.lookAt(P(B.c));content.add(m)}
  for(const c of lv.extra.keys||[])dot(c,0xffcf3a);
  // skyltar: en gul skylt vid öppningen, uppe vid taket
  for(const S of lv.extra.signs||[]){
    const si=segAt(S.c);if(si<0)continue;const up=dv(lv.segs[si].floor^1);
    const sz=[.6,.6,.6];sz[DIRS[S.ahead][0]]=.04;sz[DIRS[lv.segs[si].floor][0]]=.2;
    const m=new THREE.Mesh(new THREE.BoxGeometry(...sz),new THREE.MeshLambertMaterial({color:0xffd166,emissive:0xb08000,emissiveIntensity:.4}));
    m.position.copy(P(S.c)).addScaledVector(dv(S.ahead),.42).addScaledVector(up,.3);content.add(m);
  }
  // start (grön kula med en pinne åt hållet den tittar) och utgång (guldring)
  if(lv.start){
    const p=P(lv.start.c),m=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),new THREE.MeshLambertMaterial({color:0x4ade80,emissive:0x22aa55,emissiveIntensity:.5}));m.position.copy(p);content.add(m);
    const d=new THREE.Vector3().setComponent(DIRS[lv.start.d][0],DIRS[lv.start.d][1]);content.add(new THREE.ArrowHelper(d,p,.6,0x4ade80,.25,.2));
  }
  if(lv.exit){
    const d=new THREE.Vector3().setComponent(DIRS[lv.exit.d][0],DIRS[lv.exit.d][1]),p=P(lv.exit.c).addScaledVector(d,.5);
    const m=new THREE.Mesh(new THREE.TorusGeometry(.32,.07,8,24),new THREE.MeshLambertMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.6}));
    m.position.copy(p);m.lookAt(p.clone().add(d));content.add(m);
  }
  render3d();
}
function render3d(){
  const w=v3.clientWidth,hgt=v3.clientHeight;if(!w||!hgt)return;
  ren.setSize(w,hgt,false);cam.aspect=w/hgt;cam.updateProjectionMatrix();
  const dist=lv.N*2.3;
  cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);cam.lookAt(0,0,0);
  ren.render(scene,cam);
}
// dra i 3D-bilden för att vrida kuben
let drag3=null;
v3.addEventListener('pointerdown',e=>{drag3={x:e.clientX,y:e.clientY};v3.setPointerCapture(e.pointerId)});
v3.addEventListener('pointermove',e=>{if(!drag3)return;yaw-=(e.clientX-drag3.x)*.01;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.clientY-drag3.y)*.01));drag3={x:e.clientX,y:e.clientY};render3d()});
v3.addEventListener('pointerup',()=>{drag3=null});v3.addEventListener('pointercancel',()=>{drag3=null});

// ---------- Knappar ----------
// Verktyg med en rad under rutnätet: vilken rad, och vilket val i ui
const SUBS={startexit:['seBar','se'],items:['itemBar','item'],paths:['pathBar','path'],enemies:['enemyBar','enemy'],power:['powerBar','power'],puzzle:['puzzleBar','puzzle']};
function showUi(){
  for(const b of document.querySelectorAll('#axisBtns button')){const on=+b.dataset.axis===ui.axis;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
  for(const b of document.querySelectorAll('#tools [data-tool]')){const on=b.dataset.tool===ui.tool;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
  for(const [tool,[bar,k]] of Object.entries(SUBS)){
    $(bar).classList.toggle('hide',ui.tool!==tool);
    for(const b of document.querySelectorAll('#'+bar+' button')){const on=b.dataset[k]===ui[k];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
  }
  showSign();
  $('layerTxt').textContent=`${AXN[ui.axis]} = ${ui.layer}`;
  $('floorBtn').textContent='Floor '+dirName(dirIndex(ui.axis,ui.sign));
  $('name').value=lv.name;
  const sz=$('size');if(+sz.value!==lv.N)sz.value=lv.N;
}
for(let n=4;n<=10;n++){const o=document.createElement('option');o.value=n;o.textContent=`${n}×${n}×${n}`;$('size').append(o)}
$('size').onchange=()=>{
  const n=+$('size').value;
  if(lv.segs.some(s=>s.cells.some(c=>c.some(v=>v>=n)))){msg('Some corridors are outside a cube that small. Erase them first.');$('size').value=lv.N;return}
  lv.N=n;ui.layer=Math.min(ui.layer,n-1);sizeGrid();showUi();changed();
};
$('name').oninput=()=>{lv.name=$('name').value;save()};
for(const b of document.querySelectorAll('#axisBtns button'))b.onclick=()=>{
  ui.axis=+b.dataset.axis;
  // börja i det lager där den valda gången ligger, om den ligger på de här väggarna
  const s=lv.segs[ui.sel];if(s&&segAxis(s)===ui.axis)ui.layer=segLayer(s);
  showUi();changed();
};
$('layerDown').onclick=()=>{ui.layer=Math.max(0,ui.layer-1);showUi();changed()};
$('layerUp').onclick=()=>{ui.layer=Math.min(lv.N-1,ui.layer+1);showUi();changed()};
$('floorBtn').onclick=()=>{
  ui.sign=-ui.sign;
  // den valda gången i det här lagret byter golvsida
  const s=lv.segs[ui.sel];
  if(s&&segAxis(s)===ui.axis&&segLayer(s)===ui.layer){s.floor=dirIndex(ui.axis,ui.sign);
    lv.links=lv.links.map(l=>{const si=segAt(l[0]);if(si!==ui.sel)return l;const d=DIRS.findIndex((_,d)=>key(neighbor(l[0],d))===key(l[1]));return [l[0],l[1],d===s.floor?'hole':'shaft']})}
  showUi();changed();selInfo();
};
const TOOL_TIPS={draw:'Start in an empty cell to draw a new corridor. Start on a corridor to make it longer.',erase:'Drag over cells to erase them.',
  startexit:'Choose Start or Exit below and tap a cell. Tap again to turn the hamster or move the exit to another wall.',
  items:'Choose an item below and tap corridor cells. Tap again to remove it. Drag to place many.',
  paths:'Choose Curve or Tube below.',enemies:'Choose Gate or Grey hamster below.',power:'Choose Wheel, Door or Lift below. All wheels charge the same battery.'};
const SUB_TIPS={curve:'Tap the cell where a curve starts, then the cell where it ends. Tap a curve end to remove the curve.',
  tube:'Tap a cell at the outside of the cube, then the cell where the tube comes back in. Tap a tube end to remove the tube.',
  gate:'Tap a corridor cell to put a gate in its wall, then tap the two cells the grey hamster patrols between. Tap a gate to remove it.',
  grey:'A grey hamster without a gate: tap the two cells it patrols between. It is there from the start and does not come back. Tap ① to remove it.',
  button:'Tap a corridor cell to put a button on its wall (tap again for another wall). Then place the gate it opens with 🚧 Gate.',
  grate:'Tap a corridor cell to put a gate between it and the next cell. It opens with the chosen button. Tap again to move it.',
  box:'Tap a corridor cell to place or remove a wooden box.',
  bdoor:'Tap a corridor cell to put a locked ball door in its wall. A key opens it and a steel ball rolls out.',
  key:'Tap a corridor cell to place or remove a key.',
  wheel:'Tap a corridor cell for a hamster wheel. Tap again to turn it; after the last way it is removed.',
  door:'Tap a corridor cell to put a door between it and the next cell. Tap again to move it; after the last place it is removed.',
  lift:'Tap the upper cell of a lift, then change layer and tap the cell right below. Tap a lift cell to remove the lift.'};
for(const b of document.querySelectorAll('#tools [data-tool]'))b.onclick=()=>{
  ui.tool=b.dataset.tool;ui.pick=null;showUi();save();drawGrid();
  msg(SUBS[ui.tool]&&SUB_TIPS[ui[SUBS[ui.tool][1]]]?SUB_TIPS[ui[SUBS[ui.tool][1]]]:TOOL_TIPS[ui.tool]);
};
for(const [bar,k] of [['pathBar','path'],['enemyBar','enemy'],['powerBar','power'],['puzzleBar','puzzle']])
  for(const b of document.querySelectorAll('#'+bar+' button'))b.onclick=()=>{ui[k]=b.dataset[k];ui.pick=null;showUi();save();drawGrid();msg(SUB_TIPS[ui[k]])};
for(const b of document.querySelectorAll('#seBar button'))b.onclick=()=>{ui.se=b.dataset.se;showUi();save();
  msg(ui.se==='start'?'Tap the start cell. Tap again to turn the hamster.':'Tap the exit cell. Tap again to move it to another wall.')};
for(const b of document.querySelectorAll('#itemBar button'))b.onclick=()=>{ui.item=b.dataset.item;showUi();save();
  msg({seed:'Tap corridor cells to place sunflower seeds (one per cell). The hamster can carry 10.',red:'A red hole costs a life. The hamster can roll around it.',
    wide:'A wide red hole fills the corridor. The hamster must jump over it.',blue:'A round blue hole the hamster can roll around. In it, the hamster gets stuck halfway and you tip the cube to drop into the corridor below.',
    hole:'A big hole: the whole floor of the cell opens down to the corridor below. The hamster gets stuck halfway and you tip the cube.',
    shaft:'A shaft: an opening in the ceiling up to the corridor above. Stand under it and turn the cube to fall up into it.',
    gap:'A gap in the whole floor. With a corridor below with the same floor, the hamster falls into it; otherwise it costs a life.',
    crack:'Cracked glass breaks just after the hamster has rolled over it, or under it if it stands still.',
    sign:'Tap a corridor cell to hang a sign at an opening. Tap it again to move it to another opening. Write the text and choose the arrow below.'}[ui.item])};
$('checkBtn').onclick=showIssues;
$('playBtn').onclick=()=>{
  if(!showIssues())return;
  try{localStorage.setItem('hc_test_level',JSON.stringify(toFile()))}catch(err){msg('Could not save the test level in the browser.');return}
  location.href='hc_index_12.html?test=1';
};
// meny
$('menuBtn').onclick=()=>{const m=$('menu'),open=m.classList.toggle('hide');$('menuBtn').setAttribute('aria-expanded',!open)};
function closeMenu(){$('menu').classList.add('hide');$('menuBtn').setAttribute('aria-expanded',false)}
function useLevel(o,text){lv=o;ui.sel=-1;ui.axis=1;ui.layer=lv.N-1;ui.sign=-1;reindex();sizeGrid();showUi();changed();msg(text)}
for(const b of document.querySelectorAll('#menu [data-act]'))b.onclick=()=>{
  closeMenu();const act=b.dataset.act;
  if(act==='new'){if(lv.segs.length&&!confirm('Start a new level? The current one is lost if you have not saved it.'))return;useLevel(blank(lv.N),'A new, empty level.')}
  else if(act==='example'){if(lv.segs.length&&!confirm('Open the example? The current level is lost if you have not saved it.'))return;useLevel(fromFile(EXAMPLE),'The example Twist & Turn. Look around, change it, or start a new level.')}
  else if(act==='open')$('fileIn').click();
  else if(act==='export')openExport();
  else if(act==='copy'){navigator.clipboard.writeText(fileText()).then(()=>msg('The level text is copied.'),()=>msg('Could not copy.'))}
};
$('fileIn').onchange=async()=>{
  const f=$('fileIn').files[0];$('fileIn').value='';if(!f)return;
  try{
    const L=JSON.parse(await f.text());if(!L.segs||!L.N)throw new Error('not a level');
    const o=fromFile(L);const m=f.name.match(/hc_level_(\d+)_(\d+)/);if(m){o.exNum=+m[1];o.exVer=+m[2]+1}
    useLevel(o,'Opened '+f.name+'.');
  }catch(err){msg('That file is not a Hamster Cube level.')}
};
// spara banfilen: bana NN, version VV
const pad=n=>String(n).padStart(2,'0');
const exName=()=>`hc_level_${pad(+$('exNum').value||1)}_${pad(+$('exVer').value||1)}.json`;
function openExport(){
  const {errs}=check();
  if(errs.length&&!confirm('The level has problems (see Check). Save it anyway?'))return;
  $('exNum').value=lv.exNum||1;$('exVer').value=lv.exVer||1;$('exFile').textContent=exName();$('exportDlg').classList.remove('hide');
}
for(const id of ['exNum','exVer'])$(id).oninput=()=>{$('exFile').textContent=exName()};
$('exCancel').onclick=()=>$('exportDlg').classList.add('hide');
$('exSave').onclick=async()=>{
  const name=exName(),text=fileText();
  lv.exNum=+$('exNum').value||1;lv.exVer=(+$('exVer').value||1)+1;save();   // nästa gång: nästa version
  $('exportDlg').classList.add('hide');
  // på telefonen: dela filen (t.ex. till Drive, e-post eller GitHub-appen); annars ladda ner den
  const file=new File([text],name,{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:name});msg('Shared '+name+'.');return}catch(err){if(err.name==='AbortError'){msg('Not shared.');return}}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);msg('Saved '+name+'.');
};

// ---------- Start ----------
load();if(!ui.item)ui.item='seed';if(ui.signSel==null)ui.signSel=-1;if(!ui.se)ui.se='start';if(['link','start','exit'].includes(ui.tool))ui.tool='startexit';
if(!ui.path)ui.path='curve';if(!ui.puzzle)ui.puzzle='button';if(ui.btnSel==null)ui.btnSel=-1;if(!ui.enemy)ui.enemy='gate';if(!ui.power)ui.power='wheel';if(['curve','tube'].includes(ui.tool)){ui.path=ui.tool;ui.tool='paths'}
// (sparat läge från en äldre editor: ett enda hjul eller en hiss blir listor)
if(lv.extra.wheel){lv.extra.wheels=[...(lv.extra.wheels||[]),lv.extra.wheel];delete lv.extra.wheel}
if(lv.extra.lift){lv.extra.lifts=[...(lv.extra.lifts||[]),lv.extra.lift];delete lv.extra.lift}
if(lv.extra.tube){lv.extra.tubes=[...(lv.extra.tubes||[]),lv.extra.tube];delete lv.extra.tube}reindex();showUi();lastSnap=JSON.stringify(lv);undoUi();
$('undoBtn').onclick=()=>{if(!undoSt.length)return;redoSt.push(lastSnap);restore(undoSt.pop());msg('Undone.')};
$('redoBtn').onclick=()=>{if(!redoSt.length)return;undoSt.push(lastSnap);restore(redoSt.pop());msg('Redone.')};
addEventListener('resize',()=>{sizeGrid();render3d()});
sizeGrid();build3d();
msg(lv.segs.length?'Welcome back! Your level is where you left it.':'Draw on the grid to build the first corridor, or open the example in the menu ☰.');
