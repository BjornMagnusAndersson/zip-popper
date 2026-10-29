// Teaser strip "The books arrive" (T4.3c): closes v1 after chapter 5 and points at chapter 7 (the psychology books).
// 5 panels. After closing, the studio is still shabby (but a little less): some customers still run away, so {name}
// wants to understand people. A knock: a tower of psychology books walks in on knight legs (her husband, in his
// fanciest armor yet: six plumes, knitted hat, heart banner and now a cape). Her library card is still smoking. She
// practises a "yes face" on the plant, highlighter in hand; the plant says nothing. Button: she falls asleep under the
// open book, the plant has been highlighted too, "TO BE CONTINUED... as soon as she gets past page one."
// Running gags: the armor ladder, the silent plant (in Greta's scarf), the "Clean!" sign. Visual surprise: the walking
// book tower with plumes on top. Format: docs/COMIC-FORMAT.md.

/** The studio at night after closing (tier 0, the plant in Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', sky: ['#10153a', '#2a3470'], cloud: false, moon: true, stars: true, ...o });

/** A soft night-time blue over the room, drawn right after it so the people stay bright. @param {number} w @param {number} h @returns {object} layer */
const night = (w, h) => ({ shape: 'rect', x: 0, y: 0, w, h, fill: '#1a1f4a', opacity: 0.22 });

