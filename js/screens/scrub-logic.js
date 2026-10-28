// The rules of the wipe-and-scrub job (T5.1b, SPEC D12-1 and D16), with no DOM so they can be tested in Node.
// After a studio upgrade is bought, the player cleans THAT item in a close-up. The close-up is split into a grid of
// cells; each cell holds some grime (0 = clean, 1 = fully dirty). Each item has its own grime recipe: a list of spots
// (where the grime sits on the item, as shares 0..1 of the picture) and how hard it is to rub off. Rubbing takes
// grime away from the cells under the sponge; the job is done when SCRUB_DONE of the grime is gone.
// Keyboard and switch players press Space or Enter: each press scrubs the area under the sponge, and when that area
// is clean the sponge hops on to the next dirty one. The arrow keys move the sponge by hand.

/** Share of the grime (0..1) that must be gone before the job counts as done. */
export const SCRUB_DONE = 0.9;
/** The grid the close-up is split into. */
export const SCRUB_COLS = 12;
export const SCRUB_ROWS = 8;
/** How much grime one Space or Enter press takes off each cell under the sponge (two presses clean an area). */
export const KEY_AMOUNT = 0.5;
/** The keyboard sponge's reach, in cells (1.5 = the cell and its eight neighbours). */
export const KEY_REACH = 1.5;
/** How far one arrow press moves the sponge, in cells. */
export const ARROW_STEP = 2;

/** The studio upgrades that have their own grime recipe (game/studio.js layer ids). */
export const SCRUB_ITEMS = ['lamp', 'plant', 'chair', 'wallPaint', 'sign', 'leakFix'];

/**
 * The grime recipes. hardness = how much grime one sponge rub takes off (sticky stains need more rubs than dust).
 * Each spot: kind (how it is drawn: dust, fluff, web, sticky, crumbs, scuff, water, smudge, haze), x and y (its middle),
 * rx and ry (its half size) as shares of the picture, rot (turn in radians, optional). The spots sit on the item as
 * backdrop.js drawCloseup draws it. Cartoon only: dust is grey fluff, stains are brown or olive, never anything gross.
 */
