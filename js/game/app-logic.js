// The thinking part of the app router (T3.1c): pure helpers that turn the save into what the next screen needs and
// turn what happened on a screen back into a new save. No DOM, no storage, no clock, so Node can test a whole
// playthrough. game/app.js is the DOM glue that shows the screens and calls these.
// Every helper returns a NEW save object and never changes the one it is given.

import { currentStep, progressFromSave, progressToSave, advance, customerSpec, keepWorkingSpec, isFinished } from './chapter-logic.js';
import { CHAPTERS, CAREER_BANDS, getChapter, HUSBAND } from '../data/chapters.js';
import { TORCHLIGHT_ROUND } from './torchlight-logic.js';
import {
  economyFromSave, economyToSave, holdFactor, roughReduction, buildRoundResult, applyRoundResult, recordCleanPop,
  milestoneStripsToPlay, buy, canBuy, grantItem, finishScrub, needsScrub, masteryLevel, keepWorkingPayout, roundSkills,
} from './economy.js';
import {
  SHOP_ITEM_IDS, SKIP_PENALTIES, STRIP_FIRST_THREE_STAR, STRIP_FIRST_MASTERY, MASTERY_STRIP_LEVEL, KEEP_WORKING_PAY,
  MASTER_LEVEL, MASTERY_LEVELS,
} from '../data/economy-data.js';
import { pickRequest, hurryLimit } from './requests.js';
import { customerLines, hurryLineRequest, recordLines } from './customer-lines.js';
import { dailyFor, dailySpec, dailyRequest, isDateKey, addDays } from './daily-logic.js';
import { twistFor, shownTwist, describeTwist, isTwist, TWIST_IDS, CAREER_HURRY } from '../data/twists.js';
import { bossFor, bossSpec, describeBoss, isBoss, BOSS_IDS, BOSSES } from '../data/bosses.js';
import { STUDIO_LAYERS, studioTier, studioLayersShown, heroOutfit, OUTFIT_TIERS, OUTFIT_ITEMS } from './studio.js';
import { hurryHolds } from '../pop/round-logic.js';
import { BUMP_IDS } from '../data/bumps.js';
import { TOOL_IDS, GLOVES } from '../data/tools.js';
import { defaultSave, normalizeSave, sanitizeName, clampVolume } from '../core/save.js';
import { factForCustomer } from '../data/facts.js';
import { pinVisit, pinIntroKey } from './pin-jar.js';
import { serviceAskKey } from './service-asks.js';
import { GUIDE_KINDS } from '../screens/guide-logic.js';
import { demoAlbum } from '../screens/album-logic.js';
import { STRIP as strip0, STRIP_BAN as strip0b } from '../data/comics/strip-0.js';
import { STRIP as strip1 } from '../data/comics/strip-1.js';
import { STRIP as strip2 } from '../data/comics/strip-2.js';
import { STRIP as strip3 } from '../data/comics/strip-3.js';
import { STRIP as strip4, STRIP_IDEA as strip4b } from '../data/comics/strip-4.js';
import { STRIP as plan } from '../data/comics/strip-plan.js';
import { STRIP as strip5 } from '../data/comics/strip-5.js';
import { STRIP as scare } from '../data/comics/strip-scare.js';
import { STRIP as books } from '../data/comics/strip-books.js';
import { STRIP as mlamp } from '../data/comics/strip-mlamp.js';
import { STRIP as mplant } from '../data/comics/strip-mplant.js';
import { STRIP as mapron } from '../data/comics/strip-mapron.js';
import { STRIP as mtweezers } from '../data/comics/strip-mtweezers.js';
import { STRIP as mstar } from '../data/comics/strip-mstar.js';
import { STRIP as mmastery } from '../data/comics/strip-mmastery.js';
import { STRIP as mleak } from '../data/comics/strip-mleak.js';

/** Every strip of version 1 in the order the Comics screen lists them, with its kind (chapter, teaser or milestone). */
export const STRIP_LIST = [
  [strip0, 'chapter'], [strip0b, 'chapter'], [strip1, 'chapter'], [strip2, 'chapter'], [strip3, 'chapter'], [strip4, 'chapter'],
  [strip4b, 'chapter'], [plan, 'chapter'],
  [strip5, 'chapter'], [scare, 'chapter'], [books, 'teaser'], [mlamp, 'milestone'], [mplant, 'milestone'],
  [mapron, 'milestone'], [mtweezers, 'milestone'], [mstar, 'milestone'], [mmastery, 'milestone'], [mleak, 'milestone'],
].map(([strip, kind]) => ({ strip, id: strip.id, titleKey: strip.title, kind }));

/** The career chapter (5): the shop opens and the milestone strips (set in her studio) start playing there. */
export const CAREER_CHAPTER = CHAPTERS.find((c) => c.kind === 'career')?.id ?? 5;

/** Keep working's pay as a whole percent (60), for the line on its intro and result screens (T5.4). */
export const KEEP_WORKING_PERCENT = Math.round(KEEP_WORKING_PAY * 100);

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
 * ?squeeze = the two-finger squeeze switch on, T1.7; ?layers=lamp,plant or ?layers=all = these studio upgrades
 * owned and scrubbed, T5.1a, so the studio tiers and layers can be looked at; ?outfit=everyday|apron|scrubs = her
 * outfit tier, T5.2: the outfit items up to that tier owned, so the studio view and the comics show it; ?seen=all =
 * every Field guide card open, T6.5; ?twist=fidgety|ticklish|sensitive|hurry = every customer gets that twist,
 * T8.3, used only with ?test; ?boss=hairday|nosestrip|golden|horn = every customer is that boss or event, T8.4, only
 * with ?test, and the tools it needs are owned; ?daily=YYYY-MM-DD = the daily challenge's date and ?dailystreak=N = a
 * streak of N days up to the day before it, T8.5, used only with ?test; ?mastery=demo = clean pop counts just short
 * of level ups and Masters, D34; ?mastery=skilled = whiteheads one clean pop from the first Skilled, R8i).
 * @param {string} search location.search (with or without the "?")
 * @returns {{test: boolean, demo: boolean, chapter: number|null, customer: number|null, money: number|null,
 *   rep: number|null, seed: number|null, name: string|null, squeeze: boolean, layers: string[]|null,
 *   outfit: string|null, seenAll: boolean, album: boolean, twist: string|null, boss: string|null}} the flags (album = ?album=demo, T8.2; twist = ?twist=, T8.3;
 *   boss = ?boss=, T8.4)
 */
