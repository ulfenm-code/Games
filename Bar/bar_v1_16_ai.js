'use strict';

/* Bar Game 1.16 AI layer.
   GPT-5.6 Terra + reasoning none + streaming + previous_response_id + default tier.
   ALL interpretation of free player language comes from Terra as structured data.
   The browser never classifies free text with keywords or regex rules. */

const BAR_AI_URL_V116='https://azoytlshxfbxbrsqdvvn.supabase.co/functions/v1/bar-bartender-game-v116';
const BAR_SUPABASE_KEY_V116='sb_publishable_OVGQTPYpZEhD9tdRP57IOg_8UwKU2Jd';

state.aiPreviousResponseId=null;
state.aiBusy=false;
state.aiLastTTFT=0;
state.aiLastTotal=0;

function setAiBusyV116(busy,label='Alex svarar…'){
  state.aiBusy=busy;
  ['#chatSendBtn','#chatMicBtn','#recipeSend','#recipeMic','#specialSend','#specialMic'].forEach(sel=>{const el=$(sel);if(el)el.disabled=busy});
  if(busy){const st=$('#recipeStatus')||$('#specialStatus');if(st)st.textContent=label}
}
function streamDialogV116(text){const el=$('#dialogText');if(el)el.textContent=text}
function aiFallbackV116(message='Jag tappade uppkopplingen. Försök gärna igen.'){streamDialogV116(message);speak(message)}

function parseSseEventV116(block){
  for(const row of String(block||'').split('\n')){
    if(!row.startsWith('data:'))continue;
    const raw=row.slice(5).trim();if(!raw||raw==='[DONE]')continue;
    try{return JSON.parse(raw)}catch(_){ }
  }
  return null
}

function partialReplyFromJsonV116(raw){
  const key='"reply"';const k=raw.indexOf(key);if(k<0)return'';
  let i=raw.indexOf(':',k+key.length);if(i<0)return'';i++;
  while(i<raw.length&&/\s/.test(raw[i]))i++;
  if(raw[i]!=='"')return'';i++;
  let out='';
  for(;i<raw.length;i++){
    const ch=raw[i];
    if(ch==='"')break;
    if(ch!=='\\'){out+=ch;continue}
    if(i+1>=raw.length)break;
    const n=raw[++i];
    if(n==='u'){
      if(i+4>=raw.length)break;
      const hex=raw.slice(i+1,i+5);
      if(!/^[0-9a-fA-F]{4}$/.test(hex))continue;
      out+=String.fromCharCode(parseInt(hex,16));i+=4;continue
    }
    const map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','"':'"','\\':'\\','/':'/'};
    out+=map[n]??n
  }
  return out
}

function createStreamingSpeechV116(){
  let pending='',active=0,streamDone=false,resolved=false,resolveDone;
  const done=new Promise(resolve=>{resolveDone=resolve});
  try{speechSynthesis.cancel()}catch(_){ }
  function maybeDone(){if(!resolved&&streamDone&&active===0){resolved=true;resolveDone()}}
  function queue(text){
    const s=String(text||'').trim();if(!s||!('speechSynthesis'in window))return;
    try{const u=new SpeechSynthesisUtterance(s);u.lang='sv-SE';u.rate=.97;u.pitch=.96;active++;let finished=false;const finish=()=>{if(finished)return;finished=true;active=Math.max(0,active-1);maybeDone()};u.onend=finish;u.onerror=finish;speechSynthesis.speak(u)}catch(_){ }
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

function aiGameContextV116(extra={}){
  const s=state.phase==='recipe'?state.drink?.steps?.[state.step]:null;
  const spec=s?recipeSpec(s):{mode:'single',parts:[]};
  return {
    phase:extra.phase||state.phase,
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
    amountUnit:extra.amountUnit??null
  }
}

async function callAiStreamV116(message,extra={},onReply=()=>{},allowRetry=true){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),22000);const started=performance.now();let first=0;
  try{
    const r=await fetch(BAR_AI_URL_V116,{method:'POST',headers:{'Content-Type':'application/json','apikey':BAR_SUPABASE_KEY_V116},body:JSON.stringify({message,previous_response_id:state.aiPreviousResponseId,game:aiGameContextV116(extra)}),signal:controller.signal});
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      if(allowRetry&&state.aiPreviousResponseId){state.aiPreviousResponseId=null;clearTimeout(timer);return callAiStreamV116(message,extra,onReply,false)}
      throw new Error((data.error||`HTTP ${r.status}`)+(data.detail?` · ${data.detail}`:''))
    }
    if(!r.body)throw new Error('Tom AI-ström');
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',rawJson='',shownReply='',responseId=null,serviceTier='default';
    while(true){
      const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let cut;
      while((cut=buffer.indexOf('\n\n'))>=0){
        const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const ev=parseSseEventV116(block);if(!ev)continue;
        if(ev.type==='response.output_text.delta'){
          rawJson+=String(ev.delta||'');
          const replyNow=partialReplyFromJsonV116(rawJson);
          if(replyNow.length>shownReply.length){
            if(!first)first=performance.now();const delta=replyNow.slice(shownReply.length);shownReply=replyNow;onReply(shownReply,delta)
          }
        }else if(ev.type==='response.created'||ev.type==='response.in_progress'||ev.type==='response.completed'){
          if(ev.response?.id)responseId=ev.response.id;if(ev.response?.service_tier)serviceTier=ev.response.service_tier
        }else if(ev.type==='response.failed')throw new Error(ev.response?.error?.message||ev.error?.message||'AI-svaret misslyckades')
      }
    }
    let turn;try{turn=JSON.parse(rawJson)}catch(_){throw new Error('AI-svaret kunde inte tolkas strukturerat')}
    const total=performance.now()-started;state.aiLastTTFT=first?first-started:total;state.aiLastTotal=total;if(responseId)state.aiPreviousResponseId=responseId;
    console.info(`Bar 1.16 · första taltext ${(state.aiLastTTFT/1000).toFixed(2)} s · totalt ${(total/1000).toFixed(2)} s · ${serviceTier}`);
    return {turn,response_id:responseId,service_tier:serviceTier,ttft_ms:state.aiLastTTFT,total_ms:total}
  }finally{clearTimeout(timer)}
}

