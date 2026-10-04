(function diagnose(){
  const lines=[];
  lines.push('Säker kontext (https): ' + (window.isSecureContext ? 'ja' : 'NEJ – krävs för sensorn'));
  lines.push('DeviceOrientationEvent finns: ' + (('DeviceOrientationEvent' in window) ? 'ja' : 'NEJ'));
  const needsPerm = typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function';
  lines.push('Kräver explicit tillåtelse (iOS-typ): ' + (needsPerm?'ja':'nej'));
  lines.push('Körs i en inramad vy (iframe): ' + (window.self!==window.top ? 'JA – kan blockera sensorn' : 'nej'));
  let policyLine='Sensor tillåten enligt sidans policy: okänt';
  try{
    if(document.featurePolicy && document.featurePolicy.allowsFeature){
      const ok = document.featurePolicy.allowsFeature('accelerometer') && document.featurePolicy.allowsFeature('gyroscope');
      policyLine='Sensor tillåten enligt sidans policy: ' + (ok?'ja':'NEJ – blockerad av sidans Permissions-Policy');
    }
  }catch(err){}
  lines.push(policyLine);
  const el = document.getElementById('diag');
  if(el) el.textContent = lines.join('\n');
  console.log(lines.join('\n'));
})();
const hamsterTexUrl="fpa_hamster.jpg";
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
const N=5, CELL=2.4, R=0.42;
const HALF=N*CELL/2;
const PANEL_IN=.03, PANEL_T=.05;               // glasskivorna sitter en aning innanför rutans kant
const FLOOR_GAP=PANEL_IN+PANEL_T;              // från rutans kant till golvets ovansida
const LIM=CELL/2-FLOOR_GAP-R;                  // hur långt från rutans mitt kulan når innan den slår i en vägg

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

// ---------- Banan (handbyggd) ----------
// Varje gång har ett golv (en riktning i kubens egna koordinater) och en rad rutor i ordning.
// Gångarna hänger ihop med hål (i golvet), ett schakt (i taket), ett glasrör och utgången.
const FLOOR_NEG_Y=3, FLOOR_NEG_X=1, FLOOR_POS_Z=4, FLOOR_POS_X=0;
const SEGS=[
  {floor:FLOOR_NEG_Y, cells:[[0,4,0],[1,4,0],[2,4,0],[3,4,0],[4,4,0],[4,4,1],[4,4,2]]},   // 0: start, hål i slutet
  {floor:FLOOR_NEG_X, cells:[[4,3,2],[4,2,2],[4,1,2],[4,0,2],[4,0,3],[4,0,4]]},           // 1: hål i slutet
  {floor:FLOOR_POS_Z, cells:[[3,0,4],[2,0,4],[1,0,4],[0,0,4],[0,1,4],[0,2,4]]},           // 2: schakt i slutet
  {floor:FLOOR_NEG_Y, cells:[[0,2,3],[0,2,2],[0,2,1],[0,2,0]]},                           // 3: glasrör i slutet
  {floor:FLOOR_NEG_Y, cells:[[4,2,0],[4,2,1],[3,2,1],[2,2,1],[2,2,2],[2,2,3]]},           // 4: hål i slutet
  {floor:FLOOR_POS_X, cells:[[2,1,3],[2,0,3],[2,0,2],[2,0,1],[2,0,0]]},                   // 5: utgången i slutet
];
const START=SEGS[0].cells[1];   // en ruta in i gången, så att kameran får plats bakom
const cellSeg=new Array(N*N*N).fill(-1);
SEGS.forEach((s,i)=>s.cells.forEach(c=>{cellSeg[cid(...c)]=i}));
// open[ruta][riktning]: 0 = vägg, 1 = gång, 'link' = hål/schakt, 'tube' = glasröret, 'exit' = utgången
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
addLink([4,4,2],[4,3,2],'hole');     // gång 0 → 1
addLink([4,0,4],[3,0,4],'hole');     // gång 1 → 2
addLink([0,2,4],[0,2,3],'shaft');    // gång 2 → 3
addLink([2,2,3],[2,1,3],'hole');     // gång 4 → 5
const tubeA={c:[0,2,0],d:5}, tubeB={c:[4,2,0],d:5};   // gång 3 → 4, utanför kubens framsida
open[cid(...tubeA.c)][tubeA.d]='tube';open[cid(...tubeB.c)][tubeB.d]='tube';
const exitCell=[2,0,0], exitDir=5;
open[cid(...exitCell)][exitDir]='exit';

