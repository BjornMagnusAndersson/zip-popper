// Milestone strip "Tool mastery" (T4.3c): played when the player becomes fast (mastery) on a bump type. 4 panels.
// A training montage. Nils times her with a big stopwatch, Greta knits in time ("click, click"). The big moment: her
// hands are a blur of speed lines and extra hands, "Two seconds flat!", and the plant nods along in a red sweatband
// (the visual surprise). Button: Nils stops the watch for a record, but she finished ages ago and is on her second
// tea; the worn-out plant asks for a day off. Running gag: the plant, silent, eyes on its pot. Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, ...o });

/**
 * Nils's big stopwatch: a silver case, a white face with ticks, a button on top and one hand.
 * @param {number} x middle @param {number} y middle @param {number} r radius @param {number} [a] hand angle in degrees (0 = up)
 * @returns {object[]} shape layers
 */
function stopwatch(x, y, r, a = 40) {
  const rad = (a * Math.PI) / 180;
  const ticks = [];
  for (let i = 0; i < 12; i += 1) {
    const t = (i * Math.PI) / 6;
    ticks.push(`M${x + Math.sin(t) * r * 0.72} ${y - Math.cos(t) * r * 0.72} L${x + Math.sin(t) * r * 0.84} ${y - Math.cos(t) * r * 0.84}`);
  }
  return [
    { shape: 'rect', x: x - r * 0.16, y: y - r * 1.3, w: r * 0.32, h: r * 0.26, rx: 4, fill: '#c9ced6', stroke: true, sw: 4 },
    { shape: 'rect', x: x - r * 0.08, y: y - r * 1.12, w: r * 0.16, h: r * 0.16, fill: '#9aa0aa', stroke: true, sw: 3 },
    { shape: 'circle', x, y, r, fill: '#c9ced6', stroke: true, sw: 6 },
    { shape: 'circle', x, y, r: r * 0.86, fill: '#ffffff', stroke: true, sw: 3 },
    { shape: 'path', d: ticks.join(' '), fill: 'none', stroke: true, sw: 3 },
    { shape: 'path', d: `M${x} ${y} L${x + Math.sin(rad) * r * 0.7} ${y - Math.cos(rad) * r * 0.7}`, fill: 'none', stroke: '#e8505b', sw: 6 },
    { shape: 'circle', x, y, r: r * 0.08, fill: '#2a2a2a' },
  ];
}

/**
 * Greta's knitting: two crossed needles with a striped knitted piece hanging below and a ball of yarn.
 * @param {number} x middle @param {number} y where the needles cross @param {number} k size @returns {object[]} shape layers
 */
function knitting(x, y, k) {
  return [
    { shape: 'path', d: `M${x - 30 * k} ${y + 8 * k} L${x - 34 * k} ${y + 90 * k} Q${x} ${y + 104 * k} ${x + 34 * k} ${y + 90 * k} L${x + 30 * k} ${y + 8 * k}Z`, fill: '#e8505b', stroke: true, sw: 4 },
    { shape: 'path', d: `M${x - 32 * k} ${y + 40 * k} L${x + 32 * k} ${y + 40 * k} M${x - 33 * k} ${y + 66 * k} L${x + 33 * k} ${y + 66 * k}`, fill: 'none', stroke: '#ffffff', sw: 6 * k, opacity: 0.8 },
    { shape: 'path', d: `M${x - 90 * k} ${y - 70 * k} L${x + 70 * k} ${y + 40 * k} M${x + 90 * k} ${y - 70 * k} L${x - 70 * k} ${y + 40 * k}`, fill: 'none', stroke: '#8e5bd0', sw: 8 * k },
    { shape: 'circle', x: x - 92 * k, y: y - 72 * k, r: 9 * k, fill: '#ffd166', stroke: true, sw: 3 },
    { shape: 'circle', x: x + 92 * k, y: y - 72 * k, r: 9 * k, fill: '#ffd166', stroke: true, sw: 3 },
    { shape: 'circle', x: x + 120 * k, y: y + 80 * k, r: 34 * k, fill: '#e8505b', stroke: true, sw: 4 },
    { shape: 'path', d: `M${x + 96 * k} ${y + 70 * k} Q${x + 120 * k} ${y + 60 * k} ${x + 146 * k} ${y + 84 * k} M${x + 92 * k} ${y + 88 * k} Q${x + 120 * k} ${y + 76 * k} ${x + 150 * k} ${y + 100 * k}`, fill: 'none', stroke: '#ffffff', sw: 3, opacity: 0.7 },
  ];
}

