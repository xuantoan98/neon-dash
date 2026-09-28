import { GAME_CONFIG } from './config.js';

export function loadBestScore() {
  try {
    const score = Number(localStorage.getItem(GAME_CONFIG.bestScoreKey));
    return Number.isFinite(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  if (!Number.isFinite(score) || score < 0) return;

  try {
    localStorage.setItem(GAME_CONFIG.bestScoreKey, String(score));
  } catch {
    // The game can still run when storage is unavailable (for example, private mode).
  }
}
