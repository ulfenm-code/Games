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

// ---------- Labyrintgenerering ----------
const COLS=11, ROWS=17, CELL=1.9, WALLT=0.16, WALLH=1.1, R=0.42;
let seed=1337;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// true = vägg finns
const wallsR=Array.from({length:ROWS},()=>Array(COLS).fill(true)); // höger om cellen
const wallsB=Array.from({length:ROWS},()=>Array(COLS).fill(true)); // under cellen
const visited=Array.from({length:ROWS},()=>Array(COLS).fill(false));

function carve(r,c){
  visited[r][c]=true;
  const dirs=[[0,1,'R'],[0,-1,'L'],[1,0,'B'],[-1,0,'T']];
  for(let i=dirs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]]}
  for(const [dr,dc,dir] of dirs){
    const nr=r+dr,nc=c+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS||visited[nr][nc])continue;
    if(dir==='R')wallsR[r][c]=false;
    if(dir==='L')wallsR[r][c-1]=false;
    if(dir==='B')wallsB[r][c]=false;
    if(dir==='T')wallsB[r-1][c]=false;
    carve(nr,nc);
  }
}
carve(0,0);

// BFS för att hitta huvudvägen, så vi kan placera öppna rum längs den
function neighbors(r,c){
  const n=[];
  if(c<COLS-1&&!wallsR[r][c])n.push([r,c+1]);
  if(c>0&&!wallsR[r][c-1])n.push([r,c-1]);
  if(r<ROWS-1&&!wallsB[r][c])n.push([r+1,c]);
  if(r>0&&!wallsB[r-1][c])n.push([r-1,c]);
  return n;
}
function bfsPath(sr,sc,er,ec){
  const prev={};const key=(r,c)=>r+'_'+c;
  const q=[[sr,sc]];const seen=new Set([key(sr,sc)]);
  while(q.length){
    const [r,c]=q.shift();
    if(r===er&&c===ec)break;
    for(const [nr,nc] of neighbors(r,c)){
      const k=key(nr,nc);
      if(seen.has(k))continue;
      seen.add(k);prev[k]=[r,c];q.push([nr,nc]);
    }
  }
  const path=[];let cur=[er,ec];
  while(cur){path.push(cur);const k=key(cur[0],cur[1]);cur=prev[k]||null}
  return path.reverse();
}
const START=[0,0], END=[ROWS-1,COLS-1];
const mainPath=bfsPath(START[0],START[1],END[0],END[1]);

// Öppna upp några rum längs huvudvägen (ta bort inre väggar i ett 2x2-block)
const openSpots=[];
for(let i=3;i<mainPath.length-3;i+=Math.floor(mainPath.length/5)){openSpots.push(mainPath[i])}
for(const [r,c] of openSpots){
  for(let dr=0;dr<=1;dr++)for(let dc=0;dc<=1;dc++){
    const rr=r+dr,cc=c+dc;
    if(rr<ROWS&&cc<COLS){
      if(cc<COLS-1&&rr+1<ROWS===false){} // no-op guard
    }
  }
  if(r+1<ROWS){wallsB[r][c]=false;if(c+1<COLS)wallsB[r][c+1]=false}
  if(c+1<COLS){wallsR[r][c]=false;if(r+1<ROWS)wallsR[r+1]?.[c]!==undefined&&(wallsR[r+1][c]=false)}
}

// ---------- Geometri: plastväggar som InstancedMesh ----------
const wallMat=new THREE.MeshPhysicalMaterial({color:0x4fc3ff,transparent:true,opacity:.38,roughness:.15,metalness:0,clearcoat:1,clearcoatRoughness:.1,side:THREE.DoubleSide});
const edgeMat=new THREE.MeshStandardMaterial({color:0x8fe3ff,roughness:.3,metalness:.1});
const wallGeo=new THREE.BoxGeometry(1,1,1);

