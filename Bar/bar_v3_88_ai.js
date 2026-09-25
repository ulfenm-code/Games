'use strict';

/* Bar Game 3.88 AI + recipe/event controller.
   One controller owns the recipe UI/state transition after Terra has interpreted
   free language. Help is no longer represented as three errors, AI replies are
   never duplicated into the status area, and one recipe step owns question,
   choices, scoring and transition atomically. */

const BAR_AI_URL_V119='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v121';
const BAR_TTS_INSTRUCTION_V337='Tala naturlig svenska med varm manlig bartender-röst. Avslappnad, vänlig och energisk. Tala i ett ganska raskt naturligt tempo.';
const BAR_SUPABASE_KEY_V119='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiPreviousResponseId=null;
state.aiBusy=false;
state.aiLastTTFT=0;
state.aiLastTotal=0;
state.recipeSessionV119=0;
state.recipeHelpV119=false;
state.recipeRequestSeqV119=0;
state.aiEventChainV388=Promise.resolve();

function setAiBusyV119(busy,label='Alex svarar…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic','#specialSend','#specialMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  $$('.choice').forEach(el=>el.disabled=busy);
  if(busy){const st=$('#recipeStatus')||$('#specialStatus');if(st)st.textContent=label}
}
function streamDialogV119(text){const el=$('#dialogText');if(el)el.textContent=text}
function aiFallbackV119(message='Kunde inte nå Alex. Försök igen.'){streamDialogV119(message)}

function parseSseEventV119(block){
  for(const row of String(block||'').split('\n')){
    if(!row.startsWith('data:'))continue;
    const raw=row.slice(5).trim();if(!raw||raw==='[DONE]')continue;
    try{return JSON.parse(raw)}catch(_){ }
  }
  return null
}
function partialReplyFromJsonV119(raw){
  const key='"reply"';const k=raw.indexOf(key);if(k<0)return'';
  let i=raw.indexOf(':',k+key.length);if(i<0)return'';i++;
  while(i<raw.length&&/\s/.test(raw[i]))i++;
  if(raw[i]!=='"')return'';i++;
  let out='';
  for(;i<raw.length;i++){
    const ch=raw[i];if(ch==='"')break;
    if(ch!=='\\'){out+=ch;continue}
    if(i+1>=raw.length)break;
    const n=raw[++i];
    if(n==='u'){
      if(i+4>=raw.length)break;
      const hex=raw.slice(i+1,i+5);if(!/^[0-9a-fA-F]{4}$/.test(hex))continue;
      out+=String.fromCharCode(parseInt(hex,16));i+=4;continue
    }
    const map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','"':'"','\\':'\\','/':'/'};
    out+=map[n]??n
  }
  return out
}
function createStreamingSpeechV119(){
  let pending='',chain=Promise.resolve(),streamDone=false,resolved=false,resolveDone,cancelled=false,playbackStarted=false;
  const done=new Promise(resolve=>{resolveDone=resolve});
  stopSpeech();
  function beginPlayback(){
    if(playbackStarted||cancelled)return;
    playbackStarted=true;
    startTalkingHead381()
  }
  function resolveVoice(){
    if(resolved)return;
    resolved=true;
    if(playbackStarted)stopTalkingHead381();
    resolveDone()
  }
  function maybeDone(){if(!resolved&&streamDone){chain.finally(resolveVoice)}}
  function queue(text){
    const s=String(text||'').trim();if(!s||cancelled)return;
    chain=chain.then(()=>cancelled?undefined:barPlayTtsV337(s,{manageHead:false,onPlaybackStart:beginPlayback}))
      .catch(e=>{if(e?.name!=='AbortError')console.error('OpenAI streaming TTS',e)})
  }
  function flushSentences(){const re=/^([\s\S]*?[.!?](?:\s+|$))/;while(true){const m=pending.match(re);if(!m)break;const s=m[1].trim();pending=pending.slice(m[1].length);if(s)queue(s)}}
  return {
    push(delta){if(cancelled)return;pending+=String(delta||'');flushSentences()},
    finish(){if(cancelled)return;if(pending.trim())queue(pending.trim());pending='';streamDone=true;maybeDone()},
    cancel(){cancelled=true;pending='';streamDone=true;stopSpeech();if(!resolved){resolved=true;resolveDone()}},
    done
  }
}
function recipeTokenV119(kind='recipe'){
  return `${kind}:${state.recipeSessionV119}:${state.drink?.id||'none'}:${state.step}`
}
function recipeSnapshotV119(){
  return {session:state.recipeSessionV119,drinkId:state.drink?.id||null,step:state.step,phase:state.phase,token:recipeTokenV119('recipe'),request:++state.recipeRequestSeqV119}
}
function sameRecipeSnapshotV119(snap){
  return Boolean(snap&&state.phase==='recipe'&&state.recipeSessionV119===snap.session&&(state.drink?.id||null)===snap.drinkId&&state.step===snap.step&&recipeTokenV119('recipe')===snap.token&&state.recipeRequestSeqV119===snap.request)
}
function currentStepV119(){return state.phase==='recipe'?state.drink?.steps?.[state.step]||null:null}
function sameStepObjectV119(s){return Boolean(s&&currentStepV119()===s)}

