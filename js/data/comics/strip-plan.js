// Bridge strip 4b "The plan" (between strip 4 "Rock bottom" and strip 5 "The shabby studio"). 8 panels.
// Beginning: the next morning {name} brings a hand-drawn business plan to breakfast; he eats his cereal out of his
// upturned helmet, then puts it on (cereal and all) to be her guard. Middle: a cheerful landlord in a too-big suit
// shows them a closed launderette (dusty machines, a leak, lost socks); the splash is her imagination: the same dump
// as a clean, sparkling studio. She signs the lease without reading it ("the roof is not included"). End: the huge
// rusty key, moving in (one chair, one bucket, one lamp, and the sad plant she adopts), and the evening outside:
// "Tomorrow." Tone (owner): HOPEFUL; nobody is mean. Greta and Nils are NOT in this strip (they come in strip 5).
// Running gags: his helmet gets fancier (three plumes, now with cereal loops still stuck on it), the plant (sad,
// then amazed, then happy and greener), the roof. Visual surprise: the dream studio. Format: docs/COMIC-FORMAT.md.

/** Her husband in his full armor, visor up, three plumes (the helmet ladder, see STORY.md; owner 2026-10-28: full armor, as he slept in it in strip 4 and wears it in strip 5). @param {number} x @param {number} y @param {number} s scale @param {object} [o] more options @returns {object} layer */
const helmeted = (x, y, s, o = {}) => ({ id: 'him', art: 'husband', x, y, scale: s, outfit: 'armor', visor: 'up', plumes: 3, ...o });

/** Where a husband layer's head is (centre and size), for things stuck to his helmet. @param {object} l the layer @returns {{x: number, y: number, k: number}} head centre and head scale */
function headOf(l) {
  const s = l.scale ?? 1;
  const up = { stand: 515, hips: 515, cheer: 515, wave: 515, point: 515, shrug: 515, bust: 255, sit: 440 }[l.pose ?? 'stand'];
  return { x: l.x, y: l.y - up * s, k: 1.04 * s };
}

/**
 * The running gag this time: his helmet was the cereal bowl, so a few cereal loops and a drip of milk are still stuck
 * on it (the spoon feather was dropped in R7: it looked like an antenna).
 * @param {object} him the husband layer @param {boolean} [loops] cereal loops and a drop of milk on the helmet
 * @returns {object[]} shape layers (put them after him)
 */
function spoon(him, loops = false) {
  const { x, y, k } = headOf(him);
  const f = him.flip ? -1 : 1;
  const out = []; // R7: the spoon that used to stick out of the side read as an antenna, so only the cereal remains
  if (loops) {
    for (const [dx, dy, c] of [[-60, -110, '#f3a33a'], [40, -128, '#e66a8f'], [-10, -140, '#ffd25a'], [70, -96, '#f3a33a']]) {
      out.push({ shape: 'circle', x: x + f * dx * k, y: y + dy * k, r: 15 * k, fill: c, stroke: true, sw: 4 });
      out.push({ shape: 'circle', x: x + f * dx * k, y: y + dy * k, r: 5 * k, fill: '#fff8ee' });
    }
    out.push({ shape: 'path', d: `M${x - f * 124 * k} ${y + 20 * k} q${-f * 8 * k} ${30 * k} 0 ${44 * k} q${f * 10 * k} ${-10 * k} 0 ${-44 * k}Z`, fill: '#ffffff', stroke: true, sw: 3 });
  }
  return out;
}

/**
 * A kitchen table seen from the front (as in strip 2): a tablecloth with a scalloped edge and two wooden legs.
 * Put it after the people sitting at it, so it covers their laps.
 * @param {number} x0 left edge @param {number} x1 right edge @param {number} top table top @param {number} bottom legs end
 * @returns {object[]} shape layers
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
 * His helmet upside down on the table as a cereal bowl: a steel dome, milk, cereal loops, a spoon, the plume flopped over.
 * @param {number} x middle @param {number} y table top @param {number} k size @returns {object[]} shape layers
 */
