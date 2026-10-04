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
// Hamstern är fångad i en genomskinlig kub med N×N×N rutor. Gångarna går kors och tvärs
// i alla tre riktningar. Tyngdkraften drar alltid rakt nedåt i världen: hamstern rullar på
// det som just nu är golv och kan varken ramla eller klättra. För att ta sig vidare genom
// ett hål i golvet eller ett schakt i taket vrider man hela kuben 90°.
const N=4, CELL=1.9, WALLT=0.08, R=0.42;
const HALF=N*CELL/2;
const LIM=CELL/2-WALLT/2-R;   // hur långt från rutans mitt kulan når innan den slår i en vägg
let seed=4242;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

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
// open[ruta][riktning]: 0 = vägg, 1 = gång, 'exit' = utgången, 'tube' = glasröret
const open=Array.from({length:N*N*N},()=>Array(6).fill(0));

// Slumpad gång genom hela kuben (djupet först). Gången fortsätter gärna rakt fram.
const START=[0,0,0];
(function carve(){
  const vis=new Set([cid(...START)]);
  const stack=[{c:START,last:-1}];
  while(stack.length){
    const top=stack[stack.length-1];
    const opts=[];
    for(let d=0;d<6;d++){const n=neighbor(top.c,d);if(inside(n)&&!vis.has(cid(...n)))opts.push(d)}
    if(!opts.length){stack.pop();continue}
    let d=opts[Math.floor(rnd()*opts.length)];
    if(opts.includes(top.last)&&rnd()<.45)d=top.last;
    const n=neighbor(top.c,d);
    open[cid(...top.c)][d]=1;open[cid(...n)][d^1]=1;
    vis.add(cid(...n));stack.push({c:n,last:d});
  }
})();
function bfs(from){
  const dist=new Map([[cid(...from),0]]);const q=[from];
  while(q.length){
    const c=q.shift();
    for(let d=0;d<6;d++){
      if(open[cid(...c)][d]!==1)continue;
      const n=neighbor(c,d),k=cid(...n);
      if(!dist.has(k)){dist.set(k,dist.get(cid(...c))+1);q.push(n)}
    }
  }
  return dist;
}
const dist=bfs(START);
const boundaryDirs=c=>[0,1,2,3,4,5].filter(d=>!inside(neighbor(c,d)));

// Utgången: på kubens yta, i den ruta som ligger längst bort från start
let exitCell=null,exitDir=-1,exitDist=-1;
for(const [k,v] of dist){
  const c=cellOfId(k),b=boundaryDirs(c);
  if(b.length&&v>exitDist){exitDist=v;exitCell=c;exitDir=b[Math.floor(rnd()*b.length)]}
}
open[cid(...exitCell)][exitDir]='exit';

// Glasröret: en genväg utanför kuben mellan två rutor på samma sida av kuben,
// från en bit in på vägen till en ruta en god bit närmare utgången.
let tubeA=null,tubeB=null;
{
  let bestScore=-1;
  for(const [ka,va] of dist){
    if(va<2||va>4)continue;
    const a=cellOfId(ka);
    for(const da of boundaryDirs(a)){
      if(open[ka][da])continue;
      for(const [kb,vb] of dist){
        if(vb<va+5||vb>exitDist-2)continue;
        const b=cellOfId(kb);
        if(!boundaryDirs(b).includes(da)||open[kb][da])continue;
        if(vb-va>bestScore){bestScore=vb-va;tubeA={c:a,d:da};tubeB={c:b,d:da}}
      }
    }
  }
  if(tubeA){open[cid(...tubeA.c)][tubeA.d]='tube';open[cid(...tubeB.c)][tubeB.d]='tube'}
}

