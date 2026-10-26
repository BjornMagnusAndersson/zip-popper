// One customer round in the pop scene (T3.1b), the pure part: how a customer's face is set up from the chapter's
// customer spec (game/chapter-logic.js customerSpec), how skill by use (game/economy.js holdFactor, roughReduction)
// and the customer's difficulty (ECONOMY.md section 7) change the numbers, which tools are in the tool bar, how the
// request banner reads, and what the game gets back when the round ends (onFinish). pop-mode.js is the DOM glue.
// No DOM, no audio, no timers here, so Node can test it.
import { FACE_BUMPS, holdTime, faceGeometry, layoutFace } from './logic.js';
import { toolBarIds, START_TOOL, bestToolFor, effectiveHold } from './tool-logic.js';
import { isImplemented } from '../data/bumps.js';
import { makeRng } from '../data/customers.js';
import { describeRequest, requestProgress, requestResult } from '../game/requests.js';
import { starsFor } from '../game/scoring.js';

/** Fewest and most bumps a round face may have (SPEC D4 says 6 to 10; the tutorial husband has 3). */
export const ROUND_BUMPS_MIN = 1;
export const ROUND_BUMPS_MAX = 12;
/** Difficulty is kept inside these limits, so a typo in the data can never make the meter instant or endless. */
export const DIFFICULTY_MIN = 0.25;
export const DIFFICULTY_MAX = 4;
/** Seconds the healed, glowing face stays on screen before onFinish is called (shorter with reduced motion). */
export const END_PAUSE = 0.9;
export const END_PAUSE_REDUCED = 0.3;
/**
 * The share of customers (who could have one) that get a nose strip on the nose: about 2 in 5, decided by the face
 * seed so a reload or Try again shows the same face. Before this every customer had one once the tool was bought.
 */
export const NOSE_STRIP_CHANCE = 0.4;
/** Added to the face seed for the nose strip's coin toss, so the toss does not follow the layout's own numbers. */
const STRIP_SEED_SALT = 4409;

/**
 * A positive number, or a fallback when it is not one.
 * @param {unknown} v the value
 * @param {number} fallback used when v is not a positive finite number
 * @returns {number} the number
 */
const positive = (v, fallback) => (Number.isFinite(v) && v > 0 ? v : fallback);

/**
 * Keep a number between two limits.
 * @param {number} x the number
 * @param {number} lo lowest
 * @param {number} hi highest
 * @returns {number} the clamped number
 */
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Seconds of holding a kind of bump needs for this player: the starting hold time (data/bumps.js) times the mastery
 * factor for that kind (game/economy.js holdFactor; 1 when the kind has none or the factor is not a positive number).
 * @param {string} type a bump id
 * @param {Object<string, number>} [holdFactors] bump id -> factor (1 = no skill yet, 0.6 = the floor)
 * @returns {number} seconds
 */
export function scaledHold(type, holdFactors = {}) {
  return holdTime(type) * positive(holdFactors?.[type], 1);
}

/**
 * How much of the rough-press chance is left for a kind of bump with this player's mastery: 1 - reduction
 * (game/economy.js roughReduction, 0 to 0.35). A missing or broken reduction counts as 0 (the chance stays as it is).
 * @param {string} type a bump id
 * @param {Object<string, number>} [roughReductions] bump id -> reduction 0..1
 * @returns {number} the multiplier, 0..1
 */
export function roughMultiplier(type, roughReductions = {}) {
  const r = Number(roughReductions?.[type]);
  return 1 - (Number.isFinite(r) ? clamp(r, 0, 1) : 0);
}

/**
 * The bumps of a face with this player's skill put in: each gets its hold time (scaledHold) and roughMul, the part
 * of the rough-press chance that is left (roughMultiplier; the engine also uses it for how much a cold pop
 * irritates, because that is the same roughness). Returns new objects; the list given is not changed.
 * @param {{type: string}[]} pimples bumps from layoutFace
 * @param {Object<string, number>} [holdFactors] bump id -> hold factor
 * @param {Object<string, number>} [roughReductions] bump id -> rough reduction
 * @returns {object[]} the bumps with hold and roughMul
 */
export function applyMastery(pimples, holdFactors = {}, roughReductions = {}) {
  return pimples.map((p) => ({ ...p, hold: scaledHold(p.type, holdFactors), roughMul: roughMultiplier(p.type, roughReductions) }));
}

