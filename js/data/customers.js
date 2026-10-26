// Customer data: the eight named regulars, the lists of face parts, and a seeded generator for all other customers.
// Everything player-facing is a string KEY (see docs/CUSTOMER-KEYS.md), never literal text. No DOM and no Math.random here.
// Strings use {name} where the player's name is addressed; core/strings.js t() fills it in.

/** Face part ids. The face drawing code (game/faces.js) maps each id to art. */
export const FACE_PARTS = {
  shape: ['round', 'oval', 'square', 'heart', 'long', 'chubby'],
  skinTone: ['fair', 'light', 'tan', 'olive', 'brown', 'deep'],
  hair: ['bald', 'short', 'curly', 'long', 'bun', 'ponytail', 'mohawk', 'afro', 'bob'],
  hairColor: ['black', 'brown', 'blonde', 'ginger', 'grey', 'blue', 'pink'],
  eyes: ['round', 'wide', 'sleepy', 'sparkly', 'squint', 'tiny'],
  brows: ['flat', 'arched', 'thick', 'worried', 'thin'],
  mouth: ['smile', 'flat', 'wobbly', 'grin', 'small', 'open'],
  // Accessories are picked 0 to 2 at a time; a face has an array of these ids (empty = none).
  accessories: ['glasses', 'sunglasses', 'bowtie', 'earrings', 'hat', 'tiara', 'clown-nose', 'pilot-cap', 'flower', 'moustache', 'beanie', 'headband', 'veil', 'scarf'],
};

/** The bump types a customer face may carry (the seed's five, plus the Evil Horn and the ingrown hair from T1.3). */
export const BUMP_TYPES = ['whitehead', 'red', 'blackhead', 'big', 'gold', 'horn', 'hair'];

/** The reaction levels each customer has a line for. */
export const REACTIONS = ['happy', 'ok', 'ow'];

/** How many generic string keys exist per kind: customer.generic.<kind>.1 to .N. */
export const GENERIC_COUNTS = { name: 10, intro: 12, deadline: 8, happy: 6, ok: 6, ow: 6 };

/** Bump count limits for one face (SPEC D4). */
export const BUMP_MIN = 6;
export const BUMP_MAX = 10;

/** Lowest and highest chapter that has customers in version 1 (SPEC section 4). */
export const FIRST_CUSTOMER_CHAPTER = 2;
export const LAST_CUSTOMER_CHAPTER = 5;

/**
 * Builds one regular's entry; the string keys follow the scheme customer.<id>.<part>.
 * @param {string} id short id, also used in the keys
 * @param {number} chapter chapter (2 to 5) where the player first meets them
 * @param {number} bumps number of bumps on the face (6 to 10)
 * @param {string[]} bumpTypes allowed bump types
 * @param {object} face face spec using ids from FACE_PARTS
 * @returns {object} the customer entry
 */
function regular(id, chapter, bumps, bumpTypes, face) {
  // Builds the text key for one part of this customer, like customer.<id>.name.
  const k = (part) => `customer.${id}.${part}`;
  return {
    id,
    regular: true,
    nameKey: k('name'),
    introKey: k('intro'),
    resultKeys: { happy: k('happy'), ok: k('ok'), ow: k('ow') },
    deadlineKey: k('deadline'),
    face,
    bumps,
    bumpTypes,
    chapter,
  };
}

/** The eight named regulars, in the order they are first met. */
export const REGULARS = [
  regular('pete', 2, 6, ['whitehead', 'red', 'blackhead'], {
    shape: 'square', skinTone: 'light', hair: 'short', hairColor: 'grey',
    eyes: 'wide', brows: 'thick', mouth: 'flat', accessories: ['pilot-cap', 'moustache'],
  }),
  regular('nils', 2, 7, ['whitehead', 'red'], {
    shape: 'long', skinTone: 'fair', hair: 'curly', hairColor: 'ginger',
    eyes: 'tiny', brows: 'worried', mouth: 'wobbly', accessories: ['glasses'],
  }),
  regular('cora', 3, 7, ['whitehead', 'red', 'blackhead'], {
    shape: 'oval', skinTone: 'tan', hair: 'bun', hairColor: 'brown',
    eyes: 'sleepy', brows: 'arched', mouth: 'smile', accessories: ['scarf', 'earrings'],
  }),
  regular('greta', 3, 8, ['whitehead', 'blackhead', 'big'], {
    shape: 'chubby', skinTone: 'light', hair: 'bun', hairColor: 'grey',
    eyes: 'sparkly', brows: 'thin', mouth: 'grin', accessories: ['glasses', 'flower'],
  }),
  regular('penny', 5, 8, ['whitehead', 'red', 'big'], {
    shape: 'heart', skinTone: 'olive', hair: 'ponytail', hairColor: 'pink',
    eyes: 'sparkly', brows: 'arched', mouth: 'open', accessories: ['tiara'],
  }),
  regular('dave', 5, 9, ['red', 'blackhead', 'big'], {
    shape: 'square', skinTone: 'brown', hair: 'short', hairColor: 'black',
    eyes: 'round', brows: 'thick', mouth: 'grin', accessories: ['bowtie'],
  }),
  regular('gus', 5, 9, ['whitehead', 'red', 'big', 'gold'], {
    shape: 'round', skinTone: 'fair', hair: 'short', hairColor: 'blonde',
    eyes: 'wide', brows: 'worried', mouth: 'wobbly', accessories: ['veil'],
  }),
  regular('cleo', 5, 10, ['whitehead', 'red', 'blackhead', 'big', 'gold'], {
    shape: 'chubby', skinTone: 'deep', hair: 'afro', hairColor: 'blue',
    eyes: 'round', brows: 'arched', mouth: 'grin', accessories: ['clown-nose'],
  }),
];

