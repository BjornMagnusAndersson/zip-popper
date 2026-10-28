// Chapter 5 strip "The shabby studio" (T4.3b): opening day in her very own (very dingy) studio. 12 panels.
// Beginning: {name} hangs the "Clean!" sign; one chair, one bucket under the leak; nobody comes; the first visitor is
// her husband in his fanciest armor yet ("No."). Middle: Greta, Nils and Penny arrive; Nils takes the chair; the first
// pop under the bad lamp, the leak dripping in rhythm, a drop on her nose; the splash: POP, ooh, ding. End: the hygiene
// inspector, horror at the bucket, the leak and the sign; he leaves her a box of gloves. Button: the leak drips on his
// clipboard and the plant looks smug. Running gags: the "Clean!" sign that is never clean, the plant (in Greta's
// scarf), the armor (four plumes, knitted hat, shield and banner), his "No.". Visual surprise: the knight in the
// doorway as the first "customer". Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0; the sad little plant from the plan strip sits on the window sill, R8; it wears Greta's scarf from panel 5, when she brings it: panels 1 and 2 pass plantScarf false). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', plantSill: true, ...o });

/** The one chair with someone sitting on it. @param {object} who the character layer (art, x, y, scale...) @returns {object[]} layers */
const seated = (who) => [{ art: 'chair', x: who.x, y: who.y, scale: who.scale, color: '#9a8f6a' }, { pose: 'sit', ...who }];

/**
 * His shield (from strip 2), now with gold trim: red, a pimple in a no-sign as the coat of arms.
 * @param {number} x middle @param {number} y top @param {number} k size @returns {object[]} shape layers
 */
const shield = (x, y, k) => [
  { shape: 'path', d: `M${x - 110 * k} ${y} L${x + 110 * k} ${y} L${x + 110 * k} ${y + 120 * k} Q${x + 110 * k} ${y + 240 * k} ${x} ${y + 300 * k} Q${x - 110 * k} ${y + 240 * k} ${x - 110 * k} ${y + 120 * k}Z`, fill: '#e8505b', stroke: true, sw: 7 },
  { shape: 'path', d: `M${x - 86 * k} ${y + 22 * k} L${x + 86 * k} ${y + 22 * k} L${x + 86 * k} ${y + 120 * k} Q${x + 86 * k} ${y + 220 * k} ${x} ${y + 270 * k} Q${x - 86 * k} ${y + 220 * k} ${x - 86 * k} ${y + 120 * k}Z`, fill: 'none', stroke: '#ffd25a', sw: 6 },
  { shape: 'circle', x, y: y + 125 * k, r: 54 * k, fill: '#ffffff', stroke: true, sw: 5 },
  { shape: 'circle', x, y: y + 125 * k, r: 20 * k, fill: '#ff8fa8', stroke: true, sw: 3 },
  { shape: 'circle', x, y: y + 125 * k, r: 46 * k, fill: 'none', stroke: '#c9302c', sw: 9 },
  { shape: 'path', d: `M${x - 32 * k} ${y + 93 * k} L${x + 32 * k} ${y + 157 * k}`, stroke: '#c9302c', sw: 9 },
];

/**
 * His new banner (the armor gets fancier again): a pole with a gold knob and a swallow-tailed pennant with a heart.
 * @param {number} x pole bottom @param {number} y pole bottom @param {number} k size @returns {object[]} shape layers
 */
const banner = (x, y, k) => [
  { shape: 'rect', x: x - 9 * k, y: y - 640 * k, w: 18 * k, h: 640 * k, rx: 8 * k, fill: '#8a5a32', stroke: true, sw: 4 },
  { shape: 'circle', x, y: y - 650 * k, r: 20 * k, fill: '#ffd25a', stroke: true, sw: 4 },
  { shape: 'path', d: `M${x + 9 * k} ${y - 620 * k} Q${x + 120 * k} ${y - 640 * k} ${x + 220 * k} ${y - 600 * k} L${x + 170 * k} ${y - 545 * k} L${x + 230 * k} ${y - 480 * k} Q${x + 120 * k} ${y - 500 * k} ${x + 9 * k} ${y - 480 * k}Z`, fill: '#6a7be6', stroke: true, sw: 5 },
  { shape: 'path', d: `M${x + 90 * k} ${y - 530 * k} c-14 -18 -40 0 0 26 c40 -26 14 -44 0 -26Z`, fill: '#ffd8e6', stroke: true, sw: 3 },
];

