'use strict';

/* Bar Game 1.14 AI conversation layer.
   GPT-5.6 Terra, reasoning none, streaming, previous_response_id and default
   service tier. The local game engine remains authoritative for recipes,
   scoring and progression. Version 1.13 files are never modified. */

const BAR_AI_URL_V114='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v114';
const BAR_SUPABASE_KEY_V114='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiPreviousResponseId=null;
state.aiBusy=false;
state.aiModel='gpt-5.6-terra';
state.aiReasoning='none';
state.aiLastTTFT=0;
state.aiLastTotal=0;

function aiSpecV114(s){
  if(!s)return {mode:'single',parts:[]};
  const spec=answerPartsV112(s.a);
  return {mode:spec.mode,parts:spec.parts};
}

function aiCurrentChatQuestionV114(){
  if(state.conversationIndex<convo.length){
    const item=convo[Math.min(state.conversationIndex,convo.length-1)];
    return item?.q(state.name)||null;
  }
  return 'Vad är du sugen på?';
}

function aiGameContextV114(extra={}){
  const s=state.phase==='recipe'?state.drink?.steps?.[state.step]:null;
  const spec=s?aiSpecV114(s):{mode:'single',parts:[]};
  const mem=ensureDialogMemoryV112?.()||{};
  return {
    phase:state.phase,
    playerName:state.name,
    drink:state.drink?.name||null,
    difficulty:state.difficulty,
    currentQuestion:state.phase==='recipe'?(state.lastRecipeQuestion||s?.q||null):state.phase==='chat'?aiCurrentChatQuestionV114():null,
    expectedAnswer:s?.a||null,
    answerMode:spec.mode,
    answerParts:spec.parts,
    alreadyCorrectParts:Array.isArray(mem.lastPartial)?mem.lastPartial.slice():[],
    options:s?.opts||[],
    ...extra
  };
}

function setAiBusyV114(busy,label='Bartendern tänker…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  if(busy){const st=$('#recipeStatus');if(st)st.textContent=label}
}

function aiFallbackNoticeV114(){
  toast('AI-bartendern svarar inte just nu – reservdialog används.');
}

function parseSseEventV114(block){
  const rows=String(block||'').split('\n');
  for(const row of rows){
    if(!row.startsWith('data:'))continue;
    const raw=row.slice(5).trim();
    if(!raw||raw==='[DONE]')continue;
    try{return JSON.parse(raw)}catch(_){ }
  }
  return null;
}

async function callAiStreamV114(message,extra={},onDelta=()=>{},allowRetry=true){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  const started=performance.now();
  let firstDelta=0;
  try{
    const r=await fetch(BAR_AI_URL_V114,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V114},
      body:JSON.stringify({
        message,
        previous_response_id:state.aiPreviousResponseId,
        game:aiGameContextV114(extra)
      }),
      signal:controller.signal
    });
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      if(allowRetry&&state.aiPreviousResponseId){
        console.warn('Bar AI 1.14 resets previous_response_id after upstream error',data);
        state.aiPreviousResponseId=null;
        clearTimeout(timer);
        return callAiStreamV114(message,extra,onDelta,false);
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
        const ev=parseSseEventV114(block);if(!ev)continue;
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
    console.info(`Bar AI 1.14 · första text ${(state.aiLastTTFT/1000).toFixed(2)} s · totalt ${(total/1000).toFixed(2)} s · ${serviceTier}`);
    return {reply:reply.trim()||'Jag hänger med.',response_id:responseId,service_tier:serviceTier,ttft_ms:state.aiLastTTFT,total_ms:total};
  }finally{clearTimeout(timer)}
}

function streamDialogV114(text){
  const el=$('#dialogText');if(el)el.textContent=text;
}