let segCount=0;
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  if(c<COLS-1&&wallsR[r][c])segCount++;
  if(r<ROWS-1&&wallsB[r][c])segCount++;
}
segCount+=2*(ROWS+COLS); // ytterväggar
const wallMesh=new THREE.InstancedMesh(wallGeo,wallMat,segCount);
wallMesh.castShadow=true;wallMesh.receiveShadow=true;
const dm=new THREE.Object3D();
let idx=0;
const colliders=[]; // {x,z,hx,hz} axelriktade boxar i världskoordinater
function originOf(r,c){return [c*CELL, r*CELL]} // x,z
function addWallSeg(x,z,sx,sz){
  dm.position.set(x,WALLH/2,z);dm.scale.set(sx,WALLH,sz);dm.updateMatrix();
  wallMesh.setMatrixAt(idx++,dm.matrix);
  colliders.push({x,z,hx:sx/2,hz:sz/2});
}
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const [x,z]=originOf(r,c);
  if(c<COLS-1&&wallsR[r][c]) addWallSeg(x+CELL/2, z, WALLT, CELL+WALLT);
  if(r<ROWS-1&&wallsB[r][c]) addWallSeg(x, z+CELL/2, CELL+WALLT, WALLT);
}
// Ytterväggar
for(let c=0;c<COLS;c++){
  const [x,z]=originOf(0,c);
  addWallSeg(x,z-CELL/2,CELL+WALLT,WALLT);
}
for(let c=0;c<COLS;c++){
  const [x,z]=originOf(ROWS-1,c);
  addWallSeg(x,z+CELL/2,CELL+WALLT,WALLT);
}
for(let r=0;r<ROWS;r++){
  const [x,z]=originOf(r,0);
  addWallSeg(x-CELL/2,z,WALLT,CELL+WALLT);
}
for(let r=0;r<ROWS;r++){
  const [x,z]=originOf(r,COLS-1);
  addWallSeg(x+CELL/2,z,WALLT,CELL+WALLT);
}
wallMesh.count=idx;
wallMesh.instanceMatrix.needsUpdate=true;
scene.add(wallMesh);

// Golv (övre våningen är halvgenomskinlig så att man anar våningen under)
const mazeW=(COLS-1)*CELL, mazeD=(ROWS-1)*CELL;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(mazeW+6,mazeD+6),new THREE.MeshStandardMaterial({color:0x0c1f33,roughness:.9,transparent:true,opacity:.6,depthWrite:false}));
floor.rotation.x=-Math.PI/2;floor.position.set(mazeW/2,-0.02,mazeD/2);floor.receiveShadow=true;scene.add(floor);

// Mål
let [gx,gz]=originOf(END[0],END[1]); // flyttas till nedre våningen längre ner
const goalGlow=new THREE.PointLight(0xffd166,1.2,8);goalGlow.position.set(gx,1.2,gz);scene.add(goalGlow);
const goalRing=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,12,24),new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.6}));
goalRing.rotation.x=Math.PI/2;goalRing.position.set(gx,.05,gz);scene.add(goalRing);

// ---------- Kula ----------
const [sx0,sz0]=originOf(START[0],START[1]);
const hamsterTex=new THREE.TextureLoader().load(hamsterTexUrl);
hamsterTex.colorSpace=THREE.SRGBColorSpace;
// Kulan är hamstern själv. Den slår kullerbyttor framåt när den rullar,
// och efter en sväng börjar den med ansiktet rakt fram.
const ball=new THREE.Group();ball.position.set(sx0,R,sz0);scene.add(ball);
const hamsterMat=new THREE.MeshStandardMaterial({map:hamsterTex,roughness:.75});
// hamster = pivot vars +z är framåt; själva klotet vrids så att ansiktet hamnar på +z
const hamster=new THREE.Group();hamster.rotation.order='YZX';ball.add(hamster);
const hamsterBody=new THREE.Mesh(new THREE.SphereGeometry(R,32,24),hamsterMat);
hamsterBody.castShadow=true;hamster.add(hamsterBody);
let bx=sx0,bz=sz0,vx=0,vz=0;
let roll=0; // hur långt kulan rullat framåt, i radianer (0 = ansiktet framåt)

