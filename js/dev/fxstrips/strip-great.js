// Test strip "A great day" (fx-strips.html, developer only): Greta's face gets the sparkly clean reveal, she pays with
// a little extra (tip coins fly to the coin counter), then three result stars pop in one by one, confetti, and the
// husband peeks in, in his fanciest armor yet. Effects: reveal, shine, mood, coins, stars, confetti, bokeh.
// Format: see player.js.

/** Her studio scrubbed clean (as at the end of the scrub strip). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const clean = (w, h, o = {}) => ({
  art: 'room', kind: 'studio', w, h, leak: false, plantScarf: '#e8505b', shabby: false, wall: ['#f6f1e4', '#ebe3cf'], stripes: '#efe8d6',
  skirting: '#ffffff', floor: '#c9a27a', boards: '#b08a63', curtains: '#f27eb2', sky: ['#8fd3ff', '#dff4ff'], plantEyes: 'happy', lamp: true, ringLight: true, ...o,
});

export const STRIP = {
  id: 'great',
  short: 'Great',
  title: 'A great day',
  endText: 'Three stars!',
  panels: [
    {
      // 1. Greta, sparkly clean: the reveal shine runs over her face.
      layout: 'square',
      scene: {
        back: [clean(1000, 1000, { floorY: 700, windowX: 0.62, plantX: 0.07, lampX: 0.93 })],
        fore: [
          { id: 'greta', art: 'greta', x: 390, y: 1010, scale: 1.45, pose: 'bust', expr: 'happy', look: 1 },
          { id: 'her', art: 'heroine', x: 840, y: 1080, scale: 0.86, pose: 'wave', expr: 'happy', look: -1 },
        ],
      },
      env: { tier: 1, face: 'greta', room: { lamp: { x: -500, y: -500, r: 1 } } },
      fx: [{ id: 'shine' }, { id: 'reveal' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'say', text: 'All done, Greta!', at: [790, 260], to: 'her', w: 300 }, fire: [['reveal', 0.5]] },
        { say: { kind: 'shout', text: "Ooh! I'm GLOWING!", at: [320, 130], to: 'greta', w: 460 }, fire: ['reveal'], swap: { greta: { expr: 'bliss' } } },
      ],
    },
    {
      // 2. She pays, plus a little extra: the tip coins fly out of her purse to the coin counter.
      layout: 'square',
      scene: {
        back: [clean(1000, 1000, { floorY: 700, windowX: 0.5, plantX: 0.93, lamp: false })],
        fore: [
          { art: 'purse', x: 360, y: 500, scale: 1.0, open: true },
          { id: 'greta', art: 'greta', x: 360, y: 1075, scale: 0.95, pose: 'lift', expr: 'happy', look: 1 },
          { id: 'her', art: 'heroine', x: 800, y: 1080, scale: 0.9, pose: 'cheer', expr: 'bliss', look: -1 },
        ],
      },
      env: { tier: 1, face: { x: 360, y: 420, r: 70 } },
      fx: [{ id: 'coins' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'say', text: 'A little extra, dear!', at: [290, 200], to: 'greta', w: 380 }, fire: [['coins', 0.4]] },
        { say: { kind: 'shout', text: "Greta, you're the BEST!", at: [770, 340], to: 'her', w: 320 }, fire: ['coins'] },
      ],
    },
    {
      // 3. Three stars, one by one, then confetti. The husband peeks in: five plumes and a knitted hat now.
      layout: 'splash',
      scene: {
        back: [{ art: 'rays', w: 1000, h: 1000, x: 500, y: 300, colors: ['#ffe9a8', '#ffd98a'] }],
        fore: [
          { id: 'greta', art: 'greta', x: 190, y: 1070, scale: 0.8, pose: 'cheer', expr: 'happy', look: 1 },
          { id: 'her', art: 'heroine', x: 520, y: 1090, scale: 0.9, pose: 'cheer', expr: 'bliss' },
          { id: 'him', art: 'husband', x: 890, y: 1120, scale: 0.75, pose: 'wave', flip: true, outfit: 'armor', plumes: 5, cozy: '#f27eb2', expr: 'happy', look: -1, hidden: true },
        ],
      },
      env: { tier: 1, face: 'her' },
      fx: [
        { id: 'bokeh', layer: 'back' },
        { id: 'stars', spots: [[230, 190, 85], [500, 140, 105], [770, 190, 85]] },
        { id: 'confetti' },
      ],
      beats: [
        { fire: [['stars', 0.3]] },
        { fire: ['stars'] },
        { say: { kind: 'shout', text: 'THREE STARS!', at: [260, 420], w: 360 }, fire: ['stars', ['confetti', 0.25]], shake: 0.4, shakeAt: 0.25 },
        { say: { kind: 'shout', text: 'PARTY?!', at: [840, 330], to: 'him', w: 260 }, swap: { him: { hidden: false } } },
      ],
    },
  ],
};
