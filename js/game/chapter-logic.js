// Chapter progress logic (T4.4): pure functions that say what comes next in the story and what the next customer
// looks like. No DOM, no storage, no clock: the same input always gives the same answer, so Node can test it.
// Progress is a small plain object { chapter, customersDone, stripSeen }:
// - chapter: 0 to 5 (the save field `chapter`).
// - customersDone: how many steps after the opening strip are finished in this chapter (the save field `customersDone`).
//   Customers count first; in chapter 5 the three closing steps (scare, teaser, end) count on after the 15 customers.
//   Chapter 1 has just one step after its strip (the torchlight mode), so it never stays at 1 (it moves on). Chapter 4
//   has two: the phone scroll, then the bridge strip "The plan" (customersDone 1 = phone scroll done, plan next).
// - stripSeen: the opening strip was watched or skipped. Not a new save field: progressFromSave reads it from the
//   existing `seenComics` list, so saves from before this job keep working.
// The wiring job copies { chapter, customersDone } back into the save and adds the strip id to seenComics.

import { REGULARS, makeCustomer, makeRng } from '../data/customers.js';
import {
  CHAPTERS, HUSBAND, HUSBAND_ARMOR, LAST_CHAPTER, CAREER_BANDS, KEEP_WORKING_ROSTER, getChapter, careerBand,
} from '../data/chapters.js';
import { KEEP_WORKING_DIFFICULTY } from '../data/economy-data.js';

/** What `advance` accepts as the outcome of a step: finished, skipped on purpose (D15 "Next customer"), or try again. */
export const OUTCOMES = ['done', 'skip', 'retry'];

/**
 * A fresh progress object for a new player: chapter 0, strip not seen.
 * @returns {{chapter: number, customersDone: number, stripSeen: boolean}} the start
 */
export function startProgress() {
  return { chapter: 0, customersDone: 0, stripSeen: false };
}

/**
 * Makes any value into valid progress: unknown chapters, bad counts and wrong types fall back safely.
 * @param {unknown} raw anything
 * @returns {{chapter: number, customersDone: number, stripSeen: boolean}} valid progress
 */
export function normalizeProgress(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  let chapter = Number.isInteger(p.chapter) && p.chapter >= 0 ? Math.min(p.chapter, LAST_CHAPTER) : 0;
  let total = chapterSteps(chapter).length - 1; // steps after the strip
  let done = Number.isInteger(p.customersDone) && p.customersDone >= 0 ? Math.min(p.customersDone, total) : 0;
  let stripSeen = p.stripSeen === true;
  // An old save can sit at the very end of a chapter that has since been shortened (nothing left to play there):
  // move on to the start of the next chapter. A chapter that is only its strip (total 0) rolls only once its strip is
  // marked seen (unseen, its strip is next); the last chapter never rolls here (it stays finished).
  while (chapter < LAST_CHAPTER && (total > 0 ? done >= total : stripSeen)) {
    chapter += 1;
    total = chapterSteps(chapter).length - 1;
    done = 0;
    stripSeen = false;
  }
  // Past the strip means the strip was seen, even if the flag is missing.
  return { chapter, customersDone: done, stripSeen: stripSeen || done > 0 };
}

/**
 * Builds progress from a save object (chapter, customersDone, seenComics). Old saves work: missing fields start over.
 * @param {object} save the save object (core/save.js shape)
 * @returns {{chapter: number, customersDone: number, stripSeen: boolean}} the progress
 */
