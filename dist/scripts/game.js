import { COLORS, GAME_CONFIG } from './config.js';
import { createFox, createObstacle, createOrbsFor, isColliding } from './entities.js';
import { GameRenderer } from './renderer.js';
import { loadBestScore, saveBestScore } from './storage.js';

export class NeonDashGame {
  constructor(canvas, ui) {
    this.ui = ui;
    this.renderer = new GameRenderer(canvas);
    this.state = 'menu';
    this.time = 0;
    this.score = 0;
    this.best = loadBestScore();
    this.speed = GAME_CONFIG.initialSpeed;
    this.spawnDistance = GAME_CONFIG.initialSpawnDistance;
    this.energy = 0;
    this.combo = 1;
    this.shake = 0;
    this.lastFrameTime = 0;
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
    this.renderer.resize();
    this.fox.x = Math.max(72, this.renderer.width * 0.16);
    if (this.state === 'menu') this.fox.y = this.renderer.ground - this.fox.h;
  }

  start() {
    this.resize();
    window.requestAnimationFrame((time) => this.loop(time));
  }

  startRun() {
    this.score = 0;
    this.speed = GAME_CONFIG.initialSpeed;
    this.spawnDistance = GAME_CONFIG.initialSpawnDistance;
    this.energy = 0;
    this.combo = 1;
    this.time = 0;
    this.obstacles = [];
    this.orbs = [];
    this.particles = [];
    this.fox.y = this.renderer.ground - this.fox.h;
    this.fox.vy = 0;
    this.fox.jumps = 0;
    this.fox.duck = false;
    this.state = 'play';
    this.ui.showRunningState();
  }

  jump() {
    if (this.state === 'menu' || this.state === 'over') {
      this.startRun();
      return;
    }
    if (this.state === 'paused') {
      this.state = 'play';
      return;
    }
    if (this.state !== 'play' || this.fox.jumps >= 2) return;

    this.fox.vy = this.fox.jumps ? -12.2 : -13.8;
    this.fox.jumps += 1;
    this.fox.duck = false;
    this.burst(this.fox.x + 20, this.fox.y + this.fox.h, COLORS.cyan, 7);
  }

  duck(isDucking) {
    const onGround = this.fox.y >= this.renderer.ground - this.fox.h - 2;
    if (this.state === 'play' && onGround) this.fox.duck = isDucking;
  }

  togglePause() {
    if (this.state === 'play') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'play';
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
    if (this.state !== 'play') return;

    this.state = 'over';
    this.shake = 18;
    const finalScore = Math.floor(this.score);
    const isNewBest = finalScore > this.best;
    if (isNewBest) {
      this.best = finalScore;
      saveBestScore(this.best);
    }
    this.ui.showGameOver(finalScore, this.best, isNewBest);
    this.burst(this.fox.x + 24, this.fox.y + 25, COLORS.pink, 28);
  }

  update(dt) {
    if (this.state !== 'play') return;

    this.time += dt;
    this.speed = Math.min(GAME_CONFIG.maxSpeed, GAME_CONFIG.initialSpeed + this.score / 850);
    this.score += dt * this.speed * 0.105;
    this.spawnDistance -= dt * this.speed;
    if (this.spawnDistance < 0) {
      this.addObstacle();
      this.spawnDistance = this.nextObstacleGap();
    }

    this.updateFox(dt);
    this.updateObstacles(dt);
    this.updateOrbs(dt);
    this.updateParticles(dt);
    this.removeExpiredObjects();

    this.energy = Math.max(0, this.energy - 0.018 * dt);
    this.combo = 1 + Math.floor(this.energy / 25);
    this.ui.updateHud(this.score, this.energy, this.combo);
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
        this.energy = Math.min(100, this.energy + 11);
        this.combo = 1 + Math.floor(this.energy / 25);
        this.score += this.combo * 8;
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
      if (deltaX * deltaX + deltaY * deltaY < 900 && !orb.got) {
        orb.got = true;
        this.energy = Math.min(100, this.energy + 14);
        this.score += 25 * this.combo;
        this.burst(orb.x, orb.y, COLORS.cyan, 10);
      }
    });
  }

  updateParticles(dt) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 0.12 * dt;
      particle.life -= dt;
    });
  }

  removeExpiredObjects() {
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x > -100);
    this.orbs = this.orbs.filter((orb) => orb.x > -30 && !orb.got);
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  loop(time) {
    const dt = Math.min(2.2, (time - this.lastFrameTime) / 16.667 || 1);
    this.lastFrameTime = time;
    this.update(dt);
    this.renderer.render(this);
    window.requestAnimationFrame((nextTime) => this.loop(nextTime));
  }
}
