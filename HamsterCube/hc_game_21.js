(function diagnose(){
  const lines=[];
  lines.push('Secure context (https): ' + (window.isSecureContext ? 'yes' : 'NO – needed for the sensor'));
  lines.push('DeviceOrientationEvent available: ' + (('DeviceOrientationEvent' in window) ? 'yes' : 'NO'));
  const needsPerm = typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function';
  lines.push('Needs explicit permission (iOS style): ' + (needsPerm?'yes':'no'));
  lines.push('Running in a frame (iframe): ' + (window.self!==window.top ? 'YES – may block the sensor' : 'no'));
  let policyLine='Sensor allowed by page policy: unknown';
  try{
    if(document.featurePolicy && document.featurePolicy.allowsFeature){
      const ok = document.featurePolicy.allowsFeature('accelerometer') && document.featurePolicy.allowsFeature('gyroscope');
      policyLine='Sensor allowed by page policy: ' + (ok?'yes':'NO – blocked by the Permissions-Policy');
    }
  }catch(err){}
  lines.push(policyLine);
  const el = document.getElementById('diag');
  if(el) el.textContent = lines.join('\n');
  console.log(lines.join('\n'));
})();
const hamsterTexUrl="hc_hamster_02.jpg", evilTexUrl="hc_hamster_grey.jpg";
const $=id=>document.getElementById(id);
const touch=matchMedia('(pointer:coarse)').matches;
let useOrientation=false, useKeyboard=!touch;

// ---------- Scen ----------
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x06121f);
scene.fog=new THREE.Fog(0x06121f,18,42);
const cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,100);
const ren=new THREE.WebGLRenderer({antialias:true});
ren.setPixelRatio(Math.min(devicePixelRatio,2));
ren.setSize(innerWidth,innerHeight);
ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(ren.domElement);

scene.add(new THREE.HemisphereLight(0x8fd8ff,0x0a1422,0.7));
const sun=new THREE.DirectionalLight(0xbfe9ff,1.0);
sun.position.set(10,20,8);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
const sc=sun.shadow.camera;sc.left=-26;sc.right=26;sc.top=26;sc.bottom=-26;sc.near=1;sc.far=60;
scene.add(sun);

// ---------- Kuben ----------
// Hamstern är fångad i en genomskinlig kub. Inne i kuben går gångar av frostat glas, och varje gång
// har ett bestämt golv. Tyngdkraften drar alltid rakt nedåt i världen, och hamstern rullar bara när
// kuben ligger så att gångens golv är nedåt. Rullar den i ett hål faller den ner halvvägs och sitter
// fast; då tippar man kuben tills golvet i nästa gång hamnar nedåt. Under ett schakt i taket kan man
// vända kuben 180°, så att hamstern faller ner i schaktet och fastnar på samma sätt.

// ---------- Banan ----------
// Banorna byggs i editorn (hc_editor) och ligger som filer: hc_level_NN_VV.json (bana NN, version VV).
// hc_levels_01.js hittar dem, läser den bana som valts och lägger den i window.HC_LEVEL innan spelet startar.
// Varje gång har ett golv (en riktning i kubens egna koordinater) och en rad rutor. Rutor i samma gång
// som ligger bredvid varandra hänger ihop, så flera rutor bredvid varandra blir en öppen yta.
// links: hål (i golvet) och schakt (i taket) mellan gångar. curves: svängda gångar mellan två rutors
// sidor, runt en mittpunkt. pits: runda hål mitt i golvet, blå (fastnar halvvägs) eller röda (kostar ett liv).
// start: {c: ruta, d: riktning hamstern tittar}. exit: {c: ruta, d: sidan där utgången sitter}.
// Riktningar: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
const LV=window.HC_LEVEL, LEVEL_ID=LV.id;

const N=LV.N, CELL=2.4, R=0.42;
const HALF=N*CELL/2;
const PANEL_IN=.03, PANEL_T=.05;               // glasskivorna sitter en aning innanför rutans kant
const FLOOR_GAP=PANEL_IN+PANEL_T;              // från rutans kant till golvets ovansida
const LIM=CELL/2-FLOOR_GAP-R;                  // hur långt från rutans mitt kulan når innan den slår i en vägg
const PIT_R=.56, PIT_CATCH=.36;                // runda hål: radie, och hur nära mitten kulan måste komma för att falla i

// Riktningar: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z. d^1 är motsatt riktning.
const DIRS=[[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]];
const dirIndex=(a,s)=>a*2+(s>0?0:1);
const cid=(i,j,k)=>i+N*(j+N*k);
const cellOfId=id=>[id%N,Math.floor(id/N)%N,Math.floor(id/(N*N))];
const inside=c=>c.every(v=>v>=0&&v<N);
const coordOf=i=>(i-(N-1)/2)*CELL;
const center=c=>new THREE.Vector3(coordOf(c[0]),coordOf(c[1]),coordOf(c[2]));
const neighbor=(c,d)=>{const n=c.slice();n[DIRS[d][0]]+=DIRS[d][1];return n};
const dirVec=d=>new THREE.Vector3().setComponent(DIRS[d][0],DIRS[d][1]);
const dirBetween=(a,b)=>{for(let d=0;d<6;d++)if(neighbor(a,d)+''===b+'')return d;return -1};

const SEGS=LV.segs;
const START=LV.start.c;
const cellSeg=new Array(N*N*N).fill(-1);
SEGS.forEach((s,i)=>s.cells.forEach(c=>{cellSeg[cid(...c)]=i}));
// open[ruta][riktning]: 0 = vägg, 1 = gång, 'link' = hål/schakt, 'tube' = glasröret,
// 'curve' = svängd gång, 'exit' = utgången
const open=Array.from({length:N*N*N},()=>Array(6).fill(0));
for(let k=0;k<N*N*N;k++){
  if(cellSeg[k]<0)continue;
  const c=cellOfId(k);
  for(let d=0;d<6;d++){const n=neighbor(c,d);if(inside(n)&&cellSeg[cid(...n)]===cellSeg[k])open[k][d]=1}
}
const LINKS=[];
function addLink(x,y,kind){
  const d=dirBetween(x,y);
  open[cid(...x)][d]='link';open[cid(...y)][d^1]='link';
  LINKS.push({x,y,d,kind});
}
for(const [x,y,kind] of LV.links)addLink(x,y,kind);
// Runda hål: blå leder ner till rutan under (som ett hål), röda kostar ett liv
const pitAt=new Map();
for(const P of LV.pits){
  const k=cid(...P.c), fd=SEGS[cellSeg[k]].floor;
  // vanliga runda hål, eller breda röda ringar som fyller hela gången (då går det inte att rulla runt)
  pitAt.set(k,{...P,floor:fd,r:P.wide?1.0:PIT_R,catchR:P.wide?.85:PIT_CATCH});
  if(P.kind==='blue')addLink(P.c,neighbor(P.c,fd),'pit');
}
// Glasrör utanför kuben: tubes är en lista med rör {a:{c,d}, b:{c,d}} (en äldre bana kan ha ett enda 'tube').
// Varje ände sitter i en gångruta vid kubens yta, d är sidan röret går ut genom.
const TUBES=[...(LV.tubes||[]),...(LV.tube?[LV.tube]:[])].map(T=>({a:T.a,b:T.b}));
for(const T of TUBES){open[cid(...T.a.c)][T.a.d]='tube';open[cid(...T.b.c)][T.b.d]='tube'}
let tubeA=null, tubeB=null;   // röret hamstern åker i just nu: dess ändar
// Eldörrar: stängda tills hamstern kommer fram med ett laddat batteri. Då öppnas dörren och förblir öppen.
// Grindar (grates) fungerar som dörrar men öppnas av en knapp (se Pussel nedan), inte av batteriet direkt.
const DOORS=[...(LV.doors||[]).map(D=>({...D,grate:false})),...(LV.grates||[]).map((D,i)=>({...D,grate:true,gi:i}))].map(D=>{
  const d=dirBetween(D.a,D.b);
  open[cid(...D.a)][d]='door';open[cid(...D.b)][d^1]='door';
  return {...D,d,isOpen:false,anim:0};
});
// Kuldörrar: en mässingslucka i väggen (som portarna), där en stålkula väntar bakom (se Pussel nedan)
for(const B of LV.balldoors||[])open[cid(...B.c)][B.d]='bdoor';
const doorAt=(k,d)=>DOORS.find(D=>(cid(...D.a)===k&&D.d===d)||(cid(...D.b)===k&&(D.d^1)===d));
// En öppning är fri att rulla igenom om den är en gång, eller en dörr som har öppnats
const passable=(k,d)=>{const o=open[k][d];return o==='door'?doorAt(k,d).isOpen:o==='gate'||o==='bdoor'?false:!!o};
const exitCell=LV.exit.c, exitDir=LV.exit.d;
open[cid(...exitCell)][exitDir]='exit';

// Svängda gångar: en båge i gångens plan, på kulans höjd, från rutan a:s sida till rutan b:s sida
const ballHeight=(c,fd)=>coordOf(c[DIRS[fd][0]])+DIRS[fd][1]*(CELL/2-FLOOR_GAP-R);
const CURVE_LEAD=CELL/2-LIM;    // från där hamstern når rutans kant till rutans sida
const CURVES=LV.curves.map((C,i)=>{
  const fd=SEGS[cellSeg[cid(...C.a.c)]].floor, fa=DIRS[fd][0];
  const pa=center(C.a.c).addScaledVector(dirVec(C.a.d),CELL/2), pb=center(C.b.c).addScaledVector(dirVec(C.b.d),CELL/2);
  const pc=new THREE.Vector3(coordOf(C.center[0]),coordOf(C.center[1]),coordOf(C.center[2]));
  for(const v of [pa,pb,pc])v.setComponent(fa,ballHeight(C.a.c,fd));
  const u=pa.clone().sub(pc), r=u.length();u.normalize();
  const w=pb.clone().sub(pc).normalize(), ang=Math.acos(Math.max(-1,Math.min(1,u.dot(w))));
  const v=w.clone().addScaledVector(u,-u.dot(w)).normalize();
  const pts=[];for(let i2=0;i2<=32;i2++){const t=ang*i2/32;pts.push(pc.clone().addScaledVector(u,r*Math.cos(t)).addScaledVector(v,r*Math.sin(t)))}
  const arc=new THREE.CatmullRomCurve3(pts);          // själva bågen (det som ritas)
  // Banan hamstern följer: bågen plus en rak bit in i rutan i båda ändar. Den raka biten börjar
  // precis där hamstern når rutans kant (LIM), så att övergången sker utan ryck.
  const na=dirVec(C.a.d), nb=dirVec(C.b.d), lead=[];
  for(const k of [1,.66,.33])lead.push(pa.clone().addScaledVector(na,-CURVE_LEAD*k));
  const tail=[];for(const k of [.33,.66,1])tail.push(pb.clone().addScaledVector(nb,-CURVE_LEAD*k));
  const curve=new THREE.CatmullRomCurve3([...lead,...pts,...tail]);
  open[cid(...C.a.c)][C.a.d]='curve';open[cid(...C.b.c)][C.b.d]='curve';
  return {...C,i,curve,arc,len:curve.getLength(),arcLen:arc.getLength(),floor:fd,up:dirVec(fd^1),samp:curve.getSpacedPoints(Math.ceil(curve.getLength()/.1))};
});
// Hål i golvet och sprucket golv: en rektangel tvärs över hela gången, len lång längs gången
// (utan len: hela rutan, så att det inte blir några golvbitar kvar på sidorna).
// drop: det finns en gång med samma golv under, och dit faller hamstern. Annars går ett liv förlorat.
// Ett hål som leder ner öppnas mellan rutorna ('gap'), så att man ser ner och kameran kan följa med.
const HOLES=new Map();
const holeBelow=new Map();   // rutan under ett hål som leder ner → hålet (taket där får samma hål)
function openHole(hz){if(hz.drop){open[hz.k][hz.floor]='gap';open[cid(...hz.below)][hz.floor^1]='gap'}}
for(const H of [...(LV.gaps||[]).map(h=>({...h,kind:'gap'})),...(LV.cracks||[]).map(h=>({...h,kind:'crack'}))]){
  const k=cid(...H.c), fd=SEGS[cellSeg[k]].floor, axes=[0,1,2].filter(a=>a!==DIRS[fd][0]);
  const score=a=>(open[k][dirIndex(a,1)]?1:0)+(open[k][dirIndex(a,-1)]?1:0);
  const axis=score(axes[0])>=score(axes[1])?axes[0]:axes[1];      // gångens riktning
  const below=neighbor(H.c,fd), bk=inside(below)?cid(...below):-1;
  const drop=bk>=0&&cellSeg[bk]>=0&&SEGS[cellSeg[bk]].floor===fd;
  const hz={...H,len:H.len??CELL-2*PANEL_IN,k,floor:fd,axis,below,drop,broken:H.kind==='gap',on:0,after:0,touched:false,panel:null,fallT:0};
  HOLES.set(k,hz);if(drop)holeBelow.set(bk,hz);
  if(hz.broken)openHole(hz);
}
// Hissens schakt: öppet mellan rutorna (måste göras innan golv och tak ritas)
// (lifts: en lista med hissar; en äldre bana kan ha en enda 'lift')
const LIFT_DEFS=[...(LV.lifts||[]),...(LV.lift?[LV.lift]:[])];
for(const L of LIFT_DEFS){
  const fd=SEGS[cellSeg[cid(...L.a)]].floor;let c=L.a.slice();
  while(c+''!==L.b+''){const n=neighbor(c,fd);open[cid(...c)][fd]='lift';open[cid(...n)][fd^1]='lift';c=n}
}
// Hamsterportarnas öppningar i väggen (ritas som lucka, inte som glasvägg)
for(const G of LV.gates||[])open[cid(...G.c)][G.d]='gate';
// Korridorer utan väggar och tak (segs[i].walls===false): bara ett golv. Öppna golv bredvid varandra med samma
// golvsida hänger ihop. Mot ingenting (eller mot en öppen gång med ett annat golv) är sidan en kant ('edge'):
// där rullar man av. Mot en gång med väggar är dess vägg kvar.
const openSeg=si=>si>=0&&SEGS[si].walls===false;
const segOpenAt=k=>openSeg(cellSeg[k]);
for(let k=0;k<N*N*N;k++){
  const si=cellSeg[k];if(!openSeg(si))continue;
  const c=cellOfId(k),fd=SEGS[si].floor;
  for(let d=0;d<6;d++){
    if(DIRS[d][0]===DIRS[fd][0]||open[k][d])continue;
    const n=neighbor(c,d),nk=inside(n)?cid(...n):-1,ns=nk>=0?cellSeg[nk]:-1;
    if(ns>=0&&openSeg(ns)&&SEGS[ns].floor===fd){if(!open[nk][d^1]){open[k][d]=1;open[nk][d^1]=1}}
    else if(ns<0||openSeg(ns))open[k][d]='edge';
  }
}
// Över kanten (från rutan c åt hållet d, med golvet fd): ett öppet golv en våning ner (dit faller man, som i ett gap),
// en golvundersida i samma plan (röd fyrkant: allt faller igenom) eller ingenting.
function edgeTarget(c,d,fd){
  const n=neighbor(c,d),b=neighbor(n,fd);
  if(inside(n)&&inside(b)){const bs=cellSeg[cid(...b)];
    if(bs>=0&&SEGS[bs].floor===(fd^1))return {kind:'under',n,b};
    if(bs>=0&&openSeg(bs)&&SEGS[bs].floor===fd)return {kind:'drop',n,b};
  }
  return {kind:'void',n};
}
// Är kulan över hålet? (margin > 0 räknar med en bit runt hålet)
const overHole=(hz,margin)=>Math.abs(p.getComponent(hz.axis)-coordOf(hz.c[hz.axis]))<hz.len/2+margin;
const curveAt=(c,d)=>{for(const C of CURVES){if(C.a.c+''===c+''&&C.a.d===d)return {C,end:0};if(C.b.c+''===c+''&&C.b.d===d)return {C,end:1}}return null};

// ---------- Kubens utseende ----------
// Varje ruta i en gång är en låda av glas: golvet mörkt med ränder, väggar och tak av frostat glas.
// Rutor som inte hör till någon gång är tomma, så kuben blir genomskinlig mellan gångarna.
const cube=new THREE.Group();scene.add(cube);
const wallMat=new THREE.MeshPhysicalMaterial({color:0x8fd0f5,transparent:true,opacity:.5,roughness:.55,clearcoat:.3,side:THREE.DoubleSide,depthWrite:false});
const stripeTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  // frostat glas med svaga ränder, så att golvet syns som en yta men man anar våningarna under
  g.fillStyle='#3d7aa3';g.fillRect(0,0,64,64);g.fillStyle='#4685ae';for(let i=0;i<64;i+=16)g.fillRect(i,0,7,64);
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
})();
const floorMat=new THREE.MeshPhysicalMaterial({map:stripeTex,roughness:.6,clearcoat:.3,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false,
  emissive:0xffffff,emissiveMap:stripeTex,emissiveIntensity:0});   // (lyser upp golven när man zoomar ut)
const floorGlowMat=new THREE.MeshStandardMaterial({map:stripeTex,roughness:.7,emissive:0xffd166,emissiveIntensity:.6,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false});
const edgeMat=new THREE.LineBasicMaterial({color:0x8fe3ff,transparent:true,opacity:.45});
// Floor glass 1–10: hur genomskinligt golvet är (7 ≈ 65 % genomskinligt). Sprucket glas följer med, lite tätare.
const crackMats=[];
const floorOpacity=()=>Math.max(.08,Math.min(.95,1-(settings.glass??7)*.09));
function applyGlass(){floorMat.opacity=floorOpacity();for(const m of crackMats)if(!m.userData.falling)m.opacity=Math.min(.9,floorMat.opacity+.15)}   // (anropas när inställningarna är lästa)
const holeMat=new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1});
const redMat=new THREE.MeshStandardMaterial({color:0xff4d5e,emissive:0xff3344,emissiveIntensity:1.1});
const cellGroups=new Map();      // ruta → grupp (för att kunna visa bara rutor nära hamstern)
const wallPanels=new Map();      // "ruta:riktning" → glasväggen {m, e, g, d, k} (frön kan slå sönder den)
// Golvets undersida: en stor mörkröd fyrkant (som de stora röda ringarna). Rullar något ut på den faller det igenom.
// Syns inte utifrån (utzoomat).
const UNDERS=[];
const underMat=new THREE.MeshStandardMaterial({color:0x5a1a1f,emissive:0x601016,emissiveIntensity:.3,transparent:true,opacity:.55,depthWrite:false});
const underFillMat=new THREE.MeshStandardMaterial({color:0x1c0507,emissive:0x2a0508,emissiveIntensity:.4,transparent:true,opacity:.45,depthWrite:false});
const underFrameGeo=(()=>{const o=CELL*.42,i=CELL*.34,sh=new THREE.Shape();sh.moveTo(-o,-o);sh.lineTo(o,-o);sh.lineTo(o,o);sh.lineTo(-o,o);sh.lineTo(-o,-o);
  const h=new THREE.Path();h.moveTo(-i,-i);h.lineTo(-i,i);h.lineTo(i,i);h.lineTo(i,-i);h.lineTo(-i,-i);sh.holes.push(h);return new THREE.ShapeGeometry(sh)})();
const underFillGeo=new THREE.PlaneGeometry(CELL*.68,CELL*.68);
function addUnderside(c,d,g){
  const n=dirVec(d),pos=center(c).addScaledVector(n,CELL/2-PANEL_IN+.006);
  for(const [geo,mat,o] of [[underFrameGeo,underMat,.002],[underFillGeo,underFillMat,0]]){
    const m=new THREE.Mesh(geo,mat);m.position.copy(pos).addScaledVector(n,o);m.lookAt(m.position.clone().add(n));m.renderOrder=1;g.add(m);UNDERS.push(m);
  }
}
const segFloors=SEGS.map(()=>[]);
// Ett golv med ett runt hål i mitten (platt skiva med hål), vänd mot riktningen d
function pitFloor(c,d,r){
  const s=CELL-2*PANEL_IN, sh=new THREE.Shape();
  sh.moveTo(-s/2,-s/2);sh.lineTo(s/2,-s/2);sh.lineTo(s/2,s/2);sh.lineTo(-s/2,s/2);sh.lineTo(-s/2,-s/2);
  const hole=new THREE.Path();hole.absarc(0,0,r,0,Math.PI*2,true);sh.holes.push(hole);
  const geo=new THREE.ShapeGeometry(sh,32);
  const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/s+.5,uv.getY(i)/s+.5);
  const m=new THREE.Mesh(geo,floorMat);
  const n=dirVec(d);
  m.position.copy(center(c)).addScaledVector(n,CELL/2-FLOOR_GAP);
  m.lookAt(m.position.clone().sub(n));     // skivans framsida uppåt, in i rutan
  m.receiveShadow=true;
  return m;
}
// Ett golv eller tak med ett hål tvärs över: två skivor, en på var sida om hålet
function holedPanel(c,d,hz,mat,g,list){
  const s=CELL-2*PANEL_IN, L=(s-hz.len)/2, av=new THREE.Vector3().setComponent(hz.axis,1);
  if(L<.01)return;   // hålet fyller hela rutan
  for(const sg of [1,-1]){
    const size=[s,s,s];size[DIRS[d][0]]=PANEL_T;size[hz.axis]=L;
    const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
    m.position.copy(center(c)).addScaledVector(dirVec(d),CELL/2-PANEL_IN-PANEL_T/2).addScaledVector(av,sg*(hz.len/2+L/2));
    m.receiveShadow=true;g.add(m);if(list)list.push(m);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edgeMat);e.position.copy(m.position);g.add(e);
  }
}
// Sprucket glas: golvets ränder med vita sprickor
const crackTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#3d7aa3';g.fillRect(0,0,128,128);g.fillStyle='#4685ae';for(let i=0;i<128;i+=32)g.fillRect(i,0,14,128);
  g.strokeStyle='rgba(217,243,255,.75)';g.lineWidth=1.3;
  const branch=(x,y,a,len,depth)=>{if(depth<=0||len<6)return;const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;
    g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();
    branch(x2,y2,a+(Math.sin(x*7.1+y)*.6),len*.7,depth-1);if(depth%2)branch(x2,y2,a-.9,len*.5,depth-2)};
  for(let i=0;i<7;i++)branch(64,64,i/7*Math.PI*2+.3,30,5);
  return new THREE.CanvasTexture(cv);
})();
for(let k=0;k<N*N*N;k++){
  const si=cellSeg[k];if(si<0)continue;
  const c=cellOfId(k),g=new THREE.Group();cube.add(g);cellGroups.set(k,g);
  const hz=HOLES.get(k), hzUp=holeBelow.get(k);
  if(hz&&hz.kind==='crack'){
    // glasskivan som fyller hålet tills den går sönder
    const s=CELL-2*PANEL_IN, size=[s,s,s];size[DIRS[hz.floor][0]]=PANEL_T*.8;size[hz.axis]=hz.len-.02;
    const mat=new THREE.MeshStandardMaterial({map:crackTex,roughness:.5,transparent:true,opacity:.5,emissive:0xbfe9ff,emissiveIntensity:0,depthWrite:false});crackMats.push(mat);
    hz.panel=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
    hz.panel.position.copy(center(c)).addScaledVector(dirVec(hz.floor),CELL/2-PANEL_IN-PANEL_T/2);
    hz.panelHome=hz.panel.position.clone();hz.panel.receiveShadow=true;g.add(hz.panel);
  }
  const pit=pitAt.get(k);
  for(let d=0;d<6;d++){
    const isFloor=d===SEGS[si].floor;
    if(openSeg(si)&&!isFloor)continue;   // gång utan väggar och tak
    if(pit&&isFloor){
      const m=pitFloor(c,d,pit.r);g.add(m);segFloors[si].push(m);
      // ring runt hålet, och för röda hål en mörk grop under
      const n=dirVec(d), pos=center(c).addScaledVector(n,CELL/2-FLOOR_GAP-.01);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(pit.r+.02,.05,10,40),pit.kind==='red'?redMat:holeMat);
      ring.position.copy(pos);ring.lookAt(pos.clone().add(n));g.add(ring);
      if(pit.kind==='red'){
        const well=new THREE.Mesh(new THREE.CylinderGeometry(pit.r,pit.r*.8,.9,32,1,true),new THREE.MeshStandardMaterial({color:0x2a0508,emissive:0x550a12,emissiveIntensity:.6,side:THREE.DoubleSide}));
        well.position.copy(pos).addScaledVector(n,.45);well.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);g.add(well);
        const glow=new THREE.PointLight(0xff3344,.8,3);glow.position.copy(pos).addScaledVector(n,-.3);g.add(glow);
      }
      continue;
    }
    if(hz&&isFloor){holedPanel(c,d,hz,floorMat,g,segFloors[si]);continue}
    if(hzUp&&d===(SEGS[si].floor^1)){holedPanel(c,d,hzUp,wallMat,g,null);continue}
    if(open[k][d])continue;
    const [a]=DIRS[d],size=[CELL-2*PANEL_IN,CELL-2*PANEL_IN,CELL-2*PANEL_IN];size[a]=PANEL_T;
    const m=new THREE.Mesh(new THREE.BoxGeometry(...size),isFloor?floorMat:wallMat);
    m.position.copy(center(c)).addScaledVector(dirVec(d),CELL/2-PANEL_IN-PANEL_T/2);
    m.receiveShadow=true;g.add(m);
    if(isFloor){segFloors[si].push(m);addUnderside(c,d,g)}
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edgeMat);e.position.copy(m.position);g.add(e);
    if(!isFloor&&DIRS[d][0]!==DIRS[SEGS[si].floor][0])wallPanels.set(k+':'+d,{m,e,g,d,k});
  }
}
cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2*HALF+.06,2*HALF+.06,2*HALF+.06)),new THREE.LineBasicMaterial({color:0xcff4ff,transparent:true,opacity:.6})));

// Hål och schakt mellan gångar markeras med en blå ring på hålets plan (runda hål har egen ring)
for(const L of LINKS){
  if(L.kind==='pit')continue;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.06,10,36),holeMat);
  const pos=center(L.x).addScaledVector(dirVec(L.d),CELL/2);
  ring.position.copy(pos);ring.lookAt(pos.clone().add(dirVec(L.d)));
  cellGroups.get(cid(...L.x)).add(ring);
}

// Svängda gångar: golv med ränder, väggar och tak av frostat glas längs bågen
for(const C of CURVES){
  const W=CELL-2*PANEL_IN, H=CELL-2*PANEL_IN, n=40;
  const pos=[],uvs=[],idx=[],wpos=[],widx=[],lines=[];
  const fl=-(R+PANEL_T*0)-.0;   // golvets höjd i förhållande till kulans mitt
  for(let i=0;i<=n;i++){
    const t=i/n, p=C.arc.getPointAt(t), tg=C.arc.getTangentAt(t), sd=new THREE.Vector3().crossVectors(tg,C.up).normalize();
    const base=p.clone().addScaledVector(C.up,-R);
    const L0=base.clone().addScaledVector(sd,-W/2), R0=base.clone().addScaledVector(sd,W/2);
    pos.push(...L0.toArray(),...R0.toArray());uvs.push(0,t*C.arcLen/CELL*2,2,t*C.arcLen/CELL*2);
    const L1=L0.clone().addScaledVector(C.up,H), R1=R0.clone().addScaledVector(C.up,H);
    wpos.push(...L0.toArray(),...L1.toArray(),...R0.toArray(),...R1.toArray());
    if(i<n){
      const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);
      const b=i*4;widx.push(b,b+1,b+4,b+1,b+5,b+4, b+2,b+3,b+6,b+3,b+7,b+6, b+1,b+3,b+5,b+3,b+7,b+5);
      const nb=C.arc.getPointAt((i+1)/n).addScaledVector(C.up,-R), ntg=C.arc.getTangentAt((i+1)/n), nsd=new THREE.Vector3().crossVectors(ntg,C.up).normalize();
      for(const s of [-1,1])for(const h of [0,H]){
        lines.push(base.clone().addScaledVector(sd,s*W/2).addScaledVector(C.up,h),nb.clone().addScaledVector(nsd,s*W/2).addScaledVector(C.up,h));
      }
    }
  }
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));fg.setIndex(idx);fg.computeVertexNormals();
  const floorMesh=new THREE.Mesh(fg,floorMat);floorMesh.receiveShadow=true;cube.add(floorMesh);
  segFloors[cellSeg[cid(...C.a.c)]].push(floorMesh);
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wpos,3));wg.setIndex(widx);wg.computeVertexNormals();
  cube.add(new THREE.Mesh(wg,wallMat));
  cube.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines),edgeMat));
}

// Eldörrar: en skiva i öppningen med en lampa ovanför, röd när batteriet inte räcker och grön när det gör det
const lampRed=new THREE.MeshStandardMaterial({color:0xff3344,emissive:0xff2233,emissiveIntensity:1.4});
const lampGreen=new THREE.MeshStandardMaterial({color:0x44ff77,emissive:0x22ff66,emissiveIntensity:1.4});
const lampOff=new THREE.MeshStandardMaterial({color:0x445566,roughness:.6});
const doorMat=new THREE.MeshStandardMaterial({color:0xd98a2b,roughness:.45,metalness:.5,transparent:true,opacity:.92});
const liftDoorMat=new THREE.MeshStandardMaterial({color:0x9aa3ad,roughness:.35,metalness:.6,transparent:true,opacity:.9});   // hissdörrar
const grateMat=new THREE.MeshStandardMaterial({color:0x8b96a1,metalness:.7,roughness:.35});
for(const D of DOORS){
  const n=dirVec(D.d), fd=SEGS[cellSeg[cid(...D.a)]].floor, upv=dirVec(fd^1);
  if(D.grate){
    // grind: lodräta stålstänger och en ram (öppnas av en knapp och glider ner i golvet)
    const pos=center(D.a).addScaledVector(n,CELL/2);D.panel=new THREE.Group();D.panel.position.copy(pos);cube.add(D.panel);
    const side=[0,1,2].find(i=>i!==DIRS[D.d][0]&&i!==DIRS[fd][0]),sv=new THREE.Vector3().setComponent(side,1);
    for(let i=-4;i<=4;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,CELL-.3,8),grateMat);b.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);b.position.copy(sv).multiplyScalar(i*(CELL-.4)/8);D.panel.add(b)}
    for(const h of [-1,1]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,CELL-.3,8),grateMat);b.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),sv);b.position.copy(upv).multiplyScalar(h*(CELL-.4)/2);D.panel.add(b)}
    D.panelHome=pos.clone();D.up=upv;D.lamps=[];D.light=null;
    continue;
  }
  const pos=center(D.a).addScaledVector(n,CELL/2);
  const size=[CELL-.3,CELL-.3,CELL-.3];size[DIRS[D.d][0]]=.08;
  D.group=new THREE.Group();cube.add(D.group);
  D.panel=new THREE.Mesh(new THREE.BoxGeometry(...size),doorMat);D.panel.position.copy(pos);D.group.add(D.panel);
  D.panelHome=pos.clone();D.up=upv;
  const stripes=new THREE.LineSegments(new THREE.EdgesGeometry(D.panel.geometry),new THREE.LineBasicMaterial({color:0x332211}));D.panel.add(stripes);
  // en lampa på varje sida av dörren, en bit ovanför mitten, så att den syns från båda hållen
  D.lamps=[1,-1].map(side=>{
    const l=new THREE.Mesh(new THREE.SphereGeometry(.1,16,12),lampRed);
    l.position.copy(n).multiplyScalar(side*.07).addScaledVector(upv,.5);D.panel.add(l);return l;
  });
  D.light=new THREE.PointLight(0xff3344,.9,3.2);D.light.position.copy(pos).addScaledVector(upv,.5);D.group.add(D.light);
}
// Hamsterhjulet: ett stående hjul med pinnar. Axeln pekar mot gången, så att hamstern rullar in
// genom hjulets öppna sida. Bakre sidan har ekrar och ett stöd. På väggen i springriktningen sitter
// ett batteri som fylls medan hamstern springer.
// En bana kan ha flera hjul (wheels; en äldre bana kan ha ett enda 'wheel'). Alla laddar samma batteri.
const WHEELS=[];
let wheel=null;   // hjulet hamstern är i (eller var i senast)
for(const W of [...(LV.wheels||[]),...(LV.wheel?[LV.wheel]:[])]){
  const fd=SEGS[cellSeg[cid(...W.c)]].floor, upv=dirVec(fd^1), openV=dirVec(W.open), axisV=openV.clone();
  const WR=.95, floorPt=center(W.c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP);
  const g=new THREE.Group();g.position.copy(floorPt).addScaledVector(upv,WR+.02);cube.add(g);
  const spin=new THREE.Group();g.add(spin);
  const rimMat=new THREE.MeshStandardMaterial({color:0xc9d6e3,metalness:.7,roughness:.3});
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axisV);   // hjulets plan är vinkelrätt mot axeln
  for(const off of [-.45,.45]){
    const rim=new THREE.Mesh(new THREE.TorusGeometry(WR,.04,10,48),rimMat);rim.quaternion.copy(q);rim.position.copy(axisV).multiplyScalar(off);spin.add(rim);
    if(off>0)continue;   // ekrar bara på bakre sidan, så att öppningen är fri
    for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,2*WR,6),rimMat);
      sp.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),i*Math.PI/4));sp.position.copy(rim.position);spin.add(sp)}
  }
  const perp2=new THREE.Vector3().crossVectors(axisV,upv);
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2, rung=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.9,6),rimMat);
    rung.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axisV);
    rung.position.copy(upv).multiplyScalar(Math.cos(a)*WR).addScaledVector(perp2,Math.sin(a)*WR);spin.add(rung);
  }
  // stöd bakom hjulet (inte i öppningen)
  const standMat=new THREE.MeshStandardMaterial({color:0x7a8794,metalness:.5,roughness:.4});
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,WR+.02,8),standMat);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
  leg.position.copy(axisV).multiplyScalar(-.6).addScaledVector(upv,-(WR+.02)/2);g.add(leg);
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.2,8),standMat);axle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axisV);axle.position.copy(axisV).multiplyScalar(-.52);g.add(axle);
  // Batteriet på väggen i springriktningen: en ram, en stapel som fylls nerifrån och en blixt ovanför
  const runV=dirVec(W.run), wallPt=center(W.c).addScaledVector(runV,CELL/2-FLOOR_GAP-.02);
  const BH=1.1, BW=.34, bottom=floorPt.clone().addScaledVector(upv,.45);
  const gauge=new THREE.Group();gauge.position.copy(wallPt);gauge.position.setComponent(DIRS[fd][0],bottom.getComponent(DIRS[fd][0]));cube.add(gauge);
  gauge.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(upv,runV.clone().negate()),upv,runV.clone().negate()));
  const frame=new THREE.Mesh(new THREE.PlaneGeometry(BW+.12,BH+.12),new THREE.MeshStandardMaterial({color:0x0b1a28,roughness:.6}));frame.position.set(0,BH/2,0);gauge.add(frame);
  const fillMat=new THREE.MeshStandardMaterial({color:0xff4d5e,emissive:0xff2233,emissiveIntensity:.9});
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(BW,BH),fillMat);fill.position.set(0,0,.01);gauge.add(fill);
  const bolt=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),new THREE.MeshBasicMaterial({transparent:true,map:(()=>{
    const cv=document.createElement('canvas');cv.width=cv.height=64;const c2=cv.getContext('2d');
    c2.fillStyle='#ffd166';c2.beginPath();c2.moveTo(38,4);c2.lineTo(14,36);c2.lineTo(30,36);c2.lineTo(24,60);c2.lineTo(50,26);c2.lineTo(34,26);c2.closePath();c2.fill();
    return new THREE.CanvasTexture(cv);})()}));
  bolt.position.set(0,BH+.28,.01);gauge.add(bolt);
  WHEELS.push({...W,group:g,spin,axisV,openV,runV,cellKey:cid(...W.c),floor:fd,fill,fillMat,BH});
}
const isWheel=k=>WHEELS.some(W=>W.cellKey===k);

