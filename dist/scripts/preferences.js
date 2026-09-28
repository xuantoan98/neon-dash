import { SCENES, SKINS } from './content.js';

export const PREFERENCES_KEY = 'neonDashPreferencesV1';
export const DEFAULT_PREFERENCES = Object.freeze({
  sound: true,
  volume: 0.25,
  motion: 'system',
  quality: 'high',
  tutorialSeen: false,
  skin: 'kitsune',
  scene: 'neo',
});

export function sanitizePreferences(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return {
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_PREFERENCES.sound,
    volume: Number.isFinite(value.volume)
      ? Math.max(0, Math.min(1, value.volume))
      : DEFAULT_PREFERENCES.volume,
    motion: ['system', 'on', 'off'].includes(value.motion)
      ? value.motion
      : DEFAULT_PREFERENCES.motion,
    quality: ['high', 'low'].includes(value.quality) ? value.quality : DEFAULT_PREFERENCES.quality,
    tutorialSeen: value.tutorialSeen === true,
    skin: Object.hasOwn(SKINS, value.skin) ? value.skin : DEFAULT_PREFERENCES.skin,
    scene: Object.hasOwn(SCENES, value.scene) ? value.scene : DEFAULT_PREFERENCES.scene,
  };
}

export class Preferences {
  constructor() {
    try {
      this.value = sanitizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY)));
    } catch {
      this.value = { ...DEFAULT_PREFERENCES };
    }
    this.listeners = new Set();
  }

  update(patch) {
    this.value = sanitizePreferences({ ...this.value, ...patch });
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.value));
    } catch {
      /* Session preferences still work. */
    }
    for (const listener of this.listeners) listener(this.value);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }
}

export function prefersReducedMotion(preferences, system = false) {
  return preferences.motion === 'on' || (preferences.motion === 'system' && system);
}
