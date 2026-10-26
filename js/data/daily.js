// The daily challenge (T8.5, SPEC D24): one fixed customer per calendar day in Keep working, the same for every player
// (seeded from the local date, no server), with a goal, a bigger reward once per day and a streak. Every number and
// string key lives here (first guesses, tune freely); the rules that use them are in game/daily-logic.js.
// No DOM, no clock, no Math.random.

/**
 * The numbers:
 * - reward: coins for a reached goal, once per day, flat (NOT cut by the Keep working pay factor, KEEP_WORKING_PAY).
 *   The normal Keep working pay for the face comes on top, reached or not.
 * - clockFactor: "Beat the clock" gives the hurry limit (game/requests.js hurryLimit) times this, rounded up to whole
 *   seconds, so the daily clock is a little kinder than a normal hurry customer.
 * - comboLength: the chain "Combo master" asks for (the longest career combo request, requests.js comboLength).
 * - goldCount: the golden bumps on a "Gold rush" face; all of them must be popped without an Ow.
 * - regularChance: the chance the day's customer is a named regular (else a walk-in with a generated face).
 * - seedBase: walk-in face generator seeds start here (Keep working uses 50000 + k, so they never meet).
 * - faceSeedBase: the face seeds (bump layout) of the days start from this number.
 * - tries: how many candidate faces a day may look at to find one where its goal can be done (Combo master needs
 *   enough quick bumps); the first good one is taken, so a date always gives the same face.
 * - epoch: day 0 of the goal rotation (any fixed date; the rotation only needs one).
 */
export const DAILY = {
  reward: 40, clockFactor: 1.15, comboLength: 5, goldCount: 3, regularChance: 0.25, seedBase: 70000,
  faceSeedBase: 9_000_000, tries: 12, epoch: '2026-01-01',
};

/** The goal ids, in the order of the rotation table (each one comes once in every five days, never twice in a row). */
export const DAILY_GOAL_IDS = ['stars3', 'noOw', 'clock', 'combo', 'gold'];

/**
 * The goals. Fields: nameKey = the short name (menu line, intro pill, header chip), lineKey = what to do (intro note,
 * with {seconds} or {n}), twists = the twists the day may roll for this goal (data/twists.js ids; 'hurry' only for the
 * clock goal: the clock IS the hurry twist). "No Ows" always brings sensitive skin, so it is not the same day as
 * "3 stars" (in this game 3 stars already means no Ow).
 */
export const DAILY_GOALS = {
  stars3: { id: 'stars3', nameKey: 'daily.goal.stars3.name', lineKey: 'daily.goal.stars3.line', twists: ['fidgety', 'ticklish'] },
  noOw: { id: 'noOw', nameKey: 'daily.goal.noOw.name', lineKey: 'daily.goal.noOw.line', twists: ['sensitive'] },
  clock: { id: 'clock', nameKey: 'daily.goal.clock.name', lineKey: 'daily.goal.clock.line', twists: ['hurry'] },
  combo: { id: 'combo', nameKey: 'daily.goal.combo.name', lineKey: 'daily.goal.combo.line', twists: ['fidgety', 'ticklish', 'sensitive'] },
  gold: { id: 'gold', nameKey: 'daily.goal.gold.name', lineKey: 'daily.goal.gold.line', twists: ['fidgety', 'ticklish', 'sensitive'] },
};

/**
 * Streak milestones: reaching a streak of `days` (days in a row with the goal reached) pays `coins` once more on top
 * and puts `stamp` on that day's face in the Face album (string key ui.album.stamp.<stamp>). They come again each
 * time a new streak reaches them.
 */
export const STREAK_MILESTONES = [
  { days: 3, coins: 15, stamp: 'streak3' },
  { days: 7, coins: 40, stamp: 'streak7' },
  { days: 14, coins: 80, stamp: 'streak14' },
];
