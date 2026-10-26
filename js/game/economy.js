// Pure economy logic (T3.2, docs/ECONOMY.md): what a customer pays, reputation and tiers, the skip penalty, the shop,
// skill by use (mastery), difficulty by customer number and the milestone comic strips.
// No DOM, no audio, not wired into the game yet. Style as in scoring.js: every function returns a NEW state object and
// never changes the one it is given. All numbers live in data/economy-data.js.

import { starsFor, comboBonus } from './scoring.js';
import { bumpInfo } from '../data/bumps.js';
import { defaultSave, normalizeSave } from '../core/save.js';
import { outfitTier } from './studio.js';
import {
  STAR_TIPS, REQUEST_BONUS, REQUEST_BONUS_DEFAULT, REPUTATION_PER_STAR, SKIP_PENALTIES, TIER_THRESHOLDS,
  SCRUB_REPUTATION, SHOP_ITEMS, MASTERY_LEVELS, MASTERY_STRIP_LEVEL, DIFFICULTY_BANDS,
  STRIP_FIRST_THREE_STAR, STRIP_FIRST_MASTERY,
} from '../data/economy-data.js';

// The economy state is this part of the save object (see economyFromSave / economyToSave):
// { money, reputation, skipStreak, mastery:{type:cleanPops}, items:{id:{needsScrub}}, unlockedTools:[], studioLayers:[],
//   threeStarDone, requestsDone, stats:{pops, stars, bestCombo} }

/** Request bonus for a request kind ('gentle', 'hurry', 'combo', or true for "done"); 0 for none. @param {unknown} kind @returns {number} coins */
function requestBonusFor(kind) {
  if (!kind) return 0;
  return Object.hasOwn(REQUEST_BONUS, kind) ? REQUEST_BONUS[kind] : REQUEST_BONUS_DEFAULT;
}

/**
 * What one finished customer pays. A failed customer (stormed off) pays nothing. Otherwise: the pay of each clean pop,
 * the tip for the stars, the combo bonus (scoring.js) and the request bonus.
 * @param {object} roundState a scoring.js round state
 * @param {string[]} bumpTypesPopped the bump types that were popped clean (unknown types pay 0)
 * @param {boolean|string|null} requestDone false/null = no request done; 'gentle' | 'hurry' | 'combo' = that request done; true = done (default bonus)
 * @returns {{popCoins:number, tip:number, combo:number, requestBonus:number, total:number}} the coins
 */
export function roundPayout(roundState, bumpTypesPopped, requestDone = false) {
  if (roundState.failed) return { popCoins: 0, tip: 0, combo: 0, requestBonus: 0, total: 0 };
  const popCoins = (bumpTypesPopped ?? []).reduce((sum, t) => sum + (bumpInfo(t)?.pay ?? 0), 0);
  const tip = STAR_TIPS[starsFor(roundState)] ?? 0;
  const combo = comboBonus(roundState);
  const requestBonus = requestBonusFor(requestDone);
  return { popCoins, tip, combo, requestBonus, total: popCoins + tip + combo + requestBonus };
}

/**
 * Packs a finished round into the result applyRoundResult wants.
 * @param {object} roundState a scoring.js round state
 * @param {string[]} bumpTypesPopped the bump types popped clean
 * @param {boolean|string|null} requestDone see roundPayout
 * @param {'again'|'next'} [choice] after a fail: 'again' (free) or 'next' (costs reputation)
 * @returns {object} { stars, failed, choice, payout, total, pops, bestCombo, requestDone }
 */
export function buildRoundResult(roundState, bumpTypesPopped, requestDone = false, choice = 'again') {
  const payout = roundPayout(roundState, bumpTypesPopped, requestDone);
  return {
    stars: starsFor(roundState), failed: Boolean(roundState.failed), choice, payout, total: payout.total,
    pops: roundState.pops, bestCombo: roundState.bestCombo, requestDone: Boolean(requestDone),
  };
}

/**
 * Applies a finished round to the economy.
 * - Finished (not failed): money += total, reputation += stars, the skip streak is reset, stats and requests are counted.
 * - Failed + 'again': nothing changes (free). Failed + 'next': reputation drops by the skip ladder (2, 3, 4, 5, 5...)
 *   and the streak grows. Money and reputation never go below 0.
 * @param {object} state the economy state @param {object} result see buildRoundResult (stars, failed, choice, total, pops, bestCombo, requestDone)
 * @returns {object} new state
 */
