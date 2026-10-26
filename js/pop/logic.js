// The pop scene's pure rules, kept apart so they can be tested in Node: the popping-sound switch, the kinds of bump,
// where the face sits in the scene (face geometry), where the bumps go on that face (never on the eyes, brows or
// mouth, never under the hair, never touching each other, each with a fingertip-sized tap target), the nose strip,
// how squeezing builds pressure, which bump a finger touches, and the face's mood. No DOM, no audio, no timers here.
// The kinds of bump (hold time, size, goo, tools, pay) live in data/bumps.js.
import { BUMP_IDS, bumpInfo, isImplemented } from '../data/bumps.js';

const POP_SOUND_KEY = 'popper.popSound'; // "on" or "off"; nothing stored = on

/** How much one tap or key press (without holding) adds to the pressure: three of them pop a bump. */
export const TAP_STEP = 0.34;

/** The face half-width (px) at which the bump radii in data/bumps.js are used as they are; bigger faces get bigger bumps. */
export const FACE_UNIT = 165;
/** The smallest tap target a bump gets, in CSS px (a fingertip; SPEC section 3). */
export const MIN_TAP = 44;
/** The smallest drawn bump radius in CSS px (so even a blackhead is easy to see and aim at). */
export const MIN_BUMP_R = 11;
/** Bumps on one face in the demo (SPEC D4: 6 to 10 per customer). */
export const FACE_BUMPS = 8;

/**
 * Where the parts of the placeholder face sit, in face units: u = -1 (left edge of the face) .. 1, v = -1 (top) .. 1
 * (chin). The drawing (face.js) and the bump layout both read these, so bumps never land on a feature.
 */
export const FACE_FEATURES = {
  hairTop: -0.86, // hairline in the middle of the forehead
  hairCurve: 0.3, // how far the hairline dips towards the temples (v grows by hairCurve * u * u)
  eyeU: 0.36, // eye centres at u = -eyeU and +eyeU
  eyeV: -0.14,
  eyeS: 0.16, // half the eye width, in rx units
  browV: -0.36,
  noseV: 0.16, // nose tip
  mouthV: 0.5,
  mouthW: 0.28, // half the mouth width, in rx units
};

// Face parts (T2.1): how each part id from data/customers.js FACE_PARTS changes the geometry. The drawing in face.js
// and the bump layout read the same numbers, so bumps stay on bare skin for every shape, hair style and accessory.
/** Head shape -> height of the bare-skin oval divided by its width (the drawn head outline always contains this oval). */
export const SHAPE_ASPECT = { round: 1.2, oval: 1.3, square: 1.26, heart: 1.3, long: 1.4, chubby: 1.18 };
/** Hair style -> [hairTop, hairCurve]: where the hairline sits (bald and mohawk show more forehead). */
export const HAIRLINES = {
  bald: [-1.05, 0.3], short: [-0.88, 0.3], curly: [-0.86, 0.3], long: [-0.9, 0.34], bun: [-0.92, 0.3],
  ponytail: [-0.92, 0.3], mohawk: [-0.98, 0.3], afro: [-0.86, 0.28], bob: [-0.84, 0.3],
};
/** Headwear -> how low its lower edge reaches in the middle of the forehead (it follows the hairline curve). */
export const HEADWEAR_LINES = { beanie: -0.84, 'pilot-cap': -0.84, hat: -0.88, headband: -0.9 };
/** Eye style -> half the eye width in rx units. */
export const EYE_SIZES = { round: 0.16, wide: 0.19, sleepy: 0.16, sparkly: 0.18, squint: 0.15, tiny: 0.1 };
/** Mouth style -> half the mouth width in rx units. */
export const MOUTH_WIDTHS = { smile: 0.27, flat: 0.25, wobbly: 0.26, grin: 0.31, small: 0.17, open: 0.27 };

/**
 * Whether the popping sounds are on (on when nothing is stored).
 * @param {Storage|undefined} storage e.g. localStorage
 * @returns {boolean} true = on
 */
export function loadPopSoundOn(storage) {
  try { return storage?.getItem(POP_SOUND_KEY) !== 'off'; } catch { return true; }
}

/**
 * Remember the popping-sound switch. Never throws.
 * @param {Storage|undefined} storage e.g. localStorage
 * @param {boolean} on true = on
 * @returns {void}
 */
