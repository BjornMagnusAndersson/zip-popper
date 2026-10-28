// Milestone strip "Tweezers" (T4.3c): played when the player buys the tweezers. 4 panels.
// {name} raises the new tweezers like a sword ("the tiny sword"), Nils is unimpressed. Close-up on his nose: she taps
// the blackhead on each side and knights it, "Arise, Sir Blackhead!" (it has a tiny face: "Me?!"). Greta, the witness,
// cries happily and holds up a tiny cape she has already knitted for it (running gag: Greta's knitted gifts; the plant
// in its scarf looks on). Button: PLINK, the knight is plucked and waves goodbye from the tweezer tips in its cape;
// Nils only wants to know if he gets a cape too. Visual surprise: Sir Blackhead's face and tiny cape.
// Cartoon only: the blackhead is a little dark ball with a face, no blood. Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0; the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', lamp: false, ...o });

/**
 * Sir Blackhead: a small dark ball with a tiny cartoon face, optionally in Greta's knitted cape, waving.
 * @param {number} x middle @param {number} y middle @param {number} k size (1 = radius 30)
 * @param {{id?: string, cape?: boolean, wave?: boolean, mouth?: 'o'|'smile'}} [o] extras
 * @returns {object[]} shape layers
 */
function sirBlackhead(x, y, k, o = {}) {
  const out = [];
  if (o.cape) out.push(...tinyCape(x, y + 4 * k, k * 0.55));
  out.push({ ...(o.id ? { id: o.id, mouth: [x, y + 12 * k] } : {}), shape: 'circle', x, y, r: 30 * k, fill: '#2f2630', stroke: true, sw: 4 });
  out.push(
    { shape: 'circle', x: x - 9 * k, y: y - 10 * k, r: 3 * k, fill: '#ffffff', opacity: 0.7 },
    { shape: 'circle', x: x - 9 * k, y: y - 2 * k, r: 7 * k, fill: '#ffffff', stroke: true, sw: 2 },
    { shape: 'circle', x: x + 9 * k, y: y - 2 * k, r: 7 * k, fill: '#ffffff', stroke: true, sw: 2 },
    { shape: 'circle', x: x - 8 * k, y: y - 1 * k, r: 3.2 * k, fill: '#1c1c22' },
    { shape: 'circle', x: x + 10 * k, y: y - 1 * k, r: 3.2 * k, fill: '#1c1c22' },
  );
  if (o.mouth === 'o') out.push({ shape: 'ellipse', x, y: y + 13 * k, rx: 4 * k, ry: 5 * k, fill: '#ff9cbc', stroke: true, sw: 2 });
  else out.push({ shape: 'path', d: `M${x - 8 * k} ${y + 10 * k} Q${x} ${y + 18 * k} ${x + 8 * k} ${y + 10 * k}`, fill: 'none', stroke: '#ff9cbc', sw: 3 });
  if (o.wave) {
    out.push(
      { shape: 'path', d: `M${x + 26 * k} ${y - 4 * k} L${x + 44 * k} ${y - 26 * k}`, fill: 'none', stroke: true, sw: 4 },
      { shape: 'circle', x: x + 46 * k, y: y - 29 * k, r: 6 * k, fill: '#2f2630', stroke: true, sw: 3 },
      { shape: 'path', d: `M${x + 56 * k} ${y - 46 * k} q8 6 4 16 M${x + 64 * k} ${y - 36 * k} q6 6 2 14`, fill: 'none', stroke: true, sw: 3 },
    );
  }
  return out;
}

/**
 * Greta's tiny knitted cape: purple, ribbed rows, a heart in the middle.
 * @param {number} x middle of the collar @param {number} y collar line @param {number} k size (1 = 80 wide at the collar)
 * @returns {object[]} shape layers
 */
