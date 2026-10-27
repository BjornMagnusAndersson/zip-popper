// Chapter 0 strip "Happy hands" (T4.2): how the Great Popping Ban began. 11 panels, played in two parts (see PANELS).
// Beginning: {name} pops everything (bubble wrap, then a week-long montage: balloons, peas, his football).
// Middle: she spots a teeny bump on his chin, the happy hands come, POP. End: the Great Popping Ban, rule by rule.
// Button: that very night, a torch glows under the blanket. Running gag: everything she asks, he answers "No."
// Visual surprise: the rule scroll, one rule per tap. Format: docs/COMIC-FORMAT.md.

/** The living room filling a panel. @param {number} w panel width @param {number} h panel height @param {object} [o] room options @returns {object} layer */
const living = (w, h, o = {}) => ({ art: 'room', kind: 'living', w, h, ...o });

/**
 * A strip of bubble wrap lying flat: a see-through sheet with rows of bubbles, some already popped (flat).
 * @param {number} x left edge @param {number} y top edge @param {number} cols bubbles across @param {number} rows bubbles down
 * @param {number} popped how many columns from the left are popped @returns {object[]} shape layers
 */
function bubbleWrap(x, y, cols, rows, popped) {
  const out = [{ shape: 'rect', x, y, w: cols * 46 + 14, h: rows * 46 + 14, rx: 10, fill: '#dff3ff', stroke: true, sw: 5, opacity: 0.9 }];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const cx = x + 30 + c * 46;
      const cy = y + 30 + r * 46;
      out.push(c < popped
        ? { shape: 'ellipse', x: cx, y: cy + 8, rx: 17, ry: 5, fill: '#b9dcf0', stroke: '#7fb2cf', sw: 3 }
        : { shape: 'circle', x: cx, y: cy, r: 17, fill: '#f4fbff', stroke: '#7fb2cf', sw: 3 });
    }
  }
  return out;
}

/** A balloon on a string. @param {number} x middle @param {number} y middle @param {string} fill colour @returns {object[]} shape layers */
const balloon = (x, y, fill) => [
  { shape: 'path', d: `M${x} ${y + 70} q-20 60 10 120 q20 50 -5 110`, fill: 'none', stroke: true, sw: 4 },
  { shape: 'ellipse', x, y, rx: 58, ry: 70, fill, stroke: true, sw: 6 },
  { shape: 'ellipse', x: x - 20, y: y - 26, rx: 12, ry: 20, fill: '#ffffff', opacity: 0.6 },
];

