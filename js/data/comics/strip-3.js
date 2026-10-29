// Chapter 3 strip "The meeting" (T4.3b): {name} goes to a support group in the community hall. 10 panels.
// Beginning: the hall, Greta's welcome, Nils and Penny. Middle: the share circle, the talking sock, her confession,
// her big idea, silence. End: the group cheers (splash). Button: outside, her husband waits in his fanciest armor,
// wearing a hat Greta knitted him. Running gags: Greta's knitted gifts (cup cozy, talking sock, the plant's scarf,
// his hat); the plant; the armor gets fancier (two plumes). Visual surprise: in the silence, the knight peeks in
// at the window. Format: docs/COMIC-FORMAT.md.

/** The community hall filling a panel (the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const hall = (w, h, o = {}) => ({ art: 'room', kind: 'hall', w, h, plantScarf: '#e8505b', ...o });

/** A folding chair with someone sitting on it. @param {object} who the character layer (art, x, y, scale...) @param {string} [color] seat colour @returns {object[]} layers */
const seated = (who, color) => [{ art: 'chair', x: who.x, y: who.y, scale: who.scale, color }, { pose: 'sit', ...who }];

/** Her husband peeking in at the window in his armor, now with two plumes. @param {number} x middle @param {number} y chest @param {number} s scale @returns {object} layer */
const knightOutside = (x, y, s) => ({ art: 'husband', x, y, scale: s, pose: 'bust', outfit: 'armor', visor: 'down', plumes: 2 });

/**
 * A paper cup in a knitted cozy (Greta's first gift), with a wisp of steam.
 * @param {number} x middle @param {number} y bottom @param {number} s size @returns {object[]} shape layers
 */
function cupCozy(x, y, s) {
  // Turns a unit offset (dx, dy) into a point on the cup, scaled by s.
  const p = (dx, dy) => `${x + dx * s} ${y + dy * s}`;
  return [
    { shape: 'path', d: `M${p(-50, 0)} L${p(50, 0)} L${p(62, -130)} L${p(-62, -130)}Z`, fill: '#fff8ee', stroke: true, sw: 5 },
    { shape: 'path', d: `M${p(-54, -30)} L${p(54, -30)} L${p(60, -104)} L${p(-60, -104)}Z`, fill: '#f27eb2', stroke: true, sw: 5 },
    { shape: 'path', d: `M${p(-40, -36)} l0 ${-60 * s} M${p(-20, -36)} l0 ${-62 * s} M${p(0, -36)} l0 ${-62 * s} M${p(20, -36)} l0 ${-62 * s} M${p(40, -36)} l0 ${-60 * s}`, fill: 'none', stroke: '#c95a92', sw: 4 },
    { shape: 'circle', x: x + 30 * s, y: y - 68 * s, r: 12 * s, fill: '#ffe27a', stroke: true, sw: 3 },
    { shape: 'path', d: `M${p(-14, -150)} q-14 -26 0 -52 q14 -26 0 -52 M${p(18, -150)} q-14 -26 0 -52`, fill: 'none', stroke: '#ffffff', sw: 6, opacity: 0.9 },
  ];
}

/**
 * A big knitted striped sock (the group's "talking sock").
 * @param {number} x middle of the cuff @param {number} y the cuff's edge @param {number} s size
 * @param {boolean} [puppet] worn on a raised hand: cuff at the bottom (round the wrist), toe up (owner 2026-10-28)
 * @returns {object[]} shape layers
 */
function talkingSock(x, y, s, puppet = false) {
  // Turns a unit offset (dx, dy) into a point on the sock, scaled by s (upside down for the puppet).
  const p = (dx, dy) => `${x + dx * s} ${y + (puppet ? -dy : dy) * s}`;
  return [
    { shape: 'path', d: `M${p(-40, 0)} L${p(40, 0)} L${p(40, 150)} Q${p(46, 190)} ${p(90, 200)} L${p(130, 210)} Q${p(160, 240)} ${p(130, 266)} L${p(10, 260)} Q${p(-44, 250)} ${p(-40, 190)}Z`, fill: '#3fae8c', stroke: true, sw: 6 },
    { shape: 'path', d: `M${p(-40, 50)} L${p(40, 50)} M${p(-40, 100)} L${p(40, 100)} M${p(-40, 150)} L${p(40, 150)}`, fill: 'none', stroke: '#ffe27a', sw: 12 },
    { shape: 'rect', x: x - 48 * s, y: y - (puppet ? 24 : 10) * s, w: 96 * s, h: 34 * s, rx: 10 * s, fill: '#ffffff', stroke: true, sw: 5 },
    ...puppetFace(p, s), // the same face whether it is held or worn (owner 2026-10-28)
  ];
}

