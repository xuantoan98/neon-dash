export const SKINS = Object.freeze({
  kitsune: Object.freeze({
    name: 'Kitsune hồng',
    body: '#ff3d8d',
    shade: '#d92d78',
    legs: '#705cff',
    eye: '#6fffe9',
  }),
  arctic: Object.freeze({
    name: 'Cáo băng',
    body: '#a3e7ff',
    shade: '#5a9fd4',
    legs: '#5ce1ce',
    eye: '#ffffff',
  }),
  solar: Object.freeze({
    name: 'Cáo mặt trời',
    body: '#ffc857',
    shade: '#dc7b36',
    legs: '#f46a73',
    eye: '#fff2c6',
  }),
});

export const SCENES = Object.freeze({
  neo: Object.freeze({
    name: 'Neo-Sài Gòn',
    sky: null,
    horizon: '#233454',
    back: '#273556',
    front: '#1b2746',
    ground: '#131e33',
  }),
  dawn: Object.freeze({
    name: 'Bình minh',
    sky: '#381934',
    horizon: '#533a45',
    back: '#49324f',
    front: '#362941',
    ground: '#261e30',
  }),
  arctic: Object.freeze({
    name: 'Cực quang',
    sky: '#10333f',
    horizon: '#244b60',
    back: '#254555',
    front: '#1b3644',
    ground: '#122c38',
  }),
});

// Solid fills and bright edges remain readable without glow or color perception alone.
export const HAZARDS = Object.freeze({
  barrier: Object.freeze({ fill: '#ffc857', edge: '#fff4ce', detail: '#493314' }),
  spire: Object.freeze({ fill: '#ff7894', edge: '#fff0f4', detail: '#651f43' }),
  drone: Object.freeze({ fill: '#99c9ff', edge: '#f0f8ff', detail: '#203f70' }),
});

export function evaluateChallenges(stats, score) {
  return [
    { id: 'score', label: '500 điểm', current: Math.min(500, Math.floor(score)), target: 500 },
    { id: 'orbs', label: '5 lõi', current: Math.min(5, stats?.orbs || 0), target: 5 },
    { id: 'obstacles', label: '8 vật cản', current: Math.min(8, stats?.obstacles || 0), target: 8 },
  ].map((goal) => ({ ...goal, complete: goal.current >= goal.target }));
}
