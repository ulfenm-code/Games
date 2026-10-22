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
const tubeA=LV.tube?LV.tube.a:null, tubeB=LV.tube?LV.tube.b:null;
if(tubeA){open[cid(...tubeA.c)][tubeA.d]='tube';open[cid(...tubeB.c)][tubeB.d]='tube'}
// Eldörrar: stängda tills hamstern kommer fram med ett laddat batteri. Då öppnas dörren och förblir öppen.
const DOORS=(LV.doors||[]).map(D=>{
  const d=dirBetween(D.a,D.b);
  open[cid(...D.a)][d]='door';open[cid(...D.b)][d^1]='door';
  return {...D,d,isOpen:false,anim:0};
});
const doorAt=(k,d)=>DOORS.find(D=>(cid(...D.a)===k&&D.d===d)||(cid(...D.b)===k&&(D.d^1)===d));
// En öppning är fri att rulla igenom om den är en gång, eller en dörr som har öppnats
const passable=(k,d)=>{const o=open[k][d];return o==='door'?doorAt(k,d).isOpen:o==='gate'?false:!!o};
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
if(LV.lift){
  const fd=SEGS[cellSeg[cid(...LV.lift.a)]].floor;let c=LV.lift.a.slice();
  while(c+''!==LV.lift.b+''){const n=neighbor(c,fd);open[cid(...c)][fd]='lift';open[cid(...n)][fd^1]='lift';c=n}
}
// Hamsterportarnas öppningar i väggen (ritas som lucka, inte som glasvägg)
for(const G of LV.gates||[])open[cid(...G.c)][G.d]='gate';
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
const floorMat=new THREE.MeshPhysicalMaterial({map:stripeTex,roughness:.6,clearcoat:.3,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false});
const floorGlowMat=new THREE.MeshStandardMaterial({map:stripeTex,roughness:.7,emissive:0xffd166,emissiveIntensity:.6,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false});
const edgeMat=new THREE.LineBasicMaterial({color:0x8fe3ff,transparent:true,opacity:.45});
// Floor glass 1–10: hur genomskinligt golvet är (7 ≈ 65 % genomskinligt). Sprucket glas följer med, lite tätare.
const crackMats=[];
const floorOpacity=()=>Math.max(.08,Math.min(.95,1-(settings.glass??7)*.09));
function applyGlass(){floorMat.opacity=floorOpacity();for(const m of crackMats)if(!m.userData.falling)m.opacity=Math.min(.9,floorMat.opacity+.15)}   // (anropas när inställningarna är lästa)
const holeMat=new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1});
const redMat=new THREE.MeshStandardMaterial({color:0xff4d5e,emissive:0xff3344,emissiveIntensity:1.1});
const cellGroups=new Map();      // ruta → grupp (för att kunna visa bara rutor nära hamstern)
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
    if(isFloor)segFloors[si].push(m);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edgeMat);e.position.copy(m.position);g.add(e);
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
for(const D of DOORS){
  const n=dirVec(D.d), fd=SEGS[cellSeg[cid(...D.a)]].floor, upv=dirVec(fd^1);
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
let wheel=null;
if(LV.wheel){
  const W=LV.wheel, fd=SEGS[cellSeg[cid(...W.c)]].floor, upv=dirVec(fd^1), openV=dirVec(W.open), axisV=openV.clone();
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
  wheel={...W,group:g,spin,axisV,openV,runV,cellKey:cid(...W.c),floor:fd,fill,fillMat,BH};
}

// ---------- Hissen ----------
// En glasplatta i ett lodrätt schakt mellan rutan a (övre) och b (undre), med samma golv.
// Rullar hamstern upp på plattan med fullt batteri åker den till den andra våningen och batteriet töms.
// Utan fullt batteri händer ingenting. Står plattan på den andra våningen åker den tom till hamstern
// (gratis) när hamstern kommer nära. Så länge plattan inte står vid en våning är öppningen där stängd.
let LIFT=null;
if(LV.lift){
  const L=LV.lift, ka=cid(...L.a), kb=cid(...L.b), fd=SEGS[cellSeg[ka]].floor, fa=DIRS[fd][0], sg=DIRS[fd][1];
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
  LIFT={a:L.a,b:L.b,ka,kb,floor:fd,fa,sg,yA,yB,y:yA,at:'a',move:null,lock:false,told:false,group:g,lamp};
  // plattans läge längs golvaxeln (plattans mitt ligger en halv skivtjocklek under ovansidan)
  LIFT.place=()=>{g.position.set(0,0,0).setComponent(fa,LIFT.y+sg*PANEL_T/2);g.position.setComponent(cornerAxes[0],coordOf(L.a[cornerAxes[0]])).setComponent(cornerAxes[1],coordOf(L.a[cornerAxes[1]]))};
  LIFT.place();
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
  // hjulet med blixt
  g.strokeStyle='#ffd166';g.lineWidth=6;g.beginPath();g.arc(62,80,40,0,Math.PI*2);g.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(62+Math.cos(a)*14,80+Math.sin(a)*14);g.lineTo(62+Math.cos(a)*38,80+Math.sin(a)*38);g.stroke()}
  g.restore();
  g.fillStyle='#fff';g.font='bold 46px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,82);
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
const exitRing=new THREE.Mesh(new THREE.TorusGeometry(.85,.09,12,36),new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.9}));
exitRing.position.copy(exitPos);exitRing.lookAt(exitPos.clone().add(exitN));cube.add(exitRing);
const exitGlow=new THREE.PointLight(0xffd166,1.4,7);exitGlow.position.copy(exitPos).addScaledVector(exitN,.9);cube.add(exitGlow);

