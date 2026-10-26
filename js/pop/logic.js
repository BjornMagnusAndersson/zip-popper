// The "pimple popper" play mode of the popper game: the pure rules, kept apart so they can be
// tested in Node. Which mode the player chose (remembered per account on this phone), the popping-sound switch, how
// many pimples an answer earns (Icelandic work earns golden bonus pimples), the bigger round every five answers, the
// pimples kept for later after "Skip popping", where pimples sit on a skin patch and on the big face at the end, how
// squeezing builds pressure, and which pimple a finger touches. No DOM, no audio, no timers here.

export const MODE_CLASSIC = 'classic';
export const MODE_POP = 'pop';
const POP_SOUND_KEY = 'popper.popSound'; // "on" or "off"; nothing stored = on

/** The kinds of pimple. hold = seconds of squeezing before it pops; r = radius range in px on a 200 px high patch. */
export const PIMPLE_TYPES = {
  whitehead: { hold: 0.7, r: [19, 24] },
  red: { hold: 0.95, r: [21, 27] }, // a pink, swollen one; it bursts with cream-coloured goo (never blood)
  blackhead: { hold: 0.6, r: [10, 13] }, // pulled out with tweezers
  big: { hold: 1.5, r: [34, 40] },
  gold: { hold: 0.8, r: [19, 23] }, // the Icelandic bonus: sparkly, pops with glitter
};

/** At most this many pimples in the bank of each kind (so a long skip does not pile up hundreds). */
export const BANK_MAX = { small: 10, big: 6, gold: 6 };

/** Pops per answer: every card is Icelandic; writing or commenting on the Icelandic earns golden bonus pimples. */
const POPS = { ok: { small: 1, gold: 0 }, comment: { small: 1, gold: 1 }, edit: { small: 2, gold: 1 } };

/**
 * The storage key for the chosen mode of one account.
 * @param {string} uid the account id
 * @returns {string} the key
 */
export function modeKey(uid) {
  return `popper.mode.${uid || 'anon'}`;
}

/**
 * The remembered play mode of an account (Classic when nothing is stored). Never throws.
 * @param {Storage|undefined} storage e.g. localStorage
 * @param {string} uid the account id
 * @returns {'classic'|'pop'} the mode
 */
export function loadMode(storage, uid) {
  try { return storage?.getItem(modeKey(uid)) === MODE_POP ? MODE_POP : MODE_CLASSIC; } catch { return MODE_CLASSIC; }
}

/**
 * Remember the play mode of an account. Never throws.
 * @param {Storage|undefined} storage e.g. localStorage
 * @param {string} uid the account id
 * @param {'classic'|'pop'} mode the mode
 * @returns {void}
 */
export function saveMode(storage, uid, mode) {
  try { storage?.setItem(modeKey(uid), mode === MODE_POP ? MODE_POP : MODE_CLASSIC); } catch { /* blocked storage: only this visit */ }
}

/**
 * Whether the popping sounds are on (on when nothing is stored). Separate from the game's other sound switch.
 * @param {Storage|undefined} storage e.g. localStorage
 * @returns {boolean} true = on
 */
export function loadPopSoundOn(storage) {
  try { return storage?.getItem(POP_SOUND_KEY) !== 'off'; } catch { return true; }
}

/**
 * Remember the popping-sound switch. Never throws.
 * @param {Storage|undefined} storage e.g. localStorage
 * @param {boolean} on true = on
 * @returns {void}
 */
export function savePopSoundOn(storage, on) {
  try { storage?.setItem(POP_SOUND_KEY, on ? 'on' : 'off'); } catch { /* blocked storage: only this visit */ }
}

/**
 * The pimples one answer earns: OK 1, Comment 1 plus a golden bonus, Edit 2 plus a golden bonus; an answer to one of
 * our open Icelandic questions (the "doubts" batch) earns one more golden bonus.
 * @param {string} status 'ok', 'edit' or 'comment'
 * @param {string} [batch] 'ui' or 'doubts'
 * @returns {{small: number, gold: number}} plain pimples and golden bonus pimples
 */
export function popsFor(status, batch) {
  const base = POPS[status];
  if (!base) return { small: 0, gold: 0 };
  return { small: base.small, gold: base.gold + (batch === 'doubts' ? 1 : 0) };
}

/**
 * What an answer brings in pimple mode: the face finale at the end of a batch, a big round every five answers, or a
 * few pimples.
 * @param {string} status the answer
 * @param {string[]} milestones from the session ('five', 'done', ...)
 * @param {string} [batch] the batch
 * @returns {{face: boolean, small: number, big: number, gold: number}} the round
 */
export function roundFor(status, milestones = [], batch) {
  if (milestones.includes('done')) return { face: true, small: 0, big: 0, gold: 0 };
  const p = popsFor(status, batch);
  return { face: false, small: p.small, big: milestones.includes('five') ? 2 : 0, gold: p.gold };
}

