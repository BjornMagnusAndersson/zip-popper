// The juicy pop's thinking part (SPEC D45 item 1, from pop test G): which pop a bump gets and how big it is, where the
// goo drops fly, where drops hit the screen glass and how they slide down, and the crater's timeline. Pure functions
// only (no DOM, no canvas, no clock): engine.js asks, pop-fx-art.js draws, ripple.js bends the picture, tests check.
// Rules (owner 2026-10-31): the goo kinds (whitehead, red, big) get the new pop, scaled by size: quick and crisp for
// the small ones, the full burst for the big one, the biggest show ("grand") for the LAST bump of a face and for
// Hubby's first pop in chapter 0. Kinds with their own look keep it: the golden bump gets the ripple and a few golden
// drops on the glass, the Evil Horn the ripple, the blackhead plug and the ingrown hair stay as they were. The Settings
// switch "Gentle pops" gives today's calm pop everywhere; reduced motion keeps it calm (no ripple, no glass drops, no
// shake, fewer drops); Lighter graphics means fewer drops and no ripple. Cartoon goo only: cream, white or gold.

/** The bump kinds that get the new juicy pop (their own look while squeezed, split, goo mound, crater, drop spray). */
export const JUICY_KINDS = ['whitehead', 'red', 'big'];

/** Kinds that keep their own pop but get extras (ripple, glass drops): the golden bump and the Evil Horn. */
export const EXTRA_KINDS = ['gold', 'horn'];

/** How long the crater shows: it starts healing at CRATER.heal s and is smooth skin again at CRATER.gone s. */
export const CRATER = { heal: 0.7, gone: 2.0 };

/** The juicy goo drops per kind before scaling (pop test G had 19 for a whitehead and 26 for the big one; on a face of
 * eight bumps the small ones throw fewer, so the face is not all goo and the wipe stays about as long as before). */
const DROPS = { whitehead: 12, red: 14, big: 26 };
/** The same in the calm version (reduced motion), as G's calm version. */
const CALM_DROPS = { whitehead: 9, red: 10, big: 12 };
/** Drops on the screen glass per kind (G: 3 for a whitehead, 4 for the big one; small ones a little fewer: quick and crisp). */
const GLASS = { whitehead: 1, red: 2, big: 3 };
/** How far the drops fly per kind (1 = pop test G): the small ones a little closer (quick and crisp). */
const REACH = { whitehead: 0.8, red: 0.85, big: 1 };

/**
 * Smooth 0..1 ramp.
 * @param {number} u input
 * @returns {number} eased 0..1
 */
