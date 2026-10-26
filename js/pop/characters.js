// Special characters for the pop scene (T2.4): story people who must look like THEMSELVES from the comics, not like a
// random generated face. A face spec names one with `character: 'husband'`; its look (skin, hair, beard, nose, eyes,
// shirt) comes from CHARACTER_FACES and any part the spec also gives wins. An `armor` option puts him in his knight's
// helmet (visor up, face showing through the open front) with plumes, shoulder plates and an optional knitted hat.
// Pure data and geometry in face units (u = -1 left .. 1 right, v = -1 top .. 1 chin), no DOM: both the bump layout
// (logic.js faceGeometry) and the drawing (face.js) read the same lines, so bumps never sit under the beard or steel.
//
// Beard rule (decided in T2.4): the beard is solid black, like the comic. It runs from the sideburns down round the jaw
// and chin, with a moustache over the upper lip, a small bare patch round the mouth so the mouth reads in every mood,
// and one small bare spot on the chin (CHIN_PATCH). The story puts his first bump on his chin (strip 0 and the chapter 0
// and 2 intros), so exactly one bump always sits in that chin spot (the 'chin' zone comes first in his zone list). Every
// other bump sits on bare skin above the beard line (upper cheeks, nose, forehead, temples); the rest of the beard is a
// keep-out area, so no bump ever hides in the beard.
// In armor, the forehead, temples and sides are under steel, so bumps sit only in the open front of the helmet: the
// chin spot, the nose and the upper cheeks. That holds his 2 bumps in chapter 2 (chin and nose), never many more.

/**
 * The special characters. Face part ids are the same as data/customers.js FACE_PARTS (shape, skinTone, hair,
 * hairColor, eyes, brows, mouth); the extras are drawn only for characters: eyeColour and shirt ('#rrggbb'),
 * beard (true), tuft (a curl of hair standing up on top), smoothHair (a smooth hairline, no tufts), nose ('round' = a
 * ball nose like the comic's), blush (rosy cheeks in every mood, like the comic).
 * The husband, as the comic kit draws him (game/comic-art.js CHARACTERS.husband): tan skin, black hair with one curl
 * standing up, a full black beard, thick black brows, brown eyes, a round nose and the blue hoodie.
 */
export const CHARACTER_FACES = {
  husband: {
    shape: 'round', skinTone: 'tan', hair: 'short', hairColor: 'black', eyes: 'round', brows: 'thick', mouth: 'smile',
    accessories: [], size: 1, eyeColour: '#5d4030', shirt: '#6a7be6', beard: true, tuft: true, smoothHair: true,
    nose: 'round', blush: true,
  },
};

/** The plume colours: the first plume is red like the comic's, extra ones (a running gag) go yellow, blue, green, pink. */
export const PLUME_COLOURS = ['#e8505b', '#ffd25a', '#6a7be6', '#3fae8c', '#f27eb2'];
/** The knitted hat's colour when `cozy: true` is given (Greta's pink gift in the comics). */
export const COZY_DEFAULT = '#f27eb2';
/** The most plumes the helmet shows (more would stick out of the scene). */
export const MAX_PLUMES = 5;

/**
 * The helmet's lines in face units. The brow edge of the helmet follows a curve like a hairline (browTop in the
 * middle, dipping by browCurve * u * u to the sides); the cheek guards' inner edge is guard(v); `crown` is how far
 * above the face centre the tallest part (plume or hat) reaches, in ry units, so faceGeometry keeps room for it.
 */
export const HELMET = {
  browTop: -0.62,
  browCurve: 0.3,
  // The cheek guards' inner edge: [v, |u|] points from the brow down to the guard's lower tip.
  guard: [[-0.7, 0.8], [0.3, 0.8], [0.7, 0.72], [0.95, 0.6]],
  guardBottom: 0.95,
  crown: 1.62,
};

/** How far the husband's curl of hair reaches above the face centre (ry units), so it never clips at the top. */
export const TUFT_CROWN = 1.48;

/** The beard's top edge: [|u|, v] points from the middle out to the sideburns (between them it is a straight line). */
export const BEARD_TOP = [
  [0, 0.31], [0.1, 0.31], [0.2, 0.33], [0.3, 0.37], [0.4, 0.44], [0.5, 0.47], [0.6, 0.47], [0.7, 0.45], [0.8, 0.38],
  [0.9, 0.2], [1.0, -0.06], [1.2, -0.1],
];
/**
 * The bare spot on the chin. The bump layout keeps the beard out of the box |u| < hu, top < v < bottom (face units);
 * the drawn spot is a rounded blob (a squircle with half sizes a, b round v) that holds that whole box.
 */
export const CHIN_PATCH = { hu: 0.18, top: 0.66, bottom: 0.95, a: 0.22, b: 0.175, v: 0.805 };

/** Where his bumps go, in the order they are filled (face units, as logic.js ZONES): the chin spot first. */
const ZONE = {
  chin: { name: 'chin', u: [-0.03, 0.03], v: [0.77, 0.84] },
  nose: { name: 'nose', u: [-0.07, 0.07], v: [0.0, 0.12] },
  cheekL: { name: 'cheekL', u: [-0.68, -0.46], v: [0.08, 0.3] },
  cheekR: { name: 'cheekR', u: [0.46, 0.68], v: [0.08, 0.3] },
  forehead: { name: 'forehead', u: [-0.14, 0.14], v: [-0.7, -0.5] },
  temple: { name: 'temple', u: [0.4, 0.62], v: [-0.68, -0.52] },
};
/** The zone order at home (chin, both cheeks, then the rest) and in armor (chin and nose, the open front only). */
export const BEARD_ZONES = [ZONE.chin, ZONE.cheekL, ZONE.cheekR, ZONE.nose, ZONE.forehead, ZONE.temple];
export const ARMOR_ZONES = [ZONE.chin, ZONE.nose, ZONE.cheekL, ZONE.cheekR];