/**
 * The hold seconds of the real bumps of a customer's face (B5): lays the face out the way the pop scene will (same seed,
 * same bump kinds, same count) at a nominal size and puts the player's mastery in. The kinds of the bumps do not depend
 * on the screen size, so the seconds are the same as on the real stage; only where the bumps sit differs.
 * @param {{customer?: {face?: object}, bumpCount?: number, allowedTypes?: string[], unlockedTools?: string[]|null,
 *   decoys?: boolean, seed: number, holdFactors?: Object<string, number>}} o the same arguments as startRound
 * @returns {number[]} hold seconds of every bump, scaled by mastery
 */
export function faceBumpHolds(o = {}) {
  return applyMastery(roundPimples(o), o.holdFactors ?? {}).map((p) => p.hold);
}

/**
 * The bumps of a customer's face, laid out as the pop scene will (same seed, kinds and count) at a nominal size. The
 * nose strip is left off: it moves bumps a little but never changes their kinds, so the hold times stay the same.
 * @param {{customer?: {face?: object}, bumpCount?: number, allowedTypes?: string[], unlockedTools?: string[]|null,
 *   decoys?: boolean, seed: number, boss?: object|null}} o as for faceBumpHolds (boss = a boss spec's boss field, T8.4)
 * @returns {object[]} the bumps (logic.js layoutFace pimples)
 */
function roundPimples({ customer, bumpCount, allowedTypes, unlockedTools = null, decoys = true, seed, boss = null } = {}) {
  const setup = roundFaceSetup({ customer, bumpCount, allowedTypes, unlockedTools: roundTools(unlockedTools), decoys, boss });
  const face = faceGeometry(360, 480, setup.spec);
  // A boss face (T8.4) brings its own bump mix and grown horns.
  return layoutFace({ seed, face, count: setup.count, strip: false, allowed: setup.allowed, decoys: setup.decoys, mix: setup.mix, grown: setup.grown }).pimples;
}

/**
 * The hold seconds a hurry request is measured against: every bump of the face with the best tool she owns for it
 * (tool-logic.js bestToolFor and effectiveHold) at her mastery, on a cold face (the warm cloth is NOT assumed).
 * @param {object} o the same arguments as faceBumpHolds
 * @returns {number[]} seconds per bump
 */
export function hurryHolds(o = {}) {
  const tools = roundTools(o.unlockedTools ?? null);
  return applyMastery(roundPimples(o), o.holdFactors ?? {}).map((p) => effectiveHold(p.hold, bestToolFor(p.type, tools), p.type, 0));
}

/**
 * Whether a face wins the nose strip coin toss (NOSE_STRIP_CHANCE), decided by its seed alone.
 * @param {number} seed the face seed
 * @returns {boolean} true for about 2 faces in 5 (false when the seed is not a number)
 */
export function stripChance(seed) {
  return Number.isFinite(seed) && makeRng(Math.floor(seed) + STRIP_SEED_SALT)() < NOSE_STRIP_CHANCE;
}

/**
 * How a customer's difficulty changes the irritation meter (ECONOMY.md section 7, SPEC D15): every rise (an Ow or a
 * cold pop) is multiplied by the difficulty, and the meter calms at 1 / difficulty of its normal speed. So 1.0 is
 * the meter as it was built, 0.6 is very forgiving and 1.3 is touchy. Not a number = 1.
 * @param {number} difficulty from chapter-logic.js customerSpec (or economy.js difficultyFor)
 * @returns {{rise: number, drain: number}} multipliers for the rise and the calming speed
 */
export function irritationScales(difficulty) {
  const d = clamp(positive(difficulty, 1), DIFFICULTY_MIN, DIFFICULTY_MAX);
  return { rise: d, drain: 1 / d };
}

/**
 * The tools that get a button in a round: the built tools with a button (in table order) that the player owns.
 * Fingers are always there, even when the list leaves them out. No list = every built tool (the old demo).
 * @param {string[]|null|undefined} unlockedTools tool ids the player owns (save field unlockedTools)
 * @returns {string[]} tool ids for the tool bar, fingers first
 */
export function roundTools(unlockedTools) {
  const all = toolBarIds({ demo: true });
  if (!Array.isArray(unlockedTools)) return all;
  return all.filter((id) => id === START_TOOL || unlockedTools.includes(id));
}

