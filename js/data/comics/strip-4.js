// Chapter 4 strip "Rock bottom" (T4.3b): after the meeting, a few days of nothing. 9 panels, played in two parts (see PANELS).
// Beginning: late at night {name} sinks into the sofa, scrolling pop videos she may not do; her thumb pops the
// bubbles on the screen. Cold tea, a pity party for one. Middle: down the hall, he sleeps in bedtime armor.
// The spark: a thought cloud with a customer, a chair, a lamp; she sits up, the lamp clicks on. Splash: her
// triumphant silhouette, "I will do it for a living!" Button: the cold tea, smug: "I'll keep your seat warm."
// Running gags: the plant watches (sad, amazed, smug); his armor gets fancier (three plumes and a night-cap).
// Visual surprise: the big phone close-up (the phone returns in the scroll-and-pop mode, T4.6).
// Format: docs/COMIC-FORMAT.md.

const SOFA = '#2f8a70'; // the sofa at night
const NIGHT_CURTAINS = '#7b6ad8'; // the living-room curtains (the same in panel 7 when the lamp is on, R8)

/** The living room at night (dark wall, moon and stars, lamp off). @param {number} w panel width @param {number} h panel height @param {object} [o] room options @returns {object} layer */
const night = (w, h, o = {}) => ({
  art: 'room', kind: 'living', w, h, wall: ['#3b3566', '#2d2850'], stripes: '#35305e', skirting: '#4b4a86', floor: '#4a3a52',
  boards: '#3a2d42', sky: ['#10153a', '#2a3470'], cloud: false, moon: true, stars: true, curtains: NIGHT_CURTAINS, lamp: false, ...o,
});

/**
 * The living room's floor lamp, switched off (R8: it is the lamp that clicks on in panel 7, so it stands in the room
 * before that): the same shape as the room's own lamp, but a dull shade and no glow.
 * @param {number} x middle @param {number} F floor line of the panel @returns {object[]} shape layers (put them before the sofa)
 */
const lampOff = (x, F) => [
  { shape: 'path', d: `M${x} ${F * 0.45} L${x} ${F + 30}`, stroke: true, sw: 10 },
  { shape: 'ellipse', x, y: F + 34, rx: 50, ry: 12, fill: '#4e3424', stroke: true, sw: 4 },
  { shape: 'path', d: `M${x - 42} ${F * 0.28} L${x + 42} ${F * 0.28} L${x + 70} ${F * 0.46} L${x - 70} ${F * 0.46}Z`, fill: '#a8914e', stroke: true, sw: 5 },
];

/**
 * A mug of cold tea (no steam, a wrinkly skin on top), optionally with a smug face and a tiny party hat.
 * @param {number} x middle @param {number} y bottom @param {number} s scale @param {boolean} [smug] face and hat
 * @returns {object[]} shape layers (the body has id 'tea' so a bubble can point at it)
 */
