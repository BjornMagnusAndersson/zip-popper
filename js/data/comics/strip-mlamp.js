// Milestone strip "First lamp" (T4.3c): shown when the player buys the first lamp in the studio shop. 5 panels.
// Beginning: closing time, the bulb has given up; {name} squints at a pore, Nils squints back. Middle: the new lamp,
// "Let there be..." LIGHT! The whole studio shows up at once: cracks, cobweb, the plant blinks, a mouse in sunglasses
// (the visual surprise). End: Nils spots the stain on the "Clean!" sign (running gag). Button: she turns the lamp
// onto his chin only; the sign is back in the dark, "clean" again, and now Nils is the one squinting.
// Format: docs/COMIC-FORMAT.md.

/** The dingy studio at night (tier 0; the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({
  art: 'room', kind: 'studio', w, h, sky: ['#10153a', '#2a3470'], cloud: false, moon: true, stars: true, plantScarf: '#e8505b', ...o,
});

/** A see-through dark sheet over the whole panel (the light is off). @param {number} w width @param {number} h height @param {number} [a] how dark, 0..1 @returns {object} layer */
const dark = (w, h, a = 0.55) => ({ shape: 'rect', x: 0, y: 0, w, h, fill: '#0f1430', opacity: a });

/**
 * The new studio lamp: a ring light on a stand. Off it is grey; on it glows with a halo.
 * @param {number} x middle @param {number} y floor (bottom of the base) @param {number} k size
 * @param {boolean|string} on true = lit with a halo, 'ring' = lit, no halo (aimed elsewhere), false = off
 * @returns {object[]} shape layers
 */
function ringLamp(x, y, k, on) {
  const cy = y - 560 * k;
  const out = [];
  if (on === true) {
    out.push({ shape: 'circle', x, y: cy, r: 330 * k, fill: '#fff6c8', opacity: 0.35 });
    out.push({ shape: 'circle', x, y: cy, r: 190 * k, fill: '#fffbe6', opacity: 0.5 });
  }
  out.push(
    { shape: 'rect', x: x - 9 * k, y: cy + 90 * k, w: 18 * k, h: y - cy - 110 * k, fill: '#8a96a6', stroke: true, sw: 4 },
    { shape: 'ellipse', x, y: y - 14 * k, rx: 80 * k, ry: 20 * k, fill: '#5d6650', stroke: true, sw: 5 },
    { shape: 'circle', x, y: cy, r: 90 * k, fill: 'none', stroke: true, sw: 36 * k },
    { shape: 'circle', x, y: cy, r: 90 * k, fill: 'none', stroke: on ? '#fffbe6' : '#9aa0aa', sw: 24 * k },
  );
  return out;
}

/**
 * A light beam from the lamp to a spot (a soft see-through wedge).
 * @param {number} x0 lamp x @param {number} y0 lamp y @param {number} x1 spot x @param {number} y1 spot y @param {number} r beam half-width at the spot
 * @returns {object} shape layer
 */
function beam(x0, y0, x1, y1, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * r;
  const ny = (dx / len) * r;
  return { shape: 'path', d: `M${x0} ${y0} L${x1 + nx} ${y1 + ny} L${x1 - nx} ${y1 - ny}Z`, fill: '#fff3b0', opacity: 0.45 };
}

/**
 * Things the light shows up: a cobweb in a ceiling corner (the corner at x, 0; side -1 = left corner, 1 = right).
 * @param {number} x corner x @param {number} side which way the web spreads in (-1 or 1) @param {number} k size @returns {object} shape layer
 */
function cobweb(x, side, k) {
  const s = -side;
  const d = [`M${x} ${150 * k} L${x} 0 L${x + s * 150 * k} 0`, `M${x} 0 L${x + s * 120 * k} ${110 * k}`, `M${x} 0 L${x + s * 60 * k} ${140 * k}`, `M${x} 0 L${x + s * 140 * k} ${50 * k}`];
  for (const q of [50, 95, 135]) d.push(`M${x} ${q * k} Q${x + s * q * 0.5 * k} ${q * 0.6 * k} ${x + s * q * k} 0`);
  return { shape: 'path', d: d.join(' '), fill: 'none', stroke: '#e8ecef', sw: 3, opacity: 0.85 };
}

