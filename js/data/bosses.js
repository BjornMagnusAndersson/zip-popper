// Boss and event customers (T8.4, SPEC D24): every few customers a special customer with its own rule (a face full of
// one kind of bump, the nose strip always on, two big Evil Horns...) and a bigger reward (bonus coins and a stamp on
// their face in the Face album). The table holds the string keys and every number (first guesses, tune freely);
// bossFor says which customer is one. No DOM, no clock, no Math.random: the same customer always gets the same event.
// Rules (T8.4): a boss slot has no twist and no request (data/twists.js twistFor with boss: true returns null). The
// customer who sits in that slot stays who they are (a named regular keeps their face and lines); only their bumps,
// one accessory and the reward change. An event that needs a tool she does not own yet falls back to Golden Day.
// Boss pay goes through the normal pipeline (game/economy.js roundPayout) plus the event bonus (bossBonus), so the
// Keep working pay factor (0.6) also cuts the bonus.

import { makeRng } from './customers.js';
import { bumpInfo } from './bumps.js';

/** Every event id, in the order the Field guide lists them (also the ?boss= test flag values). */
export const BOSS_IDS = ['hairday', 'nosestrip', 'golden', 'horn'];

/** The most irritated a scaled boss meter gets (the same as New Game Plus, data/economy-data.js). */
export const BOSS_MAX_DIFFICULTY = 1.8;

/** The event used when a slot's own event needs a tool she does not own yet (it needs no tool at all). */
export const FALLBACK_BOSS = 'golden';

/**
 * The events. Fields:
 * - kind: 'event' (a theme day) or 'boss' (a tough customer); it picks the pill's label ("Event" / "Boss").
 * - needs: tool ids she must own for this event (else the slot gets FALLBACK_BOSS).
 * - mix: the bumps on the face, kind -> how many (a [fewest, most] pair is picked by the face seed). The face has
 *   exactly these, in the zones each kind likes (pop/logic.js layoutFace mix).
 * - stripAlways: the nose strip (the dotty nose) is always on, whatever the coin toss says.
 * - grownHorns: Evil Horns start fully grown and this many times their usual size (0 = as usual).
 * - coldHorn: (only the Big Evil Horn, SPEC D49) how its horns behave while cold (not warmed by the warm cloth):
 *   rough = the Ow chance of a squeeze start on a cold horn at a calm meter (the horn's usual rough is in data/bumps.js);
 *   holdScale = how many times longer a cold horn takes to squeeze out; both fade to the horn's usual values as the warm
 *   cloth warms it (tool-logic.js coldFactor), then the warm cloth's usual cut applies. fullCold = a cold horn's pop
 *   counts on the irritation meter at the boss's full difficulty (not capped by ROUND_IRRITATION.coldPopMax, D27c);
 *   off for the horn since the owner picked the softer step (D49), kept as a knob.
 *   Left out = horns as on any other face.
 * - accessory: one face accessory she wears for the day (left out when that spot is taken, see ACCESSORY_SLOTS).
 * - difficulty: the irritation difficulty for this face (null = the slot's own, see data/chapters.js CAREER_BANDS).
 * - difficultyScale: when difficulty is null, the slot's own difficulty is multiplied by this (R7: bosses felt too easy),
 *   at most BOSS_MAX_DIFFICULTY.
 * - reward: flat = bonus coins; payScale = kind -> pay multiplier for those clean pops (2 = double pay on hairs, the
 *   extra half is the bonus); popScale = multiplier on all pop coins (1.5 = half the pops line again as a bonus).
 * String keys: boss.<id>.name (pill, chip, guide card, album), .line (a funny line on the intro pill), .hint (the tip
 * on the intro pill and the pop scene's hint line before the first pop), .reward (what she gets, on the intro pill),
 * .bonus (the coin row on the result screen), .tip (the guide card).
 */
export const BOSSES = {
  hairday: {
    kind: 'event', needs: ['tweezers'], mix: { hair: [5, 7], whitehead: 2, red: 1 }, stripAlways: false, grownHorns: 0,
    accessory: 'headband', difficulty: null, difficultyScale: 1.3, reward: { flat: 10, payScale: { hair: 1.5 }, popScale: 1 },
  },
  nosestrip: {
    kind: 'event', needs: ['noseStrip', 'tweezers'], mix: { blackhead: 6, whitehead: 3 }, stripAlways: true, grownHorns: 0,
    accessory: 'scarf', difficulty: null, difficultyScale: 1.3, reward: { flat: 10, payScale: null, popScale: 1 },
  },
  golden: { // relaxed: no timer (a boss never has a request), a softer meter
    kind: 'event', needs: [], mix: { gold: 4, whitehead: 5 }, stripAlways: false, grownHorns: 0,
    accessory: 'tiara', difficulty: 0.8, reward: { flat: 0, payScale: null, popScale: 1.25 },
  },
  horn: { // Big Evil Horn: two horns grown big plus reds; the warm cloth is the way in, so it needs one (D27c, B75)
    kind: 'boss', needs: ['warmCloth'], mix: { horn: 2, red: 4, whitehead: 2 }, stripAlways: false, grownHorns: 1.2,
    accessory: 'sunglasses', difficulty: null, difficultyScale: 1.3, reward: { flat: 15, payScale: null, popScale: 1 },
    // D49: a little harder without the warm cloth. rough 0.4 at a calm meter: the meter's own boost (IRRITATION.boost)
    // lifts it to about half of the cold squeeze starts in play (bot sweep: 0.48 for a careful player; 0.5 gave 0.61).
    coldHorn: { rough: 0.4, holdScale: 1.4, fullCold: false }, // owner 2026-10-31: the softer step (D49)
  },
};

