// The thinking part of the app router (T3.1c): pure helpers that turn the save into what the next screen needs and
// turn what happened on a screen back into a new save. No DOM, no storage, no clock, so Node can test a whole
// playthrough. game/app.js is the DOM glue that shows the screens and calls these.
// Every helper returns a NEW save object and never changes the one it is given.

import { currentStep, progressFromSave, progressToSave, advance, customerSpec } from './chapter-logic.js';
import { CHAPTERS, getChapter } from '../data/chapters.js';
import {
  economyFromSave, economyToSave, holdFactor, roughReduction, buildRoundResult, applyRoundResult, recordCleanPop,
  milestoneStripsToPlay, buy, canBuy, grantItem, finishScrub, needsScrub, masteryLevel,
} from './economy.js';
import {
  SHOP_ITEMS, SHOP_ITEM_IDS, SKIP_PENALTIES, STRIP_FIRST_THREE_STAR, STRIP_FIRST_MASTERY, MASTERY_STRIP_LEVEL,
} from '../data/economy-data.js';
import { pickRequest } from './requests.js';
import { scaledHold, allowedKinds } from '../pop/round-logic.js';
import { BUMP_IDS } from '../data/bumps.js';
import { defaultSave, normalizeSave, sanitizeName } from '../core/save.js';
import { factForCustomer } from '../data/facts.js';
import { STRIP as strip0 } from '../data/comics/strip-0.js';
import { STRIP as strip1 } from '../data/comics/strip-1.js';
import { STRIP as strip2 } from '../data/comics/strip-2.js';
import { STRIP as strip3 } from '../data/comics/strip-3.js';
import { STRIP as strip4 } from '../data/comics/strip-4.js';
import { STRIP as strip5 } from '../data/comics/strip-5.js';
import { STRIP as scare } from '../data/comics/strip-scare.js';
import { STRIP as books } from '../data/comics/strip-books.js';
import { STRIP as mlamp } from '../data/comics/strip-mlamp.js';
import { STRIP as mplant } from '../data/comics/strip-mplant.js';
import { STRIP as mapron } from '../data/comics/strip-mapron.js';
import { STRIP as mtweezers } from '../data/comics/strip-mtweezers.js';
import { STRIP as mstar } from '../data/comics/strip-mstar.js';
import { STRIP as mmastery } from '../data/comics/strip-mmastery.js';

/** Every strip of version 1 in the order the Comics screen lists them, with its kind (chapter, teaser or milestone). */
export const STRIP_LIST = [
  [strip0, 'chapter'], [strip1, 'chapter'], [strip2, 'chapter'], [strip3, 'chapter'], [strip4, 'chapter'],
  [strip5, 'chapter'], [scare, 'chapter'], [books, 'teaser'], [mlamp, 'milestone'], [mplant, 'milestone'],
  [mapron, 'milestone'], [mtweezers, 'milestone'], [mstar, 'milestone'], [mmastery, 'milestone'],
].map(([strip, kind]) => ({ strip, id: strip.id, titleKey: strip.title, kind }));

/** The career chapter (5): the shop opens and the milestone strips (set in her studio) start playing there. */
export const CAREER_CHAPTER = CHAPTERS.find((c) => c.kind === 'career')?.id ?? 5;

/** The strip played for the chapter 5 hygiene scare step. */
export const SCARE_STRIP = 'scare';
/** The hint shown on the intro of chapter 5 customer 4 when the player has no tweezers yet (blackheads start there). */
export const TWEEZERS_HINT = { chapter: 5, n: 4, key: 'ui.hint.tweezers' };

/**
 * Whether the shop is open: from the career chapter on (she opens her studio there and starts it with bare hands;
 * data/chapters.js lists the career shop tools on chapter 5). Coins earned before simply wait.
 * @param {object} save the save
 * @returns {boolean} true = the Shop button shows
 */
export function shopOpen(save) {
  return progressFromSave(save).chapter >= CAREER_CHAPTER;
}

/**
 * The milestone strips to play after a customer (they are set in her studio, so only in the career chapter).
 * economy.js milestoneStripsToPlay gives the ones that just became due; a skill strip earned before the career
 * (3 stars on the tutorial husband, say) is caught up the first time it is earned again in the career.
 * @param {object} save the save before the round
 * @param {object} before the economy state before @param {object} after the economy state after
 * @param {number} stars stars of this customer
 * @returns {string[]} strip ids, in order
 */
