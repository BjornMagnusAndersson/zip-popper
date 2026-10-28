// Milestone strip "Fix the leak": shown when the player buys the studio upgrade "Fix the leak" in the shop. 5 panels.
// Beginning: "Plink." The old ceiling pipe joint drips into the bucket; {name} holds up a shiny new pipe joint.
// Middle: her husband, in his fanciest armor yet (six plumes, Greta's knitted hat, the purple cape and now a plumber's
// tool belt with a giant wrench and a plunger), climbs the stepladder: "This is a job for a knight!" The ladder bows and
// creaks under all that steel. They swap: she climbs, he holds the ladder, "Steady as a castle!" Visual surprise: from
// the top she spots a gap between his helmet and his collar, and in it a little bump (the zoom circle). "Hold still,
// dear..." Button: he looks up just as the last drip falls on him, "Plink!", and jumps: "Leak: fixed. Husband: still
// unpopped." Running gags: the armor ladder, he always escapes being popped. Format: docs/COMIC-FORMAT.md.

/** Her tier-0 studio by day (the plant in Greta's scarf), with the room's sagging-ceiling leak off: here the leak is the pipe. @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', leak: false, lamp: false, ...o });

/** Her husband in his fanciest armor yet: six plumes and Greta's knitted hat (cape and tool belt are separate layers). @param {number} x @param {number} y @param {number} s scale @param {object} [o] more options @returns {object} layer */
const knight = (x, y, s, o = {}) => ({ id: 'him', art: 'husband', x, y, scale: s, outfit: 'armor', visor: 'up', plumes: 6, cozy: '#f27eb2', ...o });

/** The ladder, the same one in every panel. @param {number} x middle @param {number} y floor @param {number} s scale @param {object} [o] more options (bend, creak, wobble) @returns {object} layer */
const stepladder = (x, y, s, o = {}) => ({ art: 'ladder', x, y, scale: s, h: 620, w: 220, steps: 4, ...o });

/** Where a figure stands on the ladder's top step. @param {number} y ladder floor @param {number} s ladder scale @returns {number} y of the top step */
const topStep = (y, s) => y - (620 + 26) * s;

/**
 * His cape from strip "books" (purple with gold trim and little hearts), worn behind him.
 * @param {number} x his floor x @param {number} y his floor y @param {number} s his scale @returns {object[]} shape layers
 */
const cape = (x, y, s) => [
  { shape: 'path', d: `M${x - 120 * s} ${y - 380 * s} L${x + 120 * s} ${y - 380 * s} Q${x + 200 * s} ${y - 160 * s} ${x + 250 * s} ${y - 30 * s} Q${x} ${y + 10 * s} ${x - 250 * s} ${y - 30 * s} Q${x - 200 * s} ${y - 160 * s} ${x - 120 * s} ${y - 380 * s}Z`, fill: '#8e5bd0', stroke: true, sw: 6 },
  { shape: 'path', d: `M${x - 244 * s} ${y - 44 * s} Q${x} ${y - 6 * s} ${x + 244 * s} ${y - 44 * s}`, fill: 'none', stroke: '#ffd25a', sw: 10 },
  ...[[-180, -90], [190, -110]].map(([dx, dy]) => ({ shape: 'path', d: `M${x + dx * s} ${y + dy * s} c-10 -13 -28 0 0 18 c28 -18 10 -31 0 -18Z`, fill: '#ffd8e6', stroke: true, sw: 3 })),
];

/**
 * The new silly touch on his armor: a plumber's tool belt over the steel, with two pouches, a giant golden wrench on
 * one hip and a plunger on the other (all that extra metal is why the ladder bends). Drawn over him.
 * @param {number} x his floor x @param {number} y his floor y @param {number} s his scale @returns {object[]} shape layers
 */