// ---------- Hissen ----------
// En glasplatta i ett lodrätt schakt mellan rutan a (övre) och b (undre), med samma golv.
// Rullar hamstern upp på plattan med fullt batteri åker den till den andra våningen och batteriet töms.
// Utan fullt batteri händer ingenting. Står plattan på den andra våningen åker den tom till hamstern
// (gratis) när hamstern kommer nära. Så länge plattan inte står vid en våning är öppningen där stängd.
// Flera hissar går bra: var och en har sin egen platta och sitt eget läge.
const LIFTS=[];
for(const L of LIFT_DEFS){
  const ka=cid(...L.a), kb=cid(...L.b), fd=SEGS[cellSeg[ka]].floor, fa=DIRS[fd][0], sg=DIRS[fd][1];
  const surf=c=>coordOf(c[fa])+sg*(CELL/2-FLOOR_GAP);      // golvets ovansida i rutan c
  const g=new THREE.Group();cube.add(g);
  const s0=CELL-2*PANEL_IN-.06, size=[s0,s0,s0];size[fa]=PANEL_T;
  const plate=new THREE.Mesh(new THREE.BoxGeometry(...size),floorMat);plate.receiveShadow=true;g.add(plate);
  const rimMat=new THREE.MeshStandardMaterial({color:0xffc94d,emissive:0xffb020,emissiveIntensity:.35,metalness:.4,roughness:.4});
  const rim=new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry),new THREE.LineBasicMaterial({color:0xffc94d}));g.add(rim);
  // lampa på plattan: röd när batteriet inte räcker, grön när det gör det
  const upv=dirVec(fd^1), cornerAxes=[0,1,2].filter(a=>a!==fa);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),lampRed);
  lamp.position.copy(upv).multiplyScalar(.1).setComponent(cornerAxes[0],s0/2-.12).setComponent(cornerAxes[1],s0/2-.12);g.add(lamp);
  // tydliga gula kanter i schaktets fyra hörn, från golvet i den undre rutan till taket i den övre
  const yA=surf(L.a), yB=surf(L.b);
  const bottom=coordOf(L.b[fa])+sg*CELL/2, top=coordOf(L.a[fa])-sg*CELL/2, len=Math.abs(top-bottom);
  const edgeYellow=new THREE.MeshStandardMaterial({color:0xffd23a,emissive:0xffb800,emissiveIntensity:.7,roughness:.4});
  for(const [u,v] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
    const r=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,len,10),edgeYellow);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
    r.position.copy(center(L.a)).setComponent(fa,(top+bottom)/2).setComponent(cornerAxes[0],coordOf(L.a[cornerAxes[0]])+u*(CELL/2-PANEL_IN-.04)).setComponent(cornerAxes[1],coordOf(L.a[cornerAxes[1]])+v*(CELL/2-PANEL_IN-.04));
    cube.add(r);
  }
  const LF={a:L.a,b:L.b,ka,kb,floor:fd,fa,sg,yA,yB,y:yA,at:'a',move:null,lock:false,told:false,group:g,lamp};
  // plattans läge längs golvaxeln (plattans mitt ligger en halv skivtjocklek under ovansidan)
  LF.place=()=>{g.position.set(0,0,0).setComponent(fa,LF.y+sg*PANEL_T/2);g.position.setComponent(cornerAxes[0],coordOf(L.a[cornerAxes[0]])).setComponent(cornerAxes[1],coordOf(L.a[cornerAxes[1]]))};
  LF.place();LIFTS.push(LF);
  // Hissdörrar: en skjutdörr i varje öppning från gången in till hissrutan, på båda våningarna, med en lampa.
  // Öppnas bara när plattan står på våningen och batteriet är fullt (eller när hamstern ska rulla ut efter en åktur).
  LF.doors=[];
  for(const [end,c] of [['a',L.a],['b',L.b]]){
    const k=cid(...c),dfd=SEGS[cellSeg[k]].floor,dup=dirVec(dfd^1);
    for(let d=0;d<6;d++){
      if(open[k][d]!==1)continue;
      const n=dirVec(d),pos=center(c).addScaledVector(n,CELL/2-.02);
      const size=[CELL-.3,CELL-.3,CELL-.3];size[DIRS[d][0]]=.07;
      const panel=new THREE.Mesh(new THREE.BoxGeometry(...size),liftDoorMat);panel.position.copy(pos);cube.add(panel);
      panel.add(new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry),new THREE.LineBasicMaterial({color:0xffd23a})));
      const lamps=[1,-1].map(side=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),lampRed);l.position.copy(n).multiplyScalar(side*.06).addScaledVector(dup,.55);panel.add(l);return l});
      LF.doors.push({end,k,d,panel,home:pos.clone(),up:dup,lamps,anim:0});
    }
  }
}

// ---------- Skyltar ----------
// En stolpe i rutans hörn med en skylt ovanpå: mörkblå med gul kant, pil och engelsk text och en liten
// hjulsymbol. Två sidor, så att pilen pekar rätt håll från båda hållen. Lyser svagt (påverkas inte av ljus).
function signTexture(text,tipRight){
  const cv=document.createElement('canvas');cv.width=512;cv.height=160;const g=cv.getContext('2d');
  g.fillStyle='#0b2a4a';g.fillRect(0,0,512,160);g.strokeStyle='#ffd166';g.lineWidth=10;g.strokeRect(5,5,502,150);
  // pilen
  g.fillStyle='#ffd166';g.save();if(!tipRight){g.translate(512,0);g.scale(-1,1)}
  g.beginPath();g.moveTo(400,58);g.lineTo(440,58);g.lineTo(440,34);g.lineTo(492,80);g.lineTo(440,126);g.lineTo(440,102);g.lineTo(400,102);g.closePath();g.fill();
  g.restore();
  // texten i resten av skylten, mindre om den är lång
  const x0=tipRight?24:120, x1=tipRight?392:488;let fs=52;
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
  do{g.font=`bold ${fs}px sans-serif`;fs-=2}while(fs>18&&g.measureText(text).width>x1-x0);
  g.fillText(text,(x0+x1)/2,82);
  const t=new THREE.CanvasTexture(cv);return t;
}
for(const S of LV.signs||[]){
  // Hänger från taket vid öppningen framåt (underkant 1,45, strax under kamerans höjd), lite åt pilens håll,
  // så att den syns rakt fram
  const fd=SEGS[cellSeg[cid(...S.c)]].floor, upv=dirVec(fd^1), av=dirVec(S.ahead), pv=dirVec(S.point);
  const floorPt=center(S.c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP);
  const W=1.15,H=.34, mid=floorPt.clone().addScaledVector(av,CELL/2-.05).addScaledVector(pv,.05).addScaledVector(upv,1.45+H/2);
  const g=new THREE.Group();cube.add(g);
  const rodMat=new THREE.MeshStandardMaterial({color:0x8893a0,metalness:.4,roughness:.5});
  const top=CELL-2*FLOOR_GAP-(1.45+H);   // från skyltens överkant upp till taket
  for(const s2 of [-1,1]){
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,top,6),rodMat);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
    rod.position.copy(mid).addScaledVector(upv,H/2+top/2).addScaledVector(new THREE.Vector3().crossVectors(upv,av),s2*W*.38);g.add(rod);
  }
  for(const side of [1,-1]){
    const nrm=av.clone().multiplyScalar(-side);             // framsidan mot rutan, baksidan mot nästa ruta
    const xa=new THREE.Vector3().crossVectors(upv,nrm);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:signTexture(S.text,pv.dot(xa)>0)}));
    plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa,upv,nrm));
    plane.position.copy(mid).addScaledVector(nrm,.01);g.add(plane);
  }
}

// ---------- Solrosfrön ----------
// Små svart- och vitrandiga frön som svävar och snurrar strax ovanför golvet. Ligger lite olika i varje ruta.
const MOUTH_MAX=10;
const seedTex=(()=>{
  const cv=document.createElement('canvas');cv.width=128;cv.height=32;const g=cv.getContext('2d');
  g.fillStyle='#1a1a1a';g.fillRect(0,0,128,32);g.fillStyle='#f2efe6';
  for(let i=0;i<8;i++)g.fillRect(i*16+5,0,4,32);
  return new THREE.CanvasTexture(cv);
})();
const seedGeo=new THREE.SphereGeometry(1,16,12);
const seedMat=new THREE.MeshStandardMaterial({map:seedTex,roughness:.5,emissive:0xffffff,emissiveMap:seedTex,emissiveIntensity:.25});
function seedMesh(){
  // långt (längs y) och lite tillplattat, med ränderna på längden
  const m=new THREE.Mesh(seedGeo,seedMat);m.scale.set(.075,.17,.05);m.castShadow=true;return m;
}
const SEEDS=(LV.seeds||[]).map((c,i)=>{
  const k=cid(...c), fd=SEGS[cellSeg[k]].floor, upv=dirVec(fd^1), fa=DIRS[fd][0];
  const pos=center(c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP-.24);
  // utspridd: en fast förskjutning i golvplanet, olika för varje frö
  const [a1,a2]=[0,1,2].filter(a=>a!==fa);
  pos.setComponent(a1,pos.getComponent(a1)+(((k*37+i*11)%9)/8-.5)*.9);
  pos.setComponent(a2,pos.getComponent(a2)+(((k*53+i*7)%7)/6-.5)*.9);
  const g=new THREE.Group();g.position.copy(pos);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
  const spin=new THREE.Group();g.add(spin);
  const m=seedMesh();m.rotation.z=Math.PI/2-.35;spin.add(m);
  cellGroups.get(k).add(g);
  return {k,pos,upv,g,spin,ph:i*1.7,taken:false};
});
let mouth=0, seedHint=false, fullHint=false, spitHint=false;

// Utgången: en guldring på kubens yta
const exitN=dirVec(exitDir), exitPos=center(exitCell).addScaledVector(exitN,CELL/2);
// Utgången är en lucka av gulaktig plast, lika stor som väggen, med gångjärnen upptill och ett runt handtag nertill.
// Hamstern rullar fram till den (tiden stannar), säger att den är redo, kameran zoomar ut till luckan och spelaren
// trycker på den: luckan svänger upp och hamstern rullar ut.
const exitUp=dirVec(SEGS[cellSeg[cid(...exitCell)]].floor^1), exitSide=new THREE.Vector3().crossVectors(exitUp,exitN);
const HATCH_S=CELL-2*PANEL_IN;
const exitHinge=new THREE.Group();exitHinge.position.copy(center(exitCell)).addScaledVector(exitN,CELL/2-PANEL_IN-PANEL_T/2).addScaledVector(exitUp,HATCH_S/2);cube.add(exitHinge);
const exitHatchMat=new THREE.MeshPhysicalMaterial({color:0xffc94a,transparent:true,opacity:.72,roughness:.3,clearcoat:.6,emissive:0xffb020,emissiveIntensity:.15});
const hatchSize=[HATCH_S,HATCH_S,HATCH_S];hatchSize[DIRS[exitDir][0]]=PANEL_T;
const exitHatch=new THREE.Mesh(new THREE.BoxGeometry(...hatchSize),exitHatchMat);exitHatch.position.copy(exitUp).multiplyScalar(-HATCH_S/2);exitHinge.add(exitHatch);
{const e=new THREE.LineSegments(new THREE.EdgesGeometry(exitHatch.geometry),new THREE.LineBasicMaterial({color:0x8a6400}));e.position.copy(exitHatch.position);exitHinge.add(e);
  const gold=new THREE.MeshStandardMaterial({color:0xffd166,metalness:.7,roughness:.25,emissive:0x8a6400,emissiveIntensity:.4});
  for(const o of [.05,-.05]){const r=new THREE.Mesh(new THREE.TorusGeometry(.16,.035,10,28),gold);r.position.copy(exitUp).multiplyScalar(-HATCH_S+.42).addScaledVector(exitN,o);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),exitN);exitHinge.add(r)}
  const hingeMat=new THREE.MeshStandardMaterial({color:0x2a3138,metalness:.6,roughness:.4});
  for(const o of [-.7,.7]){const h=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.3,12),hingeMat);h.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),exitSide);h.position.copy(exitSide).multiplyScalar(o);exitHinge.add(h)}}
{const sz=[0,0,0];sz[DIRS[exitDir][0]]=1.3;for(let a=0;a<3;a++)if(a!==DIRS[exitDir][0])sz[a]=Math.abs(exitUp.getComponent(a))>.5?PANEL_T:HATCH_S;
  const step=new THREE.Mesh(new THREE.BoxGeometry(...sz),new THREE.MeshStandardMaterial({color:0xffc94a,roughness:.4,emissive:0xffb020,emissiveIntensity:.12}));
  step.position.copy(exitPos).addScaledVector(exitN,.65).addScaledVector(exitUp,-(CELL/2-FLOOR_GAP+PANEL_T/2));cube.add(step)}   // tröskeln utanför luckan
const exitGlow=new THREE.PointLight(0xffd166,.7,5);exitGlow.position.copy(exitPos).addScaledVector(exitN,-.9);cube.add(exitGlow);
let exitState=null, exitMs=0, exitAnim=null;   // exitState: 'wait' (vid luckan, väntar på tryck), 'open' (öppnas), 'out' (rullar ut)

// Glasrören utanför kuben
const TUBE_R=.56;
let tubeCurve=null,tubeLen=0;   // röret hamstern åker i just nu
let tubeReach=0;                // hur långt från kubens mitt rören når (för kameran utifrån)
// Rörets väg: rakt ut från båda ändarna och en båge utanför kuben. Ligger ändarna på samma sida går bågen
// rakt ut från den sidan; på två sidor som möts går den runt kanten; på motsatta sidor går den runt kuben
// (över den sida som ligger närmast ändarna).
function tubePath(T){
  const na=dirVec(T.a.d), nb=dirVec(T.b.d);
  const pa=center(T.a.c).addScaledVector(na,CELL/2), pb=center(T.b.c).addScaledVector(nb,CELL/2);
  const m=pa.clone().add(pb).multiplyScalar(.5);
  let o=na.clone().add(nb);
  if(o.lengthSq()<.25){
    // motsatta sidor: åt det håll (vinkelrätt mot sidorna) som ändarna ligger, annars uppåt i kuben
    o=m.clone().addScaledVector(na,-m.dot(na));
    if(o.lengthSq()<.25){const ax=DIRS[T.a.d][0];o=new THREE.Vector3().setComponent(ax===1?2:1,1)}
    const a=[0,1,2].reduce((b,i)=>Math.abs(o.getComponent(i))>Math.abs(o.getComponent(b))?i:b,0);o=new THREE.Vector3().setComponent(a,Math.sign(o.getComponent(a)));
  }
  o.normalize();
  const ext=HALF*(Math.abs(o.x)+Math.abs(o.y)+Math.abs(o.z));   // hur långt kuben når åt det hållet
  const out=v=>v.addScaledVector(o,Math.max(0,ext+1.4-v.dot(o)));
  const mid=out(m.clone().addScaledVector(o,-m.dot(o)).addScaledVector(o,ext+3.2));
  const pts=[pa,pa.clone().addScaledVector(na,1.3)];
  if(na.dot(nb)<-.5)pts.push(out(pa.clone().addScaledVector(na,2.4)));
  pts.push(mid);
  if(na.dot(nb)<-.5)pts.push(out(pb.clone().addScaledVector(nb,2.4)));
  pts.push(pb.clone().addScaledVector(nb,1.3),pb);
  return new THREE.CatmullRomCurve3(pts,false,'centripetal');
}
for(const T of TUBES){
  T.curve=tubePath(T);T.len=T.curve.getLength();
  for(const q of T.curve.getSpacedPoints(40))tubeReach=Math.max(tubeReach,q.length()+TUBE_R);
  const tubeCurve=T.curve;
  cube.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,200,TUBE_R,20,false),
    new THREE.MeshPhysicalMaterial({color:0xbfefff,transparent:true,opacity:.22,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false})));
  const frameMat=new THREE.MeshStandardMaterial({color:0x8fe3ff,roughness:.3,metalness:.2});
  const frameGeo=new THREE.TorusGeometry(TUBE_R+.02,.035,8,28);
  for(let i=0;i<=10;i++){
    const u=i/10,p=tubeCurve.getPointAt(u);
    const ring=new THREE.Mesh(frameGeo,frameMat);
    ring.position.copy(p);ring.lookAt(p.clone().add(tubeCurve.getTangentAt(u)));cube.add(ring);
  }
}

// ---------- Tyngdkraften ----------
// baseQ är kubens vridning. ga/gs är tyngdkraftens axel och tecken i kubens egna koordinater.
// up, ex och ez är kubens egna riktningar för upp och för golvplanet (ex × up = ez).
const baseQ=new THREE.Quaternion();
let ga=1,gs=-1;
const up=new THREE.Vector3(),ex=new THREE.Vector3(),ez=new THREE.Vector3();
const axisOf=v=>Math.abs(v.x)>.5?0:Math.abs(v.y)>.5?1:2;
const planeAxes=()=>[0,1,2].filter(a=>a!==ga);
// Vilken av kubens riktningar som pekar nedåt när kuben är vriden q
function downDirOf(q){const d=new THREE.Vector3(0,-1,0).applyQuaternion(q.clone().invert());const a=axisOf(d);return dirIndex(a,Math.sign(d.getComponent(a)))}
function updateGravity(){
  const d=downDirOf(baseQ);
  ga=DIRS[d][0];gs=DIRS[d][1];
  up.set(0,0,0).setComponent(ga,-gs);
  ex.set(0,0,0).setComponent(ga===0?1:0,1);
  ez.crossVectors(ex,up);
}
const downDir=()=>dirIndex(ga,gs), upDir=()=>dirIndex(ga,-gs);
const floorCoord=c=>coordOf(c[ga])+gs*(CELL/2-FLOOR_GAP-R);
const cellOf=p=>[0,1,2].map(a=>Math.max(0,Math.min(N-1,Math.floor(p.getComponent(a)/CELL+N/2))));
// Kuben från början: startgångens golv nedåt (används också när hamstern börjar om vid starten)
const START_Q=(()=>{
  const q=new THREE.Quaternion().setFromUnitVectors(dirVec(SEGS[cellSeg[cid(...START)]].floor),new THREE.Vector3(0,-1,0));
  const m=new THREE.Matrix4().makeRotationFromQuaternion(q);for(let i=0;i<16;i++)m.elements[i]=Math.round(m.elements[i]);
  return q.setFromRotationMatrix(m);
})();
baseQ.copy(START_Q);
updateGravity();

// ---------- Kula ----------
const hamsterTex=new THREE.TextureLoader().load(hamsterTexUrl);
hamsterTex.colorSpace=THREE.SRGBColorSpace;
// Kulan är hamstern själv och ligger i kubens koordinater, så den följer med när kuben vrids.
const ball=new THREE.Group();cube.add(ball);
const hamsterMat=new THREE.MeshStandardMaterial({map:hamsterTex,roughness:.75,emissive:0xffd166,emissiveIntensity:0});
const hamster=new THREE.Group();ball.add(hamster);
const hamsterBody=new THREE.Mesh(new THREE.SphereGeometry(R,32,24),hamsterMat);
hamsterBody.castShadow=true;hamster.add(hamsterBody);
const p=center(START);p.setComponent(ga,floorCoord(START));
let vx=0,vz=0;          // fart i golvplanet, längs ex och ez
let roll=0;             // hur långt kulan rullat framåt, i radianer (0 = ansiktet framåt)

// ---------- Riktning (first person) ----------
// I golvplanet är framåt för riktning h = sin h·ex + cos h·ez, och höger = -cos h·ex + sin h·ez.
// Ansiktet sitter vid u≈0.5 i bilden (mitt i), vilket på klotet motsvarar riktningen FACE.
const FACE=Math.atan2(-Math.cos(.5*2*Math.PI),Math.sin(.5*2*Math.PI));
hamsterBody.rotation.y=-FACE;
// Den ihopkrupna hamstern (3D-modell) inuti en osynlig kula med radien R: ansiktet framåt (+z), öronen uppåt (+y).
// Modellen är 1,08 i radie (fötterna sticker ut lite) och skalas så att allt ryms i kulan.
// Tills den har laddats (eller om den inte går att ladda) syns den gamla kulan.
const heroMats=[];
if(THREE.GLTFLoader)new THREE.GLTFLoader().load('hc_hamster_curled_05.glb',g=>{
  const m=g.scene;m.scale.setScalar(R/1.08);
  m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material.emissive=new THREE.Color(0xffd166);o.material.emissiveIntensity=0;heroMats.push(o.material)}});
  hamster.add(m);hamsterBody.visible=false;
},undefined,()=>{});
const fwdOf=h=>[Math.sin(h),Math.cos(h)];
const rightOf=h=>[-Math.cos(h),Math.sin(h)];
const fwd3=h=>ex.clone().multiplyScalar(Math.sin(h)).addScaledVector(ez,Math.cos(h));
const angleOf=v=>Math.atan2(v.dot(ex),v.dot(ez));
let MAX_SPEED=6.3; const GRIP=4; // enheter/s vid full lutning (ställs in med Top speed), och hur snabbt farten hänger med
const SHAFT_SPEED=4.2;           // farten som inbromsningen under schaktet räknas från (oberoende av Top speed)
let heading=angleOf(dirVec(LV.start.d));
let turn=null;          // hopp: {from,to,t,roll0,kind} — kind 'turn' (tvär sväng) eller 'stop' (stannar)
let turnArmed=true;     // sidlutningen måste släppas innan nästa hopp-sväng
const HOP_TIME=.45, HOP_H=.32;            // hoppets längd i sekunder och höjd
// ---------- Inställningar (sparas i telefonen) ----------
const settings={dead:5,turn:6,brake:7,level:false,help:false,speed:6,sound:true,volume:7,glass:7,fullTilt:28};
try{Object.assign(settings,JSON.parse(localStorage.getItem('hc_settings')||'{}'))}catch(err){}
// Fasta värden (provade fram, inga reglage längre): gäller även om telefonen sparat andra från tidigare
Object.assign(settings,{glass:8,speed:6,fullTilt:26,dead:15,turn:2,brake:7});
const saveSettings=()=>{try{localStorage.setItem('hc_settings',JSON.stringify(settings))}catch(err){}};
// Top speed 1–10: farten vid full lutning (yttre cirkeln i vattenpasset). 4 motsvarar den gamla farten.
const applySpeed=()=>{MAX_SPEED=1.05*settings.speed};
applySpeed();
applyGlass();
// ---------- Ljud ----------
// Alla ljud skapas i webbläsarens ljudmotor (Web Audio), utan ljudfiler. Korta ljud spelas vid händelser;
// rullning, rör, hissmotor, jakt, laddning och en svag bakgrundston är löpande och följer spelet varje bild.
// Ljudet startar när man trycker Start (telefoner tillåter ljud först efter ett tryck).
const SFX=(()=>{
  let ctx=null, master=null, nb=null;
  const L={};                       // löpande ljud: {g: gain, ...}
  const on=()=>ctx&&settings.sound!==false;
  function vol(){return settings.sound===false?0:Math.pow((settings.volume??7)/10,1.5)}
  function init(){
    if(ctx){ctx.resume&&ctx.resume();return}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{ctx=new AC()}catch(err){return}
    master=ctx.createGain();master.gain.value=vol();master.connect(ctx.destination);
    nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const noiseLoop=(type,f,q)=>{const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start();return {g,fl}};
    const oscLoop=(type,f)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=f;const g=ctx.createGain();g.gain.value=0;o.connect(g);g.connect(master);o.start();return {g,o}};
    L.roll=noiseLoop('lowpass',200,1);
    L.evilRoll=noiseLoop('lowpass',150,1);
    L.tube=noiseLoop('bandpass',900,.8);
    L.chase=noiseLoop('lowpass',140,2);
    L.motor=oscLoop('sawtooth',62);{const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=260;L.motor.g.disconnect();L.motor.g.connect(fl);fl.connect(master)}
    L.charge=oscLoop('triangle',220);
    L.amb1=oscLoop('sine',55);L.amb2=oscLoop('sine',82.6);
    loadSay();
    addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():ctx.resume()});
  }
  const set=(prm,v,tc=.06)=>prm.setTargetAtTime(v,ctx.currentTime,tc);
  // En ton: frekvens f (glider till f2), längd dur
  function tone(f,dur,{type='sine',v=.25,f2=null,delay=0,attack=.006}={}){
    if(!on()||!(v>.001))return;const t=ctx.currentTime+delay, o=ctx.createOscillator(), g=ctx.createGain();   // (för svagt: hoppas över)
    o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+attack+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+attack+dur+.05);
  }
  // Brus genom ett filter (f glider till f2)
  function noise(dur,{v=.25,type='lowpass',f=1200,f2=null,q=1,delay=0,attack=.004}={}){
    if(!on()||!(v>.001))return;const t=ctx.currentTime+delay, s=ctx.createBufferSource(), fl=ctx.createBiquadFilter(), g=ctx.createGain();
    s.buffer=nb;s.loop=true;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+attack+dur);fl.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+dur);
    s.connect(fl);fl.connect(g);g.connect(master);s.start(t,Math.random()*.5);s.stop(t+attack+dur+.05);
  }
  // Hamsterns repliker: små ljudfiler som laddas när ljudet startar och spelas genom samma volym
  const SAY={};
  const SAY_IDS=['holding_on','ready','thats_it','wheee','ouch','uh_oh','missed_me','let_me_go','charged','more_power','cracking','anyone_there','free','oh_no','yum','take_that','nothing_to_hold','cant_break','ready_to_leave'];
  function loadSay(){for(const id of SAY_IDS)fetch('hc_say_'+id+'.mp3').then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&ctx.decodeAudioData(b,buf=>{SAY[id]=buf},()=>{})).catch(()=>{})}
  let sayUntil=0;const sayLast={};
  // Säg en replik. Inte mitt i en annan, och samma replik högst var 8:e sekund (om inte force).
  function say(id,force){
    if(!on()||!SAY[id])return;
    const now=ctx.currentTime;
    if(now<sayUntil&&!force)return;
    if(!force&&sayLast[id]&&now-sayLast[id]<8)return;
    const src=ctx.createBufferSource();src.buffer=SAY[id];const g=ctx.createGain();g.gain.value=1.1;
    src.connect(g);g.connect(master);src.start();sayUntil=now+SAY[id].duration+.15;sayLast[id]=now;
  }
  const notes=(list,{type='triangle',v=.2,step=.13,len=.18}={})=>list.forEach((f,i)=>tone(f,len,{type,v,delay:i*step}));
  let lastBump=0;
  const S={
    init, tone, noise, say,
    setVolume(){if(master)set(master.gain,vol(),.05)},
    state(){return ctx?ctx.state:'none'},
    sayCount(){return Object.keys(SAY).length},
    levels(){return ctx?{roll:+L.roll.g.gain.value.toFixed(3),evilRoll:+L.evilRoll.g.gain.value.toFixed(3),chase:+L.chase.g.gain.value.toFixed(3)}:null},
    // hjälten
    jump(){tone(330,.16,{type:'sine',f2:720,v:.22});tone(660,.1,{type:'triangle',f2:990,v:.06,delay:.03})},
    land(h=.5){noise(.12,{f:260,v:.18+.25*Math.min(1,h)});tone(90,.12,{f2:55,v:.15+.15*Math.min(1,h)})},
    bump(v){const t=performance.now();if(t-lastBump<180)return;lastBump=t;const k=Math.min(1,v/6);tone(1250,.12,{type:'triangle',v:.05+.12*k});tone(1880,.08,{type:'sine',v:.03+.06*k,delay:.01});noise(.05,{type:'highpass',f:2500,v:.04+.06*k})},
    pip(){tone(1320,.06,{type:'sine',v:.07})},
    stuck(){tone(900,.45,{f2:220,v:.16});tone(140,.1,{type:'sine',v:.22,delay:.42});noise(.06,{f:400,v:.1,delay:.42})},
    release(){tone(260,.18,{f2:880,v:.16});noise(.15,{type:'bandpass',f:600,f2:2400,v:.08})},
    fallDeath(){tone(700,.9,{f2:90,v:.16});tone(70,.35,{type:'sine',v:.3,delay:.85});noise(.3,{f:180,v:.2,delay:.85})},
    lifeLost(){notes([523,440,349],{v:.16,step:.18,len:.22})},
    // frön: knaprar när den tar ett, spottar, och ett pling när fröet träffar
    munch(){for(let i=0;i<3;i++)noise(.035,{type:'bandpass',f:1600+Math.random()*900,q:2,v:.14,delay:i*.08})},
    spit(){noise(.09,{type:'highpass',f:1400,v:.14});tone(520,.09,{type:'sine',f2:180,v:.1})},
    empty(){noise(.12,{type:'bandpass',f:500,q:1,v:.06})},
    seedHit(k=1){tone(1700,.12,{type:'triangle',v:.12*k});tone(2550,.08,{type:'sine',v:.05*k,delay:.02})},
    seedTick(k=1){tone(2300,.03,{type:'square',v:.03*k})},
    thud(k=1){tone(150,.12,{type:'sine',f2:85,v:.16*k});noise(.07,{type:'lowpass',f:420,v:.12*k})},
    glassCrack(k=1){tone(2600,.05,{type:'square',v:.03*k});for(let i=0;i<5;i++)noise(.03+Math.random()*.04,{type:'highpass',f:2500+Math.random()*3000,v:(.05+Math.random()*.05)*k,delay:i*.04})},
    holdOn(){tone(880,.09,{type:'square',f2:1100,v:.05});tone(990,.12,{type:'square',f2:1250,v:.05,delay:.11})},
    // kuben
    tip(){noise(.35,{type:'bandpass',f:500,f2:900,q:3,v:.08});tone(110,.3,{type:'triangle',f2:80,v:.07})},
    tipDone(){tone(120,.12,{f2:70,v:.16});noise(.06,{f:500,v:.06})},
    spring(){tone(240,.25,{type:'sine',f2:160,v:.08})},
    right(){notes([523,659,784,1046],{type:'sine',v:.14,step:.07,len:.5})},
    crackle(){noise(.03+Math.random()*.04,{type:'highpass',f:2500+Math.random()*3000,v:.04+Math.random()*.05})},
    shatter(){noise(.5,{type:'highpass',f:1800,v:.3});for(let i=0;i<7;i++)tone(2000+Math.random()*3000,.12+Math.random()*.2,{type:'sine',v:.05,delay:Math.random()*.25})},
    // hjul, dörrar, hiss
    click(){noise(.02,{type:'highpass',f:3200,v:.08});tone(1600,.02,{type:'square',v:.02})},
    ding(){tone(1318,.6,{type:'sine',v:.16});tone(1976,.4,{type:'sine',v:.06,delay:.01})},
    door(){tone(98,.6,{type:'sawtooth',v:.08});noise(.7,{type:'bandpass',f:400,f2:1200,q:2,v:.12,delay:.15})},
    denied(){tone(110,.28,{type:'square',v:.08});tone(104,.28,{type:'square',v:.06,delay:.02})},
    // onda hamstrar och portar (k: hur nära, 0–1)
    growl(k=1){tone(95,.5,{type:'sawtooth',f2:70,v:.13*k});noise(.45,{f:500,v:.1*k})},
    // upptäcker hjälten: argt högt IIIK! och ett morr
    spot(k=1){tone(900,.22,{type:'square',f2:1700,v:.13*k});tone(1350,.18,{type:'sawtooth',f2:2100,v:.05*k,delay:.02});tone(100,.55,{type:'sawtooth',f2:70,v:.25*k,delay:.18});noise(.5,{f:600,v:.18*k,delay:.18})},
    // jagar: kort argt fräs eller gnäll
    snarl(k=1){if(Math.random()<.5){noise(.25,{type:'bandpass',f:1400,f2:900,q:2,v:.2*k});tone(320,.22,{type:'sawtooth',f2:200,v:.09*k})}else{tone(1100,.16,{type:'square',f2:1500,v:.08*k});tone(1300,.12,{type:'square',f2:900,v:.06*k,delay:.14})}},
    // letar: snusar
    sniff(k=1){noise(.07,{type:'bandpass',f:2600,q:3,v:.12*k});noise(.07,{type:'bandpass',f:2900,q:3,v:.1*k,delay:.13})},
    // ger upp: surt hmpf
    // patrull: lågt mumlande grymt eller ett litet snus då och då
    mumble(k=1){if(Math.random()<.6){tone(150,.18,{type:'triangle',f2:120,v:.09*k});tone(135,.2,{type:'triangle',f2:105,v:.07*k,delay:.2})}else noise(.08,{type:'bandpass',f:2400,q:3,v:.07*k})},
    hmpf(k=1){tone(230,.22,{type:'triangle',f2:140,v:.16*k});noise(.18,{f:700,v:.08*k})},
    dizzy(k=1){for(let i=0;i<4;i++)tone(700,.14,{type:'sine',f2:1100,v:.08*k,delay:i*.16})},
    caught(){tone(160,.18,{type:'square',f2:60,v:.2});noise(.2,{f:700,v:.25})},
    evilFall(k=1){tone(500,1,{f2:60,v:.12*k})},
    gateBeep(k=1){tone(1500,.07,{type:'square',v:.05*k})},
    gateOpen(k=1){noise(.45,{type:'bandpass',f:900,f2:300,q:4,v:.14*k});tone(180,.3,{type:'triangle',v:.06*k})},
    // slut
    win(){notes([523,659,784,1046,784,1046],{type:'square',v:.08,step:.12,len:.2});notes([262,330,392,523],{type:'triangle',v:.1,step:.24,len:.4})},
    gameOver(){notes([392,370,349,330,262],{type:'triangle',v:.16,step:.32,len:.4})},
    // löpande ljud, varje bild
    update(st){
      if(!ctx)return;
      const s=on();
      set(L.roll.g.gain,s?Math.min(.07,st.roll*.012):0);set(L.roll.fl.frequency,120+st.roll*70);   // mjukt sus, svagt
      set(L.evilRoll.g.gain,s?Math.min(.06,st.evilRoll*.05):0);
      set(L.tube.g.gain,s?st.tube*.12:0);set(L.tube.fl.frequency,600+st.tube*900);
      set(L.chase.g.gain,s?st.chase*.2:0);
      set(L.motor.g.gain,s?st.motor*.07:0);
      set(L.charge.g.gain,s?st.charging*.03:0);set(L.charge.o.frequency,220+st.chargeLevel*660);
      set(L.amb1.g.gain,s&&st.playing?.018:0,.5);set(L.amb2.g.gain,s&&st.playing?.010:0,.5);
    },
  };
  // ett ljudfel får aldrig stoppa spelet
  for(const k of Object.keys(S)){const f=S[k];S[k]=(...a)=>{try{return f(...a)}catch(err){console.warn('ljud',k,err)}}}
  return S;
})();
// Hur nära något är hjälten (1 = här, 0 = långt bort): för de onda hamstrarnas och portarnas ljud
const nearK=pos=>Math.max(0,Math.min(1,1-p.distanceTo(pos)/(7*CELL)));
let hopY=0, landT=0;    // hoppets höjd just nu, och vickning efter landningen
let wasMoving=false;    // har rullat (för att känna igen ett stopp)
let stillTime=0;        // hur länge hamstern stått still efter att ha rullat (hoppar upp efter 1 s)
let standing=true;      // står still på fötterna: då går det att panorera
let faceSmooth=heading;       // nosens riktning, som följer riktningen med lite eftersläpning (vickning)
// Panorera: när hamstern står still på fötterna sveper man åt sidan på skärmen.
// Kameran går runt fritt, hamstern vickar runt och tittar dit, och det blir ny framåtriktning.
// (På en telefon utan lutningssensor används svep till att styra, så där går det inte att panorera.)
const PAN_RAD_PER_PX=.008;
const PITCH_MAX=THREE.MathUtils.degToRad(45), PITCH_MIN=-THREE.MathUtils.degToRad(60);
let camPitch=0;   // kamerans lutning upp/ner vid panorering; glider tillbaka till 0 när hamstern rullar
let panStart=null;
const canPan=()=>standing&&!turn&&mode==='roll'&&!inTube&&(!inTrack||inTrack.standing)&&!mapOn&&!settingsOpen&&playing&&!won&&!(touch&&!useOrientation)&&Math.hypot(vx,vz)<.3;
let sideTime=0;         // hur länge kulan rört sig mest åt sidan
let camHeading=heading;
let lastCellKey=cid(...START), hold=0;   // hold: kulan står still under ett schakt en kort stund
// Läge: 'roll' rullar på golvet, 'fall' faller ner i ett hål, 'throat' sitter fast halvvägs i ett hål
let mode='roll', throat=null, fallInfo=null, idle=0;