export function savePopSoundOn(storage, on) {
  try { storage?.setItem(POP_SOUND_KEY, on ? 'on' : 'off'); } catch { /* blocked storage: only this visit */ }
}

/**
 * A small seeded random number generator (mulberry32), so a face looks the same in tests and screenshots.
 * @param {number} seed any whole number
 * @returns {() => number} a function giving numbers 0..1
 */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Keep a number between two limits.
 * @param {number} x the number
 * @param {number} lo lowest
 * @param {number} hi highest
 * @returns {number} the clamped number
 */
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * How big the head is in the scene (T1.0b, SPEC D10): the head (forehead to chin) is about 70 percent of the scene
 * height, but never wider than about two thirds of the scene, so the studio room shows around it in both phone
 * orientations (above the head and shoulders in portrait, at the sides in landscape).
 */
export const FACE_FIT = {
  heightPart: 0.35, // ry = this part of the scene height (so the head, 2 * ry, is 70 percent of it)
  widthPart: 0.34, // rx is at most this part of the scene width (the hair and ears stick out a little further)
  smallRx: 128, // ...but on narrow phones rx may grow to this (at most 0.4 of the width), so 8 bumps still fit
  maxRy: 0.39, // ry never more than this part of the height, so hair and shoulders still fit (big heads, size > 1)
  centre: 0.5, // where the face centre likes to sit, as a part of the scene height
  topRoom: 0.05, // room above the hair, as a part of the scene height
  chinMax: 0.88, // the chin stays above this part of the height, so some shoulders always show
};

/**
 * Where the head sits in a scene of a given size: a head-and-shoulders picture with the room (backdrop) around it,
 * in portrait or landscape (see FACE_FIT).
 * @param {number} width scene width in CSS px
 * @param {number} height scene height in CSS px
 * @param {{size?: number, shape?: string, hair?: string, eyes?: string, mouth?: string, accessories?: string[]}} [spec]
 *   the face spec (face part ids from data/customers.js FACE_PARTS); size scales the head (0.7 .. 1.15, 1 = as big as
 *   fits). Unknown or missing ids fall back to an oval head, short hair, round eyes and a smile.
 * @returns {{width: number, height: number, cx: number, cy: number, rx: number, ry: number, unit: number,
 *   features: object, keepOut: {x: number, y: number, w: number, h: number}[]}} the face geometry in CSS px
 *   (cx, cy = face centre, rx, ry = half-width and half-height of the bare-skin oval, unit = bump size factor,
 *   features = FACE_FEATURES adjusted for this face's parts, keepOut = boxes around the eyes, brows, mouth and any
 *   accessory lying on the face (glasses, moustache, clown nose, flower) where no bump may sit)
 */
