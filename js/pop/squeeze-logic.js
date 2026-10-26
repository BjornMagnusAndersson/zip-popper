// The two-finger SQUEEZE (T1.7), the pure part: no DOM, no timers, so Node can test it. engine.js only glues it to
// the fingers. When the Settings switch "Squeeze with two fingers" is on, two fingers put down close around a bump
// squeeze it; two fingers anywhere else still zoom and pan as before (T1.4). The squeeze never pops faster than a
// one-finger hold would: its pressure is turned into the bump's normal press progress at the same top speed (the
// bump's hold time with tool, warmth and mastery), so score and money are the same, only the feel is different.
// What is here:
// - which bump (or decoy) two fingers are round, and when a squeeze ends (third finger, a finger lifted, drifting off);
// - squeeze or zoom: decided by the first movement after the fingers land (a short grace time);
// - the pressure: from how far the fingers have closed, plus a slow build while they stay down, smoothed so jitter
//   does not flicker, and the press progress that follows it (rises no faster than a hold, eases back when opened);
// - which way the goo squirts (across the squeeze), and how fast the squeak and the buzz pulses repeat.
import { hitTest, hitDecoy } from './logic.js';

/** The numbers that tune the squeeze (one place to change the feel). */
export const SQUEEZE = {
  /** Each finger must be within this many bump radii (on screen) of the bump to start a squeeze. */
  reach: 2.2,
  /** ...but at least this many screen px (two real fingertips never get closer than about 30 px apart). */
  minReachPx: 36,
  /** The squeeze ends when a finger drifts farther than this many radii from the bump... */
  drift: 3.5,
  /** ...and at least this many screen px. */
  minDriftPx: 60,
  /** Milliseconds after the second finger lands before a still pair is taken as a squeeze. */
  graceMs: 80,
  /** Screen px a finger must move before its movement counts for deciding squeeze or zoom. */
  moveMin: 5,
  /** Fully closed = the finger distance is down to this part of the start distance (or the bump's size). */
  closeTo: 0.35,
  /** Seconds of a still squeeze (fingers down, not closing) per hold time to reach full pressure on its own. */
  buildHolds: 2.5,
  /** The smoothing time of the pressure in seconds (a low-pass, so finger jitter does not flicker). */
  smoothTau: 0.07,
  /** How fast the press progress eases back when the fingers open (progress per second). */
  release: 1.4,
};

/** The tools that squeeze with two fingers: bare fingers (and gloves, once they are a tool). */
export const SQUEEZE_TOOLS = ['fingers', 'gloves'];

/** Clamp to 0..1 (not a number = 0). @param {number} v value @returns {number} 0..1 */
const unit = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Distance between two points. @param {{x: number, y: number}} a point @param {{x: number, y: number}} b point @returns {number} distance */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Whether a tool squeezes with two fingers.
 * @param {string} toolId a tool id
 * @returns {boolean} true for fingers (and gloves)
 */
export function canSqueeze(toolId) {
  return SQUEEZE_TOOLS.includes(toolId);
}

/**
 * How far (screen px) a finger may be from a bump's middle to start a squeeze on it.
 * @param {number} r the bump radius in scene px
 * @param {number} z the zoom (1 = whole face)
 * @returns {number} screen px
 */
export function startReach(r, z = 1) {
  return Math.max(SQUEEZE.reach * r * z, SQUEEZE.minReachPx);
}

/**
 * How far (screen px) a finger may drift from the bump's middle before the squeeze ends.
 * @param {number} r the bump radius in scene px
 * @param {number} z the zoom
 * @returns {number} screen px
 */
export function driftReach(r, z = 1) {
  return Math.max(SQUEEZE.drift * r * z, SQUEEZE.minDriftPx);
}

/**
 * What two fingers are round: the bump (or decoy) under their midpoint, found with the normal hit tests, when both
 * fingers are close enough to it. Null when they are not round anything (then they zoom as before).
 * @param {{x: number, y: number, r: number, popped?: boolean}[]} pimples the bumps (scene px)
 * @param {{x: number, y: number, r: number}[]} decoys moles and freckles (scene px)
 * @param {{x: number, y: number}} a first finger in scene px
 * @param {{x: number, y: number}} b second finger in scene px
 * @param {number} [z] the zoom (finger distances are judged on screen: scene px times z)
 * @returns {{target: object, decoy: boolean}|null} what is squeezed
 */
