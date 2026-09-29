'use strict';
/* Bar Game v4.14 actions: adds vigorous blender interaction and stronger IBA Tiki shake. */

function alexActionEventV388(type,facts={},options={}){
  return window.__barAI388?.event?.(type,facts,{target:null,phase:'action',...options})
}
function startPhysicalAction(type,afterAction){
  if(window.__barCrazyGateV47?.deferIfActive?.('progression',()=>startPhysicalAction(type,afterAction)))return;
  state.phase='action';stopIdle();state.action=type;state.afterAction=afterAction;state.waitingPortrait=true;state.waitingLandscape=false;state.returning=false;state.shakeProgress=0;state.muddleProgress=0;state.drinkProgress=0;state.baselineBeta=null;state.baselineGamma=null;
  show('actionScreen');['muddleStage','shakeStage','drinkStage','returnStage'].forEach(id=>$('#'+id).classList.add('hidden'));$('#rotateStage').classList.remove('hidden');
  const names={muddle:'Muddla mynta och lime',blend:'Mixa kraftigt i mixern',shake:'Skaka drinken',drink:'Smaka på drinken'};
  $('#rotateTitle').textContent=names[type]||'Fysiskt moment';$('#rotateHint').textContent='Det här momentet görs i stående läge.';
  alexActionEventV388('physical_prepare',{action:type,requiresPortrait:true});
  if(isPortrait())showPhysicalStage()
}
$('#startPortraitBtn').onclick=async()=>{await requestSensors();tryOrientation('portrait',true);if(isPortrait())showPhysicalStage();else toast('Vrid telefonen till stående. Spelet fortsätter automatiskt.')};
function showPhysicalStage(){
  if(!$('#actionScreen').classList.contains('active'))return;
  state.waitingPortrait=false;$('#rotateStage').classList.add('hidden');['muddleStage','shakeStage','drinkStage','returnStage'].forEach(id=>$('#'+id).classList.add('hidden'));
  if(state.action==='muddle'||state.action==='blend'){
    $('#muddleStage').classList.remove('hidden');updateMuddle();
    const blend=state.action==='blend';
    const h=$('#muddleStage h2'),p=$('#muddleStage p');
    if(h)h.textContent=blend?'Mixa kraftigt!':'Muddla myntan';
    if(p)p.textContent=blend?'För fingret snabbt och kraftigt fram och tillbaka för att simulera mixern.':'Tryck och gnugga myntan och limen med fingret – försiktigt, inte till mos.';
    alexActionEventV388('physical_instruction',{action:state.action,goal:blend?'Spelaren ska göra tydliga, snabba och kraftiga rörelser med fingret för att simulera en blender.':'Spelaren ska trycka och gnugga mynta och lime försiktigt med fingret, inte mosa sönder dem.'})
  }else if(state.action==='shake'){
    $('#shakeStage').classList.remove('hidden');updateShake();
    alexActionEventV388('physical_instruction',{action:'shake',goal:'Spelaren ska skaka telefonen som en shaker.'})
  }else{
    $('#drinkStage').classList.remove('hidden');updateDrink();
    alexActionEventV388('physical_instruction',{action:'drink',goal:'Spelaren ska föra telefonen mot munnen och luta den för att simulera provsmakning.'})
  }
}
function finishPhysical(kind){
  ['muddleStage','shakeStage','drinkStage'].forEach(id=>$('#'+id).classList.add('hidden'));$('#returnStage').classList.remove('hidden');state.waitingLandscape=true;
  $('#returnText').textContent='Momentet är klart. Vrid tillbaka telefonen vågrätt. Spelet fortsätter automatiskt när landscape upptäcks.';
  alexActionEventV388('physical_complete',{action:kind,completed:true,returnToBar:true});
  tryOrientation('landscape',false);setTimeout(()=>{if(isLandscape())finalizeLandscapeReturn()},350)
}
function finalizeLandscapeReturn(force=false){
  if(window.__barCrazyGateV47?.deferIfActive?.('progression',()=>finalizeLandscapeReturn(force)))return;
  if((!state.waitingLandscape&&!force)||state.returning)return;
  state.returning=true;state.waitingLandscape=false;
  if(state.afterAction==='result'){state.phase='result';showResult()}else{state.phase='recipe';show('barScreen');updateOrientationBanner();renderStep(true)}
  state.returning=false
}
$('#returnBarBtn').onclick=()=>{tryOrientation('landscape',false);setTimeout(()=>finalizeLandscapeReturn(true),180)};
$('#tryLandscapeBtn').onclick=()=>{tryOrientation('landscape',true);updateOrientationBanner()};