export function applyRoundResult(state, result) {
  if (result.failed) {
    if (result.choice !== 'next') return { ...state };
    const penalty = SKIP_PENALTIES[Math.min(state.skipStreak, SKIP_PENALTIES.length - 1)];
    return { ...state, reputation: Math.max(0, state.reputation - penalty), skipStreak: state.skipStreak + 1 };
  }
  const stars = Math.max(0, Math.floor(result.stars ?? 0));
  const stats = state.stats;
  return {
    ...state,
    money: Math.max(0, state.money + Math.max(0, Math.floor(result.total ?? 0))),
    reputation: Math.max(0, state.reputation + stars * REPUTATION_PER_STAR),
    skipStreak: 0,
    threeStarDone: state.threeStarDone || stars >= 3,
    requestsDone: state.requestsDone + (result.requestDone ? 1 : 0),
    stats: {
      pops: stats.pops + Math.max(0, Math.floor(result.pops ?? 0)),
      stars: stats.stars + stars,
      bestCombo: Math.max(stats.bestCombo, Math.floor(result.bestCombo ?? 0)),
    },
  };
}

/** The shop tier (1, 2 or 3) a reputation gives. @param {number} reputation points @returns {number} tier */
export function tierFor(reputation) {
  let tier = 1;
  TIER_THRESHOLDS.forEach((need, i) => { if (reputation >= need) tier = i + 1; });
  return tier;
}

/**
 * Why an item cannot be bought now, or null when it can: 'unknown', 'story' (given by the story), 'owned', 'tier' or 'money'.
 * @param {object} state the economy state @param {string} itemId a SHOP_ITEMS id @returns {string|null} the reason
 */
export function whyNot(state, itemId) {
  if (!Object.hasOwn(SHOP_ITEMS, itemId)) return 'unknown';
  const item = SHOP_ITEMS[itemId];
  if (item.story) return 'story';
  if (Object.hasOwn(state.items, itemId)) return 'owned';
  if (tierFor(state.reputation) < item.tier) return 'tier';
  if (state.money < item.price) return 'money';
  return null;
}

/** Whether an item can be bought now (known, not story-only, not owned, tier reached, enough coins). @param {object} state @param {string} itemId @returns {boolean} */
export function canBuy(state, itemId) {
  return whyNot(state, itemId) === null;
}

/** Adds an owned item to the state; tool items unlock their tool, studio items wait for the scrub. @param {object} state @param {string} itemId @returns {object} new state */
function addItem(state, itemId) {
  const item = SHOP_ITEMS[itemId];
  const next = { ...state, items: { ...state.items, [itemId]: { needsScrub: item.kind === 'studio' } } };
  if (item.toolId && !state.unlockedTools.includes(item.toolId)) next.unlockedTools = [...state.unlockedTools, item.toolId];
  return next;
}

/**
 * Buys an item. Does nothing (returns the same state) when canBuy is false. Studio items get needsScrub until finishScrub.
 * @param {object} state the economy state @param {string} itemId a SHOP_ITEMS id @returns {object} new state
 */
export function buy(state, itemId) {
  if (!canBuy(state, itemId)) return state;
  return addItem({ ...state, money: state.money - SHOP_ITEMS[itemId].price }, itemId);
}

/** Gives a story item (such as gloves) for free; does nothing for an unknown or already owned item. @param {object} state @param {string} itemId @returns {object} new state */
export function grantItem(state, itemId) {
  if (!Object.hasOwn(SHOP_ITEMS, itemId) || Object.hasOwn(state.items, itemId)) return state;
  return addItem(state, itemId);
}

/** Whether an owned studio item is waiting for its wipe-and-scrub job. @param {object} state @param {string} itemId @returns {boolean} */
export function needsScrub(state, itemId) {
  return Boolean(Object.hasOwn(state.items, itemId) && state.items[itemId].needsScrub);
}

/**
 * The scrub job of a studio item is done: it now shows, and gives +1 reputation (once; a second call changes nothing).
 * @param {object} state the economy state @param {string} itemId an owned studio item @returns {object} new state
 */
export function finishScrub(state, itemId) {
  if (!needsScrub(state, itemId)) return state;
  return {
    ...state,
    items: { ...state.items, [itemId]: { needsScrub: false } },
    studioLayers: state.studioLayers.includes(itemId) ? state.studioLayers : [...state.studioLayers, itemId],
    reputation: state.reputation + SCRUB_REPUTATION,
  };
}

/** Counts one clean pop (no Ow) of a bump type toward its mastery. Unknown bump types are ignored. @param {object} state @param {string} bumpType @returns {object} new state */
export function recordCleanPop(state, bumpType) {
  if (!bumpInfo(bumpType)) return state;
  return { ...state, mastery: { ...state.mastery, [bumpType]: (state.mastery[bumpType] ?? 0) + 1 } };
}

