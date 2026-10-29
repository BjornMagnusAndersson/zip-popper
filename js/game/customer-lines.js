// Customer line picking (R6-lines, SPEC D28): which intro line, second line and result lines a customer says this
// visit, and the "Hurry, hurry, hurry!" customer with a real, easy clock. Pure functions, no DOM, no Math.random:
// a line is picked from the face seed and from the small line memory in the save (save.customerLines), which only
// changes when a visit ends (app-logic.js applyRound). So a reload in the middle of a round, Try again and the result
// screen all show the same lines, and the same customer never says the same line two visits in a row.
// Rules (fix for B46 and B84):
// - A named regular's old intro is said on the FIRST visit only; later visits pick a new reason or a "back again" line.
// - A walk-in whose name she has met before never says "First time here..."; she may say "Back again!".
// - Lines that sound like a clock (the old deadline jokes, "please be quick!") only come when the customer really has a
//   clock (a hurry request or the daily "Beat the clock"); everyone else gets a calm aside as the second line.
// The numbers and key counts are in data/customer-lines.js.

import { REGULARS, GENERIC_COUNTS, genericKey, makeRng } from '../data/customers.js';
import { CHAPTERS } from '../data/chapters.js';
import {
  REGULAR_LINE_COUNTS, OLD_STYLE_KINDS, WALK_IN_LINES, HUSBAND_ASIDES, HURRY_LINE, HURRY_LINE_TIERS, AGAIN_LINES,
} from '../data/customer-lines.js';
import { hurryLimit } from './requests.js';
import { progressFromSave } from './chapter-logic.js';

/** A different number per line slot, so the intro and the result lines of one visit do not follow each other. */
const SALT = { intro: 11, second: 23, happy: 37, ok: 41, ow: 53 };

/** The reaction kinds a result line can be. */
const REACTION_KINDS = ['happy', 'ok', 'ow'];

/** The most customers the line memory keeps (8 regulars and a few dozen walk-in names fit easily). */
export const LINE_MEMO_MAX = 60;

/**
 * Every string key a named regular has for one kind of line, in order (the first intro/happy/ok/ow/deadline key is
 * the old one with no number, data/customer-lines.js).
 * @param {string} id the regular's id (pete, nils ...)
 * @param {string} kind intro, back, happy, ok, ow, deadline or aside
 * @returns {string[]} string keys
 */
export function regularKeys(id, kind) {
  const count = REGULAR_LINE_COUNTS[kind] ?? 0;
  const old = OLD_STYLE_KINDS.includes(kind);
  const out = [];
  for (let i = 1; i <= count; i += 1) out.push(old && i === 1 ? `customer.${id}.${kind}` : `customer.${id}.${kind}.${i}`);
  return out;
}

/**
 * The new walk-in keys of one kind (customer.walkin.<kind>.1 to N).
 * @param {'intro'|'back'|'aside'} kind the kind
 * @returns {string[]} string keys
 */
export function walkInKeys(kind) {
  const count = Number.isInteger(WALK_IN_LINES[kind]) ? WALK_IN_LINES[kind] : 0;
  return Array.from({ length: count }, (_, i) => `customer.walkin.${kind}.${i + 1}`);
}

/**
 * The old generic keys of one kind (customer.generic.<kind>.1 to N), leaving out the given numbers.
 * @param {string} kind a kind of data/customers.js GENERIC_COUNTS
 * @param {number[]} [skip] line numbers to leave out
 * @returns {string[]} string keys
 */
function genericKeys(kind, skip = []) {
  const out = [];
  for (let n = 1; n <= (GENERIC_COUNTS[kind] ?? 0); n += 1) if (!skip.includes(n)) out.push(genericKey(kind, n));
  return out;
}

/**
 * The "Hurry, hurry, hurry!" intro keys (customer.hurry.intro.1 to N).
 * @returns {string[]} string keys
 */
export function hurryIntroKeys() {
  return Array.from({ length: HURRY_LINE.introCount }, (_, i) => `customer.hurry.intro.${i + 1}`);
}