const RECIPES = {
  // The ring light: dust on the ring, the pole and the tripod, cobwebs strung between ring and pole.
  lamp: { hardness: 0.1, spots: [
    { kind: 'dust', x: 0.5, y: 0.37, rx: 0.17, ry: 0.26 },
    { kind: 'dust', x: 0.5, y: 0.73, rx: 0.045, ry: 0.13 },
    { kind: 'dust', x: 0.5, y: 0.9, rx: 0.12, ry: 0.06 },
    { kind: 'web', x: 0.32, y: 0.37, rx: 0.08, ry: 0.13, rot: 1 },
    { kind: 'web', x: 0.71, y: 0.5, rx: 0.08, ry: 0.13, rot: 0 },
    { kind: 'web', x: 0.43, y: 0.75, rx: 0.07, ry: 0.11, rot: 1 },
  ] },
  // The hanging plant: dusty leaves, a dusty pot rim, fluff on the vines.
  plant: { hardness: 0.1, spots: [
    { kind: 'dust', x: 0.5, y: 0.16, rx: 0.12, ry: 0.15 },
    { kind: 'dust', x: 0.5, y: 0.31, rx: 0.09, ry: 0.09 },
    { kind: 'fluff', x: 0.41, y: 0.58, rx: 0.05, ry: 0.22, rot: 0.1 },
    { kind: 'fluff', x: 0.54, y: 0.7, rx: 0.05, ry: 0.25, rot: -0.08 },
    { kind: 'fluff', x: 0.59, y: 0.52, rx: 0.045, ry: 0.16 },
    { kind: 'web', x: 0.57, y: 0.13, rx: 0.06, ry: 0.1, rot: 0 },
  ] },
  // The pink wingback chair: sticky juice and coffee stains, and crumbs in the seat.
  chair: { hardness: 0.06, spots: [
    { kind: 'sticky', x: 0.45, y: 0.3, rx: 0.075, ry: 0.12, rot: 0.3 },
    { kind: 'sticky', x: 0.57, y: 0.48, rx: 0.08, ry: 0.11, rot: -0.4 },
    { kind: 'sticky', x: 0.355, y: 0.68, rx: 0.05, ry: 0.1, rot: 0.1 },
    { kind: 'sticky', x: 0.645, y: 0.31, rx: 0.04, ry: 0.15 },
    { kind: 'sticky', x: 0.355, y: 0.38, rx: 0.035, ry: 0.12 },
    { kind: 'crumbs', x: 0.5, y: 0.73, rx: 0.14, ry: 0.07 },
    { kind: 'sticky', x: 0.64, y: 0.69, rx: 0.05, ry: 0.08, rot: 0.6 },
  ] },
  // The freshly painted wall: shoe scuffs near the floor, grey streaks, an old olive water mark showing through.
  wallPaint: { hardness: 0.08, spots: [
    { kind: 'scuff', x: 0.2, y: 0.78, rx: 0.11, ry: 0.07, rot: -0.2 },
    { kind: 'scuff', x: 0.66, y: 0.82, rx: 0.13, ry: 0.06, rot: 0.15 },
    { kind: 'scuff', x: 0.44, y: 0.46, rx: 0.1, ry: 0.07, rot: 0.5 },
    { kind: 'water', x: 0.77, y: 0.4, rx: 0.1, ry: 0.15 },
    { kind: 'water', x: 0.22, y: 0.38, rx: 0.08, ry: 0.12 },
    { kind: 'scuff', x: 0.55, y: 0.24, rx: 0.08, ry: 0.06, rot: -0.6 },
  ] },
  // The new sign: a hazy film all over the glass and smudgy fingerprints on top.
  sign: { hardness: 0.08, spots: [
    { kind: 'haze', x: 0.5, y: 0.6, rx: 0.36, ry: 0.3 },
    { kind: 'smudge', x: 0.28, y: 0.48, rx: 0.06, ry: 0.09, rot: 0.4 },
    { kind: 'smudge', x: 0.46, y: 0.73, rx: 0.06, ry: 0.09, rot: -0.3 },
    { kind: 'smudge', x: 0.63, y: 0.44, rx: 0.06, ry: 0.09, rot: 0.2 },
    { kind: 'smudge', x: 0.77, y: 0.72, rx: 0.06, ry: 0.09, rot: -0.5 },
  ] },
  // The fixed leak: the old olive water marks round the new pipe joint and down the wall, dust and a cobweb on the pipe.
  leakFix: { hardness: 0.08, spots: [
    { kind: 'water', x: 0.5, y: 0.5, rx: 0.1, ry: 0.17 },
    { kind: 'water', x: 0.3, y: 0.42, rx: 0.08, ry: 0.12 },
    { kind: 'water', x: 0.69, y: 0.6, rx: 0.07, ry: 0.13 },
    { kind: 'dust', x: 0.18, y: 0.3, rx: 0.12, ry: 0.06 },
    { kind: 'dust', x: 0.83, y: 0.3, rx: 0.12, ry: 0.06 },
    { kind: 'web', x: 0.9, y: 0.16, rx: 0.07, ry: 0.11, rot: 0.3 },
  ] },
};

/** The plain grime for anything without its own recipe: a few dusty patches in the middle. */
const GENERIC = { hardness: 0.1, spots: [
  { kind: 'dust', x: 0.35, y: 0.4, rx: 0.12, ry: 0.18 },
  { kind: 'dust', x: 0.62, y: 0.55, rx: 0.14, ry: 0.2 },
  { kind: 'water', x: 0.5, y: 0.3, rx: 0.1, ry: 0.12 },
] };

/**
 * The grime recipe for an item (unknown items get the plain one).
 * @param {string} id studio item id
 * @returns {{hardness: number, spots: {kind: string, x: number, y: number, rx: number, ry: number, rot?: number}[]}} the recipe
 */
export function grimeRecipe(id) {
  return Object.hasOwn(RECIPES, id) ? RECIPES[id] : GENERIC;
}

/**
 * Whether a point (shares of the picture) lies inside a spot (a turned ellipse).
 * @param {{x: number, y: number, rx: number, ry: number, rot?: number}} s the spot
 * @param {number} x share of the width
 * @param {number} y share of the height
 * @returns {boolean} true when inside
 */
