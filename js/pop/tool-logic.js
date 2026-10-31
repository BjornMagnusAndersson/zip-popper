// The tool rules of the pop scene (T1.2, docs/TOOLS.md), kept apart so they can be tested in Node: which tools are in
// the tool bar, what a press with a tool on a bump does (squeeze, pull, or an "Ow" and no pop), how fast a bump pops
// with a tool on a warm bump, how a bump warms and cools under the cloth, where the nose strip goes on, and which popped
// spot a patch lands on, the rough-press chance and the irritation meter (T1.2b), and when a customer storms off.
// No DOM, no audio, no timers here. The tools themselves are in data/tools.js.
import { TOOLS, TOOL_IDS, WARM, IRRITATION, PAD_WIPE, toolInfo } from '../data/tools.js';
import { bumpInfo } from '../data/bumps.js';

/** The tool in hand when a round starts. */
export const START_TOOL = 'fingers';

/**
 * Whether a tool can be used: it exists and is built, and (outside the demo) its chapter has been reached.
 * @param {string} id a tool id
 * @param {{chapter?: number, demo?: boolean}} [o] the story chapter reached; demo = every built tool is available
 * @returns {boolean} true when it may be used
 */
export function isToolUnlocked(id, { chapter = 1, demo = false } = {}) {
  const tool = toolInfo(id);
  if (!tool?.implemented) return false;
  if (demo) return true;
  return tool.unlockAtEnd ? chapter > tool.unlockChapter : chapter >= tool.unlockChapter;
}

/**
 * The tools that get a button in the tool bar, in table order.
 * @param {{chapter?: number, demo?: boolean}} [o] as for isToolUnlocked
 * @returns {string[]} tool ids
 */
export function toolBarIds(o = {}) {
  return TOOL_IDS.filter((id) => TOOLS[id].bar && isToolUnlocked(id, o));
}

/**
 * Whether a tool can work on a kind of bump (a press with a squeeze or pull tool on any other bump is an Ow).
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @returns {boolean} true when it can
 */
export function toolWorksOn(toolId, bumpType) {
  const tool = toolInfo(toolId);
  if (!tool || !bumpInfo(bumpType)) return false;
  return tool.works === 'all' || (Array.isArray(tool.works) && tool.works.includes(bumpType));
}

/**
 * What pressing a bump with a tool does.
 * - 'squeeze' / 'pull': it builds pressure and pops (pull = it comes out as a plug).
 * - 'ow': wrong tool on this bump: no pressure, no pop, the customer winces and the Ow counter goes up.
 * - 'warm': the warm cloth warms the face (never an Ow).
 * - 'strip': the nose strip goes on (only on the nose).
 * - 'notYet': a patch on a bump that is not popped yet (nothing happens, no Ow).
 * - 'none': nothing (unknown tool, or a tool that does nothing on bumps).
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @param {{onNose?: boolean}} [o] whether the bump is on the nose (where the nose strip goes)
 * @returns {'squeeze'|'pull'|'ow'|'warm'|'strip'|'notYet'|'none'} the outcome
 */
export function pressOutcome(toolId, bumpType, { onNose = false } = {}) {
  const tool = toolInfo(toolId);
  if (!tool?.implemented || !bumpInfo(bumpType)) return 'none';
  switch (tool.use) {
    case 'squeeze':
    case 'pull':
      return toolWorksOn(toolId, bumpType) ? tool.use : 'ow';
    case 'warm': return 'warm';
    case 'strip': return onNose ? 'strip' : 'ow';
    case 'patch': return 'notYet';
    default: return 'none';
  }
}

/**
 * The tool that suits a bump best among those in hand (used by the keyboard, which never gives an Ow).
 * @param {string} bumpType a bump id
 * @param {string[]} [available] the usable tools (all built ones when left out)
 * @returns {string} a tool id that works on it (fingers when nothing else does)
 */