export function faceGeometry(width, height, spec = {}) {
  const size = clamp(Number(spec.size) || 1, 0.7, 1.15);
  const shape = SHAPE_ASPECT[spec.shape] ? spec.shape : 'oval';
  const aspect = SHAPE_ASPECT[shape];
  const F = FACE_FIT;
  const byWidth = Math.max(width * F.widthPart, Math.min(width * 0.4, F.smallRx)) * aspect;
  const ry = Math.min(Math.min(byWidth, height * F.heightPart) * size, height * F.maxRy, width * 0.41 * aspect);
  const rx = ry / aspect;
  const cx = width / 2;
  // Room for the hair above and some shoulders below; otherwise near the middle.
  const lo = ry * 1.12 + height * F.topRoom;
  const hi = Math.min(height - ry * 1.2, height * F.chinMax - ry);
  const cy = clamp(height * F.centre, lo, Math.max(lo, hi));
  const acc = Array.isArray(spec.accessories) ? spec.accessories : [];
  const [hairTop0, hairCurve] = HAIRLINES[spec.hair] ?? HAIRLINES.short;
  // A hat, cap or band hides the hair line; its lower edge then counts as the hairline.
  const hairTop = Math.max(hairTop0, ...acc.map((a) => HEADWEAR_LINES[a] ?? -9));
  const f = {
    ...FACE_FEATURES, shape, aspect, hairTop, hairCurve,
    eyeS: EYE_SIZES[spec.eyes] ?? FACE_FEATURES.eyeS, mouthW: MOUTH_WIDTHS[spec.mouth] ?? FACE_FEATURES.mouthW,
  };
  /** A keep-out box from face units. @param {number} u0 left @param {number} v0 top @param {number} u1 right @param {number} v1 bottom @returns {object} box in px */
  const box = (u0, v0, u1, v1) => ({ x: cx + u0 * rx, y: cy + v0 * ry, w: (u1 - u0) * rx, h: (v1 - v0) * ry });
  const glasses = acc.includes('glasses') || acc.includes('sunglasses');
  const keepOut = [];
  for (const s of [-1, 1]) { // each eye with its eyebrow (and lens), with room for the brows to move with the mood
    const inner = glasses ? 0.22 : 0.25; // lenses are at most 0.21 wide, so the nose between them stays free
    const outer = glasses ? 0.28 : 0.25;
    const [u0, u1] = s < 0 ? [-f.eyeU - outer, -f.eyeU + inner] : [f.eyeU - inner, f.eyeU + outer];
    keepOut.push(box(u0, f.browV - 0.1, u1, f.eyeV + (glasses ? 0.2 : 0.12)));
  }
  keepOut.push(box(-(f.mouthW + 0.06), f.mouthV - 0.1, f.mouthW + 0.06, f.mouthV + 0.12));
  if (glasses) {
    keepOut.push(box(-0.12, f.eyeV - 0.07, 0.12, f.eyeV + 0.03)); // the bridge over the nose
    for (const s of [-1, 1]) keepOut.push(box(s > 0 ? f.eyeU + 0.2 : -1.02, f.eyeV - 0.08, s > 0 ? 1.02 : -f.eyeU - 0.2, f.eyeV + 0.01)); // the arms
  }
  if (acc.includes('moustache')) keepOut.push(box(-0.36, f.noseV + 0.08, 0.36, f.noseV + 0.3));
  if (acc.includes('clown-nose')) {
    const n = 0.13; // the ball's radius plus a little, in rx units
    keepOut.push({ x: cx - n * rx, y: cy + f.noseV * ry - n * rx, w: 2 * n * rx, h: 2 * n * rx });
  }
  if (acc.includes('flower')) keepOut.push(box(0.56, -1.05, 1.05, -0.58)); // tucked in the hair above the right temple
  return { width, height, cx, cy, rx, ry, unit: rx / FACE_UNIT, features: f, keepOut };
}

/**
 * How to move things from one face geometry to another of the same person (the window was resized or the phone
 * turned): a uniform scale and a shift, so every point keeps its place on the face (same face units u, v).
 * @param {{cx: number, cy: number, rx: number}} from the old face geometry
 * @param {{cx: number, cy: number, rx: number}} to the new face geometry (same face spec, other scene size)
 * @returns {{s: number, tx: number, ty: number}} new x = x * s + tx, new y = y * s + ty, new radius = r * s
 */
export function faceMap(from, to) {
  const s = to.rx / from.rx;
  return { s, tx: to.cx - from.cx * s, ty: to.cy - from.cy * s };
}

/**
 * Turn face units into scene px.
 * @param {{cx: number, cy: number, rx: number, ry: number}} face the face geometry
 * @param {number} u -1 (left edge) .. 1
 * @param {number} v -1 (top) .. 1 (chin)
 * @returns {{x: number, y: number}} the point in CSS px
 */
export function facePoint(face, u, v) {
  return { x: face.cx + u * face.rx, y: face.cy + v * face.ry };
}

/**
 * Whether a round bump fits on bare skin: inside the face oval (with a margin) and below the hairline.
 * @param {object} face the face geometry
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @returns {boolean} true when it is all on skin
 */
export function onSkin(face, x, y, r) {
  const m = r * 1.15 + 2;
  const ex = (x - face.cx) / Math.max(1, face.rx - m);
  const ey = (y - face.cy) / Math.max(1, face.ry - m);
  if (ex * ex + ey * ey > 1) return false;
  const u = (x - face.cx) / face.rx;
  const hairline = face.cy + (face.features.hairTop + face.features.hairCurve * u * u + 0.07) * face.ry; // the fringe tufts hang a little below the line
  return y - r * 1.1 > hairline;
}

/**
 * Whether a circle overlaps a rectangle (with a gap).
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} r radius
 * @param {{x: number, y: number, w: number, h: number}|null} box the rectangle
 * @param {number} gap extra space
 * @returns {boolean} true when they overlap
 */