export function inSpot(s, x, y) {
  const c = Math.cos(-(s.rot ?? 0));
  const n = Math.sin(-(s.rot ?? 0));
  const dx = x - s.x;
  const dy = y - s.y;
  const lx = dx * c - dy * n;
  const ly = dx * n + dy * c;
  return (lx * lx) / (s.rx * s.rx) + (ly * ly) / (s.ry * s.ry) <= 1;
}

/**
 * A fresh grime map for a recipe: every cell whose middle lies in a spot is fully dirty, the rest are clean.
 * @param {{spots: object[]}} recipe the grime recipe
 * @param {number} [cols] cells across
 * @param {number} [rows] cells down
 * @returns {{cols: number, rows: number, dirt: number[], start: number}} the map (start = the grime it began with)
 */
export function grimeMap(recipe, cols = SCRUB_COLS, rows = SCRUB_ROWS) {
  const dirt = Array.from({ length: cols * rows }, (_, i) => {
    const x = ((i % cols) + 0.5) / cols;
    const y = (Math.floor(i / cols) + 0.5) / rows;
    return recipe.spots.some((s) => inSpot(s, x, y)) ? 1 : 0;
  });
  return { cols, rows, dirt, start: dirt.reduce((a, b) => a + b, 0) };
}

/**
 * The middle of a cell, as shares of the picture.
 * @param {{cols: number, rows: number}} map the grime map
 * @param {number} i cell index (reading order)
 * @returns {{x: number, y: number}} the middle
 */
export function cellCenter(map, i) {
  return { x: ((i % map.cols) + 0.5) / map.cols, y: (Math.floor(i / map.cols) + 0.5) / map.rows };
}

/**
 * Rub at a point: every cell whose middle is under the sponge loses some grime.
 * @param {{cols: number, rows: number, dirt: number[], start: number}} map the grime map
 * @param {number} x sponge middle, share of the width
 * @param {number} y sponge middle, share of the height
 * @param {number} rx sponge reach, share of the width
 * @param {number} ry sponge reach, share of the height
 * @param {number} amount grime taken off each cell (0..1)
 * @returns {{map: object, cleaned: number[]}} the new map and the cells that just became clean (for sparkles)
 */
export function rubMap(map, x, y, rx, ry, amount) {
  const cleaned = [];
  const dirt = map.dirt.map((d, i) => {
    if (d <= 0) return 0;
    const c = cellCenter(map, i);
    const inside = ((c.x - x) ** 2) / (rx * rx) + ((c.y - y) ** 2) / (ry * ry) <= 1;
    if (!inside) return d;
    const left = Math.max(0, Math.round((d - amount) * 1000) / 1000);
    if (left === 0) cleaned.push(i);
    return left;
  });
  return { map: { ...map, dirt }, cleaned };
}

/**
 * How much of the grime is gone.
 * @param {{dirt: number[], start: number}} map the grime map
 * @returns {number} 0..1 (1 = spotless; a map that started clean counts as 1)
 */
export function scrubProgress(map) {
  if (!map.start) return 1;
  return Math.max(0, Math.min(1, 1 - map.dirt.reduce((a, b) => a + b, 0) / map.start));
}

/**
 * Whether the job is done (clean enough).
 * @param {{dirt: number[], start: number}} map the grime map
 * @returns {boolean} true at SCRUB_DONE or more
 */
export function scrubDoneNow(map) {
  return scrubProgress(map) >= SCRUB_DONE - 1e-9;
}

/**
 * The progress as the screen announces it: whole tens of percent (so a screen reader is not flooded).
 * @param {number} progress 0..1
 * @returns {number} 0, 10, 20 ... 100
 */
export function progressStep(progress) {
  return Math.min(100, Math.floor(progress * 10 + 1e-9) * 10);
}

/**
 * Whether any cell within the keyboard sponge's reach of a cell still has grime.
 * @param {{cols: number, rows: number, dirt: number[]}} map the grime map
 * @param {number} at the sponge's cell
 * @returns {boolean} true when there is grime to scrub there
 */
export function dirtyNear(map, at) {
  const ax = at % map.cols;
  const ay = Math.floor(at / map.cols);
  return map.dirt.some((d, i) => d > 0 && ((i % map.cols) - ax) ** 2 + (Math.floor(i / map.cols) - ay) ** 2 <= KEY_REACH * KEY_REACH);
}