export function bestToolFor(bumpType, available = TOOL_IDS) {
  const list = (bumpInfo(bumpType)?.bestTools ?? []).filter((id) => available.includes(id) && toolWorksOn(id, bumpType));
  // A tool that pays extra on this bump comes first (B13 round 2c: the cotton pad on whiteheads and gold), so keyboard
  // players earn its pay bonus too; otherwise the first suitable tool in the bump's bestTools order.
  const pays = list.find((id) => (toolInfo(id)?.payBonus?.[bumpType] ?? 0) > 0);
  return pays ?? list[0] ?? START_TOOL;
}

/**
 * Hold time multiplier for a tool on a kind of bump (below 1 = faster).
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @returns {number} the multiplier (1 for unknown tools)
 */
export function toolHoldScale(toolId, bumpType) {
  const s = toolInfo(toolId)?.holdScale;
  if (!s) return 1;
  return Object.hasOwn(s, bumpType) ? s[bumpType] : (s.default ?? 1);
}

/**
 * How much wider the wiping pad is in the end-of-round goo wipe with this tool in hand (B13 round 2b): the cotton pad
 * wipes a wider path (data/tools.js PAD_WIPE.reach), so the wipe takes less finger travel; any other tool = 1.
 * @param {string} toolId the tool in hand during the wipe
 * @returns {number} the multiplier for the wipe radius (1 or more)
 */
export function wipeReach(toolId) {
  return toolId === 'cottonPad' ? PAD_WIPE.reach : 1;
}

/**
 * Where the wiping pad waits when the wipe starts (B13 round 2c): the bottom right corner, moved up above any box of
 * on-screen controls it would sit behind (landscape puts the tool bar over the bottom right of the face), and left of
 * a box when moving up is not enough. It always stays inside the scene.
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {number} radius the drawn pad's radius
 * @param {number} corner how far in from the bottom right corner the pad's middle starts
 * @param {{x: number, y: number, w: number, h: number}[]} [covered] boxes of controls over the scene, scene px
 * @returns {{x: number, y: number}} the pad's middle
 */
export function padRestSpot(w, h, radius, corner, covered = []) {
  const gap = 8; // room between the pad and a box
  /** Keep the pad's x inside the scene. @param {number} x x @returns {number} x */
  const clampX = (x) => Math.max(radius, Math.min(w - radius, x));
  /** Keep the pad's y inside the scene. @param {number} y y @returns {number} y */
  const clampY = (y) => Math.max(radius, Math.min(h - radius, y));
  let x = clampX(w - corner);
  let y = clampY(h - corner);
  const boxes = (Array.isArray(covered) ? covered : []).filter((b) => b && [b.x, b.y, b.w, b.h].every(Number.isFinite));
  // Whether the pad at (px, py) overlaps a box (with the gap around it).
  const hits = (px, py, b) => px + radius + gap > b.x && px - radius - gap < b.x + b.w
    && py + radius + gap > b.y && py - radius - gap < b.y + b.h;
  for (let round = 0; round < boxes.length + 1; round += 1) {
    const b = boxes.find((bb) => hits(x, y, bb));
    if (!b) break;
    const up = b.y - radius - gap;
    if (up >= Math.min(radius, h * 0.25)) y = clampY(up); // up above it, while there is room for that
    else x = clampX(b.x - radius - gap); // a tall box: go beside it
  }
  return { x, y };
}

/**
 * Where the wiping pad waits when the wipe starts, at any zoom (B43a). The controls sit at fixed places on the screen, so
 * the spot is found in screen px (the pad and the corner grow with the zoom) and then turned back into scene px.
 * At zoom 1 this is exactly padRestSpot.
 * @param {{z: number, x: number, y: number}} view the zoom view as drawn (z = zoom, x and y = the scene point at the top left)
 * @param {number} w scene width
 * @param {number} h scene height
 * @param {number} radius the pad's radius in scene px
 * @param {number} corner how far in from the bottom right corner the pad's middle starts, scene px
 * @param {{x: number, y: number, w: number, h: number}[]} [covered] boxes of controls over the scene, screen px
 * @returns {{x: number, y: number}} the pad's middle, scene px
 */
export function padStartSpot(view, w, h, radius, corner, covered = []) {
  const z = view?.z > 0 ? view.z : 1;
  const s = padRestSpot(w, h, radius * z, corner * z, covered);
  return { x: (view?.x ?? 0) + s.x / z, y: (view?.y ?? 0) + s.y / z };
}

