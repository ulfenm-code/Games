// Startsidan: hjälten (samma 3D-modell som i spelet) rullar in från vänster med fartränder efter sig,
// bromsar in, hoppar upp på fötterna och stannar med ansiktet snett framifrån. Spelas en gång när sidan
// öppnas och igen när man trycker på den. Ritar bara medan startsidan syns.
(()=>{
  const cv=document.getElementById('heroCanvas');
  if(!cv||!window.THREE)return;
  let ren;
  try{ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(err){cv.style.display='none';return}
  ren.setPixelRatio(Math.min(2,devicePixelRatio||1));
  if('outputEncoding' in ren)ren.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(32,2,.1,50);cam.position.set(0,.9,6.2);cam.lookAt(0,.15,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x334455,1.1));
  const sun=new THREE.DirectionalLight(0xffffff,.9);sun.position.set(2,4,5);scene.add(sun);
  const R=1;
  // skugga på marken
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-R+.01;shadow.scale.set(1,.45,1);scene.add(shadow);
  // hjälten: en grupp som vrids som i spelet (framåt, upp, rullning)
  const hero=new THREE.Group();scene.add(hero);
  const body=new THREE.Group();hero.add(body);
  const fallback=new THREE.Mesh(new THREE.SphereGeometry(R,32,24),new THREE.MeshStandardMaterial({color:0xd98a3a,roughness:.7}));body.add(fallback);
  if(THREE.GLTFLoader)new THREE.GLTFLoader().load('hc_hamster_curled_05.glb',g=>{const m=g.scene;m.scale.setScalar(R/1.08);body.add(m);fallback.visible=false},undefined,()=>{});
  // fartränder: vita streck bakom hjälten som tonar bort när den bromsar
  const LINES=[];
  const lineMat=()=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<8;i++){
    const len=1.2+Math.random()*1.8, m=new THREE.Mesh(new THREE.PlaneGeometry(len,.045+Math.random()*.03),lineMat());
    m.userData={len,y:-.75+i*.21+Math.random()*.06,ph:Math.random()*3,z:-.3+Math.random()*.6};scene.add(m);LINES.push(m);
  }
  const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
  function pose(fwd,roll){
    const z=fwd.clone().normalize(),y=new THREE.Vector3(0,1,0),x=new THREE.Vector3().crossVectors(y,z);
    _m.makeBasis(x,y,z);hero.quaternion.setFromRotationMatrix(_m);
    body.quaternion.setFromEuler(_e.set(roll,0,0,'ZYX'));
  }
  const ROLL_T=1.7, HOP_T=.55, X0=-6.5;
  const MOVE=new THREE.Vector3(1,0,0), FACE=new THREE.Vector3(.6,0,1).normalize();
  const easeOut=q=>1-(1-q)**3;
  let t0=performance.now();
  function size(){
    const w=cv.clientWidth||300,h=cv.clientHeight||150;
    ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  addEventListener('resize',size);size();
  cv.addEventListener('click',()=>{t0=performance.now()});
  function frame(){
    requestAnimationFrame(frame);
    const start=document.getElementById('start');
    if(!start||start.classList.contains('hide'))return;
    const t=(performance.now()-t0)/1000;
    let x,roll,y=0,fwd=MOVE.clone(),speed=0;
    if(t<ROLL_T){
      // rullar in och bromsar
      const q=t/ROLL_T;x=X0*(1-easeOut(q));speed=3*(1-q)**2*(-X0)/ROLL_T;
      roll=(x-X0)/R;
    }else{
      x=0;const endRoll=-X0/R, q=Math.min(1,(t-ROLL_T)/HOP_T), e=q<.5?2*q*q:1-(-2*q+2)**2/2;
      // hoppar upp på fötterna: rullningen rätas upp och nosen vänds mot oss, snett framifrån
      const full=Math.round(endRoll/(2*Math.PI))*2*Math.PI;
      roll=endRoll+(full-endRoll)*e;y=.35*4*q*(1-q);
      fwd=MOVE.clone().lerp(FACE,e).normalize();
      if(q>=1)y=.025*Math.sin((t-ROLL_T-HOP_T)*2.4);   // andas lite
    }
    hero.position.set(x,y,0);pose(fwd,roll);
    shadow.position.x=x;shadow.scale.set(1-y*.5,.45-y*.2,1);
    const k=Math.min(1,speed/3);
    for(const L of LINES){const u=L.userData;
      const drift=((t*7+u.ph)%1.6);
      L.position.set(x-R-u.len/2-.15-drift*.5,u.y,u.z);L.material.opacity=k*.75*(1-drift/1.6)}
    ren.render(scene,cam);
  }
  frame();
})();