export function parseFlags(search) {
  const p = new URLSearchParams(search ?? '');
  const seed = intOrNull(p.get('seed'));
  const lay = p.get('layers');
  return {
    test: p.has('test'), demo: p.has('demo'), chapter: intOrNull(p.get('chapter')), customer: intOrNull(p.get('customer')),
    money: intOrNull(p.get('money')), rep: intOrNull(p.get('rep')), seed: seed !== null && seed > 0 ? seed : null,
    name: p.has('name') ? sanitizeName(p.get('name')) : null, squeeze: p.has('squeeze'),
    layers: lay === null ? null : lay === 'all' ? [...STUDIO_LAYERS] : studioLayersShown(lay.split(',')),
    outfit: OUTFIT_TIERS.includes(p.get('outfit')) ? p.get('outfit') : null,
    seenAll: p.get('seen') === 'all', // ?seen=all: every Field guide kind met (T6.5)
    album: p.get('album') === 'demo', // ?album=demo: 12 faces in the Face album (T8.2)
    gloves: p.has('gloves'), // ?gloves: the gloves owned, as after the hygiene scare (SPEC D32e)
    // ?mastery=demo: clean pop counts just short of level ups and Masters (D34); ?mastery=skilled: one short of the first Skilled
    mastery: ['demo', 'skilled'].includes(p.get('mastery')) ? p.get('mastery') : null,
    twist: isTwist(p.get('twist')) ? p.get('twist') : null, // ?twist=: force a customer twist (T8.3)
    boss: isBoss(p.get('boss')) ? p.get('boss') : null, // ?boss=: force a boss or event customer (T8.4)
    daily: isDateKey(p.get('daily')) ? p.get('daily') : null, // ?daily=YYYY-MM-DD: the daily challenge's date (T8.5)
    dailyStreak: intOrNull(p.get('dailystreak')), // ?dailystreak=N: a streak of N up to the day before ?daily= (T8.5)
  };
}

/**
 * The clean pop counts of ?mastery=demo (D34, data/economy-data.js MASTERY_STEPS): whitehead and hair one clean pop
 * from Master (a diploma), red one from Expert, gold already Master, the rest at different levels on the way.
 */
export const DEMO_MASTERY = { whitehead: 109, red: 69, blackhead: 12, big: 3, gold: 24, horn: 10, hair: 23 };

/**
 * The clean pop counts of ?mastery=skilled: whiteheads one clean pop from Skilled (level 3), every other kind lower, so
 * the next customer plays the Tool mastery strip (R8i).
 */
export const SKILLED_MASTERY = { whitehead: 39, red: 19, blackhead: 4, big: 2, hair: 1 };

/**
 * The outfit shop items a test run gets for ?outfit= (T5.2): every outfit item up to that tier (scrubs = apron and
 * scrubs, as if bought in order), none for everyday.
 * @param {string} outfit 'everyday', 'apron' or 'scrubs'
 * @returns {string[]} shop item ids
 */
export function outfitTestItems(outfit) {
  const tier = OUTFIT_TIERS.indexOf(outfit) + 1;
  return OUTFIT_ITEMS.filter(([, t]) => t <= tier).map(([id]) => id).reverse();
}

/**
 * Which outfit the comic player dresses her in for a strip (T5.2): strips marked `dressed: true` are set after she
 * may own an outfit (the hygiene scare, the teaser and the milestone strips; not opening day, strip 5, which is
 * always before the shop: B36a), so there she
 * wears her best owned outfit (studio.js heroOutfit); the other strips (earlier times, and the apron strip with its
 * own look) keep what they draw. Only heroine layers without their own `outfit` are dressed (comic-art.js dressHeroine).
 * @param {object|null} strip the strip data
 * @param {object} save the save
 * @returns {string|null} an outfit name, or null = draw the strip as it is
 */
export function comicOutfit(strip, save) {
  if (!strip?.dressed) return null;
  const outfit = heroOutfit(save);
  return outfit === 'everyday' ? null : outfit;
}

/**
 * What the comic player draws of her studio and hands for a strip (SPEC D32e and D32j, comic-art.js studioKit):
 * - gloves: in `dressed` strips she wears her blue gloves once she owns them (after the hygiene scare), except in
 *   strips marked `bareHands` (opening day and the scare itself: their words are about bare hands); strips marked
 *   `gloves: true` follow her gloves too without being dressed (the apron strip keeps its own outfit, story audit);
 * - livingPlant: in strips marked `studio: 'owned'` (set in her studio after the shop opens) the plant follows the
 *   shop: the sad little plant on the sill until the living plant is bought and scrubbed.
 * - leakFixed: once "Fix the leak" is bought and scrubbed (story audit R2), every strip drops the drip and the leak
 *   stain and the bucket under it, except the strips whose story IS the leak (LEAK_STORY_STRIPS).
 * - ringLight, pinkChair: in `studio: 'owned'` strips the ring light and the pink chair follow the shop too (owner's
 *   pick Q14 c, 2026-10-29); the paint and the new sign do not. Nothing bought = the strip exactly as written.
 * @param {object|null} strip the strip data
 * @param {object} save the save
 * @returns {{gloves: boolean, livingPlant?: boolean, leakFixed?: boolean, ringLight?: boolean, pinkChair?: boolean}|null}
 *   what to draw, or null = draw the strip as it is
 */
