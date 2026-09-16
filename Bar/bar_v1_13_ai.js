'use strict';

/* Bar Game 1.13 AI conversation layer.
   Free text is interpreted by the Supabase/OpenAI bartender. The local 1.12
   engine remains only as an offline fallback. Game scoring and progression
   stay deterministic in the browser. */

const BAR_AI_URL_V113='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-v1';
const BAR_SUPABASE_KEY_V113='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiHistory=[];
state.aiCorrectParts=[];
state.aiBusy=false;
state.aiModel='gpt-5.6-luna';
state.aiReasoning='low';

function aiPushV113(speaker,text){
  const t=String(text||'').trim();
  if(!t)return;
  state.aiHistory.push({speaker,text:t});
  // Whole normal game session is retained. This is only a runaway-session guard.
  if(state.aiHistory.length>250)state.aiHistory=state.aiHistory.slice(-250);
}

const speakLocalV113=speak;
speak=function(text,onEnd){
  aiPushV113('bartender',text);
  return speakLocalV113(text,onEnd)
};

$('#enterBtn')?.addEventListener('click',()=>{
  state.aiHistory=[];
  state.aiCorrectParts=[];
},true);

function aiSpecV113(s){
  if(!s)return {mode:'single',parts:[]};
  const spec=answerPartsV112(s.a);
  return {mode:spec.mode,parts:spec.parts};
}

function aiCurrentChatQuestionV113(){
  if(state.conversationIndex<convo.length){
    const item=convo[Math.min(state.conversationIndex,convo.length-1)];
    return item?.q(state.name)||null;
  }
  return 'Vad är du sugen på?';
}

function aiGameContextV113(extra={}){
  const s=state.phase==='recipe'?state.drink?.steps?.[state.step]:null;
  const spec=s?aiSpecV113(s):{mode:'single',parts:[]};
  return {
    phase:state.phase,
    playerName:state.name,
    drink:state.drink?.name||null,
    difficulty:state.difficulty,
    currentQuestion:state.phase==='recipe'?(state.lastRecipeQuestion||s?.q||null):state.phase==='chat'?aiCurrentChatQuestionV113():null,
    expectedAnswer:s?.a||null,
    answerMode:spec.mode,
    answerParts:spec.parts,
    alreadyCorrectParts:[...(state.aiCorrectParts||[])],
    options:s?.opts||[],
    ...extra
  };
}

async function callAiV113(message,extra={}){
  const previous=state.aiHistory.slice();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),18000);
  try{
    const r=await fetch(BAR_AI_URL_V113,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V113},
      body:JSON.stringify({message,history:previous,game:aiGameContextV113(extra)}),
      signal:controller.signal
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);
    aiPushV113('player',message);
    state.aiModel=data.model||state.aiModel;
    state.aiReasoning=data.reasoning||state.aiReasoning;
    return data;
  }finally{clearTimeout(timer)}
}

function setAiBusyV113(busy,label='Bartendern tänker…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  if(busy){const st=$('#recipeStatus');if(st)st.textContent=label}
}

function aiFallbackNoticeV113(){
  toast('AI-bartendern svarar inte just nu – reservdialog används.');
}

const renderStepLocalV113=renderStep;
renderStep=function(newStep=false){
  if(newStep)state.aiCorrectParts=[];
  return renderStepLocalV113(newStep)
};

const handleConversationLocalV113=handleConversation;
handleConversation=async function(raw){
  if(state.aiBusy)return;
  stopIdle();
  const text=String(raw||'').trim();
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';
  const drink=resolveDrink(text);
  const item=convo[Math.min(state.conversationIndex,convo.length-1)];
  setAiBusyV113(true);
  try{
    const data=await callAiV113(text,{phase:'chat',currentQuestion:aiCurrentChatQuestionV113(),expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:[]});
    if(data.answered_pending_question&&item&&state.conversationIndex<convo.length){
      state.conversationAnswers[item.key]=text;
      state.conversationIndex++;
    }
    const reply=String(data.reply||'Jag hör dig.').trim();
    $('#dialogControls').innerHTML='';
    $('#dialogText').textContent=reply;
    setAiBusyV113(false);
    if(drink){
      speak(reply,()=>setTimeout(()=>{if(state.phase==='chat')orderDrink(drink)},300));
      return;
    }
    const askNext=!!data.answered_pending_question;
    speak(reply,()=>setTimeout(()=>{if(state.phase==='chat')renderConversationInput(askNext)},450));
  }catch(e){
    console.error('Bar AI chat fallback',e);
    setAiBusyV113(false);
    aiPushV113('player',text);
    aiFallbackNoticeV113();
    handleConversationLocalV113(text);
  }
};

function expectedPartsV113(s){return aiSpecV113(s).parts.map(semanticNormalizeV112)}
function matchedPartsV113(data,s){
  const allowed=expectedPartsV113(s);
  return [...new Set((Array.isArray(data?.matched_parts)?data.matched_parts:[]).map(semanticNormalizeV112).filter(x=>allowed.includes(x)))];
}
function acceptedByGameV113(data,s){
  const spec=aiSpecV113(s),expected=spec.parts.map(semanticNormalizeV112);
  const combined=[...new Set([...(state.aiCorrectParts||[]).map(semanticNormalizeV112),...matchedPartsV113(data,s)])];
  if(spec.mode==='all')return expected.length>0&&expected.every(x=>combined.includes(x));
  if(spec.mode==='any')return expected.some(x=>combined.includes(x));
  return expected.length===1&&combined.includes(expected[0]);
}
function mergeCorrectPartsV113(data,s){
  state.aiCorrectParts=[...new Set([...(state.aiCorrectParts||[]),...matchedPartsV113(data,s)])];
}
function registerAiWrongV113(s,reply){
  state.wrong++;
  state.points=Math.max(0,state.points-2);
  state.questionFails++;
  const r=reply||'Inte riktigt. Försök igen.';
  $('#dialogText').textContent=r;
  speak(r,()=>{
    if(state.difficulty==='easy')renderEasy(s);
    else if(state.questionFails>=3)renderFree(s,r);
  });
}

