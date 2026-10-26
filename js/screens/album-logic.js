// The thinking part of the before and after reveal and the Face album (T8.2, SPEC D24b). Pure helpers, no DOM, so
// Node can test them:
// - faceSetup: the small, saved recipe of a customer's face (seed, face parts, bump layout settings, stage size), taken
//   from the round's own arguments. The reveal and the album redraw every face from it with the real face drawing
//   code (screens/reveal.js); no pictures are ever stored.
// - revealFaces: the BEFORE and AFTER looks of one face (always the same seed and layout, only the look differs).
// - sliderKey and autoWipe: the wipe slider's keyboard steps and its one automatic slide.
// - The album rules: one entry per named regular (best stars kept), strangers one entry per face, at most ALBUM_MAX
//   entries (the oldest strangers go first), and the view the album screen shows.

import { REGULARS, makeCustomer } from '../data/customers.js';
import { getChapter, CAREER_BANDS } from '../data/chapters.js';
import { roundFaceSetup, roundTools } from '../pop/round-logic.js';
import { faceMood } from '../pop/logic.js';

/** The most faces the album keeps (the oldest strangers make room first; named regulars stay). */
export const ALBUM_MAX = 60;
/** The id of an album entry that is not a named regular (a walk-in with a generated face). */
export const STRANGER = 'stranger';
/** The stage size a face is laid out on when the real one is unknown (a phone held upright), in CSS px. */
export const DEFAULT_STAGE = { w: 390, h: 560 };
/** How far one arrow key press moves the wipe slider (0..1), and a Page Up / Page Down press. */
export const SLIDER_STEP = 0.1;
export const SLIDER_PAGE = 0.25;
/** Where the wipe slider rests when there is no automatic slide (reduced motion): half before, half after. */
export const SLIDER_REST = 0.5;

/**
 * Whether a customer step gets the before and after reveal and goes into the album: the career chapter (5, her
 * studio) and Keep working. The husband rounds at home (chapters 0 to 2) do not.
 * @param {{chapter?: number, keepWorking?: boolean}|null|undefined} step the customer step
 * @returns {boolean} true = reveal and album
 */
export function revealOn(step) {
  if (!step) return false;
  return Boolean(step.keepWorking) || getChapter(step.chapter)?.kind === 'career';
}

/**
 * A stage size the face layout can use: whole CSS px, at least 240 (as pop-mode.js stageSize), else the default.
 * @param {{w?: number, h?: number}|null|undefined} stage the pop scene's stage size when the round ended
 * @returns {{w: number, h: number}} the size
 */
export function stageOrDefault(stage) {
  /** Whether a side length is usable. @param {unknown} v the length @returns {boolean} true = a sane number */
  const ok = (v) => Number.isFinite(v) && v > 0 && v < 10000;
  if (!stage || !ok(stage.w) || !ok(stage.h)) return { ...DEFAULT_STAGE };
  return { w: Math.max(240, Math.round(stage.w)), h: Math.max(240, Math.round(stage.h)) };
}

/**
 * The recipe of a customer's face, from the round's arguments (app-logic.js roundArgs): the same seed, face parts and
 * bump settings the pop scene used (round-logic.js roundFaceSetup, called the way pop-mode.js startRound calls it),
 * plus the stage size, so laying it out again gives the same bumps, nose dots and moles.
 * @param {{customer?: {face?: object}, bumpCount?: number, allowedTypes?: string[], unlockedTools?: string[],
 *   decoys?: boolean, seed?: number}} args the startRound arguments
 * @param {{w?: number, h?: number}|null} [stage] the pop scene's stage size (null = DEFAULT_STAGE)
 * @returns {{seed: number, spec: object, count: number, kinds: string[], strip: boolean, decoys: boolean, w: number,
 *   h: number}} the face recipe
 */
export function faceSetup(args, stage = null) {
  const a = args ?? {};
  const s = roundFaceSetup({
    customer: a.customer, bumpCount: a.bumpCount, allowedTypes: a.allowedTypes,
    unlockedTools: roundTools(a.unlockedTools ?? ['fingers']), decoys: a.decoys, boss: a.boss ?? null,
  });
  const seed = Number.isFinite(a.seed) && a.seed > 0 ? Math.floor(a.seed) : 1;
  const { w, h } = stageOrDefault(stage);
  const out = { seed, spec: copySpec(s.spec), count: s.count, kinds: [...s.allowed], strip: s.strip, decoys: s.decoys, w, h };
  if (s.mix) out.mix = { ...s.mix }; // a boss face's own bump mix (T8.4)
  if (s.grown) out.grown = s.grown;
  return out;
}

