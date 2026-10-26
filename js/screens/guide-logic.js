// The Field guide's thinking part (T6.5, SPEC D22): which cards there are, which ones are open for a save, what each
// card says to use (from the bump and tool tables), and the first-time hint in the pop scene (which new kind to tell
// the player about, and in what order). No DOM, so Node can test it. screens/guide.js draws the cards; pop-mode.js
// shows the hint line; game/app.js keeps the save's seenKinds list.
// Rules (T6.5): a card opens once she has MET that kind in a pop scene (a round or free play; old saves also count the
// kinds she already has clean pops of, save.mastery), and a tool card (nose strip, warm cloth) also opens once she owns
// the tool. Unmet cards stay locked with a "?" (no spoilers).
// Customers (T8.3): one more card per customer twist (fidgety, ticklish, sensitive skin, in a hurry) in its own
// group, open once she has met a customer with it (save field seenTwists; old saves load []).

import { BUMPS } from '../data/bumps.js';
import { TWISTS, TWIST_IDS } from '../data/twists.js';

/**
 * Every card in the guide, in the order it shows. kind: 'bump' (a bump id in data/bumps.js), 'tool' (a tool you own,
 * data/tools.js; `tool` is its id) or 'decoy' (moles and freckles, data/bumps.js DECOYS). The texts come from the
 * string table: ui.guide.<id>.name, .line (a short funny line), .tip and .new (the first-time hint; not for the warm
 * cloth, which never shows up on a face).
 */
export const GUIDE_ENTRIES = [
  { id: 'whitehead', kind: 'bump' },
  { id: 'red', kind: 'bump' },
  { id: 'blackhead', kind: 'bump' },
  { id: 'big', kind: 'bump' },
  { id: 'gold', kind: 'bump' },
  { id: 'horn', kind: 'bump' },
  { id: 'hair', kind: 'bump' },
  { id: 'noseStrip', kind: 'tool', tool: 'noseStrip' },
  { id: 'decoys', kind: 'decoy' },
  { id: 'warmCloth', kind: 'tool', tool: 'warmCloth' },
];

/** Every guide kind id (what save.seenKinds may hold). */
export const GUIDE_KINDS = GUIDE_ENTRIES.map((e) => e.id);

/**
 * The order the first-time hints come in when several new kinds show up on one face: the ones that need a trick
 * (a tool, the warm cloth, leaving them alone) first, the plain whitehead last.
 */
export const HINT_ORDER = ['horn', 'hair', 'blackhead', 'red', 'big', 'gold', 'noseStrip', 'decoys', 'whitehead'];

/** The kinds on a face that are not bumps: a first-time hint for one of them goes after the next pop. */
const NOT_BUMPS = ['noseStrip', 'decoys', 'warmCloth'];

/**
 * A clean list of guide kinds (unknown ids and repeats dropped), in guide order.
 * @param {unknown} list a list from a save or the pop scene
 * @returns {string[]} kind ids
 */
export function cleanKinds(list) {
  const have = new Set(Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []);
  return GUIDE_KINDS.filter((id) => have.has(id));
}

/**
 * The kinds she has met: save.seenKinds, plus the bump kinds she already has clean pops of (save.mastery), so a save
 * from before the guide existed does not start with everything locked.
 * @param {object} save the save
 * @returns {string[]} kind ids, in guide order
 */
export function metKinds(save) {
  const mastery = save?.mastery && typeof save.mastery === 'object' ? save.mastery : {};
  const popped = Object.keys(mastery).filter((k) => Number(mastery[k]) > 0);
  return cleanKinds([...(Array.isArray(save?.seenKinds) ? save.seenKinds : []), ...popped]);
}

/**
 * Adds kinds to the save's seenKinds list (once each).
 * @param {object} save the save
 * @param {string[]} kinds kinds just met
 * @returns {object} the new save (the same object when nothing new was added)
 */
export function addSeenKinds(save, kinds) {
  const before = cleanKinds(save?.seenKinds);
  const after = cleanKinds([...before, ...(Array.isArray(kinds) ? kinds : [])]);
  return after.length === before.length ? save : { ...save, seenKinds: after };
}

/**
 * What to use on a card's kind, as tool ids: `first` = do this first (the warm cloth, for bumps that like warmth,
 * data/bumps.js warmHelps), `then` = the best tools (bestTools; needsTool first when it has one). Decoys: nothing.
 * @param {string} id a guide kind id
 * @returns {{first: string[], then: string[]}} tool ids
 */
export function guideTools(id) {
  const entry = GUIDE_ENTRIES.find((e) => e.id === id);
  if (!entry || entry.kind === 'decoy') return { first: [], then: [] };
  if (entry.kind === 'tool') return { first: [], then: [entry.tool] };
  const bump = BUMPS[id];
  const best = [...new Set([...(bump.needsTool ? [bump.needsTool] : []), ...bump.bestTools])];
  return { first: bump.warmHelps ? ['warmCloth'] : [], then: best };
}

/**
 * The "What to use" text of a card from its tool ids (guideTools): "Tweezers", "Fingers or Cotton pad", "Warm cloth
 * first, then Fingers", or "Nothing" for decoys. Tool names come from the string table (tool.<id>.name).
 * @param {(key: string, vars?: object) => string} t the string function
 * @param {{first: string[], then: string[]}} tools the tool ids
 * @returns {string} the text
 */
