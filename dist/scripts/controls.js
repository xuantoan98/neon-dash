const JUMP_KEYS = new Set(['Space', 'ArrowUp']);
const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);

function isEditable(target) {
  return target?.isContentEditable || Boolean(target?.closest?.('input, textarea, select'));
}

export function bindControls(game) {
  const startButton = document.getElementById('startBtn');
  const retryButton = document.getElementById('retryBtn');
  const jumpButton = document.getElementById('jumpBtn');
  const duckButton = document.getElementById('duckBtn');
  const pauseButton = document.getElementById('pauseBtn');
  const resumeButton = document.getElementById('resumeBtn');
  const endButton = document.getElementById('endBtn');
  const gameButtons = new Set([startButton, retryButton, jumpButton, duckButton]);
  const duckKeys = new Set();
  const duckPointers = new Set();
  const removers = [];
  let disposed = false;

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    removers.push(() => target.removeEventListener(type, handler));
  }

  function updateDuck() {
    game.duck(duckKeys.size > 0 || duckPointers.size > 0);
  }

  function releaseInputs() {
    duckKeys.clear();
    const capturedPointers = [...duckPointers];
    duckPointers.clear();
    for (const pointerId of capturedPointers) {
      if (duckButton.hasPointerCapture?.(pointerId)) duckButton.releasePointerCapture(pointerId);
    }
    game.duck(false);
  }

  function pauseOnFocusLoss() {
    releaseInputs();
    game.pause();
  }

  function releasePointer(event) {
    if (duckPointers.delete(event.pointerId)) updateDuck();
  }

  function startRun() {
    releaseInputs();
    game.startRun();
  }

  listen(window, 'resize', () => game.resize());
  listen(window, 'keydown', (event) => {
    if (document.querySelector?.('dialog[open]')) return;
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isEditable(event.target)
    )
      return;

    const button = event.target?.closest?.('button, a[href], [role="button"]');
    if (button && !gameButtons.has(button) && event.code !== 'KeyP') return;

    const duckButtonKey = button === duckButton && ['Space', 'Enter'].includes(event.code);
    const jumpButtonKey = button === jumpButton && event.code === 'Enter';
    if (
      duckButtonKey ||
      jumpButtonKey ||
      JUMP_KEYS.has(event.code) ||
      DUCK_KEYS.has(event.code) ||
      event.code === 'KeyP'
    ) {
      // Consume native button activation too: one key press must cause one action.
      event.preventDefault();
      if (event.repeat) return;

      if (duckButtonKey || DUCK_KEYS.has(event.code)) {
        duckKeys.add(event.code);
        updateDuck();
      } else if (event.code === 'KeyP') {
        releaseInputs();
        game.togglePause();
      } else {
        game.jump();
      }
    } else if (event.code === 'Enter' && gameButtons.has(button) && event.repeat) {
      event.preventDefault();
    }
  });
  listen(window, 'keyup', (event) => {
    if (!duckKeys.delete(event.code)) return;
    event.preventDefault();
    updateDuck();
  });

  listen(startButton, 'click', startRun);
  listen(retryButton, 'click', startRun);
  if (pauseButton)
    listen(pauseButton, 'click', () => {
      releaseInputs();
      game.pause();
    });
  if (resumeButton) listen(resumeButton, 'click', () => game.resume());
  if (endButton) listen(endButton, 'click', () => game.endRun());
  listen(jumpButton, 'pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    game.jump();
  });
  listen(jumpButton, 'click', (event) => {
    // Keyboard and assistive-technology clicks have no preceding pointer action.
    if (event.detail === 0) game.jump();
  });
  listen(duckButton, 'pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    duckPointers.add(event.pointerId);
    // Capture keeps release events attached when the finger leaves the button.
    try {
      duckButton.setPointerCapture?.(event.pointerId);
    } catch {
      // The pointer may already be gone; window release handlers are the fallback.
    }
    updateDuck();
  });
  listen(window, 'pointerup', releasePointer);
  listen(window, 'pointercancel', releasePointer);
  listen(duckButton, 'lostpointercapture', releasePointer);
  listen(game.canvas, 'pointerdown', (event) => {
    if (event.button === 0 && event.pointerType !== 'mouse') game.jump();
  });
  listen(window, 'blur', pauseOnFocusLoss);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) pauseOnFocusLoss();
  });

  return function dispose() {
    if (disposed) return;
    disposed = true;
    removers.forEach((remove) => remove());
    releaseInputs();
  };
}
