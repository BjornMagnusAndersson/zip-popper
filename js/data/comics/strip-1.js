// Chapter 1 strip "The secret" (T4.3a): after the ban, {name} pops in secret. 10 panels.
// Beginning: night one of the ban, a torch and one bubble of bubble wrap under the duvet; he asks why the bed glows.
// Middle: night two, a sock puppet decoy ("Decoy {name}") takes her place while she pops in the wardrobe.
// End: his phone light finds the sock, then her, mid-pop. Button: night three, he sleeps in his helmet and the sock
// guards him. Running gag: his "No." (and once hers). Armor gag: helmet on the bedpost, then on his head.
// Visual surprise: the phone light shows a sock on her pillow. The plant watches from the corner. Format: docs/COMIC-FORMAT.md.

const NIGHT = ['#1d1e42', '#2f2e63']; // dark night sky colours for plain backgrounds

/** The bedroom at night filling a panel. @param {number} w panel width @param {number} h panel height @param {object} [o] room options @returns {object} layer */
const bedroom = (w, h, o = {}) => ({ art: 'room', kind: 'bedroom', w, h, ...o });

/**
 * A strip of bubble wrap lying flat: a see-through sheet with rows of bubbles, some already popped (flat).
 * @param {number} x left edge @param {number} y top edge @param {number} cols bubbles across @param {number} rows bubbles down
 * @param {number} popped how many bubbles (counted from the left, row by row) are popped @param {number} [k] size (1 = normal)
 * @returns {object[]} shape layers
 */
function bubbleWrap(x, y, cols, rows, popped, k = 1) {
  const step = 46 * k;
  const out = [{ shape: 'rect', x, y, w: cols * step + 14 * k, h: rows * step + 14 * k, rx: 10 * k, fill: '#dff3ff', stroke: true, sw: 5, opacity: 0.9 }];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = x + 30 * k + c * step;
      const cy = y + 30 * k + r * step;
      out.push(r * cols + c < popped
        ? { shape: 'ellipse', x: cx, y: cy + 8 * k, rx: 17 * k, ry: 5 * k, fill: '#b9dcf0', stroke: '#7fb2cf', sw: 3 }
        : { shape: 'circle', x: cx, y: cy, r: 17 * k, fill: '#f4fbff', stroke: '#7fb2cf', sw: 3 });
    }
  }
  return out;
}

/**
 * A roll of bubble wrap standing on its end (for the secret stash in the wardrobe).
 * @param {number} x middle @param {number} y bottom @param {number} h height @returns {object[]} shape layers
 */
function wrapRoll(x, y, h) {
  const out = [{ shape: 'rect', x: x - 60, y: y - h, w: 120, h, rx: 18, fill: '#dff3ff', stroke: true, sw: 5 }];
  for (let yy = y - h + 30; yy < y - 10; yy += 40) {
    for (const dx of [-30, 0, 30]) out.push({ shape: 'circle', x: x + dx, y: yy, r: 13, fill: '#f4fbff', stroke: '#7fb2cf', sw: 3 });
  }
  out.push({ shape: 'ellipse', x, y: y - h, rx: 60, ry: 16, fill: '#c6e6f7', stroke: true, sw: 5 });
  return out;
}

/**
 * "Decoy {name}": a woolly sock puppet with googly eyes, a button nose, a stitched smile and a yarn bun like hers.
 * @param {number} x middle of the face @param {number} y middle of the face @param {number} [s] size (1 = about a real head)
 * @param {object} [o] options: body (draw the sock below the face), helmet (a tiny knight's helmet), id (for bubble tails)
 * @returns {object[]} shape layers
 */
