'use strict';
(function(){
  const CONFIG_URL='./bartender_installningar_highballglas_v65.json';
  const GLASS_ID='highballGlass';
  const GLASS_Y_OFFSET_PX=16;
  const diagnostics={configUrl:CONFIG_URL,loaded:false,visible:false,object:null,scale:null,error:null};
  let shouldShow=false;
  function finite(v){return typeof v==='number'&&Number.isFinite(v)}
  function glassEl(){return document.getElementById(GLASS_ID)}
  function currentScale(){return window.__barScale355?.finalGameFactor||1}
  function applyGlassObject(p){
    const el=glassEl();
    if(!el)throw new Error('Highballglas-elementet saknas i DOM');
    if(!p||!finite(p.x)||!finite(p.y)||!finite(p.w)||!finite(p.r)||!finite(p.px)||!finite(p.py)||!finite(p.z))throw new Error('Ogiltig highballGlass-konfiguration');
    const s=currentScale(), cx=260, cy=250;
    const adjustedY=p.y+GLASS_Y_OFFSET_PX;
    el.style.left=(cx+(p.x-cx)*s)+'px';
    el.style.top=(cy+(adjustedY-cy)*s)+'px';
    el.style.width=(p.w*s)+'px';
    el.style.height='auto';
    el.style.transformOrigin=p.px+'% '+p.py+'%';
    el.style.transform='rotate('+p.r+'deg)';
    el.style.zIndex=String(p.z);
    diagnostics.scale=s;
    diagnostics.object={x:cx+(p.x-cx)*s,y:cy+(adjustedY-cy)*s,w:p.w*s,r:p.r,px:p.px,py:p.py,z:p.z};
  }
  function setVisible(show){shouldShow=!!show;const el=glassEl();if(el)el.style.display=shouldShow&&diagnostics.loaded?'block':'none';diagnostics.visible=shouldShow&&diagnostics.loaded}
  const glassReady=fetch(CONFIG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Highball config HTTP '+r.status);return r.json()}).then(cfg=>{const p=cfg?.objects?.highballGlass;if(!p)throw new Error('Config saknar objects.highballGlass');applyGlassObject(p);diagnostics.loaded=true;setVisible(shouldShow);return p}).catch(err=>{diagnostics.error=String(err&&err.message?err.message:err);console.error('Bar v3.55 highball config:',err)});
  function showHighballGlass(){shouldShow=true;glassReady.then(()=>setVisible(true))}
  function hideHighballGlass(){setVisible(false)}
  const originalAdvanceStep=advanceStep;
  advanceStep=function(s){if(state?.drink?.id==='mojito'&&state.step===0&&s?.a==='Highballglas')showHighballGlass();return originalAdvanceStep(s)};
  const originalOrderDrink=orderDrink;
  orderDrink=function(d){hideHighballGlass();return originalOrderDrink(d)};
  window.__barGlass355={diagnostics,show:showHighballGlass,hide:hideHighballGlass,ready:glassReady};
})();