/**
 * Seconds the keyboard's automatic wipe takes with this tool in hand: shorter with the cotton pad (PAD_WIPE.autoTime).
 * @param {string} toolId the tool in hand during the wipe
 * @param {number} baseSeconds the usual time
 * @returns {number} seconds
 */
export function autoWipeSeconds(toolId, baseSeconds) {
  return toolId === 'cottonPad' ? baseSeconds * PAD_WIPE.autoTime : baseSeconds;
}

/**
 * Hold time multiplier from a warm bump (the warm cloth): bumps that like warmth pop much faster, others a bit.
 * @param {number} warmth the warm meter, 0..1
 * @param {string} bumpType a bump id
 * @returns {number} the multiplier, 1 when cold
 */
export function warmHoldScale(warmth, bumpType) {
  const w = Math.max(0, Math.min(1, Number(warmth) || 0));
  return 1 - w * (bumpInfo(bumpType)?.warmHelps ? WARM.helpsCut : WARM.otherCut);
}

/**
 * Seconds of holding a bump needs with this tool on a face this warm. The base hold times in data/bumps.js are
 * the slow starting speeds (SPEC D13); tools and warmth only make them shorter or (fingers on a blackhead) longer.
 * @param {number} baseHold the bump's hold time in seconds
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @param {number} [warmth] the warm meter, 0..1
 * @param {number} [coldHold] extra hold multiplier while the bump is cold (SPEC D49, the Big Evil Horn boss's horns:
 *   1.4 = 40 percent longer when cold), fading to 1 as it warms (coldFactor); left out = 1 (every other bump)
 * @returns {number} seconds (never below 0.1)
 */
export function effectiveHold(baseHold, toolId, bumpType, warmth = 0, coldHold = 1) {
  return Math.max(0.1, baseHold * toolHoldScale(toolId, bumpType) * warmHoldScale(warmth, bumpType) * coldFactor(coldHold, warmth));
}

/** Clamp a number to 0..1 (not a number = 0). @param {number} v value @returns {number} 0..1 */
const unit = (v) => Math.max(0, Math.min(1, Number(v) || 0));

/**
 * A multiplier that only counts while a bump is cold (SPEC D49, the Big Evil Horn boss's horns): the full factor on a
 * cold bump, fading in a straight line to 1 on a fully warm one (like the sensitive skin's extra, skinRoughFactor).
 * @param {number} scale the factor when cold (not a positive number = 1, nothing changes)
 * @param {number} [warmth] the bump's warm meter, 0..1
 * @returns {number} the multiplier
 */
export function coldFactor(scale, warmth = 0) {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return 1 + (s - 1) * (1 - unit(warmth));
}

/**
 * How rough a tool is on a kind of bump while the face is this warm: the bump's rough chance (data/bumps.js) times
 * the tool's roughScale (data/tools.js), lowered a lot by the warm cloth. 0 for bumps and tools that are never rough.
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @param {number} [warmth] the warm meter, 0..1
 * @returns {number} 0..1
 */
export function roughness(toolId, bumpType, warmth = 0) {
  const base = (bumpInfo(bumpType)?.rough ?? 0) * (toolInfo(toolId)?.roughScale ?? 0);
  return base * (1 - WARM.roughCut * unit(warmth));
}

/**
 * The chance that a press start with the right tool still turns into an Ow (a rough press, TOOLS.md decision 3):
 * cold red, big and horn bumps only; the warm cloth lowers it a lot, a high irritation meter raises it a bit.
 * @param {string} toolId a tool id
 * @param {string} bumpType a bump id
 * @param {number} [warmth] the warm meter, 0..1
 * @param {number} [irritation] the irritation meter, 0..1
 * @param {number} [skin] how delicate the skin is (T8.3 sensitive skin: data/twists.js SENSITIVE.roughScale; 1 =
 *   normal); see skinRoughFactor
 * @param {number} [coldRough] extra rough-press multiplier while the bump is cold (SPEC D49, the Big Evil Horn boss's
 *   horns, round-logic.js applyColdHorn), fading to 1 as it warms (coldFactor); left out = 1 (every other bump)
 * @returns {number} chance 0..1
 */
