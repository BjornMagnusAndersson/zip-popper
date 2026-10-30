// Test strip "The scrub job" (fx-strips.html, developer only): the dingy studio, a light shaft full of dust, the moth
// at the flickering bulb, the plant coughs. She scrubs. WHOOSH: the dust flies out, the room fades to its clean look,
// a shine sweeps over it and sparkle motes float in the clean light. Button: a drop falls from the ceiling (the roof
// is still not included, strip "plan"). Effects: dust, lamps, mood, shine, flash. Format: see player.js.

/** The dingy studio filling a panel (tier 0, the plant in Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, leak: false, plantScarf: '#e8505b', ...o });

/**
 * The same studio scrubbed clean: fresh cream paint, warm wooden floor, pink curtains, blue sky, the ring light, the
 * plant happy (no stains, tiles, cracks, pipe or bare bulb any more).
 * @param {number} w width @param {number} h height @param {object} [o] room options
 * @returns {object} layer
 */
const clean = (w, h, o = {}) => studio(w, h, {
  shabby: false, wall: ['#f6f1e4', '#ebe3cf'], stripes: '#efe8d6', skirting: '#ffffff', floor: '#c9a27a', boards: '#b08a63',
  curtains: '#f27eb2', sky: ['#8fd3ff', '#dff4ff'], plantEyes: 'happy', lamp: true, ringLight: true, ...o,
});

export const STRIP = {
  id: 'scrub',
  short: 'Scrub',
  title: 'The scrub job',
  endText: 'Sparkly clean! (For now.)',
  panels: [
    {
      // 1. Saturday. Light falls through the window; the air is full of dust. The moth loves the bulb.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, door: false, windowX: 0.25, bulbX: 0.5, sign: false, plantX: 0.08, plantEyes: 'sad' })],
        fore: [
          { art: 'bucket', x: 330, y: 1120, scale: 0.55 },
          { id: 'her', art: 'heroine', x: 620, y: 1175, scale: 0.95, pose: 'stand', outfit: 'apron', expr: 'squint', look: -1 },
          { art: 'sponge', x: 738, y: 1004, scale: 0.6, rotate: -15 },
        ],
      },
      camera: { move: 'pushIn', focus: [450, 600], amount: 0.06, ms: 3500 },
      env: { tier: 0, face: 'her' },
      fx: [{ id: 'dust' }, { id: 'lamps' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'caption', text: 'Saturday: scrub day.', at: [720, 70], w: 300 } },
        { say: { kind: 'say', text: 'Is the air... crunchy?', at: [650, 430], to: 'her', w: 320 } },
        { say: { kind: 'whisper', text: '*cough*', at: [190, 520], to: [80, 690], w: 200 } },
      ],
    },
    {
      // 2. Scrub, scrub, scrub: foam on the tiles, motion lines, the dust swirling.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, door: false, windowX: 0.25, bulbX: 0.5, sign: false, plantX: 0.08, plantEyes: 'wide' })],
        fore: [
          { art: 'foam', x: 250, y: 680, r: 90 },
          { art: 'foam', x: 760, y: 640, r: 70, n: 7 },
          { id: 'her', art: 'heroine', x: 470, y: 1180, scale: 0.97, pose: 'pop', outfit: 'apron', expr: 'squint', look: 1 },
          { art: 'foam', x: 600, y: 760, r: 80 },
          { art: 'sponge', x: 600, y: 715, scale: 0.65, rotate: 20 },
          { art: 'motion', x: 600, y: 715, r: 150 },
          { art: 'motion', x: 340, y: 715, r: 120, n: 4 },
        ],
      },
      env: { tier: 0, face: 'her' },
      fx: [{ id: 'dust' }, { id: 'lamps' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'shout', text: 'SCRUB SCRUB SCRUB!', at: [450, 250], w: 420 }, shake: 0.6 },
        { say: { kind: 'caption', text: 'Three hours later...', at: [450, 1135], w: 420 } },
      ],
    },
    {
      // 3. The payoff: WHOOSH, the dust flies out, the room fades to clean, a shine sweeps across.
      layout: 'splash',
      scene: {
        back: [studio(1000, 1000, { floorY: 700, door: false, windowX: 0.22, bulbX: 0.62, signX: 0.82, plantX: 0.06, plantEyes: 'wide' })],
        backB: [
          clean(1000, 1000, { floorY: 700, windowX: 0.22, plantX: 0.06, lampX: 0.75 }),
          { art: 'signBoard', x: 820, y: 84, w: 250, h: 130, tilt: 3 },
        ],
        fore: [
          { id: 'her', art: 'heroine', x: 420, y: 1060, scale: 1.0, pose: 'pop', outfit: 'apron', expr: 'squint', look: 1 },
          { id: 'sponge', art: 'sponge', x: 550, y: 590, scale: 0.7, rotate: 20 },
        ],
      },
      env: { tier: 0, face: 'her' },
      fx: [
        { id: 'dust' },
        { id: 'shine', env: { tier: 1, shiny: [{ id: 'sign', box: [695, 124, 250, 130], round: 12, hot: [[720, 140], [920, 230]] }, { id: 'window', box: [90, 98, 260, 245], hot: [[120, 120], [320, 320]] }] } },
        { id: 'flash', a: 0.35, rgb: '255,252,236' },
      ],
      beats: [
        { say: { kind: 'caption', text: 'The very last speck...', at: [300, 60], w: 520 } },
        {
          say: { kind: 'shout', text: 'WHOOSH!', at: [230, 840], w: 380 }, shake: 0.5,
          fire: ['dust', ['flash', 0.5], ['shine', 1.5]], room: 'B', roomAt: 0.45, fade: 1.1,
          swap: { her: { pose: 'cheer', expr: 'bliss' }, sponge: { hidden: true } }, swapAt: 0.5,
        },
        { say: { kind: 'say', text: 'Sparkly clean!', at: [810, 600], to: 'her', w: 280 }, fire: ['shine'] },
      ],
    },
    {
      // 4. Button: the clean studio, the ring light glowing... and a drop falls from the ceiling.
      layout: 'square',
      scene: {
        back: [
          clean(1000, 1000, { floorY: 680, windowX: 0.15, plantX: 0.07, lampX: 0.9 }),
          { art: 'signBoard', x: 430, y: 56, w: 230, h: 120, tilt: -3 },
          { id: 'stain', shape: 'ellipse', x: 660, y: 8, rx: 70, ry: 22, fill: '#786834', opacity: 0.35, hidden: true },
        ],
        fore: [
          { id: 'her', art: 'heroine', x: 520, y: 1070, scale: 1.0, pose: 'hips', outfit: 'apron', expr: 'proud', look: 0 },
          { id: 'drop', art: 'drip', x: 660, y: 200, r: 22, hidden: true },
        ],
      },
      env: { tier: 2, face: 'her', room: { lamp: { x: -500, y: -500, r: 1 } } },
      fx: [{ id: 'dust' }, { id: 'shine', env: { tier: 1, shiny: [{ id: 'sign', box: [315, 96, 230, 120], round: 12, hot: [[340, 110], [520, 196]] }] } }, { id: 'lamps' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'say', text: 'Not one speck of dust!', at: [800, 390], to: 'her', w: 300 } },
        { say: { kind: 'whisper', text: 'plip.', at: [860, 140], to: 'drop', w: 160 }, swap: { drop: { hidden: false }, stain: { hidden: false } } },
        { say: { kind: 'caption', text: '(The roof is still not included.)', at: [500, 945], w: 700 }, swap: { her: { expr: 'shocked', look: -1 } } },
      ],
    },
  ],
};
