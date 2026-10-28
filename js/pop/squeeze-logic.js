// The two-finger SQUEEZE (T1.7, redesigned after the first phone test), the pure part: no DOM, no timers, so Node
// can test it. engine.js only glues it to the fingers. When the Settings switch "Squeeze with two fingers" is on and
// fingers are in hand:
// - Two fingers that land anywhere in a big catch zone round a bump (5 bump radii or 90 px, whichever is bigger, on
//   screen) squeeze the NEAREST bump. The fingers do not have to be on the bump or round it: beside or below is fine.
//   The decision is by position only, at once (no waiting, no guessing from the movement).
// - Near a bump two fingers never zoom or pan; spreading them only eases the pressure. Pinch-zoom is for two fingers
//   that land far from every bump (and the +, - and whole-face buttons).
// - A small pinch is enough: full pressure after the fingers close by a third of their start distance or 50 px,
//   whichever is smaller. A slow build while they stay down; hand wobble never cancels (a generous drift limit); a
//   finger lifted and put down again within 300 ms carries on the same squeeze.
// - The squeeze never pops faster than a one-finger hold: its pressure becomes the bump's normal press progress at
//   the same top speed (the bump's hold time with tool, warmth and mastery), so score and money are the same.
// Also here: where the ghost finger pads sit (on the bump's edges, whatever the real fingers do), which way the goo
// squirts (across the squeeze), and how fast the squeak and the buzz pulses repeat.
import { hitDecoy } from './logic.js';

/** The numbers that tune the squeeze (one place to change the feel). */
export const SQUEEZE = {
  /** The catch zone round a bump: this many bump radii on screen... */
  catch: 5,
  /** ...but at least this many screen px. */
  minCatchPx: 90,
  /** A squeeze ends only when both fingers are farther than this many radii from the bump... */
  drift: 9,
  /** ...and at least this many screen px (hand wobble never cancels). */
  minDriftPx: 200,
  /** Full pressure after the fingers close by this part of their start distance... */
  travel: 0.33,
  /** ...or by this many screen px, whichever is smaller... */
  maxTravelPx: 50,
  /** ...but never less than this (so a tiny wobble is not already a full squeeze). */
  minTravelPx: 12,
  /** A finger lifted and put down again within this many seconds carries on the same squeeze. */
  resumeSeconds: 0.3,
  /** Seconds of a still squeeze (fingers down, not closing) per hold time to reach full pressure on its own. */
  buildHolds: 2.5,
  /** The smoothing time of the pressure in seconds (a low-pass, so finger jitter does not flicker). */
  smoothTau: 0.07,
  /** How fast the press progress eases back when the fingers open (progress per second). */
  release: 1.4,
};

/**
 * The tools that squeeze with two fingers: bare fingers (and gloves, once they are a tool), and the cotton pad (owner
 * 2026-10-28, SPEC D43: a pad round each fingertip; it keeps its own rules, whiteheads and gold).
 */
export const SQUEEZE_TOOLS = ['fingers', 'gloves', 'cottonPad'];

/** Clamp to 0..1 (not a number = 0). @param {number} v value @returns {number} 0..1 */
const unit = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Distance between two points. @param {{x: number, y: number}} a point @param {{x: number, y: number}} b point @returns {number} distance */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Whether a tool squeezes with two fingers.
 * @param {string} toolId a tool id
 * @returns {boolean} true for fingers (and gloves) and the cotton pad
 */
export function canSqueeze(toolId) {
  return SQUEEZE_TOOLS.includes(toolId);
}

/**
 * The catch zone round a bump: two fingers landing this close (screen px from its middle) squeeze it.
 * @param {number} r the bump radius in scene px
 * @param {number} z the zoom (1 = whole face)
 * @returns {number} screen px
 */
export function catchRadius(r, z = 1) {
  return Math.max(SQUEEZE.catch * r * z, SQUEEZE.minCatchPx);
}

/**
 * How far (screen px) the nearer finger may wander from the bump before the squeeze ends.
 * @param {number} r the bump radius in scene px
 * @param {number} z the zoom
 * @returns {number} screen px
 */
export function driftReach(r, z = 1) {
  return Math.max(SQUEEZE.drift * r * z, SQUEEZE.minDriftPx);
}

/**
 * What two fingers squeeze, by where they landed (scene px; distances are judged on screen, scene px times z):
 * - a mole or freckle right under the fingers' midpoint (nearer than any bump): a decoy (an Ow, like a press);
 * - else the bump nearest the midpoint, when the midpoint is in its catch zone;
 * - else the bump nearest either finger, when that finger is in its catch zone;
 * - else nothing (the fingers zoom and pan as before).
 * "Nearest" is measured to the bump's edge, a small magnet towards the bigger and closer bump.
 * @param {{x: number, y: number, r: number, popped?: boolean}[]} pimples the bumps (scene px)
 * @param {{x: number, y: number, r: number}[]} decoys moles and freckles (scene px)
 * @param {{x: number, y: number}} a first finger in scene px
 * @param {{x: number, y: number}} b second finger in scene px
 * @param {number} [z] the zoom
 * @returns {{target: object, decoy: boolean}|null} what is squeezed
 */