let blendPointerV414=null;
function addMuddle(e=null){
  const now=performance.now();
  if(state.action==='blend'){
    if(e){
      const pt={x:Number(e.clientX||0),y:Number(e.clientY||0),t:now};
      if(!blendPointerV414){blendPointerV414=pt;return}
      const dx=pt.x-blendPointerV414.x,dy=pt.y-blendPointerV414.y,dt=Math.max(1,pt.t-blendPointerV414.t);
      const dist=Math.hypot(dx,dy),speed=dist/dt;
      blendPointerV414=pt;
      if(dist<13||speed<0.16)return;
    }
    if(now-state.lastMuddle<42)return;
    state.lastMuddle=now;
    state.muddleProgress=Math.min(100,state.muddleProgress+4);
  }else{
    if(now-state.lastMuddle<55)return;
    state.lastMuddle=now;
    state.muddleProgress=Math.min(100,state.muddleProgress+7);
  }
  $('#muddleGlass').classList.add('hit');setTimeout(()=>$('#muddleGlass').classList.remove('hit'),90);
  updateMuddle();
  if(state.muddleProgress>=100)finishPhysical(state.action==='blend'?'blend':'muddle')
}
$('#muddleGlass').onpointerdown=e=>{e.preventDefault();blendPointerV414=null;addMuddle(e)};
$('#muddleGlass').onpointermove=e=>{if(e.buttons||e.pointerType==='touch'){e.preventDefault();addMuddle(e)}};
$('#muddleGlass').onpointerup=()=>{blendPointerV414=null};
$('#muddleGlass').onpointercancel=()=>{blendPointerV414=null};
$('#muddleFallback').onclick=()=>{state.muddleProgress=Math.min(100,state.muddleProgress+(state.action==='blend'?12:18));updateMuddle();if(state.muddleProgress>=100)finishPhysical(state.action==='blend'?'blend':'muddle')};
function updateMuddle(){$('#muddleFill').style.width=state.muddleProgress+'%';$('#muddleStatus').textContent=(state.action==='blend'?'Mixer ':'')+Math.round(state.muddleProgress)+'%'}

window.addEventListener('devicemotion',e=>{
  if(state.action!=='shake'||$('#shakeStage').classList.contains('hidden'))return;
  const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;
  const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2),now=performance.now();
  const iba=state.drink?.id==='ibaTiki',threshold=iba?19:15,increment=iba?5:7,spacing=iba?110:95;
  if(mag>threshold&&now-state.lastMotion>spacing){state.lastMotion=now;state.shakeProgress=Math.min(100,state.shakeProgress+increment);updateShake();if(state.shakeProgress>=100)finishPhysical('shake')}
});
$('#shakeFallback').onclick=()=>{state.shakeProgress=Math.min(100,state.shakeProgress+18);updateShake();if(state.shakeProgress>=100)finishPhysical('shake')};
function updateShake(){$('#shakeFill').style.width=state.shakeProgress+'%';$('#shakeStatus').textContent=Math.round(state.shakeProgress)+'%'}

