// The pop scene's pure rules, kept apart so they can be tested in Node: the popping-sound switch, the kinds of bump,
// where the face sits in the scene (face geometry), where the bumps go on that face (never on the eyes, brows or
// mouth, never under the hair, never touching each other, each with a fingertip-sized tap target), the nose strip,
// how squeezing builds pressure, which bump a finger touches, and the face's mood. No DOM, no audio, no timers here.
// The kinds of bump (hold time, size, goo, tools, pay) live in data/bumps.js.
import { BUMP_IDS, bumpInfo, isImplemented, DECOYS } from '../data/bumps.js';
import { resolveFaceSpec, characterLayout } from './characters.js';

const POP_SOUND_KEY = 'popper.popSound'; // "on" or "off"; nothing stored = on

/** How much one key press (Enter or Space) adds to the pressure: three of them pop a bump. A quick pointer tap adds less (engine.js onUp), so on touch it takes about 4 to 6 taps (TOOLS.md). */
export const TAP_STEP = 0.34;

/** The face half-width (px) at which the bump radii in data/bumps.js are used as they are; bigger faces get bigger bumps. */
export const FACE_UNIT = 165;
/** The smallest tap target a bump gets, in CSS px (a fingertip; SPEC section 3). */
export const MIN_TAP = 44;
/** The smallest drawn bump radius in CSS px (so even a blackhead is easy to see and aim at). */
export const MIN_BUMP_R = 11;
/**
 * The smallest START radius of a growing bump (the Evil Horn, B58), in CSS px: a little under MIN_BUMP_R so it can
 * start at about a third of its size on a phone; its tap circle is still a full fingertip (tapRadius).
 */
export const GROW_MIN_R = 8;
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
/**
 * B18: tall headwear -> how far it reaches above the face centre, in ry (face.js drawHeadwear: the beanie with its
 * pom-pom, the bowler's dome, the pilot cap's top), plus a little air; `afro` = worn over an afro's curl cloud, where
 * the beanie and bowler stretch over the whole cloud and reach higher. The layout keeps this much room above the head.
 */
export const HEADWEAR_CROWN = { beanie: 1.5, hat: 1.42, 'pilot-cap': 1.48, afro: { beanie: 1.6, hat: 1.56 } };

/** Headwear that covers the top of the head: only one of these is worn. */
export const HATS = ['beanie', 'hat', 'pilot-cap'];
/** Accessory -> the headwear it cannot be worn with (it would sit on top of it or be squashed under it). */
const CLASHES = { tiara: HATS, veil: HATS, headband: ['beanie', 'pilot-cap'] };

/**
 * The accessories a face really wears (B56): the generator can pick two that clash (two hats, a tiara or veil on a
 * cap, a headband under a beanie); the first one in the list is kept and the clashing one is left off. Older saved
 * faces keep their list, so this is done when drawing (face.js) and in the layout (faceGeometry, B60: a dropped hat
 * no longer counts for the hairline).
 * @param {string[]} acc accessory ids, in the face's order
 * @returns {string[]} the ones worn
 */
export function wornAccessories(acc) {
  const out = [];
  for (const a of acc) {
    // True when b cannot be worn together with a (either way round).
    const clash = (b) => (HATS.includes(a) && HATS.includes(b)) || CLASHES[a]?.includes(b) || CLASHES[b]?.includes(a);
    if (!out.some(clash)) out.push(a);
  }
  return out;
}
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
 *   fits). Unknown or missing ids fall back to an oval head, short hair, round eyes and a smile. A spec with
 *   `character` (pop/characters.js, e.g. the husband) gets that character's parts, beard and armor: keep-out boxes over
 *   the beard and the helmet's cheek guards, the helmet's brow edge as the hairline, and room above for the plumes.
 *   A worn beanie, bowler or pilot cap also gets room above the head (HEADWEAR_CROWN, B18).
 * @returns {{width: number, height: number, cx: number, cy: number, rx: number, ry: number, unit: number,
 *   features: object, keepOut: {x: number, y: number, w: number, h: number}[]}} the face geometry in CSS px
 *   (cx, cy = face centre, rx, ry = half-width and half-height of the bare-skin oval, unit = bump size factor,
 *   features = FACE_FEATURES adjusted for this face's parts, keepOut = boxes around the eyes, brows, mouth and any
 *   accessory lying on the face (glasses, moustache, clown nose, flower) where no bump may sit; a character also gets
 *   zones = his own bump zones in fill order, which layoutFace uses instead of ZONES)
 */