// ---------- Riktning (first person) ----------
// Framåt för riktning h är (sin h, cos h) i x/z. Höger är (-cos h, sin h).
// Ansiktet sitter vid u≈0.43 i bilden, vilket på klotet motsvarar riktningen FACE.
const FACE=Math.atan2(-Math.cos(.43*2*Math.PI),Math.sin(.43*2*Math.PI));
hamsterBody.rotation.y=-FACE;
const fwdOf=h=>[Math.sin(h),Math.cos(h)];
const rightOf=h=>[-Math.cos(h),Math.sin(h)];
const TURN_TIME=1.0;
const MAX_SPEED=4.2, GRIP=4; // enheter/s vid full lutning, och hur snabbt farten hänger med
let heading=(()=>{const [r1,c1]=mainPath[1];return Math.atan2(c1-START[1],r1-START[0])})();
let turn=null;          // {from,to,t} medan kulan svänger
let turnArmed=true;     // sidlutningen måste släppas innan nästa sväng
let sideTime=0;         // hur länge kulan rört sig mest åt sidan
let camHeading=heading;

// ---------- Två våningar och ett glasrör emellan ----------
const LOW=3.4;                 // hur långt under den övre våningen den nedre ligger
const levelY=[0,-LOW];
let level=0;                   // 0 = övre våningen, 1 = nedre
const levelColliders=[colliders,[]];
const levelObjs=[[wallMesh,floor],[]];

// Rörets ingång ligger tidigt, i fjärde rutan längs huvudvägen
const E=mainPath[3], Eprev=mainPath[2];
const [ax0,az0]=originOf(E[0],E[1]);
const hIn=Math.atan2(E[1]-Eprev[1],E[0]-Eprev[0]);   // riktningen man rullar in i röret

// Spiralen: ett och ett halvt varv ner. Punkten på spiralen vid vinkeln th är
// centrum + HELIX_R*(sin th, cos th), och rullriktningen där är th+90°.
const HELIX_R=1.6, TURNS=1.5, RUNOUT=3.4, TUBE_R=.56;
const th0=hIn-Math.PI/2, th1=th0+TURNS*2*Math.PI;
const hcx=ax0-HELIX_R*Math.sin(th0), hcz=az0-HELIX_R*Math.cos(th0);
const hOut=th1+Math.PI/2;      // riktningen ut ur spiralen (rakt längs en axel)
const tubePts=[];
for(let i=0,N=72;i<=N;i++){
  const t=i/N, th=th0+(th1-th0)*t;
  const drop=1-Math.pow(1-t,2.2);   // brant i början så att röret snabbt kommer under golvet, planar ut mot slutet
  tubePts.push(new THREE.Vector3(hcx+HELIX_R*Math.sin(th),R-LOW*drop,hcz+HELIX_R*Math.cos(th)));
}
const [ox,oz]=fwdOf(hOut);
const exitP=tubePts[tubePts.length-1].clone();
for(let i=1;i<=6;i++)tubePts.push(new THREE.Vector3(exitP.x+ox*RUNOUT*i/6,R-LOW,exitP.z+oz*RUNOUT*i/6));
const tubeCurve=new THREE.CatmullRomCurve3(tubePts);
const tubeLen=tubeCurve.getLength();

// Röret: genomskinligt glas med inramande ringar
const tube=new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,260,TUBE_R,20,false),
  new THREE.MeshPhysicalMaterial({color:0xbfefff,transparent:true,opacity:.2,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false}));