/**
 * The sock puppet's face on its toe (owner 2026-10-28: a fun talking sock): two googly eyes looking different ways
 * and a big open smile with a pink tongue.
 * @param {(dx: number, dy: number) => string} p the sock's point maker @param {number} s size @returns {object[]} shape layers
 */
function puppetFace(p, s) {
  /** A point as numbers. @param {number} dx @param {number} dy @returns {number[]} [x, y] */
  const n = (dx, dy) => p(dx, dy).split(' ').map(Number);
  const out = [];
  for (const [dx, dy, lx, ly] of [[40, 234, -9, 6], [88, 240, 9, -5]]) { // googly: the pupils point different ways
    const [ex, ey] = n(dx, dy);
    out.push({ shape: 'circle', x: ex, y: ey, r: 26 * s, fill: '#ffffff', stroke: true, sw: 4 });
    out.push({ shape: 'circle', x: ex + lx * s, y: ey + ly * s, r: 12 * s, fill: '#2a211d' });
  }
  // a wide open smile across the toe, with a pink tongue
  out.push({ shape: 'path', d: `M${p(96, 222)} Q${p(132, 176)} ${p(162, 236)} Q${p(128, 230)} ${p(96, 222)}Z`, fill: '#7a2a3a', stroke: true, sw: 4 });
  const [tx, ty] = n(130, 210);
  out.push({ shape: 'ellipse', x: tx, y: ty, rx: 14 * s, ry: 9 * s, fill: '#f28aa0' });
  return out;
}

/** A ball of yarn with a loose end. @param {number} x middle @param {number} y middle @param {number} r radius @param {string} fill colour @returns {object[]} shape layers */
const yarn = (x, y, r, fill) => [
  { shape: 'path', d: `M${x + r * 0.7} ${y + r * 0.7} q${r} ${r * 0.6} ${r * 1.6} ${-r * 0.2}`, fill: 'none', stroke: fill, sw: 5 },
  { shape: 'circle', x, y, r, fill, stroke: true, sw: 5 },
  { shape: 'path', d: `M${x - r * 0.8} ${y - r * 0.3} Q${x} ${y - r * 0.9} ${x + r * 0.8} ${y - r * 0.2} M${x - r * 0.9} ${y + r * 0.2} Q${x} ${y - r * 0.3} ${x + r * 0.9} ${y + r * 0.3} M${x - r * 0.6} ${y + r * 0.65} Q${x} ${y + r * 0.2} ${x + r * 0.6} ${y + r * 0.7}`, fill: 'none', stroke: '#ffffff', sw: 3, opacity: 0.6 },
];

/**
 * Greta's knitting in her lap: a growing pink piece with stitch rows, two needles sticking up out of its top edge in a
 * V (R8: crossed over the square it read as an envelope) and a yarn strand running off to a little ball beside her.
 * @param {number} x middle @param {number} y middle @returns {object[]} shape layers
 */
const knitting = (x, y) => [
  // the needles first, so the knitted piece covers their lower ends; a round knob on each tip
  { shape: 'path', d: `M${x - 14} ${y - 6} L${x - 62} ${y - 78} M${x + 14} ${y - 6} L${x + 62} ${y - 78}`, stroke: true, sw: 11 },
  { shape: 'path', d: `M${x - 14} ${y - 6} L${x - 62} ${y - 78} M${x + 14} ${y - 6} L${x + 62} ${y - 78}`, stroke: '#d9a066', sw: 6 },
  { shape: 'circle', x: x - 64, y: y - 82, r: 8, fill: '#6a7be6', stroke: true, sw: 3 },
  { shape: 'circle', x: x + 64, y: y - 82, r: 8, fill: '#6a7be6', stroke: true, sw: 3 },
  { shape: 'rect', x: x - 34, y: y - 18, w: 68, h: 44, rx: 6, fill: '#f27eb2', stroke: true, sw: 4 },
  // stitch rows: little Vs, like real knitting
  { shape: 'path', d: `M${x - 24} ${y - 6} l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 M${x - 24} ${y + 8} l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8`, stroke: '#c95a92', sw: 3 },
  // the yarn strand from the top corner, looping down to a small ball
  { shape: 'path', d: `M${x + 30} ${y - 14} Q${x + 80} ${y - 30} ${x + 82} ${y + 30}`, stroke: '#f27eb2', sw: 5 },
  ...yarn(x + 84, y + 46, 18, '#f27eb2'),
];

