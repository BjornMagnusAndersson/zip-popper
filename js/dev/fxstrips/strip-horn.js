// Test strip "Boss: the Big Evil Horn" (fx-strips.html, developer only): the studio's bulb flickers and dies, purple
// smoke rolls in at the door, a horned silhouette laughs; CLUNK, a spotlight: Nils in sunglasses with two huge Evil
// Horns, very dramatic (Greta lent him her smoke machine); she cracks her knuckles in her blue gloves. Effects: lamps,
// mood, dark, smoke, spotlight, flash. Format: see player.js.

/** The dingy studio filling a panel (tier 0, the plant in Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, lamp: false, leak: false, plantScarf: '#e8505b', ...o });

/** Nils as tonight's boss: sunglasses and two big Evil Horns. @param {object} o layer options @returns {object} layer */
const boss = (o) => ({ id: 'nils', art: 'nils', pose: 'hips', expr: 'scheming', acc: { horns: 1.3, shades: true }, ...o });

export const STRIP = {
  id: 'horn',
  short: 'Horn',
  title: 'Boss: the Big Evil Horn',
  endText: 'Boss fight: the Big Evil Horn!',
  panels: [
    {
      // 1. Closing time, one customer left. The bulb flickers, buzzes... and dies.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, doorX: 0.18, windowX: 0.8, bulbX: 0.52, sign: false, plantX: 0.95 })],
        fore: [
          { art: 'chair', x: 290, y: 1150, scale: 0.85 },
          { id: 'her', art: 'heroine', x: 640, y: 1175, scale: 0.95, pose: 'hips', expr: 'happy', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [520, 600], amount: 0.06, ms: 3000 },
      env: { tier: 0, face: 'her' },
      fx: [
        { id: 'mood' },
        { id: 'lamps' },
        { id: 'dark', at: 2, delay: 1.25, fadeIn: 0.25, a: 0.8 },
      ],
      beats: [
        { say: { kind: 'caption', text: 'Customer 13. The last one today.', at: [210, 80], w: 380 } },
        { say: { kind: 'say', text: 'Next, please!', at: [660, 430], to: 'her', w: 360 } },
        { say: { kind: 'whisper', text: 'Uh-oh.', at: [230, 470], to: 'her', w: 220 }, fire: ['lamps'], swap: { her: { expr: 'shocked' } } },
      ],
    },
    {
      // 2. Dark. Purple smoke pours in at the open door; a horned shape stands in it and laughs.
      layout: 'tall',
      scene: {
        back: [studio(900, 1200, { floorY: 800, doorX: 0.22, doorOpen: true, windowX: 0.7, bulbX: 0.46, sign: false, plantX: 0.93, plantEyes: 'wide' })],
        fore: [
          boss({ x: 198, y: 800, scale: 0.68, silhouette: '#1c1030' }),
          { id: 'her', art: 'heroine', x: 650, y: 1180, scale: 0.95, pose: 'stand', expr: 'shocked', look: -1 },
        ],
      },
      env: { tier: 0, party: true, face: 'her' },
      fx: [
        { id: 'dark', a: 0.72, fadeIn: 0, glow: { x: 198, y: 520, r: 420, rgb: '170,100,255' } },
        { id: 'smoke', alpha: 0.6 },
      ],
      beats: [
        { say: { kind: 'caption', text: 'Then the lights went out.', at: [450, 60], w: 640 }, fire: [['smoke', 0.2]] },
        { say: { kind: 'whisper', text: 'H-hello...?', at: [660, 440], to: 'her', w: 300 } },
        { say: { kind: 'shout', text: 'MWA-HA-HA!', at: [560, 230], to: 'nils', w: 360 }, fire: ['smoke'], shake: true },
      ],
    },
    {
      // 3. CLUNK. The spotlight: Nils, horns and shades, fists on hips. (Greta lent him her smoke machine.)
      layout: 'splash',
      scene: {
        back: [studio(1000, 1000, { floorY: 760, door: false, windowX: 0.84, bulb: false, sign: false, plantX: 0.08, plantEyes: 'wide' })],
        fore: [
          { art: 'smokeMachine', x: 870, y: 985, scale: 0.85, flip: true },
          boss({ x: 520, y: 1090, scale: 1.02 }),
        ],
      },
      camera: { move: 'pushIn', focus: [520, 420], amount: 0.06, ms: 4000 },
      env: { tier: 0, party: true, face: 'nils' },
      fx: [
        { id: 'smoke', layer: 'back', alpha: 0.7 },
        { id: 'spotlight' },
        { id: 'mood' },
        { id: 'flash', a: 0.4, rgb: '255,236,255' },
      ],
      beats: [
        { say: { kind: 'shout', text: 'CLUNK!', at: [170, 110], w: 230 }, wait: 1.15, fire: ['spotlight', ['flash', 1.1]], shake: 0.35, shakeAt: 1.1 },
        { say: { kind: 'shout', text: 'I AM... THE BIG EVIL HORN!', at: [820, 560], to: 'nils', w: 330 } },
        { say: { kind: 'whisper', text: '(Greta lent me her smoke machine.)', at: [230, 860], to: 'nils', w: 400 } },
      ],
    },
    {
      // 4. Her turn in the light: blue gloves, knuckles cracked. The plant cannot look.
      layout: 'square',
      scene: {
        back: [studio(1000, 1000, { floorY: 700, door: false, windowX: 0.8, bulb: false, sign: false, plantX: 0.1, plantEyes: 'wide' })],
        fore: [{ id: 'her', art: 'heroine', x: 560, y: 1080, scale: 1.12, pose: 'fxKnuckles', expr: 'scheming', look: -1 }],
      },
      camera: { move: 'pushIn', focus: [560, 520], amount: 0.05, ms: 3000 },
      env: { tier: 0, party: true, face: 'her' },
      fx: [{ id: 'smoke', layer: 'back', alpha: 0.7 }, { id: 'spotlight' }, { id: 'mood' }],
      beats: [
        { say: { kind: 'shout', text: 'CRACK! CRACK!', at: [220, 150], w: 280 }, shake: 0.3, shakeAt: 0.3 },
        { say: { kind: 'say', text: 'Warm cloth first. Then we talk.', at: [760, 190], to: 'her', w: 380 } },
        { say: { kind: 'caption', text: 'BOSS: the Big Evil Horn', at: [500, 945], w: 700 } },
      ],
    },
  ],
};