export function careerStrips(save, before, after, stars) {
  if (progressFromSave(save).chapter < CAREER_CHAPTER) return [];
  const seen = save.seenComics ?? [];
  const ids = milestoneStripsToPlay(before, after, seen);
  const top = Math.max(0, ...Object.keys(after.mastery).map((type) => masteryLevel(after, type)));
  if (stars >= 3 && !ids.includes(STRIP_FIRST_THREE_STAR) && !seen.includes(STRIP_FIRST_THREE_STAR)) ids.push(STRIP_FIRST_THREE_STAR);
  if (top >= MASTERY_STRIP_LEVEL && !ids.includes(STRIP_FIRST_MASTERY) && !seen.includes(STRIP_FIRST_MASTERY)) ids.push(STRIP_FIRST_MASTERY);
  return ids;
}

/**
 * Looks up a strip by id.
 * @param {string} id strip id (strip0, mlamp, scare ...)
 * @returns {object|null} the strip data, or null for an unknown id
 */
export function stripById(id) {
  return STRIP_LIST.find((s) => s.id === id)?.strip ?? null;
}

/**
 * The strips for the Comics screen: id, title key and kind (comics.js marks the seen ones itself).
 * @returns {{id: string, titleKey: string, kind: string}[]} the list
 */
export function comicsList() {
  return STRIP_LIST.map(({ id, titleKey, kind }) => ({ id, titleKey, kind }));
}

/**
 * A whole number from a query value, or null.
 * @param {string|null} v the value
 * @returns {number|null} the number
 */
function intOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads the testing flags from the page address (?test, ?chapter=N, ?customer=M, ?money=, ?rep=, ?seed=, ?name=, ?demo,
 * ?squeeze = the two-finger squeeze switch on, T1.7).
 * @param {string} search location.search (with or without the "?")
 * @returns {{test: boolean, demo: boolean, chapter: number|null, customer: number|null, money: number|null,
 *   rep: number|null, seed: number|null, name: string|null, squeeze: boolean}} the flags
 */
export function parseFlags(search) {
  const p = new URLSearchParams(search ?? '');
  const seed = intOrNull(p.get('seed'));
  return {
    test: p.has('test'), demo: p.has('demo'), chapter: intOrNull(p.get('chapter')), customer: intOrNull(p.get('customer')),
    money: intOrNull(p.get('money')), rep: intOrNull(p.get('rep')), seed: seed !== null && seed > 0 ? seed : null,
    name: p.has('name') ? sanitizeName(p.get('name')) : null, squeeze: p.has('squeeze'),
  };
}

/**
 * The throwaway save of a test run (?test): a fresh save moved to the asked chapter and customer, with the asked
 * coins and reputation. Customer M means "M is next" (M - 1 done, the chapter strip counts as seen); in chapter 5,
 * customer 16 is the hygiene scare, 17 the teaser, 18 the end. Without ?test the save is returned unchanged.
 * @param {object} save the save as loaded
 * @param {ReturnType<typeof parseFlags>} flags the flags
 * @param {number} [now] time in ms (for a repeatable test)
 * @returns {object} the save to play with
 */
export function applyTestFlags(save, flags, now = Date.now()) {
  if (!flags?.test) return save;
  let s = { ...defaultSave(now), ...(flags.name !== null ? { playerName: flags.name } : {}) };
  if (flags.chapter !== null) {
    const ch = getChapter(Math.max(0, flags.chapter)) ? Math.max(0, flags.chapter) : 0;
    s.chapter = ch;
    s.customersDone = 0;
    if (flags.customer !== null && flags.customer >= 1) {
      s.customersDone = flags.customer - 1;
      s.seenComics = [getChapter(ch).strip];
    }
    s = { ...s, ...progressToSave(progressFromSave(s)) };
  }
  if (flags.money !== null) s.money = Math.max(0, flags.money);
  if (flags.rep !== null) s.reputation = Math.max(0, flags.rep);
  if (flags.squeeze) s.settings = { ...s.settings, squeeze: true }; // ?squeeze: the two-finger squeeze on (T1.7)
  return normalizeSave(s, now);
}

/**
 * What comes next in the story for this save (see chapter-logic.js chapterSteps for the step shapes).
 * @param {object} save the save
 * @returns {object} the step
 */
export function nextStep(save) {
  return currentStep(progressFromSave(save));
}

