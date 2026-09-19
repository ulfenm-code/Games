'use strict';
/* Bar Game 3.0 dialogue UI. Keeps 1.19 AI/controller behavior intact. */
(function(){
 const q=s=>document.querySelector(s), history=[];
 let typing=false, transcriptVisible=false, internal=false, lastCaptured='';
 function player(){try{return state?.name||'Spelare'}catch(_){return'Spelare'}}
 function ensureTranscript(){let t=q('#dialogTranscript');if(t)return t;const live=q('#dialogText');if(!live)return null;t=document.createElement('div');t.id='dialogTranscript';live.after(t);return t}
 function draw(){const t=ensureTranscript();if(t)t.textContent=history.slice(-2).join('\n')}
 function add(who,msg){msg=String(msg||'').trim();if(!msg)return;const line=who+': '+msg;if(history[history.length-1]!==line)history.push(line);if(history.length>40)history.shift();draw()}
 function captureBartender(){
   if(internal||typing)return;const el=q('#dialogText');if(!el||el.isContentEditable)return;
   let raw=(el.textContent||'').trim();if(!raw)return;raw=raw.replace(/^Bartender:\s*/,'');
   if(!raw||raw===lastCaptured)return;lastCaptured=raw;add('Bartender',raw);
 }
 function install(){
   const c=q('#dialogControls'),d=q('.dialog'),el=q('#dialogText');if(!c||!d||!el)return;
   const row=c.querySelector('.inputRow');if(!row)return;
   const send=q('#chatSendBtn'),mic=q('#chatMicBtn');if(!send||!mic)return;
   let pb=q('#printBtn');if(!pb){pb=document.createElement('button');pb.id='printBtn';pb.className='btn secondary';pb.title='Utskrift';pb.textContent='Utskrift';row.insertBefore(pb,send)}
   if(!pb.dataset.v30){pb.dataset.v30='1';pb.onclick=()=>{transcriptVisible=!transcriptVisible;d.classList.toggle('transcript',transcriptVisible);draw()}}
   if(!send.dataset.v30){send.dataset.v30='1';send.title='Tangentbord';send.onclick=()=>{
     try{stopIdle();stopSpeech()}catch(_){}
     typing=true;d.classList.add('typing');const n=player();internal=true;el.textContent=n+': ';internal=false;el.contentEditable='true';el.spellcheck=true;
     [pb,send,mic].forEach(b=>b.style.display='none');el.focus();const r=document.createRange(),s=window.getSelection();r.selectNodeContents(el);r.collapse(false);s.removeAllRanges();s.addRange(r);
     el.onkeydown=e=>{if(e.key!=='Enter')return;e.preventDefault();let raw=el.textContent||'',p=n+':';raw=raw.startsWith(p)?raw.slice(p.length).trim():raw.trim();el.contentEditable='false';el.onkeydown=null;typing=false;d.classList.remove('typing');[pb,send,mic].forEach(b=>b.style.display='');add(n,raw);if(raw&&typeof handleConversation==='function')handleConversation(raw);else if(typeof renderConversationInput==='function')renderConversationInput(false)}
   }}
   if(!mic.dataset.v30){mic.dataset.v30='1';mic.title='Mikrofon';mic.onclick=()=>{try{stopIdle();stopSpeech()}catch(_){};recognize(alts=>{const raw=(alts[0]||'').trim();if(!raw)return;add(player(),raw);handleConversation(raw)},mic)}}
 }
 function init(){ensureTranscript();const live=q('#dialogText'),c=q('#dialogControls');if(!live||!c)return;
   new MutationObserver(()=>{try{captureBartender()}catch(_){}}).observe(live,{childList:true,subtree:true,characterData:true});
   new MutationObserver(()=>{try{install()}catch(_){}}).observe(c,{childList:true,subtree:true});
   install();captureBartender()
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();