export function hitsBox(x, y, r, box, gap = 0) {
  if (!box) return false;
  const nx = clamp(x, box.x, box.x + box.w);
  const ny = clamp(y, box.y, box.y + box.h);
  return Math.hypot(x - nx, y - ny) < r + gap;
}

/**
 * The radius of the circle a finger can tap to reach a bump on its own (never smaller than MIN_TAP / 2).
 * @param {number} r the bump's drawn radius
 * @returns {number} radius in CSS px
 */
export function tapRadius(r) {
  return Math.max(r, MIN_TAP / 2);
}

/**
 * The smallest distance two bumps' centres may have: their pictures (with the pink halo) do not touch, and their
 * fingertip tap circles do not overlap.
 * @param {number} a radius of one bump
 * @param {number} b radius of the other
 * @returns {number} distance in CSS px
 */
export function minGap(a, b) {
  return Math.max((a + b) * 1.3 + 6, tapRadius(a) + tapRadius(b) + 4);
}

/**
 * Where the blackhead strip goes on the face: across the nose.
 * @param {object} face the face geometry
 * @param {number} seed random seed for the dots under it
 * @returns {{x: number, y: number, w: number, h: number, dots: {x: number, y: number}[]}} the strip
 */
export function noseStrip(face, seed) {
  const rand = rng(seed + 7);
  const w = face.rx * 0.56;
  const h = face.ry * 0.12;
  const s = { x: face.cx - w / 2, y: face.cy + face.ry * (face.features.noseV - 0.14), w, h, dots: [] };
  for (let i = 0; i < 9; i += 1) s.dots.push({ x: s.x + w * 0.12 + rand() * w * 0.76, y: s.y + h * 0.25 + rand() * h * 0.5 });
  return s;
}

/** Where bumps like to sit, in face units, in the order they are filled (forehead, cheeks, nose, chin, jaw, temple). */
const ZONES = [
  { name: 'nose', u: [-0.07, 0.07], v: [0.0, 0.12] },
  { name: 'cheekL', u: [-0.7, -0.46], v: [0.08, 0.3] },
  { name: 'cheekR', u: [0.46, 0.7], v: [0.08, 0.3] },
  { name: 'forehead', u: [-0.14, 0.14], v: [-0.7, -0.5] },
  { name: 'chin', u: [-0.16, 0.16], v: [0.72, 0.84] },
  { name: 'jawL', u: [-0.68, -0.4], v: [0.46, 0.72] },
  { name: 'jawR', u: [0.4, 0.68], v: [0.46, 0.72] },
  { name: 'temple', u: [0.4, 0.62], v: [-0.68, -0.52] }, // the side is picked at random
];
/** Anywhere on the face, used only when a bump does not fit in its own zone. */
const ANYWHERE = { name: 'any', u: [-0.8, 0.8], v: [-0.72, 0.9] };

/** The extra kinds that only turn up on some faces (data/bumps.js `spawn`), e.g. the Evil Horn. */
const SPAWN_KINDS = BUMP_IDS.filter((id) => bumpInfo(id).spawn);

/**
 * Which kind each bump on a face is: the nose gets a blackhead, one cheek a big one, one other spot a golden one, the
 * rest whiteheads and pink ones. So every face has all five kinds once it has 4 or more bumps. Then the extra kinds
 * (data/bumps.js `spawn`, e.g. the Evil Horn) may each replace a whitehead or pink one, by their chance and at most
 * maxPerFace times, but only while both whiteheads and pink ones stay on the face.
 * @param {string[]} zones the zone name of each bump
 * @param {() => number} rand random numbers
 * @returns {string[]} the kind of each bump
 */