// ---------- Hopp (tryck på skärmen eller mellanslag medan hamstern rullar) ----------
// Ju fortare hamstern rullar, desto längre och högre hopp. I full fart når det 0,95 upp, så att hamstern
// går över en ond hamster (0,84 hög) och ändå har 0,45 kvar till taket.
// I luften behåller den farten, går inte att styra och fångas inte av hål eller röda ringar.
let jump=null;   // {t, T (hoppets tid), H (höjd)}
// Farten ett hopp skulle få just nu (0 = inget hopp går)
function jumpSpeed(){
  if(!playing||won||mapOn||settingsOpen||jump||turn||mode!=='roll'||inTube)return 0;
  if(inTrack&&(inTrack.standing||inTrack.hop))return 0;
  const sp=inTrack?Math.abs(inTrack.v):Math.hypot(vx,vz);
  return sp>=.8?sp:0;
}
const jumpLength=sp=>sp*(.45+.035*sp);   // hur långt ett hopp i farten sp blir
// Hopp från en låda: alltid tillräckligt högt för golvet ovanför, åt det håll hjälten tittar. Är det en vägg där
// slår hjälten i och landar på lådan igen. Där den landar gäller de vanliga reglerna (ett hål till exempel).
let perchHop=null;
let airEdge=null;   // mitt i ett hopp ut över en kant: {c: rutan hjälten hoppade från, d: riktningen}
function perchJump(){
  if(!perch||mode!=='roll'||turn)return;
  const c=perch.c, U=neighbor(c,upDir()), f=fwd3(heading);
  const a=planeAxes().reduce((b,i)=>Math.abs(f.getComponent(i))>Math.abs(f.getComponent(b))?i:b), d=dirIndex(a,Math.sign(f.getComponent(a))||1);
  const T=neighbor(U,d), uk=inside(U)?cid(...U):-1, tk=inside(T)?cid(...T):-1, fd=downDir();
  let ok=false, off=false;
  if(uk>=0&&cellSeg[uk]>=0){
    const o=open[uk][d];
    if(o===1||(o==='door'&&doorAt(uk,d).isOpen))ok=tk>=0&&!boxAt(tk);
    else if(o==='edge'){ok=true;off=true}
  }else if(tk>=0&&segOpenAt(tk)&&SEGS[cellSeg[tk]].floor===fd&&open[tk][d^1]==='edge')ok=!boxAt(tk);   // (ramlade över en kant: tillbaka upp på det öppna golvet)
  const from=p.clone(), to=ok?center(U).addScaledVector(dirVec(d),CELL/2+R+.2):p.clone();
  if(ok)to.setComponent(ga,floorCoord(off?U:T));
  perchHop={t:0,T:ok?.6:.5,from,to,back:!ok,d,U,off,bumped:false};
  mode='perchhop';vx=vz=0;SFX.jump();standing=false;stillTime=0;
}
function perchHopStep(dt){
  const H=perchHop;H.t+=dt;const q=Math.min(1,H.t/H.T),arc=4*q*(1-q);
  p.lerpVectors(H.from,H.to,q);
  p.setComponent(ga,H.from.getComponent(ga)+(H.to.getComponent(ga)-H.from.getComponent(ga))*q-gs*(H.back?.55:.85)*arc);
  if(H.back){p.addScaledVector(dirVec(H.d),.32*arc);if(q>=.5&&!H.bumped){H.bumped=true;SFX.bump(3)}}
  roll+=dt*4;poseHamster(fwd3(heading),up,roll,0);
  if(q<1)return;
  mode='roll';perchHop=null;landT=.3;SFX.land(.8);
  if(!H.back){perch=null;lastCellKey=cid(...cellOf(p));wasMoving=true;if(H.off)heroOffEdge(H.U,H.d)}
}
function tryJump(){
  if(perch){perchJump();return}
  const sp=jumpSpeed();
  if(!sp)return;
  jump={t:0,T:.45+.035*sp,H:Math.min(.95,.12+.14*sp)};SFX.jump();if(Math.random()<.25)SFX.say('wheee');
  standing=false;stillTime=0;
}
function jumpStep(dt){
  jump.t+=dt;const q=Math.min(1,jump.t/jump.T);
  hopY=jump.H*4*q*(1-q);
  // Över en ond hamster: hjälten går alltid över dess topp (som en kula som rullar över en annan)
  // och landar inte förrän den är förbi.
  let over=0;
  for(const e of ENEMIES){
    if(e.seg!==heroSeg||!evilLive(e))continue;
    const d=p.clone().sub(e.pos);d.setComponent(e.fa,0);const hd=d.length();
    if(hd<2*R)over=Math.max(over,Math.sqrt(4*R*R-hd*hd)+.02);
  }
  hopY=Math.max(hopY,over);
  if(q>=1&&over<=0){SFX.land(jump.H);jump=null;hopY=0;landT=.3}
}

// ---------- Spotta frön ----------
// Står hamstern still blir hoppknappen SPIT. Ett frö flyger rakt fram (högst 4 rutor, stannar vid väggar).
// Tre träffar på en ond hamster (inom 4 sekunder) gör den yr i 2 sekunder.
const SPIT_SPEED=9, SPIT_RANGE=4*CELL, SPIT_HITS=3;
const shots=[];
// (bara när hamstern står på fötterna, efter det lilla hoppet upp när den stannat – inte upp och ner)
const canSpit=()=>!perch&&standing&&playing&&!won&&!mapOn&&!settingsOpen&&!jump&&!turn&&mode==='roll'&&!inTube&&(!inTrack||(inTrack.standing&&!inTrack.hop))&&Math.hypot(vx,vz)<.3;
function spit(){
  if(mouth<=0){SFX.empty();if(!spitHint){spitHint=true;hint('The mouth is empty. Roll over sunflower seeds to collect them.',3500)}return}
  mouth--;SFX.spit();
  const dir=fwd3(heading).normalize();
  const m=seedMesh();m.scale.multiplyScalar(.8);cube.add(m);
  const pos=p.clone().addScaledVector(up,.12).addScaledVector(dir,R+.05);
  m.position.copy(pos);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  shots.push({pos,dir,dist:0,m,t:0,cell:cid(...cellOf(pos)),free:false});
}
// Kan fröet fortsätta från rutan k åt hållet d?
const shotPass=(k,d)=>{const o=open[k][d];return o===1||o==='edge'||(o==='door'&&doorAt(k,d).isOpen)};
// Är punkten inne i en svängd gång? (närmare bågens mittlinje än gångens halva bredd, i golvplanet)
const TUBE_W=CELL/2-FLOOR_GAP-.06;
function inCurveTube(pos){
  for(const C of CURVES){
    const fa=DIRS[C.floor][0];
    if(Math.abs(pos.getComponent(fa)-C.samp[0].getComponent(fa))>CELL/2)continue;
    for(const q of C.samp){
      let d2=0;for(let a=0;a<3;a++)if(a!==fa)d2+=(pos.getComponent(a)-q.getComponent(a))**2;
      if(d2<TUBE_W*TUBE_W)return true;
    }
  }
  return false;
}
function updateShots(dt){
  for(const e of ENEMIES)if(e.hitT>0){e.hitT-=dt;if(e.hitT<=0)e.hits=0}
  for(let i=shots.length-1;i>=0;i--){
    const S=shots[i];let stop=false,quiet=false;
    const step=SPIT_SPEED*dt, n=Math.max(1,Math.ceil(step/.12));
    for(let j=0;j<n&&!stop;j++){
      S.pos.addScaledVector(S.dir,step/n);S.dist+=step/n;
      if([0,1,2].some(a=>Math.abs(S.pos.getComponent(a))>HALF)){stop=true;quiet=true;break}   // ut ur kuben
      const cc=cellOf(S.pos), kk=cid(...cc);
      // in i en ny ruta: genom en kant ut i tomma luften flyger fröet vidare. Från luften in i en gång är en vägg
      // utifrån (den går inte sönder).
      if(kk!==S.cell){
        const pk=S.cell, d=dirBetween(cellOfId(pk),cc);S.cell=kk;
        if(cellSeg[pk]>=0&&cellSeg[kk]<0&&d>=0&&open[pk][d]==='edge')S.free=true;
        else if(cellSeg[pk]<0&&cellSeg[kk]>=0&&d>=0&&S.free){if(!shotPass(kk,d^1)){
          stop=true;quiet=true;S.bounce=true;
          const q=S.pos.clone();q.setComponent(DIRS[d][0],coordOf(cc[DIRS[d][0]])-DIRS[d][1]*(CELL/2-PANEL_IN));shieldHit(q,dirVec(d^1));break}S.free=false}
      }
      // i en svängd gång flyger fröet rakt fram tills det når bågens vägg
      if(!inCurveTube(S.pos)){
        if(cellSeg[kk]<0){if(!S.free){stop=true;break}}
        else for(let a=0;a<3&&!stop;a++){
          const off=S.pos.getComponent(a)-coordOf(cc[a]),d=dirIndex(a,Math.sign(off));
          if(Math.abs(off)>CELL/2-FLOOR_GAP-.06&&!shotPass(kk,d)){
            stop=true;
            // en glasvägg inifrån: spricker (tre träffar och den går sönder)
            if(open[kk][d]===0&&a!==DIRS[SEGS[cellSeg[kk]].floor][0]){quiet=true;hitWall(kk,d,S.pos,S)}
          }
        }
      }
      // träffar en ond hamster
      for(const e of ENEMIES){
        if(stop||!evilLive(e)||S.pos.distanceTo(e.onBox?e.pos.clone().addScaledVector(dirVec(e.floor^1),.62):e.pos)>R+.12)continue;
        stop=true;e.rock=.45;e.hits=(e.hits||0)+1;e.hitT=4;SFX.seedHit(nearK(e.pos));
        if(e.dazed>0){e.hits=0}
        else if(e.hits>=SPIT_HITS){
          e.hits=0;e.dazed=2;e.vel.set(0,0,0);SFX.dizzy(nearK(e.pos));setTimeout(()=>SFX.say('take_that',true),250);
          hint('Three hits! The grey hamster is dizzy.',3000);
        }else if(e.hits===1)hint('Hit! Two more and it gets dizzy.',2500);
      }
    }
    if(!stop&&S.dist>=SPIT_RANGE)stop=true;
    if(stop){if(S.dist<SPIT_RANGE&&!quiet)SFX.seedTick(nearK(S.pos));if(S.bounce)bounceSeed(S);else cube.remove(S.m);shots.splice(i,1);continue}
    S.m.position.copy(S.pos).addScaledVector(up,-.25*(S.dist/SPIT_RANGE)**2);   // sjunker lite på slutet
    S.m.rotateY(dt*20);
  }
}
// Plocka frön: hamstern rullar över dem (får plats med 10 i munnen)
function updateSeeds(dt,time){
  for(const s of SEEDS){
    if(s.taken)continue;
    s.spin.rotation.y=time*2.2+s.ph;
    s.g.position.copy(s.pos).addScaledVector(s.upv,.05*Math.sin(time*2.5+s.ph));
    if(!playing||won||mode!=='roll'||inTube||jump||s.pos.distanceTo(p)>R+.3)continue;
    if(mouth>=MOUTH_MAX){if(!fullHint){fullHint=true;hint('The mouth is full! Spit some seeds first.',3000)}continue}
    s.taken=true;s.g.visible=false;mouth++;SFX.munch();
    if(Math.random()<.3)setTimeout(()=>SFX.say('yum'),200);
    if(!seedHint){seedHint=true;hint('A sunflower seed! Stand still and press SPIT to spit it at a grey hamster.',4500)}
  }
}
// Hoppknappen: hoppar när hamstern rullar, spottar när den står still
const anySeeds=()=>SEEDS.length>0||MACHINES.length>0;   // (frön att hämta: på golvet eller i en frömaskin)
function jbAction(){if(perch)perchJump();else if(anySeeds()&&canSpit())spit();else tryJump()}

// Starta ett hopp. kind 'turn' vänder delta radianer, kind 'stop' ställer bara hamstern på fötterna.
function startHop(kind,delta){
  SFX.pip();
  // kullerbyttan rätas upp till närmaste läge med fötterna nedåt
  const roll0=roll-2*Math.PI*Math.round(roll/(2*Math.PI));
  turn={from:heading,to:heading+delta,t:0,roll0,kind};
  standing=false;
}

// Hamsterns vridning: framåt längs riktningen, upp mot kubens nuvarande upp,
// sedan vickning (rock) och kullerbytta (roll)
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
function poseObj(obj,fwd,upv,rollA,rockA){
  const z=fwd.clone().normalize(),y=upv.clone().addScaledVector(z,-upv.dot(z)).normalize(),x=new THREE.Vector3().crossVectors(y,z);
  _m.makeBasis(x,y,z);obj.quaternion.setFromRotationMatrix(_m);
  obj.quaternion.multiply(_q.setFromEuler(_e.set(rollA,0,rockA,'ZYX')));
}
const poseHamster=(fwd,upv,rollA,rockA)=>poseObj(hamster,fwd,upv,rollA,rockA);

// ---------- Glasröret ----------
let inTube=false,tubeS=0,tubeV=0,tubeDir=1,tubeLean=0,tubeHPrev=0;
let camBlend=0;
const blendFrom={p:new THREE.Vector3(),t:new THREE.Vector3()};
const camLook=new THREE.Vector3();
function startCamBlend(){blendFrom.p.copy(cam.position);blendFrom.t.copy(camLook);camBlend=1}
// In i röret vid rutan k, sidan d
function enterTube(k,d){
  const T=TUBES.find(T=>(cid(...T.a.c)===k&&T.a.d===d)||(cid(...T.b.c)===k&&T.b.d===d)), fromA=cid(...T.a.c)===k&&T.a.d===d;
  tubeA=T.a;tubeB=T.b;tubeCurve=T.curve;tubeLen=T.len;
  inTube=true;tubeDir=fromA?1:-1;tubeS=fromA?0:tubeLen;
  tubeV=Math.max(1.6,Math.hypot(vx,vz));
  if(turn){heading=turn.to;turn=null;hopY=0}
  jump=null;hopY=0;
  tubeHPrev=null;startCamBlend();
}
function exitTube(){
  inTube=false;
  const end=tubeDir>0?tubeB:tubeA, n=dirVec(end.d);
  lastCellKey=cid(...end.c);
  p.copy(center(end.c)).addScaledVector(n,CELL/2-.6);
  heading=angleOf(n.clone().negate());const [fx,fz]=fwdOf(heading);vx=fx*tubeV*.7;vz=fz*tubeV*.7;
  camHeading=heading;turnArmed=false;sideTime=0;
  startCamBlend();
}
// Ett steg i röret: kulan rullar av sig själv (fortare om man lutar framåt)
// och lutar sig inåt i kurvan, mer ju snabbare och skarpare.
function tubeStep(dt,inFwd){
  const target=Math.max(2.2,MAX_SPEED*Math.max(0,inFwd));
  tubeV+=(target-tubeV)*(1-Math.exp(-2*dt));
  tubeS=Math.max(0,Math.min(tubeLen,tubeS+tubeDir*tubeV*dt));
  const u=tubeS/tubeLen, tg=tubeCurve.getTangentAt(u).multiplyScalar(tubeDir);
  p.copy(tubeCurve.getPointAt(u));
  // kurvans skärpa mätt i världen: hur fort riktningen vrider sig runt lodlinjen
  const tw=tg.clone().applyQuaternion(cube.quaternion), h=Math.atan2(tw.x,tw.z);
  let curv=0;
  if(tubeHPrev!==null&&tubeV*dt>1e-4){const dh=h-tubeHPrev;curv=Math.atan2(Math.sin(dh),Math.cos(dh))/(tubeV*dt)}
  tubeHPrev=h;
  // inåtlutning: tan(lutning) = v²·krökning/g. Vänstersväng (h ökar) lutar åt vänster.
  const lean=-Math.sign(curv)*Math.min(.7,Math.atan(tubeV*tubeV*Math.abs(curv)/9.8));
  tubeLean+=(lean-tubeLean)*(1-Math.exp(-6*dt));
  roll+=tubeV*dt/R;
  poseHamster(tg,up,roll,tubeLean);
  if((tubeDir>0&&tubeS>=tubeLen)||(tubeDir<0&&tubeS<=0))exitTube();
}

// ---------- Svängda gångar ----------
// Kulan följer bågen. Lutar man framåt rullar den framåt längs bågen, lutar man bakåt rullar den tillbaka.
// Den behåller sitt läge i sidled och kan styras åt sidan inom gången, precis som i en vanlig gång.
// Den lutar sig inåt i kurvan, som i glasröret.
let inTrack=null;   // {C, s (sträcka från a), dir (+1 = från a mot b), v (fart framåt), lat (läge i sidled), vl (fart i sidled), hPrev, lean}
// Sidled i bågen: riktningen tangent × upp (pekar åt höger när man åker från a mot b)
const trackSide=(C,u)=>new THREE.Vector3().crossVectors(C.curve.getTangentAt(u),C.up).normalize();
function enterTrack(C,end,speed){
  if(turn){heading=turn.to;turn=null;hopY=0}
  const s0=end===0?0:C.len, u0=s0/C.len, sd=trackSide(C,u0);
  // hamstern behåller sitt läge och sin fart i sidled när den rullar in
  const lat=Math.max(-LIM,Math.min(LIM,p.clone().sub(C.curve.getPointAt(u0)).dot(sd)));
  const vl=ex.clone().multiplyScalar(vx).addScaledVector(ez,vz).dot(sd);
  inTrack={C,s:s0,lat,vl,dir:end===0?1:-1,v:Math.max(1.2,speed),hPrev:null,lean:0,still:0,hop:null,standing:false};
  standing=false;faceSmooth=heading;
  startCamBlend();
}
function exitTrack(end){
  const T=inTrack, C=T.C, E=end===0?C.a:C.b, n=dirVec(E.d), forward=T.v>=0, sd=trackSide(C,end);
  // där den raka biten börjar, med samma läge i sidled, utan ryck
  p.copy(C.curve.getPointAt(end)).addScaledVector(sd,T.lat).addScaledVector(n,-.03);
  p.setComponent(ga,floorCoord(E.c));
  const into=n.clone().negate();
  heading=angleOf(forward?into:n);camHeading=heading;faceSmooth=heading;
  // farten in i rutan: framåt plus samma fart i sidled som i bågen
  const V=into.clone().multiplyScalar(Math.abs(T.v)).addScaledVector(sd,T.vl);
  vx=V.dot(ex);vz=V.dot(ez);
  lastCellKey=cid(...E.c);wasMoving=true;
  inTrack=null;startCamBlend();
}
function trackStep(dt,inFwd,inSide){
  const T=inTrack,C=T.C, grip=1-Math.exp(-GRIP*dt), tilting=Math.abs(inFwd)>=.15||Math.abs(inSide)>=.15;
  // Står hamstern på fötterna i bågen (som i en rak gång): den står kvar tills man lutar,
  // och går det att panorera. Lutar man framåt rullar den åt det håll i bågen som ligger närmast blicken.
  if(T.standing){
    if(!tilting){poseHamster(fwd3(heading),up,roll,0);return}
    if(C.curve.getTangentAt(T.s/C.len).multiplyScalar(T.dir).dot(fwd3(heading))<0)T.dir=-T.dir;
    T.standing=false;standing=false;T.v=0;T.hPrev=null;faceSmooth=heading;startCamBlend();
  }
  if(!jump)T.v+=(MAX_SPEED*inFwd-T.v)*grip;
  // sidled: luta åt höger = åt höger sett i färdriktningen (dir vänder sidan när man åker från b mot a)
  if(!jump)T.vl+=(MAX_SPEED*inSide*T.dir-T.vl)*grip;
  T.lat+=T.vl*dt;
  if(Math.abs(T.lat)>LIM){T.lat=Math.sign(T.lat)*LIM;T.vl=0}   // väggen stoppar
  T.s+=T.dir*T.v*dt;
  if(T.s<=0){T.s=0;exitTrack(0);return}
  if(T.s>=C.len){T.s=C.len;exitTrack(1);return}
  const u=T.s/C.len, tg=C.curve.getTangentAt(u).multiplyScalar(T.dir);
  p.copy(C.curve.getPointAt(u)).addScaledVector(trackSide(C,u),T.lat);
  // inåtlutning som i röret: tan(lutning) = v²·krökning/g
  const tw=tg.clone().applyQuaternion(cube.quaternion), h=Math.atan2(tw.x,tw.z), ds=Math.abs(T.v)*dt;
  let curv=0;
  if(T.hPrev!==null&&ds>1e-4){const dh=h-T.hPrev;curv=Math.atan2(Math.sin(dh),Math.cos(dh))/ds*Math.sign(T.v)}
  T.hPrev=h;
  const lean=-Math.sign(curv)*Math.min(.6,Math.atan(T.v*T.v*Math.abs(curv)/9.8));
  T.lean+=(lean-T.lean)*(1-Math.exp(-6*dt));
  // Stopp: har hamstern stått still i 1 sekund utan att någon lutar hoppar den upp på fötterna, som i en rak gång
  const still=Math.abs(T.v)<.25&&Math.abs(T.vl)<.25&&!tilting;
  T.still=still&&!T.hop?T.still+dt:0;
  if(T.still>=1&&!T.hop){T.hop={t:0,roll0:roll-2*Math.PI*Math.round(roll/(2*Math.PI))};T.still=0}
  if(T.hop){
    T.hop.t=Math.min(1,T.hop.t+dt/HOP_TIME);
    const q=T.hop.t;
    hopY=HOP_H*4*q*(1-q);roll=T.hop.roll0*(1-easeInOut(q));
    if(q>=1){
      hopY=0;roll=0;T.hop=null;T.standing=true;standing=true;wasMoving=false;vx=vz=0;
      heading=angleOf(tg);camHeading=heading;faceSmooth=heading;landT=.3;startCamBlend();
    }
  }else roll+=T.v*dt/R;
  // nosen följer bågen, mjukt (t.ex. när hamstern börjar rulla efter att ha panorerat)
  faceSmooth+=wrapA(angleOf(tg)-faceSmooth)*Math.min(1,dt*10);
  poseHamster(fwd3(faceSmooth),up,roll,T.lean);
}

// ---------- Röda hål och liv ----------
// Faller hamstern i ett rött hål försvinner ett liv. Efter 2 sekunder studsar den upp där den var
// innan hålet. När alla liv är slut blir det game over.
// ---------- Hamsterhjulet, batteriet och dörrarna ----------
// I hjulet springer hamstern när man lutar framåt. Det laddar batteriet (5 s full lutning).
// Batteriet räcker till en dörr. Kommer hamstern nära en stängd dörr med fullt batteri öppnas dörren
// och förblir öppen, batteriet töms och alla andra dörrar lyser rött igen.
const CHARGE_TIME=5, DOOR_REACH=1.5;
let charge=0, wheelSpin=0, wheelLock=false;   // wheelLock: hamstern har just gått ur och är kvar i rutan
let wheelHop=null;   // {t, out, fromH, toH, from, to, roll0}: hopp in i eller ut ur hjulet
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
// In: hamstern hoppar till hjulets botten och vänder sig i springriktningen
function enterWheel(){
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  jump=null;hopY=0;
  const toH=angleOf(wheel.runV), wc=center(wheel.c);wc.setComponent(ga,floorCoord(wheel.c));
  wheelHop={t:0,out:false,fromH:heading,toH:heading+wrapA(toH-heading),from:p.clone(),to:wc,roll0:roll-2*Math.PI*Math.round(roll/(2*Math.PI))};
  mode='wheelhop';vx=vz=0;
  hint('In the wheel! Tilt forward to run and charge the battery. Tilt back to leave.',5000);
}
// Ut: hamstern hoppar tillbaka mot öppningen och vänder sig ut mot gången
function leaveWheel(){
  const toH=angleOf(wheel.openV), to=center(wheel.c).addScaledVector(wheel.openV,.55);to.setComponent(ga,floorCoord(wheel.c));
  wheelHop={t:0,out:true,fromH:heading,toH:heading+wrapA(toH-heading),from:p.clone(),to,roll0:roll-2*Math.PI*Math.round(roll/(2*Math.PI))};
  mode='wheelhop';
}
function wheelHopStep(dt){
  const H=wheelHop;H.t=Math.min(1,H.t+dt/HOP_TIME);
  const e=easeInOut(H.t);
  p.lerpVectors(H.from,H.to,e);hopY=HOP_H*4*H.t*(1-H.t);
  heading=H.fromH+(H.toH-H.fromH)*Math.min(1,e*1.15);camHeading=H.fromH+(H.toH-H.fromH)*e;faceSmooth=heading;
  roll=H.roll0*(1-e);
  poseHamster(fwd3(heading),up,roll,0);
  if(H.t<1)return;
  hopY=0;heading=H.toH;camHeading=heading;wheelHop=null;
  if(H.out){mode='roll';wheelLock=true;const [fx,fz]=fwdOf(heading);vx=fx*1.4;vz=fz*1.4;wasMoving=true}
  else mode='wheel';
}
let wheelClick=0, wheelRun=0;
function wheelStep(dt,inFwd){
  // hamstern springer på stället i hjulets botten
  const run=Math.max(0,inFwd);
  const before=charge;charge=Math.min(1,charge+run*dt/CHARGE_TIME);
  if(before<1&&charge>=1){hint('Fully charged! Go and open a door.',4000);SFX.ding();setTimeout(()=>SFX.say('charged'),400)}
  wheelRun=run;wheelClick=(wheelClick||0)+run*dt*7;if(wheelClick>=1){wheelClick-=1;SFX.click()}
  wheelSpin+=run*dt*5;roll+=run*dt*5/R*.42;
  poseHamster(fwd3(heading),up,roll,.06*Math.sin(wheelSpin*3)*run);
  if(inFwd<-.4)leaveWheel();   // luta bakåt: ut ur hjulet
}
// Hissen: står plattan vid den här våningen och stilla?
const liftDockedAt=k=>LIFTS.some(L=>!L.move&&(L.at==='a'?L.ka:L.kb)===k);
// Öppningen till en hissruta är stängd när plattan inte står där
const liftBlocks=k=>LIFTS.some(L=>k===L.ka||k===L.kb)&&!liftDockedAt(k);
// Är hissdörren mellan rutan k och grannen åt hållet d stängd (eller inte öppen nog att rulla igenom)?
function liftDoorShut(k,d){
  const nk=cid(...neighbor(cellOfId(k),d));
  for(const L of LIFTS)for(const D of L.doors)if(((D.k===k&&D.d===d)||(D.k===nk&&D.d===(d^1)))&&D.anim<.85)return true;
  return false;
}
// Varje bild: hissdörrarna öppnas när plattan står här och hamstern kommer fram med fullt batteri,
// eller när hamstern just har åkt hit och ska rulla ut. Annars stängs de.
function updateLiftDoors(LIFT,dt){
  const hk=cid(...cellOf(p)),endK=e=>e==='a'?LIFT.ka:LIFT.kb;
  // hamstern har rullat ut (ingen påminnelse om batteriet just då, den står ju precis vid dörren)
  if(LIFT.exitAt&&!LIFT.move&&mode!=='lift'&&hk!==endK(LIFT.exitAt)){LIFT.exitAt=null;LIFT.doorTold=true}
  let nearAny=false;
  for(const D of LIFT.doors){
    const docked=!LIFT.move&&LIFT.at===D.end;
    const near=playing&&!won&&mode==='roll'&&hk!==D.k&&D.home.distanceTo(p)<DOOR_REACH+.3;
    if(near)nearAny=true;
    let want=docked&&((near&&charge>=1)||LIFT.exitAt===D.end);
    if(docked&&D.anim>.3&&D.home.distanceTo(p)<R+.2)want=true;   // stäng inte på hamstern
    if(docked&&near&&charge<1&&!LIFT.doorTold){LIFT.doorTold=true;SFX.denied();setTimeout(()=>SFX.say('more_power'),350);hint('The lift door opens with a full battery. Charge it in a wheel.',4500)}
    const was=D.anim;D.anim=Math.max(0,Math.min(1,D.anim+(want?1:-1)*dt/.5));
    if(was===0&&D.anim>0)SFX.door();
    D.panel.position.copy(D.home).addScaledVector(D.up,-(CELL-.2)*easeInOut(D.anim));
    D.panel.visible=D.anim<1;
    for(const l of D.lamps)l.material=charge>=1||want||D.anim>0?lampGreen:lampRed;   // grön: fullt batteri (eller öppen för att rulla ut)
  }
  if(!nearAny)LIFT.doorTold=false;
}
function liftStart(LIFT,to,withHero){
  LIFT.move={from:LIFT.y,to:to==='a'?LIFT.yA:LIFT.yB,dest:to,t:0,withHero};
  if(withHero){mode='lift';vx=vz=0;jump=null;hopY=0;turn=null;charge=0}
}
// Varje bild: plattan rör sig, lampan visar batteriet, och plattan kommer till hamstern när den är nära
function updateLift(dt){for(const L of LIFTS){updateOneLift(L,dt);updateLiftDoors(L,dt)}}
function updateOneLift(LIFT,dt){
  LIFT.lamp.material=charge>=1?lampGreen:lampRed;
  const M=LIFT.move;
  if(M){
    M.t=Math.min(1,M.t+dt/2);
    LIFT.y=M.from+(M.to-M.from)*easeInOut(M.t);
    if(M.withHero){
      // hamstern glider in till mitten av plattan och åker med
      for(const a of [0,1,2])if(a!==LIFT.fa)p.setComponent(a,p.getComponent(a)+(coordOf(LIFT.a[a])-p.getComponent(a))*Math.min(1,dt*6));
      p.setComponent(LIFT.fa,LIFT.y-LIFT.sg*R);
      poseHamster(fwd3(heading),up,roll,0);
    }
    if(M.t>=1){
      LIFT.at=M.dest;LIFT.move=null;SFX.ding();if(M.withHero)LIFT.exitAt=M.dest;
      if(M.withHero){
        mode='roll';LIFT.lock=true;const dk=M.dest==='a'?LIFT.ka:LIFT.kb;lastCellKey=dk;stillTime=0;
        // hamstern vänder sig mot gången (om det bara finns en väg ut från hissen)
        const outs=[0,1,2,3,4,5].filter(d=>open[dk][d]===1);
        if(outs.length===1){const d0=wrapA(angleOf(dirVec(outs[0]))-heading);if(Math.abs(d0)>.1)startHop('turn',d0)}
      }
    }
  }else if(playing&&!won&&mode==='roll'&&downDir()===LIFT.floor&&!mapOn&&!settingsOpen){
    // tom platta till hamstern: när hamstern är nära den andra våningen
    const other=LIFT.at==='a'?'b':'a', ok=other==='a'?LIFT.ka:LIFT.kb, oc=other==='a'?LIFT.a:LIFT.b;
    if(cellSeg[cid(...cellOf(p))]===cellSeg[ok]&&p.distanceTo(ballAt(oc,LIFT.floor))<2*CELL)liftStart(LIFT,other,false);
  }
  LIFT.place();
}
// Hamstern står på plattan: åk om batteriet är fullt, annars en påminnelse
function liftCheck(){for(const L of LIFTS)if(mode==='roll')liftCheckOne(L)}
function liftCheckOne(LIFT){
  const k=cid(...cellOf(p));
  if(k!==LIFT.ka&&k!==LIFT.kb){LIFT.lock=false;LIFT.told=false;return}
  if(LIFT.lock||!liftDockedAt(k)||downDir()!==LIFT.floor)return;
  if(charge>=1)liftStart(LIFT,k===LIFT.ka?'b':'a',true);
  else if(!LIFT.told){LIFT.told=true;SFX.denied();setTimeout(()=>SFX.say('more_power'),350);hint('The lift needs a full battery. Charge it in the wheel.',4500)}
}
function openDoor(D){
  SFX.door();
  D.isOpen=true;charge=0;
  hint(DOORS.some(o=>!o.isOpen)?'Door open! Go back to the wheel to charge for the next door.':'Door open!',4500);
}
// Varje bild: lampornas färg, dörrar som glider undan, och dörrar som öppnas när hamstern är nära
function updateDoors(dt){
  for(const D of DOORS){
    if(D.isOpen){
      D.anim=Math.min(1,D.anim+dt/.7);
      D.panel.position.copy(D.panelHome).addScaledVector(D.up,-(CELL-.2)*easeInOut(D.anim));
      D.panel.visible=D.anim<1;
      for(const l of D.lamps)l.material=lampOff;if(D.light)D.light.intensity=0;
    }else if(!D.grate){
      const ready=charge>=1;
      for(const l of D.lamps)l.material=ready?lampGreen:lampRed;D.light.color.setHex(ready?0x22ff66:0xff3344);D.light.intensity=.9;
      if(ready&&mode==='roll'&&!inTrack&&!inTube&&D.panelHome.distanceTo(p)<DOOR_REACH)openDoor(D);
    }
  }
  if(wheel)wheel.spin.quaternion.setFromAxisAngle(wheel.axisV,-wheelSpin);
  // batteriet på väggen vid varje hjul (samma batteri): stapeln fylls nerifrån, röd under laddning och grön när den är full
  for(const W of WHEELS){
    const h=Math.max(.001,charge);W.fill.scale.y=h;W.fill.position.y=W.BH*h/2;
    const full=charge>=1;W.fillMat.color.setHex(full?0x4ade80:0xff4d5e);W.fillMat.emissive.setHex(full?0x22cc55:0xff2233);
  }
}