export function faceGeometry(width, height, spec0 = {}) {
  const spec = resolveFaceSpec(spec0); // a story character (T2.4) brings his own parts
  const extra = characterLayout(spec);
  const size = clamp(Number(spec.size) || 1, 0.7, 1.15);
  const shape = SHAPE_ASPECT[spec.shape] ? spec.shape : 'oval';
  const aspect = SHAPE_ASPECT[shape];
  const F = FACE_FIT;
  const acc = Array.isArray(spec.accessories) ? wornAccessories(spec.accessories) : []; // B60: only what is worn
  // B18: a beanie, bowler or pilot cap reaches higher than the hair, so it gets its own room above the head.
  const hatCrown = Math.max(0, ...acc.map((a) => (spec.hair === 'afro' && HEADWEAR_CROWN.afro[a]) || HEADWEAR_CROWN[a] || 0));
  // How far the hair (or a helmet with plumes, or a hat) reaches above the face centre, in ry.
  const crown = Math.max(extra.crown ?? 1.12, hatCrown);
  const byWidth = Math.max(width * F.widthPart, Math.min(width * 0.4, F.smallRx)) * aspect;
  const ry = Math.min(Math.min(byWidth, height * F.heightPart) * size, height * F.maxRy, width * 0.41 * aspect,
    (height * (F.chinMax - F.topRoom)) / (crown + 1)); // tall headwear: a smaller head, so it never clips at the top
  const rx = ry / aspect;
  const cx = width / 2;
  // Room for the hair above and some shoulders below; otherwise near the middle.
  const lo = ry * crown + height * F.topRoom;
  const hi = Math.min(height - ry * 1.2, height * F.chinMax - ry);
  const cy = clamp(height * F.centre, lo, Math.max(lo, hi));
  const [hairTop0, hairCurve] = extra.hairline ?? HAIRLINES[spec.hair] ?? HAIRLINES.short; // a helmet's brow edge counts as the hairline
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
  if (acc.includes('flower')) { // tucked in the hair above the right temple; on a bare head it sits further in (B56)
    keepOut.push(spec.hair === 'bald' || spec.hair === 'mohawk' ? box(0.44, -1.05, 1.05, -0.5) : box(0.56, -1.05, 1.05, -0.58));
  }
  for (const [u0, v0, u1, v1] of extra.boxes) keepOut.push(box(u0, v0, u1, v1)); // a character's beard and helmet (T2.4)
  const out = { width, height, cx, cy, rx, ry, unit: rx / FACE_UNIT, features: f, keepOut };
  if (extra.zones) out.zones = extra.zones; // a character's own bump zones (the husband: his chin spot first)
  return out;
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

/** The two plain kinds every face is mostly made of. */
const PLAIN_KINDS = ['whitehead', 'red'];
/**
 * How often a face in a customer round (a list of allowed kinds) gets a golden bump (ECONOMY.md section 6: gold is
 * rare). First guess. Faces without a list (demo, free play) keep one golden bump each.
 */
export const ROUND_GOLD_CHANCE = 0.2;

/**
 * Which kind each bump on a face is: the nose gets a blackhead, one cheek a big one, one other spot a golden one, the
 * rest whiteheads and pink ones. So every face has all five kinds once it has 4 or more bumps. Then the extra kinds
 * (data/bumps.js `spawn`, e.g. the Evil Horn) may each replace a whitehead or pink one, by their chance and at most
 * maxPerFace times, but only while both whiteheads and pink ones stay on the face.
 * With a list of allowed kinds (a customer round, T3.1b) only those kinds are placed: the plain part uses the allowed
 * plain kinds (or the first allowed kind when neither plain kind is allowed), and gold turns up only now and then
 * (ROUND_GOLD_CHANCE). Without a list the random numbers are drawn exactly as before, so old seeds keep their faces.
 * @param {string[]} zones the zone name of each bump
 * @param {() => number} rand random numbers
 * @param {string[]|null} [allowed] the kinds that may be placed (null = every built kind)
 * @param {Object<string, string[]>} [prefer] kind -> zones tried before its usual ones (roomyTop: horns on a free forehead)
 * @returns {string[]} the kind of each bump
 */
function typesFor(zones, rand, allowed = null, prefer = {}) {
  /** Whether a kind may be placed on this face. @param {string} t kind @returns {boolean} true when it may */
  const ok = (t) => isImplemented(t) && (!allowed || allowed.includes(t));
  let plain = PLAIN_KINDS.filter(ok);
  if (!plain.length) plain = [allowed?.find(ok) ?? 'whitehead'];
  const flip = rand() < 0.5 ? 1 : 0;
  const types = zones.map((z, i) => plain[(i + flip + 1) % plain.length]); // taking 3 of these still leaves both kinds
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
      && plain.includes(types[i]) && (!keepBoth || countOf(types[i]) > 1));
    return free.length ? free[Math.floor(rand() * free.length)] : -1;
  };
  const steps = [['blackhead', ['nose']], ['big', ['cheekL', 'cheekR']], ['gold', null]];
  for (const [type, want] of steps) {
    if (!ok(type)) continue; // a kind switched off in data/bumps.js (or not allowed for this customer) is never placed
    if (type === 'gold' && allowed && rand() >= ROUND_GOLD_CHANCE) continue; // gold is rare in customer rounds
    let i = take(want);
    if (i < 0) i = take(null);
    if (i >= 0) types[i] = type;
  }
  for (const type of SPAWN_KINDS) {
    if (!ok(type)) continue;
    const { chance = 0, maxPerFace = 1, zones: want = null } = bumpInfo(type).spawn;
    for (let n = 0; n < maxPerFace; n += 1) {
      if (rand() >= chance) continue;
      // Its preferred zones first (a horn on a free forehead); take() draws a random number only when it finds one,
      // so the number of draws, and with it the rest of the face, stays as before.
      let i = prefer[type] ? take(prefer[type], true) : -1;
      if (i < 0) i = take(want, true);
      if (i < 0) i = take(null, true);
      if (i >= 0) types[i] = type;
    }
  }
  return types;
}

