// The juicy pop's thinking part (SPEC D45 item 1, from pop test G): which pop a bump gets and how big it is, where the
// goo drops fly, where drops hit the screen glass and how they slide down, and the crater's timeline. Pure functions
// only (no DOM, no canvas, no clock): engine.js asks, pop-fx-art.js draws, ripple.js bends the picture, tests check.
// Rules (owner 2026-10-31): the goo kinds (whitehead, red, big) get the new pop, scaled by size: quick and crisp for
// the small ones, the full burst for the big one, the biggest show ("grand") for the LAST goo bump of a face (D46-32:
// blackheads and hairs left over do not count) and for Hubby's first pop in chapter 0 only (D46-26: not in the chapter
// 1 torchlight, whose last pop stays grand). Bumps under the mouth or on the nose aim their upward drops sideways
// (D46-33). Kinds with their own look keep it: the golden bump gets the ripple and a few golden
// drops on the glass, the Evil Horn the ripple, the blackhead plug and the ingrown hair stay as they were. The Settings
// switch "Gentle pops" gives today's calm pop everywhere; reduced motion keeps it calm (no ripple, no glass drops, no
// shake, fewer drops); Lighter graphics means fewer drops and no ripple. Cartoon goo only: cream, white or gold.
// Owner 2026-10-31 (splat v2): fewer, fatter drops that land close round the bump (plus a fine mist that vanishes),
// no goo ever settles on an eye (eyeAt: she blinks and it slides off, slideOffEye), and the Evil Horn got its own big
// show (hornPlan, hornTarget, hornAt, hornPuffs): a crack, the horn shoots off and sticks in the wall like a dart.

/** The bump kinds that get the new juicy pop (their own look while squeezed, split, goo mound, crater, drop spray). */
export const JUICY_KINDS = ['whitehead', 'red', 'big'];

/** Kinds that keep their own pop but get extras (ripple, glass drops): the golden bump and the Evil Horn (its own show). */
export const EXTRA_KINDS = ['gold', 'horn'];

/**
 * Whether a bump kind has a show of its own at the pop (a goo kind: the juicy kinds, the golden bump, the Evil Horn).
 * The blackhead plug and the ingrown hair are plain kinds: they keep their own look and never get the grand show.
 * @param {string} type the bump kind
 * @returns {boolean} true for a goo kind
 */
export const hasShow = (type) => JUICY_KINDS.includes(type) || EXTRA_KINDS.includes(type);

/**
 * Whether this pop gets the "last bump of the face" grand show (SPEC D46-32): it is a goo kind and every bump still
 * left after it is a plain kind (blackhead, hair), so the last goo bump gets the show even when tweezer jobs remain.
 * @param {string} type the kind of the bump being popped
 * @param {string[]} others the kinds of the bumps not popped yet, this one left out
 * @returns {boolean} true = the grand show
 */
export function lastShow(type, others) {
  return hasShow(type) && others.every((k) => !hasShow(k));
}

/**
 * Where on the face the drop spray turns its upward drops sideways (SPEC D46-33), in face units (u = -1 left edge .. 1,
 * v = -1 top .. 1 chin; logic.js FACE_FEATURES: eyes at v -0.14, nose tip 0.16, mouth 0.5). chinV = from here down a
 * bump is under the mouth (chin and jaw); mouthU = a bump wider out than this is beside the mouth (jaw), so its drops
 * go outwards, away from the lips; nose = the nose box (between the eyes down to above the mouth). tilt = how far
 * below level the turned drops fly (radians): more on the nose, so they land under the eyes, not on them.
 */
export const SIDEWAYS = { chinV: 0.42, mouthU: 0.3, noseU: 0.2, noseV: [-0.1, 0.4], tilt: { chin: 0.15, nose: 0.35 } };

