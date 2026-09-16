(() => {
  // Version 1.6: gör orienterings-API:t icke-blockerande.
  // Vissa Android/iPhone-webbläsare kan lämna Promise från fullscreen/orientation
  // väntande under själva rotationen. Kärnspel-loopens selectMood() väntar på dessa.
  // Här låter vi försöket fortsätta i bakgrunden men återgår efter en kort timeout.

  const timeoutPromise = (ms) => new Promise(resolve => setTimeout(() => resolve(false), ms));

  // Fullscreen får aldrig blockera spelövergången.
  try {
    const proto = Element.prototype;
    const nativeFullscreen = proto.requestFullscreen;
    if (typeof nativeFullscreen === 'function' && !proto.__barV16FullscreenPatched) {
      Object.defineProperty(proto, '__barV16FullscreenPatched', {value:true, configurable:true});
      proto.requestFullscreen = function(...args) {
        try {
          const p = nativeFullscreen.apply(this,args);
          if (p && typeof p.then === 'function') {
            return Promise.race([
              p.then(() => true).catch(() => false),
              timeoutPromise(500)
            ]);
          }
          return Promise.resolve(true);
        } catch(e) {
          return Promise.resolve(false);
        }
      };
    }
  } catch(e) {}

  // Screen Orientation lock får försöka, men får inte hålla kvar mood-skärmen.
  try {
    const soProto = window.ScreenOrientation && ScreenOrientation.prototype;
    const nativeLock = soProto && soProto.lock;
    if (typeof nativeLock === 'function' && !soProto.__barV16LockPatched) {
      Object.defineProperty(soProto, '__barV16LockPatched', {value:true, configurable:true});
      soProto.lock = function(mode) {
        try {
          const p = nativeLock.call(this,mode);
          if (p && typeof p.then === 'function') {
            return Promise.race([
              p.then(() => true).catch(() => false),
              timeoutPromise(650)
            ]);
          }
          return Promise.resolve(true);
        } catch(e) {
          return Promise.resolve(false);
        }
      };
    }
  } catch(e) {}

  // Skydda mot dubbeltryck på mood under rotationen.
  let moodTransitionRunning = false;
  document.addEventListener('click', (e) => {
    const moodButton = e.target && e.target.closest ? e.target.closest('.mood') : null;
    if (!moodButton) return;

    if (moodTransitionRunning) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    moodTransitionRunning = true;
    document.querySelectorAll('.mood').forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = b === moodButton ? '1' : '.55';
    });

    // Kärnscriptet ska hinna välja miljö och öppna baren även om rotationen tar tid.
    setTimeout(() => {
      moodTransitionRunning = false;
      document.querySelectorAll('.mood').forEach(b => {
        b.style.pointerEvents = '';
        b.style.opacity = '';
      });
    }, 2200);
  }, true);

  // Om browsern har roterat men mood-skärmen fortfarande visas efter en ovanligt
  // lång fördröjning, försök inte göra något destruktivt. Vi visar bara en liten
  // status så användaren vet att samma val inte ska tryckas igen.
  window.addEventListener('orientationchange', () => {
    const mood = document.getElementById('moodScreen');
    const toast = document.getElementById('toast');
    if (mood && mood.classList.contains('active') && moodTransitionRunning && toast) {
      toast.textContent = 'Öppnar baren…';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1200);
    }
  });
})();