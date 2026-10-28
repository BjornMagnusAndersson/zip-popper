// Chapter data (T4.4): the six story chapters of version 1 in order, with their opening strip, what kind of chapter
// they are, who the customers are, and what the end of chapter 5 does (SPEC section 4, ECONOMY.md section 6, STORY.md).
// Pure data and tiny lookups. No DOM, no text shown to the player: every title and line is a string KEY (strings/en.json).
// The rules that walk through these chapters live in game/chapter-logic.js.

/** The two small special modes inside the story (built by later jobs): ch1 torchlight pop, ch4 phone scroll. */
export const SPECIAL_MODES = ['torchlight', 'phoneScroll'];

/**
 * The tutorial customer of chapter 0: the husband on the sofa. He has no entry in customers.js, so his lines are
 * chapter keys (chapter.0.husband.*). Same shape as a customer from data/customers.js. Three whitehead bumps only.
 */
export const HUSBAND = {
  id: 'husband',
  regular: true,
  nameKey: 'chapter.0.husband.name',
  introKey: 'chapter.0.husband.intro',
  resultKeys: { happy: 'chapter.0.husband.happy', ok: 'chapter.0.husband.ok', ow: 'chapter.0.husband.ow' },
  deadlineKey: 'chapter.0.husband.deadline',
  // His own look from the comics (pop/characters.js): tan skin, black hair with a curl, black beard, blue hoodie.
  face: { character: 'husband', accessories: [] },
  bumps: 3,
  bumpTypes: ['whitehead'],
  chapter: 0,
  reluctant: true, // owner 2026-10-28: he does NOT want this; stern face all round, protest lines after (the ban follows)
};

/**
 * The husband in his armor for chapter 2 (Sir Zitsalot): the only customer of that chapter, a small pop through the
 * gap in the armor, which he refuses: the first pop does not happen, he slams the visor and runs off unharmed (escape).
 * Two whitehead bumps. His lines are chapter keys (chapter.2.husband.*). The pop scene draws him
 * in his helmet (T2.4); the same armor option (plumes, cozy hat, cracks) serves the last boss later.
 */
export const HUSBAND_ARMOR = {
  id: 'husbandArmor',
  regular: true,
  nameKey: 'chapter.2.husband.name',
  introKey: 'chapter.2.husband.intro',
  resultKeys: { happy: 'chapter.2.husband.happy', ok: 'chapter.2.husband.ok', ow: 'chapter.2.husband.ow' },
  deadlineKey: 'chapter.2.husband.deadline',
  // His comic look in his knight's helmet, visor up, one red plume (as in strip 2); the bumps sit in the open front.
  face: { character: 'husband', armor: { plumes: 1 }, accessories: [] },
  bumps: 2,
  bumpTypes: ['whitehead'],
  chapter: 2,
  escape: true, // owner 2026-10-27: the armor wins; the first pop is refused and he runs off unharmed (no pay, no retry)
};

/**
 * The five blocks of the career chapter (ECONOMY.md sections 6 and 7). from/to are customer numbers (1 based, both
 * included). bumps = [fewest, most] bumps per face. types = every bump type allowed in the block (adds up block by
 * block). newTypes = what is new in this block (so the screen can hint at it). difficulty multiplies how much a cold
 * pop adds to the irritation meter. requests = whether a customer may ask for a request (from customer 4).
 */
export const CAREER_BANDS = [
  { from: 1, to: 3, bumps: [5, 6], types: ['whitehead', 'red'], newTypes: ['whitehead', 'red'], difficulty: 0.8, requests: false },
  { from: 4, to: 6, bumps: [6, 7], types: ['whitehead', 'red', 'blackhead'], newTypes: ['blackhead'], difficulty: 1.0, requests: true },
  { from: 7, to: 9, bumps: [7, 8], types: ['whitehead', 'red', 'blackhead', 'big', 'gold'], newTypes: ['big', 'gold'], difficulty: 1.2, requests: true },
  { from: 10, to: 12, bumps: [8, 9], types: ['whitehead', 'red', 'blackhead', 'big', 'gold', 'hair', 'horn'], newTypes: ['hair', 'horn'], difficulty: 1.35, requests: true },
  { from: 13, to: 15, bumps: [9, 10], types: ['whitehead', 'red', 'blackhead', 'big', 'gold', 'hair', 'horn'], newTypes: [], difficulty: 1.5, requests: true },
];

/**
 * Who walks in during Keep working (T5.4, SPEC D23), the endless side mode after the ending:
 * - regularChance: the chance a customer comes up as a named regular (data/customers.js), the rest are strangers;
 *   a regular never follows a regular (so the same face never comes twice in a row), which leaves about 1 customer
 *   in 5 a regular.
 * - seedBase: strangers get the seeded face seedBase + customer number (far from the career roster's 1000 + n).
 */
export const KEEP_WORKING_ROSTER = { regularChance: 0.3, seedBase: 50000 };

/** The shop items that open when the career starts (ECONOMY.md section 3); gloves are NOT here, they are free at the end. */
export const CAREER_SHOP_TOOLS = ['cottonPad', 'tweezers', 'noseStrip', 'patch', 'warmCloth'];

