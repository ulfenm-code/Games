'use strict';

/* Bar Game 1.17 patch.
   1.16 intentionally remains immutable. This fixes only hard-mode amount scoring:
   the recipe step has already earned its point when askAmount starts, so a correct
   amount must advance the step without adding the same recipe point a second time.
   Free-language understanding still comes entirely from the 1.16 Terra semantic layer. */

askAmount=function(s){
  state.amountFails=0;
  const expected=expectedAmount(s),size=state.drink.alcoholic?`${state.serving}:an`:state.serving===4?'den lilla':state.serving===6?'mellanstorleken':'den stora';
  const prompt=`Bra. Hur mycket ${s.amount.label} ska vi ha till ${size}?`;
  renderSpecialPrompt(prompt,`Mängd i ${s.amount.unit}`,async(text,status)=>{
    if(state.aiBusy)return;
    setAiBusyV116(true);status.textContent='Alex svarar…';const voice=createStreamingSpeechV116();
    try{
      const data=await callAiStreamV116(text,{phase:'amount',currentQuestion:prompt,expectedAnswer:null,answerMode:null,answerParts:[],alreadyCorrectParts:[],options:[],expectedAmount:expected,amountUnit:s.amount.unit},(full,delta)=>{status.textContent=full;voice.push(delta)});
      voice.finish();setAiBusyV116(false);const turn=data.turn;status.textContent=turn.reply||'';await voice.done;
      if(turn.action==='request_help'){renderAmountHints(s,status);return}
      if(turn.action!=='amount_answer')return;
      const n=Number(turn.amount_value);
      if(Number.isFinite(n)&&Math.abs(n-expected)<0.11){advanceStep(s);return}
      registerAmountWrong(s,status)
    }catch(e){
      voice.cancel();console.error('Bar 1.17 amount',e);setAiBusyV116(false);status.textContent='Jag tappade uppkopplingen. Försök igen.'
    }
  })
};