/** Clean pops counted for a bump type. @param {object} state @param {string} bumpType @returns {number} count */
export function cleanPops(state, bumpType) {
  return Object.hasOwn(state.mastery, bumpType) ? state.mastery[bumpType] : 0;
}

/** Mastery level (0 to 3) of a bump type. @param {object} state @param {string} bumpType @returns {number} level */
export function masteryLevel(state, bumpType) {
  const n = cleanPops(state, bumpType);
  let level = 0;
  MASTERY_LEVELS.forEach((l, i) => { if (n >= l.pops) level = i; });
  return level;
}

/** Factor to multiply a bump's starting hold time by (1 = no skill yet, 0.6 = the floor). @param {object} state @param {string} bumpType @returns {number} factor */
export function holdFactor(state, bumpType) {
  return MASTERY_LEVELS[masteryLevel(state, bumpType)].holdFactor;
}

/** How much lower the rough-press chance is for a bump type: 0 to 0.35, so multiply the chance by (1 - this). @param {object} state @param {string} bumpType @returns {number} reduction */
export function roughReduction(state, bumpType) {
  return MASTERY_LEVELS[masteryLevel(state, bumpType)].roughReduction;
}

/** The highest mastery level any bump type has. @param {object} state @returns {number} level */
function topMastery(state) {
  return Math.max(0, ...Object.keys(state.mastery).map((t) => masteryLevel(state, t)));
}

/** The irritation difficulty number for a career customer (1 = first). Customers past the last band keep its value. @param {number} customerNumber @returns {number} difficulty */
export function difficultyFor(customerNumber) {
  const n = Number.isFinite(customerNumber) ? customerNumber : 1;
  const band = DIFFICULTY_BANDS.find((b) => n <= b.upTo) ?? DIFFICULTY_BANDS[DIFFICULTY_BANDS.length - 1];
  return band.value;
}

/** Shop items whose milestone strip can play: owned, and for a studio item the scrub is done. @param {object} state @returns {Set<string>} strip ids */
function itemStrips(state) {
  const out = new Set();
  for (const [id, item] of Object.entries(SHOP_ITEMS)) {
    if (item.strip && Object.hasOwn(state.items, id) && !state.items[id].needsScrub) out.add(item.strip);
  }
  return out;
}

/**
 * The milestone strips that became playable going from `before` to `after`, so each fires once (it fires on the
 * change, not while the state stays the same). Ids: mtweezers, mlamp, mplant, mapron (bought, and scrubbed for studio
 * items), mstar (first 3-star customer), mmastery (a bump type first reaches level 2).
 * @param {object} before the state before @param {object} after the state after @param {string[]} [seen] strip ids already shown (never returned)
 * @returns {string[]} strip ids to play, in a fixed order
 */
export function milestoneStripsToPlay(before, after, seen = []) {
  const ids = [];
  const was = itemStrips(before);
  for (const id of itemStrips(after)) if (!was.has(id)) ids.push(id);
  if (!before.threeStarDone && after.threeStarDone) ids.push(STRIP_FIRST_THREE_STAR);
  if (topMastery(before) < MASTERY_STRIP_LEVEL && topMastery(after) >= MASTERY_STRIP_LEVEL) ids.push(STRIP_FIRST_MASTERY);
  return ids.filter((id) => !seen.includes(id));
}

/** The economy state of a new player. @returns {object} state */
export function startEconomy() {
  return economyFromSave(defaultSave(0));
}

/**
 * Reads the economy state out of a save. Old saves without the economy fields load with defaults.
 * @param {object} save any save-like object (it is normalized first) @returns {object} the economy state
 */
export function economyFromSave(save) {
  const s = normalizeSave(save);
  return {
    money: s.money, reputation: s.reputation, skipStreak: s.skipStreak, mastery: s.mastery, items: s.items,
    unlockedTools: s.unlockedTools, studioLayers: s.studioLayers, threeStarDone: s.threeStarDone,
    requestsDone: s.requestsDone, stats: { ...s.stats },
  };
}

/**
 * Puts the economy state back into a save, keeping every other save field (name, settings, chapter...). Also writes
 * outfitTier from the bought items, so that copy stays in sync (studio.js outfitTier is the source of truth).
 * @param {object} save the save to update (not changed) @param {object} state the economy state @returns {object} new save object
 */
export function economyToSave(save, state) {
  return {
    ...save,
    money: state.money, reputation: state.reputation, skipStreak: state.skipStreak, mastery: { ...state.mastery },
    items: { ...state.items }, unlockedTools: [...state.unlockedTools], studioLayers: [...state.studioLayers],
    threeStarDone: state.threeStarDone, requestsDone: state.requestsDone, stats: { ...(save.stats ?? {}), ...state.stats },
    outfitTier: outfitTier(state.items),
  };
}
