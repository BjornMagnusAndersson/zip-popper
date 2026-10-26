// One customer round in the pop scene (T3.1b), the pure part: how a customer's face is set up from the chapter's
// customer spec (game/chapter-logic.js customerSpec), how skill by use (game/economy.js holdFactor, roughReduction)
// and the customer's difficulty (ECONOMY.md section 7) change the numbers, which tools are in the tool bar, how the
// request banner reads, and what the game gets back when the round ends (onFinish). pop-mode.js is the DOM glue.
// No DOM, no audio, no timers here, so Node can test it.
import { FACE_BUMPS, holdTime } from './logic.js';
import { toolBarIds, START_TOOL } from './tool-logic.js';
import { isImplemented } from '../data/bumps.js';
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
 * the nose strip, blackheads are allowed and there is no clown nose in the way (without the tool a strip could never
 * come off and the round would never end). Decoys follow the existing layout rules unless switched off.
 * @param {{customer?: {face?: object}, bumpCount?: number, allowedTypes?: string[], unlockedTools?: string[]|null,
 *   decoys?: boolean}} o the customer (customerSpec customer), bump count, allowed kinds, owned tools, decoys allowed
 * @returns {{spec: object, count: number, allowed: string[], strip: boolean, decoys: boolean}} the layout setup
 */
export function roundFaceSetup({ customer, bumpCount, allowedTypes, unlockedTools = null, decoys = true } = {}) {
  const spec = customer?.face && typeof customer.face === 'object' ? customer.face : {};
  const count = Number.isFinite(bumpCount) ? clamp(Math.round(bumpCount), ROUND_BUMPS_MIN, ROUND_BUMPS_MAX) : FACE_BUMPS;
  const allowed = allowedKinds(allowedTypes);
  const clownNose = (spec.accessories ?? []).includes('clown-nose');
  const strip = roundTools(unlockedTools).includes('noseStrip') && allowed.includes('blackhead') && !clownNose;
  return { spec, count, allowed, strip, decoys: decoys !== false };
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
 * @param {{round: object, elapsedSeconds: number, cleanBumpTypes?: string[], popTypes?: string[],
 *   failChoice?: 'again'|'next'|null, request?: object|null}} o the scoring.js round state, the popping time in
 *   seconds (start to the last bump, or to the fail), the kinds of the clean pops (no Ow on that bump), the kinds of
 *   every pop, the fail choice and the customer's request (or null)
 * @returns {{state: object, elapsedSeconds: number, cleanBumpTypes: string[], popTypes: string[], owCount: number,
 *   failed: boolean, failChoice: 'again'|'next'|null, request: 'gentle'|'hurry'|'combo'|false, stars: number}} payload
 */
export function finishPayload({ round, elapsedSeconds, cleanBumpTypes = [], popTypes = [], failChoice = null, request = null }) {
  const failed = Boolean(round?.failed);
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  return {
    state: round,
    elapsedSeconds: elapsed,
    cleanBumpTypes: [...cleanBumpTypes],
    popTypes: [...popTypes],
    owCount: round?.owCount ?? 0,
    failed,
    failChoice: failed && (failChoice === 'again' || failChoice === 'next') ? failChoice : null,
    request: requestResult(request ?? null, round, elapsed),
    stars: starsFor(round),
  };
}
