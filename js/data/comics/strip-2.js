// Chapter 2 strip "Sir Zitsalot" (T4.3a): breakfast in a visor. 10 panels.
// Beginning: he eats breakfast in a knight's helmet; she spots a bump and finds a loophole ("not in the HOUSE...
// this is the KITCHEN"). Middle: CLANK, visor down; crowbar-sized tweezers; prying; a chink in the armor; so close.
// End: the armor wins (splash: shield, plume, the chink bolted shut, "No."). Button: the toaster pops, she is in
// bliss, he plans a moat. Running gags: his "No." and the armor getting fancier (a plume, then a shield).
// Visual surprise: the giant tweezers. He loves her; he just hates the mess. Format: docs/COMIC-FORMAT.md.

/** The kitchen filling a panel. @param {number} w panel width @param {number} h panel height @param {object} [o] room options @returns {object} layer */
const kitchen = (w, h, o = {}) => ({ art: 'room', kind: 'kitchen', w, h, ...o });

/** Steel colour of the armor and the tweezers. */
const STEEL = '#d7dee7';

/**
 * A kitchen table seen from the front: a tablecloth with a scalloped edge and two wooden legs down to the bottom.
 * Put it after the people sitting at it, so it covers their laps.
 * @param {number} x0 left edge @param {number} x1 right edge @param {number} top height of the table top
 * @param {number} bottom where the legs end (the panel bottom) @returns {object[]} shape layers
 */
function table(x0, x1, top, bottom) {
  const w = x1 - x0;
  const out = [];
  for (const lx of [x0 + 40, x1 - 70]) out.push({ shape: 'rect', x: lx, y: top + 100, w: 30, h: bottom - top, fill: '#b07a4a', stroke: true, sw: 5 });
  out.push({ shape: 'rect', x: x0, y: top, w, h: 110, fill: '#9fd3e8', stroke: true, sw: 6 });
  for (let x = x0 + 30; x < x1 - 10; x += 60) out.push({ shape: 'rect', x, y: top + 4, w: 30, h: 102, fill: '#ffffff', opacity: 0.45 });
  out.push({ shape: 'rect', x: x0 - 10, y: top - 14, w: w + 20, h: 26, rx: 10, fill: '#fff8ee', stroke: true, sw: 5 });
  return out;
}

/**
 * A red retro toaster standing on a table, optionally with two slices of toast popping up.
 * @param {number} x middle @param {number} y table top @param {number} k size @param {boolean} [popped] toast up
 * @returns {object[]} shape layers
 */
function toaster(x, y, k, popped = false) {
  const out = [];
  const lift = popped ? 95 * k : 20 * k;
  for (const dx of [-30, 30]) {
    out.push({ shape: 'rect', x: x + (dx - 19) * k, y: y - 104 * k - lift, w: 38 * k, h: 100 * k, rx: 12 * k, fill: '#c98a3e', stroke: true, sw: 5 });
    out.push({ shape: 'rect', x: x + (dx - 12) * k, y: y - 97 * k - lift, w: 24 * k, h: 80 * k, rx: 8 * k, fill: '#f3cf8a' });
  }
  out.push({ shape: 'rect', x: x - 85 * k, y: y - 112 * k, w: 170 * k, h: 112 * k, rx: 30 * k, fill: '#e8505b', stroke: true, sw: 6 });
  out.push({ shape: 'path', d: `M${x - 64 * k} ${y - 90 * k} L${x - 64 * k} ${y - 30 * k}`, stroke: '#ffffff', sw: 8 * k, opacity: 0.6 });
  for (const dx of [-30, 30]) out.push({ shape: 'rect', x: x + (dx - 22) * k, y: y - 116 * k, w: 44 * k, h: 10 * k, rx: 5 * k, fill: '#2a211d' });
  out.push({ shape: 'rect', x: x + 82 * k, y: y - (popped ? 92 : 46) * k, w: 22 * k, h: 14 * k, rx: 5 * k, fill: '#3a3f4a', stroke: true, sw: 4 });
  if (popped) out.push({ shape: 'path', d: `M${x - 70 * k} ${y - 230 * k} l-20 -40 M${x} ${y - 250 * k} l0 -46 M${x + 70 * k} ${y - 230 * k} l20 -40`, stroke: true, sw: 6 });
  return out;
}

