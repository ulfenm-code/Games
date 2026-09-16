function showHelpOptionsV112(s,message){
  ensureDialogMemoryV112().helpRequested=true;
  if(state.difficulty==='easy')renderEasy(s);else renderFree(s,message||'Jag hjälper dig – här är tre alternativ. Ett är rätt.');
}

function renderStep(newStep=false){
  if(state.step>=state.drink.steps.length){startPhysicalAction('drink','result');return}
  if(newStep){state.questionFails=0;state.amountFails=0;const mem=ensureDialogMemoryV112();mem.helpRequested=false;mem.lastPartial=[]}
  const s=state.drink.steps[state.step];state.lastRecipeQuestion=naturalQuestion(s);$('#dialogText').textContent=state.lastRecipeQuestion;speak(state.lastRecipeQuestion);
  if(state.difficulty==='easy')renderEasy(s);else renderFree(s)
}

function renderFree(s,message=''){
  const mem=ensureDialogMemoryV112();
  const showHints=state.questionFails>=3||mem.helpRequested;
  const hint=showHints?`<div class="hintTitle">${mem.helpRequested?'Du bad om hjälp – här är tre alternativ.':'Tre fel – här får du tre alternativ. Ett är rätt.'}</div><div class="choices">${s.opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`:'';
  $('#dialogControls').innerHTML=`${recipeInputHTML('Skriv svaret själv eller prata')}${hint}`;
  const st=$('#recipeStatus');if(st)st.textContent=message||'Du kan svara fritt, fråga bartendern eller be om hjälp.';
  $$('.choice').forEach(b=>b.onclick=()=>answerStep(b.textContent,b));wireRecipeInput()
}

function handleRecipeInput(raw){
  const text=String(raw||'').trim(),s=state.drink?.steps[state.step];if(!s||state.phase!=='recipe')return;
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';
  const result=classifyRecipeUtteranceV112(text,s);
  if(result.kind==='repeat'){
    state.recipeChatTurns=0;const r=`Absolut. Frågan var: ${state.lastRecipeQuestion||s.q}`;$('#dialogText').textContent=r;speak(r);return
  }
  if(result.kind==='help'){
    state.recipeChatTurns=0;const r=pick(['Absolut, då hjälper jag dig. Här är tre alternativ.','Ingen fara. Vi tar tre alternativ direkt.','Klart. Jag ger dig tre att välja på.']);$('#dialogText').textContent=r;speak(r);showHelpOptionsV112(s,r);return
  }
  if(result.kind==='partial'){
    state.recipeChatTurns=0;ensureDialogMemoryV112().lastPartial=result.partial.found;
    const found=result.partial.found.join(' och ');
    const base=pick([`Ja, ${found} är rätt, men det är något mer också.`,`Precis, ${found} ska med. Men vi saknar en del till.`,`Du är på rätt spår: ${found}. Vad mer hör till?`]);
    const reply=result.chat?`${result.chat} ${base}`:base;
    $('#dialogText').textContent=reply;speak(reply);return
  }
  if(result.kind==='correct'){
    state.recipeChatTurns=0;
    if(result.chat){
      const praise=pick(['Och ja – det svaret sitter.','Och där fick du receptdelen rätt också.','Och samtidigt: helt rätt på receptet.']);
      const r=`${result.chat} ${praise}`;$('#dialogText').textContent=r;speak(r,()=>answerStep(s.a,null,true,true));
    }else answerStep(s.a,null,true);
    return
  }
  if(result.kind==='wrong'){
    state.recipeChatTurns=0;
    if(result.chat){$('#dialogText').textContent=result.chat;speak(result.chat,()=>registerWrongAnswer(s));}
    else registerWrongAnswer(s);
    return
  }
  state.recipeChatTurns++;
  let reply=result.chat||smallTalkReply(text);
  if(state.recipeChatTurns>=4){reply+=' '+bridgeBackToQuestion(state.lastRecipeQuestion||s.q);state.recipeChatTurns=0}
  $('#dialogText').textContent=reply;speak(reply)
}

async function answerStep(answer,btn,alreadyValidated=false,silentPraise=false){
  const s=state.drink.steps[state.step];
  const ok=alreadyValidated || (btn ? semanticNormalizeV112(answer)===semanticNormalizeV112(s.a) : correctForDifficulty(answer,s));
  if(!ok){if(btn)btn.classList.add('bad');registerWrongAnswer(s);return}
  state.correct++;state.points+=10;state.recipeChatTurns=0;ensureDialogMemoryV112().helpRequested=false;if(btn)btn.classList.add('good');
  if(state.difficulty==='hard'&&s.amount){askAmount(s);return}
  if(silentPraise){advanceStep(s);return}
  const praise=pick(['Precis.','Rätt, där satt den.','Snyggt.','Ja, exakt så.','Bra. Nu börjar det likna något.']);$('#dialogText').textContent=praise;speak(praise,()=>advanceStep(s))
}

function advanceStep(s){
  state.step++;state.questionFails=0;state.amountFails=0;state.lastRecipeQuestion='';const mem=ensureDialogMemoryV112();mem.helpRequested=false;mem.lastPartial=[];
  if(s.action)startPhysicalAction(s.action,'continue');else renderStep(true)
}

function promptTalkOrRepeat(value,prompt,status){
  if(isRepeatRequest(value)){status.textContent='Jag tar frågan igen.';speak(`Absolut. ${prompt}`);return true}
  if(isDontKnowV112(value)){status.textContent='Ingen fara – jag visar alternativ.';return false}
  const x=String(value||'').trim();if(!x)return false;const n=parseNum(x);
  if(!Number.isFinite(n)&&explicitBartenderQuestionV112(x)){const reply=smallTalkReply(x);status.textContent=reply;speak(reply);return true}
  return false
}

function conversationItemAnsweredV112(text,item){
  if(!item)return false;const x=normalize(text);
  if(explicitBartenderQuestionV112(text)&&!/(jag mar|jag har|min dag|jag kommer|jag jobbar|jag ar|jag är|jag bor)/.test(x))return false;
  if(item.key==='how')return /\b(bra|fint|toppen|okej|ok|daligt|jobbigt|trott|stress|sliten|jag mar)\b/.test(x);
  if(item.key==='day')return /\b(bra|fin|okej|dalig|jobbig|stress|lugnt|hektisk|dagen|min dag|varit)\b/.test(x);
  if(item.key==='from')return /\b(jag kommer|kommer fran|bor i|fran )\b/.test(x);
  if(item.key==='work')return /\b(jobbar|arbete|pension|studer|pluggar|skola|ledig)\b/.test(x);
  if(item.key==='plans')return /\b(hem|lugnt|middag|fest|jobba|sova|kvall|plan)\b/.test(x);
  return !/[?]$/.test(x)
}

