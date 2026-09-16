'use strict';

/* Bar Game 1.18 synchronization layer.
   Fixes recipe-step desynchronization without changing 1.17.
   One recipe step is now the single source of truth for dialog text, AI context
   and answer controls. Every AI turn carries a step token; stale turns are ignored.
   Choice buttons are disabled while an AI turn is in flight. */

const BAR_AI_URL_V118='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v118';
const BAR_SUPABASE_KEY_V118='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.recipeSessionV118=0;

function recipeTokenV118(kind='recipe'){
  const drink=state.drink?.id||'none';
  return `${kind}:${state.recipeSessionV118}:${drink}:${state.step}`;
}
function recipeSnapshotV118(){
  return {session:state.recipeSessionV118,drinkId:state.drink?.id||null,step:state.step,phase:state.phase,token:recipeTokenV118('recipe')};
}
function sameRecipeSnapshotV118(snap){
  return Boolean(snap&&state.phase==='recipe'&&state.recipeSessionV118===snap.session&&(state.drink?.id||null)===snap.drinkId&&state.step===snap.step&&recipeTokenV118('recipe')===snap.token);
}
function setAiBusyV118(busy,label='Alex svarar…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic','#specialSend','#specialMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  $$('.choice').forEach(el=>el.disabled=busy);
  if(busy){const st=$('#recipeStatus')||$('#specialStatus');if(st)st.textContent=label}
}

function aiGameContextV118(extra={}){
  const s=state.phase==='recipe'?state.drink?.steps?.[state.step]:null;
  const spec=s?recipeSpec(s):{mode:'single',parts:[]};
  const phase=extra.phase||state.phase;
  const token=extra.stepToken||(
    phase==='recipe'?recipeTokenV118('recipe'):
    phase==='amount'?recipeTokenV118('amount'):
    phase==='serving'?recipeTokenV118('serving'):
    `chat:${state.recipeSessionV118}`
  );
  return {
    phase,
    playerName:state.name,
    under18:state.under18,
    difficulty:state.difficulty,
    drink:state.drink?.name||null,
    availableDrinks:drinks.map(d=>({id:d.id,name:d.name,minAge:d.minAge})),
    currentQuestion:extra.currentQuestion??(state.phase==='recipe'?(state.lastRecipeQuestion||s?.q||null):null),
    expectedAnswer:extra.expectedAnswer??(s?.a||null),
    answerMode:extra.answerMode??spec.mode,
    answerParts:extra.answerParts??spec.parts,
    alreadyCorrectParts:extra.alreadyCorrectParts??state.aiCorrectParts.slice(),
    options:extra.options??(s?.opts||[]),
    expectedServing:extra.expectedServing??[],
    expectedAmount:extra.expectedAmount??null,
    amountUnit:extra.amountUnit??null,
    stepIndex:state.phase==='recipe'?state.step:null,
    stepToken:token
  };
}

async function callAiStreamV118(message,extra={},onReply=()=>{},allowRetry=true){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),22000);
  const started=performance.now();
  let first=0;
  try{
    const context=aiGameContextV118(extra);
    const r=await fetch(BAR_AI_URL_V118,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V118},
      body:JSON.stringify({message,previous_response_id:state.aiPreviousResponseId,game:context}),
      signal:controller.signal
    });
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      if(allowRetry&&state.aiPreviousResponseId){state.aiPreviousResponseId=null;clearTimeout(timer);return callAiStreamV118(message,extra,onReply,false)}
      throw new Error((data.error||`HTTP ${r.status}`)+(data.detail?` · ${data.detail}`:''))
    }
    if(!r.body)throw new Error('Tom AI-ström');
    const reader=r.body.getReader(),decoder=new TextDecoder();
    let buffer='',rawJson='',shownReply='',responseId=null,serviceTier='default';
    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      let cut;
      while((cut=buffer.indexOf('\n\n'))>=0){
        const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);
        const ev=parseSseEventV116(block);if(!ev)continue;
        if(ev.type==='response.output_text.delta'){
          rawJson+=String(ev.delta||'');
          const replyNow=partialReplyFromJsonV116(rawJson);
          if(replyNow.length>shownReply.length){
            if(!first)first=performance.now();
            const delta=replyNow.slice(shownReply.length);shownReply=replyNow;onReply(shownReply,delta,context.stepToken)
          }
        }else if(ev.type==='response.created'||ev.type==='response.in_progress'||ev.type==='response.completed'){
          if(ev.response?.id)responseId=ev.response.id;
          if(ev.response?.service_tier)serviceTier=ev.response.service_tier;
        }else if(ev.type==='response.failed'){
          throw new Error(ev.response?.error?.message||ev.error?.message||'AI-svaret misslyckades')
        }
      }
    }
    let turn;try{turn=JSON.parse(rawJson)}catch(_){throw new Error('AI-svaret kunde inte tolkas strukturerat')}
    const total=performance.now()-started;
    state.aiLastTTFT=first?first-started:total;state.aiLastTotal=total;
    if(responseId)state.aiPreviousResponseId=responseId;
    return {turn,response_id:responseId,service_tier:serviceTier,ttft_ms:state.aiLastTTFT,total_ms:total,request_token:context.stepToken}
  }finally{clearTimeout(timer)}
}

