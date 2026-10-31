// The stage moment of a boss or event intro (SPEC D45 item 4) and Prom Penny's party day (item 6), as plain numbers:
// which look each event gets, how many particles, and the timeline (the room dims to near dark, a spotlight CLUNKS on
// over the customer, floor smoke rolls in, then the lights come back up into the normal intro). No DOM, no clock: the
// drawing lives in intro-stage.js, spotlight-fx.js and smoke-fx.js. Normal customers never get it.
import { isBoss } from '../data/bosses.js';
import { PARTY_LINES } from '../data/customer-lines.js';

/** Seconds: dimmed to near dark by T_DIM, the clunk at T_ON, lit until T_HOLD, the room light back by T_UP, all gone by T_END. */
export const STAGE_TIMES = { T_DIM: 0.3, T_ON: 0.6, T_HOLD: 1.55, T_UP: 2.1, T_END: 2.35 };
/** Seconds a tap's skip takes to fade everything out (quick, never a jump cut). */
export const SKIP_FADE = 0.25;

/**
 * Each event's look: dark = the dimmed room's colour, light = the spotlight's colour, smoke / smokeTop = the floor
 * smoke's colour low and high, speck = the dust in the cone, glints = gold four-point sparkles in the light (Golden
 * Day), villain = a deeper dark, a purple glow from the smoke and a deeper clunk (the Big Evil Horn), depth = how dark
 * the room gets (0..1). All "r,g,b". Hair Day is a pink salon light, Nose Strip Day a cool clean mint.
 */
export const STAGE_LOOKS = {
  horn: { dark: '18,6,32', light: '220,180,255', smoke: '142,76,206', smokeTop: '196,150,255', speck: '232,214,255', glints: false, villain: true, depth: 0.94 },
  golden: { dark: '28,18,6', light: '255,220,120', smoke: '226,190,112', smokeTop: '255,238,196', speck: '255,226,140', glints: true, villain: false, depth: 0.9 },
  hairday: { dark: '24,10,26', light: '255,184,226', smoke: '232,172,210', smokeTop: '255,226,242', speck: '255,236,246', glints: false, villain: false, depth: 0.9 },
  nosestrip: { dark: '6,18,26', light: '168,238,244', smoke: '150,206,214', smokeTop: '222,246,250', speck: '228,250,255', glints: false, villain: false, depth: 0.9 },
};

/** Full particle counts (Lighter graphics uses LITE_SHARE of them, at least one). */
export const STAGE_COUNTS = { specks: 40, billows: 14, glints: 10 };
/** The share of particles with Lighter graphics. */
export const LITE_SHARE = 0.45;

/**
 * What the intro of this customer shows: null for a normal customer; for a boss or event its look, the counts and
 * whether it moves. Reduced motion: a still lit picture (no swing, no rolling smoke, no fades) that stays until a tap.
 * Lighter graphics: fewer specks and glints, no billowing smoke (only the flat floor mist), lower-resolution layers.
 * @param {string|null} bossId the event id (data/bosses.js) or null
 * @param {{reduced?: boolean, lite?: boolean}} [o] reduced motion, Lighter graphics
 * @returns {{id: string, look: object, still: boolean, lite: boolean, specks: number, billows: number, glints: number,
 *   darkScale: number, smokeScale: number}|null} the plan
 */
export function stagePlan(bossId, o = {}) {
  if (!isBoss(bossId) || !Object.hasOwn(STAGE_LOOKS, bossId)) return null;
  const look = STAGE_LOOKS[bossId];
  const still = Boolean(o.reduced);
  const lite = Boolean(o.lite);
  const share = lite ? LITE_SHARE : 1;
  /** A count with the share, never below one. @param {number} n full count @returns {number} count */
  const count = (n) => Math.max(1, Math.round(n * share));
  return {
    id: bossId, look, still, lite,
    specks: count(STAGE_COUNTS.specks), billows: lite || still ? 0 : count(STAGE_COUNTS.billows), glints: look.glints ? count(STAGE_COUNTS.glints) : 0,
    darkScale: lite ? 0.2 : 0.25, smokeScale: lite ? 0.3 : 0.4, // the low-res layers' pixels per CSS px
  };
}

/** Ease 0..1 with a slow start and end. @param {number} u input @returns {number} eased */
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** Part way from a to b. @param {number} a start @param {number} b end @param {number} k 0..1 @returns {number} mixed */
const lerp = (a, b, k) => a + (b - a) * k;

