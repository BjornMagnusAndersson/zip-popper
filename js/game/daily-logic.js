// The daily challenge's rules (T8.5, SPEC D24): pure functions, no DOM, no storage. The clock comes in as a parameter
// (today(now)), so Node can test any date, a midnight and a phone clock that was moved back.
// - Dates are local calendar days as 'YYYY-MM-DD' text (the phone's own time zone, never UTC). Text in that form sorts
//   like the dates, so "is this day after that day" is a plain text compare.
// - dailyFor(date): the day's customer, face seed, goal and twist, the same for every player on that date.
// - judgeDaily(goal, result): whether a finished round reached the goal.
// - settleDaily(save, {date, reached}): the reward and the streak, at most once per day.
// Streak rule (owner, T8.5): the streak counts days with the goal reached. A day she tried and missed keeps the
// streak as it is (no step up); a calendar day with no try at all resets it to 0. A day can be rewarded once only: a
// date on or before the last rewarded day (or before the last day played: the phone clock was moved back) is refused.
// Numbers and string keys: data/daily.js.

import { DAILY, DAILY_GOAL_IDS, DAILY_GOALS, STREAK_MILESTONES } from '../data/daily.js';
import { REGULARS, makeRng } from '../data/customers.js';
import { CHAPTERS, CAREER_BANDS } from '../data/chapters.js';
import { KEEP_WORKING_DIFFICULTY } from '../data/economy-data.js';
import { bumpInfo } from '../data/bumps.js';
import { rosterSpec } from './chapter-logic.js';
import { hurryLimit } from './requests.js';
import { COMBO_WINDOW } from './scoring.js';
import { faceGeometry, layoutFace } from '../pop/logic.js';
import { bestToolFor, effectiveHold } from '../pop/tool-logic.js';

/** One day in ms (dates are counted on UTC midnights, so summer time never makes a day 23 or 25 hours long). */
const DAY_MS = 86400000;
const CLOCK_SLACK_DAYS = 1; // a saved day further ahead than this is taken as a wrong phone clock (dailyFields)
/** Seconds a quick player needs to move to the next bump and aim (the same as the hurry test's fastest player). */
const MOVE_SECONDS = 0.8;
/** The studio chapter (5): the daily customer is in her studio with the career rules, like Keep working. */
const STUDIO_CHAPTER = CHAPTERS.find((c) => c.kind === 'career')?.id ?? 5;

/**
 * Two digits, with a leading zero.
 * @param {number} n 0..99
 * @returns {string} e.g. '03'
 */
function two(n) {
  return String(n).padStart(2, '0');
}

/**
 * Today's date on the phone, as 'YYYY-MM-DD' in the phone's own time zone.
 * @param {Date|number} [now] the time now (a Date or ms; the real clock when left out)
 * @returns {string} the date text ('' when the time is not a real time)
 */