/** Breakfast on the table: a plate with toast and a steaming mug. @param {number} x plate middle @param {number} y table top @returns {object[]} shape layers */
const breakfast = (x, y) => [
  { shape: 'ellipse', x, y: y - 6, rx: 90, ry: 22, fill: '#ffffff', stroke: true, sw: 5 },
  { shape: 'rect', x: x - 46, y: y - 30, w: 92, h: 24, rx: 8, fill: '#e8b56a', stroke: true, sw: 4 },
  { shape: 'rect', x: x - 230, y: y - 86, w: 64, h: 78, rx: 12, fill: '#6a7be6', stroke: true, sw: 5 },
  { shape: 'path', d: `M${x - 230} ${y - 70} q-34 4 -30 26 q4 20 30 18`, fill: 'none', stroke: true, sw: 6 },
  { shape: 'path', d: `M${x - 210} ${y - 100} q-12 -24 0 -46 M${x - 186} ${y - 100} q12 -24 0 -46`, stroke: '#ffffff', sw: 6, opacity: 0.8 },
];

/**
 * Giant steel tweezers lying at an angle (joined end at x, y; tips point up, turned by rot degrees).
 * @param {number} x joined end @param {number} y joined end @param {number} rot degrees clockwise from straight up
 * @param {number} k size (1 = 160 units long) @returns {object[]} shape layers
 */
const bigTweezers = (x, y, rot, k) => [
  ...[-1, 1].map((s) => ({ shape: 'path', x, y, rotate: rot, fill: STEEL, stroke: true, sw: 5,
    d: `M${x + s * 4 * k} ${y} L${x + s * 24 * k} ${y - 156 * k} L${x + s * 10 * k} ${y - 160 * k} L${x - s * 2 * k} ${y - 4 * k}Z` })),
  { shape: 'circle', x, y, r: 9 * k, fill: '#8a96a6', stroke: true, sw: 4 },
];

/**
 * The chink in the armor: a little gap near his jaw where one pink bump peeks out (cartoon, clean).
 * @param {number} x middle @param {number} y middle @param {number} k size @returns {object[]} shape layers
 */
const chink = (x, y, k) => [
  { shape: 'ellipse', x, y, rx: 46 * k, ry: 22 * k, rotate: -14, fill: '#2b2f3a', stroke: true, sw: 5 },
  { shape: 'ellipse', x, y, rx: 36 * k, ry: 14 * k, rotate: -14, fill: '#d29a6c' },
  { shape: 'circle', x, y, r: 10 * k, fill: '#ff8fa8', stroke: true, sw: 3 },
  { shape: 'circle', x: x - 3 * k, y: y - 4 * k, r: 3 * k, fill: '#ffffff' },
];

/**
 * A bolted steel patch over the chink (the armor wins): a little plate with four rivets.
 * @param {number} x middle @param {number} y middle @param {number} k size @returns {object[]} shape layers
 */
const patch = (x, y, k) => [
  { shape: 'rect', x: x - 50 * k, y: y - 30 * k, w: 100 * k, h: 60 * k, rx: 10 * k, fill: STEEL, stroke: true, sw: 5, rotate: -14 },
  ...[[-36, -18], [36, -18], [-36, 18], [36, 18]].map(([dx, dy]) => ({ shape: 'circle', x: x + dx * k, y: y + dy * k, r: 6 * k, fill: '#8a96a6' })),
];

/**
 * His new shield (the armor gets fancier): red, with a pimple in a no-sign as the coat of arms.
 * @param {number} x middle @param {number} y top @param {number} k size @returns {object[]} shape layers
 */
