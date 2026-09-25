export function createFox() {
  return { x: 0, y: 0, vy: 0, w: 48, h: 54, jumps: 0, duck: false, frame: 0 };
}

export function createObstacle(width, ground) {
  const roll = Math.random();
  const type = roll < 0.38 ? 'barrier' : roll < 0.7 ? 'drone' : 'spire';
  const obstacleWidth = type === 'drone' ? 58 : type === 'spire' ? 35 : 42;
  const height = type === 'drone' ? 28 : type === 'spire' ? 72 : 48;
  const y = type === 'drone' ? ground - 72 : ground - height;

  return {
    x: width + 40,
    y,
    w: obstacleWidth,
    h: height,
    type,
    passed: false,
    phase: Math.random() * 6,
  };
}

export function createOrbsFor(obstacle, ground, width) {
  if (Math.random() >= 0.72) return [];

  const y = obstacle.type === 'drone' ? ground - 28 : ground - 105;
  const count = 2 + (Math.random() * 3 | 0);
  return Array.from({ length: count }, (_, index) => ({
    x: width + 70 + index * 34,
    y: y - Math.sin(index) * 18,
    r: 6,
    t: Math.random() * 6,
  }));
}

export function isColliding(fox, obstacle) {
  const padding = 8;
  const foxHeight = fox.duck ? 28 : fox.h;
  const foxY = fox.duck ? fox.y + fox.h - foxHeight : fox.y;

  return fox.x + padding < obstacle.x + obstacle.w - padding
    && fox.x + fox.w - padding > obstacle.x + padding
    && foxY + padding < obstacle.y + obstacle.h - padding
    && foxY + foxHeight - padding > obstacle.y + padding;
}
