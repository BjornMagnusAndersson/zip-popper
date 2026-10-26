// The tools, as one table (T1.2, approved in docs/TOOLS.md). The pop scene reads everything about a tool from here:
// what a press with it does, which bumps it can work on (any other bump gives an "Ow" and no pop), how fast it is,
// and when it unlocks. The rules that use this table live in pop/tool-logic.js. Numbers are first guesses.
// No DOM, no text shown to the player: names and hints come from the string table (tool.<id>.name, tool.<id>.hint).

/**
 * Every tool. Fields:
 * - implemented: false = data only (its step does not exist yet); it never shows in the tool bar.
 * - bar: true = it has a button in the tool bar at the bottom of the pop scene.
 * - unlockChapter: the story chapter it unlocks in (1 = from the start). unlockAtEnd: true = at the END of that chapter.
 *   Data only for now: in the demo and in Free play every implemented tool is available (SPEC section 5).
 * - use: what a press does: 'squeeze' (press and hold a bump), 'pull' (grab and pull a bump out), 'strip' (stick on the
 *   nose, then peel), 'warm' (hold on the face to fill the warm meter), 'patch' (stick on a popped spot),
 *   'cleanup' (a cleanup step), 'wear' (worn, changes nothing on the face yet).
 * - works: the bumps it can press: 'all', or a list of bump ids. Pressing any other bump gives an Ow ('squeeze' and
 *   'pull' tools only).
 * - holdScale: hold time multiplier per bump id ('default' for the rest); below 1 = faster than bare fingers.
 * - roughScale: how rough the tool is on a cold bump (T1.2b, TOOLS.md decision 3): 1 = bare fingers, below 1 = gentler.
 *   It multiplies the bump's rough-press chance (data/bumps.js rough) and the irritation a cold pop adds. 0 = never.
 * - ick: true = adds the hidden "ick" in chapter 5 (gloves remove it). Data only for now.
 */
export const TOOLS = {
  fingers: {
    implemented: true, bar: true, unlockChapter: 1, use: 'squeeze', works: 'all',
    holdScale: { default: 1, blackhead: 1.5, hair: 1.5 }, // fingers can get a blackhead out too, just slowly
    roughScale: 1, ick: true,
  },
  cottonPad: { // gentler, a bit faster on whiteheads (wiping goo is the cleanup step)
    implemented: true, bar: true, unlockChapter: 2, use: 'squeeze', works: ['whitehead', 'red', 'big', 'gold', 'horn'],
    holdScale: { default: 0.95, whitehead: 0.8 }, roughScale: 0.5,
  },
  tweezers: { // pulls blackheads and hairs only
    implemented: true, bar: true, unlockChapter: 2, use: 'pull', works: ['blackhead', 'hair'],
    holdScale: { default: 0.9 }, roughScale: 0,
  },
  noseStrip: { // stick on the nose, rip off: clears the tiny dots at once; on a bump off the nose it is an Ow
    implemented: true, bar: true, unlockChapter: 3, use: 'strip', works: [], holdScale: { default: 1 }, roughScale: 0,
  },
  warmCloth: { // never required, never an Ow: hold on the face, bumps pop faster for a while
    implemented: true, bar: true, unlockChapter: 3, use: 'warm', works: [], holdScale: { default: 1 }, roughScale: 0,
  },
  patch: { // hydrocolloid patch: stick on a popped spot (the tip bonus comes with the tips system)
    implemented: true, bar: true, unlockChapter: 5, use: 'patch', works: [], holdScale: { default: 1 }, roughScale: 0,
  },
  cream: { // the cleanup cream: today it goes on by itself after the wipe (engine.js), no button
    implemented: false, bar: false, unlockChapter: 1, use: 'cleanup', works: [], holdScale: { default: 1 }, roughScale: 0,
  },
  gloves: { // removes the hidden "ick"; looks silly and professional (data only until the ick exists)
    implemented: false, bar: false, unlockChapter: 5, unlockAtEnd: true, use: 'wear', works: [], holdScale: { default: 1 }, roughScale: 0,
  },
};

/** Every tool id, in table order (also the order of the buttons in the tool bar). */
export const TOOL_IDS = Object.keys(TOOLS);

/** How the warm cloth works (all first guesses). */
export const WARM = {
  fillPerSecond: 0.7, // holding the cloth on the face fills the meter in about 1.4 s
  drainPerSecond: 1 / 14, // a full meter lasts about 14 s
  helpsCut: 0.4, // at a full meter, bumps that like warmth (data/bumps.js warmHelps) need 40 percent less hold time
  otherCut: 0.15, // ...and other bumps 15 percent less
  roughCut: 0.8, // at a full meter, the rough-press (Ow) chance and the irritation of a cold pop are 80 percent lower
};

/**
 * The irritation meter (T1.2b, TOOLS.md decision 3, SPEC D15), 0..1. Full = the customer storms off (Story/Career only).
 * All first guesses, tuned in play.
 */
export const IRRITATION = {
  perOw: 0.12, // each Ow (wrong tool or rough press) adds this
  coldPop: 1.5, // a pop of a cold bump adds coldPop x its rough chance x the tool's roughScale (red: 0.18 with fingers)
  boost: 1.5, // while it is high the rough-press chance grows: x (1 + boost x level), so x2.5 when full
  calmDelay: 5, // seconds without a new rise before it starts to calm down by itself
  drainPerSecond: 0.08, // how fast it calms after that (full to nothing in about 12 s)
  warmDrain: 0.25, // while the warm cloth is held on the face it calms this fast, at once (no waiting)
  padSeconds: 3, // after a cotton pad pop it calms at padDrain for this many seconds, at once
  padDrain: 0.2,
  cream: 1, // the cream takes away this much (all of it)
};

/**
 * The table entry for a tool.
 * @param {string} id a tool id, e.g. 'tweezers'
 * @returns {object|null} the entry, or null for an unknown id
 */
export function toolInfo(id) {
  return Object.hasOwn(TOOLS, id) ? TOOLS[id] : null;
}