/**
 * The bump kinds a round face may use: the built ones from the list, each once, in the order given. When none is
 * usable it falls back to whiteheads, so a face always has something to pop.
 * @param {string[]|null|undefined} allowedTypes from customerSpec
 * @returns {string[]} bump ids
 */
export function allowedKinds(allowedTypes) {
  const list = (Array.isArray(allowedTypes) ? allowedTypes : []).filter((t, i, a) => isImplemented(t) && a.indexOf(t) === i);
  return list.length ? list : ['whitehead'];
}

/**
 * How to lay out the face of a customer round (hand the result to faceGeometry and layoutFace): the customer's face
 * parts, exactly bumpCount bumps of the allowed kinds, and a blackhead strip on the nose only when the player owns
 * the nose strip, blackheads are allowed, there is no clown nose in the way, the customer is not in a hurry (a hurry
 * clock leaves no time for a bonus) and the face seed's coin toss says so (stripChance: about 2 in 5). The strip is
 * optional: the round goes on to the wipe without peeling it (logic.js popStepOver); peeling it pays a bonus.
 * Decoys follow the existing layout rules unless switched off.
 * A boss or event customer (T8.4, data/bosses.js bossSpec `boss`) brings its own bump mix (exactly those bumps; the
 * setup then has `mix`, and the count is its sum), may have the nose strip always on (stripAlways, not over a clown
 * nose) and grown Evil Horns (the setup's `grown` = their size factor). Those two fields are only there for a boss.
 * @param {{customer?: {face?: object}, bumpCount?: number, allowedTypes?: string[], unlockedTools?: string[]|null,
 *   decoys?: boolean, seed?: number, request?: {type: string}|null, boss?: {mix?: Object<string, number>,
 *   stripAlways?: boolean, grownHorns?: number}|null}} o the customer (customerSpec customer), bump
 *   count, allowed kinds, owned tools, decoys allowed, the face seed (no seed = no strip), the request and the boss
 * @returns {{spec: object, count: number, allowed: string[], strip: boolean, decoys: boolean,
 *   mix?: Object<string, number>, grown?: number}} the layout setup
 */
export function roundFaceSetup({ customer, bumpCount, allowedTypes, unlockedTools = null, decoys = true, seed, request = null, boss = null } = {}) {
  const spec = customer?.face && typeof customer.face === 'object' ? customer.face : {};
  const mix = bossMixOf(boss);
  const mixCount = mix ? Object.values(mix).reduce((a, n) => a + n, 0) : 0;
  const count = mix ? clamp(mixCount, ROUND_BUMPS_MIN, ROUND_BUMPS_MAX)
    : Number.isFinite(bumpCount) ? clamp(Math.round(bumpCount), ROUND_BUMPS_MIN, ROUND_BUMPS_MAX) : FACE_BUMPS;
  const allowed = allowedKinds(mix ? Object.keys(mix) : allowedTypes);
  const clownNose = (spec.accessories ?? []).includes('clown-nose');
  const strip = boss?.stripAlways === true ? !clownNose
    : roundTools(unlockedTools).includes('noseStrip') && allowed.includes('blackhead') && !clownNose
      && request?.type !== 'hurry' && stripChance(seed);
  const out = { spec, count, allowed, strip, decoys: decoys !== false };
  if (mix) out.mix = mix;
  if (Number.isFinite(boss?.grownHorns) && boss.grownHorns > 0) out.grown = boss.grownHorns;
  return out;
}

/**
 * A boss's bump mix, cleaned: built kinds with a whole count above 0 only (T8.4).
 * @param {{mix?: Object<string, number>}|null|undefined} boss the spec's boss field
 * @returns {Object<string, number>|null} kind -> how many, or null for no usable mix
 */
function bossMixOf(boss) {
  const raw = boss?.mix && typeof boss.mix === 'object' ? boss.mix : null;
  if (!raw) return null;
  const out = {};
  for (const [k, n] of Object.entries(raw)) if (isImplemented(k) && Number.isFinite(n) && n >= 1) out[k] = Math.floor(n);
  return Object.keys(out).length ? out : null;
}

/**
 * The tip on the hint line while a nose strip is on the face (optional, it pays a bonus): shown when she owns the
 * nose strip, the strip is still on (not peeled) and not stuck on yet, and the strip is not the tool in hand (that
 * tool's own hint says how it works).
 * @param {{stripOnFace: boolean, stuck?: boolean, owned: boolean, toolInHand: string}} o the face and the tool bar now
 * @returns {string|null} the string key, or null for no strip tip
 */