const shield = (x, y, k) => [
  { shape: 'path', d: `M${x - 110 * k} ${y} L${x + 110 * k} ${y} L${x + 110 * k} ${y + 120 * k} Q${x + 110 * k} ${y + 240 * k} ${x} ${y + 300 * k} Q${x - 110 * k} ${y + 240 * k} ${x - 110 * k} ${y + 120 * k}Z`, fill: '#e8505b', stroke: true, sw: 7 },
  { shape: 'path', d: `M${x - 86 * k} ${y + 22 * k} L${x + 86 * k} ${y + 22 * k} L${x + 86 * k} ${y + 120 * k} Q${x + 86 * k} ${y + 220 * k} ${x} ${y + 270 * k} Q${x - 86 * k} ${y + 220 * k} ${x - 86 * k} ${y + 120 * k}Z`, fill: 'none', stroke: '#ffd25a', sw: 6 },
  { shape: 'circle', x, y: y + 125 * k, r: 54 * k, fill: '#ffffff', stroke: true, sw: 5 },
  { shape: 'circle', x, y: y + 125 * k, r: 20 * k, fill: '#ff8fa8', stroke: true, sw: 3 },
  { shape: 'circle', x, y: y + 125 * k, r: 46 * k, fill: 'none', stroke: '#c9302c', sw: 9 },
  { shape: 'path', d: `M${x - 32 * k} ${y + 93 * k} L${x + 32 * k} ${y + 157 * k}`, stroke: '#c9302c', sw: 9 },
];

/**
 * Her forearm coming up from the bottom of a close-up panel to her fist round the giant tweezers' joined end
 * (R8 Q16: the handle had no hand on it). Put it after the tweezers so the fist grips them.
 * @param {number} x0 elbow x (below the panel edge) @param {number} y0 elbow y @param {number} x fist x
 * @param {number} y fist y @returns {object[]} shape layers
 */
const tweezerHand = (x0, y0, x, y) => [
  { shape: 'path', d: `M${x0} ${y0} L${x} ${y}`, stroke: true, sw: 46 },
  { shape: 'path', d: `M${x0} ${y0} L${x} ${y}`, stroke: '#e66a8f', sw: 34 },
  { shape: 'ellipse', x, y, rx: 26, ry: 24, fill: '#ebb795', stroke: true, sw: 5 },
  { shape: 'path', d: `M${x - 12} ${y - 2} l0 14 M${x} ${y} l0 14 M${x + 12} ${y - 2} l0 14`, stroke: true, sw: 4, opacity: 0.6 },
];

