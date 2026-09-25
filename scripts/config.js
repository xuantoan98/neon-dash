export const COLORS = {
  cyan: '#6fffe9',
  pink: '#ff3d8d',
};

export const GAME_CONFIG = {
  initialSpeed: 7,
  maxSpeed: 15,
  initialSpawnDistance: 560,
  gravity: 0.72,
  bestScoreKey: 'neonDashBest',
};

export const formatScore = (value) => String(Math.floor(value)).padStart(5, '0');
