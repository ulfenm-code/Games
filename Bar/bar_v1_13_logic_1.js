'use strict';

/* Version 1.12: conversation-first recipe interpretation.
   The player's utterance can contain small talk, a recipe answer, a correction,
   a partial answer, or a request for help at the same time. */

const bartenderProfileV112={
  name:'Alex',
  age:34,
  years:10,
  home:'inne i stan, bara några kvarter från baren',
  origin:'vid kusten',
  favorite:'Manhattan'
};

function ensureDialogMemoryV112(){
  if(!state.dialogMemory)state.dialogMemory={lastPerson:'',lastTopic:'',helpRequested:false,lastPartial:[]};
  return state.dialogMemory
}

function semanticNormalizeV112(text){
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

function isDontKnowV112(text){
  const x=normalize(text);
  return /\b(jag vet (faktiskt )?inte|vet inte|ingen aning|har ingen aning|jag kan inte|jag kommer inte pa|jag minns inte|pass|hjälp|hjalp mig|ge mig alternativen|visa alternativen)\b/.test(x)
}

function isRepeatRequest(text){
  const x=normalize(text);
  return /upprepa|sag igen|ta om|fragan igen|vad sa du|vad var fragan|kan du ta den igen|en gang till|kan du upprepa|jag horde inte|missade fragan|va\??$/.test(x)
}

function hasAnswerLeadInV112(text){
  const x=normalize(text);
  return /\b(jag tror|jag sager|jag säger|jag svarar|jag valjer|jag väljer|jag tar|jag kor pa|jag kör på|mitt svar|svaret|det blir|det maste vara|det måste vara|jag landar i|jag bestammer mig for|jag bestämmer mig för|vi tar|vi kor|vi kör)\b/.test(x)
}

function lastDecisiveSegmentV112(text){
  const x=semanticNormalizeV112(text);
  // Later corrections should win: "lime ... nej, jag säger mynta" => "jag säger mynta".
  const markers=[...x.matchAll(/\b(?:nej(?:\s+vanta)?|fast|men|jo|okej|ok)\b/g)];
  if(markers.length){
    const last=markers[markers.length-1];
    const tail=x.slice(last.index+last[0].length).trim();
    if(tail)return tail
  }
  return x
}

const mediumAliasesV112={
  'muddla forsiktigt':['muddla','muddla mynta','muddla lime','stota','mosa lite'],
  'ror med is':['ror','rora','ror om','stirra'],
  'saltkant':['salt','salta kanten','salt pa kanten'],
  'sot vermouth':['vermouth','sot vermouth'],
  'angostura bitters':['angostura','bitters'],
  'triple sec':['triple sec','apelsinlikor','cointreau'],
  'cocktailkorsbar':['korsbar','cocktailkorsbar'],
  'limeklyfta':['lime','limeklyfta'],
  'lime eller citron':['lime','citron'],
  'apelsin eller lime':['apelsin','lime'],
  'highballglas':['highball','highballglas','longdrinkglas','long drink glas'],
  'margaritaglas':['margarita glas','margaritaglas'],
  'cocktailglas':['cocktail','cocktailglas'],
  'shotglas':['shot','shotglas','snapsglas','snaps glas']
};

function canonicalAliasesV112(answer){
  const a=semanticNormalizeV112(answer);
  const base=[a];
  for(const v of mediumAliasesV112[a]||[])base.push(semanticNormalizeV112(v));
  if(a==='vit rom')base.push('rom');
  if(a==='sodavatten')base.push('soda');
  return [...new Set(base.filter(Boolean))]
}

function optionMentionV112(text,option){
  const x=semanticNormalizeV112(text);
  let best=-1,hit='';
  for(const alias of canonicalAliasesV112(option)){
    const i=x.lastIndexOf(alias);
    if(i>best){best=i;hit=alias}
  }
  return best>=0?{option,index:best,alias:hit}:null
}

function lastOptionMentionV112(text,s){
  const hits=(s?.opts||[]).map(o=>optionMentionV112(text,o)).filter(Boolean);
  if(!hits.length)return null;
  hits.sort((a,b)=>a.index-b.index);
  return hits[hits.length-1]
}

function answerPartsV112(answer){
  const a=semanticNormalizeV112(answer);
  if(a.includes(' och '))return {mode:'all',parts:a.split(' och ').map(s=>s.trim()).filter(Boolean)};
  if(a.includes(' eller '))return {mode:'any',parts:a.split(' eller ').map(s=>s.trim()).filter(Boolean)};
  return {mode:'single',parts:[a]}
}

function mentionedCorrectPartsV112(text,s){
  const x=semanticNormalizeV112(text),spec=answerPartsV112(s.a),found=[];
  for(const p of spec.parts){
    const aliases=canonicalAliasesV112(p);
    if(aliases.some(a=>x.includes(a)))found.push(p)
  }
  return {spec,found}
}

function hardAnswerExactEnoughV112(text,s){
  const seg=lastDecisiveSegmentV112(text),a=semanticNormalizeV112(s.a);
  const required=a.split(' ').filter(w=>!['och','eller','med','i','en','ett'].includes(w));
  return required.every(w=>seg.includes(w))
}

function correctForDifficulty(text,s){
  const seg=lastDecisiveSegmentV112(text),a=semanticNormalizeV112(s.a);
  if(!seg)return false;
  const parts=mentionedCorrectPartsV112(seg,s);
  if(parts.spec.mode==='all'){
    if(parts.found.length<parts.spec.parts.length)return false;
    return true;
  }
  if(parts.spec.mode==='any'&&parts.found.length)return true;
  if(state.difficulty==='hard')return hardAnswerExactEnoughV112(seg,s);
  if(seg===a||seg.includes(a)||a.includes(seg))return true;
  return canonicalAliasesV112(a).some(v=>seg===v||seg.includes(v))
}

function partialAnswerV112(text,s){
  const {spec,found}=mentionedCorrectPartsV112(lastDecisiveSegmentV112(text),s);
  if(spec.mode!=='all'||!found.length||found.length>=spec.parts.length)return null;
  return {found,missing:spec.parts.filter(p=>!found.includes(p))}
}