/**
 * How the drop spray of a bump at this face spot is steered (SPEC D46-33): bumps under the mouth (chin, jaw) or on the
 * nose send their upward drops sideways, so none land on the lips, a moustache or an eye.
 * @param {number} u the bump across the face (-1 left edge .. 1)
 * @param {number} v the bump down the face (-1 top .. 1 chin)
 * @returns {{side: number, tilt: number}|null} null = no steering; side = 0 (each drop keeps its own side), -1 or 1
 *   (all go that way: outwards from a jaw bump); tilt = radians below level
 */
export function sprayAim(u, v) {
  if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
  const S = SIDEWAYS;
  if (v >= S.chinV) return { side: Math.abs(u) > S.mouthU ? Math.sign(u) : 0, tilt: S.tilt.chin }; // under the mouth
  if (Math.abs(u) <= S.noseU && v >= S.noseV[0] && v <= S.noseV[1]) return { side: 0, tilt: S.tilt.nose }; // on the nose
  return null;
}

/** Seconds a juicy drop that missed the skin (the room, hair, a hat) takes to slide down off it and fade away. */
export const FALL_TIME = 0.55;

/** How long the crater shows: it starts healing at CRATER.heal s and is smooth skin again at CRATER.gone s. */
export const CRATER = { heal: 0.7, gone: 2.0 };

/** The juicy goo drops per kind before scaling (pop test G had 19 for a whitehead and 26 for the big one). Owner
 * 2026-10-31 ("the splat is sort of everywhere"): fewer, fatter drops that land close round the bump, so each pop
 * leaves one readable splat; the fine mist in the air (MIST) keeps the burst lively without cluttering the face. */
const DROPS = { whitehead: 6, red: 7, big: 12 };
/** The same in the calm version (reduced motion). */
const CALM_DROPS = { whitehead: 6, red: 7, big: 10 };
/** Tiny mist specks per show size: they fly with the burst and vanish where they land (no goo left behind). */
const MIST = { small: 5, big: 8, grand: 12 };
/** Drops on the screen glass per kind (G: 3 for a whitehead, 4 for the big one; small ones fewer: quick and crisp). */
const GLASS = { whitehead: 1, red: 1, big: 2 };
/** How far the drops fly per kind (1 = the big bump): the small ones closer (quick and crisp). */
const REACH = { whitehead: 0.8, red: 0.85, big: 1 };
/** How much further the grand show's drops fly than the big bump's. */
const GRAND_REACH = 1.3;

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
 * @returns {{style: 'gentle'|'juicy'|'extra'|'plain', size: 'small'|'big'|'grand', drops: number, mist: number, glass: number,
 *   ripple: {amp: number, far: number, life: number, width: number, waves: number[][]}|null, jolt: number,
 *   throb: boolean, reach: number, horn?: boolean}} style = gentle (today's pop), juicy (the new pop), extra (own look plus
 *   extras) or plain (unchanged); drops = juicy drops to fly; mist = tiny specks that fly and vanish; horn = the Evil
 *   Horn's own show (hornPlan); glass = drops on the screen glass; ripple = the see-through ripple's knobs
 *   (amp and width in scene px, far as a share of the shorter screen side) or null; jolt = how hard the picture jolts
 *   (0 = not at all); throb = the bump throbs while held; reach = how far the juicy drops fly (1 = pop test G)
 */
