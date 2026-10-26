// The kinds of bump, as one table (T1.1). The pop scene (pop/logic.js lays them out, pop/engine.js squeezes and
// pops them) reads everything about a bump from here: how long a squeeze takes, how big it is, what comes out, which
// tool suits it and what it pays. Numbers are first guesses (docs/TOOLS.md) and get tuned in play.
// No DOM, no text shown to the player: names on screen come from the string table (strings/en.json), not from here.
// Cartoon only: goo is cream, white or glitter, never blood.

/** Tool ids used in bestTools / needsTool (docs/TOOLS.md); the tools themselves are in data/tools.js. */
export { TOOL_IDS } from './tools.js';

/**
 * Every kind of bump. Fields:
 * - implemented: false = data only, the layout and the engine skip it (its behaviour comes in a later task).
 * - hold: seconds of pressing and holding before it pops. These are the STARTING speeds (slow on purpose, about 1.6 times the seed's); skill by use (T3.2) and tools (T1.2) make them faster later.
 * - radius: [smallest, biggest] drawn radius in px on a face FACE_UNIT px half-width (pop/logic.js scales it).
 * - goo: what comes out: 'white', 'cream' or 'gold' (glitter goo), 'plug' (a dark plug the tweezers pull, no goo),
 *   'horn' (a cartoon horn creaks out), 'hair' (a silly long hair is pulled out).
 * - drops: how many goo drops fly off when it pops (0 = none).
 * - bestTools: the tools that work best on it (any of TOOL_IDS).
 * - warmHelps: true when a warm cloth first makes it pop faster and safer (never required).
 * - needsTool: the tool that pulls it out, or null. 'tweezers' bumps come out as a plug (no goo); bare fingers can
 *   still get them out, only slower (data/tools.js holdScale), and squeezing tools that cannot grab them give an Ow.
 * - pay: coins a clean pop earns (first guess; scoring adds tips and combo on top).
 * - spawn (optional): an extra kind that only turns up on some faces: chance = how often a face gets one (0..1),
 *   maxPerFace = at most this many on one face, zones = the face zones it likes (pop/logic.js ZONES), best first.
 *   Kinds without spawn are the everyday ones every face gets.
 * - rough: the chance (0..1) that a press start with the right tool still gives an Ow while the face is cold (T1.2b,
 *   TOOLS.md decision 3); scaled by the tool (data/tools.js roughScale), the warm cloth and the irritation meter.
 * - grow (optional): the bump grows while the face is on screen: it starts at `from` times its laid-out radius and
 *   reaches the full radius after `seconds`, then stops (the layout keeps room for the full size); `still` = the
 *   share of the full size it starts at, and keeps, with reduced motion (it does not grow then). Its hold time counts
 *   from its size now (pop/logic.js grownHold): popped early, it is quicker.
 */
export const BUMPS = {
  whitehead: {
    implemented: true, hold: 1.1, radius: [19, 24], goo: 'white', drops: 4,
    bestTools: ['fingers', 'cottonPad'], warmHelps: false, needsTool: null, pay: 2,
  },
  red: { // a pink, swollen one; it bursts with cream-coloured goo (never blood)
    implemented: true, hold: 1.5, radius: [21, 27], goo: 'cream', drops: 6,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 3, rough: 0.12,
  },
  blackhead: { // a small dark plug, pulled out with tweezers
    implemented: true, hold: 1.0, radius: [12, 15], goo: 'plug', drops: 0,
    bestTools: ['tweezers'], warmHelps: false, needsTool: 'tweezers', pay: 2,
  },
  big: { // slow, the big satisfying one
    implemented: true, hold: 2.4, radius: [32, 38], goo: 'cream', drops: 12,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 5, rough: 0.12,
  },
  gold: { // the Golden bump: sparkly bonus, pops with glitter; any squeezing tool is fine
    implemented: true, hold: 1.3, radius: [19, 23], goo: 'gold', drops: 8,
    bestTools: ['fingers', 'cottonPad'], warmHelps: false, needsTool: null, pay: 10,
  },
  horn: { // the Evil Horn (T1.3): grows while you watch, creaks out with a little pale goo; warm cloth first, then fingers
    implemented: true, hold: 2.9, radius: [24, 30], goo: 'horn', drops: 3,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 8, rough: 0.18,
    spawn: { chance: 0.4, maxPerFace: 1, zones: ['cheekL', 'cheekR', 'jawL', 'jawR'] }, // roomy spots, so it can grow big
    // B58: starts small (35 percent) and visibly grows out to full size in 13 s, fast at first (ease-out); with
    // reduced motion it does not grow and starts at 70 percent. A tiny horn is still easy to tap (logic.js tapRadius).
    grow: { from: 0.35, seconds: 13, still: 0.7 },
  },
  hair: { // an ingrown hair (T1.3): a small red bump; tweezers pull out a silly, very long curly hair (no goo)
    implemented: true, hold: 1.6, radius: [13, 17], goo: 'hair', drops: 0,
    bestTools: ['tweezers'], warmHelps: false, needsTool: 'tweezers', pay: 6,
    spawn: { chance: 0.3, maxPerFace: 1, zones: ['chin', 'jawL', 'jawR', 'cheekL', 'cheekR'] }, // where beard hairs grow
  },
};

/**
 * Decoys (T1.3b, SPEC D12-6): moles, freckles and beauty marks drawn as part of the face. They are not bumps: they
 * never pop, never count as "left", and pressing one with a squeezing, pulling or strip tool gives an Ow.
 * - counts: chance of 0, 1, 2 or 3 decoys on a face (adds up to 1).
 * - kinds: weight = how often this kind is picked; radius = [smallest, biggest] drawn radius on a FACE_UNIT face
 *   (like bumps); dots = [fewest, most] tiny dots in a freckle cluster (the whole cluster is ONE decoy).
 */
export const DECOYS = {
  counts: [0.2, 0.35, 0.3, 0.15],
  kinds: {
    mole: { weight: 3, radius: [6.5, 8.5] }, // a small dark raised dot
    beauty: { weight: 2, radius: [4, 5] }, // a tiny dark dot
    freckles: { weight: 3, radius: [14, 18], dots: [3, 5] }, // 3 to 5 tiny dots
    suspicious: { weight: 1, radius: [12, 15] }, // bigger, brown and flat: looks a bit like a bump, but is not one
  },
};

/** Every bump id, in table order. */
export const BUMP_IDS = Object.keys(BUMPS);

/** The bump ids the game can show and pop today. */
export const IMPLEMENTED_BUMPS = BUMP_IDS.filter((id) => BUMPS[id].implemented);

/**
 * The table entry for a kind of bump.
 * @param {string} type a bump id, e.g. 'whitehead'
 * @returns {object|null} the entry, or null for an unknown id
 */
export function bumpInfo(type) {
  return Object.hasOwn(BUMPS, type) ? BUMPS[type] : null;
}

/**
 * Whether a kind of bump can be shown and popped today (known and implemented).
 * @param {string} type a bump id
 * @returns {boolean} true when the layout and the engine may use it
 */
export function isImplemented(type) {
  return Boolean(bumpInfo(type)?.implemented);
}
