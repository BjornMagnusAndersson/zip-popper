// Customer twists (T8.3, SPEC D24b): one small rule per customer that changes how that one face plays, so every
// customer feels a bit different. The table holds the string keys and every number (first guesses, tune freely);
// twistFor says which customer gets which twist. No DOM, no clock, no Math.random: the same customer always gets the
// same twist (also after a reload). The engine side of the rules (the sway, the giggle) is in pop/twist-logic.js.
// Rule "one extra per customer" (T8.3): a customer has a twist OR a request, never both. A twist customer gets no
// request; a request customer gets no twist. The hurry request IS the "in a hurry" twist (it shows as a twist pill).
// Chapters 0 to 4 have no twists. Chapter 5 brings them one at a time by a fixed schedule; Keep working rolls one.

import { makeRng } from './customers.js';

/** Every twist id. 'hurry' is not rolled here: it comes from the hurry request (game/requests.js). */
export const TWIST_IDS = ['fidgety', 'ticklish', 'sensitive', 'hurry'];

/** The twists that twistFor hands out (the hurry twist comes from a request instead). */
export const ROLLED_TWISTS = ['fidgety', 'ticklish', 'sensitive'];

/**
 * The twists with their string keys: twist.<id>.name (the pill and the guide card), .line (a short funny line on the
 * intro pill), .hint (the tip on the intro and the pop scene's hint line before the first pop), .tip (the guide card's
 * tip). The sensitive twist has a second hint for a player without the warm cloth (.hintShop).
 */
export const TWISTS = Object.fromEntries(TWIST_IDS.map((id) => [id, {
  id,
  nameKey: `twist.${id}.name`,
  lineKey: `twist.${id}.line`,
  hintKey: `twist.${id}.hint`,
  tipKey: `twist.${id}.tip`,
}]));

/**
 * Fidgety: the whole face slowly sways (bumps and hit areas with it). amount = how far, as a share of the face's half
 * width (0.07 = about 3.5 percent of the face's width); maxPx = never more than this many screen px; period = seconds
 * of one side-to-side sway (the up-down one is a bit slower, so it never looks like a machine); reduced = how much of
 * the sway is left with reduced motion (it is a game rule, so not zero); ease = how fast it fades in at the start and
 * out after the pops (share per second); margin = screen px a bump always keeps from the screen edge and the tool bar.
 */
export const SWAY = { amount: 0.07, maxPx: 14, period: 4.2, periodY: 5.7, reduced: 0.45, ease: 1.2, margin: 4 };

/**
 * Ticklish: holding a squeeze on a cheek, the side of the neck (jaw) or near the ear (temple) for holdSeconds makes
 * her giggle: the face jerks away for jerkSeconds (jerkShare of the face's half width, capped like the sway), the
 * bump's press progress drops back by dropBack (0..1), the press is let go, and new presses do nothing until the
 * jerk is over. cooldown = seconds after a giggle before the next one can come; irritation = how much each giggle
 * adds to the irritation meter (times the customer's difficulty).
 */
export const TICKLE = {
  holdSeconds: 1.1, dropBack: 0.2, jerkSeconds: 0.4, jerkShare: 0.08, cooldown: 0.4, irritation: 0.03,
  zones: ['cheekL', 'cheekR', 'jawL', 'jawR', 'temple'],
};

/**
 * Sensitive skin: a cold squeeze (fingers or cotton pad on a cold red, big or horn bump) is roughScale times as likely
 * to be an Ow; the warm cloth takes that extra away as it warms (a full warm meter = the normal chance, which the
 * cloth already lowers a lot). Each Ow fills the irritation meter owScale times as much. blush = the cheeks look this
 * irritated (0..1) from the start, before any Ow.
 */
export const SENSITIVE = { roughScale: 2, owScale: 1.5, blush: 0.3 };

/**
 * The career schedule (chapter 5): customer number -> twist. Each twist is met first on its own (4 fidgety, 6
 * sensitive, 8 ticklish), then about every second customer, never two in a row, nothing before customer 4. Customer 8
 * is Gus (a nervous, giggly groom) and 15 is Clown Cleo, who suit the ticklish twist (REGULAR_TWISTS).
 */
export const CAREER_TWISTS = { chapter: 5, schedule: { 4: 'fidgety', 6: 'sensitive', 8: 'ticklish', 10: 'fidgety', 12: 'sensitive', 15: 'ticklish' } };

/**
 * T8.4: career customers 5, 9 and 13 are boss or event customers (data/bosses.js: no twist, no request). Customer 5
 * (Prom Penny) used to roll the career's only hurry request, so this customer always gets a hurry request instead
 * (app-logic.js roundArgs), else the career would have no "in a hurry" customer at all.
 */