function sockPuppet(x, y, s = 1, o = {}) {
  const out = [];
  if (o.body) {
    out.push({ shape: 'path', d: `M${x - 80 * s} ${y} L${x - 70 * s} ${y + 330 * s} L${x + 70 * s} ${y + 330 * s} L${x + 80 * s} ${y}Z`, fill: '#f4efe6', stroke: true, sw: 6 });
    for (const k of [210, 260]) out.push({ shape: 'rect', x: x - 74 * s, y: y + k * s, w: 148 * s, h: 22 * s, fill: '#e8505b', stroke: true, sw: 4 });
  }
  if (!o.helmet) {
    out.push({ shape: 'circle', x, y: y - 112 * s, r: 42 * s, fill: '#6e4528', stroke: true, sw: 6 });
    out.push({ shape: 'path', d: `M${x - 18 * s} ${y - 118 * s} q18 ${-22 * s} ${34 * s} ${2 * s} q-6 ${18 * s} ${-26 * s} ${12 * s}`, fill: 'none', stroke: '#4a2c18', sw: 4 });
  }
  out.push({ id: o.id, shape: 'ellipse', x, y, rx: 92 * s, ry: 104 * s, fill: '#f4efe6', stroke: true, sw: 7, mouth: [x, y + 50 * s] });
  for (const k of [-60, -20, 20, 60]) out.push({ shape: 'path', d: `M${x + k * s} ${y - 90 * s} q${8 * s} ${30 * s} 0 ${60 * s}`, fill: 'none', stroke: '#d9cfbf', sw: 4 });
  // Googly eyes, pupils rolling different ways.
  out.push({ shape: 'circle', x: x - 36 * s, y: y - 18 * s, r: 30 * s, fill: '#ffffff', stroke: true, sw: 5 });
  out.push({ shape: 'circle', x: x + 38 * s, y: y - 22 * s, r: 26 * s, fill: '#ffffff', stroke: true, sw: 5 });
  out.push({ shape: 'circle', x: x - 26 * s, y: y - 6 * s, r: 12 * s, fill: '#2a211d' });
  out.push({ shape: 'circle', x: x + 46 * s, y: y - 32 * s, r: 11 * s, fill: '#2a211d' });
  out.push({ shape: 'circle', x, y: y + 22 * s, r: 13 * s, fill: '#e66a8f', stroke: true, sw: 4 });
  out.push({ shape: 'path', d: `M${x - 40 * s} ${y + 52 * s} Q${x} ${y + 82 * s} ${x + 40 * s} ${y + 52 * s}`, fill: 'none', stroke: true, sw: 5 });
  for (const k of [-28, 0, 28]) out.push({ shape: 'path', d: `M${x + k * s} ${y + (k ? 58 : 62) * s} l0 ${14 * s}`, fill: 'none', stroke: true, sw: 3 });
  if (o.helmet) out.push(...miniHelmet(x, y - 70 * s, 0.55 * s));
  return out;
}

/**
 * His knight's helmet on its own (visor up, red plume), e.g. hung on the bedpost.
 * @param {number} x middle @param {number} y bottom edge @param {number} [s] size (1 = fits a head) @returns {object[]} shape layers
 */
function miniHelmet(x, y, s = 1) {
  return [
    { shape: 'path', d: `M${x} ${y - 150 * s} C${x - 30 * s} ${y - 210 * s} ${x + 40 * s} ${y - 250 * s} ${x + 90 * s} ${y - 232 * s} C${x + 50 * s} ${y - 220 * s} ${x + 30 * s} ${y - 190 * s} ${x + 24 * s} ${y - 150 * s}Z`, fill: '#e8505b', stroke: true, sw: 5 },
    { shape: 'path', d: `M${x - 120 * s} ${y} C${x - 130 * s} ${y - 110 * s} ${x - 90 * s} ${y - 152 * s} ${x} ${y - 152 * s} C${x + 90 * s} ${y - 152 * s} ${x + 130 * s} ${y - 110 * s} ${x + 120 * s} ${y}Z`, fill: '#c9d3de', stroke: true, sw: 6 },
    { shape: 'rect', x: x - 90 * s, y: y - 92 * s, w: 180 * s, h: 26 * s, rx: 12 * s, fill: '#2b2f3a', stroke: true, sw: 4 },
    { shape: 'path', d: `M${x} ${y - 150 * s} L${x} ${y - 100 * s}`, fill: 'none', stroke: true, sw: 5 },
    { shape: 'ellipse', x: x - 50 * s, y: y - 120 * s, rx: 18 * s, ry: 10 * s, fill: '#ffffff', opacity: 0.6 },
  ];
}