/**
 * A small seeded random number generator (mulberry32), so the same seed always gives the same numbers.
 * @param {number} seed any number; it is turned into an unsigned 32-bit integer
 * @returns {() => number} function returning the next number from 0 up to (not including) 1
 */
export function makeRng(seed) {
  let a = Number(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks one item from a list with the given random function.
 * @param {() => number} rng random function from makeRng
 * @param {any[]} list items to choose from
 * @returns {any} one item
 */
function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * Picks a whole number from low to high, both included.
 * @param {() => number} rng random function from makeRng
 * @param {number} low smallest value
 * @param {number} high largest value
 * @returns {number} the number
 */
function between(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}

/**
 * Builds the key for a generic line, e.g. customer.generic.intro.7.
 * @param {string} kind one of the keys of GENERIC_COUNTS
 * @param {number} n line number from 1 to the count
 * @returns {string} string-table key
 */
export function genericKey(kind, n) {
  return `customer.generic.${kind}.${n}`;
}

/**
 * Which bump types a generic customer may carry in a chapter: more kinds appear in later chapters.
 * @param {number} chapter chapter number (2 to 5)
 * @returns {string[]} allowed bump types
 */
export function bumpTypesForChapter(chapter) {
  if (chapter <= 2) return ['whitehead', 'red', 'blackhead'];
  if (chapter <= 3) return ['whitehead', 'red', 'blackhead', 'big'];
  return ['whitehead', 'red', 'blackhead', 'big', 'gold'];
}

/**
 * Builds a generic customer from a seed: the same seed and chapter always give the same customer.
 * Later chapters give more bumps and more bump types. Text is only keys.
 * @param {number} seed integer seed
 * @param {{chapter?: number}} [options] chapter (2 to 5, default 2)
 * @returns {object} customer with id, nameKey, introKey, resultKeys, deadlineKey, face, bumps, bumpTypes, chapter
 */
export function makeCustomer(seed, { chapter = 2 } = {}) {
  const ch = Math.min(LAST_CUSTOMER_CHAPTER, Math.max(FIRST_CUSTOMER_CHAPTER, Math.round(Number(chapter)) || FIRST_CUSTOMER_CHAPTER));
  const rng = makeRng(seed);
  const accessories = [];
  const howMany = between(rng, 0, 2);
  while (accessories.length < howMany) {
    const a = pick(rng, FACE_PARTS.accessories);
    // Random faces never get the clown nose (owner: it reads as a giant bump); only Clown Cleo wears one.
    if (a !== 'clown-nose' && !accessories.includes(a)) accessories.push(a);
  }
  const face = {
    shape: pick(rng, FACE_PARTS.shape),
    skinTone: pick(rng, FACE_PARTS.skinTone),
    hair: pick(rng, FACE_PARTS.hair),
    hairColor: pick(rng, FACE_PARTS.hairColor),
    eyes: pick(rng, FACE_PARTS.eyes),
    brows: pick(rng, FACE_PARTS.brows),
    mouth: pick(rng, FACE_PARTS.mouth),
    accessories,
  };
  // Bump count: chapter 2 gets 6 to 7, chapter 5 gets 8 to 10 (never outside 6 to 10).
  const low = Math.min(BUMP_MAX, BUMP_MIN + Math.floor((ch - FIRST_CUSTOMER_CHAPTER) * 0.67));
  const high = Math.min(BUMP_MAX, BUMP_MIN + 1 + (ch - FIRST_CUSTOMER_CHAPTER));
  // Picks a random generic line of the given kind (name, intro and so on).
  const line = (kind) => genericKey(kind, between(rng, 1, GENERIC_COUNTS[kind]));
  return {
    id: `generic-${Number(seed) >>> 0}`,
    regular: false,
    nameKey: line('name'),
    introKey: line('intro'),
    resultKeys: { happy: line('happy'), ok: line('ok'), ow: line('ow') },
    deadlineKey: line('deadline'),
    face,
    bumps: between(rng, low, high),
    bumpTypes: bumpTypesForChapter(ch),
    chapter: ch,
  };
}

/**
 * The regulars first met in a chapter.
 * @param {number} chapter chapter number
 * @returns {object[]} matching entries from REGULARS
 */
export function regularsForChapter(chapter) {
  return REGULARS.filter((c) => c.chapter === chapter);
}

/**
 * Every string key this file can hand out (regulars and all generic lines), used by tests and the key list.
 * @returns {string[]} string-table keys
 */
export function allCustomerKeys() {
  const keys = [];
  for (const c of REGULARS) keys.push(c.nameKey, c.introKey, ...REACTIONS.map((r) => c.resultKeys[r]), c.deadlineKey);
  for (const [kind, count] of Object.entries(GENERIC_COUNTS)) {
    for (let n = 1; n <= count; n++) keys.push(genericKey(kind, n));
  }
  return keys;
}