export function popPlan(o) {
  const type = o.type;
  const grand = Boolean(o.last || o.first);
  const reduced = Boolean(o.reduced);
  const lite = Boolean(o.lite);
  const size = grand ? 'grand' : type === 'big' || type === 'horn' ? 'big' : 'small';
  const plan = { style: 'plain', size, drops: 0, mist: 0, glass: 0, ripple: null, jolt: 0, throb: false, reach: 1 };
  if (o.gentle) return { ...plan, style: 'gentle' };
  const calmRipple = reduced || lite; // no ripple with reduced motion or Lighter graphics
  if (type === 'horn') return { ...plan, ...hornPlan(grand, reduced, lite) };
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
  if (grand) n = Math.round(n * (reduced ? 1.2 : 1.35)) + (type === 'big' ? 0 : 3);
  if (lite) n = Math.round(n * 0.6);
  plan.drops = n;
  plan.mist = reduced || lite ? 0 : MIST[size];
  plan.reach = grand ? Math.max(1, REACH[type]) * GRAND_REACH : REACH[type];
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
 * The Evil Horn's pop show (owner 2026-10-31: "not really a wow anymore"): after the grand show the biggest moment in
 * the game. A loud crack, the horn shoots off spinning and sticks in the wall like a dart, a big burst of pale horn goo,
 * a puff of dust at the base, the strongest ripple, several glass drops and a screen jolt. Reduced motion: no flight,
 * ripple, glass or jolt, fewer drops; Lighter graphics: fewer drops and glass drops, no ripple.
 * @param {boolean} grand it is the last goo bump of the face (a little more goo)
 * @param {boolean} reduced reduced motion
 * @param {boolean} lite Lighter graphics
 * @returns {{style: 'extra', horn: true, drops: number, mist: number, glass: number, ripple: object|null, jolt: number,
 *   reach: number, puffs: number}} the plan's horn part (puffs = dust clouds at the base)
 */
export function hornPlan(grand, reduced, lite) {
  return {
    style: 'extra', horn: true,
    drops: reduced ? 8 : lite ? 9 : grand ? 20 : 16,
    mist: reduced || lite ? 0 : 12,
    glass: reduced ? 0 : lite ? 2 : grand ? 4 : 3,
    ripple: reduced || lite ? null : { ...rippleKnobs('grand'), amp: 5, far: 0.85 },
    jolt: reduced ? 0 : 1.25,
    reach: grand ? 1.4 : 1.25,
    puffs: reduced || lite ? 4 : 7,
  };
}

/** The Evil Horn's flight, in seconds after the crack: it leaves (launch), hits the wall (fly), hangs there quivering
 * (until stick), then drops loose and fades (gone). turns = spins on the way. */
export const HORN_SHOW = { launch: 0.05, fly: 0.42, stick: 1.2, gone: 1.75, turns: 2 };

/**
 * Where the Evil Horn sticks in the wall: up and out on its own side of the face, beside the hair (pure numbers in scene
 * px). It stays on the scene, its tip a little in from the edge.
 * @param {{x: number, y: number, len: number, w: number, h: number, face: {cx: number, cy: number, rx: number, ry: number}|null,
 *   avoid?: {x: number, y: number, w: number, h: number}[]}} o x, y = the horn's base; len = the horn's length; w, h =
 *   the scene; face = the skin oval; avoid = boxes of buttons over the scene (scene px): it never sticks behind one
 * @returns {{x: number, y: number, a: number}} the tip's spot and the horn's turn there (0 = tip up; it points along its flight)
 */
export function hornTarget(o) {
  const f = o.face ?? { cx: o.w / 2, cy: o.h / 2, rx: o.w / 4, ry: o.h / 4 };
  const side = o.x >= f.cx ? 1 : -1;
  const m = o.len * 0.35;
  const top = o.len * 0.75;
  const wallX = side > 0 ? Math.min(o.w - m, f.cx + f.rx * 1.75) : Math.max(m, f.cx - f.rx * 1.75);
  const tries = [];
  // beside the hair on its own side, when there is wall there (sideways); else the top corner (a phone held upright),
  // then further in along the top
  if (Math.abs(wallX - f.cx) >= f.rx * 1.5) tries.push([wallX, clamp(f.cy - f.ry * 0.95, o.len * 0.9, Math.max(o.len * 0.9, o.h - o.len))]);
  for (const k of [1, 0.75, 0.5, 0.3]) tries.push([f.cx + side * (Math.abs(wallX - f.cx) * k), top]);
  /** Whether the stuck horn (its tip and its middle) would sit behind a button. @param {number} x tip x @param {number} y tip y @param {number} a turn @returns {boolean} yes */
  const hidden = (x, y, a) => (o.avoid ?? []).some((b) => [0, 0.5].some((s) => {
    const px = x - Math.sin(a) * o.len * s;
    const py = y + Math.cos(a) * o.len * s;
    const pad = o.len * 0.25;
    return px > b.x - pad && px < b.x + b.w + pad && py > b.y - pad && py < b.y + b.h + pad;
  }));
  const at = tries.map(([x, y]) => ({ x, y, a: Math.atan2(x - o.x, -(y - o.y)) })); // tip first, along the line from the base
  return at.find((t) => !hidden(t.x, t.y, t.a)) ?? at[0];
}

/**
 * The Evil Horn at t seconds after the crack (hornShow drawings, engine.js): where its base is, its turn and how
 * visible, and the wall hit (its spot and the seconds since). Calm (reduced motion): it only lifts off and fades.
 * @param {{x: number, y: number, len: number, spin: number, aimX: number, aimY: number, aimA: number, calm?: boolean}} hn
 *   x, y = its base on the face; len = its length; spin = -1 or 1; aimX, aimY, aimA = hornTarget's tip spot and turn
 * @param {number} t seconds since the crack
 * @returns {{x: number, y: number, a: number, alpha: number, flying: boolean, hit: number, done: boolean}} the base,
 *   turn (radians), alpha, flying = on its way (speed trail), hit = seconds since it hit the wall (-1 = not yet)
 */
export function hornAt(hn, t) {
  const S = HORN_SHOW;
  if (hn.calm) {
    const up = smooth(t / 0.5) * hn.len * 0.5 + Math.max(0, t - 0.5) * hn.len * 0.4;
    return { x: hn.x, y: hn.y - up, a: 0, alpha: clamp(1 - (t - 0.7) / 0.4, 0, 1), flying: false, hit: -1, done: t >= 1.1 };
  }
  const ux = Math.sin(hn.aimA); // the way it points at the end (tip first)
  const uy = -Math.cos(hn.aimA);
  const bx = hn.aimX - ux * hn.len * 0.72; // its base once stuck (the tip a little way into the wall)
  const by = hn.aimY - uy * hn.len * 0.72;
  if (t < S.fly) {
    const u = t / S.fly;
    const e = 1 - (1 - u) ** 2; // fast off, easing into the wall
    const arc = Math.sin(Math.PI * u) * Math.hypot(bx - hn.x, by - hn.y) * 0.22; // a little up-curve on the way
    const a = e * (hn.aimA + hn.spin * Math.PI * 2 * S.turns);
    return { x: hn.x + (bx - hn.x) * e, y: hn.y + (by - hn.y) * e - arc, a, alpha: 1, flying: t > S.launch * 0.5, hit: -1, done: false };
  }
  const hit = t - S.fly;
  if (t < S.stick) {
    const q = Math.sin(hit * 42) * 0.32 * Math.exp(-hit * 4.5); // the dart's boing: it quivers about its tip
    const a = hn.aimA + q;
    const L = hn.len * 0.72;
    return { x: hn.aimX - Math.sin(a) * L, y: hn.aimY + Math.cos(a) * L, a, alpha: 1, flying: false, hit, done: false };
  }
  const f = t - S.stick; // it drops loose, tumbling, and fades
  return {
    x: bx + hn.spin * f * hn.len * 0.6, y: by + f * f * hn.len * 9, a: hn.aimA + hn.spin * f * 5,
    alpha: clamp(1 - f / (S.gone - S.stick), 0, 1), flying: false, hit, done: t >= S.gone,
  };
}

/**
 * The puffs of dust at the Evil Horn's base as it cracks out (cartoon smoke balls round the base, a little up).
 * @param {{x: number, y: number, r: number, n: number, rand: () => number}} o x, y = the base; r = the bump's radius;
 *   n = how many; rand = random 0..1
 * @returns {{x: number, y: number, vx: number, vy: number, r: number, t: number, life: number}[]} the puffs
 */
export function hornPuffs(o) {
  const out = [];
  for (let i = 0; i < o.n; i += 1) {
    const a = Math.PI + (i / Math.max(1, o.n - 1)) * Math.PI + (o.rand() - 0.5) * 0.4; // round the top half, out and up
    const sp = o.r * (2.4 + o.rand() * 1.6);
    out.push({
      x: o.x + Math.cos(a) * o.r * 0.5, y: o.y + Math.sin(a) * o.r * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - o.r * 0.6,
      r: o.r * (0.45 + o.rand() * 0.3), t: 0, life: 0.55 + o.rand() * 0.25,
    });
  }
  return out;
}

/**
 * Which eye a point is on (the drop keep-out, owner 2026-10-31: no goo may settle on an eye): the eye's spot with its
 * lids, lashes and any lens, a little wider by the drop's own size.
 * @param {{x: number, y: number, rx: number, ry: number}[]} eyes the face's eyes (scene px, face.js makeFaceLife eyes)
 * @param {number} x point x
 * @param {number} y point y
 * @param {number} [r] the drop's radius
 * @returns {object|null} the eye, or null
 */
export function eyeAt(eyes, x, y, r = 0) {
  for (const e of eyes ?? []) {
    const dx = (x - e.x) / (e.rx + r * 1.1); // the splat spreads a little wider than the drop
    const dy = (y - e.y) / (e.ry + r * 1.1);
    if (dx * dx + dy * dy <= 1) return e;
  }
  return null;
}

/**
 * Where a drop that hit an eye ends up after she blinks it away: it slides down off the shut eye and stops just under
 * it, on the cheek.
 * @param {{y: number, ry: number}} eye the eye
 * @param {number} r the drop's radius
 * @returns {number} the y it slides to
 */
export function slideOffEye(eye, r) {
  return eye.y + eye.ry + r * 1.7;
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
 *   reach?: number, aim?: {side: number, tilt: number}|null, rand: () => number}} o x, y = the bump; hr = the head's
 *   radius at the pop; openAng = the split's long direction; n = how many; scale = the scene's size factor; goo = the goo
 *   kind; reach = how far they fly (1 = pop test G); aim = sprayAim's steering (a chin, jaw or nose bump: the upward
 *   drops go sideways and a little down instead); rand = random 0..1
 * @returns {{x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, goo: string, juicy: true}[]} the drops
 */