export function comicStudio(strip, save) {
  if (!strip) return null;
  const gloves = Boolean((strip.dressed || strip.gloves) && !strip.bareHands && Object.hasOwn(economyFromSave(save).items, 'gloves'));
  const layers = backdropLayers(save);
  const leak = !LEAK_STORY_STRIPS.includes(strip.id) && layers.includes('leakFix') ? { leakFixed: true } : {};
  if (strip.studio !== 'owned') return gloves || leak.leakFixed ? { gloves, ...leak } : null;
  return { gloves, livingPlant: layers.includes('plant'), ringLight: layers.includes('lamp'), pinkChair: layers.includes('chair'), ...leak };
}

/** Strips that always draw the leak, even after "Fix the leak": opening day (strip 5) and the fix itself (mleak). */
export const LEAK_STORY_STRIPS = ['strip5', 'mleak'];

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
    // The ending is next (chapter 5, customer 18): count it as reached, so the menu already shows Keep working (T5.4).
    if (nextStep(s).type === 'end') s.endingSeen = true;
  }
  if (flags.money !== null) s.money = Math.max(0, flags.money);
  if (flags.rep !== null) s.reputation = Math.max(0, flags.rep);
  if (flags.squeeze) s.settings = { ...s.settings, squeeze: true }; // ?squeeze: the two-finger squeeze on (T1.7)
  if (flags.layers) { // ?layers=: these studio upgrades bought and scrubbed (T5.1a), so the shop does not offer them again
    s.studioLayers = [...flags.layers];
    s.items = { ...s.items, ...Object.fromEntries(flags.layers.map((id) => [id, { needsScrub: false }])) };
  }
  if (flags.outfit) { // ?outfit=: her outfit items up to that tier owned (T5.2), outfitTier copied along
    s.items = { ...s.items, ...Object.fromEntries(outfitTestItems(flags.outfit).map((id) => [id, { needsScrub: false }])) };
    s.outfitTier = OUTFIT_TIERS.indexOf(flags.outfit) + 1;
  }
  if (flags.seenAll) { s.seenKinds = [...GUIDE_KINDS]; s.seenTwists = [...TWIST_IDS]; } // ?seen=all: every Field guide card open (T6.5, T8.3)
  if (flags.seenAll) s.seenBosses = [...BOSS_IDS]; // ... and the Events cards (T8.4)
  if (flags.boss) { // ?boss=: the tools that event needs are owned (T8.4), so it is not swapped for Golden Day
    let eco = economyFromSave(s);
    for (const tool of BOSSES[flags.boss].needs) eco = grantItem(eco, tool);
    s = economyToSave(s, eco);
  }
  if (flags.gloves) s = economyToSave(s, grantItem(economyFromSave(s), 'gloves')); // ?gloves: she owns the gloves (SPEC D32e)
  if (flags.album) s.albumFaces = demoAlbum(now); // ?album=demo: a Face album with 12 faces (T8.2)
  if (flags.mastery) s.mastery = { ...(flags.mastery === 'skilled' ? SKILLED_MASTERY : DEMO_MASTERY) }; // ?mastery= (D34, R8i)
  if (flags.daily && flags.dailyStreak > 0) { // ?daily=&dailystreak=N: N days in a row done, the last one yesterday (T8.5)
    const yesterday = addDays(flags.daily, -1);
    s = { ...s, dailyStreak: flags.dailyStreak, dailyBest: flags.dailyStreak, dailyLastDone: yesterday, dailyLastPlayed: yesterday };
  }
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
  const pending = Array.isArray(save.pendingStrips) ? save.pendingStrips : [];
  const next = seen.includes(id) ? save : { ...save, seenComics: [...seen, id] };
  return pending.includes(id) ? { ...next, pendingStrips: pending.filter((p) => p !== id) } : next; // a played strip is no longer waiting
}

/**
 * The milestone strips still waiting to be played (B4): earned by the last customer, not seen yet. Played on Continue
 * after the result screen, or on the next Continue when the app was closed on the result screen.
 * @param {object} save the save
 * @returns {string[]} strip ids, in order
 */
export function pendingStrips(save) {
  const seen = save.seenComics ?? [];
  return (Array.isArray(save.pendingStrips) ? save.pendingStrips : []).filter((id) => !seen.includes(id) && stripById(id));
}

/**
 * Empties the waiting strips list (call once they have been played, so they never play twice).
 * @param {object} save the save
 * @returns {object} new save
 */
export function clearPendingStrips(save) {
  return Array.isArray(save.pendingStrips) && save.pendingStrips.length ? { ...save, pendingStrips: [] } : save;
}

/**
 * Finishes a step that is not a customer: a chapter strip (seen), a special mode, the bridge strip (seen), the hygiene
 * scare (its strip is seen and the gloves are given), the teaser (seen) or the end screen. Moves the progress one step on.
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
  if (step.type === 'teaser' || step.type === 'bridge') s = markSeen(s, step.stripId);
  if (step.type === 'scare') {
    s = markSeen(s, SCARE_STRIP);
    let eco = economyFromSave(s);
    for (const id of step.unlocks ?? []) eco = grantItem(eco, id);
    s = economyToSave(s, eco);
  }
  if (step.type === 'end') s = { ...s, endingSeen: true }; // the ending was shown: Keep working opens (T5.4)
  return { ...s, ...progressToSave(advance(progressFromSave(save), 'done')) };
}

/**
 * Whether the menu shows Keep working (T5.4, SPEC D23): once the "To be continued" ending has been reached. A save
 * from before this field that already finished the story counts too.
 * @param {object} save the save
 * @returns {boolean} true = the Keep working button shows
 */
export function keepWorkingOpen(save) {
  return save?.endingSeen === true || isFinished(progressFromSave(save));
}

/**
 * The next Keep working customer as a customer step: chapter 5 (her studio, the career rules), numbered by Keep
 * working's own count (save.keepWorkingDone + 1), marked keepWorking so roundArgs and applyRound use its rules.
 * @param {object} save the save
 * @returns {{type: 'customer', keepWorking: true, n: number, chapter: number}} the step
 */
