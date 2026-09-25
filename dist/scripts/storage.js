import { GAME_CONFIG } from './config.js';

export function loadBestScore() {
  try {
    return Number(localStorage.getItem(GAME_CONFIG.bestScoreKey)) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    localStorage.setItem(GAME_CONFIG.bestScoreKey, String(score));
  } catch {
    // The game can still run when storage is unavailable (for example, private mode).
  }
}