export function squeezeCandidate(pimples, decoys, a, b, z = 1) {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  /** Both fingers near enough a thing. @param {{x: number, y: number, r: number}} t the thing @returns {boolean} true when they are */
  const near = (t) => Math.max(dist(a, t), dist(b, t)) * z <= startReach(Math.max(t.r, 4), z);
  const decoy = hitDecoy(decoys ?? [], pimples, mid.x, mid.y);
  if (decoy) return near(decoy) ? { target: decoy, decoy: true } : null;
  const p = hitTest(pimples, mid.x, mid.y);
  return p && near(p) ? { target: p, decoy: false } : null;
}

/**
 * Squeeze or zoom, from the first movement of two fingers that landed round a bump (screen px).
 * Closing towards each other = 'squeeze'; moving apart, or both moving the same way (a pan) = 'zoom'; too little
 * movement yet = null (wait; when the grace time is over a still pair counts as a squeeze, see graceDecision).
 * @param {{x: number, y: number}} a0 first finger where it landed
 * @param {{x: number, y: number}} b0 second finger where it landed
 * @param {{x: number, y: number}} a1 first finger now
 * @param {{x: number, y: number}} b1 second finger now
 * @returns {'squeeze'|'zoom'|null} the decision
 */
export function classifyStart(a0, b0, a1, b1) {
  const da = { x: a1.x - a0.x, y: a1.y - a0.y };
  const db = { x: b1.x - b0.x, y: b1.y - b0.y };
  const move = Math.max(Math.hypot(da.x, da.y), Math.hypot(db.x, db.y));
  if (move < SQUEEZE.moveMin) return null;
  const change = dist(a1, b1) - dist(a0, b0); // negative = closing
  const shared = { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2 }; // the movement both fingers share (a pan)
  const pan = Math.hypot(shared.x, shared.y);
  if (change <= -SQUEEZE.moveMin * 0.6 && -change >= pan * 0.8) return 'squeeze';
  return 'zoom';
}

/**
 * The decision when the grace time is over and the fingers have not shown which it is: still fingers round a bump
 * squeeze (pressure builds slowly while they stay down).
 * @param {'squeeze'|'zoom'|null} moved what classifyStart says now
 * @returns {'squeeze'|'zoom'} the decision
 */
export function graceDecision(moved) {
  return moved ?? 'squeeze';
}

/**
 * The finger distance that counts as fully closed: closeTo of the start distance, or the bump's size on screen,
 * whichever is bigger (but always a bit below the start, so a squeeze can always be closed).
 * @param {number} d0 finger distance when the squeeze started (screen px)
 * @param {number} rScreen the bump radius on screen (px)
 * @returns {number} screen px
 */
export function closedDistance(d0, rScreen) {
  return Math.min(Math.max(SQUEEZE.closeTo * d0, 2 * rScreen), d0 * 0.8);
}

/**
 * How far the fingers have closed: 0 at the start distance (or wider), 1 at the closed distance (or closer).
 * Always grows as the fingers close (monotonic) and stays in 0..1.
 * @param {number} d0 the start distance (screen px)
 * @param {number} d the distance now
 * @param {number} rScreen the bump radius on screen
 * @returns {number} 0..1
 */
export function closeAmount(d0, d, rScreen) {
  if (!(d0 > 0)) return 0;
  const dMin = closedDistance(d0, rScreen);
  return unit((d0 - d) / Math.max(1e-6, d0 - dMin));
}

/**
 * A fresh squeeze drive, carrying on from the pressure a bump already has (e.g. a one-finger hold before).
 * @param {number} [pressure] the bump's press progress now, 0..1
 * @returns {{build: number, level: number}} build = the slow part from holding still; level = the smoothed pressure
 */
export function startDrive(pressure = 0) {
  const p = unit(pressure);
  return { build: p, level: p };
}