/** How far the beard's wavy top edge pokes up above BEARD_TOP (face units), kept clear of bumps too. */
export const BEARD_FUZZ = 0.03;
/** How far the beard hangs below the chin (ry units). */
export const BEARD_DROP = 0.16;

/**
 * Read a straight-line table at x (points [x, y], x growing); outside it the end values are used.
 * @param {number[][]} pts the points
 * @param {number} x where
 * @returns {number} y
 */
function lerpTable(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/**
 * Where the beard starts at u (face units): everything below this line (down to the jaw) is beard.
 * @param {number} u -1 .. 1
 * @returns {number} v of the beard's top edge
 */
export function beardTop(u) {
  return lerpTable(BEARD_TOP, Math.abs(u));
}

/**
 * The inner edge of the helmet's cheek guards at height v: the face shows only where |u| is less than this.
 * @param {number} v height in face units
 * @returns {number} |u| of the edge
 */
export function guardEdge(v) {
  return lerpTable(HELMET.guard, v);
}

/**
 * The armor option tidied up: null when there is no armor, else {plumes, cozy, cracked}. `armor: true` means one
 * plume. plumes is how many plumes stand on the helmet (0 .. MAX_PLUMES); cozy is the knitted hat's colour or null
 * (`cozy: true` = the pink one); cracked draws laser cracks on the steel (the last boss, chapter 11).
 * @param {boolean|object|undefined} armor the spec's armor option
 * @returns {{plumes: number, cozy: string|null, cracked: boolean}|null} the armor
 */
export function armorOptions(armor) {
  if (!armor) return null;
  const a = typeof armor === 'object' ? armor : {};
  const n = Number.isFinite(a.plumes) ? Math.round(a.plumes) : 1;
  const hex = typeof a.cozy === 'string' && /^#[0-9a-f]{6}$/i.test(a.cozy);
  return {
    plumes: Math.max(0, Math.min(MAX_PLUMES, n)),
    cozy: hex ? a.cozy : a.cozy === true ? COZY_DEFAULT : null,
    cracked: a.cracked === true,
  };
}

/**
 * A face spec with its character's look filled in: the character's parts first, then anything the spec itself gives.
 * Specs without a known character come back as they are.
 * @param {object} [spec] the face spec
 * @returns {object} the full spec
 */
export function resolveFaceSpec(spec) {
  const s = spec ?? {};
  const preset = CHARACTER_FACES[s.character];
  if (!preset) return s;
  const out = { ...preset };
  for (const [k, v] of Object.entries(s)) if (v !== undefined && v !== null) out[k] = v;
  out.accessories = Array.isArray(s.accessories) && s.accessories.length ? s.accessories : preset.accessories;
  return out;
}

/**
 * Whether a point (face units) is in the bare chin spot that the bump layout keeps free of beard.
 * @param {number} u across
 * @param {number} v down
 * @returns {boolean} true inside the spot's box
 */
export function inChinPatch(u, v) {
  return Math.abs(u) <= CHIN_PATCH.hu && v >= CHIN_PATCH.top && v <= CHIN_PATCH.bottom;
}

/**
 * The extra layout lines a character face needs (faceGeometry adds these): the hairline the helmet makes, how much
 * room the curl or the helmet needs above the head, keep-out boxes (face units) over the beard and the steel, and the
 * character's own bump zones (the chin spot first).
 * @param {object} spec a resolved face spec (resolveFaceSpec)
 * @returns {{hairline: number[]|null, crown: number|null, boxes: number[][], zones: object[]|null}} hairline
 *   [top, curve] or null, crown (ry units) or null, boxes [u0, v0, u1, v1], zones {name, u: [lo, hi], v: [lo, hi]}
 */
export function characterLayout(spec) {
  const boxes = [];
  const armor = armorOptions(spec?.armor);
  if (spec?.beard) { // the beard: a staircase of boxes from its top edge down below the chin, leaving the chin spot free
    const bottom = 1 + BEARD_DROP + 0.05;
    const us = [];
    for (let i = -12; i <= 12; i += 1) us.push(i / 10);
    us.push(-CHIN_PATCH.hu, CHIN_PATCH.hu);
    us.sort((a, b) => a - b);
    for (let i = 1; i < us.length; i += 1) { // the table's corners sit on slice edges, so the lowest point is an end
      const [u0, u1] = [us[i - 1], us[i]];
      if (u1 - u0 < 1e-9) continue;
      const top = Math.min(beardTop(u0), beardTop(u1)) - BEARD_FUZZ;
      if (u0 >= -CHIN_PATCH.hu - 1e-9 && u1 <= CHIN_PATCH.hu + 1e-9) {
        boxes.push([u0, top, u1, CHIN_PATCH.top], [u0, CHIN_PATCH.bottom, u1, bottom]);
      } else boxes.push([u0, top, u1, bottom]);
    }
  }
  const zones = spec?.beard ? (armor ? ARMOR_ZONES : BEARD_ZONES) : null;
  if (!armor) return { hairline: null, crown: spec?.tuft ? TUFT_CROWN : null, boxes, zones };
  for (let i = -13; i < 11; i += 1) { // the cheek guards, both sides, in slices 0.1 high
    const v0 = i / 10;
    const v1 = (i + 1) / 10;
    const edge = Math.min(guardEdge(v0), guardEdge(v1)) - 0.02;
    boxes.push([edge, v0, 1.3, v1], [-1.3, v0, -edge, v1]);
  }
  return { hairline: [HELMET.browTop, HELMET.browCurve], crown: HELMET.crown, boxes, zones };
}
