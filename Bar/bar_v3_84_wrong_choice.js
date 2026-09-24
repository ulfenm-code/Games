'use strict';
// v3.84: wrong multiple-choice answers must trigger the bartender's spoken feedback.
answerKnownChoice=function(answer,btn){
  const s=currentStepV119();if(!s||state.aiBusy)return;
  const ok=canon(answer)===canon(s.a);
  if(!ok){btn?.classList.add('bad');registerWrongAnswer(s);return}
  btn?.classList.add('good');completeRecipeStep(s,true)
};
