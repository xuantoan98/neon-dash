import { GAME_CONFIG } from './config.js';
import { SKINS, SCENES, HAZARDS } from './content.js';
import { RenderMotion, interpolate, wrapPosition } from './render-motion.js';

export class GameRenderer {
  constructor(canvas) {
    if (!canvas) throw new Error('Missing required game canvas.');
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('Canvas 2D is not supported by this browser.');

    this.width = 0;
    this.height = 0;
    this.buildings = [];
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotionOverride = null;
    this.lowQuality = false;
    this.revision = 0;
    this.skin = SKINS.kitsune;
    this.scene = SCENES.neo;
    this.motion = new RenderMotion();
    this.pixelRatio = 1;
    this.sprites = new Map();
    this.cacheStyle = null;
  }

  get ground() {
    return this.height * GAME_CONFIG.groundRatio;
  }

  resize() {
    this.revision += 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pixelRatio = dpr;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sprites.clear();
    this.makeCity();
  }

  prepareSprites() {
    const style = this.cacheStyle;
    if (style?.skin === this.skin && style.scene === this.scene && style.low === this.lowQuality) return;
    this.sprites.clear();
    this.cacheStyle = { skin: this.skin, scene: this.scene, low: this.lowQuality };
  }

  sprite(key, width, height, padding, paint) {
    // No DOM dependency in the simulation or non-browser renderer harnesses.
    if (!this.canvas.ownerDocument) return null;
    let sprite = this.sprites.get(key);
    if (sprite) return sprite;
    const canvas = this.canvas.ownerDocument.createElement('canvas');
    const scale = this.pixelRatio;
    canvas.width = Math.ceil((width + padding * 2) * scale);
    canvas.height = Math.ceil((height + padding * 2) * scale);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.setTransform(scale, 0, 0, scale, padding * scale, padding * scale);
    const main = this.context;
    this.context = context;
    try {
      paint();
    } finally {
      this.context = main;
    }
    sprite = { canvas, width: canvas.width / scale, height: canvas.height / scale, padding };
    // Bound memory even if a future theme adds many distinct object dimensions.
    if (this.sprites.size >= 64) this.sprites.delete(this.sprites.keys().next().value);
    this.sprites.set(key, sprite);
    return sprite;
  }

  drawSprite(sprite, x = 0, y = 0) {
    this.context.drawImage(sprite.canvas, x - sprite.padding, y - sprite.padding, sprite.width, sprite.height);
  }

  makeCity() {
    this.buildings = [];
    let position = 0;
    while (position < this.width + 300) {
      const width = 35 + Math.random() * 90;
      this.buildings.push({
        x: position,
        w: width,
        h: 50 + Math.random() * 220,
        seed: Math.random(),
        layer: Math.random() < 0.5 ? 0 : 1,
      });
      position += width + 8 + Math.random() * 18;
    }
  }

  line(fromX, fromY, toX, toY, color, width = 2) {
    const context = this.context;
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
  }

  drawCity(game, alpha = 1) {
    this.prepareSprites();
    const context = this.context;
    const { width, height, ground } = this;
    const distance = interpolate(this.motion.distance, game.distance, alpha);
    const time = interpolate(this.motion.time, game.time, alpha);
    const dusk = (Math.sin(time * 0.001) + 1) / 2;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(
      0,
      this.scene.sky ?? `rgb(${18 + 20 * dusk},${18 + 12 * dusk},${45 + 35 * dusk})`,
    );
    sky.addColorStop(1, this.scene.horizon);
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    const decoration = this.sprite('sky-decoration', width, ground, 0, () => this.drawSkyDecoration());
    if (decoration) this.drawSprite(decoration);
    else this.drawSkyDecoration();

    this.buildings.forEach((building, index) => {
      const parallax = building.layer ? 0.056 : 0.028;
      const buildingX = wrapPosition(building.x - distance * parallax, width + 300) - 150;
      if (buildingX + building.w < 0 || buildingX > width) return;
      const sprite = this.sprite(`building:${index}`, building.w, building.h, 0, () =>
        this.drawBuilding(building, index, 0, building.h),
      );
      if (sprite) this.drawSprite(sprite, buildingX, ground + 4 - building.h);
      else this.drawBuilding(building, index, buildingX, ground + 4);
    });

    context.fillStyle = this.scene.ground;
    context.fillRect(0, ground, width, height - ground);
    context.strokeStyle = 'rgba(150,255,237,.7)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, ground);
    context.lineTo(width, ground);
    context.stroke();
    const gridOffset = wrapPosition(distance * 1.4, 90);
    // One path instead of a separate canvas stroke for every grid line.
    context.strokeStyle = 'rgba(148,143,255,.23)';
    context.lineWidth = 1;
    context.beginPath();
    for (let gridX = -gridOffset; gridX < width + 90; gridX += 90) {
      context.moveTo(gridX, ground + 4);
      context.lineTo(gridX - 90, height);
    }
    context.stroke();
  }

