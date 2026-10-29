// Milestone strip "Apron" (T4.3c): played when the player buys the apron (outfit tier 2). 4 panels.
// A superhero dressing montage: {name} ties the apron strings round her neck like a cape, switches on a wind machine
// (a desk fan; the plant in Greta's scarf gets blasted), then strikes the hero pose with the strings streaming.
// Visual surprise: the wind blows the "Clean!" sign off its nail, and behind it is the only clean bit of wall in the
// studio (running gag: the sign that is never clean). Button: "Hang it back up. Nobody saw." The plant saw.
// Format: docs/COMIC-FORMAT.md.

/** The dingy studio (tier 0; the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', lamp: false, ...o });

/**
 * The wind machine: a little desk fan on a stand, blowing towards dir.
 * @param {number} x middle @param {number} y floor (bottom of the base) @param {number} k size
 * @param {number} dir which way it blows (1 = right, -1 = left) @param {boolean} on true adds wind lines
 * @returns {object[]} shape layers
 */
function fan(x, y, k, dir, on) {
  const cy = y - 300 * k;
  const out = [
    { shape: 'rect', x: x - 10 * k, y: cy, w: 20 * k, h: 290 * k, fill: '#8a96a6', stroke: true, sw: 4 },
    { shape: 'ellipse', x, y: y - 14 * k, rx: 70 * k, ry: 20 * k, fill: '#5a7fb8', stroke: true, sw: 5 },
    { shape: 'circle', x, y: cy, r: 100 * k, fill: '#dfe9f2', stroke: true, sw: 6 },
  ];
  for (const a of [0, 120, 240]) {
    out.push({ shape: 'ellipse', x: x + Math.cos((a * Math.PI) / 180) * 48 * k, y: cy + Math.sin((a * Math.PI) / 180) * 48 * k, rx: 44 * k, ry: 22 * k, rotate: a, fill: '#5a7fb8', stroke: true, sw: 4 });
  }
  out.push(
    { shape: 'circle', x, y: cy, r: 100 * k, fill: 'none', stroke: '#8a96a6', sw: 3 },
    { shape: 'circle', x, y: cy, r: 18 * k, fill: '#e8505b', stroke: true, sw: 4 },
  );
  if (on) {
    const x0 = x + dir * 125 * k;
    const d = [-70, -10, 50].map((dy, i) => `M${x0} ${cy + dy * k} q${dir * 60 * k} ${-24 * k} ${dir * (120 + i * 30) * k} 0 t${dir * 120 * k} 0`).join(' ');
    out.push({ shape: 'path', d, fill: 'none', stroke: '#9ec7e8', sw: 7 });
  }
  return out;
}

/**
 * One apron string as a flat cloth ribbon (B10: two thick lines read as a tube): it waves in an S, widens towards
 * the loose end and ends in a forked notch.
 * @param {number} x start x (the bow) @param {number} y start y @param {number} ex end x @param {number} ey end y
 * @param {number} k size @param {number} wob how far the S bends (sign = which way first) @returns {object} a path layer
 */
function ribbon(x, y, ex, ey, k, wob) {
  const dx = ex - x;
  const dy = ey - y;
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len]; // across the ribbon
  const c1 = [x + dx / 3 + nx * wob, y + dy / 3 + ny * wob];
  const c2 = [x + (2 * dx) / 3 - nx * wob, y + (2 * dy) / 3 - ny * wob];
  /** A point and its direction on the wave, t 0..1. @param {number} t @returns {number[]} [px, py, tx, ty] */
  const at = (t) => {
    const u = 1 - t;
    const px = u * u * u * x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * ex;
    const py = u * u * u * y + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * ey;
    const tx = 3 * u * u * (c1[0] - x) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (ex - c2[0]);
    const ty = 3 * u * u * (c1[1] - y) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (ey - c2[1]);
    const tl = Math.hypot(tx, ty) || 1;
    return [px, py, tx / tl, ty / tl];
  };
  const left = [];
  const right = [];
  for (let s = 0; s <= 14; s++) {
    const [px, py, tx, ty] = at(s / 14);
    const hw = (6 + 9 * (s / 14)) * k; // narrow at the bow, wider at the loose end
    left.push(`${(px - ty * hw).toFixed(1)} ${(py + tx * hw).toFixed(1)}`);
    right.push(`${(px + ty * hw).toFixed(1)} ${(py - tx * hw).toFixed(1)}`);
  }
  const [px, py, tx, ty] = at(1);
  const notch = `${(px - tx * 14 * k).toFixed(1)} ${(py - ty * 14 * k).toFixed(1)}`; // the forked end
  const d = `M${left.join(' L')} L${notch} L${right.reverse().join(' L')}Z`;
  return { shape: 'path', d, fill: '#fff8ee', stroke: true, sw: 4 };
}

