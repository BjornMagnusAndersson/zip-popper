// Milestone strip "First plant" (T4.3c): played when the player buys the studio's first real plant. 4 panels.
// {name} lifts the new plant high like a trophy. Greta and Penny judge it in whispers (it judges them back), the
// inspector peers at it with his magnifier and finds it the cleanest thing in the room (it looks smug, now in Greta's
// scarf). Button: the plant grows a round pink bud, her happy hands twitch, the plant sweats. Running gag: the plant,
// silent, with eyes on its pot. Visual surprise: the bud that looks very poppable. Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0), without the room's own plant (the new one is a separate layer). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plant: false, lamp: false, ...o });

export const STRIP = {
  id: 'mplant',
  title: 'comic.mplant.title',
  panels: [
    {
      // 1. Shop day: she lifts the new plant above her head like a trophy. Light, sparkles, a cheer.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.08, windowX: 0.42, leakX: 0.7, bulbX: 0.56, signX: 0.88 }),
          { art: 'bucket', x: 1120, y: 830, scale: 0.5 },
          { id: 'her', art: 'heroine', x: 760, y: 900, scale: 0.8, pose: 'cheer', expr: 'bliss' },
          { art: 'plant', x: 760, y: 440, scale: 0.85 },
          { art: 'sparkles', x: 760, y: 230, r: 240 },
        ],
      },
      camera: { move: 'pullOut', focus: [760, 400], amount: 0.1, ms: 3000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'caption', key: 'comic.mplant.p1.cap', at: [300, 60], w: 520 },
        { kind: 'say', key: 'comic.mplant.p1.her', at: [1240, 300], to: 'her', w: 420 },
      ],
    },
    {
      // 2. Greta and Penny stare at it and whisper. The plant stares back, sadly.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.5, door: false, leak: false, sign: false, bulb: false }),
          { art: 'plant', x: 400, y: 580, scale: 0.95, eyes: 'sad' },
          { id: 'greta', art: 'greta', x: 140, y: 650, scale: 0.8, pose: 'bust', expr: 'sad', look: 1 },
          { id: 'penny', art: 'penny', x: 660, y: 650, scale: 0.8, pose: 'bust', expr: 'shocked', flip: true },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 380], amount: 0.1, ms: 2500 },
      bubbles: [
        { kind: 'whisper', key: 'comic.mplant.p2.greta', at: [170, 70], to: 'greta', w: 280 },
        { kind: 'whisper', key: 'comic.mplant.p2.penny', at: [630, 70], to: 'penny', w: 280 },
      ],
    },
    {
      // 3. The inspector checks it with his magnifier. Verdict: the cleanest thing here. The plant (now in Greta's scarf) is smug.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.82, door: false, leakX: 0.12, sign: false, bulb: false }),
          { art: 'plant', x: 560, y: 580, scale: 0.9, eyes: 'smug', scarf: '#e8505b' },
          { id: 'insp', art: 'inspector', x: 230, y: 700, scale: 0.75, pose: 'point', hold: 'magnifier', expr: 'neutral', look: 1 },
        ],
      },
      sound: 'pop_gold',
      bubbles: [
        { kind: 'say', key: 'comic.mplant.p3.insp', at: [560, 70], to: 'insp', w: 380 },
      ],
    },
    {
      // 4. Button: a round pink bud appears. Her happy hands twitch. The plant sweats. A new studio rule.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, windowX: 0.78, door: false, leak: false, sign: false, bulbX: 0.22 }),
          { art: 'plant', x: 300, y: 960, scale: 1.25, eyes: 'wide', scarf: '#e8505b', bud: true, sweat: true },
          { art: 'sparkles', x: 362, y: 560, r: 70 },
          { id: 'her', art: 'heroine', x: 770, y: 1010, scale: 0.85, pose: 'pop', expr: 'scheming', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [500, 560], amount: 0.05, ms: 3000 },
      bubbles: [
        { kind: 'whisper', key: 'comic.mplant.p4.her', at: [690, 420], to: 'her', w: 440, sound: 'laugh_evil' },
        { kind: 'caption', key: 'comic.mplant.p4.end', at: [500, 70], w: 900 },
      ],
    },
  ],
};