export function roughChance(toolId, bumpType, warmth = 0, irritation = 0, skin = 1, coldRough = 1) {
  return Math.min(1, roughness(toolId, bumpType, warmth) * skinRoughFactor(skin, warmth) * coldFactor(coldRough, warmth) * (1 + IRRITATION.boost * unit(irritation)));
}

/**
 * The extra rough-press factor of delicate skin (T8.3, the sensitive twist): the full skin factor on a cold face, and
 * nothing extra on a fully warm one (the warm cloth takes the extra away as it warms, on top of its usual cut).
 * @param {number} skin the skin factor (2 = twice the Ow chance when cold; 1 or less, or not a number = normal)
 * @param {number} [warmth] the warm meter, 0..1
 * @returns {number} the multiplier, 1 or more
 */
export function skinRoughFactor(skin, warmth = 0) {
  const s = Number.isFinite(skin) && skin > 1 ? skin : 1;
  return 1 + (s - 1) * (1 - unit(warmth));
}

/**
 * How much irritation a pop of a cold bump adds (steady pop-pop-pop with bare fingers on a cold face fills the meter).
 * @param {string} toolId the tool that popped it
 * @param {string} bumpType a bump id
 * @param {number} [warmth] the warm meter, 0..1
 * @returns {number} the rise, 0..1
 */
export function coldPopIrritation(toolId, bumpType, warmth = 0) {
  return IRRITATION.coldPop * roughness(toolId, bumpType, warmth);
}

/** A calm irritation meter, at the start of a customer. @returns {{level: number, quiet: number, soothe: number}} state */
export function irritationStart() {
  return { level: 0, quiet: 0, soothe: 0 };
}

/**
 * The meter after it rises (an Ow or a cold pop): it goes up and the wait before it calms starts again.
 * @param {{level: number, quiet: number, soothe: number}} s the meter now
 * @param {number} amount how much it rises, 0..1
 * @returns {{level: number, quiet: number, soothe: number}} a new state
 */
export function irritationRise(s, amount) {
  const a = Math.max(0, Number(amount) || 0);
  if (a === 0) return s;
  return { ...s, level: Math.min(1, s.level + a), quiet: 0 };
}

/**
 * The meter after a moment: after calmDelay seconds without a rise it calms by itself; while the warm cloth is held,
 * or for a few seconds after a cotton pad pop, it calms faster and at once.
 * @param {{level: number, quiet: number, soothe: number}} s the meter now
 * @param {number} dt seconds since the last step
 * @param {{warm?: boolean, drain?: number, calmDelay?: number}} [o] warm = the warm cloth is held on the face; drain =
 *   how fast it calms compared with normal (1; a harder customer calms slower, see pop/round-logic.js
 *   irritationScales); calmDelay = seconds without a rise before it calms (left out = IRRITATION.calmDelay)
 * @returns {{level: number, quiet: number, soothe: number}} a new state
 */
export function irritationStep(s, dt, { warm = false, drain = 1, calmDelay = IRRITATION.calmDelay } = {}) {
  const d = Math.max(0, Number(dt) || 0);
  const quiet = s.quiet + d;
  const wait = Number.isFinite(calmDelay) && calmDelay >= 0 ? calmDelay : IRRITATION.calmDelay;
  let rate = quiet >= wait ? IRRITATION.drainPerSecond : 0;
  if (s.soothe > 0) rate = Math.max(rate, IRRITATION.padDrain);
  if (warm) rate = Math.max(rate, IRRITATION.warmDrain);
  const k = Number.isFinite(drain) && drain > 0 ? drain : 1;
  return { level: Math.max(0, s.level - rate * k * d), quiet, soothe: Math.max(0, s.soothe - d) };
}

/**
 * The meter after soothing: a cotton pad pop (calms faster for a few seconds) or the cream (takes it away).
 * @param {{level: number, quiet: number, soothe: number}} s the meter now
 * @param {'pad'|'cream'} how what soothes it
 * @returns {{level: number, quiet: number, soothe: number}} a new state
 */
export function irritationSoothe(s, how) {
  if (how === 'pad') return { ...s, soothe: IRRITATION.padSeconds };
  if (how === 'cream') return { ...s, level: Math.max(0, s.level - IRRITATION.cream) };
  return s;
}

