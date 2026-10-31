// The rules of the result moment's effects (SPEC D45 item 2) and the Master diploma's (item 7), kept apart from the
// drawing so they can be tested without a browser: when each effect starts on the result screen, how many tip coins
// fly and what the coin counter shows as each one lands (it always ends at the true total from the game state; the
// effects never change the economy), which celebration a result gets (confetti on 3 stars, petals in the spa), where
// the reveal's star glints sit on the clean face (never on the eyes), and the frame shine's timing on the wall of fame.
import { AUTO_WIPE } from '../screens/album-logic.js';

/**
 * When the result screen's effects start, in seconds after the screen opens. The stars pop in from 0.15 s (CSS
 * app-star-pop, 0.2 s apart), so the confetti goes off with the third star; the tip coins burst out of the customer's chin
 * once the slide has uncovered it (the clean face). sparkleAt counts from the start of the reveal's automatic slide (a frame after the screen opens): the
 * shine glides over the clean face while the slide is almost all the way across (album-logic.js AUTO_WIPE).
 */
export const RESULT_FX = {
  confettiAt: 0.62,
  coinsAt: 1.4,
  sparkleAt: AUTO_WIPE.wait + AUTO_WIPE.sweep * 0.8,
};

/** The light confetti and petals (not the test page's three-wave version): how long a piece lives, how many pieces. */
export const CONFETTI_FX = { life: 2.2, fade: 0.45, pieces: 120, petals: 70, still: 12 };

/** The Master frame's landing on its nail (studio.js, CSS app-hang): the frame lands this many ms after it starts to drop. */
export const HANG_LAND_MS = 780;
/** How long the shine after the landing lasts, in ms (the drop animation runs this long after the landing too). */
export const HANG_SHINE_MS = 1420;

/**
 * How many tip coins fly to the counter: one for every coin of a small tip, fewer for a big one (at least 3, at most
 * 12), about half with Lighter graphics; none without a tip.
 * @param {number} tip the tip in coins
 * @param {boolean} [lite] Lighter graphics
 * @returns {number} how many coins fly
 */
export function coinBurst(tip, lite = false) {
  const n = Number.isFinite(tip) && tip > 0 ? Math.floor(tip) : 0;
  if (!n) return 0;
  const full = Math.min(12, Math.max(3, Math.round(n <= 6 ? n : 6 + (n - 6) * 0.4)));
  return Math.min(n, lite ? Math.max(2, Math.round(full / 2)) : full);
}

/**
 * What the coin counter shows after each landing: whole numbers going up from `from` to `to`, the last one exactly `to`.
 * @param {number} from the number before the first coin lands
 * @param {number} to the true total
 * @param {number} n how many coins land
 * @returns {number[]} n numbers (empty for no coins)
 */
export function coinSteps(from, to, n) {
  const count = Math.max(0, Math.floor(n) || 0);
  const out = [];
  for (let i = 1; i <= count; i += 1) out.push(i === count ? to : Math.round(from + ((to - from) * i) / count));
  return out;
}

/**
 * The coin counter's numbers for a payout: the total from the result's coin rows (screen-logic.js coinRows), the
 * number it starts at (the total without the tip) and the coins that fly in with the tip.
 * @param {{id: string, amount: number}[]} rows the coin rows (the tip row only when there is a tip, the total last)
 * @param {{lite?: boolean, still?: boolean}} [o] Lighter graphics; reduced motion (no coins fly: the true total at once)
 * @returns {{total: number, start: number, coins: number, steps: number[]}} start = what the counter shows first
 */
export function coinCounter(rows, o = {}) {
  const total = rows.find((r) => r.id === 'total')?.amount ?? 0;
  const tip = Math.min(total, rows.find((r) => r.id === 'tip')?.amount ?? 0);
  const coins = o.still ? 0 : coinBurst(tip, o.lite);
  return { total, start: coins ? total - tip : total, coins, steps: coinSteps(total - tip, total, coins) };
}

/**
 * Which celebration a result gets: confetti for 3 stars, petals instead when the studio is the spa (tier 2), nothing
 * for fewer stars or a customer who stormed off.
 * @param {{stars?: number, failed?: boolean, tier?: number}} o the result and the studio tier
 * @returns {'confetti'|'petals'|null} the celebration
 */