function typesFor(zones, rand) {
  const flip = rand() < 0.5 ? 1 : 0;
  const types = zones.map((z, i) => ((i + flip) % 2 ? 'whitehead' : 'red')); // taking 3 of these still leaves both kinds
  /** How many bumps of a kind there are now. @param {string} t kind @returns {number} count */
  const countOf = (t) => types.filter((x) => x === t).length;
  /**
   * Pick a plain bump (whitehead or pink) to turn into another kind.
   * @param {string[]|null} want the zones it should be in (null = any)
   * @param {boolean} [keepBoth] only pick one whose kind has another left, so both plain kinds stay on the face
   * @returns {number} its index, or -1
   */
  const take = (want, keepBoth = false) => {
    const free = zones.map((z, i) => i).filter((i) => (!want || want.includes(zones[i]))
      && (types[i] === 'whitehead' || types[i] === 'red') && (!keepBoth || countOf(types[i]) > 1));
    return free.length ? free[Math.floor(rand() * free.length)] : -1;
  };
  const steps = [['blackhead', ['nose']], ['big', ['cheekL', 'cheekR']], ['gold', null]];
  for (const [type, want] of steps) {
    if (!isImplemented(type)) continue; // a kind switched off in data/bumps.js is never placed
    let i = take(want);
    if (i < 0) i = take(null);
    if (i >= 0) types[i] = type;
  }
  for (const type of SPAWN_KINDS) {
    if (!isImplemented(type)) continue;
    const { chance = 0, maxPerFace = 1, zones: want = null } = bumpInfo(type).spawn;
    for (let n = 0; n < maxPerFace; n += 1) {
      if (rand() >= chance) continue;
      let i = take(want, true);
      if (i < 0) i = take(null, true);
      if (i >= 0) types[i] = type;
    }
  }
  return types;
}

/**
 * How big a growing bump (data/bumps.js `grow`, e.g. the Evil Horn) is after it has been on screen a while: it starts
 * at r0, grows quickly at first and then slower, and stops at rMax.
 * @param {number} r0 the radius it starts at
 * @param {number} rMax the full radius (the layout keeps room for this)
 * @param {number} seconds how long it takes to reach the full radius
 * @param {number} age seconds it has been on screen
 * @returns {number} the radius now, r0 .. rMax
 */
export function grownRadius(r0, rMax, seconds, age) {
  const t = clamp((Number(age) || 0) / Math.max(0.1, seconds), 0, 1);
  return r0 + (rMax - r0) * (1 - (1 - t) * (1 - t));
}

/**
 * Where the bumps sit on a face: one per zone (forehead, cheeks, nose, chin, jaw, temple), each on bare skin, off the
 * eyes, brows and mouth, off the nose strip, and far enough apart that every bump has its own fingertip tap circle.
 * A bump that does not fit shrinks a little (never below MIN_BUMP_R) and, as a last resort, may go anywhere on the face.
 * @param {{seed: number, face: object, count?: number, strip?: boolean}} o the random seed, the face geometry from
 *   faceGeometry(), how many bumps, and whether there is a blackhead strip on the nose
 * @returns {{pimples: {id: string, type: string, x: number, y: number, r: number, axis: number, hold: number,
 *   zone: string}[], strip: object|null}} the layout in scene px
 */
export function layoutFace({ seed, face, count = FACE_BUMPS, strip = false }) {
  const rand = rng(seed);
  const box = strip ? noseStrip(face, seed) : null;
  const templeSide = rand() < 0.5 ? -1 : 1;
  const zones = [];
  for (let i = 0; i < count; i += 1) {
    const z = ZONES[i % ZONES.length];
    zones.push(z.name === 'temple' ? { ...z, u: [z.u[0] * templeSide, z.u[1] * templeSide].sort((a, b) => a - b) } : z);
  }
  const types = typesFor(zones.map((z) => z.name), rand);
  const items = zones.map((zone, i) => {
    const [a, b] = bumpInfo(types[i]).radius;
    return { i, zone, type: types[i], r: Math.max(MIN_BUMP_R, (a + rand() * (b - a)) * face.unit) };
  });
  // The biggest first, so they get the roomiest places.
  const order = [...items].sort((p, q) => q.r - p.r);
  const placed = [];
  /**
   * Whether a bump may sit at a point.
   * @param {number} x centre x
   * @param {number} y centre y
   * @param {number} r radius
   * @returns {boolean} true when the spot is free
   */
  const fits = (x, y, r) => onSkin(face, x, y, r)
    && !face.keepOut.some((k) => hitsBox(x, y, r * 1.1, k, 2))
    && !hitsBox(x, y, r, box, 8)
    && placed.every((p) => Math.hypot(p.x - x, p.y - y) >= minGap(p.r, r));
  /**
   * Look for a free point in a zone.
   * @param {{u: number[], v: number[]}} zone the zone in face units
   * @param {number} r radius
   * @param {number} tries how many random points to try
   * @returns {{x: number, y: number}|null} the point, or null
   */
  const search = (zone, r, tries) => {
    for (let k = 0; k < tries; k += 1) {
      const pt = facePoint(face, zone.u[0] + rand() * (zone.u[1] - zone.u[0]), zone.v[0] + rand() * (zone.v[1] - zone.v[0]));
      if (fits(pt.x, pt.y, r)) return pt;
    }
    return null;
  };
  for (const it of order) {
    let r = it.r;
    let pt = null;
    for (let level = 0; level < 4 && !pt; level += 1) {
      pt = search(it.zone, r, 120);
      if (!pt) r = Math.max(MIN_BUMP_R, r * 0.9);
    }
    if (!pt) pt = search(ANYWHERE, r, 600);
    if (!pt) { r = MIN_BUMP_R; pt = search(ANYWHERE, r, 1200); }
    if (!pt) pt = facePoint(face, (it.zone.u[0] + it.zone.u[1]) / 2, (it.zone.v[0] + it.zone.v[1]) / 2); // never seen in tests
    placed.push({ ...it, x: pt.x, y: pt.y, r });
  }
  placed.sort((p, q) => p.i - q.i);
  const pimples = placed.map((p) => {
    const b = { id: `f${seed}-${p.i}`, type: p.type, x: p.x, y: p.y, r: p.r, axis: rand() * Math.PI, hold: bumpInfo(p.type).hold, zone: p.zone.name };
    const grow = bumpInfo(p.type).grow;
    if (grow) { // a growing bump starts small; the spot was chosen for its full size (rMax), so it never grows into another
      b.rMax = p.r;
      b.r0 = Math.min(p.r, Math.max(MIN_BUMP_R, p.r * grow.from));
      b.r = b.r0;
      b.growFor = grow.seconds;
    }
    return b;
  });
  return { pimples, strip: box };
}

