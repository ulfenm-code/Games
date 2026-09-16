function renderConversationInput(askQuestion=true){
  if(state.phase!=='chat')return;
  const item=convo[Math.min(state.conversationIndex,convo.length-1)];
  const q=item?.q(state.name)||'Vad är du sugen på?';
  if(askQuestion){
    const t=state.conversationIndex<convo.length?q:pick(['Vad känner du för nu då?','Ska vi blanda något åt dig?','Nå, har du landat i vad du är sugen på?']);
    $('#dialogText').textContent=t;speak(t)
  }
  $('#dialogControls').innerHTML=`<div class="inputRow"><input id="chatInput" placeholder="Svara, fråga eller beställ"><button class="btn" id="chatSendBtn">Säg</button><button class="btn secondary" id="chatMicBtn">🎙️</button></div><div class="small">Prata fritt – bartendern håller kvar sammanhanget.</div>`;
  $('#chatSendBtn').onclick=()=>handleConversation($('#chatInput').value);
  $('#chatInput').onkeydown=e=>{if(e.key==='Enter')handleConversation(e.target.value)};
  $('#chatMicBtn').onclick=()=>recognize(alts=>handleConversation(alts[0]||''),$('#chatMicBtn'));
  scheduleIdle()
}

function handleConversation(raw){
  stopIdle();const text=String(raw||'').trim();if(!text){toast('Säg eller skriv något först.');return}
  const drink=resolveDrink(text);if(drink){orderDrink(drink);return}
  const item=convo[Math.min(state.conversationIndex,convo.length-1)];
  if(isRepeatRequest(text)){const q=state.conversationIndex<convo.length?item.q(state.name):'Vad är du sugen på?';const r=`Absolut. Jag frågade: ${q}`;$('#dialogText').textContent=r;speak(r,()=>renderConversationInput(false));return}
  const direct=answerBartenderQuestionV112(text),answered=state.conversationIndex<convo.length&&conversationItemAnsweredV112(text,item);
  if(answered&&item){state.conversationAnswers[item.key]=text;state.conversationIndex++}
  let reply='';
  if(answered)reply=naturalConversationReaction(text);
  if(direct)reply+=(reply?' ':'')+direct;
  if(!reply)reply=smallTalkReply(text);
  $('#dialogControls').innerHTML='';$('#dialogText').textContent=reply;
  // A direct question to the bartender should be allowed to continue as conversation,
  // without immediately forcing the pending scripted question back in the user's face.
  const continueFreely=!!direct&&!answered;
  speak(reply,()=>setTimeout(()=>{if(state.phase==='chat')renderConversationInput(!continueFreely)},500))
}

function askServing(){
  const d=state.drink,prompt=d.alcoholic?`${d.name}. På svår nivå: vill du göra en fyra, sexa eller åtta?`:`${d.name}. På svår nivå: vill du göra en liten, mellan eller stor?`;
  showPrompt('Bartendern',prompt,d.alcoholic?'4, 6 eller 8':'liten, mellan eller stor',(value,status,wrap)=>{
    if(isRepeatRequest(value)){status.textContent='Jag tar frågan igen.';speak(`Absolut. ${prompt}`);return}
    if(isDontKnowV112(value)){status.textContent=d.alcoholic?'Ingen fara. Välj mellan 4, 6 eller 8.':'Ingen fara. Välj liten, mellan eller stor.';speak(status.textContent);return}
    const direct=answerBartenderQuestionV112(value);if(direct&&!parseNum(value)){status.textContent=direct;speak(direct);return}
    let n;if(!d.alcoholic){const x=normalize(value);if(x.includes('liten'))n=4;else if(x.includes('mellan'))n=6;else if(x.includes('stor'))n=8}if(!n)n=parseNum(value);
    if(![4,6,8].includes(n)){status.textContent=d.alcoholic?'Svara 4, 6 eller 8.':'Svara liten, mellan eller stor.';return}
    state.serving=n;updateHud();wrap.remove();const r=d.alcoholic?pick([`${n}:a. Då skalar vi receptet efter den.`,`${n}:a blir bra. Då räknar vi därefter.`]):`Bra, då kör vi ${n===4?'liten':n===6?'mellan':'stor'}.`;$('#dialogText').textContent=r;speak(r,()=>renderStep(true))
  })
}

function askAmount(s){
  state.amountFails=0;const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=pick([`Bra, ${s.a}. Hur mycket ${s.amount.label} ska vi ha till ${size}?`,`Okej, ${s.a} är rätt. Nu mängden: hur mycket ${s.amount.label} till ${size}?`,`Ingrediensen sitter. Hur mycket ${s.amount.label} mäter du upp till ${size}?`]);
  showPrompt('Bartendern',prompt,`Mängd i ${s.amount.unit}`,(value,status,wrap)=>{
    if(isRepeatRequest(value)){status.textContent='Jag tar frågan igen.';speak(`Absolut. ${prompt}`);return}
    if(isDontKnowV112(value)){
      status.textContent='Ingen fara. Här får du tre alternativ direkt.';speak(status.textContent);renderAmountHints(expected,s.amount.unit,status,wrap,s);return
    }
    const direct=answerBartenderQuestionV112(value);const n=parseNum(value);
    if(!Number.isFinite(n)&&direct){status.textContent=direct;speak(direct);return}
    if(Number.isFinite(n)&&Math.abs(n-expected)<.11){status.textContent=`Rätt: ${fmt(expected,s.amount.unit)}.`;speak(pick([`Precis. ${fmt(expected,s.amount.unit)}.`,`Japp, ${fmt(expected,s.amount.unit)} blir rätt.`]),()=>{wrap.remove();advanceStep(s)});return}
    if(!Number.isFinite(n)&&!looksLikeRecipeAnswerAttemptV112(value,s)){const reply=smallTalkReply(value);status.textContent=reply;speak(reply);return}
    state.wrong++;state.points=Math.max(0,state.points-2);state.amountFails++;status.textContent=state.amountFails>=3?'Tre fel. Här får du tre alternativ – ett är rätt.':`Inte riktigt. Försök igen. (${state.amountFails}/3)`;speak('Inte riktigt. Tänk på proportionerna.');if(state.amountFails>=3)renderAmountHints(expected,s.amount.unit,status,wrap,s)
  })
}

// Small self-test surface used during development; harmless in production.
window.__barDialog112={
  classify:(text,s)=>classifyRecipeUtteranceV112(text,s),
  correct:(text,s)=>correctForDifficulty(text,s),
  partial:(text,s)=>partialAnswerV112(text,s),
  dontKnow:isDontKnowV112
};
