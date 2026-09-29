'use strict';
/* Bar Game v4.18 generic input fixes:
   - pressing the visible shaker answers active shake steps directly
   - bottle speech interruption is handled in bar_v4_18_core.js */
(function(){
  function cv(v){return typeof canon==='function'?canon(v):String(v??'').trim().toLocaleLowerCase('sv-SE')}
  function currentShakeStep(){
    if(state.phase!=='recipe'||!state.drink||!Array.isArray(state.drink.steps))return null;
    const s=state.drink.steps[state.step]||null;
    if(!s||s.action!=='shake')return null;
    const a=cv(s.a);
    return a.includes('skaka')?s:null;
  }
  function shakerEl(){
    return window.__barTools417?.shaker||window.__barTools416?.shaker||window.__barTools415?.shaker||window.__barTools414?.shaker||window.__barMaiTai3106?.shaker||document.getElementById('maiTaiShaker');
  }
  function visible(el){
    if(!el)return false;
    const r=el.getBoundingClientRect?.();
    if(!r||!(r.width>0&&r.height>0))return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)!==0;
  }
  function hit(el,e){
    if(!visible(el))return false;
    const r=el.getBoundingClientRect();
    return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  }
  let lock=false;
  function triggerShakeFromShaker(e=null){
    if(lock)return false;
    const s=currentShakeStep(),sh=shakerEl();
    if(!s||!sh)return false;
    if(e&&'clientX' in e&&!hit(sh,e))return false;
    lock=true;
    try{
      if(typeof interruptAlexV391==='function')interruptAlexV391({resumeVoice:true});
      else if(typeof stopSpeech==='function')stopSpeech();
      if(e){e.preventDefault();e.stopImmediatePropagation()}
      if(typeof completeRecipeStep==='function')completeRecipeStep(s,false);
      else if(typeof answerKnownChoice==='function')answerKnownChoice(s.a,sh);
      return true
    }finally{
      setTimeout(()=>{lock=false},250)
    }
  }

  document.addEventListener('pointerdown',e=>{
    const s=currentShakeStep();if(!s)return;
    const sh=shakerEl();if(!sh||!hit(sh,e))return;
    triggerShakeFromShaker(e)
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const sh=shakerEl();
    if(document.activeElement!==sh)return;
    triggerShakeFromShaker(e)
  },true);

  window.__barInput418={currentShakeStep,triggerShakeFromShaker,shakerEl};
})();