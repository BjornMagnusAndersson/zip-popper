// Every number of the economy as one table (T3.2, approved in docs/ECONOMY.md; SPEC D12, D13, D15, D16).
// Prices raised about 1.5x (tools) and 2x (studio, outfit) after the owner played chapter 5 and found money too easy.
// All numbers are first guesses and get tuned after playing, so they live ONLY here. The rules that use them are in
// game/economy.js. No DOM, no text shown to the player: item names on screen come from the string table.

/** Coins tipped for 0, 1, 2 and 3 stars (index = stars). A failed or unfinished customer gets stars 0, so no tip. */
export const STAR_TIPS = [0, 0, 4, 10]; // was [0, 0, 6, 15] before R7: the owner found the pay a bit much

/** Coins for finishing a customer's request (ECONOMY section 1). Missed = nothing lost. */
export const REQUEST_BONUS = { gentle: 10, hurry: 10, combo: 15 };
/** Request bonus when the request kind is not named (just "done"). */
export const REQUEST_BONUS_DEFAULT = 10;

/** Reputation points earned per star of a finished customer. */
export const REPUTATION_PER_STAR = 1;

/** Reputation lost by "Next customer" after a fail: 1st skip in a row, 2nd, 3rd, 4th and later (the last stays). */
export const SKIP_PENALTIES = [2, 3, 4, 5];

/** Reputation needed for tier 1, 2 and 3 (index = tier - 1). Tiers decide which shop items may be bought. */
export const TIER_THRESHOLDS = [0, 15, 35];

/** Reputation a finished studio scrub job gives, once per upgrade (ECONOMY section 3). */
export const SCRUB_REPUTATION = 1;

/**
 * The shop. Fields:
 * - price: coins (0 with story: true = given by the story, never bought).
 * - tier: the reputation tier needed to buy it.
 * - kind: 'tool' (unlocks toolId), 'studio' (a studio upgrade: needs the wipe-and-scrub job after buying, D12-1) or
 *   'outfit' (worn by the player: no scrub job).
 * - toolId: for kind 'tool', the id in data/tools.js that gets unlocked.
 * - strip: the milestone comic strip id that plays when the item is ready (bought, and scrubbed if it is a studio item).
 * - story: true = only given by the story (not for sale).
 */
export const SHOP_ITEMS = {
  cottonPad: { price: 45, tier: 1, kind: 'tool', toolId: 'cottonPad' },
  tweezers: { price: 75, tier: 1, kind: 'tool', toolId: 'tweezers', strip: 'mtweezers' },
  noseStrip: { price: 60, tier: 1, kind: 'tool', toolId: 'noseStrip' },
  patch: { price: 60, tier: 1, kind: 'tool', toolId: 'patch' },
  warmCloth: { price: 90, tier: 1, kind: 'tool', toolId: 'warmCloth' },
  gloves: { price: 0, tier: 1, kind: 'tool', toolId: 'gloves', story: true }, // end of chapter 5 (hygiene scare)
  lamp: { price: 100, tier: 1, kind: 'studio', strip: 'mlamp' },
  plant: { price: 80, tier: 1, kind: 'studio', strip: 'mplant' },
  leakFix: { price: 150, tier: 1, kind: 'studio', strip: 'mleak' }, // owner 2026-10-28: paint and furniture never fixed the drip
  apron: { price: 120, tier: 1, kind: 'outfit', strip: 'mapron' },
  chair: { price: 200, tier: 2, kind: 'studio' },
  wallPaint: { price: 240, tier: 2, kind: 'studio' },
  scrubs: { price: 300, tier: 3, kind: 'outfit' },
  sign: { price: 160, tier: 3, kind: 'studio' },
};

/** Every shop item id, in table order. */
export const SHOP_ITEM_IDS = Object.keys(SHOP_ITEMS);

/**
 * Skill by use (D12-3, D13, D34): what each mastery level of a bump type gives. Level 0 = Rookie, 5 = Master; the
 * level names are strings ui.skill.level<N>. How many clean pops a level needs is in MASTERY_STEPS (per kind).
 * - holdFactor: multiplies the bump's starting hold time (0.60 is the floor).
 * - roughReduction: how much lower the bump's rough-press chance is (0.2 = 20 percent lower).
 */