export function celebration({ stars = 0, failed = false, tier = 0 } = {}) {
  if (failed || stars < 3) return null;
  return tier === 2 ? 'petals' : 'confetti';
}

/**
 * How many confetti pieces or petals to throw: the full number, about half with Lighter graphics, a few still pieces
 * with reduced motion.
 * @param {'confetti'|'petals'} kind the celebration
 * @param {{lite?: boolean, still?: boolean}} [o] Lighter graphics; reduced motion
 * @returns {number} pieces
 */
export function confettiCount(kind, o = {}) {
  if (o.still) return o.lite ? Math.round(CONFETTI_FX.still / 2) : CONFETTI_FX.still;
  const n = kind === 'petals' ? CONFETTI_FX.petals : CONFETTI_FX.pieces;
  return o.lite ? Math.round(n / 2) : n;
}

/**
 * How see-through a confetti piece is at an age: it fades in quickly and fades out at the end of its life.
 * @param {number} age seconds since it flew out
 * @param {number} life its life in seconds
 * @returns {number} 0..1
 */
export function pieceAlpha(age, life) {
  if (age < 0 || age >= life) return 0;
  const end = Math.min(1, (life - age) / CONFETTI_FX.fade);
  return Math.min(1, age / 0.08, end);
}

/**
 * The reveal's star glints on the clean face, as [u, v, size]: u in shares of the face's half width (rx), v of its
 * half height (ry), as face geometry measures them (pop/logic.js). On the cheeks, the nose, the forehead and the chin;
 * any spot that would come near an eye or its eyebrow (with the glint's own size) is left out.
 * @param {{eyeU?: number, eyeV?: number, browV?: number}} [features] the face's features (faceGeometry().features)
 * @param {number} [aspect] ry / rx of the face (the glint is round, so its reach in v is smaller on a tall face)
 * @returns {number[][]} the spots
 */
export function revealSpots(features = {}, aspect = 1.2) {
  const SPOTS = [[-0.56, 0.2, 1], [0.58, 0.16, 0.85], [0.04, -0.66, 0.8], [0.05, 0.13, 0.65], [-0.12, 0.8, 0.6], [0.62, -0.62, 0.5]];
  return SPOTS.filter(([u, v, s]) => !nearEye(u, v, s, features, aspect));
}

/** How far a glint's rays reach, in shares of the face's half width, for a spot size. */
export const GLINT_REACH = 0.17;

/**
 * Whether a glint at (u, v) would touch an eye or eyebrow: the eye boxes face geometry keeps clear of bumps
 * (u from 0.11 to 0.61 from the middle, v from the brow - 0.1 to the eye + 0.12), grown by the glint's reach.
 * @param {number} u spot across (rx shares)
 * @param {number} v spot down (ry shares)
 * @param {number} s spot size
 * @param {{eyeU?: number, eyeV?: number, browV?: number}} f the face's features
 * @param {number} aspect ry / rx
 * @returns {boolean} true = too close
 */
export function nearEye(u, v, s, f, aspect = 1.2) {
  const eyeU = f.eyeU ?? 0.36;
  const eyeV = f.eyeV ?? -0.14;
  const browV = f.browV ?? -0.36;
  const reachU = GLINT_REACH * s;
  const reachV = reachU / aspect;
  const au = Math.abs(u);
  return au + reachU > eyeU - 0.25 && au - reachU < eyeU + 0.25 && v + reachV > browV - 0.1 && v - reachV < eyeV + 0.12;
}

/**
 * The frame shine's moment on the wall of fame, from the time since the frame started to drop: nothing until it lands,
 * then a band of light gliding over the gold frame and glints popping on its corners.
 * @param {number} ms milliseconds since the drop began
 * @returns {{sweep: number, glint: number, done: boolean}} sweep = how far the band is across (0..1, -1 = not now);
 *   glint = seconds since the glints began (-1 = not yet); done = the shine is over
 */
export function frameShineAt(ms) {
  const k = (ms - HANG_LAND_MS) / 1000;
  if (k < 0) return { sweep: -1, glint: -1, done: false };
  const sweep = k < 0.7 ? k / 0.7 : -1;
  return { sweep, glint: k >= 0.12 ? k - 0.12 : -1, done: ms >= HANG_LAND_MS + HANG_SHINE_MS };
}