function aiGameContextV119(extra={}){
  const s=state.phase==='recipe'?currentStepV119():null;
  const spec=s?recipeSpec(s):{mode:'single',parts:[]};
  const phase=extra.phase||state.phase;
  const token=extra.stepToken||(
    phase==='recipe'?recipeTokenV119('recipe'):
    phase==='amount'?recipeTokenV119('amount'):
    phase==='serving'?recipeTokenV119('serving'):
    `chat:${state.recipeSessionV119}`
  );
  return {
    phase,
    playerName:state.name,
    under18:state.under18,
    difficulty:state.difficulty,
    drink:state.drink?.name||null,
    availableDrinks:drinkMenuCatalog.map(d=>({id:d.id,name:d.name,minAge:d.minAge,buildable:d.buildable})),
    buildableDrinkIds:[...buildableDrinkIds],
    currentQuestion:extra.currentQuestion??(state.phase==='recipe'?(state.lastRecipeQuestion||s?.q||null):null),
    expectedAnswer:extra.expectedAnswer??(s?.a||null),
    answerMode:extra.answerMode??spec.mode,
    answerParts:extra.answerParts??spec.parts,
    alreadyCorrectParts:extra.alreadyCorrectParts??state.aiCorrectParts.slice(),
    expectedServing:extra.expectedServing??[],
    expectedAmount:extra.expectedAmount??null,
    amountUnit:extra.amountUnit??null,
    stepIndex:state.phase==='recipe'?state.step:null,
    stepToken:token
  }
}

async function callAiStreamV119(message,extra={},onReply=()=>{},allowRetry=true){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),22000);const started=performance.now();let first=0;
  try{
    const context=aiGameContextV119(extra);
    const r=await fetch(BAR_AI_URL_V119,{method:'POST',headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V119},body:JSON.stringify({message,previous_response_id:state.aiPreviousResponseId,game:context,gameEvent:extra.gameEvent||null,voice_instruction:BAR_TTS_INSTRUCTION_V337}),signal:controller.signal});
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      if(allowRetry&&state.aiPreviousResponseId){state.aiPreviousResponseId=null;clearTimeout(timer);return callAiStreamV119(message,extra,onReply,false)}
      throw new Error((data.error||`HTTP ${r.status}`)+(data.detail?` · ${data.detail}`:''))
    }
    if(!r.body)throw new Error('Tom AI-ström');
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',rawJson='',shownReply='',responseId=null,serviceTier='default';
    while(true){
      const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let cut;
      while((cut=buffer.indexOf('\n\n'))>=0){
        const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const ev=parseSseEventV119(block);if(!ev)continue;
        if(ev.type==='response.output_text.delta'){
          rawJson+=String(ev.delta||'');const replyNow=partialReplyFromJsonV119(rawJson);
          if(replyNow.length>shownReply.length){if(!first)first=performance.now();const delta=replyNow.slice(shownReply.length);shownReply=replyNow;onReply(shownReply,delta,context.stepToken)}
        }else if(ev.type==='response.created'||ev.type==='response.in_progress'||ev.type==='response.completed'){
          if(ev.response?.id)responseId=ev.response.id;if(ev.response?.service_tier)serviceTier=ev.response.service_tier
        }else if(ev.type==='response.failed')throw new Error(ev.response?.error?.message||ev.error?.message||'AI-svaret misslyckades')
      }
    }
    let turn;try{turn=JSON.parse(rawJson)}catch(_){throw new Error('AI-svaret kunde inte tolkas strukturerat')}
    const total=performance.now()-started;state.aiLastTTFT=first?first-started:total;state.aiLastTotal=total;if(responseId)state.aiPreviousResponseId=responseId;
    return {turn,response_id:responseId,service_tier:serviceTier,ttft_ms:state.aiLastTTFT,total_ms:total,request_token:context.stepToken}
  }finally{clearTimeout(timer)}
}

