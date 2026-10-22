// Hamster Cube – banbyggaren (editorn)
// Man bygger kuben lager för lager på ett rutnät och ser hela kuben i 3D ovanför. Resultatet blir en
// banfil (hc_level_NN_VV.json) som spelet läser. Samma format som spelet använder:
//   segs: gångar, var och en med ett golv (riktning) och sina rutor. Rutor i samma gång bredvid varandra hänger ihop.
//   links: hål (genom golvet) och schakt (genom taket) mellan två gångar.
//   start {c, d}: rutan där hamstern börjar och hållet den tittar. exit {c, d}: rutan och sidan där utgången sitter.
// Övriga saker i en bana (kurvor, hål, portar, hiss, hjul, dörrar, skyltar, frön …) följer med oförändrade
// när man öppnar en fil, men går inte att bygga i den här första versionen av editorn.
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
const EXTRA_KEYS=['curves','pits','gaps','cracks','gates','lift','signs','wheel','doors','seeds','tube'];

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
  lv=blank(8);ui={axis:1,layer:7,sign:-1,tool:'draw',sel:-1};
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
function changed(){reindex();save();drawGrid();build3d();$('issues').classList.add('hide')}
function selInfo(){
  const s=lv.segs[ui.sel];
  if(!s){msg('Draw on the grid to build a corridor. Its floor side is '+dirName(dirIndex(ui.axis,ui.sign))+'.');return}
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
      const d=dirIndex(a,s);if(openSame(c,d))continue;
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
// tecken för saker som editorn ännu inte bygger: frö •, runda hål ●, hål i golvet ▢, sprucket glas ✶, port G, hiss L, hjul W, dörr D, skylt S, kurva C
function extraMarkers(){
  const m=new Map(),add=(c,t)=>{const k=key(c);m.set(k,(m.get(k)||'')+t)};
  const E=lv.extra;
  for(const c of E.seeds||[])add(c,'•');
  for(const p of E.pits||[])add(p.c,p.kind==='red'?'🔴':'🔵');
  for(const h of E.gaps||[])add(h.c,'▢');for(const h of E.cracks||[])add(h.c,'✶');
  for(const G of E.gates||[])add(G.c,'G');
  if(E.lift){add(E.lift.a,'L');add(E.lift.b,'L')}
  if(E.wheel)add(E.wheel.c,'W');
  for(const D of E.doors||[]){add(D.a,'D');add(D.b,'D')}
  for(const S of E.signs||[])add(S.c,'S');
  for(const C of E.curves||[]){add(C.a.c,'C');add(C.b.c,'C')}
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
      // fortsätt den valda gången om rutan ligger bredvid den i samma lager och med samma golv, annars en ny gång
      const s=lv.segs[ui.sel], fl=dirIndex(ui.axis,ui.sign);
      const touches=s&&s.floor===fl&&segLayer(s)===ui.layer&&planeAxes(ui.axis).some(a=>[1,-1].some(sg=>segAt(neighbor(c,dirIndex(a,sg)))===ui.sel));
      if(touches)target=ui.sel;else{lv.segs.push({floor:fl,cells:[]});target=lv.segs.length-1}
      addCell(target,c);
    }
    ui.sel=target;stroke={si:target,last:gp};changed();selInfo();
  }else if(ui.tool==='erase'){
    stroke={erase:true,last:gp};if(removeCell(c))changed();
  }else if(ui.tool==='link')toggleLink(c);
  else if(ui.tool==='start')setStart(c);
  else if(ui.tool==='exit')setExit(c);
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
  stroke.last=gp;if(any){changed();if(!stroke.erase)selInfo()}
  function apply(g){const c=gridToCell(...g);return stroke.erase?removeCell(c):addCell(stroke.si,c)}
});
const endStroke=()=>{stroke=null};
grid.addEventListener('pointerup',endStroke);grid.addEventListener('pointercancel',endStroke);

// Hål eller schakt: varje tryck byter mellan inget, hål (genom golvet ner till gången under) och schakt
// (genom taket upp till gången ovanför). Där det inte finns någon gång hoppas det valet över.
function toggleLink(c){
  const si=segAt(c);
  if(si<0){msg('Tap a corridor cell to make a hole in its floor or a shaft in its ceiling.');return}
  const s=lv.segs[si];if(segAxis(s)!==ui.axis){msg('Switch to '+AXN[segAxis(s)]+' to work on that corridor.');return}
  const opts=[null];
  for(const [d,kind] of [[s.floor,'hole'],[s.floor^1,'shaft']]){const n=neighbor(c,d),ns=segAt(n);if(inside(n)&&ns>=0&&ns!==si)opts.push({n,kind})}
  if(opts.length===1){msg('There is no corridor right below or above this cell. Build one in the next layer first.');return}
  let cur=0;opts.forEach((o,i)=>{if(o&&linkAt(c,o.n)>=0)cur=i});
  for(const o of opts)if(o){const i=linkAt(c,o.n);if(i>=0)lv.links.splice(i,1)}
  const nx=opts[(cur+1)%opts.length];
  if(nx)lv.links.push([c.slice(),nx.n,nx.kind]);
  msg(nx?(nx.kind==='hole'?'Hole in the floor down to corridor '+(segAt(nx.n)+1)+'.':'Shaft in the ceiling up to corridor '+(segAt(nx.n)+1)+'.'):'No hole or shaft here.');
  changed();
}
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
  const ds=planeDirs(lv.segs[si]).filter(d=>!openSame(c,d)&&!lv.links.some(l=>(key(l[0])===key(c)&&key(l[1])===key(neighbor(c,d)))));
  if(!ds.length){msg('The exit must be in a wall, and this cell has no wall.');return}
  if(lv.exit&&key(lv.exit.c)===key(c)&&ds.includes(lv.exit.d))lv.exit.d=ds[(ds.indexOf(lv.exit.d)+1)%ds.length];
  else lv.exit={c:c.slice(),d:ds.find(d=>!inside(neighbor(c,d)))??ds[0]};
  msg('The exit is in the '+dirName(lv.exit.d)+' wall. Tap again to move it to another wall.');changed();
}