export function squeezeCandidate(pimples, decoys, a, b, z = 1) {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const live = pimples.filter((p) => !p.popped);
  /** The bump whose edge is nearest a point, if the point is in its catch zone. @param {{x: number, y: number}} pt point @returns {{p: object, edge: number}|null} bump */
  const nearest = (pt) => {
    let best = null;
    for (const p of live) {
      const d = dist(pt, p) * z;
      if (d > catchRadius(p.r, z)) continue;
      const edge = d - p.r * z;
      if (!best || edge < best.edge) best = { p, edge };
    }
    return best;
  };
  const decoy = hitDecoy(decoys ?? [], live, mid.x, mid.y);
  const atMid = nearest(mid);
  if (decoy && (!atMid || dist(mid, decoy) * z < atMid.edge)) return { target: decoy, decoy: true };
  if (atMid) return { target: atMid.p, decoy: false };
  const na = nearest(a);
  const nb = nearest(b);
  const pick = na && nb ? (na.edge <= nb.edge ? na : nb) : na ?? nb;
  return pick ? { target: pick.p, decoy: false } : null;
}

/**
 * How far the fingers must close (screen px) for full pressure: a third of their start distance or 50 px, whichever
 * is smaller (never below a small minimum).
 * @param {number} d0 finger distance when the squeeze started (screen px)
 * @returns {number} screen px
 */
export function fullTravel(d0) {
  return Math.max(SQUEEZE.minTravelPx, Math.min(SQUEEZE.travel * Math.max(0, d0), SQUEEZE.maxTravelPx));
}

/**
 * How far the fingers have closed: 0 at the start distance (or wider: spreading does nothing more), 1 after the
 * full travel (or closer). Always grows as the fingers close (monotonic) and stays in 0..1.
 * @param {number} d0 the start distance (screen px)
 * @param {number} d the distance now
 * @returns {number} 0..1
 */
export function closeAmount(d0, d) {
  if (!(d0 > 0) || !Number.isFinite(d)) return 0;
  return unit((d0 - d) / fullTravel(d0));
}

/**
 * A fresh squeeze drive, carrying on from the pressure a bump already has (a one-finger hold before, or a squeeze
 * whose finger was lifted for a moment).
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
 * @returns {'third'|'lift'|'drift'|'popped'|null} third = a third finger came, lift = a finger left, drift = both
 *   fingers wandered far from the bump, popped = the bump is out; null = go on
 */
export function squeezeEnd({ fingers, a, b, bump, z = 1 }) {
  if (!a || !b) return 'lift';
  if (fingers > 2) return 'third';
  if (bump.popped) return 'popped';
  if (Math.min(dist(a, bump), dist(b, bump)) * z > driftReach(bump.r, z)) return 'drift';
  return null;
}

/**
 * The memory of a squeeze whose finger was lifted, so putting a finger down again soon carries on.
 * @param {object} bump the squeezed bump
 * @param {number} level the squeeze pressure when the finger lifted
 * @param {number} now the time in seconds
 * @returns {{bump: object, level: number, until: number}} the memory
 */
export function rememberSqueeze(bump, level, now) {
  return { bump, level: unit(level), until: now + SQUEEZE.resumeSeconds };
}

/**
 * Whether a new two-finger squeeze carries on a remembered one: the same bump, soon enough, not popped.
 * @param {{bump: object, level: number, until: number}|null} memory from rememberSqueeze
 * @param {object} bump the bump the new fingers squeeze
 * @param {number} now the time in seconds
 * @returns {boolean} true = carry on (start from memory.level)
 */
export function resumes(memory, bump, now) {
  return Boolean(memory && memory.bump === bump && !bump.popped && now <= memory.until);
}

/**
 * Where the two ghost finger pads sit (screen px): on the bump's edges, on the line between the real fingers (so the
 * picture stays clear even when the fingers are far off to the side), pressing in as the pressure rises.
 * @param {{x: number, y: number}} c the bump's middle on screen
 * @param {number} rScreen the bump radius on screen
 * @param {number} axis the angle of the line from the first finger to the second (radians)
 * @param {number} pressure 0..1
 * @param {number} padR the pad radius (screen px)
 * @returns {{a: {x: number, y: number}, b: {x: number, y: number}}} the first finger's pad and the second's
 */
export function padSpots(c, rScreen, axis, pressure, padR) {
  const pr = unit(pressure);
  const out = rScreen * (1.05 + 0.2 * pr) + padR * (0.75 - 0.25 * pr); // the bump swells, the pads push in
  const ux = Math.cos(Number.isFinite(axis) ? axis : 0);
  const uy = Math.sin(Number.isFinite(axis) ? axis : 0);
  return { a: { x: c.x - ux * out, y: c.y - uy * out }, b: { x: c.x + ux * out, y: c.y + uy * out } };
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
  return Math.sin(one) <= 0 ? one : one - Math.PI;
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