/**
 * The plain "hello again" intro keys (customer.again.1 to N) for a return after a visit that went wrong (SPEC D32f).
 * @returns {string[]} string keys
 */
export function againKeys() {
  return Array.from({ length: AGAIN_LINES.count }, (_, i) => `customer.again.${i + 1}`);
}

/**
 * The intro keys that are only for a first visit (a regular's old intro, the walk-in "First time here" lines).
 * @returns {string[]} string keys
 */
export function firstVisitKeys() {
  return [...REGULARS.map((r) => regularKeys(r.id, 'intro')[0]), ...WALK_IN_LINES.firstOnly.map((n) => genericKey('intro', n))];
}

/**
 * The keys that sound like a clock: only for a customer who really has one (B84).
 * @returns {string[]} string keys
 */
export function clockKeys() {
  return [
    ...REGULARS.flatMap((r) => regularKeys(r.id, 'deadline')), ...genericKeys('deadline'),
    ...WALK_IN_LINES.clockOnly.map((n) => genericKey('intro', n)), ...hurryIntroKeys(),
    'chapter.0.husband.deadline', 'chapter.2.husband.deadline',
  ];
}

/**
 * Every string key this file can hand out (for the tests and docs/CUSTOMER-KEYS.md).
 * @returns {string[]} string keys, no doubles
 */
export function allLineKeys() {
  const keys = [];
  for (const r of REGULARS) for (const kind of Object.keys(REGULAR_LINE_COUNTS)) keys.push(...regularKeys(r.id, kind));
  for (const kind of ['intro', 'back', 'aside']) keys.push(...walkInKeys(kind));
  for (const kind of ['intro', 'deadline', ...REACTION_KINDS]) keys.push(...genericKeys(kind));
  keys.push(...hurryIntroKeys(), ...againKeys(), ...Object.values(HUSBAND_ASIDES));
  return [...new Set(keys)];
}

/**
 * Who a customer is for the line memory: a named regular's id, a walk-in's name key plus their face seed (B89: two
 * strangers with the same name are two people, the album keeps them apart the same way), or null for the husband (his
 * lines are fixed story). Old saves kept walk-ins under the plain name key; those entries are no longer looked up (the
 * album, or the new memory after one more visit, tells who she has met) and fall out of the memory as it fills.
 * @param {{id?: string, regular?: boolean, nameKey?: string}|null|undefined} customer the customer
 * @param {number} [seed] the face seed of this visit (the album's seed too); without it the customer's own id is used
 * @returns {string|null} the memory id
 */
export function lineId(customer, seed) {
  if (!customer) return null;
  if (REGULARS.some((r) => r.id === customer.id)) return customer.id;
  if (!customer.regular && typeof customer.nameKey === 'string' && customer.nameKey) {
    const who = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : String(customer.id ?? '');
    return `${customer.nameKey}#${who}`;
  }
  return null;
}

/**
 * Whether a named regular was already passed in the career story (chapter 5 roster), so a later visit is a return.
 * Their own career slot is their first visit (unless the memory or the album says otherwise).
 * @param {object} save the save
 * @param {string} id the regular's id
 * @param {{chapter?: number, n?: number, keepWorking?: boolean, daily?: string}} [step] the step being played
 * @returns {boolean} true = met in the career already
 */
function careerMet(save, id, step) {
  const career = CHAPTERS.find((c) => c.kind === 'career');
  const slot = career ? career.customers.findIndex((e) => e.who === 'regular' && e.id === id) + 1 : 0;
  if (slot < 1) return false;
  if (step?.keepWorking && !step?.daily) return true; // Keep working comes after the whole career (a daily step may not)
  if (!step?.daily && step?.chapter === career.id && step?.n === slot) return false; // this IS the career visit
  if (save?.endingSeen) return true;
  const p = progressFromSave(save);
  return p.chapter === career.id && p.customersDone >= slot;
}

/**
 * Whether she has met this customer before: the line memory says so, the Face album has them (old saves from before
 * the memory), or (a named regular) the career story is past their visit.
 * @param {object} save the save
 * @param {object} customer the customer
 * @param {object} [step] the step being played
 * @param {number} [seed] the face seed of this visit (tells two walk-ins with one name apart)
 * @returns {boolean} true = a return visit
 */