// ---------- Kontroll ----------
function check(){
  const errs=[],warns=[];
  if(!lv.segs.length)errs.push('There are no corridors yet.');
  if(!lv.start)errs.push('There is no start. Use 🐹 Start.');
  else if(segAt(lv.start.c)<0)errs.push('The start is not in a corridor.');
  if(!lv.exit)errs.push('There is no exit. Use 🏁 Exit.');
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
  for(const C of E.curves||[]){miss('A curve end',C.a.c);miss('A curve end',C.b.c)}
  for(const G of E.gates||[]){miss('A gate',G.c);for(const c of G.patrol||[])miss('A patrol point',c)}
  if(E.lift){miss('The lift',E.lift.a);miss('The lift',E.lift.b)}
  if(E.wheel)miss('The hamster wheel',E.wheel.c);
  for(const D of E.doors||[]){miss('A door',D.a);miss('A door',D.b)}
  for(const S of E.signs||[])miss('A sign',S.c);
  for(const l of lv.links)if(segAt(l[0])<0||segAt(l[1])<0)errs.push(`A hole or shaft at ${key(l[0])} has no corridor at one end.`);
  // når man utgången? (åt alla håll, oavsett hur kuben behöver vändas)
  if(!errs.length){
    const adj=new Map(),link=(a,b)=>{for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(key(x)))adj.set(key(x),[]);adj.get(key(x)).push(y)}};
    for(const l of lv.links)link(l[0],l[1]);
    for(const C of E.curves||[])link(C.a.c,C.b.c);
    if(E.lift)link(E.lift.a,E.lift.b);
    for(const p of E.pits||[])if(p.kind==='blue'){const si=segAt(p.c);if(si>=0)link(p.c,neighbor(p.c,lv.segs[si].floor))}
    for(const D of E.doors||[])link(D.a,D.b);
    if(E.tube)link(E.tube.a.c,E.tube.b.c);
    const seen=new Set([key(lv.start.c)]),q=[lv.start.c];
    while(q.length){const c=q.pop();const nb=[...(adj.get(key(c))||[])];for(let d=0;d<6;d++)if(openSame(c,d))nb.push(neighbor(c,d));
      for(const n of nb)if(segAt(n)>=0&&!seen.has(key(n))){seen.add(key(n));q.push(n)}}
    if(!seen.has(key(lv.exit.c)))errs.push('The exit cannot be reached from the start. Connect the corridors with holes or shafts.');
    const lone=lv.segs.map((s,i)=>i).filter(i=>!lv.segs[i].cells.some(c=>seen.has(key(c))));
    if(lone.length)warns.push('Corridor '+lone.map(i=>i+1).join(', ')+' cannot be reached from the start.');
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
function showUi(){
  for(const b of document.querySelectorAll('#axisBtns button')){const on=+b.dataset.axis===ui.axis;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
  for(const b of document.querySelectorAll('#tools [data-tool]')){const on=b.dataset.tool===ui.tool;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
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
for(const b of document.querySelectorAll('#tools [data-tool]'))b.onclick=()=>{
  ui.tool=b.dataset.tool;showUi();save();
  msg({draw:'Draw with your finger to build a corridor. Start on a corridor to make it longer.',erase:'Drag over cells to erase them.',
    link:'Tap a corridor cell: hole in the floor, shaft in the ceiling, or nothing.',start:'Tap the start cell. Tap again to turn the hamster.',
    exit:'Tap the exit cell. Tap again to move it to another wall.'}[ui.tool]);
};
$('newSeg').onclick=()=>{ui.sel=-1;ui.tool='draw';showUi();changed();msg('The next corridor you draw is a new one, with floor '+dirName(dirIndex(ui.axis,ui.sign))+'.')};
$('checkBtn').onclick=showIssues;
$('playBtn').onclick=()=>{
  if(!showIssues())return;
  try{localStorage.setItem('hc_test_level',JSON.stringify(toFile()))}catch(err){msg('Could not save the test level in the browser.');return}
  location.href='hc_index_01.html?test=1';
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
load();reindex();showUi();
addEventListener('resize',()=>{sizeGrid();render3d()});
sizeGrid();build3d();
msg(lv.segs.length?'Welcome back! Your level is where you left it.':'Draw on the grid to build the first corridor, or open the example in the menu ☰.');