export function progressFromSave(save) {
  const s = save && typeof save === 'object' ? save : {};
  let base = normalizeProgress({ chapter: s.chapter, customersDone: s.customersDone });
  const seen = Array.isArray(s.seenComics) ? s.seenComics : [];
  // Sets stripSeen on the progress when the chapter's comic strip is in the saved list.
  const stripSeenFor = (p) => {
    const strip = getChapter(p.chapter)?.strip;
    return { ...p, stripSeen: p.stripSeen || (strip !== undefined && seen.includes(strip)) };
  };
  base = stripSeenFor(base);
  // A chapter that is only its comic strip (chapter 3) is over as soon as the strip is seen: move on to the next one.
  while (base.stripSeen && chapterSteps(base.chapter).length === 1 && base.chapter < LAST_CHAPTER) {
    base = stripSeenFor({ chapter: base.chapter + 1, customersDone: 0, stripSeen: false });
  }
  return base;
}

/**
 * The two save fields for a progress object (merge them into the save; add the strip id to seenComics yourself).
 * @param {{chapter: number, customersDone: number}} progress the progress
 * @returns {{chapter: number, customersDone: number}} fields to copy into the save
 */
export function progressToSave(progress) {
  const p = normalizeProgress(progress);
  return { chapter: p.chapter, customersDone: p.customersDone };
}

/**
 * Every step of one chapter in order: the opening strip, then a special mode or the customers, then (chapter 5) the
 * closing steps. Step shapes: {type:'strip', stripId, chapter}, {type:'special', mode, chapter},
 * {type:'customer', n, total, chapter}, {type:'bridge', stripId} (a story strip after the play, chapter 4 "The plan"),
 * {type:'scare', unlocks}, {type:'teaser', stripId}, {type:'end', textKey}.
 * @param {number} chapterId chapter number
 * @returns {object[]} the steps (empty for an unknown chapter)
 */
export function chapterSteps(chapterId) {
  const ch = getChapter(chapterId);
  if (!ch) return [];
  const steps = [{ type: 'strip', stripId: ch.strip, titleKey: ch.titleKey, chapter: ch.id }];
  if (ch.special) steps.push({ type: 'special', mode: ch.special, chapter: ch.id });
  ch.customers.forEach((_, i) => steps.push({ type: 'customer', n: i + 1, total: ch.customers.length, chapter: ch.id }));
  for (const a of ch.after) {
    if (a.type === 'scare') steps.push({ type: 'scare', unlocks: [...a.unlocks], chapter: ch.id });
    else if (a.type === 'teaser') steps.push({ type: 'teaser', stripId: a.strip, chapter: ch.id });
    else if (a.type === 'bridge') steps.push({ type: 'bridge', stripId: a.strip, chapter: ch.id });
    else steps.push({ type: 'end', textKey: a.textKey, chapter: ch.id });
  }
  return steps;
}

/**
 * Whether the whole of version 1 is finished: the last chapter's closing steps (up to and including the
 * "To be continued" screen) are all done.
 * @param {{chapter: number, customersDone: number, stripSeen: boolean}} progress the progress
 * @returns {boolean} true when nothing is left to play
 */
export function isFinished(progress) {
  const p = normalizeProgress(progress);
  return p.chapter === LAST_CHAPTER && p.stripSeen && p.customersDone >= chapterSteps(p.chapter).length - 1;
}

/**
 * What comes next. When everything is finished it keeps answering with the "To be continued" end step.
 * @param {{chapter: number, customersDone: number, stripSeen: boolean}} progress the progress
 * @returns {object} the next step (see chapterSteps for the shapes)
 */
export function currentStep(progress) {
  const p = normalizeProgress(progress);
  const steps = chapterSteps(p.chapter);
  if (isFinished(p)) return steps[steps.length - 1];
  return steps[p.stripSeen ? 1 + p.customersDone : 0];
}

/**
 * Moves one step on and returns NEW progress (the old object is not changed).
 * - 'done' or 'skip' finish the current step (a skipped strip counts as seen; a skipped customer is the D15 "Next
 *   customer" choice, the reputation cost is the economy's job).
 * - 'retry' ("Try again", D15) changes nothing.
 * After the last step of a chapter the next chapter starts. After the last step of the last chapter it stays finished.
 * A string or an object with a `result` field is accepted; unknown outcomes count as 'done'.
 * @param {{chapter: number, customersDone: number, stripSeen: boolean}} progress the progress
 * @param {string|{result: string}} [outcome] 'done' (default), 'skip' or 'retry'
 * @returns {{chapter: number, customersDone: number, stripSeen: boolean}} the new progress
 */