function classifyRecipeV114(text,s){
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

function registerAiWrongV114(s){
  state.wrong++;
  state.points=Math.max(0,state.points-2);
  state.questionFails++;
  if(state.difficulty==='easy')renderEasy(s);
  else if(state.questionFails>=3)renderFree(s,'Tre fel – här får du tre alternativ. Ett är rätt.');
}

const handleConversationLocalV114=handleConversation;
handleConversation=async function(raw){
  if(state.aiBusy)return;
  stopIdle();
  const text=String(raw||'').trim();
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';
  const drink=resolveDrink(text);
  $('#dialogControls').innerHTML='';
  streamDialogV114('');
  setAiBusyV114(true,'Alex svarar…');
  try{
    const data=await callAiStreamV114(text,{phase:'chat',currentQuestion:aiCurrentChatQuestionV114(),expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:[]},full=>streamDialogV114(full));
    setAiBusyV114(false);
    const reply=data.reply;
    streamDialogV114(reply);
    if(drink){
      speak(reply,()=>setTimeout(()=>{if(state.phase==='chat')orderDrink(drink)},250));
      return;
    }
    speak(reply,()=>setTimeout(()=>{if(state.phase==='chat')renderConversationInput(false)},250));
  }catch(e){
    console.error('Bar AI 1.14 chat fallback',e);
    setAiBusyV114(false);
    aiFallbackNoticeV114();
    handleConversationLocalV114(text);
  }
};

const handleRecipeInputLocalV114=handleRecipeInput;
handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
  const text=String(raw||'').trim(),s=state.drink?.steps?.[state.step];
  if(!s||state.phase!=='recipe')return;
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';
  const classification=classifyRecipeV114(text,s);
  setAiBusyV114(true,'Alex svarar…');
  streamDialogV114('');
  try{
    const data=await callAiStreamV114(text,{},full=>streamDialogV114(full));
    setAiBusyV114(false);
    const reply=data.reply;
    streamDialogV114(reply);

    if(classification.kind==='repeat'){
      state.recipeChatTurns=0;speak(reply);return;
    }
    if(classification.kind==='help'){
      state.recipeChatTurns=0;speak(reply);showHelpOptionsV112(s,reply);return;
    }
    if(classification.kind==='partial'){
      state.recipeChatTurns=0;
      ensureDialogMemoryV112().lastPartial=classification.partial.found.slice();
      speak(reply);return;
    }
    if(classification.kind==='correct'){
      state.recipeChatTurns=0;
      ensureDialogMemoryV112().lastPartial=[];
      speak(reply,()=>answerStep(s.a,null,true,true));return;
    }
    if(classification.kind==='wrong'){
      state.recipeChatTurns=0;
      speak(reply,()=>registerAiWrongV114(s));return;
    }
    state.recipeChatTurns++;
    speak(reply);
  }catch(e){
    console.error('Bar AI 1.14 recipe fallback',e);
    setAiBusyV114(false);
    aiFallbackNoticeV114();
    handleRecipeInputLocalV114(text);
  }
};

const askServingLocalV114=askServing;
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
    try{
      let shown='';
      const data=await callAiStreamV114(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:d.alcoholic?['4','6','8']:['liten','mellan','stor']},full=>{shown=full;status.textContent=full});
      status.textContent=data.reply;speak(data.reply);
    }catch(e){
      console.error('Bar AI 1.14 serving fallback',e);
      askServingLocalV114();
    }
  })
};

const askAmountLocalV114=askAmount;
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
    try{
      const data=await callAiStreamV114(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:fmt(expected,s.amount.unit),answerMode:'single',answerParts:[fmt(expected,s.amount.unit)],alreadyCorrectParts:[],options:[]},full=>status.textContent=full);
      status.textContent=data.reply;speak(data.reply);
    }catch(e){
      console.error('Bar AI 1.14 amount fallback',e);
      status.textContent='Jag tappade uppkopplingen. Du kan skriva mängden med siffror.';
    }
  })
};

$('#enterBtn')?.addEventListener('click',()=>{
  state.aiPreviousResponseId=null;
  state.aiLastTTFT=0;
  state.aiLastTotal=0;
},true);

window.__barAI114={
  endpoint:BAR_AI_URL_V114,
  model:()=>state.aiModel,
  reasoning:()=>state.aiReasoning,
  previousResponseId:()=>state.aiPreviousResponseId,
  ttft:()=>state.aiLastTTFT,
  total:()=>state.aiLastTotal,
  call:callAiStreamV114
};