function helmetBowl(x, y, k) {
  const out = [
    // The cheek guards stick up at both sides; the red plume flops down over the front of the table.
    { shape: 'path', d: `M${x - 112 * k} ${y - 90 * k} L${x - 128 * k} ${y - 150 * k} L${x - 84 * k} ${y - 168 * k} L${x - 78 * k} ${y - 100 * k}Z`, fill: '#c9d3de', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x + 112 * k} ${y - 90 * k} L${x + 128 * k} ${y - 150 * k} L${x + 84 * k} ${y - 168 * k} L${x + 78 * k} ${y - 100 * k}Z`, fill: '#c9d3de', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x - 110 * k} ${y - 96 * k} C${x - 110 * k} ${y + 10 * k} ${x + 110 * k} ${y + 10 * k} ${x + 110 * k} ${y - 96 * k}Z`, fill: '#c9d3de', stroke: true, sw: 6 },
    { shape: 'path', d: `M${x - 80 * k} ${y - 70 * k} Q${x - 70 * k} ${y - 20 * k} ${x - 30 * k} ${y - 12 * k}`, stroke: '#ffffff', sw: 8 * k, opacity: 0.7 },
    ...[[-74, -60], [74, -60], [0, -34]].map(([dx, dy]) => ({ shape: 'circle', x: x + dx * k, y: y + dy * k, r: 7 * k, fill: '#8a96a6' })),
    { shape: 'path', d: `M${x - 10 * k} ${y - 6 * k} C${x - 40 * k} ${y + 30 * k} ${x - 90 * k} ${y + 40 * k} ${x - 100 * k} ${y + 120 * k} C${x - 60 * k} ${y + 80 * k} ${x - 20 * k} ${y + 50 * k} ${x + 16 * k} ${y - 4 * k}Z`, fill: '#e8505b', stroke: true, sw: 5 },
    { shape: 'ellipse', x, y: y - 96 * k, rx: 110 * k, ry: 22 * k, fill: '#fff8ee', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x + 30 * k} ${y - 100 * k} L${x + 90 * k} ${y - 200 * k}`, stroke: true, sw: 16 * k + 4 },
    { shape: 'path', d: `M${x + 30 * k} ${y - 100 * k} L${x + 90 * k} ${y - 200 * k}`, stroke: '#d7dee7', sw: 16 * k },
    { shape: 'ellipse', x: x + 98 * k, y: y - 222 * k, rx: 22 * k, ry: 32 * k, rotate: 30, fill: '#d7dee7', stroke: true, sw: 4 },
  ];
  for (const [dx, dy, c] of [[-60, -104, '#f3a33a'], [-20, -112, '#e66a8f'], [20, -102, '#ffd25a'], [-40, -92, '#ffd25a'], [56, -100, '#f3a33a'], [0, -94, '#f3a33a']]) {
    out.push({ shape: 'circle', x: x + dx * k, y: y + dy * k, r: 14 * k, fill: c, stroke: true, sw: 3.5 });
    out.push({ shape: 'circle', x: x + dx * k, y: y + dy * k, r: 5 * k, fill: '#fff8ee' });
  }
  return out;
}

/**
 * Her phone held up big, the screen a grid of tiny pop-video thumbnails (all 212 of them, more or less).
 * @param {number} x middle @param {number} y middle @param {number} k size @returns {object[]} shape layers
 */
function phoneWall(x, y, k) {
  const out = [
    { shape: 'circle', x, y, r: 150 * k, fill: '#8fe3ff', opacity: 0.25 },
    { shape: 'rect', x: x - 80 * k, y: y - 140 * k, w: 160 * k, h: 280 * k, rx: 24 * k, fill: '#2b2f3a', stroke: true, sw: 6 },
    { shape: 'rect', x: x - 66 * k, y: y - 116 * k, w: 132 * k, h: 232 * k, rx: 8 * k, fill: '#eaf8ff' },
  ];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const tx = x - 60 * k + c * 31 * k;
      const ty = y - 110 * k + r * 37 * k;
      out.push({ shape: 'rect', x: tx, y: ty, w: 27 * k, h: 31 * k, rx: 4 * k, fill: (r + c) % 3 ? '#ffe8d6' : '#ffd8e6' });
      out.push({ shape: 'circle', x: tx + 13.5 * k, y: ty + 15 * k, r: 6 * k, fill: '#ff9cb5' });
    }
  }
  return out;
}

/** A small art layer helper: the sad plant she adopts, on its own. @param {number} x @param {number} y pot bottom @param {number} s scale @param {string} eyes face @returns {object} layer */
const littlePlant = (x, y, s, eyes) => ({ id: 'plant', art: 'plant', x, y, scale: s, eyes, droop: eyes === 'sad', mouth: [x, y - 150 * s] });

/** Where a figure's raised hand is in the 'wave' pose (comic-art POSES.wave: hand at 190, -530). @param {object} l the figure layer @returns {number[]} [x, y] in panel units */
const waveHand = (l) => [l.x + (l.flip ? -190 : 190) * (l.scale ?? 1), l.y - 530 * (l.scale ?? 1)];

/**
 * The splash's thought cloud: puffs with one outline, a trail of small puffs down to her head, and inside it the
 * dream: the same room clean and sparkling, a pink chair, a lamp, a sparkly sign, and the plant, happy.
 * @returns {object[]} layers
 */
function dream() {
  const puffs = [[450, 210, 95], [540, 120, 105], [680, 85, 105], [810, 120, 100], [880, 230, 90], [830, 340, 95], [690, 380, 100], [550, 360, 95], [460, 300, 85], [670, 230, 190]];
  return [
    { shape: 'circle', x: 650, y: 672, r: 14, fill: '#ffffff', stroke: true, sw: 4 },
    { shape: 'circle', x: 626, y: 614, r: 22, fill: '#ffffff', stroke: true, sw: 4 },
    { shape: 'circle', x: 604, y: 546, r: 32, fill: '#ffffff', stroke: true, sw: 5 },
    ...puffs.map(([x, y, r]) => ({ shape: 'circle', x, y, r, fill: '#ffffff', stroke: true, sw: 6 })),
    ...puffs.map(([x, y, r]) => ({ shape: 'circle', x, y, r: r - 4, fill: '#ffffff' })),
    // The dream room: clean pink wall, warm floor.
    { shape: 'rect', x: 480, y: 110, w: 390, h: 280, rx: 30, fill: '#ffe6ef', stroke: '#f5b8cc', sw: 4 },
    { shape: 'rect', x: 480, y: 320, w: 390, h: 70, rx: 20, fill: '#f6cfae' },
    { shape: 'path', d: 'M480 320 L870 320', stroke: '#e8a98a', sw: 5 },
    // The sign: a tick, a heart and sparkles (no words).
    { shape: 'rect', x: 510, y: 140, w: 130, h: 72, rx: 10, fill: '#ffffff', stroke: true, sw: 4 },
    { shape: 'path', d: 'M528 176 l14 16 l28 -32', stroke: '#3fae8c', sw: 9 },
    { shape: 'path', d: 'M608 194 c-8 -12 -26 0 0 16 c26 -16 8 -28 0 -16Z', fill: '#e8505b', stroke: true, sw: 2.5 },
    // The lamp, switched on.
    { shape: 'circle', x: 820, y: 200, r: 70, fill: '#fff3a8', opacity: 0.8 },
    { shape: 'path', d: 'M820 210 L820 376', stroke: true, sw: 6 },
    { shape: 'ellipse', x: 820, y: 378, rx: 26, ry: 7, fill: '#6e4528', stroke: true, sw: 3 },
    { shape: 'path', d: 'M798 172 L842 172 L860 214 L780 214Z', fill: '#ffd25a', stroke: true, sw: 4 },
    { art: 'chair', x: 700, y: 380, scale: 0.42, color: '#f27eb2' },
    { art: 'plant', x: 545, y: 380, scale: 0.3, eyes: 'happy' },
    { art: 'sparkles', x: 680, y: 170, r: 110 },
  ];
}

/**
 * The three pages of the lease, fanned out on top of a washing machine: tiny, tiny print, and her signature, a big loop.
 * @param {number} x middle @param {number} y top of the front page @returns {object[]} shape layers
 */
function lease(x, y) {
  const out = [];
  for (const [dx, rot, fill] of [[-60, -10, '#f3ecdc'], [50, 8, '#f7f1e3'], [0, -2, '#fffaf0']]) {
    out.push({ shape: 'rect', x: x + dx - 120, y, w: 240, h: 300, rx: 6, fill, stroke: true, sw: 5, rotate: rot });
  }
  for (let r = 0; r < 11; r += 1) out.push({ shape: 'path', d: `M${x - 96} ${y + 28 + r * 14} L${x + (r % 3 ? 96 : 60)} ${y + 28 + r * 14}`, stroke: '#7d8597', sw: 3, opacity: 0.6, rotate: -2 });
  out.push({ shape: 'path', d: `M${x - 90} ${y + 200} L${x + 90} ${y + 200}`, stroke: true, sw: 3, rotate: -2 });
  // Her signature: one big happy loop with a flourish.
  out.push({ shape: 'path', d: `M${x - 86} ${y + 196} C${x - 60} ${y + 120} ${x - 10} ${y + 120} ${x - 24} ${y + 176} C${x - 36} ${y + 220} ${x + 30} ${y + 210} ${x + 40} ${y + 170} C${x + 50} ${y + 140} ${x + 80} ${y + 190} ${x + 100} ${y + 176}`, fill: 'none', stroke: '#e66a8f', sw: 7 });
  return out;
}

/**
 * The lease lying FLAT on the machine's top (owner 2026-10-28: it used to stand up like a board and her arm went
 * through it). Three pages seen from a little above, so they are wide and short; tiny print and her big pink loop.
 * @param {number} x middle @param {number} y middle of the front page @returns {object[]} shape layers
 */
function flatLease(x, y) {
  /** A page as a flat four-corner shape round its middle. @param {number} cx @param {number} cy @param {string} fill @returns {object} layer */
  const page = (cx, cy, fill) => ({ shape: 'path', d: `M${cx - 128} ${cy + 22} L${cx + 120} ${cy + 16} L${cx + 104} ${cy - 22} L${cx - 112} ${cy - 18} Z`, fill, stroke: true, sw: 4 });
  const out = [page(x - 40, y - 6, '#f3ecdc'), page(x + 36, y - 4, '#f7f1e3'), page(x, y, '#fffaf0')];
  for (let r = 0; r < 4; r += 1) out.push({ shape: 'path', d: `M${x - 96} ${y - 12 + r * 7} L${x + (r % 2 ? 90 : 60)} ${y - 13 + r * 7}`, stroke: '#7d8597', sw: 2, opacity: 0.6 });
  // Her signature: one big happy loop, squashed flat like the page.
  out.push({ shape: 'path', d: `M${x - 70} ${y + 14} C${x - 50} ${y - 8} ${x - 14} ${y - 8} ${x - 22} ${y + 8} C${x - 30} ${y + 20} ${x + 24} ${y + 18} ${x + 32} ${y + 6} C${x + 40} ${y - 2} ${x + 60} ${y + 14} ${x + 74} ${y + 10}`, fill: 'none', stroke: '#e66a8f', sw: 5 });
  return out;
}

/**
 * Her arm reaching over the machine top from her shoulder to the end of her loop (about as long as her real arm, R7):
 * pink sleeve over the counter top, her hand on the page, the pen's tip on the paper.
 * @param {number[]} tip where the pen touches the page [x, y]
 * @returns {object[]} shape layers
 */
const signingHand = ([tx, ty]) => [
  // shoulder, a bent elbow resting on the machine top, then the forearm up to the page
  { shape: 'path', d: `M676 716 Q706 762 742 760 Q776 758 ${tx - 22} ${ty - 14}`, stroke: true, sw: 46 },
  { shape: 'path', d: `M676 716 Q706 762 742 760 Q776 758 ${tx - 22} ${ty - 14}`, stroke: '#e66a8f', sw: 34 },
  { shape: 'rect', x: tx - 8, y: ty - 58, w: 13, h: 62, rx: 5, fill: '#6a7be6', stroke: true, sw: 4, rotate: 18 },
  { shape: 'ellipse', x: tx - 18, y: ty - 16, rx: 22, ry: 18, fill: '#ebb795', stroke: true, sw: 5 },
  { shape: 'path', d: `M${tx + 18} ${ty - 30} l18 -10 M${tx + 22} ${ty - 10} l20 0`, stroke: true, sw: 4, opacity: 0.6 },
];

/**
 * The machine's top seen from a little above, a light band in front of the people, so the lease can lie on it.
 * @param {number} x0 left @param {number} x1 right @param {number} back far edge @param {number} front near edge (the machine's front top) @returns {object} layer
 */
const counterTop = (x0, x1, back, front) => ({ shape: 'path', d: `M${x0} ${front} L${x1} ${front} L${x1 - 24} ${back} L${x0 + 24} ${back} Z`, fill: '#e9e7de', stroke: true, sw: 6 });

/**
 * A washing machine seen close up, filling the bottom of a panel like a counter (the lease lies on top of it).
 * @param {number} x0 left @param {number} x1 right @param {number} top top edge @param {number} bottom panel bottom @returns {object[]} shape layers
 */
const counter = (x0, x1, top, bottom) => [
  { shape: 'rect', x: x0, y: top, w: x1 - x0, h: bottom - top + 20, rx: 20, fill: '#dcdad0', stroke: true, sw: 6 },
  { shape: 'rect', x: x0 + 6, y: top + 6, w: x1 - x0 - 12, h: 40, rx: 14, fill: '#c9c6b8' },
  { shape: 'circle', x: (x0 + x1) / 2, y: bottom + 120, r: 190, fill: '#b9bcb2', stroke: true, sw: 6 },
  { shape: 'circle', x: (x0 + x1) / 2, y: bottom + 120, r: 150, fill: '#5b6b70', stroke: true, sw: 5 },
  { shape: 'ellipse', x: x0 + 90, y: top + 70, rx: 50, ry: 16, fill: '#9c9a8c', opacity: 0.35 },
];

/**
 * A little green watering can held by its back handle in her fist, tipped forward, pouring: a spray of water falls
 * from the spout's rose in an arc and lands on the plant (moving in: she waters the plant, B50).
 * Tagged layers for the test: 'can' (the fist on the handle), 'spout' (the rose), 'water' (the main stream; its path
 * ends where the water lands).
 * @param {number} x her hand @param {number} y her hand @param {number[]} land where the water lands [x, y]
 * @param {number} [tilt] how far the can is tipped forward, in degrees
 * @returns {object[]} shape layers (put them after her)
 */
function wateringCan(x, y, land, tilt = 14) {
  const a = (tilt * Math.PI) / 180;
  /** A point of the can (drawn upright with the hand at 0 0) turned by the tilt and moved to the hand. @param {number} u @param {number} v @returns {number[]} panel point */
  const p = (u, v) => [Math.round(x + u * Math.cos(a) - v * Math.sin(a)), Math.round(y + u * Math.sin(a) + v * Math.cos(a))];
  /** The same point as path text. @param {number} u @param {number} v @returns {string} "x y" */
  const t = (u, v) => p(u, v).join(' ');
  const [rx, ry] = p(206, -56); // the rose (sprinkler head) at the end of the spout
  const [lx, ly] = land;
  const out = [
    // Spout first (the body covers its root), then the rose.
    { shape: 'path', d: `M${t(100, 20)} L${t(200, -50)}`, stroke: true, sw: 20 },
    { shape: 'path', d: `M${t(100, 20)} L${t(200, -50)}`, stroke: '#3fae8c', sw: 11 },
    { id: 'spout', shape: 'circle', x: rx, y: ry, r: 15, fill: '#3fae8c', stroke: true, sw: 5 },
    { shape: 'circle', x: rx + 3, y: ry + 3, r: 6, fill: '#2e8a6c' },
    // The tub: a slightly tapered body, a rim and a shine.
    { shape: 'path', d: `M${t(30, -40)} L${t(116, -40)} L${t(122, 40)} L${t(24, 40)}Z`, fill: '#3fae8c', stroke: true, sw: 6 },
    { shape: 'path', d: `M${t(26, -40)} L${t(120, -40)}`, stroke: true, sw: 16 },
    { shape: 'path', d: `M${t(26, -40)} L${t(120, -40)}`, stroke: '#59b85f', sw: 8 },
    { shape: 'path', d: `M${t(42, -26)} L${t(40, 26)}`, stroke: '#ffffff', sw: 8, opacity: 0.5 },
    // The back handle, a loop her fist closes round.
    { shape: 'path', d: `M${t(32, -30)} C${t(-14, -32)} ${t(-14, 32)} ${t(28, 30)}`, stroke: true, sw: 18 },
    { shape: 'path', d: `M${t(32, -30)} C${t(-14, -32)} ${t(-14, 32)} ${t(28, 30)}`, stroke: '#3fae8c', sw: 9 },
    { id: 'can', shape: 'ellipse', x, y, rx: 26, ry: 24, fill: '#ebb795', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x + 4} ${y - 12} l14 0 M${x + 6} ${y} l14 0 M${x + 4} ${y + 12} l12 0`, stroke: true, sw: 4, opacity: 0.6 },
  ];
  // The spray: three arcs from the rose fanning down onto the plant, with drops along them; the middle one is 'water'.
  for (const [dx, i] of [[-16, 0], [0, 1], [16, 2]]) {
    const ex = lx + dx;
    const ey = ly + Math.abs(dx) * 0.3;
    const d = `M${rx + 10} ${ry + 6} Q${(rx + ex) / 2 + 14} ${ry - 4} ${ex} ${ey}`;
    out.push({ shape: 'path', d, stroke: true, sw: 11, opacity: 0.45 });
    out.push({ ...(i === 1 ? { id: 'water' } : {}), shape: 'path', d, stroke: '#bfe8ff', sw: 7 });
    for (const f of [0.4, 0.8]) {
      const qx = (1 - f) ** 2 * (rx + 10) + 2 * f * (1 - f) * ((rx + ex) / 2 + 14) + f * f * ex;
      const qy = (1 - f) ** 2 * (ry + 6) + 2 * f * (1 - f) * (ry - 4) + f * f * ey;
      out.push({ shape: 'ellipse', x: Math.round(qx), y: Math.round(qy), rx: 7, ry: 10, fill: '#9ad8ff', stroke: true, sw: 3 });
    }
  }
  // A little splash where it lands.
  out.push({ shape: 'path', d: `M${lx - 18} ${ly - 4} l-10 -10 M${lx} ${ly - 8} l0 -14 M${lx + 18} ${ly - 4} l10 -10`, stroke: '#9ad8ff', sw: 5 });
  return out;
}