/**
 * Whether the customer storms off (SPEC D15): the meter is full in a Story/Career round. Free play never fails.
 * @param {number} level the irritation meter, 0..1
 * @param {'free'|'career'} mode the kind of round
 * @returns {boolean} true = fail
 */
export function isFail(level, mode) {
  return mode === 'career' && level >= 1;
}

/**
 * One bump's warmth after a moment: it fills while the warm cloth is on that bump and slowly cools when it is not
 * (owner 2026-10-28: the cloth warms bumps one by one, SPEC D37).
 * @param {number} warmth now, 0..1
 * @param {number} dt seconds since the last step
 * @param {boolean} holding whether the warm cloth is on this bump
 * @returns {number} the new warmth, 0..1
 */
export function warmStep(warmth, dt, holding) {
  if (holding) return Math.min(1, warmth + dt * WARM.fillPerSecond);
  return Math.max(0, warmth - dt * WARM.drainPerSecond);
}

/**
 * One bump's extra heat (too hot, SPEC D41): it rises only while the cloth stays on a bump that is already fully warm,
 * and goes away quickly once the cloth moves on. At 1 the customer says "Ow, too hot!".
 * @param {number} heat now, 0..1
 * @param {number} dt seconds since the last step
 * @param {boolean} parked the cloth is on this bump and the bump is fully warm
 * @returns {number} the new heat, 0..1
 */
export function heatStep(heat, dt, parked) {
  const h = Number(heat) || 0;
  if (parked) return Math.min(1, h + dt / WARM.hotAfter);
  return Math.max(0, h - dt * WARM.hotCool);
}

/**
 * Whether a bump is under the warm cloth: the cloth is a towel about twice as wide as it is tall, and a bump counts
 * when any of it is under the towel (a little extra room, since the finger hides the cloth).
 * @param {{x: number, y: number}|null} cloth where the cloth is (scene px)
 * @param {{x: number, y: number, r: number}} p the bump
 * @param {number} r the cloth's half width (scene px)
 * @returns {boolean} true when the cloth warms this bump
 */
export function underCloth(cloth, p, r) {
  if (!cloth) return false;
  const ex = (p.x - cloth.x) / (r * WARM.reach + p.r);
  const ey = (p.y - cloth.y) / (r * 0.62 * WARM.reach + p.r);
  return ex * ex + ey * ey <= 1;
}

/**
 * Whether the popping step is over, so the wipe can start: every bump is popped. The nose strip never holds it up (it
 * is optional and only pays a bonus when peeled); only a strip that is being peeled right now is waited for (a finger
 * on it, flying off, or past 0.6 and finishing by itself), so a peel she started still gets its bonus.
 * @param {{popped: boolean}[]} pimples the bumps
 * @param {{off?: boolean, flying?: boolean, q?: number}|null} [strip] the nose strip (engine state), or null
 * @param {boolean} [peeling] a finger is peeling the strip now
 * @returns {boolean} true when the wipe can start
 */
export function popStepOver(pimples, strip = null, peeling = false) {
  if (pimples.some((p) => !p.popped)) return false;
  return !stripBusy(strip, peeling);
}

/**
 * Whether the nose strip is being peeled right now (a finger on it, flying off, or past 0.6 and finishing by itself).
 * The wipe start and the cream start wait for such a peel, so a peel she started still gets its bonus (B55).
 * @param {{off?: boolean, flying?: boolean, q?: number}|null} strip the nose strip (engine state), or null
 * @param {boolean} [peeling] a finger is peeling the strip now
 * @returns {boolean} true while a peel is going on
 */
export function stripBusy(strip, peeling = false) {
  if (!strip || strip.off) return false;
  return Boolean(peeling || strip.flying || (strip.q ?? 0) > 0.6);
}