scene.add(tube);
const frameMat=new THREE.MeshStandardMaterial({color:0x8fe3ff,roughness:.3,metalness:.2});
const frameGeo=new THREE.TorusGeometry(TUBE_R+.02,.035,8,28);
for(let i=1;i<=24;i++){
  const u=i/25, p=tubeCurve.getPointAt(u);
  const ring=new THREE.Mesh(frameGeo,frameMat);
  ring.position.copy(p);ring.lookAt(p.clone().add(tubeCurve.getTangentAt(u)));scene.add(ring);
}

// Öppningen i golvet på övre våningen
const hole=new THREE.Mesh(new THREE.CircleGeometry(.62,32),new THREE.MeshBasicMaterial({color:0x020812}));
hole.rotation.x=-Math.PI/2;hole.position.set(ax0,.004,az0);scene.add(hole);
const holeRing=new THREE.Mesh(new THREE.TorusGeometry(.64,.06,10,32),new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1}));
holeRing.rotation.x=Math.PI/2;holeRing.position.set(ax0,.05,az0);scene.add(holeRing);
levelObjs[0].push(hole,holeRing);

// Nedre våningen: en liten labyrint. Rad i går i rörets utriktning, kolumn j åt höger.
// Startrutan (0, LJ0) ligger där röret slutar, med en öppning i bakväggen.
const LR=5, LC=5, LJ0=2;
const lf=fwdOf(hOut).map(Math.round), lr=rightOf(hOut).map(Math.round);
const L0x=exitP.x+ox*RUNOUT, L0z=exitP.z+oz*RUNOUT;
const lowCell=(i,j)=>[L0x+(lf[0]*i+lr[0]*(j-LJ0))*CELL, L0z+(lf[1]*i+lr[1]*(j-LJ0))*CELL];
function genMaze(rows,cols,sr,sc){
  const wR=Array.from({length:rows},()=>Array(cols).fill(true));
  const wB=Array.from({length:rows},()=>Array(cols).fill(true));
  const vis=Array.from({length:rows},()=>Array(cols).fill(false));
  (function carve(r,c){
    vis[r][c]=true;
    const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
    for(let i=dirs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]]}
    for(const [dr,dc] of dirs){
      const nr=r+dr,nc=c+dc;
      if(nr<0||nr>=rows||nc<0||nc>=cols||vis[nr][nc])continue;
      if(dc===1)wR[r][c]=false; if(dc===-1)wR[r][c-1]=false;
      if(dr===1)wB[r][c]=false; if(dr===-1)wB[r-1][c]=false;
      carve(nr,nc);
    }
  })(sr,sc);
  return {wR,wB};
}
const low=genMaze(LR,LC,0,LJ0);
const lowWalls=new THREE.InstancedMesh(wallGeo,wallMat,LR*LC*2+2*(LR+LC));
lowWalls.castShadow=true;lowWalls.receiveShadow=true;
let li=0;
// lenF = längd i radernas riktning, lenR = längd i kolumnernas riktning
function addLowWall(i,j,lenF,lenR){
  const [px,pz]=lowCell(i,j);
  const sx=Math.abs(lf[0])*lenF+Math.abs(lr[0])*lenR, sz=Math.abs(lf[1])*lenF+Math.abs(lr[1])*lenR;
  dm.position.set(px,levelY[1]+WALLH/2,pz);dm.scale.set(sx,WALLH,sz);dm.updateMatrix();
  lowWalls.setMatrixAt(li++,dm.matrix);
  levelColliders[1].push({x:px,z:pz,hx:sx/2,hz:sz/2});
}
for(let i=0;i<LR;i++)for(let j=0;j<LC;j++){
  if(j<LC-1&&low.wR[i][j])addLowWall(i,j+.5,CELL+WALLT,WALLT);
  if(i<LR-1&&low.wB[i][j])addLowWall(i+.5,j,WALLT,CELL+WALLT);
}
for(let j=0;j<LC;j++){
  if(j!==LJ0)addLowWall(-.5,j,WALLT,CELL+WALLT);   // bakväggen, öppen där röret kommer in
  addLowWall(LR-.5,j,WALLT,CELL+WALLT);
}
for(let i=0;i<LR;i++){addLowWall(i,-.5,CELL+WALLT,WALLT);addLowWall(i,LC-.5,CELL+WALLT,WALLT)}
lowWalls.count=li;lowWalls.instanceMatrix.needsUpdate=true;scene.add(lowWalls);
const [lcx,lcz]=lowCell((LR-1)/2,(LC-1)/2);
const lowFloor=new THREE.Mesh(new THREE.PlaneGeometry(44,44),new THREE.MeshStandardMaterial({color:0x0a1a2b,roughness:.9}));
lowFloor.rotation.x=-Math.PI/2;lowFloor.position.set((lcx+hcx)/2,levelY[1]-.02,(lcz+hcz)/2);lowFloor.receiveShadow=true;scene.add(lowFloor);
levelObjs[1].push(lowWalls,lowFloor);