// ---------- Kubens utseende ----------
const cube=new THREE.Group();scene.add(cube);
const wallMats=[0,1,2].map(()=>new THREE.MeshPhysicalMaterial({color:0x4fc3ff,transparent:true,opacity:.16,roughness:.15,clearcoat:1,side:THREE.DoubleSide,depthWrite:false}));
const floorMat=new THREE.MeshStandardMaterial({color:0x2a6a96,transparent:true,opacity:.45,roughness:.6,side:THREE.DoubleSide,depthWrite:false});
// Väggar och golv är tunna glasskivor, en InstancedMesh per axel så att golvet kan få eget utseende
const facePos=[[],[],[]];
const edgePts=[];
for(let k=0;k<N*N*N;k++){
  const c=cellOfId(k);
  for(let d=0;d<6;d++){
    const [a,s]=DIRS[d];
    if(s<0&&inside(neighbor(c,d)))continue;     // inre ytor räknas bara en gång
    if(open[k][d])continue;
    const p=center(c).addScaledVector(dirVec(d),CELL/2);
    facePos[a].push(p);
    // kantlinjer runt skivan
    const [b1,b2]=[0,1,2].filter(x=>x!==a), h=CELL/2;
    const corner=(u,v)=>p.clone().setComponent(b1,p.getComponent(b1)+u*h).setComponent(b2,p.getComponent(b2)+v*h);
    const cs=[corner(-1,-1),corner(1,-1),corner(1,1),corner(-1,1)];
    for(let i=0;i<4;i++)edgePts.push(cs[i],cs[(i+1)%4]);
  }
}
const panelMesh=[0,1,2].map(a=>{
  const size=[CELL,CELL,CELL];size[a]=WALLT;
  const m=new THREE.InstancedMesh(new THREE.BoxGeometry(...size),wallMats[a],facePos[a].length);
  const o=new THREE.Object3D();
  facePos[a].forEach((p,i)=>{o.position.copy(p);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
  m.receiveShadow=true;cube.add(m);return m;
});
cube.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePts),new THREE.LineBasicMaterial({color:0x8fe3ff,transparent:true,opacity:.4})));
cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2*HALF+.06,2*HALF+.06,2*HALF+.06)),new THREE.LineBasicMaterial({color:0xcff4ff})));

// Utgången: en guldring på kubens yta
const exitN=dirVec(exitDir), exitPos=center(exitCell).addScaledVector(exitN,CELL/2);
const exitRing=new THREE.Mesh(new THREE.TorusGeometry(.72,.08,12,32),new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.9}));
exitRing.position.copy(exitPos);exitRing.lookAt(exitPos.clone().add(exitN));cube.add(exitRing);
const exitGlow=new THREE.PointLight(0xffd166,1.4,6);exitGlow.position.copy(exitPos).addScaledVector(exitN,.8);cube.add(exitGlow);

// Glasröret utanför kuben
const TUBE_R=.56;
let tubeCurve=null,tubeLen=0,tubeN=null,tubePa=null,tubePb=null;
if(tubeA){
  tubeN=dirVec(tubeA.d);
  tubePa=center(tubeA.c).addScaledVector(tubeN,CELL/2);
  tubePb=center(tubeB.c).addScaledVector(tubeN,CELL/2);
  const mid=tubePa.clone().add(tubePb).multiplyScalar(.5).addScaledVector(tubeN,2.4);
  tubeCurve=new THREE.CatmullRomCurve3([tubePa,tubePa.clone().addScaledVector(tubeN,1.1),mid,tubePb.clone().addScaledVector(tubeN,1.1),tubePb],false,'centripetal');
  tubeLen=tubeCurve.getLength();
  cube.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,200,TUBE_R,20,false),
    new THREE.MeshPhysicalMaterial({color:0xbfefff,transparent:true,opacity:.2,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false})));
  const frameMat=new THREE.MeshStandardMaterial({color:0x8fe3ff,roughness:.3,metalness:.2});
  const frameGeo=new THREE.TorusGeometry(TUBE_R+.02,.035,8,28);
  for(let i=0;i<=8;i++){
    const u=i/8,p=tubeCurve.getPointAt(u);
    const ring=new THREE.Mesh(frameGeo,frameMat);
    ring.position.copy(p);ring.lookAt(p.clone().add(tubeCurve.getTangentAt(u)));cube.add(ring);
  }
}

// Hål och schakt (öppningar i nuvarande golv- och takriktning) markeras med blå ringar
const holeMarks=new THREE.Group();cube.add(holeMarks);
const holeMat=new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1});
const holeGeo=new THREE.TorusGeometry(.62,.045,8,32);