export function today(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/**
 * Whether a value is a real calendar date written as 'YYYY-MM-DD' (2026-02-30 is not).
 * @param {unknown} v anything
 * @returns {boolean} true = a real date
 */
export function isDateKey(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * A date as a day number (days since 1970-01-01), for counting days between two dates.
 * @param {string} date 'YYYY-MM-DD' (a real date)
 * @returns {number} whole days
 */
export function dayNumber(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/**
 * The date a number of days after (or before, with a minus) another date.
 * @param {string} date 'YYYY-MM-DD'
 * @param {number} days how many days on (negative = back)
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDays(date, days) {
  const t = new Date((dayNumber(date) + Math.round(days)) * DAY_MS);
  return `${t.getUTCFullYear()}-${two(t.getUTCMonth() + 1)}-${two(t.getUTCDate())}`;
}

/**
 * How long until the next local midnight (the menu redraws itself then, so a new day's challenge shows up while the
 * app is open).
 * @param {Date|number} [now] the time now
 * @returns {number} ms, at least 1000
 */
export function msToMidnight(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return DAY_MS;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(1000, next.getTime() - d.getTime());
}

/**
 * A list in a fixed shuffled order for a random function (Fisher-Yates).
 * @param {string[]} list the items
 * @param {() => number} rng random numbers
 * @returns {string[]} a new list
 */
function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The goal order of one block of five days: every goal once, shuffled by the block number. When the block would start
 * with the goal the block before ended on, its first two swap, so no goal comes two days in a row (only the first two
 * ever swap, so the last one of a block is always its plain shuffle and nothing has to look further back).
 * @param {number} block block number (day / 5, rounded down)
 * @returns {string[]} goal ids
 */
function blockGoals(block) {
  const size = DAILY_GOAL_IDS.length;
  const order = shuffled(DAILY_GOAL_IDS, makeRng(DAILY.seedBase * 3 + block * 7 + 1));
  const before = shuffled(DAILY_GOAL_IDS, makeRng(DAILY.seedBase * 3 + (block - 1) * 7 + 1));
  if (order[0] === before[size - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/**
 * The goal id of a day (counted from DAILY.epoch): the five goals take turns in shuffled blocks of five days.
 * @param {number} day day number from the epoch (may be negative for older dates)
 * @returns {string} a goal id
 */
export function goalIdFor(day) {
  const size = DAILY_GOAL_IDS.length;
  const block = Math.floor(day / size);
  return blockGoals(block)[day - block * size];
}

/**
 * The bump kinds a face would get (the same layout the pop scene makes; the kinds never depend on the screen size).
 * @param {object} spec a customer spec (customer, bumpCount, allowedTypes; a `boss` mix when there is one)
 * @param {number} seed the face seed
 * @returns {string[]} one kind per bump
 */
function faceKinds(spec, seed) {
  const face = faceGeometry(390, 700, spec.customer.face);
  const mix = spec.boss?.mix ?? null;
  const allowed = mix ? Object.keys(mix) : spec.allowedTypes;
  return layoutFace({ seed, face, count: spec.bumpCount, strip: false, allowed, decoys: true, mix }).pimples.map((p) => p.type);
}

/**
 * Whether a bump kind can be popped quickly enough to keep a combo chain going: with the best tool she can own for it
 * (every tool in the game, no mastery, cold face), its hold plus a quick move fits into the combo window.
 * @param {string} type bump kind
 * @returns {boolean} true = quick enough
 */
export function quickKind(type) {
  const hold = bumpInfo(type)?.hold ?? 99;
  return effectiveHold(hold, bestToolFor(type), type, 0) + MOVE_SECONDS <= COMBO_WINDOW;
}

/**
 * The Gold rush mix of a face: the face's own kinds, with DAILY.goldCount of them golden (plain whiteheads and pink
 * ones turn gold first, so the rarer kinds stay), the same number of bumps in all.
 * @param {string[]} kinds the face's kinds (faceKinds)
 * @returns {Object<string, number>} kind -> how many
 */
function goldMix(kinds) {
  const list = [...kinds];
  let need = DAILY.goldCount - list.filter((k) => k === 'gold').length;
  for (const plain of ['whitehead', 'red', 'blackhead', 'big', 'hair', 'horn']) {
    for (let i = 0; i < list.length && need > 0; i += 1) {
      if (list[i] === plain) { list[i] = 'gold'; need -= 1; }
    }
  }
  const mix = {};
  for (const k of list) mix[k] = (mix[k] ?? 0) + 1;
  return mix;
}

/**
 * Whether a face lets the goal be done (with the tools she can own): Combo master needs at least the chain's length
 * of quick bumps; the other goals can always be done on any face (the clock limit is checked in tests/daily.test.mjs).
 * @param {{id: string, n?: number}} goal the goal
 * @param {string[]} kinds the face's kinds
 * @returns {boolean} true = possible
 */
export function goalPossible(goal, kinds) {
  if (goal.id === 'combo') return kinds.filter(quickKind).length >= goal.n;
  if (goal.id === 'gold') return kinds.filter((k) => k === 'gold').length >= goal.n;
  return true;
}

/**
 * The daily challenge of a date, the same for every player: the customer (a named regular about DAILY.regularChance
 * of the days, else a walk-in), the face seed, how many bumps (the career's last block, as in Keep working), the goal
 * and the twist (from the goal's list; 'hurry' only on a clock day). A day whose first face cannot do its goal looks at
 * the next candidate face (up to DAILY.tries). Not a real date = the epoch's challenge.
 * @param {string} date 'YYYY-MM-DD'
 * @returns {{date: string, day: number, seed: number, entry: object, bumpCount: number, goal: {id: string, n?: number},
 *   twist: string, mix: Object<string, number>|null}} the challenge (mix = the Gold rush bump mix, else null)
 */
export function dailyFor(date) {
  const key = isDateKey(date) ? date : DAILY.epoch;
  const day = dayNumber(key) - dayNumber(DAILY.epoch);
  const id = goalIdFor(day);
  const goal = id === 'combo' ? { id, n: DAILY.comboLength } : id === 'gold' ? { id, n: DAILY.goldCount } : { id };
  const band = CAREER_BANDS[CAREER_BANDS.length - 1];
  const pickRng = makeRng(DAILY.seedBase * 5 + day);
  const regular = pickRng() < DAILY.regularChance ? REGULARS[Math.floor(pickRng() * REGULARS.length)] : null;
  const twists = DAILY_GOALS[id].twists;
  const twist = twists[Math.floor(makeRng(DAILY.seedBase * 7 + day)() * twists.length)];
  let pick = null;
  for (let k = 0; k < DAILY.tries; k += 1) {
    const salt = day * 16 + k; // every candidate of every day has its own numbers
    const entry = regular ? { who: 'regular', id: regular.id } : { who: 'generic', seed: DAILY.seedBase + Math.abs(salt) };
    const seed = 1 + Math.abs((DAILY.faceSeedBase + salt) * 7919) % 2000000000;
    const bumpCount = band.bumps[0] + Math.floor(makeRng(seed + 17)() * (band.bumps[1] - band.bumps[0] + 1));
    const spec = rosterSpec(entry, { bumpCount, types: band.types, difficulty: KEEP_WORKING_DIFFICULTY });
    let kinds = faceKinds(spec, seed);
    const mix = id === 'gold' ? goldMix(kinds) : null;
    if (mix) kinds = faceKinds({ ...spec, boss: { mix } }, seed);
    pick = { date: key, day, seed, entry, bumpCount, goal, twist, mix };
    if (goalPossible(goal, kinds)) break;
  }
  return pick;
}

/**
 * The customer spec of a day's challenge (chapter-logic.js customerSpec shape): the customer, the career's last block
 * of bumps, Keep working's difficulty, no request (the goal is the extra). A Gold rush day carries its bump mix as a
 * `boss` field without an event id (round-logic.js roundFaceSetup lays out exactly those bumps).
 * @param {string|ReturnType<typeof dailyFor>} daily a date or a dailyFor result
 * @returns {object} the spec
 */
export function dailySpec(daily) {
  const d = typeof daily === 'string' ? dailyFor(daily) : daily;
  const band = CAREER_BANDS[CAREER_BANDS.length - 1];
  const spec = rosterSpec(d.entry, { bumpCount: d.bumpCount, types: band.types, difficulty: KEEP_WORKING_DIFFICULTY });
  return d.mix ? { ...spec, boss: { mix: { ...d.mix } } } : spec;
}

/**
 * The "Beat the clock" limit: the hurry limit of the face (requests.js hurryLimit) times DAILY.clockFactor, rounded up.
 * @param {number[]} holds hold seconds of every bump with her best owned tool at her mastery (round-logic.js hurryHolds)
 * @returns {number} whole seconds (0 when there are no holds)
 */
export function dailyClockLimit(holds) {
  return Math.ceil(hurryLimit(holds) * DAILY.clockFactor - 1e-9);
}

/**
 * The request a daily round carries: on a clock day the hurry request with the daily limit (its banner counts down,
 * and it is the "In a hurry" twist); on other days none.
 * @param {{id: string}} goal the day's goal
 * @param {number[]} holds hold seconds of the face's bumps (round-logic.js hurryHolds)
 * @returns {{type: 'hurry', timeLimit: number}|null} the request
 */
export function dailyRequest(goal, holds) {
  return goal?.id === 'clock' ? { type: 'hurry', timeLimit: dailyClockLimit(holds) } : null;
}

/**
 * The parts of a round's end (pop-mode.js onFinish payload, round-logic.js finishPayload) the goals look at.
 * @param {object} payload the onFinish payload
 * @returns {{failed: boolean, stars: number, owCount: number, elapsedSeconds: number, bestCombo: number,
 *   goldClean: number}} the result
 */
export function dailyResult(payload) {
  const p = payload ?? {};
  return {
    failed: Boolean(p.failed), stars: Number(p.stars) || 0, owCount: Number(p.owCount) || 0,
    elapsedSeconds: Number.isFinite(p.elapsedSeconds) ? p.elapsedSeconds : Infinity,
    bestCombo: Number(p.state?.bestCombo) || 0,
    goldClean: (Array.isArray(p.cleanBumpTypes) ? p.cleanBumpTypes : []).filter((k) => k === 'gold').length,
  };
}

/**
 * Whether a round reached the day's goal. A customer who stormed off never reaches it.
 * - stars3: 3 stars. noOw: not a single Ow. clock: every spot popped within goal.timeLimit seconds (the wipe is free,
 *   as for a hurry customer). combo: a chain of goal.n clean pops in a row. gold: goal.n golden bumps popped clean.
 * @param {{id: string, n?: number, timeLimit?: number}} goal the goal (clock: with its timeLimit)
 * @param {ReturnType<typeof dailyResult>} result the round's result
 * @returns {boolean} true = goal reached
 */
export function judgeDaily(goal, result) {
  const r = result ?? {};
  if (!goal || r.failed) return false;
  if (goal.id === 'stars3') return r.stars >= 3;
  if (goal.id === 'noOw') return r.owCount === 0 && r.stars > 0;
  if (goal.id === 'clock') return Number.isFinite(goal.timeLimit) && goal.timeLimit > 0 && r.elapsedSeconds <= goal.timeLimit;
  if (goal.id === 'combo') return r.bestCombo >= (goal.n ?? DAILY.comboLength);
  if (goal.id === 'gold') return r.goldClean >= (goal.n ?? DAILY.goldCount);
  return false;
}

/**
 * The daily fields of a save, cleaned (core/save.js keeps them; this also copes with a hand-made test save).
 * A last-played or last-rewarded day more than CLOCK_SLACK_DAYS after the date asked about can only come from a phone
 * clock that was wrong when it was saved (R4 finding 1): those two days are brought back to the day before the date, so
 * the daily challenge is not locked until the wrong date. (A try made on the wrong date itself still counted as a skipped
 * stretch, so that streak restarted.)
 * @param {object} save the save
 * @param {string} [date] 'YYYY-MM-DD' the date asked about (today)
 * @returns {{streak: number, best: number, attempts: number, lastDone: string, lastPlayed: string}} the fields
 */
function dailyFields(save, date) {
  /** A whole number of at least 0. @param {unknown} v value @returns {number} the number or 0 */
  const whole = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const f = {
    streak: whole(save?.dailyStreak), best: whole(save?.dailyBest), attempts: whole(save?.dailyAttempts),
    lastDone: isDateKey(save?.dailyLastDone) ? save.dailyLastDone : '',
    lastPlayed: isDateKey(save?.dailyLastPlayed) ? save.dailyLastPlayed : '',
  };
  if (isDateKey(date) && f.lastPlayed && dayNumber(f.lastPlayed) - dayNumber(date) > CLOCK_SLACK_DAYS) {
    const yesterday = addDays(date, -1);
    f.lastPlayed = yesterday;
    if (f.lastDone > yesterday) f.lastDone = yesterday;
  }
  return f;
}

/**
 * The streak as it stands on a date: the saved streak while the last day played was that date or the day before (or
 * later: the clock was moved back, nothing is taken away); 0 once a whole day went by with no try.
 * @param {ReturnType<typeof dailyFields>} f the save's daily fields
 * @param {string} date 'YYYY-MM-DD'
 * @returns {number} days
 */
function liveStreak(f, date) {
  if (!f.streak || !f.lastPlayed) return 0;
  if (date <= f.lastPlayed) return f.streak;
  return dayNumber(date) - dayNumber(f.lastPlayed) <= 1 ? f.streak : 0;
}

/**
 * Whether a date can still be rewarded: a real date after the last rewarded day and not before the last day played
 * (an earlier date means the phone clock was moved back).
 * @param {ReturnType<typeof dailyFields>} f the save's daily fields
 * @param {string} date 'YYYY-MM-DD'
 * @returns {boolean} true = open
 */
function dateOpen(f, date) {
  return isDateKey(date) && !(f.lastDone && date <= f.lastDone) && !(f.lastPlayed && date < f.lastPlayed);
}

/**
 * What the menu and the done screen show for a date: whether today's challenge is still open, the streak as it
 * stands, the best streak and the number of tries so far.
 * @param {object} save the save
 * @param {string} date 'YYYY-MM-DD' (today)
 * @returns {{date: string, open: boolean, done: boolean, streak: number, best: number, attempts: number}} the state
 *   (done = the day's reward was given, or the clock was moved back to a day already played)
 */
export function dailyState(save, date) {
  const f = dailyFields(save, date);
  const open = dateOpen(f, date);
  return { date, open, done: !open, streak: isDateKey(date) ? liveStreak(f, date) : f.streak, best: f.best, attempts: f.attempts };
}

/**
 * Settle one try at a day's challenge (a finished customer, or one who stormed off and was skipped): counts the try,
 * keeps or resets the streak (see the file comment) and, when the goal was reached, gives DAILY.reward coins, the
 * streak +1, the best streak, and at a milestone (STREAK_MILESTONES) its extra coins and stamp. A date that cannot be
 * rewarded any more (dateOpen) changes nothing: refused = true.
 * @param {object} save the save (after the round's normal Keep working pay)
 * @param {{date: string, reached: boolean}} o the challenge's date and whether its goal was reached
 * @returns {{save: object, refused: boolean, reached: boolean, coins: number, bonus: number, streak: number,
 *   milestone: {days: number, coins: number, stamp: string}|null}} the outcome (coins = the goal reward, bonus = the
 *   milestone's extra coins)
 */
export function settleDaily(save, { date, reached }) {
  const f = dailyFields(save, date);
  const ok = Boolean(reached);
  if (!dateOpen(f, date)) return { save, refused: true, reached: ok, coins: 0, bonus: 0, streak: isDateKey(date) ? liveStreak(f, date) : f.streak, milestone: null };
  const base = liveStreak(f, date);
  const played = !f.lastPlayed || date > f.lastPlayed ? date : f.lastPlayed;
  const tried = { ...save, dailyAttempts: f.attempts + 1, dailyLastPlayed: played, dailyStreak: base };
  if (!ok) return { save: tried, refused: false, reached: false, coins: 0, bonus: 0, streak: base, milestone: null };
  const streak = base + 1;
  const milestone = STREAK_MILESTONES.find((m) => m.days === streak) ?? null;
  const coins = DAILY.reward;
  const bonus = milestone?.coins ?? 0;
  const money = (Number.isFinite(save?.money) && save.money >= 0 ? Math.floor(save.money) : 0) + coins + bonus;
  return {
    save: { ...tried, money, dailyStreak: streak, dailyLastDone: date, dailyBest: Math.max(f.best, streak) },
    refused: false, reached: true, coins, bonus, streak, milestone: milestone ? { ...milestone } : null,
  };
}

/**
 * The customer step of a day's challenge: a Keep working step (her studio, Keep working's pay and reveal) marked with
 * the date. n is a day count for the info card fact (it never picks a Keep working customer).
 * @param {string} date 'YYYY-MM-DD'
 * @returns {{type: 'customer', keepWorking: true, daily: string, n: number, chapter: number}} the step
 */
export function dailyStep(date) {
  const key = isDateKey(date) ? date : DAILY.epoch;
  const day = dayNumber(key) - dayNumber(DAILY.epoch);
  return { type: 'customer', keepWorking: true, daily: key, n: (((day % 365) + 365) % 365) + 1, chapter: STUDIO_CHAPTER };
}

/**
 * The string keys and values that describe a goal (menu line, intro note, header chip).
 * @param {{id: string, n?: number, timeLimit?: number}} goal the goal
 * @returns {{nameKey: string, lineKey: string, vars: {n?: number, seconds?: number}}} the keys
 */
export function describeGoal(goal) {
  const g = DAILY_GOALS[goal?.id] ?? DAILY_GOALS.stars3;
  const vars = {};
  if (Number.isFinite(goal?.n)) vars.n = goal.n;
  if (Number.isFinite(goal?.timeLimit)) vars.seconds = goal.timeLimit;
  return { nameKey: g.nameKey, lineKey: g.lineKey, vars };
}

/**
 * The line under the stars on a daily result screen: "Goal reached! +40 coins" (with the streak, and a milestone's
 * name when one was reached), "Goal missed" with the streak, or "already rewarded" for a refused day.
 * @param {ReturnType<typeof settleDaily>} outcome what settleDaily gave
 * @returns {{key: string, vars: {coins: number, n: number}}} string key and its values
 */
export function dailyTag(outcome) {
  const vars = { coins: outcome?.coins ?? 0, n: outcome?.streak ?? 0 };
  if (!outcome || outcome.refused) return { key: 'daily.tag.refused', vars };
  if (!outcome.reached) return { key: 'daily.tag.missed', vars };
  return { key: outcome.milestone ? 'daily.tag.reachedMilestone' : 'daily.tag.reached', vars };
}

/**
 * The coin list of a daily result screen: the round's Keep working pay plus the goal reward and a milestone's extra
 * coins as their own rows (screens/screen-logic.js coinRows: dailyBonus, streakBonus), with the total to match.
 * @param {object|null} payout the round's payout (app-logic.js applyRound)
 * @param {ReturnType<typeof settleDaily>} outcome what settleDaily gave
 * @returns {object|null} the payout to show
 */
export function dailyPayout(payout, outcome) {
  if (!payout || !outcome?.reached || outcome.refused) return payout;
  const total = (Number.isFinite(payout.total) ? payout.total : 0) + outcome.coins + outcome.bonus;
  return { ...payout, dailyBonus: outcome.coins, streakBonus: outcome.bonus, total };
}