// ---------- Kubens utseende ----------
// Varje ruta i en gång är en låda av glas: golvet mörkt med ränder, väggar och tak av frostat glas.
// Rutor som inte hör till någon gång är tomma, så kuben blir genomskinlig mellan gångarna.
const cube=new THREE.Group();scene.add(cube);
const wallMat=new THREE.MeshPhysicalMaterial({color:0x8fd0f5,transparent:true,opacity:.5,roughness:.55,clearcoat:.3,side:THREE.DoubleSide,depthWrite:false});
const stripeTex=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  g.fillStyle='#15344c';g.fillRect(0,0,64,64);g.fillStyle='#1c4562';for(let i=0;i<64;i+=16)g.fillRect(i,0,7,64);
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
})();
const floorMat=new THREE.MeshStandardMaterial({map:stripeTex,roughness:.7,transparent:true,opacity:1,side:THREE.DoubleSide});
const floorGlowMat=new THREE.MeshStandardMaterial({map:stripeTex,roughness:.7,emissive:0xffd166,emissiveIntensity:.6,side:THREE.DoubleSide});
const edgeMat=new THREE.LineBasicMaterial({color:0x8fe3ff,transparent:true,opacity:.45});
const cellGroups=new Map();      // ruta → grupp (för att kunna visa bara rutor nära hamstern)
const segFloors=SEGS.map(()=>[]);
for(let k=0;k<N*N*N;k++){
  const si=cellSeg[k];if(si<0)continue;
  const c=cellOfId(k),g=new THREE.Group();cube.add(g);cellGroups.set(k,g);
  for(let d=0;d<6;d++){
    if(open[k][d])continue;
    const [a]=DIRS[d],size=[CELL-2*PANEL_IN,CELL-2*PANEL_IN,CELL-2*PANEL_IN];size[a]=PANEL_T;
    const isFloor=d===SEGS[si].floor;
    const m=new THREE.Mesh(new THREE.BoxGeometry(...size),isFloor?floorMat:wallMat);
    m.position.copy(center(c)).addScaledVector(dirVec(d),CELL/2-PANEL_IN-PANEL_T/2);
    m.receiveShadow=true;g.add(m);
    if(isFloor)segFloors[si].push(m);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edgeMat);e.position.copy(m.position);g.add(e);
  }
}
cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2*HALF+.06,2*HALF+.06,2*HALF+.06)),new THREE.LineBasicMaterial({color:0xcff4ff,transparent:true,opacity:.6})));

// Hål och schakt markeras med en blå ring på hålets plan
const holeMat=new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1});
for(const L of LINKS){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.06,10,36),holeMat);
  const pos=center(L.x).addScaledVector(dirVec(L.d),CELL/2);
  ring.position.copy(pos);ring.lookAt(pos.clone().add(dirVec(L.d)));
  cellGroups.get(cid(...L.x)).add(ring);
}

// Utgången: en guldring på kubens yta
const exitN=dirVec(exitDir), exitPos=center(exitCell).addScaledVector(exitN,CELL/2);
const exitRing=new THREE.Mesh(new THREE.TorusGeometry(.85,.09,12,36),new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.9}));
exitRing.position.copy(exitPos);exitRing.lookAt(exitPos.clone().add(exitN));cube.add(exitRing);
const exitGlow=new THREE.PointLight(0xffd166,1.4,7);exitGlow.position.copy(exitPos).addScaledVector(exitN,.9);cube.add(exitGlow);