function toolBelt(x, y, s) {
  /** A belt x in his own units to panel units. @param {number} u @returns {number} */
  const X = (u) => x + u * s;
  /** A belt y in his own units to panel units. @param {number} v @returns {number} */
  const Y = (v) => y + v * s;
  return [
    { shape: 'rect', x: X(-118), y: Y(-186), w: 236 * s, h: 22 * s, rx: 8 * s, fill: '#5a3a22', stroke: true, sw: 4 },
    ...[-60, 34].map((u) => ({ shape: 'rect', x: X(u), y: Y(-170), w: 30 * s, h: 44 * s, rx: 6 * s, fill: '#7a5232', stroke: true, sw: 4 })),
    // The plunger hangs on his right hip (viewer's left): wooden handle, red rubber cup.
    { shape: 'rect', x: X(-138), y: Y(-196), w: 14 * s, h: 120 * s, rx: 6 * s, fill: '#c98f52', stroke: true, sw: 3.5 },
    { shape: 'path', d: `M${X(-170)} ${Y(-40)} Q${X(-131)} ${Y(-110)} ${X(-92)} ${Y(-40)}Z`, fill: '#e8505b', stroke: true, sw: 4 },
    // The giant golden wrench on the other hip, jaw down.
    { shape: 'rect', x: X(122), y: Y(-200), w: 22 * s, h: 150 * s, rx: 9 * s, fill: '#ffd25a', stroke: true, sw: 4 },
    { shape: 'path', d: `M${X(108)} ${Y(-60)} L${X(158)} ${Y(-60)} L${X(166)} ${Y(-14)} L${X(146)} ${Y(-14)} L${X(142)} ${Y(-38)} L${X(124)} ${Y(-38)} L${X(120)} ${Y(-14)} L${X(100)} ${Y(-14)}Z`, fill: '#ffd25a', stroke: true, sw: 4 },
    { shape: 'path', d: `M${X(128)} ${Y(-186)} L${X(128)} ${Y(-80)}`, fill: 'none', stroke: '#ffffff', sw: 3, opacity: 0.7 },
  ];
}

/**
 * The glint in her eyes: two tiny white four-point stars.
 * @param {number} x middle between her eyes @param {number} y eye height @param {number} k size @returns {object[]} shape layers
 */
const glint = (x, y, k) => [-1, 1].map((sx) => {
  const cx = x + sx * 46 * k;
  const q = 16 * k;
  return { shape: 'path', d: `M${cx} ${y - q} L${cx + q * 0.25} ${y - q * 0.25} L${cx + q} ${y} L${cx + q * 0.25} ${y + q * 0.25} L${cx} ${y + q} L${cx - q * 0.25} ${y + q * 0.25} L${cx - q} ${y} L${cx - q * 0.25} ${y - q * 0.25}Z`, fill: '#ffffff', stroke: true, sw: 3 };
});

/**
 * The visual surprise, a zoom circle of the back of his neck seen from the ladder: the bottom of the helmet, a strip of
 * neck with a little pink bump, and the top of his steel collar. A dotted line runs back to his neck.
 * @param {number} cx circle middle x @param {number} cy circle middle y @param {number} R radius @param {number[]} from his neck point
 * @returns {object[]} shape layers
 */
