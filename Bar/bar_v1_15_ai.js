'use strict';

/* Bar Game 1.15 AI conversation layer.
   Same benchmark configuration as 1.14: GPT-5.6 Terra, reasoning none,
   streaming, previous_response_id and default service tier.
   Difference: speech is queued sentence-by-sentence from the live text stream,
   exactly like Bartender Lab 3, so Alex starts talking before the whole answer
   has finished generating. Version 1.14 is never modified. */

const BAR_AI_URL_V115='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v114';
const BAR_SUPABASE_KEY_V115='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiPreviousResponseId=null;
state.aiBusy=false;
state.aiModel='gpt-5.6-terra';
state.aiReasoning='none';
state.aiLastTTFT=0;
state.aiLastTotal=0;

function aiSpecV115(s){
  if(!s)return {mode:'single',parts:[]};
  const spec=answerPartsV112(s.a);
  return {mode:spec.mode,parts:spec.parts};
}

function aiCurrentChatQuestionV115(){
  if(state.conversationIndex<convo.length){
    const item=convo[Math.min(state.conversationIndex,convo.length-1)];
    return item?.q(state.name)||null;
  }
  return 'Vad är du sugen på?';
}

function aiGameContextV115(extra={}){
  const s=state.phase==='recipe'?state.drink?.steps?.[state.step]:null;
  const spec=s?aiSpecV115(s):{mode:'single',parts:[]};
  const mem=ensureDialogMemoryV112?.()||{};
  return {
    phase:state.phase,
    playerName:state.name,
    drink:state.drink?.name||null,
    difficulty:state.difficulty,
    currentQuestion:state.phase==='recipe'?(state.lastRecipeQuestion||s?.q||null):state.phase==='chat'?aiCurrentChatQuestionV115():null,
    expectedAnswer:s?.a||null,
    answerMode:spec.mode,
    answerParts:spec.parts,
    alreadyCorrectParts:Array.isArray(mem.lastPartial)?mem.lastPartial.slice():[],
    options:s?.opts||[],
    ...extra
  };
}

function setAiBusyV115(busy,label='Bartendern tänker…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  if(busy){const st=$('#recipeStatus');if(st)st.textContent=label}
}

function aiFallbackNoticeV115(){
  toast('AI-bartendern svarar inte just nu – reservdialog används.');
}

function parseSseEventV115(block){
  const rows=String(block||'').split('\n');
  for(const row of rows){
    if(!row.startsWith('data:'))continue;
    const raw=row.slice(5).trim();
    if(!raw||raw==='[DONE]')continue;
    try{return JSON.parse(raw)}catch(_){ }
  }
  return null;
}

/* Same speech strategy as Bartender Lab 3:
   accumulate streaming deltas and enqueue every completed sentence immediately. */
function createStreamingSpeechV115(){
  let pending='';
  let active=0;
  let streamDone=false;
  let resolved=false;
  let resolveDone;
  const done=new Promise(resolve=>{resolveDone=resolve});

  try{speechSynthesis.cancel()}catch(_){ }

  function maybeDone(){
    if(!resolved&&streamDone&&active===0){resolved=true;resolveDone()}
  }

  function queueSpeech(text){
    const s=String(text||'').trim();
    if(!s)return;
    if(!('speechSynthesis' in window))return;
    try{
      const u=new SpeechSynthesisUtterance(s);
      u.lang='sv-SE';
      u.rate=.97;
      u.pitch=.96;
      active++;
      let finished=false;
      const finish=()=>{
        if(finished)return;
        finished=true;
        active=Math.max(0,active-1);
        maybeDone();
      };
      u.onend=finish;
      u.onerror=finish;
      speechSynthesis.speak(u);
    }catch(_){ }
  }

  function speakCompletedSentences(){
    const re=/^([\s\S]*?[.!?](?:\s+|$))/;
    while(true){
      const m=pending.match(re);
      if(!m)break;
      const sentence=m[1].trim();
      pending=pending.slice(m[1].length);
      if(sentence)queueSpeech(sentence);
    }
  }

  function push(delta){
    pending+=String(delta||'');
    speakCompletedSentences();
  }

  function finish(){
    if(pending.trim())queueSpeech(pending.trim());
    pending='';
    streamDone=true;
    maybeDone();
  }

  function cancel(){
    pending='';
    streamDone=true;
    active=0;
    try{speechSynthesis.cancel()}catch(_){ }
    maybeDone();
  }

  return {push,finish,cancel,done};
}