/**
 * Face spots an accessory takes: a day accessory is only added when she wears nothing else in that spot (so a tiara
 * never sits on a pilot cap). The clown nose comes off on Nose Strip Day (the strip goes there).
 */
export const ACCESSORY_SLOTS = {
  head: ['hat', 'beanie', 'pilot-cap', 'veil', 'tiara', 'headband'],
  eyes: ['glasses', 'sunglasses'],
  neck: ['bowtie', 'scarf'],
};

/**
 * The career's boss slots (chapter 5, 15 customers): customer number -> the events to try in order (the first one
 * whose tools she owns). Customers 5 (Prom Penny), 9 (a walk-in) and 13 (Pilot Pete) keep who they are; the twist
 * schedule (data/twists.js: 4, 6, 8, 10, 12, 15) never lands on these numbers.
 */
export const CAREER_BOSSES = { chapter: 5, slots: { 5: ['hairday', 'golden'], 9: ['nosestrip', 'golden'], 13: ['horn'] } };

/** Keep working: every `every`th customer (k mod every = 0) is an event, taken from `cycle` in turn. */
export const KEEP_WORKING_BOSSES = { every: 8, cycle: ['hairday', 'nosestrip', 'golden', 'horn'] };

/** Added to the face seed when an event picks its bump counts, so they do not follow the layout's own numbers. */
const MIX_SEED_SALT = 6151;

/**
 * Whether a value is a known event id.
 * @param {unknown} id anything
 * @returns {boolean} true for 'hairday', 'nosestrip', 'golden' or 'horn'
 */
export function isBoss(id) {
  return typeof id === 'string' && BOSS_IDS.includes(id);
}

/**
 * Whether she owns every tool an event needs.
 * @param {string} id an event id
 * @param {string[]} [ownedTools] the tools she owns (economy.js unlockedTools)
 * @returns {boolean} true = the event can run
 */
export function hasBossTools(id, ownedTools = []) {
  const owned = Array.isArray(ownedTools) ? ownedTools : [];
  return isBoss(id) && BOSSES[id].needs.every((tool) => owned.includes(tool));
}

/**
 * The first event of a list she has the tools for, or FALLBACK_BOSS.
 * @param {string[]} list event ids, best first
 * @param {string[]} ownedTools the tools she owns
 * @returns {string} an event id
 */
function firstPlayable(list, ownedTools) {
  return list.find((id) => hasBossTools(id, ownedTools)) ?? FALLBACK_BOSS;
}

/**
 * The event of career customer n (chapter 5), or null for a normal customer.
 * @param {number} n customer number, 1 based
 * @param {string[]} [ownedTools] the tools she owns
 * @returns {string|null} an event id
 */
export function careerBoss(n, ownedTools = []) {
  return Object.hasOwn(CAREER_BOSSES.slots, n) ? firstPlayable(CAREER_BOSSES.slots[n], ownedTools) : null;
}

/**
 * The event of Keep working customer k: every KEEP_WORKING_BOSSES.every customers one, from the cycle in turn (the
 * 8th customer Hair Day, the 16th Nose Strip Day...), Golden Day when she lacks its tools.
 * @param {number} k Keep working customer number, 1 based
 * @param {string[]} [ownedTools] the tools she owns
 * @returns {string|null} an event id
 */
export function keepWorkingBoss(k, ownedTools = []) {
  const { every, cycle } = KEEP_WORKING_BOSSES;
  if (!Number.isInteger(k) || k < every || k % every !== 0) return null;
  return firstPlayable([cycle[(k / every - 1) % cycle.length]], ownedTools);
}

/**
 * Which event a customer is. Chapters 0 to 4: none. Chapter 5: the career slots. Keep working: every 8th customer.
 * @param {{chapter?: number, n?: number, keepWorking?: boolean, ownedTools?: string[]}} o the customer step (chapter,
 *   number; keepWorking = n is Keep working's own count) and the tools she owns
 * @returns {string|null} an event id
 */
export function bossFor({ chapter, n, keepWorking = false, ownedTools = [] } = {}) {
  if (keepWorking) return keepWorkingBoss(n, ownedTools);
  if (chapter !== CAREER_BOSSES.chapter) return null;
  return careerBoss(n, ownedTools);
}