/** A fresh patch of new paint on the dingy wall (the studio is improving). @param {number} x left @param {number} y top @param {number} w @param {number} h @returns {object[]} layers */
const freshPaint = (x, y, w, h) => [
  { shape: 'path', d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} q-${w * 0.12} 26 -${w * 0.2} 0 q-${w * 0.1} 40 -${w * 0.24} 0 q-${w * 0.14} 20 -${w * 0.28} 0 L${x} ${y + h}Z`, fill: '#bfe8d2' },
  { shape: 'path', d: `M${x + w * 0.1} ${y + h * 0.2} L${x + w * 0.5} ${y + h * 0.2}`, stroke: '#ffffff', sw: 10, opacity: 0.6 },
];

/** Book cover colours, used in turn up the tower. */
const BOOK_COLOURS =['#6a7be6', '#e8505b', '#3fae8c', '#f0a43a', '#9b7fd1', '#f27eb2', '#59b85f', '#e66a8f', '#4f86e8', '#d0672e'];

/**
 * A wobbly tower of fat psychology books: each one a coloured block with a pale page edge and a spine stripe.
 * @param {number} x middle @param {number} y floor (bottom of the tower) @param {number} n how many books @param {number} k size
 * @returns {object[]} shape layers
 */
function bookTower(x, y, n, k) {
  const out = [];
  let top = y;
  for (let i = 0; i < n; i += 1) {
    const h = (40 + (i * 7) % 22) * k;
    const w = (250 + ((i * 37) % 70) - 30) * k;
    const dx = ((i * 23) % 40 - 20) * k;
    top -= h;
    out.push({ shape: 'rect', x: x + dx - w / 2, y: top, w, h, rx: 6 * k, fill: BOOK_COLOURS[i % BOOK_COLOURS.length], stroke: true, sw: 5 });
    out.push({ shape: 'rect', x: x + dx + (i % 2 ? -w / 2 + 8 * k : w / 2 - 30 * k), y: top + 7 * k, w: 22 * k, h: h - 14 * k, fill: '#fff8ee', stroke: true, sw: 3 });
    out.push({ shape: 'rect', x: x + dx - w * 0.18, y: top + h * 0.35, w: w * 0.3, h: h * 0.3, rx: 3 * k, fill: '#ffd25a', opacity: 0.85 });
  }
  return out;
}

/**
 * Her library card, still smoking from all that borrowing: a little card with a stripe and three curls of smoke.
 * @param {number} x middle @param {number} y middle @param {number} k size @returns {object[]} shape layers
 */
const libraryCard = (x, y, k) => [
  { shape: 'rect', x: x - 46 * k, y: y - 30 * k, w: 92 * k, h: 60 * k, rx: 8 * k, fill: '#fff8ee', stroke: true, sw: 4, rotate: -12 },
  { shape: 'rect', x: x - 46 * k, y: y - 16 * k, w: 92 * k, h: 14 * k, fill: '#6a7be6', rotate: -12 },
  { shape: 'path', d: `M${x - 20 * k} ${y - 40 * k} q-16 -24 0 -44 q16 -20 0 -44 M${x + 6 * k} ${y - 44 * k} q-14 -22 0 -40 q14 -18 0 -40 M${x + 30 * k} ${y - 38 * k} q-14 -20 0 -36`, fill: 'none', stroke: '#b5b4ba', sw: 7 },
];

/**
 * His new cape (the armor gets fancier again): purple with gold trim and little hearts, worn behind him.
 * @param {number} x his floor x @param {number} y his floor y @param {number} s his scale @returns {object[]} shape layers
 */
const cape = (x, y, s) => [
  { shape: 'path', d: `M${x - 120 * s} ${y - 380 * s} L${x + 120 * s} ${y - 380 * s} Q${x + 200 * s} ${y - 160 * s} ${x + 250 * s} ${y - 30 * s} Q${x} ${y + 10 * s} ${x - 250 * s} ${y - 30 * s} Q${x - 200 * s} ${y - 160 * s} ${x - 120 * s} ${y - 380 * s}Z`, fill: '#8e5bd0', stroke: true, sw: 6 },
  { shape: 'path', d: `M${x - 244 * s} ${y - 44 * s} Q${x} ${y - 6 * s} ${x + 244 * s} ${y - 44 * s}`, fill: 'none', stroke: '#ffd25a', sw: 10 },
  ...[[-180, -90], [190, -110]].map(([dx, dy]) => ({ shape: 'path', d: `M${x + dx * s} ${y + dy * s} c-10 -13 -28 0 0 18 c28 -18 10 -31 0 -18Z`, fill: '#ffd8e6', stroke: true, sw: 3 })),
];

/**
 * His heart banner (from strip 5), now with two hearts: a pole with a gold knob and a swallow-tailed pennant.
 * @param {number} x pole bottom @param {number} y pole bottom @param {number} k size @returns {object[]} shape layers
 */
const banner = (x, y, k) => [
  { shape: 'rect', x: x - 9 * k, y: y - 640 * k, w: 18 * k, h: 640 * k, rx: 8 * k, fill: '#8a5a32', stroke: true, sw: 4 },
  { shape: 'circle', x, y: y - 650 * k, r: 20 * k, fill: '#ffd25a', stroke: true, sw: 4 },
  { shape: 'path', d: `M${x + 9 * k} ${y - 620 * k} Q${x + 120 * k} ${y - 640 * k} ${x + 220 * k} ${y - 600 * k} L${x + 170 * k} ${y - 545 * k} L${x + 230 * k} ${y - 480 * k} Q${x + 120 * k} ${y - 500 * k} ${x + 9 * k} ${y - 480 * k}Z`, fill: '#6a7be6', stroke: true, sw: 5 },
  ...[60, 130].map((dx) => ({ shape: 'path', d: `M${x + dx * k} ${y - 560 * k} c-14 -18 -40 0 0 26 c40 -26 14 -44 0 -26Z`, fill: '#ffd8e6', stroke: true, sw: 3 })),
];

/** Her husband in his fanciest armor yet: six plumes and Greta's knitted hat (cape and banner are separate layers). @param {number} x @param {number} y @param {number} s scale @param {object} [o] more options @returns {object} layer */
const knight = (x, y, s, o = {}) => ({ id: 'him', art: 'husband', x, y, scale: s, outfit: 'armor', visor: 'down', plumes: 6, cozy: '#f27eb2', ...o });

export const STRIP = {
  id: 'books',
  title: 'comic.books.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  panels: [
    {
      // 1. After closing. The studio is still shabby, but there is a patch of new paint. Some customers still run away.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.08, windowX: 0.42, leakX: 0.62, bulbX: 0.3, signX: 0.9, plantX: 0.2, plantEyes: 'sad', lamp: false }),
          ...freshPaint(1090, 150, 200, 260),
          night(1600, 900),
          { art: 'bucket', x: 992, y: 820, scale: 0.55 },
          { art: 'chair', x: 1250, y: 860, scale: 0.75, color: '#9a8f6a' },
          { id: 'her', art: 'heroine', x: 1250, y: 860, scale: 0.75, pose: 'sit', expr: 'happy', look: -1 },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.books.p1.cap', at: [520, 60], w: 820 },
        { kind: 'say', key: 'comic.books.p1.her', at: [800, 260], to: 'her', w: 380 },
        { kind: 'think', key: 'comic.books.p1.think', at: [1290, 350], to: 'her', w: 320 }, // B9: under the CLEAN! sign
      ],
    },
    {
      // 2. Surprise: a knock, the door opens, and a tower of books walks in on knight legs. Plumes wave on top.
      layout: 'tall',
      scene: {
        layers: [
          studio(900, 1200, { floorY: 900, doorX: 0.5, doorOpen: true, windowX: 0.86, leak: false, sign: false, bulbX: 0.14, plant: false, lamp: false }),
          night(900, 1200),
          ...cape(450, 1120, 0.85),
          knight(450, 1120, 0.85, { pose: 'hips', expr: 'proud', mouth: [450, 560] }),
          ...bookTower(450, 1010, 7, 1.05),
        ],
      },
      camera: { move: 'pushIn', focus: [450, 640], amount: 0.08, ms: 3000 },
      sound: 'creak',
      bubbles: [
        { kind: 'shout', key: 'comic.books.p2.thud', at: [170, 200], w: 220, sound: 'splat' },
        { kind: 'say', key: 'comic.books.p2.him', at: [690, 260], to: 'him', w: 320 },
      ],
    },
    {
      // 3. The reveal: her husband, fanciest armor yet (six plumes, hat, cape, two-heart banner). Her card is smoking.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.1, doorOpen: true, windowX: 0.5, leakX: 0.36, bulbX: 0.7, signX: 0.87, plant: false, lamp: false }), // B9: in from the edge so the whole word CLEAN! shows
          night(1600, 900),
          ...bookTower(1000, 880, 11, 0.9),
          ...banner(220, 880, 0.95),
          ...cape(400, 880, 0.8),
          knight(400, 880, 0.8, { pose: 'hips', expr: 'proud', visor: 'up', look: 1 }),
          { id: 'her', art: 'heroine', x: 1320, y: 880, scale: 0.8, pose: 'wave', expr: 'bliss', look: -1 },
          ...libraryCard(1472, 452, 1),
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.08, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.books.p3.him', at: [700, 140], to: 'him', w: 460 },
        { kind: 'say', key: 'comic.books.p3.her', at: [1130, 300], to: 'her', w: 360, sound: 'cheer' }, // B9: under the CLEAN! sign
      ],
    },
    {
      // 4. Lesson 1: the yes face. Highlighter up, a huge grin, aimed at the plant. The plant says nothing.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 700, windowX: 0.56, door: false, leak: false, sign: false, bulbX: 0.82, plantX: 0.22, plantEyes: 'smug', lamp: false }),
          night(1000, 1000),
          ...bookTower(880, 990, 6, 0.8),
          { id: 'plant', shape: 'rect', x: 180, y: 440, w: 80, h: 60, opacity: 0, mouth: [220, 460] }, // the top of the plant (shelf or floor)
          { id: 'her', art: 'heroine', x: 620, y: 990, scale: 0.85, pose: 'wave', hold: 'highlighter', expr: 'happy', flip: true },
        ],
      },
      camera: { move: 'pushIn', focus: [420, 520], amount: 0.1, ms: 3000 },
      bubbles: [
        { kind: 'caption', key: 'comic.books.p4.cap', at: [250, 60], w: 420 },
        { kind: 'say', key: 'comic.books.p4.her', at: [780, 200], to: 'her', w: 360 },
        { kind: 'say', key: 'comic.books.p4.plant', at: [220, 240], to: 'plant', w: 120 }, // above the plant (shelf or floor)
      ],
    },
    {
      // 5. Button: later, asleep on the chair under the open book. The plant has been highlighted too. To be continued.
      layout: 'wide',
      scene: {
        layers: [
          // The plant has been highlighted too (plantHighlight: the stripes follow whichever plant she has, SPEC D32j).
          // leakX 0.9125 = 1460, right over the bucket (story audit 2026-10-29: the drip fell beside it).
          studio(1600, 900, { floorY: 600, door: false, windowX: 0.5, leakX: 0.9125, bulbX: 0.35, signX: 0.58, signTilt: 10, plantX: 0.14, plantEyes: 'sad', plantHighlight: true, lamp: false }),
          night(1600, 900),
          { art: 'bucket', x: 1460, y: 830, scale: 0.5 },
          ...bookTower(1180, 880, 8, 0.8),
          { art: 'chair', x: 760, y: 860, scale: 0.75, color: '#9a8f6a' },
          { id: 'her', art: 'heroine', x: 760, y: 860, scale: 0.75, pose: 'sit', expr: 'sleepy', hold: 'book', holdScale: 1.5 },
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.1, ms: 3500 },
      bubbles: [
        { kind: 'whisper', key: 'comic.books.p5.her', at: [520, 200], to: 'her', w: 300 },
        { kind: 'caption', key: 'comic.books.p5.tbc', at: [1300, 110], w: 440 },
        { kind: 'caption', key: 'comic.books.p5.end', at: [380, 820], w: 560 },
      ],
    },
  ],
};