export function stripHintKey({ stripOnFace, stuck = false, owned, toolInHand }) {
  return stripOnFace && !stuck && owned && toolInHand !== 'noseStrip' ? 'pop.hint.stripBonus' : null;
}

/**
 * The hint line during the wipe step (B55: the nose strip stays usable until the cream starts, and so does its hint).
 * While the strip is still on: stuck on = 'peel it for the bonus'; not stuck, owned and not in hand = the strip bonus
 * tip; the nose strip in hand = its own hint. Otherwise the wipe hint (with the cotton pad tip when she owns the pad
 * but holds something else, B13 round 2b).
 * @param {{stripOnFace: boolean, stuck?: boolean, owned: boolean, toolInHand: string, padOwned?: boolean}} o the face
 *   and the tool bar now (owned = she owns the nose strip)
 * @returns {string} the string key
 */
export function wipeHintKey({ stripOnFace, stuck = false, owned, toolInHand, padOwned = false }) {
  if (stripOnFace && stuck) return 'pop.hint.stripPeel';
  if (stripOnFace && owned && toolInHand === 'noseStrip') return 'tool.noseStrip.hint';
  const strip = stripHintKey({ stripOnFace, stuck, owned, toolInHand });
  if (strip) return strip;
  return padOwned && toolInHand !== 'cottonPad' ? 'pop.hint.wipePad' : 'pop.hint.wipe';
}

/**
 * What the request banner shows now: the request's text (requests.js describeRequest), whether it is still open,
 * done or missed (requestProgress), and for a hurry request the whole seconds left. Null when there is no request.
 * @param {{type: string, n?: number, timeLimit?: number}|null} request from requests.js pickRequest
 * @param {object} roundState a scoring.js round state
 * @param {number} elapsedSeconds seconds since the round started
 * @returns {{key: string, vars: object, status: 'open'|'done'|'failed', secondsLeft: number|null}|null} the banner
 */
export function requestView(request, roundState, elapsedSeconds) {
  const text = describeRequest(request);
  if (!text) return null;
  const status = requestProgress(request, roundState, elapsedSeconds);
  const secondsLeft = request.type === 'hurry' && status === 'open'
    ? Math.max(0, Math.ceil(positive(request.timeLimit, 0) - Math.max(0, Number(elapsedSeconds) || 0))) : null;
  return { ...text, status, secondsLeft };
}

/**
 * What onFinish gets when a round ends (finished, or failed and the player picked Try again or Next customer).
 * @param {{round: object, elapsedSeconds: number, cleanBumpTypes?: string[], cleanBumpTools?: string[],
 *   popTypes?: string[], failChoice?: 'again'|'next'|null, request?: object|null, patches?: number,
 *   stripPeeled?: boolean}} o the scoring.js round state, the
 *   popping time in seconds (start to the last bump, or to the fail), the kinds of the clean pops (no Ow on that bump),
 *   the tool of each clean pop (same order; for the cotton pad's pay bonus, may be left out), the kinds of every pop,
 *   the fail choice, the customer's request (or null), how many popped spots got a patch and whether the nose strip
 *   was peeled off (both for their pay, B13 round 2c; may be left out)
 * @returns {{state: object, elapsedSeconds: number, cleanBumpTypes: string[], cleanBumpTools: string[], popTypes: string[],
 *   patches: number, stripPeeled: boolean, owCount: number, failed: boolean, failChoice: 'again'|'next'|null,
 *   request: 'gentle'|'hurry'|'combo'|false, stars: number}} payload
 */
export function finishPayload({
  round, elapsedSeconds, cleanBumpTypes = [], cleanBumpTools = [], popTypes = [], failChoice = null, request = null,
  patches = 0, stripPeeled = false,
}) {
  const failed = Boolean(round?.failed);
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  return {
    state: round,
    elapsedSeconds: elapsed,
    cleanBumpTypes: [...cleanBumpTypes],
    cleanBumpTools: [...cleanBumpTools],
    popTypes: [...popTypes],
    patches: Number.isFinite(patches) ? Math.max(0, Math.floor(patches)) : 0,
    stripPeeled: stripPeeled === true,
    owCount: round?.owCount ?? 0,
    failed,
    failChoice: failed && (failChoice === 'again' || failChoice === 'next') ? failChoice : null,
    request: requestResult(request ?? null, round, elapsed),
    stars: starsFor(round),
  };
}