// ---------- Tyngdkraften ----------
// baseQ är kubens vridning. ga/gs är tyngdkraftens axel och tecken i kubens egna koordinater.
// up, ex och ez är kubens egna riktningar för upp och för golvplanet (ex × up = ez).
const baseQ=new THREE.Quaternion();
let ga=1,gs=-1;
const up=new THREE.Vector3(),ex=new THREE.Vector3(),ez=new THREE.Vector3();
const axisOf=v=>Math.abs(v.x)>.5?0:Math.abs(v.y)>.5?1:2;
const planeAxes=()=>[0,1,2].filter(a=>a!==ga);
function updateGravity(){
  const d=new THREE.Vector3(0,-1,0).applyQuaternion(baseQ.clone().invert());
  ga=axisOf(d);gs=Math.sign(d.getComponent(ga));
  up.set(0,0,0).setComponent(ga,-gs);
  ex.set(0,0,0).setComponent(ga===0?1:0,1);
  ez.crossVectors(ex,up);
  for(let a=0;a<3;a++)panelMesh[a].material=a===ga?floorMat:wallMats[a];
  holeMarks.clear();
  for(let k=0;k<N*N*N;k++){
    const c=cellOfId(k);
    for(const s of [1,-1]){
      const d=dirIndex(ga,s);
      if(open[k][d]!==1||(s<0&&inside(neighbor(c,d))))continue;
      const ring=new THREE.Mesh(holeGeo,holeMat);
      ring.position.copy(center(c)).addScaledVector(dirVec(d),CELL/2);
      ring.rotation.set(ga===1?Math.PI/2:0,ga===0?Math.PI/2:0,0);
      holeMarks.add(ring);
    }
  }
}
const vertOpen=c=>!!(open[cid(...c)][dirIndex(ga,1)]||open[cid(...c)][dirIndex(ga,-1)]);
const floorCoord=c=>coordOf(c[ga])+gs*(CELL/2-WALLT/2-R);
const cellOf=p=>[0,1,2].map(a=>Math.max(0,Math.min(N-1,Math.floor(p.getComponent(a)/CELL+N/2))));
updateGravity();

// ---------- Kula ----------
const hamsterTex=new THREE.TextureLoader().load(hamsterTexUrl);
hamsterTex.colorSpace=THREE.SRGBColorSpace;
// Kulan är hamstern själv och ligger i kubens koordinater, så den följer med när kuben vrids.
const ball=new THREE.Group();cube.add(ball);
const hamsterMat=new THREE.MeshStandardMaterial({map:hamsterTex,roughness:.75});
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
let heading=(()=>{
  for(const a of planeAxes())for(const s of [1,-1])if(open[cid(...START)][dirIndex(a,s)]===1)return angleOf(dirVec(dirIndex(a,s)));
  return 0;
})();
let turn=null;          // {from,to,t} medan kulan svänger
let turnArmed=true;     // sidlutningen måste släppas innan nästa sväng
let sideTime=0;         // hur länge kulan rört sig mest åt sidan
let camHeading=heading;
let lastCellKey=cid(...START), hold=0;   // hold: kulan står still vid ett hål en kort stund

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
  p.copy(center(end.c)).addScaledVector(n,CELL/2-.5);
  lastCellKey=cid(...end.c);
  if(Math.abs(n.dot(up))<.5){heading=angleOf(n.clone().negate());const [fx,fz]=fwdOf(heading);vx=fx*tubeV*.7;vz=fz*tubeV*.7}
  else{vx=vz=0}
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

// ---------- Kamera ----------
const CAM_BACK=2.6, CAM_UP=1.85, LOOK_AHEAD=2.2;
const toWorld=v=>cube.localToWorld(v.clone());
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
    const f=fwd3(camHeading).applyQuaternion(cube.quaternion);f.y=0;
    if(f.lengthSq()<1e-4)f.set(0,0,1);f.normalize();
    cam.position.set(bw.x-f.x*CAM_BACK,bw.y-R+CAM_UP,bw.z-f.z*CAM_BACK);
    camLook.set(bw.x+f.x*LOOK_AHEAD,bw.y-R+.25,bw.z+f.z*LOOK_AHEAD);
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
  hint('Luta framåt för att rulla, åt sidan för att svänga. Vid ett hål: zooma ut och vrid kuben.',7000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');
  useKeyboard=true;playing=true;startTime=performance.now();
  hint(touch?'Dra uppåt för att rulla framåt, åt sidan för att svänga.':'Pil upp/W rullar framåt. Vänster/höger svänger. M zoomar ut. Dra i kugghjulen med musen för att vrida kuben.',7000);
};

