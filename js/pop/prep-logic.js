// The face built ahead (B99(4), SPEC D40) and the intro portrait with the round's own bumps (B59), the pure part: one
// way to lay a face out from its settings, used by the pop scene (pop-mode.js newFace and prepare), by the customer
// intro's portrait and by the before and after reveal (screens/reveal.js), so all three put the same bumps, nose dots
// and moles at the same spots when they get the same seed, face parts and stage size. Also the name of a build (same
// name = the same picture and layout can be used again) and a safe copy of a layout. No DOM here, so Node can test it.
import { faceGeometry, layoutFace } from './logic.js';

/**
 * Lay a face out: its geometry on a stage of w x h CSS px and its bumps, nose dots and moles (logic.js layoutFace).
 * The nose strip never goes over a clown nose.
 * @param {{seed: number, spec: object, w: number, h: number, count?: number, strip?: boolean, allowed?: string[]|null,
 *   decoys?: boolean, mix?: Object<string, number>|null, grown?: number}} o the face settings (see roundInputs)
 * @returns {{face: object, lay: {pimples: object[], strip: object|null, decoys: object[]}}} the geometry and the layout
 */
export function faceLayout({ seed, spec, w, h, count, strip = false, allowed = null, decoys = true, mix = null, grown = 0 }) {
  const face = faceGeometry(w, h, spec);
  const clownNose = (spec?.accessories ?? []).includes('clown-nose'); // no nose strip over a clown nose
  const lay = layoutFace({ seed, face, count, strip: Boolean(strip) && !clownNose, allowed, decoys, mix: mix ?? null, grown: grown ?? 0 });
  return { face, lay };
}

/**
 * The face settings of a customer round: the round's setup (round-logic.js roundFaceSetup), its seed and the stage size.
 * @param {{spec: object, count: number, allowed: string[], strip: boolean, decoys: boolean, mix?: object, grown?: number}} setup the setup
 * @param {number} seed the face seed
 * @param {number} w stage width in CSS px
 * @param {number} h stage height in CSS px
 * @returns {object} the settings for faceLayout
 */
export function roundInputs(setup, seed, w, h) {
  return {
    seed, spec: setup.spec, w, h, count: setup.count, strip: Boolean(setup.strip), allowed: setup.allowed ?? null,
    decoys: setup.decoys !== false, mix: setup.mix ?? null, grown: setup.grown ?? 0,
  };
}

/**
 * The face settings of a saved face recipe (screens/album-logic.js faceSetup: the reveal, the album, the intro portrait).
 * @param {{seed: number, spec: object, w: number, h: number, count: number, kinds: string[], strip: boolean,
 *   decoys: boolean, mix?: object, grown?: number}} rec the recipe
 * @returns {object} the settings for faceLayout
 */
export function recipeInputs(rec) {
  return {
    seed: rec.seed, spec: rec.spec, w: rec.w, h: rec.h, count: rec.count, strip: Boolean(rec.strip), allowed: rec.kinds ?? null,
    decoys: rec.decoys !== false, mix: rec.mix ?? null, grown: rec.grown ?? 0,
  };
}

/**
 * The name of one face build: the face settings plus what else changes the picture (pixel ratio, a fixed mood, ...).
 * Two builds with the same name give the same layout and the same first picture.
 * @param {object} inputs the face settings (faceLayout)
 * @param {object} [extra] anything else the picture depends on
 * @returns {string} the name
 */
export function buildKey(inputs, extra = {}) {
  return JSON.stringify([inputs, extra]);
}

/**
 * A deep copy of a layout, so a kept layout is never changed by the face that uses it (null when it cannot be copied).
 * @param {object} lay the layout (faceLayout lay)
 * @returns {object|null} the copy
 */
export function copyLayout(lay) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(lay) : JSON.parse(JSON.stringify(lay));
  } catch {
    return null;
  }
}
