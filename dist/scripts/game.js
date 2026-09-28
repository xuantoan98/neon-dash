import { COLORS, GAME_CONFIG } from './config.js';
import { createFox, createObstacle, createOrbsFor, isColliding } from './entities.js';
import { GameRenderer } from './renderer.js';
import { loadBestScore, saveBestScore } from './storage.js';

// Reuse collections instead of allocating three new arrays on every physics tick.
function retainInPlace(items, keep) {
  let length = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (keep(item)) items[length++] = item;
  }
  items.length = length;
}
const livingParticle = (particle) => particle.life > 0;
const visibleObstacle = (obstacle) => obstacle.x > -100;
const availableOrb = (orb) => orb.x > -30 && !orb.got;

export class NeonDashGame {
  constructor(canvas, ui, { onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.ui = ui;
    this.renderer = new GameRenderer(canvas);
    this.state = 'menu';
    this.time = 0;
    this.distance = 0;
    this.score = 0;
    this.best = loadBestScore();
    this.speed = GAME_CONFIG.initialSpeed;
    this.spawnDistance = GAME_CONFIG.initialSpawnDistance;
    this.energy = 0;
    this.combo = 1;
    this.shake = 0;
    this.fox = createFox();
    this.obstacles = [];
    this.orbs = [];
    this.particles = [];

    this.ui.showBestScore(this.best);
  }

  get canvas() {
    return this.renderer.canvas;
  }

  resize() {
    const previousGround = this.renderer.ground;
    const previousX = this.fox.x;
    this.renderer.resize();
    this.renderer.motion.reset();
    this.fox.x = Math.max(72, this.renderer.width * 0.16);
    if (this.state === 'menu') {
      this.fox.y = this.renderer.ground - this.fox.h;
      return;
    }

    // Preserve jump height and distances to hazards through resize/orientation changes.
    const deltaY = this.renderer.ground - previousGround;
    const deltaX = this.fox.x - previousX;
    this.fox.y += deltaY;
    for (const objects of [this.obstacles, this.orbs, this.particles]) {
      for (const object of objects) {
        object.x += deltaX;
        object.y += deltaY;
      }
    }
  }

  startRun() {
    this.renderer.motion.reset();
    this.runStats = { jumps: 0, orbs: 0, obstacles: 0, maxCombo: 1 };
    this.score = 0;
    this.speed = GAME_CONFIG.initialSpeed;
    this.spawnDistance = GAME_CONFIG.initialSpawnDistance;
    this.energy = 0;
    this.combo = 1;
    this.time = 0;
    this.distance = 0;
    this.shake = 0;
    this.obstacles = [];
    this.orbs = [];
    this.particles = [];
    this.fox.y = this.renderer.ground - this.fox.h;
    this.fox.vy = 0;
    this.fox.jumps = 0;
    this.fox.duck = false;
    this.fox.frame = 0;
    this.state = 'play';
    this.ui.showRunningState();
    this.onEvent('start');
  }

  jump() {
    if (this.state === 'menu' || this.state === 'over') {
      this.startRun();
      return;
    }
    if (this.state === 'paused') {
      this.resume();
      return;
    }
    if (this.state !== 'play' || this.fox.jumps >= GAME_CONFIG.maxJumps) return;

    this.fox.vy = this.fox.jumps ? GAME_CONFIG.doubleJumpVelocity : GAME_CONFIG.jumpVelocity;
    this.fox.jumps += 1;
    this.runStats.jumps += 1;
    this.onEvent('jump');
    this.fox.duck = false;
    this.burst(this.fox.x + 20, this.fox.y + this.fox.h, COLORS.cyan, 7);
  }

  duck(isDucking) {
    if (!isDucking) {
      this.fox.duck = false;
      return;
    }
    const onGround = this.fox.y >= this.renderer.ground - this.fox.h - 2;
    if (this.state === 'play' && onGround) this.fox.duck = isDucking;
  }

  togglePause() {
    if (this.state === 'play') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  pause() {
    if (this.state !== 'play') return;
    this.renderer.motion.reset();
    this.fox.duck = false;
    this.state = 'paused';
    this.ui.setPaused(true);
    this.onEvent('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.renderer.motion.reset();
    this.state = 'play';
    this.ui.setPaused(false);
    this.onEvent('resume');
  }

  getStatus() {
    return {
      status: this.state,
      score: Math.floor(this.score),
      best: this.best,
      combo: this.combo,
    };
  }

  burst(x, y, color, count = 10) {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.8) * 5,
        life: 25 + Math.random() * 20,
        color,
        size: 1 + Math.random() * 3,
      });
    }
  }

  nextObstacleGap() {
    // Reserve a full jump arc plus a short landing/reaction window at every speed.
    return Math.max(420, this.speed * 58) + 160 + Math.random() * 180;
  }

  addObstacle() {
    const obstacle = createObstacle(this.renderer.width, this.renderer.ground);
    this.obstacles.push(obstacle);
    this.orbs.push(...createOrbsFor(obstacle, this.renderer.ground, this.renderer.width));
  }

  endRun() {
    if (this.state !== 'play' && this.state !== 'paused') return;

    this.state = 'over';
    this.shake = 18;
    const finalScore = Math.floor(this.score);
    const isNewBest = finalScore > this.best;
    if (isNewBest) {
      this.best = finalScore;
      saveBestScore(this.best);
    }
    this.ui.updateHud(this.score, this.energy, this.combo, this.runStats);
    this.ui.showGameOver(finalScore, this.best, isNewBest, {
      ...this.runStats,
      seconds: this.time / 60,
    });
    this.onEvent('over');
    this.burst(this.fox.x + 24, this.fox.y + 25, COLORS.pink, 28);
  }

  update(dt) {
    if (this.state === 'over') {
      this.updateEffects(dt);
      return;
    }
    if (this.state !== 'play') return;

    this.renderer.motion.capture(this);
    this.time += dt;
    this.speed = Math.min(
      GAME_CONFIG.maxSpeed,
      GAME_CONFIG.initialSpeed + this.score / GAME_CONFIG.speedScoreInterval,
    );
    this.distance += this.speed * dt;
    this.score += dt * this.speed * GAME_CONFIG.distanceScoreRate;
    this.spawnDistance -= dt * this.speed;
    if (this.spawnDistance < 0) {
      this.addObstacle();
      this.spawnDistance = this.nextObstacleGap();
    }

    this.updateFox(dt);
    this.updateObstacles(dt);
    // endRun commits the final score; do not collect or award anything afterwards.
    if (this.state !== 'play') return;
    this.updateOrbs(dt);
    this.updateEffects(dt);
    this.removeExpiredObjects();

    this.energy = Math.max(0, this.energy - GAME_CONFIG.energyDecay * dt);
    this.combo = 1 + Math.floor(this.energy / GAME_CONFIG.energyPerCombo);
    this.runStats.maxCombo = Math.max(this.runStats.maxCombo, this.combo);
    this.ui.updateHud(this.score, this.energy, this.combo, this.runStats);
  }

  updateFox(dt) {
    this.fox.vy += GAME_CONFIG.gravity * dt;
    this.fox.y += this.fox.vy * dt;
    if (this.fox.y >= this.renderer.ground - this.fox.h) {
      this.fox.y = this.renderer.ground - this.fox.h;
      this.fox.vy = 0;
      this.fox.jumps = 0;
    }
    this.fox.frame += dt * this.speed * 0.18;
  }

  updateObstacles(dt) {
    for (const obstacle of this.obstacles) {
      obstacle.x -= this.speed * dt;
      obstacle.phase += 0.06 * dt;
      if (obstacle.type === 'drone') {
        obstacle.y = this.renderer.ground - 72 + Math.sin(obstacle.phase) * 8;
      }
      if (!obstacle.passed && obstacle.x + obstacle.w < this.fox.x) {
        obstacle.passed = true;
        this.runStats.obstacles += 1;
        this.onEvent('pass');
        this.energy = Math.min(GAME_CONFIG.maxEnergy, this.energy + GAME_CONFIG.obstacleEnergy);
        this.combo = 1 + Math.floor(this.energy / GAME_CONFIG.energyPerCombo);
        this.score += this.combo * GAME_CONFIG.obstacleScore;
      }
      if (isColliding(this.fox, obstacle)) {
        this.endRun();
        break;
      }
    }
  }

  updateOrbs(dt) {
    this.orbs.forEach((orb) => {
      orb.x -= this.speed * dt;
      orb.t += 0.08 * dt;
      const deltaX = this.fox.x + 24 - orb.x;
      const deltaY = this.fox.y + 25 - (orb.y + Math.sin(orb.t) * 5);
      if (deltaX * deltaX + deltaY * deltaY < GAME_CONFIG.orbCollectionRadius ** 2 && !orb.got) {
        orb.got = true;
        this.runStats.orbs += 1;
        this.onEvent('orb');
        this.energy = Math.min(GAME_CONFIG.maxEnergy, this.energy + GAME_CONFIG.orbEnergy);
        this.score += GAME_CONFIG.orbScore * this.combo;
        this.burst(orb.x, orb.y, COLORS.cyan, 10);
      }
    });
  }

  updateEffects(dt) {
    this.shake *= 0.88 ** dt;
    if (this.shake < 0.05) this.shake = 0;
    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 0.12 * dt;
      particle.life -= dt;
    });
    retainInPlace(this.particles, livingParticle);
  }

  removeExpiredObjects() {
    retainInPlace(this.obstacles, visibleObstacle);
    retainInPlace(this.orbs, availableOrb);
  }
}
