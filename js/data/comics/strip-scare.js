// Story strip "The hygiene scare" (T3.1c): the end of chapter 5, after the fifteenth customer. 4 panels.
// The hygiene inspector comes back, peers at {name}'s bare hands through his magnifier, points at the unopened box
// of gloves he left on day one, and she finally puts them on. Gloves are unlocked by the game after this strip
// (chapter step 'scare', economy grantItem). Running gag: the plant watches everything with wide eyes.
// Built only from the existing art kit (studio room, inspector, gloves box, sparkles). Format: docs/COMIC-FORMAT.md.

/** The dingy studio filling a panel (tier 0; the plant wears Greta's scarf). @param {number} w width @param {number} h height @param {object} [o] room options @returns {object} layer */
const studio = (w, h, o = {}) => ({ art: 'room', kind: 'studio', w, h, plantScarf: '#e8505b', ...o });

export const STRIP = {
  id: 'scare',
  title: 'comic.scare.title',
  dressed: true, // she wears her best owned outfit here (T5.2, app-logic.js comicOutfit)
  studio: 'owned', // her studio as she owns it: the sad plant on its shelf until the living plant is bought (SPEC D32j)
  bareHands: true, // no gloves here even on a replay: the words are about her bare hands (SPEC D32e)
  panels: [
    {
      // 1. The door creaks: the inspector is back, clipboard ready. She freezes mid-pop.
      layout: 'wide',
      scene: {
        layers: [
          studio(1600, 900, { floorY: 600, doorX: 0.12, doorOpen: true, windowX: 0.56, leakX: 0.36, bulbX: 0.66, signX: 0.84, plantX: 0.97, plantEyes: 'wide', lamp: false }),
          { art: 'bucket', x: 576, y: 830, scale: 0.5 },
          { id: 'insp', art: 'inspector', x: 192, y: 870, scale: 0.8, pose: 'stand', hold: 'clipboard', expr: 'grumpy', look: 1 },
          { id: 'her', art: 'heroine', x: 1060, y: 880, scale: 0.8, pose: 'pop', expr: 'shocked', look: -1 },
        ],
      },
      camera: { move: 'pushIn', focus: [400, 450], amount: 0.08, ms: 3000 },
      sound: 'creak',
      bubbles: [
        { kind: 'caption', key: 'comic.scare.p1.cap', at: [1000, 46], w: 520 },
        { kind: 'say', key: 'comic.scare.p1.insp', at: [470, 250], to: 'insp', w: 320 },
      ],
    },
    {
      // 2. The magnifier on her hands. Bare. Very bare.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.8, door: false, leak: false, sign: false, bulb: false, plant: false }),
          { id: 'insp', art: 'inspector', x: 200, y: 700, scale: 0.75, pose: 'point', hold: 'magnifier', expr: 'shocked', look: 1 },
          { id: 'her', art: 'heroine', x: 600, y: 700, scale: 0.75, pose: 'shrug', expr: 'sneaky', look: -1 },
        ],
      },
      bubbles: [
        { kind: 'say', key: 'comic.scare.p2.insp', at: [200, 70], to: 'insp', w: 300 },
        { kind: 'say', key: 'comic.scare.p2.her', at: [600, 120], to: 'her', w: 300 },
      ],
    },
    {
      // 3. He points at the box of gloves from day one, still unopened on the shelf. The plant sweats.
      layout: 'small',
      scene: {
        layers: [
          studio(800, 600, { floorY: 470, windowX: 0.15, door: false, leakX: 0.9, sign: false, bulb: false, plant: false }),
          { art: 'gloves', x: 560, y: 470, scale: 1.3 },
          { art: 'plant', x: 720, y: 590, scale: 0.7, eyes: 'wide', scarf: '#e8505b', sweat: true },
          { id: 'insp', art: 'inspector', x: 240, y: 700, scale: 0.75, pose: 'point', hold: 'clipboard', expr: 'grumpy', look: 1 },
        ],
      },
      camera: { move: 'pushIn', focus: [520, 380], amount: 0.08, ms: 2500 },
      bubbles: [
        { kind: 'say', key: 'comic.scare.p3.insp', at: [250, 70], to: 'insp', w: 360 },
      ],
    },
    {
      // 4. Button: gloves on, held up proudly. Sparkles. He almost smiles.
      layout: 'square',
      scene: {
        layers: [
          studio(1000, 1000, { floorY: 640, windowX: 0.5, door: false, leak: false, sign: false, bulbX: 0.2, plantX: 0.92, plantEyes: 'happy' }),
          { id: 'insp', art: 'inspector', x: 220, y: 1000, scale: 0.8, pose: 'stand', hold: 'clipboard', expr: 'neutral', look: 1 },
          // "Gloves on!": her hands are in the blue gloves now (SPEC D32e), the box held up in one of them.
          { id: 'her', art: 'heroine', x: 700, y: 1000, scale: 0.85, pose: 'wave', hold: 'gloves', gloves: true, expr: 'bliss', look: -1 },
          { art: 'sparkles', x: 840, y: 360, r: 120 },
        ],
      },
      camera: { move: 'pullOut', focus: [500, 520], amount: 0.06, ms: 3000 },
      sound: 'cheer',
      bubbles: [
        { kind: 'say', key: 'comic.scare.p4.her', at: [640, 180], to: 'her', w: 380 },
        { kind: 'say', key: 'comic.scare.p4.insp', at: [250, 300], to: 'insp', w: 470 }, // wide enough for "...Acceptable." in one line
        { kind: 'caption', key: 'comic.scare.p4.end', at: [500, 940], w: 860 },
      ],
    },
  ],
};
