function preventAndRun(event, action) {
  event.preventDefault();
  action();
}

export function bindControls(game) {
  const startButton = document.getElementById('startBtn');
  const retryButton = document.getElementById('retryBtn');
  const jumpButton = document.getElementById('jumpBtn');
  const duckButton = document.getElementById('duckBtn');

  window.addEventListener('resize', () => game.resize());
  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp'].includes(event.code)) preventAndRun(event, () => game.jump());
    if (['ArrowDown', 'KeyS'].includes(event.code)) preventAndRun(event, () => game.duck(true));
    if (event.code === 'KeyP') game.togglePause();
  });
  window.addEventListener('keyup', (event) => {
    if (['ArrowDown', 'KeyS'].includes(event.code)) game.duck(false);
  });

  startButton.addEventListener('click', () => game.startRun());
  retryButton.addEventListener('click', () => game.startRun());
  jumpButton.addEventListener('pointerdown', (event) => preventAndRun(event, () => game.jump()));
  duckButton.addEventListener('pointerdown', (event) => preventAndRun(event, () => game.duck(true)));
  duckButton.addEventListener('pointerup', () => game.duck(false));
  duckButton.addEventListener('pointercancel', () => game.duck(false));
  game.canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') game.jump();
  });
}