/**
 * Pressure after a moment of squeezing (it builds while held and slowly relaxes when let go).
 * @param {number} pressure now, 0..1
 * @param {number} dt seconds since the last step
 * @param {boolean} holding whether the finger is still down
 * @param {number} hold seconds a full squeeze takes for this bump
 * @returns {number} the new pressure, 0..1 (1 = it pops)
 */
export function pressureStep(pressure, dt, holding, hold) {
  if (holding) return Math.min(1, pressure + dt / Math.max(0.1, hold));
  return Math.max(0, pressure - dt * 0.5);
}

/**
 * Seconds of holding a kind of bump needs before it pops (from data/bumps.js).
 * @param {string} type a bump id, e.g. 'big'
 * @returns {number} seconds (1 for an unknown kind, so nothing breaks)
 */
export function holdTime(type) {
  return bumpInfo(type)?.hold ?? 1;
}

/**
 * Pressure after one key press or tap without holding (three presses pop a bump).
 * @param {number} pressure now
 * @returns {number} the new pressure
 */
export function tapPressure(pressure) {
  return Math.min(1, pressure + TAP_STEP);
}

/**
 * The bump a finger touches: first the one whose own tap circle holds the touch; otherwise, within a generous distance
 * for fingers (at least MIN_TAP / 2 + 4 px), the one whose edge is nearest (so a small bump next to a big one can still be hit).
 * @param {{x: number, y: number, r: number, popped?: boolean}[]} pimples the bumps
 * @param {number} x touch x
 * @param {number} y touch y
 * @returns {object|null} the bump, or null
 */
export function hitTest(pimples, x, y) {
  // First choice: the bump whose own tap circle holds the touch (the nearest centre if several do).
  let own = null;
  let ownD = Infinity;
  for (const p of pimples) {
    if (p.popped) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= tapRadius(p.r) && d < ownD) { own = p; ownD = d; }
  }
  if (own) return own;
  let best = null;
  let bestD = Infinity;
  for (const p of pimples) {
    if (p.popped) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= Math.max(p.r * 2, MIN_TAP / 2 + 4) && d - p.r < bestD) { best = p; bestD = d - p.r; }
  }
  return best;
}

/**
 * How the face looks while it is being cleared.
 * @param {number} cleared bumps popped
 * @param {number} total bumps at the start
 * @param {boolean} [healed] the last cream is on
 * @returns {'sad'|'meh'|'happy'|'glow'} the mood
 */
export function faceMood(cleared, total, healed = false) {
  if (healed) return 'glow';
  const f = total ? cleared / total : 1;
  if (f < 0.34) return 'sad';
  if (f < 0.8) return 'meh';
  return 'happy';
}
