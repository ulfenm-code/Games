'use strict';

function semanticNormalizeV111(text){
  return normalize(text)
    .replace(/\bsnaps\s*glas\b/g,'shotglas')
    .replace(/\bsnapsglas\b/g,'shotglas')
    .replace(/\bshot\s*glas\b/g,'shotglas')
    .replace(/\blong\s*drink\s*glas\b/g,'highballglas')
    .replace(/\blongdrinkglas\b/g,'highballglas')
    .replace(/\bhighball\s*glas\b/g,'highballglas')
    .replace(/\bmargarita\s*glas\b/g,'margaritaglas')
    .replace(/\bcocktail\s*glas\b/g,'cocktailglas')
}

function spokenAlias(text){
  let x=semanticNormalizeV111(text);
  const map=[
    [/^rom$/,'vit rom'],
    [/^soda$/,'sodavatten'],
    [/^highball$/,'highballglas'],
    [/^martini$/,'martiniglas'],
    [/^cocktail$/,'cocktailglas'],
    [/^salt$/,'saltkant'],
    [/^ror$|^rora$/,'ror med is']
  ];
  for(const[r,v]of map)if(r.test(x))return v;
  return x
}

function scoreMatch(a,b){
  const h=spokenAlias(a),o=semanticNormalizeV111(b);
  if(!h||!o)return 0;
  if(h===o)return 100;
  if(o.includes(h)||h.includes(o))return 90;
  const hs=new Set(h.split(' ')),os=new Set(o.split(' '));let c=0;
  hs.forEach(t=>{if(os.has(t))c++});
  return c?70*c/Math.max(1,Math.min(hs.size,os.size)):0
}

function recipeOptionGuess(text,opts){
  const x=semanticNormalizeV111(text); if(!x)return null;
  let best=null,bestScore=0;
  for(const o of opts){const sc=scoreMatch(x,o);if(sc>bestScore){bestScore=sc;best=o}}
  return bestScore>=62?{option:best,score:bestScore}:null
}

const mediumAliasesV111={
  'muddla forsiktigt':['muddla','muddla mynta','muddla lime','stöta','stota','mosa lite'],
  'ror med is':['ror','rora','ror om','stirra'],
  'saltkant':['salt','salta kanten','salt pa kanten'],
  'sot vermouth':['vermouth','sot vermouth'],
  'angostura bitters':['angostura','bitters'],
  'triple sec':['triple sec','apelsinlikor','apelsinlikör','cointreau'],
  'cocktailkorsbar':['korsbar','cocktailkorsbar'],
  'limeklyfta':['lime','limeklyfta'],
  'lime eller citron':['lime','citron'],
  'apelsin eller lime':['apelsin','lime'],
  'highballglas':['highball','highballglas','longdrinkglas','long drink glas'],
  'margaritaglas':['margarita glas','margaritaglas'],
  'cocktailglas':['cocktail','cocktailglas'],
  'shotglas':['shot','shotglas','snapsglas','snaps glas']
};

function stripLeadIn(text){
  return normalize(text)
    .replace(/^(?:ja[, ]*)?(?:jag (?:tror|sager|svarar|valjer|tar|tanker|skulle saga)|mitt svar(?: pa (?:fragan|den fragan))? (?:ar|blir)|svaret(?: pa (?:fragan|den fragan))? (?:ar|blir)|jag tror (?:att )?det (?:ar|blir)|det maste vara|vi (?:tar|kor|ska ha)|kanske|nog)\s+/,'')
    .trim()
}

function explicitAnswerIntent(text){
  const x=normalize(text);
  return /^(?:ja[, ]*)?(?:jag (?:tror|sager|svarar|valjer|tar|tanker|skulle saga)|mitt svar(?: pa (?:fragan|den fragan))? (?:ar|blir)|svaret(?: pa (?:fragan|den fragan))? (?:ar|blir)|jag tror (?:att )?det (?:ar|blir)|det maste vara|vi (?:tar|kor|ska ha)|ta )\b/.test(x)
    || /\b(?:mitt svar|svaret pa fragan)\b/.test(x)
}

function correctForDifficulty(text,s){
  const x=semanticNormalizeV111(stripLeadIn(text)),a=semanticNormalizeV111(s.a);
  if(!x)return false;
  if(state.difficulty==='hard'){
    const required=a.split(' ').filter(w=>!['och','eller','med','i','en','ett'].includes(w));
    return required.every(w=>x.includes(w))
  }
  if(x===a||a.includes(x)||x.includes(a)){
    if(a.includes(' och ')){
      const req=a.split(' och ').map(v=>v.trim());return req.every(v=>x.includes(v))
    }
    return true
  }
  const aliases=mediumAliasesV111[a]||[];
  return aliases.some(v=>{
    const av=semanticNormalizeV111(v);
    return x===av||x.includes(av)
  })
}

function wrongOptionForStep(text,s){
  const guess=recipeOptionGuess(stripLeadIn(text),s.opts);if(!guess)return null;
  return semanticNormalizeV111(guess.option)!==semanticNormalizeV111(s.a)?guess.option:null
}