// Glasröret utanför kuben (bara på banor som har ett)
const TUBE_R=.56;
let tubeCurve=null,tubeLen=0;
if(tubeA){
  const tubeN=dirVec(tubeA.d);
  const tubePa=center(tubeA.c).addScaledVector(tubeN,CELL/2), tubePb=center(tubeB.c).addScaledVector(tubeN,CELL/2);
  const tubeMid=tubePa.clone().add(tubePb).multiplyScalar(.5).addScaledVector(tubeN,3.2);
  tubeCurve=new THREE.CatmullRomCurve3([tubePa,tubePa.clone().addScaledVector(tubeN,1.3),tubeMid,tubePb.clone().addScaledVector(tubeN,1.3),tubePb],false,'centripetal');
  tubeLen=tubeCurve.getLength();
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
const settings={dead:5,turn:6,brake:7,level:false,speed:6,sound:true,volume:7,glass:7,fullTilt:28};
try{Object.assign(settings,JSON.parse(localStorage.getItem('hc_settings')||'{}'))}catch(err){}
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
  const SAY_IDS=['holding_on','ready','thats_it','wheee','ouch','uh_oh','missed_me','let_me_go','charged','more_power','cracking','anyone_there','free','oh_no','yum','take_that'];
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
function tryJump(){
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
const canSpit=()=>standing&&playing&&!won&&!mapOn&&!settingsOpen&&!jump&&!turn&&mode==='roll'&&!inTube&&(!inTrack||(inTrack.standing&&!inTrack.hop))&&Math.hypot(vx,vz)<.3;
function spit(){
  if(mouth<=0){SFX.empty();if(!spitHint){spitHint=true;hint('The mouth is empty. Roll over sunflower seeds to collect them.',3500)}return}
  mouth--;SFX.spit();
  const dir=fwd3(heading).normalize();
  const m=seedMesh();m.scale.multiplyScalar(.8);cube.add(m);
  const pos=p.clone().addScaledVector(up,.12).addScaledVector(dir,R+.05);
  m.position.copy(pos);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  shots.push({pos,dir,dist:0,m,t:0});
}
// Kan fröet fortsätta från rutan k åt hållet d?
const shotPass=(k,d)=>{const o=open[k][d];return o===1||(o==='door'&&doorAt(k,d).isOpen)};
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
    const S=shots[i];let stop=false;
    const step=SPIT_SPEED*dt, n=Math.max(1,Math.ceil(step/.12));
    for(let j=0;j<n&&!stop;j++){
      S.pos.addScaledVector(S.dir,step/n);S.dist+=step/n;
      const cc=cellOf(S.pos), kk=cid(...cc);
      // i en svängd gång flyger fröet rakt fram tills det når bågens vägg
      if(!inCurveTube(S.pos)){
        if(cellSeg[kk]<0){stop=true;break}
        for(let a=0;a<3&&!stop;a++){
          const off=S.pos.getComponent(a)-coordOf(cc[a]);
          if(Math.abs(off)>CELL/2-FLOOR_GAP-.06&&!shotPass(kk,dirIndex(a,Math.sign(off))))stop=true;
        }
      }
      // träffar en ond hamster
      for(const e of ENEMIES){
        if(stop||!evilLive(e)||S.pos.distanceTo(e.pos)>R+.12)continue;
        stop=true;e.rock=.45;e.hits=(e.hits||0)+1;e.hitT=4;SFX.seedHit(nearK(e.pos));
        if(e.dazed>0){e.hits=0}
        else if(e.hits>=SPIT_HITS){
          e.hits=0;e.dazed=2;e.vel.set(0,0,0);SFX.dizzy(nearK(e.pos));setTimeout(()=>SFX.say('take_that',true),250);
          hint('Three hits! The grey hamster is dizzy.',3000);
        }else if(e.hits===1)hint('Hit! Two more and it gets dizzy.',2500);
      }
    }
    if(!stop&&S.dist>=SPIT_RANGE)stop=true;
    if(stop){if(S.dist<SPIT_RANGE)SFX.seedTick(nearK(S.pos));cube.remove(S.m);shots.splice(i,1);continue}
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
function jbAction(){if(SEEDS.length&&canSpit())spit();else tryJump()}

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
function enterTube(fromA){
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
const liftDockedAt=k=>LIFT&&!LIFT.move&&(LIFT.at==='a'?LIFT.ka:LIFT.kb)===k;
// Öppningen till en hissruta är stängd när plattan inte står där
const liftBlocks=k=>LIFT&&(k===LIFT.ka||k===LIFT.kb)&&!liftDockedAt(k);
function liftStart(to,withHero){
  LIFT.move={from:LIFT.y,to:to==='a'?LIFT.yA:LIFT.yB,dest:to,t:0,withHero};
  if(withHero){mode='lift';vx=vz=0;jump=null;hopY=0;turn=null;charge=0}
}
// Varje bild: plattan rör sig, lampan visar batteriet, och plattan kommer till hamstern när den är nära
function updateLift(dt){
  if(!LIFT)return;
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
      LIFT.at=M.dest;LIFT.move=null;SFX.ding();
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
    if(cellSeg[cid(...cellOf(p))]===cellSeg[ok]&&p.distanceTo(ballAt(oc,LIFT.floor))<2*CELL)liftStart(other,false);
  }
  LIFT.place();
}
// Hamstern står på plattan: åk om batteriet är fullt, annars en påminnelse
function liftCheck(){
  const k=cid(...cellOf(p));
  if(k!==LIFT.ka&&k!==LIFT.kb){LIFT.lock=false;LIFT.told=false;return}
  if(LIFT.lock||!liftDockedAt(k)||downDir()!==LIFT.floor)return;
  if(charge>=1)liftStart(k===LIFT.ka?'b':'a',true);
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
      for(const l of D.lamps)l.material=lampOff;D.light.intensity=0;
    }else{
      const ready=charge>=1;
      for(const l of D.lamps)l.material=ready?lampGreen:lampRed;D.light.color.setHex(ready?0x22ff66:0xff3344);D.light.intensity=.9;
      if(ready&&mode==='roll'&&!inTrack&&!inTube&&D.panelHome.distanceTo(p)<DOOR_REACH)openDoor(D);
    }
  }
  if(wheel){
    wheel.spin.quaternion.setFromAxisAngle(wheel.axisV,-wheelSpin);
    // batteriet på väggen: stapeln fylls nerifrån, röd under laddning och grön när den är full
    const h=Math.max(.001,charge);wheel.fill.scale.y=h;wheel.fill.position.y=wheel.BH*h/2;
    const full=charge>=1;wheel.fillMat.color.setHex(full?0x4ade80:0xff4d5e);wheel.fillMat.emissive.setHex(full?0x22cc55:0xff2233);
  }
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
  SFX.fallDeath();
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  mode='redfall';redFall={t:0,c,from:planeAxes().map(a=>p.getComponent(a))};vx=vz=0;jump=null;hopY=0;
}
function redFallStep(dt){
  const R2=redFall;R2.t+=dt;
  if(R2.voidFall){
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
  p.copy(lastSafe);mode='roll';vx=vz=0;wasMoving=false;lastCellKey=cid(...cellOf(p));
  startHop('stop',0);   // studsar upp och landar på fötterna
  hint(`Ouch! ${lives} ${lives===1?'life':'lives'} left.`,3000);
}
// Hål i golvet: finns en gång under faller hamstern ner dit, annars försvinner den ner i mörkret (ett liv)
let dropInfo=null;
function startHoleFall(hz){
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
  const D=dropInfo, hz=D.hz, target=floorCoord(hz.below);
  slideIntoHole(hz,dt);
  D.v+=9.8*dt;
  let y=p.getComponent(ga)+gs*D.v*dt;
  const done=gs*(y-target)>=0;if(done)y=target;
  p.setComponent(ga,y);
  roll+=dt*2;poseHamster(fwd3(heading),up,roll,0);
  if(!done)return;
  mode='roll';dropInfo=null;SFX.land(1);lastCellKey=cid(...hz.below);landT=.3;wasMoving=true;stillTime=0;lastSafe.copy(p);
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
    if(on){if(!hz.touched&&!evilOn)SFX.say('cracking');hz.touched=true;hz.on+=dt;hz.after=0;if(Math.random()<dt*7)SFX.crackle();if(hz.on>=.8)breakCrack(hz)}
    else if(hz.touched){hz.after+=dt;if(hz.after>=.5)breakCrack(hz)}
    hz.panel.material.emissiveIntensity=hz.touched&&!hz.broken?.06+.06*Math.sin(hz.on*40+hz.after*40):0;   // glaset knastrar svagt när det börjar ge vika
  }
}
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
const isLift=k=>LIFT&&(k===LIFT.ka||k===LIFT.kb);
function evilHazard(k){
  const pt=pitAt.get(k);
  if(pt&&pt.kind==='red'&&pt.wide)return true;
  if(HOLES.has(k)||isLift(k)||(wheel&&k===wheel.cellKey))return true;
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
const evilEdge=(k,d)=>{const o=open[k][d];if(o==='door')return doorAt(k,d).isOpen;if(o!==1)return false;
  return !evilHazard(cid(...neighbor(cellOfId(k),d)))};
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
const evilRollEdge=(k,d)=>{const o=open[k][d];if(o==='door')return doorAt(k,d).isOpen;if(o!==1)return false;
  const n=cid(...neighbor(cellOfId(k),d));return !(isLift(n)||(wheel&&n===wheel.cellKey))};
function evilRoll(e,dt){
  const n=Math.max(1,Math.ceil(e.rv.length()*dt/.15));
  for(let i=0;i<n;i++){
    e.pos.addScaledVector(e.rv,dt/n);
    const c=cellOf(e.pos),k=cid(...c);
    for(let a=0;a<3;a++){if(a===e.fa)continue;
      const off=e.pos.getComponent(a)-coordOf(c[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM||evilRollEdge(k,dirIndex(a,s)))continue;
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
    if(hz.drop){e.pos.setComponent(e.fa,ballHeight(hz.below,e.floor));e.seg=cellSeg[cid(...hz.below)];e.pts=[e.pos.clone(),e.pos.clone()];e.entry.copy(e.pos)}
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
  const restOn=(c)=>{const k=cid(...c);const o=open[k][dd];if(o==='door')return !doorAt(k,dd).isOpen;if(o!==1)return true;
    const n=cid(...neighbor(c,dd));return isLift(n)||(wheel&&n===wheel.cellKey)};   // aldrig in i hissen eller hjulet
  let c=cellOf(e.pos);
  if(s*(e.pos.getComponent(a)-coordOf(c[a]))>=LIM-1e-4&&restOn(c)){e.vg=0;e.grounded=dd===e.floor;return}
  e.grounded=false;e.vel.set(0,0,0);e.vg+=9.8*dt;
  const n=Math.max(1,Math.ceil(e.vg*dt/.15));
  for(let i=0;i<n;i++){
    e.pos.setComponent(a,e.pos.getComponent(a)+s*e.vg*dt/n);
    c=cellOf(e.pos);
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
      e.pos.addScaledVector(dirVec(e.floor),dt*(1+F.t*6));e.roll+=dt*4;
      e.g.position.copy(e.pos);poseObj(e.body,e.fwd,dirVec(e.floor^1),e.roll,0);
      if(F.t>1.2){e.gone=true;e.g.visible=false}
      continue;
    }
    if(!rot&&!retAnim)evilGravity(e,dt);
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
      if(!passable(cid(...prev),d))return Math.max(0,(i-1)/STEPS-.04);
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
const LEVEL_SC=60/45;   // vattenpasset: bildenheter per grad (45° når kanten)
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
let showAll=false;        // false: visa bara gångarna nära hamstern
let helpOn=true;          // pil som visar rätt håll
const marker=new THREE.Mesh(new THREE.TorusGeometry(.8,.12,10,40),new THREE.MeshBasicMaterial({color:0xff5fa2,transparent:true,depthTest:false}));
marker.renderOrder=10;marker.visible=false;scene.add(marker);
// Kubens läge och hamsterns riktning när man zoomade ut: dit tippar kuben tillbaka om man zoomar in
// innan den står rätt
const mapStartQ=new THREE.Quaternion();let mapStartHeading=0, retAnim=null;
const heroFloorDown=()=>{const s=cellSeg[cid(...cellOf(p))];return s<0||SEGS[s].floor===downDir()};
function setMap(on){
  if(on&&(!playing||won||inTube||jump||mode==='drop'||mode==='fall'||mode==='redfall'||mode==='wheel'||mode==='wheelhop'||mode==='lift'))return;
  if(rot||retAnim)return;
  if(on&&!mapOn){mapStartQ.copy(baseQ);mapStartHeading=heading;if(mode==='roll'&&(inTrack||!atShaft())){SFX.holdOn();SFX.say('holding_on',true)}}
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
$('helpBtn').onclick=()=>{helpOn=!helpOn;$('helpBtn').textContent=helpOn?'Help: on':'Help: off'};
function applyMap(t,time){
  const e=easeInOut(t);
  // Inne i kuben: frostat glas och dimma längre bort. Utifrån blir väggarna mer genomskinliga.
  scene.fog.near=7+e*200;scene.fog.far=26+e*260;
  wallMat.opacity=.5-.3*e;
  $('hint').style.visibility=t>0?'hidden':'visible';
  // Bara gångarna nära hamstern syns utifrån (om man inte valt att visa allt)
  const hc=cellOf(p), ref=throat?[hc,throat.y]:[hc];
  for(const [k,g] of cellGroups){
    const c=cellOfId(k);
    g.visible=t===0||showAll||ref.some(r=>c.every((v,i)=>Math.abs(v-r[i])<=2));
  }
  marker.visible=t>0;
  if(t<=0){if(cam.far!==100){cam.far=100;cam.updateProjectionMatrix()}return}
  const bw=toWorld(p);
  marker.position.copy(bw);
  marker.quaternion.copy(cam.quaternion);
  marker.scale.setScalar(1+.15*Math.sin(time*6));
  marker.material.opacity=e;
  // Så långt bort att hela kuben syns även medan den tippar
  const rad=HALF*Math.sqrt(3)*1.05;
  const D=rad/Math.sin(THREE.MathUtils.degToRad(cam.fov/2))/Math.min(1,cam.aspect);
  // och kameran ritar ända bort till kubens bortersta hörn (annars försvinner bortre delen av en stor kub)
  const far=Math.max(100,Math.ceil(D+rad+10));if(cam.far!==far){cam.far=far;cam.updateProjectionMatrix()}
  const from=cam.position.clone(), fromTarget=camLook.clone();
  cam.position.lerpVectors(from,new THREE.Vector3(0,D*Math.sin(MAP_TILT),D*Math.cos(MAP_TILT)),e);
  const target=fromTarget.lerp(new THREE.Vector3(0,0,0),e);
  cam.up.set(0,1,0);
  cam.lookAt(target);
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
const shaftDir=()=>{if(mode!=='roll'||inTube||inTrack)return -1;const k=cid(...cellOf(p)),sg=cellSeg[k];if(sg<0)return -1;const d=SEGS[sg].floor^1;return open[k][d]==='link'?d:-1};
const atShaft=()=>hold<=0&&shaftDir()>=0;
function mapMode(){
  if(!playing||won||inTube)return null;
  if(inTrack)return 'locked';   // i en kurva som i en rak gång
  if(mode==='throat'||atShaft())return 'highlight';
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
      SFX.tipDone();
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
  $('speedVal').textContent=settings.speed;$('speedRange').value=settings.speed;$('deadVal').textContent=settings.dead+'°';$('turnVal').textContent=settings.turn;$('brakeVal').textContent=settings.brake;
  $('deadRange').value=settings.dead;$('turnRange').value=settings.turn;$('brakeRange').value=settings.brake;$('levelToggle').checked=settings.level;
  $('glassRange').value=settings.glass??7;$('glassVal').textContent=settings.glass??7;
  $('soundToggle').checked=settings.sound!==false;$('volRange').value=settings.volume??7;$('volVal').textContent=settings.volume??7;
  $('level').classList.toggle('hide',!settings.level||!playing);
  // Vattenpasset har fast skala: dödzonens cirkel och den streckade ringen för full fart ritas i grader
  $('levelDead').setAttribute('r',(settings.dead*LEVEL_SC).toFixed(1));
  $('levelFull').setAttribute('r',(fullTilt()*LEVEL_SC).toFixed(1));
  $('fullRange').value=settings.fullTilt??28;$('fullVal').textContent=fullTilt()+'°';
}
$('setBtn').onclick=()=>{
  settingsOpen=!settingsOpen;
  $('settings').classList.toggle('hide',!settingsOpen);
  $('setBtn').classList.toggle('on',settingsOpen);$('setBtn').setAttribute('aria-expanded',settingsOpen);
  if(settingsOpen)showSettingValues();
};
$('speedRange').oninput=e=>{settings.speed=+e.target.value;applySpeed();saveSettings();showSettingValues()};
$('deadRange').oninput=e=>{settings.dead=+e.target.value;saveSettings();showSettingValues()};
$('turnRange').oninput=e=>{settings.turn=+e.target.value;saveSettings();showSettingValues()};
$('brakeRange').oninput=e=>{settings.brake=+e.target.value;saveSettings();showSettingValues()};
$('levelToggle').onchange=e=>{settings.level=e.target.checked;saveSettings();showSettingValues()};
$('soundToggle').onchange=e=>{settings.sound=e.target.checked;saveSettings();SFX.init();SFX.setVolume();showSettingValues()};
$('fullRange').oninput=e=>{settings.fullTilt=+e.target.value;saveSettings();showSettingValues()};
$('glassRange').oninput=e=>{settings.glass=+e.target.value;saveSettings();applyGlass();showSettingValues()};
$('volRange').oninput=e=>{settings.volume=+e.target.value;saveSettings();SFX.setVolume();showSettingValues()};
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
      else if(!nearHole&&!(LIFT&&(k===LIFT.ka||k===LIFT.kb)))lastSafe.copy(p);
    }
    }
  }
  if(playing&&!won&&mode==='drop')dropStep(dt);
  if(playing&&!won&&!mapOn&&!settingsOpen)updateCracks(dt);
  if(playing&&!won&&mode==='fall')fallStep(dt);
  if(playing&&!won&&mode==='redfall')redFallStep(dt);
  if(playing&&!won&&!mapOn&&!settingsOpen&&mode!=='fall'&&mode!=='redfall'&&mode!=='drop'){
    if(jump)jumpStep(dt);
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
    for(let sub=0;sub<nSub&&!inTrack&&!inTube&&!won;sub++){
    p.addScaledVector(ex,vx*dt/nSub).addScaledVector(ez,vz*dt/nSub);
    const cc=cellOf(p),kk=cid(...cc);
    for(const a of planeAxes()){
      const off=p.getComponent(a)-coordOf(cc[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM)continue;
        const kind=open[kk][dirIndex(a,s)], nb=neighbor(cc,dirIndex(a,s));
        // En svängd gång tar bara emot hamstern när den rullar mot mynningen (inom ungefär ±50°).
        // Rullar den bara förbi en mynning i sidoväggen är mynningen en vägg.
        const toward=(ex.getComponent(a)*vx+ez.getComponent(a)*vz)*s, spd=Math.hypot(vx,vz);
        const curveWall=kind==='curve'&&(inTrack||spd<.05||toward<.64*spd);
        if(!kind||kind==='link'||kind==='gap'||kind==='lift'||kind==='gate'||curveWall||(inside(nb)&&liftBlocks(cid(...nb)))||(kind==='door'&&!doorAt(kk,dirIndex(a,s)).isOpen)){
          p.setComponent(a,coordOf(cc[a])+s*LIM);
          {const vin=Math.abs(a===axisOf(ex)?vx:vz);if(vin>2.2&&!jump)SFX.bump(vin)}   // slår i väggen i fart
          if(a===axisOf(ex))vx=0; else vz=0;
        }else if(s*off>LIM+.15&&kind==='exit'){win()}
        else if(s*off>LIM+.15&&kind==='tube'){
          enterTube(cid(...tubeA.c)===kk&&tubeA.d===dirIndex(a,s));
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
    if(wheel&&!inTube&&!inTrack&&mode==='roll'){
      const inCell=cid(...cellOf(p))===wheel.cellKey;
      if(!inCell)wheelLock=false;
      else if(!wheelLock&&downDir()===wheel.floor)enterWheel();
    }
    if(LIFT&&!inTube&&!inTrack&&mode==='roll'&&!jump)liftCheck();
    if(!inTube&&!inTrack&&mode==='roll'){
    // Kulan sjunker mjukt ner till golvet (t.ex. när den precis lossnat ur ett hål)
    const fc=floorCoord(cellOf(p));
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
  exitRing.rotation.z=time*1.2;
  updateDoors(dt);
  updateLift(dt);
  updateEnemies(dt);
  if(playing&&!won&&!settingsOpen)updateGates(dt);
  updateSeeds(dt,time);
  if(!mapOn&&!settingsOpen)updateShots(dt);
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
    SFX.update({roll:rs,evilRoll,tube:inTube?Math.min(1,tubeV/5):0,chase,motor:LIFT&&LIFT.move?(LIFT.move.withHero?1:.5):0,
      charging:mode==='wheel'&&charge<1&&wheelRun>.1&&!mapOn?1:0,chargeLevel:charge,playing:playing&&!won});
  }
  updateLevel();
  if(!standing||mode!=='roll'||(inTrack&&!inTrack.standing)||inTube)camPitch*=Math.exp(-4*dt);   // tillbaka till rak blick när den rullar
  if(playing||won){placeCamera();applyMap(mapT,time)}
  ren.render(scene,cam);
}
// Knappar, text och hjälppil i utzoomat läge
const ARROWS={up:['↑','Swipe up'],down:['↓','Swipe down'],left:['←','Swipe left'],right:['→','Swipe right']};
function updateUI(){
  const mm=mapMode(), out=mapOn&&mapT>.9, right=mode==='throat'&&isRight(baseQ);
  for(const id of ['nearBtn','helpBtn'])$(id).classList.toggle('hide',!out);
  $('lives').classList.toggle('hide',!playing&&!gameIsOver||mapOn);
  // Hoppknappen och kompassen syns inte när kuben är utzoomad.
  // Knappen: grå = inget hopp, gul = kort hopp, grön = långt nog för ett helt hål (ca 2,6).
  // Står hamstern still (på en bana med frön) blir den SPIT: orange med frön i munnen, annars grå.
  const jb=$('jumpBtn'), js=jumpSpeed(), sp=SEEDS.length>0&&canSpit();
  jb.classList.toggle('hide',!playing||won||mapOn);
  jb.classList.toggle('yellow',!sp&&js>0&&jumpLength(js)<2.6);jb.classList.toggle('green',!sp&&js>0&&jumpLength(js)>=2.6);
  jb.classList.toggle('spit',sp&&mouth>0);jb.classList.toggle('square',sp);   // SPIT är alltid fyrkantig
  if(!jbMoving){const lab=sp?'SPIT':'JUMP', ic=sp?'»':'↑';
    if(jbLabel.textContent!==lab){jbLabel.textContent=lab;jb.firstChild.textContent=ic;jb.setAttribute('aria-label',sp?'Spit a seed':'Jump')}}
  // Munbaren: hur många frön hamstern har i munnen
  const mo=$('mouth');mo.classList.toggle('hide',!SEEDS.length||!playing||won||mapOn);
  if(mo.dataset.n!==String(mouth)){mo.dataset.n=mouth;mo.querySelector('i').style.width=(mouth/MOUTH_MAX*100)+'%';mo.querySelector('b').textContent=mouth+'/'+MOUTH_MAX;mo.classList.toggle('full',mouth>=MOUTH_MAX)}
  $('level').classList.toggle('hide',!settings.level||!playing||mapOn);
  const tip=$('tip');
  const text=tipMsgT>0?tipMsg:retAnim?'Turning the cube back …':right?'Right! The hamster can roll on.':mm==='highlight'&&mode==='throat'?'Tip the cube so the floor of the next tunnel points down':
    mm==='highlight'?'Tip the cube so the shaft points down to drop into it':mm==='locked'?"I'm holding on! Swipe to tilt the cube and roll the grey hamsters.":'Zoom in and roll on';
  tip.classList.toggle('hide',!out);tip.classList.toggle('go',mm==='highlight'||right);
  if(tip.textContent!==text)tip.textContent=text;
  const sw=out&&helpOn&&!right&&!rot&&!retAnim?rightSwipe():null, ha=$('helpArrow');
  ha.classList.toggle('hide',!sw);
  if(sw){const [ch,label]=ARROWS[sw];const t=ch+' '+label;if(ha.textContent!==t)ha.textContent=t}
  // Kubknappen pumpar när hamstern sitter i ett hål, eller har stått still en stund under ett schakt
  $('mapBtn').classList.toggle('pulse',!mapOn&&((mode==='throat'&&!right)||(atShaft()&&idle>1.2)));
}
function win(){
  if(won)return;
  SFX.win();setTimeout(()=>SFX.say('free',true),700);
  won=true;
  const ms=Math.round(performance.now()-startTime);
  $('timeText').textContent=`Time: ${fmtTime(ms)}`;
  $('win').classList.remove('hide');
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
  const r=await fetch(`${SB_URL}/rest/v1/fpa_highscores?select=name,time_ms&level=eq.${HS_LEVEL}&order=time_ms.asc,created_at.asc&limit=${HS_SIZE}`,{headers:{apikey:SB_KEY}});
  if(!r.ok)throw new Error('Topplistan svarade '+r.status);
  return r.json();
}
async function saveScore(name,ms){
  const r=await fetch(`${SB_URL}/rest/v1/fpa_highscores`,{method:'POST',
    headers:{apikey:SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
    body:JSON.stringify({level:HS_LEVEL,name,time_ms:ms})});
  if(!r.ok)throw new Error('Kunde inte spara '+r.status);
}
function renderTop(rows,mine){
  const list=$('hsList');list.textContent='';
  let marked=false;
  for(const row of rows){
    const li=document.createElement('li'),n=document.createElement('span'),t=document.createElement('span');
    n.textContent=row.name;t.textContent=fmtTime(row.time_ms);li.append(n,t);
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