/**
 * One step of the squeeze pressure. It is the closing amount plus a slow build while the fingers stay down (faster
 * the more they are closed, and faster for a bump with a short hold time, so mastery helps the same as for a hold),
 * smoothed with a low-pass. Opening the fingers lowers it again (the closing part falls away); the build stays.
 * @param {{build: number, level: number}} s the drive now
 * @param {number} dt seconds since the last step
 * @param {number} close closeAmount now, 0..1
 * @param {number} hold the bump's effective hold time in seconds (tool, warmth and mastery included)
 * @returns {{build: number, level: number, raw: number}} the new drive and the unsmoothed pressure
 */
export function stepDrive(s, dt, close, hold) {
  const d = Math.max(0, Number(dt) || 0);
  const c = unit(close);
  const rate = 1 / (SQUEEZE.buildHolds * Math.max(0.1, hold));
  const build = unit(s.build + d * rate * (0.35 + 0.65 * c));
  const raw = unit(c + build);
  const k = 1 - Math.exp(-d / SQUEEZE.smoothTau);
  let level = unit(s.level + (raw - s.level) * k);
  if (Math.abs(raw - level) < 0.004) level = raw; // settle exactly (a smoothed 1 must really reach 1, or nothing pops)
  return { build, level, raw };
}

/**
 * The bump's press progress (the same 0..1 a hold builds; 1 = it pops) following the squeeze pressure: it rises
 * towards the pressure, but never faster than a one-finger hold would (1 / hold per second), and eases back down
 * when the fingers open (SQUEEZE.release per second).
 * @param {number} progress the press progress now, 0..1
 * @param {number} target the squeeze pressure (stepDrive level), 0..1
 * @param {number} dt seconds since the last step
 * @param {number} hold the effective hold time in seconds
 * @returns {number} the new progress, 0..1
 */
export function squeezeProgress(progress, target, dt, hold) {
  const d = Math.max(0, Number(dt) || 0);
  const p = unit(progress);
  const t = unit(target);
  if (t > p) return Math.min(t, p + d / Math.max(0.1, hold));
  return Math.max(t, p - d * SQUEEZE.release);
}

/**
 * Whether a squeeze must end now, and why.
 * @param {{fingers: number, a: {x: number, y: number}|null|undefined, b: {x: number, y: number}|null|undefined,
 *   bump: {x: number, y: number, r: number, popped?: boolean}, z?: number}} o fingers = how many fingers are down;
 *   a, b = the two squeezing fingers in scene px (missing = lifted); bump = the bump; z = the zoom
 * @returns {'third'|'lift'|'drift'|'popped'|null} third = a third finger came, lift = a finger left, drift = a finger
 *   slid away from the bump, popped = the bump is out; null = go on
 */
export function squeezeEnd({ fingers, a, b, bump, z = 1 }) {
  if (!a || !b) return 'lift';
  if (fingers > 2) return 'third';
  if (bump.popped) return 'popped';
  const far = driftReach(bump.r, z);
  if (Math.max(dist(a, bump), dist(b, bump)) * z > far) return 'drift';
  return null;
}

/**
 * Which way the goo squirts after a squeeze pop: across the squeeze (at a right angle to the line between the
 * fingers), on the side that points up the screen (out of the skin, the cartoon way). A side-to-side squeeze squirts
 * straight up; an up-and-down squeeze squirts sideways.
 * @param {number} axis the angle of the line between the fingers (radians)
 * @returns {number} the goo angle (radians; -PI/2 = straight up)
 */
export function gooDirection(axis) {
  const a = Number.isFinite(axis) ? axis : 0;
  const one = a + Math.PI / 2;
  const s = Math.sin(one);
  return s <= 0 ? one : one - Math.PI;
}

/**
 * Seconds between two squeaks while squeezing: slow at low pressure, quick near the pop.
 * @param {number} pressure 0..1
 * @returns {number} seconds
 */
export function squeakGap(pressure) {
  return 0.24 - 0.15 * unit(pressure);
}

/**
 * Seconds between two tiny buzz pulses while squeezing (they get faster as the pressure rises).
 * @param {number} pressure 0..1
 * @returns {number} seconds
 */
export function buzzGap(pressure) {
  return 0.34 - 0.27 * unit(pressure);
}