  drawSkyDecoration() {
    const context = this.context;
    const { width, height } = this;
    context.fillStyle = 'rgba(112,92,255,.13)';
    context.beginPath();
    context.arc(width * 0.76, height * 0.25, Math.min(width, height) * 0.19, 0, 7);
    context.fill();
    context.strokeStyle = 'rgba(255,61,141,.25)';
    context.lineWidth = 1;
    for (let index = 0; index < 4; index += 1) {
      context.beginPath();
      context.arc(width * 0.76, height * 0.25, 55 + index * 22, 0, Math.PI * 2);
      context.stroke();
    }

    for (let index = 0; index < 55; index += 1) {
      const starX = (index * 173) % width;
      const starY = (index * 67) % (height * 0.52);
      context.fillStyle = index % 7 ? 'rgba(255,255,255,.35)' : '#6fffe9';
      context.fillRect(starX, starY, 1.4, 1.4);
    }

  }

  drawBuilding(building, index, buildingX, base) {
      const context = this.context;
      context.fillStyle = building.layer ? this.scene.front : this.scene.back;
      context.fillRect(buildingX, base - building.h, building.w, building.h);
      context.fillStyle = building.seed > 0.5 ? 'rgba(111,255,233,.28)' : 'rgba(255,61,141,.24)';
      for (let row = 0, y = 15; y < building.h - 12; row++, y += 20) {
        for (let column = 0, x = 9; x < building.w - 5; column++, x += 16) {
          // Window identity belongs to the building, not its moving screen coordinate.
          if ((column + row + index) % 4)
            context.fillRect(buildingX + x, base - building.h + y, 3, 7);
        }
      }
  }

  drawFox(fox, alpha = 1) {
    this.prepareSprites();
    const context = this.context;
    const { body, legs } = this.skin;
    const x = this.motion.value(fox, 'x', alpha);
    const y = this.motion.value(fox, 'y', alpha);
    const frame = this.motion.value(fox, 'frame', alpha);
    context.save();
    context.translate(x, y + (fox.duck ? 18 : 0));
    const airborne = y < this.ground - fox.h - 2;
    const bob = airborne ? 0 : Math.sin(frame) * 2;
    const leg = airborne ? 0 : Math.sin(frame) * 11;
    context.translate(0, bob);
    context.shadowBlur = this.lowQuality ? 0 : 14;
    context.shadowColor = body;

    if (fox.duck) {
      context.shadowBlur = 0;
      const sprite = this.sprite('fox-duck', 64, 64, 24, () => this.drawFoxBody(true));
      if (sprite) this.drawSprite(sprite);
      else this.drawFoxBody(true);
    } else {
      this.line(18, 41, 13 + leg, 54, legs, 8);
      this.line(36, 41, 41 - leg, 54, legs, 8);
      context.shadowBlur = 0;
      const sprite = this.sprite('fox-body', 64, 58, 24, () => this.drawFoxBody(false));
      if (sprite) this.drawSprite(sprite);
      else this.drawFoxBody(false);
      context.shadowBlur = this.lowQuality ? 0 : 14;
      this.line(11, 34, -11, 27 + Math.sin(frame * 0.6) * 6, body, 7);
    }

    context.shadowBlur = 0;
    context.restore();
  }

  drawFoxBody(duck) {
    const context = this.context;
    const { body, shade, eye } = this.skin;
    context.shadowBlur = this.lowQuality ? 0 : 14;
    context.shadowColor = body;
    if (duck) {
      context.rotate(0.16);
      context.fillStyle = body;
      context.fillRect(10, 18, 38, 22);
      context.beginPath();
      context.moveTo(42, 18);
      context.lineTo(52, 2);
      context.lineTo(55, 22);
      context.fill();
      context.fillStyle = eye;
      context.fillRect(40, 23, 8, 4);
      this.line(10, 33, -12, 24, body, 7);
    } else {
      context.fillStyle = body;
      context.fillRect(10, 15, 37, 30);
      context.fillStyle = shade;
      context.fillRect(15, 22, 8, 18);
      context.beginPath();
      context.moveTo(38, 16);
      context.lineTo(41, -2);
      context.lineTo(50, 18);
      context.moveTo(19, 16);
      context.lineTo(14, 1);
      context.lineTo(9, 22);
      context.fill();
      context.fillStyle = eye;
      context.fillRect(37, 23, 9, 4);
      context.fillStyle = '#080b18';
      context.fillRect(40, 23, 3, 4);
    }

    context.shadowBlur = 0;
  }