export const CAREER_HURRY = { chapter: 5, n: 7 };

/** Keep working: about chance of the customers get a twist, rolled with a fixed seed per customer number. */
export const KEEP_WORKING_TWISTS = { chance: 0.6, seedBase: 90000 };

/**
 * Named regulars whose own lines suit a twist: in Keep working they always have it (penny: "sooo excited"; nils:
 * nervous; gus: everything is going wrong at his wedding; cleo: a clown; greta: a gentle grandmother).
 */
export const REGULAR_TWISTS = { penny: 'fidgety', nils: 'fidgety', gus: 'ticklish', cleo: 'ticklish', greta: 'sensitive' };

/**
 * Whether a value is a known twist id.
 * @param {unknown} id anything
 * @returns {boolean} true for 'fidgety', 'ticklish', 'sensitive' or 'hurry'
 */
export function isTwist(id) {
  return typeof id === 'string' && TWIST_IDS.includes(id);
}

/**
 * The twist of career customer n (chapter 5), from the fixed schedule, or null.
 * @param {number} n customer number, 1 based
 * @returns {string|null} a twist id
 */
export function careerTwist(n) {
  return Object.hasOwn(CAREER_TWISTS.schedule, n) ? CAREER_TWISTS.schedule[n] : null;
}

/**
 * The twist of Keep working customer k: a named regular with a fitting twist always has it; anyone else gets one of
 * the three about KEEP_WORKING_TWISTS.chance of the time. The same k always gives the same answer.
 * @param {number} k Keep working customer number, 1 based
 * @param {string|null} [regularId] the regular's id when customer k is a named regular
 * @returns {string|null} a twist id
 */
export function keepWorkingTwist(k, regularId = null) {
  if (regularId && Object.hasOwn(REGULAR_TWISTS, regularId)) return REGULAR_TWISTS[regularId];
  const n = Number.isInteger(k) && k >= 1 ? k : 1;
  const rng = makeRng(KEEP_WORKING_TWISTS.seedBase + n * 31);
  if (rng() >= KEEP_WORKING_TWISTS.chance) return null;
  return ROLLED_TWISTS[Math.min(ROLLED_TWISTS.length - 1, Math.floor(rng() * ROLLED_TWISTS.length))];
}

/**
 * Which twist a customer has (not the hurry twist: that one comes with a hurry request).
 * Chapters 0 to 4: none. Chapter 5: the fixed schedule (careerTwist). Keep working: keepWorkingTwist. A boss or event
 * customer (boss: true, T8.4 later) never has one.
 * @param {{chapter?: number, n?: number, keepWorking?: boolean, regularId?: string|null, boss?: boolean}} o the
 *   customer: chapter and number (as in a customer step), keepWorking = a Keep working customer (n is then its own
 *   count), regularId = the named regular's id, boss = a boss slot
 * @returns {string|null} 'fidgety', 'ticklish', 'sensitive' or null
 */
export function twistFor({ chapter, n, keepWorking = false, regularId = null, boss = false } = {}) {
  if (boss) return null;
  if (keepWorking) return keepWorkingTwist(n, regularId);
  if (chapter !== CAREER_TWISTS.chapter) return null;
  return careerTwist(n);
}

/**
 * The twist a round shows: its own twist, or 'hurry' when it has a hurry request instead.
 * @param {string|null} twist from twistFor (or a forced test twist)
 * @param {{type: string}|null} request the round's request
 * @returns {string|null} a twist id
 */
export function shownTwist(twist, request) {
  if (isTwist(twist)) return twist;
  return request?.type === 'hurry' ? 'hurry' : null;
}

/**
 * The string keys the intro pill and the pop scene show for a twist. The sensitive twist tells a player without the
 * warm cloth that the shop has one.
 * @param {string|null} id a twist id
 * @param {{ownedTools?: string[]}} [o] the tools the player owns
 * @returns {{id: string, nameKey: string, lineKey: string, hintKey: string}|null} the keys, or null for no twist
 */
export function describeTwist(id, { ownedTools = [] } = {}) {
  if (!isTwist(id)) return null;
  const tw = TWISTS[id];
  const shop = id === 'sensitive' && !(Array.isArray(ownedTools) && ownedTools.includes('warmCloth'));
  return { id, nameKey: tw.nameKey, lineKey: tw.lineKey, hintKey: shop ? 'twist.sensitive.hintShop' : tw.hintKey };
}