window.addEventListener('deviceorientation',e=>{
  if(state.action!=='drink'||$('#drinkStage').classList.contains('hidden'))return;
  if(state.baselineBeta===null){state.baselineBeta=e.beta||0;state.baselineGamma=e.gamma||0;return}
  const db=Math.abs((e.beta||0)-state.baselineBeta),dg=Math.abs((e.gamma||0)-state.baselineGamma),tilt=Math.max(db,dg);
  state.drinkProgress=Math.max(state.drinkProgress,Math.min(100,(tilt-8)/58*100));updateDrink();if(state.drinkProgress>=98)finishPhysical('drink')
});
$('#drinkFallback').onclick=()=>{state.drinkProgress=Math.min(100,state.drinkProgress+20);updateDrink();if(state.drinkProgress>=100)finishPhysical('drink')};
function updateDrink(){
  const p=Math.max(0,Math.min(100,state.drinkProgress));$('#drinkFill').style.width=p+'%';$('#liquid').style.height=(78*(1-p/100))+'%';
  $('#drinkStatus').textContent=p<20?'Glaset är fullt.':p<70?'Du dricker…':p<98?'Nästan tomt…':'Tomt!'
}

function showResult(){
  show('resultScreen');
  const max=state.drink.steps.length*10,accuracy=state.correct/(state.correct+state.wrong||1),time=Math.round((Date.now()-state.startedAt)/1000),score=Math.max(0,Math.min(100,Math.round((state.points/max)*75+accuracy*25)));
  $('#scoreValue').textContent=score;$('#resultTitle').textContent=`${state.drink.name} klar!`;$('#resultLine').textContent='';
  $('#scoreGrid').innerHTML=`<div><b>${state.correct}</b><br><small>rätt</small></div><div><b>${state.wrong}</b><br><small>fel</small></div><div><b>${time}s</b><br><small>tid</small></div>`;
  window.__barAI388?.event?.('result',{drinkName:state.drink.name,score,correct:state.correct,wrong:state.wrong,timeSeconds:time},{target:'#resultLine',phase:'result'})
}
$('#anotherBtn').onclick=()=>{
  state.phase='chat';state.drink=null;state.serving=null;updateHud();show('barScreen');$('#dialogText').textContent='';
  window.__barAI388?.activity?.();
  const done=()=>{if(state.phase==='chat')renderConversationInput(false)};
  const p=window.__barAI388?.event?.('another_drink',{playerName:state.name},{target:'#dialogText',phase:'chat',after:done});
  if(!p)done()
};
$('#changeMoodBtn').onclick=()=>{
  state.phase='mood';state.drink=null;show('moodScreen');$('#moodPrompt').textContent='Välj ett nytt mood.';
  window.__barAI388?.activity?.();
  window.__barAI388?.event?.('change_mood',{playerName:state.name},{target:'#moodPrompt',phase:'mood'})
};

function recognize(onResult,button,status){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){if(status)status.textContent='Taligenkänning stöds inte här.';else toast('Taligenkänning stöds inte i den här webbläsaren.');return}
  try{
    stopSpeech();const r=new SR();r.lang='sv-SE';r.interimResults=false;r.maxAlternatives=3;const old=button?.textContent||'';
    r.onstart=()=>{if(button){button.textContent='🎙️ Lyssnar…';button.disabled=true}if(status)status.textContent='Jag lyssnar…';else toast('Jag lyssnar…')};
    r.onerror=()=>{if(status)status.textContent='Jag hörde inte tydligt. Försök igen.';else toast('Jag hörde inte. Försök igen.')};
    r.onend=()=>{if(button&&document.body.contains(button)){button.textContent=old;button.disabled=false}};
    r.onresult=e=>{const a=[];for(let i=0;i<e.results[0].length;i++)a.push(e.results[0][i].transcript);onResult(a)};r.start()
  }catch(e){toast('Mikrofonen kunde inte startas.')}
}
function handleOrientation(){setTimeout(()=>{updateOrientationBanner();if(state.waitingPortrait&&isPortrait()&&$('#actionScreen').classList.contains('active'))showPhysicalStage();if(state.waitingLandscape&&isLandscape()&&$('#actionScreen').classList.contains('active'))finalizeLandscapeReturn()},160)}
window.addEventListener('orientationchange',handleOrientation);window.addEventListener('resize',handleOrientation);
const mq=matchMedia('(orientation: portrait)');if(mq.addEventListener)mq.addEventListener('change',handleOrientation);else mq.addListener?.(handleOrientation);updateOrientationBanner();
