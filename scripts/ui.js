import { formatScore } from './config.js';

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required UI element: #${id}`);
  return element;
}

export class GameUI {
  constructor() {
    this.startOverlay = getElement('start');
    this.gameOverOverlay = getElement('over');
    this.score = getElement('score');
    this.best = getElement('best');
    this.final = getElement('final');
    this.energyFill = getElement('fill');
    this.combo = getElement('combo');
    this.flash = getElement('flash');
    this.newBest = getElement('newbest');
  }

  showBestScore(best) {
    this.best.textContent = formatScore(best);
  }

  showRunningState() {
    this.startOverlay.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.newBest.classList.remove('show');
    this.updateHud(0, 0, 1);
  }

  updateHud(score, energy, combo) {
    this.score.textContent = formatScore(score);
    this.energyFill.style.width = `${energy}%`;
    this.combo.textContent = `x${combo}`;
  }

  showGameOver(score, best, isNewBest) {
    this.best.textContent = formatScore(best);
    this.final.textContent = formatScore(score);
    this.newBest.classList.toggle('show', isNewBest);
    this.flash.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: 350 });
    window.setTimeout(() => this.gameOverOverlay.classList.remove('hidden'), 380);
  }
}