// ---------- Pussel: knappar och grindar, trälådor, stålkulor bakom kuldörrar, nycklar ----------
// Knapp (buttons {c, d, g}): sitter på sidoväggen d i rutan c, i kulans höjd. Rullar hamstern eller en stålkula in i
//   den med fullt batteri öppnas grinden grates[g] (står mellan två rutor som en dörr) och förblir öppen; batteriet töms.
//   Lampan: grön när batteriet är fullt, röd annars, släckt när grinden redan är öppen.
// Trälåda (boxes): fyller en ruta och knuffas en ruta i taget av hamstern eller en kula. Står still när kuben vrids.
//   Sprucket glas och hål i golvet: lådan faller igenom (till gången under, annars är den borta).
//   Röda och blå hål: lådan blir stående på hålet.
// Kuldörr (balldoors {c, d}): öppnas med en nyckel när hamstern rullar mot den. När hamstern rullat iväg rullar en
//   stålkula ut. Kulan rullar när kuben lutar, knuffar lådor och trycker på knappar. Den är ofarlig för hamstern.
// Nycklar (keys): plockas upp som frön; hamstern kan bära flera.
const BOX_S=CELL*.74, BALL_R=.36;
let keyCount=0, keyHint=false;
// --- knappar ---
const BUTTONS=(LV.buttons||[]).map(B=>{
  const k=cid(...B.c), fd=SEGS[cellSeg[k]].floor, n=dirVec(B.d);
  const pos=center(B.c).addScaledVector(n,CELL/2-FLOOR_GAP-.02);pos.setComponent(DIRS[fd][0],ballHeight(B.c,fd));
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.05,28),new THREE.MeshStandardMaterial({color:0x7a8794,metalness:.6,roughness:.35}));
  plate.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);plate.position.copy(pos);cube.add(plate);
  const knob=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.12,24),lampRed);knob.quaternion.copy(plate.quaternion);
  const home=pos.clone().addScaledVector(n,-.06);knob.position.copy(home);cube.add(knob);
  return {...B,k,n,pos,knob,home,press:0,told:false};
});
const grateOf=B=>DOORS.find(D=>D.grate&&D.gi===B.g);
function pressButton(B,ball){
  B.press=.3;const G=grateOf(B);
  if(!G||G.isOpen){SFX.click();return}
  if(charge<1){
    SFX.click();
    if(!ball&&!B.told){B.told=true;SFX.denied();setTimeout(()=>SFX.say('more_power'),350);hint('The button needs a full battery. Charge it in a wheel.',4000)}
    return;
  }
  charge=0;G.isOpen=true;SFX.ding();SFX.door();
  hint('A gate is open!',3000);
  // kameran visar kulan (om det var en kula) och sedan grinden som öppnas
  showEvent(ball?[ball.pos.clone(),G.panelHome.clone()]:[G.panelHome.clone()]);
}
// --- trälådor ---
const woodTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#a8743f';g.fillRect(0,0,128,128);
  for(let i=0;i<4;i++){g.fillStyle=i%2?'#9a6935':'#b07c46';g.fillRect(0,i*32+2,128,28);
    g.strokeStyle='#7a4f24';g.globalAlpha=.35;for(let j=0;j<5;j++){g.beginPath();g.moveTo(0,i*32+6+j*5);g.bezierCurveTo(40,i*32+3+j*5,80,i*32+9+j*5,128,i*32+5+j*5);g.stroke()}g.globalAlpha=1}
  g.strokeStyle='#5c3a18';g.lineWidth=8;g.strokeRect(4,4,120,120);g.lineWidth=6;g.beginPath();g.moveTo(8,8);g.lineTo(120,120);g.stroke();
  return new THREE.CanvasTexture(cv);
})();
const boxMat=new THREE.MeshStandardMaterial({map:woodTex,roughness:.85,emissive:0xffffff,emissiveMap:woodTex,emissiveIntensity:.28});   // (lyser lite, så att sidorna inte blir svarta)
const boxGeo=new THREE.BoxGeometry(BOX_S,BOX_S,BOX_S);
const boxHome=(c,fd)=>center(c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP-BOX_S/2);
const BOXES=(LV.boxes||[]).map(c=>{
  const k=cid(...c),fd=SEGS[cellSeg[k]].floor,m=new THREE.Mesh(boxGeo,boxMat);m.castShadow=true;m.receiveShadow=true;cube.add(m);
  m.position.copy(boxHome(c,fd));
  return {c:c.slice(),k,floor:fd,m,move:null,fall:null,gone:false};
});
const boxAt=k=>BOXES.find(B=>!B.gone&&!B.fall&&B.k===k)||null;
// Ovanpå en låda (i ett gap eller under en kant): hjälten (perch), en stålkula eller en ond hamster (onBox).
// En kula eller en ond hamster sitter fast där tills lådan flyttas; då ramlar den ner på golvet.
let perch=null;   // hjälten står på en låda: {B, c: lådans ruta, free: inget tak i vägen (gång utan väggar)}
const boxRider=B=>BALLS.some(b=>!b.gone&&b.onBox===B)||ENEMIES.some(e=>!e.gone&&e.onBox===B);
const onBoxHeight=(c,fd)=>ballHeight(c,fd)-DIRS[fd][1]*BOX_S;   // kulans mitt ovanpå en låda i rutan c
// Kan lådan knuffas från sin ruta åt hållet d? (en vanlig gång eller en öppen dörr, och ledigt där)
function boxCanGo(B,d){
  const n=neighbor(B.c,d);if(!inside(n))return null;
  const o=open[B.k][d];if(!(o===1||o==='edge'||(o==='door'&&doorAt(B.k,d).isOpen)))return null;
  const nk=cid(...n);
  if(boxAt(nk)||isLift(nk)||isWheel(nk))return null;
  if(cid(...cellOf(p))===nk)return null;
  if(BALLS.some(b=>!b.gone&&cid(...cellOf(b.pos))===nk))return null;
  if(typeof ENEMIES!=='undefined'&&ENEMIES.some(e=>evilLive(e)&&cid(...cellOf(e.pos))===nk))return null;
  return n;
}
function pushBox(B,d){
  if(B.move||B.fall||(perch&&perch.B===B))return false;
  const n=boxCanGo(B,d);if(!n)return false;
  B.move={from:B.m.position.clone(),to:boxHome(n,B.floor),t:0};B.c=n;B.k=cid(...n);
  SFX.noise(.3,{type:'bandpass',f:300,f2:180,q:1.5,v:.18});
  return true;
}
// Lådan har kommit fram: sprucket glas går sönder och den faller igenom hål i golvet
function boxArrived(B){
  // över en kant: fastnar på en undersida, faller ner på ett öppet golv under, annars är den borta
  if(cellSeg[B.k]<0){
    const b=neighbor(B.c,B.floor),bs=inside(b)?cellSeg[cid(...b)]:-1;
    if(bs>=0&&SEGS[bs].floor===(B.floor^1)){SFX.land(.5);return}
    B.fall={t:0,v:0,to:bs>=0&&openSeg(bs)&&SEGS[bs].floor===B.floor?b:null};SFX.land(.6);return;
  }
  const hz=HOLES.get(B.k);
  if(hz&&hz.floor===B.floor){
    if(!hz.broken)breakCrack(hz);
    B.fall={t:0,v:0,to:hz.drop?hz.below:null};SFX.land(.6);
  }
}
function updateBoxes(dt){
  for(const B of BOXES){
    if(B.gone)continue;
    if(B.move){
      B.move.t=Math.min(1,B.move.t+dt/.28);B.m.position.lerpVectors(B.move.from,B.move.to,easeInOut(B.move.t));
      if(B.move.t>=1){B.move=null;boxArrived(B)}
    }else if(B.fall){
      const F=B.fall;F.t+=dt;F.v+=9.8*dt;B.m.position.addScaledVector(dirVec(B.floor),F.v*dt);
      if(F.to){
        const tgt=boxHome(F.to,B.floor);
        if(B.m.position.clone().sub(tgt).dot(dirVec(B.floor))>=0){B.m.position.copy(tgt);B.c=F.to.slice();B.k=cid(...F.to);B.fall=null;SFX.land(.8);boxArrived(B)}
      }else if(F.t>1.3){B.gone=true;B.m.visible=false}
    }
  }
}
// --- kuldörrar och stålkulor ---
const brassMat=new THREE.MeshStandardMaterial({color:0xc9a227,metalness:.8,roughness:.3});
const keyholeTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#c9a227';g.fillRect(0,0,128,128);g.strokeStyle='#8a6a10';g.lineWidth=8;g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.stroke();
  g.fillStyle='#1a1206';g.beginPath();g.arc(64,50,15,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(56,58);g.lineTo(72,58);g.lineTo(78,98);g.lineTo(50,98);g.closePath();g.fill();
  return new THREE.CanvasTexture(cv);
})();
const BDOOR_R=.62;
const steelMat=new THREE.MeshStandardMaterial({color:0xdfe5ec,metalness:.95,roughness:.15,emissive:0x1a2633,emissiveIntensity:.4});
const BDOORS=(LV.balldoors||[]).map(B=>{
  const k=cid(...B.c), fd=SEGS[cellSeg[k]].floor, upv=dirVec(fd^1), n=dirVec(B.d);
  const face=center(B.c).addScaledVector(n,CELL/2-PANEL_IN-PANEL_T/2);
  const holeC=face.clone();holeC.setComponent(DIRS[fd][0],ballHeight(B.c,fd));   // i kulans höjd
  const z=n.clone().negate(), x=new THREE.Vector3().crossVectors(upv,z), basis=new THREE.Matrix4().makeBasis(x,upv,z);
  const sz=CELL-2*PANEL_IN, sh=new THREE.Shape();sh.moveTo(-sz/2,-sz/2);sh.lineTo(sz/2,-sz/2);sh.lineTo(sz/2,sz/2);sh.lineTo(-sz/2,sz/2);sh.lineTo(-sz/2,-sz/2);
  const off=holeC.clone().sub(face).dot(upv), hp=new THREE.Path();hp.absarc(0,off,BDOOR_R,0,Math.PI*2,true);sh.holes.push(hp);
  const frame=new THREE.Mesh(new THREE.ShapeGeometry(sh,32),new THREE.MeshStandardMaterial({color:0x6b5a2a,metalness:.4,roughness:.5,side:THREE.DoubleSide}));
  frame.quaternion.setFromRotationMatrix(basis);frame.position.copy(face);cube.add(frame);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(BDOOR_R,.06,10,40),brassMat);ring.quaternion.copy(frame.quaternion);ring.position.copy(holeC).addScaledVector(n,-.01);cube.add(ring);
  const tun=new THREE.Mesh(new THREE.CylinderGeometry(BDOOR_R,BDOOR_R,1.1,24,1,true),new THREE.MeshStandardMaterial({color:0x090d12,roughness:.9,side:THREE.DoubleSide}));
  tun.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);tun.position.copy(holeC).addScaledVector(n,.55);cube.add(tun);
  const hatch=new THREE.Mesh(new THREE.CircleGeometry(BDOOR_R-.02,32),new THREE.MeshStandardMaterial({map:keyholeTex,metalness:.6,roughness:.35,side:THREE.DoubleSide}));
  hatch.quaternion.copy(frame.quaternion);const hatchHome=holeC.clone().addScaledVector(n,.02);hatch.position.copy(hatchHome);cube.add(hatch);
  // stålkulan som väntar bakom luckan
  const steel=new THREE.Mesh(new THREE.SphereGeometry(BALL_R,24,18),steelMat);steel.position.copy(holeC).addScaledVector(n,.6);cube.add(steel);
  return {...B,k,fd,n,x,hatch,hatchHome,holeC,steel,state:'locked',open:0,told:false};
});
const BALLS=[];
// Hamstern rullar mot en vägg: knapp, kuldörr eller en låda att knuffa
function heroTouchWall(k,d,toward,box){
  if(toward<.5)return;
  if(k===cid(...exitCell)&&d===exitDir){reachExit();return}
  const B=BUTTONS.find(B=>B.k===k&&B.d===d);if(B&&B.press<=0)pressButton(B,null);
  const M=MACHINES.find(M=>M.k===k&&M.d===d);if(M)useMachine(M);
  const D=BDOORS.find(D=>D.k===k&&D.d===d);
  if(D&&D.state==='locked'){
    if(keyCount>0){keyCount--;D.state='waiting';SFX.click();SFX.ding();hint('Unlocked! Roll away and the steel ball comes out.',3500)}
    else if(!D.told){D.told=true;SFX.denied();hint('This door needs a key 🔑. Find one somewhere in the cube.',4000)}
  }
  if(box&&toward>.8)pushBox(box,d);
}
function makeBall(D){
  // kulan startar inne i tunneln (i grannrutan) och rullar först in i rutan; först där börjar den rulla på riktigt
  const pos=D.holeC.clone().addScaledVector(D.n,.4),c=cellOfId(D.k),a=DIRS[D.d][0];
  const to=D.holeC.clone();to.setComponent(a,coordOf(c[a])+DIRS[D.d][1]*(CELL/2-FLOOR_GAP-BALL_R-.02));
  D.steel.visible=false;
  const m=new THREE.Mesh(new THREE.SphereGeometry(BALL_R,24,18),steelMat);m.castShadow=true;cube.add(m);m.position.copy(pos);
  const b={pos,rv:D.n.clone().multiplyScalar(-2.6),floor:D.fd,fa:DIRS[D.fd][0],vg:0,grounded:true,gone:false,fall:null,m,bump:0,emerge:{t:0,from:pos.clone(),to}};
  BALLS.push(b);SFX.noise(.5,{type:'lowpass',f:500,v:.15});
}
function updateBallDoors(dt){
  for(const D of BDOORS){
    if(D.state==='waiting'){
      D.open=Math.min(1,D.open+dt/.4);
      // kulan rullar ut när hamstern har rullat iväg en bit
      if(D.open>=1&&cid(...cellOf(p))!==D.k){D.state='out';makeBall(D)}
    }
    D.hatch.position.copy(D.hatchHome).addScaledVector(D.x,D.open*(2*BDOOR_R+.1));
    if(D.told&&p.distanceTo(D.holeC)>2*CELL)D.told=false;
  }
}
// Rulla kulan: lutningen, väggar, lådor, knappar, hamstern och andra kulor, och hål
const ballEdge=(k,d)=>{const o=open[k][d];if(o==='door')return doorAt(k,d).isOpen;if(o!==1)return false;
  const n=cid(...neighbor(cellOfId(k),d));return !(isLift(n)||isWheel(n))};