function tea(x, y, s, smug = false) {
  const w = 140 * s;
  const h = 170 * s;
  const out = [
    { shape: 'path', d: `M${x + w / 2 - 6} ${y - h * 0.8} q${60 * s} ${-6 * s} ${58 * s} ${44 * s} q${-2 * s} ${46 * s} ${-58 * s} ${50 * s}`, fill: 'none', stroke: true, sw: 22 * s },
    { shape: 'path', d: `M${x + w / 2 - 6} ${y - h * 0.8} q${60 * s} ${-6 * s} ${58 * s} ${44 * s} q${-2 * s} ${46 * s} ${-58 * s} ${50 * s}`, fill: 'none', stroke: '#fff8ee', sw: 12 * s },
    { id: 'tea', shape: 'rect', x: x - w / 2, y: y - h, w, h, rx: 22 * s, fill: '#fff8ee', stroke: true, sw: 6, mouth: [x, y - h * 0.32] },
    { shape: 'ellipse', x, y: y - h + 4 * s, rx: w / 2 - 6 * s, ry: 14 * s, fill: '#9a6a44', stroke: true, sw: 4 },
    { shape: 'path', d: `M${x - w * 0.3} ${y - h + 2 * s} q${w * 0.1} ${-8 * s} ${w * 0.2} 0 q${w * 0.1} ${8 * s} ${w * 0.2} 0`, fill: 'none', stroke: '#c8a07a', sw: 4 },
  ];
  if (smug) {
    out.push(
      { shape: 'path', d: `M${x - 44 * s} ${y - h * 0.6} q${14 * s} ${-10 * s} ${28 * s} 0 M${x + 16 * s} ${y - h * 0.6} q${14 * s} ${-10 * s} ${28 * s} 0`, fill: 'none', stroke: true, sw: 6 },
      { shape: 'path', d: `M${x - 22 * s} ${y - h * 0.36} q${26 * s} ${16 * s} ${46 * s} ${-12 * s}`, fill: 'none', stroke: true, sw: 6 },
      { shape: 'path', d: `M${x + 14 * s} ${y - h * 0.72} q${16 * s} ${-14 * s} ${32 * s} ${-4 * s}`, fill: 'none', stroke: true, sw: 5 },
      { shape: 'ellipse', x: x - 46 * s, y: y - h * 0.45, rx: 13 * s, ry: 8 * s, fill: '#f06e7e', opacity: 0.5 },
      { shape: 'path', d: `M${x - 36 * s} ${y - h - 8 * s} L${x + 34 * s} ${y - h - 4 * s} L${x + 10 * s} ${y - h - 92 * s}Z`, fill: '#ffd25a', stroke: true, sw: 5 },
      { shape: 'circle', x: x + 10 * s, y: y - h - 96 * s, r: 11 * s, fill: '#e66a8f', stroke: true, sw: 4 },
    );
  } else {
    out.push({ shape: 'ellipse', x: x - 6 * s, y: y - h * 0.5, rx: 22 * s, ry: 18 * s, fill: '#ff9cbc', opacity: 0.8 });
  }
  return out;
}

/** The sofa's arm seen close up, filling the bottom of a small panel. @param {number} w width @returns {object[]} shape layers */
const armrest = (w) => [
  { shape: 'rect', x: -40, y: 450, w, h: 200, rx: 70, fill: SOFA, stroke: true, sw: 7 },
  { shape: 'path', d: `M40 492 Q${w / 2} 470 ${w - 100} 492`, fill: 'none', stroke: '#5cc3a2', sw: 6, opacity: 0.6 },
];

/**
 * The big phone: a pop video playing on top, a grid of bubbles below (her thumb pops them for comfort).
 * @param {number} x left edge @param {number} y top edge @returns {object[]} shape layers
 */