function markUserActivityV388(){
  state.activityEpochV388=(state.activityEpochV388||0)+1;
  state.idleTurnsV388=0;
  stopIdle()
}
function waitAiFreeV388(epoch=null){
  return new Promise(resolve=>{
    let tries=0;
    const tick=()=>{
      if(epoch!==null&&epoch!==state.activityEpochV388){resolve(false);return}
      if(!state.aiBusy){resolve(true);return}
      if(++tries>240){resolve(false);return}
      setTimeout(tick,50)
    };
    tick()
  })
}
function writeAlexTargetV388(target,text){
  if(!target)return;
  const el=typeof target==='string'?$(target):target;
  if(el)el.textContent=String(text||'')
}
function alexEventV388(type,facts={},options={}){
  const activityEpoch=options.activityEpoch??null;
  const task=async()=>{
    if(activityEpoch!==null&&activityEpoch!==state.activityEpochV388)return null;
    const ready=await waitAiFreeV388(activityEpoch);if(!ready)return null;
    if(activityEpoch!==null&&activityEpoch!==state.activityEpochV388)return null;
    stopIdle();
    const phase=options.phase||state.phase;
    const target=options.target===undefined?'#dialogText':options.target;
    const extra={...(options.extra||{}),phase,gameEvent:{type,facts}};
    setAiBusyV119(true);writeAlexTargetV388(target,'');const voice=createStreamingSpeechV119();
    try{
      const data=await callAiStreamV119('',extra,(full,delta)=>{writeAlexTargetV388(target,full);voice.push(delta)});
      voice.finish();setAiBusyV119(false);const reply=data.turn?.reply||'';writeAlexTargetV388(target,reply);await voice.done;
      if(typeof options.after==='function')options.after(data);
      return data
    }catch(e){
      voice.cancel();setAiBusyV119(false);console.error('Alex game event '+type,e);
      if(target)writeAlexTargetV388(target,'Kunde inte nå Alex. Försök igen.');
      if(typeof options.after==='function')options.after(null);
      return null
    }
  };
  state.aiEventChainV388=state.aiEventChainV388.then(task,task);
  return state.aiEventChainV388
}
function idleAlexV388(epoch){
  if(epoch!==state.activityEpochV388)return Promise.resolve(null);
  if(state.phase!=='chat'&&state.phase!=='recipe')return Promise.resolve(null);
  const s=state.phase==='recipe'?currentStepV119():null;
  const spec=s?recipeSpec(s):{mode:'single',parts:[]};
  const token=state.phase==='recipe'?recipeTokenV119('recipe'):`chat:${state.recipeSessionV119}`;
  return alexEventV388('idle',{
    idleTurn:state.idleTurnsV388||1,
    phase:state.phase,
    questionPending:Boolean(s),
    wrongAttempts:state.questionFails||0
  },{
    activityEpoch:epoch,target:'#dialogText',phase:state.phase,
    extra:{
      currentQuestion:s?.q||null,
      expectedAnswer:s?.a||null,
      answerMode:spec.mode,
      answerParts:spec.parts,
      alreadyCorrectParts:state.aiCorrectParts.slice(),
      stepToken:token
    }
  })
}

function validatedCandidatePartsV119(turn,s){
  const spec=recipeSpec(s),expected=spec.parts.map(canon);
  return [...new Set((Array.isArray(turn?.candidate_parts)?turn.candidate_parts:[]).map(String).filter(p=>expected.includes(canon(p))).map(p=>spec.parts[expected.indexOf(canon(p))]))]
}
function recipeOutcomeV119(turn,s){
  const spec=recipeSpec(s),fresh=validatedCandidatePartsV119(turn,s),combined=[...new Set([...state.aiCorrectParts,...fresh])];
  if(spec.mode==='all'){
    const correct=spec.parts.every(p=>combined.some(x=>canon(x)===canon(p)));
    if(correct)return {kind:'correct',combined};
    if(fresh.length)return {kind:'partial',combined};
    return {kind:'wrong',combined}
  }
  if(spec.mode==='any')return fresh.length?{kind:'correct',combined:fresh}:{kind:'wrong',combined:[]};
  return fresh.some(x=>canon(x)===canon(spec.parts[0]))?{kind:'correct',combined:fresh}:{kind:'wrong',combined:[]}
}