/**
 * The apron strings tied round her neck like a cape: a bow at the neck and two long ribbons flying with the wind.
 * @param {number} x neck x @param {number} y neck y @param {number} k size @param {number} dir which way they fly (1 = right)
 * @param {number} lift 0 = hanging down, 1 = straight out in the wind @param {number} [reach] length factor (1 = short)
 * @returns {object[]} shape layers
 */
function capeStrings(x, y, k, dir, lift, reach = 1) {
  const out = [];
  for (const [i, len0] of [[0, 230], [1, 190]]) {
    const len = len0 * reach;
    const ex = x + dir * len * k * (0.25 + 0.75 * lift);
    const ey = y + len * k * (1 - 0.8 * lift) + i * 24 * k;
    out.push(ribbon(x, y, ex, ey, k, (i ? 1 : -1) * 30 * k));
  }
  out.push(
    { shape: 'ellipse', x: x - 22 * k, y, rx: 24 * k, ry: 14 * k, rotate: 20, fill: '#fff8ee', stroke: true, sw: 4 },
    { shape: 'ellipse', x: x + 22 * k, y, rx: 24 * k, ry: 14 * k, rotate: -20, fill: '#fff8ee', stroke: true, sw: 4 },
    { shape: 'circle', x, y, r: 10 * k, fill: '#fff8ee', stroke: true, sw: 4 },
  );
  return out;
}

/**
 * The visual surprise: where the "Clean!" sign hung, a bright, spotless patch of wall, with the bare nail and sparkles.
 * @param {number} x nail x @param {number} y nail y @param {number} k size @returns {object[]} shape layers
 */
function cleanSpot(x, y, k) {
  return [
    { shape: 'rect', x: x - 132 * k, y: y + 30 * k, w: 264 * k, h: 150 * k, rx: 10 * k, fill: '#eef8ee', rotate: -7 },
    { shape: 'circle', x, y, r: 7 * k, fill: '#8a96a6', stroke: true, sw: 3 },
    { art: 'sparkles', x, y: y + 100 * k, r: 150 * k },
  ];
}

/**
 * The "Clean!" sign lying on the floor after the wind took it (the painted word CLEAN! and a small tick on a cream
 * board, a stain, a string).
 * @param {number} x middle @param {number} y floor @param {number} k size @returns {object[]} shape layers
 */
function fallenSign(x, y, k) {
  const x0 = x - 125 * k; // the board's top-left corner, which it is turned round (8 degrees)
  const y0 = y - 70 * k;
  // A point on the board (board units from its top-left corner) -> panel units, turned with the board.
  const at = (lx, ly) => [x0 + (lx * Math.cos(0.14) - ly * Math.sin(0.14)) * k, y0 + (lx * Math.sin(0.14) + ly * Math.cos(0.14)) * k];
  const [wx, wy] = at(100, 54);
  const [tx, ty] = at(196, 34);
  const [sx, sy] = at(120, 50);
  return [
    { shape: 'rect', x: x0, y: y0, w: 250 * k, h: 70 * k, rx: 10 * k, fill: '#f6f1de', stroke: true, sw: 5, rotate: 8 },
    { art: 'signWord', x: wx, y: wy, w: 160 * k, size: 44 * k, rotate: 8 },
    { shape: 'path', d: `M${tx} ${ty} l${10 * k} ${16 * k} l${26 * k} ${-26 * k}`, fill: 'none', stroke: '#3fae8c', sw: 9 * k },
    { shape: 'ellipse', x: sx, y: sy, rx: 24 * k, ry: 11 * k, rotate: 8, fill: '#786834', opacity: 0.35 },
    { shape: 'path', d: `M${x - 100 * k} ${y - 66 * k} q${-40 * k} ${-50 * k} ${-90 * k} ${-10 * k}`, fill: 'none', stroke: true, sw: 3.5 },
  ];
}