/**
 * Add a round to the bank of pimples waiting to be popped (capped).
 * @param {{small: number, big: number, gold: number}} bank what waits
 * @param {{small?: number, big?: number, gold?: number}} round what to add
 * @returns {{small: number, big: number, gold: number}} the new bank
 */
export function bankAdd(bank, round) {
  const out = {};
  for (const k of ['small', 'big', 'gold']) out[k] = Math.min(BANK_MAX[k], (bank?.[k] ?? 0) + (round?.[k] ?? 0));
  return out;
}

/**
 * How many pimples wait in the bank.
 * @param {{small: number, big: number, gold: number}} bank the bank
 * @returns {number} the total
 */
export function bankCount(bank) {
  return (bank?.small ?? 0) + (bank?.big ?? 0) + (bank?.gold ?? 0);
}

/**
 * Take one patch's worth of pimples out of the bank. A patch with big pimples is a "big round" and ends with a
 * blackhead strip to peel off.
 * @param {{small: number, big: number, gold: number}} bank the bank
 * @returns {{take: {small: number, big: number, gold: number, strip: boolean}, rest: {small: number, big: number, gold: number}}} the patch and what is left
 */
export function bankTake(bank) {
  const b = bankAdd({}, bank);
  const big = Math.min(2, b.big);
  const small = Math.min(big ? 2 : 5, b.small); // what does not fit comes on the next patch
  const gold = Math.min(big ? 1 : 2, b.gold);
  return { take: { small, big, gold, strip: big > 0 }, rest: { small: b.small - small, big: b.big - big, gold: b.gold - gold } };
}

/**
 * A small seeded random number generator (mulberry32), so a patch looks the same in tests and screenshots.
 * @param {number} seed any whole number
 * @returns {() => number} a function giving numbers 0..1
 */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The radius of a pimple type for a patch size.
 * @param {string} type a key of PIMPLE_TYPES
 * @param {() => number} rand random numbers
 * @param {number} scale patch size / 200 (0.85 .. 1.4)
 * @returns {number} radius in px
 */
function radiusFor(type, rand, scale) {
  const [a, b] = PIMPLE_TYPES[type].r;
  return (a + rand() * (b - a)) * scale;
}

/**
 * Whether a circle overlaps a rectangle (with a gap).
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @param {{x: number, y: number, w: number, h: number}|null} box the rectangle
 * @param {number} gap extra space
 * @returns {boolean} true when they overlap
 */
function hitsBox(x, y, r, box, gap) {
  if (!box) return false;
  return x + r + gap > box.x && x - r - gap < box.x + box.w && y + r + gap > box.y && y - r - gap < box.y + box.h;
}

/**
 * Where the pimples sit on a skin patch: spread out, never touching each other, the edges or the strip.
 * @param {{seed: number, width: number, height: number, small?: number, big?: number, gold?: number, strip?: boolean,
 *   avoid?: {x: number, y: number, r: number}[]}} o the patch (avoid = pimples already there, when more are added)
 * @returns {{pimples: object[], strip: {x: number, y: number, w: number, h: number, dots: {x: number, y: number}[]}|null}} the layout
 */
export function layoutPatch({ seed, width, height, small = 0, big = 0, gold = 0, strip = false, avoid = [] }) {
  const rand = rng(seed);
  const scale = Math.max(0.85, Math.min(1.4, Math.min(width, height) / 200));
  let box = null;
  if (strip) {
    const w = Math.min(width * 0.42, 150 * scale);
    const h = 40 * scale;
    box = { x: (width - w) / 2, y: height - h - 10 * scale, w, h, dots: [] };
    for (let i = 0; i < 9; i += 1) box.dots.push({ x: box.x + 12 * scale + rand() * (w - 24 * scale), y: box.y + 10 * scale + rand() * (h - 20 * scale) });
  }
  const types = [];
  for (let i = 0; i < big; i += 1) types.push('big');
  for (let i = 0; i < gold; i += 1) types.push('gold');
  for (let i = 0; i < small; i += 1) {
    const k = rand();
    types.push(k < 0.42 ? 'whitehead' : k < 0.82 ? 'red' : 'blackhead');
  }
  const pimples = [];
  const placed = [...avoid];
  types.forEach((type, i) => {
    let r = radiusFor(type, rand, scale);
    let best = null;
    // Look for a free spot; when the patch is crowded, try again with a slightly smaller pimple.
    for (let level = 0; level < 5 && !best; level += 1) {
      for (let tries = 0; tries < 160; tries += 1) {
        const x = r * 1.3 + rand() * Math.max(1, width - r * 2.6);
        const y = r * 1.3 + rand() * Math.max(1, height - r * 2.6);
        if (hitsBox(x, y, r, box, 8 * scale)) continue;
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.r + r) * 1.4 + 6)) { best = { x, y }; break; }
      }
      if (!best) r *= 0.85;
    }
    if (!best) best = { x: r * 1.3 + rand() * Math.max(1, width - r * 2.6), y: r * 1.3 + rand() * Math.max(1, (box ? box.y : height) - r * 2.6) };
    const p = { id: `p${seed}-${i}`, type, x: best.x, y: best.y, r, axis: rand() * Math.PI, hold: PIMPLE_TYPES[type].hold };
    pimples.push(p);
    placed.push(p);
  });
  return { pimples, strip: box };
}