function bigPhone(x, y) {
  const out = [
    { shape: 'circle', x: x + 230, y: y + 430, r: 470, fill: '#8fe3ff', opacity: 0.12 },
    { shape: 'rect', x, y, w: 460, h: 860, rx: 64, fill: '#2b2f3a', stroke: true, sw: 8 },
    { shape: 'rect', x: x + 26, y: y + 60, w: 408, h: 750, rx: 20, fill: '#eaf8ff' },
    { shape: 'rect', x: x + 190, y: y + 24, w: 80, h: 16, rx: 8, fill: '#4b5060' },
    // The video: a cartoon cheek, one bump, two gloved fingers ready.
    { shape: 'rect', x: x + 40, y: y + 80, w: 380, h: 310, rx: 14, fill: '#ffe8d6' },
    { shape: 'ellipse', x: x + 230, y: y + 250, rx: 170, ry: 118, fill: '#ebb795', stroke: true, sw: 5 },
    { shape: 'ellipse', x: x + 150, y: y + 300, rx: 40, ry: 22, fill: '#f06e7e', opacity: 0.35 },
    { shape: 'circle', x: x + 230, y: y + 232, r: 34, fill: '#ff9cb5', stroke: true, sw: 5 },
    { shape: 'circle', x: x + 230, y: y + 220, r: 12, fill: '#fff8ee' },
    { shape: 'ellipse', x: x + 164, y: y + 222, rx: 24, ry: 58, fill: '#b9a6f0', stroke: true, sw: 5, rotate: 28 },
    { shape: 'ellipse', x: x + 296, y: y + 222, rx: 24, ry: 58, fill: '#b9a6f0', stroke: true, sw: 5, rotate: -28 },
    { art: 'sparkles', x: x + 230, y: y + 200, r: 110 },
    // Play bar.
    { shape: 'rect', x: x + 50, y: y + 408, w: 360, h: 12, rx: 6, fill: '#ffffff', stroke: true, sw: 3 },
    { shape: 'rect', x: x + 50, y: y + 408, w: 250, h: 12, rx: 6, fill: '#e8505b' },
    { shape: 'circle', x: x + 300, y: y + 414, r: 14, fill: '#e8505b', stroke: true, sw: 4 },
  ];
  // The bubble grid: some already popped flat.
  const popped = new Set(['0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '0,1', '1,1', '2,1', '3,1', '4,1', '0,2', '1,2', '2,2', '1,3', '3,2']);
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const cx = x + 66 + c * 55;
      const cy = y + 470 + r * 54;
      out.push(popped.has(`${c},${r}`)
        ? { shape: 'ellipse', x: cx, y: cy + 8, rx: 20, ry: 6, fill: '#b9dcf0', stroke: '#7fb2cf', sw: 3 }
        : { shape: 'circle', x: cx, y: cy, r: 21, fill: '#f4fbff', stroke: '#7fb2cf', sw: 3 });
    }
  }
  return out;
}

/** Her thumb coming in from the bottom right, mid-pop, with a small burst. @returns {object[]} shape layers */
const thumb = () => [
  { art: 'burst', x: 612, y: 728, r: 52, color: '#ffe27a' },
  { shape: 'path', d: 'M1000 1000 L790 1000 Q730 900 668 822 Q618 762 652 726 Q692 694 744 744 L1000 896Z', fill: '#ebb795', stroke: true, sw: 7 },
  { shape: 'ellipse', x: 664, y: 742, rx: 22, ry: 16, fill: '#ffe9e0', stroke: true, sw: 4, rotate: -42 },
];

/**
 * The thought cloud: puffs with one outline, a trail of small puffs down to her head, and what she imagines inside.
 * @returns {object[]} layers
 */
function idea() {
  const puffs = [[900, 250, 110], [1050, 170, 120], [1220, 180, 110], [1350, 290, 100], [1330, 440, 100], [1170, 520, 110], [990, 510, 110], [860, 400, 100], [1100, 340, 220]];
  return [
    { shape: 'circle', x: 580, y: 400, r: 14, fill: '#ffffff', stroke: true, sw: 4 },
    { shape: 'circle', x: 630, y: 370, r: 22, fill: '#ffffff', stroke: true, sw: 4 },
    { shape: 'circle', x: 705, y: 345, r: 34, fill: '#ffffff', stroke: true, sw: 5 },
    ...puffs.map(([x, y, r]) => ({ shape: 'circle', x, y, r, fill: '#ffffff', stroke: true, sw: 6 })),
    ...puffs.map(([x, y, r]) => ({ shape: 'circle', x, y, r: r - 4, fill: '#ffffff' })),
    { shape: 'rect', x: 820, y: 556, w: 560, h: 10, rx: 5, fill: '#e8e0d6' },
    // A lamp, a chair, a happy customer, and her with happy hands.
    { shape: 'circle', x: 1290, y: 300, r: 90, fill: '#fff3a8', opacity: 0.7 },
    { shape: 'path', d: 'M1290 300 L1290 556', fill: 'none', stroke: true, sw: 7 },
    { shape: 'ellipse', x: 1290, y: 558, rx: 34, ry: 9, fill: '#6e4528', stroke: true, sw: 4 },
    { shape: 'path', d: 'M1260 250 L1320 250 L1342 312 L1238 312Z', fill: '#ffd25a', stroke: true, sw: 5 },
    { art: 'chair', x: 1130, y: 560, scale: 0.42, color: '#e66a8f' },
    { art: 'penny', x: 1130, y: 560, scale: 0.42, pose: 'sit', expr: 'happy', look: -1 },
    { art: 'heroine', x: 960, y: 560, scale: 0.38, pose: 'pop', expr: 'bliss' },
    { art: 'sparkles', x: 1060, y: 220, r: 90 },
  ];
}