// ---------- Utzoomat läge: hela kuben rakt uppifrån ----------
// Spelet pausas medan man tittar utifrån. Bara här syns kugghjulen.
const MAP_TIME=.6;
let mapOn=false,mapT=0;
const marker=new THREE.Mesh(new THREE.TorusGeometry(.8,.12,10,40),new THREE.MeshBasicMaterial({color:0xff5fa2,transparent:true,depthTest:false}));
marker.rotation.x=Math.PI/2;marker.renderOrder=10;marker.visible=false;scene.add(marker);
// Rutorna som hålet eller schaktet leder till lyser när man kan vrida
const targetMat=new THREE.LineBasicMaterial({color:0xffd166,transparent:true});
const targetBoxes=[0,1].map(()=>{const b=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL*.9,CELL*.9,CELL*.9)),targetMat);b.visible=false;cube.add(b);return b});
const canRotate=()=>playing&&!won&&!inTube&&vertOpen(cellOf(p));
function toggleMap(){
  if(!playing||won||inTube||rot)return;
  mapOn=!mapOn;$('mapBtn').classList.toggle('on',mapOn);
  $('mapBtn').setAttribute('aria-pressed',mapOn);
}
$('mapBtn').onclick=toggleMap;
addEventListener('keydown',e=>{if(e.code==='KeyM')toggleMap()});
function applyMap(t,time){
  const e=easeInOut(t);
  scene.fog.near=18+e*200;scene.fog.far=42+e*240;
  // Utifrån blir golven svagare, annars lägger sig alla våningar på varandra och kuben ser ogenomskinlig ut
  floorMat.opacity=.42-.32*e;
  for(const m of wallMats)m.opacity=.16-.06*e;
  $('hint').style.visibility=t>0?'hidden':'visible';
  marker.visible=t>0;
  const showTargets=t>0&&canRotate();
  const c=cellOf(p);
  [1,-1].forEach((s,i)=>{
    const d=dirIndex(ga,s),n=neighbor(c,d);
    targetBoxes[i].visible=showTargets&&open[cid(...c)][d]===1&&inside(n);
    if(targetBoxes[i].visible)targetBoxes[i].position.copy(center(n));
  });
  targetMat.opacity=.55+.45*Math.sin(time*5);
  if(t<=0)return;
  const bw=toWorld(p);
  marker.position.set(bw.x,bw.y-R+.06,bw.z);
  marker.scale.setScalar(1+.15*Math.sin(time*6));
  marker.material.opacity=e;
  // Så högt att hela kuben syns även när den vrids
  const rad=HALF*1.8;
  const H=rad/Math.tan(THREE.MathUtils.degToRad(cam.fov/2))/Math.min(1,cam.aspect)+HALF;
  const from=cam.position.clone(), fromTarget=camLook.clone();
  cam.position.lerpVectors(from,new THREE.Vector3(0,H,0),e);
  const target=fromTarget.lerp(new THREE.Vector3(0,0,0),e);
  cam.up.set(0,1-e,-e).normalize();   // uppifrån: skärmens uppåt är världens -z
  cam.lookAt(target);
}