export const MASTERY_LEVELS = [
  { holdFactor: 1, roughReduction: 0 },
  { holdFactor: 0.92, roughReduction: 0.05 },
  { holdFactor: 0.85, roughReduction: 0.1 },
  { holdFactor: 0.77, roughReduction: 0.18 },
  { holdFactor: 0.68, roughReduction: 0.26 },
  { holdFactor: 0.6, roughReduction: 0.35 },
];

/**
 * Clean pops (no Ow) of one bump type needed for levels 1 to 5 (D34, owner 2026-10-28: harder, per kind). The common
 * kinds need the most, the rare ones fewer, so each kind takes roughly as long. A career gives about 45 whiteheads, 40
 * reds, 15 blackheads, 10 hairs, 7 big ones, 6 horns and 3 gold ones, so nothing is a Master by the ending; Master
 * comes in Keep working (about 3 whiteheads and reds, 1 blackhead and big one, under 1 of the rest per customer).
 */
export const MASTERY_STEPS = {
  whitehead: [8, 20, 40, 70, 110],
  red: [8, 20, 40, 70, 110],
  blackhead: [4, 10, 20, 35, 55],
  big: [4, 10, 20, 35, 55],
  hair: [2, 5, 10, 16, 24],
  horn: [2, 5, 10, 16, 24],
  gold: [2, 5, 10, 16, 24],
};

/** The top mastery level (Master). */
export const MASTER_LEVEL = MASTERY_LEVELS.length - 1;

/** The mastery level that starts the milestone strip `mmastery` the first time any bump type reaches it. */
export const MASTERY_STRIP_LEVEL = 3;

/**
 * Irritation difficulty by customer number (D15, ECONOMY section 7): customers up to `upTo` get `value`.
 * Later customers keep the last value.
 */
export const DIFFICULTY_BANDS = [
  { upTo: 3, value: 0.8 },
  { upTo: 6, value: 1.0 },
  { upTo: 9, value: 1.2 },
  { upTo: 12, value: 1.35 },
  { upTo: 15, value: 1.5 },
];

/**
 * How the irritation meter reads the difficulty in a customer round (SPEC D27c, R5-pop sweep B75): a cold pop (a red,
 * big or horn bump squeezed without the warm cloth) is multiplied by the difficulty only up to coldPopMax, so the late
 * customers stay touchy about Ows (those still use the full difficulty) but a careful player who never makes one can
 * finish at a normal pace without the warm cloth; and the meter starts to calm calmDelay seconds after the last rise
 * (data/tools.js IRRITATION.calmDelay, 5 s, is only the fallback outside a round).
 */
export const ROUND_IRRITATION = { coldPopMax: 1, calmDelay: 1.5 };

/** Difficulty of the chapter 2 and 3 special customers, and of anything outside the career. */
export const SPECIAL_DIFFICULTY = 1.0;
/** Difficulty New Game Plus starts at (after v1). */
export const NEW_GAME_PLUS_DIFFICULTY = 1.8;

/**
 * Keep working (T5.4, SPEC D23): the side mode after the ending. Every coin line of a customer (pops, tool bonuses,
 * patch tips, nose strip, tip, combo, request) is multiplied by this, rounded to whole coins, at least 1 per clean pop.
 */
export const KEEP_WORKING_PAY = 0.6;
/**
 * Irritation difficulty of every Keep working customer: the same as the career's last block (customers 13 to 15,
 * CAREER_BANDS in data/chapters.js, ECONOMY section 7). DIFFICULTY_BANDS above is only used by
 * economy.js difficultyFor (tests), not by the real career.
 */
export const KEEP_WORKING_DIFFICULTY = 1.5;

/** The milestone strip played on the first 3-star customer. */
export const STRIP_FIRST_THREE_STAR = 'mstar';
/** The milestone strip played when a bump type first reaches MASTERY_STRIP_LEVEL. */
export const STRIP_FIRST_MASTERY = 'mmastery';