/**
 * The places on the big face where it may break out: forehead, cheeks, nose sides, chin and jaw; never on the eyes,
 * the eyebrows or the mouth. Positions are in face units: u = -1 (left edge) .. 1, v = -1 (top) .. 1 (chin).
 * @param {number} seed any whole number
 * @returns {{u: number, v: number, type: string, size: number}[]} 16 spots (size scales the radius)
 */
export function faceSpots(seed) {
  const rand = rng(seed);
  const zones = [
    { n: 5, u: [-0.55, 0.55], v: [-0.66, -0.5] }, // forehead (under the fringe)
    { n: 3, u: [-0.72, -0.4], v: [0.1, 0.42] }, // left cheek
    { n: 3, u: [0.4, 0.72], v: [0.1, 0.42] }, // right cheek
    { n: 2, u: [-0.24, 0.24], v: [0.74, 0.86] }, // chin
    { n: 2, u: [-0.62, 0.62], v: [0.55, 0.68] }, // jaw
    { n: 1, u: [0.14, 0.2], v: [0.12, 0.22] }, // beside the nose
  ];
  const kinds = ['big', 'red', 'whitehead', 'gold', 'red', 'whitehead', 'big', 'red', 'whitehead', 'blackhead', 'gold', 'whitehead', 'red', 'red', 'whitehead', 'blackhead'];
  const spots = [];
  let i = 0;
  for (const z of zones) {
    for (let k = 0; k < z.n; k += 1) {
      let u = 0;
      let v = 0;
      for (let tries = 0; tries < 60; tries += 1) {
        u = z.u[0] + rand() * (z.u[1] - z.u[0]);
        v = z.v[0] + rand() * (z.v[1] - z.v[0]);
        if (spots.every((s) => Math.hypot(s.u - u, s.v - v) > 0.2)) break;
      }
      // Jaw spots on the sides only (the mouth sits in the middle).
      if (z.v[0] === 0.55 && Math.abs(u) < 0.42) u = Math.sign(u || 1) * (0.42 + rand() * 0.2);
      spots.push({ u, v, type: kinds[i % kinds.length], size: 0.85 + rand() * 0.3 });
      i += 1;
    }
  }
  return spots;
}

/**
 * Whether a face spot would sit on an eye, an eyebrow or the mouth (used by the tests and as a safety net).
 * @param {{u: number, v: number}} s the spot
 * @returns {boolean} true when it is in a place where pimples must not be
 */
export function onFeature({ u, v }) {
  const eye = Math.abs(v + 0.2) < 0.17 && Math.abs(Math.abs(u) - 0.38) < 0.24;
  const mouth = Math.abs(v - 0.5) < 0.12 && Math.abs(u) < 0.36;
  return eye || mouth;
}

/**
 * Pressure after a moment of squeezing (it builds while held and slowly relaxes when let go).
 * @param {number} pressure now, 0..1
 * @param {number} dt seconds since the last step
 * @param {boolean} holding whether the finger is still down
 * @param {number} hold seconds a full squeeze takes for this pimple
 * @returns {number} the new pressure, 0..1 (1 = it pops)
 */
export function pressureStep(pressure, dt, holding, hold) {
  if (holding) return Math.min(1, pressure + dt / Math.max(0.1, hold));
  return Math.max(0, pressure - dt * 0.5);
}

/**
 * Pressure after one key press or tap without holding (three presses pop a pimple).
 * @param {number} pressure now
 * @returns {number} the new pressure
 */
export function tapPressure(pressure) {
  return Math.min(1, pressure + 0.34);
}

/**
 * The pimple a finger touches: the nearest one still there, within a generous distance for fingers.
 * @param {{x: number, y: number, r: number, popped?: boolean}[]} pimples the pimples
 * @param {number} x touch x
 * @param {number} y touch y
 * @returns {object|null} the pimple, or null
 */
export function hitTest(pimples, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of pimples) {
    if (p.popped) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= Math.max(p.r * 2, 26) && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

/**
 * How the big face looks while it is being cleared.
 * @param {number} cleared pimples popped
 * @param {number} total pimples at the start
 * @param {boolean} [healed] the last cream is on
 * @returns {'sad'|'meh'|'happy'|'glow'} the mood
 */
export function faceMood(cleared, total, healed = false) {
  if (healed) return 'glow';
  const f = total ? cleared / total : 1;
  if (f < 0.34) return 'sad';
  if (f < 0.8) return 'meh';
  return 'happy';
}

/**
 * The steps of a patch after the popping: peel the strip (big rounds and the face), wipe it clean, then the cream.
 * @param {boolean} hasStrip whether the patch has a blackhead strip
 * @returns {string[]} the steps in order
 */
export function stepsFor(hasStrip) {
  return hasStrip ? ['pop', 'strip', 'wipe', 'cream'] : ['pop', 'wipe', 'cream'];
}
