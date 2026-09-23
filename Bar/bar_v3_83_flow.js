'use strict';
(function(){
  const glass=document.getElementById('highballGroup');
  const yesPhrases=new Set([
    'ja','ja tack','ja gärna','gärna','absolut','japp','javisst','visst','yes',
    'det vill jag','ja det vill jag','jag vill smaka','jag smakar','smaka','kör','kör på'
  ]);

  function normalizedReply(raw){
    return canon(String(raw||''))
      .replace(/[.!?,;:]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function isTasteYes(raw){
    const s=normalizedReply(raw);
    return yesPhrases.has(s);
  }
  function setGlassTasteButton(on){
    if(!glass)return;
    glass.style.pointerEvents=on?'auto':'none';
    glass.style.cursor=on?'pointer':'default';
    if(on){
      glass.setAttribute('role','button');
      glass.setAttribute('tabindex','0');
      glass.setAttribute('aria-label','Smaka Mojiton');
      glass.setAttribute('aria-hidden','false');
    }else{
      glass.removeAttribute('role');
      glass.removeAttribute('tabindex');
      glass.removeAttribute('aria-label');
    }
  }
  function startTaste(){
    if(!state?.mojitoReadyToTaste||state?.drink?.id!=='mojito')return;
    state.mojitoReadyToTaste=false;
    setGlassTasteButton(false);
    try{stopIdle()}catch(_){}
    try{stopSpeech()}catch(_){}
    startPhysicalAction('drink','result');
  }
  function enterTasteReady(){
    if(state?.drink?.id!=='mojito')return;
    state.phase='chat';
    state.mojitoReadyToTaste=true;
    state.lastRecipeQuestion='';
    $('#dialogControls').innerHTML='';
    $('#dialogText').textContent='Klart! Vill du smaka nu?';
    setGlassTasteButton(true);
    renderConversationInput(false);
    speak('Klart! Vill du smaka nu?');
  }

  const originalRenderStep=renderStep;
  renderStep=function(newStep=false){
    if(state?.drink?.id==='mojito'&&state.step>=state.drink.steps.length){
      enterTasteReady();
      return;
    }
    return originalRenderStep(newStep);
  };

  const originalHandleConversation=handleConversation;
  handleConversation=async function(raw){
    if(state?.mojitoReadyToTaste&&state?.drink?.id==='mojito'&&isTasteYes(raw)){
      startTaste();
      return;
    }
    return originalHandleConversation(raw);
  };

  const originalOrderDrink=orderDrink;
  orderDrink=function(d){
    state.mojitoReadyToTaste=false;
    setGlassTasteButton(false);
    return originalOrderDrink(d);
  };

  glass?.addEventListener('click',()=>startTaste());
  glass?.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&state?.mojitoReadyToTaste){
      e.preventDefault();
      startTaste();
    }
  });

  document.getElementById('anotherBtn')?.addEventListener('click',()=>{
    state.mojitoReadyToTaste=false;
    setGlassTasteButton(false);
  },true);

  window.__barTaste383={
    ready:()=>Boolean(state?.mojitoReadyToTaste),
    start:startTaste,
    enter:enterTasteReady
  };
})();