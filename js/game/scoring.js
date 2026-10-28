// Pure scoring logic for one customer round: pops, combo chain, "Ow" count, cleanup flag, stars, combo bonus.
// No DOM, no audio. Style: every function returns a NEW state object and never changes the one it is given.

/** Longest gap in seconds between two pops for the second one to extend the combo chain (easy to tune). */
export const COMBO_WINDOW = 2.5;
/** Coins paid for each step a pop extended a chain (the first pop of a chain pays nothing). */
export const COMBO_COINS_PER_STEP = 2;
/** Most combo coins one round can pay. */
export const COMBO_BONUS_CAP = 20;
/** Most Ow a 2-star result allows. */
export const MAX_OW_FOR_TWO_STARS = 2;

/** Makes the starting state of a round with the given number of bumps. @param {number} bumpCount @returns {object} state */
export function createRound(bumpCount) {
  const n = Number.isFinite(bumpCount) ? Math.max(0, Math.floor(bumpCount)) : 0;
  return {
    bumpCount: n,
    pops: 0, // bumps handled so far
    owCount: 0,
    cleanupDone: false,
    combo: 0, // length of the current chain (0 = no chain running)
    bestCombo: 0, // longest chain this round
    comboSteps: 0, // how many pops extended an existing chain (drives the bonus)
    lastPopTime: null, // time of the previous clean pop that can still chain, else null
  };
}

/**
 * Registers a handled bump. A clean pop within COMBO_WINDOW of the previous clean pop extends the chain;
 * a clean pop after a slow gap (or the first one) starts a new chain at 1; an unclean pop breaks the chain.
 * Pops beyond bumpCount are ignored. @param {object} state @param {{timeSeconds:number, clean:boolean}} pop @returns {object} new state
 */
export function registerPop(state, { timeSeconds, clean }) {
  if (state.pops >= state.bumpCount) return state;
  const next = { ...state, pops: state.pops + 1 };
  if (!clean) {
    next.combo = 0;
    next.lastPopTime = null;
    return next;
  }
  const chained = state.lastPopTime !== null && timeSeconds - state.lastPopTime <= COMBO_WINDOW;
  next.combo = chained ? state.combo + 1 : 1;
  next.comboSteps = state.comboSteps + (chained ? 1 : 0);
  next.bestCombo = Math.max(state.bestCombo, next.combo);
  next.lastPopTime = timeSeconds;
  return next;
}

/** Registers a rough pop: Ow count goes up by one and the combo chain is broken. @param {object} state @returns {object} new state */
export function registerOw(state) {
  return { ...state, owCount: state.owCount + 1, combo: 0, lastPopTime: null };
}

/**
 * Registers a fail (SPEC D15): the customer stormed off. A failed round never gets stars; the reputation it cost
 * (0 for "Try again") is kept in the result for when reputation exists.
 * @param {object} state @param {{reputationHit?: number}} [o] the reputation hit taken @returns {object} new state
 */
export function registerFail(state, { reputationHit = 0 } = {}) {
  return { ...state, failed: true, reputationHit: (state.reputationHit ?? 0) + Math.max(0, reputationHit), combo: 0, lastPopTime: null };
}

/** Registers that the cleanup step was finished. @param {object} state @returns {object} new state */
export function registerCleanup(state) {
  return { ...state, cleanupDone: true };
}

/** True when every bump of the round has been handled. @param {object} state @returns {boolean} done */
export function allHandled(state) {
  return state.pops >= state.bumpCount;
}

/**
 * Stars per the spec: 0 while bumps remain; 1 = all handled; 2 = all handled and at most 2 Ow;
 * 3 = all handled, cleanup finished and no Ow; a failed round (registerFail) gets none. @param {object} state @returns {number} 0 to 3
 */
export function starsFor(state) {
  if (state.failed || !allHandled(state)) return 0;
  if (state.cleanupDone && state.owCount === 0) return 3;
  if (state.owCount <= MAX_OW_FOR_TWO_STARS) return 2;
  return 1;
}

/** The most stars a face gets when its nose dots were left on (the nose strip never peeled; owner 2026-10-28). */
export const NOSE_LEFT_MAX_STARS = 2;

/**
 * The stars of a finished face: starsFor, but at most NOSE_LEFT_MAX_STARS when she left the nose dots on.
 * @param {object} state the round state @param {boolean} [stripLeft] the face had nose dots and the strip was never peeled
 * @returns {number} 0 to 3
 */
export function roundStars(state, stripLeft = false) {
  const s = starsFor(state);
  return stripLeft ? Math.min(s, NOSE_LEFT_MAX_STARS) : s;
}

/** Combo bonus in whole coins: a fixed amount per chain step, capped. @param {object} state @returns {number} coins */
export function comboBonus(state) {
  return Math.min(COMBO_BONUS_CAP, state.comboSteps * COMBO_COINS_PER_STEP);
}