/** Where the kinds of a fixed bump mix like to sit (T8.4) when data/bumps.js gives them no spawn zones. */
const MIX_ZONES = { blackhead: ['nose', 'forehead', 'chin', 'cheekL', 'cheekR'], big: ['cheekL', 'cheekR'] };
/** The order a fixed mix is placed in: the kinds that are pickiest about their spot first. */
const MIX_ORDER = ['horn', 'big', 'hair', 'blackhead', 'gold', 'red', 'whitehead'];
/** The most bumps a fixed mix may put on one face. */
const ROUND_MIX_MAX = 12;

/**
 * A fixed bump mix (kind -> how many) as one list of kinds, in MIX_ORDER, built kinds only, at most ROUND_MIX_MAX.
 * @param {Object<string, number>|null|undefined} mix the mix
 * @returns {string[]|null} the kinds (one entry per bump), or null when there is no usable mix
 */
function mixList(mix) {
  if (!mix || typeof mix !== 'object') return null;
  const kinds = [...MIX_ORDER, ...Object.keys(mix).filter((k) => !MIX_ORDER.includes(k))];
  const out = [];
  for (const k of kinds) {
    const n = Number.isFinite(mix[k]) ? Math.max(0, Math.floor(mix[k])) : 0;
    if (isImplemented(k)) for (let i = 0; i < n; i += 1) out.push(k);
  }
  return out.length ? out.slice(0, ROUND_MIX_MAX) : null;
}

/**
 * Which kind each bump is on a face with a fixed mix (T8.4 boss and event faces): every kind of the list once per
 * entry, each in a zone it likes when one is still free (data/bumps.js spawn zones, MIX_ZONES), else anywhere.
 * @param {string[]} zones the zone name of each bump (as many as the list)
 * @param {() => number} rand random numbers
 * @param {string[]} want the kinds (mixList), pickiest first
 * @param {Object<string, string[]>} [prefer] kind -> zones tried before its usual ones (roomyTop: horns on a free forehead)
 * @returns {string[]} the kind of each bump
 */