const handleRecipeInputLocalV113=handleRecipeInput;
handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
  const text=String(raw||'').trim(),s=state.drink?.steps?.[state.step];
  if(!s||state.phase!=='recipe')return;
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';
  setAiBusyV113(true);
  try{
    const data=await callAiV113(text);
    setAiBusyV113(false);
    const reply=String(data.reply||'').trim()||'Jag hör dig.';

    if(data.repeat_question){
      state.recipeChatTurns=0;
      const r=reply||`Absolut. Frågan var: ${state.lastRecipeQuestion||s.q}`;
      $('#dialogText').textContent=r;speak(r);return;
    }

    mergeCorrectPartsV113(data,s);
    const gameAccepts=acceptedByGameV113(data,s);

    // The browser game, not the model, has final authority over progression.
    if(gameAccepts){
      state.recipeChatTurns=0;
      const r=(data.answer_status==='partial')?'Ja, där satt sista delen också. Då har vi hela svaret.':reply;
      $('#dialogText').textContent=r;
      speak(r,()=>answerStep(s.a,null,true,true));
      return;
    }

    if(data.wants_options&&data.answer_status==='none'){
      state.recipeChatTurns=0;
      $('#dialogText').textContent=reply;speak(reply);
      showHelpOptionsV112(s,reply);return;
    }

    if(data.answer_status==='partial'&&matchedPartsV113(data,s).length){
      state.recipeChatTurns=0;
      $('#dialogText').textContent=reply;speak(reply);return;
    }

    if(data.answer_status==='incorrect'){
      state.recipeChatTurns=0;
      registerAiWrongV113(s,reply);return;
    }

    // ambiguous or ordinary conversation: no penalty and the recipe question stays open.
    state.recipeChatTurns++;
    $('#dialogText').textContent=reply;
    speak(reply);
  }catch(e){
    console.error('Bar AI recipe fallback',e);
    setAiBusyV113(false);
    aiPushV113('player',text);
    aiFallbackNoticeV113();
    handleRecipeInputLocalV113(text);
  }
};

// Give hard-mode overlays conversational memory as well. Numeric correctness remains local.
const askServingLocalV113=askServing;
askServing=function(){
  const d=state.drink;
  const prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  showPrompt('Bartendern',prompt,d.alcoholic?'4, 6 eller 8':'liten, mellan eller stor',async(value,status,wrap)=>{
    const text=String(value||'').trim();if(!text)return;
    let n;
    if(!d.alcoholic){const x=normalize(text);if(x.includes('liten'))n=4;else if(x.includes('mellan'))n=6;else if(x.includes('stor'))n=8}
    if(!n)n=parseNum(text);
    if([4,6,8].includes(n)){
      aiPushV113('player',text);state.serving=n;updateHud();wrap.remove();
      const r=d.alcoholic?`${n}:a blir bra. Då räknar vi receptet efter den.`:`Bra, då kör vi ${n===4?'liten':n===6?'mellan':'stor'}.`;
      $('#dialogText').textContent=r;speak(r,()=>renderStep(true));return;
    }
    status.textContent='Bartendern tänker…';
    try{
      const data=await callAiV113(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerParts:[],alreadyCorrectParts:[],options:d.alcoholic?['4','6','8']:['liten','mellan','stor']});
      status.textContent=data.reply||'';speak(data.reply||'Säg vilken storlek du känner för.');
    }catch(e){aiPushV113('player',text);status.textContent='Säg 4, 6 eller 8 – eller fråga mig något först.'}
  })
};

const askAmountLocalV113=askAmount;
askAmount=function(s){
  state.amountFails=0;
  const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra, ${s.a}. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;
  showPrompt('Bartendern',prompt,`Mängd i ${s.amount.unit}`,async(value,status,wrap)=>{
    const text=String(value||'').trim();if(!text)return;
    const n=parseNum(text);
    if(Number.isFinite(n)){
      aiPushV113('player',text);
      if(Math.abs(n-expected)<.11){status.textContent=`Rätt: ${fmt(expected,s.amount.unit)}.`;speak(`Precis. ${fmt(expected,s.amount.unit)}.`,()=>{wrap.remove();advanceStep(s)});return}
      state.wrong++;state.points=Math.max(0,state.points-2);state.amountFails++;
      status.textContent=state.amountFails>=3?'Tre fel. Här får du tre alternativ – ett är rätt.':`Inte riktigt. Försök igen. (${state.amountFails}/3)`;
      speak('Inte riktigt. Tänk på proportionerna.');if(state.amountFails>=3)renderAmountHints(expected,s.amount.unit,status,wrap,s);return;
    }
    status.textContent='Bartendern tänker…';
    try{
      const data=await callAiV113(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:fmt(expected,s.amount.unit),answerMode:'single',answerParts:[fmt(expected,s.amount.unit)],alreadyCorrectParts:[],options:[]});
      status.textContent=data.reply||'';speak(data.reply||'Vi håller mängdfrågan öppen.');
      if(data.wants_options)renderAmountHints(expected,s.amount.unit,status,wrap,s);
    }catch(e){aiPushV113('player',text);status.textContent='Jag tappade uppkopplingen. Du kan skriva mängden med siffror.'}
  })
};

window.__barAI113={
  endpoint:BAR_AI_URL_V113,
  model:()=>state.aiModel,
  reasoning:()=>state.aiReasoning,
  history:()=>state.aiHistory.slice(),
  call:callAiV113
};