function tinyCape(x, y, k) {
  const rows = [30, 60, 90].map((d) => `M${x - (44 + d * 0.22) * k} ${y + d * k} Q${x} ${y + (d + 8) * k} ${x + (44 + d * 0.22) * k} ${y + d * k}`);
  return [
    { shape: 'path', d: `M${x - 40 * k} ${y} L${x + 40 * k} ${y} L${x + 70 * k} ${y + 120 * k} Q${x} ${y + 138 * k} ${x - 70 * k} ${y + 120 * k}Z`, fill: '#8e5bd0', stroke: true, sw: 4 },
    { shape: 'path', d: rows.join(' '), fill: 'none', stroke: '#b48be6', sw: 3 },
    { shape: 'path', d: `M${x} ${y + 82 * k} l-14 -14 a8 8 0 0 1 14 -10 a8 8 0 0 1 14 10Z`, fill: '#ff8fb1', stroke: true, sw: 2.5 },
    { shape: 'rect', x: x - 46 * k, y: y - 10 * k, w: 92 * k, h: 16 * k, rx: 8 * k, fill: '#f4d35e', stroke: true, sw: 3 },
  ];
}

export const STRIP = {
  id: 'mtweezers',
  title: 'comic.mtweezers.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  panels: [
    {
      // 1. Fresh from the shop: she raises the tweezers like a sword. Nils, in the chair, squints at the tiny blade.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.06, windowX: 0.4, leakX: 0.74, bulbX: 0.56, signX: 0.87, plantX: 0.2 }), // B9: in from the edge so CLEAN! shows
          { shape: 'circle', x: 724, y: 280, r: 160, fill: '#fff6c8', opacity: 0.45 },
          { art: 'chair', x: 1110, y: 870, scale: 0.75, color: '#9a8f6a' },
          { id: 'nils', art: 'nils', x: 1110, y: 870, scale: 0.75, pose: 'sit', expr: 'squint', look: -1 },
          { id: 'her', art: 'heroine', x: 560, y: 880, scale: 0.85, pose: 'wave', hold: 'tweezers', holdScale: 1.6, expr: 'bliss', look: 1 },
          { art: 'sparkles', x: 724, y: 270, r: 110 },
        ],
      },
      camera: { move: 'pushIn', focus: [760, 420], amount: 0.08, ms: 3000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'caption', key: 'comic.mtweezers.p1.cap', at: [330, 60], w: 560 },
        { kind: 'say', key: 'comic.mtweezers.p1.her', at: [250, 280], to: 'her', w: 380 },
        { kind: 'say', key: 'comic.mtweezers.p1.nils', at: [1390, 370], to: 'nils', w: 300 }, // B9: under the CLEAN! sign
      ],
    },
    {
      // 2. Close-up on Nils's nose (his eyes cross to watch). Tap, tap: "Arise, Sir Blackhead!" It has a face: "Me?!"
      layout: 'small',
      scene: {
        bg: '#c09468',
        layers: [
          { shape: 'rect', x: 0, y: 0, w: 800, h: 600, fill: '#c09468' },
          { shape: 'circle', x: 220, y: 30, r: 68, fill: '#ffffff', stroke: true, sw: 6 },
          { shape: 'circle', x: 580, y: 30, r: 68, fill: '#ffffff', stroke: true, sw: 6 },
          { shape: 'circle', x: 262, y: 66, r: 26, fill: '#4d8a5a' },
          { shape: 'circle', x: 538, y: 66, r: 26, fill: '#4d8a5a' },
          { shape: 'circle', x: 266, y: 70, r: 13, fill: '#1c1c22' },
          { shape: 'circle', x: 534, y: 70, r: 13, fill: '#1c1c22' },
          { shape: 'ellipse', x: 400, y: 300, rx: 150, ry: 135, fill: '#b3845a', stroke: true, sw: 6 },
          { shape: 'ellipse', x: 345, y: 240, rx: 40, ry: 24, fill: '#ffffff', opacity: 0.45 },
          { shape: 'path', d: 'M150 600 L150 520 Q230 470 330 500 Q400 470 470 500 Q570 470 650 520 L650 600Z', fill: '#d9783a', stroke: true, sw: 6 },
          { shape: 'path', d: 'M230 520 q20 30 40 0 M330 510 q20 30 40 0 M430 510 q20 30 40 0 M530 520 q20 30 40 0', fill: 'none', stroke: '#b5582a', sw: 4 },
          ...sirBlackhead(462, 330, 1.6, { id: 'bh', mouth: 'o' }),
          { shape: 'path', d: 'M800 150 L532 312 L524 300 L800 128Z', fill: '#d7dee7', stroke: true, sw: 4 },
          { shape: 'path', d: 'M800 196 L538 326 L532 314 L800 176Z', fill: '#d7dee7', stroke: true, sw: 4 },
          { shape: 'path', d: 'M520 270 q-20 -20 -4 -40 M560 268 q4 -24 26 -30', fill: 'none', stroke: '#ffffff', sw: 5 },
          { art: 'sparkles', x: 462, y: 330, r: 95 },
        ],
      },
      camera: { move: 'pushIn', focus: [455, 335], amount: 0.12, ms: 2400 },
      sound: 'tweeze',
      bubbles: [
        { kind: 'say', key: 'comic.mtweezers.p2.her', at: [170, 410], w: 300 },
        { kind: 'say', key: 'comic.mtweezers.p2.bh', at: [640, 450], to: 'bh', w: 200, sound: 'ooh_happy' },
      ],
    },
    {
      // 3. The witness: Greta cries happily and holds up, on her needles, the tiny cape she has already knitted for it.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, sign: false, bulb: false, plant: false }),
          { art: 'plant', x: 715, y: 590, scale: 0.6, eyes: 'happy', scarf: '#e8505b' },
          { id: 'greta', art: 'greta', x: 230, y: 620, scale: 0.85, pose: 'bust', expr: 'bliss', look: 1 },
          { shape: 'path', d: 'M196 430 q-8 18 0 26 q8 -8 0 -26Z M268 430 q-8 18 0 26 q8 -8 0 -26Z', fill: '#8fd3ff', stroke: true, sw: 2.5 },
          { shape: 'path', d: 'M420 600 L446 316 M520 600 L494 316', fill: 'none', stroke: '#c9a46a', sw: 9 },
          { shape: 'circle', x: 446, y: 312, r: 9, fill: '#e8505b', stroke: true, sw: 3 },
          { shape: 'circle', x: 494, y: 312, r: 9, fill: '#e8505b', stroke: true, sw: 3 },
          ...tinyCape(470, 330, 1),
          { art: 'sparkles', x: 470, y: 380, r: 90 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 380], amount: 0.08, ms: 2400 },
      bubbles: [
        { kind: 'whisper', key: 'comic.mtweezers.p3.sniff', at: [210, 80], to: 'greta', w: 340 },
        { kind: 'say', key: 'comic.mtweezers.p3.greta', at: [560, 150], to: 'greta', w: 300 },
      ],
    },
    {
      // 4. Button: PLINK! The knight is plucked and waves goodbye from the tweezer tips in its cape. Nils wants a cape too.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, windowX: 0.5, door: false, leak: false, bulb: false, signX: 0.12, plantX: 0.9, plantEyes: 'happy' }),
          { art: 'chair', x: 790, y: 990, scale: 0.7, color: '#9a8f6a' },
          { id: 'nils', art: 'nils', x: 790, y: 990, scale: 0.7, pose: 'sit', expr: 'happy', look: -1 },
          { id: 'her', art: 'heroine', x: 360, y: 1000, scale: 0.85, pose: 'wave', hold: 'tweezers', holdScale: 1.5, expr: 'proud', look: 1 },
          { art: 'sparkles', x: 522, y: 360, r: 100 },
          ...sirBlackhead(522, 352, 1.4, { cape: true, wave: true }),
        ],
      },
      camera: { move: 'shake' },
      sound: 'pluck',
      bubbles: [
        { kind: 'shout', key: 'comic.mtweezers.p4.plink', at: [560, 110], w: 240 },
        { kind: 'say', key: 'comic.mtweezers.p4.her', at: [175, 190], to: 'her', w: 330 },
        { kind: 'say', key: 'comic.mtweezers.p4.nils', at: [840, 230], to: 'nils', w: 300 },
      ],
    },
  ],
};
