// Customer line variants (R6-lines, SPEC D28): which string keys a customer may say on the intro (first line and
// second line) and on the result screen, and the "Hurry, hurry, hurry!" walk-in with a real (easy) clock.
// Pure data: every player-facing text is a string KEY in strings/en.json (docs/CUSTOMER-KEYS.md lists them).
// The rules that pick a line (seeded, never Math.random) are in game/customer-lines.js.
//
// Regular keys (customer.<id>.<kind>): the FIRST key of a kind is the old one with no number (customer.pete.intro),
// the next ones add .2, .3 ... (customer.pete.intro.2). back and aside start at .1 (they had no old key).
// - intro: the old intro is said on the FIRST visit only; intro.2 and up are new reasons to come in, for return visits.
// - back: "back again" lines, return visits only.
// - happy / ok / ow: result screen reactions (any visit).
// - deadline: the clock jokes ("wheels up soon!"): ONLY when the customer really has a clock (B84).
// - aside: a calm second line for a customer with no clock.

/** How many keys each regular has per kind (the first intro/happy/ok/ow/deadline key is the old one with no number). */
export const REGULAR_LINE_COUNTS = { intro: 7, back: 7, happy: 5, ok: 5, ow: 5, deadline: 2, aside: 4 };

/** Kinds whose first key has no number (they existed before R6-lines); back and aside count from .1. */
export const OLD_STYLE_KINDS = ['intro', 'happy', 'ok', 'ow', 'deadline'];

/**
 * Walk-in (stranger) lines. Old generic keys customer.generic.<kind>.N stay (data/customers.js GENERIC_COUNTS); new
 * ones are customer.walkin.<kind>.N.
 * - firstOnly: generic intro numbers that only fit a first visit ("First time here...", "I heard you're the best").
 * - clockOnly: generic intro numbers that sound like a clock ("please be quick!"): only with a real clock.
 * - intro: how many new walk-in intros (customer.walkin.intro.N), any visit.
 * - back: "back again" lines for a walk-in whose name she has met before (customer.walkin.back.N).
 * - aside: calm second lines for a walk-in with no clock (customer.walkin.aside.N); with a clock the old
 *   customer.generic.deadline.N jokes are used.
 */
export const WALK_IN_LINES = { firstOnly: [2, 6], clockOnly: [8], intro: 12, back: 10, aside: 14 };

/** The husband (chapters 0 and 2) keeps his lines; his second line is this aside unless he has a clock (never in v1). */
export const HUSBAND_ASIDES = { husband: 'chapter.0.husband.aside', husbandArmor: 'chapter.2.husband.aside' };

/**
 * The "Hurry, hurry, hurry!" customer (owner request 2026-10-27): about 1 in 20 of the customers who could ask for a
 * request say one of these intros AND get a real clock (the hurry request: the "In a hurry" pill, the countdown
 * banner, the hectic music; a missed clock just loses the request bonus, as any missed request).
 * - tier: the tier used when nothing else asks for one ('easy' in version 1).
 * - seedOffset: added to the face seed for the roll (so it does not follow the request roll, which uses seed + 101).
 * - introCount: intro keys customer.hurry.intro.1 to N.
 * Who can get it: a customer that may ask for a request (career customers from 4, every Keep working customer), with
 * no twist, not a boss or event, not the daily challenge, not the career's fixed hurry customer (chapter 5 customer 7).
 */
export const HURRY_LINE = { tier: 'easy', seedOffset: 4243, introCount: 6 };

/**
 * The hurry-line tiers: the ONE table for how hard the hurry walk-in is.
 * - chance: share of the customers who can get it (0.15 here, so about 1 in 20 of all customers in practice).
 * - limitScale: the clock is the normal hurry limit (game/requests.js hurryLimit) times this, rounded up to whole
 *   seconds. easy 2.5 = two and a half times the normal hurry time (the normal one is already at least 1.3 x the
 *   fastest possible); the ideal bot (tests/pop-bot.mjs, or its patient model when popping fast makes the customer
 *   storm off) uses under half of it on every face checked (tests/r6-lines.test.mjs).
 * - missPenalty: reputation lost when the clock runs out (0 = only the request bonus is lost, like any request).
 * HOOK for the later, harder game (SPEC D20 New Game Plus / D21 harder runs, D28): add or tune a tier here and pass
 * its id as step.hurryTier (app-logic.js roundArgs reads it); no rule code needs to change. 'hard' is not used in v1.
 */
export const HURRY_LINE_TIERS = {
  easy: { chance: 0.15, limitScale: 2.5, missPenalty: 0 }, // 0.15 of those who can roll it is about 1 in 20 of all Keep working customers (most carry a twist)
  hard: { chance: 0.25, limitScale: 1, missPenalty: 1 },
};
