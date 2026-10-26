// Every number of the economy as one table (T3.2, approved in docs/ECONOMY.md; SPEC D12, D13, D15, D16).
// All numbers are first guesses and get tuned after playing, so they live ONLY here. The rules that use them are in
// game/economy.js. No DOM, no text shown to the player: item names on screen come from the string table.

/** Coins tipped for 0, 1, 2 and 3 stars (index = stars). A failed or unfinished customer gets stars 0, so no tip. */
export const STAR_TIPS = [0, 0, 6, 15];

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
  cottonPad: { price: 30, tier: 1, kind: 'tool', toolId: 'cottonPad' },
  tweezers: { price: 50, tier: 1, kind: 'tool', toolId: 'tweezers', strip: 'mtweezers' },
  noseStrip: { price: 40, tier: 1, kind: 'tool', toolId: 'noseStrip' },
  patch: { price: 40, tier: 1, kind: 'tool', toolId: 'patch' },
  warmCloth: { price: 60, tier: 1, kind: 'tool', toolId: 'warmCloth' },
  gloves: { price: 0, tier: 1, kind: 'tool', toolId: 'gloves', story: true }, // end of chapter 5 (hygiene scare)
  lamp: { price: 50, tier: 1, kind: 'studio', strip: 'mlamp' },
  plant: { price: 40, tier: 1, kind: 'studio', strip: 'mplant' },
  apron: { price: 60, tier: 1, kind: 'outfit', strip: 'mapron' },
  chair: { price: 100, tier: 2, kind: 'studio' },
  wallPaint: { price: 120, tier: 2, kind: 'studio' },
  scrubs: { price: 150, tier: 3, kind: 'outfit' },
  sign: { price: 80, tier: 3, kind: 'studio' },
};

/** Every shop item id, in table order. */
export const SHOP_ITEM_IDS = Object.keys(SHOP_ITEMS);

/**
 * Skill by use (D12-3, D13): per bump type, the number of CLEAN pops (no Ow) for each level.
 * - pops: clean pops of that type needed to reach the level.
 * - holdFactor: multiplies the bump's starting hold time (0.60 is the floor).
 * - roughReduction: how much lower the bump's rough-press chance is (0.2 = 20 percent lower).
 */
export const MASTERY_LEVELS = [
  { pops: 0, holdFactor: 1, roughReduction: 0 },
  { pops: 5, holdFactor: 0.85, roughReduction: 0 },
  { pops: 15, holdFactor: 0.72, roughReduction: 0.2 },
  { pops: 30, holdFactor: 0.6, roughReduction: 0.35 },
];

/** The mastery level that starts the milestone strip `mmastery` the first time any bump type reaches it. */
export const MASTERY_STRIP_LEVEL = 2;

/**
 * Irritation difficulty by customer number (D15, ECONOMY section 7): customers up to `upTo` get `value`.
 * Later customers keep the last value.
 */
export const DIFFICULTY_BANDS = [
  { upTo: 3, value: 0.6 },
  { upTo: 6, value: 0.8 },
  { upTo: 9, value: 1.0 },
  { upTo: 12, value: 1.15 },
  { upTo: 15, value: 1.3 },
];

/** Difficulty of the chapter 2 and 3 special customers, and of anything outside the career. */
export const SPECIAL_DIFFICULTY = 1.0;
/** Difficulty New Game Plus starts at (after v1). */
export const NEW_GAME_PLUS_DIFFICULTY = 1.5;

/** The milestone strip played on the first 3-star customer. */
export const STRIP_FIRST_THREE_STAR = 'mstar';
/** The milestone strip played when a bump type first reaches MASTERY_STRIP_LEVEL. */
export const STRIP_FIRST_MASTERY = 'mmastery';
