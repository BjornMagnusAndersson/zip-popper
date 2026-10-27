// The pure rules of the customer twists inside the pop scene (T8.3; the twists themselves and their numbers are in
// data/twists.js). Fidgety: how far the face sways at a moment, and how much room the bumps leave so the sway never
// takes a bump off the screen or under the tool bar. Ticklish: when a held squeeze makes her giggle, how far the
// press drops back, how long presses wait, and the jerk away. Sensitive skin is a multiplier in tool-logic.js
// (roughChance). No DOM, no clock: engine.js passes the time in, so Node can test every rule.

import { SWAY, TICKLE } from '../data/twists.js';

/**
 * A number, or 0 when it is not a finite number.
 * @param {unknown} v value
 * @returns {number} the number or 0
 */
const num = (v) => (Number.isFinite(v) ? v : 0);

/**
 * How far the face is swayed at a moment (fidgety): a slow side-to-side drift with a slower up-and-down one, in
 * screen px. Its length is never more than amp (at most 0.95 x amp), and amp 0 gives no sway at all.
 * @param {number} t seconds since the round started
 * @param {number} amp the sway's size in screen px (swayAmplitude)
 * @param {{period?: number, periodY?: number}} [o] seconds per sway (data/twists.js SWAY)
 * @returns {{x: number, y: number}} the offset in screen px
 */
export function swayOffset(t, amp, { period = SWAY.period, periodY = SWAY.periodY } = {}) {
  const a = Math.max(0, num(amp));
  if (a === 0) return { x: 0, y: 0 };
  const time = num(t);
  return {
    x: a * 0.8 * Math.sin((2 * Math.PI * time) / Math.max(0.5, period)),
    y: a * 0.5 * Math.sin((2 * Math.PI * time) / Math.max(0.5, periodY) + 1),
  };
}

/**
 * How big the sway may be for this face: SWAY.amount of the face's half width, at most SWAY.maxPx, less with reduced
 * motion (SWAY.reduced of it: it is a game rule, so some sway stays), and never more than the room the bumps leave.
 * @param {number} faceRx the face's half width in screen px
 * @param {number} room the room the bumps leave (swayRoom)
 * @param {boolean} [reduced] reduced motion
 * @returns {number} screen px, 0 or more
 */
export function swayAmplitude(faceRx, room, reduced = false) {
  const wanted = Math.min(SWAY.maxPx, Math.max(0, num(faceRx)) * SWAY.amount) * (reduced ? SWAY.reduced : 1);
  return Math.max(0, Math.min(wanted, num(room)));
}

/**
 * The gap between a circle and a box (0 when they touch or overlap).
 * @param {{x: number, y: number, r: number}} c the circle
 * @param {{x: number, y: number, w: number, h: number}} b the box
 * @returns {number} px
 */
function gapToBox(c, b) {
  const dx = Math.max(b.x - c.x, 0, c.x - (b.x + b.w));
  const dy = Math.max(b.y - c.y, 0, c.y - (b.y + b.h));
  return Math.max(0, Math.hypot(dx, dy) - c.r);
}

/**
 * How far the face may move in any direction before a bump would leave the screen or slide under a control box (the
 * tool bar, the zoom buttons, the hint line), less a margin. A box a bump already overlaps is left out (moving cannot
 * make that worse than it is). No bumps = no limit from bumps (only the screen size).
 * @param {{x: number, y: number, r: number}[]} bumps the bumps still to pop, in screen px
 * @param {number} w screen width @param {number} h screen height
 * @param {{x: number, y: number, w: number, h: number}[]} [covered] control boxes over the scene, screen px
 * @param {number} [margin] px a bump always keeps clear (SWAY.margin)
 * @returns {number} px, 0 or more
 */
