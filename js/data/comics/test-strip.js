// Test strip "Happy hands" (T4.1): an 8-panel comedy that tries every part of the comic player with the art kit.
// She has very happy hands, he has a bump on his chin, she pops it, he bans popping, and that night... a torch.
// Uses wide, small, splash and tall panels, push-in, pull-out and shake camera moves, sounds and {name}.
// The real chapter 0 strip comes in T4.2. Format: docs/COMIC-FORMAT.md.

/** The living room filling a panel. @param {number} w panel width @param {number} h panel height @param {object} [o] room options @returns {object} layer */
const living = (w, h, o = {}) => ({ art: 'room', kind: 'living', w, h, ...o });

export const STRIP = {
  id: 'test',
  title: 'comic.test.title',
  panels: [
    {
      // 1. The calm before: he relaxes on the sofa, she spots something.
      layout: 'wide',
      scene: {
        layers: [
          living(1600, 900, { floorY: 640, windowX: 0.62, pictureX: 0.2 }),
          { art: 'sofa', x: 1060, y: 840, w: 760 },
          { id: 'him', art: 'husband', x: 1000, y: 840, pose: 'sit', expr: 'neutral', hold: 'remote', look: -1 },
          { id: 'her', art: 'heroine', x: 420, y: 870, pose: 'pop', expr: 'bliss' },
        ],
      },
      camera: { move: 'pushIn', focus: [1000, 420], amount: 0.06, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.test.p1.cap', at: [420, 62], w: 720 },
        { kind: 'say', key: 'comic.test.p1.her', at: [720, 250], to: 'her', w: 360 },
        { kind: 'say', key: 'comic.test.p1.him', at: [1300, 200], to: 'him' },
      ],
    },
    {
      // 2. Close-up: her sneaky look.
      layout: 'small',
      scene: { layers: [living(800, 600, { floorY: 520, windowX: 0.85, picture: false, plant: false, lamp: false }),
        { id: 'her', art: 'heroine', x: 290, y: 640, scale: 1.25, pose: 'bust', expr: 'sneaky', look: 1 }] },
      camera: { move: 'pushIn', focus: [290, 300], amount: 0.1, ms: 2500 },
      bubbles: [{ kind: 'whisper', key: 'comic.test.p2.her', at: [600, 120], to: 'her', w: 330 }],
    },
    {
      // 3. Close-up: he knows that look. A fast dramatic zoom.
      layout: 'small',
      scene: { layers: [living(800, 600, { floorY: 520, windowX: 0.18, picture: false, plant: false, lamp: false }),
        { id: 'him', art: 'husband', x: 530, y: 640, scale: 1.25, pose: 'bust', expr: 'shocked', flip: true }] },
      camera: { move: 'pushIn', focus: [530, 300], amount: 0.16, ms: 700 },
      bubbles: [{ kind: 'shout', key: 'comic.test.p3.him', at: [220, 130], to: 'him', w: 300 }],
    },
    {
      // 4. Too late: the happy hands are coming.
      layout: 'small',
      scene: { layers: [{ art: 'rays', w: 800, h: 600, x: 400, y: 300, colors: ['#ffd8e6', '#ffbcd2'] },
        { id: 'her', art: 'heroine', x: 400, y: 640, scale: 0.9, pose: 'pop', expr: 'scheming' }] },
      sound: 'laugh_evil',
      bubbles: [{ kind: 'caption', key: 'comic.test.p4.cap', at: [650, 50], w: 240 }],
    },
    {
      // 5. The big moment: POP!
      layout: 'splash',
      scene: {
        bg: '#ffe9a8',
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 330, y: 260, colors: ['#ffe9a8', '#ffd25a'] },
          { art: 'burst', x: 300, y: 240, r: 210, color: '#ff9cbc' },
          { id: 'him', art: 'husband', x: 300, y: 1000, pose: 'facepalm', expr: 'shocked' },
          { art: 'sparkles', x: 330, y: 560, r: 100 },
          { id: 'her', art: 'heroine', x: 720, y: 1000, pose: 'cheer', expr: 'bliss' },
        ],
      },
      camera: { move: 'shake' },
      sound: 'pop_big',
      bubbles: [
        { kind: 'shout', key: 'comic.test.p5.pop', at: [300, 240] },
        { kind: 'say', key: 'comic.test.p5.her', at: [760, 170], to: 'her', w: 380, sound: 'ooh_happy' },
      ],
    },
    {
      // 6. He has had enough.
      layout: 'wide',
      scene: {
        layers: [
          living(1600, 900, { floorY: 640, windowX: 0.62, pictureX: 0.2 }),
          { art: 'sofa', x: 1180, y: 840, w: 700 },
          { id: 'her', art: 'heroine', x: 420, y: 880, pose: 'stand', expr: 'shocked', look: 1 },
          { id: 'him', art: 'husband', x: 1040, y: 880, pose: 'point', expr: 'grumpy', flip: true },
        ],
      },
      camera: { move: 'pushIn', focus: [1040, 380], amount: 0.08, ms: 3000 },
      bubbles: [
        { kind: 'say', key: 'comic.test.p6.him', at: [1200, 150], to: 'him', w: 520 },
        { kind: 'think', key: 'comic.test.p6.her', at: [400, 150], to: 'her', w: 400 },
      ],
    },
    {
      // 7. The Great Popping Ban.
      layout: 'tall',
      scene: { layers: [{ art: 'rays', w: 900, h: 1200, x: 450, y: 520, colors: ['#d6e6ff', '#b8d2ff'] },
        { id: 'him', art: 'husband', x: 450, y: 1190, scale: 1.05, pose: 'hips', expr: 'proud' }] },
      camera: { move: 'pullOut', focus: [450, 500], amount: 0.15, ms: 2500 },
      sound: 'cheer',
      bubbles: [
        { kind: 'caption', key: 'comic.test.p7.cap', at: [450, 60], w: 780 },
        { kind: 'shout', key: 'comic.test.p7.him', at: [450, 290], to: 'him', w: 700 },
      ],
    },
    {
      // 8. That very night: a glow under the blanket.
      layout: 'tall',
      scene: {
        layers: [
          { art: 'room', kind: 'bedroom', w: 900, h: 1200, floorY: 760, windowX: 0.5 },
          { art: 'bed', x: 450, y: 1190, w: 820 },
          { art: 'husband', x: 253, y: 980, pose: 'lie', expr: 'sleepy' },
          { art: 'heroine', x: 647, y: 980, pose: 'lie', expr: 'sneaky' },
          { art: 'blanket', x: 450, y: 1190, w: 820, torch: 'right' },
        ],
      },
      camera: { move: 'pushIn', focus: [647, 700], amount: 0.08, ms: 3500 },
      bubbles: [
        { kind: 'caption', key: 'comic.test.p8.cap', at: [450, 56], w: 600 },
        { kind: 'whisper', key: 'comic.test.p8.her', at: [560, 430], to: [680, 690], w: 420, sound: 'pop_small' },
        { kind: 'caption', key: 'comic.test.p8.end', at: [450, 1140], w: 780 },
      ],
    },
  ],
};