/**
 * The string key of the chapter the player is in (for the menu's Continue line).
 * @param {object} save the save
 * @returns {string} string key
 */
export function chapterTitleKey(save) {
  return getChapter(progressFromSave(save).chapter)?.titleKey ?? 'chapter.0.title';
}

/**
 * Adds a strip id to the seen list (once).
 * @param {object} save the save
 * @param {string} id strip id
 * @returns {object} new save
 */
export function markSeen(save, id) {
  const seen = Array.isArray(save.seenComics) ? save.seenComics : [];
  return seen.includes(id) ? save : { ...save, seenComics: [...seen, id] };
}

/**
 * Finishes a step that is not a customer: a chapter strip (seen), a special mode, the hygiene scare (its strip is
 * seen and the gloves are given), the teaser (seen) or the end screen. Moves the progress one step on.
 * @param {object} save the save
 * @param {object} step the step that was just played (from nextStep)
 * @returns {object} new save
 */
export function finishStep(save, step) {
  // A chapter strip counts as passed once it is in seenComics (progressFromSave reads it there), so marking it seen is
  // all there is to do; this also makes it safe when the comic player already marked it seen.
  if (step.type === 'strip') {
    const seen = markSeen(save, step.stripId);
    return { ...seen, ...progressToSave(progressFromSave(seen)) }; // a strip-only chapter moves on at once
  }
  let s = save;
  if (step.type === 'teaser') s = markSeen(s, step.stripId);
  if (step.type === 'scare') {
    s = markSeen(s, SCARE_STRIP);
    let eco = economyFromSave(s);
    for (const id of step.unlocks ?? []) eco = grantItem(eco, id);
    s = economyToSave(s, eco);
  }
  return { ...s, ...progressToSave(advance(progressFromSave(save), 'done')) };
}

/**
 * The seed of a story customer's face: the same customer always gets the same face (also after a reload), unless the
 * page gave ?seed=, which is passed straight through.
 * @param {number} chapter chapter number
 * @param {number} n customer number, 1 based
 * @param {number|null} [forced] the ?seed= flag
 * @returns {number} seed, at least 1
 */
export function roundSeed(chapter, n, forced = null) {
  if (Number.isFinite(forced) && forced > 0) return Math.floor(forced);
  return 1 + ((chapter * 97 + n) * 7919) % 2000000000;
}

/**
 * Mastery per bump kind as the pop scene wants it: hold factors and rough reductions (economy.js).
 * @param {object} save the save
 * @returns {{holdFactors: Object<string, number>, roughReductions: Object<string, number>}} the two tables
 */
export function masteryTables(save) {
  const eco = economyFromSave(save);
  const holdFactors = {};
  const roughReductions = {};
  for (const id of BUMP_IDS) {
    holdFactors[id] = holdFactor(eco, id);
    roughReductions[id] = roughReduction(eco, id);
  }
  return { holdFactors, roughReductions };
}

/**
 * The studio room behind the face (0 dingy, 1 better, 2 spa, SPEC D11): follows how many studio upgrades are
 * bought AND scrubbed. First guess until T5.1 draws the real layers: 0 or 1 upgrade = 0, 2 or 3 = 1, 4 or more = 2.
 * @param {object} save the save
 * @returns {number} 0, 1 or 2
 */
export function backdropTier(save) {
  const studio = (save.studioLayers ?? []).filter((id) => SHOP_ITEMS[id]?.kind === 'studio').length;
  return studio >= 4 ? 2 : studio >= 2 ? 1 : 0;
}

/**
 * Which room the pop scene shows for a chapter (SPEC D19): the career chapter (5) is in her studio; the home
 * chapters before it (0 to 4: she pops her husband) are in their living room.
 * @param {number} chapter chapter id
 * @returns {'home'|'studio'} the room
 */
export function backdropRoom(chapter) {
  return getChapter(chapter)?.kind === 'career' ? 'studio' : 'home';
}

/**
 * Everything pop-mode.js startRound needs for a story customer (all but onFinish): the customer and their bumps
 * (chapter-logic.js customerSpec), the owned tools, mastery, the room (home or studio, backdropRoom) and studio
 * tier, decoys (career customers from number 4,
 * ECONOMY.md section 6) and the request (requests.js pickRequest; the hurry limit uses the mastery-scaled hold times,
 * estimated as bumpCount times the average hold of the allowed kinds because the real face is laid out later).
 * @param {object} save the save
 * @param {{chapter: number, n: number}} step a customer step (from nextStep)
 * @param {number|null} [forcedSeed] the ?seed= flag
 * @returns {object|null} startRound arguments, or null when the chapter has no such customer
 */