// SPEC D32b (owner, 2026-10-27): the strip is played in two parts around the phone scroll: STRIP = panels 1 to 5 (the
// sofa, the videos, the cold tea, the pity party, him asleep), then the phone scroll (2:42 to 2:51 am, ends on the idea
// card), then STRIP_IDEA = panels 6 to 9 (2:51 am, the click, "I will do it for a living!", the tea).
const PANELS = [
    {
      // 1. Late night. The sofa is slowly swallowing her. Cold tea on the armrest, the plant looks worried.
      layout: 'wide',
      scene: {
        layers: [
          night(1600, 900, { floorY: 640, windowX: 0.6, pictureX: 0.22, plantX: 0.06, plantEyes: 'sad' }),
          { shape: 'circle', x: 1420, y: 170, r: 58, fill: '#fff8ee', stroke: true, sw: 6 },
          { shape: 'path', d: 'M1420 170 L1376 158 M1420 170 L1452 176', fill: 'none', stroke: true, sw: 7 },
          ...lampOff(1270, 640), // off for now; it clicks on in panel 7
          { art: 'sofa', x: 800, y: 870, w: 820, color: SOFA },
          { shape: 'path', d: 'M904 770 L740 430 L880 410Z', fill: '#8fe3ff', opacity: 0.22 },
          { id: 'her', art: 'heroine', x: 800, y: 905, pose: 'sit', expr: 'sad', hold: 'phone', outfit: 'pajamas', look: 1 },
          { shape: 'path', d: 'M640 800 q-30 30 -10 60 M960 800 q30 30 10 60 M660 740 q-24 20 -14 44 M940 740 q24 20 14 44', fill: 'none', stroke: true, sw: 5, opacity: 0.55 },
          ...tea(1155, 640, 0.55),
        ],
      },
      camera: { move: 'pushIn', focus: [800, 520], amount: 0.08, ms: 4000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p1.cap', at: [430, 60], w: 720 },
        { kind: 'say', key: 'comic.s4.p1.her', at: [500, 260], to: 'her', w: 340 },
      ],
    },
    {
      // 2. Surprise: the phone, big. A pop video she may not do; her thumb pops the screen bubbles instead.
      layout: 'square',
      scene: {
        bg: ['#2a2b55', '#1b1c3a'],
        layers: [...bigPhone(290, 120), ...thumb()],
      },
      camera: { move: 'pushIn', focus: [520, 520], amount: 0.08, ms: 3000 },
      sound: 'pop_small',
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p2.cap', at: [500, 58], w: 660 },
        { kind: 'whisper', key: 'comic.s4.p2.her', at: [150, 640], w: 250, sound: 'pop_small' },
      ],
    },
    {
      // 3. The cold tea, close up. She asks it not to judge her.
      layout: 'small',
      scene: {
        layers: [
          night(800, 600, { floorY: 420, windowX: 0.75, picture: false, plantX: 0.1, plantEyes: 'sad' }),
          ...armrest(560),
          ...tea(300, 470, 1.05),
          { id: 'her', art: 'heroine', x: 640, y: 640, scale: 0.85, pose: 'bust', expr: 'sad', outfit: 'pajamas', flip: true, look: -1 },
        ],
      },
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p3.cap', at: [210, 46], w: 360 },
        { kind: 'say', key: 'comic.s4.p3.her', at: [600, 170], to: 'her', w: 290 },
      ],
    },
    {
      // 4. A tiny pity party: one party hat, one droopy blower, one sad balloon.
      layout: 'small',
      scene: {
        bg: ['#3b3566', '#2d2850'],
        layers: [
          { shape: 'path', d: 'M150 560 q-20 -40 0 -80', fill: 'none', stroke: true, sw: 4 },
          { shape: 'ellipse', x: 150, y: 470, rx: 44, ry: 30, fill: '#e66a8f', stroke: true, sw: 6 },
          { shape: 'path', d: 'M122 466 q14 -10 30 0 q12 8 24 -2', fill: 'none', stroke: true, sw: 3, opacity: 0.6 },
          { id: 'her', art: 'heroine', x: 400, y: 640, pose: 'bust', expr: 'sad', outfit: 'pajamas' },
          { shape: 'path', d: 'M284 296 Q336 292 380 262 L292 150Z', fill: '#ffd25a', stroke: true, sw: 6 },
          { shape: 'circle', x: 292, y: 146, r: 15, fill: '#6a7be6', stroke: true, sw: 4 },
          { shape: 'circle', x: 318, y: 238, r: 8, fill: '#e66a8f' },
          { shape: 'circle', x: 340, y: 270, r: 7, fill: '#6a7be6' },
          { shape: 'path', d: 'M412 452 L470 458', fill: 'none', stroke: '#e8505b', sw: 14 },
          { shape: 'path', d: 'M470 458 q42 4 44 42 q0 30 -20 32', fill: 'none', stroke: '#6a7be6', sw: 16 },
          { shape: 'rect', x: 600, y: 120, w: 18, h: 10, fill: '#ffd25a', rotate: 30 },
          { shape: 'rect', x: 660, y: 250, w: 18, h: 10, fill: '#e66a8f', rotate: -20 },
          { shape: 'rect', x: 560, y: 330, w: 18, h: 10, fill: '#8fe3ff', rotate: 60 },
        ],
      },
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p4.cap', at: [210, 46], w: 360 },
        { kind: 'say', key: 'comic.s4.p4.her', at: [650, 170], to: 'her', w: 200 },
      ],
    },
    {
      // 5. Running gag: down the hall he sleeps in bedtime armor (three plumes and a night-cap). Her pillow is empty.
      layout: 'tall',
      scene: {
        layers: [
          { art: 'room', kind: 'bedroom', w: 900, h: 1200, floorY: 760, windowX: 0.5 },
          { art: 'bed', x: 450, y: 1190, w: 820 },
          { id: 'him', art: 'husband', x: 253, y: 980, pose: 'lie', expr: 'sleepy', outfit: 'armor', visor: 'down', plumes: 3, nightcap: '#6a7be6' },
          { art: 'blanket', x: 450, y: 1190, w: 820 },
        ],
      },
      camera: { move: 'pushIn', focus: [253, 760], amount: 0.08, ms: 3000 },
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p5.cap', at: [450, 66], w: 760 },
        { kind: 'whisper', key: 'comic.s4.p5.him', at: [640, 440], to: 'him', w: 320 },
      ],
    },
    {
      // 6. The spark: a thought cloud with a customer, a chair and a lamp.
      layout: 'wide',
      scene: {
        layers: [
          night(1600, 900, { floorY: 640, windowX: 0.5, pictureX: 0.08, plant: false }),
          ...lampOff(1525, 640), // still off: it clicks on in the next panel
          { art: 'sofa', x: 420, y: 870, w: 700, color: SOFA },
          { id: 'her', art: 'heroine', x: 420, y: 900, pose: 'sit', expr: 'shocked', hold: 'phone', outfit: 'pajamas', look: 1 },
          ...idea(),
        ],
      },
      camera: { move: 'pushIn', focus: [1100, 360], amount: 0.1, ms: 3000 },
      sound: 'ooh_happy',
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p6.cap', at: [280, 56], w: 440 },
        { kind: 'whisper', key: 'comic.s4.p6.her', at: [160, 270], to: 'her', w: 240 },
      ],
    },
    {
      // 7. She sits up. The lamp clicks on. The plant is amazed.
      layout: 'tall',
      scene: {
        layers: [
          { art: 'room', kind: 'living', w: 900, h: 1200, floorY: 860, windowX: 0.3, sky: ['#10153a', '#2a3470'], cloud: false, moon: true, stars: true,
            curtains: NIGHT_CURTAINS, picture: false, plantX: 0.92, plantEyes: 'wide', lampX: 0.7 },
          { shape: 'path', d: 'M540 230 l-50 -40 M630 170 l0 -60 M720 230 l50 -40 M520 330 l-60 0 M740 330 l60 0', fill: 'none', stroke: '#ffd25a', sw: 9 },
          { art: 'sofa', x: 380, y: 1150, w: 700 },
          { id: 'her', art: 'heroine', x: 380, y: 1150, pose: 'sit', expr: 'scheming', hold: 'phone', outfit: 'pajamas', look: 1 },
        ],
      },
      camera: { move: 'shake' },
      sound: 'creak',
      bubbles: [
        { kind: 'shout', key: 'comic.s4.p7.click', at: [660, 70], w: 260 },
        { kind: 'say', key: 'comic.s4.p7.her', at: [330, 420], to: 'her', w: 460 },
      ],
    },
    {
      // 8. Splash: her triumphant silhouette against the rays, standing on the sofa. The plan.
      layout: 'splash',
      scene: {
        layers: [
          { art: 'rays', w: 1000, h: 1000, x: 500, y: 520, n: 22, colors: ['#ffe9a8', '#ffb84d'] },
          { art: 'sofa', x: 500, y: 1010, w: 820, color: '#3a2d42' },
          { id: 'her', art: 'heroine', x: 500, y: 890, scale: 0.9, pose: 'cheer', hold: 'phone', silhouette: true },
          { art: 'sparkles', x: 500, y: 520, r: 360, color: '#ffffff' },
        ],
      },
      camera: { move: 'pullOut', focus: [500, 480], amount: 0.15, ms: 2500 },
      sound: 'cheer',
      bubbles: [
        { kind: 'shout', key: 'comic.s4.p8.her', at: [500, 110], to: 'her', w: 820 },
        { kind: 'whisper', key: 'comic.s4.p8.quiet', at: [830, 760], w: 300 },
      ],
    },
    {
      // 9. Button: she has gone to make plans. The cold tea, smug in the party hat. The plant agrees.
      layout: 'small',
      scene: {
        layers: [
          night(800, 600, { floorY: 420, windowX: 0.75, picture: false, plantX: 0.1, plantEyes: 'smug' }),
          ...armrest(860),
          { shape: 'path', d: 'M520 520 q60 30 140 0', fill: 'none', stroke: true, sw: 5, opacity: 0.5 },
          ...tea(300, 470, 1.05, true),
        ],
      },
      bubbles: [
        { kind: 'caption', key: 'comic.s4.p9.cap', at: [210, 46], w: 340 },
        { kind: 'say', key: 'comic.s4.p9.tea', at: [600, 210], to: 'tea', w: 300, sound: 'laugh_evil' },
      ],
    },
];

/** Part 1 (chapter 4's opening strip): panels 1 to 5, before the phone scroll. */
export const STRIP = { id: 'strip4', title: 'comic.s4.title', panels: PANELS.slice(0, 5) };

/** Part 2 (after the phone scroll, SPEC D32b): panels 6 to 9, the idea at 2:51 am. */
export const STRIP_IDEA = { id: 'strip4b', title: 'comic.s4b.title', panels: PANELS.slice(5) };