const P2_HIM = helmeted(1060, 900, 0.85, { pose: 'hips', expr: 'happy', look: -1 });
const P3_HIM = helmeted(1310, 880, 0.86, { pose: 'stand', expr: 'shocked', look: -1 });
const P5_HIM = helmeted(440, 740, 0.85, { pose: 'bust', expr: 'shocked', look: 1 });
const P7_HIM = helmeted(470, 880, 0.85, { pose: 'stand', expr: 'happy', look: 1 });
// Panel 7 (B50): the window (0..1 across), the plant on its sill (sill top y 384), the one chair she stands on (seat
// top 138 units up at scale 1, so her raised hand is level with the sill) and where the spray lands (on the leaves).
const P7_WINDOW_X = 0.68;
const P7_PLANT = littlePlant(1190, 386, 0.32, 'wide');
const P7_CHAIR = { art: 'chair', x: 760, y: 880, scale: 1, color: '#9a8f6a' };
const P7_HER = { id: 'her', art: 'heroine', x: 760, y: 880 - 138 * P7_CHAIR.scale, scale: 0.85, pose: 'wave', expr: 'happy', look: 1, grip: true };
const P7_LAND = [1180, 304];

export const STRIP = {
  id: 'plan',
  title: 'comic.plan.title',
  panels: [
    {
      // 1. THE PLAN. Breakfast. She has made a business plan; he holds it upside down, his cereal in his upturned helmet.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'room', kind: 'kitchen', w: 1600, h: 900, floorY: 600, windowX: 0.5, plant: false },
          { id: 'her', art: 'heroine', x: 420, y: 860, pose: 'sit', expr: 'happy', look: 1 },
          // In his armor at breakfast, helmet off (it is his cereal bowl).
          { id: 'him', art: 'husband', x: 1170, y: 860, pose: 'sitHands', expr: 'neutral', look: -1, outfit: 'armor', helmet: false },
          ...table(-20, 1620, 640, 900),
          // His armored arms reach up to the plan; the plan is upside down. Steel sleeves and gauntlets.
          { shape: 'path', d: 'M1098 590 Q1040 640 1018 620', stroke: true, sw: 52 },
          { shape: 'path', d: 'M1098 590 Q1040 640 1018 620', stroke: '#c9d3de', sw: 40 },
          { shape: 'path', d: 'M1242 590 Q1250 650 1190 626', stroke: true, sw: 52 },
          { shape: 'path', d: 'M1242 590 Q1250 650 1190 626', stroke: '#c9d3de', sw: 40 },
          { id: 'plan', art: 'plan', x: 1104, y: 600, scale: 0.5, rotate: 176 },
          { shape: 'ellipse', x: 1022, y: 616, rx: 24, ry: 26, fill: '#aeb9c6', stroke: true, sw: 5 },
          { shape: 'ellipse', x: 1186, y: 622, rx: 24, ry: 26, fill: '#aeb9c6', stroke: true, sw: 5 },
          ...helmetBowl(1430, 640, 0.9),
          { shape: 'rect', x: 640, y: 560, w: 64, h: 78, rx: 12, fill: '#e66a8f', stroke: true, sw: 5 },
          { shape: 'path', d: 'M704 576 q34 4 30 26 q-4 20 -30 18', fill: 'none', stroke: true, sw: 6 },
          { shape: 'path', d: 'M660 546 q-12 -24 0 -46 M684 546 q12 -24 0 -46', stroke: '#ffffff', sw: 6, opacity: 0.8 },
        ],
      },
      camera: { move: 'pushIn', focus: [900, 450], amount: 0.06, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.plan.p1.cap', at: [330, 56], w: 580 },
        { kind: 'say', key: 'comic.plan.p1.her', at: [740, 330], to: 'her', w: 300 },
        { kind: 'say', key: 'comic.plan.p1.him', at: [1340, 160], to: 'him', w: 460 },
      ],
    },
    {
      // 2. "Who pays to be popped?" Her phone: 212 videos. He puts the helmet on, cereal and all: her guard.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'room', kind: 'kitchen', w: 1600, h: 900, floorY: 600, windowX: 0.5, plant: false },
          { id: 'her', art: 'heroine', x: 420, y: 900, scale: 0.85, pose: 'cheer', expr: 'bliss', look: 1 },
          ...phoneWall(600, 410, 0.8),
          P2_HIM,
          ...spoon(P2_HIM, true),
        ],
      },
      bubbles: [
        { kind: 'say', key: 'comic.plan.p2.him', at: [1080, 90], to: 'him', w: 460 },
        { kind: 'say', key: 'comic.plan.p2.her', at: [430, 140], to: 'her', w: 560 },
        { kind: 'say', key: 'comic.plan.p2.him2', at: [1460, 540], to: 'him', w: 250 },
      ],
    },
    {
      // 3. LOOK AT A PLACE. The landlord shows them a closed launderette: dusty machines, a leak, a bucket, lost socks.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'room', kind: 'launderette', w: 1600, h: 900, floorY: 600, doorX: 0.92, doorOpen: true, windowX: 0.66, leakX: 0.5, bulbX: 0.3, washers: [0.1, 0.22, 0.34], sink: false },
          { art: 'bucket', x: 800, y: 830, scale: 0.5 },
          { id: 'landlord', art: 'landlord', x: 600, y: 880, scale: 0.95, pose: 'shrug', expr: 'happy', look: -1 },
          { id: 'her', art: 'heroine', x: 1060, y: 880, scale: 0.85, pose: 'stand', expr: 'neutral', look: -1 },
          P3_HIM,
          ...spoon(P3_HIM),
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.08, ms: 3500 },
      sound: 'creak',
      bubbles: [
        { kind: 'caption', key: 'comic.plan.p3.cap', at: [420, 52], w: 660 },
        { kind: 'say', key: 'comic.plan.p3.landlord', at: [290, 330], to: 'landlord', w: 360 },
        { kind: 'say', key: 'comic.plan.p3.him', at: [1330, 110], to: 'him', w: 330 },
      ],
    },
    {
      // 4. Splash: the dump up close (drip, cracked sink, cobwebs, a sad little plant), and what SHE sees.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'room', kind: 'launderette', w: 1000, h: 1000, floorY: 760, windowX: 0.86, door: false, bulb: false, leakX: 0.12, washers: false, socks: false, sinkX: 0.27 },
          { art: 'bucket', x: 112, y: 960, scale: 0.6 },
          { art: 'drip', x: 112, y: 400, r: 18 },
          littlePlant(330, 522, 0.42, 'sad'),
          { shape: 'circle', x: 720, y: 830, r: 260, fill: '#fff3a8', opacity: 0.45 },
          { id: 'her', art: 'heroine', x: 720, y: 1060, pose: 'bust', expr: 'bliss', look: 1 },
          ...dream(),
        ],
      },
      camera: { move: 'pullOut', focus: [500, 500], amount: 0.1, ms: 3500 },
      sound: 'ooh_happy',
      bubbles: [
        { kind: 'caption', key: 'comic.plan.p4.cap', at: [210, 50], w: 360 },
        { kind: 'whisper', key: 'comic.plan.p4.landlord', at: [250, 740], to: [4, 660], w: 320 },
        { kind: 'say', key: 'comic.plan.p4.her', at: [880, 640], to: 'her', w: 220 },
      ],
    },
    {
      // 5. SIGN THE LEASE. Tiny print; she signs with a big loop without reading; he peeks over her shoulder.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'room', kind: 'launderette', w: 1600, h: 900, floorY: 600, windowX: 0.16, door: false, leak: false, bulbX: 0.5, washers: false, sink: false, socks: false },
          P5_HIM,
          ...spoon(P5_HIM),
          { id: 'her', art: 'heroine', x: 600, y: 1000, scale: 0.9, pose: 'stand', expr: 'proud' },
          { id: 'landlord', art: 'landlord', x: 1230, y: 960, pose: 'wave', flip: true, expr: 'happy', look: -1 },
          ...counter(300, 1360, 770, 900),
          counterTop(300, 1360, 712, 776),
          // the pen tip about one arm's reach from her shoulder (owner 2026-10-28: the arm was too long)
          ...flatLease(790, 746),
          ...signingHand([842, 754]),
        ],
      },
      camera: { move: 'pushIn', focus: [860, 560], amount: 0.06, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.plan.p5.landlord', at: [1240, 150], to: 'landlord', w: 540 },
        { kind: 'say', key: 'comic.plan.p5.him', at: [240, 230], to: 'him', w: 340 },
        { kind: 'say', key: 'comic.plan.p5.her', at: [820, 250], to: 'her', w: 300 },
      ],
    },
    {
      // 6. GET IT. Outside: one huge rusty key; the landlord runs off happy; her plan is taped to the door.
      layout: 'tall',
      scene: {
        layers: [
          { art: 'shopfront', w: 900, h: 1200, floorY: 1000, doorX: 0.3, windowX: 0.74, plan: true },
          { shape: 'path', d: 'M620 900 l-110 0 M640 950 l-140 0 M630 1000 l-100 0', stroke: true, sw: 6, opacity: 0.5 },
          { shape: 'circle', x: 680, y: 1130, r: 40, fill: '#e8e4dc', stroke: true, sw: 4, opacity: 0.9 },
          { shape: 'circle', x: 650, y: 1140, r: 28, fill: '#e8e4dc', stroke: true, sw: 4, opacity: 0.9 },
          { id: 'landlord', art: 'landlord', x: 790, y: 1150, scale: 0.85, pose: 'wave', expr: 'happy' },
          { id: 'her', art: 'heroine', x: 430, y: 1160, scale: 0.95, pose: 'wave', hold: 'key', holdScale: 2.1, expr: 'bliss' },
          { art: 'sparkles', x: 620, y: 360, r: 150 },
        ],
      },
      camera: { move: 'pushIn', focus: [450, 600], amount: 0.06, ms: 3000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'shout', key: 'comic.plan.p6.her', at: [230, 230], to: 'her', w: 320 },
        { kind: 'say', key: 'comic.plan.p6.landlord', at: [560, 1120], to: 'landlord', w: 260 },
      ],
    },
    {
      // 7. Moving in (just the two of them): one chair, one bucket, one lamp. The sill is high, so she stands on the
      // one chair to water the plant (B50: the can's rose is over the pot and the spray lands on it). Click.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'room', kind: 'studio', w: 1600, h: 900, floorY: 600, doorX: 0.08, windowX: P7_WINDOW_X, leakX: 0.36, bulb: false, sign: false, plant: false, lampX: 0.92 },
          { shape: 'rect', x: 0, y: 0, w: 1600, h: 900, fill: '#ffb86b', opacity: 0.14 },
          { shape: 'path', d: 'M1400 140 l-30 -30 M1472 140 l30 -30 M1436 120 l0 -40 M1360 220 l-40 0 M1512 220 l40 0', stroke: '#ffd25a', sw: 8 },
          { art: 'drip', x: 576, y: 600, r: 16 },
          P7_HIM,
          ...spoon(P7_HIM),
          { art: 'bucket', x: 571, y: 830, scale: 0.45 },
          P7_PLANT,
          P7_CHAIR,
          P7_HER,
          ...wateringCan(...waveHand(P7_HER), P7_LAND, 8),
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.08, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.plan.p7.cap', at: [300, 52], w: 480 },
        { kind: 'say', key: 'comic.plan.p7.her', at: [880, 110], to: 'her', w: 400 },
        { kind: 'shout', key: 'comic.plan.p7.click', at: [1400, 80], w: 280, sound: 'creak' },
      ],
    },
    {
      // 8. Evening, golden light. She looks up at the blank sign board. "Tomorrow." The plant in the window: happier.
      layout: 'wide',
      scene: {
        layers: [
          { art: 'shopfront', w: 1600, h: 900, floorY: 774, doorX: 0.3, windowX: 0.68, sky: ['#ffb86b', '#ffe2a8'], sun: true, glow: true, plan: true, plantEyes: 'happy' },
          { shape: 'rect', x: 0, y: 0, w: 1600, h: 900, fill: '#ff9a4d', opacity: 0.1 },
          { art: 'sparkles', x: 1250, y: 520, r: 120 },
          { shape: 'circle', x: 660, y: 640, r: 230, fill: '#fff3a8', opacity: 0.2 },
          { id: 'her', art: 'heroine', x: 660, y: 890, scale: 0.85, pose: 'stand', hold: 'key', holdScale: 1.3, expr: 'happy' },
        ],
      },
      camera: { move: 'pullOut', focus: [800, 400], amount: 0.1, ms: 4000 },
      bubbles: [
        { kind: 'whisper', key: 'comic.plan.p8.her', at: [420, 380], to: 'her', w: 260 },
        { kind: 'caption', key: 'comic.plan.p8.cap', at: [320, 846], w: 600 },
      ],
    },
  ],
};