/**
 * A copy of a face spec (face part ids), with its accessories list copied too, so nothing is shared.
 * @param {object} spec the face spec
 * @returns {object} the copy
 */
function copySpec(spec) {
  const out = { ...(spec ?? {}) };
  if (Array.isArray(out.accessories)) out.accessories = [...out.accessories];
  return out;
}

/**
 * The two looks of the reveal: BEFORE (every bump, the nose dots, the red patches and the worried mood the round
 * started with) and AFTER (clean skin, the glowing mood of a finished face, a soft glow and sparkles). Both use the
 * SAME recipe (seed, face parts, layout), so it is the same person; only the look differs.
 * @param {ReturnType<typeof faceSetup>} setup the face recipe
 * @returns {{before: object, after: object}} each = the recipe plus clean (no bumps), mood, redness and sparkles
 */
export function revealFaces(setup) {
  return {
    before: { ...setup, clean: false, mood: faceMood(0, Math.max(1, setup?.count ?? 1)), redness: 1, sparkles: false },
    after: { ...setup, clean: true, mood: faceMood(1, 1, true), redness: 0, sparkles: true },
  };
}

/**
 * Round a slider value to two decimals and keep it between 0 and 1.
 * @param {number} v the value
 * @returns {number} 0..1
 */
function clamp01(v) {
  return Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100) / 100;
}

/**
 * Where a key press moves the wipe slider (0 = all BEFORE, 1 = all AFTER): the left and down arrows show more of
 * before, right and up more of after, Page Up / Page Down move further, Home and End go to the ends.
 * @param {number} value the slider now (0..1)
 * @param {string} key the KeyboardEvent key
 * @returns {number|null} the new value, or null when the key does not move the slider
 */
export function sliderKey(value, key) {
  const v = clamp01(value);
  const moves = { ArrowLeft: -SLIDER_STEP, ArrowDown: -SLIDER_STEP, ArrowRight: SLIDER_STEP, ArrowUp: SLIDER_STEP, PageDown: -SLIDER_PAGE, PageUp: SLIDER_PAGE };
  if (key === 'Home') return 0;
  if (key === 'End') return 1;
  return key in moves ? clamp01(v + moves[key]) : null;
}

/** The automatic slide when the reveal opens, in seconds: a short look at BEFORE, the sweep to AFTER, a moment of
 * the clean face, then back to the middle so both show. */
export const AUTO_WIPE = { wait: 0.7, sweep: 1.3, hold: 0.8, settle: 0.6 };

/**
 * A smooth start and stop between 0 and 1.
 * @param {number} x 0..1
 * @returns {number} 0..1
 */
function ease(x) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/**
 * The slider position of the automatic slide at a time (see AUTO_WIPE).
 * @param {number} sec seconds since the slide began
 * @returns {{value: number, done: boolean}} value 0..1, done = the slide is over (it rests at SLIDER_REST)
 */
export function autoWipe(sec) {
  const { wait, sweep, hold, settle } = AUTO_WIPE;
  const t = Math.max(0, Number(sec) || 0);
  if (t < wait) return { value: 0, done: false };
  if (t < wait + sweep) return { value: ease((t - wait) / sweep), done: false };
  if (t < wait + sweep + hold) return { value: 1, done: false };
  const k = (t - wait - sweep - hold) / settle;
  if (k < 1) return { value: 1 - (1 - SLIDER_REST) * ease(k), done: false };
  return { value: SLIDER_REST, done: true };
}

/**
 * Whether a customer is one of the named regulars (data/customers.js REGULARS): they keep one album entry each.
 * @param {{id?: string, regular?: boolean}|null|undefined} customer the customer
 * @returns {boolean} true = a named regular
 */
export function isNamedRegular(customer) {
  return Boolean(customer?.regular) && REGULARS.some((r) => r.id === customer.id);
}

/**
 * A new album entry for a finished customer (small: no pictures, only what redraws the clean face).
 * Named regulars: id = their id (their face parts and name come from data/customers.js when drawn).
 * Strangers: id = STRANGER, plus their face parts and name key.
 * @param {{customer: object, setup: ReturnType<typeof faceSetup>, stars: number, stamp?: string|null}} o the customer,
 *   the face recipe, the stars of this visit and a boss or event stamp (T8.4: the event id, or null)
 * @param {number} now time in ms
 * @returns {object} the entry: {id, seed, face?, nameKey?, count, kinds, strip, decoys, w, h, stars, times, lastSeen,
 *   stamp?, mix?, grown?} (stamp = the event id of a boss face, T8.4; mix and grown = its bump rules, so it redraws)
 */