export function metBefore(save, customer, step = null, seed = undefined) {
  const id = lineId(customer, seed);
  if (!id) return false;
  if ((save?.customerLines?.[id]?.visits ?? 0) > 0) return true;
  const album = Array.isArray(save?.albumFaces) ? save.albumFaces : [];
  if (REGULARS.some((r) => r.id === id)) return album.some((e) => e?.id === id) || careerMet(save, id, step);
  // A walk-in is the same person only with the same name AND face seed (a different face with the same name is new).
  return album.some((e) => e?.nameKey === customer.nameKey && (Number.isFinite(seed) ? e?.seed === Math.floor(seed) : false));
}

/**
 * Picks one key from a list with the face seed, leaving out the key said last visit (when there is another).
 * @param {string[]} pool the keys to choose from
 * @param {number} seed the face seed
 * @param {number} salt a number per line slot (SALT)
 * @param {string|undefined} avoid the key said last time
 * @returns {string|null} a key, or null for an empty pool
 */
export function pickLine(pool, seed, salt, avoid) {
  const list = pool.length > 1 && avoid ? pool.filter((k) => k !== avoid) : pool;
  if (!list.length) return null;
  const r = makeRng((Math.floor(Number(seed)) || 0) * 31 + salt)();
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

/**
 * The lines a customer says this visit.
 * @param {object} save the save (its line memory and album)
 * @param {object} customer the customer (data/customers.js shape)
 * @param {{seed: number, step?: object, timed?: boolean, hurryLine?: object|null}} o seed = the face seed;
 *   step = the step being played; timed = the customer really has a clock (a hurry request); hurryLine = the hurry
 *   walk-in's tier info (hurryLineRequest) when this is one, else null
 * @returns {{id: string|null, introKey: string, secondKey: string|null, resultKeys: {happy: string, ok: string, ow: string},
 *   met: boolean, hurryLine: object|null}} the keys (id = the line memory id, null = not remembered)
 */
export function customerLines(save, customer, { seed, step = null, timed = false, hurryLine = null }) {
  const id = lineId(customer, seed);
  if (!id) { // the husband: his own story lines; the clock joke only with a clock
    const aside = HUSBAND_ASIDES[customer?.id] ?? null;
    return {
      id: null, introKey: customer?.introKey, secondKey: timed ? customer?.deadlineKey ?? null : aside,
      resultKeys: { ...(customer?.resultKeys ?? {}) }, met: false, hurryLine,
    };
  }
  const memo = save?.customerLines?.[id] ?? {};
  const met = metBefore(save, customer, step, seed);
  const regular = REGULARS.some((r) => r.id === id);
  let intros;
  let seconds;
  const results = {};
  if (regular) {
    intros = met ? [...regularKeys(id, 'intro').slice(1), ...regularKeys(id, 'back')] : [regularKeys(id, 'intro')[0]];
    seconds = regularKeys(id, timed ? 'deadline' : 'aside');
    for (const r of REACTION_KINDS) results[r] = regularKeys(id, r);
  } else {
    const skip = [...(timed ? [] : WALK_IN_LINES.clockOnly), ...(met ? WALK_IN_LINES.firstOnly : [])];
    intros = met ? [...walkInKeys('back'), ...walkInKeys('intro')] : [...genericKeys('intro', skip), ...walkInKeys('intro')];
    seconds = timed ? genericKeys('deadline') : walkInKeys('aside');
    for (const r of REACTION_KINDS) results[r] = genericKeys(r);
  }
  if (met && memo.failed) intros = againKeys(); // last visit they stormed off: no "last time was amazing" (D32f)
  if (hurryLine) intros = hurryIntroKeys();
  const resultKeys = {};
  for (const r of REACTION_KINDS) resultKeys[r] = pickLine(results[r], seed, SALT[r], memo.result);
  return {
    id, introKey: pickLine(intros, seed, SALT.intro, memo.intro), secondKey: pickLine(seconds, seed, SALT.second, memo.second),
    resultKeys, met, hurryLine,
  };
}

/**
 * The save after a visit ended (finished or skipped; not after Try again): the customer's line memory counts one more
 * visit and remembers what was said, so next time is a return visit with other lines.
 * @param {object} save the save
 * @param {{id: string|null, introKey: string, secondKey: string|null}|null|undefined} lines what customerLines gave
 * @param {string|undefined} [resultKey] the result line shown (none when the customer stormed off)
 * @param {boolean} [failed] the customer stormed off (the next visit then starts with a plain "hello again", D32f)
 * @returns {object} a new save (the same one when there is nothing to remember)
 */
export function recordLines(save, lines, resultKey, failed = false) {
  if (!lines?.id) return save;
  const memo = { ...(save?.customerLines ?? {}) };
  const old = memo[lines.id] ?? {};
  delete memo[lines.id]; // put back at the end: the most recent customer is the last one
  const entry = { visits: (old.visits ?? 0) + 1 };
  if (lines.introKey) entry.intro = lines.introKey;
  if (lines.secondKey) entry.second = lines.secondKey;
  const result = resultKey ?? old.result;
  if (result) entry.result = result;
  if (failed) entry.failed = true;
  memo[lines.id] = entry;
  const ids = Object.keys(memo);
  for (const drop of ids.slice(0, Math.max(0, ids.length - LINE_MEMO_MAX))) delete memo[drop];
  return { ...save, customerLines: memo };
}

/**
 * The id of a hurry-line tier: the one asked for when it is known, else the version 1 default (HURRY_LINE.tier).
 * @param {unknown} id a tier id, e.g. from step.hurryTier
 * @returns {string} a key of HURRY_LINE_TIERS
 */
export function hurryTierId(id) {
  return typeof id === 'string' && Object.hasOwn(HURRY_LINE_TIERS, id) ? id : HURRY_LINE.tier;
}

/**
 * Whether a face seed rolls the "Hurry, hurry, hurry!" customer at a tier (about tier.chance of the seeds).
 * @param {number} seed the face seed
 * @param {string} [tier] a tier id
 * @returns {boolean} true = this customer is in a hurry
 */
export function rollsHurryLine(seed, tier) {
  const t = HURRY_LINE_TIERS[hurryTierId(tier)];
  return makeRng((Math.floor(Number(seed)) || 0) + HURRY_LINE.seedOffset)() < t.chance;
}

/**
 * The clock of a hurry-line customer: the normal hurry limit (requests.js hurryLimit) times the tier's limitScale,
 * in whole seconds.
 * @param {number[]} holds hold seconds of every bump with her best owned tool at her mastery (round-logic.js hurryHolds)
 * @param {string} [tier] a tier id
 * @returns {number} seconds (0 when there are no holds)
 */
export function hurryLineLimit(holds, tier) {
  const t = HURRY_LINE_TIERS[hurryTierId(tier)];
  return Math.ceil(hurryLimit(holds) * t.limitScale - 1e-9);
}

/**
 * The hurry request of a hurry-line customer, or null when this customer is not one (not allowed here, no hold time on
 * the face, or the roll says no). It is a normal hurry request (so the pill, banner, music and bonus all work) with
 * line: true and the tier's id and missPenalty.
 * @param {{allowed: boolean, holds: number[], seed: number, tier?: string}} o allowed = this customer may get it
 *   (app-logic.js roundArgs says who); holds = the face's hold seconds; seed = the face seed; tier = a tier id
 * @returns {{type: 'hurry', timeLimit: number, line: true, tier: string, missPenalty: number}|null} the request
 */
export function hurryLineRequest({ allowed, holds, seed, tier }) {
  const id = hurryTierId(tier);
  if (!allowed || !rollsHurryLine(seed, id)) return null;
  const timeLimit = hurryLineLimit(holds, id);
  if (!(timeLimit > 0)) return null;
  return { type: 'hurry', timeLimit, line: true, tier: id, missPenalty: HURRY_LINE_TIERS[id].missPenalty };
}
