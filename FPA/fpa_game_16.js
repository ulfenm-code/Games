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

// ---------- Banorna (handbyggda) ----------
// Varje gång har ett golv (en riktning i kubens egna koordinater) och en rad rutor. Rutor i samma gång
// som ligger bredvid varandra hänger ihop, så flera rutor bredvid varandra blir en öppen yta.
// links: hål (i golvet) och schakt (i taket) mellan gångar. curves: svängda gångar mellan två rutors
// sidor, runt en mittpunkt. pits: runda hål mitt i golvet, blå (fastnar halvvägs) eller röda (kostar ett liv).
// Riktningar: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
const LEVELS={
  training:{
    name:'Training Cube', hs:'ovning', N:5,
    segs:[
      {floor:3, cells:[[0,4,0],[1,4,0],[2,4,0],[3,4,0],[4,4,0],[4,4,1],[4,4,2]]},
      {floor:1, cells:[[4,3,2],[4,2,2],[4,1,2],[4,0,2],[4,0,3],[4,0,4]]},
      {floor:4, cells:[[3,0,4],[2,0,4],[1,0,4],[0,0,4],[0,1,4],[0,2,4]]},
      {floor:3, cells:[[0,2,3],[0,2,2],[0,2,1],[0,2,0]]},
      {floor:3, cells:[[4,2,0],[4,2,1],[3,2,1],[2,2,1],[2,2,2],[2,2,3]]},
      {floor:0, cells:[[2,1,3],[2,0,3],[2,0,2],[2,0,1],[2,0,0]]},
    ],
    start:[0,1],
    links:[[[4,4,2],[4,3,2],'hole'],[[4,0,4],[3,0,4],'hole'],[[0,2,4],[0,2,3],'shaft'],[[2,2,3],[2,1,3],'hole']],
    tube:{a:{c:[0,2,0],d:5},b:{c:[4,2,0],d:5}},
    curves:[], pits:[],
    exit:{c:[2,0,0],d:5},
  },
  twist:{
    name:'Twist & Turn', hs:'twist', N:6,
    segs:[
      // överst: startgång, delning, två svängda gångar, och en öppen yta med hål
      {floor:3, cells:[[0,5,0],[1,5,0],[2,5,0],[3,5,0],[2,5,1],
                       [5,5,2],[5,5,3],[5,5,4],[5,5,5],[4,5,5],[3,5,5],[2,5,5],
                       [0,5,2],[1,5,2],[0,5,3],[1,5,3],[0,5,4],[1,5,4],[0,5,5],[1,5,5]]},
      // ner längs kubens vänstra vägg, med ett schakt
      {floor:1, cells:[[0,4,2],[0,3,2],[0,2,2],[0,1,2],[0,0,2],[0,0,3],[0,0,4],[0,0,5]]},
      // längst ner, fram till utgången
      // längst ner: sidogång till hamsterhjulet, två eldörrar och utgången
      {floor:3, cells:[[1,0,4],[1,0,3],[1,0,2],[2,0,4],[3,0,4],[4,0,4],[5,0,4]]},
    ],
    start:[0,1],
    links:[[[0,0,4],[1,0,4],'shaft']],
    tube:null,
    curves:[
      {a:{c:[2,5,1],d:4}, b:{c:[5,5,4],d:1}, center:[4.5,5,1.5]},   // vänster gren: stor sväng
      {a:{c:[3,5,0],d:0}, b:{c:[5,5,2],d:5}, center:[3.5,5,1.5]},   // höger gren: liten sväng
    ],
    pits:[{c:[1,5,4],kind:'red'},{c:[0,5,3],kind:'red'},{c:[0,5,2],kind:'blue'}],
    wheel:{c:[1,0,2],axis:0},                                  // hamsterhjulet, axeln längs x
    doors:[{a:[2,0,4],b:[3,0,4]},{a:[4,0,4],b:[5,0,4]}],       // eldörrar mellan rutorna a och b
    exit:{c:[5,0,4],d:0},
  },
};
const LEVEL_ID=(()=>{const q=new URLSearchParams(location.search).get('level');return LEVELS[q]?q:'training'})();
const LV=LEVELS[LEVEL_ID];

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
const START=SEGS[LV.start[0]].cells[LV.start[1]];
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
  pitAt.set(k,{...P,floor:fd});
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
const passable=(k,d)=>{const o=open[k][d];return o==='door'?doorAt(k,d).isOpen:!!o};
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
  return {...C,i,curve,arc,len:curve.getLength(),arcLen:arc.getLength(),floor:fd,up:dirVec(fd^1)};
});
const curveAt=(c,d)=>{for(const C of CURVES){if(C.a.c+''===c+''&&C.a.d===d)return {C,end:0};if(C.b.c+''===c+''&&C.b.d===d)return {C,end:1}}return null};

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
const holeMat=new THREE.MeshStandardMaterial({color:0x5ad1ff,emissive:0x5ad1ff,emissiveIntensity:1});
const redMat=new THREE.MeshStandardMaterial({color:0xff4d5e,emissive:0xff3344,emissiveIntensity:1.1});
const cellGroups=new Map();      // ruta → grupp (för att kunna visa bara rutor nära hamstern)
const segFloors=SEGS.map(()=>[]);
// Ett golv med ett runt hål i mitten (platt skiva med hål), vänd mot riktningen d
function pitFloor(c,d){
  const s=CELL-2*PANEL_IN, sh=new THREE.Shape();
  sh.moveTo(-s/2,-s/2);sh.lineTo(s/2,-s/2);sh.lineTo(s/2,s/2);sh.lineTo(-s/2,s/2);sh.lineTo(-s/2,-s/2);
  const hole=new THREE.Path();hole.absarc(0,0,PIT_R,0,Math.PI*2,true);sh.holes.push(hole);
  const geo=new THREE.ShapeGeometry(sh,32);
  const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/s+.5,uv.getY(i)/s+.5);
  const m=new THREE.Mesh(geo,floorMat);
  const n=dirVec(d);
  m.position.copy(center(c)).addScaledVector(n,CELL/2-FLOOR_GAP);
  m.lookAt(m.position.clone().sub(n));     // skivans framsida uppåt, in i rutan
  m.receiveShadow=true;
  return m;
}
for(let k=0;k<N*N*N;k++){
  const si=cellSeg[k];if(si<0)continue;
  const c=cellOfId(k),g=new THREE.Group();cube.add(g);cellGroups.set(k,g);
  const pit=pitAt.get(k);
  for(let d=0;d<6;d++){
    const isFloor=d===SEGS[si].floor;
    if(pit&&isFloor){
      const m=pitFloor(c,d);g.add(m);segFloors[si].push(m);
      // ring runt hålet, och för röda hål en mörk grop under
      const n=dirVec(d), pos=center(c).addScaledVector(n,CELL/2-FLOOR_GAP-.01);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(PIT_R+.02,.05,10,40),pit.kind==='red'?redMat:holeMat);
      ring.position.copy(pos);ring.lookAt(pos.clone().add(n));g.add(ring);
      if(pit.kind==='red'){
        const well=new THREE.Mesh(new THREE.CylinderGeometry(PIT_R,PIT_R*.8,.9,32,1,true),new THREE.MeshStandardMaterial({color:0x2a0508,emissive:0x550a12,emissiveIntensity:.6,side:THREE.DoubleSide}));
        well.position.copy(pos).addScaledVector(n,.45);well.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);g.add(well);
        const glow=new THREE.PointLight(0xff3344,.8,3);glow.position.copy(pos).addScaledVector(n,-.3);g.add(glow);
      }
      continue;
    }
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
// Hamsterhjulet: ett stående hjul med pinnar, som snurrar när hamstern springer i det
let wheel=null;
if(LV.wheel){
  const W=LV.wheel, fd=SEGS[cellSeg[cid(...W.c)]].floor, upv=dirVec(fd^1), axisV=new THREE.Vector3().setComponent(W.axis,1);
  const WR=.95, floorPt=center(W.c).addScaledVector(dirVec(fd),CELL/2-FLOOR_GAP);
  const g=new THREE.Group();g.position.copy(floorPt).addScaledVector(upv,WR+.02);cube.add(g);
  const spin=new THREE.Group();g.add(spin);
  const rimMat=new THREE.MeshStandardMaterial({color:0xc9d6e3,metalness:.7,roughness:.3});
  // hjulets plan är vinkelrätt mot axeln
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axisV);
  for(const off of [-.45,.45]){
    const rim=new THREE.Mesh(new THREE.TorusGeometry(WR,.04,10,48),rimMat);rim.quaternion.copy(q);rim.position.copy(axisV).multiplyScalar(off);spin.add(rim);
    for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,2*WR,6),rimMat);
      sp.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),i*Math.PI/4));sp.position.copy(rim.position);spin.add(sp)}
  }
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2, rung=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.9,6),rimMat);
    rung.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axisV);
    const perp1=upv.clone(), perp2=new THREE.Vector3().crossVectors(axisV,upv);
    rung.position.copy(perp1).multiplyScalar(Math.cos(a)*WR).addScaledVector(perp2,Math.sin(a)*WR);spin.add(rung);
  }
  // ställning
  const standMat=new THREE.MeshStandardMaterial({color:0x7a8794,metalness:.5,roughness:.4});
  for(const off of [-.55,.55]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,WR+.02,8),standMat);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upv);
    leg.position.copy(axisV).multiplyScalar(off).addScaledVector(upv,-(WR+.02)/2);g.add(leg);}
  wheel={...W,group:g,spin,axisV,cellKey:cid(...W.c),floor:fd};
}

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
// Ansiktet sitter vid u≈0.43 i bilden, vilket på klotet motsvarar riktningen FACE.
const FACE=Math.atan2(-Math.cos(.43*2*Math.PI),Math.sin(.43*2*Math.PI));
hamsterBody.rotation.y=-FACE;
const fwdOf=h=>[Math.sin(h),Math.cos(h)];
const rightOf=h=>[-Math.cos(h),Math.sin(h)];
const fwd3=h=>ex.clone().multiplyScalar(Math.sin(h)).addScaledVector(ez,Math.cos(h));
const angleOf=v=>Math.atan2(v.dot(ex),v.dot(ez));
const MAX_SPEED=4.2, GRIP=4; // enheter/s vid full lutning, och hur snabbt farten hänger med
let heading=angleOf(dirVec(dirBetween(SEGS[0].cells[1],SEGS[0].cells[2])));
let turn=null;          // hopp: {from,to,t,roll0,kind} — kind 'turn' (tvär sväng) eller 'stop' (stannar)
let turnArmed=true;     // sidlutningen måste släppas innan nästa hopp-sväng
const HOP_TIME=.45, HOP_H=.32;            // hoppets längd i sekunder och höjd
// ---------- Inställningar (sparas i telefonen) ----------
const settings={dead:5,turn:6,brake:7,level:false};
try{Object.assign(settings,JSON.parse(localStorage.getItem('fpa_settings')||'{}'))}catch(err){}
const saveSettings=()=>{try{localStorage.setItem('fpa_settings',JSON.stringify(settings))}catch(err){}};
let hopY=0, landT=0;    // hoppets höjd just nu, och vickning efter landningen
let wasMoving=false;    // har rullat (för att känna igen ett stopp)
let stillTime=0;        // hur länge hamstern stått still efter att ha rullat (hoppar upp efter 1 s)
let standing=true;      // står still på fötterna: då går det att panorera
let faceSmooth=heading;       // nosens riktning, som följer riktningen med lite eftersläpning (vickning)
// Panorera: när hamstern står still på fötterna sveper man åt sidan på skärmen.
// Kameran går runt fritt, hamstern vickar runt och tittar dit, och det blir ny framåtriktning.
// (På en telefon utan lutningssensor används svep till att styra, så där går det inte att panorera.)
const PAN_RAD_PER_PX=.008;
const PITCH_MAX=THREE.MathUtils.degToRad(45), PITCH_MIN=-THREE.MathUtils.degToRad(30);
let camPitch=0;   // kamerans lutning upp/ner vid panorering; glider tillbaka till 0 när hamstern rullar
let panStart=null;
const canPan=()=>standing&&!turn&&mode==='roll'&&!inTube&&!inTrack&&!mapOn&&!settingsOpen&&playing&&!won&&!(touch&&!useOrientation)&&Math.hypot(vx,vz)<.3;
let sideTime=0;         // hur länge kulan rört sig mest åt sidan
let camHeading=heading;
let lastCellKey=cid(...START), hold=0;   // hold: kulan står still under ett schakt en kort stund
// Läge: 'roll' rullar på golvet, 'fall' faller ner i ett hål, 'throat' sitter fast halvvägs i ett hål
let mode='roll', throat=null, fallInfo=null, idle=0;

