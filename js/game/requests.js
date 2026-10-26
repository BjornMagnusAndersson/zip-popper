// Customer requests (T3.2b, SPEC D12-4, docs/ECONOMY.md section 5): which request a customer asks for, whether it is
// still open, done or failed, and which text to show. The coins for a done request live in data/economy-data.js
// (REQUEST_BONUS) and are paid by economy.js roundPayout.
// No DOM, no audio, not wired into the game yet. Style as in scoring.js: pure functions, never change their input.

import { makeRng } from '../data/customers.js';
import { allHandled } from './scoring.js';

/** The request kinds, the same words roundPayout understands. */
export const REQUEST_TYPES = ['gentle', 'hurry', 'combo'];
/** Chance (0 to 1) that a customer who may ask for a request does ask: about 1 in 3. */
export const REQUEST_CHANCE = 1 / 3;
/** Hurry limit = this many times the sum of the face's hold times (fair at any skill level). */
export const HURRY_FACTOR = 1.8;
/** Combo chain length N: starts at COMBO_MIN at customer COMBO_FIRST_CUSTOMER, grows by 1 every COMBO_STEP_EVERY customers, stops at COMBO_MAX. */
export const COMBO_MIN = 3;
export const COMBO_MAX = 5;
export const COMBO_FIRST_CUSTOMER = 4;
export const COMBO_STEP_EVERY = 4;

/**
 * The chain length a combo request asks for at a career customer number: 3 at customer 4, 4 from 8, 5 from 12.
 * @param {number} customerNumber 1 based @returns {number} N, from COMBO_MIN to COMBO_MAX
 */
export function comboLength(customerNumber) {
  const n = Number.isFinite(customerNumber) ? customerNumber : COMBO_FIRST_CUSTOMER;
  const grown = COMBO_MIN + Math.floor((n - COMBO_FIRST_CUSTOMER) / COMBO_STEP_EVERY);
  return Math.min(COMBO_MAX, Math.max(COMBO_MIN, grown));
}

/**
 * Picks the request a customer asks for, or null. Same seed and inputs always give the same answer.
 * None unless the customer spec allows requests; then about 1 customer in 3 asks. 'combo' is only offered when the face
 * has at least N bumps; 'hurry' needs some hold time on the face and gets a limit of HURRY_FACTOR times the hold-time sum.
 * @param {{requestAllowed?: boolean, bumpCount?: number}} customerSpec from chapter-logic.js customerSpec
 * @param {number[]} bumpHoldTimes hold seconds of every bump of the face, already scaled by mastery
 * @param {number} seed any number (same seed = same answer)
 * @param {number} customerNumber career customer number, 1 based (decides the combo length)
 * @returns {{type: 'gentle'|'hurry'|'combo', n?: number, timeLimit?: number}|null} the request
 */
export function pickRequest(customerSpec, bumpHoldTimes, seed, customerNumber) {
  if (!customerSpec || !customerSpec.requestAllowed) return null;
  const rng = makeRng(seed);
  if (rng() >= REQUEST_CHANCE) return null;
  const holds = (Array.isArray(bumpHoldTimes) ? bumpHoldTimes : []).filter((h) => Number.isFinite(h) && h > 0);
  const bumpCount = Number.isFinite(customerSpec.bumpCount) ? customerSpec.bumpCount : holds.length;
  const n = comboLength(customerNumber);
  const choices = ['gentle'];
  if (holds.length > 0) choices.push('hurry');
  if (bumpCount >= n) choices.push('combo');
  const type = choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
  if (type === 'hurry') return { type, timeLimit: HURRY_FACTOR * holds.reduce((sum, h) => sum + h, 0) };
  if (type === 'combo') return { type, n };
  return { type };
}

/**
 * Where a request stands. A request-free customer (null) is always 'open'.
 * - gentle: 'failed' on the first Ow, 'done' when every bump is handled with no Ow.
 * - hurry: 'failed' once elapsed passes the limit before every bump is handled; 'done' when all are handled in time.
 * - combo: 'done' as soon as bestCombo reaches N; 'failed' when every bump is handled without reaching N.
 * A round that failed (customer stormed off) fails any request that was not done yet.
 * @param {{type: string, n?: number, timeLimit?: number}|null} request from pickRequest
 * @param {object} roundState a scoring.js round state @param {number} elapsedSeconds seconds since the round started
 * @returns {'open'|'done'|'failed'} the state
 */
export function requestProgress(request, roundState, elapsedSeconds) {
  if (!request) return 'open';
  const handled = allHandled(roundState);
  if (request.type === 'combo') {
    if (roundState.bestCombo >= request.n) return 'done';
    return roundState.failed || handled ? 'failed' : 'open';
  }
  if (roundState.failed) return 'failed';
  if (request.type === 'gentle') {
    if (roundState.owCount > 0) return 'failed';
    return handled ? 'done' : 'open';
  }
  if (request.type === 'hurry') {
    if (elapsedSeconds > request.timeLimit) return 'failed';
    return handled ? 'done' : 'open';
  }
  return 'open';
}

/**
 * The value to hand to economy.js roundPayout (and buildRoundResult): the request type when it is done, else false.
 * @param {{type: string, n?: number, timeLimit?: number}|null} request from pickRequest
 * @param {object} roundState a scoring.js round state @param {number} elapsedSeconds seconds since the round started
 * @returns {'gentle'|'hurry'|'combo'|false} the request type or false
 */
export function requestResult(request, roundState, elapsedSeconds) {
  return request && requestProgress(request, roundState, elapsedSeconds) === 'done' ? request.type : false;
}

/**
 * Which string to show for a request (look it up in the string table and fill in the vars). Null for no request.
 * @param {{type: string, n?: number, timeLimit?: number}|null} request from pickRequest
 * @returns {{key: string, vars: object}|null} the string key and its {placeholders}
 */
export function describeRequest(request) {
  if (!request) return null;
  if (request.type === 'hurry') return { key: 'request.hurry', vars: { seconds: Math.max(1, Math.floor(request.timeLimit)) } };
  if (request.type === 'combo') return { key: 'request.combo', vars: { n: request.n } };
  return { key: 'request.gentle', vars: {} };
}