/**
 * A roster entry says who customer number n of a chapter is:
 * - {who: 'husband'}: the tutorial husband (HUSBAND above); {who: 'husbandArmor'}: the husband in armor (chapter 2)
 * - {who: 'regular', id}: a named regular from data/customers.js
 * - {who: 'generic', seed}: a face built by the seeded generator makeCustomer(seed, {chapter})
 * @param {number} count how many customers
 * @param {number} baseSeed seeds are baseSeed + n
 * @param {Object<number, string>} regulars customer number (1 based) to regular id
 * @param {Object<number, number>} [seeds] customer number to its own seed, in place of baseSeed + n
 * @returns {object[]} the roster
 */
function makeRoster(count, baseSeed, regulars, seeds = {}) {
  const roster = [];
  for (let n = 1; n <= count; n++) {
    roster.push(regulars[n] ? { who: 'regular', id: regulars[n] } : { who: 'generic', seed: seeds[n] ?? baseSeed + n });
  }
  return roster;
}

/**
 * The chapters, in play order. Fields:
 * - id: 0 to 5. titleKey: string key. strip: id of the opening comic strip (data/comics).
 * - kind: 'tutorial' | 'special' | 'armor' | 'support' | 'career'.
 * - special: for kind 'special', the id of the small special mode played after the strip (no customers).
 * - customers: roster (see makeRoster); empty for special chapters.
 * - difficulty: the irritation difficulty of every customer (career chapters use CAREER_BANDS instead).
 * - after: steps that come after the last customer or the special mode. Chapter 0: the second part of strip 0, the ban
 *   (type 'bridge', SPEC D32a). Chapter 4: the second part of strip 4, the idea (SPEC D32b), then the bridge strip "The
 *   plan" (STORY.md strip 4b: she finds and rents the place between "I will do it for a living!" and opening day).
 *   Chapter 5: the hygiene scare (gloves unlock), the teaser strip, then the "To be continued" screen.
 * - shop: tool ids that become buyable when the chapter starts.
 */
export const CHAPTERS = [
  {
    id: 0, titleKey: 'chapter.0.title', strip: 'strip0', kind: 'tutorial',
    // SPEC D32a: strip 0 up to the moment before the pop, the round (the first pop), then the ban (strip0b).
    customers: [{ who: 'husband' }], difficulty: 0.6, after: [{ type: 'bridge', strip: 'strip0b' }], shop: [],
  },
  {
    id: 1, titleKey: 'chapter.1.title', strip: 'strip1', kind: 'special', special: 'torchlight',
    customers: [], difficulty: 1.0, after: [], shop: [],
  },
  {
    id: 2, titleKey: 'chapter.2.title', strip: 'strip2', kind: 'armor',
    customers: [{ who: 'husbandArmor' }], difficulty: 0.8, after: [], shop: [],
  },
  {
    id: 3, titleKey: 'chapter.3.title', strip: 'strip3', kind: 'support',
    customers: [], difficulty: 1.0, after: [], shop: [],
  },
  {
    id: 4, titleKey: 'chapter.4.title', strip: 'strip4', kind: 'special', special: 'phoneScroll',
    // After the phone scroll: the rest of strip 4, the idea at 2:51 am (strip4b, SPEC D32b), then the bridge strip "The
    // plan" (a save already in chapter 5 never gets them in the story; they can be replayed from the Comics list).
    customers: [], difficulty: 1.0, after: [{ type: 'bridge', strip: 'strip4b' }, { type: 'bridge', strip: 'plan' }], shop: [],
  },
  {
    id: 5, titleKey: 'chapter.5.title', strip: 'strip5', kind: 'career',
    // 15 customers: the support-group friend first, the named regulars spread out, Pete, Dave and Cleo close the chapter.
    // Customer 7 gets seed 1016 (R8): seed 1007 drew the same name as customer 2 (a different face), so the line memory
    // took him for a return visit and he said "Back again".
    customers: makeRoster(15, 1000, { 1: 'cora', 5: 'penny', 8: 'gus', 13: 'pete', 14: 'dave', 15: 'cleo' }, { 7: 1016 }),
    difficulty: 1.0,
    after: [
      { type: 'scare', unlocks: ['gloves'] },
      { type: 'teaser', strip: 'books' },
      { type: 'end', textKey: 'chapter.toBeContinued' },
    ],
    shop: CAREER_SHOP_TOOLS,
  },
];

/** The last chapter of version 1. */
export const LAST_CHAPTER = CHAPTERS.length - 1;

/**
 * Looks up a chapter by number.
 * @param {number} id chapter number (0 to 5)
 * @returns {object|null} the chapter, or null for an unknown id
 */
export function getChapter(id) {
  return Number.isInteger(id) && id >= 0 && id < CHAPTERS.length ? CHAPTERS[id] : null;
}

/**
 * The career block a customer number belongs to.
 * @param {number} n customer number, 1 based
 * @returns {object|null} the entry from CAREER_BANDS, or null outside 1 to 15
 */
export function careerBand(n) {
  return CAREER_BANDS.find((b) => n >= b.from && n <= b.to) ?? null;
}