export function advance(progress, outcome = 'done') {
  const p = normalizeProgress(progress);
  const result = typeof outcome === 'string' ? outcome : outcome?.result;
  if (result === 'retry' || isFinished(p)) return p;
  if (!p.stripSeen) {
    // A chapter that is only its comic strip (chapter 3) moves straight on to the next chapter.
    if (chapterSteps(p.chapter).length === 1 && p.chapter < LAST_CHAPTER) return { chapter: p.chapter + 1, customersDone: 0, stripSeen: false };
    return { ...p, stripSeen: true };
  }
  const total = chapterSteps(p.chapter).length - 1;
  const done = p.customersDone + 1;
  if (done >= total && p.chapter < LAST_CHAPTER) return { chapter: p.chapter + 1, customersDone: 0, stripSeen: false };
  return { chapter: p.chapter, customersDone: done, stripSeen: true };
}

/**
 * A number in a range, picked the same way every time for the same key.
 * @param {number} key seed
 * @param {[number, number]} range [fewest, most], both included
 * @returns {number} the whole number
 */
function steady(key, range) {
  return range[0] + Math.floor(makeRng(key)() * (range[1] - range[0] + 1));
}

/**
 * Everything the pop scene needs for customer n of a chapter: who they are, how many bumps, which bump types,
 * how hard the irritation meter is, and whether they may ask for a request.
 * Career chapter (5): bumps, types, difficulty and requests follow the five blocks in ECONOMY.md section 6 and 7,
 * whoever the customer is (a named regular keeps their face and lines, not their own bump list).
 * Other chapters: the customer's own bump list, the chapter difficulty, and no requests.
 * @param {number} chapterId chapter number (0 to 5)
 * @param {number} n customer number, 1 based
 * @returns {{customer: object, bumpCount: number, allowedTypes: string[], difficulty: number, requestAllowed: boolean}|null}
 *   the spec, or null when the chapter has no such customer
 */
export function customerSpec(chapterId, n) {
  const ch = getChapter(chapterId);
  const entry = ch && Number.isInteger(n) && n >= 1 ? ch.customers[n - 1] : undefined;
  if (!entry) return null;
  const base = rosterBase(entry, ch.id);
  if (!base) return null;
  if (ch.kind === 'career') {
    const band = careerBand(n);
    return specFrom(base, steady(ch.id * 1000 + n, band.bumps), band.types, band.difficulty, band.requests);
  }
  return specFrom(base, base.bumps, base.bumpTypes, ch.difficulty, false);
}

/**
 * The customer a roster entry (data/chapters.js makeRoster shape) stands for: the husband, a named regular or a
 * seeded stranger.
 * @param {{who: string, id?: string, seed?: number}} entry the roster entry
 * @param {number} chapterId chapter number (strangers get that chapter's face generator, 2 to 5)
 * @returns {object|undefined} the customer data, or undefined for an unknown regular
 */
function rosterBase(entry, chapterId) {
  if (entry.who === 'husband') return HUSBAND;
  if (entry.who === 'husbandArmor') return HUSBAND_ARMOR;
  if (entry.who === 'regular') return REGULARS.find((r) => r.id === entry.id);
  return makeCustomer(entry.seed, { chapter: Math.min(5, Math.max(2, chapterId)) });
}

/**
 * Packs a customer and their round settings into the spec shape customerSpec gives (fresh copies, nothing shared).
 * @param {object} base the customer data
 * @param {number} bumpCount bumps on the face
 * @param {string[]} types allowed bump types
 * @param {number} difficulty irritation difficulty
 * @param {boolean} requestAllowed whether they may ask for a request
 * @returns {{customer: object, bumpCount: number, allowedTypes: string[], difficulty: number, requestAllowed: boolean}} the spec
 */