export function roundArgs(save, step, forcedSeed = null) {
  const spec = customerSpec(step.chapter, step.n);
  if (!spec) return null;
  const { holdFactors, roughReductions } = masteryTables(save);
  const career = getChapter(step.chapter)?.kind === 'career';
  const kinds = allowedKinds(spec.allowedTypes);
  const avg = kinds.reduce((sum, k) => sum + scaledHold(k, holdFactors), 0) / kinds.length;
  const holds = Array.from({ length: spec.bumpCount }, () => avg);
  const seed = roundSeed(step.chapter, step.n, forcedSeed);
  return {
    customer: spec.customer, bumpCount: spec.bumpCount, allowedTypes: [...spec.allowedTypes], difficulty: spec.difficulty,
    seed, holdFactors, roughReductions, unlockedTools: [...economyFromSave(save).unlockedTools],
    request: pickRequest(spec, holds, seed + 101, step.n), room: backdropRoom(step.chapter), tier: backdropTier(save), career: true,
    decoys: career && step.n >= 4,
  };
}

/**
 * The arguments for free play (pop-mode.js startFree): the owned tools, mastery and the studio room. No money.
 * @param {object} save the save
 * @param {number|null} [forcedSeed] the ?seed= flag
 * @returns {object} startFree arguments
 */
export function freeArgs(save, forcedSeed = null) {
  const { holdFactors, roughReductions } = masteryTables(save);
  return {
    unlockedTools: [...economyFromSave(save).unlockedTools], room: 'studio', tier: backdropTier(save), holdFactors, roughReductions,
    ...(Number.isFinite(forcedSeed) && forcedSeed > 0 ? { seed: forcedSeed } : {}),
  };
}

/**
 * The extra line on a customer's intro: the "buy tweezers" hint at chapter 5 customer 4 while no tweezers are owned.
 * @param {object} save the save
 * @param {{chapter: number, n: number}} step the customer step
 * @returns {string|null} a string key, or null
 */
export function introHintKey(save, step) {
  if (step.chapter !== TWEEZERS_HINT.chapter || step.n !== TWEEZERS_HINT.n) return null;
  return Object.hasOwn(economyFromSave(save).items, 'tweezers') ? null : TWEEZERS_HINT.key;
}

/**
 * Which line the customer says on the result screen: no Ow = happy, one or two = ok, more = ow.
 * @param {{resultKeys?: {happy?: string, ok?: string, ow?: string}}} customer the customer
 * @param {number} owCount Ows in the round
 * @returns {string|undefined} a string key
 */
export function reactionKey(customer, owCount) {
  const keys = customer?.resultKeys ?? {};
  if (!owCount) return keys.happy;
  return owCount <= 2 ? keys.ok : keys.ow;
}

/**
 * Applies the end of a customer round (pop-mode.js onFinish payload) to the save.
 * - Failed + Try again ('again'): nothing changes, retry is true (the game starts the same customer again).
 * - Failed + Next customer ('next'): the skip costs reputation (2, 3, 4, 5 in a row), the story moves on.
 * - Finished: coins (roundPayout), reputation from stars, stats, mastery for every clean pop, the story moves on.
 * Also says which milestone strips became playable (careerStrips) and what the result screen shows.
 * @param {object} save the save
 * @param {object} payload the onFinish payload (round-logic.js finishPayload)
 * @param {{chapter: number, n: number}} step the customer step that was played
 * @returns {{save: object, retry: boolean, failed: boolean, stars: number, payout: object|null, reputationChange: number,
 *   skipPenalty: number, strips: string[], factKey: string|null, reactionKey: string|undefined}} the outcome
 */
