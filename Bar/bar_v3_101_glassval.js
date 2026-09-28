'use strict';
(function(){
  const URL='./bartender_installningar_glasval.json';
  const scene=window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  let rawPromise=null;
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function load(){
    if(!rawPromise){
      rawPromise=scene.loadConfig(URL).then(cfg=>{
        if(!cfg?.inputSlot||!cfg?.inputObjects)throw new Error('Glasval-config saknar inputSlot/inputObjects');
        return cfg;
      });
    }
    return rawPromise.then(clone);
  }
  function materialize(raw,input){
    const cfg=clone(raw);
    cfg.objects={};
    const slot=clone(raw.inputSlot);
    const spec=clone(raw.inputObjects?.[input]);
    if(!spec)throw new Error('Okänt glasval-objekt: '+input);
    const p={...slot,...spec};
    if(input==='highballGlass')cfg.objects.highballGlass=p;
    else if(input==='shaker')cfg.objects.whiteRum=p;
    else throw new Error('Glasval stöder inte: '+input);
    return cfg;
  }
  async function configFor(input){return materialize(await load(),input)}
  async function apply(input){
    if(!scene?.prepareConfig||!scene?.renderPoseFrame)throw new Error('Scenmotorn saknas för glasval');
    const cfg=await configFor(input);
    if(input==='shaker'){
      if(!scene.setActiveBottleElement?.('maiTaiShaker'))throw new Error('Mai Tai-shakern saknas i scenen');
    }
    const prepared=await scene.prepareConfig(cfg);
    scene.renderPoseFrame(cfg,prepared,{showGlass:input==='highballGlass'});
    return {cfg,prepared,input,url:URL};
  }
  window.__barGlassval3101={url:URL,load,materialize,configFor,apply};
})();