export function sprayDrops(o) {
  const out = [];
  const orx = o.hr * 0.78;
  const k = (o.big ? 1.1 : 1) * (o.reach ?? 1);
  for (let i = 0; i < o.n; i += 1) {
    const side = i % 2 ? 1 : -1;
    const a0 = i % 3 === 2 ? o.rand() * Math.PI * 2 : o.openAng + (side < 0 ? Math.PI : 0) + (o.rand() - 0.5) * 1.6;
    let a = Math.sin(a0) < 0 ? Math.atan2(Math.sin(a0) * 0.45, Math.cos(a0)) : a0; // flatter upwards
    const up = Math.max(0, -Math.sin(a)); // and shorter: a drop thrown up the face lands well short of the eyes
    if (o.aim && up > 0) { // under the mouth or on the nose (D46-33): sideways and a little down, off the lips and eyes
      const way = o.aim.side || (Math.cos(a) >= 0 ? 1 : -1);
      const tip = o.aim.tilt + up * 0.3; // the steeper it went up, the more it tips down
      a = way > 0 ? tip : Math.PI - tip;
    }
    // Owner 2026-10-31: slower than pop test G (they land close round the bump, one readable splat) and fatter.
    const v = (95 + o.rand() * 150) * o.scale * k * (1 - 0.6 * up);
    const r = (i % 3 === 0 ? 5.4 + o.rand() * 1.8 : 3.4 + o.rand() * 1.8) * o.scale * (o.big ? 1.2 : 1);
    const u = (o.rand() - 0.5) * 2; // where along the opening it leaves
    out.push({
      x: o.x + Math.cos(o.openAng) * orx * u * 0.7, y: o.y + Math.sin(o.openAng) * orx * u * 0.7 - o.hr * 0.06,
      z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 70 + o.rand() * 90, r, goo: o.goo, juicy: true,
    });
  }
  return out;
}