export function keepWorkingStep(save) {
  const done = Number.isInteger(save?.keepWorkingDone) && save.keepWorkingDone >= 0 ? save.keepWorkingDone : 0;
  return { type: 'customer', keepWorking: true, n: done + 1, chapter: CAREER_CHAPTER };
}

/**
 * The face seed of Keep working customer k: its own seed every time (so a reload shows the same face, and the next
 * customer always has another one), unless the page gave ?seed=.
 * @param {number} k Keep working customer number, 1 based
 * @param {number|null} [forced] the ?seed= flag
 * @returns {number} seed, at least 1
 */
export function keepWorkingSeed(k, forced = null) {
  if (Number.isFinite(forced) && forced > 0) return Math.floor(forced);
  return 1 + ((7_000_000 + k) * 7919) % 2000000000;
}

/**
 * The customer spec of a customer step: Keep working's random customer, or the story's customer.
 * @param {{chapter: number, n: number, keepWorking?: boolean}} step a customer step
 * @returns {object|null} the spec (chapter-logic.js customerSpec shape)
 */
function stepSpec(step) {
  if (step?.daily) return dailySpec(step.daily); // the daily challenge's customer (T8.5)
  return step?.keepWorking ? keepWorkingSpec(step.n) : customerSpec(step.chapter, step.n);
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
 * bought AND scrubbed: 0 or 1 upgrade = 0, 2 or 3 = 1, 4 or more = 2 (game/studio.js studioTier).
 * @param {object} save the save
 * @returns {number} 0, 1 or 2
 */
export function backdropTier(save) {
  return studioTier(save.studioLayers);
}

/**
 * The studio upgrades to draw in the room (bought AND scrubbed), in draw order (game/studio.js studioLayersShown).
 * @param {object} save the save
 * @returns {string[]} layer ids
 */
export function backdropLayers(save) {
  return studioLayersShown(save.studioLayers);
}

/**
 * What the studio view screen shows (T5.1c): the studio tier, the owned upgrades in draw order, her outfit and the
 * Master diplomas on the wall of fame (R8j).
 * @param {object} save the save
 * @returns {{tier: number, layers: string[], outfit: string, masters: string[], pins: number}} the studio view's data (pins =
 *   the pins in the jar on the shelf, game/pin-jar.js)
 */
export function studioViewArgs(save) {
  return { tier: backdropTier(save), layers: backdropLayers(save), outfit: heroOutfit(save), masters: masterKinds(save), pins: save.pinJar ?? 0 };
}

/**
 * The kinds of bump that are Masters (D34), in data/bumps.js order: their diplomas hang on the studio's wall of fame
 * (R8j). Worked out from the clean pop counts, so an old save gets its frames at once.
 * @param {object} save the save
 * @returns {string[]} bump ids
 */
export function masterKinds(save) {
  const state = economyFromSave(save);
  return BUMP_IDS.filter((type) => masteryLevel(state, type) >= MASTER_LEVEL);
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
 * ECONOMY.md section 6) and the request (requests.js pickRequest; the hurry limit uses the hold times of the real
 * bumps of the face with her best owned tools at her mastery, round-logic.js hurryHolds), the customer's name key
 * (the scene header, B5) and
 * what "Next customer" would cost now (skipCost, B3). A Keep working step (T5.4) takes its customer from
 * chapter-logic.js keepWorkingSpec and its face seed from keepWorkingSeed, always has decoys, and its combo requests
 * are as long as at the career's end.
 * Twists (T8.3, data/twists.js twistFor): one extra per customer, a twist OR a request. A customer with a twist asks
 * for no request; the others may roll a request as before, and a hurry request is shown as the "in a hurry" twist.
 * twist = the twist shown (with 'hurry'), twistHintKey = its tip (describeTwist).
 * @param {object} save the save
 * @param {{chapter: number, n: number}} step a customer step (from nextStep)
 * @param {number|null} [forcedSeed] the ?seed= flag
 * @param {string|null} [forcedTwist] the ?twist= test flag (any twist id; 'hurry' makes a hurry request)
 * @param {string|null} [forcedBoss] the ?boss= test flag (T8.4: any event id, used on every customer)
 * Boss and event customers (T8.4, data/bosses.js bossFor): chapter 5 customers 5, 9 and 13 and every 8th Keep working
 * customer. Same person, the event's bumps and accessory (bossSpec), no twist and no request; boss = the face rules
 * and the event id (applyRound pays its bonus when the step carries `boss`), bossNameKey = its name for the chip,
 * twistHintKey = the event's tip.
 * Lines (R6-lines, SPEC D28, game/customer-lines.js): `lines` = this visit's line keys (also copied into customer's
 * introKey, deadlineKey = the second line, and resultKeys); a customer who may ask for a request can instead be the
 * "Hurry, hurry, hurry!" customer (hurryLineRequest: a hurry request with line: true and an easy clock). step.hurryTier
 * picks a harder tier for a later game (data/customer-lines.js HURRY_LINE_TIERS); v1 never sets it.
 * Pin jar (owner 2026-10-28, game/pin-jar.js): pin = this customer brought a pin from home (their intro says so);
 * pins = how many pins are in the jar now (drawn on the studio shelf). Service asks (SPEC D42, game/service-asks.js): a
 * few customers' second line asks if the studio does facials or exfoliating yet.
 * @returns {object|null} startRound arguments, or null when the chapter has no such customer
 */