// Starta ett hopp. kind 'turn' vänder delta radianer, kind 'stop' ställer bara hamstern på fötterna.
function startHop(kind,delta){
  // kullerbyttan rätas upp till närmaste läge med fötterna nedåt
  const roll0=roll-2*Math.PI*Math.round(roll/(2*Math.PI));
  turn={from:heading,to:heading+delta,t:0,roll0,kind};
  standing=false;
}

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
  if(turn){heading=turn.to;turn=null;hopY=0}
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
  inTrack={C,s:s0,lat,vl,dir:end===0?1:-1,v:Math.max(1.2,speed),hPrev:null,lean:0};
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
  const T=inTrack,C=T.C, grip=1-Math.exp(-GRIP*dt);
  T.v+=(MAX_SPEED*inFwd-T.v)*grip;
  // sidled: luta åt höger = åt höger sett i färdriktningen (dir vänder sidan när man åker från b mot a)
  T.vl+=(MAX_SPEED*inSide*T.dir-T.vl)*grip;
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
  roll+=T.v*dt/R;
  poseHamster(tg,up,roll,T.lean);
}

// ---------- Röda hål och liv ----------
// Faller hamstern i ett rött hål försvinner ett liv. Efter 2 sekunder studsar den upp där den var
// innan hålet. När alla liv är slut blir det game over.
// ---------- Hamsterhjulet, batteriet och dörrarna ----------
// I hjulet springer hamstern när man lutar framåt. Det laddar batteriet (5 s full lutning).
// Batteriet räcker till en dörr. Kommer hamstern nära en stängd dörr med fullt batteri öppnas dörren
// och förblir öppen, batteriet töms och alla andra dörrar lyser rött igen.
const CHARGE_TIME=5, DOOR_REACH=1.5;
let charge=0, wheelSpin=0, wheelLock=0;
function enterWheel(){
  mode='wheel';vx=vz=0;
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  hint('In the wheel! Tilt forward to run and charge the battery. Tilt back to leave.',5000);
}
function wheelStep(dt,inFwd){
  // hamstern dras till hjulets botten och springer på stället
  const c=wheel.c;for(const a of planeAxes())p.setComponent(a,p.getComponent(a)+(coordOf(c[a])-p.getComponent(a))*Math.min(1,dt*8));
  p.setComponent(ga,floorCoord(c));
  const run=Math.max(0,inFwd);
  const before=charge;charge=Math.min(1,charge+run*dt/CHARGE_TIME);
  if(before<1&&charge>=1)hint('Fully charged! Go and open a door.',4000);
  wheelSpin+=run*dt*5;roll+=run*dt*5/R*.42;
  poseHamster(fwd3(heading),up,roll,.06*Math.sin(wheelSpin*3)*run);
  if(inFwd<-.4){   // luta bakåt: ut ur hjulet
    mode='roll';wheelLock=.8;const [fx,fz]=fwdOf(heading);vx=-fx*1.6;vz=-fz*1.6;
  }
}
function openDoor(D){
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
  if(wheel)wheel.spin.quaternion.setFromAxisAngle(wheel.axisV,-wheelSpin);
  const pw=$('power');
  if(pw){pw.classList.toggle('hide',!wheel||!playing||mapOn);$('powerFill').style.width=(charge*100).toFixed(0)+'%';pw.classList.toggle('full',charge>=1)}
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
  if(turn){heading=turn.to;camHeading=heading;turn=null;hopY=0}
  mode='redfall';redFall={t:0,c,from:planeAxes().map(a=>p.getComponent(a))};vx=vz=0;
}
function redFallStep(dt){
  const R2=redFall;R2.t+=dt;
  const q=Math.min(1,R2.t/.5), e=easeInOut(q);
  planeAxes().forEach((a,i)=>p.setComponent(a,R2.from[i]+(coordOf(R2.c[a])-R2.from[i])*e));
  p.setComponent(ga,floorCoord(R2.c)+gs*1.1*e);    // ner i gropen
  if(R2.t<2)return;
  lives--;updateLives();redFall=null;
  if(lives<=0){gameOver();return}
  p.copy(lastSafe);mode='roll';vx=vz=0;wasMoving=false;lastCellKey=cid(...cellOf(p));
  startHop('stop',0);   // studsar upp och landar på fötterna
  hint(`Ouch! ${lives} ${lives===1?'life':'lives'} left.`,3000);
}
function gameOver(){
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
  mode='throat';throat={x:fallInfo.x,y:fallInfo.y,d:fallInfo.d};rightSince=null;
  hint('The hamster is stuck in the hole! Zoom out and tip the cube so the floor of the next tunnel points down.',6000);
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
  if(inTrack){
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
    // Panorering upp/ner: vrid blickriktningen runt kamerans sidoaxel
    if(Math.abs(camPitch)>1e-3){
      const d=camLook.clone().sub(cam.position), L=d.length(), hl=Math.hypot(d.x,d.z);
      const a=Math.atan2(d.y,hl)+camPitch;
      camLook.copy(cam.position).add(new THREE.Vector3(d.x/hl*Math.cos(a)*L,Math.sin(a)*L,d.z/hl*Math.cos(a)*L));
    }
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
  lastBeta=beta;lastGamma=gamma;
  if(baseBeta===null){baseBeta=beta;baseGamma=gamma} // kalibrera "rakt fram" utifrån hur telefonen hålls just nu
  // Ju mer man lutar, desto fortare. Den totala lutningen räknas, oavsett riktning:
  // under dödzonen står hamstern still, vid FULL_TILT grader rullar den för fullt.
  const dx=gamma-baseGamma, dy=beta-baseBeta, mag=Math.hypot(dx,dy);
  const m=Math.min(1,Math.max(0,mag-settings.dead)/(FULL_TILT-settings.dead));
  tiltX=mag>0?dx/mag*m:0;
  tiltZ=mag>0?dy/mag*m:0;
}
let lastBeta=null,lastGamma=null;
const FULL_TILT=28;
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
$('go').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');$('setBtn').classList.remove('hide');$('lives').classList.remove('hide');
  enableOrientation();
  playing=true;startTime=performance.now();showSettingValues();
  hint('Tilt forward to roll, sideways to turn. When the hamster stands still, swipe sideways to look around.',7000);
};
$('nomotion').onclick=()=>{
  $('start').classList.add('hide');$('mapBtn').classList.remove('hide');$('setBtn').classList.remove('hide');$('lives').classList.remove('hide');
  useKeyboard=true;playing=true;startTime=performance.now();showSettingValues();
  hint(touch?'Drag up to roll forward, sideways to turn.':'Up/W rolls forward, Down/S back. Left/Right turns. When standing still: drag with the mouse to look around. M zooms out.',7000);
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
  if(on&&(!playing||won||inTube||inTrack||mode==='fall'||mode==='redfall'||mode==='wheel'))return;
  if(rot)return;
  mapOn=on;$('mapBtn').classList.toggle('on',mapOn);$('mapBtn').setAttribute('aria-pressed',mapOn);
  dragActive=false;dragX=0;dragZ=0;
  if(!on&&mode==='throat'&&isRight(baseQ))release();
}
$('mapBtn').onclick=()=>setMap(!mapOn);
addEventListener('keydown',e=>{if(e.code==='KeyM')setMap(!mapOn)});
$('nearBtn').onclick=()=>{showAll=!showAll;$('nearBtn').textContent=showAll?'Show nearby':'Show all'};
$('modeBtn').onclick=()=>{lockMode=!lockMode;$('modeBtn').textContent=lockMode?'Mode: Lock':'Mode: Highlight'};
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
const atShaft=()=>mode==='roll'&&hold<=0&&!inTube&&!inTrack&&open[cid(...cellOf(p))][upDir()]==='link';
const rotateSteps=()=>(!playing||won||inTube||inTrack)?0:mode==='throat'?1:atShaft()?2:0;
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