function neckZoom(cx, cy, R, from) {
  const top = cy - R * 0.22;
  const bot = cy + R * 0.34;
  const dt = Math.sqrt(R * R - (top - cy) ** 2);
  const db = Math.sqrt(R * R - (bot - cy) ** 2);
  const bx = cx + R * 0.12;
  const by = (top + bot) / 2 + 4;
  return [
    { shape: 'path', d: `M${from[0]} ${from[1]} L${cx - R * 0.92} ${cy + R * 0.3}`, fill: 'none', stroke: '#ffffff', sw: 7, opacity: 0.9 },
    { shape: 'path', d: `M${from[0]} ${from[1]} L${cx - R * 0.92} ${cy + R * 0.3}`, fill: 'none', stroke: true, sw: 3 },
    { shape: 'circle', x: cx, y: cy, r: R, fill: '#d29a6c' },
    // The helmet's bottom edge (with rivets) and the collar (with a rim), both cut to the circle.
    { shape: 'path', d: `M${cx - dt} ${top} A${R} ${R} 0 0 1 ${cx + dt} ${top}Z`, fill: '#c9d3de', stroke: true, sw: 5 },
    { shape: 'rect', x: cx - dt + 10, y: top - 26, w: dt * 2 - 20, h: 14, rx: 7, fill: '#ffffff', opacity: 0.5 },
    ...[-0.6, -0.2, 0.2, 0.6].map((f) => ({ shape: 'circle', x: cx + f * R, y: top - 44, r: 8, fill: '#8a96a6', stroke: true, sw: 2.5 })),
    { shape: 'path', d: `M${cx - db} ${bot} A${R} ${R} 0 0 0 ${cx + db} ${bot}Z`, fill: '#c9d3de', stroke: true, sw: 5 },
    { shape: 'path', d: `M${cx - db + 16} ${bot + 22} L${cx + db - 16} ${bot + 22}`, fill: 'none', stroke: true, sw: 4, opacity: 0.6 },
    // A few neck hairs and the little bump: pink, round and shiny (cartoon only).
    { shape: 'path', d: `M${cx - R * 0.55} ${top + 14} l-6 16 M${cx - R * 0.42} ${top + 12} l-2 18 M${cx + R * 0.5} ${top + 12} l4 18`, fill: 'none', stroke: true, sw: 3 },
    { shape: 'circle', x: bx, y: by, r: R * 0.15, fill: '#f48aa5', stroke: true, sw: 4 },
    { shape: 'circle', x: bx - R * 0.03, y: by - R * 0.04, r: R * 0.06, fill: '#fff6dc' },
    { shape: 'path', d: `M${bx - R * 0.26} ${by - R * 0.2} l-14 -12 M${bx + R * 0.26} ${by - R * 0.2} l14 -12 M${bx + R * 0.3} ${by + R * 0.04} l18 0`, fill: 'none', stroke: '#fff6c8', sw: 5 },
    { shape: 'circle', x: cx, y: cy, r: R, fill: 'none', stroke: '#ffffff', sw: 14 },
    { shape: 'circle', x: cx, y: cy, r: R + 7, fill: 'none', stroke: true, sw: 5 },
  ];
}