function personalSmallTalkQuestionV111(text){
  const x=normalize(text);
  if(!x)return false;
  if(/\bdu\b/.test(x)&&/^(?:hur|var|vart|vem|nar|varfor|kanner|bor|brukar|har|ar|kan|gillar|tycker|vad|vilken)/.test(x))return true;
  if(/^(?:hur ar laget|laget|vad heter du|hur mar du|sjalv da|och du)/.test(x))return true;
  return false
}

function stepAnswerDomainV111(s){
  const q=normalize(s?.q||''),opts=(s?.opts||[]).map(semanticNormalizeV111).join(' ');
  if(/\bglas\b|glaskant/.test(q)||/\b(?:glas|sejdel|flojt|kopp|highball|martini|cocktail|margarita|shot)\b/.test(opts))return'glass';
  if(/ort/.test(q))return'herb';
  if(/citrus/.test(q))return'citrus';
  if(/bassprit|grunden/.test(q))return'spirit';
  if(/sotma/.test(q))return'sweet';
  if(/bitter/.test(q))return'bitter';
  if(/juice/.test(q))return'juice';
  if(/behandlar|blandas|blandar|kylas|kyler|hur blandar/.test(q))return'method';
  if(/toppar/.test(q))return'mixer';
  if(/garnish|dekor/.test(q))return'garnish';
  return'generic'
}

function domainAnswerCandidateV111(text,s){
  const x=semanticNormalizeV111(stripLeadIn(text)),domain=stepAnswerDomainV111(s);
  if(!x)return false;
  const rules={
    glass:/\b(?:glas|sejdel|flojt|kopp|highball|martini|cocktail|margarita|shot|snaps|whiskyglas|olglas)\b/,
    herb:/\b(?:mynta|basilika|rosmarin|timjan|dill|salvia|koriander)\b/,
    citrus:/\b(?:lime|citron|apelsin|grapefrukt|citrus)\b/,
    spirit:/\b(?:rom|gin|tequila|vodka|whisky|bourbon|rye|cognac|brandy)\b/,
    sweet:/\b(?:socker|sockerlag|sirap|honung|agave)\b/,
    bitter:/\b(?:bitters|angostura|bitter)\b/,
    juice:/\b(?:juice|ananas|apelsin|tomat|lime|citron)\b/,
    method:/\b(?:muddla|stota|mosa|skaka|ror|rora|mixa|koka|varm|blanda|stirra)\b/,
    mixer:/\b(?:soda|sodavatten|tonic|cola|mjolk|ginger|ale|juice)\b/,
    garnish:/\b(?:lime|citron|apelsin|korsbar|oliv|mynta|rosmarin|kanel|gurka)\b/
  };
  return rules[domain]?.test(x)||false
}

function conversationalUtteranceV111(text){
  const x=normalize(text);
  if(personalSmallTalkQuestionV111(x))return true;
  if(/^(?:hej|tjena|halla|laget|hur ar laget|bra dag|fin dag|det ar fint har|det ar trevligt har|jag mar|jag har haft|idag har|kul har|roligt har)/.test(x))return true;
  return false
}

function looksLikeRecipeAnswerAttemptV111(text,s){
  const x=normalize(text);if(!x)return false;
  if(isRepeatRequest(text))return false;
  if(explicitAnswerIntent(text))return true;
  if(recipeOptionGuess(text,s?.opts||[]))return true;
  if(personalSmallTalkQuestionV111(text))return false;
  if(domainAnswerCandidateV111(text,s))return true;
  if(/^(?:ar det|ska det vara|skall det vara|blir det|tar vi|ska vi ha|skall vi ha)\b/.test(x))return true;
  if(conversationalUtteranceV111(text))return false;
  const words=stripLeadIn(text).split(' ').filter(Boolean);
  if(words.length>0&&words.length<=4&&!/[?]$/.test(x))return true;
  return false
}

function looksLikeSmallTalk(text,step=null){
  const x=normalize(text);if(!x)return false;
  if(isRepeatRequest(text))return false;
  if(step&&looksLikeRecipeAnswerAttemptV111(text,step))return false;
  return true
}

function classifyRecipeUtteranceV111(text,s){
  if(isRepeatRequest(text))return'repeat';
  if(correctForDifficulty(text,s))return'correct';
  if(wrongOptionForStep(text,s))return'answer';
  if(looksLikeRecipeAnswerAttemptV111(text,s))return'answer';
  return'chat'
}

function handleRecipeInput(raw){
  const text=String(raw||'').trim(),s=state.drink?.steps[state.step];if(!s||state.phase!=='recipe')return;
  if(!text){toast('Säg eller skriv något först.');return}
  const input=$('#recipeText');if(input)input.value='';
  const intent=classifyRecipeUtteranceV111(text,s);
  if(intent==='repeat'){
    state.recipeChatTurns=0;
    const r=`Absolut. Frågan var: ${state.lastRecipeQuestion||s.q}`;
    $('#dialogText').textContent=r;speak(r);return
  }
  if(intent==='correct'){
    state.recipeChatTurns=0;answerStep(s.a,null,true);return
  }
  if(intent==='answer'){
    state.recipeChatTurns=0;registerWrongAnswer(s);return
  }
  state.recipeChatTurns++;
  let reply=smallTalkReply(text);
  if(state.recipeChatTurns>=4){reply+=' '+bridgeBackToQuestion(state.lastRecipeQuestion||s.q);state.recipeChatTurns=0}
  $('#dialogText').textContent=reply;speak(reply)
}