export const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/**
 * Keep a number between lo and hi.
 * @param {number} v value
 * @param {number} lo low
 * @param {number} hi high
 * @returns {number} clamped
 */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The plan for one pop: which kind of show and how big. With gentle (the Settings switch) every bump pops as before.
 * @param {{type: string, last?: boolean, first?: boolean, gentle?: boolean, reduced?: boolean, lite?: boolean}} o
 *   type = the bump kind; last = it is the last bump of the face; first = the scene's first pop is a big show (Hubby
 *   in chapter 0); gentle = "Gentle pops" on; reduced = reduced motion; lite = Lighter graphics
 * @returns {{style: 'gentle'|'juicy'|'extra'|'plain', size: 'small'|'big'|'grand', drops: number, glass: number,
 *   ripple: {amp: number, far: number, life: number, width: number, waves: number[][]}|null, jolt: number,
 *   throb: boolean, reach: number}} style = gentle (today's pop), juicy (the new pop), extra (own look plus extras) or plain
 *   (unchanged); drops = juicy drops to fly; glass = drops on the screen glass; ripple = the see-through ripple's knobs
 *   (amp and width in scene px, far as a share of the shorter screen side) or null; jolt = how hard the picture jolts
 *   (0 = not at all); throb = the bump throbs while held; reach = how far the juicy drops fly (1 = pop test G)
 */
export function popPlan(o) {
  const type = o.type;
  const grand = Boolean(o.last || o.first);
  const reduced = Boolean(o.reduced);
  const lite = Boolean(o.lite);
  const size = grand ? 'grand' : type === 'big' ? 'big' : 'small';
  const plan = { style: 'plain', size, drops: 0, glass: 0, ripple: null, jolt: 0, throb: false, reach: 1 };
  if (o.gentle) return { ...plan, style: 'gentle' };
  const calmRipple = reduced || lite; // no ripple with reduced motion or Lighter graphics
  if (EXTRA_KINDS.includes(type)) {
    plan.style = 'extra';
    if (!calmRipple) plan.ripple = rippleKnobs(grand ? 'grand' : 'big');
    if (type === 'gold' && !reduced) plan.glass = lite ? 1 : grand ? 4 : 2; // a few golden drops on the glass
    if (grand && !reduced) plan.jolt = 0.4;
    return plan;
  }
  if (!JUICY_KINDS.includes(type)) return plan; // blackhead, hair and unknown kinds: unchanged
  plan.style = 'juicy';
  plan.throb = !reduced;
  let n = reduced ? CALM_DROPS[type] : DROPS[type];
  if (grand) n = Math.round(n * (reduced ? 1.2 : 1.35)) + (type === 'big' ? 0 : 4);
  if (lite) n = Math.round(n * 0.6);
  plan.drops = n;
  plan.reach = grand ? Math.max(1, REACH[type]) * 1.05 : REACH[type];
  if (!reduced) {
    let g = grand ? (type === 'big' ? 5 : 4) : GLASS[type];
    if (lite) g = Math.ceil(g / 2);
    plan.glass = g;
  }
  if (!calmRipple) plan.ripple = rippleKnobs(size);
  if (grand && !reduced) plan.jolt = type === 'big' ? 0.55 : 0.4;
  return plan;
}

/**
 * The ripple's knobs for a show size (from pop test G: a main wave and a weaker one just after; the grand show adds a
 * third, softer wave and goes further).
 * @param {'small'|'big'|'grand'} size the show size
 * @returns {{amp: number, far: number, life: number, width: number, waves: number[][]}} knobs (waves = [delay s, strength, reach])
 */
export function rippleKnobs(size) {
  if (size === 'grand') return { amp: 4.2, far: 0.78, life: 0.65, width: 12, waves: [[0, 1, 1], [0.1, 0.55, 0.8], [0.22, 0.35, 0.6]] };
  if (size === 'big') return { amp: 3.4, far: 0.62, life: 0.5, width: 10, waves: [[0, 1, 1], [0.1, 0.55, 0.8]] };
  return { amp: 2.6, far: 0.44, life: 0.45, width: 9, waves: [[0, 1, 1], [0.1, 0.5, 0.75]] };
}

/**
 * Which way the goo mound slumps off the bump: square to the squeeze (clear of both fingertips), turned out over the
 * cheek and down, never up towards the eyes (pop test G's outDir).
 * @param {number} axis the squeeze line (radians)
 * @param {number} x the bump's x
 * @param {number} cx the face's middle x
 * @returns {number} angle in radians (0 = right, PI / 2 = down)
 */
export function outDir(axis, x, cx) {
  const pref = x >= cx ? 0.85 : Math.PI - 0.85;
  const p1 = axis + Math.PI / 2;
  const p2 = axis - Math.PI / 2;
  let d = Math.cos(p1 - pref) >= Math.cos(p2 - pref) ? p1 : p2;
  d += clamp(Math.atan2(Math.sin(pref - d), Math.cos(pref - d)), -0.55, 0.55);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return clamp(d, -0.15, Math.PI + 0.15);
}

/**
 * The juicy drops thrown out of the opening at the pop (pop test G): a ring of round drops, more of them square to the
 * squeeze (clear of the fingers), flatter upwards (never into the eyes), fast out but low so they land close by.
 * @param {{x: number, y: number, hr: number, openAng: number, big: boolean, n: number, scale: number, goo: string,
 *   reach?: number, rand: () => number}} o x, y = the bump; hr = the head's radius at the pop; openAng = the split's long
 *   direction; n = how many; scale = the scene's size factor; goo = the goo kind; reach = how far they fly (1 = pop test G);
 *   rand = random 0..1
 * @returns {{x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, goo: string, juicy: true}[]} the drops
 */
export function sprayDrops(o) {
  const out = [];
  const orx = o.hr * 0.78;
  const k = (o.big ? 1.1 : 1) * (o.reach ?? 1);
  for (let i = 0; i < o.n; i += 1) {
    const side = i % 2 ? 1 : -1;
    const a0 = i % 3 === 2 ? o.rand() * Math.PI * 2 : o.openAng + (side < 0 ? Math.PI : 0) + (o.rand() - 0.5) * 1.6;
    const a = Math.sin(a0) < 0 ? Math.atan2(Math.sin(a0) * 0.45, Math.cos(a0)) : a0; // flatter upwards
    const up = Math.max(0, -Math.sin(a)); // and shorter: a drop thrown up the face lands well short of the eyes
    const v = (260 + o.rand() * 300) * o.scale * k * (1 - 0.6 * up);
    const r = (i % 4 === 0 ? 4.6 + o.rand() * 1.6 : 2.8 + o.rand() * 1.8) * o.scale * (o.big ? 1.25 : 1);
    const u = (o.rand() - 0.5) * 2; // where along the opening it leaves
    out.push({
      x: o.x + Math.cos(o.openAng) * orx * u * 0.7, y: o.y + Math.sin(o.openAng) * orx * u * 0.7 - o.hr * 0.06,
      z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 70 + o.rand() * 90, r, goo: o.goo, juicy: true,
    });
  }
  return out;
}

/**
 * Where drops hit the screen glass round a screen point: well clear of the bump, on the screen, in its top 70 percent
 * (they slide down from there), spread round the bump (pop test G's makeGlass).
 * @param {{n: number, x: number, y: number, w: number, h: number, scale: number, power?: number, rand: () => number}} o
 *   n = how many; x, y = the bump on the screen (CSS px); w, h = the screen; scale = size factor; power = bigger drops
 *   for a bigger splash (1 = normal); rand = random 0..1
 * @returns {{x: number, y: number, r: number, delay: number}[]} each drop's spot, radius and how long after the pop it hits
 */
export function glassSpots(o) {
  const out = [];
  const m = Math.min(o.w, o.h);
  const pw = Math.sqrt(Math.max(1, o.power ?? 1));
  for (let i = 0; i < o.n; i += 1) {
    const a = (i / o.n) * Math.PI * 2 + o.rand() * 1.2;
    const d = m * (0.2 + o.rand() * 0.22);
    const r = (8 + o.rand() * 5) * Math.max(0.8, o.scale) * pw; // a bit bigger than the drops on the skin: nearer the eye
    const x = clamp(o.x + Math.cos(a) * d, r * 2, Math.max(r * 2, o.w - r * 2));
    const y = clamp(o.y + Math.sin(a) * d * 0.8, r * 2, Math.max(r * 2, o.h * 0.7));
    out.push({ x, y, r, delay: 0.04 + i * 0.07 + o.rand() * 0.05 });
  }
  return out;
}

/**
 * One step of a drop on the glass: it clings a moment, then slides slowly down (a little faster as it goes, with a
 * slight sway), shrinking, and lays a thin wet trail; it is gone after its life.
 * @param {{x: number, y: number, r: number, r0: number, age: number, hold: number, vy: number, life: number, sway: number,
 *   trail: {x: number, y: number}[]}} q the drop (changed in place)
 * @param {number} dt seconds
 * @param {number} scale size factor
 * @returns {boolean} false when it is gone
 */
export function stepGlass(q, dt, scale) {
  q.age += dt;
  if (q.age > q.life) return false;
  if (q.age < q.hold) return true;
  const k = Math.max(0.8, scale);
  q.vy = Math.min(q.vy + 30 * dt, (22 + q.r * 4) * k);
  q.y += q.vy * dt;
  q.x += Math.sin(q.age * 3 + q.sway) * 4 * dt;
  q.r = Math.max(q.r0 * 0.45, q.r - q.r0 * 0.12 * dt);
  const last = q.trail[q.trail.length - 1];
  if (!last || Math.hypot(q.x - last.x, q.y - last.y) > 5) q.trail.push({ x: q.x, y: q.y - q.r * 0.3 });
  if (q.trail.length > 40) q.trail.shift(); // a long slide keeps only its newest trail points
  return true;
}

/**
 * The popped bump's timeline at t seconds after the pop (pop test G): the top tears open, the emptied dome sinks into a
 * small crater, which heals back to smooth skin about two seconds after the pop; the goo mound rises out and slumps.
 * @param {number} t seconds since the pop
 * @returns {{split: number, sink: number, settle: number, rise: number, slump: number, done: boolean}} each 0..1;
 *   done = nothing more to draw for the crater
 */
export function craterAt(t) {
  return {
    split: smooth(t / 0.05),
    sink: smooth((t - 0.08) / 0.4),
    settle: smooth((t - CRATER.heal) / (CRATER.gone - CRATER.heal)),
    rise: smooth((t - 0.02) / 0.1),
    slump: smooth((t - 0.16) / 0.6),
    done: t >= CRATER.gone,
  };
}

/**
 * One throb of the bubbling bump while it is held: a quick swell, then a rest, once per phase step.
 * @param {number} ph the throb phase (it counts up faster as the pressure rises)
 * @returns {number} 0..1
 */
export function throb(ph) {
  const f = ph - Math.floor(ph);
  return f < 0.38 ? Math.sin((Math.PI * f) / 0.38) ** 2 : 0;
}

/**
 * How the warm cloth's steam follows the bump under it: it eases up while the cloth is on a bump (stronger as the bump
 * warms) and fades away when the cloth is lifted or moved off.
 * @param {number} k the steam now, 0..1
 * @param {number} dt seconds
 * @param {number} target 0 = off a bump, else the warmth under it (0..1)
 * @returns {number} the steam next, 0..1
 */
export function steamStep(k, dt, target) {
  const want = target > 0 ? 0.45 + 0.55 * clamp(target, 0, 1) : 0;
  return want > k ? Math.min(want, k + dt * 1.6) : Math.max(want, k - dt * 1.2);
}

/**
 * How many steam wisps the warm cloth shows: five, three with Lighter graphics or reduced motion.
 * @param {boolean} lite Lighter graphics
 * @param {boolean} reduced reduced motion
 * @returns {number} wisps
 */
export function steamWisps(lite, reduced) {
  return lite || reduced ? 3 : 5;
}