export function swayRoom(bumps, w, h, covered = [], margin = SWAY.margin) {
  const boxes = (Array.isArray(covered) ? covered : []).filter((b) => b && [b.x, b.y, b.w, b.h].every(Number.isFinite));
  let room = Math.max(0, Math.min(num(w), num(h)) / 2);
  for (const p of Array.isArray(bumps) ? bumps : []) {
    if (![p?.x, p?.y, p?.r].every(Number.isFinite)) continue;
    room = Math.min(room, p.x - p.r, w - p.x - p.r, p.y - p.r, h - p.y - p.r);
    for (const b of boxes) {
      const gap = gapToBox(p, b);
      if (gap > 0) room = Math.min(room, gap);
    }
  }
  return Math.max(0, room - Math.max(0, num(margin)));
}

/**
 * Keep an offset inside a circle of the given size (so sway and giggle jerk together never pass the room).
 * @param {{x: number, y: number}} off the offset
 * @param {number} max the largest length allowed
 * @returns {{x: number, y: number}} the offset, shortened when needed
 */
export function clampOffset(off, max) {
  const m = Math.max(0, num(max));
  const x = num(off?.x);
  const y = num(off?.y);
  const len = Math.hypot(x, y);
  if (len <= m || len === 0) return { x, y };
  return { x: (x / len) * m, y: (y / len) * m };
}

/**
 * Whether a bump zone is ticklish (cheeks, the side of the neck = jaw, near the ears = temple).
 * @param {string} zone a bump's zone (pop/logic.js layoutFace)
 * @returns {boolean} true when holding there may make her giggle
 */
export function ticklishZone(zone) {
  return TICKLE.zones.includes(zone);
}

/**
 * Whether a held squeeze makes her giggle now: held at least TICKLE.holdSeconds on a ticklish zone, and the last
 * giggle was at least TICKLE.cooldown ago.
 * @param {number} heldSeconds how long this press has been held without letting go
 * @param {string} zone the bump's zone
 * @param {number} sinceLastGiggle seconds since the last giggle (Infinity = none yet)
 * @returns {boolean} true = giggle now
 */
export function tickleDue(heldSeconds, zone, sinceLastGiggle = Infinity) {
  if (!ticklishZone(zone)) return false;
  const since = Number.isNaN(sinceLastGiggle) ? Infinity : sinceLastGiggle;
  return num(heldSeconds) >= TICKLE.holdSeconds && since >= TICKLE.cooldown;
}

/**
 * The bump's press progress after a giggle: it loses TICKLE.dropBack of what it had (a share, so a long hold always
 * gains ground over a cycle and a big bump or Evil Horn can still be popped; R4 finding 2).
 * @param {number} pressure the press progress now, 0..1
 * @returns {number} the new progress, 0..1
 */
export function giggleDrop(pressure) {
  return Math.max(0, Math.min(1, num(pressure)) * (1 - TICKLE.dropBack));
}

/**
 * Whether presses still do nothing because she is giggling (for TICKLE.jerkSeconds after a giggle).
 * @param {number} now the scene time in seconds
 * @param {number} giggleAt the time of the last giggle (-Infinity = none)
 * @returns {boolean} true = wait
 */
export function giggleBlocks(now, giggleAt) {
  const age = num(now) - (Number.isFinite(giggleAt) ? giggleAt : -Infinity);
  return age >= 0 && age < TICKLE.jerkSeconds;
}

/**
 * The jerk away after a giggle, in screen px: out and back in TICKLE.jerkSeconds along a direction (a smooth bump,
 * 0 at the start and the end). 0 outside that time.
 * @param {number} age seconds since the giggle
 * @param {{x: number, y: number}} dir a direction (it is made 1 long)
 * @param {number} size how far at the most, px
 * @returns {{x: number, y: number}} the offset
 */
export function jerkOffset(age, dir, size) {
  const a = num(age);
  if (a < 0 || a >= TICKLE.jerkSeconds) return { x: 0, y: 0 };
  const len = Math.hypot(num(dir?.x), num(dir?.y)) || 1;
  const k = Math.sin((Math.PI * a) / TICKLE.jerkSeconds) * Math.max(0, num(size));
  return { x: (num(dir?.x) / len) * k, y: (num(dir?.y) / len) * k };
}