  drawObjects(game, alpha = 1) {
    this.prepareSprites();
    const context = this.context;
    game.orbs.forEach((orb) => {
      const x = this.motion.value(orb, 'x', alpha);
      if (x < -24 || x > this.width + 24) return;
      const rotation = this.motion.value(orb, 't', alpha);
      const y = this.motion.value(orb, 'y', alpha) + Math.sin(rotation) * 5;
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const sprite = this.sprite('orb', 12, 12, 24, () => this.drawOrb());
      if (sprite) this.drawSprite(sprite);
      else this.drawOrb();
      context.restore();
    });

    game.obstacles.forEach((obstacle) => {
      const x = this.motion.value(obstacle, 'x', alpha);
      // Skip offscreen draw calls, including their shadows; keep simulation unchanged.
      if (x + obstacle.w < -12 || x > this.width + 12) return;
      context.save();
      context.translate(x, this.motion.value(obstacle, 'y', alpha));
      const sprite = this.sprite(`hazard:${obstacle.type}:${obstacle.w}:${obstacle.h}`, obstacle.w, obstacle.h, 12, () => this.drawHazard(obstacle));
      if (sprite) this.drawSprite(sprite);
      else this.drawHazard(obstacle);
      context.restore();
    });

    game.particles.forEach((particle) => {
      context.globalAlpha = Math.min(1, Math.max(0, particle.life / 35));
      context.fillStyle = particle.color;
      context.fillRect(
        this.motion.value(particle, 'x', alpha),
        this.motion.value(particle, 'y', alpha),
        particle.size,
        particle.size,
      );
    });
    context.globalAlpha = 1;
  }

  drawOrb() {
    const context = this.context;
    context.shadowBlur = this.lowQuality ? 0 : 18;
    context.shadowColor = '#6fffe9';
    context.strokeStyle = '#6fffe9';
    context.lineWidth = 2;
    context.strokeRect(-5, -5, 10, 10);
    context.fillStyle = '#fff';
    context.fillRect(-2, -2, 4, 4);
  }

  drawHazard(obstacle) {
      const context = this.context;
      const palette = HAZARDS[obstacle.type] ?? HAZARDS.barrier;
      context.lineWidth = 3;
      context.lineJoin = 'round';
      context.shadowBlur = this.lowQuality ? 0 : 6;
      context.shadowColor = palette.edge;
      context.fillStyle = palette.fill;
      context.strokeStyle = palette.edge;
      if (obstacle.type === 'drone') {
        context.fillRect(4, 4, obstacle.w - 8, obstacle.h - 8);
        context.strokeRect(4, 4, obstacle.w - 8, obstacle.h - 8);
        context.shadowBlur = 0;
        context.fillStyle = palette.detail;
        context.fillRect(20, 10, 18, 7);
        this.line(0, 0, 12, 8, palette.edge, 3);
        this.line(obstacle.w, 0, obstacle.w - 12, 8, palette.edge, 3);
      } else if (obstacle.type === 'spire') {
        context.beginPath();
        context.moveTo(0, obstacle.h);
        context.lineTo(obstacle.w * 0.55, 0);
        context.lineTo(obstacle.w, obstacle.h);
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
        this.line(obstacle.w * 0.55, 10, obstacle.w * 0.55, obstacle.h - 8, palette.detail, 3);
      } else {
        context.fillRect(0, 0, obstacle.w, obstacle.h);
        context.strokeRect(0, 0, obstacle.w, obstacle.h);
        context.shadowBlur = 0;
        for (let stripe = 8; stripe < obstacle.h; stripe += 13) {
          this.line(5, stripe, obstacle.w - 5, stripe, palette.detail, 4);
        }
      }
  }

  render(game, alpha = 1) {
    const context = this.context;
    const blend = game.state === 'play' ? Math.max(0, Math.min(1, alpha)) : 1;
    context.save();
    if (game.shake && !(this.reducedMotionOverride ?? this.reducedMotion?.matches)) {
      context.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    this.drawCity(game, blend);
    this.drawObjects(game, blend);
    this.drawFox(game.fox, blend);
    context.restore();

    if (game.state === 'paused' && !game.ui.pauseOverlay) {
      context.fillStyle = 'rgba(5,6,17,.55)';
      context.fillRect(0, 0, this.width, this.height);
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.font = "700 42px 'Chakra Petch', sans-serif";
      context.fillText('TẠM DỪNG', this.width / 2, this.height / 2);
      context.font = "14px 'Space Mono', monospace";
      context.fillStyle = '#a5a9c8';
      context.fillText('NHẤN P HOẶC ↑ ĐỂ TIẾP TỤC', this.width / 2, this.height / 2 + 32);
    }
  }
}