export function albumEntry({ customer, setup, stars, stamp = null }, now) {
  const named = isNamedRegular(customer);
  const entry = { id: named ? customer.id : STRANGER, seed: setup.seed };
  if (!named) {
    entry.face = copySpec(setup.spec);
    if (typeof customer?.nameKey === 'string') entry.nameKey = customer.nameKey;
  } else if (typeof stamp === 'string' && stamp) entry.face = copySpec(setup.spec); // a regular's event-day look (T8.4)
  const out = {
    ...entry, count: setup.count, kinds: [...setup.kinds], strip: setup.strip, decoys: setup.decoys, w: setup.w, h: setup.h,
    stars: Math.min(3, Math.max(0, Math.round(Number(stars) || 0))), times: 1, lastSeen: Math.max(0, Number(now) || 0),
  };
  if (typeof stamp === 'string' && stamp) out.stamp = stamp;
  if (setup.mix) out.mix = { ...setup.mix };
  if (setup.grown) out.grown = setup.grown;
  return out;
}

/**
 * Whether two album entries are the same face: the same named regular, or a stranger with the same seed and the same
 * face parts.
 * @param {object} a an entry
 * @param {object} b an entry
 * @returns {boolean} true = the same face
 */
export function sameFace(a, b) {
  if (!a || !b || a.id !== b.id) return false;
  if (a.id !== STRANGER) return true;
  return a.seed === b.seed && JSON.stringify(a.face ?? {}) === JSON.stringify(b.face ?? {});
}

/**
 * Keep the album at most `max` entries: the stranger seen longest ago goes first; only when no stranger is left
 * (never with 8 regulars and a cap of 60) the oldest entry of all.
 * @param {object[]} list the entries
 * @param {number} [max] the cap
 * @returns {object[]} a new list (order kept)
 */
export function capAlbum(list, max = ALBUM_MAX) {
  const out = [...list];
  while (out.length > max) {
    let pick = -1;
    for (const strangersOnly of [true, false]) {
      out.forEach((e, i) => {
        if (strangersOnly && e.id !== STRANGER) return;
        if (pick < 0 || (e.lastSeen ?? 0) < (out[pick].lastSeen ?? 0)) pick = i;
      });
      if (pick >= 0) break;
    }
    out.splice(pick, 1);
  }
  return out;
}

/**
 * Put a finished customer's face into the album: a face already there is updated in place (its BEST stars kept,
 * one more visit, seen now, the newest seed and layout, a stamp kept); a new face is added at the end. Then the cap.
 * @param {object[]|undefined} list the album (save.albumFaces)
 * @param {object} entry a new entry (albumEntry)
 * @param {number} [max] the cap
 * @returns {object[]} the new album
 */
export function addAlbumFace(list, entry, max = ALBUM_MAX) {
  const faces = Array.isArray(list) ? list : [];
  // A boss or event face (T8.4, with a stamp) is its own entry: it only joins an entry with the same stamp. A plain
  // visit joins the plain entry of that face, or (when there is none) its stamped one, whose stamp stays.
  const stampOf = (e) => e.stamp ?? null; // an entry's stamp, or null
  let i = faces.findIndex((e) => sameFace(e, entry) && stampOf(e) === stampOf(entry));
  if (i < 0 && !entry.stamp) i = faces.findIndex((e) => sameFace(e, entry));
  if (i < 0) return capAlbum([...faces, entry], max);
  const old = faces[i];
  const merged = { ...entry, stars: Math.max(old.stars ?? 0, entry.stars ?? 0), times: (old.times ?? 1) + 1 };
  if (old.stamp !== undefined) merged.stamp = old.stamp;
  return capAlbum(faces.map((e, k) => (k === i ? merged : e)), max);
}

/**
 * The save after a finished customer, with their face put into the album (a new save; the one given is not changed).
 * Nothing changes for a customer who stormed off, or outside the career and Keep working (revealOn).
 * @param {object} save the save (after applyRound)
 * @param {{step: object, customer: object, setup: ReturnType<typeof faceSetup>|null, stars: number, failed?: boolean}} o
 *   the customer step, the customer, the face recipe, the stars and whether they stormed off
 * @param {number} [now] time in ms
 * @returns {object} the new save
 */
export function recordFace(save, { step, customer, setup, stars, failed = false, stamp = null }, now = Date.now()) {
  if (failed || !setup || !revealOn(step)) return save;
  return { ...save, albumFaces: addAlbumFace(save.albumFaces, albumEntry({ customer, setup, stars, stamp }, now)) };
}

/**
 * The face recipe of an album entry, for drawing it: a named regular's face parts come from data/customers.js
 * (so they always match the game), a stranger's from the entry.
 * @param {object} entry an album entry
 * @returns {ReturnType<typeof faceSetup>} the recipe
 */