async function callAiStreamV115(message,extra={},onDelta=()=>{},allowRetry=true){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  const started=performance.now();
  let firstDelta=0;
  try{
    const r=await fetch(BAR_AI_URL_V115,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V115},
      body:JSON.stringify({
        message,
        previous_response_id:state.aiPreviousResponseId,
        game:aiGameContextV115(extra)
      }),
      signal:controller.signal
    });
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      if(allowRetry&&state.aiPreviousResponseId){
        console.warn('Bar AI 1.15 resets previous_response_id after upstream error',data);
        state.aiPreviousResponseId=null;
        clearTimeout(timer);
        return callAiStreamV115(message,extra,onDelta,false);
      }
      throw new Error((data?.error||`HTTP ${r.status}`)+(data?.detail?` · ${data.detail}`:''));
    }
    if(!r.body)throw new Error('Tom AI-ström');

    const reader=r.body.getReader();
    const decoder=new TextDecoder();
    let buffer='',reply='',responseId=null,serviceTier='default';
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      let cut;
      while((cut=buffer.indexOf('\n\n'))>=0){
        const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);
        const ev=parseSseEventV115(block);if(!ev)continue;
        if(ev.type==='response.output_text.delta'){
          if(!firstDelta)firstDelta=performance.now();
          const delta=String(ev.delta||'');reply+=delta;onDelta(reply,delta);
        }else if(ev.type==='response.created'||ev.type==='response.in_progress'||ev.type==='response.completed'){
          if(ev.response?.id)responseId=ev.response.id;
          if(ev.response?.service_tier)serviceTier=ev.response.service_tier;
        }else if(ev.type==='response.failed'){
          throw new Error(ev.response?.error?.message||ev.error?.message||'AI-svaret misslyckades');
        }
      }
    }
    const total=performance.now()-started;
    state.aiLastTTFT=firstDelta?firstDelta-started:total;
    state.aiLastTotal=total;
    if(responseId)state.aiPreviousResponseId=responseId;
    console.info(`Bar AI 1.15 · första text ${(state.aiLastTTFT/1000).toFixed(2)} s · totalt ${(total/1000).toFixed(2)} s · ${serviceTier}`);
    return {reply:reply.trim()||'Jag hänger med.',response_id:responseId,service_tier:serviceTier,ttft_ms:state.aiLastTTFT,total_ms:total};
  }finally{clearTimeout(timer)}
}

function streamDialogV115(text){
  const el=$('#dialogText');if(el)el.textContent=text;
}

function classifyRecipeV115(text,s){
  const base=classifyRecipeUtteranceV112(text,s);
  const mem=ensureDialogMemoryV112();
  const old=Array.isArray(mem.lastPartial)?mem.lastPartial:[];
  if(!old.length)return base;
  const mention=mentionedCorrectPartsV112(text,s);
  if(mention.spec.mode==='all'&&mention.found.length){
    const combined=[...new Set([...old,...mention.found])];
    if(mention.spec.parts.every(p=>combined.includes(p)))return {kind:'correct',chat:base.chat||''};
    if(combined.length<mention.spec.parts.length)return {kind:'partial',partial:{found:combined,missing:mention.spec.parts.filter(p=>!combined.includes(p))},chat:base.chat||''};
  }
  return base;
}

function registerAiWrongV115(s){
  state.wrong++;
  state.points=Math.max(0,state.points-2);
  state.questionFails++;
  if(state.difficulty==='easy')renderEasy(s);
  else if(state.questionFails>=3)renderFree(s,'Tre fel – här får du tre alternativ. Ett är rätt.');
}

const handleConversationLocalV115=handleConversation;
handleConversation=async function(raw){
  if(state.aiBusy)return;
  stopIdle();
  const text=String(raw||'').trim();
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';
  const drink=resolveDrink(text);
  $('#dialogControls').innerHTML='';
  streamDialogV115('');
  setAiBusyV115(true,'Alex svarar…');
  const voice=createStreamingSpeechV115();
  try{
    const data=await callAiStreamV115(text,{phase:'chat',currentQuestion:aiCurrentChatQuestionV115(),expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:[]},(full,delta)=>{
      streamDialogV115(full);
      voice.push(delta);
    });
    voice.finish();
    setAiBusyV115(false);
    streamDialogV115(data.reply);
    await voice.done;
    if(drink){
      if(state.phase==='chat')setTimeout(()=>orderDrink(drink),250);
      return;
    }
    if(state.phase==='chat')setTimeout(()=>renderConversationInput(false),250);
  }catch(e){
    voice.cancel();
    console.error('Bar AI 1.15 chat fallback',e);
    setAiBusyV115(false);
    aiFallbackNoticeV115();
    handleConversationLocalV115(text);
  }
};