export const STRIP = {
  id: 'strip3',
  title: 'comic.s3.title',
  panels: [
    {
      // 1. The community hall: a circle of folding chairs, the coffee urn, the plant in a scarf. Greta waves her in.
      layout: 'wide',
      scene: {
        layers: [
          hall(1600, 900, { floorY: 620, windowX: 0.6, plantX: 0.05, boardX: 0.24 }),
          { art: 'urn', x: 1440, y: 760, scale: 0.85 },
          { art: 'chair', x: 700, y: 700, scale: 0.55, color: '#f0a43a' },
          { art: 'chair', x: 840, y: 700, scale: 0.55, color: '#6a7be6' },
          { art: 'chair', x: 980, y: 700, scale: 0.55, color: '#3fae8c' },
          { id: 'her', art: 'heroine', x: 300, y: 880, scale: 0.95, expr: 'shocked', look: 1 },
          { id: 'greta', art: 'greta', x: 1110, y: 870, pose: 'wave', expr: 'happy', flip: true },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s3.p1.cap', at: [800, 56], w: 900 },
        { kind: 'say', key: 'comic.s3.p1.her', at: [560, 230], to: 'her', w: 320 },
        { kind: 'say', key: 'comic.s3.p1.greta', at: [1300, 230], to: 'greta', w: 440 },
      ],
    },
    {
      // 2. Greta: knits. Gift number one: a cup cozy.
      layout: 'small',
      scene: {
        bg: ['#f4ecff', '#e2d6fb'],
        layers: [
          { id: 'greta', art: 'greta', x: 250, y: 640, scale: 1.1, pose: 'bust', expr: 'proud', look: 1 },
          ...cupCozy(580, 560, 1.3),
          { art: 'sparkles', x: 600, y: 360, r: 110 },
        ],
      },
      camera: { move: 'pushIn', focus: [560, 400], amount: 0.1, ms: 2200 },
      sound: 'ooh_happy',
      bubbles: [
        { kind: 'caption', key: 'comic.s3.p2.cap', at: [600, 44], w: 340 },
        { kind: 'say', key: 'comic.s3.p2.greta', at: [560, 170], to: 'greta', w: 400 },
      ],
    },
    {
      // 3. Nils (tall, beard) and Penny (short, pink hair) say hello. Odd hobbies, kind people.
      layout: 'small',
      scene: {
        layers: [
          hall(800, 600, { floorY: 540, windowX: 0.5, plant: false, board: false }),
          { id: 'nils', art: 'nils', x: 200, y: 640, scale: 0.95, pose: 'bust', expr: 'neutral', look: 1 },
          { id: 'penny', art: 'penny', x: 600, y: 640, scale: 1.05, pose: 'bust', expr: 'happy', flip: true },
        ],
      },
      camera: { move: 'panRight', focus: [400, 300], amount: 0.1, ms: 2400 },
      bubbles: [
        { kind: 'say', key: 'comic.s3.p3.nils', at: [230, 70], to: 'nils', w: 380 },
        { kind: 'say', key: 'comic.s3.p3.penny', at: [600, 190], to: 'penny', w: 330 },
      ],
    },
    {
      // 4. The share circle. Greta knits, {name} hopes nobody looks at her.
      layout: 'wide',
      scene: {
        layers: [
          hall(1600, 900, { floorY: 600, windowX: 0.5, plantX: 0.95, boardX: 0.2 }),
          ...seated({ id: 'nils', art: 'nils', x: 230, y: 870, scale: 0.8, expr: 'neutral', look: 1 }, '#6a7be6'),
          ...seated({ id: 'greta', art: 'greta', x: 610, y: 870, scale: 0.8, expr: 'happy', look: 1 }, '#f0a43a'),
          ...knitting(610, 800),
          ...seated({ id: 'her', art: 'heroine', x: 990, y: 870, scale: 0.8, expr: 'shocked', look: -1 }, '#3fae8c'),
          ...seated({ id: 'penny', art: 'penny', x: 1370, y: 870, scale: 0.8, expr: 'happy', look: -1 }, '#e66a8f'),
        ],
      },
      camera: { move: 'pushIn', focus: [990, 520], amount: 0.1, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s3.p4.cap', at: [230, 50], w: 360 },
        { kind: 'say', key: 'comic.s3.p4.greta', at: [560, 210], to: 'greta', w: 360 },
        { kind: 'think', key: 'comic.s3.p4.her', at: [1150, 200], to: 'her', w: 340 },
      ],
    },
    {
      // 5. Penny passes her the talking sock. Greta knitted that too.
      layout: 'small',
      scene: {
        bg: ['#fff6d8', '#ffe8b0'],
        layers: [
          { id: 'penny', art: 'penny', x: 190, y: 640, scale: 1.2, pose: 'bust', expr: 'happy', look: 1 },
          // Penny holds the sock out by its cuff (owner 2026-10-28: it floated with nobody holding it).
          ...talkingSock(380, 340, 0.7),
          { shape: 'path', d: 'M296 600 Q366 520 376 364', fill: 'none', stroke: true, sw: 40 },
          { shape: 'path', d: 'M296 600 Q366 520 376 364', fill: 'none', stroke: '#62402e', sw: 30 },
          { shape: 'circle', x: 378, y: 354, r: 24, fill: '#62402e', stroke: true, sw: 5 },
          { id: 'her', art: 'heroine', x: 640, y: 640, scale: 0.95, pose: 'bust', expr: 'shocked', flip: true },
        ],
      },
      camera: { move: 'pushIn', focus: [420, 380], amount: 0.1, ms: 2000 },
      bubbles: [
        { kind: 'say', key: 'comic.s3.p5.penny', at: [230, 80], to: 'penny', w: 380 },
        { kind: 'whisper', key: 'comic.s3.p5.her', at: [640, 120], to: 'her', w: 260 },
      ],
    },
    {
      // 6. She stands up, very nervous, the talking sock in her raised hand (R8: it no longer vanishes). The group answers as one.
      layout: 'small',
      scene: {
        layers: [
          hall(800, 600, { floorY: 520, windowX: 0.82, plant: false, board: false }),
          { art: 'chair', x: 330, y: 600, scale: 0.72, color: '#3fae8c' },
          { id: 'her', art: 'heroine', x: 330, y: 610, scale: 0.75, pose: 'wave', expr: 'shocked' },
          // the sock worn like a puppet on her raised hand, over it (owner 2026-10-28: it sat behind her hand)
          ...talkingSock(468, 290, 0.62, true),
        ],
      },
      camera: { move: 'pushIn', focus: [330, 240], amount: 0.12, ms: 2200 },
      bubbles: [
        { kind: 'say', key: 'comic.s3.p6.her', at: [190, 90], to: 'her', w: 330 },
        { kind: 'say', key: 'comic.s3.p6.group', at: [640, 400], to: [800, 560], w: 230 },
      ],
    },
    {
      // 7. The big idea. The happy hands are back.
      layout: 'square',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 500, y: 520, colors: ['#ffd8e6', '#ffbcd2'] },
          { id: 'her', art: 'heroine', x: 500, y: 1200, scale: 1.15, pose: 'pop', expr: 'bliss' },
          { art: 'sparkles', x: 500, y: 560, r: 300 },
        ],
      },
      camera: { move: 'pushIn', focus: [500, 450], amount: 0.1, ms: 2500 },
      bubbles: [{ kind: 'shout', key: 'comic.s3.p7.her', at: [500, 140], to: 'her', w: 760, sound: 'pop_small' }],
    },
    {
      // 8. Silence. Everyone frozen, the knitting drops. Surprise: a knight with two plumes peeks in at the window.
      layout: 'wide',
      scene: {
        layers: [
          hall(1600, 900, { floorY: 600, windowX: 0.5, plantX: 0.95, boardX: 0.2, outside: [knightOutside(800, 410, 0.6)] }),
          ...seated({ id: 'nils', art: 'nils', x: 230, y: 870, scale: 0.8, expr: 'shocked', look: 1 }, '#6a7be6'),
          ...seated({ id: 'greta', art: 'greta', x: 610, y: 870, scale: 0.8, expr: 'shocked', look: 1 }, '#f0a43a'),
          ...yarn(720, 860, 30, '#f27eb2'),
          { art: 'chair', x: 990, y: 870, scale: 0.8, color: '#3fae8c' },
          { id: 'her', art: 'heroine', x: 1000, y: 880, scale: 0.8, expr: 'shocked' },
          ...seated({ id: 'penny', art: 'penny', x: 1370, y: 870, scale: 0.8, expr: 'shocked', look: -1 }, '#e66a8f'),
        ],
      },
      camera: { move: 'pushIn', focus: [800, 280], amount: 0.12, ms: 4000 },
      bubbles: [{ kind: 'caption', key: 'comic.s3.p8.cap', at: [300, 60], w: 520 }],
    },
    {
      // 9. The big moment: the whole group cheers. Yarn balls fly.
      layout: 'splash',
      scene: {
        bg: '#ffe9a8',
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 500, y: 300, colors: ['#ffe9a8', '#ffd25a'] },
          { art: 'burst', x: 380, y: 125, r: 160, color: '#ff9cbc' },
          ...yarn(140, 330, 34, '#f27eb2'),
          ...yarn(930, 640, 28, '#6a7be6'),
          ...yarn(80, 120, 24, '#3fae8c'),
          { id: 'nils', art: 'nils', x: 860, y: 1210, scale: 0.75, pose: 'cheer', expr: 'bliss' },
          { id: 'greta', art: 'greta', x: 140, y: 1210, scale: 0.8, pose: 'cheer', expr: 'happy' },
          { id: 'penny', art: 'penny', x: 380, y: 1210, scale: 0.85, pose: 'cheer', expr: 'bliss' },
          { id: 'her', art: 'heroine', x: 630, y: 1210, scale: 0.85, pose: 'cheer', expr: 'bliss' },
          { art: 'sparkles', x: 630, y: 640, r: 150 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'cheer',
      bubbles: [
        { kind: 'shout', key: 'comic.s3.p9.yes', at: [380, 125] },
        { kind: 'say', key: 'comic.s3.p9.penny', at: [250, 400], to: 'penny', w: 220 },
        { kind: 'say', key: 'comic.s3.p9.nils', at: [800, 150], to: 'nils', w: 260 },
      ],
    },
    {
      // 10. Button: outside, her husband has waited in his fanciest armor yet, now in a hat Greta knitted. Socks are next.
      layout: 'tall',
      scene: {
        bg: ['#ffb88a', '#ffe0b0'],
        layers: [
          { shape: 'rect', x: 0, y: 330, w: 900, h: 700, fill: '#cfe2bf', stroke: true, sw: 6 },
          { shape: 'rect', x: 640, y: 560, w: 240, h: 460, rx: 10, fill: '#fff6d8', stroke: true, sw: 6 },
          { shape: 'rect', x: 40, y: 400, w: 200, h: 150, rx: 8, fill: '#fff3a8', stroke: true, sw: 6 },
          { shape: 'rect', x: 0, y: 1010, w: 900, h: 190, fill: '#9aa6b4', stroke: true, sw: 6 },
          { id: 'greta', art: 'greta', x: 760, y: 1010, scale: 0.65, pose: 'wave', expr: 'happy', flip: true },
          // R8: a little lower (his feet are behind the caption anyway), so on a landscape phone his bubble clears the hat
          { id: 'him', art: 'husband', x: 220, y: 1250, outfit: 'armor', plumes: 2, cozy: '#f27eb2', expr: 'proud', pose: 'hips' },
          { id: 'her', art: 'heroine', x: 490, y: 1120, scale: 0.9, pose: 'cheer', expr: 'bliss', look: -1 },
        ],
      },
      camera: { move: 'pullOut', focus: [450, 700], amount: 0.1, ms: 3500 },
      bubbles: [
        // R8: both bubbles hug the top, so on a landscape phone (where his bubble has to make room below hers) it
        // still ends above his knitted hat instead of covering it.
        { kind: 'say', key: 'comic.s3.p10.her', at: [670, 100], to: 'her', w: 380 },
        { kind: 'say', key: 'comic.s3.p10.him', at: [190, 120], to: 'him', w: 330 },
        { kind: 'caption', key: 'comic.s3.p10.end', at: [450, 1150], w: 780, sound: 'pop_small' },
      ],
    },
  ],
};
