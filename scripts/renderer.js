export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    if (!this.context) throw new Error('Canvas 2D is not supported by this browser.');

    this.width = 0;
    this.height = 0;
    this.buildings = [];
  }

  get ground() {
    return this.height * 0.76;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.makeCity();
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

  drawCity(game) {
    const context = this.context;
    const { width, height, ground } = this;
    const phase = game.time * game.speed * 0.05;
    const dusk = (Math.sin(game.time * 0.001) + 1) / 2;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, `rgb(${10 + 20 * dusk},${8 + 8 * dusk},${35 + 35 * dusk})`);
    sky.addColorStop(1, '#101831');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

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

    this.buildings.forEach((building, index) => {
      const parallax = building.layer ? game.speed * 0.16 : game.speed * 0.08;
      const buildingX = ((building.x - phase * parallax) % (width + 300) + width + 300) % (width + 300) - 80;
      const base = ground + 4;
      context.fillStyle = building.layer ? '#10162d' : '#171c3b';
      context.fillRect(buildingX, base - building.h, building.w, building.h);
      context.fillStyle = building.seed > 0.5 ? 'rgba(111,255,233,.28)' : 'rgba(255,61,141,.24)';
      for (let windowY = base - building.h + 15; windowY < base - 12; windowY += 20) {
        for (let windowX = buildingX + 9; windowX < buildingX + building.w - 5; windowX += 16) {
          if (((windowX + windowY + index) | 0) % 4) context.fillRect(windowX, windowY, 3, 7);
        }
      }
    });

    context.fillStyle = '#090b18';
    context.fillRect(0, ground, width, height - ground);
    context.strokeStyle = 'rgba(111,255,233,.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, ground);
    context.lineTo(width, ground);
    context.stroke();
    for (let index = 0; index < 20; index += 1) {
      const gridX = ((index * 90 - game.time * game.speed * 1.4) % (width + 100) + width + 100) % (width + 100) - 50;
      this.line(gridX, ground + 4, gridX - 90, height, 'rgba(112,92,255,.13)', 1);
    }
  }

  drawFox(fox) {
    const context = this.context;
    context.save();
    context.translate(fox.x, fox.y + (fox.duck ? 18 : 0));
    const airborne = fox.y < this.ground - fox.h - 2;
    const bob = airborne ? 0 : Math.sin(fox.frame) * 2;
    const leg = airborne ? 0 : Math.sin(fox.frame) * 11;
    context.translate(0, bob);
    context.shadowBlur = 14;
    context.shadowColor = '#ff3d8d';

    if (fox.duck) {
      context.rotate(0.16);
      context.fillStyle = '#ff3d8d';
      context.fillRect(10, 18, 38, 22);
      context.beginPath();
      context.moveTo(42, 18);
      context.lineTo(52, 2);
      context.lineTo(55, 22);
      context.fill();
      context.fillStyle = '#6fffe9';
      context.fillRect(40, 23, 8, 4);
      this.line(10, 33, -12, 24, '#ff3d8d', 7);
    } else {
      this.line(18, 41, 13 + leg, 54, '#705cff', 8);
      this.line(36, 41, 41 - leg, 54, '#705cff', 8);
      context.fillStyle = '#ff3d8d';
      context.fillRect(10, 15, 37, 30);
      context.fillStyle = '#d92d78';
      context.fillRect(15, 22, 8, 18);
      context.beginPath();
      context.moveTo(38, 16);
      context.lineTo(41, -2);
      context.lineTo(50, 18);
      context.moveTo(19, 16);
      context.lineTo(14, 1);
      context.lineTo(9, 22);
      context.fill();
      context.fillStyle = '#6fffe9';
      context.fillRect(37, 23, 9, 4);
      context.fillStyle = '#080b18';
      context.fillRect(40, 23, 3, 4);
      this.line(11, 34, -11, 27 + Math.sin(fox.frame * 0.6) * 6, '#ff3d8d', 7);
    }

    context.shadowBlur = 0;
    context.restore();
  }

  drawObjects(game) {
    const context = this.context;
    game.orbs.forEach((orb) => {
      const y = orb.y + Math.sin(orb.t) * 5;
      context.save();
      context.translate(orb.x, y);
      context.rotate(orb.t);
      context.shadowBlur = 18;
      context.shadowColor = '#6fffe9';
      context.strokeStyle = '#6fffe9';
      context.lineWidth = 2;
      context.strokeRect(-5, -5, 10, 10);
      context.fillStyle = '#fff';
      context.fillRect(-2, -2, 4, 4);
      context.restore();
    });

    game.obstacles.forEach((obstacle) => {
      context.save();
      context.translate(obstacle.x, obstacle.y);
      if (obstacle.type === 'drone') {
        context.shadowBlur = 18;
        context.shadowColor = '#ff3d8d';
        context.fillStyle = '#1a1937';
        context.fillRect(4, 4, obstacle.w - 8, obstacle.h - 8);
        context.strokeStyle = '#ff3d8d';
        context.strokeRect(4, 4, obstacle.w - 8, obstacle.h - 8);
        context.fillStyle = '#ff3d8d';
        context.fillRect(22, 11, 14, 5);
        this.line(0, 0, 12, 8, '#6fffe9', 2);
        this.line(obstacle.w, 0, obstacle.w - 12, 8, '#6fffe9', 2);
      } else if (obstacle.type === 'spire') {
        context.fillStyle = '#291942';
        context.beginPath();
        context.moveTo(0, obstacle.h);
        context.lineTo(obstacle.w * 0.55, 0);
        context.lineTo(obstacle.w, obstacle.h);
        context.fill();
        context.strokeStyle = '#ff3d8d';
        context.stroke();
        this.line(obstacle.w * 0.55, 10, obstacle.w * 0.55, obstacle.h - 8, 'rgba(255,61,141,.5)', 2);
      } else {
        context.fillStyle = '#191b3c';
        context.fillRect(0, 0, obstacle.w, obstacle.h);
        context.strokeStyle = '#705cff';
        context.lineWidth = 2;
        context.strokeRect(0, 0, obstacle.w, obstacle.h);
        for (let stripe = 8; stripe < obstacle.h; stripe += 13) {
          this.line(5, stripe, obstacle.w - 5, stripe, 'rgba(111,255,233,.5)', 2);
        }
      }
      context.restore();
    });

    game.particles.forEach((particle) => {
      context.globalAlpha = Math.max(0, particle.life / 35);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
      context.globalAlpha = 1;
    });
  }

  render(game) {
    const context = this.context;
    context.save();
    if (game.shake) {
      context.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
      game.shake *= 0.88;
    }
    this.drawCity(game);
    this.drawObjects(game);
    this.drawFox(game.fox);
    context.restore();

    if (game.state === 'paused') {
      context.fillStyle = 'rgba(5,6,17,.55)';
      context.fillRect(0, 0, this.width, this.height);
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.font = "700 42px 'Chakra Petch'";
      context.fillText('TẠM DỪNG', this.width / 2, this.height / 2);
      context.font = "14px 'Space Mono'";
      context.fillStyle = '#a5a9c8';
      context.fillText('NHẤN P ĐỂ TIẾP TỤC', this.width / 2, this.height / 2 + 32);
    }
  }
}