function updateBalls(dt){
  const gC=new THREE.Vector3(0,-1,0).applyQuaternion(cube.quaternion.clone().invert());
  for(const b of BALLS){
    if(b.gone)continue;
    if(b.emerge){const E=b.emerge;E.t+=dt;b.pos.lerpVectors(E.from,E.to,Math.min(1,E.t/.35));if(E.t>=.35)b.emerge=null;
      b.m.position.copy(b.pos);b.m.rotation.x+=2.6*dt/BALL_R;continue}
    if(b.fall){
      const F=b.fall;F.t+=dt;F.v+=9.8*dt;b.pos.addScaledVector(F.dir||dirVec(b.floor),F.v*dt);
      if(F.pc)for(let a=0;a<3;a++)if(a!==b.fa)b.pos.setComponent(a,b.pos.getComponent(a)+(F.pc.getComponent(a)-b.pos.getComponent(a))*Math.min(1,dt*8));
      if(F.to){
        const LB=boxAt(cid(...F.to)),onto=!!LB,ty=onto?onBoxHeight(F.to,b.floor):ballHeight(F.to,b.floor);
        if((b.pos.getComponent(b.fa)-ty)*DIRS[b.floor][1]>=0){b.pos.setComponent(b.fa,ty);b.fall=null;SFX.land(.7);if(onto){b.onBox=LB;b.boxK=LB.k;b.rv.set(0,0,0)}}}
      else if(F.t>1.2){b.gone=true;b.m.visible=false}
      b.m.position.copy(b.pos);continue;
    }
    // ovanpå en låda: sitter fast. Flyttas lådan (eller faller den) ramlar kulan ner på golvet.
    if(b.onBox){
      const B=b.onBox;
      if(B.gone||B.fall||B.move||B.k!==b.boxK){b.onBox=null;b.fall={t:0,v:0,pc:null,to:cellOfId(b.boxK)};continue}
      // rullar fram och tillbaka på lådan när kuben lutar. I ett gap håller hålets kanter kvar den; utan tak
      // (gång utan väggar) rullar den av lådan och ramlar ner på golvet.
      const bc=cellOfId(b.boxK),upE=dirVec(b.floor^1),tc=-gC.dot(upE),free=segOpenAt(b.boxK),lim=CELL/2-FLOOR_GAP-BALL_R;
      if(tc>.5&&tc<.9995)b.rv.addScaledVector(gC.clone().addScaledVector(upE,-gC.dot(upE)),9.8*5/7*dt);
      b.rv.multiplyScalar(Math.exp(-1.0*dt));b.rv.setComponent(b.fa,0);
      b.pos.addScaledVector(b.rv,dt);
      for(let a=0;a<3;a++){if(a===b.fa)continue;const off=b.pos.getComponent(a)-coordOf(bc[a]);
        if(free&&Math.abs(off)>BOX_S/2){b.onBox=null;b.fall={t:0,v:0,pc:null,to:cellOf(b.pos)};break}
        if(Math.abs(off)>lim){b.pos.setComponent(a,coordOf(bc[a])+Math.sign(off)*lim);const sp=Math.abs(b.rv.getComponent(a));if(sp>1.5)SFX.bump(sp);b.rv.setComponent(a,-.3*b.rv.getComponent(a))}}
      if(b.fall)continue;
      // hjälten på samma låda knuffar kulan åt sidan
      if(perch&&perch.B===B&&mode==='roll'){
        const dv=b.pos.clone().sub(p);dv.setComponent(b.fa,0);const dist=dv.length();
        if(dist<R+BALL_R&&dist>1e-4){dv.normalize();const h=b.pos.getComponent(b.fa);b.pos.copy(p).addScaledVector(dv,R+BALL_R).setComponent(b.fa,h);
          const V=ex.clone().multiplyScalar(vx).addScaledVector(ez,vz),vin=V.dot(dv);if(vin>0){b.rv.addScaledVector(dv,vin*1.1);vx*=.6;vz*=.6}
          for(let a=0;a<3;a++){if(a===b.fa)continue;const off=b.pos.getComponent(a)-coordOf(bc[a]);if(Math.abs(off)>lim){b.pos.setComponent(a,coordOf(bc[a])+Math.sign(off)*lim);
            // kulan står mot hålets kant: hjälten kommer inte längre
            const back=p.clone().sub(b.pos);back.setComponent(b.fa,0);back.normalize();const hp=p.getComponent(b.fa);p.copy(b.pos).addScaledVector(back,R+BALL_R).setComponent(b.fa,hp)}}}
      }
      b.m.position.copy(b.pos);b.m.rotation.x+=b.rv.length()*dt/BALL_R;continue;
    }
    // i en gång utan väggar: lutar golvet mer än 90° faller kulan av och är borta
    if(segOpenAt(cid(...cellOf(b.pos)))&&-gC.dot(dirVec(b.floor^1))<-.05){b.fall={t:0,v:0,pc:null,to:null,dir:gC.clone()};continue}
    if(!rot&&!retAnim)ballGravity(b,dt);
    if(b.fall)continue;
    b.bump=Math.max(0,b.bump-dt);
    if(b.grounded){
      const upE=dirVec(b.floor^1),tc=-gC.dot(upE);
      if(tc>.5&&tc<.9995)b.rv.addScaledVector(gC.clone().addScaledVector(upE,-gC.dot(upE)),9.8*5/7*dt);
      b.rv.multiplyScalar(Math.exp(-1.0*dt));b.rv.setComponent(b.fa,0);
      const n=Math.max(1,Math.ceil(b.rv.length()*dt/.12));
      for(let i=0;i<n&&!b.fall;i++){
        const c0=cellOf(b.pos);
        b.pos.addScaledVector(b.rv,dt/n);
        const c=cellOf(b.pos),k=cid(...c),k0=cid(...c0);
        // över en kant: ner på ett öppet golv under, annars faller kulan och är borta
        if(k!==k0){const d=dirBetween(c0,c);if(d>=0&&open[k0][d]==='edge'){const T=edgeTarget(c0,d,b.floor);
          b.fall={t:0,v:0,pc:null,to:T.kind==='drop'?T.b:null};if(T.kind!=='drop')SFX.evilFall(nearK(b.pos));break}}
        for(let a=0;a<3;a++){if(a===b.fa)continue;
          const off=b.pos.getComponent(a)-coordOf(c[a]),lim=CELL/2-FLOOR_GAP-BALL_R;
          for(const s of [1,-1]){
            if(s*off<=lim)continue;
            const d=dirIndex(a,s), sp=b.rv.getComponent(a)*s;
            if(open[k][d]==='edge'&&s*off>CELL/2){b.fall={t:0,v:0,pc:null,to:null};SFX.evilFall(nearK(b.pos));break}
            const through=ballEdge(k,d)||open[k][d]==='edge';
            const bx=through?boxAt(cid(...neighbor(c,d))):null;
            if(through&&!bx)continue;
            // vägg (eller låda): knappen trycks, lådan knuffas, annars studsar kulan
            if(sp>.6&&b.bump<=0){
              b.bump=.3;
              const B=BUTTONS.find(B=>B.k===k&&B.d===d);if(B&&B.press<=0)pressButton(B,b);
              if(bx){pushBox(bx,d);b.rv.set(0,0,0)}
              if(sp>1.5)SFX.bump(sp);
            }
            b.pos.setComponent(a,coordOf(c[a])+s*lim);b.rv.setComponent(a,bx?0:-.3*b.rv.getComponent(a));
          }
        }
      }
      // hamstern knuffar kulan (kulan är ofarlig)
      if(mode==='roll'&&!inTube&&!inTrack&&!jump){
        const dv=b.pos.clone().sub(p);dv.setComponent(b.fa,0);const dist=dv.length();
        if(dist<R+BALL_R&&Math.abs(b.pos.getComponent(b.fa)-p.getComponent(b.fa))<.4&&dist>1e-4){
          dv.normalize();b.pos.copy(p).addScaledVector(dv,R+BALL_R).setComponent(b.fa,b.pos.getComponent(b.fa));
          const V=ex.clone().multiplyScalar(vx).addScaledVector(ez,vz),vin=V.dot(dv);
          if(vin>0){b.rv.addScaledVector(dv,vin*1.1);vx*=.6;vz*=.6}
        }
      }
      // andra kulor
      for(const o of BALLS){if(o===b||o.gone||o.fall)continue;const dv=b.pos.clone().sub(o.pos),dist=dv.length();if(dist<2*BALL_R&&dist>1e-4){dv.normalize();b.pos.addScaledVector(dv,(2*BALL_R-dist)/2);o.pos.addScaledVector(dv,-(2*BALL_R-dist)/2)}}
      ballHazard(b);
    }
    b.m.position.copy(b.pos);
    b.m.rotation.x+=b.rv.length()*dt/BALL_R;
  }
}
// Kulan i ett rött hål, ett hål i golvet eller på sprucket glas (blå hål rullar den över)
function ballHazard(b){
  if(downDir()!==b.floor)return;
  const c=cellOf(b.pos),k=cid(...c),pt=pitAt.get(k);
  if(pt&&pt.kind==='red'){const pc=ballAt(pt.c,b.floor),d=b.pos.clone().sub(pc);d.setComponent(b.fa,0);
    if(d.length()<pt.catchR){b.fall={t:0,v:0,pc,to:null};SFX.evilFall(nearK(b.pos));return}}
  const hz=HOLES.get(k);
  if(hz&&hz.floor===b.floor&&Math.abs(b.pos.getComponent(hz.axis)-coordOf(hz.c[hz.axis]))<hz.len/2-.05){
    if(!hz.broken)breakCrack(hz);
    b.fall={t:0,v:0,pc:null,to:hz.drop?hz.below:null};
  }
}
// Kuben vänds ett helt kvarts varv: kulan faller rakt nedåt genom sin gång tills den når en vägg
function ballGravity(b,dt){
  const dd=downDir(),a=DIRS[dd][0],s=DIRS[dd][1];
  const restOn=c=>{const k=cid(...c),o=open[k][dd];if(o==='door')return !doorAt(k,dd).isOpen;if(o==='edge')return false;if(o!==1)return true;const n=cid(...neighbor(c,dd));return isLift(n)||isWheel(n)};
  const lim=CELL/2-FLOOR_GAP-BALL_R;let c=cellOf(b.pos);
  if(s*(b.pos.getComponent(a)-coordOf(c[a]))>=lim-1e-4&&restOn(c)){b.vg=0;b.grounded=dd===b.floor;return}
  b.grounded=false;b.vg+=9.8*dt;
  const n=Math.max(1,Math.ceil(b.vg*dt/.12));
  for(let i=0;i<n;i++){
    const c0=c;
    b.pos.setComponent(a,b.pos.getComponent(a)+s*b.vg*dt/n);c=cellOf(b.pos);
    // faller ut över en kant (kuben vriden ett kvarts varv): borta
    if(open[cid(...c0)][dd]==='edge'&&(cid(...c)!==cid(...c0)||s*(b.pos.getComponent(a)-coordOf(c0[a]))>CELL/2)){b.fall={t:0,v:0,pc:null,to:null,dir:dirVec(dd)};return}
    if(s*(b.pos.getComponent(a)-coordOf(c[a]))>lim&&restOn(c)){b.pos.setComponent(a,coordOf(c[a])+s*lim);b.vg=0;break}
  }
}
// --- nycklar: plockas upp som frön ---
const keyMat=new THREE.MeshStandardMaterial({color:0xffcf3a,metalness:.8,roughness:.25,emissive:0x8a6400,emissiveIntensity:.5});
const KEYS=(LV.keys||[]).map((c,i)=>{
  const k=cid(...c),fd=SEGS[cellSeg[k]].floor,upv=dirVec(fd^1);
  const pos=center(c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP-.45);
  const g=new THREE.Group();g.position.copy(pos);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
  const spin=new THREE.Group();g.add(spin);
  const bow=new THREE.Mesh(new THREE.TorusGeometry(.12,.04,8,20),keyMat);bow.position.y=.16;spin.add(bow);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.34,8),keyMat);shaft.position.y=-.05;spin.add(shaft);
  for(const [y,w] of [[-.17,.1],[-.1,.07]]){const t=new THREE.Mesh(new THREE.BoxGeometry(w,.04,.04),keyMat);t.position.set(w/2,y,0);spin.add(t)}
  cellGroups.get(k).add(g);
  return {k,pos,upv,g,spin,ph:i*2.3,taken:false};
});
function updateKeys(dt,time){
  for(const K of KEYS){
    if(K.taken)continue;
    K.spin.rotation.y=time*2+K.ph;K.g.position.copy(K.pos).addScaledVector(K.upv,.06*Math.sin(time*2.2+K.ph));
    if(!playing||won||mode!=='roll'||inTube||jump||K.pos.distanceTo(p)>R+.35)continue;
    K.taken=true;K.g.visible=false;keyCount++;SFX.tone(1320,.12,{type:'triangle',v:.12});SFX.tone(1760,.18,{type:'sine',v:.08,delay:.08});
    if(!keyHint){keyHint=true;hint('A key! It opens a ball door – a brass door with a keyhole.',4500)}
  }
}
// --- frömaskiner: oändligt med frön ---
// Frömaskin (machines {c, d}) på sidoväggen d: en behållare av plast full med frön på en metallfot som sticker ut
// från väggen, en pip och en röd knapp i hamsterns höjd. Rullar hamstern mot knappen poppar 3 frön ut ur pipen
// in i munnen (högst 10 i munnen). Sedan tar det 30 sekunder innan den ger frön igen: den gula ringen runt knappen
// fylls under tiden och knappen är mörk. Behållaren ser alltid likadan ut.
const MACHINE_TIME=30, MACHINE_GIVE=3, MRING=30, MACH_OUT=.46;   // MACH_OUT: hur långt foten sticker ut från väggen
const MACH_LIM=CELL/2-FLOOR_GAP-MACH_OUT-R;                      // hamsterns mitt stannar så här långt från rutans mitt
let machineHint=false;
const machMetal=new THREE.MeshStandardMaterial({color:0xb8c2cc,metalness:.75,roughness:.3});
const machDark=new THREE.MeshStandardMaterial({color:0x2a3138,metalness:.6,roughness:.4});
const machPlastic=new THREE.MeshPhysicalMaterial({color:0xe8f6ff,transparent:true,opacity:.28,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
const machBtnOn=new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffb020,emissiveIntensity:.55,roughness:.35});   // gul: det går att hämta frön
const machBtnOff=new THREE.MeshStandardMaterial({color:0x3a4048,roughness:.5});                                         // grå: laddar
const machSegOn=new THREE.MeshBasicMaterial({color:0xffd166,side:THREE.DoubleSide}), machSegOff=new THREE.MeshBasicMaterial({color:0x3b4450,side:THREE.DoubleSide});
const MACHINES=(LV.machines||[]).map((M,mi)=>{
  const k=cid(...M.c),fd=SEGS[cellSeg[k]].floor,n=dirVec(M.d),upv=dirVec(fd^1);
  // gruppens nollpunkt: väggen, vid golvet. Lokalt: x längs väggen, y uppåt, z ut från väggen.
  const pos=center(M.c).addScaledVector(n,CELL/2-FLOOR_GAP).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP);
  const z=n.clone().negate(),x=new THREE.Vector3().crossVectors(upv,z);
  const g=new THREE.Group();g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,upv,z));g.position.copy(pos);cube.add(g);
  const add=(geo,mat,px,py,pz,rx=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.rotation.x=rx;g.add(m);return m};
  add(new THREE.BoxGeometry(.9,1.75,.04),machDark,0,.98,.02);                // vägghållaren
  add(new THREE.BoxGeometry(.78,.62,.42),machMetal,0,.55,.25);               // foten
  add(new THREE.BoxGeometry(.82,.06,.46),machDark,0,.89,.25);
  add(new THREE.CylinderGeometry(.34,.34,.72,32,1,true),machPlastic,0,1.28,.25);   // behållaren
  add(new THREE.CylinderGeometry(.37,.37,.08,32),machMetal,0,1.68,.25);
  add(new THREE.SphereGeometry(.07,16,12),machDark,0,1.74,.25);
  // fröna i behållaren (alltid full)
  const inst=new THREE.InstancedMesh(seedGeo,seedMat,220),o=new THREE.Object3D();let rs=7+mi*13;const rr=()=>{rs=(rs*9301+49297)%233280;return rs/233280};
  for(let i=0;i<220;i++){const an=rr()*Math.PI*2,r=Math.sqrt(rr())*.3;o.position.set(Math.cos(an)*r,.95+rr()*.62,.25+Math.sin(an)*r);o.rotation.set(rr()*3,rr()*3,rr()*3);o.scale.set(.028,.062,.019);o.updateMatrix();inst.setMatrixAt(i,o.matrix)}
  g.add(inst);
  add(new THREE.CylinderGeometry(.07,.08,.22,16,1,true),machDark,0,.74,.5,Math.PI/2-.5);   // pipen
  add(new THREE.CylinderGeometry(.17,.17,.04,32),machDark,0,.42,.47,Math.PI/2);            // knappens fot
  const btn=add(new THREE.CylinderGeometry(.12,.13,.07,32),machBtnOn,0,.42,.51,Math.PI/2);
  const segs=[];
  for(let i=0;i<MRING;i++)segs.push(add(new THREE.RingGeometry(.18,.23,3,1,Math.PI/2-(i+1)/MRING*Math.PI*2+.012,Math.PI*2/MRING-.024),machSegOn,0,.42,.494));
  return {...M,k,g,btn,segs,wait:0,told:false,press:0,spoutL:new THREE.Vector3(0,.66,.6)};
});
const machineAt=(k,d)=>MACHINES.some(M=>M.k===k&&M.d===d);
const POPS=[];   // frön på väg från pipen till hamstern
function useMachine(M){
  if(M.wait>0){if(!M.told&&M.wait<MACHINE_TIME-2){M.told=true;SFX.empty();hint(`The seed machine is refilling (${Math.ceil(M.wait)} s).`,2500)}return}
  if(mouth>=MOUTH_MAX){if(!M.told){M.told=true;hint('The mouth is full! Spit some seeds first.',3000)}return}
  const give=Math.min(MACHINE_GIVE,MOUTH_MAX-mouth);M.wait=MACHINE_TIME;M.press=.3;SFX.click();
  for(let i=0;i<give;i++){const m=seedMesh();cube.add(m);m.visible=false;POPS.push({M,m,t:-.25*i-.15,from:null})}
  if(!machineHint){machineHint=true;hint(`${give===1?'One seed':give+' seeds'}! The machine needs 30 seconds to refill.`,4000)}
}
function updateMachines(dt,time){
  for(const M of MACHINES){
    if(playing&&!won&&!settingsOpen)M.wait=Math.max(0,M.wait-dt);
    const lit=M.wait>0?Math.floor((1-M.wait/MACHINE_TIME)*MRING):MRING;
    M.segs.forEach((sg,i)=>{sg.material=i<lit?machSegOn:machSegOff});
    M.press=Math.max(0,M.press-dt);
    M.btn.material=M.wait>0?machBtnOff:machBtnOn;M.btn.position.z=.51-(M.press>0?.04:0);
    if(M.told&&p.distanceTo(M.g.position)>2*CELL)M.told=false;
  }
  // fröna poppar ut ur pipen i en båge till hamsterns framsida (och in i munnen)
  for(let i=POPS.length-1;i>=0;i--){
    const P=POPS[i];P.t+=dt;if(P.t<0)continue;
    if(!P.from){P.from=P.M.g.localToWorld(P.M.spoutL.clone());cube.worldToLocal(P.from);P.m.visible=true;SFX.tone(700+Math.random()*300,.06,{type:'triangle',v:.08})}
    const q=Math.min(1,P.t/.45),to=p.clone().addScaledVector(fwd3(heading),R*.7);
    P.m.position.lerpVectors(P.from,to,q).addScaledVector(up,.45*4*q*(1-q));P.m.rotation.set(q*9,q*5,0);
    if(q>=1){cube.remove(P.m);POPS.splice(i,1);mouth=Math.min(MOUTH_MAX,mouth+1);SFX.munch()}
  }
}
// Metallstolpar där en vägg har gått sönder: de håller upp taket. Bara utseende, allt rullar igenom dem.
const postMat=new THREE.MeshStandardMaterial({color:0xc9d3dc,metalness:.85,roughness:.28});
const postGeo=new THREE.CylinderGeometry(.045,.045,CELL-2*FLOOR_GAP,10);
const POSTS=new Set();
function addPosts(k,d){
  const c=cellOfId(k),fd=SEGS[cellSeg[k]].floor,fa=DIRS[fd][0],la=[0,1,2].find(a=>a!==fa&&a!==DIRS[d][0]);
  for(const sg of [1,-1]){
    const pos=center(c).addScaledVector(dirVec(d),CELL/2);pos.setComponent(la,pos.getComponent(la)+sg*(CELL/2-PANEL_IN));
    const key=pos.toArray().map(v=>v.toFixed(2)).join();if(POSTS.has(key))continue;POSTS.add(key);
    const m=new THREE.Mesh(postGeo,postMat);m.position.copy(pos);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dirVec(fd^1));cellGroups.get(k).add(m);
  }
}
// --- glasväggar som går sönder: tre frön inifrån ---
// Bara rena, platta glasväggar (inte golv, tak, kurvor eller väggar med något på). Bakom väggen: ingenting
// (öppningen blir en kant), en öppen gång med samma golv eller en gång med väggar och samma golv (dess vägg går
// sönder samtidigt). Utifrån går väggar inte sönder: fröet studsar med ett dovt ljud.
const wallHits=new Map();
let wallHint=false;
function wallBusy(k,d){
  return BUTTONS.some(B=>B.k===k&&B.d===d)||BDOORS.some(B=>B.k===k&&B.d===d)||MACHINES.some(M=>M.k===k&&M.d===d)||WHEELS.some(W=>W.cellKey===k&&W.run===d);
}
function wallBreakInfo(k,d){
  const si=cellSeg[k];if(si<0||openSeg(si)||open[k][d]!==0||!wallPanels.has(k+':'+d)||wallBusy(k,d))return null;
  const fd=SEGS[si].floor,n=neighbor(cellOfId(k),d);
  if(!inside(n))return {other:null,join:null};
  const nk=cid(...n),ns=cellSeg[nk];
  if(ns<0)return {other:null,join:null};
  if(SEGS[ns].floor!==fd||open[nk][d^1]!==0)return null;
  if(openSeg(ns))return {other:null,join:nk};
  if(!wallPanels.has(nk+':'+(d^1))||wallBusy(nk,d^1))return null;
  return {other:nk,join:nk};
}
const wallCrackMats=[3,7].map(nb=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.strokeStyle='rgba(232,248,255,.9)';g.lineWidth=1.6;
  let seed=nb*17;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  const branch=(x,y,a,len,depth)=>{if(depth<=0||len<5)return;const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;
    g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();branch(x2,y2,a+(rnd()-.5)*.9,len*.72,depth-1);if(rnd()<.45)branch(x2,y2,a+(rnd()-.5)*2,len*.5,depth-1)};
  for(let i=0;i<nb;i++)branch(64,64,i/nb*Math.PI*2+rnd()*.5,nb>3?26:18,nb>3?5:3);
  return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,side:THREE.DoubleSide});
});
function crackWallPanel(key,level){
  const W=wallPanels.get(key);if(!W)return;
  if(!W.crack){W.crack=new THREE.Mesh(new THREE.PlaneGeometry(CELL-2*PANEL_IN,CELL-2*PANEL_IN),wallCrackMats[0]);
    W.crack.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dirVec(W.d));W.crack.position.copy(W.m.position);W.g.add(W.crack)}
  W.crack.material=wallCrackMats[level-1];
}
const SHARDS=[];
function shatterWallPanel(key){
  const W=wallPanels.get(key);if(!W)return;wallPanels.delete(key);
  W.g.remove(W.e);if(W.crack)W.g.remove(W.crack);
  W.m.material=W.m.material.clone();
  SHARDS.push({m:W.m,g:W.g,t:0,home:W.m.position.clone(),down:dirVec(SEGS[cellSeg[W.k]].floor)});
}
function updateShards(dt){
  for(let i=SHARDS.length-1;i>=0;i--){
    const S=SHARDS[i];S.t+=dt;
    S.m.position.copy(S.home).addScaledVector(S.down,4.9*S.t*S.t);S.m.scale.setScalar(Math.max(.05,1-S.t));
    S.m.material.opacity=Math.max(0,.5*(1-S.t/.8));
    if(S.t>.8){S.g.remove(S.m);SHARDS.splice(i,1)}
  }
}
// Utifrån går glaset inte sönder: ett sexkantsmönster blixtrar till runt träffen (som en kraftsköld) och fröet studsar.
// Första gången en text, och hamstern säger det (högst var 20:e sekund).
const shieldTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  const grad=g.createRadialGradient(64,64,4,64,64,62);grad.addColorStop(0,'rgba(150,235,255,.55)');grad.addColorStop(1,'rgba(150,235,255,0)');
  g.strokeStyle='rgba(190,245,255,.95)';g.lineWidth=2.2;
  const r=11,h=r*Math.sqrt(3);
  for(let row=-1;row<8;row++)for(let col=-1;col<8;col++){
    const x=col*r*1.5+4,y=row*h+(col%2?h/2:0)+4;g.beginPath();
    for(let i=0;i<=6;i++){const a=i*Math.PI/3;g.lineTo(x+r*Math.cos(a),y+r*Math.sin(a))}g.stroke();
  }
  g.globalCompositeOperation='destination-in';const mask=g.createRadialGradient(64,64,6,64,64,62);mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(.7,'rgba(0,0,0,.6)');mask.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=mask;g.fillRect(0,0,128,128);
  g.globalCompositeOperation='source-over';g.fillStyle=grad;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(cv);
})();
const SHIELDS=[];
let shieldHint=false, shieldSaid=-99;
function shieldHit(pos,n){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshBasicMaterial({map:shieldTex,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  m.position.copy(pos).addScaledVector(n,.01);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);m.renderOrder=3;cube.add(m);SHIELDS.push({m,t:0});
  SFX.thud(nearK(pos));SFX.tone(1900,.18,{type:'sine',f2:1400,v:.05*nearK(pos)});
  const now=clock.elapsedTime;
  if(!shieldHint){shieldHint=true;hint("The wall can't be broken from the outside.",4000)}
  if(now-shieldSaid>20){shieldSaid=now;setTimeout(()=>SFX.say('cant_break',true),250)}
}
function updateShields(dt){
  for(let i=SHIELDS.length-1;i>=0;i--){const S=SHIELDS[i];S.t+=dt;const q=S.t/.55;
    S.m.material.opacity=Math.max(0,1-q);S.m.scale.setScalar(.7+.5*Math.min(1,q*2));
    if(q>=1){cube.remove(S.m);S.m.geometry.dispose();S.m.material.dispose();SHIELDS.splice(i,1)}}
}
// fröet studsar tillbaka från skölden och faller
const BOUNCES=[];
function bounceSeed(S){BOUNCES.push({m:S.m,pos:S.pos.clone(),v:S.dir.clone().multiplyScalar(-2.5),t:0})}
function updateBounces(dt){
  for(let i=BOUNCES.length-1;i>=0;i--){const B=BOUNCES[i];B.t+=dt;B.v.addScaledVector(up,-9.8*dt);B.pos.addScaledVector(B.v,dt);
    B.m.position.copy(B.pos);B.m.rotateX(dt*15);
    if(B.t>.6){cube.remove(B.m);BOUNCES.splice(i,1)}}
}
function hitWall(k,d,pos,S){
  const info=wallBreakInfo(k,d);
  if(!info){
    // en gång utan väggar: väggen här är grannens, och den träffas utifrån
    if(segOpenAt(k)){const n=dirVec(d^1),q=pos.clone();q.setComponent(DIRS[d][0],coordOf(cellOfId(k)[DIRS[d][0]])+DIRS[d][1]*(CELL/2+PANEL_IN));shieldHit(q,n);if(S)S.bounce=true}
    else SFX.thud(nearK(pos));
    return;
  }
  const key=k+':'+d,h=(wallHits.get(key)||0)+1;wallHits.set(key,h);
  const keys=[key];if(info.other!=null)keys.push(info.other+':'+(d^1));
  if(h<3){
    SFX.glassCrack(nearK(pos));for(const q of keys)crackWallPanel(q,h);
    if(!wallHint){wallHint=true;hint('The wall cracks! Three seeds break it.',3000)}
    return;
  }
  wallHits.delete(key);
  for(const q of keys)shatterWallPanel(q);
  addPosts(k,d);
  SFX.shatter();
  if(info.join!=null){open[k][d]=1;open[info.join][d^1]=1}else open[k][d]='edge';
  hint(info.join!=null?'The wall broke! A way through.':'The wall broke! Careful at the edge.',3000);
}
// Knapparnas lampor och tryck
function updateButtons(dt){
  for(const B of BUTTONS){
    B.press=Math.max(0,B.press-dt);
    const G=grateOf(B);B.knob.material=!G||G.isOpen?lampOff:charge>=1?lampGreen:lampRed;
    B.knob.position.copy(B.home).addScaledVector(B.n,B.press>0?.05:0);
    if(B.told&&p.distanceTo(B.pos)>2*CELL)B.told=false;
  }
}
// Kameran visar något som händer (en kula vid knappen, grinden som öppnas): kuben zoomas ut och kameran går
// till varje punkt en stund, sedan tillbaka in
let evt=null, exitCamT=0;   // {pts, i, t, auto}
const evtRing=new THREE.Mesh(new THREE.TorusGeometry(1.1,.14,10,40),new THREE.MeshBasicMaterial({color:0xffd166,transparent:true,depthTest:false}));
evtRing.visible=false;evtRing.renderOrder=10;scene.add(evtRing);
function showEvent(pts){
  const auto=!mapOn;
  if(auto){setMap(true);if(!mapOn)return}
  evt={pts,i:0,t:0,auto};
}
function updateEvent(dt){
  if(!evt){evtRing.visible=false;return}
  evt.t+=dt;
  if(evt.t>3.2){evt.i++;evt.t=0;if(evt.i>=evt.pts.length){const a=evt.auto;evt=null;evtRing.visible=false;if(a&&mapOn)setMap(false);return}}
}

const MAX_LIVES=3;
let lives=MAX_LIVES, redFall=null, gameIsOver=false;
const lastSafe=new THREE.Vector3().copy(p);
function updateLives(){
  const el=$('lives');el.textContent='';
  for(let i=0;i<MAX_LIVES;i++){const sp=document.createElement('span');sp.textContent='🐹';if(i>=lives)sp.className='lost';el.append(sp)}
  el.setAttribute('aria-label',`${lives} of ${MAX_LIVES} lives left`);
}
function startRedFall(c){
  SFX.fallDeath();perch=null;
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  mode='redfall';redFall={t:0,c,from:planeAxes().map(a=>p.getComponent(a))};vx=vz=0;jump=null;hopY=0;
}
function redFallStep(dt){
  const R2=redFall;R2.t+=dt;
  if(R2.edge){
    R2.v+=9.8*dt;p.addScaledVector(R2.dir,R2.v*dt);if(R2.t>1.1)ball.visible=false;
  }else if(R2.voidFall){
    // ner genom hålet, rakt ner i mörkret
    slideIntoHole(R2.hz,dt);R2.v+=9.8*dt;p.setComponent(ga,p.getComponent(ga)+gs*R2.v*dt);
    if(R2.t>1.1)ball.visible=false;
  }else{
  const q=Math.min(1,R2.t/.5), e=easeInOut(q);
  planeAxes().forEach((a,i)=>p.setComponent(a,R2.from[i]+(coordOf(R2.c[a])-R2.from[i])*e));
  p.setComponent(ga,floorCoord(R2.c)+gs*1.1*e);    // ner i gropen
  }
  if(R2.t<2)return;
  lives--;updateLives();redFall=null;ball.visible=true;if(lives>0){SFX.lifeLost();SFX.say('ouch',true)}
  if(lives<=0){gameOver();return}
  if(R2.edge){
    if(R2.map){baseQ.copy(mapStartQ);cube.quaternion.copy(baseQ);updateGravity();rot=null;retAnim=null;
      mapOn=false;$('mapBtn').classList.remove('on');$('mapBtn').setAttribute('aria-pressed',false)}
    p.copy(ballAt(R2.c,SEGS[cellSeg[cid(...R2.c)]].floor));
    if(R2.inward>=0)heading=angleOf(dirVec(R2.inward));else heading=mapStartHeading;
    camHeading=heading;faceSmooth=heading;turn=null;lastSafe.copy(p);startCamBlend();
  }else p.copy(lastSafe);
  mode='roll';vx=vz=0;wasMoving=false;lastCellKey=cid(...cellOf(p));
  startHop('stop',0);   // studsar upp och landar på fötterna
  hint(`Ouch! ${lives} ${lives===1?'life':'lives'} left.`,3000);
}
// Över en kant: finns ett öppet golv under faller hamstern ner dit (som i ett gap). Annars (ingenting, eller en
// golvundersida) faller den och ett liv försvinner; den börjar om i rutan den rullade från, vänd inåt.
function heroOffEdge(c,d){
  perch=null;
  const fd=SEGS[cellSeg[cid(...c)]].floor, T=edgeTarget(c,d,fd);
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  jump=null;hopY=0;vx=vz=0;hold=0;
  if(T.kind==='drop'){mode='drop';dropInfo={hz:{axis:DIRS[d][0],c:T.n,len:CELL-2*PANEL_IN,below:T.b},v:0};return}
  edgeDeath(c,d^1,dirVec(fd),false);
}
// Ett liv går förlorat genom att hamstern faller av: faller åt hållet dir, börjar sedan om i rutan c (vänd mot inward).
// fromMap: föll utzoomat (kuben vriden för långt): kuben vänds tillbaka och kameran zoomar in.
function edgeDeath(c,inward,dir,fromMap){
  SFX.fallDeath();perch=null;airEdge=null;
  mode='redfall';redFall={t:0,c,edge:true,v:0,dir:dir.clone(),inward,map:fromMap};vx=vz=0;jump=null;hopY=0;
}
// Hål i golvet: finns en gång under faller hamstern ner dit, annars försvinner den ner i mörkret (ett liv)
let dropInfo=null;
function startHoleFall(hz){
  perch=null;
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  jump=null;hopY=0;vx=vz=0;hold=0;
  if(hz.drop){mode='drop';dropInfo={hz,v:0}}
  else{mode='redfall';redFall={t:0,c:hz.c,voidFall:true,v:0,hz};SFX.fallDeath()}
}
// hamstern glider in över hålet längs gången, så att den ryms genom öppningen
function slideIntoHole(hz,dt){
  const a=hz.axis, ctr=coordOf(hz.c[a]), lim=Math.max(0,hz.len/2-R*.7), off=p.getComponent(a)-ctr;
  const want=ctr+Math.max(-lim,Math.min(lim,off));
  p.setComponent(a,p.getComponent(a)+(want-p.getComponent(a))*Math.min(1,dt*10));
}
function dropStep(dt){
  const D=dropInfo, hz=D.hz, LB=boxAt(cid(...hz.below)), target=LB?floorCoord(hz.below)-gs*BOX_S:floorCoord(hz.below);
  slideIntoHole(hz,dt);
  D.v+=9.8*dt;
  let y=p.getComponent(ga)+gs*D.v*dt;
  const done=gs*(y-target)>=0;if(done)y=target;
  p.setComponent(ga,y);
  roll+=dt*2;poseHamster(fwd3(heading),up,roll,0);
  if(!done)return;
  mode='roll';dropInfo=null;SFX.land(1);lastCellKey=cid(...hz.below);landT=.3;wasMoving=true;stillTime=0;
  // på en låda: står kvar där (i ett gap tar hålets kanter emot), och hoppar upp igen
  const grey=LB&&ENEMIES.find(e=>!e.gone&&e.onBox===LB);
  if(grey){caughtOnBox();return}
  if(LB){perch={B:LB,c:hz.below.slice(),free:segOpenAt(cid(...hz.below))};hint('On a box! Press JUMP to jump up to the floor above.',3500)}
  else lastSafe.copy(p);
}
// Sprucket golv: går sönder en halv sekund efter att hamstern lämnat det, eller efter 0,8 s om den står kvar
function updateCracks(dt){
  for(const hz of HOLES.values()){
    if(hz.kind!=='crack')continue;
    if(hz.broken){
      // glasskivan faller ner och försvinner
      if(hz.panel.visible){
        hz.fallT+=dt;
        hz.panel.position.copy(hz.panelHome).addScaledVector(dirVec(hz.floor),4.9*hz.fallT*hz.fallT);
        hz.panel.rotation.set(hz.fallT*2.1,0,hz.fallT*1.3);
        hz.panel.material.userData.falling=true;hz.panel.material.opacity=Math.max(0,Math.min(.9,floorOpacity()+.15)-hz.fallT);
        if(hz.fallT>1)hz.panel.visible=false;
      }
      continue;
    }
    const evilOn=ENEMIES.some(e=>evilLive(e)&&e.grounded&&cid(...cellOf(e.pos))===hz.k&&Math.abs(e.pos.getComponent(hz.axis)-coordOf(hz.c[hz.axis]))<hz.len/2-.05);
    const on=evilOn||(mode==='roll'&&!jump&&!inTube&&!inTrack&&downDir()===hz.floor&&cid(...cellOf(p))===hz.k&&overHole(hz,-.05));
    if(on){if(!hz.touched&&!evilOn){SFX.say('cracking');if(!crackHint){crackHint=true;hint('The floor cracks!',2500)}}hz.touched=true;hz.on+=dt;hz.after=0;if(Math.random()<dt*7)SFX.crackle();if(hz.on>=.8)breakCrack(hz)}
    else if(hz.touched){hz.after+=dt;if(hz.after>=.5)breakCrack(hz)}
    hz.panel.material.emissiveIntensity=hz.touched&&!hz.broken?.06+.06*Math.sin(hz.on*40+hz.after*40):0;   // glaset knastrar svagt när det börjar ge vika
  }
}
let crackHint=false;
function breakCrack(hz){hz.broken=true;hz.fallT=0;openHole(hz);SFX.shatter()}
// ---------- Onda hamstrar ----------
// En ond hamster hör till ett plan (en gång eller yta) och jagar bara när hjälten är på samma plan.
// Patrull: rullar lugnt mellan två rutor. Ser den hjälten (fri sikt framåt inom ±60°, högst 4 rutor bort) stannar den
// och skakar till, sedan jagar den, runt hörn. Tappar den hjälten letar den där den såg den sist och
// går sedan tillbaka till patrullen. Den kan inte hoppa och går aldrig in i hål, röda ringar eller hjulet.
// När kuben tippas faller den rakt nedåt till närmaste vägg och ligger där tills hjälten kommer tillbaka.
// Hoppar hjälten över den blir den yr i 2 sekunder: den snurrar och jagar inte.
// Fångar den hjälten försvinner ett liv; hjälten börjar om där den var och den onda hamstern går tillbaka
// dit den var när hjälten kom in på planet.
const EVIL_FOV=Math.cos(THREE.MathUtils.degToRad(60));   // synfältet: ±60° kring riktningen den tittar
const EVIL_PATROL=1.6, EVIL_CHASE=3.8, EVIL_SEARCH=3.2, EVIL_SIGHT=4*CELL, CATCH_DIST=2*R*.95;
const evilTex=new THREE.TextureLoader().load(evilTexUrl);evilTex.colorSpace=THREE.SRGBColorSpace;
const evilMat=new THREE.MeshStandardMaterial({map:evilTex,roughness:.75,emissive:0xff2233,emissiveIntensity:.12});
const ballAt=(c,fd)=>{const v=center(c);v.setComponent(DIRS[fd][0],ballHeight(c,fd));return v};
let evilModel=null;   // den gråa 3D-hamstern, när den har laddats (se nedan)
function makeEnemy(E){
  const seg=cellSeg[cid(...E.patrol[0])], floor=SEGS[seg].floor, fa=DIRS[floor][0];
  const g=new THREE.Group();cube.add(g);
  const body=new THREE.Group();g.add(body);
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(R,32,24),evilMat);mesh.rotation.y=-FACE;mesh.castShadow=true;body.add(mesh);
  const glow=new THREE.PointLight(0xff2233,.7,2.6);g.add(glow);   // svagt rött sken, så att den syns på håll
  const pts=E.patrol.map(c=>ballAt(c,floor));
  const pos=pts[0].clone();
  if(evilModel){body.add(evilModel.clone());mesh.visible=false}
  return {seg,floor,fa,g,body,mesh,pts,pos,vel:new THREE.Vector3(),vg:0,grounded:true,entry:pos.clone(),
    state:'patrol',pi:1,t:0,dazed:0,wake:0,rv:new THREE.Vector3(),falling:null,gone:false,spawning:null,lastSeen:null,fwd:(()=>{const d=pts[1].clone().sub(pts[0]);d.setComponent(fa,0);return d.normalize()})(),roll:0,rock:0,path:null,pathT:0};
}
const ENEMIES=(LV.enemies||[]).map(makeEnemy);
// Den gråa ihopkrupna hamstern (samma form som hjälten) i varje ond hamsters osynliga kula, med samma svaga röda sken.
// Laddas en gång; de som redan finns får en kopia, och nya från portarna får den direkt.
if(THREE.GLTFLoader)new THREE.GLTFLoader().load('hc_hamster_curled_grey_05.glb',g=>{
  const m=g.scene;m.scale.setScalar(R/1.08);
  m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material.emissive=new THREE.Color(0xff2233);o.material.emissiveIntensity=.12}});
  evilModel=m;
  for(const e of ENEMIES){e.body.add(m.clone());e.mesh.visible=false}
},undefined,()=>{});
const evilLive=e=>!e.gone&&!e.falling&&!e.spawning;

// ---------- Hamsterportar ----------
// En rund lucka i gångens vägg med en kort tunnel bakom och en röd lampa. Vid start rullar en ond hamster ut.
// När den är borta (t.ex. nerrullad i ett rött hål) och hjälten kommer inom 3 rutor på samma plan blinkar
// lampan, luckan öppnas och en ny rullar ut. En åt gången, hur många gånger som helst.
// Den nya behöver 2 sekunder på sig att vakna.
const GATE_R=.66, GATE_DROP=.46;   // luckans radie, och hur långt under rutans mitt den sitter
const gateMetal=new THREE.MeshStandardMaterial({color:0x4a5866,metalness:.25,roughness:.55,side:THREE.DoubleSide});
const hatchMat=new THREE.MeshStandardMaterial({color:0x9aa8b5,metalness:.3,roughness:.4,emissive:0x1a2430,emissiveIntensity:.6,side:THREE.DoubleSide});
const tunnelMat=new THREE.MeshStandardMaterial({color:0x090d12,roughness:.9,side:THREE.DoubleSide});
const GATES=(LV.gates||[]).map(G=>{
  const k=cid(...G.c), seg=cellSeg[k], floor=SEGS[seg].floor, upv=dirVec(floor^1), n=dirVec(G.d);
  const face=center(G.c).addScaledVector(n,CELL/2-PANEL_IN-PANEL_T/2);
  const holeC=face.clone().addScaledVector(upv,-GATE_DROP);
  const g=new THREE.Group();cube.add(g);
  // ramen: väggskiva med ett runt hål, vänd in mot rutan
  const sz=CELL-2*PANEL_IN, sh=new THREE.Shape();
  sh.moveTo(-sz/2,-sz/2);sh.lineTo(sz/2,-sz/2);sh.lineTo(sz/2,sz/2);sh.lineTo(-sz/2,sz/2);sh.lineTo(-sz/2,-sz/2);
  const hole=new THREE.Path();hole.absarc(0,-GATE_DROP,GATE_R,0,Math.PI*2,true);sh.holes.push(hole);
  const frame=new THREE.Mesh(new THREE.ShapeGeometry(sh,32),gateMetal);
  const z=n.clone().negate(), x=new THREE.Vector3().crossVectors(upv,z);
  const basis=new THREE.Matrix4().makeBasis(x,upv,z);
  frame.quaternion.setFromRotationMatrix(basis);frame.position.copy(face);g.add(frame);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(GATE_R,.05,10,40),hatchMat);ring.quaternion.copy(frame.quaternion);ring.position.copy(holeC).addScaledVector(n,-.01);g.add(ring);
  // tunneln bakom luckan
  const tun=new THREE.Mesh(new THREE.CylinderGeometry(GATE_R,GATE_R,1.1,24,1,true),tunnelMat);
  tun.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);tun.position.copy(holeC).addScaledVector(n,.55);g.add(tun);
  const back=new THREE.Mesh(new THREE.CircleGeometry(GATE_R,24),tunnelMat);back.quaternion.copy(frame.quaternion);back.position.copy(holeC).addScaledVector(n,1.1);g.add(back);
  // luckan: glider åt sidan när porten öppnas
  const hatch=new THREE.Mesh(new THREE.CircleGeometry(GATE_R-.02,32),hatchMat);hatch.quaternion.copy(frame.quaternion);g.add(hatch);
  const hatchHome=holeC.clone().addScaledVector(n,.02);hatch.position.copy(hatchHome);
  // lampan ovanför
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),lampRed);lamp.position.copy(holeC).addScaledVector(upv,GATE_R+.2).addScaledVector(n,-.06);g.add(lamp);
  return {...G,k,seg,floor,upv,n,x,hatch,hatchHome,lamp,state:'idle',t:0,open:0,first:true,enemy:null};
});
function gateSpawn(G){
  const e=makeEnemy({patrol:G.patrol});
  const to=ballAt(G.c,G.floor), from=to.clone().addScaledVector(G.n,CELL/2+.5);
  e.pos.copy(from);e.entry.copy(to);e.state='patrol';e.pi=0;e.fwd.copy(G.n).negate();
  e.spawning={t:0,from,to};e.g.position.copy(from);
  ENEMIES.push(e);G.enemy=e;
}
function updateGates(dt){
  for(const G of GATES){
    const alive=G.enemy&&!G.enemy.gone;
    if(G.state==='idle'){
      G.lamp.material=lampRed;
      // vid start, eller när den förra är borta och hjälten är nära (samma plan, högst 3 rutor)
      const near=mode==='roll'&&heroSeg===G.seg&&downDir()===G.floor&&!mapOn&&p.distanceTo(ballAt(G.c,G.floor))<=3*CELL+.01;
      if(!alive&&downDir()===G.floor&&(G.first||near)){G.state='warn';G.t=G.first?.4:1.5;G.first=false}
    }else if(G.state==='warn'){
      const was=Math.floor(G.t*8)%2;G.t-=dt;const now=Math.floor(G.t*8)%2;
      G.lamp.material=now?lampRed:lampOff;   // lampan blinkar och piper
      if(now&&!was)SFX.gateBeep(nearK(ballAt(G.c,G.floor)));
      if(G.t<=0)SFX.gateOpen(nearK(ballAt(G.c,G.floor)));
      if(G.t<=0){G.state='open';G.t=0}
    }else if(G.state==='open'){
      G.open=Math.min(1,G.open+dt/.4);G.lamp.material=lampRed;
      if(G.open>=1){G.state='release';gateSpawn(G)}
    }else if(G.state==='release'){
      if(!G.enemy.spawning){G.state='close'}
    }else if(G.state==='close'){
      G.open=Math.max(0,G.open-dt/.4);
      if(G.open<=0)G.state='idle';
    }
    G.hatch.position.copy(G.hatchHome).addScaledVector(G.x,G.open*(2*GATE_R+.1));
  }
}
let heroSeg=cellSeg[cid(...START)], heroSafe=0, evilSeen=false, evilDazedHint=false;
// Rutor den onda hamstern aldrig går in i
// Rutor den onda hamstern aldrig går in i själv: breda röda ringar, hål i golvet och sprucket glas,
// hål som leder till en annan gång (utom blå runda hål, som den rullar över), hissen och hjulet.
// Små röda hål går den in i men styr runt själva hålet.
const isLift=k=>LIFTS.some(L=>k===L.ka||k===L.kb);
function evilHazard(k){
  const pt=pitAt.get(k);
  if(pt&&pt.kind==='red'&&pt.wide)return true;
  if(HOLES.has(k)||isLift(k)||isWheel(k))return true;
  const sg=cellSeg[k];
  return sg>=0&&open[k][SEGS[sg].floor]==='link'&&!(pt&&pt.kind==='blue');
}
// Små röda hål: punkten t flyttas så att vägen dit går runt hålet. Är den onda hamstern redan nära hålet
// glider den runt kanten mot målet. (Den håller mitten minst PIT_KEEP utanför hålets kant.)
const PIT_KEEP=.08, PIT_CLEAR=.25;
function avoidPits(e,t){
  for(const k of new Set([cid(...cellOf(e.pos)),cid(...cellOf(t))])){
    const pt=pitAt.get(k);if(!pt||pt.kind!=='red'||pt.wide)continue;
    const pc=ballAt(pt.c,e.floor), ab=t.clone().sub(e.pos);ab.setComponent(e.fa,0);
    const L2=ab.lengthSq();if(L2<1e-6)continue;
    const clr=pt.r+PIT_CLEAR;
    if(ab.dot(pc.clone().sub(e.pos))<=0)continue;   // på väg bort från hålet
    const u=Math.max(0,Math.min(1,pc.clone().sub(e.pos).dot(ab)/L2));
    const off=e.pos.clone().addScaledVector(ab,u).sub(pc);off.setComponent(e.fa,0);
    if(off.length()>=clr)continue;      // vägen går fri från hålet
    const rel=e.pos.clone().sub(pc);rel.setComponent(e.fa,0);
    let d;
    if(rel.length()<clr+.1){
      // nära hålet: ett steg runt kanten, åt det håll målet ligger
      const n=rel.lengthSq()>1e-6?rel.normalize():new THREE.Vector3().crossVectors(ab,dirVec(e.floor)).normalize();
      const tg=new THREE.Vector3().crossVectors(n,dirVec(e.floor)).normalize();
      if(tg.dot(ab)<0)tg.negate();
      d=pc.clone().addScaledVector(n.clone().addScaledVector(tg,.8).normalize(),clr+.05);
    }else{
      if(off.length()<1e-3)off.crossVectors(ab,dirVec(e.floor));
      d=pc.clone().addScaledVector(off.normalize(),clr+.05);
    }
    const c0=cellOfId(k);
    for(let a=0;a<3;a++)if(a!==e.fa)d.setComponent(a,Math.max(coordOf(c0[a])-LIM,Math.min(coordOf(c0[a])+LIM,d.getComponent(a))));
    d.setComponent(e.fa,e.pos.getComponent(e.fa));
    return d;
  }
  return t;
}
// Kan den gå från ruta k åt hållet d? (samma gång, eller en öppen dörr)
// (en trälåda stoppar den också)
const evilEdge=(k,d)=>{const o=open[k][d],n=cid(...neighbor(cellOfId(k),d));if(boxAt(n))return false;if(o==='door')return doorAt(k,d).isOpen;if(o!==1)return false;
  return !evilHazard(n)};