export function roundArgs(save, step, forcedSeed = null, forcedTwist = null, forcedBoss = null) {
  const kw = Boolean(step.keepWorking); // Keep working (T5.4): random customer, career rules, its own seeds
  const plain = stepSpec(step);
  if (!plain) return null;
  const { holdFactors, roughReductions } = masteryTables(save);
  const career = getChapter(step.chapter)?.kind === 'career';
  const unlockedTools = [...economyFromSave(save).unlockedTools];
  // the daily challenge (T8.5): its own seed, twist and goal ("No Ows" only with a warm cloth, D27c)
  const daily = step.daily ? dailyFor(step.daily, unlockedTools) : null;
  const seed = daily ? daily.seed : kw ? keepWorkingSeed(step.n, forcedSeed) : roundSeed(step.chapter, step.n, forcedSeed);
  const bossId = daily ? null : isBoss(forcedBoss) ? forcedBoss : bossFor({ chapter: step.chapter, n: step.n, keepWorking: kw, ownedTools: unlockedTools });
  const spec = bossId ? bossSpec(plain, bossId, seed) : plain; // a boss or event customer (T8.4)
  const decoys = career && (kw || step.n >= 4);
  const requestNumber = kw ? CAREER_BANDS[CAREER_BANDS.length - 1].to : step.n; // Keep working combos are as long as at the career's end
  const holds = hurryHolds({
    customer: spec.customer, bumpCount: spec.bumpCount, allowedTypes: spec.allowedTypes, unlockedTools, decoys, seed, holdFactors,
    boss: spec.boss ?? null,
  });
  // T8.4: the career's hurry customer (CAREER_HURRY, it moved from the boss slot 5) always has the hurry request.
  const careerHurry = !kw && !daily && step.chapter === CAREER_HURRY.chapter && step.n === CAREER_HURRY.n;
  const own = daily ? daily.twist : bossId ? null : isTwist(forcedTwist) ? forcedTwist // a boss has no twist (T8.4)
    : careerHurry ? 'hurry' : twistFor({ chapter: step.chapter, n: step.n, keepWorking: kw, regularId: spec.customer?.regular ? spec.customer.id : null });
  let request = null; // one extra per customer (T8.3): a twist customer has no request
  if (daily) request = dailyRequest(daily.goal, holds); // a daily clock day: the hurry clock with the daily limit (T8.5)
  else if (own === 'hurry') request = { type: 'hurry', timeLimit: hurryLimit(holds) };
  else if (!own && !bossId) { // a boss has no request (T8.4)
    // R6-lines (SPEC D28): about 1 in 20 of these says "Hurry, hurry, hurry!" and gets an easy clock; step.hurryTier
    // is the hook for a harder later game (data/customer-lines.js HURRY_LINE_TIERS).
    request = hurryLineRequest({ allowed: Boolean(spec.requestAllowed), holds, seed, tier: step.hurryTier })
      ?? pickRequest(spec, holds, seed + 101, requestNumber);
  }
  const twist = shownTwist(own, request);
  const boss = describeBoss(bossId);
  // R6-lines: this visit's lines (first visit or return, a clock joke only with a real clock, never the same twice).
  const lines = customerLines(save, spec.customer, {
    seed, step, timed: request?.type === 'hurry', hurryLine: request?.line ? { tier: request.tier, missPenalty: request.missPenalty } : null,
  });
  // The pin jar (owner 2026-10-28): now and then a customer brings a pin from home and says so first (game/pin-jar.js).
  const pin = pinVisit(step, { boss: bossId, regular: Boolean(spec.customer?.regular) });
  const introKey = pin ? pinIntroKey(save.pinJar ?? 0) : lines.introKey;
  // Now and then a customer asks if the studio does facials yet (a hint of later services, game/service-asks.js).
  const ask = serviceAskKey(step, { boss: bossId, regular: Boolean(spec.customer?.regular), pin, timed: request?.type === 'hurry' });
  const customer = { ...spec.customer, introKey, deadlineKey: ask ?? lines.secondKey, resultKeys: { ...lines.resultKeys } };
  return {
    // Gloves (SPEC D32e): once she owns them her fingertips are blue and the customer relaxes a bit (data/tools.js GLOVES).
    customer, lines, bumpCount: spec.bumpCount, allowedTypes: [...spec.allowedTypes],
    difficulty: unlockedTools.includes('gloves') ? spec.difficulty * GLOVES.calm : spec.difficulty,
    gloves: unlockedTools.includes('gloves'),
    seed, holdFactors, roughReductions, unlockedTools,
    request, room: backdropRoom(step.chapter), tier: backdropTier(save),
    layers: backdropLayers(save), pins: save.pinJar ?? 0, pin, career: true,
    decoys, customerNameKey: spec.customer?.nameKey ?? null, skipCost: skipPenaltyNow(save),
    // A story round before the studio opens (Hubby, chapters 0 to 4) has no "Next customer" after a storm-off, only
    // Try again: skipping him would jump to the ban strip without a pop (owner 2026-10-29, R8 R5).
    retryOnly: !paysMoney(step),
    twist, twistHintKey: boss ? boss.hintKey : describeTwist(twist, { ownedTools: unlockedTools })?.hintKey ?? null,
    boss: spec.boss ?? null, bossNameKey: boss?.nameKey ?? null, // T8.4
    // T8.5: the daily challenge's date and goal (a clock goal carries its limit, the same as the hurry request's).
    daily: daily ? { date: daily.date, goal: request ? { ...daily.goal, timeLimit: request.timeLimit } : { ...daily.goal } } : null,
  };
}

/**
 * Whether a finished round pays coins and reputation: only from the studio on (the career chapter, Keep working and
 * the daily challenge). Before the studio opens (chapters 0 to 4, SPEC D32h) she pops her husband for love, not money.
 * @param {{chapter?: number, keepWorking?: boolean, daily?: object}} step the customer step
 * @returns {boolean} true = the round pays
 */
export function paysMoney(step) {
  return Boolean(step?.keepWorking || step?.daily) || getChapter(step?.chapter)?.kind === 'career';
}

/**
 * What "Next customer" after a fail would cost in reputation right now (the ladder 2, 3, 4, 5 by skips in a row,
 * economy-data.js SKIP_PENALTIES; the same number applyRound takes off). Never more than the reputation she has,
 * because reputation stops at 0 (B31a): with 1 point the choice says -1, with none it shows no cost.
 * @param {object} save the save
 * @returns {number} reputation points
 */