// Målet ligger i bortre hörnet på nedre våningen
[gx,gz]=lowCell(LR-1,0);
goalGlow.position.set(gx,levelY[1]+1.2,gz);
goalRing.position.set(gx,levelY[1]+.05,gz);

// Kartvyns utsnitt för varje våning
const [lx0,lz0]=lowCell(-.5,-.5),[lx1,lz1]=lowCell(LR-.5,LC-.5);
const levelBounds=[
  {cx:mazeW/2,cz:mazeD/2,w:mazeW,d:mazeD},
  {cx:(lx0+lx1)/2,cz:(lz0+lz1)/2,w:Math.abs(lx1-lx0),d:Math.abs(lz1-lz0)}
];

// Läge i röret
let inTube=false, tubeS=0, tubeV=0, tubeLean=0;
// Kameran glider mjukt när den byter mellan golv och rör
let camBlend=0;
const blendFrom={p:new THREE.Vector3(),t:new THREE.Vector3()};
const camLook=new THREE.Vector3();
function startCamBlend(){blendFrom.p.copy(cam.position);blendFrom.t.copy(camLook);camBlend=1}
function enterTube(){
  inTube=true;tubeS=0;tubeV=Math.max(1.6,Math.hypot(vx,vz));
  if(turn){heading=turn.to;turn=null}
  startCamBlend();
}
function exitTube(){
  inTube=false;level=1;
  heading=Math.round(hOut/(Math.PI/2))*(Math.PI/2);camHeading=heading;
  turnArmed=false;sideTime=0;
  startCamBlend();
}
// Ett steg i röret: kulan rullar av sig själv (fortare om man lutar framåt)
// och lutar sig inåt i kurvan, mer ju snabbare och skarpare.
function tubeStep(dt,inFwd){
  const target=Math.max(2.2,MAX_SPEED*Math.max(0,inFwd));
  tubeV+=(target-tubeV)*(1-Math.exp(-2*dt));
  tubeS=Math.min(tubeLen,tubeS+tubeV*dt);
  const u=tubeS/tubeLen, p=tubeCurve.getPointAt(u), tg=tubeCurve.getTangentAt(u);
  bx=p.x;bz=p.z;ball.position.copy(p);
  vx=tg.x*tubeV;vz=tg.z*tubeV;
  const h=Math.atan2(tg.x,tg.z), du=Math.min(.01,1-u);
  let curv=0;
  if(du>0){
    const tg2=tubeCurve.getTangentAt(u+du);
    const dh=Math.atan2(tg2.x,tg2.z)-h;
    curv=Math.atan2(Math.sin(dh),Math.cos(dh))/(du*tubeLen);
  }
  // inåtlutning: tan(lutning) = v²·krökning/g. Vänstersväng (h ökar) lutar åt vänster.
  const lean=-Math.sign(curv)*Math.min(.7,Math.atan(tubeV*tubeV*Math.abs(curv)/9.8));
  tubeLean+=(lean-tubeLean)*(1-Math.exp(-6*dt));
  heading=h;camHeading=h;
  roll+=tubeV*dt/R;
  hamster.rotation.set(roll,h,tubeLean);
  if(tubeS>=tubeLen)exitTube();
}