// Fri sikt mellan a och b genom gången (hål och ringar skymmer inte, väggar gör det)
function evilSees(e,fov=true){
  if(heroSeg!==e.seg||inTube||!(mode==='roll'||mode==='throat'))return false;
  if(p.distanceTo(e.pos)>EVIL_SIGHT)return false;
  // bara framåt: hjälten måste vara inom synfältet (den ser inte bakåt och hör ingenting)
  const toHero=p.clone().sub(e.pos);toHero.setComponent(e.fa,0);
  if(fov&&toHero.length()>.05&&toHero.normalize().dot(e.fwd)<EVIL_FOV)return false;   // (synfältet gäller bara för att upptäcka)
  // Svängda gångar: hjälten syns i samma båge, eller mellan bågen och rutan där den börjar eller slutar
  if(inTrack||e.track){
    const C=inTrack?inTrack.C:e.track.C, ends=[cid(...C.a.c),cid(...C.b.c)];
    const eIn=e.track?e.track.C===C:ends.includes(cid(...cellOf(e.pos)));
    const hIn=inTrack?inTrack.C===C:ends.includes(cid(...cellOf(p)));
    return eIn&&hIn;
  }
  let prev=cellOf(e.pos);const steps=Math.ceil(p.distanceTo(e.pos)/.3);
  for(let i=1;i<=steps;i++){
    const c=cellOf(e.pos.clone().lerp(p,i/steps));
    if(cellSeg[cid(...c)]!==e.seg)return false;
    for(let a=0;a<3;a++){if(c[a]===prev[a])continue;const d=dirIndex(a,c[a]-prev[a]);const o=open[cid(...prev)][d];
      if(!(o===1||(o==='door'&&doorAt(cid(...prev),d).isOpen)))return false}
    prev=c;
  }
  return true;
}
// Rulla mot en punkt i golvplanet, stoppad av väggar och av rutor den inte går in i
function evilMove(e,target,speed,dt){
  const d=target.clone().sub(e.pos);d.setComponent(e.fa,0);const dist=d.length();
  const want=dist>.03?d.multiplyScalar(Math.min(speed,dist*5)/dist):d.set(0,0,0);
  e.vel.lerp(want,1-Math.exp(-6*dt));e.vel.setComponent(e.fa,0);
  const n=Math.max(1,Math.ceil(e.vel.length()*dt/.15));
  for(let i=0;i<n;i++){
    e.pos.addScaledVector(e.vel,dt/n);
    const c=cellOf(e.pos),k=cid(...c);
    for(let a=0;a<3;a++){if(a===e.fa)continue;
      const off=e.pos.getComponent(a)-coordOf(c[a]);
      for(const s of [1,-1])if(s*off>LIM&&!evilEdge(k,dirIndex(a,s))){e.pos.setComponent(a,coordOf(c[a])+s*LIM);e.vel.setComponent(a,0)}}
    const pt=pitAt.get(k);
    if(pt&&pt.kind==='red'&&!pt.wide){   // styr runt kanten på ett litet rött hål
      const pc=ballAt(pt.c,e.floor),d=e.pos.clone().sub(pc);d.setComponent(e.fa,0);const minD=pt.r+PIT_KEEP;
      if(d.length()<minD){if(d.length()<1e-3)d.crossVectors(e.vel.lengthSq()>1e-6?e.vel:dirVec((e.fa+1)%3*2),dirVec(e.floor));e.pos.copy(pc.addScaledVector(d.normalize(),minD))}
    }
  }
}
// ---------- Onda hamstrar i svängda gångar ----------
// Vägvalet räknar varje svängd gång som en egen nod (N³ + kurvans nummer) mellan dess två ändrutor.
// Inne i bågen följer den onda hamstern banan (e.track: {C, s, v, lat}) precis som hjälten.
const N3=N*N*N;
function evilNbrs(k){
  if(k>=N3){const C=CURVES[k-N3];return [C.a,C.b].map(E=>cid(...E.c)).filter(n=>!evilHazard(n))}
  const out=[];
  for(let d=0;d<6;d++){
    if(evilEdge(k,d))out.push(cid(...neighbor(cellOfId(k),d)));
    else if(open[k][d]==='curve')out.push(N3+curveAt(cellOfId(k),d).C.i);
  }
  return out;
}
const nodePos=k=>k>=N3?CURVES[k-N3].curve.getPointAt(.5):center(cellOfId(k));
const evilNode=e=>e.track?N3+e.track.C.i:cid(...cellOf(e.pos));
// Målet: {pos, ci (kurvans nummer, eller -1), s (läget i kurvan)}
const evilTarget=(pos,tr)=>({pos,ci:tr?tr.ci:-1,s:tr?tr.s:0});
// Bredd-först till målet. Går det inte att nå väljs den nåbara nod som ligger närmast. e.reach: gick målet att nå?
function evilRoute(e,T){
  const start=evilNode(e), goal=T.ci>=0?N3+T.ci:cid(...cellOf(T.pos));
  if(start===goal){e.reach=true;return {start,goal,best:start,next:start}}
  const prev=new Map([[start,-1]]),q=[start];let best=start,bestD=Infinity;
  while(q.length){
    const k=q.shift();
    const d2=nodePos(k).distanceTo(T.pos);if(d2<bestD){bestD=d2;best=k}
    if(k===goal){best=k;break}
    for(const n of evilNbrs(k))if(!prev.has(n)){prev.set(n,k);q.push(n)}
  }
  e.reach=best===goal;
  let next=best;while(next!==start&&prev.get(next)!==start)next=prev.get(next);
  return {start,goal,best,next};
}
// Gå mot målet längs vägen
function evilGo(e,T,speed,dt){
  const R0=evilRoute(e,T);
  if(e.track){
    const C=e.track.C;
    // i samma kurva som målet: mot målet; annars mot den ände vägen går ut genom (står kvar om ingen väg finns)
    const sGoal=R0.goal===R0.start?T.s:R0.next===R0.start?e.track.s:R0.next===cid(...C.a.c)?0:C.len;
    evilTrackMove(e,sGoal,speed,dt);return;
  }
  let pt;
  if(R0.start===R0.goal)pt=avoidPits(e,T.pos);
  else if(R0.next===R0.start){   // redan i närmaste rutan: så nära målet det går inom rutan
    pt=T.pos.clone();for(let a=0;a<3;a++)if(a!==e.fa){const c0=coordOf(cellOfId(R0.start)[a]);pt.setComponent(a,Math.max(c0-LIM,Math.min(c0+LIM,pt.getComponent(a))))}
    pt.setComponent(e.fa,e.pos.getComponent(e.fa));
  }else if(R0.next>=N3){
    // in i den svängda gången: mot där banan börjar vid rutans kant, och sedan in i bågen
    const C=CURVES[R0.next-N3], end=cid(...C.a.c)===R0.start?0:1, mp=C.curve.getPointAt(end);
    const d=mp.clone().sub(e.pos);d.setComponent(e.fa,0);
    if(d.length()<.2){evilEnterTrack(e,C,end,0);return}
    pt=mp.setComponent(e.fa,e.pos.getComponent(e.fa));
  }else if(R0.next===R0.goal&&R0.best===R0.goal)pt=avoidPits(e,T.pos);
  else{
    // mot mitten av öppningen till nästa ruta (inte mot rutans mitt, som kan vara ett hål)
    pt=avoidPits(e,ballAt(cellOfId(R0.start),e.floor).add(ballAt(cellOfId(R0.next),e.floor)).multiplyScalar(.5));
  }
  evilMove(e,pt,speed,dt);
}
function evilEnterTrack(e,C,end,v){
  const s=end?C.len:0, u=s/C.len;
  const lat=Math.max(-LIM,Math.min(LIM,e.pos.clone().sub(C.curve.getPointAt(u)).dot(trackSide(C,u))));
  e.track={C,s,v,lat};e.rv.set(0,0,0);evilTrackPlace(e);
}
function evilTrackPlace(e){const T=e.track,u=T.s/T.C.len;e.pos.copy(T.C.curve.getPointAt(u)).addScaledVector(trackSide(T.C,u),T.lat)}
// Flytta längs bågen med farten v (positiv = från a mot b). Ut i rutan när banan tar slut.
function evilTrackStep(e,dt,rolling){
  const T=e.track;T.s+=T.v*dt;
  if(T.s<=0||T.s>=T.C.len){evilExitTrack(e,T.s<=0?0:1,rolling);return}
  evilTrackPlace(e);
  // (rullar den av lutningen räknas farten som rullning, annars som att den går)
  const v=T.C.curve.getTangentAt(T.s/T.C.len).multiplyScalar(T.v);
  if(rolling){e.rv.copy(v);e.vel.set(0,0,0)}else{e.vel.copy(v);e.rv.set(0,0,0)}
}
function evilTrackMove(e,sGoal,speed,dt){
  const T=e.track, ds=sGoal-T.s;
  const want=Math.abs(ds)>.03?Math.sign(ds)*Math.min(speed,Math.abs(ds)*5):0;
  T.v+=(want-T.v)*(1-Math.exp(-6*dt));T.lat*=Math.exp(-2*dt);   // mot mitten av gången
  evilTrackStep(e,dt,false);
}
function evilExitTrack(e,end,rolling){
  const T=e.track,C=T.C,E=end?C.b:C.a,into=dirVec(E.d).negate();
  e.pos.copy(C.curve.getPointAt(end)).addScaledVector(trackSide(C,end),T.lat).addScaledVector(into,.03);
  e.track=null;
  if(rolling){e.rv.copy(into).multiplyScalar(Math.abs(T.v));e.vel.set(0,0,0)}else e.vel.copy(into).multiplyScalar(Math.abs(T.v));
}

// Rullning när kuben lutar: kan ta den onda hamstern in i hål, ringar och över kanter (men inte in i hissen eller hjulet)
const evilRollEdge=(k,d)=>{const o=open[k][d];if(o==='door')return doorAt(k,d).isOpen&&!boxAt(cid(...neighbor(cellOfId(k),d)));if(o!==1)return false;
  const n=cid(...neighbor(cellOfId(k),d));return !(isLift(n)||isWheel(n)||boxAt(n))};
function evilRoll(e,dt){
  const n=Math.max(1,Math.ceil(e.rv.length()*dt/.15));
  for(let i=0;i<n;i++){
    const c0=cellOf(e.pos);
    e.pos.addScaledVector(e.rv,dt/n);
    const c=cellOf(e.pos),k=cid(...c),k0=cid(...c0);
    // över en kant: ner på ett öppet golv under, annars faller den och är borta
    if(k!==k0){const d=dirBetween(c0,c);if(d>=0&&open[k0][d]==='edge'){evilOffEdge(e,c0,d);return}}
    for(let a=0;a<3;a++){if(a===e.fa)continue;
      const off=e.pos.getComponent(a)-coordOf(c[a]);
      for(const s of [1,-1]){
        if(open[k][dirIndex(a,s)]==='edge'&&s*off>CELL/2){evilOffEdge(e,c,dirIndex(a,s));return}
        if(s*off<=LIM||evilRollEdge(k,dirIndex(a,s))||(open[k][dirIndex(a,s)]==='edge'&&!boxAt(cid(...neighbor(c,dirIndex(a,s))))))continue;
        // En svängd gång: rullar den mot mynningen (inom ungefär ±50°) åker den in i bågen, annars är mynningen en vägg
        const sp=e.rv.length(), toward=e.rv.getComponent(a)*s;
        if(open[k][dirIndex(a,s)]==='curve'&&sp>.05&&toward>=.64*sp){
          const ce=curveAt(c,dirIndex(a,s));e.pos.setComponent(a,coordOf(c[a])+s*LIM);
          evilEnterTrack(e,ce.C,ce.end,(ce.end?-1:1)*sp);return;
        }
        e.pos.setComponent(a,coordOf(c[a])+s*LIM);e.rv.setComponent(a,-.25*e.rv.getComponent(a));
      }
    }
  }
}
// Faller ner i rutan c (genom ett gap eller över en kant): står det en ledig låda där landar den ovanpå och sitter fast
function evilLand(e,c){
  const B=boxAt(cid(...c));
  if(B){
    if(perch&&perch.B===B)setTimeout(caughtOnBox,0);   // (landar på lådan där hjälten står)
    e.onBox=B;e.boxK=B.k;e.pos.setComponent(e.fa,onBoxHeight(c,e.floor));e.vel.set(0,0,0);e.rv.set(0,0,0);SFX.land(.5)}
  else e.pos.setComponent(e.fa,ballHeight(c,e.floor));
  e.seg=cellSeg[cid(...c)];e.pts=[e.pos.clone(),e.pos.clone()];e.entry.copy(e.pos);
}
function evilOffEdge(e,c,d){
  const T=edgeTarget(c,d,e.floor);
  if(T.kind==='drop')evilLand(e,T.b);
  else{e.falling={t:0,pc:null};SFX.evilFall(nearK(e.pos))}
}
// Hamnar den onda hamstern i ett rött hål, ett hål i golvet eller trasigt glas faller den ner och är borta
// (finns en gång under landar den där). Blå runda hål rullar den över.
function evilHazardFall(e){
  if(downDir()!==e.floor||e.track)return;
  const c=cellOf(e.pos),k=cid(...c),pt=pitAt.get(k);
  if(pt&&pt.kind==='red'){
    const pc=ballAt(pt.c,e.floor),d=e.pos.clone().sub(pc);d.setComponent(e.fa,0);
    if(d.length()<pt.catchR){e.falling={t:0,pc};SFX.evilFall(nearK(e.pos));return}
  }
  const hz=HOLES.get(k);
  if(hz&&hz.broken&&Math.abs(e.pos.getComponent(hz.axis)-coordOf(hz.c[hz.axis]))<hz.len/2-.05){
    if(hz.drop)evilLand(e,hz.below);
    else{e.falling={t:0,pc:null};SFX.evilFall(nearK(e.pos))}
  }
}
// Tyngdkraften: faller rakt nedåt i kuben genom sin egen gång tills den når en vägg (inte genom hål)
function evilGravity(e,dt){
  const dd=downDir(),a=DIRS[dd][0],s=DIRS[dd][1];
  // I en svängd gång: står kuben rätt ligger den kvar i bågen. Har kuben vänts glider den ut genom
  // närmaste ände och faller sedan som vanligt.
  if(e.track){
    if(dd===e.floor){e.vg=0;e.grounded=true;return}
    evilExitTrack(e,e.track.s<e.track.C.len/2?0:1,false);e.vel.set(0,0,0);
  }
  const restOn=(c)=>{const k=cid(...c);const o=open[k][dd];if(o==='door')return !doorAt(k,dd).isOpen;if(o==='edge')return false;if(o!==1)return true;
    const n=cid(...neighbor(c,dd));return isLift(n)||isWheel(n)};   // aldrig in i hissen eller hjulet
  let c=cellOf(e.pos);
  if(s*(e.pos.getComponent(a)-coordOf(c[a]))>=LIM-1e-4&&restOn(c)){e.vg=0;e.grounded=dd===e.floor;return}
  e.grounded=false;e.vel.set(0,0,0);e.vg+=9.8*dt;
  const n=Math.max(1,Math.ceil(e.vg*dt/.15));
  for(let i=0;i<n;i++){
    const c0=c;
    e.pos.setComponent(a,e.pos.getComponent(a)+s*e.vg*dt/n);
    c=cellOf(e.pos);
    // faller ut över en kant (kuben vriden ett kvarts varv): borta
    if(open[cid(...c0)][dd]==='edge'&&(cid(...c)!==cid(...c0)||s*(e.pos.getComponent(a)-coordOf(c0[a]))>CELL/2)){e.falling={t:0,pc:null,dir:dirVec(dd)};SFX.evilFall(nearK(e.pos));return}
    if(s*(e.pos.getComponent(a)-coordOf(c[a]))>LIM&&restOn(c)){e.pos.setComponent(a,coordOf(c[a])+s*LIM);e.vg=0;break}
  }
}
function updateEnemies(dt){
  // Hjälten kommer in på ett nytt plan: de onda hamstrarna där minns var de var just då
  const hs=cellSeg[cid(...cellOf(p))];
  // och behöver 2 sekunder på sig att vakna (de skakar och ser ingenting under tiden)
  if((mode==='roll'||mode==='throat')&&!inTube&&!inTrack&&hs>=0&&hs!==heroSeg){heroSeg=hs;for(const e of ENEMIES)if(e.seg===hs&&!e.gone){
    // (är den i en båge räknas rutan vid närmaste ände)
    const T=e.track;e.entry.copy(T?ballAt(T.s<T.C.len/2?T.C.a.c:T.C.b.c,e.floor):e.pos);e.wake=2}}
  // lutningen just nu (kubens verkliga vridning, även mitt i en tippning): tyngdkraften i kubens koordinater
  const gC=new THREE.Vector3(0,-1,0).applyQuaternion(cube.quaternion.clone().invert());
  if(heroSafe>0){heroSafe-=dt;hamster.visible=heroSafe<=0||Math.floor(heroSafe*10)%2===0}else hamster.visible=true;
  for(const e of ENEMIES){
    if(e.gone)continue;
    if(e.spawning){
      // rullar ut ur porten och vaknar sedan
      const S=e.spawning;S.t=Math.min(1,S.t+dt/1.1);
      e.pos.lerpVectors(S.from,S.to,easeInOut(S.t));e.roll+=dt*5;
      e.g.position.copy(e.pos);poseObj(e.body,e.fwd,dirVec(e.floor^1),e.roll,0);
      if(S.t>=1){e.spawning=null;e.wake=2;e.grounded=true}
      continue;
    }
    if(e.falling){
      // faller ner i hålet och försvinner
      const F=e.falling;F.t+=dt;
      if(F.pc)for(let a=0;a<3;a++)if(a!==e.fa)e.pos.setComponent(a,e.pos.getComponent(a)+(F.pc.getComponent(a)-e.pos.getComponent(a))*Math.min(1,dt*8));
      e.pos.addScaledVector(F.dir||dirVec(e.floor),dt*(1+F.t*6));e.roll+=dt*4;
      e.g.position.copy(e.pos);poseObj(e.body,e.fwd,dirVec(e.floor^1),e.roll,0);
      if(F.t>1.2){e.gone=true;e.g.visible=false}
      continue;
    }
    // i en gång utan väggar: lutar golvet mer än 90° faller den av och är borta
    // ovanpå en låda: sitter fast (men är farlig, och frön gör den yr). Flyttas lådan ramlar den ner på golvet.
    if(e.onBox){
      const B=e.onBox;
      if(B.gone||B.fall||B.move||B.k!==e.boxK){e.onBox=null;e.pos.setComponent(e.fa,ballHeight(cellOfId(e.boxK),e.floor));e.entry.copy(e.pos);e.grounded=true;e.vel.set(0,0,0);e.rv.set(0,0,0);e.state='patrol';SFX.land(.5)}
      else{
        e.rock*=Math.exp(-8*dt);
        if(e.dazed>0){e.dazed-=dt;e.fwd.applyAxisAngle(dirVec(e.floor^1),dt*7);e.rock=.35*Math.sin(e.dazed*18);if(e.dazed<0)e.dazed=0}
        else if(playing&&!won&&!mapOn&&!settingsOpen&&mode==='roll'&&!inTube&&!jump&&heroSafe<=0){
          const d=p.clone().sub(e.pos),h=d.getComponent(e.fa);d.setComponent(e.fa,0);
          if(d.length()<CATCH_DIST&&Math.abs(h)<1.1)caught(e);
        }
        e.g.position.copy(e.pos);poseObj(e.body,e.fwd,dirVec(e.floor^1),e.roll,e.rock);
        continue;
      }
    }
    if(!e.track&&segOpenAt(cid(...cellOf(e.pos)))&&-gC.dot(dirVec(e.floor^1))<-.05){e.falling={t:0,pc:null,dir:gC.clone()};SFX.evilFall(nearK(e.pos));continue}
    if(!rot&&!retAnim)evilGravity(e,dt);
    if(e.falling)continue;
    // Kuben lutar (högst 60°): den onda hamstern rullar nedför lutningen, med friktion
    if(e.grounded&&e.track){
      // i bågen: lutningen skjuter den längs banan (kan rulla igenom, eller stanna och gunga i svängens lägsta del)
      const T=e.track, upE=dirVec(e.floor^1), tc=-gC.dot(upE), tg=T.C.curve.getTangentAt(T.s/T.C.len);
      if(tc>.5&&tc<.9995)T.v+=gC.dot(tg)*9.8*5/7*dt;
      if(mapOn||!playing||heroSeg!==e.seg){T.v*=Math.exp(-1.2*dt);if(Math.abs(T.v)>.01)evilTrackStep(e,dt,true)}
    }else if(e.grounded){
      const upE=dirVec(e.floor^1), tc=-gC.dot(upE);
      if(tc>.5&&tc<.9995)e.rv.addScaledVector(gC.clone().addScaledVector(upE,-gC.dot(upE)),9.8*5/7*dt);
      e.rv.multiplyScalar(Math.exp(-1.2*dt));e.rv.setComponent(e.fa,0);
      if(e.rv.lengthSq()>1e-4)evilRoll(e,dt);else e.rv.set(0,0,0);
      evilHazardFall(e);
      if(e.falling)continue;
    }
    if(e.grounded)evilPress(e,dt);
    // Hjälten hoppar över: den onda hamstern blir yr
    if(jump&&e.dazed<=0&&heroSeg===e.seg&&e.grounded){
      const d=p.clone().sub(e.pos);d.setComponent(e.fa,0);
      if(d.length()<CATCH_DIST){e.dazed=2;e.vel.set(0,0,0);SFX.dizzy(nearK(e.pos));SFX.say('missed_me');if(!evilDazedHint){evilDazedHint=true;hint('The grey hamster is dizzy! Get away!',3000)}}
    }
    const active=e.grounded&&playing&&!won&&!mapOn&&!settingsOpen&&heroSeg===e.seg&&mode!=='fall'&&mode!=='redfall'&&mode!=='drop';
    let speed=0;e.rock*=Math.exp(-8*dt);
    if(e.dazed>0){
      // yr: snurrar runt och vickar, rör sig inte. Efteråt går den tillbaka till patrullen
      // (och ser den hjälten där stannar den först och skakar till igen).
      e.dazed-=dt;e.vel.set(0,0,0);
      e.fwd.applyAxisAngle(dirVec(e.floor^1),dt*7);e.rock=.35*Math.sin(e.dazed*18);
      if(e.dazed<=0){e.state='return';e.dazed=0}
    }else if(active&&e.wake>0){
      // vaknar: skakar till och ser ingenting ännu
      e.wake-=dt;e.vel.set(0,0,0);e.rock=.22*Math.sin(e.wake*30);
    }else if(active){
      // När den redan jagar eller letar behöver hjälten bara synas, inte vara inom synfältet
      const sees=evilSees(e,e.state==='patrol'||e.state==='return');
      if(sees){e.lastSeen=p.clone().setComponent(e.fa,e.pos.getComponent(e.fa));e.lastSeenT=inTrack?{ci:inTrack.C.i,s:inTrack.s}:null}
      const seenT=e.lastSeen&&evilTarget(e.lastSeen,e.lastSeenT);
      // Kan den inte nå hjälten (t.ex. på andra sidan ett hål eller sprucket glas) bryr den sig inte om den
      if(e.state==='patrol'||e.state==='return'){
        if(sees)evilRoute(e,seenT);
        if(sees&&e.reach){e.state='alert';e.t=.6;e.vel.set(0,0,0);SFX.spot(nearK(e.pos));setTimeout(()=>SFX.say('uh_oh'),300);
          if(!evilSeen){evilSeen=true;hint('A grey hamster has seen you! Run, or jump over it.',4500)}}
        else{
          e.mumT=(e.mumT??2+Math.random()*3)-dt;if(e.mumT<=0){e.mumT=3+Math.random()*2;SFX.mumble(nearK(e.pos)**2)}
          const goal=e.state==='return'?e.pts.reduce((b,q)=>q.distanceTo(e.pos)<b.distanceTo(e.pos)?q:b):e.pts[e.pi];
          evilGo(e,evilTarget(goal,null),EVIL_PATROL,dt);speed=EVIL_PATROL;
          if(goal.distanceTo(e.pos)<.3){if(e.state==='return'){e.state='patrol';e.pi=e.pts.indexOf(goal)}e.pi=(e.pi+1)%e.pts.length}
        }
      }else if(e.state==='alert'){
        e.t-=dt;e.rock=.3*Math.sin(e.t*45);e.vel.set(0,0,0);
        if(e.t<=0)e.state='chase';
      }else if(e.state==='chase'){
        if(!sees){e.state='search';e.t=4;e.sndT=.6}
        else{
          e.sndT=(e.sndT??1)-dt;if(e.sndT<=0){e.sndT=1.6+Math.random()*.8;SFX.snarl(nearK(e.pos))}
          evilGo(e,seenT,EVIL_CHASE,dt);speed=EVIL_CHASE;
          // går hjälten inte att nå ger den upp efter en sekund och går tillbaka till patrullen
          e.giveUp=e.reach?0:(e.giveUp||0)+dt;
          if(e.giveUp>1){e.state='return';e.giveUp=0;SFX.hmpf(nearK(e.pos))}
        }
      }else if(e.state==='search'){
        if(sees)e.state='chase';
        else{
          e.t-=dt;evilGo(e,seenT,EVIL_SEARCH,dt);speed=EVIL_SEARCH;
          e.sndT=(e.sndT??1)-dt;if(e.sndT<=0){e.sndT=1.8+Math.random()*.6;SFX.sniff(nearK(e.pos))}
          if(e.t<=0||e.lastSeen.distanceTo(e.pos)<.4){e.state='return';SFX.hmpf(nearK(e.pos))}
        }
      }
      // Fångad! (inte mitt i ett hopp, och inte strax efter att ha blivit fångad)
      if(mode==='roll'&&!inTube&&!jump&&heroSafe<=0&&p.distanceTo(e.pos)<CATCH_DIST)caught(e);
    }else if(e.grounded)e.vel.set(0,0,0);   // (i bågen visar e.rv rullningen)
    // utseende: rullar framåt i farten, med nosen åt det håll den rullar
    const vt=e.vel.clone().add(e.rv), v=vt.length();
    if(v>.15)e.fwd.copy(vt).normalize();
    e.roll+=v*dt/R;
    e.g.position.copy(e.pos);
    if(e.grounded||v>0||e.dazed>0||e.wake>0)poseObj(e.body,e.fwd,dirVec(e.floor^1),e.roll,e.rock);
  }
}
// Kuben lutar och en ond hamster rullar på hjälten: den kan inte rulla förbi utan stannar mot hjälten.
// Första stöten kostar ett liv, och ligger den kvar kostar varje 3 sekunder ett liv till.
const PRESS_TIME=3;
let tipMsg='', tipMsgT=0;   // text i utzoomat läge som går före de vanliga tipsen en stund
function evilPress(e,dt){
  // (samma gång och samma golvhöjd: inte en ond hamster på våningen under)
  const touching=mapOn&&playing&&!won&&mode==='roll'&&!inTube&&evilLive(e)&&e.floor===downDir()&&e.seg===heroSeg&&Math.abs(e.pos.getComponent(e.fa)-p.getComponent(e.fa))<.3;
  const d=e.pos.clone().sub(p);d.setComponent(e.fa,0);const dist=d.length();
  // (inom 0,1 från hjälten räknas den fortfarande som att den ligger mot den)
  if(!touching||dist>2*R+.1){e.pressT=null;return}
  // knuffas tillbaka så att den ligger precis mot hjälten
  if(dist<1e-4)d.copy(e.fwd).negate();d.normalize();
  if(dist<2*R){
    if(e.track){
      const T=e.track, tg=T.C.curve.getTangentAt(T.s/T.C.len), sg=Math.sign(d.dot(tg))||1;
      T.s=Math.max(.001,Math.min(T.C.len-.001,T.s+sg*(2*R-dist)));if(T.v*sg<0)T.v=0;evilTrackPlace(e);
    }else{
      const h=e.pos.getComponent(e.fa);e.pos.copy(p).addScaledVector(d,2*R).setComponent(e.fa,h);
      const vin=e.rv.dot(d);if(vin<0)e.rv.addScaledVector(d,-vin);
    }
  }
  if(e.pressT==null){e.pressT=PRESS_TIME;if(heroSafe<=0)pressLife()}
  else{e.pressT-=dt;if(e.pressT<=0){e.pressT=PRESS_TIME;pressLife()}}
}
function pressLife(){
  SFX.caught();SFX.lifeLost();SFX.say('let_me_go',true);
  lives--;updateLives();heroSafe=1.5;
  if(lives<=0){gameOver();return}
  tipMsg=`A grey hamster is rolling on you! ${lives} ${lives===1?'life':'lives'} left. Tilt it away!`;tipMsgT=3;
}
// Fångad av en grå hamster på en låda: ett liv, och hjälten studsar tillbaka upp till platsen före hålet
function caughtOnBox(){
  if(gameIsOver||!playing)return;
  SFX.caught();SFX.lifeLost();SFX.say('let_me_go',true);
  perch=null;perchHop=null;lives--;updateLives();
  if(lives<=0){gameOver();return}
  p.copy(lastSafe);mode='roll';vx=vz=0;wasMoving=false;lastCellKey=cid(...cellOf(p));heroSafe=2;
  startHop('stop',0);startCamBlend();
  hint(`Caught by a grey hamster on the box! ${lives} ${lives===1?'life':'lives'} left.`,3500);
}
function caught(e){
  SFX.caught();SFX.lifeLost();SFX.say('let_me_go',true);
  for(const o of ENEMIES)if(o.seg===e.seg&&evilLive(o)){o.track=null;o.pos.copy(o.entry);o.vel.set(0,0,0);o.rv.set(0,0,0);o.state='patrol';o.lastSeen=null;o.lastSeenT=null;o.dazed=0}
  lives--;updateLives();
  if(lives<=0){gameOver();return}
  vx=vz=0;heroSafe=2;
  if(!inTrack&&!turn)startHop('stop',0);
  hint(`Caught by a grey hamster! ${lives} ${lives===1?'life':'lives'} left.`,3500);
}
function gameOver(){
  SFX.gameOver();setTimeout(()=>SFX.say('oh_no',true),300);
  gameIsOver=true;playing=false;
  $('over').classList.remove('hide');
}

// ---------- Hål: hamstern faller ner halvvägs och sitter fast ----------
// throat = {x, y, d}: hamstern sitter i hålet mellan ruta x och ruta y (riktning d från x till y).
// Den lossnar när kuben ligger så att golvet i y:s gång är nedåt.
function linkFrom(c,d){const n=neighbor(c,d);return {x:c,y:n,d}}
function startFall(c,d){
  perch=null;
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  // hoppet: från där hamstern är, i en båge till hålets mitt, och kullerbyttan rätas upp
  const roll0=roll-2*Math.PI*Math.round(roll/(2*Math.PI));
  const from=planeAxes().map(a=>p.getComponent(a));
  mode='fall';fallInfo={...linkFrom(c,d),v:0,hop:0,roll0,from};vx=vz=0;hold=0;
}
function fallStep(dt){
  const {x}=fallInfo;
  if(fallInfo.hop<1){
    fallInfo.hop=Math.min(1,fallInfo.hop+dt/HOP_TIME);
    const q=fallInfo.hop, e=easeInOut(q);
    planeAxes().forEach((a,i)=>p.setComponent(a,fallInfo.from[i]+(coordOf(x[a])-fallInfo.from[i])*e));
    hopY=HOP_H*4*q*(1-q);
    roll=fallInfo.roll0*(1-e);
    poseHamster(fwd3(heading),up,roll,0);
    if(q>=1){hopY=0;roll=0}
    return;
  }
  fallInfo.v+=9.8*.7*dt;
  const face=coordOf(x[ga])+gs*CELL/2;   // hålets plan: kulans mitt hamnar här, halvvägs ner
  let y=p.getComponent(ga)+gs*fallInfo.v*dt;
  const done=gs*(y-face)>=0;
  if(done)y=face;
  p.setComponent(ga,y);
  for(const a of planeAxes())p.setComponent(a,p.getComponent(a)+(coordOf(x[a])-p.getComponent(a))*Math.min(1,dt*8));
  poseHamster(fwd3(heading),up,0,0);   // fötterna nedåt hela vägen ner
  if(!done)return;
  for(const a of planeAxes())p.setComponent(a,coordOf(x[a]));
  mode='throat';throat={x:fallInfo.x,y:fallInfo.y,d:fallInfo.d};rightSince=null;SFX.stuck();setTimeout(()=>SFX.say('ready'),550);
  if(mapOn){mapStartQ.copy(baseQ);mapStartHeading=heading}   // föll i schaktet utzoomat: härifrån tippar man vidare
  hint('The hamster is stuck in the hole! Zoom out and tip the cube so the floor of the next tunnel points down.',6000);
}
// Rätt läge: golvet i gången som hålet leder till pekar nedåt
const targetFloor=()=>throat?SEGS[cellSeg[cid(...throat.y)]].floor:-1;
const isRight=q=>mode==='throat'&&downDirOf(q)===targetFloor();
let rightSince=null;     // när kuben hamnade i rätt läge (för automatisk inzoomning)
// Hamstern lossnar: den landar i öppningen och vänds in mot nästa gång
function release(){
  SFX.release();
  const {y,d}=throat,n=dirVec(d);
  p.copy(center(y)).addScaledVector(n,-(CELL/2-.45));
  heading=angleOf(n);camHeading=heading;vx=vz=0;turn=null;turnArmed=false;sideTime=0;
  mode='roll';throat=null;rightSince=null;lastCellKey=cid(...y);
  for(const m of segFloors.flat())m.material=floorMat;hamsterMat.emissiveIntensity=0;
}