function typesFromMix(zones, rand, want, prefer = {}) {
  const types = zones.map(() => null);
  for (const type of want) {
    const liked = bumpInfo(type)?.spawn?.zones ?? MIX_ZONES[type] ?? null;
    const free = zones.map((z, i) => i).filter((i) => types[i] === null);
    const top = prefer[type] ? free.filter((i) => prefer[type].includes(zones[i])) : []; // e.g. a horn on a free forehead
    const good = top.length ? top : liked ? free.filter((i) => liked.includes(zones[i])) : free;
    const pool = good.length ? good : free;
    if (pool.length) types[pool[Math.floor(rand() * pool.length)]] = type;
  }
  return types.map((x) => x ?? 'whitehead');
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

/** A growing bump's hold time at its smallest, as a share of the full hold (B58: pop it early and it is quicker). */
export const GROW_HOLD_SMALL = 0.6;

/**
 * The hold time of a growing bump (the Evil Horn) at its size now (B58 decision: the hold counts from the current
 * size). At full size it is the full hold; smaller is quicker, down to GROW_HOLD_SMALL of it at size 0. A bump that
 * does not grow (no rMax) keeps its hold. Never more than the full hold, so every time limit built on the full hold
 * stays fair.
 * @param {number} hold the full hold time in seconds (the table's, or with mastery)
 * @param {number} r the radius now
 * @param {number} [rMax] the full radius (left out = not a growing bump)
 * @returns {number} seconds
 */
export function grownHold(hold, r, rMax) {
  if (!(rMax > 0)) return hold;
  const share = clamp(r / rMax, 0, 1);
  return hold * (GROW_HOLD_SMALL + (1 - GROW_HOLD_SMALL) * share);
}

/**
 * How a growing bump starts in the pop scene (B58). With reduced motion it does not grow: it starts at the table's
 * `grow.still` share of its full size (0.7) and stays there. A bump that already starts at full size (a boss's grown
 * horns, T8.4) does not grow either. Otherwise the layout's start size and growing time are kept.
 * @param {{type: string, r: number, r0?: number, rMax?: number, growFor?: number}} p a bump from layoutFace
 * @param {boolean} reduced reduced motion is on
 * @returns {{r?: number, r0?: number, growFor?: number}} the fields to change (empty for a bump that does not grow)
 */
export function growStart(p, reduced) {
  if (!p?.growFor || !(p.rMax > 0)) return {};
  const r0 = Number.isFinite(p.r0) ? p.r0 : p.r;
  if (r0 >= p.rMax) return { r: p.rMax, r0: p.rMax, growFor: 0 };
  if (reduced) {
    const still = Math.max(r0, Math.min(p.rMax, p.rMax * (bumpInfo(p.type)?.grow?.still ?? 0.7)));
    return { r: still, r0: still, growFor: 0 };
  }
  return { r: r0, r0, growFor: p.growFor };
}

/** The zones an Evil Horn tries first when they have room (owner 2026-10-29: horns belong on the forehead). */
const HORN_TOP_ZONES = ['forehead', 'temple'];

/**
 * Which of a face's top zones (forehead, temple) have bare skin for a fully grown Evil Horn: not under the hair, a hat,
 * a fringe or a headband, and off the brows. A covered forehead sends the horn to the cheeks and jaw as before.
 * Checks a fixed grid of points, so it draws no random numbers and old seeds keep the rest of their faces.
 * @param {object} face the face geometry from faceGeometry()
 * @param {{name: string, u: number[], v: number[]}[]} zones this face's zones (the temple already on its side)
 * @param {number} r the horn's full radius in px
 * @returns {string[]} the names of the roomy top zones, forehead first
 */
function roomyTop(face, zones, r) {
  const out = [];
  for (const name of HORN_TOP_ZONES) {
    const z = zones.find((x) => x.name === name);
    if (!z) continue;
    let room = false;
    for (let a = 0; a <= 4 && !room; a += 1) {
      for (let b = 0; b <= 4 && !room; b += 1) {
        const pt = facePoint(face, z.u[0] + ((z.u[1] - z.u[0]) * a) / 4, z.v[0] + ((z.v[1] - z.v[0]) * b) / 4);
        room = onSkin(face, pt.x, pt.y, r) && !face.keepOut.some((k) => hitsBox(pt.x, pt.y, r * 1.1, k, 2));
      }
    }
    if (room) out.push(name);
  }
  return out;
}

/**
 * Where the bumps sit on a face: one per zone (forehead, cheeks, nose, chin, jaw, temple), each on bare skin, off the
 * eyes, brows and mouth, off the nose strip, and far enough apart that every bump has its own fingertip tap circle.
 * A bump that does not fit shrinks a little (never below MIN_BUMP_R) and, as a last resort, may go anywhere on the face.
 * @param {{seed: number, face: object, count?: number, strip?: boolean, allowed?: string[]|null, decoys?: boolean}} o
 *   the random seed, the face geometry from faceGeometry(), how many bumps, whether there is a blackhead strip on the
 *   nose, the bump kinds that may be placed (a customer round, T3.1b; null = every built kind) and whether the face
 *   may have decoys (moles, freckles; default yes). A boss or event face (T8.4) may also give mix = kind -> how many
 *   (exactly these bumps, typesFromMix; then count is the sum) and grown = Evil Horns start fully grown and this many
 *   times their usual size (0 or left out = as usual). Without them the random numbers are drawn as before.
 * @returns {{pimples: {id: string, type: string, x: number, y: number, r: number, axis: number, hold: number,
 *   zone: string}[], strip: object|null}} the layout in scene px
 */
export function layoutFace({ seed, face, count = FACE_BUMPS, strip = false, allowed = null, decoys = true, mix = null, grown = 0 }) {
  const rand = rng(seed);
  const box = strip ? noseStrip(face, seed) : null;
  const templeSide = rand() < 0.5 ? -1 : 1;
  const zones = [];
  const list = face.zones?.length ? face.zones : ZONES; // a story character brings his own zone order (T2.4)
  const want = mixList(mix);
  const n = want ? want.length : count;
  for (let i = 0; i < n; i += 1) {
    const z = list[i % list.length];
    zones.push(z.name === 'temple' ? { ...z, u: [z.u[0] * templeSide, z.u[1] * templeSide].sort((a, b) => a - b) } : z);
  }
  const hornScale = Number.isFinite(grown) && grown > 0 ? grown : 0;
  const prefer = { horn: roomyTop(face, zones, bumpInfo('horn').radius[1] * face.unit * (hornScale || 1)) };
  const types = want ? typesFromMix(zones.map((z) => z.name), rand, want, prefer) : typesFor(zones.map((z) => z.name), rand, Array.isArray(allowed) ? allowed : null, prefer);
  const items = zones.map((zone, i) => {
    const [a, b] = bumpInfo(types[i]).radius;
    const scale = hornScale && types[i] === 'horn' ? hornScale : 1; // a boss's Evil Horns are bigger (T8.4)
    return { i, zone, type: types[i], r: Math.max(MIN_BUMP_R, (a + rand() * (b - a)) * face.unit * scale) };
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
  /**
   * The roomiest bare-skin spot for a bump that found no free place at all (R5-pop, B70: on a small face, a phone held
   * sideways or a small phone, 9 to 12 bumps cannot all keep a whole fingertip apart, and the last ones used to be put
   * in their zone's middle with no check, often right on top of another bump): of many random points on bare skin, off
   * the eyes, mouth, accessories and nose strip, the one whose edge is farthest from every bump already placed.
   * @param {number} r radius
   * @param {number} tries how many random points to try
   * @returns {{x: number, y: number}|null} the point, or null when none is on bare skin
   */
  const roomiest = (r, tries) => {
    let best = null;
    let bestRoom = -Infinity;
    for (let k = 0; k < tries; k += 1) {
      const pt = facePoint(face, ANYWHERE.u[0] + rand() * (ANYWHERE.u[1] - ANYWHERE.u[0]), ANYWHERE.v[0] + rand() * (ANYWHERE.v[1] - ANYWHERE.v[0]));
      if (!onSkin(face, pt.x, pt.y, r) || face.keepOut.some((kb) => hitsBox(pt.x, pt.y, r * 1.1, kb, 2)) || hitsBox(pt.x, pt.y, r, box, 8)) continue;
      const room = placed.reduce((m, p) => Math.min(m, Math.hypot(p.x - pt.x, p.y - pt.y) - p.r - r), Infinity);
      if (room > bestRoom) { best = pt; bestRoom = room; }
    }
    return best;
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
    if (!pt) pt = roomiest(r, 1500); // no fully free spot: the one with the most room (B70)
    if (!pt) pt = facePoint(face, (it.zone.u[0] + it.zone.u[1]) / 2, (it.zone.v[0] + it.zone.v[1]) / 2); // no bare skin at all
    placed.push({ ...it, x: pt.x, y: pt.y, r });
  }
  placed.sort((p, q) => p.i - q.i);
  const pimples = placed.map((p) => {
    const b = { id: `f${seed}-${p.i}`, type: p.type, x: p.x, y: p.y, r: p.r, axis: rand() * Math.PI, hold: bumpInfo(p.type).hold, zone: p.zone.name };
    const grow = bumpInfo(p.type).grow;
    if (grow) { // a growing bump starts small; the spot was chosen for its full size (rMax), so it never grows into another
      b.rMax = p.r;
      // A boss's grown horns (T8.4) start at their full size.
      b.r0 = hornScale && p.type === 'horn' ? p.r : Math.min(p.r, Math.max(GROW_MIN_R, p.r * grow.from));
      b.r = b.r0;
      b.growFor = grow.seconds;
    }
    return b;
  });
  return { pimples, strip: box, decoys: decoys ? layoutDecoys(seed, face, pimples, box) : [] };
}

/** Where decoys may sit, in face units: cheeks, temples, jaw, chin and beside the mouth (the classic beauty mark). */
const DECOY_AREA = { u: [-0.82, 0.82], v: [-0.62, 0.88] };

/**
 * The decoys on a face (T1.3b): 0 to 3 moles, beauty marks, freckle clusters or a suspicious mole (data/bumps.js
 * DECOYS). Each is on bare skin, off the eyes, brows, mouth, accessories and nose strip, and its fingertip tap circle
 * overlaps no bump's tap circle (room is kept for a growing bump's full size) and no other decoy's. A decoy that finds
 * no free spot is left out. It uses its own random numbers, so the bumps of a seed stay where they were before.
 * @param {number} seed the face's random seed
 * @param {object} face the face geometry from faceGeometry()
 * @param {{x: number, y: number, r: number, rMax?: number}[]} pimples the bumps already laid out
 * @param {{x: number, y: number, w: number, h: number}|null} strip the nose strip, or null
 * @returns {{id: string, type: 'decoy', kind: string, x: number, y: number, r: number,
 *   dots: {u: number, v: number, s: number}[]}[]} the decoys in scene px (dots: freckle offsets and sizes as parts of r)
 */
export function layoutDecoys(seed, face, pimples, strip) {
  const rand = rng(seed * 31 + 977);
  let n = 0;
  for (let roll = rand(), acc = 0; n < DECOYS.counts.length; n += 1) {
    acc += DECOYS.counts[n];
    if (roll < acc) break;
  }
  n = Math.min(n, DECOYS.counts.length - 1);
  const kinds = Object.entries(DECOYS.kinds);
  const total = kinds.reduce((s, [, k]) => s + k.weight, 0);
  const out = [];
  // The nose, from between the brows to below the tip: a mole there sits right between the eyes or looks like a blackhead.
  const f = face.features;
  const nose = { x: face.cx - 0.24 * face.rx, y: face.cy + (f.browV - 0.04) * face.ry, w: 0.48 * face.rx, h: (f.noseV - f.browV + 0.2) * face.ry };
  for (let i = 0; i < n; i += 1) {
    let pick = rand() * total;
    const [kind, info] = kinds.find(([, k]) => (pick -= k.weight) < 0) ?? kinds[0];
    if (kind === 'suspicious' && out.some((d) => d.kind === 'suspicious')) continue; // one suspicious mole is enough
    const r = (info.radius[0] + rand() * (info.radius[1] - info.radius[0])) * face.unit;
    const tap = tapRadius(r);
    /** Whether a decoy may sit at a point. @param {number} x centre x @param {number} y centre y @returns {boolean} free */
    const fits = (x, y) => onSkin(face, x, y, r + 3)
      && !face.keepOut.some((k) => hitsBox(x, y, r * 1.2 + 4, k, 2))
      && !hitsBox(x, y, tap, strip, 4)
      && !hitsBox(x, y, r + 2, nose)
      && pimples.every((p) => Math.hypot(p.x - x, p.y - y) >= tapRadius(p.rMax ?? p.r) + tap + 4)
      && out.every((d) => Math.hypot(d.x - x, d.y - y) >= tapRadius(d.r) + tap + 4);
    let pt = null;
    for (let k = 0; k < 300 && !pt; k += 1) {
      const q = facePoint(face, DECOY_AREA.u[0] + rand() * (DECOY_AREA.u[1] - DECOY_AREA.u[0]),
        DECOY_AREA.v[0] + rand() * (DECOY_AREA.v[1] - DECOY_AREA.v[0]));
      if (fits(q.x, q.y)) pt = q;
    }
    if (!pt) continue;
    const dots = [];
    if (info.dots) {
      const m = info.dots[0] + Math.floor(rand() * (info.dots[1] - info.dots[0] + 1));
      for (let j = 0; j < m; j += 1) {
        const a = (j / m) * Math.PI * 2 + rand() * 0.9;
        const d = 0.25 + rand() * 0.55;
        dots.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, s: 0.16 + rand() * 0.1 });
      }
    }
    out.push({ id: `d${seed}-${i}`, type: 'decoy', kind, x: pt.x, y: pt.y, r, axis: rand() * Math.PI, dots });
  }
  return out;
}

/**
 * The decoy a finger touches, if any: one whose tap circle holds the touch, but never when the touch is inside a
 * bump's own tap circle (the bump wins). Used before hitTest, so a press on a mole is never taken as a near-miss bump.
 * @param {{x: number, y: number, r: number}[]} decoys the decoys
 * @param {{x: number, y: number, r: number, popped?: boolean}[]} pimples the bumps
 * @param {number} x touch x
 * @param {number} y touch y
 * @returns {object|null} the decoy, or null
 */
export function hitDecoy(decoys, pimples, x, y) {
  if (!decoys?.length) return null;
  if (pimples.some((p) => !p.popped && Math.hypot(p.x - x, p.y - y) <= tapRadius(p.r))) return null;
  let best = null;
  let bestD = Infinity;
  for (const d of decoys) {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist <= tapRadius(d.r) && dist < bestD) { best = d; bestD = dist; }
  }
  return best;
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
 * Pressure after one key press (three presses pop a bump; a pointer tap is counted in engine.js onUp).
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

// ---- Zoom and pan (T1.4, SPEC D9: the whole face is the default view; zoom is an optional extra) ----
// A view is {z, x, y}: z = zoom (1 = the whole scene), x, y = the scene point at the top left corner of the canvas.
// Every pointer goes through screenToScene and every drawing through the same view, so hits stay right at any zoom.

/** The largest zoom (the smallest is 1, the whole face). */
export const ZOOM_MAX = 3;
/** How much one press of + or - (or one key press) zooms. */
export const ZOOM_STEP = 1.4;

/** The view that shows the whole scene (zoom 1). @returns {{z: number, x: number, y: number}} the view */
export function fullView() {
  return { z: 1, x: 0, y: 0 };
}

/**
 * Turn a point on the canvas (CSS px from its top left) into scene px.
 * @param {{z: number, x: number, y: number}} view the view
 * @param {number} sx screen x
 * @param {number} sy screen y
 * @returns {{x: number, y: number}} the scene point
 */
export function screenToScene(view, sx, sy) {
  return { x: view.x + sx / view.z, y: view.y + sy / view.z };
}

/**
 * Turn a scene point into canvas CSS px (the opposite of screenToScene).
 * @param {{z: number, x: number, y: number}} view the view
 * @param {number} x scene x
 * @param {number} y scene y
 * @returns {{x: number, y: number}} the screen point
 */
export function sceneToScreen(view, x, y) {
  return { x: (x - view.x) * view.z, y: (y - view.y) * view.z };
}

/**
 * Keep a view sensible: zoom between 1 and ZOOM_MAX, never showing anything outside the scene, and (when a face is
 * given) the middle of the view stays over the face's oval, so panning can never lose the face.
 * @param {{z: number, x: number, y: number}} view the wished view
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {{cx: number, cy: number, rx: number, ry: number}|null} [face] the face oval
 * @returns {{z: number, x: number, y: number}} the allowed view
 */
export function clampView(view, w, h, face = null) {
  const z = clamp(Number.isFinite(view.z) ? view.z : 1, 1, ZOOM_MAX);
  const vw = w / z;
  const vh = h / z;
  let mx = (Number.isFinite(view.x) ? view.x : 0) + vw / 2; // the middle of the view, in scene px
  let my = (Number.isFinite(view.y) ? view.y : 0) + vh / 2;
  if (face) {
    mx = clamp(mx, face.cx - face.rx, face.cx + face.rx);
    my = clamp(my, face.cy - face.ry, face.cy + face.ry);
  }
  return { z, x: clamp(mx - vw / 2, 0, w - vw), y: clamp(my - vh / 2, 0, h - vh) };
}

/**
 * Zoom by a factor round a point on the screen (that point stays under the finger, mouse or button centre).
 * @param {{z: number, x: number, y: number}} view the view now
 * @param {number} factor more than 1 = closer
 * @param {number} sx screen x of the fixed point
 * @param {number} sy screen y of the fixed point
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {object|null} [face] the face oval (see clampView)
 * @returns {{z: number, x: number, y: number}} the new view
 */
export function zoomAt(view, factor, sx, sy, w, h, face = null) {
  const z = clamp(view.z * factor, 1, ZOOM_MAX);
  const at = screenToScene(view, sx, sy);
  return clampView({ z, x: at.x - sx / z, y: at.y - sy / z }, w, h, face);
}

/**
 * Slide the view by a distance on the screen (dragging right shows more of the left side).
 * @param {{z: number, x: number, y: number}} view the view now
 * @param {number} dx screen px moved right
 * @param {number} dy screen px moved down
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {object|null} [face] the face oval (see clampView)
 * @returns {{z: number, x: number, y: number}} the new view
 */
export function panView(view, dx, dy, w, h, face = null) {
  return clampView({ z: view.z, x: view.x - dx / view.z, y: view.y - dy / view.z }, w, h, face);
}

/**
 * Two-finger pinch: the view when the fingers started at a0, b0 (screen px) and are now at a1, b1. The zoom follows
 * the spread of the fingers, and the scene point that was between them stays between them (so it also pans).
 * @param {{z: number, x: number, y: number}} start the view when the pinch began
 * @param {{x: number, y: number}} a0 first finger at the start
 * @param {{x: number, y: number}} b0 second finger at the start
 * @param {{x: number, y: number}} a1 first finger now
 * @param {{x: number, y: number}} b1 second finger now
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {object|null} [face] the face oval (see clampView)
 * @returns {{z: number, x: number, y: number}} the new view
 */
export function pinchView(start, a0, b0, a1, b1, w, h, face = null) {
  const d0 = Math.max(1, Math.hypot(b0.x - a0.x, b0.y - a0.y));
  const d1 = Math.max(1, Math.hypot(b1.x - a1.x, b1.y - a1.y));
  const z = clamp(start.z * (d1 / d0), 1, ZOOM_MAX);
  const at = screenToScene(start, (a0.x + b0.x) / 2, (a0.y + b0.y) / 2);
  const mx = (a1.x + b1.x) / 2;
  const my = (a1.y + b1.y) / 2;
  return clampView({ z, x: at.x - mx / z, y: at.y - my / z }, w, h, face);
}

/**
 * Keep the zoom when the scene changes size (window resized, phone turned): the same spot of the face stays in the
 * middle of the view, moved with the face map (see faceMap), then the view is checked again for the new size.
 * @param {{z: number, x: number, y: number}} view the view before
 * @param {number} oldW old scene width
 * @param {number} oldH old scene height
 * @param {{s: number, tx: number, ty: number}|null} move how scene points moved (null = they did not)
 * @param {number} w new scene width
 * @param {number} h new scene height
 * @param {object|null} [face] the new face oval
 * @returns {{z: number, x: number, y: number}} the new view
 */
export function refitView(view, oldW, oldH, move, w, h, face = null) {
  const m = move ?? { s: 1, tx: 0, ty: 0 };
  const cx = (view.x + oldW / view.z / 2) * m.s + m.tx;
  const cy = (view.y + oldH / view.z / 2) * m.s + m.ty;
  return clampView({ z: view.z, x: cx - w / view.z / 2, y: cy - h / view.z / 2 }, w, h, face);
}
