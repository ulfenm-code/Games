'use strict';
/* Bar Game 3.4 unified dialogue UI.
   One transcript entry per completed bartender turn.
   Same print/keyboard/mic controls in chat and recipe phases. */
(function(){
 const q=s=>document.querySelector(s), history=[];
 let typing=false, transcriptVisible=false, lastCommittedBartender='', streamTimer=null;
 function player(){try{return state?.name||'Spelare'}catch(_){return'Spelare'}}
 function dialog(){return q('.dialog')}
 function live(){return q('#dialogText')}
 function ensureTranscript(){let t=q('#dialogTranscript');if(t)return t;const el=live();if(!el)return null;t=document.createElement('div');t.id='dialogTranscript';el.after(t);return t}
 function draw(){const t=ensureTranscript();if(t)t.textContent=history.slice(-2).join('\n')}
 function add(who,msg){msg=String(msg||'').trim();if(!msg)return;const line=who+': '+msg;if(history[history.length-1]===line)return;history.push(line);if(history.length>40)history.shift();draw()}
 function rawBartender(){const el=live();return String(el?.textContent||'').trim().replace(/^Bartender:\s*/,'')}
 function commitBartender(){
   if(typing)return;const raw=rawBartender();if(!raw||raw===lastCommittedBartender)return;
   lastCommittedBartender=raw;add('Bartender',raw)
 }
 function scheduleBartenderCommit(){
   if(typing)return;clearTimeout(streamTimer);
   streamTimer=setTimeout(commitBartender,180)
 }
 function submit(raw){
   raw=String(raw||'').trim();if(!raw)return;
   add(player(),raw);
   if(state.phase==='recipe'&&typeof handleRecipeInput==='function')handleRecipeInput(raw);
   else if(typeof handleConversation==='function')handleConversation(raw)
 }
 function stopForInput(){try{if(typeof stopIdle==='function')stopIdle();if(typeof stopSpeech==='function')stopSpeech()}catch(_){}}
 function beginTyping(){
   const d=dialog(),el=live();if(!d||!el)return;stopForInput();typing=true;d.classList.add('typing');
   const n=player();el.textContent=n+': ';el.contentEditable='true';el.spellcheck=true;el.focus();
   const controls=q('.v31Controls');if(controls)controls.style.display='none';
   const r=document.createRange(),s=window.getSelection();r.selectNodeContents(el);r.collapse(false);s.removeAllRanges();s.addRange(r);
   el.onkeydown=e=>{if(e.key!=='Enter')return;e.preventDefault();let raw=el.textContent||'',p=n+':';raw=raw.startsWith(p)?raw.slice(p.length).trim():raw.trim();
     el.contentEditable='false';el.onkeydown=null;typing=false;d.classList.remove('typing');if(controls)controls.style.display='';submit(raw)}
 }
 function micInput(btn){
   stopForInput();
   if(typeof recognize==='function')recognize(alts=>submit((alts[0]||'').trim()),btn)
 }
 function makeControls(){
   const c=q('#dialogControls');if(!c)return;
   let row=c.querySelector('.v31Controls');
   if(!row){row=document.createElement('div');row.className='v31Controls';row.innerHTML='<button class="btn secondary" id="v31PrintBtn" title="Utskrift">Utskrift</button><button class="btn" id="v31KeyboardBtn" title="Tangentbord">Tangentbord</button><button class="btn secondary" id="v31MicBtn" title="Mikrofon">🎙️</button>';c.prepend(row)}
   const pb=q('#v31PrintBtn'),kb=q('#v31KeyboardBtn'),mb=q('#v31MicBtn');
   if(pb&&!pb.dataset.bound){pb.dataset.bound='1';pb.onclick=()=>{transcriptVisible=!transcriptVisible;dialog()?.classList.toggle('transcript',transcriptVisible);draw()}}
   if(kb&&!kb.dataset.bound){kb.dataset.bound='1';kb.onclick=beginTyping}
   if(mb&&!mb.dataset.bound){mb.dataset.bound='1';mb.onclick=()=>micInput(mb)}
 }
 function init(){
   ensureTranscript();const el=live(),c=q('#dialogControls');if(!el||!c)return;
   new MutationObserver(scheduleBartenderCommit).observe(el,{childList:true,subtree:true,characterData:true});
   new MutationObserver(makeControls).observe(c,{childList:true,subtree:true});
   makeControls();scheduleBartenderCommit()
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();