function validatedCandidatePartsV116(turn,s){
  const spec=recipeSpec(s);const expected=spec.parts.map(canon);
  return [...new Set((Array.isArray(turn?.candidate_parts)?turn.candidate_parts:[]).map(String).filter(p=>expected.includes(canon(p))).map(p=>spec.parts[expected.indexOf(canon(p))]))]
}
function recipeOutcomeV116(turn,s){
  const spec=recipeSpec(s),fresh=validatedCandidatePartsV116(turn,s),combined=[...new Set([...state.aiCorrectParts,...fresh])];
  if(spec.mode==='all'){
    const correct=spec.parts.every(p=>combined.some(x=>canon(x)===canon(p)));
    if(correct)return {kind:'correct',combined};
    if(fresh.length)return {kind:'partial',combined};
    return {kind:'wrong',combined}
  }
  if(spec.mode==='any')return fresh.length?{kind:'correct',combined:fresh}:{kind:'wrong',combined:[]};
  return fresh.some(x=>canon(x)===canon(spec.parts[0]))?{kind:'correct',combined:fresh}:{kind:'wrong',combined:[]}
}

handleConversation=async function(raw){
  if(state.aiBusy)return;stopIdle();const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#chatInput');if(input)input.value='';$('#dialogControls').innerHTML='';streamDialogV116('');setAiBusyV116(true);const voice=createStreamingSpeechV116();
  try{
    const data=await callAiStreamV116(text,{phase:'chat',currentQuestion:null,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[]},(full,delta)=>{streamDialogV116(full);voice.push(delta)});
    voice.finish();setAiBusyV116(false);const turn=data.turn;streamDialogV116(turn.reply||'Jag hänger med.');await voice.done;
    if(turn.action==='order_drink'&&turn.drink_id){orderDrinkById(String(turn.drink_id));return}
    if(state.phase==='chat')renderConversationInput(false)
  }catch(e){voice.cancel();console.error('Bar 1.16 chat',e);setAiBusyV116(false);aiFallbackV116();renderConversationInput(false)}
};

handleRecipeInput=async function(raw){
  if(state.aiBusy)return;const text=String(raw||'').trim(),s=state.drink?.steps?.[state.step];if(!s||state.phase!=='recipe')return;if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';setAiBusyV116(true);streamDialogV116('');const voice=createStreamingSpeechV116();
  try{
    const data=await callAiStreamV116(text,{},(full,delta)=>{streamDialogV116(full);voice.push(delta)});voice.finish();setAiBusyV116(false);const turn=data.turn;streamDialogV116(turn.reply||'Jag lyssnar.');await voice.done;
    if(turn.action==='repeat_question'){return}
    if(turn.action==='request_help'){showHelpOptions(s,turn.reply);return}
    if(turn.action!=='recipe_attempt'){return}
    const outcome=recipeOutcomeV116(turn,s);
    if(outcome.kind==='correct'){state.aiCorrectParts=[];completeRecipeStep(s,false);return}
    if(outcome.kind==='partial'){state.aiCorrectParts=outcome.combined;return}
    registerWrongAnswer(s)
  }catch(e){voice.cancel();console.error('Bar 1.16 recipe',e);setAiBusyV116(false);aiFallbackV116();renderFree(s,'Försök igen när anslutningen är tillbaka.')}
};

askServing=function(){
  const d=state.drink,prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  renderSpecialPrompt(prompt,d.alcoholic?'Säg till exempel sexa':'Säg liten, mellan eller stor',async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV116(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV116();
    try{
      const data=await callAiStreamV116(text,{phase:'serving',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],expectedServing:[4,6,8]},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV116(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.action==='request_help'){renderServingChoices(status);return}
      if(turn.action==='serving_choice'&&[4,6,8].includes(Number(turn.serving_value))){acceptServingValue(Number(turn.serving_value));return}
    }catch(e){voice.cancel();console.error('Bar 1.16 serving',e);setAiBusyV116(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

askAmount=function(s){
  state.amountFails=0;const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;
  renderSpecialPrompt(prompt,`Mängd i ${s.amount.unit}`,async(text,status)=>{
    if(state.aiBusy)return;setAiBusyV116(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV116();
    try{
      const data=await callAiStreamV116(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],expectedAmount:expected,amountUnit:s.amount.unit},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV116(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.action==='request_help'){renderAmountHints(s,status);return}
      if(turn.action!=='amount_answer')return;
      const n=Number(turn.amount_value);
      if(Number.isFinite(n)&&Math.abs(n-expected)<0.11){state.correct++;state.points+=10;advanceStep(s);return}
      registerAmountWrong(s,status)
    }catch(e){voice.cancel();console.error('Bar 1.16 amount',e);setAiBusyV116(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'}
  })
};

$('#enterBtn')?.addEventListener('click',()=>{state.aiPreviousResponseId=null;state.aiLastTTFT=0;state.aiLastTotal=0;state.aiCorrectParts=[]},true);
window.__barAI116={endpoint:BAR_AI_URL_V116,previousResponseId:()=>state.aiPreviousResponseId,ttft:()=>state.aiLastTTFT,total:()=>state.aiLastTotal};