/**
 * The fine mist of a pop: tiny specks that fly out faster and further than the goo drops and vanish where they land
 * (they leave nothing to wipe), so the burst in the air stays lively while the splat on the skin stays tidy.
 * @param {{x: number, y: number, hr: number, n: number, scale: number, goo: string, reach?: number, rand: () => number}} o
 *   x, y = the bump; hr = the head's radius; n = how many; scale = size factor; goo = the goo kind; reach = how far
 * @returns {{x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, goo: string, juicy: true, mist: true}[]} the specks
 */
export function mistDrops(o) {
  const out = [];
  for (let i = 0; i < o.n; i += 1) {
    let a = (i / o.n) * Math.PI * 2 + o.rand() * 0.8;
    if (Math.sin(a) < 0) a = Math.atan2(Math.sin(a) * 0.5, Math.cos(a)); // flatter upwards, as the drops
    const v = (220 + o.rand() * 200) * o.scale * (o.reach ?? 1);
    out.push({
      x: o.x, y: o.y - o.hr * 0.1, z: 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 90 + o.rand() * 90,
      r: (1.3 + o.rand() * 1.1) * o.scale, goo: o.goo, juicy: true, mist: true,
    });
  }
  return out;
}

/**
 * Where drops hit the screen glass round a screen point: clear of the bump, on the screen, in its top 70 percent
 * (they slide down from there), spread round the bump (pop test G's makeGlass), never over an eye.
 * @param {{n: number, x: number, y: number, w: number, h: number, scale: number, power?: number, rand: () => number,
 *   avoid?: {x: number, y: number, r: number}[]}} o n = how many; x, y = the bump on the screen (CSS px); w, h = the
 *   screen; scale = size factor; power = bigger drops for a bigger splash (1 = normal); rand = random 0..1; avoid =
 *   screen circles no drop may cover (the eyes)
 * @returns {{x: number, y: number, r: number, delay: number}[]} each drop's spot, radius and how long after the pop it hits
 */
