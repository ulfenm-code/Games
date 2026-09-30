'use strict';
/* Bar Game v4.22 iPhone/PWA helpers and start-screen polish. */
(function(){
  const ua=String(navigator.userAgent||'');
  const isIOS=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true;

  const version=document.getElementById('versionLabel');
  if(version){
    const m=location.pathname.match(/index_(\d+)_(\d+)\.html$/i);
    version.textContent=m?`VERSION ${m[1]}.${m[2]}`:'VERSION 4.22';
  }

  const fullscreenBtn=document.getElementById('iphoneFullscreenBtn');
  const help=document.getElementById('iphoneHelpOverlay');
  const close=document.getElementById('iphoneHelpClose');
  if(fullscreenBtn){
    fullscreenBtn.hidden=!isIOS||standalone;
    fullscreenBtn.addEventListener('click',()=>{
      if(!help)return;
      help.classList.add('open');
      help.setAttribute('aria-hidden','false');
    });
  }
  function closeHelp(){
    if(!help)return;
    help.classList.remove('open');
    help.setAttribute('aria-hidden','true');
  }
  close?.addEventListener('click',closeHelp);
  help?.addEventListener('click',e=>{if(e.target===help)closeHelp()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&help?.classList.contains('open'))closeHelp()});

  if(isIOS){
    const text=document.getElementById('orientationText');
    const btn=document.getElementById('tryLandscapeBtn');
    if(text)text.textContent='↻ Vrid telefonen vågrätt.';
    if(btn){btn.hidden=true;btn.onclick=null}
  }
})();