// Kamera bakom och lite ovanför kulan
const CAM_BACK=2.6, CAM_UP=1.85, LOOK_AHEAD=2.2;
function placeCamera(h){
  cam.up.set(0,1,0);
  const by=ball.position.y;
  if(inTube){
    // I röret åker kameran med inne i röret, en bit bakom kulan
    const BACK=1.9, u=tubeS/tubeLen, tg=tubeCurve.getTangentAt(u);
    const p=tubeCurve.getPointAt(Math.max(0,tubeS-BACK)/tubeLen);
    if(tubeS<BACK){const [fx,fz]=fwdOf(hIn);p.x-=fx*(BACK-tubeS);p.z-=fz*(BACK-tubeS)}
    cam.position.set(p.x,p.y+.3,p.z);
    camLook.set(bx+tg.x*.8,by+.05+tg.y*.8,bz+tg.z*.8);
  }else{
    const [fx,fz]=fwdOf(h);
    cam.position.set(bx-fx*CAM_BACK,by-R+CAM_UP,bz-fz*CAM_BACK);
    camLook.set(bx+fx*LOOK_AHEAD,by-R+.25,bz+fz*LOOK_AHEAD);
  }
  if(camBlend>0){const e=easeInOut(camBlend);cam.position.lerp(blendFrom.p,e);camLook.lerp(blendFrom.t,e)}
  cam.lookAt(camLook);
}
const easeInOut=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;