export const STRIP = {
  id: 'mapron',
  title: 'comic.mapron.title',
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  gloves: true, // her blue gloves once she owns them, though the strip keeps its own apron look (app-logic.js comicStudio)
  panels: [
    {
      // 1. Montage, step 1: the new apron. She ties the strings round her neck like a cape. The plant watches.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, sign: false, bulb: false, plantX: 0.9, plantEyes: 'wide' }),
          { id: 'her', art: 'heroine', x: 300, y: 600, scale: 0.8, pose: 'bust', outfit: 'apron', expr: 'proud', look: 1 },
          ...capeStrings(300, 495, 0.8, -1, 0.9),
        ],
      },
      camera: { move: 'pushIn', focus: [360, 320], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'caption', key: 'comic.mapron.p1.cap', at: [400, 40], w: 560 },
        { kind: 'say', key: 'comic.mapron.p1.her', at: [620, 200], to: 'her', w: 280 },
      ],
    },
    {
      // 2. Step 2: the wind machine. She switches on a desk fan; the plant (in Greta's scarf) gets blasted.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.62, door: false, leak: false, sign: false, bulb: false, plant: false }),
          ...fan(170, 560, 0.75, 1, true),
          { art: 'plant', x: 640, y: 590, scale: 0.75, eyes: 'wide', scarf: '#e8505b', flip: true },
          { shape: 'path', d: 'M640 478 q70 -34 150 -18 q-60 46 -150 38Z', fill: '#e8505b', stroke: true, sw: 4 },
        ],
      },
      camera: { move: 'shake' },
      bubbles: [
        { kind: 'caption', key: 'comic.mapron.p2.cap', at: [400, 40], w: 560 },
        { kind: 'shout', key: 'comic.mapron.p2.whoosh', at: [420, 200], w: 260 },
      ],
    },
    {
      // 3. Step 3: the hero pose. Hands on hips, strings streaming like a cape, rays behind, the plant hangs on.
      layout: 'splash',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, door: false, windowX: 0.5, leak: false, bulb: false, sign: false, plant: false }),
          { art: 'rays', w: 1000, h: 1000, x: 520, y: 380, colors: ['#ffe27a', '#ffd04a'] },
          ...fan(130, 990, 0.9, 1, true),
          ...capeStrings(470, 650, 0.9, 1, 1, 1.5),
          { id: 'her', art: 'heroine', x: 470, y: 1000, scale: 0.8, pose: 'hips', outfit: 'apron', expr: 'proud', look: -1 },
          { art: 'plant', x: 880, y: 990, scale: 0.7, eyes: 'wide', scarf: '#e8505b', flip: true },
          { art: 'sparkles', x: 520, y: 260, r: 260 },
        ],
      },
      camera: { move: 'pullOut', focus: [520, 500], amount: 0.1, ms: 3000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'caption', key: 'comic.mapron.p3.cap', at: [190, 950], w: 300 },
        { kind: 'shout', key: 'comic.mapron.p3.her', at: [600, 150], to: 'her', w: 420, sound: 'ooh_happy' },
      ],
    },
    {
      // 4. Button: fan off. The sign blew off its nail, and behind it is the only clean bit of wall. She hides it fast.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, door: false, windowX: 0.2, leakX: 0.5, bulb: false, sign: false, plantX: 0.88, plantEyes: 'smug' }),
          ...cleanSpot(720, 77, 1),
          ...fan(110, 990, 0.8, 1, false),
          ...fallenSign(770, 950, 0.9),
          { id: 'her', art: 'heroine', x: 400, y: 1000, scale: 0.85, pose: 'point', outfit: 'apron', expr: 'shocked', look: 1 },
        ],
      },
      camera: { move: 'pushIn', focus: [600, 500], amount: 0.05, ms: 3000 },
      sound: 'pop_small',
      bubbles: [
        { kind: 'say', key: 'comic.mapron.p4.her', at: [300, 90], to: 'her', w: 400 },
        { kind: 'whisper', key: 'comic.mapron.p4.hide', at: [720, 420], to: 'her', w: 360, sound: 'laugh_evil' },
        { kind: 'caption', key: 'comic.mapron.p4.end', at: [330, 945], w: 400 },
      ],
    },
  ],
};