/**
 * What a press on the nose strip does during the wipe step (B55: the strip stays usable until the cream starts):
 * 'peel' when it is stuck on (any tool peels), 'stick' when it is not stuck yet and the nose strip is in hand, or null
 * (the press wipes as usual). A strip that is gone or flying off does nothing.
 * @param {{strip: {off?: boolean, flying?: boolean, stuck?: boolean}|null, onStrip: boolean, toolUse?: string|null}} o
 *   the strip (engine state), whether the press is on it, and the tool in hand's use (data/tools.js, 'strip' = nose strip)
 * @returns {'peel'|'stick'|null} what happens
 */
export function wipeStripPress({ strip, onStrip, toolUse = null }) {
  if (!strip || strip.off || strip.flying || !onStrip) return null;
  if (strip.stuck) return 'peel';
  return toolUse === 'strip' ? 'stick' : null;
}

/** Seconds a wipe with no goo at all waits for the nose strip (B61(1)); a finger held still this long on a peel lets the cream go on (B61(4)). */
export const STRIP_WAIT = { noGoo: 4, stillPeel: 1.5 };

/**
 * How long the wipe step waits when there is no goo to wipe (a face with only tweezer plugs and hairs, or all the goo
 * flew off): while the nose strip is still on the face she gets the same chance to stick and peel it as on other
 * faces (B61(1); B55 for the wipe), so the step waits STRIP_WAIT.noGoo seconds (less once it is peeled). No strip, or
 * it is already off: 0, the cream comes at once as before.
 * @param {{off?: boolean}|null} strip the nose strip (engine state), or null
 * @returns {number} seconds, 0 or more
 */
export function noGooWait(strip) {
  return strip && !strip.off ? STRIP_WAIT.noGoo : 0;
}

/**
 * What Enter or Space does in the wipe step (B61(2)): a stuck-on strip is peeled first, a bit per press (as in the
 * pop step), then the keys wipe for her. A strip not stuck on, flying off or gone does not hold the wipe up.
 * @param {{off?: boolean, flying?: boolean, stuck?: boolean}|null} strip the nose strip (engine state), or null
 * @returns {'peel'|'wipe'} what the key does
 */
export function wipeKeyAction(strip) {
  return strip && !strip.off && strip.stuck && !strip.flying ? 'peel' : 'wipe';
}

/**
 * Whether a finger on the strip has kept still so long that the cream should not wait for it any more (B61(4)): once
 * the wipe is done, a peel that has not moved for STRIP_WAIT.stillPeel seconds lets go by itself (past 0.6 it then
 * finishes and pays, as on lifting the finger; else the strip comes away with the cream).
 * @param {number} stillSeconds seconds since the peel last moved the strip
 * @returns {boolean} true = let go of the peel
 */
export function peelStalled(stillSeconds) {
  return Number.isFinite(stillSeconds) && stillSeconds >= STRIP_WAIT.stillPeel;
}

/**
 * Whether a point is on the nose strip's spot (with some room around it for fingers).
 * @param {{x: number, y: number, w: number, h: number}|null} strip the strip (logic.js noseStrip)
 * @param {number} x point x
 * @param {number} y point y
 * @returns {boolean} true when it is on the strip's spot
 */
export function inStripArea(strip, x, y) {
  if (!strip) return false;
  return x > strip.x - 14 && x < strip.x + strip.w + 6 && y > strip.y - 12 && y < strip.y + strip.h + 12;
}

/**
 * Whether a point is on the face (inside the skin oval).
 * @param {{cx: number, cy: number, rx: number, ry: number}|null} face the face area
 * @param {number} x point x
 * @param {number} y point y
 * @returns {boolean} true on the face; true everywhere when no face area is known
 */
export function onFace(face, x, y) {
  if (!face) return true;
  const ex = (x - face.cx) / Math.max(1, face.rx);
  const ey = (y - face.cy) / Math.max(1, face.ry);
  return ex * ex + ey * ey <= 1;
}

/**
 * The popped spot a patch lands on: the nearest spot not patched yet whose fingertip circle holds the point.
 * @param {{x: number, y: number, r: number, patched?: boolean}[]} marks the popped spots
 * @param {number} x tap x
 * @param {number} y tap y
 * @returns {object|null} the spot, or null
 */
export function findPatchSpot(marks, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const m of marks) {
    if (m.patched) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d <= Math.max(m.r * 1.6, 26) && d < bestD) { best = m; bestD = d; }
  }
  return best;
}