export const STRIP = {
  id: 'strip2',
  title: 'comic.s2.title',
  panels: [
    {
      // 1. Next morning, breakfast. He eats in a knight's helmet, visor up. She notices.
      layout: 'wide',
      scene: {
        layers: [
          kitchen(1600, 900, { floorY: 600, windowX: 0.45, plantX: 0.05 }),
          { id: 'him', art: 'husband', x: 1120, y: 860, pose: 'sit', outfit: 'armor', visor: 'up', expr: 'neutral', look: -1 },
          ...table(760, 1580, 640, 900),
          ...breakfast(1000, 640),
          ...toaster(1430, 640, 0.9),
          { id: 'her', art: 'heroine', x: 440, y: 880, pose: 'wave', expr: 'happy', look: 1 },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s2.p1.cap', at: [240, 50], w: 440 },
        { kind: 'say', key: 'comic.s2.p1.her', at: [720, 220], to: 'her', w: 340 },
        { kind: 'say', key: 'comic.s2.p1.him', at: [1420, 130], to: 'him', w: 300 },
      ],
    },
    {
      // 2. Close-up: under the brim of the helmet, one tiny pink bump on his cheek.
      layout: 'small',
      scene: {
        layers: [
          kitchen(800, 600, { floorY: 520, windowX: 0.8, plant: false }),
          { id: 'him', art: 'husband', x: 420, y: 660, scale: 1.2, pose: 'bust', outfit: 'armor', visor: 'up', expr: 'neutral', look: -1 },
          // low on his jaw, where the chink and the round's gap are (R8 Q16: at the eye corner it read as a stye)
          { shape: 'circle', x: 322, y: 455, r: 11, fill: '#ff8fa8', stroke: true, sw: 3 },
          { art: 'sparkles', x: 318, y: 458, r: 50 },
        ],
      },
      camera: { move: 'pushIn', focus: [330, 440], amount: 0.12, ms: 2500 },
      bubbles: [{ kind: 'caption', key: 'comic.s2.p2.cap', at: [400, 40], w: 600 }],
    },
    {
      // 3. She finds a loophole in the rules.
      layout: 'small',
      scene: { layers: [{ art: 'rays', w: 800, h: 600, x: 230, y: 330, colors: ['#ffd8e6', '#ffbcd2'] },
        { id: 'her', art: 'heroine', x: 230, y: 650, scale: 1.15, pose: 'bust', expr: 'scheming', look: 1 }] },
      camera: { move: 'pushIn', focus: [230, 330], amount: 0.1, ms: 2000 },
      bubbles: [
        { kind: 'say', key: 'comic.s2.p3.her', at: [570, 110], to: 'her', w: 330 },
        { kind: 'say', key: 'comic.s2.p3.her2', at: [580, 330], to: 'her', w: 300, sound: 'laugh_evil' },
      ],
    },
    {
      // 4. CLANK: the visor comes down before she has even moved.
      layout: 'square',
      scene: {
        layers: [
          kitchen(1000, 1000, { floorY: 640, windowX: 0.2, plant: false }),
          { art: 'burst', x: 560, y: 420, r: 300, color: '#ffe27a' },
          { id: 'him', art: 'husband', x: 560, y: 1000, scale: 1.25, pose: 'sit', outfit: 'armor', visor: 'down', expr: 'grumpy' },
          { shape: 'path', d: 'M380 260 l-50 -30 M370 330 l-60 0 M740 260 l50 -30 M750 330 l60 0', stroke: true, sw: 8 },
          ...table(120, 1010, 760, 1000),
          ...breakfast(420, 760),
        ],
      },
      camera: { move: 'shake' },
      sound: 'creak',
      bubbles: [
        { kind: 'shout', key: 'comic.s2.p4.clank', at: [210, 150], w: 300 },
        { kind: 'say', key: 'comic.s2.p4.him', at: [850, 170], to: 'him', w: 200 },
        { kind: 'whisper', key: 'comic.s2.p4.her', at: [250, 900], w: 420 },
      ],
    },
    {
      // 5. Visual surprise: crowbar-sized tweezers.
      layout: 'square',
      scene: {
        layers: [
          kitchen(1000, 1000, { floorY: 640, windowX: 0.75, plant: false }),
          { id: 'him', art: 'husband', x: 790, y: 1000, scale: 0.85, pose: 'sit', outfit: 'armor', visor: 'down', expr: 'shocked', look: -1 },
          ...table(580, 1010, 810, 1000),
          { id: 'her', art: 'heroine', x: 270, y: 1040, scale: 0.8, pose: 'wave', expr: 'proud', hold: 'tweezers', holdScale: 4.5 },
          { art: 'sparkles', x: 440, y: 90, r: 90 },
        ],
      },
      camera: { move: 'panUp', focus: [480, 400], amount: 0.12, ms: 2500 },
      sound: 'tweeze',
      bubbles: [
        { kind: 'say', key: 'comic.s2.p5.her', at: [200, 110], to: 'her', w: 380 },
        { kind: 'shout', key: 'comic.s2.p5.him', at: [760, 330], to: 'him', w: 420 },
      ],
    },
    {
      // 6. She pries at the visor. CREAK. Running gag: "No."
      layout: 'small',
      scene: {
        layers: [
          kitchen(800, 600, { floorY: 520, windowX: 0.5, plant: false }),
          { id: 'him', art: 'husband', x: 560, y: 660, scale: 1.15, pose: 'bust', outfit: 'armor', visor: 'down', expr: 'grumpy', flip: true },
          { id: 'her', art: 'heroine', x: 150, y: 690, scale: 1.0, pose: 'bust', expr: 'happy', look: 1 },
          ...bigTweezers(262, 572, 50, 1.8),
          ...tweezerHand(226, 660, 262, 572),
        ],
      },
      camera: { move: 'shake' },
      sound: 'creak',
      bubbles: [
        { kind: 'shout', key: 'comic.s2.p6.creak', at: [300, 80], w: 260 },
        { kind: 'say', key: 'comic.s2.p6.him', at: [730, 110], to: 'him', w: 130 },
      ],
    },
    {
      // 7. But wait: a chink in the armor, down by his jaw. One pink bump peeks out.
      layout: 'small',
      scene: {
        layers: [
          { art: 'rays', w: 800, h: 600, x: 300, y: 530, colors: ['#fff4d6', '#ffe9a8'] },
          { id: 'him', art: 'husband', x: 420, y: 700, scale: 1.4, pose: 'bust', outfit: 'armor', visor: 'down', expr: 'neutral', flip: true },
          ...chink(300, 530, 1.2),
          { art: 'sparkles', x: 300, y: 520, r: 90 },
        ],
      },
      camera: { move: 'pushIn', focus: [300, 520], amount: 0.16, ms: 1500 },
      sound: 'ooh_happy',
      bubbles: [{ kind: 'whisper', key: 'comic.s2.p7.her', at: [600, 80], w: 340 }],
    },
    {
      // 8. So close... the tweezer tips one hair away from the bump.
      layout: 'small',
      scene: {
        layers: [
          kitchen(800, 600, { floorY: 520, windowX: 0.85, plant: false }),
          { id: 'him', art: 'husband', x: 560, y: 680, scale: 1.1, pose: 'bust', outfit: 'armor', visor: 'down', expr: 'shocked', flip: true },
          ...chink(452, 547, 0.9),
          { id: 'her', art: 'heroine', x: 170, y: 700, scale: 1.05, pose: 'bust', expr: 'bliss', look: 1 },
          ...bigTweezers(240, 572, 83, 1.25),
          ...tweezerHand(200, 660, 240, 572),
        ],
      },
      camera: { move: 'pushIn', focus: [440, 540], amount: 0.12, ms: 3000 },
      sound: 'tweeze',
      bubbles: [
        { kind: 'caption', key: 'comic.s2.p8.cap', at: [600, 40], w: 300 },
        { kind: 'whisper', key: 'comic.s2.p8.her', at: [220, 150], to: 'her', w: 300 },
      ],
    },
    {
      // 9. The armor wins: CLANK, the chink bolted shut, a new plume and a shield. "No."
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 520, y: 420, colors: ['#d6e6ff', '#b8d2ff'] },
          { art: 'burst', x: 220, y: 230, r: 170, color: '#ffe27a' },
          { id: 'him', art: 'husband', x: 540, y: 1000, scale: 1.15, pose: 'hips', outfit: 'armor', visor: 'down', expr: 'proud', plumes: 1 },
          ...patch(430, 560, 1),
          { art: 'sparkles', x: 430, y: 560, r: 70, color: '#ffffff' },
          // the shield stands on the floor against his leg, his hand resting on its rim (R8 Q16: it floated)
          ...shield(425, 760, 0.8),
          { id: 'her', art: 'heroine', x: 870, y: 1000, scale: 0.6, pose: 'stand', expr: 'sad', look: -1, hold: 'tweezers', holdScale: 2 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'creak',
      bubbles: [
        { kind: 'caption', key: 'comic.s2.p9.cap', at: [500, 50], w: 860 },
        { kind: 'shout', key: 'comic.s2.p9.clank', at: [200, 260], w: 340 },
        { kind: 'say', key: 'comic.s2.p9.him', at: [800, 260], to: 'him', w: 150 },
      ],
    },
    {
      // 10. Button: the toaster pops. She is in bliss. He plans a moat (but still kisses her goodbye).
      layout: 'wide',
      scene: {
        layers: [
          kitchen(1600, 900, { floorY: 600, windowX: 0.5, plant: false }),
          ...shield(1460, 560, 0.6), // his new shield leaning by his chair, behind the table
          { id: 'him', art: 'husband', x: 1220, y: 960, pose: 'sit', outfit: 'armor', visor: 'down', expr: 'grumpy', plumes: 1, flip: true },
          { id: 'her', art: 'heroine', x: 380, y: 960, pose: 'pop', expr: 'bliss', look: 1 },
          ...table(-20, 1620, 700, 900),
          { art: 'burst', x: 800, y: 430, r: 150, color: '#ffe27a' },
          ...toaster(800, 700, 1.3, true),
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.1, ms: 2500 },
      sound: 'pop_small',
      bubbles: [
        { kind: 'shout', key: 'comic.s2.p10.pop', at: [800, 110], w: 200 },
        { kind: 'say', key: 'comic.s2.p10.her', at: [330, 150], to: 'her', w: 360, sound: 'ooh_happy' },
        { kind: 'say', key: 'comic.s2.p10.him', at: [1300, 170], to: 'him', w: 360 },
        { kind: 'caption', key: 'comic.s2.p10.end', at: [800, 850], w: 1100 },
      ],
    },
  ],
};