export function glassSpots(o) {
  const out = [];
  const m = Math.min(o.w, o.h);
  const pw = Math.sqrt(Math.max(1, o.power ?? 1));
  for (let i = 0; i < o.n; i += 1) {
    const r = (8 + o.rand() * 5) * Math.max(0.8, o.scale) * pw; // a bit bigger than the drops on the skin: nearer the eye
    let x = 0;
    let y = 0;
    for (let k = 0; k < 8; k += 1) { // a few tries for a spot clear of the eyes; the last try is kept
      const a = (i / o.n) * Math.PI * 2 + o.rand() * 1.2 + k * 0.9;
      const d = m * (0.14 + o.rand() * 0.2);
      x = clamp(o.x + Math.cos(a) * d, r * 2, Math.max(r * 2, o.w - r * 2));
      y = clamp(o.y + Math.sin(a) * d * 0.8, r * 2, Math.max(r * 2, o.h * 0.7));
      // not on an eye, nor above one (it slides down from where it hits)
      if (!(o.avoid ?? []).some((e) => Math.abs(x - e.x) < e.r + r * 1.3 && y < e.y + e.r + r * 1.3)) break;
    }
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
  q.vy = Math.min(q.vy + 70 * dt, (34 + q.r * 5) * k); // owner 2026-10-31: no drop sits still for long
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
