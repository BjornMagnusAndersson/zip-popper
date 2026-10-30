// Test strip "Prom Penny's party day" (fx-strips.html, developer only): Penny bursts in wanting to SPARKLE; Greta pulls
// a gold rope and a disco ball drops from the ceiling, the lights go down, beams sweep through pink haze, bokeh lights
// float; Penny dances in the chair ("Hold still, honey!"); POP, confetti, a sparkly clean face. Effects: disco (dropped
// in), dark, smoke, bokeh, mood, confetti, reveal, flash, lamps. Format: see player.js.

/** The dingy studio filling a panel (tier 0, the plant in Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, leak: false, plantScarf: '#e8505b', ...o });

/** Prom Penny: tiara and sash. @param {object} o layer options @returns {object} layer */
const penny = (o) => ({ id: 'penny', art: 'penny', acc: { tiara: true, sash: true }, ...o });

/** The party lights for a panel: the room dimmed to a deep violet (people dimmed less), the disco ball, pink haze, bokeh and the mood. @param {number} at the beat they start on @param {object} [disco] extra for the disco entry (e.g. the drop) @returns {object[]} fx entries */
const partyFx = (at, disco = {}) => [
  { id: 'dark', name: 'room', at, layer: 'back', order: 10, rgb: '16,6,34', a: 0.66, fadeIn: 0.7 },
  { id: 'dark', name: 'dim', at, order: 20, rgb: '24,10,48', a: 0.2, fadeIn: 0.7 },
  { id: 'smoke', at, layer: 'back', alpha: 0.75 },
  { id: 'bokeh', at, fadeIn: 1.2 },
  { id: 'disco', at, ...disco },
  { id: 'mood', at },
];

export const STRIP = {
  id: 'prom',
  short: 'Prom',
  title: "Prom Penny's party day",
  endText: "Prom Penny's party day!",
  panels: [
    {
      // 1. Penny bursts in, tiara on: it is her prom day and she wants to SPARKLE.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, doorX: 0.2, doorOpen: true, windowX: 0.76, bulbX: 0.52, sign: false, plantX: 0.95 })],
        fore: [
          penny({ x: 230, y: 1150, scale: 1.02, pose: 'cheer', expr: 'bliss', look: 1 }),
          { id: 'her', art: 'heroine', x: 660, y: 1175, scale: 0.95, pose: 'shrug', expr: 'neutral', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [420, 640], amount: 0.05, ms: 3000 },
      env: { tier: 0, face: 'penny' },
      fx: [{ id: 'mood' }, { id: 'lamps' }],
      beats: [
        { say: { kind: 'shout', text: "It's my PROM day! Make me SPARKLE!", at: [300, 250], to: 'penny', w: 440 } },
        { say: { kind: 'say', text: "It's a Tuesday.", at: [690, 450], to: 'her', w: 280 } },
      ],
    },
    {
      // 2. Greta has waited years for this: she pulls a gold rope and a disco ball drops from the ceiling.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, door: false, windowX: 0.8, bulb: false, sign: false, plantX: 0.95, plantEyes: 'wide' })],
        fore: [
          { id: 'rope', art: 'rope', x: 236, y: 470 },
          { id: 'greta', art: 'greta', x: 240, y: 1170, scale: 0.95, pose: 'lift', expr: 'scheming', look: 1 },
          penny({ x: 660, y: 1160, scale: 1.02, pose: 'stand', expr: 'shocked', look: -1 }),
        ],
      },
      env: { tier: 0, party: true, face: 'penny' },
      fx: partyFx(1, { drop: { dur: 1.3, h: 0.32 } }),
      beats: [
        { say: { kind: 'caption', text: 'Greta had been saving this for years.', at: [450, 1130], w: 760 } },
        { say: { kind: 'shout', text: 'HIT IT!', at: [560, 330], to: 'greta', w: 260 }, swap: { rope: { y: 560 }, greta: { expr: 'happy' } }, shake: 0.3 },
        { say: { kind: 'shout', text: 'WOOOO!', at: [700, 420], to: 'penny', w: 260 }, swap: { penny: { pose: 'cheer', expr: 'bliss' } }, fire: ['bokeh'] },
      ],
    },
    {
      // 3. Penny dances in the pink chair; {name} tries to work. "Hold still, honey!"
      layout: 'splash',
      scene: {
        back: [studio(1000, 1000, { floorY: 700, door: false, windowX: 0.12, bulb: false, sign: false, plantX: 0.92, plantEyes: 'happy' })],
        fore: [
          { art: 'chair', x: 400, y: 990, scale: 0.92, wingback: true },
          penny({ x: 400, y: 990, scale: 0.92, pose: 'fxDance', expr: 'bliss', look: 1 }),
          { id: 'her', art: 'heroine', x: 790, y: 1060, scale: 0.95, pose: 'point', flip: true, hold: 'tweezers', expr: 'squint', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [520, 520], amount: 0.06, ms: 4000 },
      env: { tier: 0, party: true, face: 'penny' },
      fx: partyFx(0),
      beats: [
        { say: { kind: 'say', text: 'Hold still, honey!', at: [790, 300], to: 'her', w: 300 } },
        { say: { kind: 'shout', text: "I CAN'T! It's my SONG!", at: [250, 170], to: 'penny', w: 380 }, fire: ['bokeh'] },
      ],
    },
    {
      // 4. POP! Confetti everywhere, Penny's face sparkly clean.
      layout: 'square',
      scene: {
        back: [studio(1000, 1000, { floorY: 700, door: false, windowX: 0.85, bulb: false, sign: false, plant: false })],
        fore: [
          penny({ x: 390, y: 1000, scale: 1.3, pose: 'bust', expr: 'bliss', look: 1 }),
          { id: 'her', art: 'heroine', x: 830, y: 1080, scale: 0.86, pose: 'cheer', hold: 'tweezers', expr: 'bliss', look: -1 },
        ],
      },
      env: { tier: 0, party: true, face: 'penny' },
      fx: [...partyFx(0), { id: 'confetti' }, { id: 'reveal' }, { id: 'flash', a: 0.5 }],
      beats: [
        { say: { kind: 'shout', text: 'POP!', at: [170, 150], w: 200 }, wait: 0.2, fire: [['confetti', 0.15], ['flash', 0.15], ['reveal', 0.6]], shake: 0.35, shakeAt: 0.15 },
        { say: { kind: 'shout', text: 'Best. Prom. EVER!', at: [680, 140], to: 'penny', w: 330 }, fire: ['confetti'] },
        { say: { kind: 'caption', text: 'Party day: done!', at: [500, 950], w: 640 } },
      ],
    },
  ],
};