/**
 * Where the keyboard sponge should scrub: where it is when there is grime in reach, else the next dirty cell after
 * it in reading order (going round to the start), or null when everything is clean.
 * @param {{cols: number, rows: number, dirt: number[]}} map the grime map
 * @param {number} at the sponge's cell
 * @returns {number|null} the cell to scrub
 */
export function keyTarget(map, at) {
  if (dirtyNear(map, at)) return at;
  const n = map.dirt.length;
  for (let k = 1; k <= n; k += 1) {
    const i = (at + k) % n;
    if (map.dirt[i] > 0) return i;
  }
  return null;
}

/**
 * One Space or Enter press: scrub around the target cell, then, when that area is clean, hop the sponge on to the
 * next dirty area.
 * @param {{cols: number, rows: number, dirt: number[], start: number}} map the grime map
 * @param {number} at the sponge's cell
 * @returns {{map: object, cleaned: number[], scrubbed: number|null, at: number}} the new map, the cells that became
 *   clean, the cell scrubbed (null = nothing left) and where the sponge is now
 */
export function keyScrub(map, at) {
  const target = keyTarget(map, at);
  if (target === null) return { map, cleaned: [], scrubbed: null, at };
  const c = cellCenter(map, target);
  const out = rubMap(map, c.x, c.y, (KEY_REACH + 0.01) / map.cols, (KEY_REACH + 0.01) / map.rows, KEY_AMOUNT);
  const next = dirtyNear(out.map, target) ? target : (keyTarget(out.map, target) ?? target);
  return { map: out.map, cleaned: out.cleaned, scrubbed: target, at: next };
}

/**
 * Move the keyboard sponge with an arrow key (it stays inside the picture).
 * @param {{cols: number, rows: number}} map the grime map
 * @param {number} at the sponge's cell
 * @param {string} key 'ArrowLeft', 'ArrowRight', 'ArrowUp' or 'ArrowDown' (anything else: no move)
 * @returns {number} the new cell
 */
export function moveSponge(map, at, key) {
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const m = moves[key];
  if (!m) return at;
  const x = Math.max(0, Math.min(map.cols - 1, (at % map.cols) + m[0] * ARROW_STEP));
  const y = Math.max(0, Math.min(map.rows - 1, Math.floor(at / map.cols) + m[1] * ARROW_STEP));
  return y * map.cols + x;
}

/**
 * The first cell the keyboard sponge starts on: the first dirty one (or the middle when all is clean).
 * @param {{cols: number, rows: number, dirt: number[]}} map the grime map
 * @returns {number} cell index
 */
export function firstSpongeCell(map) {
  const i = map.dirt.findIndex((d) => d > 0);
  return i >= 0 ? i : Math.floor(map.rows / 2) * map.cols + Math.floor(map.cols / 2);
}

/**
 * The rub points along a drag: evenly spaced, so a fast swipe leaves no gaps and wiggling on the spot does not clean
 * faster than real rubbing. Distance shorter than one step is kept for the next move.
 * @param {{x: number, y: number}} from the last rub point
 * @param {{x: number, y: number}} to where the finger is now
 * @param {number} step distance between rubs (same units as the points)
 * @returns {{points: {x: number, y: number}[], last: {x: number, y: number}}} the rub points and the new last point
 */
export function strokePoints(from, to, step) {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const n = step > 0 ? Math.floor(d / step) : 0;
  const points = [];
  for (let i = 1; i <= n; i += 1) points.push({ x: from.x + ((to.x - from.x) * i * step) / d, y: from.y + ((to.y - from.y) * i * step) / d });
  return { points, last: n ? points[n - 1] : from };
}

/**
 * The string keys for an item's lines: the intro text and the line when it is clean (unknown items get the plain ones).
 * @param {string} id studio item id
 * @returns {{text: string, clean: string}} string keys
 */
export function scrubTextKeys(id) {
  return SCRUB_ITEMS.includes(id)
    ? { text: `ui.scrub.text.${id}`, clean: `ui.scrub.clean.${id}` }
    : { text: 'ui.scrub.text', clean: 'ui.scrub.clean' };
}