// Glasröret utanför kubens framsida
const TUBE_R=.56;
const tubeN=dirVec(tubeA.d);
const tubePa=center(tubeA.c).addScaledVector(tubeN,CELL/2), tubePb=center(tubeB.c).addScaledVector(tubeN,CELL/2);
const tubeMid=tubePa.clone().add(tubePb).multiplyScalar(.5).addScaledVector(tubeN,3.2);
const tubeCurve=new THREE.CatmullRomCurve3([tubePa,tubePa.clone().addScaledVector(tubeN,1.3),tubeMid,tubePb.clone().addScaledVector(tubeN,1.3),tubePb],false,'centripetal');
const tubeLen=tubeCurve.getLength();
cube.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,200,TUBE_R,20,false),
  new THREE.MeshPhysicalMaterial({color:0xbfefff,transparent:true,opacity:.22,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false})));
{
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
// Ansiktet sitter vid u≈0.43 i bilden, vilket på klotet motsvarar riktningen FACE.
const FACE=Math.atan2(-Math.cos(.43*2*Math.PI),Math.sin(.43*2*Math.PI));
hamsterBody.rotation.y=-FACE;
const fwdOf=h=>[Math.sin(h),Math.cos(h)];
const rightOf=h=>[-Math.cos(h),Math.sin(h)];
const fwd3=h=>ex.clone().multiplyScalar(Math.sin(h)).addScaledVector(ez,Math.cos(h));
const angleOf=v=>Math.atan2(v.dot(ex),v.dot(ez));
const TURN_TIME=1.0;
const MAX_SPEED=4.2, GRIP=4; // enheter/s vid full lutning, och hur snabbt farten hänger med
let heading=angleOf(dirVec(dirBetween(SEGS[0].cells[1],SEGS[0].cells[2])));
let turn=null;          // {from,to,t} medan kulan svänger
let turnArmed=true;     // sidlutningen måste släppas innan nästa sväng
let sideTime=0;         // hur länge kulan rört sig mest åt sidan
let camHeading=heading;
let lastCellKey=cid(...START), hold=0;   // hold: kulan står still under ett schakt en kort stund
// Läge: 'roll' rullar på golvet, 'fall' faller ner i ett hål, 'throat' sitter fast halvvägs i ett hål
let mode='roll', throat=null, fallInfo=null, idle=0;

// Hamsterns vridning: framåt längs riktningen, upp mot kubens nuvarande upp,
// sedan vickning (rock) och kullerbytta (roll)
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
function poseHamster(fwd,upv,rollA,rockA){
  const z=fwd.clone().normalize(),y=upv.clone().addScaledVector(z,-upv.dot(z)).normalize(),x=new THREE.Vector3().crossVectors(y,z);
  _m.makeBasis(x,y,z);hamster.quaternion.setFromRotationMatrix(_m);
  hamster.quaternion.multiply(_q.setFromEuler(_e.set(rollA,0,rockA,'ZYX')));
}

// ---------- Glasröret ----------
let inTube=false,tubeS=0,tubeV=0,tubeDir=1,tubeLean=0,tubeHPrev=0;
let camBlend=0;
const blendFrom={p:new THREE.Vector3(),t:new THREE.Vector3()};
const camLook=new THREE.Vector3();
function startCamBlend(){blendFrom.p.copy(cam.position);blendFrom.t.copy(camLook);camBlend=1}
function enterTube(fromA){
  inTube=true;tubeDir=fromA?1:-1;tubeS=fromA?0:tubeLen;
  tubeV=Math.max(1.6,Math.hypot(vx,vz));
  if(turn){heading=turn.to;turn=null}
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

// ---------- Hål: hamstern faller ner halvvägs och sitter fast ----------
// throat = {x, y, d}: hamstern sitter i hålet mellan ruta x och ruta y (riktning d från x till y).
// Den lossnar när kuben ligger så att golvet i y:s gång är nedåt.
function linkFrom(c,d){const n=neighbor(c,d);return {x:c,y:n,d}}
function startFall(c,d){
  mode='fall';fallInfo={...linkFrom(c,d),v:0};vx=vz=0;hold=0;
  if(turn){heading=turn.to;camHeading=heading;turn=null}
}
function fallStep(dt){
  const {x}=fallInfo;
  fallInfo.v+=9.8*.7*dt;
  const face=coordOf(x[ga])+gs*CELL/2;   // hålets plan: kulans mitt hamnar här, halvvägs ner
  let y=p.getComponent(ga)+gs*fallInfo.v*dt;
  const done=gs*(y-face)>=0;
  if(done)y=face;
  p.setComponent(ga,y);
  for(const a of planeAxes())p.setComponent(a,p.getComponent(a)+(coordOf(x[a])-p.getComponent(a))*Math.min(1,dt*8));
  roll+=dt*3;poseHamster(fwd3(heading),up,roll,0);
  if(!done)return;
  for(const a of planeAxes())p.setComponent(a,coordOf(x[a]));
  mode='throat';throat={x:fallInfo.x,y:fallInfo.y,d:fallInfo.d};rightSince=null;
  hint('Hamstern sitter fast i hålet! Zooma ut och tippa kuben så att golvet i nästa gång hamnar nedåt.',6000);
}
// Rätt läge: golvet i gången som hålet leder till pekar nedåt
const targetFloor=()=>throat?SEGS[cellSeg[cid(...throat.y)]].floor:-1;
const isRight=q=>mode==='throat'&&downDirOf(q)===targetFloor();
let rightSince=null;     // när kuben hamnade i rätt läge (för automatisk inzoomning)
// Hamstern lossnar: den landar i öppningen och vänds in mot nästa gång
function release(){
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
      if(!open[cid(...prev)][d])return Math.max(0,(i-1)/STEPS-.04);
    }
    prev=c;
  }
  return 1;
}
function placeCamera(){
  cam.up.set(0,1,0);
  const bw=toWorld(p);
  if(inTube){
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
  }
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
  if(baseBeta===null){baseBeta=beta;baseGamma=gamma} // kalibrera "rakt fram" utifrån hur telefonen hålls just nu
  // Ju mer man lutar, desto fortare: 2° dödzon, full fart vid ungefär 28°
  const tilt=d=>Math.sign(d)*Math.min(1,Math.max(0,Math.abs(d)-2)/26);
  tiltX = tilt(gamma-baseGamma);
  tiltZ = tilt(beta-baseBeta);
  const d=$('dbg');
  if(d){d.classList.remove('hide');d.textContent=`beta ${beta.toFixed(1)} (bas ${baseBeta.toFixed(1)})\ngamma ${gamma.toFixed(1)} (bas ${baseGamma.toFixed(1)})\nevents ${orientEventsSeen}`}
}
function enableOrientation(){
  if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
    DeviceOrientationEvent.requestPermission().then(res=>{
      if(res==='granted'){useOrientation=true;addEventListener('deviceorientation',onOrient);$('tilt').classList.remove('hide');armFallbackCheck()}
      else{useKeyboard=true;hint('Lutning nekades. Dra med fingret på skärmen för att styra.',7000)}
    }).catch(()=>{useKeyboard=true;hint('Lutning gick inte att starta. Dra med fingret på skärmen.',7000)});
  }else if('DeviceOrientationEvent' in window){
    useOrientation=true;addEventListener('deviceorientation',onOrient);$('tilt').classList.remove('hide');
    armFallbackCheck();
  }else{
    useKeyboard=true;hint('Ingen lutningssensor hittades. Dra med fingret på skärmen.',7000);
  }
}
function armFallbackCheck(){
  const seenAtStart=orientEventsSeen;
  setTimeout(()=>{
    if(orientEventsSeen===seenAtStart){
      // inga sensordata kom alls inom 2 sekunder, troligen blockerat av webbläsaren/iframen
      useKeyboard=true;
      hint('Lutningssensorn svarar inte här. Dra med fingret på skärmen i stället, eller öppna sidan i en egen flik.',9000);
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
$('go').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');
  enableOrientation();
  playing=true;startTime=performance.now();
  hint('Luta framåt för att rulla, åt sidan för att svänga. Rullar du i ett hål: zooma ut och svep för att tippa kuben.',7000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');
  useKeyboard=true;playing=true;startTime=performance.now();
  hint(touch?'Dra uppåt för att rulla framåt, åt sidan för att svänga.':'Pil upp/W rullar framåt. Vänster/höger svänger. M zoomar ut; där tippar piltangenterna (eller ett svep) kuben.',7000);
};

// ---------- Utzoomat läge: kuben snett ovanifrån, som en tärning på ett bord ----------
// Rullningen pausas medan man tittar utifrån. Här tippar man kuben genom att svepa.
const MAP_TIME=.6, MAP_TILT=THREE.MathUtils.degToRad(38);
let mapOn=false,mapT=0;
let showAll=false;        // false: visa bara gångarna nära hamstern
let lockMode=true;        // true = Spärr (bara rätt håll går), false = Markering (fritt, lyser vid rätt)
let helpOn=true;          // pil som visar rätt håll
const marker=new THREE.Mesh(new THREE.TorusGeometry(.8,.12,10,40),new THREE.MeshBasicMaterial({color:0xff5fa2,transparent:true,depthTest:false}));
marker.renderOrder=10;marker.visible=false;scene.add(marker);
function setMap(on){
  if(on&&(!playing||won||inTube||mode==='fall'))return;
  if(rot)return;
  mapOn=on;$('mapBtn').classList.toggle('on',mapOn);$('mapBtn').setAttribute('aria-pressed',mapOn);
  dragActive=false;dragX=0;dragZ=0;
  if(!on&&mode==='throat'&&isRight(baseQ))release();
}
$('mapBtn').onclick=()=>setMap(!mapOn);
addEventListener('keydown',e=>{if(e.code==='KeyM')setMap(!mapOn)});
$('nearBtn').onclick=()=>{showAll=!showAll;$('nearBtn').textContent=showAll?'Visa bara nära':'Visa allt'};
$('modeBtn').onclick=()=>{lockMode=!lockMode;$('modeBtn').textContent=lockMode?'Läge: Spärr':'Läge: Markering'};
$('helpBtn').onclick=()=>{helpOn=!helpOn;$('helpBtn').textContent=helpOn?'Hjälp: på':'Hjälp: av'};
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
  if(t<=0)return;
  const bw=toWorld(p);
  marker.position.copy(bw);
  marker.quaternion.copy(cam.quaternion);
  marker.scale.setScalar(1+.15*Math.sin(time*6));
  marker.material.opacity=e;
  // Så långt bort att hela kuben syns även medan den tippar
  const rad=HALF*Math.sqrt(3)*1.05;
  const D=rad/Math.sin(THREE.MathUtils.degToRad(cam.fov/2))/Math.min(1,cam.aspect);
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
// I ett hål: ett kvarts varv per svep. Under ett schakt: en vändning 180°.
const atShaft=()=>mode==='roll'&&hold<=0&&!inTube&&open[cid(...cellOf(p))][upDir()]==='link';
const rotateSteps=()=>(!playing||won||inTube)?0:mode==='throat'?1:atShaft()?2:0;
// Får man tippa åt det här hållet? Vändning under schakt: alltid. I ett hål med Spärr: bara till rätt läge.
function swipeAllowed(name,steps){
  if(steps===2||!lockMode)return true;
  const [axis,sign]=SWIPES[name];
  return isRight(stepQ(axis,sign*Math.PI/2));
}
function rightSwipe(){
  const steps=rotateSteps();
  if(steps===2)return 'up';
  if(steps===1)for(const n of Object.keys(SWIPES)){const [axis,sign]=SWIPES[n];if(isRight(stepQ(axis,sign*Math.PI/2)))return n}
  return null;
}
let swipeStart=null;
ren.domElement.addEventListener('pointerdown',e=>{
  if(!mapOn||mapT<.9||rot||rotateSteps()===0||(mode==='throat'&&isRight(baseQ)))return;
  swipeStart={x:e.clientX,y:e.clientY,id:e.pointerId};
  ren.domElement.setPointerCapture(e.pointerId);
});
ren.domElement.addEventListener('pointermove',e=>{
  if(!swipeStart)return;
  const dx=e.clientX-swipeStart.x, dy=e.clientY-swipeStart.y;
  if(!rot){
    if(Math.hypot(dx,dy)<12)return;
    const name=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    const steps=rotateSteps();
    rot={name,axis:SWIPES[name][0],sign:SWIPES[name][1],ang:0,target:null,steps,allowed:swipeAllowed(name,steps)};
  }
  const along=(rot.name==='right'?dx:rot.name==='left'?-dx:rot.name==='down'?dy:-dy)/ROT_PX;
  let k=Math.max(0,Math.min(rot.steps,along));
  if(!rot.allowed)k=Math.min(k,.18);    // fel håll: kuben gungar bara lite
  rot.ang=rot.sign*k*Math.PI/2;
});
const endSwipe=()=>{
  if(!swipeStart)return;
  swipeStart=null;
  if(!rot)return;
  const full=rot.steps*Math.PI/2;
  rot.target=rot.allowed&&Math.abs(rot.ang)>full/2?rot.sign*full:0;
};
ren.domElement.addEventListener('pointerup',endSwipe);ren.domElement.addEventListener('pointercancel',endSwipe);
// Tangentbord i utzoomat läge: piltangenterna tippar kuben ett helt steg
addEventListener('keydown',e=>{
  if(!mapOn||mapT<.9||rot)return;
  const name={ArrowRight:'right',ArrowLeft:'left',ArrowUp:'up',ArrowDown:'down'}[e.code];
  const steps=rotateSteps();
  if(!name||steps===0||(mode==='throat'&&isRight(baseQ)))return;
  const allowed=swipeAllowed(name,steps);
  rot={name,axis:SWIPES[name][0],sign:SWIPES[name][1],ang:allowed?0:rot?.ang||0,target:allowed?SWIPES[name][1]*steps*Math.PI/2:0,steps,allowed};
  if(!allowed){rot.ang=SWIPES[name][1]*.18*Math.PI/2}
});
function updateRotation(dt){
  if(!rot)return;
  if(rot.target!==null){
    rot.ang+=(rot.target-rot.ang)*Math.min(1,dt*9);
    if(Math.abs(rot.target-rot.ang)<.01)rot.ang=rot.target;
  }
  cube.quaternion.setFromAxisAngle(rot.axis,rot.ang).multiply(baseQ);
  if(rot.target!==null&&rot.ang===rot.target){
    if(rot.target!==0){
      const oldFwd=fwd3(heading);
      baseQ.copy(snapQuat(cube.quaternion.clone()));
      updateGravity();
      vx=vz=0;turn=null;hold=0;idle=0;
      if(Math.abs(oldFwd.dot(up))<.5)heading=angleOf(oldFwd);
      camHeading=heading;
      // Rätt läge: golvet i nästa gång lyser och kameran zoomar snart in av sig själv
      if(isRight(baseQ)){
        rightSince=performance.now();
        const si=cellSeg[cid(...throat.y)];
        for(const m of segFloors[si])m.material=floorGlowMat;
        hamsterMat.emissiveIntensity=.35;
      }
    }
    cube.quaternion.copy(baseQ);
    rot=null;
  }
}

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  // Hål i golvet där hamstern är: den faller ner halvvägs. Det går inte att ångra.
  // (Gäller även utzoomat, t.ex. direkt efter en vändning under ett schakt.)
  if(playing&&!won&&mode==='roll'&&!inTube&&!rot&&open[cid(...cellOf(p))][downDir()]==='link')startFall(cellOf(p),downDir());
  if(playing&&!won&&mode==='fall')fallStep(dt);
  if(playing&&!won&&!mapOn&&mode!=='fall'){
    let ax=0,az=0;
    if(useOrientation){ax=tiltX;az=tiltZ}
    if(useKeyboard){
      ax+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
      az+=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    }
    if(dragActive){ax+=dragX;az+=dragZ}
    ax=Math.max(-1,Math.min(1,ax));az=Math.max(-1,Math.min(1,az));

    if(inTube){tubeStep(dt,-az)}
    else if(mode==='throat'){/* sitter fast halvvägs i hålet tills kuben ligger rätt */}
    else{
    const c=cellOf(p),k=cid(...c);
    // Ny ruta med schakt i taket: stanna en kort stund mitt i rutan
    if(k!==lastCellKey){
      lastCellKey=k;idle=0;
      if(open[k][upDir()]==='link'){
        hold=.6;vx=vz=0;
        if(turn){heading=turn.to;camHeading=heading;turn=null}
        hint('Ett schakt ovanför! Rulla vidare, eller zooma ut och vänd kuben 180° så faller hamstern ner i det.',5000);
      }
    }
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
    vx+=(tvx-vx)*grip; vz+=(tvz-vz)*grip;
    if(hold>0){vx=vz=0}
    idle=Math.hypot(vx,vz)<.3?idle+dt:0;

    // Rörelse i golvplanet, stoppad av rutans väggar. Hål och schakt går inte att rulla igenom i sidled.
    p.addScaledVector(ex,vx*dt).addScaledVector(ez,vz*dt);
    const cc=cellOf(p),kk=cid(...cc);
    for(const a of planeAxes()){
      const off=p.getComponent(a)-coordOf(cc[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM)continue;
        const kind=open[kk][dirIndex(a,s)];
        if(!kind||kind==='link'){
          p.setComponent(a,coordOf(cc[a])+s*LIM);
          if(a===axisOf(ex))vx=0; else vz=0;
        }else if(s*off>LIM+.15&&kind==='exit'){win()}
        else if(s*off>LIM+.15&&kind==='tube'){
          enterTube(cid(...tubeA.c)===kk&&tubeA.d===dirIndex(a,s));
        }
      }
    }
    if(!inTube){
    // Kulan sjunker mjukt ner till golvet (t.ex. när den precis lossnat ur ett hål)
    const fc=floorCoord(cellOf(p));
    p.setComponent(ga,p.getComponent(ga)+(fc-p.getComponent(ga))*Math.min(1,dt*10));

    // Upptäck sväng: kulan rör sig tydligt mer åt sidan än framåt (t.ex. in i en sidogång)
    if(Math.abs(inSide)<.3)turnArmed=true;
    if(!turn){
      const side=vx*rx+vz*rz, ahead=vx*fx+vz*fz;
      sideTime=(Math.abs(side)>.5&&Math.abs(side)>1.4*Math.abs(ahead))?sideTime+dt:0;
      if(turnArmed&&sideTime>.12){
        // rullningen nollställs under svängen till närmaste läge med ansiktet framåt
        const roll0=roll-2*Math.PI*Math.round(roll/(2*Math.PI));
        turn={from:heading,to:heading-Math.sign(side)*Math.PI/2,t:0,roll0};
        turnArmed=false;sideTime=0;
      }
    }

    // Svängen tar TURN_TIME sekunder. Kameran glider jämnt runt till bakom kulan,
    // medan hamstern vickar fram och tillbaka och vrider sig lite i taget åt samma håll.
    // Utanför svängar slår kulan kullerbyttor: den rullar runt sin sidoaxel i takt med farten framåt.
    let faceH=heading, rock=0;
    if(turn){
      turn.t=Math.min(1,turn.t+dt/TURN_TIME);
      const q=turn.t, d=turn.to-turn.from, env=Math.sin(Math.PI*q);
      camHeading=turn.from+d*easeInOut(q);
      faceH=turn.from+d*(q+.09*Math.sin(2*Math.PI*3*q)*env);
      rock=.22*Math.sin(2*Math.PI*3*q)*env;
      roll=turn.roll0*(1-easeInOut(q));
      if(q>=1){heading=turn.to;camHeading=heading;faceH=heading;roll=0;turn=null}
    }else{
      camHeading=heading;
      roll+=(vx*fx+vz*fz)*dt/R;
    }
    poseHamster(fwd3(faceH),up,roll,rock);
    }
    }
  }
  ball.position.copy(p);
  exitRing.rotation.z=time*1.2;
  updateRotation(dt);
  // Rätt läge: efter en kort stund zoomar kameran in och hamstern lossnar
  if(mode==='throat'&&rightSince&&mapOn&&performance.now()-rightSince>1300)setMap(false);
  if(mode==='throat'&&rightSince){hamsterMat.emissiveIntensity=.25+.2*Math.sin(time*8)}
  mapT=Math.max(0,Math.min(1,mapT+(mapOn?1:-1)*dt/MAP_TIME));
  camBlend=Math.max(0,camBlend-dt/.6);
  updateUI();
  if(playing||won){placeCamera();applyMap(mapT,time)}
  ren.render(scene,cam);
}
// Knappar, text och hjälppil i utzoomat läge
const ARROWS={up:['↑','Svep uppåt'],down:['↓','Svep nedåt'],left:['←','Svep åt vänster'],right:['→','Svep åt höger']};
function updateUI(){
  const steps=rotateSteps(), out=mapOn&&mapT>.9, right=mode==='throat'&&isRight(baseQ);
  for(const id of ['nearBtn','modeBtn','helpBtn'])$(id).classList.toggle('hide',!out);
  const tip=$('tip');
  const text=right?'Rätt! Hamstern kan rulla vidare.':steps===1?'Tippa kuben så att golvet i nästa gång hamnar nedåt':steps===2?'Svep för att vända kuben 180° så faller hamstern i schaktet':'Zooma in och rulla vidare';
  tip.classList.toggle('hide',!out);tip.classList.toggle('go',steps>0||right);
  if(tip.textContent!==text)tip.textContent=text;
  const sw=out&&helpOn&&!right&&!rot?rightSwipe():null, ha=$('helpArrow');
  ha.classList.toggle('hide',!sw);
  if(sw){const [ch,label]=ARROWS[sw];const t=ch+' '+label;if(ha.textContent!==t)ha.textContent=t}
  // Kubknappen pumpar när hamstern sitter i ett hål, eller har stått still en stund under ett schakt
  $('mapBtn').classList.toggle('pulse',!mapOn&&((mode==='throat'&&!right)||(steps===2&&idle>1.2)));
}
function win(){
  if(won)return;
  won=true;
  const secs=((performance.now()-startTime)/1000).toFixed(1);
  $('timeText').textContent=`Tid: ${secs} sekunder`;
  $('win').classList.remove('hide');
}
placeCamera();
loop();
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
