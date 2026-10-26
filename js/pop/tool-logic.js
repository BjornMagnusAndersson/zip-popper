// The tool rules of the pop scene (T1.2, docs/TOOLS.md), kept apart so they can be tested in Node: which tools are in
// the tool bar, what a press with a tool on a bump does (squeeze, pull, or an "Ow" and no pop), how fast a bump pops
// with a tool and a warm face, how the warm meter fills and drains, where the nose strip goes on, and which popped
// spot a patch lands on, the rough-press chance and the irritation meter (T1.2b), and when a customer storms off.
// No DOM, no audio, no timers here. The tools themselves are in data/tools.js.
import { TOOLS, TOOL_IDS, WARM, IRRITATION, toolInfo } from '../data/tools.js';
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
  const list = bumpInfo(bumpType)?.bestTools ?? [];
  return list.find((id) => available.includes(id) && toolWorksOn(id, bumpType)) ?? START_TOOL;
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
 * Hold time multiplier from a warm face (the warm cloth): bumps that like warmth pop much faster, others a bit.
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
 * @returns {number} seconds (never below 0.1)
 */
export function effectiveHold(baseHold, toolId, bumpType, warmth = 0) {
  return Math.max(0.1, baseHold * toolHoldScale(toolId, bumpType) * warmHoldScale(warmth, bumpType));
}

/** Clamp a number to 0..1 (not a number = 0). @param {number} v value @returns {number} 0..1 */
const unit = (v) => Math.max(0, Math.min(1, Number(v) || 0));

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
 * @returns {number} chance 0..1
 */
export function roughChance(toolId, bumpType, warmth = 0, irritation = 0) {
  return Math.min(1, roughness(toolId, bumpType, warmth) * (1 + IRRITATION.boost * unit(irritation)));
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
 * @param {{warm?: boolean, drain?: number}} [o] warm = the warm cloth is held on the face; drain = how fast it calms
 *   compared with normal (1; a harder customer calms slower, see pop/round-logic.js irritationScales)
 * @returns {{level: number, quiet: number, soothe: number}} a new state
 */
export function irritationStep(s, dt, { warm = false, drain = 1 } = {}) {
  const d = Math.max(0, Number(dt) || 0);
  const quiet = s.quiet + d;
  let rate = quiet >= IRRITATION.calmDelay ? IRRITATION.drainPerSecond : 0;
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
 * The warm meter after a moment: it fills while the cloth is held on the face and slowly drains when it is not.
 * @param {number} warmth now, 0..1
 * @param {number} dt seconds since the last step
 * @param {boolean} holding whether the warm cloth is held on the face
 * @returns {number} the new warmth, 0..1
 */
export function warmStep(warmth, dt, holding) {
  if (holding) return Math.min(1, warmth + dt * WARM.fillPerSecond);
  return Math.max(0, warmth - dt * WARM.drainPerSecond);
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