export function useText(t, { first = [], then = [] } = {}) {
  /** Tool names joined with "or". @param {string[]} ids tool ids @returns {string} text */
  const join = (ids) => ids.map((id) => t(`tool.${id}.name`)).reduce((a, b) => t('ui.guide.or', { a, b }));
  if (!then.length) return t('ui.guide.useNothing');
  return first.length ? t('ui.guide.then', { first: join(first), next: join(then) }) : join(then);
}

/**
 * The cards of the guide for what she has met and owns.
 * @param {{seenKinds?: string[], ownedTools?: string[]}} o seenKinds = the kinds met (metKinds); ownedTools = the
 *   tools she owns (economy.js unlockedTools)
 * @returns {{id: string, kind: string, open: boolean, nameKey: string, lineKey: string, tipKey: string,
 *   tools: {first: string[], then: string[]}}[]} one card per entry, in guide order
 */
export function guideCards({ seenKinds = [], ownedTools = [] } = {}) {
  const seen = new Set(cleanKinds(seenKinds));
  const owned = new Set(Array.isArray(ownedTools) ? ownedTools : []);
  return GUIDE_ENTRIES.map((e) => ({
    id: e.id, kind: e.kind, open: seen.has(e.id) || (e.kind === 'tool' && owned.has(e.tool)),
    nameKey: `ui.guide.${e.id}.name`, lineKey: `ui.guide.${e.id}.line`, tipKey: `ui.guide.${e.id}.tip`, tools: guideTools(e.id),
  }));
}

/**
 * A clean list of twist ids (unknown ids and repeats dropped), in data/twists.js order.
 * @param {unknown} list a list from a save
 * @returns {string[]} twist ids
 */
export function cleanTwists(list) {
  const have = new Set(Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []);
  return TWIST_IDS.filter((id) => have.has(id));
}

/**
 * Adds twists to the save's seenTwists list (T8.3; once each).
 * @param {object} save the save
 * @param {string[]} twists twists just met
 * @returns {object} the new save (the same object when nothing new was added)
 */
export function addSeenTwists(save, twists) {
  const before = cleanTwists(save?.seenTwists);
  const after = cleanTwists([...before, ...(Array.isArray(twists) ? twists : [])]);
  return after.length === before.length ? save : { ...save, seenTwists: after };
}

/**
 * The guide's "Customers" cards (T8.3): one per twist, open once she has met a customer with it (save.seenTwists).
 * Texts: twist.<id>.name, .line and .tip.
 * @param {{seenTwists?: string[]}} [o] the twists met
 * @returns {{id: string, kind: 'twist', open: boolean, nameKey: string, lineKey: string, tipKey: string,
 *   tools: {first: string[], then: string[]}}[]} one card per twist, in data/twists.js order
 */
export function twistCards({ seenTwists = [] } = {}) {
  const seen = new Set(cleanTwists(seenTwists));
  return TWIST_IDS.map((id) => ({
    id, kind: 'twist', open: seen.has(id), nameKey: TWISTS[id].nameKey, lineKey: TWISTS[id].lineKey, tipKey: TWISTS[id].tipKey,
    tools: { first: [], then: [] },
  }));
}

/**
 * How many cards are open, out of all of them (for the "3 of 10 found" line).
 * @param {{open: boolean}[]} cards the cards (guideCards)
 * @returns {{open: number, total: number}} the counts
 */
export function guideCount(cards) {
  return { open: cards.filter((c) => c.open).length, total: cards.length };
}

/**
 * The guide kinds on a face that was just laid out (pop/logic.js layoutFace): its bump kinds, 'noseStrip' when it has
 * the dotty nose, 'decoys' when it has a mole or freckles.
 * @param {{pimples?: {type: string}[], strip?: object|null, decoys?: object[]}} face the layout
 * @returns {string[]} kind ids, in guide order
 */
export function kindsOnFace({ pimples = [], strip = null, decoys = [] } = {}) {
  const kinds = pimples.map((p) => p.type);
  if (strip) kinds.push('noseStrip');
  if (Array.isArray(decoys) && decoys.length) kinds.push('decoys');
  return cleanKinds(kinds);
}

/**
 * The first-time hints for a face: the kinds on it she has not met yet, in HINT_ORDER (the pop scene shows the first
 * one, then the next after it is dealt with; never two at once).
 * @param {string[]} kinds the kinds on the face (kindsOnFace)
 * @param {string[]} seenKinds the kinds she has met before this face
 * @returns {string[]} kind ids, the first one to tell first
 */
export function newKindQueue(kinds, seenKinds) {
  const seen = new Set(cleanKinds(seenKinds));
  const fresh = new Set(cleanKinds(kinds).filter((k) => !seen.has(k)));
  return HINT_ORDER.filter((k) => fresh.has(k));
}

/**
 * The hint queue after a pop: the popped kind is done; a leading nose-strip or decoy hint is done after any pop (it
 * has been on show while she popped).
 * @param {string[]} queue the queue (newKindQueue)
 * @param {string} poppedType the kind of bump just popped
 * @returns {string[]} the queue left
 */
export function hintQueueAfterPop(queue, poppedType) {
  const q = Array.isArray(queue) ? queue : [];
  const shownDone = q.length && NOT_BUMPS.includes(q[0]) ? q[0] : null; // the nose strip or decoy hint that was on show
  return q.filter((k) => k !== poppedType && k !== shownDone);
}

/**
 * The string key of a kind's first-time hint ("New: Evil Horn! Warm cloth first, then fingers.").
 * @param {string} kind a guide kind id
 * @returns {string} string key
 */
export function newKindHintKey(kind) {
  return `ui.guide.${kind}.new`;
}