// ---------- Kollision ----------
function resolveAxis(axis,newVal){
  const testX = axis==='x'?newVal:bx;
  const testZ = axis==='z'?newVal:bz;
  for(const c of levelColliders[level]){
    if(Math.abs(testX-c.x)<c.hx+R && Math.abs(testZ-c.z)<c.hz+R){
      return false;
    }
  }
  return true;
}

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
ren.domElement.addEventListener('touchstart',e=>{if(useOrientation)return;dragActive=true},{passive:true});
ren.domElement.addEventListener('touchmove',e=>{
  if(useOrientation||!dragActive)return;
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
  hint('Luta framåt för att rulla. Luta åt sidan vid en öppning för att svänga.',7000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');
  useKeyboard=true;playing=true;startTime=performance.now();
  hint(touch?'Dra uppåt för att rulla framåt, åt sidan för att svänga.':'Pil upp/W rullar framåt. Vänster/höger svänger in i sidogångar. M visar kartan.',7000);
};

// ---------- Kartvy: hela labyrinten rakt uppifrån ----------
// Kartan vrids så att hamsterns riktning framåt pekar uppåt på skärmen.
// Spelet pausas medan kartan visas.
const MAP_TIME=.6;
let mapOn=false,mapT=0;
const marker=new THREE.Mesh(new THREE.TorusGeometry(1,.14,10,40),new THREE.MeshBasicMaterial({color:0xff5fa2,transparent:true}));
marker.rotation.x=Math.PI/2;marker.visible=false;scene.add(marker);
function toggleMap(){
  if(!playing||won||inTube)return;
  mapOn=!mapOn;$('mapBtn').classList.toggle('on',mapOn);
  $('mapBtn').setAttribute('aria-pressed',mapOn);
}
$('mapBtn').onclick=toggleMap;
addEventListener('keydown',e=>{if(e.code==='KeyM')toggleMap()});
function applyMap(t,time){
  const e=easeInOut(t);
  scene.fog.near=18+e*200;scene.fog.far=42+e*240;
  marker.visible=t>0;
  for(const o of levelObjs[0])o.visible=!(level===1&&t>0); // dölj övre våningen när man tittar på den nedre
  if(t<=0)return;
  const B=levelBounds[level], fy=levelY[level];
  marker.position.set(bx,fy+.06,bz);
  marker.scale.setScalar(1+.15*Math.sin(time*6));
  marker.material.opacity=e;
  const [fx,fz]=fwdOf(camHeading);
  // Hur högt kameran måste vara för att hela labyrinten ska synas
  const alongZ=Math.abs(fz)>Math.abs(fx);
  const vert=(alongZ?B.d:B.w)/2+CELL, horiz=(alongZ?B.w:B.d)/2+CELL;
  const half=Math.max(vert,horiz/cam.aspect);
  const H=half/Math.tan(THREE.MathUtils.degToRad(cam.fov/2));
  const from=cam.position.clone(), fromTarget=camLook.clone();
  cam.position.lerpVectors(from,new THREE.Vector3(B.cx,fy+H,B.cz),e);
  const target=fromTarget.lerp(new THREE.Vector3(B.cx,fy,B.cz),e);
  cam.up.set(fx*e,1-e,fz*e).normalize();
  cam.lookAt(target);
}

placeCamera(heading);

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  if(playing&&!won&&!mapOn){
    let ax=0,az=0;
    if(useOrientation){ax=tiltX;az=tiltZ}
    if(useKeyboard){
      ax+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
      az+=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    }
    if(dragActive){ax+=dragX;az+=dragZ}
    ax=Math.max(-1,Math.min(1,ax));az=Math.max(-1,Math.min(1,az));

    if(inTube){tubeStep(dt,-az)}else{
    // Styrningen är relativ till kulans riktning: framåt/bakåt längs riktningen, sidled vinkelrätt.
    // Under en sväng gäller den gamla riktningen tills svängen är klar.
    const [fx,fz]=fwdOf(heading),[rx,rz]=rightOf(heading);
    const inFwd=-az, inSide=ax;
    // Farten följer lutningen: kulan strävar mot MAX_SPEED gånger lutningen (0–1)
    const inLen=Math.max(1,Math.hypot(inFwd,inSide));
    const tvx=(fx*inFwd+rx*inSide)/inLen*MAX_SPEED, tvz=(fz*inFwd+rz*inSide)/inLen*MAX_SPEED;
    const grip=1-Math.exp(-GRIP*dt);
    vx+=(tvx-vx)*grip; vz+=(tvz-vz)*grip;

    const nx=bx+vx*dt;
    if(resolveAxis('x',nx))bx=nx; else vx=0;
    const nz=bz+vz*dt;
    if(resolveAxis('z',nz))bz=nz; else vz=0;
    ball.position.set(bx,levelY[level]+R,bz);
    if(level===0&&Math.hypot(bx-ax0,bz-az0)<.5)enterTube();

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
      const p=turn.t, d=turn.to-turn.from, env=Math.sin(Math.PI*p);
      camHeading=turn.from+d*easeInOut(p);
      faceH=turn.from+d*(p+.09*Math.sin(2*Math.PI*3*p)*env);
      rock=.22*Math.sin(2*Math.PI*3*p)*env;
      roll=turn.roll0*(1-easeInOut(p));
      if(p>=1){heading=turn.to;camHeading=heading;faceH=heading;roll=0;turn=null}
    }else{
      camHeading=heading;
      roll+=(vx*fx+vz*fz)*dt/R;
    }
    if(!inTube)hamster.rotation.set(roll,faceH,rock);
    }

    goalRing.rotation.z=time*1.5;

    if(level===1&&!inTube&&Math.hypot(bx-gx,bz-gz)<0.65){
      won=true;
      const secs=((performance.now()-startTime)/1000).toFixed(1);
      $('timeText').textContent=`Tid: ${secs} sekunder`;
      $('win').classList.remove('hide');
    }
  }
  mapT=Math.max(0,Math.min(1,mapT+(mapOn?1:-1)*dt/MAP_TIME));
  camBlend=Math.max(0,camBlend-dt/.6);
  if(playing||won){placeCamera(camHeading);applyMap(mapT,time)}
  ren.render(scene,cam);
}
loop();
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