// ---------- Kamera ----------
const CAM_BACK=2.6, CAM_UP=1.85, LOOK_AHEAD=2.2;
const toWorld=v=>cube.localToWorld(v.clone());
// Hur stor del av sträckan från a till b som går fri från stängda väggar (0–1), i kubens koordinater
let camFrac=1;
function camFree(a,b){
  const STEPS=24;let prev=cellOf(a);
  const out=v=>[0,1,2].some(i=>Math.abs(v.getComponent(i))>HALF-.12);
  for(let i=1;i<=STEPS;i++){
    const q=a.clone().lerp(b,i/STEPS);
    if(out(q))return Math.max(0,(i-1)/STEPS-.04);
    const c=cellOf(q);
    for(let ax=0;ax<3;ax++){
      if(c[ax]===prev[ax])continue;
      const d=dirIndex(ax,c[ax]-prev[ax]);
      if(!passable(cid(...prev),d)||liftDoorShut(cid(...prev),d))return Math.max(0,(i-1)/STEPS-.04);   // (en stängd hissdörr är en vägg)
    }
    prev=c;
  }
  return 1;
}
function placeCamera(){
  cam.up.set(0,1,0);
  // I ett rött hål står kameran kvar ovanför, så att man ser hamstern försvinna ner
  if(mode==='redfall'){cam.lookAt(camLook);return}
  const bw=toWorld(p);
  if(inTrack&&!inTrack.standing){
    // I en svängd gång: kameran bakom kulan längs bågen, så att den följer kurvan
    const T=inTrack,C=T.C,BACK=CAM_BACK;   // samma avstånd som i vanliga gångar, så att kameran inte rycker
    let sb=T.s-T.dir*BACK, extra=0, endE=null;
    if(sb<0){extra=-sb;sb=0;endE=C.a}else if(sb>C.len){extra=sb-C.len;sb=C.len;endE=C.b}
    const bp=C.curve.getPointAt(sb/C.len).addScaledVector(trackSide(C,sb/C.len),T.lat);   // rakt bakom kulan
    if(endE)bp.addScaledVector(dirVec(endE.d),-extra);
    bp.addScaledVector(up,CAM_UP-R);
    cam.position.copy(toWorld(bp));
    const tw=C.curve.getTangentAt(T.s/C.len).multiplyScalar(T.dir).applyQuaternion(cube.quaternion);
    camLook.copy(bw).addScaledVector(tw,LOOK_AHEAD);camLook.y+=-R+.1;
  }else if(inTube){
    // I röret åker kameran med inne i röret, en bit bakom kulan
    const BACK=1.9;
    let s=tubeS-tubeDir*BACK, extra=0;
    if(s<0){extra=-s;s=0}else if(s>tubeLen){extra=s-tubeLen;s=tubeLen}
    const cp=tubeCurve.getPointAt(s/tubeLen);
    if(extra>0){const n=dirVec((tubeDir>0?tubeA:tubeB).d);cp.addScaledVector(n,-extra)}
    cam.position.copy(toWorld(cp));cam.position.y+=.3;
    const tw=tubeCurve.getTangentAt(tubeS/tubeLen).multiplyScalar(tubeDir).applyQuaternion(cube.quaternion);
    camLook.copy(bw).addScaledVector(tw,.8);camLook.y+=.05;
  }else{
    // Kameran ovanför och bakom kulan, men aldrig på andra sidan en vägg eller ett tak.
    // Först så högt det går (upp mot taket), sedan så långt bakåt det går.
    const fl=fwd3(camHeading), hUp=CAM_UP-R;
    const top=p.clone().addScaledVector(up,hUp*camFree(p,p.clone().addScaledVector(up,hUp)));
    const want=top.clone().addScaledVector(fl,-CAM_BACK);
    const frac=camFree(top,want);
    camFrac=frac<camFrac?frac:camFrac+(frac-camFrac)*.08;
    cam.position.copy(toWorld(top.clone().lerp(want,camFrac)));
    const f=fl.clone().applyQuaternion(cube.quaternion);f.y=0;
    if(f.lengthSq()<1e-4)f.set(0,0,1);f.normalize();
    // Nära kulan tittar kameran kortare fram, så att kulan syns i bild
    const look=.7+(LOOK_AHEAD-.7)*camFrac;
    camLook.set(bw.x+f.x*look,bw.y-R+.1,bw.z+f.z*look);
    // Panorering nedåt: kameran glider fram över hamstern och tittar ner framför den, så att man kan
    // titta ner i ett hål och se om det finns golv under
    if(camPitch<-1e-3){
      const k=Math.min(1,camPitch/PITCH_MIN);
      cam.position.lerp(toWorld(top),k*.85);
      camLook.set(bw.x+f.x*(look+k*.4),bw.y-R+.1-k*2.2,bw.z+f.z*(look+k*.4));
    }
    // Panorering uppåt: vrid blickriktningen runt kamerans sidoaxel
    if(camPitch>1e-3){
      const d=camLook.clone().sub(cam.position), L=d.length(), hl=Math.hypot(d.x,d.z);
      const a=Math.atan2(d.y,hl)+camPitch;
      camLook.copy(cam.position).add(new THREE.Vector3(d.x/hl*Math.cos(a)*L,Math.sin(a)*L,d.z/hl*Math.cos(a)*L));
    }
  }
  // Kameran följer med en bit uppåt i hoppet, så att hamstern inte skymmer sikten
  if(jump&&!inTube){const lift=up.clone().applyQuaternion(cube.quaternion).multiplyScalar(Math.min(.3,hopY*.5));cam.position.add(lift);camLook.add(lift)}
  if(camBlend>0){const e=easeInOut(camBlend);cam.position.lerp(blendFrom.p,e);camLook.lerp(blendFrom.t,e)}
  cam.lookAt(camLook);
}
const easeInOut=q=>q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;

// ---------- Styrning: lutning ----------
let tiltX=0,tiltZ=0;
let orientEventsSeen=0, baseBeta=null, baseGamma=null;
function onOrient(e){
  orientEventsSeen++;
  const beta=e.beta, gamma=e.gamma;
  if(beta===null||gamma===null)return;
  lastBeta=beta;lastGamma=gamma;
  if(baseBeta===null){baseBeta=beta;baseGamma=gamma} // kalibrera "rakt fram" utifrån hur telefonen hålls just nu
  // Ju mer man lutar, desto fortare. Den totala lutningen räknas, oavsett riktning:
  // under dödzonen står hamstern still, vid fullTilt() grader (inställningen Full speed tilt) rullar den för fullt.
  const dx=gamma-baseGamma, dy=beta-baseBeta, mag=Math.hypot(dx,dy);
  const m=Math.min(1,Math.max(0,mag-settings.dead)/(fullTilt()-settings.dead));
  tiltX=mag>0?dx/mag*m:0;
  tiltZ=mag>0?dy/mag*m:0;
}
let lastBeta=null,lastGamma=null;
// Full fart vid så många graders lutning (alltid minst 5° mer än dödzonen)
const fullTilt=()=>Math.max(settings.fullTilt??28,settings.dead+5);
const LEVEL_SC=54/26;   // vattenpasset: bildenheter per grad (full fart, 26°, nära kanten; 62 är kanten)
function enableOrientation(){
  if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
    DeviceOrientationEvent.requestPermission().then(res=>{
      if(res==='granted'){useOrientation=true;addEventListener('deviceorientation',onOrient);$('tilt').classList.remove('hide');armFallbackCheck()}
      else{useKeyboard=true;hint('Tilt was denied. Drag your finger on the screen to steer.',7000)}
    }).catch(()=>{useKeyboard=true;hint('Tilt could not be started. Drag your finger on the screen.',7000)});
  }else if('DeviceOrientationEvent' in window){
    useOrientation=true;addEventListener('deviceorientation',onOrient);$('tilt').classList.remove('hide');
    armFallbackCheck();
  }else{
    useKeyboard=true;hint('No tilt sensor found. Drag your finger on the screen.',7000);
  }
}
function armFallbackCheck(){
  const seenAtStart=orientEventsSeen;
  setTimeout(()=>{
    if(orientEventsSeen===seenAtStart){
      // inga sensordata kom alls inom 2 sekunder, troligen blockerat av webbläsaren/iframen
      useKeyboard=true;
      hint('The tilt sensor is not responding here. Drag your finger on the screen instead, or open the page in its own tab.',9000);
    }
  },2000);
}

// ---------- Styrning: tangentbord (reserv/dator) ----------
const keys={};
addEventListener('keydown',e=>keys[e.code]=1);
addEventListener('keyup',e=>keys[e.code]=0);

// ---------- Styrning: dra på skärmen (reserv touch) ----------
let dragActive=false,dragX=0,dragZ=0;
ren.domElement.addEventListener('touchstart',e=>{if(useOrientation||mapOn)return;dragActive=true},{passive:true});
ren.domElement.addEventListener('touchmove',e=>{
  if(useOrientation||mapOn||!dragActive)return;
  const t=e.touches[0],cx=innerWidth/2,cy=innerHeight/2;
  dragX=Math.max(-1,Math.min(1,(t.clientX-cx)/150));
  dragZ=Math.max(-1,Math.min(1,(t.clientY-cy)/150));
},{passive:true});
ren.domElement.addEventListener('touchend',()=>{dragActive=false;dragX=0;dragZ=0});

function hint(t,ms=5000){const h=$('hint');h.textContent=t;h.style.opacity=1;clearTimeout(hint.t);hint.t=setTimeout(()=>h.style.opacity=0,ms)}

let playing=false,won=false,startTime=0;
// Val av bana på startskärmen
for(const b of document.querySelectorAll('.lvl')){
  b.classList.toggle('on',b.dataset.level===LEVEL_ID);
  b.setAttribute('aria-pressed',b.dataset.level===LEVEL_ID);
  b.onclick=()=>{if(b.dataset.level!==LEVEL_ID)location.search='?level='+b.dataset.level};
}
updateLives();
// Helskärm och stående läge när spelet startar (Android). Webbläsaren tillåter det bara direkt efter ett tryck.
// Där det inte går (t.ex. iPhone) fortsätter spelet som vanligt.
function goFullscreen(){
  if(!touch)return;
  const el=document.documentElement, req=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!req)return;
  const lock=()=>{try{const o=screen.orientation;if(o&&o.lock)o.lock('portrait').catch(()=>{})}catch(err){}};
  try{const r=req.call(el,{navigationUI:'hide'});if(r&&r.then)r.then(lock).catch(()=>{});else lock()}catch(err){}
}
$('go').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');$('setBtn').classList.remove('hide');$('lives').classList.remove('hide');
  SFX.init();enableOrientation();goFullscreen();
  playing=true;startTime=performance.now();showSettingValues();
  hint('Tilt forward to roll, sideways to turn. Press JUMP to jump. When the hamster stands still, swipe to look around.',7000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');$('setBtn').classList.remove('hide');$('lives').classList.remove('hide');
  SFX.init();goFullscreen();useKeyboard=true;playing=true;startTime=performance.now();showSettingValues();
  hint(touch?'Drag up to roll forward, sideways to turn. Press JUMP to jump.':'Up/W rolls forward, Down/S back. Left/Right turns. Space jumps. When standing still: drag with the mouse to look around. M zooms out.',7000);
};

// ---------- Utzoomat läge: kuben snett ovanifrån, som en tärning på ett bord ----------
// Rullningen pausas medan man tittar utifrån. Här tippar man kuben genom att svepa.
const MAP_TIME=.6, MAP_TILT=THREE.MathUtils.degToRad(38);
let mapOn=false,mapT=0;
let showAll=true;         // false: visa bara gångarna nära hamstern (man börjar med alla)
// pilen som visar rätt håll: inställningen Help arrow (av från början)
const marker=new THREE.Mesh(new THREE.TorusGeometry(.8,.12,10,40),new THREE.MeshBasicMaterial({color:0xff5fa2,transparent:true,depthTest:false}));
marker.renderOrder=10;marker.visible=false;scene.add(marker);
// Kubens läge och hamsterns riktning när man zoomade ut: dit tippar kuben tillbaka om man zoomar in
// innan den står rätt
let turns=0;   // hela kvarts vridningar av kuben (visas utzoomat och i topplistan)
const mapStartQ=new THREE.Quaternion();let mapStartHeading=0, retAnim=null;
const heroFloorDown=()=>{const s=cellSeg[cid(...cellOf(p))];return s<0||SEGS[s].floor===downDir()};
function setMap(on){
  if(exitState&&!on)return;   // vid utgången stannar kameran ute tills hamstern har rullat ut
  if(on&&(!playing||won||inTube||jump||mode==='drop'||mode==='fall'||mode==='redfall'||mode==='wheel'||mode==='wheelhop'||mode==='lift'||mode==='perchhop'))return;
  if(rot||retAnim)return;
  if(on&&!mapOn){mapStartQ.copy(baseQ);mapStartHeading=heading;heroVel.set(0,0,0);tiltFwd.copy(fwd3(heading));
    if(exitState){/* vid luckan: hamstern har redan sagt att den är redo */}
    else if(mode==='roll'&&!inTrack&&!inTube&&segOpenAt(cid(...cellOf(p)))){if(!evt)SFX.say('nothing_to_hold',true)}
    else if(mode==='roll'&&(inTrack||!atShaft())){SFX.holdOn();SFX.say('holding_on',true)}}
  if(!on&&mapOn){
    const needBack=(mode==='throat'&&!isRight(baseQ))||(mode==='roll'&&!heroFloorDown());
    if(needBack&&!baseQ.equals(mapStartQ)){retAnim={from:cube.quaternion.clone(),to:mapStartQ.clone(),t:0};return}
  }
  mapOn=on;$('mapBtn').classList.toggle('on',mapOn);$('mapBtn').setAttribute('aria-pressed',mapOn);
  dragActive=false;dragX=0;dragZ=0;
  if(!on&&mode==='throat'&&isRight(baseQ))release();
}
$('mapBtn').onclick=()=>setMap(!mapOn);
addEventListener('keydown',e=>{if(e.code==='KeyM')setMap(!mapOn)});
$('nearBtn').onclick=()=>{showAll=!showAll;$('nearBtn').textContent=showAll?'Show nearby':'Show all'};
const heroVel=new THREE.Vector3(), tiltFwd=new THREE.Vector3(0,0,1);
function heroTiltStep(dt){
  const c0=cellOf(p),si=cellSeg[cid(...c0)];if(!openSeg(si))return;
  const fd=SEGS[si].floor,fa=DIRS[fd][0],upE=dirVec(fd^1);
  const gC=new THREE.Vector3(0,-1,0).applyQuaternion(cube.quaternion.clone().invert());
  if(-gC.dot(upE)<-.05){rot=null;swipeStart=null;heroVel.set(0,0,0);edgeDeath(c0,-1,gC,true);return}   // mer än 90°: ramlar av
  heroVel.addScaledVector(gC.clone().addScaledVector(upE,-gC.dot(upE)),9.8*5/7*dt);
  heroVel.multiplyScalar(Math.exp(-1.0*dt));heroVel.setComponent(fa,0);
  const n=Math.max(1,Math.ceil(heroVel.length()*dt/.12));
  for(let i=0;i<n;i++){
    const pc=cellOf(p);p.addScaledVector(heroVel,dt/n);
    const c=cellOf(p),k=cid(...c),pk=cid(...pc);
    if(k!==pk){const d=dirBetween(pc,c);if(d>=0&&open[pk][d]==='edge'){
      const T=edgeTarget(pc,d,fd);
      if(T.kind==='drop'){p.setComponent(fa,ballHeight(T.b,fd));SFX.land(.8);continue}
      heroVel.set(0,0,0);edgeDeath(pc,d^1,gC,true);return;
    }}
    for(let a=0;a<3;a++){if(a===fa)continue;
      const off=p.getComponent(a)-coordOf(c[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM)continue;
        const d=dirIndex(a,s),o=open[k][d],nb=neighbor(c,d),nk=inside(nb)?cid(...nb):-1;
        if(o==='edge'&&s*off>CELL/2){heroVel.set(0,0,0);edgeDeath(c,d^1,gC,true);return}
        const pass=(o===1||o==='edge'||(o==='door'&&doorAt(k,d).isOpen))&&!(nk>=0&&(boxAt(nk)||isLift(nk)||isWheel(nk)));
        if(pass)continue;
        const vin=heroVel.getComponent(a)*s;if(vin>2.2)SFX.bump(vin);
        p.setComponent(a,coordOf(c[a])+s*LIM);heroVel.setComponent(a,-.25*heroVel.getComponent(a));
      }
    }
  }
  p.setComponent(fa,ballHeight(cellOf(p),fd));lastCellKey=cid(...cellOf(p));
  const sp=heroVel.length();if(sp>.3)tiltFwd.lerp(heroVel.clone().normalize(),Math.min(1,dt*8)).normalize();
  roll+=sp*dt/R;poseObj(hamster,tiltFwd,upE,roll,0);
}
function applyMap(t,time){
  const e=easeInOut(t);
  // Inne i kuben: frostat glas och dimma längre bort. Utifrån blir väggarna mer genomskinliga.
  scene.fog.near=7+e*200;scene.fog.far=26+e*260;
  wallMat.opacity=.5-.37*e;
  {const show=t===0;if(UNDERS.length&&UNDERS[0].visible!==show)for(const u of UNDERS)u.visible=show}   // undersidorna syns inte utifrån
  // Utifrån: golven blir täta och lite ljusare, väggar och tak nästan osynliga med tunna kanter,
  // så att man ser vilken sida i varje gång som är golvet
  const fo=floorOpacity()+(.92-floorOpacity())*e;
  if(floorMat.opacity!==fo){floorMat.opacity=fo;for(const m of crackMats)if(!m.userData.falling)m.opacity=Math.min(.95,fo+.15)}
  floorMat.emissiveIntensity=.35*e;edgeMat.opacity=.45+.2*e;
  $('hint').style.visibility=t>0?'hidden':'visible';
  // Bara gångarna nära hamstern syns utifrån (om man inte valt att visa allt)
  const hc=cellOf(p), ref=throat?[hc,throat.y]:[hc];
  for(const [k,g] of cellGroups){
    const c=cellOfId(k);
    g.visible=t===0||showAll||ref.some(r=>c.every((v,i)=>Math.abs(v-r[i])<=2));
  }
  marker.visible=t>0&&!exitState;   // (inte vid luckan)
  if(t<=0){if(cam.far!==100){cam.far=100;cam.updateProjectionMatrix()}return}
  const bw=toWorld(p);
  marker.position.copy(bw);
  marker.quaternion.copy(cam.quaternion);
  marker.scale.setScalar(1+.15*Math.sin(time*6));
  marker.material.opacity=e;
  // Så långt bort att hela kuben syns även medan den tippar
  const rad=Math.max(HALF*Math.sqrt(3),tubeReach)*1.05;   // (rören sticker ut utanför kuben)
  const D=rad/Math.sin(THREE.MathUtils.degToRad(cam.fov/2))/Math.min(1,cam.aspect);
  // och kameran ritar ända bort till kubens bortersta hörn (annars försvinner bortre delen av en stor kub)
  const far=Math.max(100,Math.ceil(D+rad+10));if(cam.far!==far){cam.far=far;cam.updateProjectionMatrix()}
  const from=cam.position.clone(), fromTarget=camLook.clone();
  cam.position.lerpVectors(from,new THREE.Vector3(0,D*Math.sin(MAP_TILT),D*Math.cos(MAP_TILT)),e);
  const target=fromTarget.lerp(new THREE.Vector3(0,0,0),e);
  cam.up.set(0,1,0);
  cam.lookAt(target);
  // något händer (en knapp trycks): kameran går närmare punkten och en gul ring blinkar runt den
  if(exitState&&e>.9){
    exitCamT=Math.min(1,exitCamT+1/60/1.2);const q=exitCamT*exitCamT*(3-2*exitCamT);
    const hp=toWorld(exitPos),hn=exitN.clone().applyQuaternion(cube.quaternion);
    const camP=hp.clone().addScaledVector(hn,CELL*3.4).add(new THREE.Vector3(0,CELL*.9,0)).addScaledVector(new THREE.Vector3(1,0,0),CELL*.6);
    cam.position.lerp(camP,q);cam.lookAt(target.clone().lerp(hp,q));
  }
  if(evt&&e>.9){
    const w=toWorld(evt.pts[evt.i]),q=Math.min(1,evt.t/.5),dir=cam.position.clone().sub(target).normalize();
    cam.position.lerp(w.clone().addScaledVector(dir,CELL*4.5),q*.8);cam.lookAt(target.clone().lerp(w,q));
    evtRing.visible=true;evtRing.position.copy(w);evtRing.quaternion.copy(cam.quaternion);evtRing.scale.setScalar(1+.15*Math.sin(time*8));
  }
}

// ---------- Svep för att tippa kuben ----------
// Kameran tittar från +z. Svep åt höger: kubens ovansida rullar åt höger (runt z-axeln).
// Svep uppåt: ovansidan rullar bort från en (runt x-axeln). Kuben följer fingret och
// fullbordar tippen om man släpper efter halva vägen, annars fjädrar den tillbaka.
const ROT_PX=140;       // så många pixlar motsvarar 90°
let rot=null;           // {axis, sign, ang, target, steps, allowed}
const SWIPES={right:[new THREE.Vector3(0,0,1),-1],left:[new THREE.Vector3(0,0,1),1],up:[new THREE.Vector3(1,0,0),-1],down:[new THREE.Vector3(1,0,0),1]};
const stepQ=(axis,ang)=>snapQuat(new THREE.Quaternion().setFromAxisAngle(axis,ang).multiply(baseQ));
function snapQuat(q){
  _m.makeRotationFromQuaternion(q);
  for(let i=0;i<16;i++)_m.elements[i]=Math.round(_m.elements[i]);
  return q.setFromRotationMatrix(_m);
}
// Lägen i utzoomat läge (spelet väljer själv):
// - Highlight: hamstern sitter i ett hål eller står under ett schakt. Man tippar fritt ett kvarts varv i taget
//   och kuben stannar där man släpper. Rätt läge: nästa gångs golv nedåt (hål), eller schaktet nedåt
//   (då släpper hamstern taget och faller ner i schaktet).
// - Locked: hamstern står fritt och håller sig fast ("I'm holding on!"). Kuben lutar högst 45° åt alla håll
//   och fjädrar alltid tillbaka. Medan den lutar rullar de onda hamstrarna.
// Schaktet räknas i hamsterns egen gång (taket över dess golv), så att det gäller även när kuben är tippad.
// Utzoomat i en gång utan väggar: hamstern har inget att hålla sig i ('Free'). Kuben vänds ett kvarts varv i taget
// och stannar där man släpper, och hamstern rullar med lutningen som de onda. Mer än 90° och den ramlar av.
const shaftDir=()=>{if(mode!=='roll'||inTube||inTrack)return -1;const k=cid(...cellOf(p)),sg=cellSeg[k];if(sg<0)return -1;const d=SEGS[sg].floor^1;return open[k][d]==='link'?d:-1};
const atShaft=()=>hold<=0&&shaftDir()>=0;
function mapMode(){
  if(!playing||won||inTube)return null;
  if(inTrack)return 'locked';   // i en kurva som i en rak gång
  if(mode==='throat'||atShaft())return 'highlight';
  if(mode==='roll'&&segOpenAt(cid(...cellOf(p))))return 'free';
  return mode==='roll'?'locked':null;
}
const rightDown=()=>mode==='throat'?targetFloor():shaftDir();
// Hjälppilen: åt vilket håll man ska svepa (ett eller två kvarts varv bort)
function rightSwipe(){
  if(mapMode()!=='highlight')return null;
  const want=rightDown();if(want<0||downDirOf(baseQ)===want)return null;
  for(const n of Object.keys(SWIPES)){const [axis,sign]=SWIPES[n];if(downDirOf(stepQ(axis,sign*Math.PI/2))===want)return n}
  for(const n of Object.keys(SWIPES)){const [axis,sign]=SWIPES[n];const r=new THREE.Quaternion().setFromAxisAngle(axis,sign*Math.PI/2);
    if(downDirOf(snapQuat(r.clone().multiply(r).multiply(baseQ)))===want)return n}
  return null;
}
let swipeStart=null;
ren.domElement.addEventListener('pointerdown',e=>{
  if(exitState==='wait'&&mapOn&&mapT>.9){
    // tryck på luckan (lite generöst: en större osynlig yta runt den)
    const r=ren.domElement.getBoundingClientRect(),m=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    const rc=new THREE.Raycaster();rc.setFromCamera(m,cam);
    const hp=exitHinge.localToWorld(exitUp.clone().multiplyScalar(-HATCH_S/2)), hn=exitN.clone().applyQuaternion(cube.quaternion);
    const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(hn,hp),hit=new THREE.Vector3();
    if(rc.ray.intersectPlane(pl,hit)&&hit.distanceTo(hp)<HATCH_S*1.1)openExit();
    return;
  }
  if(exitState)return;
  if(!mapOn||mapT<.9||rot||retAnim||!mapMode()||(mode==='throat'&&isRight(baseQ)))return;
  swipeStart={x:e.clientX,y:e.clientY,id:e.pointerId};
  ren.domElement.setPointerCapture(e.pointerId);
});
ren.domElement.addEventListener('pointermove',e=>{
  if(!swipeStart)return;
  const dx=e.clientX-swipeStart.x, dy=e.clientY-swipeStart.y;
  if(!rot){
    if(Math.hypot(dx,dy)<12)return;
    const name=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    rot={name,axis:SWIPES[name][0],sign:SWIPES[name][1],ang:0,target:null,locked:mapMode()==='locked'};SFX.tip();
  }
  const along=(rot.name==='right'?dx:rot.name==='left'?-dx:rot.name==='down'?dy:-dy)/ROT_PX;
  let k=Math.max(0,Math.min(1,along));
  if(rot.locked)k=Math.min(k,.5);    // Locked: högst 45°
  rot.ang=rot.sign*k*Math.PI/2;
});
const endSwipe=()=>{
  if(!swipeStart)return;
  swipeStart=null;
  if(!rot)return;
  // Highlight: fullbordar kvarts varvet om man släppt efter halva vägen. Locked: fjädrar alltid tillbaka.
  rot.target=!rot.locked&&Math.abs(rot.ang)>Math.PI/4?rot.sign*Math.PI/2:0;
};
ren.domElement.addEventListener('pointerup',endSwipe);ren.domElement.addEventListener('pointercancel',endSwipe);
// Hopp: bara med hoppknappen (svarar direkt när fingret nuddar den), eller mellanslag på datorn
// Håller man knappen i 3 sekunder går den att flytta: den vickar, texten blir MOVE, dra och släpp.
// Platsen sparas (som andel av skärmen) och kan återställas i inställningarna.
const jb=$('jumpBtn'), jbLabel=jb.querySelector('span');
let jbHold=null, jbMoving=false;
function placeJumpBtn(){
  if(!settings.jumpPos){jb.style.left=jb.style.top='';jb.style.right=jb.style.bottom='';return}
  const w=jb.offsetWidth||78, h=jb.offsetHeight||78;
  const x=Math.max(4,Math.min(innerWidth-w-4,settings.jumpPos.x*innerWidth-w/2));
  const y=Math.max(4,Math.min(innerHeight-h-4,settings.jumpPos.y*innerHeight-h/2));
  jb.style.left=x+'px';jb.style.top=y+'px';jb.style.right='auto';jb.style.bottom='auto';
}
jb.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();jb.setPointerCapture(e.pointerId);
  jbAction();
  clearTimeout(jbHold);
  jbHold=setTimeout(()=>{jbMoving=true;jb.classList.add('moving');jbLabel.textContent='MOVE'},3000);
});
jb.addEventListener('pointermove',e=>{
  if(!jbMoving)return;
  settings.jumpPos={x:e.clientX/innerWidth,y:e.clientY/innerHeight};placeJumpBtn();
});
const jbUp=()=>{
  clearTimeout(jbHold);
  if(jbMoving){jbMoving=false;jb.classList.remove('moving');saveSettings()}
};
jb.addEventListener('pointerup',jbUp);jb.addEventListener('pointercancel',jbUp);
addEventListener('resize',placeJumpBtn);
placeJumpBtn();
$('jumpResetBtn').onclick=()=>{delete settings.jumpPos;saveSettings();placeJumpBtn();hint('The jump button is back in its place.',3000)};
addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();jbAction()}});
// Panorering i first person
ren.domElement.addEventListener('pointerdown',e=>{if(!canPan())return;panStart={x:e.clientX,y:e.clientY};ren.domElement.setPointerCapture(e.pointerId)});
ren.domElement.addEventListener('pointermove',e=>{
  if(!panStart)return;
  if(!canPan()){panStart=null;return}
  const dx=e.clientX-panStart.x, dy=e.clientY-panStart.y;panStart.x=e.clientX;panStart.y=e.clientY;
  heading-=dx*PAN_RAD_PER_PX;camHeading=heading;   // drar man åt höger tittar man åt höger
  camPitch=Math.max(PITCH_MIN,Math.min(PITCH_MAX,camPitch-dy*PAN_RAD_PER_PX));   // uppåt: tittar uppåt
});
const endPan=()=>{panStart=null};
ren.domElement.addEventListener('pointerup',endPan);ren.domElement.addEventListener('pointercancel',endPan);
// Tangentbord i utzoomat läge: piltangenterna tippar kuben ett helt steg
addEventListener('keydown',e=>{
  if(!mapOn||mapT<.9||rot||retAnim)return;
  const name={ArrowRight:'right',ArrowLeft:'left',ArrowUp:'up',ArrowDown:'down'}[e.code];
  const mm=mapMode();
  if(!name||!mm||(mode==='throat'&&isRight(baseQ)))return;
  const sign=SWIPES[name][1], locked=mm==='locked';
  // Locked: lutar 45° och fjädrar tillbaka. Highlight: ett kvarts varv.
  rot={name,axis:SWIPES[name][0],sign,ang:0,target:sign*Math.PI/(locked?4:2),locked,back:locked};SFX.tip();
});
function updateRotation(dt){
  // Tillbaka till läget när man zoomade ut (man zoomade in innan kuben stod rätt)
  if(retAnim){
    retAnim.t=Math.min(1,retAnim.t+dt/.6);
    cube.quaternion.copy(retAnim.from).slerp(retAnim.to,easeInOut(retAnim.t));
    if(retAnim.t>=1){
      baseQ.copy(retAnim.to);cube.quaternion.copy(baseQ);updateGravity();retAnim=null;
      heading=mapStartHeading;camHeading=heading;faceSmooth=heading;vx=vz=0;turn=null;hold=0;
      for(const m of segFloors.flat())m.material=floorMat;hamsterMat.emissiveIntensity=0;rightSince=null;
      setMap(false);
    }
    return;
  }
  if(!rot)return;
  if(rot.target!==null){
    rot.ang+=(rot.target-rot.ang)*Math.min(1,dt*9);
    if(Math.abs(rot.target-rot.ang)<.01)rot.ang=rot.target;
  }
  cube.quaternion.setFromAxisAngle(rot.axis,rot.ang).multiply(baseQ);
  if(rot.back&&rot.ang===rot.target){rot.target=0;rot.back=false;return}   // tangentbord i Locked: tillbaka
  if(rot.target!==null&&rot.ang===rot.target){
    if(rot.target===0&&rot.locked)SFX.spring();
    if(rot.target!==0){
      SFX.tipDone();turns++;
      const oldFwd=fwd3(heading);
      baseQ.copy(snapQuat(cube.quaternion.clone()));
      updateGravity();
      vx=vz=0;turn=null;hold=0;idle=0;
      if(Math.abs(oldFwd.dot(up))<.5)heading=angleOf(oldFwd);
      camHeading=heading;
      // Rätt läge: golvet i nästa gång lyser och kameran zoomar snart in av sig själv
      // (tippar man bort från rätt läge slocknar det igen)
      for(const m of segFloors.flat())m.material=floorMat;hamsterMat.emissiveIntensity=0;rightSince=null;
      if(isRight(baseQ)){
        rightSince=performance.now();SFX.right();setTimeout(()=>SFX.say('thats_it',true),350);
        const si=cellSeg[cid(...throat.y)];
        for(const m of segFloors[si])m.material=floorGlowMat;
        hamsterMat.emissiveIntensity=.35;
      }
    }
    cube.quaternion.copy(baseQ);
    rot=null;
  }
}

