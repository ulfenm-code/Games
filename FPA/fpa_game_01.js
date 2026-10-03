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

// Golv
const mazeW=(COLS-1)*CELL, mazeD=(ROWS-1)*CELL;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(mazeW+6,mazeD+6),new THREE.MeshStandardMaterial({color:0x0c1f33,roughness:.9}));
floor.rotation.x=-Math.PI/2;floor.position.set(mazeW/2,-0.02,mazeD/2);floor.receiveShadow=true;scene.add(floor);

// Mål
const [gx,gz]=originOf(END[0],END[1]);
const goalGlow=new THREE.PointLight(0xffd166,1.2,8);goalGlow.position.set(gx,1.2,gz);scene.add(goalGlow);
const goalRing=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,12,24),new THREE.MeshStandardMaterial({color:0xffd166,emissive:0xffd166,emissiveIntensity:.6}));
goalRing.rotation.x=Math.PI/2;goalRing.position.set(gx,.05,gz);scene.add(goalRing);

// ---------- Kula ----------
const [sx0,sz0]=originOf(START[0],START[1]);
const hamsterTex=new THREE.TextureLoader().load(hamsterTexUrl);
hamsterTex.colorSpace=THREE.SRGBColorSpace;
const ballMat=new THREE.MeshStandardMaterial({map:hamsterTex,roughness:.75});
const ball=new THREE.Mesh(new THREE.SphereGeometry(R,28,28),ballMat);
ball.castShadow=true;ball.position.set(sx0,R,sz0);scene.add(ball);
let bx=sx0,bz=sz0,vx=0,vz=0;

// Kamera följer
cam.position.set(sx0,8,sz0+6);

// ---------- Kollision ----------
function resolveAxis(axis,newVal){
  const testX = axis==='x'?newVal:bx;
  const testZ = axis==='z'?newVal:bz;
  for(const c of colliders){
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
  tiltX = Math.max(-1,Math.min(1,(gamma-baseGamma)/15));
  tiltZ = Math.max(-1,Math.min(1,(beta-baseBeta)/15));
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
  dragX=Math.max(-1,Math.min(1,(t.clientX-cx)/120));
  dragZ=Math.max(-1,Math.min(1,(t.clientY-cy)/120));
},{passive:true});
ren.domElement.addEventListener('touchend',()=>{dragActive=false;dragX=0;dragZ=0});

function hint(t,ms=5000){const h=$('hint');h.textContent=t;h.style.opacity=1;clearTimeout(hint.t);hint.t=setTimeout(()=>h.style.opacity=0,ms)}

let playing=false,won=false,startTime=0;
$('go').onclick=()=>{
  $('start').classList.add('hide');
  enableOrientation();
  playing=true;startTime=performance.now();
  hint('Smala gångar kräver små, försiktiga rörelser.',6000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');
  useKeyboard=true;playing=true;startTime=performance.now();
  hint(touch?'Dra med fingret på skärmen för att styra.':'Styr med piltangenterna eller WASD.',7000);
};

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  if(playing&&!won){
    let ax=0,az=0;
    if(useOrientation){ax=tiltX;az=tiltZ}
    if(useKeyboard){
      ax+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
      az+=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    }
    if(dragActive){ax+=dragX;az+=dragZ}
    ax=Math.max(-1,Math.min(1,ax));az=Math.max(-1,Math.min(1,az));

    const accel=9.5;
    vx+=ax*accel*dt; vz+=az*accel*dt;
    vx*=0.90; vz*=0.90;

    const nx=bx+vx*dt;
    if(resolveAxis('x',nx))bx=nx; else vx=0;
    const nz=bz+vz*dt;
    if(resolveAxis('z',nz))bz=nz; else vz=0;

    ball.position.set(bx,R,bz);
    const spin=Math.hypot(vx,vz)/R;
    ball.rotation.x+=vz*dt/R*1.0;
    ball.rotation.z-=vx*dt/R*1.0;

    cam.position.x+=(bx-cam.position.x)*Math.min(1,dt*3.5);
    cam.position.z+=(bz+6-cam.position.z)*Math.min(1,dt*3.5);
    cam.position.y=8;
    cam.lookAt(bx,0,bz);

    goalRing.rotation.z=time*1.5;

    if(Math.hypot(bx-gx,bz-gz)<0.65){
      won=true;
      const secs=((performance.now()-startTime)/1000).toFixed(1);
      $('timeText').textContent=`Tid: ${secs} sekunder`;
      $('win').classList.remove('hide');
    }
  }
  ren.render(scene,cam);
}
loop();
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