export const STRIP = {
  id: 'mleak',
  title: 'comic.mleak.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  panels: [
    {
      // 1. "Plink." The old pipe joint drips into the bucket. She holds up the shiny new joint from the shop.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.06, windowX: 0.44, bulbX: 0.3, signX: 0.76, signY: 0.21, plantX: 0.93, plantEyes: 'sad' }), // B9: the sign hangs under the pipe so CLEAN! shows
          { art: 'pipe', y: 140, w: 1600, jointX: 1060, joint: 'old' },
          { art: 'drip', x: 1060, y: 520, r: 24 },
          { art: 'bucket', x: 1060, y: 850, scale: 0.6 },
          { id: 'her', art: 'heroine', x: 600, y: 870, scale: 0.8, pose: 'wave', hold: 'pipeJoint', holdScale: 1.3, expr: 'bliss', look: 1 },
          { art: 'sparkles', x: 790, y: 330, r: 80 },
        ],
      },
      camera: { move: 'pushIn', focus: [800, 450], amount: 0.06, ms: 3500 },
      sound: 'squish',
      bubbles: [
        { kind: 'caption', key: 'comic.mleak.p1.cap', at: [560, 56], w: 760 },
        { kind: 'shout', key: 'comic.mleak.p1.plink', at: [1290, 560], w: 200, sound: 'splat' },
        { kind: 'say', key: 'comic.mleak.p1.her', at: [300, 300], to: 'her', w: 400 },
      ],
    },
    {
      // 2. Her husband in full armor (plus a tool belt): "a job for a knight!" Up the ladder, which bows and creaks.
      layout: 'tall',
      scene: {
        layers: [
          studio(900, 1200, { floorY: 880, door: false, windowX: 0.84, bulb: false, sign: false, plant: false }),
          { art: 'pipe', y: 110, w: 900, jointX: 470, joint: 'old' },
          ...cape(470, 960, 0.7),
          stepladder(470, 1160, 1, { bend: 1, creak: true }),
          knight(470, 960, 0.7, { pose: 'hips', expr: 'proud', look: -1 }),
          ...toolBelt(470, 960, 0.7),
          { id: 'her', art: 'heroine', x: 140, y: 1170, scale: 0.55, pose: 'stand', hold: 'pipeJoint', expr: 'shocked', look: 1 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'creak',
      bubbles: [
        { kind: 'say', key: 'comic.mleak.p2.him', at: [250, 300], to: 'him', w: 380 },
        { kind: 'shout', key: 'comic.mleak.p2.creak', at: [700, 930], w: 400, sound: 'creak' }, // wide enough that the word never breaks
      ],
    },
    {
      // 3. They swap: she is up the (straight again) ladder with the joint, he holds it at the bottom.
      layout: 'tall',
      scene: {
        layers: [
          studio(900, 1200, { floorY: 880, door: false, windowX: 0.84, bulb: false, sign: false, plantX: 0.1, plantEyes: 'wide' }),
          { art: 'pipe', y: 110, w: 900, jointX: 590, joint: 'old' },
          stepladder(470, 1160, 1),
          { id: 'her', art: 'heroine', x: 470, y: topStep(1160, 1), scale: 0.6, pose: 'wave', hold: 'pipeJoint', expr: 'happy', look: 1 },
          ...cape(470, 1170, 0.72),
          knight(470, 1170, 0.72, { pose: 'stand', expr: 'proud', look: 1 }),
          ...toolBelt(470, 1170, 0.72),
        ],
      },
      bubbles: [
        { kind: 'say', key: 'comic.mleak.p3.her', at: [190, 430], to: 'her', w: 300 },
        { kind: 'say', key: 'comic.mleak.p3.him', at: [740, 660], to: 'him', w: 280 },
      ],
    },
    {
      // 4. Surprise: from the top she sees the gap between his helmet and collar, and a little bump in it. Eyes glint.
      layout: 'splash',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 720, door: false, windowX: 0.62, bulb: false, sign: false, plant: false }),
          stepladder(300, 985, 0.85),
          { id: 'her', art: 'heroine', x: 300, y: topStep(985, 0.85), scale: 0.55, pose: 'stand', hold: 'tweezers', expr: 'scheming', look: 1 },
          ...glint(300, topStep(985, 0.85) - 283, 0.55),
          ...cape(300, 990, 0.62),
          knight(300, 990, 0.62, { pose: 'stand', expr: 'happy', look: -1 }),
          ...toolBelt(300, 990, 0.62),
          ...neckZoom(740, 670, 180, [340, 770]),
        ],
      },
      camera: { move: 'pushIn', focus: [600, 600], amount: 0.08, ms: 3000 },
      sound: 'ooh_happy',
      bubbles: [
        { kind: 'caption', key: 'comic.mleak.p4.cap', at: [700, 60], w: 520 },
        { kind: 'whisper', key: 'comic.mleak.p4.her', at: [700, 250], to: 'her', w: 340, sound: 'laugh_evil' },
      ],
    },
    {
      // 5. Button: he looks up just as the last drip lands on him. "Plink!" He jumps; the ladder wobbles. Still unpopped.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, door: false, windowX: 0.3, bulbX: 0.12, signX: 0.9, plantX: 0.06, plantEyes: 'smug' }),
          { art: 'pipe', y: 90, w: 1600, jointX: 832, r: 18, joint: 'new' },
          { art: 'bucket', x: 1160, y: 850, scale: 0.55, ripple: false },
          stepladder(720, 880, 0.75, { wobble: true }),
          { id: 'her', art: 'heroine', x: 720, y: topStep(880, 0.75), scale: 0.55, pose: 'wave', expr: 'grumpy', look: 1 },
          ...cape(860, 885, 0.68),
          knight(860, 885, 0.68, { pose: 'shrug', expr: 'shocked', look: -1 }),
          ...toolBelt(860, 885, 0.68),
          { art: 'drip', x: 860, y: 506, r: 16, splash: true },
        ],
      },
      camera: { move: 'shake' },
      sound: 'splat',
      bubbles: [
        { kind: 'shout', key: 'comic.mleak.p5.plink', at: [1080, 300], w: 200 },
        { kind: 'say', key: 'comic.mleak.p5.him', at: [1300, 480], to: 'him', w: 360 },
        { kind: 'caption', key: 'comic.mleak.p5.end', at: [400, 820], w: 620 },
      ],
    },
  ],
};
