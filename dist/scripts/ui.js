import { formatScore } from './config.js';
import { evaluateChallenges } from './content.js';

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required UI element: #${id}`);
  return element;
}

function setText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
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
    this.status = document.getElementById('gameStatus');
    this.pauseOverlay = document.getElementById('pause');
    this.pauseButton = document.getElementById('pauseBtn');
    this.gameOverTimer = null;
    this.flashAnimation = null;
    this.reducedMotionOverride = null;
  }

  showBestScore(best) {
    setText(this.best, formatScore(best));
  }

  showRunningState() {
    this.clearGameOverEffects();
    this.startOverlay.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.newBest.classList.remove('show');
    this.updateHud(0, 0, 1);
    this.setPaused(false);
    if (this.pauseButton) this.pauseButton.disabled = false;
  }

  setPaused(isPaused) {
    this.pauseOverlay?.classList.toggle('hidden', !isPaused);
    if (this.pauseButton) this.pauseButton.disabled = isPaused;
    setText(
      this.status,
      isPaused
        ? 'Đã tạm dừng. Nhấn P, Space hoặc nút Nhảy để tiếp tục.'
        : 'Đang chạy. Nhấn P để tạm dừng.',
    );
  }

  updateHud(score, energy, combo, stats) {
    setText(this.score, formatScore(score));
    const width = `${Math.max(0, Math.min(100, energy))}%`;
    if (this.energyFill.style.width !== width) this.energyFill.style.width = width;
    setText(this.combo, `x${combo}`);
    const missions = document.getElementById('missions');
    if (missions) {
      const goals = evaluateChallenges(stats, score);
      setText(
        missions,
        goals
          .map(
            (goal) => `${goal.complete ? '✓' : '◇'} ${goal.label}: ${goal.current}/${goal.target}`,
          )
          .join(' · '),
      );
    }
  }

  showGameOver(score, best, isNewBest, stats) {
    this.pauseOverlay?.classList.add('hidden');
    if (this.pauseButton) this.pauseButton.disabled = true;
    this.clearGameOverEffects();
    this.showBestScore(best);
    setText(this.final, formatScore(score));
    this.newBest.classList.toggle('show', isNewBest);
    setText(this.status, `Lượt chạy kết thúc. Điểm ${Math.floor(score)}. Nhấn Space để chạy lại.`);
    const summary = document.getElementById('runSummary');
    if (summary && stats)
      summary.textContent = `${Math.floor(stats.seconds)}s · ${stats.orbs} lõi · ${stats.obstacles} chướng ngại · Combo cao nhất x${stats.maxCombo}`;
    const goals = document.getElementById('finalChallenges');
    if (goals && stats)
      goals.textContent = `Thử thách hoàn thành: ${evaluateChallenges(stats, score).filter((goal) => goal.complete).length}/3`;
    if (!(
      this.reducedMotionOverride ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )) {
      this.flashAnimation =
        this.flash.animate?.([{ opacity: 0.8 }, { opacity: 0 }], { duration: 350 }) ?? null;
    }
    this.gameOverTimer = window.setTimeout(() => {
      this.gameOverTimer = null;
      this.gameOverOverlay.classList.remove('hidden');
    }, 380);
  }

  clearGameOverEffects() {
    if (this.gameOverTimer !== null) window.clearTimeout(this.gameOverTimer);
    this.gameOverTimer = null;
    this.flashAnimation?.cancel();
    this.flashAnimation = null;
  }

  dispose() {
    this.clearGameOverEffects();
  }
}
