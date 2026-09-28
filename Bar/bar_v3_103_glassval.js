'use strict';
/* Bar Game v3.103: reusable glass-selection pose with bottom-center object anchoring. */
(function(){
  const URL='./bartender_installningar_glasval.json';
  const scene=window.__barSceneConfig3100||window.__barSceneConfig397||window.__barSceneConfig396||window.__barSceneConfig385;
  const REFERENCE_ASPECT=1.5;
  const INPUT_ASPECTS={highballGlass:1.5,shaker:1};
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

  function referenceAnchor(raw){
    const slot=raw.inputSlot;
    const ref=raw.inputObjects.highballGlass;
    const w=Number(ref.w);
    return {
      centerX:Number(slot.x)+w/2,
      bottomY:Number(slot.y)+w*REFERENCE_ASPECT
    };
  }

  function bottomAnchoredObject(raw,input){
    const slot=clone(raw.inputSlot);
    const spec=clone(raw.inputObjects?.[input]);
    if(!spec)throw new Error('Okänt glasval-objekt: '+input);
    const w=Number(spec.w);
    const aspect=Number(INPUT_ASPECTS[input]||1);
    const anchor=referenceAnchor(raw);
    return {
      ...slot,
      ...spec,
      x:anchor.centerX-w/2,
      y:anchor.bottomY-w*aspect
    };
  }

  function materialize(raw,input){
    const cfg=clone(raw);
    cfg.objects={};
    const p=bottomAnchoredObject(raw,input);
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
    return {cfg,prepared,input,url:URL,anchor:referenceAnchor(await load())};
  }

  const api={url:URL,load,referenceAnchor,bottomAnchoredObject,materialize,configFor,apply};
  window.__barGlassval3103=api;
  window.__barGlassval3101=api;
})();