// ---------- Inställningspanelen och vattenpasset ----------
let settingsOpen=false;
function showSettingValues(){
  $('levelToggle').checked=settings.level;$('helpToggle').checked=!!settings.help;
  $('soundToggle').checked=settings.sound!==false;$('volRange').value=settings.volume??7;$('volVal').textContent=settings.volume??7;
  $('level').classList.toggle('hide',!settings.level||!playing);
  // Vattenpasset: dödzonens cirkel och den streckade ringen för full fart (nära kanten), i grader
  $('levelDead').setAttribute('r',(settings.dead*LEVEL_SC).toFixed(1));
  $('levelFull').setAttribute('r',(fullTilt()*LEVEL_SC).toFixed(1));
}
$('setBtn').onclick=()=>{
  settingsOpen=!settingsOpen;
  $('settings').classList.toggle('hide',!settingsOpen);
  $('setBtn').classList.toggle('on',settingsOpen);$('setBtn').setAttribute('aria-expanded',settingsOpen);
  if(settingsOpen)showSettingValues();
};
$('levelToggle').onchange=e=>{settings.level=e.target.checked;saveSettings();showSettingValues()};
$('helpToggle').onchange=e=>{settings.help=e.target.checked;saveSettings();showSettingValues()};
$('soundToggle').onchange=e=>{settings.sound=e.target.checked;saveSettings();SFX.init();SFX.setVolume();showSettingValues()};
$('volRange').oninput=e=>{settings.volume=+e.target.value;saveSettings();SFX.setVolume();showSettingValues()};
// Börja om vid starten: bara hamstern flyttas tillbaka (och kuben vänds som från början); allt annat i banan är
// som det var. Kostar ett liv – med ett liv kvar blir det game over.
$('spawnBtn').onclick=()=>{
  settingsOpen=false;$('settings').classList.add('hide');$('setBtn').classList.remove('on');$('setBtn').setAttribute('aria-expanded',false);
  if(!playing||won)return;
  lives--;updateLives();SFX.lifeLost();
  if(lives<=0){gameOver();return}
  inTube=false;inTrack=null;turn=null;jump=null;hopY=0;wheelHop=null;redFall=null;dropInfo=null;throat=null;fallInfo=null;hold=0;rot=null;retAnim=null;evt=null;perch=null;perchHop=null;airEdge=null;
  mapOn=false;mapT=0;$('mapBtn').classList.remove('on');$('mapBtn').setAttribute('aria-pressed',false);
  baseQ.copy(START_Q);cube.quaternion.copy(baseQ);updateGravity();
  p.copy(center(START));p.setComponent(ga,floorCoord(START));vx=vz=0;mode='roll';
  heading=angleOf(dirVec(LV.start.d));camHeading=heading;faceSmooth=heading;camPitch=0;roll=0;
  lastCellKey=cid(...START);lastSafe.copy(p);heroSeg=cellSeg[cid(...START)];ball.visible=true;standing=true;wasMoving=false;heroSafe=1.5;heroVel.set(0,0,0);
  startCamBlend();
  hint(`Back at the start. ${lives} ${lives===1?'life':'lives'} left.`,3000);
};
$('recalBtn').onclick=()=>{
  if(lastBeta===null){hint('No tilt sensor is running, so there is nothing to reset.',4000);return}
  baseBeta=lastBeta;baseGamma=lastGamma;tiltX=0;tiltZ=0;
  hint('Level reset: the way you hold the phone now counts as level.',4000);
};
// Vattenpasset: pricken visar lutningen jämfört med rakt läge (framåt = uppåt i bilden).
// Grön inne i dödzonens cirkel (hamstern står still), gul utanför. Den streckade ringen är full fart.
function updateLevel(){
  if(!settings.level||!playing)return;
  let dx=0,dy=0;
  if(lastBeta!==null&&baseBeta!==null){dx=lastGamma-baseGamma;dy=lastBeta-baseBeta}
  const k=LEVEL_SC, lim=58;
  const x=Math.max(-lim,Math.min(lim,dx*k)), y=Math.max(-lim,Math.min(lim,dy*k));
  const dot=$('levelDot');dot.setAttribute('cx',x.toFixed(1));dot.setAttribute('cy',y.toFixed(1));
  const still=Math.hypot(dx,dy)<=settings.dead;
  dot.setAttribute('fill',still?'#4ade80':'#ffd166');
}

const clock=new THREE.Clock();
let idleSay=0;
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  // Hål i golvet där hamstern är: den faller ner halvvägs. Det går inte att ångra.
  // (Gäller även utzoomat, t.ex. direkt efter en vändning under ett schakt.)
  // (Mitt i ett hopp fångas hamstern inte. Den landar först.)
  if(playing&&!won&&mode==='roll'&&!inTube&&!inTrack&&!rot&&!jump){
    const c=cellOf(p),k=cid(...c),pit=pitAt.get(k),hz=HOLES.get(k);
    if(cellSeg[k]>=0&&SEGS[cellSeg[k]].floor!==downDir()){
      // Kuben är tippad (utzoomat): hamstern håller sig fast. Pekar ett schakt nedåt släpper den och faller i.
      if(open[k][downDir()]==='link')startFall(c,downDir());
    }else{
    // Hål i golvet (eller sprucket golv som gått sönder): faller igenom.
    // Nära ett hål, eller på sprucket golv, räknas inte som säker plats att börja om på.
    const nearHole=hz&&hz.floor===downDir()&&overHole(hz,R+.1);
    if(hz&&hz.broken&&hz.floor===downDir()&&overHole(hz,-.05))startHoleFall(hz);
    else if(pit&&pit.floor===downDir()){
      // Runt hål: hamstern faller bara i om den kommer nära mitten, annars kan den rulla runt
      const d2=planeAxes().reduce((sum,a)=>sum+(p.getComponent(a)-coordOf(c[a]))**2,0);
      if(d2<pit.catchR*pit.catchR){if(pit.kind==='red')startRedFall(c);else startFall(c,downDir())}
      else if(pit.kind!=='red'||d2>(pit.r+R+.2)**2)lastSafe.copy(p);
    }else{
      if(open[k][downDir()]==='link')startFall(c,downDir());
      else if(!nearHole&&!isLift(k)&&!perch&&!airEdge&&cellSeg[k]>=0)lastSafe.copy(p);
    }
    }
  }
  if(playing&&!won&&mode==='drop')dropStep(dt);
  if(playing&&!won&&!mapOn&&!settingsOpen)updateCracks(dt);
  if(playing&&!won&&mode==='fall')fallStep(dt);
  if(playing&&!won&&mode==='redfall')redFallStep(dt);
  if(playing&&!won&&mapOn&&!settingsOpen&&!retAnim&&mode==='roll'&&!inTube&&!inTrack&&!perch)heroTiltStep(dt);
  if(playing&&!won&&!mapOn&&!settingsOpen&&mode!=='fall'&&mode!=='redfall'&&mode!=='drop'){
    if(jump)jumpStep(dt);
    if(!jump&&airEdge&&mode==='roll'){const A=airEdge;airEdge=null;heroOffEdge(A.c,A.d)}   // landade i luften
    let ax=0,az=0;
    if(useOrientation){ax=tiltX;az=tiltZ}
    if(useKeyboard){
      ax+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
      az+=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    }
    if(dragActive){ax+=dragX;az+=dragZ}
    ax=Math.max(-1,Math.min(1,ax));az=Math.max(-1,Math.min(1,az));

    if(inTube){tubeStep(dt,-az)}
    else if(inTrack){trackStep(dt,-az,ax)}
    else if(mode==='wheel'){wheelStep(dt,-az)}
    else if(mode==='wheelhop'){wheelHopStep(dt)}
    else if(mode==='lift'){/* åker hiss: updateLift flyttar hamstern */}
    else if(mode==='perchhop'){perchHopStep(dt)}
    else if(mode==='throat'){/* sitter fast halvvägs i hålet tills kuben ligger rätt */}
    else{
    const c=cellOf(p),k=cid(...c);
    // Ny ruta med schakt i taket: stanna en kort stund mitt i rutan
    if(k!==lastCellKey){
      lastCellKey=k;idle=0;
      if(open[k][upDir()]==='link')hint('A shaft above! Roll on, or zoom out and flip the cube to drop into it.',5000);
    }
    const underShaft=open[k][upDir()]==='link';
    let inFwd=-az,inSide=ax;
    if(hold>0){
      hold-=dt;inFwd=0;inSide=0;
      for(const a of planeAxes())p.setComponent(a,p.getComponent(a)+(coordOf(c[a])-p.getComponent(a))*Math.min(1,dt*8));
    }

    // Styrningen är relativ till kulans riktning: framåt/bakåt längs riktningen, sidled vinkelrätt.
    // Under en sväng gäller den gamla riktningen tills svängen är klar.
    const [fx,fz]=fwdOf(heading),[rx,rz]=rightOf(heading);
    // Farten följer lutningen: kulan strävar mot MAX_SPEED gånger lutningen (0–1)
    const inLen=Math.max(1,Math.hypot(inFwd,inSide));
    const tvx=(fx*inFwd+rx*inSide)/inLen*MAX_SPEED, tvz=(fz*inFwd+rz*inSide)/inLen*MAX_SPEED;
    const grip=1-Math.exp(-GRIP*dt);
    if(!jump){vx+=(tvx-vx)*grip; vz+=(tvz-vz)*grip}
    if(hold>0){vx=vz=0}
    // Under ett schakt bromsar hamstern in kraftigt och dras mot mitten när man lutar lite,
    // så att det är lätt att stanna precis under.
    if(underShaft&&!jump){
      // settings.brake 1–10: högre = lägre fart under schaktet och starkare dragning mot mitten
      const b=settings.brake;
      if(Math.hypot(inFwd,inSide)>=.5){
        // man lutar: farten begränsas
        const cap=SHAFT_SPEED*Math.max(.08,1-.09*b), sp=Math.hypot(vx,vz);
        if(sp>cap){vx*=cap/sp;vz*=cap/sp}
      }else{
        // man lutar lite eller inte alls: hamstern dras mot mitten (kritiskt dämpad fjäder, snabbare ju högre inställning)
        const cpt=center(c), k=3+2.5*b, damp=2*Math.sqrt(k);
        vx+=((cpt.dot(ex)-p.dot(ex))*k-vx*damp)*dt;
        vz+=((cpt.dot(ez)-p.dot(ez))*k-vz*damp)*dt;
      }
    }
    idle=Math.hypot(vx,vz)<.3?idle+dt:0;

    // Rörelse i golvplanet, stoppad av rutans väggar. Hål och schakt går inte att rulla igenom i sidled.
    // (i delsteg om högst 0,15 enheter, så att hög fart aldrig tar kulan igenom en vägg)
    const nSub=Math.max(1,Math.ceil(Math.hypot(vx,vz)*dt/.15));
    for(let sub=0;sub<nSub&&!inTrack&&!inTube&&!won&&mode==='roll';sub++){
    const pc0=cellOf(p);
    p.addScaledVector(ex,vx*dt/nSub).addScaledVector(ez,vz*dt/nSub);
    const cc=cellOf(p),kk=cid(...cc);
    // över en kant (en gång utan väggar eller en sönderslagen vägg). Mitt i ett hopp flyger hjälten vidare
    // över den tomma rutan: når den en öppen sida (kant) i en gång med samma golv landar den där. En hel vägg
    // studsar den mot. Landar den i luften ramlar den (som när den rullar av kanten).
    {const pk=cid(...pc0);
      if(airEdge){
        if(kk!==pk&&cellSeg[kk]>=0){const d=dirBetween(pc0,cc);
          if(d>=0&&open[kk][d^1]==='edge'&&SEGS[cellSeg[kk]].floor===downDir())airEdge=null;
          else{p.addScaledVector(ex,-vx*dt/nSub).addScaledVector(ez,-vz*dt/nSub);vx=vz=0;SFX.bump(3)}}
        if(airEdge)continue;
      }else if(kk!==pk){const d=dirBetween(pc0,cc);if(d>=0&&open[pk][d]==='edge'){if(jump){airEdge={c:pc0,d};continue}heroOffEdge(pc0,d);break}}
    }
    for(const a of planeAxes()){
      const off=p.getComponent(a)-coordOf(cc[a]);
      for(const s of [1,-1]){
        const lim=machineAt(kk,dirIndex(a,s))?MACH_LIM:LIM;   // (en frömaskin sticker ut från väggen)
        if(s*off<=lim)continue;
        const kind=open[kk][dirIndex(a,s)], nb=neighbor(cc,dirIndex(a,s));
        // En svängd gång tar bara emot hamstern när den rullar mot mynningen (inom ungefär ±50°).
        // Rullar den bara förbi en mynning i sidoväggen är mynningen en vägg.
        const toward=(ex.getComponent(a)*vx+ez.getComponent(a)*vz)*s, spd=Math.hypot(vx,vz);
        const curveWall=kind==='curve'&&(inTrack||spd<.05||toward<.64*spd);
        const boxNext=inside(nb)&&passable(kk,dirIndex(a,s))?boxAt(cid(...nb)):null;
        if((perch&&!perch.free)||kind==='exit'||!kind||kind==='link'||kind==='gap'||kind==='lift'||kind==='gate'||kind==='bdoor'||boxNext||curveWall||(inside(nb)&&liftBlocks(cid(...nb)))||liftDoorShut(kk,dirIndex(a,s))||(kind==='door'&&!doorAt(kk,dirIndex(a,s)).isOpen)){
          // mot väggen: en knapp, en kuldörr eller en låda att knuffa?
          if(!jump&&!perch)heroTouchWall(kk,dirIndex(a,s),toward,boxNext);
          p.setComponent(a,coordOf(cc[a])+s*lim);
          {const vin=Math.abs(a===axisOf(ex)?vx:vz);if(vin>2.2&&!jump)SFX.bump(vin)}   // slår i väggen i fart
          if(a===axisOf(ex))vx=0; else vz=0;
        }else if(kind==='edge'&&s*off>CELL/2){if(jump)airEdge={c:cc,d:dirIndex(a,s)};else heroOffEdge(cc,dirIndex(a,s));break}
        else if(s*off>LIM+.15&&kind==='tube'){
          enterTube(kk,dirIndex(a,s));
        }
        else if(kind==='curve'&&!inTrack){
          // rullar ut mot den svängda gången: följ bågen därifrån
          const ce=curveAt(cc,dirIndex(a,s));enterTrack(ce.C,ce.end,Math.hypot(vx,vz));
        }
      }
    }
    }
    // In i hamsterhjulet: så fort hamstern rullar in i rutan med hjulet (genom hjulets öppna sida).
    // Har den just gått ur hjulet måste den först lämna rutan.
    if(WHEELS.length&&!inTube&&!inTrack&&mode==='roll'){
      const W=WHEELS.find(W=>W.cellKey===cid(...cellOf(p)));
      if(!W)wheelLock=false;
      else if(!wheelLock&&downDir()===W.floor){wheel=W;enterWheel()}
    }
    if(LIFTS.length&&!inTube&&!inTrack&&mode==='roll'&&!jump)liftCheck();
    if(!inTube&&!inTrack&&mode==='roll'){
    // Kulan sjunker mjukt ner till golvet (t.ex. när den precis lossnat ur ett hål)
    // (på en låda utan tak i vägen: rullar hjälten av lådan hoppar den ner på golvet bredvid)
    if(perch&&perch.free&&planeAxes().some(a=>Math.abs(p.getComponent(a)-coordOf(perch.c[a]))>BOX_S/2+.05))perch=null;
    const fc=perch?floorCoord(perch.c)-gs*BOX_S:floorCoord(cellOf(p));
    p.setComponent(ga,p.getComponent(ga)+(fc-p.getComponent(ga))*Math.min(1,dt*10));

    // Riktningsändringar:
    // - Fram och bak längs samma linje: ingen vändning, nosen pekar dit den pekade.
    // - Annars vänder sig hamstern mot rullriktningen (snabbt, settings.turn) och vickar.
    // - Stopp: står den still i 1 sekund hoppar den upp på fötterna. Därefter går det att panorera.
    const speed=Math.hypot(vx,vz), side=vx*rx+vz*rz, ahead=vx*fx+vz*fz;
    const dev=Math.atan2(Math.abs(side),Math.abs(ahead));   // 0 = rakt fram eller bak, 90° = rakt åt sidan
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    let steerRock=0;
    if(Math.abs(inSide)<.3)turnArmed=true;
    if(speed>.6){wasMoving=true;standing=false}
    if(!turn){
      if(speed>.4&&dev>.01){
        // Vänd mot rullriktningen. Rullar hamstern mest bakåt behåller den nosen framåt (vänder mot motsatt håll).
        const target=Math.atan2(vx,vz)+(ahead<0&&dev<THREE.MathUtils.degToRad(60)?Math.PI:0);
        const diff=wrap(target-heading);
        heading+=diff*Math.min(1,dt*settings.turn);
        steerRock=Math.max(-.25,Math.min(.25,-diff*1.2));
      }
      // Stopp: hamstern har rullat och står nu still utan att någon lutar. Efter 1 sekund hoppar den upp på fötterna.
      const still=wasMoving&&speed<.25&&Math.abs(inFwd)<.15&&Math.abs(inSide)<.15;
      stillTime=still?stillTime+dt:0;
      if(stillTime>=1){wasMoving=false;stillTime=0;startHop('stop',0)}
    }

    // Hoppet tar HOP_TIME sekunder: upp och ner i en båge, nosen vänds mot den nya riktningen
    // och kullerbyttan rätas upp så att hamstern landar på fötterna. Kameran följer med.
    let faceH=heading, rock=steerRock;
    if(turn){
      turn.t=Math.min(1,turn.t+dt/HOP_TIME);
      const q=turn.t, d=turn.to-turn.from, e=easeInOut(q);
      hopY=HOP_H*4*q*(1-q);
      camHeading=turn.from+d*e;
      faceH=turn.from+d*Math.min(1,e*1.15);
      roll=turn.roll0*(1-e);
      if(q>=1){
        heading=turn.to;camHeading=heading;faceH=heading;roll=0;hopY=0;
        if(turn.kind==='stop')standing=true;
        turn=null;landT=.3;
      }
      faceSmooth=faceH;
    }else{
      camHeading+=wrap(heading-camHeading)*Math.min(1,dt*8);   // kameran följer mjukt efter
      roll+=ahead*dt/R;
      // nosen följer riktningen med lite eftersläpning, så att hamstern vickar när den vrids
      faceSmooth+=wrap(heading-faceSmooth)*Math.min(1,dt*10);
      faceH=faceSmooth;
      rock-=Math.max(-.3,Math.min(.3,wrap(heading-faceSmooth)*2.5));   // lutar åt det håll den vrids
      // efter landningen: en liten vickning som klingar av
      if(landT>0){landT=Math.max(0,landT-dt);rock+=.16*Math.sin((.3-landT)*30)*(landT/.3)}
    }
    poseHamster(fwd3(faceH),up,roll,rock);
    }
    }
  }
  ball.position.copy(p).addScaledVector(up,hopY);
  updateExit(dt,time);
  updateDoors(dt);
  updateLift(dt);
  updateEnemies(dt);
  if(playing&&!won&&!settingsOpen)updateGates(dt);
  updateSeeds(dt,time);updateKeys(dt,time);updateMachines(dt,time);updateShards(dt);updateShields(dt);updateBounces(dt);
  if(!mapOn&&!settingsOpen)updateShots(dt);
  // pusslet: lådor, kuldörrar och kulor (kulorna rullar också när kuben är utzoomad och lutar), knappar, kameran
  if(!settingsOpen){updateBoxes(dt);updateBallDoors(dt);if(playing&&!won)updateBalls(dt);updateButtons(dt);updateEvent(dt)}
  updateRotation(dt);
  // Rätt läge: efter en kort stund zoomar kameran in och hamstern lossnar
  if(mode==='throat'&&rightSince&&mapOn&&performance.now()-rightSince>1300)setMap(false);
  if(mode==='throat'&&rightSince){hamsterMat.emissiveIntensity=.25+.2*Math.sin(time*8)}
  mapT=Math.max(0,Math.min(1,mapT+(mapOn?1:-1)*dt/MAP_TIME));
  camBlend=Math.max(0,camBlend-dt/.6);
  tipMsgT=Math.max(0,tipMsgT-dt);
  updateUI();
  for(const m of heroMats)m.emissiveIntensity=hamsterMat.emissiveIntensity;   // modellen lyser som kulan gjorde
  {
    // löpande ljud: rullning, rör, jakt i närheten, hissmotor och laddning i hjulet
    const rolling=playing&&!won&&!mapOn&&!settingsOpen&&!jump&&mode==='roll'&&!inTube;
    const rs=rolling?(inTrack?Math.abs(inTrack.v):Math.hypot(vx,vz)):0;
    // ett klick ungefär varje halvt varv (halva omkretsen = π·R)
    // står hamstern still länge: "Hello? Anyone there?" (sedan tidigast efter 40 s igen)
    idleSay=playing&&!won&&!mapOn&&!settingsOpen&&mode==='roll'&&standing?idleSay+dt:Math.min(idleSay,0);
    if(idleSay>15){idleSay=-25;SFX.say('anyone_there')}
    // onda hamstrar som rullar nära (inom några rutor): svagt mörkt sus
    let evilRoll=0;for(const e of ENEMIES)if(!e.gone&&!e.falling&&!mapOn){const v=e.vel.length()+e.rv.length();evilRoll=Math.max(evilRoll,Math.max(0,1-p.distanceTo(e.pos)/(3*CELL))*Math.min(1,v/2))}
    let chase=0;for(const e of ENEMIES)if(!e.gone&&!e.falling&&e.state==='chase'&&!mapOn)chase=Math.max(chase,nearK(e.pos));
    SFX.update({roll:rs,evilRoll,tube:inTube?Math.min(1,tubeV/5):0,chase,motor:(m=>m?(m.move.withHero?1:.5):0)(LIFTS.find(L=>L.move)),
      charging:mode==='wheel'&&charge<1&&wheelRun>.1&&!mapOn?1:0,chargeLevel:charge,playing:playing&&!won});
  }
  updateLevel();
  if(!standing||mode!=='roll'||(inTrack&&!inTrack.standing)||inTube)camPitch*=Math.exp(-4*dt);   // tillbaka till rak blick när den rullar
  if(playing||won){placeCamera();applyMap(mapT,time)}
  ren.render(scene,cam);
}
// Knappar, text och hjälppil i utzoomat läge
const ARROWS={up:['↑','Swipe up'],down:['↓','Swipe down'],left:['←','Swipe left'],right:['→','Swipe right']};
// Blixten ligger nere i mitten: strax till vänster om nyckelräknaren nere till höger (eller där den skulle sitta),
// räknat därifrån eftersom munbaren är olika bred på olika telefoner
function placeBattery(){
  const bt=$('battery'),kc=$('keys'),kr=kc.classList.contains('hide')?null:kc.getBoundingClientRect();
  const anchor=kr&&kr.width?kr.left:innerWidth-14-64;
  bt.style.left=Math.round(anchor-10-bt.offsetWidth)+'px';bt.style.bottom='';
}
addEventListener('resize',()=>{if(!$('battery').classList.contains('hide'))placeBattery()});
function updateUI(){
  const mm=mapMode(), out=mapOn&&mapT>.9, right=mode==='throat'&&isRight(baseQ);
  $('nearBtn').classList.toggle('hide',!out);
  $('lives').classList.toggle('hide',!playing&&!gameIsOver||mapOn);
  {const tn=$('turns');tn.classList.toggle('hide',!mapOn||!playing);const tt=`🔄 ${turns} ${turns===1?'turn':'turns'}`;if(tn.textContent!==tt)tn.textContent=tt}
  // Hoppknappen och kompassen syns inte när kuben är utzoomad.
  // Knappen: grå = inget hopp, gul = kort hopp, grön = långt nog för ett helt hål (ca 2,6).
  // Står hamstern still (på en bana med frön) blir den SPIT: orange med frön i munnen, annars grå.
  const jb=$('jumpBtn'), js=jumpSpeed(), sp=anySeeds()&&canSpit();
  jb.classList.toggle('hide',!playing||won||mapOn);
  jb.classList.toggle('yellow',!perch&&!sp&&js>0&&jumpLength(js)<2.6);jb.classList.toggle('green',!!perch||(!sp&&js>0&&jumpLength(js)>=2.6));
  jb.classList.toggle('spit',sp&&mouth>0);jb.classList.toggle('square',sp);   // SPIT är alltid fyrkantig
  if(!jbMoving){const lab=sp?'SPIT':'JUMP', ic=sp?'»':'↑';
    if(jbLabel.textContent!==lab){jbLabel.textContent=lab;jb.firstChild.textContent=ic;jb.setAttribute('aria-label',sp?'Spit a seed':'Jump')}}
  // Blixten mellan munbaren och liven: batteriet är fulladdat
  {const bt=$('battery'),on=WHEELS.length>0&&charge>=1&&playing&&!won&&!mapOn;if(bt.classList.contains('hide')===on){bt.classList.toggle('hide',!on);if(on)placeBattery()}}
  // Nycklarna nere till höger (bara på banor med nycklar)
  {const kc=$('keys'),on=KEYS.length>0&&playing&&!won&&!mapOn;
   if(kc.classList.contains('hide')===on){kc.classList.toggle('hide',!on);if(!$('battery').classList.contains('hide'))placeBattery()}
   if(kc.dataset.n!==String(keyCount)){kc.dataset.n=keyCount;kc.querySelector('b').textContent=keyCount}}
  // Munbaren: hur många frön hamstern har i munnen
  const mo=$('mouth');mo.classList.toggle('hide',!anySeeds()||!playing||won||mapOn);
  if(mo.dataset.n!==String(mouth)){mo.dataset.n=mouth;mo.querySelector('i').style.width=(mouth/MOUTH_MAX*100)+'%';mo.querySelector('b').textContent=mouth+'/'+MOUTH_MAX;mo.classList.toggle('full',mouth>=MOUTH_MAX)}
  $('level').classList.toggle('hide',!settings.level||!playing||mapOn);
  const tip=$('tip');
  const text=exitState==='wait'?'Tap the hatch to open it!':exitState?'':tipMsgT>0?tipMsg:retAnim?'Turning the cube back …':right?'Right! The hamster can roll on.':mm==='highlight'&&mode==='throat'?'Tip the cube so the floor of the next tunnel points down':
    mm==='highlight'?'Tip the cube so the shaft points down to drop into it':mm==='locked'?"I'm holding on! Swipe to tilt the cube and roll the grey hamsters.":mm==='free'?'Nothing to hold on to! Past 90° the hamster falls off.':'Zoom in and roll on';
  tip.classList.toggle('hide',!out||!text);tip.classList.toggle('go',mm==='highlight'||right||exitState==='wait');
  if(tip.textContent!==text)tip.textContent=text;
  const sw=out&&settings.help&&!right&&!rot&&!retAnim?rightSwipe():null, ha=$('helpArrow');
  ha.classList.toggle('hide',!sw);
  if(sw){const [ch,label]=ARROWS[sw];const t=ch+' '+label;if(ha.textContent!==t)ha.textContent=t}
  // Kubknappen pumpar när hamstern sitter i ett hål, eller har stått still en stund under ett schakt
  $('mapBtn').classList.toggle('pulse',!mapOn&&((mode==='throat'&&!right)||(atShaft()&&idle>1.2)));
}
// Framme vid luckan: tiden stannar, hamstern säger att den är redo och kameran zoomar ut till luckan
function reachExit(){
  if(exitState||won||!playing)return;
  exitState='wait';exitMs=Math.round(performance.now()-startTime);vx=vz=0;heroSafe=99;
  SFX.say('ready_to_leave',true);
  setTimeout(()=>{if(exitState==='wait'&&!mapOn)setMap(true)},1100);
}
function openExit(){
  if(exitState!=='wait')return;
  exitState='open';exitAnim={t:0};SFX.door();SFX.tone(520,.3,{type:'triangle',f2:780,v:.1});
}
function updateExit(dt,time){
  exitHatchMat.emissiveIntensity=exitState==='wait'&&mapOn?.35+.3*Math.sin(time*6):.15;
  if(exitState==='wait'&&!mapOn&&mode==='roll'&&!rot&&!retAnim)setMap(true);
  if(!exitAnim)return;
  exitAnim.t+=dt;
  // luckan svänger upp och utåt
  exitHinge.quaternion.setFromAxisAngle(exitSide,-Math.min(1,exitAnim.t/.8)*1.65);
  if(exitState==='open'&&exitAnim.t>=.8){
    exitState='out';mode='exiting';ball.visible=true;exitAnim.t0=exitAnim.t;exitAnim.from=p.clone();
    // dit den rullar: ut på tröskeln utanför luckan, i samma höjd
    exitAnim.to=exitPos.clone().addScaledVector(exitN,1.05);for(let a=0;a<3;a++)if(Math.abs(exitUp.getComponent(a))>.5)exitAnim.to.setComponent(a,p.getComponent(a));
  }
  if(exitState==='out'){
    // hamstern rullar ut genom luckan, bromsar in och stannar med huvudet framåt, hoppar upp på fötterna och säger "I'm free!"
    const t=exitAnim.t-exitAnim.t0, RT=1.5, q=Math.min(1,t/RT), e=1-(1-q)**3;
    if(q<1){p.lerpVectors(exitAnim.from,exitAnim.to,e);exitAnim.roll=e*exitAnim.from.distanceTo(exitAnim.to)/R;poseObj(hamster,exitN,exitUp,exitAnim.roll,0);hopY=0}
    else{
      p.copy(exitAnim.to);const h=Math.min(1,(t-RT)/.45),r0=exitAnim.roll,full=Math.round(r0/(2*Math.PI))*2*Math.PI,ee=h*h*(3-2*h);
      poseObj(hamster,exitN,exitUp,r0+(full-r0)*ee,0);hopY=.32*4*h*(1-h);
      if(h>=1&&!exitAnim.said){exitAnim.said=true;hopY=0;SFX.land(.6);SFX.say('free',true)}
      if(t>RT+1.8)win(true);
    }
  }
}
function win(saidFree){
  if(won)return;
  SFX.win();if(!saidFree)setTimeout(()=>SFX.say('free',true),700);
  won=true;
  const ms=exitMs||Math.round(performance.now()-startTime);
  $('timeText').textContent=`Time: ${fmtTime(ms)} · ${turns} ${turns===1?'turn':'turns'}`;
  $('win').classList.remove('hide');
  // klarad: låser upp nästa bana (sparas i telefonen). Finns det en bana till visas Next level.
  const H=window.HC_LEVELS;
  if(H&&LEVEL_ID!=='test'){
    try{const done=new Set(JSON.parse(localStorage.getItem('hc_done')||'[]'));done.add(+LEVEL_ID);localStorage.setItem('hc_done',JSON.stringify([...done]))}catch(err){}
    const next=H.list.find(n=>n>+LEVEL_ID);
    if(next){$('nextBtn').classList.remove('hide');$('nextBtn').onclick=()=>{location.search='?level='+next}}
  }
  showHighscore(ms);
}

// ---------- Topplista (Supabase) ----------
// De 5 snabbaste tiderna för banan. Hamnar man bland dem skriver man sitt namn.
// Nyckeln är Supabases publika nyckel: den får bara läsa listan och lägga till tider.
const SB_URL='https://johfhurvlasipxcydxue.supabase.co';
const SB_KEY='sb_publishable_HwSNRBIH6cgd2t3LJkOYTw_cPN91ZuK';
const HS_LEVEL=LV.hs, HS_SIZE=5;
const fmtTime=ms=>(ms/1000).toFixed(1)+' s';
async function fetchTop(){
  const r=await fetch(`${SB_URL}/rest/v1/fpa_highscores?select=name,time_ms,turns&level=eq.${HS_LEVEL}&order=time_ms.asc,created_at.asc&limit=${HS_SIZE}`,{headers:{apikey:SB_KEY}});
  if(!r.ok)throw new Error('Topplistan svarade '+r.status);
  return r.json();
}
async function saveScore(name,ms){
  const r=await fetch(`${SB_URL}/rest/v1/fpa_highscores`,{method:'POST',
    headers:{apikey:SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
    body:JSON.stringify({level:HS_LEVEL,name,time_ms:ms,turns})});
  if(!r.ok)throw new Error('Kunde inte spara '+r.status);
}
function renderTop(rows,mine){
  const list=$('hsList');list.textContent='';
  let marked=false;
  for(const row of rows){
    const li=document.createElement('li'),n=document.createElement('span'),t=document.createElement('span');
    n.textContent=row.name;t.textContent=fmtTime(row.time_ms)+(row.turns!=null?` · ${row.turns} ${row.turns===1?'turn':'turns'}`:'');li.append(n,t);
    if(mine&&!marked&&row.name===mine.name&&row.time_ms===mine.ms){li.className='me';marked=true}
    list.append(li);
  }
  if(!rows.length){const li=document.createElement('li');li.style.listStyle='none';li.textContent='No times yet. Be the first!';list.append(li)}
}
async function showHighscore(ms){
  $('hsTitle').textContent='High score – '+LV.name;
  const msg=$('hsMsg');
  // Provspel från editorn: ingen topplista
  if(!HS_LEVEL){$('hsTitle').textContent='Test run';$('hsList').textContent='';msg.textContent='Test runs are not saved in the high score.';return}msg.textContent='Loading high score …';
  let rows;
  try{rows=await fetchTop()}catch(err){msg.textContent='The high score could not be loaded right now.';return}
  renderTop(rows,null);
  const qualifies=ms>=5000&&ms<=3600000&&(rows.length<HS_SIZE||ms<rows[rows.length-1].time_ms);
  if(!qualifies){msg.textContent=`Your time ${fmtTime(ms)} did not make the list this time.`;return}
  msg.textContent='';
  const form=$('hsForm'),input=$('hsName');
  try{input.value=localStorage.getItem('hc_name')||''}catch(err){}
  form.classList.remove('hide');input.focus();
  form.onsubmit=async e=>{
    e.preventDefault();
    const name=input.value.trim().slice(0,16);
    if(!name){input.focus();return}
    try{localStorage.setItem('hc_name',name)}catch(err){}
    $('hsSave').disabled=true;msg.textContent='Saving …';
    try{
      await saveScore(name,ms);
      form.classList.add('hide');
      renderTop(await fetchTop(),{name,ms});
      msg.textContent='Saved!';
    }catch(err){
      $('hsSave').disabled=false;msg.textContent='Could not save. Please try again.';
    }
  };
}
showSettingValues();
placeCamera();
loop();
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
