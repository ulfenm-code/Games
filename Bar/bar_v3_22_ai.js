'use strict';

/* Bar Game 1.19 AI + recipe controller.
   One controller owns the recipe UI/state transition after Terra has interpreted
   free language. Help is no longer represented as three errors, AI replies are
   never duplicated into the status area, and one recipe step owns question,
   choices, scoring and transition atomically. */

const BAR_AI_URL_V119='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v119';
const BAR_TTS_INSTRUCTION_V322='Tala naturlig svenska, varm manlig bartender-röst, avslappnad och vänlig.';
const BAR_SUPABASE_KEY_V119='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiPreviousResponseId=null;
state.aiBusy=false;
state.aiLastTTFT=0;
state.aiLastTotal=0;
state.recipeSessionV119=0;
state.recipeHelpV119=false;
state.recipeRequestSeqV119=0;

function setAiBusyV119(busy,label='Alex svarar…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic','#specialSend','#specialMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  $$('.choice').forEach(el=>el.disabled=busy);
  if(busy){const st=$('#recipeStatus')||$('#specialStatus');if(st)st.textContent=label}
}
function streamDialogV119(text){const el=$('#dialogText');if(el)el.textContent=text}
function aiFallbackV119(message='Jag tappade uppkopplingen. Försök gärna igen.'){streamDialogV119(message);speak(message)}

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
  let pending='',active=0,streamDone=false,resolved=false,resolveDone;
  const done=new Promise(resolve=>{resolveDone=resolve});
  try{speechSynthesis.cancel()}catch(_){ }
  function maybeDone(){if(!resolved&&streamDone&&active===0){resolved=true;resolveDone()}}
  function queue(text){
    const s=String(text||'').trim();if(!s||!('speechSynthesis'in window))return;
    try{
      const u=new SpeechSynthesisUtterance(s);u.lang='sv-SE';u.rate=.97;u.pitch=.96;active++;
      let finished=false;const finish=()=>{if(finished)return;finished=true;active=Math.max(0,active-1);maybeDone()};
      u.onend=finish;u.onerror=finish;speechSynthesis.speak(u)
    }catch(_){ }
  }
  function flushSentences(){
    const re=/^([\s\S]*?[.!?](?:\s+|$))/;
    while(true){const m=pending.match(re);if(!m)break;const s=m[1].trim();pending=pending.slice(m[1].length);if(s)queue(s)}
  }
  return {
    push(delta){pending+=String(delta||'');flushSentences()},
    finish(){if(pending.trim())queue(pending.trim());pending='';streamDone=true;maybeDone()},
    cancel(){pending='';streamDone=true;active=0;try{speechSynthesis.cancel()}catch(_){ }maybeDone()},
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
    availableDrinks:drinks.map(d=>({id:d.id,name:d.name,minAge:d.minAge})),
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
    const r=await fetch(BAR_AI_URL_V119,{method:'POST',headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V119},body:JSON.stringify({message,previous_response_id:state.aiPreviousResponseId,game:context,voice_instruction:BAR_TTS_INSTRUCTION_V322}),signal:controller.signal});
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
  const showChoices=easy||threeErrors||help;
  let header='';
  if(threeErrors)header='<div class="hintTitle">Tre fel – här får du tre alternativ. Ett är rätt.</div>';
  else if(help)header='<div class="hintTitle">Här får du tre alternativ. Ett är rätt.</div>';
  const choices=showChoices?`<div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`:'';
  $('#dialogControls').innerHTML=`${recipeInputHTML(easy?'Skriv svar eller prata med Alex':'Skriv svaret själv eller prata')}${header}${choices}`;
  const st=$('#recipeStatus');
  if(st)st.textContent=threeErrors?'Välj ett alternativ eller fortsätt svara med egna ord.':help?'Välj ett alternativ eller svara med egna ord.':'Frågan ligger kvar medan ni pratar.';
  $$('.choice').forEach(b=>b.onclick=()=>answerKnownChoice(b.textContent,b));
  wireRecipeInput();setAiBusyV119(Boolean(state.aiBusy))
}

renderEasy=function(_s){renderRecipeControlsV119()};
renderFree=function(_s,_message=''){renderRecipeControlsV119()};

renderStep=function(newStep=false,prefix=''){
  if(state.phase!=='recipe'||!state.drink)return;
  if(state.step>=state.drink.steps.length){$('#dialogControls').innerHTML='';startPhysicalAction('drink','result');return}
  if(newStep){state.questionFails=0;state.amountFails=0;state.aiCorrectParts=[];state.recipeHelpV119=false}
  const s=currentStepV119();const q=naturalQuestion(s);state.lastRecipeQuestion=q;
  const shown=prefix?`${prefix} ${q}`:q;$('#dialogText').textContent=shown;renderRecipeControlsV119();speak(shown)
};

showHelpOptions=function(s,message=''){
  if(!sameStepObjectV119(s))return;
  state.recipeHelpV119=true;
  if(message)$('#dialogText').textContent=message;
  renderRecipeControlsV119()
};

