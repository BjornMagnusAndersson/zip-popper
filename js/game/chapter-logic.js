// Chapter progress logic (T4.4): pure functions that say what comes next in the story and what the next customer
// looks like. No DOM, no storage, no clock: the same input always gives the same answer, so Node can test it.
// Progress is a small plain object { chapter, customersDone, stripSeen }:
// - chapter: 0 to 5 (the save field `chapter`).
// - customersDone: how many steps after the opening strip are finished in this chapter (the save field `customersDone`).
//   Customers count first; in chapter 5 the three closing steps (scare, teaser, end) count on after the 15 customers.
//   A special-mode chapter (1 and 4) has just one step after its strip, so it never stays at 1 (it moves on).
// - stripSeen: the opening strip was watched or skipped. Not a new save field: progressFromSave reads it from the
//   existing `seenComics` list, so saves from before this job keep working.
// The wiring job copies { chapter, customersDone } back into the save and adds the strip id to seenComics.

import { REGULARS, makeCustomer, makeRng } from '../data/customers.js';
import { CHAPTERS, HUSBAND, HUSBAND_ARMOR, LAST_CHAPTER, getChapter, careerBand } from '../data/chapters.js';

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
  const chapter = Number.isInteger(p.chapter) && p.chapter >= 0 ? Math.min(p.chapter, LAST_CHAPTER) : 0;
  const total = chapterSteps(chapter).length - 1; // steps after the strip
  const done = Number.isInteger(p.customersDone) && p.customersDone >= 0 ? Math.min(p.customersDone, total) : 0;
  // Past the strip means the strip was seen, even if the flag is missing.
  return { chapter, customersDone: done, stripSeen: p.stripSeen === true || done > 0 };
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
 * {type:'customer', n, total, chapter}, {type:'scare', unlocks}, {type:'teaser', stripId}, {type:'end', textKey}.
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
  let base;
  if (entry.who === 'husband') base = HUSBAND;
  else if (entry.who === 'husbandArmor') base = HUSBAND_ARMOR;
  else if (entry.who === 'regular') base = REGULARS.find((r) => r.id === entry.id);
  else base = makeCustomer(entry.seed, { chapter: Math.min(5, Math.max(2, ch.id)) });
  if (!base) return null;
  let bumpCount = base.bumps;
  let allowedTypes = [...base.bumpTypes];
  let difficulty = ch.difficulty;
  let requestAllowed = false;
  if (ch.kind === 'career') {
    const band = careerBand(n);
    bumpCount = steady(ch.id * 1000 + n, band.bumps);
    allowedTypes = [...band.types];
    difficulty = band.difficulty;
    requestAllowed = band.requests;
  }
  const customer = {
    ...base,
    face: { ...base.face, accessories: [...base.face.accessories] },
    resultKeys: { ...base.resultKeys },
    bumps: bumpCount,
    bumpTypes: [...allowedTypes],
  };
  return { customer, bumpCount, allowedTypes, difficulty, requestAllowed };
}
