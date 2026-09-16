(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function normalizeVoice(text){
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9 ]/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .replace(/whiskey/g,'whisky')
      .replace(/high ball/g,'highball')
      .replace(/martini glas/g,'martiniglas')
      .replace(/cocktail glas/g,'cocktailglas')
      .replace(/margarita glas/g,'margaritaglas')
      .replace(/soda vatten/g,'sodavatten')
      .replace(/trippel sek/g,'triple sec')
      .replace(/trippelsek/g,'triple sec');
  }

  function expandedHeard(text){
    let x = normalizeVoice(text);
    const aliases = [
      [/^rom$/, 'vit rom'],
      [/^soda$/, 'sodavatten'],
      [/^highball$/, 'highballglas'],
      [/^martini$/, 'martiniglas'],
      [/^margarita glas$/, 'margaritaglas'],
      [/^cocktail$/, 'cocktailglas'],
      [/^salt$/, 'saltkant'],
      [/^muddla$/, 'muddla forsiktigt'],
      [/^rora$|^ror$|^rora med is$/, 'ror med is'],
      [/^lime mynta$|^lime och mynta$/, 'lime och mynta'],
      [/^lime citron$|^lime eller citron$/, 'lime eller citron'],
      [/^apelsin lime$|^apelsin eller lime$/, 'apelsin eller lime']
    ];
    for(const [re,repl] of aliases){ if(re.test(x)) return repl; }
    return x;
  }

  function scoreMatch(heard, option){
    const h = expandedHeard(heard);
    const o = normalizeVoice(option);
    if(!h || !o) return 0;
    if(h === o) return 100;
    if(o.includes(h) || h.includes(o)) return 90;

    const ht = new Set(h.split(' ').filter(Boolean));
    const ot = new Set(o.split(' ').filter(Boolean));
    let common = 0;
    ht.forEach(t => { if(ot.has(t)) common++; });
    if(common === 0) return 0;
    return Math.round(70 * common / Math.max(1, Math.min(ht.size, ot.size)));
  }

  function findBestChoice(transcript){
    const choices = $$('.choice').filter(b => b.offsetParent !== null);
    let best = null;
    let bestScore = 0;
    for(const button of choices){
      const score = scoreMatch(transcript, button.textContent);
      if(score > bestScore){ bestScore = score; best = button; }
    }
    return bestScore >= 55 ? best : null;
  }

  function speakBrief(text){
    try{
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'sv-SE';
      u.rate = .98;
      speechSynthesis.speak(u);
    }catch(e){}
  }

  function startAnswerRecognition(button, status){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){
      status.textContent = 'Taligenkänning stöds inte i den här webbläsaren.';
      return;
    }

    try{
      if('speechSynthesis' in window) speechSynthesis.cancel();
      const recognition = new SR();
      recognition.lang = 'sv-SE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        button.textContent = '🎙️ Lyssnar…';
        button.disabled = true;
        status.textContent = 'Säg ingrediensen, flaskan eller svaret högt.';
      };

      recognition.onerror = e => {
        button.textContent = '🎙️ Säg svaret';
        button.disabled = false;
        status.textContent = e.error === 'not-allowed'
          ? 'Mikrofonen är inte tillåten. Ge webbsidan mikrofonåtkomst och försök igen.'
          : 'Jag hörde inte tydligt. Tryck och försök igen.';
      };

      recognition.onend = () => {
        if(document.body.contains(button)){
          button.textContent = '🎙️ Säg svaret';
          button.disabled = false;
        }
      };

      recognition.onresult = e => {
        const alternatives = [];
        for(let i=0;i<e.results[0].length;i++) alternatives.push(e.results[0][i].transcript);

        let selected = null;
        let selectedText = alternatives[0] || '';
        for(const text of alternatives){
          const match = findBestChoice(text);
          if(match){ selected = match; selectedText = text; break; }
        }

        if(selected){
          status.textContent = `Jag hörde: “${selectedText}” → ${selected.textContent}`;
          selected.style.outline = '3px solid #f7c25b';
          setTimeout(() => {
            if(document.body.contains(selected)) selected.click();
          }, 450);
        }else{
          status.textContent = `Jag hörde: “${selectedText}”, men kunde inte koppla det till något alternativ.`;
          speakBrief('Jag fick inte riktigt ihop det med alternativen. Försök igen.');
        }
      };

      recognition.start();
    }catch(e){
      button.textContent = '🎙️ Säg svaret';
      button.disabled = false;
      status.textContent = 'Mikrofonen kunde inte startas. Försök igen.';
    }
  }

  function injectVoiceAnswer(){
    const controls = $('#dialogControls');
    if(!controls) return;
    const choices = controls.querySelector('.choices');
    if(!choices || controls.querySelector('#answerMicBtn')) return;

    const row = document.createElement('div');
    row.id = 'voiceAnswerRow';
    row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px';

    const button = document.createElement('button');
    button.id = 'answerMicBtn';
    button.className = 'btn secondary';
    button.type = 'button';
    button.textContent = '🎙️ Säg svaret';

    const status = document.createElement('span');
    status.id = 'answerVoiceStatus';
    status.className = 'small';
    status.style.margin = '0';
    status.textContent = 'Du kan trycka på ett alternativ eller säga svaret.';

    button.addEventListener('click', () => startAnswerRecognition(button, status));
    row.append(button, status);
    controls.appendChild(row);
  }

  const target = $('#dialogControls');
  if(target){
    const observer = new MutationObserver(injectVoiceAnswer);
    observer.observe(target,{childList:true,subtree:true});
  }

  document.addEventListener('DOMContentLoaded', injectVoiceAnswer);
  setTimeout(injectVoiceAnswer,500);
})();