// SPEC D32a (owner, 2026-10-27): the strip is played in two parts around the husband round, so the first pop happens
// in play and the ban comes after it: STRIP = panels 1 to 7 (up to "Not the happy hands!"), then the round, then
// STRIP_BAN = panels 9 to 11 (the ban, "No.", that very night). Panel 8 (the POP splash) is kept here but not played:
// the round is the pop now.
const PANELS = [
    {
      // 1. Meet {name}: popping bubble wrap with joy. He watches TV with the patience of a saint.
      layout: 'wide',
      scene: {
        layers: [
          living(1600, 900, { floorY: 640, windowX: 0.62, pictureX: 0.2 }),
          { art: 'sofa', x: 1100, y: 840, w: 760 },
          { id: 'him', art: 'husband', x: 1060, y: 840, pose: 'sit', expr: 'grumpy', hold: 'remote', look: -1 },
          ...bubbleWrap(120, 724, 13, 2, 7),
          { id: 'her', art: 'heroine', x: 420, y: 800, pose: 'pop', expr: 'bliss' },
          { art: 'sparkles', x: 440, y: 300, r: 190 },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p1.cap', at: [440, 60], w: 760 },
        { kind: 'say', key: 'comic.s0.p1.her', at: [760, 250], to: 'her', w: 300, sound: 'pop_small' },
        { kind: 'say', key: 'comic.s0.p1.him', at: [1320, 200], to: 'him', w: 460 },
      ],
    },
    {
      // 2. Montage, Monday: balloons.
      layout: 'small',
      scene: {
        bg: ['#d8f0ff', '#bfe4fb'],
        layers: [
          ...balloon(600, 150, '#6a7be6'),
          ...balloon(720, 240, '#ffd25a'),
          { art: 'burst', x: 520, y: 330, r: 100, color: '#ff9cbc' },
          { id: 'her', art: 'heroine', x: 250, y: 640, scale: 1.1, pose: 'bust', expr: 'bliss', look: 1 },
        ],
      },
      camera: { move: 'pullOut', focus: [400, 300], amount: 0.12, ms: 1800 },
      sound: 'pop_big',
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p2.cap', at: [230, 46], w: 360 },
        { kind: 'shout', key: 'comic.s0.p2.pop', at: [520, 330], w: 200 },
      ],
    },
    {
      // 3. Montage, Tuesday: peas, one by one, flying out of the pod.
      layout: 'small',
      scene: {
        bg: ['#eaf8dc', '#d2efbf'],
        layers: [
          { shape: 'path', d: 'M50 470 Q190 350 370 380 Q240 400 50 470Z', fill: '#9ad66e', stroke: true, sw: 5 },
          { shape: 'path', d: 'M50 470 Q200 410 370 380 Q240 540 50 470Z', fill: '#6fbf4c', stroke: true, sw: 6 },
          { shape: 'circle', x: 150, y: 440, r: 24, fill: '#8fd862', stroke: true, sw: 4 },
          { shape: 'circle', x: 205, y: 424, r: 24, fill: '#8fd862', stroke: true, sw: 4 },
          { shape: 'path', d: 'M270 360 q40 -80 100 -110 M300 390 q70 -40 130 -30', fill: 'none', stroke: '#5a9a40', sw: 5, opacity: 0.6 },
          { shape: 'circle', x: 390, y: 235, r: 26, fill: '#8fd862', stroke: true, sw: 5 },
          { shape: 'circle', x: 405, y: 400, r: 26, fill: '#8fd862', stroke: true, sw: 5 },
          { art: 'sparkles', x: 430, y: 290, r: 70 },
          { id: 'her', art: 'heroine', x: 600, y: 640, scale: 1.1, pose: 'bust', expr: 'happy', look: -1 },
        ],
      },
      camera: { move: 'panLeft', focus: [400, 300], amount: 0.12, ms: 2200 },
      sound: 'pop_small',
      bubbles: [{ kind: 'caption', key: 'comic.s0.p3.cap', at: [250, 46], w: 400 }],
    },
    {
      // 4. Montage, Wednesday: his football. He is sad about it.
      layout: 'small',
      scene: {
        bg: ['#ffe8d6', '#f7c9b0'],
        layers: [
          { shape: 'ellipse', x: 200, y: 520, rx: 130, ry: 38, fill: '#ffffff', stroke: true, sw: 6 },
          { shape: 'ellipse', x: 200, y: 512, rx: 30, ry: 12, fill: '#2a211d' },
          { shape: 'ellipse', x: 110, y: 524, rx: 20, ry: 9, fill: '#2a211d' },
          { shape: 'ellipse', x: 290, y: 524, rx: 20, ry: 9, fill: '#2a211d' },
          { shape: 'path', d: 'M330 480 l40 -30 M340 505 l50 -10 M80 470 l-30 -30', fill: 'none', stroke: true, sw: 4 },
          { id: 'him', art: 'husband', x: 560, y: 640, scale: 1.1, pose: 'bust', expr: 'sad', flip: true },
        ],
      },
      camera: { move: 'shake' },
      sound: 'squish',
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p4.cap', at: [260, 46], w: 420 },
        { kind: 'say', key: 'comic.s0.p4.him', at: [200, 270], to: 'him', w: 260 },
      ],
    },
    {
      // 5. Thursday: she spots a teeny bump on his chin. He knows where this goes.
      layout: 'wide',
      scene: {
        layers: [
          living(1600, 900, { floorY: 640, windowX: 0.62, pictureX: 0.2 }),
          { art: 'sofa', x: 1100, y: 840, w: 760 },
          { id: 'him', art: 'husband', x: 1060, y: 840, pose: 'sit', expr: 'neutral', hold: 'remote', look: -1 },
          { shape: 'circle', x: 1078, y: 522, r: 13, fill: '#ff9cb5', stroke: true, sw: 3 },
          { art: 'sparkles', x: 1085, y: 515, r: 60 },
          { id: 'her', art: 'heroine', x: 470, y: 870, pose: 'point', expr: 'happy' },
        ],
      },
      camera: { move: 'pushIn', focus: [1050, 470], amount: 0.1, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p5.cap', at: [170, 56], w: 260 },
        { kind: 'say', key: 'comic.s0.p5.her', at: [790, 150], to: 'her', w: 400 },
        { kind: 'say', key: 'comic.s0.p5.him', at: [1340, 220], to: 'him', w: 200 },
      ],
    },
    {
      // 6. The happy hands come out.
      layout: 'small',
      scene: { layers: [{ art: 'rays', w: 800, h: 600, x: 400, y: 300, colors: ['#ffd8e6', '#ffbcd2'] },
        { id: 'her', art: 'heroine', x: 360, y: 640, scale: 0.9, pose: 'pop', expr: 'scheming' }] },
      camera: { move: 'pushIn', focus: [360, 250], amount: 0.1, ms: 2000 },
      sound: 'laugh_evil',
      bubbles: [{ kind: 'whisper', key: 'comic.s0.p6.her', at: [650, 90], to: 'her', w: 260 }],
    },
    {
      // 7. He knows that look. A fast dramatic zoom.
      layout: 'small',
      scene: { layers: [living(800, 600, { floorY: 520, windowX: 0.18, picture: false, plant: false, lamp: false }),
        { id: 'him', art: 'husband', x: 530, y: 640, scale: 1.25, pose: 'bust', expr: 'shocked', flip: true }] },
      camera: { move: 'pushIn', focus: [530, 300], amount: 0.16, ms: 700 },
      bubbles: [{ kind: 'shout', key: 'comic.s0.p7.him', at: [210, 130], to: 'him', w: 300 }],
    },
    {
      // 8. The big moment: POP!
      layout: 'splash',
      scene: {
        bg: '#ffe9a8',
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 330, y: 260, colors: ['#ffe9a8', '#ffd25a'] },
          { art: 'burst', x: 300, y: 240, r: 210, color: '#ff9cbc' },
          { id: 'him', art: 'husband', x: 300, y: 1000, pose: 'chin', expr: 'shocked' },
          { art: 'sparkles', x: 330, y: 560, r: 100 },
          { id: 'her', art: 'heroine', x: 720, y: 1000, pose: 'cheer', expr: 'bliss' },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_big',
      bubbles: [
        { kind: 'shout', key: 'comic.s0.p8.pop', at: [300, 240] },
        { kind: 'say', key: 'comic.s0.p8.her', at: [760, 170], to: 'her', w: 380, sound: 'ooh_happy' },
      ],
    },
    {
      // 9. The Great Popping Ban: a rule scroll unrolls, one rule per tap.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 780, y: 520, colors: ['#d6e6ff', '#b8d2ff'] },
          { shape: 'rect', x: 45, y: 220, w: 590, h: 720, rx: 12, fill: '#fff4d6', stroke: true, sw: 6 },
          { shape: 'rect', x: 25, y: 200, w: 630, h: 44, rx: 22, fill: '#f3dca8', stroke: true, sw: 6 },
          { shape: 'rect', x: 25, y: 920, w: 630, h: 44, rx: 22, fill: '#f3dca8', stroke: true, sw: 6 },
          { id: 'him', art: 'husband', x: 830, y: 1000, scale: 0.9, pose: 'hips', expr: 'proud' },
        ],
      },
      camera: { move: 'pullOut', focus: [500, 450], amount: 0.15, ms: 2500 },
      sound: 'cheer',
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p9.cap', at: [290, 90], w: 520 },
        { kind: 'caption', key: 'comic.s0.p9.r1', at: [310, 420], w: 500 },
        { kind: 'caption', key: 'comic.s0.p9.r2', at: [310, 600], w: 500 },
        { kind: 'caption', key: 'comic.s0.p9.r3', at: [310, 780], w: 500, sound: 'pop_small' },
        { kind: 'say', key: 'comic.s0.p9.him', at: [840, 215], to: 'him', w: 250 },
      ],
    },
    {
      // 10. She tries her luck. Running gag: "No."
      layout: 'small',
      scene: { layers: [living(800, 600, { floorY: 520, windowX: 0.5, picture: false, plant: false, lamp: false }),
        { id: 'her', art: 'heroine', x: 210, y: 640, scale: 0.95, pose: 'bust', expr: 'sad', look: 1 },
        { id: 'him', art: 'husband', x: 565, y: 640, scale: 0.95, pose: 'bust', expr: 'proud', flip: true }] },
      camera: { move: 'panRight', focus: [400, 300], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'think', key: 'comic.s0.p10.her', at: [230, 90], to: 'her', w: 320 },
        { kind: 'say', key: 'comic.s0.p10.him', at: [740, 250], to: 'him', w: 150 },
      ],
    },
    {
      // 11. That very night: a torch glows under the blanket. He mumbles "no" in his sleep.
      layout: 'tall',
      scene: {
        layers: [
          { art: 'room', kind: 'bedroom', w: 900, h: 1200, floorY: 760, windowX: 0.5 },
          { art: 'bed', x: 450, y: 1190, w: 820 },
          { id: 'him', art: 'husband', x: 253, y: 980, pose: 'lie', expr: 'sleepy' },
          { art: 'heroine', x: 647, y: 980, pose: 'lie', expr: 'sneaky' },
          { art: 'blanket', x: 450, y: 1190, w: 820, torch: 'right' },
        ],
      },
      camera: { move: 'pushIn', focus: [647, 700], amount: 0.08, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s0.p11.cap', at: [450, 56], w: 600 },
        { kind: 'whisper', key: 'comic.s0.p11.her', at: [600, 420], to: [680, 690], w: 400, sound: 'pop_small' },
        { kind: 'whisper', key: 'comic.s0.p11.him', at: [230, 560], to: 'him', w: 260 },
        { kind: 'caption', key: 'comic.s0.p11.end', at: [450, 1140], w: 780 },
      ],
    },
];

/** Part 1 (chapter 0's opening strip): panels 1 to 7, up to the moment before the pop. */
export const STRIP = { id: 'strip0', title: 'comic.s0.title', panels: PANELS.slice(0, 7) };

/** Part 2 (after the husband round, SPEC D32a): panels 9 to 11, the Great Popping Ban and that very night. */
export const STRIP_BAN = { id: 'strip0b', title: 'comic.s0b.title', panels: PANELS.slice(8) };