registerWrongAnswer=function(s,preserveDialog=false){
  if(!sameStepObjectV119(s))return;
  state.wrong++;state.points=Math.max(0,state.points-2);state.questionFails++;state.recipeHelpV119=false;
  renderRecipeControlsV119();
  if(!preserveDialog){
    const msg=state.questionFails>=3?'Inte riktigt. Nu får du tre alternativ.':pick(['Inte riktigt. Försök en gång till.','Nja, inte den. Ta ett nytt försök.','Nästan kanske, men inte rätt. Försök igen.']);
    $('#dialogText').textContent=msg;speak(msg)
  }
};

answerKnownChoice=function(answer,btn){
  const s=currentStepV119();if(!s||state.aiBusy)return;
  const ok=canon(answer)===canon(s.a);
  if(!ok){btn?.classList.add('bad');registerWrongAnswer(s,false);return}
  btn?.classList.add('good');completeRecipeStep(s,true)
};

completeRecipeStep=function(s,withPraise=false){
  if(!sameStepObjectV119(s))return;
  state.correct++;state.points+=10;state.aiCorrectParts=[];state.recipeHelpV119=false;
  if(state.difficulty==='hard'&&s.amount){askAmount(s);return}
  const prefix=withPraise?pick(['Precis.','Rätt, där satt den.','Snyggt.']):'';
  advanceStep(s,prefix)
};

advanceStep=function(s,prefix=''){
  if(!sameStepObjectV119(s))return;
  state.step++;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];state.recipeHelpV119=false;
  $('#dialogControls').innerHTML='';
  if(s?.action){startPhysicalAction(s.action,'continue');return}
  if(s?.afterAi&&state.drink?.id==='mojito'){
    setAiBusyV119(true);streamDialogV119('');const voice=createStreamingSpeechV119();
    const instruction='Fortsätt samtalet naturligt utifrån denna händelse: '+s.afterAi.fact+' '+s.afterAi.nextIntent+' Formulera repliken själv; citera inte instruktionen ordagrant.';
    callAiStreamV119(instruction,{phase:'recipe',currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:recipeTokenV119('recipe')},(full,delta)=>{streamDialogV119(full);voice.push(delta)})
      .then(async data=>{voice.finish();setAiBusyV119(false);const reply=data.turn?.reply||'';streamDialogV119(reply);await voice.done;if(state.phase==='recipe'&&state.drink?.id==='mojito')renderStep(true)})
      .catch(e=>{voice.cancel();console.error('Mojito soda bridge',e);setAiBusyV119(false);renderStep(true)});
    return
  }
  renderStep(true,prefix)
};

orderDrink=function(d){
  stopIdle();state.recipeSessionV119++;state.recipeRequestSeqV119=0;state.recipeHelpV119=false;
  state.phase='recipe';state.drink=d;state.step=0;state.correct=0;state.wrong=0;state.points=0;state.startedAt=Date.now();state.serving=null;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';state.aiCorrectParts=[];updateHud();$('#dialogControls').innerHTML='';
  const intro=pick([`${d.intro} Bra val. Du får hjälpa mig bakom baren.`,`${d.intro} Då kör vi. Du får jobba lite också.`,`${d.intro} Snyggt val. Kom, så bygger vi den tillsammans.`]);
  $('#dialogText').textContent=intro;speak(intro,()=>{if(state.phase!=='recipe'||state.drink!==d)return;if(state.difficulty==='hard')askServing();else renderStep(true)})
};

handleConversation=async function(raw){
  if(state.aiBusy)return;stopIdle();const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';$('#dialogControls').innerHTML='';streamDialogV119('');setAiBusyV119(true);const voice=createStreamingSpeechV119();const token=`chat:${state.recipeSessionV119}`;
  try{
    const data=await callAiStreamV119(text,{phase:'chat',currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],stepToken:token},(full,delta)=>{streamDialogV119(full);voice.push(delta)});
    voice.finish();setAiBusyV119(false);const turn=data.turn;streamDialogV119(turn.reply||'Jag hänger med.');await voice.done;
    if(turn.context_token!==token)return;
    if(turn.action==='order_drink'&&turn.drink_id){orderDrinkById(String(turn.drink_id));return}
    if(state.phase==='chat')renderConversationInput(false)
  }catch(e){voice.cancel();console.error('Bar 1.19 chat',e);setAiBusyV119(false);aiFallbackV119();renderConversationInput(false)}
};

handleRecipeInput=async function(raw){
  if(state.aiBusy)return;
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
    streamDialogV119(turn.reply||'Jag lyssnar.');await voice.done;
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
  const d=state.drink,prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  const token=recipeTokenV119('serving');
  renderSpecialPrompt(prompt,d.alcoholic?'Säg till exempel sexa':'Säg liten, mellan eller stor',async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV119(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV119();
    try{
      const data=await callAiStreamV119(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],expectedServing:[4,6,8],stepToken:token},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV119(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.context_token!==token)return;
      if(turn.action==='request_help'){renderServingChoices(status);return}
      if(turn.action==='serving_choice'&&[4,6,8].includes(Number(turn.serving_value))){acceptServingValue(Number(turn.serving_value));return}
    }catch(e){voice.cancel();console.error('Bar 1.19 serving',e);setAiBusyV119(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

askAmount=function(s){
  state.amountFails=0;const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;const token=recipeTokenV119('amount');
  renderSpecialPrompt(prompt,`Mängd i ${s.amount.unit}`,async(text,status)=>{
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