/**
 * The visual surprise: a mouse hole in the skirting, and a mouse in sunglasses peeking out at the new light.
 * @param {number} x middle of the hole @param {number} y floor line @param {number} k size @returns {object[]} shape layers
 */
function sunMouse(x, y, k) {
  return [
    { shape: 'path', d: `M${x - 60 * k} ${y} L${x - 60 * k} ${y - 50 * k} Q${x} ${y - 120 * k} ${x + 60 * k} ${y - 50 * k} L${x + 60 * k} ${y}Z`, fill: '#22261f', stroke: true, sw: 5 },
    { shape: 'circle', x: x - 30 * k, y: y - 66 * k, r: 18 * k, fill: '#a9a3a8', stroke: true, sw: 4 },
    { shape: 'circle', x: x + 30 * k, y: y - 66 * k, r: 18 * k, fill: '#a9a3a8', stroke: true, sw: 4 },
    { shape: 'ellipse', x, y: y - 34 * k, rx: 40 * k, ry: 34 * k, fill: '#bdb7bc', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x - 34 * k} ${y - 44 * k} L${x + 34 * k} ${y - 44 * k}`, stroke: true, sw: 4 },
    { shape: 'ellipse', x: x - 16 * k, y: y - 40 * k, rx: 14 * k, ry: 10 * k, fill: '#1c1c22', stroke: true, sw: 3 },
    { shape: 'ellipse', x: x + 16 * k, y: y - 40 * k, rx: 14 * k, ry: 10 * k, fill: '#1c1c22', stroke: true, sw: 3 },
    { shape: 'circle', x, y: y - 16 * k, r: 7 * k, fill: '#ff9cbc', stroke: true, sw: 3 },
  ];
}

export const STRIP = {
  id: 'mlamp',
  title: 'comic.mlamp.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  panels: [
    {
      // 1. Closing time, the bulb has given up. She squints at a pore; Nils squints back.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.08, windowX: 0.44, leak: false, bulb: false, signX: 0.86, plantX: 0.22, lamp: false }),
          { art: 'chair', x: 1000, y: 870, scale: 0.75, color: '#9a8f6a' },
          { id: 'nils', art: 'nils', x: 1000, y: 870, scale: 0.75, pose: 'sit', expr: 'squint', look: -1 },
          { id: 'her', art: 'heroine', x: 620, y: 880, scale: 0.85, pose: 'stand', hold: 'tweezers', expr: 'squint', look: 1 },
          dark(1600, 900, 0.62),
        ],
      },
      camera: { move: 'pushIn', focus: [800, 450], amount: 0.08, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.mlamp.p1.cap', at: [440, 60], w: 720 },
        { kind: 'say', key: 'comic.mlamp.p1.her', at: [300, 300], to: 'her', w: 380 },
        { kind: 'say', key: 'comic.mlamp.p1.nils', at: [1320, 260], to: 'nils', w: 380 },
      ],
    },
    {
      // 2. Fresh from the shop: a proper lamp. One switch. "Let there be..."
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.16, door: false, leak: false, bulb: false, sign: false, plant: false, lamp: false }),
          ...ringLamp(620, 590, 0.75, false),
          { shape: 'path', d: 'M620 580 Q520 600 420 560 Q380 545 372 520', fill: 'none', stroke: true, sw: 5 },
          { shape: 'rect', x: 350, y: 486, w: 44, h: 40, rx: 8, fill: '#f6f1de', stroke: true, sw: 4 },
          { shape: 'circle', x: 372, y: 506, r: 9, fill: '#e8505b', stroke: true, sw: 3 },
          { id: 'her', art: 'heroine', x: 230, y: 650, scale: 1.0, pose: 'bust', expr: 'scheming', look: 1 },
          dark(800, 600, 0.5),
        ],
      },
      camera: { move: 'pushIn', focus: [400, 300], amount: 0.1, ms: 2200 },
      bubbles: [
        { kind: 'caption', key: 'comic.mlamp.p2.cap', at: [400, 40], w: 560 },
        { kind: 'say', key: 'comic.mlamp.p2.her', at: [560, 370], to: 'her', w: 300 },
      ],
    },
    {
      // 3. The big moment: LIGHT! The whole studio shows up: cracks, cobweb, the plant blinks, a mouse in sunglasses.
      layout: 'splash',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, door: false, windowX: 0.34, leakX: 0.62, bulb: false, signX: 0.8, plantX: 0.08, plantEyes: 'wide', lamp: false }),
          cobweb(1000, 1, 1.2),
          cobweb(0, -1, 0.9),
          ...sunMouse(935, 618, 1),
          { shape: 'path', d: 'M28 548 l-22 -16 M80 530 l0 -26 M132 548 l22 -16', fill: 'none', stroke: true, sw: 5 },
          ...ringLamp(500, 960, 0.8, true),
          { art: 'chair', x: 250, y: 990, scale: 0.75, color: '#9a8f6a' },
          { id: 'nils', art: 'nils', x: 250, y: 990, scale: 0.75, pose: 'sit', expr: 'shocked', look: 1 },
          { id: 'her', art: 'heroine', x: 715, y: 1010, scale: 0.8, pose: 'cheer', expr: 'bliss', look: -1 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_gold',
      bubbles: [
        { kind: 'shout', key: 'comic.mlamp.p3.light', at: [560, 80], w: 240 },
        { kind: 'say', key: 'comic.mlamp.p3.nils', at: [175, 250], to: 'nils', w: 320 },
        { kind: 'say', key: 'comic.mlamp.p3.her', at: [760, 340], to: 'her', w: 400, sound: 'ooh_happy' },
      ],
    },
    {
      // 4. Running gag: in the new light, the "Clean!" sign is... not.
      layout: 'small',
      scene: {
        bg: '#fffbe6',
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.14, door: false, leak: false, bulb: false, signX: 0.62, signTilt: -7, plant: false, lamp: false }),
          { shape: 'circle', x: 556, y: 160, r: 40, fill: 'none', stroke: '#ff7a59', sw: 7 },
          { shape: 'path', d: 'M612 214 l40 40 M520 214 l-30 34', fill: 'none', stroke: '#ff7a59', sw: 6 },
          { id: 'nils', art: 'nils', x: 210, y: 660, scale: 0.95, pose: 'bust', expr: 'shocked', look: 1 },
        ],
      },
      camera: { move: 'pushIn', focus: [520, 160], amount: 0.12, ms: 2200 },
      bubbles: [
        { kind: 'say', key: 'comic.mlamp.p4.nils', at: [560, 370], to: 'nils', w: 360 },
      ],
    },
    {
      // 5. Button: she aims the lamp at his chin only. The sign is back in the dark (clean again); now he squints.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, bulb: false, signX: 0.5, plantX: 0.94, plantEyes: 'smug', lamp: false }),
          { id: 'her', art: 'heroine', x: 170, y: 660, scale: 0.85, pose: 'bust', expr: 'proud', look: 1 },
          { id: 'nils', art: 'nils', x: 560, y: 660, scale: 0.85, pose: 'bust', expr: 'squint', look: -1 },
          dark(800, 600, 0.6),
          ...ringLamp(330, 640, 0.5, 'ring'),
          beam(330, 360, 560, 400, 110),
        ],
      },
      sound: 'pop_small',
      bubbles: [
        { kind: 'say', key: 'comic.mlamp.p5.her', at: [150, 110], to: 'her', w: 220 },
        { kind: 'say', key: 'comic.mlamp.p5.nils', at: [640, 110], to: 'nils', w: 240 },
        { kind: 'caption', key: 'comic.mlamp.p5.end', at: [400, 560], w: 640 },
      ],
    },
  ],
};