function renderRecipeControlsV119(){
  const s=currentStepV119();if(!s)return;
  const easy=state.difficulty==='easy';
  const threeErrors=!easy&&state.questionFails>=3;
  const help=!easy&&state.recipeHelpV119;
  const direct=Boolean(s.directChoices);
  const showChoices=direct||easy||threeErrors||help;
  const header='';
  const choices=showChoices?`<div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`:'';
  $('#dialogControls').innerHTML=`${recipeInputHTML(easy?'Skriv svar eller prata med Alex':'Skriv svaret själv eller prata')}${header}${choices}`;
  const st=$('#recipeStatus');
  if(st)st.textContent=threeErrors?'Välj ett alternativ eller fortsätt svara med egna ord.':help?'Välj ett alternativ eller svara med egna ord.':'Frågan ligger kvar medan ni pratar.';
  $$('.choice').forEach(b=>b.onclick=()=>answerKnownChoice(b.textContent,b));
  wireRecipeInput();setAiBusyV119(Boolean(state.aiBusy));scheduleIdle()
}

renderEasy=function(_s){renderRecipeControlsV119()};
renderFree=function(_s,_message=''){renderRecipeControlsV119()};

async function speakRecipeIntentV337(instruction,extra={},after=null){
  if(state.aiBusy)return;
  setAiBusyV119(true);streamDialogV119('');const voice=createStreamingSpeechV119();
  try{
    const data=await callAiStreamV119(instruction,{phase:'recipe',...extra},(full,delta)=>{streamDialogV119(full);voice.push(delta)});
    voice.finish();setAiBusyV119(false);const reply=data.turn?.reply||'';streamDialogV119(reply);await voice.done;
    if(after)after(data)
  }catch(e){
    voice.cancel();setAiBusyV119(false);console.error('Recipe dialogue',e);
    if(after)after(null)
  }
}

renderStep=function(newStep=false){
  if(state.phase!=='recipe'||!state.drink)return;
  if(state.step>=state.drink.steps.length){$('#dialogControls').innerHTML='';startPhysicalAction('drink','result');return}
  if(newStep){state.questionFails=0;state.amountFails=0;state.aiCorrectParts=[];state.recipeHelpV119=false}
  const s=currentStepV119();
  state.lastRecipeQuestion=s.q;
  $('#dialogControls').innerHTML='';
  const token=recipeTokenV119('recipe');
  alexEventV388('recipe_question',{questionMeaning:s.q,stepIndex:state.step},{
    target:'#dialogText',phase:'recipe',
    extra:{currentQuestion:s.q,expectedAnswer:s.a,stepToken:token},
    after:()=>{if(state.phase==='recipe'&&state.drink&&currentStepV119()===s&&!state.aiBusy)renderRecipeControlsV119()}
  });
  alexEventV388('amount_question',{ingredient:s.amount.label,servingLabel:size,unit:s.amount.unit},{
    target:'#dialogText',phase:'amount',
    extra:{currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],expectedAmount:expected,amountUnit:s.amount.unit,stepToken:token}
  })
};

showHelpOptions=function(s,message=''){
  if(!sameStepObjectV119(s))return;
  state.recipeHelpV119=true;renderRecipeControlsV119()
};

registerWrongAnswer=function(s,preserveDialog=false){
  if(!sameStepObjectV119(s))return;
  markUserActivityV388();
  state.wrong++;state.points=Math.max(0,state.points-2);state.questionFails++;state.recipeHelpV119=false;renderRecipeControlsV119();
  if(!preserveDialog){
    const token=recipeTokenV119('recipe');
    alexEventV388('wrong_answer',{source:'choice_or_button',wrongAttempts:state.questionFails},{
      target:'#dialogText',phase:'recipe',
      extra:{currentQuestion:s.q,expectedAnswer:s.a,stepToken:token},
      after:()=>{if(state.phase==='recipe'&&currentStepV119()===s)scheduleIdle()}
    })
  }
};
function registerWrongIngredientV388(s,attemptedIngredient){
  if(!sameStepObjectV119(s))return;
  markUserActivityV388();
  state.wrong++;state.points=Math.max(0,state.points-2);state.questionFails++;state.recipeHelpV119=false;renderRecipeControlsV119();
  const token=recipeTokenV119('recipe');
  alexEventV388('wrong_ingredient',{clickedIngredient:String(attemptedIngredient||''),wrongAttempts:state.questionFails},{
    target:'#dialogText',phase:'recipe',
    extra:{currentQuestion:s.q,expectedAnswer:s.a,stepToken:token},
    after:()=>{if(state.phase==='recipe'&&currentStepV119()===s)scheduleIdle()}
  })
}

