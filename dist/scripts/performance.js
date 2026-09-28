/** Bounded measurements; no growing history during long sessions. */
export class PerformanceMeter {
  constructor(capacity = 300) {
    this.samples = new Float32Array(capacity);
    this.count = 0;
    this.cursor = 0;
  }

  measure(render) {
    const start = performance.now();
    render();
    this.samples[this.cursor] = performance.now() - start;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.samples.length, this.count + 1);
  }

  summary() {
    const sorted = [...this.samples.slice(0, this.count)].sort((a, b) => a - b);
    return {
      samples: this.count,
      renderP95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0,
    };
  }
}