function specFrom(base, bumpCount, types, difficulty, requestAllowed) {
  const customer = {
    ...base,
    face: { ...base.face, accessories: [...base.face.accessories] },
    resultKeys: { ...base.resultKeys },
    bumps: bumpCount,
    bumpTypes: [...types],
  };
  return { customer, bumpCount, allowedTypes: [...types], difficulty, requestAllowed };
}

/**
 * Whether Keep working customer k comes up as a regular before the no-two-in-a-row rule (a fixed coin toss per k).
 * @param {number} k Keep working customer number, 1 based
 * @returns {boolean} true = a regular's turn
 */
function regularTurn(k) {
  return makeRng(KEEP_WORKING_ROSTER.seedBase * 2 + k)() < KEEP_WORKING_ROSTER.regularChance;
}

/**
 * Who Keep working customer k is (T5.4, SPEC D23): a named regular (about 1 in 5) or a seeded stranger, the same
 * answer every time for the same k (so a reload shows the same customer). A regular never follows a regular and every
 * stranger has its own seed, so the same face never comes twice in a row.
 * @param {number} k Keep working customer number, 1 based (anything else counts as 1)
 * @returns {{who: 'regular', id: string}|{who: 'generic', seed: number}} a roster entry (data/chapters.js shape)
 */
export function keepWorkingEntry(k) {
  const n = Number.isInteger(k) && k >= 1 ? k : 1;
  if (regularTurn(n) && !(n > 1 && regularTurn(n - 1))) {
    const rng = makeRng(KEEP_WORKING_ROSTER.seedBase * 2 + n);
    rng(); // the first number was the coin toss (regularTurn); the second one picks the regular
    const pick = Math.floor(rng() * REGULARS.length);
    return { who: 'regular', id: REGULARS[pick].id };
  }
  return { who: 'generic', seed: KEEP_WORKING_ROSTER.seedBase + n };
}

/**
 * Everything the pop scene needs for Keep working customer k (same shape as customerSpec): the customer from
 * keepWorkingEntry, the bumps and bump types of the career's last block (everything mixed), Keep working's own
 * difficulty (economy-data.js KEEP_WORKING_DIFFICULTY) and requests allowed.
 * @param {number} k Keep working customer number, 1 based
 * @returns {{customer: object, bumpCount: number, allowedTypes: string[], difficulty: number, requestAllowed: boolean}} the spec
 */
export function keepWorkingSpec(k) {
  const n = Number.isInteger(k) && k >= 1 ? k : 1;
  const band = CAREER_BANDS[CAREER_BANDS.length - 1];
  const base = rosterBase(keepWorkingEntry(n), LAST_CHAPTER);
  return specFrom(base, steady(KEEP_WORKING_ROSTER.seedBase * 4 + n, band.bumps), band.types, KEEP_WORKING_DIFFICULTY, true);
}

/**
 * The spec (same shape as customerSpec) of any roster entry in her studio with the round settings given: used by the
 * daily challenge (T8.5, game/daily-logic.js), whose customer is picked by the date, not by a customer number.
 * @param {{who: string, id?: string, seed?: number}} entry a roster entry (data/chapters.js makeRoster shape)
 * @param {{bumpCount: number, types: string[], difficulty: number, requestAllowed?: boolean}} o the round settings
 * @returns {{customer: object, bumpCount: number, allowedTypes: string[], difficulty: number, requestAllowed: boolean}|null}
 *   the spec, or null for an unknown regular
 */
export function rosterSpec(entry, { bumpCount, types, difficulty, requestAllowed = false }) {
  const base = rosterBase(entry, LAST_CHAPTER);
  return base ? specFrom(base, bumpCount, types, difficulty, requestAllowed) : null;
}
