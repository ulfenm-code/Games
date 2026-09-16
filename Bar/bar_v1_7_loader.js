(() => {
  const errorBox = () => {
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = 'Kunde inte starta spelet. Ladda om sidan.';
      t.classList.add('show');
    }
  };

  async function loadScriptText(path) {
    const r = await fetch(path, {cache:'no-store'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  }

  function patchCore(source) {
    const oldCode = "async function selectMood(mood){state.mood=mood;state.bar=mood==='surprise'?['tropical','manhattan','rooftop','hotel'][Math.floor(Math.random()*4)]:moodToBar[mood];speak(moodLines[mood]);await setOrientation('landscape',{fullscreen:true});await sleep(450);enterBar()}";

    const newCode = "function selectMood(mood){state.mood=mood;state.bar=mood==='surprise'?['tropical','manhattan','rooftop','hotel'][Math.floor(Math.random()*4)]:moodToBar[mood];speak(moodLines[mood]);enterBar();try{const doLock=()=>{try{const p=screen.orientation?.lock?.('landscape');if(p&&typeof p.catch==='function')p.catch(()=>{})}catch(e){}};if(document.fullscreenElement){doLock()}else if(document.documentElement.requestFullscreen){const fs=document.documentElement.requestFullscreen();if(fs&&typeof fs.then==='function')fs.then(doLock).catch(()=>{});else doLock()}else{doLock()}}catch(e){}}";

    if (!source.includes(oldCode)) {
      throw new Error('Kunde inte hitta selectMood i kärnkoden.');
    }
    return source.replace(oldCode, newCode);
  }

  function loadDifficulty() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'bar_v1_5_difficulty.js?v=17';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  async function boot() {
    try {
      document.documentElement.dataset.barBoot = 'loading';
      const source = await loadScriptText('bar_v1_3.js?v=17');
      const patched = patchCore(source);
      (new Function(patched + '\n//# sourceURL=bar_v1_7_core.js'))();
      await loadDifficulty();
      document.documentElement.dataset.barBoot = 'ready';
    } catch (e) {
      console.error('Bar Game 1.7 boot error', e);
      document.documentElement.dataset.barBoot = 'error';
      errorBox();
    }
  }

  boot();
})();