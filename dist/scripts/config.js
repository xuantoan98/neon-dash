export const COLORS = Object.freeze({
  cyan: '#6fffe9',
  pink: '#ff3d8d',
});

// Simulation units are frames at 60 Hz; retain the original game's tuning.
export const GAME_CONFIG = Object.freeze({
  initialSpeed: 7,
  maxSpeed: 15,
  initialSpawnDistance: 560,
  gravity: 0.72,
  groundRatio: 0.76,
  frameDuration: 1000 / 60,
  maxFrameDelta: 2.2,
  speedScoreInterval: 850,
  distanceScoreRate: 0.105,
  jumpVelocity: -13.8,
  doubleJumpVelocity: -12.2,
  maxJumps: 2,
  maxEnergy: 100,
  energyPerCombo: 25,
  energyDecay: 0.018,
  obstacleEnergy: 11,
  obstacleScore: 8,
  orbEnergy: 14,
  orbScore: 25,
  orbCollectionRadius: 30,
  collisionPadding: 8,
  duckHeight: 28,
  bestScoreKey: 'neonDashBest',
});

export const formatScore = (value) => String(Math.floor(value)).padStart(5, '0');