const handleRecipeInputLocalV115=handleRecipeInput;
handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
  const text=String(raw||'').trim(),s=state.drink?.steps?.[state.step];
  if(!s||state.phase!=='recipe')return;
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';
  const classification=classifyRecipeV115(text,s);
  setAiBusyV115(true,'Alex svarar…');
  streamDialogV115('');
  const voice=createStreamingSpeechV115();
  try{
    const data=await callAiStreamV115(text,{},(full,delta)=>{
      streamDialogV115(full);
      voice.push(delta);
    });
    voice.finish();
    setAiBusyV115(false);
    streamDialogV115(data.reply);
    await voice.done;

    if(classification.kind==='repeat'){
      state.recipeChatTurns=0;return;
    }
    if(classification.kind==='help'){
      state.recipeChatTurns=0;showHelpOptionsV112(s,data.reply);return;
    }
    if(classification.kind==='partial'){
      state.recipeChatTurns=0;
      ensureDialogMemoryV112().lastPartial=classification.partial.found.slice();
      return;
    }
    if(classification.kind==='correct'){
      state.recipeChatTurns=0;
      ensureDialogMemoryV112().lastPartial=[];
      answerStep(s.a,null,true,true);return;
    }
    if(classification.kind==='wrong'){
      state.recipeChatTurns=0;
      registerAiWrongV115(s);return;
    }
    state.recipeChatTurns++;
  }catch(e){
    voice.cancel();
    console.error('Bar AI 1.15 recipe fallback',e);
    setAiBusyV115(false);
    aiFallbackNoticeV115();
    handleRecipeInputLocalV115(text);
  }
};

const askServingLocalV115=askServing;
askServing=function(){
  const d=state.drink;
  const prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  showPrompt('Bartendern',prompt,d.alcoholic?'4, 6 eller 8':'liten, mellan eller stor',async(value,status,wrap)=>{
    const text=String(value||'').trim();if(!text)return;
    let n;
    if(!d.alcoholic){const x=normalize(text);if(x.includes('liten'))n=4;else if(x.includes('mellan'))n=6;else if(x.includes('stor'))n=8}
    if(!n)n=parseNum(text);
    if([4,6,8].includes(n)){
      state.serving=n;updateHud();wrap.remove();
      const r=d.alcoholic?`${n}:a blir bra. Då räknar vi receptet efter den.`:`Bra, då kör vi ${n===4?'liten':n===6?'mellan':'stor'}.`;
      $('#dialogText').textContent=r;speak(r,()=>renderStep(true));return;
    }
    status.textContent='Alex svarar…';
    const voice=createStreamingSpeechV115();
    try{
      const data=await callAiStreamV115(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:d.alcoholic?['4','6','8']:['liten','mellan','stor']},(full,delta)=>{
        status.textContent=full;
        voice.push(delta);
      });
      voice.finish();
      status.textContent=data.reply;
      await voice.done;
    }catch(e){
      voice.cancel();
      console.error('Bar AI 1.15 serving fallback',e);
      askServingLocalV115();
    }
  })
};

const askAmountLocalV115=askAmount;
askAmount=function(s){
  state.amountFails=0;
  const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra, ${s.a}. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;
  showPrompt('Bartendern',prompt,`Mängd i ${s.amount.unit}`,async(value,status,wrap)=>{
    const text=String(value||'').trim();if(!text)return;
    const n=parseNum(text);
    if(Number.isFinite(n)){
      if(Math.abs(n-expected)<.11){status.textContent=`Rätt: ${fmt(expected,s.amount.unit)}.`;speak(`Precis. ${fmt(expected,s.amount.unit)}.`,()=>{wrap.remove();advanceStep(s)});return}
      state.wrong++;state.points=Math.max(0,state.points-2);state.amountFails++;
      status.textContent=state.amountFails>=3?'Tre fel. Här får du tre alternativ – ett är rätt.':`Inte riktigt. Försök igen. (${state.amountFails}/3)`;
      speak('Inte riktigt. Tänk på proportionerna.');if(state.amountFails>=3)renderAmountHints(expected,s.amount.unit,status,wrap,s);return;
    }
    status.textContent='Alex svarar…';
    const voice=createStreamingSpeechV115();
    try{
      const data=await callAiStreamV115(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:fmt(expected,s.amount.unit),answerMode:'single',answerParts:[fmt(expected,s.amount.unit)],alreadyCorrectParts:[],options:[]},(full,delta)=>{
        status.textContent=full;
        voice.push(delta);
      });
      voice.finish();
      status.textContent=data.reply;
      await voice.done;
    }catch(e){
      voice.cancel();
      console.error('Bar AI 1.15 amount fallback',e);
      status.textContent='Jag tappade uppkopplingen. Du kan skriva mängden med siffror.';
    }
  })
};

$('#enterBtn')?.addEventListener('click',()=>{
  state.aiPreviousResponseId=null;
  state.aiLastTTFT=0;
  state.aiLastTotal=0;
  try{speechSynthesis.cancel()}catch(_){ }
},true);

window.__barAI115={
  endpoint:BAR_AI_URL_V115,
  model:()=>state.aiModel,
  reasoning:()=>state.aiReasoning,
  previousResponseId:()=>state.aiPreviousResponseId,
  ttft:()=>state.aiLastTTFT,
  total:()=>state.aiLastTotal,
  call:callAiStreamV115
};