export const STRIP = {
  id: 'strip1',
  title: 'comic.s1.title',
  panels: [
    {
      // 1. Night one of the ban. He sleeps (helmet on the bedpost, just in case); she lies awake. The plant watches.
      layout: 'wide',
      scene: {
        layers: [
          bedroom(1600, 900, { floorY: 640, windowX: 0.84, plant: true, plantX: 0.07 }),
          { art: 'bed', x: 800, y: 900, w: 1000 },
          ...miniHelmet(345, 262, 0.62),
          { id: 'him', art: 'husband', x: 560, y: 690, pose: 'lie', expr: 'sleepy', outfit: 'pajamas' },
          { id: 'her', art: 'heroine', x: 1040, y: 690, pose: 'lie', expr: 'sneaky', outfit: 'pajamas', look: -1 },
          { art: 'blanket', x: 800, y: 900, w: 1000, color: '#7b6ad8' },
        ],
      },
      camera: { move: 'pushIn', focus: [800, 430], amount: 0.06, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s1.p1.cap', at: [800, 56], w: 760 },
        { kind: 'whisper', key: 'comic.s1.p1.him', at: [180, 130], to: 'him', w: 280 },
        { kind: 'think', key: 'comic.s1.p1.her', at: [1340, 300], to: 'her', w: 380 },
      ],
    },
    {
      // 2. Under the duvet: a torch and one sheet of bubble wrap.
      layout: 'small',
      scene: {
        bg: ['#3a2f63', '#5a4a8a'],
        layers: [
          { shape: 'circle', x: 520, y: 300, r: 330, fill: '#fff3a8', opacity: 0.35 },
          { id: 'her', art: 'heroine', x: 270, y: 800, pose: 'point', expr: 'sneaky', outfit: 'pajamas', hold: 'torch', look: 1 },
          ...bubbleWrap(430, 470, 6, 2, 3),
          { shape: 'path', d: 'M0 0 L800 0 L800 70 Q600 150 400 110 Q200 150 0 70Z', fill: '#7b6ad8', stroke: true, sw: 6 },
          { shape: 'path', d: 'M120 0 q20 60 0 110 M560 0 q-20 70 10 120', fill: 'none', stroke: true, sw: 4, opacity: 0.3 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 330], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s1.p2.cap', at: [590, 62], w: 320 },
        { kind: 'whisper', key: 'comic.s1.p2.her', at: [630, 240], to: 'her', w: 270 },
      ],
    },
    {
      // 3. Outside the duvet: a glowing tent, a teeny "pop." He stirs.
      layout: 'small',
      scene: {
        layers: [
          bedroom(800, 600, { floorY: 460, windowX: 0.5 }),
          { art: 'bed', x: 400, y: 790, w: 760, scale: 0.85 },
          { id: 'him', art: 'husband', x: 225, y: 610, scale: 0.85, pose: 'lie', expr: 'grumpy', outfit: 'pajamas' },
          { art: 'heroine', x: 575, y: 610, scale: 0.85, pose: 'lie', expr: 'bliss', outfit: 'pajamas' },
          { id: 'tent', art: 'blanket', x: 400, y: 790, w: 760, scale: 0.85, color: '#7b6ad8', torch: 'right', mouth: [575, 360] },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_small',
      bubbles: [
        { kind: 'whisper', key: 'comic.s1.p3.pop', at: [710, 185], to: 'tent', w: 120 },
        { kind: 'say', key: 'comic.s1.p3.him', at: [190, 80], to: 'him', w: 300 },
        { kind: 'whisper', key: 'comic.s1.p3.her', at: [620, 60], to: 'tent', w: 260 },
      ],
    },
    {
      // 4. He asks in his sleep. For once, SHE says "No."
      layout: 'small',
      scene: {
        layers: [
          bedroom(800, 600, { floorY: 460, windowX: 0.75 }),
          { shape: 'rect', x: 40, y: 330, w: 520, h: 200, rx: 80, fill: '#fffaf2', stroke: true, sw: 6 },
          { id: 'him', art: 'husband', x: 300, y: 690, scale: 1.05, pose: 'bust', expr: 'sleepy', outfit: 'pajamas', look: 1 },
          { shape: 'circle', x: 820, y: 560, r: 260, fill: '#ffd25a', opacity: 0.35 },
          { shape: 'circle', x: 820, y: 560, r: 150, fill: '#fff3a8', opacity: 0.6 },
          { shape: 'path', d: 'M-10 600 L-10 520 Q300 470 600 500 Q700 420 810 400 L810 600Z', fill: '#7b6ad8', stroke: true, sw: 6 },
        ],
      },
      camera: { move: 'pushIn', focus: [300, 330], amount: 0.08, ms: 2500 },
      bubbles: [
        { kind: 'say', key: 'comic.s1.p4.him', at: [570, 100], to: 'him', w: 300 },
        { kind: 'whisper', key: 'comic.s1.p4.her', at: [690, 330], to: [760, 470], w: 150 },
        { kind: 'whisper', key: 'comic.s1.p4.him2', at: [120, 110], to: 'him', w: 180 },
      ],
    },
    {
      // 5. Night two: a better plan. Meet Decoy {name}.
      layout: 'small',
      scene: {
        layers: [
          bedroom(800, 600, { floorY: 470, windowX: 0.2 }),
          { id: 'her', art: 'heroine', x: 210, y: 570, scale: 0.95, pose: 'bust', expr: 'scheming', outfit: 'pajamas', look: 1 },
          ...sockPuppet(590, 360, 0.85, { body: true, id: 'sock' }),
          { art: 'sparkles', x: 450, y: 250, r: 60 },
          { art: 'sparkles', x: 730, y: 230, r: 60 },
        ],
      },
      camera: { move: 'pullOut', focus: [450, 320], amount: 0.1, ms: 2000 },
      sound: 'laugh_evil',
      bubbles: [
        { kind: 'caption', key: 'comic.s1.p5.cap', at: [200, 40], w: 360 },
        { kind: 'say', key: 'comic.s1.p5.her', at: [440, 150], to: 'her', w: 270 },
      ],
    },
    {
      // 6. The swap: Decoy {name} on her pillow "says" goodnight while she tiptoes out with the torch.
      layout: 'wide',
      scene: {
        layers: [
          bedroom(1600, 900, { floorY: 640, windowX: 0.5 }),
          { shape: 'rect', x: 1230, y: 150, w: 280, h: 500, fill: '#ffe9a8', stroke: true, sw: 6 },
          { shape: 'path', d: 'M1230 150 L1130 110 L1130 690 L1230 650Z', fill: '#8a6a3a', stroke: true, sw: 6 },
          { shape: 'circle', x: 1150, y: 410, r: 12, fill: '#ffd25a', stroke: true, sw: 4 },
          { art: 'bed', x: 560, y: 900, w: 900 },
          ...miniHelmet(160, 302, 0.55),
          { id: 'him', art: 'husband', x: 344, y: 690, pose: 'lie', expr: 'sleepy', outfit: 'pajamas' },
          ...sockPuppet(776, 440, 0.95, { id: 'sock' }),
          { art: 'blanket', x: 560, y: 900, w: 900, color: '#7b6ad8' },
          { id: 'her', art: 'heroine', x: 1370, y: 880, scale: 0.9, pose: 'point', expr: 'sneaky', outfit: 'pajamas', hold: 'torch', flip: true },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 3500 },
      bubbles: [
        { kind: 'whisper', key: 'comic.s1.p6.her', at: [1000, 120], to: 'sock', w: 340 },
        { kind: 'whisper', key: 'comic.s1.p6.him', at: [420, 130], to: 'him', w: 320 },
      ],
    },
    {
      // 7. Meanwhile, in the wardrobe: her secret stash of bubble wrap, popped by torchlight. Pure bliss.
      layout: 'square',
      scene: {
        bg: '#2b2340',
        layers: [
          { shape: 'rect', x: 60, y: 40, w: 880, h: 990, rx: 10, fill: '#5a3f2a', stroke: true, sw: 8 },
          { shape: 'circle', x: 520, y: 420, r: 380, fill: '#fff3a8', opacity: 0.3 },
          { shape: 'path', d: 'M60 170 L940 170', fill: 'none', stroke: '#c9d3de', sw: 12 },
          { shape: 'path', d: 'M110 175 L190 175 L230 520 L70 520Z', fill: '#e8735a', stroke: true, sw: 6 },
          { shape: 'path', d: 'M200 175 L280 175 L320 470 L160 470Z', fill: '#59b85f', stroke: true, sw: 6 },
          { shape: 'path', d: 'M760 175 L850 175 L900 560 L720 560Z', fill: '#6a7be6', stroke: true, sw: 6 },
          ...wrapRoll(170, 1000, 330),
          ...wrapRoll(840, 1000, 400),
          ...wrapRoll(300, 1000, 190),
          { id: 'her', art: 'heroine', x: 520, y: 1060, scale: 1.2, pose: 'pop', expr: 'bliss', outfit: 'pajamas', hold: 'torch' },
          ...bubbleWrap(350, 560, 7, 2, 9),
          { art: 'sparkles', x: 200, y: 330, r: 90 },
          { art: 'sparkles', x: 820, y: 660, r: 80 },
        ],
      },
      camera: { move: 'pushIn', focus: [520, 420], amount: 0.1, ms: 3000 },
      sound: 'pop_small',
      bubbles: [
        { kind: 'caption', key: 'comic.s1.p7.cap', at: [500, 60], w: 640 },
        { kind: 'whisper', key: 'comic.s1.p7.her', at: [790, 300], to: 'her', w: 300, sound: 'pop_small' },
      ],
    },
    {
      // 8. Visual surprise: he wakes, shines his phone at her pillow... and finds a sock.
      layout: 'small',
      scene: {
        layers: [
          bedroom(800, 600, { floorY: 460, windowX: 0.12 }),
          { shape: 'rect', x: 480, y: 370, w: 340, h: 160, rx: 70, fill: '#fffaf2', stroke: true, sw: 6 },
          { shape: 'path', d: 'M470 395 L800 140 L800 540 L470 440Z', fill: '#fff3a8', opacity: 0.45 },
          ...sockPuppet(640, 370, 0.8, { id: 'sock' }),
          { shape: 'path', d: 'M-10 600 L-10 500 Q400 450 810 500 L810 600Z', fill: '#7b6ad8', stroke: true, sw: 6 },
          { id: 'him', art: 'husband', x: 180, y: 790, pose: 'point', expr: 'shocked', outfit: 'pajamas', hold: 'phone' },
        ],
      },
      camera: { move: 'pushIn', focus: [620, 330], amount: 0.14, ms: 1200 },
      bubbles: [
        { kind: 'whisper', key: 'comic.s1.p8.him', at: [150, 55], to: 'him', w: 240 },
        { kind: 'shout', key: 'comic.s1.p8.shout', at: [585, 75], to: 'him', w: 340 },
      ],
    },
    {
      // 9. The big moment: caught in the wardrobe by his phone light, surrounded by bubble wrap.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 740, y: 560, colors: ['#2f2e63', '#3d3c72'] },
          { shape: 'rect', x: 470, y: 120, w: 520, h: 900, rx: 8, fill: '#5a3f2a', stroke: true, sw: 8 },
          { shape: 'path', d: 'M470 120 L390 70 L390 1000 L470 1000Z', fill: '#8a6a3a', stroke: true, sw: 6 },
          ...wrapRoll(560, 990, 330),
          ...wrapRoll(920, 990, 450),
          { id: 'her', art: 'heroine', x: 740, y: 1070, scale: 0.75, pose: 'shrug', expr: 'shocked', outfit: 'pajamas' },
          ...bubbleWrap(520, 900, 9, 2, 6),
          { shape: 'path', d: 'M430 775 L1000 440 L1000 1000 L430 820Z', fill: '#fff3a8', opacity: 0.35 },
          { id: 'him', art: 'husband', x: 220, y: 1070, scale: 0.75, pose: 'point', expr: 'grumpy', outfit: 'pajamas', hold: 'phone' },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_big',
      bubbles: [
        { kind: 'say', key: 'comic.s1.p9.her', at: [790, 80], to: 'her', w: 380 },
        { kind: 'say', key: 'comic.s1.p9.him', at: [225, 90], to: 'him', w: 400 },
        { kind: 'say', key: 'comic.s1.p9.her2', at: [790, 390], to: 'her', w: 320 },
        { kind: 'shout', key: 'comic.s1.p9.no', at: [220, 450], to: 'him', w: 180 },
      ],
    },
    {
      // 10. Button: night three. He sleeps in his helmet, wide awake; Decoy {name} guards him (in a tiny helmet).
      layout: 'tall',
      scene: {
        layers: [
          bedroom(900, 1200, { floorY: 760, windowX: 0.5, plant: true, plantX: 0.93 }),
          { art: 'bed', x: 450, y: 1190, w: 820 },
          ...sockPuppet(140, 470, 0.55, { body: true, helmet: true }),
          { id: 'him', art: 'husband', x: 253, y: 980, pose: 'lie', expr: 'grumpy', outfit: 'armor', visor: 'up' },
          { id: 'her', art: 'heroine', x: 647, y: 980, pose: 'lie', expr: 'sad', outfit: 'pajamas' },
          { art: 'blanket', x: 450, y: 1190, w: 820, color: '#7b6ad8' },
        ],
      },
      camera: { move: 'pullOut', focus: [450, 700], amount: 0.1, ms: 3000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s1.p10.cap', at: [450, 56], w: 400 },
        { kind: 'say', key: 'comic.s1.p10.her', at: [640, 320], to: 'her', w: 330 },
        { kind: 'say', key: 'comic.s1.p10.him', at: [420, 470], to: 'him', w: 130 },
        { kind: 'caption', key: 'comic.s1.p10.end', at: [450, 1140], w: 780 },
      ],
    },
  ],
};