// ---------- Inställningspanelen och vattenpasset ----------
let settingsOpen=false;
function showSettingValues(){
  $('deadVal').textContent=settings.dead+'°';$('turnVal').textContent=settings.turn;$('brakeVal').textContent=settings.brake;
  $('deadRange').value=settings.dead;$('turnRange').value=settings.turn;$('brakeRange').value=settings.brake;$('levelToggle').checked=settings.level;
  $('level').classList.toggle('hide',!settings.level||!playing);
  // Dödzonens ruta i vattenpasset: 50 enheter i bilden motsvarar FULL_TILT grader
  $('levelDead').setAttribute('r',(settings.dead/FULL_TILT*50).toFixed(1));
}
$('setBtn').onclick=()=>{
  settingsOpen=!settingsOpen;
  $('settings').classList.toggle('hide',!settingsOpen);
  $('setBtn').classList.toggle('on',settingsOpen);$('setBtn').setAttribute('aria-expanded',settingsOpen);
  if(settingsOpen)showSettingValues();
};
$('deadRange').oninput=e=>{settings.dead=+e.target.value;saveSettings();showSettingValues()};
$('turnRange').oninput=e=>{settings.turn=+e.target.value;saveSettings();showSettingValues()};
$('brakeRange').oninput=e=>{settings.brake=+e.target.value;saveSettings();showSettingValues()};
$('levelToggle').onchange=e=>{settings.level=e.target.checked;saveSettings();showSettingValues()};
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
  const k=50/FULL_TILT, lim=58;
  const x=Math.max(-lim,Math.min(lim,dx*k)), y=Math.max(-lim,Math.min(lim,dy*k));
  const dot=$('levelDot');dot.setAttribute('cx',x.toFixed(1));dot.setAttribute('cy',y.toFixed(1));
  const still=Math.hypot(dx,dy)<=settings.dead;
  dot.setAttribute('fill',still?'#4ade80':'#ffd166');
}

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  // Hål i golvet där hamstern är: den faller ner halvvägs. Det går inte att ångra.
  // (Gäller även utzoomat, t.ex. direkt efter en vändning under ett schakt.)
  if(playing&&!won&&mode==='roll'&&!inTube&&!inTrack&&!rot){
    const c=cellOf(p),k=cid(...c),pit=pitAt.get(k);
    if(pit&&pit.floor===downDir()){
      // Runt hål: hamstern faller bara i om den kommer nära mitten, annars kan den rulla runt
      const d2=planeAxes().reduce((sum,a)=>sum+(p.getComponent(a)-coordOf(c[a]))**2,0);
      if(d2<PIT_CATCH*PIT_CATCH){if(pit.kind==='red')startRedFall(c);else startFall(c,downDir())}
      else if(pit.kind!=='red'||d2>(PIT_R+R+.2)**2)lastSafe.copy(p);
    }else{
      if(open[k][downDir()]==='link')startFall(c,downDir());
      else lastSafe.copy(p);
    }
  }
  if(playing&&!won&&mode==='fall')fallStep(dt);
  if(playing&&!won&&mode==='redfall')redFallStep(dt);
  if(playing&&!won&&!mapOn&&!settingsOpen&&mode!=='fall'&&mode!=='redfall'){
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
    vx+=(tvx-vx)*grip; vz+=(tvz-vz)*grip;
    if(hold>0){vx=vz=0}
    // Under ett schakt bromsar hamstern in kraftigt och dras mot mitten när man lutar lite,
    // så att det är lätt att stanna precis under.
    if(underShaft){
      // settings.brake 1–10: högre = lägre fart under schaktet och starkare dragning mot mitten
      const b=settings.brake;
      if(Math.hypot(inFwd,inSide)>=.5){
        // man lutar: farten begränsas
        const cap=MAX_SPEED*Math.max(.08,1-.09*b), sp=Math.hypot(vx,vz);
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
    p.addScaledVector(ex,vx*dt).addScaledVector(ez,vz*dt);
    const cc=cellOf(p),kk=cid(...cc);
    for(const a of planeAxes()){
      const off=p.getComponent(a)-coordOf(cc[a]);
      for(const s of [1,-1]){
        if(s*off<=LIM)continue;
        const kind=open[kk][dirIndex(a,s)];
        if(!kind||kind==='link'||(kind==='door'&&!doorAt(kk,dirIndex(a,s)).isOpen)){
          p.setComponent(a,coordOf(cc[a])+s*LIM);
          if(a===axisOf(ex))vx=0; else vz=0;
        }else if(s*off>LIM+.15&&kind==='exit'){win()}
        else if(s*off>LIM+.15&&kind==='tube'){
          enterTube(cid(...tubeA.c)===kk&&tubeA.d===dirIndex(a,s));
        }
        else if(kind==='curve'&&!inTrack&&(ex.getComponent(a)*vx+ez.getComponent(a)*vz)*s>0){
          // rullar ut mot den svängda gången: följ bågen därifrån
          const ce=curveAt(cc,dirIndex(a,s));enterTrack(ce.C,ce.end,Math.hypot(vx,vz));
        }
      }
    }
    // In i hamsterhjulet: när hamstern rullar fram till hjulets mitt
    if(wheel&&!inTube&&!inTrack){
      wheelLock=Math.max(0,wheelLock-dt);
      const wc=center(wheel.c), d2=planeAxes().reduce((sum,a)=>sum+(p.getComponent(a)-wc.getComponent(a))**2,0);
      if(wheelLock<=0&&cid(...cellOf(p))===wheel.cellKey&&d2<.45*.45&&downDir()===wheel.floor)enterWheel();
    }
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
  updateRotation(dt);
  // Rätt läge: efter en kort stund zoomar kameran in och hamstern lossnar
  if(mode==='throat'&&rightSince&&mapOn&&performance.now()-rightSince>1300)setMap(false);
  if(mode==='throat'&&rightSince){hamsterMat.emissiveIntensity=.25+.2*Math.sin(time*8)}
  mapT=Math.max(0,Math.min(1,mapT+(mapOn?1:-1)*dt/MAP_TIME));
  camBlend=Math.max(0,camBlend-dt/.6);
  updateUI();
  updateLevel();
  if(!standing||mode!=='roll'||inTrack||inTube)camPitch*=Math.exp(-4*dt);   // tillbaka till rak blick när den rullar
  if(playing||won){placeCamera();applyMap(mapT,time)}
  ren.render(scene,cam);
}
// Knappar, text och hjälppil i utzoomat läge
const ARROWS={up:['↑','Swipe up'],down:['↓','Swipe down'],left:['←','Swipe left'],right:['→','Swipe right']};
function updateUI(){
  const steps=rotateSteps(), out=mapOn&&mapT>.9, right=mode==='throat'&&isRight(baseQ);
  for(const id of ['nearBtn','modeBtn','helpBtn'])$(id).classList.toggle('hide',!out);
  $('lives').classList.toggle('hide',!playing&&!gameIsOver||mapOn);
  const tip=$('tip');
  const text=right?'Right! The hamster can roll on.':steps===1?'Tip the cube so the floor of the next tunnel points down':steps===2?'Swipe to flip the cube 180° and drop the hamster into the shaft':'Zoom in and roll on';
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
  const msg=$('hsMsg');msg.textContent='Loading high score …';
  let rows;
  try{rows=await fetchTop()}catch(err){msg.textContent='The high score could not be loaded right now.';return}
  renderTop(rows,null);
  const qualifies=ms>=5000&&ms<=3600000&&(rows.length<HS_SIZE||ms<rows[rows.length-1].time_ms);
  if(!qualifies){msg.textContent=`Your time ${fmtTime(ms)} did not make the list this time.`;return}
  msg.textContent='';
  const form=$('hsForm'),input=$('hsName');
  try{input.value=localStorage.getItem('fpa_name')||''}catch(err){}
  form.classList.remove('hide');input.focus();
  form.onsubmit=async e=>{
    e.preventDefault();
    const name=input.value.trim().slice(0,16);
    if(!name){input.focus();return}
    try{localStorage.setItem('fpa_name',name)}catch(err){}
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