export function entrySetup(entry) {
  const regular = REGULARS.find((r) => r.id === entry.id);
  // A stamped regular (T8.4) keeps the look of that event day (its accessory); otherwise a regular's own face parts.
  const spec = copySpec((entry.stamp && entry.face) || regular?.face || entry.face || {});
  const { w, h } = stageOrDefault({ w: entry.w, h: entry.h });
  const out = {
    seed: entry.seed, spec, count: entry.count ?? 6, kinds: Array.isArray(entry.kinds) ? [...entry.kinds] : ['whitehead'],
    strip: Boolean(entry.strip), decoys: entry.decoys !== false, w, h,
  };
  if (entry.mix && typeof entry.mix === 'object') out.mix = { ...entry.mix }; // a boss face's bump mix (T8.4)
  if (Number.isFinite(entry.grown) && entry.grown > 0) out.grown = entry.grown;
  return out;
}

/**
 * How the album draws a face: the AFTER look (clean, no red), but with the happy, eyes-open mood of a nearly done face
 * (so the eyes and personalities show; the glowing mood closes the eyes), sparkles only on the big picture.
 * @param {object} entry an album entry
 * @param {boolean} [sparkles] true = the soft glow behind the head (the big picture)
 * @returns {object} the look for reveal.js faceCanvas
 */
export function albumLook(entry, sparkles = false) {
  return { ...revealFaces(entrySetup(entry)).after, mood: faceMood(1, 1), sparkles };
}

/**
 * The string key of an album entry's name: a regular's own name, a stranger's saved name key, or a plain fallback.
 * @param {object} entry an album entry
 * @returns {string} string key
 */
export function entryNameKey(entry) {
  return REGULARS.find((r) => r.id === entry.id)?.nameKey ?? entry.nameKey ?? 'ui.album.stranger';
}

/**
 * What the album screen shows: every named regular in the order she meets them (met = their entry, not met = a locked
 * "?" tile), then the strangers, the most recently seen first, and the counts for the header.
 * Boss and event faces (T8.4, entries with a stamp) are their own entries: a regular's tile shows their plain entry,
 * or their stamped one when she has only met them on an event day (so they count as met); every other stamped face
 * goes into `events` (most recently seen first).
 * @param {object[]|undefined} list the album (save.albumFaces)
 * @returns {{regulars: {id: string, nameKey: string, entry: object|null}[], strangers: object[], events: object[],
 *   met: number, total: number, faces: number}} the view
 */
export function albumView(list) {
  const faces = Array.isArray(list) ? list : [];
  const regulars = REGULARS.map((r) => ({
    id: r.id, nameKey: r.nameKey, entry: faces.find((e) => e.id === r.id && !e.stamp) ?? faces.find((e) => e.id === r.id) ?? null,
  }));
  /** Most recently seen first. @param {object} a an entry @param {object} b an entry @returns {number} sort order */
  const newest = (a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0);
  const shown = new Set(regulars.map((r) => r.entry).filter(Boolean));
  const strangers = faces.filter((e) => !e.stamp && !REGULARS.some((r) => r.id === e.id)).sort(newest);
  const events = faces.filter((e) => e.stamp && !shown.has(e)).sort(newest);
  const met = regulars.filter((r) => r.entry).length;
  return { regulars, strangers, events, met, total: REGULARS.length, faces: met + strangers.length + events.length };
}

/**
 * A ready-made album of 12 faces for the ?album=demo test flag: five named regulars and seven strangers, with
 * different stars and visits, laid out as a career customer's face.
 * @param {number} [now] time in ms
 * @returns {object[]} the album
 */
export function demoAlbum(now = Date.now()) {
  const band = CAREER_BANDS[CAREER_BANDS.length - 1];
  const tools = ['fingers', 'cottonPad', 'tweezers', 'noseStrip', 'warmCloth', 'patch'];
  /** One demo visit. @param {object} customer the customer @param {number} k demo number @returns {object} the entry */
  const visit = (customer, k) => {
    const setup = faceSetup({ customer, bumpCount: 7 + (k % 4), allowedTypes: band.types, unlockedTools: tools, decoys: true, seed: 1 + k * 7919 });
    return { ...albumEntry({ customer, setup, stars: 1 + (k % 3) }, now - k * 60000), times: 1 + (k % 4) };
  };
  let list = [];
  ['cora', 'penny', 'gus', 'pete', 'dave'].forEach((id, k) => { list = addAlbumFace(list, visit(REGULARS.find((r) => r.id === id), k)); });
  for (let k = 0; k < 7; k += 1) list = addAlbumFace(list, visit(makeCustomer(50001 + k, { chapter: 5 }), k + 5));
  return list;
}