export function applyRound(save, payload, step) {
  const failed = Boolean(payload?.failed);
  if (failed && payload.failChoice !== 'next') {
    return { save, retry: true, failed, stars: 0, payout: null, reputationChange: 0, skipPenalty: 0, strips: [], factKey: null, reactionKey: undefined };
  }
  const before = economyFromSave(save);
  let after;
  let payout = null;
  let stars = 0;
  let skipPenalty = 0;
  if (failed) {
    skipPenalty = SKIP_PENALTIES[Math.min(before.skipStreak, SKIP_PENALTIES.length - 1)];
    after = applyRoundResult(before, { failed: true, choice: 'next' });
  } else {
    const result = buildRoundResult(payload.state, payload.cleanBumpTypes ?? [], payload.request ?? false);
    after = applyRoundResult(before, result);
    for (const type of payload.cleanBumpTypes ?? []) after = recordCleanPop(after, type);
    payout = result.payout;
    stars = result.stars;
  }
  const strips = careerStrips(save, before, after, stars);
  const progress = advance(progressFromSave(save), failed ? 'skip' : 'done');
  const next = { ...economyToSave(save, after), ...progressToSave(progress) };
  const spec = customerSpec(step.chapter, step.n);
  return {
    save: next, retry: false, failed, stars, payout, reputationChange: after.reputation - before.reputation, skipPenalty,
    strips, factKey: failed ? null : factForCustomer(step.chapter * 20 + step.n - 1),
    reactionKey: failed ? undefined : reactionKey(spec?.customer, payload.owCount ?? 0),
  };
}

/**
 * Buys a shop item. Studio items then wait for their scrub job (needsScrub); tools and outfits are ready at once and
 * may start their milestone strip.
 * @param {object} save the save
 * @param {string} itemId a shop item id
 * @returns {{save: object, ok: boolean, needsScrub: boolean, strips: string[]}} the outcome (ok false = not bought)
 */
export function buyItem(save, itemId) {
  const before = economyFromSave(save);
  if (!canBuy(before, itemId)) return { save, ok: false, needsScrub: false, strips: [] };
  const after = buy(before, itemId);
  return {
    save: economyToSave(save, after), ok: true, needsScrub: needsScrub(after, itemId),
    strips: milestoneStripsToPlay(before, after, save.seenComics ?? []),
  };
}

/**
 * The scrub job of a studio item is done: it shows, gives +1 reputation (once) and may start its milestone strip.
 * @param {object} save the save
 * @param {string} itemId the studio item
 * @returns {{save: object, strips: string[]}} the outcome
 */
export function scrubDone(save, itemId) {
  const before = economyFromSave(save);
  const after = finishScrub(before, itemId);
  return { save: economyToSave(save, after), strips: milestoneStripsToPlay(before, after, save.seenComics ?? []) };
}

/**
 * The first bought studio item still waiting for its scrub job (the job is required, SPEC D16), or null.
 * @param {object} save the save
 * @returns {string|null} item id
 */
export function pendingScrub(save) {
  const eco = economyFromSave(save);
  return SHOP_ITEM_IDS.find((id) => needsScrub(eco, id)) ?? null;
}

/**
 * Changes one Settings switch.
 * @param {object} save the save
 * @param {string} key sound, music, vibration, reducedMotion or squeeze (two-finger squeeze, T1.7)
 * @param {boolean} value on or off
 * @returns {object} new save
 */
export function setSetting(save, key, value) {
  if (!['sound', 'music', 'vibration', 'reducedMotion', 'squeeze'].includes(key)) return save;
  return { ...save, settings: { ...save.settings, [key]: Boolean(value) } };
}

/**
 * Which music plays (SPEC D18): 'off' when the music switch is off; 'hectic' in a competition or timed event, and in a
 * customer round while its hurry or combo request is still open; 'calm' everywhere else (menus, comics, shop, free
 * play, normal customers). Later competition modes only need to pass competition: true.
 * @param {{musicOn?: boolean, screen?: string, request?: {type: string}|null, requestOpen?: boolean,
 *   competition?: boolean}} [context] musicOn = the saved music switch; screen = 'menu', 'comic', 'shop', 'free',
 *   'round' and so on; request = the round's request; requestOpen = false once it is done or missed
 * @returns {'calm'|'hectic'|'off'} the mood
 */
export function musicMoodFor({ musicOn = true, screen = 'menu', request = null, requestOpen = true, competition = false } = {}) {
  if (!musicOn) return 'off';
  if (competition) return 'hectic';
  const busy = request?.type === 'hurry' || request?.type === 'combo';
  return screen === 'round' && busy && requestOpen ? 'hectic' : 'calm';
}

/**
 * Changes the player's name (cleaned; empty keeps the old one).
 * @param {object} save the save
 * @param {string} name the new name
 * @returns {object} new save
 */
export function setName(save, name) {
  const clean = sanitizeName(name);
  return clean ? { ...save, playerName: clean } : save;
}
