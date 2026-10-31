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
 * the game. A loud crack, the horn flies at you spinning and thunks into the screen glass like a dart, a big burst of pale horn goo,
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

/** The Evil Horn's flight onto the screen glass (owner 2026-10-31, the new ending), in seconds after the crack: it
 * leaves (launch), flies at the viewer, growing and spinning, and thunks into the glass like a dart (fly; the thwack in
 * the horn_crack sound comes at 0.42 s), quivers there (until stick), droops from its tip (until droop), then comes
 * loose and falls off the bottom of the screen (gone). turns = spins on the way; grow = at most this many times its
 * size on the face once it is on the glass; fore = how long it looks while it points at you, stuck in the glass (a
 * share of its length: it is seen nearly end on, then it droops to its full length); tipLen and tipTurn = where
 * drawHorn's hooked tip is, seen from its base (in horn sizes, and turned this far from straight up). */
export const HORN_SHOW = { launch: 0.05, fly: 0.42, stick: 1.0, droop: 1.4, gone: 1.9, turns: 2, grow: 2.6, fore: 0.5, tipLen: 1.37, tipTurn: 0.34 };

/**
 * Where the Evil Horn hits the screen glass (all in screen px: the glass is in front of the zoom, so the spot is always
 * on screen, never over the hair or a cap, the same upright, sideways and zoomed in): a little up from the middle, on
 * the horn's own side, never behind a button. Its body points back the way it came (tip first into the glass), and it
 * grows as it comes at you, to about 0.4 of the screen's short side (at most HORN_SHOW.grow times, never smaller).
 * @param {{x: number, y: number, len: number, w: number, h: number, avoid?: {x: number, y: number, w: number, h: number}[]}} o
 *   x, y = the horn's base on screen; len = base to tip on screen now; w, h = the screen (canvas CSS px); avoid = boxes
 *   of buttons over the scene (screen px)
 * @returns {{x: number, y: number, a: number, grow: number}} the tip's spot, the way from its base to its tip there
 *   (0 = tip straight up) and its size on the glass (times its size now)
 */
export function hornTarget(o) {
  const grow = clamp((Math.min(o.w, o.h) * 0.4) / Math.max(1, o.len), 1, HORN_SHOW.grow);
  const L = o.len * grow; // base to tip once it hangs full length from the glass
  const side = o.x >= o.w / 2 ? 1 : -1;
  const tries = [[0.16, 0.36], [0.06, 0.32], [0.24, 0.45], [-0.08, 0.38], [0.1, 0.5], [0, 0.26]];
  /** The way it points for a tip spot: from where it came from, else a slight tilt. @param {number} x tip x @param {number} y tip y @returns {number} turn */
  const turn = (x, y) => (Math.hypot(x - o.x, y - o.y) > L * 0.3 ? Math.atan2(x - o.x, -(y - o.y)) : side * 0.5);
  /** Whether the stuck or hanging horn (tip, middle, base) would sit behind a button or off the screen. @param {number} x tip x @param {number} y tip y @param {number} a turn @returns {boolean} yes */
  const bad = (x, y, a) => [[a, HORN_SHOW.fore], [0, 1]].some(([q, f]) => [0, 0.5, 1].some((s) => {
    const px = x - Math.sin(q) * L * f * s;
    const py = y + Math.cos(q) * L * f * s;
    const pad = L * 0.15;
    if (px < pad || px > o.w - pad || py < pad || py > o.h - pad) return true;
    return (o.avoid ?? []).some((b) => px > b.x - pad && px < b.x + b.w + pad && py > b.y - pad && py < b.y + b.h + pad);
  }));
  const at = tries.map(([fx, fy]) => {
    const x = o.w / 2 + side * o.w * fx;
    const y = o.h * fy;
    return { x, y, a: turn(x, y), grow };
  });
  return at.find((t) => !bad(t.x, t.y, t.a)) ?? at[0];
}

