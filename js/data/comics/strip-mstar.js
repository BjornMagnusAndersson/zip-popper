// Milestone strip "First 3-star day" (T4.3c): played the first time the player ends a day with 3 stars. 4 panels.
// Closing time: {name} reads a 3-star review and cheers; the studio dog sleeps on. Greta pulls out a huge party
// cannon she has saved for years. BOOM: confetti everywhere, the dog barks and bolts. Button: the confetti has settled
// on the plant and the "Clean!" sign, the dog hides behind the bucket (the visual surprise) and Greta holds up two
// more cannons. Running gag: the plant, silent, watching with eyes on its pot. Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0; the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, plantScarf: '#e8505b', ...o });

const PARTY = ['#e8505b', '#ffd25a', '#3fae8c', '#6a7be6', '#f08cbf', '#4fc3f7'];

/**
 * A scatter of confetti (paper squares, dots and curly streamers) in a box. Same seed, same scatter.
 * @param {number} x left @param {number} y top @param {number} w width @param {number} h height
 * @param {number} n how many pieces @param {number} seed any number @param {number} [s] piece size
 * @returns {object[]} shape layers
 */
function confetti(x, y, w, h, n, seed, s = 1) {
  let r = seed * 9301 + 49297;
  // Seeded random number generator: returns a number from 0 up to (not including) 1.
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    const fill = PARTY[i % PARTY.length];
    const kind = i % 7;
    if (kind === 0) out.push({ shape: 'path', d: `M${px} ${py} q${10 * s} ${-14 * s} ${20 * s} 0 q${10 * s} ${14 * s} ${20 * s} 0 q${10 * s} ${-14 * s} ${20 * s} 0`, stroke: fill, sw: 6 * s });
    else if (kind % 3 === 0) out.push({ shape: 'circle', x: px, y: py, r: 8 * s, fill, stroke: true, sw: 2 });
    else out.push({ shape: 'rect', x: px, y: py, w: 14 * s, h: 22 * s, fill, stroke: true, sw: 2, rotate: Math.round(rnd() * 180) });
  }
  return out;
}

/**
 * Greta's party cannon: a big striped cardboard popper with a pull string and a ring.
 * @param {number} x base (where the string comes out) @param {number} y base @param {number} k size
 * @param {number} a angle in degrees (0 = mouth up, positive = leaning right) @param {boolean} [fired] smoke puff at the mouth
 * @returns {object[]} shape layers
 */
function cannon(x, y, k, a, fired = false) {
  const c = Math.cos((a * Math.PI) / 180);
  const sn = Math.sin((a * Math.PI) / 180);
  /** Turn a point in cannon space (mouth up along -y) into panel space. @param {number} px @param {number} py @returns {string} "x y" */
  const p = (px, py) => `${(x + (px * c - py * sn) * k).toFixed(1)} ${(y + (px * sn + py * c) * k).toFixed(1)}`;
  const out = [
    { shape: 'path', d: `M${p(0, 0)} Q${p(-30, 50)} ${p(6, 80)} Q${p(30, 104)} ${p(10, 126)}`, stroke: true, sw: 5 },
    { shape: 'circle', x: x + (10 * c - 140 * sn) * k, y: y + (10 * sn + 140 * c) * k, r: 16 * k, fill: '#ffd25a', stroke: true, sw: 5 },
    { shape: 'path', d: `M${p(-24, 0)} L${p(24, 0)} L${p(62, -220)} L${p(-62, -220)}Z`, fill: '#6a7be6', stroke: true, sw: 6 },
  ];
  for (const t of [0.25, 0.55, 0.85]) {
    const w0 = 24 + 38 * (t - 0.08);
    const w1 = 24 + 38 * t;
    out.push({ shape: 'path', d: `M${p(-w0, -220 * (t - 0.08))} L${p(w0, -220 * (t - 0.08))} L${p(w1, -220 * t)} L${p(-w1, -220 * t)}Z`, fill: '#ffd25a' });
  }
  out.push({ shape: 'path', d: `M${p(-62, -220)} Q${p(0, -244)} ${p(62, -220)} Q${p(0, -196)} ${p(-62, -220)}Z`, fill: fired ? '#2a211d' : '#e8505b', stroke: true, sw: 6 });
  if (fired) for (const [dx, dy, rr] of [[-40, -270, 30], [10, -290, 38], [52, -262, 26]]) out.push({ shape: 'circle', x: x + (dx * c - dy * sn) * k, y: y + (dx * sn + dy * c) * k, r: rr * k, fill: '#f4f1ea', stroke: true, sw: 4, opacity: 0.9 });
  return out;
}