export function skipPenaltyNow(save) {
  const state = economyFromSave(save);
  const ladder = SKIP_PENALTIES[Math.min(state.skipStreak, SKIP_PENALTIES.length - 1)];
  return Math.max(0, Math.min(ladder, Math.floor(state.reputation)));
}

/**
 * The arguments for free play (pop-mode.js startFree): EVERY tool (free play is the try-everything mode, SPEC D29; it
 * changes no money or stats, so nothing is given away), mastery and the studio room. No money.
 * @param {object} save the save
 * @param {number|null} [forcedSeed] the ?seed= flag
 * @returns {object} startFree arguments
 */
export function freeArgs(save, forcedSeed = null) {
  const { holdFactors, roughReductions } = masteryTables(save);
  return {
    unlockedTools: [...TOOL_IDS], room: 'studio', tier: backdropTier(save),
    layers: backdropLayers(save), pins: save.pinJar ?? 0, holdFactors, roughReductions, // pins: the jar on the shelf
    ...(Number.isFinite(forcedSeed) && forcedSeed > 0 ? { seed: forcedSeed } : {}),
  };
}

/**
 * The arguments for the torchlight special mode's round (T4.5, chapter 1; pop-mode.js startRound, all but onFinish,
 * onPop and onOw): the husband asleep (mood 'sleep') in the living room, his 3 whitehead bumps, the owned tools and
 * mastery, no request, no decoys, and a round that cannot storm off (career false: the wake-up meter is the danger).
 * @param {object} save the save
 * @param {number} chapter the chapter of the special step (1)
 * @param {number|null} [forcedSeed] the ?seed= flag
 * @returns {object} startRound arguments
 */
export function torchlightArgs(save, chapter, forcedSeed = null) {
  const { holdFactors, roughReductions } = masteryTables(save);
  return {
    customer: HUSBAND, bumpCount: TORCHLIGHT_ROUND.bumpCount, allowedTypes: [...TORCHLIGHT_ROUND.allowedTypes],
    difficulty: TORCHLIGHT_ROUND.difficulty, seed: roundSeed(chapter, 1, forcedSeed), holdFactors, roughReductions,
    unlockedTools: [...economyFromSave(save).unlockedTools], request: null, room: 'home', tier: 0, career: false,
    decoys: false, mood: 'sleep',
  };
}

/**
 * The extra line on a customer's intro: the "buy tweezers" hint at chapter 5 customer 4 while no tweezers are owned.
 * @param {object} save the save
 * @param {{chapter: number, n: number}} step the customer step
 * @returns {string|null} a string key, or null
 */