answerKnownChoice=function(answer,btn){
  const s=currentStepV119();if(!s||state.aiBusy)return;
  const ok=canon(answer)===canon(s.a);
  if(!ok){btn?.classList.add('bad');registerWrongAnswer(s,true);return}
  btn?.classList.add('good');completeRecipeStep(s,true)
};

completeRecipeStep=function(s,withPraise=false){
  if(!sameStepObjectV119(s))return;
  state.correct++;state.points+=10;state.aiCorrectParts=[];state.recipeHelpV119=false;
  if(state.difficulty==='hard'&&s.amount){askAmount(s);return}
  if(withPraise){
    markUserActivityV388();
    const token=recipeTokenV119('recipe');
    alexEventV388('correct_answer',{answer:s.a},{
      target:'#dialogText',phase:'recipe',
      extra:{currentQuestion:s.q,expectedAnswer:s.a,stepToken:token},
      after:()=>advanceStep(s)
    });
    return
  }
  advanceStep(s)
};

advanceStep=function(s){
  if(!sameStepObjectV119(s))return;
  state.step++;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];state.recipeHelpV119=false;
  $('#dialogControls').innerHTML='';
  if(s?.action){startPhysicalAction(s.action,'continue');return}
  if(s?.afterAi&&state.drink?.id==='mojito'){
    const finishedAnswer=s.a;
    const finishedStep=state.step-1;
    alexEventV388('recipe_transition',{fact:s.afterAi.fact,nextIntent:s.afterAi.nextIntent,finishedAnswer,finishedStep},{
      target:'#dialogText',phase:'recipe',
      extra:{currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:recipeTokenV119('recipe')},
      after:()=>{
        if(state.phase!=='recipe'||state.drink?.id!=='mojito')return;
        document.dispatchEvent(new CustomEvent('barrecipeafterai',{detail:{drinkId:'mojito',answer:finishedAnswer,step:finishedStep}}));
        renderStep(true)
      }
    });
    return
  }
  renderStep(true)
};

orderDrink=function(d){
  stopIdle();state.recipeSessionV119++;state.recipeRequestSeqV119=0;state.recipeHelpV119=false;
  state.phase='recipe';state.drink=d;state.step=0;state.correct=0;state.wrong=0;state.points=0;state.startedAt=Date.now();state.serving=null;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];updateHud();$('#dialogControls').innerHTML='';
  markUserActivityV388();
  alexEventV388('order_started',{drinkName:d.name,difficulty:state.difficulty},{
    target:'#dialogText',phase:'recipe',
    extra:{currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:recipeTokenV119('recipe')},
    after:()=>{if(state.phase!=='recipe'||state.drink!==d)return;if(state.difficulty==='hard')askServing();else renderStep(true)}
  })
};

handleConversation=async function(raw){
  if(state.aiBusy)return;markUserActivityV388();const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';$('#dialogControls').innerHTML='';streamDialogV119('');setAiBusyV119(true);const voice=createStreamingSpeechV119();const token=`chat:${state.recipeSessionV119}`;
  try{
    const data=await callAiStreamV119(text,{phase:'chat',currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:token},(full,delta)=>{streamDialogV119(full);voice.push(delta)});
    const turn=data.turn;
    if(turn.context_token!==token){voice.cancel();setAiBusyV119(false);return}
    if(turn.action==='order_drink'&&turn.drink_id){
      const id=String(turn.drink_id);
      const menuItem=drinkMenuCatalog.find(d=>d.id===id);
      if(!menuItem||!menuItem.buildable){
        voice.cancel();setAiBusyV119(false);orderDrinkById(id);return
      }
    }
    voice.finish();setAiBusyV119(false);streamDialogV119(turn.reply||'');await voice.done;
    if(turn.action==='order_drink'&&turn.drink_id){orderDrinkById(String(turn.drink_id));return}
    if(state.phase==='chat')renderConversationInput(false)
  }catch(e){voice.cancel();console.error('Bar 1.19 chat',e);setAiBusyV119(false);aiFallbackV119();renderConversationInput(false)}
};

handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
  markUserActivityV388();
  const text=String(raw||'').trim(),s=currentStepV119();if(!s||!text){if(!text)toast('Säg eller skriv något först.');return}
  const snap=recipeSnapshotV119();const input=$('#recipeText');if(input)input.value='';setAiBusyV119(true);streamDialogV119('');const voice=createStreamingSpeechV119();
  try{
    const data=await callAiStreamV119(text,{stepToken:snap.token},(full,delta)=>{
      if(!sameRecipeSnapshotV119(snap)){voice.cancel();return}
      streamDialogV119(full);voice.push(delta)
    });
    if(!sameRecipeSnapshotV119(snap)){voice.cancel();setAiBusyV119(false);return}
    voice.finish();setAiBusyV119(false);const turn=data.turn;
    if(turn.context_token!==snap.token){voice.cancel();renderStep(false);return}
    streamDialogV119(turn.reply||'');await voice.done;
    if(!sameRecipeSnapshotV119(snap))return;
    if(turn.action==='repeat_question')return;
    if(turn.action==='request_help'){showHelpOptions(s,turn.reply);return}
    if(turn.action!=='recipe_attempt')return;
    const outcome=recipeOutcomeV119(turn,s);
    if(outcome.kind==='correct'){state.aiCorrectParts=[];completeRecipeStep(s,false);return}
    if(outcome.kind==='partial'){state.aiCorrectParts=outcome.combined;renderRecipeControlsV119();return}
    registerWrongAnswer(s,true)
  }catch(e){voice.cancel();console.error('Bar 1.19 recipe',e);setAiBusyV119(false);if(sameRecipeSnapshotV119(snap)){aiFallbackV119();renderRecipeControlsV119()}}
};

askServing=function(){
  const d=state.drink,token=recipeTokenV119('serving');
  const placeholder=d.alcoholic?'Säg till exempel sexa':'Säg liten, mellan eller stor';
  renderSpecialPrompt('',placeholder,async(text,status)=>{
    if(state.aiBusy)return;markUserActivityV388();setAiBusyV119(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV119();
    try{
      const data=await callAiStreamV119(text,{phase:'serving',currentQuestion:'Välj serveringsstorlek',expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],expectedServing:[4,6,8],stepToken:token},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV119(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.context_token!==token)return;
      if(turn.action==='request_help'){renderServingChoices(status);return}
      if(turn.action==='serving_choice'&&[4,6,8].includes(Number(turn.serving_value))){acceptServingValue(Number(turn.serving_value));return}
    }catch(e){voice.cancel();console.error('Bar v3.88 serving',e);setAiBusyV119(false);status.textContent='Kunde inte nå Alex. Försök igen.'}
  });
  alexEventV388('serving_question',{drinkName:d.name,alcoholic:d.alcoholic},{
    target:'#dialogText',phase:'serving',
    extra:{currentQuestion:'Välj serveringsstorlek',expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],expectedServing:[4,6,8],stepToken:token}
  })
};

askAmount=function(s){
  state.amountFails=0;const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Hur mycket ${s.amount.label} behövs för vald serveringsstorlek?`;const token=recipeTokenV119('amount');
  renderSpecialPrompt('',`Mängd i ${s.amount.unit}`,async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV119(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV119();
    try{
      const data=await callAiStreamV119(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],expectedAmount:expected,amountUnit:s.amount.unit,stepToken:token},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV119(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.context_token!==token)return;
      if(turn.action==='request_help'){renderAmountHints(s,status);return}
      if(turn.action!=='amount_answer')return;
      const n=Number(turn.amount_value);if(Number.isFinite(n)&&Math.abs(n-expected)<0.11){advanceStep(s);return}
      registerAmountWrong(s,status)
    }catch(e){voice.cancel();console.error('Bar 1.19 amount',e);setAiBusyV119(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

$('#enterBtn')?.addEventListener('click',()=>{
  state.aiPreviousResponseId=null;state.aiLastTTFT=0;state.aiLastTotal=0;state.aiCorrectParts=[];state.recipeSessionV119++;state.recipeRequestSeqV119=0;state.recipeHelpV119=false
},true);

window.__barAI119={endpoint:BAR_AI_URL_V119,token:()=>recipeTokenV119('recipe'),session:()=>state.recipeSessionV119,previousResponseId:()=>state.aiPreviousResponseId,ttft:()=>state.aiLastTTFT,total:()=>state.aiLastTotal};
window.__barAI388={event:alexEventV388,idle:idleAlexV388,activity:markUserActivityV388,wrongIngredient:registerWrongIngredientV388};