/**
 * Short motion strokes in a fan around a point (speed, clicking, nodding).
 * @param {number} x middle @param {number} y middle @param {number} r how far out they start @param {number} from first angle (degrees, 0 = up)
 * @param {number} to last angle @param {number} n how many @param {number} [len] stroke length @returns {object} shape layer
 */
function zips(x, y, r, from, to, n, len = 40) {
  const d = [];
  for (let i = 0; i < n; i += 1) {
    const t = ((from + ((to - from) * i) / Math.max(1, n - 1)) * Math.PI) / 180;
    d.push(`M${x + Math.sin(t) * r} ${y - Math.cos(t) * r} L${x + Math.sin(t) * (r + len)} ${y - Math.cos(t) * (r + len)}`);
  }
  return { shape: 'path', d: d.join(' '), fill: 'none', stroke: true, sw: 5 };
}

/**
 * The blur of her hands: see-through ghost hands on a curved swoosh, around one real hand.
 * @param {number} x real hand x @param {number} y real hand y @param {number} side -1 = left hand (swoosh goes left), 1 = right
 * @returns {object[]} shape layers
 */
function blurHand(x, y, side) {
  const out = [
    { shape: 'path', d: `M${x} ${y + 60} Q${x + side * 150} ${y + 10} ${x + side * 110} ${y - 140}`, fill: 'none', stroke: '#ffffff', sw: 26, opacity: 0.55 },
    { shape: 'path', d: `M${x + side * 40} ${y + 90} Q${x + side * 200} ${y + 30} ${x + side * 170} ${y - 120}`, fill: 'none', stroke: true, sw: 4 },
  ];
  for (const [dx, dy, o] of [[95, -10, 0.7], [125, -85, 0.5], [80, -140, 0.3]]) {
    out.push({ shape: 'circle', x: x + side * dx, y: y + dy, r: 36, fill: '#f2c19d', stroke: true, sw: 3, opacity: o });
  }
  return out;
}

/**
 * The plant's red sweatband with a white stripe and a little knot, tied round the stems above the pot.
 * @param {number} x plant x @param {number} y plant floor y @param {number} s plant scale @returns {object[]} shape layers
 */
function sweatband(x, y, s) {
  return [
    { shape: 'path', d: `M${x + 40 * s} ${y - 222 * s} L${x + 96 * s} ${y - 196 * s} L${x + 84 * s} ${y - 240 * s}Z`, fill: '#e8505b', stroke: true, sw: 4 },
    { shape: 'rect', x: x - 64 * s, y: y - 244 * s, w: 128 * s, h: 34 * s, rx: 14 * s, fill: '#e8505b', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x - 58 * s} ${y - 227 * s} L${x + 58 * s} ${y - 227 * s}`, fill: 'none', stroke: '#ffffff', sw: 7 * s },
  ];
}

/**
 * A tea mug with steam (her second tea).
 * @param {number} x middle @param {number} y bottom @param {number} k size @returns {object[]} shape layers
 */
function mug(x, y, k) {
  return [
    { shape: 'path', d: `M${x + 34 * k} ${y - 70 * k} Q${x + 70 * k} ${y - 60 * k} ${x + 36 * k} ${y - 26 * k}`, fill: 'none', stroke: true, sw: 8 * k },
    { shape: 'rect', x: x - 40 * k, y: y - 90 * k, w: 80 * k, h: 90 * k, rx: 12 * k, fill: '#7ec8e3', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x - 14 * k} ${y - 104 * k} Q${x - 26 * k} ${y - 130 * k} ${x - 12 * k} ${y - 150 * k} M${x + 12 * k} ${y - 104 * k} Q${x} ${y - 130 * k} ${x + 14 * k} ${y - 156 * k}`, fill: 'none', stroke: '#9aa0aa', sw: 5 },
  ];
}