/**
 * The Evil Horn at t seconds after the crack (drawHornShow, pop-fx-art.js; screen px): where its base is, the way from
 * its base to its tip (a), its size (k times its size on the face), how long it looks (fore: 1 = full length, less
 * while it points at you) and how visible, and the glass hit (seconds since). On the way it spins about its middle,
 * grows faster and faster and turns its tip to you; on the glass it quivers about its tip, droops until it hangs full
 * length from the tip, then falls off the bottom of the screen, tumbling. Calm (reduced motion): it only lifts off and
 * fades.
 * @param {{x: number, y: number, len: number, spin: number, aimX: number, aimY: number, aimA: number, grow?: number,
 *   H?: number, calm?: boolean}} hn x, y = its base on screen at the crack; len = base to tip then; spin = -1 or 1 (and
 *   the way its tip hooks); aimX, aimY, aimA, grow = hornTarget's tip spot, turn and size; H = the screen's height
 * @param {number} t seconds since the crack
 * @returns {{x: number, y: number, a: number, k: number, fore: number, alpha: number, flying: boolean, hit: number,
 *   done: boolean}} the base, the way to its tip (radians), size, length share, alpha, flying = on its way (speed
 *   trail), hit = seconds since it hit the glass (-1 = not yet)
 */
export function hornAt(hn, t) {
  const S = HORN_SHOW;
  if (hn.calm) {
    const up = smooth(t / 0.5) * hn.len * 0.5 + Math.max(0, t - 0.5) * hn.len * 0.4;
    return { x: hn.x, y: hn.y - up, a: hn.spin * S.tipTurn, k: 1, fore: 1, alpha: clamp(1 - (t - 0.7) / 0.4, 0, 1), flying: false, hit: -1, done: t >= 1.1 };
  }
  const G = hn.grow ?? 1;
  /** A state from its tip spot, turn and length share (full size). @param {number} x tip x @param {number} y tip y @param {number} a turn @param {number} f length share @returns {object} state */
  const from = (x, y, a, f) => ({ x: x - Math.sin(a) * hn.len * G * f, y: y + Math.cos(a) * hn.len * G * f, a, k: G, fore: f });
  if (t < S.fly) {
    const u = Math.max(0, t) / S.fly;
    const e = 1 - (1 - u) ** 2; // fast off, easing onto the glass
    const k = 1 + (G - 1) * u * u; // it grows faster and faster as it comes at you
    const a0 = hn.spin * S.tipTurn; // as it stood on the face (its tip hooks outwards)
    const a = a0 + e * (hn.aimA - a0 + hn.spin * Math.PI * 2 * S.turns);
    const fore = 1 - (1 - S.fore) * e * e; // it turns its tip to you
    const m0 = { x: hn.x + Math.sin(a0) * hn.len * 0.5, y: hn.y - Math.cos(a0) * hn.len * 0.5 }; // its middle on the face
    const m1 = { x: hn.aimX - Math.sin(hn.aimA) * hn.len * G * S.fore * 0.5, y: hn.aimY + Math.cos(hn.aimA) * hn.len * G * S.fore * 0.5 };
    const arc = Math.sin(Math.PI * u) * Math.hypot(m1.x - m0.x, m1.y - m0.y) * 0.18; // a little up-curve on the way
    const mx = m0.x + (m1.x - m0.x) * e;
    const my = m0.y + (m1.y - m0.y) * e - arc;
    const half = hn.len * k * fore * 0.5;
    return { x: mx - Math.sin(a) * half, y: my + Math.cos(a) * half, a, k, fore, alpha: 1, flying: t > S.launch * 0.5, hit: -1, done: false };
  }
  const hit = t - S.fly;
  if (t < S.stick) {
    const q = Math.exp(-hit * 4.5);
    const a = hn.aimA + Math.sin(hit * 42) * 0.3 * q; // the dart's boing: it quivers about its tip
    return { ...from(hn.aimX, hn.aimY, a, S.fore * (1 + Math.sin(hit * 42 + 1) * 0.12 * q)), alpha: 1, flying: false, hit, done: false };
  }
  const aim = Math.atan2(Math.sin(hn.aimA), Math.cos(hn.aimA)); // its turn on the glass, -PI..PI
  if (t < S.droop) { // it droops from its tip until it hangs full length straight down from it (0 = tip up, body below)
    const u = smooth((t - S.stick) / (S.droop - S.stick));
    const a = aim * (1 - u) + Math.sin(u * Math.PI) * 0.15 * -Math.sign(aim || 1);
    return { ...from(hn.aimX, hn.aimY, a, S.fore + (1 - S.fore) * u), alpha: 1, flying: false, hit, done: false };
  }
  const f = t - S.droop; // it comes loose and falls off the bottom of the screen, tumbling
  const span = S.gone - S.droop;
  const drop = Math.max(0, (hn.H ?? hn.aimY * 2) - hn.aimY) + hn.len * G * 1.3; // past the bottom edge, its whole length
  const tipY = hn.aimY + (drop * f * f) / (span * span);
  const tipX = hn.aimX + hn.spin * f * hn.len * G * 0.5;
  const a = hn.spin * f * 4;
  return { ...from(tipX, tipY, a, 1), alpha: clamp((S.gone - t) / 0.08, 0, 1), flying: false, hit, done: t >= S.gone };
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

// Goo drops on the screen glass, v2 (owner 2026-10-31 on v106: "just straight lines and boring", wanted "more realistic
// in the cartoony sense"): each one hits as an irregular splat with flung specks, gathers into a fat drop that grows a
// bulge at the bottom, then slides down in stick-slip lurches, wandering a little sideways, slowing as it thins, maybe
// splitting in two or picking up a droplet waiting below; it leaves a wet streak beaded with tiny droplets that dries
// from the top. Everything that sits on the glass (streak points, beads, waiting droplets, a split-off drop) lives in
// the drop's `trail` list, so a turn of the phone (engine.js resize) moves it all.

/** Glass drop timing: GATHER = seconds the splat takes to pull into a drop; DRY = seconds a streak point stays wet
 * before it has dried away (the oldest, at the top, first); LOSS = goo left behind per drop radius slid (as a share of
 * the drop); THIN = below this much goo it stops as a little bead. */
export const GLASS_DROP = { GATHER: 0.3, DRY: 1.5, LOSS: 0.055, THIN: 0.32 };

/**
 * A new goo drop on the glass at one of glassSpots' spots, ready for stepGlass (moving) and pop-fx-art.js drawGlassDrop.
 * @param {{x: number, y: number, r: number, delay: number}} s the spot (screen px), its radius and delay
 * @param {{goo: string, rand: () => number, born: number, w: number, h: number, scale?: number, lite?: boolean,
 *   still?: boolean}} o goo = goo kind; rand = random 0..1; born = the scene's time; w, h = the screen (CSS px);
 *   scale = size factor; lite = Lighter graphics (simpler drawing); still = reduced motion (it stays where it hit and fades)
 * @returns {object} the drop: x, y = where its main drop is; x0, y0 = where it hit; r0 = its size; m = how much goo it
 *   holds (1 = as it hit); ph = 'hit' | 'hold' | 'slip' | 'stick' | 'stop'; trail = everything it left on the glass
 */
export function makeGlassDrop(s, o) {
  const q = {
    glass: true, x: s.x, y: s.y, r: s.r, r0: s.r, age: -s.delay, goo: o.goo, a: 1, born: o.born,
    lite: Boolean(o.lite), still: Boolean(o.still), W: o.w, H: o.h, trail: [],
  };
  fillGlassDrop(q, o.rand, o.scale ?? 1);
  return q;
}

/**
 * Give a new glass drop its moving parts (engine.js only sets where it hit, its size, goo, the screen size and the
 * Lighter graphics / reduced motion flags; stepGlass calls this on its first step, makeGlassDrop at once).
 * @param {object} q the drop (changed in place)
 * @param {() => number} rand random 0..1
 * @param {number} scale size factor
 * @returns {void}
 */
export function fillGlassDrop(q, rand, scale) {
  const fat = q.r0 / (10 * Math.max(0.8, scale)); // about 1 for a normal drop, more for a fat one
  Object.assign(q, {
    x0: q.x, y0: q.y, m: 1, vx: 0, vy: 0, ph: 'hit', pt: 0, travel: 0, lastPt: 0, bulge: 0, wob: 0, n: 0,
    life: (q.still ? 2.4 : 3.2) + rand() * 0.8,
    hold: 0.25 + rand() * 0.25 + Math.max(0, fat - 1) * 0.4, // fat drops sit a little longer, growing their bulge
    ang: (rand() - 0.5) * 0.5, nextBead: 1 + rand() * 1.5, seed: 1 + rand() * 999,
    splitAt: rand() < 0.4 ? 2 + rand() * 3 : Infinity, // some split in two after this many radii of sliding
    rim: Array.from({ length: 10 }, () => 0.72 + rand() * 0.56), // the splat's lumpy rim as it hits
    specks: Array.from({ length: 5 + Math.floor(rand() * 3) }, () => ({ a: rand() * Math.PI * 2, d: 1.6 + rand() * 1.5, k: 0.08 + rand() * 0.12 })),
  });
  if (!Array.isArray(q.trail)) q.trail = [];
  if (q.still) return;
  const n = rand() < 0.6 ? (rand() < 0.35 ? 2 : 1) : 0; // a droplet or two waiting further down: picked up if it slides into one
  for (let i = 0; i < n; i += 1) {
    const y = q.y + q.r0 * (3 + rand() * 4 + i * 4);
    if (y < (q.H ?? Infinity) - q.r0) q.trail.push({ x: q.x + (rand() - 0.5) * q.r0 * 1.4, y, d: q.r0 * (0.2 + rand() * 0.14), dot: true });
  }
}

/**
 * A repeatable random number 0..1 for one glass drop (its own seed and counter), so the sums stay pure.
 * @param {{seed: number, n: number}} q the drop (its counter goes up)
 * @returns {number} 0..1
 */
function glassRand(q) {
  q.n = (q.n ?? 0) + 1;
  const v = Math.sin((q.seed ?? 1) * 12.9898 + q.n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * The radius of a drop (or its split-off half) holding m of the goo.
 * @param {number} r0 the drop's size as it hit
 * @param {number} m goo held (1 = all)
 * @returns {number} radius
 */
export function glassRadius(r0, m) {
  return r0 * Math.sqrt(Math.max(0, m));
}

/**
 * Let a drop go: a lurch of sliding with a new sideways lean (it wanders a little, never far).
 * @param {object} hd the moving drop (the main drop or its split-off half)
 * @param {object} q the glass drop that owns it (for the random numbers)
 * @returns {void}
 */
function startSlip(hd, q) {
  hd.ph = 'slip';
  hd.pt = 0.16 + glassRand(q) * 0.36 * (0.5 + Math.min(1.2, hd.m));
  hd.ang = clamp(hd.ang * 0.4 + (glassRand(q) - 0.5) * 0.7, -0.45, 0.45);
}

/**
 * One step of one moving drop on the glass (the main drop or its split-off half): it holds and bulges, then
 * stick-slips down, leaving streak points, beads and goo behind, picking up any waiting droplet it touches.
 * @param {object} hd the moving drop (changed in place)
 * @param {object} q the glass drop that owns it (its trail gets the new bits)
 * @param {number} dt seconds
 * @param {number} k size factor
 * @returns {void}
 */
function stepHead(hd, q, dt, k) {
  if (hd.gone || q.still || hd.ph === 'stop') return; // reduced motion: it stays where it hit and fades
  if (hd.ph === 'hit') { if (q.age >= GLASS_DROP.GATHER) { hd.ph = 'hold'; hd.pt = q.hold; } return; }
  if (hd.ph === 'hold') { // the goo gathers at the bottom into a fat bulge, then it lets go
    hd.bulge = Math.min(1, hd.bulge + dt / Math.max(0.2, q.hold));
    hd.pt -= dt;
    if (hd.pt <= 0) startSlip(hd, q);
    return;
  }
  hd.pt -= dt;
  const vmax = (28 + 72 * Math.min(1.4, hd.m)) * k; // thin drops crawl, fat ones run
  if (hd.ph === 'slip') {
    hd.vy = Math.min(vmax, hd.vy + (90 + 260 * hd.m) * k * dt);
    hd.bulge = Math.max(0, hd.bulge - dt * 3);
    if (hd.pt <= 0) { hd.ph = 'stick'; hd.pt = 0.07 + glassRand(q) * 0.3 * (1.3 - Math.min(1, hd.m) * 0.5); }
  } else { // stuck a moment on the glass: it stops and the goo piles into a bulge again
    hd.vy = Math.max(0, hd.vy - 700 * k * dt);
    hd.bulge = Math.min(1, hd.bulge + dt * 2.5);
    if (hd.pt <= 0) startSlip(hd, q);
  }
  hd.vx += (Math.tan(hd.ang) * hd.vy - hd.vx) * Math.min(1, dt * 6);
  const r = glassRadius(q.r0, hd.m);
  const ox = hd.x;
  const oy = hd.y;
  hd.x = clamp(hd.x + hd.vx * dt, r, Math.max(r, (q.W ?? Infinity) - r));
  hd.y += hd.vy * dt;
  const d = Math.hypot(hd.x - ox, hd.y - oy);
  hd.travel += d;
  hd.m = Math.max(0, hd.m - (d / q.r0) * GLASS_DROP.LOSS);
  const h = hd === q ? 0 : 1;
  if (hd.travel - hd.lastPt > q.r0 * 0.3) { // a streak point: wider where it went slowly (more goo left there)
    hd.lastPt = hd.travel;
    const slow = 1 - Math.min(1, hd.vy / vmax);
    q.trail.push({ x: hd.x, y: hd.y - r * 0.5, w: r * (0.36 + 0.28 * slow) * (0.75 + 0.5 * glassRand(q)), t: q.age, h });
  }
  if (hd.travel > hd.nextBead * q.r0) { // a tiny droplet left behind on the streak
    hd.nextBead += 1 + glassRand(q) * 2;
    hd.m = Math.max(0, hd.m - 0.02);
    q.trail.push({ x: hd.x + (glassRand(q) - 0.5) * r * 0.7, y: hd.y - r * 1.1, b: q.r0 * (0.1 + 0.1 * glassRand(q)), t: q.age });
  }
  for (const p of q.trail) { // a waiting droplet it runs into joins it (a little wobble and a push)
    if (!p.dot || Math.hypot(p.x - hd.x, p.y - hd.y) > r + p.d) continue;
    p.dot = false;
    p.gone = true;
    hd.m = Math.min(1.8, hd.m + (p.d / q.r0) ** 2 * 1.4);
    hd.vy += 20 * k;
    q.wob = 1;
  }
  const r1 = glassRadius(q.r0, hd.m); // a picked-up droplet makes it fatter: still on the screen
  hd.x = clamp(hd.x, r1, Math.max(r1, (q.W ?? Infinity) - r1));
  if (hd.m < GLASS_DROP.THIN) { hd.ph = 'stop'; hd.vy = 0; hd.vx = 0; } // too thin to go on: a bead that dries
  if (hd.y - r > (q.H ?? Infinity)) hd.gone = true; // off the bottom of the screen
}

/**
 * One step of a drop on the glass (SPEC D45, v2 owner 2026-10-31): the splat gathers into a fat drop, which bulges,
 * then stick-slips down, wandering a little, slowing as it thins and stopping as a bead; it may split in two or pick up
 * a waiting droplet; its streak dries from the top. Stays on the screen sideways; gone after its life.
 * @param {object} q the drop from makeGlassDrop (changed in place)
 * @param {number} dt seconds
 * @param {number} scale size factor
 * @returns {boolean} false when it is gone
 */
export function stepGlass(q, dt, scale) {
  if (q.ph === undefined) { // a fresh drop from engine.js: its moving parts, from a seed of where and when it hit
    let n = 0;
    const seed = (q.x ?? 0) * 7.31 + (q.y ?? 0) * 3.17 + (q.born ?? 0) * 11.3;
    fillGlassDrop(q, () => { n += 1; const v = Math.sin(seed + n * 91.7) * 43758.5453; return v - Math.floor(v); }, scale);
  }
  q.age += dt;
  if (q.age > q.life) return false;
  if (q.age < 0) return true;
  const k = Math.max(0.8, scale);
  q.wob = Math.max(0, (q.wob ?? 0) - dt * 3);
  stepHead(q, q, dt, k);
  let kid = null;
  for (const p of q.trail) if (p.kid) kid = p;
  if (kid) stepHead(kid, q, dt, k);
  else if (q.ph === 'slip' && q.travel > q.splitAt * q.r0 && q.m > 0.7) { // it splits: a smaller drop veers off
    const side = q.ang >= 0 ? -1 : 1;
    q.splitAt = Infinity;
    const part = q.m * 0.4;
    q.m -= part;
    q.ang = -side * (0.18 + glassRand(q) * 0.15);
    q.trail.push({ x: q.x, y: q.y - glassRadius(q.r0, q.m) * 0.5, w: glassRadius(q.r0, part) * 0.4, t: q.age, h: 1 });
    q.trail.push({
      kid: true, x: clamp(q.x + side * glassRadius(q.r0, part) * 0.6, glassRadius(q.r0, part), (q.W ?? Infinity) - glassRadius(q.r0, part)), y: q.y + glassRadius(q.r0, q.m) * 0.2, m: part, vx: 0,
      vy: q.vy * 0.7, ph: 'slip', pt: 0.25, ang: side * (0.32 + glassRand(q) * 0.18), travel: 0, lastPt: 0, nextBead: 1.5, bulge: 0,
    });
  }
  q.r = glassRadius(q.r0, q.m);
  const dry = GLASS_DROP.DRY;
  q.trail = q.trail.filter((p) => !p.gone && (p.t === undefined || q.age - p.t < dry + (p.b ? 0.8 : 0.3)));
  return !(q.gone && (!kid || kid.gone) && !q.trail.some((p) => p.w !== undefined || p.b));
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