export const STRIP = {
  id: 'mstar',
  title: 'comic.mstar.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  panels: [
    {
      // 1. Closing time. She reads the new review on her phone: three stars! The studio dog sleeps by the bucket.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.92, windowX: 0.42, leakX: 0.72, bulbX: 0.56, signX: 0.24 }),
          { art: 'bucket', x: 1320, y: 830, scale: 0.5 },
          { art: 'dog', x: 1060, y: 880, scale: 0.95, stance: 'sleep' },
          { id: 'her', art: 'heroine', x: 720, y: 900, scale: 0.8, pose: 'cheer', hold: 'phone', expr: 'bliss' },
          { art: 'sparkles', x: 720, y: 260, r: 220 },
        ],
      },
      camera: { move: 'pushIn', focus: [760, 420], amount: 0.08, ms: 2500 },
      bubbles: [
        { kind: 'caption', key: 'comic.mstar.p1.cap', at: [330, 60], w: 540 },
        { kind: 'say', key: 'comic.mstar.p1.her', at: [1180, 250], to: 'her', w: 440, sound: 'cheer' },
      ],
    },
    {
      // 2. Greta, very calm, brings out a huge party cannon. She has been saving it for years.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.78, door: false, leak: false, sign: false, bulb: false, plant: false }),
          { id: 'greta', art: 'greta', x: 280, y: 650, scale: 0.85, pose: 'bust', expr: 'scheming', look: 1 },
          ...cannon(330, 590, 0.95, 35),
        ],
      },
      camera: { move: 'pushIn', focus: [380, 380], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'say', key: 'comic.mstar.p2.greta', at: [600, 90], to: 'greta', w: 340 },
      ],
    },
    {
      // 3. BOOM! Confetti everywhere. {name} is in heaven; the dog wakes, barks at the cannon and runs for it.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 400, y: 420, colors: ['#ffe9f1', '#ffd0e0'] },
          ...confetti(0, 0, 1000, 820, 70, 3),
          { art: 'burst', x: 420, y: 400, r: 170, color: '#ffe27a' },
          { id: 'greta', art: 'greta', x: 210, y: 1030, scale: 0.7, pose: 'cheer', expr: 'happy', look: 1 },
          ...cannon(343, 650, 0.95, 18, true),
          { id: 'her', art: 'heroine', x: 590, y: 1030, scale: 0.7, pose: 'cheer', expr: 'bliss' },
          { id: 'dog', art: 'dog', x: 840, y: 990, scale: 0.6, stance: 'run', face: 'bark' },
          ...confetti(40, 20, 920, 330, 26, 11, 1.2),
        ],
      },
      camera: { move: 'shake', ms: 600 },
      bubbles: [
        { kind: 'shout', key: 'comic.mstar.p3.boom', at: [190, 120], w: 300, sound: 'pop_big' },
        { kind: 'shout', key: 'comic.mstar.p3.dog', at: [800, 160], to: 'dog', w: 300 },
      ],
    },
    {
      // 4. Button: the confetti has settled on the plant and the "Clean!" sign. The dog hides behind the bucket.
      // Greta holds up two more cannons.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, windowX: 0.62, door: false, leak: false, bulb: false, plant: false, signX: 0.24 }),
          ...confetti(0, 640, 1000, 360, 40, 5),
          { art: 'plant', x: 200, y: 980, scale: 1, eyes: 'smug', scarf: '#e8505b' },
          ...confetti(90, 590, 220, 260, 18, 7),
          ...confetti(120, 110, 250, 130, 14, 9),
          { art: 'dog', x: 840, y: 955, scale: 0.8, stance: 'peek', face: 'scared', flip: true, id: 'dog' },
          { art: 'bucket', x: 840, y: 1000, scale: 0.9 },
          { id: 'greta', art: 'greta', x: 520, y: 1010, scale: 0.72, pose: 'cheer', expr: 'happy' },
          ...cannon(383, 625, 0.7, -15),
          ...cannon(657, 625, 0.7, 15),
        ],
      },
      camera: { move: 'pushIn', focus: [520, 560], amount: 0.05, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.mstar.p4.greta', at: [740, 100], to: 'greta', w: 380 },
        { kind: 'whisper', key: 'comic.mstar.p4.dog', at: [880, 620], to: 'dog', w: 200 },
      ],
    },
  ],
};