/**
 * The bumps of an event's face: each kind's count, a [fewest, most] pair picked by the face seed (the same seed always
 * gives the same counts).
 * @param {string} id an event id
 * @param {number} seed the face seed
 * @returns {Object<string, number>} kind -> how many (empty for an unknown event)
 */
export function bossMix(id, seed) {
  if (!isBoss(id)) return {};
  const rng = makeRng((Number.isFinite(seed) ? Math.floor(seed) : 1) + MIX_SEED_SALT);
  const out = {};
  for (const [kind, want] of Object.entries(BOSSES[id].mix)) {
    out[kind] = Array.isArray(want) ? want[0] + Math.floor(rng() * (want[1] - want[0] + 1)) : want;
  }
  return out;
}

/**
 * Her accessories for the event: the day accessory is added when that spot is free; the clown nose comes off when the
 * nose strip has to go on.
 * @param {string[]} accessories what she wears normally
 * @param {string} id an event id
 * @returns {string[]} a new list
 */
export function bossAccessories(accessories, id) {
  let list = Array.isArray(accessories) ? [...accessories] : [];
  if (!isBoss(id)) return list;
  const b = BOSSES[id];
  if (b.stripAlways) list = list.filter((a) => a !== 'clown-nose');
  const slot = Object.values(ACCESSORY_SLOTS).find((s) => s.includes(b.accessory));
  if (b.accessory && !list.includes(b.accessory) && !(slot && list.some((a) => slot.includes(a)))) list.push(b.accessory);
  return list;
}

/**
 * A customer spec (game/chapter-logic.js customerSpec shape) turned into an event customer: the same person, with the
 * event's bumps (bossMix), its accessory, its difficulty (or the slot's), no request, and a `boss` field the pop
 * scene's face setup reads (round-logic.js roundFaceSetup: mix, stripAlways, grownHorns, and coldHorn when the event has one).
 * @param {object} spec the normal spec
 * @param {string} id an event id
 * @param {number} seed the face seed
 * @returns {object} a new spec (the spec given is not changed; an unknown event returns it as it is)
 */
export function bossSpec(spec, id, seed) {
  if (!spec || !isBoss(id)) return spec;
  const b = BOSSES[id];
  const mix = bossMix(id, seed);
  const types = Object.keys(mix);
  const count = Object.values(mix).reduce((a, n) => a + n, 0);
  const face = { ...spec.customer.face, accessories: bossAccessories(spec.customer.face?.accessories, id) };
  const customer = { ...spec.customer, face, bumps: count, bumpTypes: [...types] };
  return {
    ...spec, customer, bumpCount: count, allowedTypes: [...types], difficulty: b.difficulty ?? Math.min(BOSS_MAX_DIFFICULTY, spec.difficulty * (b.difficultyScale ?? 1)), requestAllowed: false,
    boss: { id, kind: b.kind, mix: { ...mix }, stripAlways: b.stripAlways, grownHorns: b.grownHorns, ...(b.coldHorn ? { coldHorn: { ...b.coldHorn } } : {}) },
  };
}

/**
 * The event's bonus coins for a finished face (before the Keep working factor): the flat bonus, plus the extra part of
 * any pay multiplier (double pay on hairs = the hairs' pay once more), plus the extra part of the pops multiplier.
 * @param {string|null} id an event id (anything else = 0)
 * @param {string[]} cleanBumpTypes the kinds popped clean
 * @param {number} popCoins the pops line of the payout (economy.js roundPayout)
 * @returns {number} whole coins
 */
export function bossBonus(id, cleanBumpTypes = [], popCoins = 0) {
  if (!isBoss(id)) return 0;
  const { flat = 0, payScale = null, popScale = 1 } = BOSSES[id].reward;
  let extra = 0;
  if (payScale) {
    for (const type of Array.isArray(cleanBumpTypes) ? cleanBumpTypes : []) {
      if (Object.hasOwn(payScale, type)) extra += (bumpInfo(type)?.pay ?? 0) * (payScale[type] - 1);
    }
  }
  const pops = Number.isFinite(popCoins) && popCoins > 0 ? popCoins : 0;
  return Math.max(0, Math.round(flat + extra + pops * (popScale - 1)));
}

/**
 * The string keys an event shows (intro pill, pop scene chip, result row, guide card).
 * @param {string|null} id an event id
 * @returns {{id: string, kind: string, labelKey: string, nameKey: string, lineKey: string, hintKey: string,
 *   rewardKey: string, bonusKey: string, tipKey: string}|null} the keys, or null for no event
 */
export function describeBoss(id) {
  if (!isBoss(id)) return null;
  const kind = BOSSES[id].kind;
  return {
    id, kind, labelKey: kind === 'boss' ? 'boss.label.boss' : 'boss.label.event', nameKey: `boss.${id}.name`,
    lineKey: `boss.${id}.line`, hintKey: `boss.${id}.hint`, rewardKey: `boss.${id}.reward`, bonusKey: `boss.${id}.bonus`,
    tipKey: `boss.${id}.tip`,
  };
}