/** Her husband in his fanciest armor yet: four plumes and Greta's knitted hat. @param {number} x @param {number} y @param {number} s scale @param {object} [o] more options @returns {object} layer */
const knight = (x, y, s, o = {}) => ({ id: 'him', art: 'husband', x, y, scale: s, outfit: 'armor', visor: 'down', plumes: 4, cozy: '#f27eb2', ...o });

export const STRIP = {
  id: 'strip5',
  title: 'comic.s5.title',
  // Not `dressed` (B36a, B39a): opening day is always before the shop, so a replay shows her as she was then (everyday
  // clothes, no scrub cap coming and going).
  bareHands: true, // no gloves here even on a replay: the words are about her bare hands (SPEC D32e)
  panels: [
    {
      // 1. Opening day: one chair, one bucket under the leak, one cheap lamp. She hangs the "Clean!" sign. It is not.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.08, windowX: 0.4, leakX: 0.66, bulbX: 0.58, signX: 0.86, plantX: 0.2, lampX: 0.97, plantScarf: false }),
          { art: 'bucket', x: 1056, y: 820, scale: 0.6 },
          { art: 'chair', x: 1220, y: 760, scale: 0.6, color: '#9a8f6a' },
          { id: 'her', art: 'heroine', x: 1400, y: 880, scale: 0.85, pose: 'cheer', expr: 'proud' },
        ],
      },
      camera: { move: 'panRight', focus: [800, 450], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s5.p1.cap', at: [470, 60], w: 780 },
        { kind: 'say', key: 'comic.s5.p1.her', at: [1080, 330], to: 'her', w: 330 },
      ],
    },
    {
      // 2. The leak. Drip. The plant (in Greta's scarf) is not impressed.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.78, leakX: 0.5, plantEyes: 'sad', plantScarf: false, plantSill: 0.5, door: false, sign: false, bulb: false, lamp: false }),
          { art: 'drip', x: 400, y: 230, r: 22 },
          { art: 'bucket', x: 400, y: 590, scale: 0.95 },
        ],
      },
      camera: { move: 'pullOut', focus: [400, 300], amount: 0.1, ms: 2200 },
      sound: 'squelch',
      bubbles: [
        { kind: 'caption', key: 'comic.s5.p2.cap', at: [220, 44], w: 380 },
        { kind: 'shout', key: 'comic.s5.p2.drip', at: [610, 130], w: 200 },
      ],
    },
    {
      // 3. She waits on the one chair. Nobody comes.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 480, doorX: 0.84, windowX: 0.4, leak: false, sign: false, bulbX: 0.62, plant: false, lamp: false }),
          ...seated({ id: 'her', art: 'heroine', x: 360, y: 620, scale: 0.68, expr: 'sleepy' }),
        ],
      },
      camera: { move: 'pushIn', focus: [360, 300], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s5.p3.cap', at: [200, 44], w: 340 },
        { kind: 'think', key: 'comic.s5.p3.her', at: [600, 140], to: 'her', w: 260 },
      ],
    },
    {
      // 4. Surprise: the door creaks open... the first "customer" is her husband in his fanciest armor. "No."
      layout: 'tall',
      scene: {
        layers: [
          studio(900, 1200, { floorY: 900, doorX: 0.5, doorOpen: true, windowX: 0.88, leak: false, sign: false, bulbX: 0.14, plant: false, lamp: false }),
          ...banner(680, 1060, 1),
          knight(450, 1090, 0.95, { pose: 'hips', expr: 'proud' }),
          ...shield(300, 760, 0.85),
          { id: 'her', art: 'heroine', x: 170, y: 1210, scale: 0.9, pose: 'bust', expr: 'happy', look: 1 },
        ],
      },
      camera: { move: 'pushIn', focus: [450, 600], amount: 0.08, ms: 3000 },
      sound: 'creak',
      bubbles: [
        { kind: 'say', key: 'comic.s5.p4.her', at: [170, 430], to: 'her', w: 300 },
        { kind: 'say', key: 'comic.s5.p4.him', at: [740, 300], to: 'him', w: 200 },
        { kind: 'say', key: 'comic.s5.p4.him2', at: [690, 1110], to: 'him', w: 380 },
      ],
    },
    {
      // 5. The real first customers: Greta, Nils and Penny (with snacks). Nils looks up at the ceiling.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.1, doorOpen: true, windowX: 0.56, leakX: 0.47, bulbX: 0.3, signX: 0.89, lamp: false }),
          { art: 'bucket', x: 820, y: 830, scale: 0.55 },
          { id: 'greta', art: 'greta', x: 170, y: 870, scale: 0.85, pose: 'wave', expr: 'happy' },
          { id: 'penny', art: 'penny', x: 420, y: 880, scale: 0.85, pose: 'stand', hold: 'snack', expr: 'happy', look: 1 },
          { id: 'nils', art: 'nils', x: 650, y: 880, scale: 0.8, pose: 'stand', expr: 'shocked', look: 1 },
          { id: 'her', art: 'heroine', x: 1220, y: 880, scale: 0.85, pose: 'cheer', expr: 'bliss', look: -1 },
        ],
      },
      camera: { move: 'panLeft', focus: [800, 450], amount: 0.08, ms: 4000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'say', key: 'comic.s5.p5.greta', at: [330, 90], to: 'greta', w: 400 },
        { kind: 'say', key: 'comic.s5.p5.nils', at: [800, 300], to: 'nils', w: 320 },
        { kind: 'say', key: 'comic.s5.p5.her', at: [1250, 150], to: 'her', w: 320 },
      ],
    },
    {
      // 6. Nils bravely takes the one chair. The happy hands are ready.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 480, windowX: 0.5, door: false, leak: false, sign: false, bulbX: 0.46, plant: false, lampX: 0.94 }),
          ...seated({ id: 'nils', art: 'nils', x: 230, y: 640, scale: 0.58, expr: 'shocked', look: 1 }),
          { id: 'her', art: 'heroine', x: 580, y: 640, scale: 0.54, pose: 'pop', expr: 'happy', look: -1 },
        ],
      },
      bubbles: [
        { kind: 'say', key: 'comic.s5.p6.nils', at: [400, 60], to: 'nils', w: 420 },
      ],
    },
    {
      // 7. The first pop, under the wobbly lamp. The leak keeps time: drip... drip... drip...
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.1, door: false, leakX: 0.93, sign: false, bulb: false, plant: false, lampX: 0.5 }),
          { art: 'drip', x: 745, y: 240, r: 16 },
          { id: 'nils', art: 'nils', x: 210, y: 700, scale: 0.78, pose: 'bust', expr: 'ow', look: 1 },
          { id: 'her', art: 'heroine', x: 580, y: 700, scale: 0.8, pose: 'bust', expr: 'sneaky', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 330], amount: 0.12, ms: 2500 },
      bubbles: [
        { kind: 'caption', key: 'comic.s5.p7.cap', at: [400, 40], w: 640 },
        { kind: 'whisper', key: 'comic.s5.p7.her', at: [600, 190], to: 'her', w: 300 },
      ],
    },
    {
      // 8. PLIP. A drop lands right on her head.
      layout: 'small',
      scene: {
        bg: ['#c9d2bd', '#a9b49c'],
        layers: [
          { id: 'her', art: 'heroine', x: 430, y: 660, scale: 1.05, pose: 'bust', expr: 'grumpy', look: 1 },
          { art: 'drip', x: 452, y: 200, r: 22, splash: true },
          { art: 'drip', x: 436, y: 90, r: 14 },
        ],
      },
      camera: { move: 'shake' },
      bubbles: [
        { kind: 'shout', key: 'comic.s5.p8.plip', at: [650, 100], w: 200, sound: 'pop_small' },
        { kind: 'say', key: 'comic.s5.p8.her', at: [170, 200], to: 'her', w: 230 },
      ],
    },
    {
      // 9. The big moment: POP! The first happy customer. Ooh, sparkles, ding. The bucket keeps time.
      layout: 'splash',
      scene: {
        bg: '#ffe9a8',
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 330, y: 560, colors: ['#ffe9a8', '#ffd25a'] },
          { art: 'burst', x: 200, y: 170, r: 150, color: '#ff9cbc' },
          { art: 'bucket', x: 900, y: 990, scale: 0.6 },
          { art: 'drip', x: 900, y: 760, r: 16 },
          { id: 'nils', art: 'nils', x: 320, y: 1000, scale: 1.1, pose: 'bust', expr: 'bliss' },
          { art: 'sparkles', x: 320, y: 640, r: 240 },
          { id: 'her', art: 'heroine', x: 740, y: 1040, scale: 0.85, pose: 'cheer', expr: 'bliss', look: -1 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_big',
      bubbles: [
        { kind: 'shout', key: 'comic.s5.p9.pop', at: [200, 170] },
        { kind: 'say', key: 'comic.s5.p9.nils', at: [660, 200], to: 'nils', w: 400, sound: 'ooh_happy' },
        { kind: 'shout', key: 'comic.s5.p9.ding', at: [100, 470], w: 160, sound: 'pop_gold' },
      ],
    },
    {
      // 10. The door creaks again: the hygiene inspector, clipboard ready. Everyone freezes; the plant goes wide-eyed.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.12, doorOpen: true, windowX: 0.3, leakX: 0.32, bulbX: 0.66, signX: 0.84, plantEyes: 'wide', lamp: false }),
          { art: 'bucket', x: 512, y: 830, scale: 0.5 },
          { id: 'insp', art: 'inspector', x: 192, y: 870, scale: 0.8, pose: 'stand', hold: 'clipboard', expr: 'grumpy', look: 1 },
          ...seated({ id: 'nils', art: 'nils', x: 760, y: 870, scale: 0.72, expr: 'shocked', look: -1 }),
          { id: 'her', art: 'heroine', x: 1000, y: 880, scale: 0.8, pose: 'stand', expr: 'shocked', look: -1 },
          { id: 'greta', art: 'greta', x: 1210, y: 880, scale: 0.8, pose: 'stand', expr: 'shocked', look: -1 },
          { id: 'penny', art: 'penny', x: 1390, y: 880, scale: 0.8, pose: 'stand', hold: 'snack', expr: 'shocked', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [300, 450], amount: 0.1, ms: 3500 },
      sound: 'creak',
      bubbles: [
        { kind: 'caption', key: 'comic.s5.p10.cap', at: [1000, 46], w: 460 },
        { kind: 'say', key: 'comic.s5.p10.insp', at: [470, 250], to: 'insp', w: 320 },
      ],
    },
    {
      // 11. The inspection: a magnifier on the leak, the bucket, the crooked "Clean!" sign. Horror.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, windowX: 0.14, door: false, leakX: 0.39, signX: 0.74, signTilt: 14, bulb: false, plant: false, lamp: false }),
          { art: 'bucket', x: 390, y: 960, scale: 0.8 },
          { id: 'insp', art: 'inspector', x: 150, y: 960, scale: 0.85, pose: 'point', hold: 'magnifier', expr: 'shocked', look: 1 },
          { art: 'drip', x: 392, y: 600, r: 18 },
          { id: 'her', art: 'heroine', x: 800, y: 980, scale: 0.8, pose: 'shrug', expr: 'shocked', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 520], amount: 0.1, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.s5.p11.insp', at: [290, 250], to: 'insp', w: 400 },
        { kind: 'say', key: 'comic.s5.p11.her', at: [820, 390], to: 'her', w: 280 },
      ],
    },
    {
      // 12. He does not close her down: gloves, always gloves. Button: the leak drips on his clipboard. The plant is smug.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, windowX: 0.85, door: false, leakX: 0.264, signX: 0.64, signTilt: 26, bulbX: 0.5, plantEyes: 'smug', lamp: false }),
          { id: 'insp', art: 'inspector', x: 520, y: 880, scale: 0.8, pose: 'stand', hold: 'clipboard', expr: 'neutral', flip: true },
          { art: 'drip', x: 423, y: 578, r: 18, splash: true },
          { id: 'her', art: 'heroine', x: 1000, y: 880, scale: 0.8, pose: 'wave', hold: 'gloves', expr: 'bliss', flip: true },
        ],
      },
      camera: { move: 'pullOut', focus: [800, 450], amount: 0.08, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.s5.p12.insp', at: [280, 190], to: 'insp', w: 420 },
        { kind: 'shout', key: 'comic.s5.p12.plip', at: [240, 520], w: 160, sound: 'pop_small' },
        { kind: 'caption', key: 'comic.s5.p12.end', at: [1150, 820], w: 760 },
      ],
    },
  ],
};