export function introHintKey(save, step) {
  if (step.keepWorking) return null; // Keep working customer 4 is not the career's customer 4
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

/** The result lines of a customer whose nose dots were left on (the nose strip never peeled; owner 2026-10-28). */
export const NOSE_LEFT_KEYS = ['customer.noseLeft.1', 'customer.noseLeft.2', 'customer.noseLeft.3'];

/**
 * Which nose line a customer says when the nose dots were left on (a different one from customer to customer).
 * @param {{n?: number}|null|undefined} step the customer step @returns {string} a string key
 */
export function noseLeftKey(step) {
  const n = Number.isFinite(step?.n) ? Math.abs(Math.floor(step.n)) : 0;
  return NOSE_LEFT_KEYS[n % NOSE_LEFT_KEYS.length];
}

/**
 * Applies the end of a customer round (pop-mode.js onFinish payload) to the save.
 * - Failed + Try again ('again'): nothing changes, retry is true (the game starts the same customer again).
 * - Failed + escape ('escape', the husband in armor, chapter 2): nothing is paid or lost, no retry, the story moves on.
 * - Failed + Next customer ('next'): the skip costs reputation (2, 3, 4, 5 in a row), the story moves on.
 * - Finished: coins (roundPayout), reputation from stars, stats, mastery for every clean pop, the story moves on.
 * Also says which milestone strips became playable (careerStrips) and what the result screen shows.
 * A Keep working step (keepWorking: true, T5.4) pays KEEP_WORKING_PAY of every coin line (economy.js
 * keepWorkingPayout) and counts keepWorkingDone up instead of moving the story; stars, mastery and the skip cost work
 * as in the career.
 * A boss or event step (step.boss = its id, T8.4; app.js adds it from roundArgs) also pays the event bonus
 * (economy.js roundPayout eventBonus, cut like every line in Keep working); skipping it costs the usual reputation.
 * @param {object} save the save
 * @param {object} payload the onFinish payload (round-logic.js finishPayload)
 * step.lines (R6-lines: roundArgs lines, app.js passes them) = the visit's result lines and its line memory entry
 * (game/customer-lines.js recordLines; Try again remembers nothing, so the retry says the same lines).
 * @param {{chapter: number, n: number, boss?: string, lines?: object}} step the customer step that was played
 * @returns {{save: object, retry: boolean, failed: boolean, stars: number, payout: object|null, reputationChange: number,
 *   skipPenalty: number, strips: string[], factKey: string|null, reactionKey: string|undefined, boss?: string|null,
 *   skills?: ReturnType<typeof roundSkills>|null, pinJar?: number|null}}
 *   the outcome (boss = the finished boss's id, for its stamp; skills = level ups, new Masters and the closest next
 *   level, economy.js roundSkills, D34; null when failed; pinJar = the jar count after a pin visit (step.pin), else null:
 *   the pin goes into the jar and the fact card is the one about pins)
 */
export function applyRound(save, payload, step) {
  const failed = Boolean(payload?.failed);
  const kw = Boolean(step?.keepWorking);
  if (failed && payload.failChoice === 'escape') {
    // The husband in armor gets away unharmed (owner 2026-10-27): no pay, no stars, no reputation change, no skip cost and
    // no retry; the story simply moves on.
    const moved = progressToSave(advance(progressFromSave(save), 'done'));
    return { save: { ...save, ...moved }, retry: false, failed, escaped: true, stars: 0, payout: null, reputationChange: 0, skipPenalty: 0, strips: [], factKey: null, reactionKey: undefined };
  }
  if (failed && payload.failChoice !== 'next') {
    return { save, retry: true, failed, stars: 0, payout: null, reputationChange: 0, skipPenalty: 0, strips: [], factKey: null, reactionKey: undefined };
  }
  const before = economyFromSave(save);
  let after;
  let payout = null;
  let stars = 0;
  let skipPenalty = 0;
  if (failed) {
    skipPenalty = skipPenaltyNow(save);
    after = applyRoundResult(before, { failed: true, choice: 'next' });
  } else {
    // patch tips, the strip bonus, and nose dots left on (at most 2 stars, owner 2026-10-28)
    const extras = { patches: payload.patches ?? 0, stripPeeled: payload.stripPeeled === true, stripLeft: payload.stripLeft === true };
    if (isBoss(step?.boss)) extras.boss = step.boss; // a boss or event customer's bonus (T8.4)
    let result = buildRoundResult(payload.state, payload.cleanBumpTypes ?? [], payload.request ?? false, 'again', payload.cleanBumpTools ?? null, extras);
    if (kw) { // Keep working pays KEEP_WORKING_PAY of every coin line (T5.4)
      const cut = keepWorkingPayout(result.payout, (payload.cleanBumpTypes ?? []).length);
      result = { ...result, payout: cut, total: cut.total };
    }
    after = applyRoundResult(before, result);
    for (const type of payload.cleanBumpTypes ?? []) after = recordCleanPop(after, type);
    payout = result.payout;
    stars = result.stars;
    if (!paysMoney(step)) { // SPEC D32h: no coins, tip or reputation (and no first 3-star day) before the studio opens
      after = { ...after, money: before.money, reputation: before.reputation, threeStarDone: before.threeStarDone };
      payout = null;
    }
    // A hurry-line customer whose clock ran out (R6-lines): the tier's missPenalty in reputation (0 in v1: only the
    // request bonus is lost, as with any missed request).
    const miss = Number(step?.lines?.hurryLine?.missPenalty) || 0;
    if (miss > 0 && payload.request !== 'hurry') after = { ...after, reputation: Math.max(0, after.reputation - miss) };
  }
  const strips = careerStrips(save, before, after, stars);
  // Keep working never moves the story: it only counts its own customers (a skip counts too, so the next one is new).
  // A daily challenge customer (T8.5) counts nothing here: daily-logic.js settleDaily keeps its own fields.
  const moved = step?.daily ? {} : kw ? { keepWorkingDone: (save.keepWorkingDone ?? 0) + 1 } : progressToSave(advance(progressFromSave(save), failed ? 'skip' : 'done'));
  const spec = stepSpec(step);
  // R6-lines: the visit's own lines (step.lines = roundArgs lines, app.js passes them) or the customer's plain keys.
  const said = failed ? undefined : reactionKey(step?.lines?.resultKeys ? { resultKeys: step.lines.resultKeys } : spec?.customer, payload.owCount ?? 0);
  // The line memory counts this visit (finished or skipped), so the next one is a return with other lines.
  const pinTaken = !failed && step?.pin === true; // a pin visit: the pin goes into the jar (game/pin-jar.js)
  const jar = (save.pinJar ?? 0) + (pinTaken ? 1 : 0);
  const base = { ...economyToSave(save, after), ...moved, pendingStrips: [...strips], pinJar: jar }; // strips kept until played (B4)
  const next = recordLines(failed ? base : addPendingDiplomas(base, roundSkills(before, after, payload.cleanBumpTypes ?? []).mastered), step?.lines, said, failed); // new Master diplomas too (B93)
  // Nose dots left on: the customer says so instead (owner 2026-10-28); the line memory keeps the usual line.
  const shown = !failed && payload.stripLeft === true ? noseLeftKey(step) : said;
  return {
    save: next, retry: false, failed, stars, payout, reputationChange: after.reputation - before.reputation, skipPenalty,
    strips, factKey: failed ? null : pinTaken ? 'fact.pin' : factForCustomer(kw ? step.n - 1 : step.chapter * 20 + step.n - 1),
    pinJar: pinTaken ? jar : null, // the jar count after a pin visit, for the result line; null = no pin this time
    reactionKey: shown,
    boss: !failed && isBoss(step?.boss) ? step.boss : null, // a finished boss: its stamp goes into the album (T8.4)
    skills: failed ? null : roundSkills(before, after, payload.cleanBumpTypes ?? []), // level ups and the next goal (D34)
  };
}

/**
 * The skill lines of the result screen (D34) from applyRound's skills: a "Level up!" line for every kind that went up
 * (new Masters first, then the highest new levels; B93 5), folded into ONE line naming all the kinds (kindKeys) when
 * three or more went up at once, or else one line saying how many clean pops the closest kind still needs (with its
 * bar). Text keys only; the screen fills in the kind's name (kindKey, or the list kindKeys) and the level's name (levelKey).
 * @param {ReturnType<typeof roundSkills>|null|undefined} skills applyRound's skills
 * @returns {{up: boolean, key: string, kindKey: string, kindKeys?: string[], levelKey: string, vars: object, share?: number}[]} the lines
 */
export function skillNews(skills) {
  if (!skills) return [];
  const sorted = [...skills.ups].sort((a, b) => b.to - a.to);
  if (sorted.length > 2) { // many at once: one line with every kind (a new Master still gets its diploma screen)
    return [{
      up: true, key: 'ui.skill.newsMany', kindKey: `ui.guide.${sorted[0].type}.name`, kindKeys: sorted.map((u) => `ui.skill.kinds.${u.type}`),
      levelKey: `ui.skill.level${sorted[0].to}`, vars: { n: sorted.length },
    }];
  }
  const ups = sorted.map((u) => ({
    up: true, key: u.to >= MASTER_LEVEL ? 'ui.skill.newsMaster' : 'ui.skill.newsUp', kindKey: `ui.guide.${u.type}.name`,
    levelKey: `ui.skill.level${u.to}`, vars: { n: u.to, pct: u.speedPercent },
  }));
  if (ups.length) return ups;
  const n = skills.near;
  if (!n) return [];
  return [{
    up: false, key: n.left === 1 ? 'ui.skill.newsLeftOne' : 'ui.skill.newsLeft', kindKey: `ui.guide.${n.type}.name`,
    levelKey: `ui.skill.level${n.level + 1}`, vars: { n: n.left, level: n.level + 1 }, share: n.share,
  }];
}

/**
 * The extra {placeholders} a strip's texts need. Only the Tool mastery strip has any: {kind} = the kind of bump she got
 * Skilled at (the most trained kind; on a replay, the most trained kind now), {level} and {max} = that kind's level now
 * and the Master level, {pct} = how much faster that level pops, {levelName} and {levelCaps} = the level's name ("Skilled",
 * "Master"; B93 8: a replay names the level the kind has by then, not always Skilled) and {more} = what comes next.
 * Kind, level names and the next-step line come as string keys (`keys`, app.js translates them); numbers come as `values`.
 * @param {string} id strip id @param {object} save the save
 * @returns {{keys: Record<string, string>, values: Record<string, number>}} placeholders to translate, and plain ones
 */
export function stripVars(id, save) {
  if (id !== STRIP_FIRST_MASTERY) return { keys: {}, values: {} };
  const state = economyFromSave(save);
  let best = null;
  let bestLevel = 0;
  for (const type of BUMP_IDS) {
    const level = masteryLevel(state, type);
    if (level > bestLevel) { best = type; bestLevel = level; }
  }
  const level = Math.min(MASTER_LEVEL, Math.max(MASTERY_STRIP_LEVEL, bestLevel)); // the level the text names (never below Skilled)
  return {
    keys: {
      kind: best ? `ui.skill.kinds.${best}` : 'ui.skill.anyKind', levelName: `ui.skill.levelIs${level}`,
      levelCaps: `ui.skill.levelCaps${level}`, more: `ui.skill.stripMore${level}`,
    },
    values: { level, max: MASTER_LEVEL, pct: Math.round((1 - MASTERY_LEVELS[level].holdFactor) * 100) },
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
  const strips = milestoneStripsToPlay(before, after, save.seenComics ?? []);
  // The earned strips wait in the save until played (B4), so closing the app while one plays loses none.
  return { save: addPendingStrips(economyToSave(save, after), strips), ok: true, needsScrub: needsScrub(after, itemId), strips };
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
  const strips = milestoneStripsToPlay(before, after, save.seenComics ?? []);
  return { save: addPendingStrips(economyToSave(save, after), strips), strips }; // kept until played (B4)
}

/**
 * Adds milestone strips to the save's waiting list (B4), once each, after any already waiting. markSeen takes a strip
 * off the list once it is played.
 * @param {object} save the save
 * @param {string[]} strips strip ids to add
 * @returns {object} new save (the same save when there is nothing to add)
 */
export function addPendingStrips(save, strips) {
  if (!strips.length) return save;
  const pending = Array.isArray(save.pendingStrips) ? save.pendingStrips : [];
  return { ...save, pendingStrips: [...pending, ...strips.filter((id) => !pending.includes(id))] };
}

/**
 * Adds new Master diplomas (bump ids) to the save's waiting list (B93), once each, after any already waiting.
 * clearPendingDiploma takes one off once its screen has been seen.
 * @param {object} save the save
 * @param {string[]} types bump ids that just reached Master
 * @returns {object} new save (the same save when there is nothing to add)
 */
export function addPendingDiplomas(save, types) {
  const pending = Array.isArray(save.pendingDiplomas) ? save.pendingDiplomas : [];
  const fresh = types.filter((id) => !pending.includes(id));
  return fresh.length ? { ...save, pendingDiplomas: [...pending, ...fresh] } : save;
}

/**
 * The Master diplomas still waiting to be shown (B93): earned by the last customer, not seen yet. Shown after the
 * result screen, or on the next Continue when the app was closed on the result screen. Only real bump kinds that are
 * still Master count.
 * @param {object} save the save
 * @returns {string[]} bump ids, in order
 */
export function pendingDiplomas(save) {
  const masters = masterKinds(save);
  return (Array.isArray(save.pendingDiplomas) ? save.pendingDiplomas : []).filter((id) => masters.includes(id));
}

/**
 * Takes one diploma off the waiting list (call when its screen is done, so it never shows twice).
 * @param {object} save the save
 * @param {string} type bump id
 * @returns {object} new save (the same save when it was not waiting)
 */
export function clearPendingDiploma(save, type) {
  const pending = Array.isArray(save.pendingDiplomas) ? save.pendingDiplomas : [];
  return pending.includes(type) ? { ...save, pendingDiplomas: pending.filter((id) => id !== type) } : save;
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
 * @param {string} key sound, music, vibration, reducedMotion or squeeze (two-finger squeeze, T1.7); or musicVolume or
 *   sfxVolume (a number from 0 to 1, kept inside that range)
 * @param {boolean|number} value on or off, or the volume
 * @returns {object} new save
 */
export function setSetting(save, key, value) {
  if (key === 'musicVolume' || key === 'sfxVolume') {
    return { ...save, settings: { ...save.settings, [key]: clampVolume(value, save.settings?.[key]) } };
  }
  if (!['sound', 'music', 'vibration', 'reducedMotion', 'squeeze', 'lowDetail'].includes(key)) return save;
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

/**
 * The buzz function the game puts in place of navigator.vibrate (T6.1): it only buzzes while the Settings switch is on;
 * when it is off it buzzes nothing and stops a buzz that is running.
 * @param {(pattern: number|number[]) => boolean} real the phone's own vibrate function (already bound)
 * @param {() => boolean} isOn reads the saved vibration switch right now
 * @returns {(pattern: number|number[]) => boolean} the guarded vibrate function
 */
export function guardVibrate(real, isOn) {
  return (pattern) => {
    if (isOn()) return real(pattern);
    real(0);
    return false;
  };
}
