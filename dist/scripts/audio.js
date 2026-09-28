const NOTES = {
  start: [330, 660, 0.15],
  jump: [420, 840, 0.09],
  orb: [880, 1320, 0.1],
  pass: [260, 390, 0.07],
  over: [180, 45, 0.3],
};

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.volume = 0.25;
    this.context = null;
    this.voices = new Set();
    this.disposed = false;
  }

  configure({ sound, volume }) {
    this.enabled = sound;
    this.volume = volume;
    if (!sound) this.stop();
  }

  unlock() {
    if (!this.enabled || this.disposed) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Sound is optional; input must still work. */
    }
  }

  play(name) {
    const note = NOTES[name];
    if (
      !note ||
      !this.enabled ||
      this.volume === 0 ||
      this.context?.state !== 'running' ||
      this.voices.size >= 8
    )
      return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = name === 'over' ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(note[0], now);
    oscillator.frequency.exponentialRampToValueAtTime(note[1], now + note[2]);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.22, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note[2]);
    oscillator.connect(gain).connect(context.destination);
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(now);
    oscillator.stop(now + note[2] + 0.02);
  }

  stop() {
    for (const voice of this.voices) {
      voice.oscillator.onended = null;
      try {
        voice.oscillator.stop();
      } catch {
        /* Already ended. */
      }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }

  suspend() {
    this.stop();
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  dispose() {
    this.disposed = true;
    this.stop();
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}