/* Start of a drink creates a new recipe session so a delayed response from an
   earlier drink can never match the current step token. */
orderDrink=function(d){
  stopIdle();state.recipeSessionV118++;
  state.phase='recipe';state.drink=d;state.step=0;state.correct=0;state.wrong=0;state.points=0;state.startedAt=Date.now();state.serving=null;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];updateHud();$('#dialogControls').innerHTML='';
  const intro=pick([`${d.intro} Bra val. Du får hjälpa mig bakom baren.`,`${d.intro} Då kör vi. Du får jobba lite också.`,`${d.intro} Snyggt val. Kom, så bygger vi den tillsammans.`]);
  $('#dialogText').textContent=intro;
  speak(intro,()=>{if(state.phase!=='recipe'||state.drink!==d)return;if(state.difficulty==='hard')askServing();else renderStep(true)})
};

/* Atomic rendering: question text and controls are always produced from the
   same state.step in the same synchronous turn. */
renderStep=function(newStep=false,prefix=''){
  if(state.phase!=='recipe'||!state.drink)return;
  if(state.step>=state.drink.steps.length){$('#dialogControls').innerHTML='';startPhysicalAction('drink','result');return}
  if(newStep){state.questionFails=0;state.amountFails=0;state.aiCorrectParts=[]}
  const stepAtRender=state.step;
  const s=state.drink.steps[stepAtRender];
  const q=naturalQuestion(s);
  state.lastRecipeQuestion=q;
  const shown=prefix?`${prefix} ${q}`:q;
  $('#dialogControls').innerHTML='';
  $('#dialogText').textContent=shown;
  if(state.difficulty==='easy')renderEasy(s);else renderFree(s);
  speak(shown)
};

advanceStep=function(s,prefix=''){
  if(state.phase!=='recipe'||!state.drink)return;
  state.step++;
  state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];
  $('#dialogControls').innerHTML='';
  if(s?.action){startPhysicalAction(s.action,'continue');return}
  renderStep(true,prefix)
};

completeRecipeStep=function(s,withPraise=false){
  state.correct++;state.points+=10;state.aiCorrectParts=[];
  if(state.difficulty==='hard'&&s.amount){askAmount(s);return}
  const prefix=withPraise?pick(['Precis.','Rätt, där satt den.','Snyggt.']):'';
  advanceStep(s,prefix)
};

handleConversation=async function(raw){
  if(state.aiBusy)return;
  stopIdle();const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';$('#dialogControls').innerHTML='';streamDialogV116('');setAiBusyV118(true);
  const voice=createStreamingSpeechV116();const token=`chat:${state.recipeSessionV118}`;
  try{
    const data=await callAiStreamV118(text,{phase:'chat',currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],stepToken:token},(full,delta)=>{streamDialogV116(full);voice.push(delta)});
    voice.finish();setAiBusyV118(false);const turn=data.turn;streamDialogV116(turn.reply||'Jag hänger med.');await voice.done;
    if(turn.context_token!==token)return;
    if(turn.action==='order_drink'&&turn.drink_id){orderDrinkById(String(turn.drink_id));return}
    if(state.phase==='chat')renderConversationInput(false)
  }catch(e){voice.cancel();console.error('Bar 1.18 chat',e);setAiBusyV118(false);aiFallbackV116();renderConversationInput(false)}
};

handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
  const text=String(raw||'').trim(),s=state.drink?.steps?.[state.step];
  if(!s||state.phase!=='recipe')return;if(!text){toast('Säg eller skriv något först.');return}
  const snap=recipeSnapshotV118();const input=$('#recipeText');if(input)input.value='';
  setAiBusyV118(true);streamDialogV116('');const voice=createStreamingSpeechV116();
  try{
    const data=await callAiStreamV118(text,{stepToken:snap.token},(full,delta)=>{
      if(!sameRecipeSnapshotV118(snap)){voice.cancel();return}
      streamDialogV116(full);voice.push(delta)
    });
    if(!sameRecipeSnapshotV118(snap)){voice.cancel();setAiBusyV118(false);return}
    voice.finish();setAiBusyV118(false);const turn=data.turn;
    if(turn.context_token!==snap.token){voice.cancel();renderStep(false);return}
    streamDialogV116(turn.reply||'Jag lyssnar.');await voice.done;
    if(!sameRecipeSnapshotV118(snap))return;
    if(turn.action==='repeat_question')return;
    if(turn.action==='request_help'){showHelpOptions(s,turn.reply);return}
    if(turn.action!=='recipe_attempt')return;
    const outcome=recipeOutcomeV116(turn,s);
    if(outcome.kind==='correct'){state.aiCorrectParts=[];completeRecipeStep(s,false);return}
    if(outcome.kind==='partial'){state.aiCorrectParts=outcome.combined;return}
    registerWrongAnswer(s)
  }catch(e){voice.cancel();console.error('Bar 1.18 recipe',e);setAiBusyV118(false);if(sameRecipeSnapshotV118(snap)){aiFallbackV116();renderFree(s,'Försök igen när anslutningen är tillbaka.')}}
};

askServing=function(){
  const d=state.drink,prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  const token=recipeTokenV118('serving');
  renderSpecialPrompt(prompt,d.alcoholic?'Säg till exempel sexa':'Säg liten, mellan eller stor',async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV118(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV116();
    try{
      const data=await callAiStreamV118(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],expectedServing:[4,6,8],stepToken:token},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV118(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.context_token!==token)return;
      if(turn.action==='request_help'){renderServingChoices(status);return}
      if(turn.action==='serving_choice'&&[4,6,8].includes(Number(turn.serving_value))){acceptServingValue(Number(turn.serving_value));return}
    }catch(e){voice.cancel();console.error('Bar 1.18 serving',e);setAiBusyV118(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

askAmount=function(s){
  state.amountFails=0;
  const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;
  const token=recipeTokenV118('amount');
  renderSpecialPrompt(prompt,`Mängd i ${s.amount.unit}`,async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV118(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV116();
    try{
      const data=await callAiStreamV118(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],expectedAmount:expected,amountUnit:s.amount.unit,stepToken:token},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV118(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.context_token!==token)return;
      if(turn.action==='request_help'){renderAmountHints(s,status);return}
      if(turn.action!=='amount_answer')return;
      const n=Number(turn.amount_value);
      if(Number.isFinite(n)&&Math.abs(n-expected)<0.11){advanceStep(s);return}
      registerAmountWrong(s,status)
    }catch(e){voice.cancel();console.error('Bar 1.18 amount',e);setAiBusyV118(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

$('#enterBtn')?.addEventListener('click',()=>{
  state.aiPreviousResponseId=null;state.aiLastTTFT=0;state.aiLastTotal=0;state.aiCorrectParts=[];state.recipeSessionV118++;
},true);

window.__barAI118={
  endpoint:BAR_AI_URL_V118,
  token:()=>recipeTokenV118('recipe'),
  session:()=>state.recipeSessionV118,
  previousResponseId:()=>state.aiPreviousResponseId,
  ttft:()=>state.aiLastTTFT,
  total:()=>state.aiLastTotal
};
