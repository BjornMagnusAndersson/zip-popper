// The kinds of bump, as one table (T1.1). The pop scene (pop/logic.js lays them out, pop/engine.js squeezes and
// pops them) reads everything about a bump from here: how long a squeeze takes, how big it is, what comes out, which
// tool suits it and what it pays. Numbers are first guesses (docs/TOOLS.md) and get tuned in play.
// No DOM, no text shown to the player: names on screen come from the string table (strings/en.json), not from here.
// Cartoon only: goo is cream, white or glitter, never blood.

/**
 * Tool ids used in bestTools / needsTool (docs/TOOLS.md). Only fingers exist in the game today; the others arrive in
 * later tasks.
 */
export const TOOL_IDS = ['fingers', 'cottonPad', 'tweezers', 'warmCloth', 'noseStrip', 'gloves'];

/**
 * Every kind of bump. Fields:
 * - implemented: false = data only, the layout and the engine skip it (its behaviour comes in a later task).
 * - hold: seconds of pressing and holding before it pops.
 * - radius: [smallest, biggest] drawn radius in px on a face FACE_UNIT px half-width (pop/logic.js scales it).
 * - goo: what comes out: 'white', 'cream' or 'gold' (glitter goo), 'plug' (a dark plug the tweezers pull, no goo),
 *   'horn' (a cartoon horn creaks out), 'hair' (a silly long hair is pulled out).
 * - drops: how many goo drops fly off when it pops (0 = none).
 * - bestTools: the tools that work best on it (any of TOOL_IDS).
 * - warmHelps: true when a warm cloth first makes it pop faster and safer (never required).
 * - needsTool: a tool it must have, or null. The seed already pulls blackheads with drawn tweezers.
 * - pay: coins a clean pop earns (first guess; scoring adds tips and combo on top).
 */
export const BUMPS = {
  whitehead: {
    implemented: true, hold: 0.7, radius: [19, 24], goo: 'white', drops: 4,
    bestTools: ['fingers', 'cottonPad'], warmHelps: false, needsTool: null, pay: 2,
  },
  red: { // a pink, swollen one; it bursts with cream-coloured goo (never blood)
    implemented: true, hold: 0.95, radius: [21, 27], goo: 'cream', drops: 6,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 3,
  },
  blackhead: { // a small dark plug, pulled out with tweezers
    implemented: true, hold: 0.6, radius: [12, 15], goo: 'plug', drops: 0,
    bestTools: ['tweezers'], warmHelps: false, needsTool: 'tweezers', pay: 2,
  },
  big: { // slow, the big satisfying one
    implemented: true, hold: 1.5, radius: [32, 38], goo: 'cream', drops: 12,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 5,
  },
  gold: { // the Golden bump: sparkly bonus, pops with glitter; any squeezing tool is fine
    implemented: true, hold: 0.8, radius: [19, 23], goo: 'gold', drops: 8,
    bestTools: ['fingers', 'cottonPad'], warmHelps: false, needsTool: null, pay: 10,
  },
  horn: { // the Evil Horn: grows while you watch, creaks out (behaviour in T1.3)
    implemented: false, hold: 1.8, radius: [24, 30], goo: 'horn', drops: 0,
    bestTools: ['fingers'], warmHelps: true, needsTool: null, pay: 8,
  },
  hair: { // an ingrown hair: a silly, very long hair is pulled out (behaviour in T1.3)
    implemented: false, hold: 1.0, radius: [13, 17], goo: 'hair', drops: 0,
    bestTools: ['tweezers'], warmHelps: false, needsTool: 'tweezers', pay: 6,
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
