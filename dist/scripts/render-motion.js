// Presentation snapshots only: interpolation never changes collision/score state.
export class RenderMotion {
  constructor() {
    this.reset();
  }

  reset() {
    this.objects = new WeakMap();
    this.time = null;
    this.distance = null;
  }

  capture(game) {
    this.time = game.time;
    this.distance = game.distance;
    this.captureObject(game.fox);
    for (const object of game.obstacles) this.captureObject(object);
    for (const object of game.orbs) this.captureObject(object);
    for (const object of game.particles) this.captureObject(object);
  }

  captureObject(object) {
    let previous = this.objects.get(object);
    if (!previous) {
      previous = {};
      this.objects.set(object, previous);
    }
    previous.x = object.x;
    previous.y = object.y;
    previous.frame = object.frame;
    previous.t = object.t;
  }

  value(object, property, alpha) {
    return interpolate(this.objects.get(object)?.[property], object[property], alpha);
  }
}

export function interpolate(previous, current, alpha) {
  return previous == null ? current : previous + (current - previous) * alpha;
}

export function wrapPosition(position, period) {
  return ((position % period) + period) % period;
}