export const STRIP = {
  id: 'mmastery',
  title: 'comic.mmastery.title',
  panels: [
    {
      // 1. Training week. Nils holds up the stopwatch, Greta knits, she squints at the next bump, tweezers ready.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.06, windowX: 0.5, leakX: 0.36, bulbX: 0.5, signX: 0.93, plantX: 0.64, plantEyes: 'wide' }),
          { art: 'chair', x: 300, y: 870, scale: 0.75, color: '#9a8f6a' },
          { id: 'nils', art: 'nils', x: 300, y: 870, scale: 0.75, pose: 'sit', expr: 'proud', look: 1 },
          ...stopwatch(420, 640, 62, 0),
          { art: 'chair', x: 1300, y: 870, scale: 0.75, color: '#9a8f6a' },
          { id: 'greta', art: 'greta', x: 1300, y: 870, scale: 0.75, pose: 'sit', expr: 'happy', look: -1 },
          ...knitting(1300, 690, 0.9),
          { id: 'her', art: 'heroine', x: 800, y: 880, scale: 0.85, pose: 'stand', hold: 'tweezers', expr: 'squint', look: 1 },
        ],
      },
      camera: { move: 'pushIn', focus: [800, 450], amount: 0.06, ms: 3000 },
      bubbles: [
        { kind: 'caption', key: 'comic.mmastery.p1.cap', at: [800, 60], w: 760 },
        { kind: 'say', key: 'comic.mmastery.p1.nils', at: [300, 250], to: 'nils', w: 300 },
        { kind: 'whisper', key: 'comic.mmastery.p1.greta', at: [1310, 250], to: 'greta', w: 280 },
      ],
    },
    {
      // 2. Close-up: Greta's needles click in time; the stopwatch ticks.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, sign: false, bulb: false, plant: false }),
          { id: 'greta', art: 'greta', x: 230, y: 600, scale: 0.85, pose: 'bust', expr: 'happy', look: 1 },
          ...knitting(250, 540, 1),
          zips(250, 540, 120, -105, -65, 3, 34),
          zips(250, 540, 120, 65, 105, 3, 34),
          ...stopwatch(610, 360, 120, 120),
          zips(610, 360, 140, 30, 150, 4, 30),
        ],
      },
      sound: 'tweeze',
      bubbles: [
        { kind: 'say', key: 'comic.mmastery.p2.greta', at: [560, 80], to: 'greta', w: 380 },
      ],
    },
    {
      // 3. The big moment: a blur of hands and speed lines. Two seconds flat! The plant nods along in a sweatband.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 500, y: 560, colors: ['#ffd166', '#ffb347'] },
          ...blurHand(391, 610, -1),
          ...blurHand(609, 610, 1),
          { id: 'her', art: 'heroine', x: 500, y: 1010, scale: 0.85, pose: 'pop', expr: 'bliss' },
          zips(500, 560, 330, -50, 50, 7, 60),
          { id: 'nils', art: 'nils', x: 150, y: 1060, scale: 0.6, pose: 'bust', expr: 'shocked', look: 1 },
          ...stopwatch(270, 900, 80, 60),
          { art: 'plant', x: 860, y: 1000, scale: 0.9, eyes: 'happy', sweat: true },
          ...sweatband(860, 1000, 0.9),
          zips(860, 740, 200, -40, 40, 3, 40),
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_gold',
      bubbles: [
        { kind: 'shout', key: 'comic.mmastery.p3.zip', at: [500, 90], w: 420 },
        { kind: 'say', key: 'comic.mmastery.p3.nils', at: [140, 720], to: 'nils', w: 260, sound: 'cheer' },
      ],
    },
    {
      // 4. Button: Nils stops the watch for a record; she finished ages ago and is on her second tea. The plant is done in.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, sign: false, bulb: false, plantX: 0.5, plantEyes: 'sad' }),
          { id: 'her', art: 'heroine', x: 170, y: 660, scale: 0.85, pose: 'bust', expr: 'proud', look: 1 },
          ...mug(300, 470, 0.9),
          { id: 'nils', art: 'nils', x: 630, y: 660, scale: 0.85, pose: 'bust', expr: 'shocked', look: -1 },
          ...stopwatch(540, 450, 48, 350),
        ],
      },
      sound: 'pop_small',
      bubbles: [
        { kind: 'say', key: 'comic.mmastery.p4.nils', at: [620, 90], to: 'nils', w: 260 },
        { kind: 'say', key: 'comic.mmastery.p4.her', at: [190, 90], to: 'her', w: 280 },
        { kind: 'caption', key: 'comic.mmastery.p4.end', at: [400, 560], w: 640 },
      ],
    },
  ],
};
