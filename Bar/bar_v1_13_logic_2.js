function stepAnswerDomainV112(s){
  const q=normalize(s?.q||''),opts=(s?.opts||[]).map(semanticNormalizeV112).join(' ');
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

function domainCandidateV112(text,s){
  const x=semanticNormalizeV112(text),domain=stepAnswerDomainV112(s);
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
  return !!rules[domain]?.test(x)
}

function looksLikeRecipeAnswerAttemptV112(text,s){
  if(isRepeatRequest(text)||isDontKnowV112(text))return false;
  if(hasAnswerLeadInV112(text))return true;
  if(lastOptionMentionV112(text,s))return true;
  if(domainCandidateV112(text,s))return true;
  const x=normalize(text);
  if(/\b(ar det|är det|ska det vara|skall det vara|blir det|tar vi|ska vi ha|skall vi ha)\b/.test(x))return true;
  return false
}

function explicitBartenderQuestionV112(text){
  const x=normalize(text);
  if(!x)return false;
  return /\b(hur gammal ar du|hur gammal är du|vad heter du|var bor du|vart bor du|bor du|var kommer du ifran|hur mar du|hur ar laget med dig|hur har du det|hur har din dag varit|vad gor du|vad jobbar du med|hur lange har du jobbat|gillar du jobbet|trivs du|favoritdrink|vad dricker du|vad gillar du att dricka|har du barn|har du familj|har du sambo|har du fru|har du man|vad gillar du for musik|vilken musik|gillar du fotboll|kanner du|känner du|vad gor du nar du ar ledig|vad gör du när du är ledig)\b/.test(x)
}

function extractKnownPersonV112(text){
  const x=normalize(text),m=x.match(/kann?er du\s+([a-zåäö][a-zåäö-]{1,20})/i);
  return m?m[1]:''
}

function answerBartenderQuestionV112(text){
  const x=normalize(text),mem=ensureDialogMemoryV112(),who=extractKnownPersonV112(text);
  if(who){
    const cap=who.charAt(0).toUpperCase()+who.slice(1);mem.lastPerson=cap;
    return pick([`${cap}? Jag känner ett par med det namnet, men jag vet inte om det är din ${cap}. Hur ser personen ut?`,`${cap} låter bekant. Hjälp mig lite – brukar personen hänga här?`,`${cap}? Kanske. Berätta något mer så kanske jag kopplar vem du menar.`])
  }
  if(/hur gammal ar du/.test(x))return `Jag är ${bartenderProfileV112.age}. Har hunnit samla på mig ungefär ${bartenderProfileV112.years} år bakom bardisk.`;
  if(/vad heter du|vem ar du/.test(x))return `Jag heter ${bartenderProfileV112.name}. Det är nog trevligare än att bara kalla mig bartendern hela kvällen.`;
  if(/var bor du|vart bor du|bor du i stan|bor du har/.test(x))return `Jag bor ${bartenderProfileV112.home}. Väldigt praktiskt efter ett sent pass.`;
  if(/var kommer du ifran|var ar du ifran/.test(x))return `Jag växte upp ${bartenderProfileV112.origin}, men har bott här länge nu.`;
  if(/hur ar laget med dig|hur mar du|sjalv da|och du|hur har du det/.test(x))return pick(['Bra faktiskt. Lagom med folk, bra musik och jag hinner prata lite – då är jag nöjd.','Jo tack, fint. Lite spring bakom baren, men inget kaos än.','Jag mår bra. Kaffe i kroppen och alla glas hela än så länge.']);
  if(/har du haft en bra dag|hur har din dag varit|fin dag/.test(x))return pick(['Jodå, bra dag. Det var körigt tidigare men nu är tempot lagom.','Faktiskt en rätt fin dag. En sån där dag som flyter på.','Jo, absolut. Jag har haft betydligt stökigare pass.']);
  if(/vad gor du|vad jobbar du med/.test(x))return `Jag jobbar här bakom baren. Har gjort det i ungefär ${bartenderProfileV112.years} år nu.`;
  if(/hur lange har du jobbat/.test(x))return `Ungefär ${bartenderProfileV112.years} år totalt. Tillräckligt länge för att höra på tonen när någon egentligen vill beställa en till.`;
  if(/gillar du jobbet|trivs du|kul att jobba/.test(x))return pick(['Ja, mycket. Det är både hantverk och människor, och jag gillar den blandningen.','Jag trivs. Ingen kväll är riktigt den andra lik.','Absolut. Samtalen är nästan lika roliga som drinkarna.']);
  if(/favoritdrink|vad dricker du|vad gillar du att dricka/.test(x))return `Om jag måste välja blir det nog en ${bartenderProfileV112.favorite}. Enkel på pappret, men den avslöjar direkt om balansen sitter.`;
  if(/musik/.test(x))return pick(['Soul, lite rock och sådant som inte behöver skrika för att märkas.','Jag är ganska bred, men soul och gammal rock går ofta hem.','Bakom baren vill jag ha musik med lite sväng, men ändå så man kan prata.']);
  if(/fotboll/.test(x))return pick(['Jag följer lite grann, men jag är bättre på drinklistan än tabellen.','Ibland. Mest när någon i baren lyckas dra in mig i en matchdiskussion.']);
  if(/ledig|fritid/.test(x))return pick(['När jag är ledig försöker jag vara ute en del, träffa folk och helst inte stå upp hela kvällen.','Kaffe, promenader och vänner. Ganska odramatiskt faktiskt.']);
  if(/har du barn|familj|sambo|fru|man/.test(x))return pick(['Jag har människor jag är väldigt nära, men lite privatliv får jag behålla även bakom baren.','Familj finns, ja. Men där brukar jag vara lite diskret med gästerna.']);
  if(mem.lastPerson&&/han|hon|den personen|kalle/.test(x))return `${mem.lastPerson}? Jag försöker fortfarande placera personen. Berätta en detalj till så kanske jag får napp.`;
  return ''
}

function smallTalkReply(text){
  const x=normalize(text),direct=answerBartenderQuestionV112(text);if(direct)return direct;
  if(/^(hej|tjena|halla)/.test(x))return pick(['Tjena! Jag är med dig.','Hej där. Jag lyssnar.','Jajamän, jag är kvar.']);
  if(/^(laget)|hur ar laget/.test(x))return pick(['Jo tack, fint. Rätt lagom tempo just nu.','Bra faktiskt. Jag gillar när man hinner prata samtidigt som man jobbar.','Det är bra. Inget glas har gått i golvet än, så jag tar det som en seger.']);
  if(/bra|fint|toppen|kanon|perfekt/.test(x))return pick(['Härligt.','Skönt att höra.','Bra, det gillar jag att höra.']);
  if(/daligt|jobbigt|trott|stress|sliten/.test(x))return pick(['Då tar vi det lugnt här. Ingen brådska.','Jag fattar. Då får baren vara en liten paus.','Sådana dagar finns. Vi håller tempot behagligt.']);
  if(/[?]$/.test(x)||/^(vad|vem|var|hur|nar|varfor|kan|har|ar|gillar|tycker)/.test(x))return pick(['Den kan jag inte svara säkert på, men säg hur du tänker så snackar vi om det.','Det där vet jag faktiskt inte. Vad tänker du själv?','Där får du hjälpa mig lite – jag vill inte hitta på ett svar.']);
  return pick(['Jaså? Berätta mer.','Jag hör dig. Fortsätt.','Mm, jag fattar. Vad hände sen?','Okej, nu blev jag nyfiken. Berätta.'])
}

function chatPartV112(text,s){
  const direct=answerBartenderQuestionV112(text);
  if(direct)return direct;
  // Don't treat a pure recipe answer as chat, but allow mixed utterances.
  const x=normalize(text);
  if(looksLikeRecipeAnswerAttemptV112(text,s)&&!/[?]/.test(x)&&!/(jag mar|min dag|jag jobbar|jag bor|forresten|förresten)/.test(x))return '';
  if(/[?]/.test(text)||/(forresten|förresten|jag mar|min dag|jag jobbar|jag bor|det ar|det är)/.test(x))return smallTalkReply(text);
  return ''
}

function classifyRecipeUtteranceV112(text,s){
  if(isRepeatRequest(text))return {kind:'repeat'};
  if(isDontKnowV112(text))return {kind:'help'};
  const chat=chatPartV112(text,s);
  const partial=partialAnswerV112(text,s);
  if(partial)return {kind:'partial',partial,chat};
  if(correctForDifficulty(text,s))return {kind:'correct',chat};
  if(looksLikeRecipeAnswerAttemptV112(text,s))return {kind:'wrong',chat};
  return {kind:'chat',chat:chat||smallTalkReply(text)}
}