// ---------- Kugghjulen: vrid kuben 90° ----------
// Höger kugghjul vrider runt världens x-axel (framåt/bakåt), det nedre runt z-axeln (vänster/höger).
// Kuben följer tummen. Släpper man efter halva vägen fullbordas vridningen, annars fjädrar den tillbaka.
const ROT_PX=150;      // så många pixlar motsvarar 90°
let rot=null;          // {axis, ang, target}
function setupGear(el,axis,vertical,sign){
  let start=null;
  el.addEventListener('pointerdown',e=>{
    if(!el.classList.contains('active')||rot)return;
    el.setPointerCapture(e.pointerId);
    start=vertical?e.clientY:e.clientX;
    rot={axis,ang:0,target:null};
  });
  el.addEventListener('pointermove',e=>{
    if(start===null)return;
    const px=(vertical?e.clientY:e.clientX)-start;
    rot.ang=Math.max(-1,Math.min(1,px/ROT_PX))*sign*Math.PI/2;
    el.firstElementChild.style.backgroundPosition=vertical?`0 ${px}px`:`${px}px 0`;
  });
  const end=()=>{
    if(start===null)return;
    start=null;
    rot.target=Math.abs(rot.ang)>Math.PI/4?Math.sign(rot.ang)*Math.PI/2:0;
  };
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
setupGear($('gearR'),new THREE.Vector3(1,0,0),true,1);
setupGear($('gearB'),new THREE.Vector3(0,0,1),false,-1);
function snapQuat(q){
  _m.makeRotationFromQuaternion(q);
  for(let i=0;i<16;i++)_m.elements[i]=Math.round(_m.elements[i]);
  return q.setFromRotationMatrix(_m);
}
// Efter en vridning: hamstern stannar i sin ruta och landar på rutans nya golv.
// Den vänds mot öppningen som hålet eller schaktet nu har blivit.
function afterRotation(oldUp,oldFwd){
  const c=cellOf(p),k=cid(...c);
  const cands=[oldUp.clone().negate(),oldUp.clone()];
  const into=cands.find(v=>open[k][dirIndex(axisOf(v),Math.sign(v.getComponent(axisOf(v))))]);
  const f=into||(Math.abs(oldFwd.dot(up))<.5?oldFwd:cands[0]);
  heading=angleOf(f);camHeading=heading;
  vx=vz=0;turn=null;turnArmed=false;sideTime=0;hold=0;lastCellKey=k;
}
function updateRotation(dt){
  if(!rot)return;
  if(rot.target!==null){
    rot.ang+=(rot.target-rot.ang)*Math.min(1,dt*9);
    if(Math.abs(rot.target-rot.ang)<.01)rot.ang=rot.target;
  }
  cube.quaternion.setFromAxisAngle(rot.axis,rot.ang).multiply(baseQ);
  if(rot.target!==null&&rot.ang===rot.target){
    if(rot.target!==0){
      const oldUp=up.clone(),oldFwd=fwd3(heading);
      baseQ.copy(snapQuat(cube.quaternion.clone()));
      updateGravity();
      afterRotation(oldUp,oldFwd);
    }
    cube.quaternion.copy(baseQ);
    for(const g of ['gearR','gearB'])$(g).firstElementChild.style.backgroundPosition='0 0';
    rot=null;
  }
}

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
    const c=cellOf(p),k=cid(...c);
    // Ny ruta med hål i golvet eller schakt i taket: stanna en kort stund mitt i rutan
    if(k!==lastCellKey){
      lastCellKey=k;
      if(vertOpen(c)){
        hold=.7;vx=vz=0;
        if(turn){heading=turn.to;camHeading=heading;turn=null}
        hint('Ett hål! Zooma ut med kubknappen och vrid kuben med kugghjulen.',4000);
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

    // Rörelse i golvplanet, stoppad av rutans stängda väggar
    p.addScaledVector(ex,vx*dt).addScaledVector(ez,vz*dt);
    const cc=cellOf(p),kk=cid(...cc);
    for(const a of planeAxes()){
      const off=p.getComponent(a)-coordOf(cc[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM)continue;
        const kind=open[kk][dirIndex(a,s)];
        if(!kind){
          p.setComponent(a,coordOf(cc[a])+s*LIM);
          if(a===axisOf(ex))vx=0; else vz=0;
        }else if(s*off>.5&&kind==='exit'){win()}
        else if(s*off>.5&&kind==='tube'){
          enterTube(tubeA&&cid(...tubeA.c)===kk&&tubeA.d===dirIndex(a,s));
        }
      }
    }
    if(!inTube){
    // Kulan sjunker mjukt ner till golvet (t.ex. efter en vridning)
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
  mapT=Math.max(0,Math.min(1,mapT+(mapOn?1:-1)*dt/MAP_TIME));
  camBlend=Math.max(0,camBlend-dt/.6);
  // Kugghjulen syns bara utzoomat och lyser när hamstern står vid ett hål eller schakt
  const rotOk=canRotate();
  for(const g of ['gearR','gearB']){$(g).classList.toggle('hide',!(mapOn&&mapT>.9));$(g).classList.toggle('active',rotOk)}
  $('mapBtn').classList.toggle('pulse',rotOk&&!mapOn);
  if(playing||won){placeCamera();applyMap(mapT,time)}
  ren.render(scene,cam);
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