/**
 * The stage's levels at a moment of the moving version: dark = the room's darkness (0..1), light = the spotlight
 * (above 1 in the clunk's flicker), swing = its turn on the bracket (radians), grow = the pool's size factor, flash =
 * the lens flash, smoke = the floor smoke (0..1), shade = how dark the customer's portrait is (dark until the light
 * hits it), done = all over. A tap (skipAt) fades every level out from that moment over SKIP_FADE seconds.
 * @param {number} t seconds since the intro opened
 * @param {{depth?: number}} [look] the event's look (its depth)
 * @param {number|null} [skipAt] when the tap came (seconds), or null
 * @returns {{dark: number, light: number, swing: number, grow: number, flash: number, smoke: number, shade: number, done: boolean}} levels
 */
export function stageLevels(t, look = {}, skipAt = null) {
  if (Number.isFinite(skipAt) && t > skipAt) {
    const from = stageLevels(skipAt, look);
    const k = 1 - smooth((t - skipAt) / SKIP_FADE);
    return { dark: from.dark * k, light: from.light * k, swing: from.swing * k, grow: from.grow, flash: 0, smoke: from.smoke * k, shade: from.shade * k, done: from.done || k <= 0 };
  }
  const { T_DIM, T_ON, T_HOLD, T_UP, T_END } = STAGE_TIMES;
  const depth = look.depth ?? 0.9;
  const time = Math.max(0, Number.isFinite(t) ? t : 0);
  let dark = depth;
  if (time < T_DIM) dark = lerp(0.35, depth, smooth(time / T_DIM)); // the intro opens already a little dim
  else if (time > T_HOLD) dark = lerp(depth, 0, smooth((time - T_HOLD) / (T_UP - T_HOLD)));
  let light = 0;
  let swing = 0;
  let grow = 1;
  let flash = 0;
  if (time >= T_ON) {
    const k = time - T_ON;
    if (k < 0.05) light = 1.3; // clunk: on, a flicker, on
    else if (k < 0.1) light = 0.25;
    else if (k < 0.15) light = 1.15;
    else light = 1 + 0.12 * Math.exp(-k * 3);
    if (time > T_HOLD) light *= 1 - smooth((time - T_HOLD) / (T_END - T_HOLD));
    swing = 0.06 * Math.exp(-k * 2.6) * Math.sin(k * 9 + 0.6); // it swings a little on its bracket and settles
    grow = 1 + 0.1 * Math.exp(-k * 3.5);
    flash = Math.exp(-k * 8);
  }
  const smoke = time < T_ON - 0.1 ? 0 : smooth((time - (T_ON - 0.1)) / 0.5) * (1 - smooth((time - T_HOLD) / (T_END - T_HOLD)));
  const shade = time < T_ON ? dark * 0.72 : 0; // the customer sits in the dark until the light hits them
  return { dark, light, swing, grow, flash, smoke, shade, done: time >= T_END };
}

/**
 * The still lit picture for reduced motion: a dimmed room, the spotlight steady on the customer, a little floor mist.
 * @returns {{dark: number, light: number, swing: number, grow: number, flash: number, smoke: number, shade: number, done: boolean}} levels
 */
export function stillLevels() {
  return { dark: 0.5, light: 0.9, swing: 0, grow: 1, flash: 0, smoke: 0.55, shade: 0, done: false };
}

/**
 * Whether an intro line is one of Prom Penny's party lines (a party, prom or dance tonight, data/customer-lines.js
 * PARTY_LINES).
 * @param {string|null|undefined} key the intro's string key
 * @returns {boolean} true = a party line
 */
export function isPartyIntro(key) {
  return typeof key === 'string' && PARTY_LINES.intros.includes(key);
}

/**
 * Whether a round is one of Prom Penny's party visits (D45 item 6, D46-28): her event day (Penny in a boss or event
 * slot: career customer 5, or a Keep working event that lands on her) or any visit whose intro is about a party, prom
 * or dance. Only then the party lights and the end confetti show (and her second line says she brought the lights,
 * game/customer-lines.js withPartyLights).
 * @param {{boss?: object|null, customer?: {id?: string, introKey?: string}|null, lines?: {introKey?: string}|null}|null} o
 *   the round's startRound arguments (app-logic.js roundArgs)
 * @returns {boolean} true = a party visit
 */
export function isPartyDay(o) {
  if (o?.customer?.id !== PARTY_LINES.who) return false;
  return Boolean(o.boss) || isPartyIntro(o.customer.introKey ?? o.lines?.introKey);
}
