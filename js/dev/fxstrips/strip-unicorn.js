// Test strip "The Unicorn zit" (a teaser, fx-strips.html, developer only): a routine visit from the hygiene inspector,
// but on his cheek sits a pearly, glittery zit. Close-up: rainbow light fans out of it, everyone gasps. The pop: a
// fountain of gem sand (diamond, sapphire, emerald, ruby) and sparkle. Last panel: "Coming in the full game", and the
// inspector, sparkly clean, says his famous word. Effects: pearl, prism, bokeh, dark, gems, flash, reveal, lamps,
// mood. Format: see player.js.

/** The dingy studio filling a panel (tier 0, the plant in Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, leak: false, plantScarf: '#e8505b', ...o });

/** The inspector with the Unicorn zit on his cheek (head units: his right cheek). @param {object} o layer options @returns {object} layer */
const inspector = (o) => ({ id: 'insp', art: 'inspector', acc: { zit: { x: 62, y: 26, r: 22, kind: 'pearl' } }, ...o });

export const STRIP = {
  id: 'unicorn',
  short: 'Unicorn',
  title: 'The Unicorn zit (teaser)',
  endText: 'The Unicorn zit: coming in the full game!',
  panels: [
    {
      // 1. A routine inspection, until she looks closer.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, door: false, windowX: 0.75, bulbX: 0.5, sign: false, plantX: 0.95 })],
        fore: [
          { art: 'chair', x: 300, y: 1150, scale: 0.9 },
          inspector({ x: 300, y: 1150, scale: 0.9, pose: 'sit', hold: 'clipboard', expr: 'grumpy', look: 1 }),
          { id: 'her', art: 'heroine', x: 760, y: 1175, scale: 0.95, pose: 'point', flip: true, hold: 'magnifier', expr: 'shocked', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 720], amount: 0.08, ms: 3500 },
      env: { tier: 0, face: 'insp' },
      fx: [
        { id: 'mood' },
        { id: 'lamps' },
        { id: 'pearl', p: 'insp', r: 40, n: 5 },
      ],
      beats: [
        { say: { kind: 'caption', text: 'A routine inspection.', at: [230, 70], w: 400 } },
        { say: { kind: 'say', text: 'Hold on... what is THAT?', at: [700, 380], to: 'her', w: 330 } },
        { say: { kind: 'say', text: "It's nothing. Pop it.", at: [250, 470], to: 'insp', w: 300 } },
      ],
    },
    {
      // 2. Close-up: the zit glows like a pearl, rainbow light pours out of it. Everyone gasps.
      layout: 'splash',
      scene: {
        back: [studio(1000, 1000, { floorY: 720, door: false, windowX: 0.5, bulb: false, sign: false, plant: false })],
        fore: [
          inspector({ x: 430, y: 1030, scale: 1.7, pose: 'bust', expr: 'shocked', look: 0 }),
          { id: 'greta', art: 'greta', x: 110, y: 1040, scale: 0.85, pose: 'bust', expr: 'shocked', look: 1 },
          { id: 'nils', art: 'nils', x: 900, y: 1060, scale: 0.78, pose: 'bust', expr: 'shocked', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [600, 560], amount: 0.06, ms: 4500 },
      env: { tier: 0, party: true, face: 'insp' },
      fx: [
        { id: 'dark', layer: 'back', order: 10, rgb: '20,10,40', a: 0.7, fadeIn: 0.8 },
        { id: 'bokeh', layer: 'back', fadeIn: 1.5 },
        { id: 'prism', p: 'insp', n: 8, len: 0.95, spread: 2.5, dir: -0.65, grow: 1.6, a: 0.75 },
        { id: 'pearl', p: 'insp', r: 50, n: 7 },
        { id: 'mood' },
      ],
      beats: [
        { say: { kind: 'caption', text: 'One in a million: a UNICORN ZIT.', at: [300, 70], w: 540 } },
        { say: { kind: 'shout', text: 'GASP!', at: [820, 140], w: 240 }, fire: ['prism', 'pearl', 'bokeh'], shake: 0.3 },
        { say: { kind: 'whisper', text: '...Is it bad?', at: [180, 420], to: 'insp', w: 240 } },
      ],
    },
    {
      // 3. POP! Gem sand everywhere.
      layout: 'square',
      scene: {
        back: [studio(1000, 1000, { floorY: 700, door: false, windowX: 0.82, bulb: false, sign: false, plantX: 0.08, plantEyes: 'wide' })],
        fore: [
          { art: 'chair', x: 360, y: 990, scale: 0.95 },
          inspector({ x: 360, y: 990, scale: 0.95, pose: 'sit', expr: 'shocked', look: 1 }),
          { id: 'her', art: 'heroine', x: 790, y: 1060, scale: 0.92, pose: 'cheer', hold: 'tweezers', expr: 'bliss', look: -1 },
        ],
      },
      env: { tier: 0, party: true, face: 'insp' },
      fx: [
        { id: 'bokeh', layer: 'back' },
        { id: 'gems', p: 'insp', floor: 930, n: 170, up: 1.15 },
        { id: 'flash', a: 0.6, rgb: '240,230,255' },
        { id: 'mood' },
      ],
      beats: [
        { say: { kind: 'shout', text: 'POP!', at: [160, 150], w: 200 }, fire: ['gems', 'flash'], shake: 0.35, swap: { insp: { acc: {} } }, swapAt: 0.05 },
        { say: { kind: 'say', text: "It's... gem sand?!", at: [770, 230], to: 'her', w: 300 } },
        { say: { kind: 'say', text: 'I feel... sparkly.', at: [250, 430], to: 'insp', w: 280 }, swap: { insp: { expr: 'bliss' } } },
      ],
    },
    {
      // 4. Teaser card: the inspector, sparkly clean, on a floor of gem sand.
      layout: 'square',
      scene: {
        back: [{ art: 'rays', w: 1000, h: 1000, x: 500, y: 520, colors: ['#3a2a5c', '#4b3874'] }],
        fore: [{ id: 'insp', art: 'inspector', x: 500, y: 1040, scale: 1.05, pose: 'hips', expr: 'proud', look: 0 }],
      },
      env: { tier: 0, party: true, face: 'insp', room: { floorY: 900 } },
      fx: [
        { id: 'bokeh', layer: 'back' },
        { id: 'gems', p: [500, 700], floor: 960, n: 120, up: 0.7, pre: 3 },
        { id: 'reveal' },
        { id: 'pearl', p: 'insp', r: 130, n: 8 },
      ],
      beats: [
        { say: { kind: 'caption', text: 'THE UNICORN ZIT', at: [500, 70], w: 760 }, fire: ['gems', ['reveal', 0.5]] },
        { say: { kind: 'say', text: '...Acceptable.', at: [770, 300], to: 'insp', w: 480 } },
        { say: { kind: 'caption', text: 'Coming in the full game!', at: [500, 945], w: 760 } },
      ],
    },
  ],
};
