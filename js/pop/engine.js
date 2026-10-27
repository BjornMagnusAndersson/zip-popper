// The moving part of the pop scene: one canvas with the full face (its picture is the "texture") and its bumps.
// Press and hold a bump and pressure builds: two finger dents push in, the skin around it stretches (a
// small mesh warp of the picture), the head swells and shines, and then it pops with a wet sound, a buzz, worms
// and drops of glossy goo (and splats on the "lens" for the big ones). Blackheads are pulled out with tweezers; a
// face may have a blackhead strip on the nose to peel off. When everything is out: wipe the goo away with a cotton pad,
// then cream goes on and a clean sweep leaves the skin smooth. Reduced motion: no wobble, no splats, fades instead of
// sweeps, still fully playable. Keyboard: Enter or Space squeezes the next pimple, peels, or wipes for you.
// The drawing loop only runs while something moves; dispose() stops it. resize() moves everything to a new scene size
// (phone turned, window resized) without starting over. The face picture may be see-through around the person, so the
// studio room drawn behind the canvas (backdrop.js) shows through.
// Tools (T1.2): the player picks a tool (setTool) and a press does what that tool does (pop/tool-logic.js): fingers and
// cotton pad squeeze, tweezers pull blackheads, the nose strip sticks on the dotty nose and is peeled off, the warm
// cloth held on the face fills a warm meter (bumps pop faster for a while), the patch sticks on popped spots. The wrong
// tool on a bump is an "Ow": no pressure, no pop, ouch lines, and onOw tells the controller (wince, counter).
// Two-finger squeeze (T1.7, option squeeze: true, the Settings switch): two fingers put down anywhere in a big zone
// round a bump squeeze the nearest bump (fingers tool only; beside or below it is fine); a small pinch builds the
// bump's normal press progress (squeeze-logic.js), so every rule of a hold still applies. A ring shows which bump,
// ghost finger pads press on its edges, a squeak rises and tiny buzz pulses quicken; the goo squirts across the
// squeeze. Near a bump two fingers never zoom; far from every bump they zoom as before.
// Customer twists (T8.3, option twist, data/twists.js): 'fidgety' = the whole face slowly sways (a small offset on
// top of the zoom view, so drawing and every press move together and a held press follows its bump; capped so no bump
// leaves the screen or slides under the tool bar); 'ticklish' = a squeeze held on a cheek, the jaw or near the ear
// makes her giggle (the face jerks away, the press drops back and must be made again; onGiggle tells the controller);
// 'sensitive' = cold squeezes give more Ows, each Ow irritates more, and her cheeks start a little red.
import { pressureStep, tapPressure, hitTest, hitDecoy, rng, holdTime, grownRadius, grownHold, growStart } from './logic.js';
import { fullView, screenToScene, sceneToScreen, clampView, zoomAt, panView, pinchView, refitView } from './logic.js';
import { bumpInfo, isImplemented } from '../data/bumps.js';
import {
  START_TOOL, pressOutcome, bestToolFor, effectiveHold, warmStep, inStripArea, onFace, findPatchSpot,
  roughChance, coldPopIrritation, irritationStart, irritationRise, irritationStep, irritationSoothe,
  wipeReach, autoWipeSeconds, padStartSpot, popStepOver, stripBusy, wipeStripPress,
} from './tool-logic.js';
import { toolInfo, IRRITATION } from '../data/tools.js';
import {
  canSqueeze, squeezeCandidate, closeAmount, startDrive, stepDrive, squeezeProgress, squeezeEnd, rememberSqueeze,
  resumes, padSpots, gooDirection, squeakGap, buzzGap,
} from './squeeze-logic.js';
import {
  makeCanvas, drawPimple, drawMark, drawStrand, drawDrop, drawSplat, drawStrip, drawStripDots, drawPad, drawCream,
  drawTweezers, drawFinger, drawCloth, drawPatch, drawOuch, drawHorn, drawHair, hairPoints, drawDecoy,
  gooLook, capList,
} from './art.js';
import { SWAY, TICKLE, SENSITIVE } from '../data/twists.js';
import { swayOffset, swayAmplitude, swayRoom, clampOffset, tickleDue, giggleDrop, giggleBlocks, jerkOffset, ticklishZone } from './twist-logic.js';

const GRID = 8; // mesh cells across the squeezed area
const WIPE_CELL = 10; // px; goo coverage is counted in cells this size
const WIPE_DONE = 0.8; // part of the goo that must be wiped before it counts as clean

/**
 * Smooth 0..1 ramp.
 * @param {number} t input 0..1
 * @returns {number} eased value
 */
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * A bump ready for the scene: its own copy with pressure and animation state, and its hold time from data/bumps.js
 * when the layout did not give one. A growing bump (Evil Horn, B58) gets its start size (logic.js growStart: no growing
 * with reduced motion) and keeps its full hold in holdFull; its hold now follows its size (logic.js grownHold).
 * @param {object} p a bump like those from layoutFace
 * @param {boolean} reduced reduced motion (it appears at once)
 * @returns {object} the scene's bump
 */
const sceneBump = (p, reduced) => {
  const b = { ...p, hold: p.hold ?? holdTime(p.type), pressure: 0, popped: false, appear: reduced ? 1 : 0, wob: 0, wobV: 0, age: 0 };
  if (!b.growFor) return b;
  Object.assign(b, growStart(b, reduced));
  b.holdFull = b.hold;
  b.hold = grownHold(b.holdFull, b.r, b.rMax);
  return b;
};

/**
 * Whether a bump comes out as a horn (the Evil Horn creaks out instead of squirting).
 * @param {object} p the bump
 * @returns {boolean} true for horn bumps
 */
const horned = (p) => bumpInfo(p.type)?.goo === 'horn';

/**
 * Whether a bump is an ingrown hair (a silly long hair slides out while it is held, then flops out).
 * @param {object} p the bump
 * @returns {boolean} true for hair bumps
 */
const haired = (p) => bumpInfo(p.type)?.goo === 'hair';

/**
 * Whether a bump comes out as a plug (a pull, no goo) instead of a squeeze.
 * @param {object} p the bump
 * @returns {boolean} true for tweezer bumps (blackheads)
 */
const pulled = (p) => bumpInfo(p.type)?.needsTool === 'tweezers';

/**
 * Whether a bump is being worked with tweezers (drawn tweezers, no finger dents), not squeezed.
 * @param {object} p the bump
 * @returns {boolean} true when its tool is the tweezers
 */
const tweezed = (p) => toolInfo(p.tool)?.use === 'pull';

/**
 * The affine map that takes three source points to three destination points.
 * @param {number[]} s source x0,y0,x1,y1,x2,y2
 * @param {number[]} d destination x0,y0,x1,y1,x2,y2
 * @returns {number[]|null} [a, b, c, d, e, f] for setTransform, or null when the triangle is flat
 */
function affine(s, d) {
  const [x0, y0, x1, y1, x2, y2] = s;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(den) < 1e-6) return null;
  const a = ((d[2] - d[0]) * (y2 - y0) - (d[4] - d[0]) * (y1 - y0)) / den;
  const c = ((d[4] - d[0]) * (x1 - x0) - (d[2] - d[0]) * (x2 - x0)) / den;
  const b = ((d[3] - d[1]) * (y2 - y0) - (d[5] - d[1]) * (y1 - y0)) / den;
  const dd = ((d[5] - d[1]) * (x1 - x0) - (d[3] - d[1]) * (x2 - x0)) / den;
  return [a, b, c, dd, d[0] - a * x0 - c * y0, d[1] - b * x0 - dd * y0];
}

/**
 * Create a pimple scene on a canvas.
 * @param {HTMLCanvasElement} canvas the canvas (its CSS size should be width x height)
 * @param {{width: number, height: number, dpr?: number, texture: HTMLCanvasElement, pimples: object[], strip?: object|null, decoys?: object[],
 *   reduced?: boolean, sound?: {play: (name: string, o?: object) => void}, buzz?: (p: number|number[]) => void,
 *   onPop?: (p: object, left: number) => void, onStep?: (step: string) => void, onDone?: () => void,
 *   tool?: string, face?: {cx: number, cy: number, rx: number, ry: number}, tools?: string[],
 *   onOw?: (o: {x: number, y: number, type: string, tool: string}) => void, onWarm?: (warmth: number) => void,
 *   onPatch?: (count: number) => void, onNote?: (note: string) => void, onIrritation?: (level: number) => void,
 *   onStripPeeled?: () => void (the nose strip came off, B13 round 2c), onStripStuck?: () => void (the strip was
 *   stuck on during the wipe, B55),
 *   covered?: () => {x: number, y: number, w: number, h: number}[] (boxes of controls over the scene; the wipe pad
 *   waits clear of them),
 *   onView?: (view: {z: number, x: number, y: number}) => void (the zoom view changed, T1.4),
 *   irritation?: {rise: number, drain: number} (how touchy the customer is, T3.1b; 1 and 1 = normal),
 *   squeeze?: boolean (two fingers round a bump squeeze it, T1.7; off = two fingers always zoom),
 *   twist?: string|null (the customer's twist, T8.3: 'fidgety', 'ticklish' or 'sensitive'; anything else = none),
 *   onGiggle?: (at: {x: number, y: number}) => void (the ticklish customer giggled at this bump, scene px),
 *   refuse?: (p: object) => void (the husband in armor, ch 2: the first pop is NOT done, popping stops and this is told which bump),
 *   random?: () => number}} o options; onIrritation = the irritation meter changed (T1.2b), random = for the rough-press roll; tool = the tool in hand at the
 *   start, face = the skin oval (the warm cloth only works on it), tools = the usable tools (for the keyboard),
 *   onOw = a wrong-tool press, onWarm = the warm meter changed, onPatch = a patch went on, onNote = a press did nothing
 *   useful ('patchFirst' = a patch on a bump that is not popped yet)
 * @returns {object} add(pimples), left(), all(), step(), setTexture(tex), resize(w, h, tex, move), size(), keyPress(),
 *   setTool(id), tool(), setTools(ids), warmth(), irritation(), halt(), dispose(). A bump may carry hold (seconds) and
 *   roughMul (part of the rough-press chance left after mastery, round-logic.js applyMastery).
 */
export function createPopScene(canvas, o) {
  let w = o.width; // changed only by resize()
  let h = o.height;
  const dpr = o.dpr ?? Math.min(2, globalThis.devicePixelRatio || 1);
  const reduced = Boolean(o.reduced);
  /** Size factor for goo, pad and tools at a scene size. @param {number} sw width @param {number} sh height @returns {number} factor */
  const sizeFactor = (sw, sh) => Math.max(0.6, Math.min(1.6, Math.min(sw, sh) / 260));
  let scale = sizeFactor(w, h);
  const rand = rng(Math.round(w * 13 + h * 7 + o.pimples.length));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  let texture = o.texture;
  let raf = 0;
  let last = 0;
  let time = 0;
  let disposed = false;
  let step = 'pop'; // pop (pimples and strip, any order) | wipe | cream | done
  const pimples = o.pimples.filter((p) => isImplemented(p.type)).map((p) => sceneBump(p, reduced)); // unbuilt kinds are skipped
  // The nose strip: tiny dots on the nose until the strip is stuck on (nose strip tool), then peeled off.
  const strip = o.strip ? { ...o.strip, q: 0, lift: 0, off: false, flying: false, stuck: false } : null;
  // Decoys (T1.3b): moles, freckles and beauty marks on the skin. They never pop and never count as left; pressing
  // one with a squeezing, pulling or strip tool is an Ow. They stay on the face to the end.
  const decoys = (o.decoys ?? []).map((d) => ({ ...d, dots: d.dots ?? [] }));
  let tool = toolInfo(o.tool)?.implemented ? o.tool : START_TOOL; // the tool in hand
  let usable = Array.isArray(o.tools) ? o.tools : null; // tools the keyboard may pick (setTools changes it)
  const face = o.face ? { cx: o.face.cx, cy: o.face.cy, rx: o.face.rx, ry: o.face.ry } : null; // the skin oval
  let warmth = 0; // the warm meter, 0..1
  let warmSent = 0; // the warmth last told to onWarm
  let warmHold = null; // {id, x, y} the warm cloth held on the face
  let irr = irritationStart(); // the irritation meter (T1.2b): Ows and cold pops fill it, it calms by itself
  // How touchy this customer is (T3.1b, round-logic.js irritationScales): rises are multiplied by rise, calming by drain.
  // cold = the rise of a cold pop (D27c: softer than an Ow's on hard customers; left out = the same as rise).
  const irrScale = { rise: o.irritation?.rise > 0 ? o.irritation.rise : 1, drain: o.irritation?.drain > 0 ? o.irritation.drain : 1 };
  irrScale.cold = o.irritation?.cold > 0 ? o.irritation.cold : irrScale.rise;
  irrScale.calm = Number.isFinite(o.irritation?.calm) && o.irritation.calm >= 0 ? o.irritation.calm : undefined; // seconds before it calms (D27c)
  let irrSent = 0; // the level last told to onIrritation
  let halted = false; // true after halt(): the customer stormed off, presses do nothing
  const roll = typeof o.random === 'function' ? o.random : Math.random; // the rough-press dice
  const patches = []; // patches stuck on popped spots
  const marks = []; // pink spots where pimples were (healed by the cream)
  const strands = []; // goo worms
  const drops = []; // goo drops in the air
  const blobs = []; // goo drops that landed
  const splats = []; // goo on the lens
  const tweezers = []; // tweezers pulling a blackhead out
  const horns = []; // Evil Horns flying off after they creaked out
  const hairs = []; // ingrown hairs flopping away after they came out
  let quake = -1; // time the last horn came out (the picture wobbles for a moment); -1 = none
  let quakeK = 1; // how hard that wobble is (1 = horn, smaller for a hair)
  let hold = null; // {p, id, since} the pimple being squeezed
  let peel = null; // {id, x0, q0} the strip being peeled
  let wipe = null; // {dirt, cells, dirty, clean, pad, auto, fading}
  let cream = null; // {dollops, t}
  let keyHold = null; // {p, until} a key press squeezing
  const warnedThresholds = new Set();
  let lastWipeSound = -1;
  // Customer twists (T8.3). off = the twist's screen px offset now (sway plus a giggle's jerk), swayK = how much of
  // the sway is on (fades in at the start, out after the pops), room = how far the face may move (twist-logic.js
  // swayRoom; worked out again on every pop and resize), giggleAt = the time of the last giggle.
  const twist = ['fidgety', 'ticklish', 'sensitive'].includes(o.twist) ? o.twist : null;
  let off = { x: 0, y: 0 };
  let swayK = 0;
  let room = 0;
  let giggleAt = -Infinity;
  let jerk = null; // {x, y}: the way the face jerks after a giggle (away from the pressed bump)
  const skin = twist === 'sensitive' ? SENSITIVE.roughScale : 1; // delicate skin: more rough presses when cold

  // Idle life (T8.1): the face picture carries a plan for blinks and glances (face.js makeFaceLife, texture.faceLife),
  // drawn over the picture each frame; while nothing else moves, a timer wakes the loop for the next blink or glance.
  // The whole canvas breathes: a slow 1 to 2 px sway done by the browser (no redraws). None of it with reduced motion.
  let lifeTimer = 0;
  let breathing = null;
  try {
    const b = reduced ? null : o.texture?.faceLife?.breath;
    if (b && typeof canvas.animate === 'function') {
      breathing = canvas.animate([
        { translate: '0 0', easing: 'ease-in-out' }, { translate: `0 ${-b.px}px`, easing: 'ease-in-out' }, { translate: '0 0' },
      ], { duration: b.period * 1000, iterations: Infinity });
    }
  } catch { breathing = null; } // an old browser without this: the face keeps still

  /** The face picture's idle life, or null (reduced motion, after a storm-off, or a picture without one). @returns {object|null} life */
  const faceLife = () => (reduced || halted ? null : texture?.faceLife ?? null);
  /** Wall-clock seconds for the idle life (the loop's own time stands still while it sleeps). @returns {number} seconds */
  const lifeNow = () => performance.now() / 1000;

  /**
   * While nothing else moves, wake the drawing loop when the face's next blink or glance starts. While the page or
   * the scene is hidden it only looks again now and then (no drawing).
   * @returns {void}
   */
  function planLife() {
    clearTimeout(lifeTimer);
    lifeTimer = 0;
    const life = faceLife();
    if (!life || disposed) return;
    const wait = life.next(lifeNow());
    if (!Number.isFinite(wait)) return;
    lifeTimer = setTimeout(() => {
      lifeTimer = 0;
      if (disposed) return;
      const hidden = globalThis.document?.hidden || (typeof canvas.getClientRects === 'function' && canvas.getClientRects().length === 0);
      if (hidden) { lifeTimer = setTimeout(planLife, 1000); return; }
      kick();
    }, Math.max(30, Math.min(30000, wait * 1000)));
  }

  /**
   * Play a sound through the scene's sound player (if any).
   * @param {string} name sound name
   * @param {object} [opt] options
   * @returns {void}
   */
  const play = (name, opt) => { try { o.sound?.play(name, opt); } catch { /* sound is optional */ } };

  /**
   * A short buzz on phones that can.
   * @param {number|number[]} pattern milliseconds
   * @returns {void}
   */
  const buzz = (pattern) => { try { o.buzz?.(pattern); } catch { /* not allowed */ } };

  /**
   * Work out how far the face may sway (T8.3): the room the bumps still to pop leave to the screen edges and to the
   * control boxes over the scene (twist-logic.js swayRoom), at the whole-face view. Only with a twist.
   * @returns {void}
   */
  function measureRoom() {
    if (!twist) return;
    let covered = [];
    try { covered = o.covered?.() ?? []; } catch { covered = []; }
    room = swayRoom(pimples.filter((p) => !p.popped).map((p) => ({ x: p.x, y: p.y, r: p.r })), w, h, covered);
  }

  /**
   * One step of the twist rules (T8.3): the fidgety sway fades in while popping and wiping and out after; a ticklish
   * customer giggles when a squeeze is held too long on a ticklish spot; then the twist offset (sway plus a giggle's
   * jerk) for this frame, never longer than the room.
   * @param {number} dt seconds since the last frame
   * @returns {boolean} true while the face is moving (the drawing loop keeps running)
   */
  function twistStep(dt) {
    if (!twist) return false;
    if (twist === 'fidgety') {
      const target = !halted && (step === 'pop' || step === 'wipe') ? 1 : 0;
      swayK = target > swayK ? Math.min(1, swayK + dt * SWAY.ease) : Math.max(0, swayK - dt * SWAY.ease);
    }
    if (twist === 'ticklish' && step === 'pop' && !halted) {
      const held = hold ? { p: hold.p, since: hold.since } : squeeze ? { p: squeeze.p, since: squeeze.since ?? time } : null;
      const due = held && !held.p.popped && tickleDue(time - held.since, held.p.zone, time - giggleAt);
      // B74: a squeeze that pops in this very frame pops; she does not giggle first (a plain whitehead's 1.1 s squeeze
      // is exactly the giggle time, so on a cheek it always giggled away at the last moment and needed a second press).
      const popsNow = due && pressureStep(held.p.pressure, dt, true, effectiveHold(held.p.hold, held.p.tool ?? START_TOOL, held.p.type, warmth)) >= 1;
      if (due && !popsNow) giggle(held.p);
    }
    const rx = face ? face.rx : Math.min(w, h) / 3;
    let next = swayOffset(time, swayAmplitude(rx, room, reduced) * swayK);
    if (jerk && !reduced) {
      const j = jerkOffset(time - giggleAt, jerk, Math.min(SWAY.maxPx * 1.5, rx * TICKLE.jerkShare));
      next = { x: next.x + j.x, y: next.y + j.y };
    }
    next = clampOffset(next, room);
    const moved = next.x !== off.x || next.y !== off.y;
    off = next;
    return swayK > 0 || moved || giggleBlocks(time, giggleAt);
  }

  /**
   * Whether a press is only the same squeeze carried on (B73): on a ticklish customer, a new press on a ticklish spot
   * whose bump still has press progress (she giggled it away, or the player made the short squeezes the hint asks for)
   * is not a fresh rough-press roll. Before, every forced re-press rolled again, so a cold Evil Horn or big bump on a
   * cheek collected Ow after Ow and could never be popped by a careful player.
   * @param {object} p the bump pressed
   * @returns {boolean} true = no new rough-press roll
   */
  function pressAgain(p) {
    return twist === 'ticklish' && ticklishZone(p.zone) && p.pressure >= 0.05;
  }

  /**
   * The ticklish customer giggles (T8.3): the press on this bump lets go and drops back (TICKLE.dropBack), the face
   * jerks away from the finger (not with reduced motion: then it is only the short pause), a giggle sound and buzz, a
   * small irritation nudge, and the controller shows its "Hehehe!" pop-up (onGiggle).
   * @param {object} p the bump that was held
   * @returns {void}
   */
  function giggle(p) {
    giggleAt = time;
    p.pressure = giggleDrop(p.pressure);
    if (hold?.p === p) hold = null;
    if (squeeze?.p === p) endSqueeze(); // the fingers then do nothing more until lifted
    else springBack(p);
    const cx = face ? face.cx : w / 2;
    const cy = face ? face.cy : h / 2;
    jerk = { x: (cx - p.x) || 1, y: (cy - p.y) * 0.5 }; // she pulls away from the finger
    raiseIrritation(TICKLE.irritation);
    play('giggle');
    buzz([10, 30, 10]);
    try { o.onGiggle?.({ x: p.x, y: p.y }); } catch (e) { console.warn('onGiggle failed:', e); }
    kick();
  }

  /** Start the drawing loop if it is not running. @returns {void} */
  function kick() {
    if (lifeTimer) { clearTimeout(lifeTimer); lifeTimer = 0; }
    if (raf || disposed) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // Zoom and pan (T1.4). The view {z, x, y} (logic.js) says which part of the scene the canvas shows; it starts at
  // the whole face and a new face (a new scene) starts there again. All input goes through screenToScene and all
  // drawing (goo too) through viewMatrix, so bumps, decoys, the strip and every tool stay right at any zoom.
  let view = fullView();
  const touches = new Map(); // pointerId -> {x, y}: every finger on the canvas now, in screen px
  let pinch = null; // {a, b, a0, b0, start}: two fingers zooming and panning
  let pending = null; // {ev, timer}: a first finger waiting PINCH_WAIT_MS to see whether a second one follows
  let mousePan = null; // {id, x, y}: a mouse dragging the zoomed view from a spot where the press did nothing
  // Two-finger squeeze (T1.7, squeeze-logic.js). Only with o.squeeze on and fingers in hand.
  const squeezeOn = Boolean(o.squeeze);
  let memory = null; // {bump, level, until}: a squeezing finger lifted a moment ago; putting it down again carries on
  let squeeze = null; // {a, b, p, d0, drive, nextSqueak, nextBuzz, last}: two fingers squeezing bump p
  let stale = false; // a squeeze ended with fingers still down: they do nothing more until all are lifted

  /**
   * Turn a pointer event into screen px on the canvas (CSS px from its top left, before the view).
   * @param {PointerEvent} e the event
   * @returns {{x: number, y: number}} the point
   */
  function screenPt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * w) / (r.width || w), y: ((e.clientY - r.top) * h) / (r.height || h) };
  }

  /**
   * Turn a pointer event into scene coordinates (through the zoom view).
   * @param {PointerEvent} e the event
   * @returns {{x: number, y: number}} the point
   */
  function local(e) {
    const s = screenPt(e);
    return screenToScene(shown(), s.x, s.y);
  }

  /**
   * The view as it is drawn and touched: the zoom view moved by the twist offset (the fidgety sway and a ticklish
   * jerk, T8.3; screen px, so the face moves the same few px at any zoom). Without a twist it is the zoom view itself.
   * @returns {{z: number, x: number, y: number}} the view
   */
  function shown() {
    if (!off.x && !off.y) return view;
    return { z: view.z, x: view.x - off.x / view.z, y: view.y - off.y / view.z };
  }

  /** The drawing transform for the view: scene px to device px. @returns {number[]} [a, b, c, d, e, f] for setTransform */
  function viewMatrix() {
    const v = shown();
    const k = dpr * v.z;
    return [k, 0, 0, k, -v.x * k, -v.y * k];
  }

  /**
   * Use a new view (already checked by logic.js), tell the page and redraw.
   * @param {{z: number, x: number, y: number}} next the view
   * @returns {void}
   */
  function setView(next) {
    if (next.z === view.z && next.x === view.x && next.y === view.y) return;
    view = next;
    try { o.onView?.({ ...view }); } catch { /* the page's own problem */ }
    kick();
  }

  /**
   * How far a point of skin moves while a pimple is squeezed: pushed in by the two fingers, bulging out at the middle.
   * @param {object} p the pimple
   * @param {number} a squeeze amount (pressure plus wobble)
   * @param {number} x skin x
   * @param {number} y skin y
   * @returns {number[]} [dx, dy]
   */
  function displace(p, a, x, y) {
    const R = p.r * 4.4;
    const vx = x - p.x;
    const vy = y - p.y;
    const d = Math.hypot(vx, vy);
    const fall = smooth(1 - d / R);
    if (fall <= 0) return [0, 0];
    const ax = Math.cos(p.axis);
    const ay = Math.sin(p.axis);
    const bulge = 0.6 * a * Math.exp(-((d / (p.r * 1.7)) ** 2));
    let dx = vx * bulge;
    let dy = vy * bulge;
    const reach = (p.sqReach ?? p.r * 1.9) * (1 - 0.2 * Math.max(0, a)); // a two-finger squeeze dents where the fingers are
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * reach;
      const fy = p.y + ay * side * reach;
      const k = -side * p.r * 1.0 * a * Math.exp(-((Math.hypot(x - fx, y - fy) / (p.r * 1.1)) ** 2));
      dx += ax * k;
      dy += ay * k;
    }
    return [dx * fall, dy * fall];
  }

  /**
   * Draw the skin around a squeezed pimple stretched by the fingers (a small triangle mesh of the skin picture).
   * @param {object} p the pimple
   * @param {number} a squeeze amount
   * @param {boolean} fingers draw the fingers and folds (not during the jiggle after a pop)
   * @returns {void}
   */
  function drawWarp(p, a, fingers) {
    const R = p.r * 4.4;
    const n = GRID;
    const pts = [];
    const x0 = p.x - R;
    const y0 = p.y - R;
    const cell = (R * 2) / n;
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) {
        const sx = x0 + i * cell;
        const sy = y0 + j * cell;
        const [dx, dy] = displace(p, a, sx, sy);
        pts.push([sx, sy, sx + dx, sy + dy]);
      }
    }
    /**
     * Copy one triangle of skin from where it was to where it is pushed.
     * @param {number[]} A vertex
     * @param {number[]} B vertex
     * @param {number[]} C vertex
     * @returns {void}
     */
    const tri = (A, B, C) => {
      const m = affine([A[0] * dpr, A[1] * dpr, B[0] * dpr, B[1] * dpr, C[0] * dpr, C[1] * dpr], [A[2], A[3], B[2], B[3], C[2], C[3]]);
      if (!m) return;
      const cx = (A[2] + B[2] + C[2]) / 3;
      const cy = (A[3] + B[3] + C[3]) / 3;
      ctx.save();
      ctx.beginPath();
      for (const [k, V] of [A, B, C].entries()) { // grown by half a pixel so no seams show between triangles
        const ex = V[2] + Math.sign(V[2] - cx) * 0.6;
        const ey = V[3] + Math.sign(V[3] - cy) * 0.6;
        if (k === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(...viewMatrix()); // the zoom view (T1.4), then the triangle's own copy transform
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      const sx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]) * dpr) - 2);
      const sy = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]) * dpr) - 2);
      const ex = Math.min(texture.width, Math.ceil(Math.max(A[0], B[0], C[0]) * dpr) + 2);
      const ey = Math.min(texture.height, Math.ceil(Math.max(A[1], B[1], C[1]) * dpr) + 2);
      if (ex > sx && ey > sy) ctx.drawImage(texture, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
      ctx.restore();
    };
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const A = pts[j * (n + 1) + i];
        const B = pts[j * (n + 1) + i + 1];
        const C = pts[(j + 1) * (n + 1) + i];
        const D = pts[(j + 1) * (n + 1) + i + 1];
        tri(A, B, D);
        tri(A, D, C);
      }
    }
    if (a <= 0.04 || !fingers) return;
    // Finger dents (soft shadows), fingertips pressing, and the stretched shine in the middle.
    const ax = Math.cos(p.axis);
    const ay = Math.sin(p.axis);
    const reach = (p.sqReach ?? p.r * 1.9) * (1 - 0.2 * a);
    const k = Math.min(1, a);
    // Bunched-up skin between the fingers and the pimple: a dark fold with a light ridge on each side.
    for (const side of [-1, 1]) {
      const base = p.axis + (side < 0 ? Math.PI : 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(130,55,40,${0.32 * k})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.3 + 0.2 * k), base - 0.7, base + 0.7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,232,218,${0.45 * k})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.42 + 0.2 * k), base - 0.6, base + 0.6); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * reach;
      const fy = p.y + ay * side * reach;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, p.r * 1.5);
      g.addColorStop(0, `rgba(120,50,36,${0.3 * Math.min(1, a)})`);
      g.addColorStop(1, 'rgba(120,50,36,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, p.r * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Two fingertips pressing in from both sides (drawn after the dents so they sit on top). A two-finger squeeze
    // shows ghost pads at the real fingers instead (drawGhostPads).
    for (const side of p.sqReach ? [] : [-1, 1]) {
      const fx = p.x + ax * side * (reach + p.r * 0.1);
      const fy = p.y + ay * side * (reach + p.r * 0.1);
      drawFinger(ctx, fx, fy, p.axis + (side < 0 ? Math.PI : 0), Math.max(18, p.r * 1.7), Math.min(1, a * 3));
      if (p.tool === 'cottonPad') { // a cotton pad wrapped round each fingertip
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 3);
        drawPad(ctx, fx, fy, Math.max(10, p.r * 0.75));
        ctx.restore();
      }
    }
    const shine = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    shine.addColorStop(0, `rgba(255,236,228,${(p.sqReach ? 0.36 : 0.22) * Math.min(1, a)})`); // a squeeze shines more
    shine.addColorStop(1, 'rgba(255,236,228,0)');
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * The squeeze direction that keeps both fingers on the picture best (near an edge they come from inside).
   * @param {object} p the pimple
   * @returns {number} the angle in radians
   */
  function fingerAxis(p) {
    let best = p.axis;
    let bestRoom = -Infinity;
    for (const a of [p.axis, 0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      let room = Infinity;
      for (const side of [-1, 1]) {
        const fx = p.x + Math.cos(a) * side * p.r * 3;
        const fy = p.y + Math.sin(a) * side * p.r * 3;
        room = Math.min(room, fx, fy, w - fx, h - fy);
      }
      if (room > bestRoom + 4) { best = a; bestRoom = room; }
    }
    return best;
  }

  // Caps on live goo so a pop-pop-pop chain never drops frames (T1.6): the oldest go first.
  const MAX_STRANDS = 12; // goo worms (one face makes about 10)
  const MAX_DROPS = 40; // drops in the air
  const MAX_BLOBS = 80; // landed drops
  const MAX_SPLATS = 6; // splats on the lens (a super zit may raise this for its own splash)

  /**
   * Squirt the goo out of a pimple that just popped.
   * @param {object} p the pimple
   * @returns {void}
   */
  function squirt(p) {
    const info = bumpInfo(p.type);
    const goo = info?.goo === 'gold' || info?.goo === 'cream' || info?.goo === 'horn' ? info.goo : 'white';
    const gold = goo === 'gold';
    const look = gooLook(goo);
    const big = p.type === 'big';
    const count = big ? 2 : 1;
    const aimed = Number.isFinite(p.gooDir); // a two-finger squeeze aims the goo across the squeeze (T1.7)
    for (let i = 0; i < count; i += 1) {
      const ang = aimed ? p.gooDir + (i ? Math.PI : 0) + (rand() - 0.5) * 0.7 : -Math.PI / 2 + (rand() - 0.5) * 2.6;
      const max = p.r * look.reach * (big ? 2.6 + rand() * 1.8 : 2 + rand() * 1.4);
      strands.push({
        x: p.x, y: p.y, ang, curl: (rand() - 0.5) * 0.05 / scale, sag: (0.006 + rand() * 0.008) * look.sag, len: 0, max,
        speed: (max / (big ? 0.55 : 0.35)) * look.speed, w: p.r * (big ? 0.3 : 0.42) * look.width, gold, goo, pts: [],
      });
    }
    capList(strands, MAX_STRANDS);
    const n = info?.drops ?? 4;
    for (let i = 0; i < n; i += 1) {
      const a = aimed ? p.gooDir + (rand() - 0.5) * 1.5 + (rand() < 0.25 ? Math.PI : 0) : rand() * Math.PI * 2;
      const v = (30 + rand() * 110) * scale * look.speed * (aimed ? 1.25 : 1);
      drops.push({ x: p.x, y: p.y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (120 + rand() * 160) / Math.sqrt(look.width), r: (1.2 + rand() * (big ? 3 : 2)) * scale * Math.sqrt(look.width), gold, goo });
    }
    capList(drops, MAX_DROPS);
    if (big && !reduced) {
      const at = sceneToScreen(shown(), p.x, p.y); // the lens is in front of the zoom: splats live in screen px
      splashLens(at.x, at.y, goo, 1);
    }
  }

  /**
   * Splash goo onto the "lens" (screen space, in front of the zoom), around a screen point.
   * @param {number} x screen x (CSS px of the canvas)
   * @param {number} y screen y
   * @param {string} goo the goo kind (colour)
   * @param {number} power the amount: 1 = a normal big pimple (2 or 3 splats, about 3 drips each). A later super zit
   *   can call this with a big power (say 4 to 8) for a whole-screen splash with many long drips.
   * @returns {void}
   */
  function splashLens(x, y, goo, power = 1) {
    const look = gooLook(goo);
    const k = Math.round((2 + rand()) * Math.max(1, power));
    const spread = Math.min(1, 0.7 * power);
    for (let i = 0; i < k; i += 1) {
      splats.push({
        x: Math.max(30, Math.min(w - 30, x + (rand() - 0.5) * w * spread)),
        y: Math.max(30, Math.min(h * 0.7, y + (rand() - 0.6) * h * 0.6 * spread)),
        r: (14 + rand() * 12) * scale, size: Math.sqrt(power), drips: Math.round((2 + rand() * 2) * look.drip * power),
        drip: 0, a: 1, born: time + i * 0.06, seed: Math.round(rand() * 1e6), goo, gold: goo === 'gold',
      });
    }
    capList(splats, Math.max(MAX_SPLATS, k));
  }

  /**
   * Stop all popping at once: let go of every press and ignore new ones (a storm-off, or the armor's refusal).
   * @returns {void}
   */
  function haltAll() {
    halted = true;
    hold = null;
    keyHold = null;
    resetSqueeze();
    forget();
    warmHold = null;
    for (const p of pimples) if (!p.popped) p.pressure = 0;
    kick();
  }

  /**
   * Pop a pimple: goo (or the tweezers pull a blackhead), sound, buzz, wobble, and a pink mark left behind.
   * @param {object} p the pimple
   * @returns {void}
   */
  function pop(p) {
    if (typeof o.refuse === 'function' && !halted) { // the husband in armor (ch 2): the first pop is refused and popping stops
      haltAll();
      try { o.refuse(p); } catch (e) { console.warn('refuse failed:', e); }
      return;
    }
    if (squeeze?.p === p) { p.gooDir = gooDirection(p.axis); endSqueeze(); } // squeezed out: the goo squirts across
    if (keyHold?.p !== p) { // a pop by pointer: a cold bump irritates the skin; the cotton pad soothes (the keyboard is gentle)
      // B72: the pop that clears the face stops the meter just under full, so a customer whose every bump is out
      // never storms off in that same moment (that counted as a fail with no pay, even with no Ow at all).
      const last = pimples.every((q) => q === p || q.popped);
      raiseIrritation(coldPopIrritation(p.tool ?? START_TOOL, p.type, warmth) * (p.roughMul ?? 1), last, irrScale.cold);
      if (p.tool === 'cottonPad') irr = irritationSoothe(irr, 'pad');
    }
    p.popped = true;
    p.pressure = 0;
    if (hold?.p === p) hold = null;
    if (keyHold?.p === p) keyHold = null;
    if (haired(p)) { // the long hair flops out with a twangy pluck and a small wobble (no goo; the pink mark stays)
      hairs.push({ x: p.x, y: p.y, dir: hairDir(p), reach: hairReach(p, 1), t: 0, spin: rand() < 0.5 ? -1 : 1 });
      play('pluck');
      buzz(16);
      if (!reduced) { quake = time; quakeK = 0.35; }
    } else if (pulled(p)) { // the plug comes out (held in tweezers, or popped out by fingers)
      tweezers.push({ x: p.x, y: p.y, t: 0, r: p.r, withTweezers: tweezed(p) });
      play('tweeze');
      buzz(14);
    } else if (horned(p)) { // the Evil Horn creaks out, flies off with a dab of pale goo, and the picture wobbles
      horns.push({ x: p.x, y: p.y, r: p.r * 1.65, t: 0, spin: rand() < 0.5 ? -1 : 1 });
      squirt(p);
      play('creak');
      buzz([18, 30, 18, 30, 40]);
      if (!reduced) { quake = time; quakeK = 1; }
    } else {
      squirt(p);
      play(p.type === 'big' ? 'pop_big' : p.type === 'gold' ? 'pop_gold' : 'pop_small');
      buzz(p.type === 'big' ? [30, 40, 50] : 24);
    }
    marks.push({ x: p.x, y: p.y, r: p.r * (pulled(p) ? 0.9 : 1.1), patched: false });
    if (!reduced) { p.wob = tweezed(p) ? 0 : 0.55; p.wobV = 0; }
    measureRoom(); // one bump fewer: the sway may have more room (T8.3)
    const left = pimples.filter((q) => !q.popped).length;
    try { o.onPop?.(p, left); } catch (e) { console.warn('onPop failed:', e); }
    maybeNextStep();
    kick();
  }

  /**
   * After the last pimple: start wiping (or straight to the cream when there is no goo). The nose strip is optional
   * (tool-logic.js popStepOver): an unpeeled strip never holds the round up; only a peel in progress is waited for.
   * The strip stays on and usable through the wipe; it only comes away at the cream (B55, beginCream).
   * @returns {void}
   */
  function maybeNextStep() {
    if (step !== 'pop') return;
    if (!popStepOver(pimples, strip, Boolean(peel))) return;
    // Wait until the goo has landed (and a peel in progress is done), then start the wipe.
    const start = () => {
      if (disposed || step !== 'pop') return;
      if (drops.length || strands.some((s) => s.len < s.max) || tweezers.length || horns.length || hairs.length || !popStepOver(pimples, strip, Boolean(peel))) { setTimeout(start, 120); return; }
      beginWipe();
    };
    setTimeout(start, reduced ? 200 : 450);
  }

  /**
   * Change the step and tell the controller.
   * @param {string} s the new step
   * @returns {void}
   */
  function setStep(s) {
    step = s;
    try { o.onStep?.(s); } catch (e) { console.warn('onStep failed:', e); }
    kick();
  }

  /** Put all the goo on its own layer so the pad can wipe it off; count how much there is. @returns {void} */
  function beginWipe() {
    if (!strands.length && !blobs.length) { beginCream(); return; }
    const { canvas: dirt, ctx: dc } = makeCanvas(w, h, dpr);
    for (const s of strands) drawStrand(dc, s);
    for (const b of blobs) drawDrop(dc, b);
    let found = scanGoo(dirt, dc);
    // No pixel access, or a blank picture back (some privacy settings do that; B71: the goo then counted as 0 cells and
    // the wipe could never reach WIPE_DONE, so the round stuck in the wipe): count the goo by its positions instead.
    if (!found || found.count === 0) {
      const cols = Math.ceil(w / WIPE_CELL);
      const cells = new Uint8Array(cols * Math.ceil(h / WIPE_CELL));
      let count = 0;
      for (const s of [...strands.flatMap((st) => st.pts), ...blobs]) {
        if (!(s.x >= 0 && s.x < w && s.y >= 0 && s.y < h)) continue; // goo that flew off the scene cannot be wiped
        const i = Math.floor(s.y / WIPE_CELL) * cols + Math.floor(s.x / WIPE_CELL);
        if (cells[i] === 0) { cells[i] = 1; count += 1; }
      }
      found = { cells, cols, rows: Math.ceil(h / WIPE_CELL), count };
    }
    strands.length = 0;
    blobs.length = 0;
    const { cells, cols, rows, count } = found;
    const corner = 40 * scale * wipeReach(tool); // the pad waits in the bottom corner (further in when it is the big one)
    let covered = [];
    try { covered = o.covered?.() ?? []; } catch (e) { console.warn('covered failed:', e); }
    // ...but never behind the tool bar or other buttons (B13 round 2c); the boxes are screen px, so it is found in screen px (B43a).
    const pad = padStartSpot(shown(), w, h, 26 * scale * wipeReach(tool), corner, covered);
    // No goo cell on the scene at all (it all flew off): nothing to wipe, the wipe fades out by itself (B71).
    wipe = { dirt, dc, cells, cols, rows, dirty: Math.max(1, count), clean: 0, pad, last: null, id: null, auto: null, fade: count === 0 ? 0.0001 : 0 };
    setStep('wipe');
  }

  /**
   * Which cells of the goo layer still have goo on them (cells WIPE_CELL px wide).
   * @param {HTMLCanvasElement} dirt the goo layer (scene size times dpr)
   * @param {CanvasRenderingContext2D} dc its context
   * @returns {{cells: Uint8Array, cols: number, rows: number, count: number}|null} 1 = goo in that cell; null = no pixel access
   */
  function scanGoo(dirt, dc) {
    const cols = Math.ceil(w / WIPE_CELL);
    const rows = Math.ceil(h / WIPE_CELL);
    const cells = new Uint8Array(cols * rows); // 1 = goo here, 2 = wiped
    let count = 0;
    try {
      const data = dc.getImageData(0, 0, dirt.width, dirt.height).data;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          let found = false;
          for (let yy = r * WIPE_CELL; yy < Math.min(h, (r + 1) * WIPE_CELL) && !found; yy += 3) {
            for (let xx = c * WIPE_CELL; xx < Math.min(w, (c + 1) * WIPE_CELL); xx += 3) {
              if (data[(Math.floor(yy * dpr) * dirt.width + Math.floor(xx * dpr)) * 4 + 3] > 40) { found = true; break; }
            }
          }
          if (found) { cells[r * cols + c] = 1; count += 1; }
        }
      }
    } catch {
      return null;
    }
    return { cells, cols, rows, count };
  }

  /**
   * The scene got a new size (window resized, phone turned): move and scale everything so each bump, mark, bit of
   * goo and the strip keep their places on the face. Nothing is made new: popped bumps stay popped.
   * @param {number} width new width in CSS px
   * @param {number} height new height in CSS px
   * @param {HTMLCanvasElement} tex the face picture for the new size
   * @param {{s: number, tx: number, ty: number}} m the move (logic.js faceMap): x' = x * s + tx, y' = y * s + ty, r' = r * s
   * @returns {void}
   */
  function resize(width, height, tex, m) {
    const { s, tx, ty } = m;
    /** Move a thing that has x and y (and optionally a size field). @param {object} p the thing @param {string[]} [sizes] fields to scale @returns {void} */
    const mv = (p, sizes = ['r']) => {
      p.x = p.x * s + tx;
      p.y = p.y * s + ty;
      for (const k of sizes) if (typeof p[k] === 'number') p[k] *= s;
    };
    const oldW = w;
    const oldH = h;
    w = width;
    h = height;
    scale = sizeFactor(w, h);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    texture = tex;
    for (const p of pimples) mv(p, ['r', 'r0', 'rMax']);
    for (const k of marks) mv(k);
    for (const hn of horns) mv(hn);
    for (const hr of hairs) mv(hr, ['reach']);
    for (const pa of patches) mv(pa);
    for (const d of decoys) mv(d);
    if (face) Object.assign(face, { cx: face.cx * s + tx, cy: face.cy * s + ty, rx: face.rx * s, ry: face.ry * s });
    setView(refitView(view, oldW, oldH, m, w, h, face)); // keep the zoom on the same spot of the face (T1.4)
    if (pinch) pinch = null; // a pinch across a turn starts over
    if (squeeze) { resetSqueeze(); stale = touches.size > 0; } // so does a squeeze (it springs back)
    forget();
    if (warmHold) mv(warmHold, []);
    for (const st of strands) {
      mv(st, ['len', 'max', 'speed', 'w']);
      st.curl /= s; // the same bend over the longer or shorter worm
      st.sag /= s;
      for (const pt of st.pts) mv(pt, []);
    }
    for (const d of drops) mv(d, ['vx', 'vy', 'r']);
    for (const b of blobs) mv(b);
    for (const sp of splats) mv(sp, ['r', 'drip']);
    for (const tw of tweezers) mv(tw);
    if (strip) {
      mv(strip, ['w', 'h']);
      for (const d of strip.dots) mv(d, []);
    }
    if (peel) peel.x0 = peel.x0 * s + tx;
    if (cream) for (const d of cream.dollops) mv(d);
    measureRoom(); // the sway's room on the new size (T8.3)
    if (wipe) {
      // Redraw the goo layer at the new size and count again what is left; keep the share already wiped.
      const { canvas: dirt, ctx: dc } = makeCanvas(w, h, dpr);
      dc.save();
      dc.translate(tx, ty);
      dc.scale(s, s);
      dc.drawImage(wipe.dirt, 0, 0, oldW, oldH);
      dc.restore();
      const done = Math.min(0.99, wipe.clean / wipe.dirty);
      const found = scanGoo(dirt, dc) ?? { cells: new Uint8Array(Math.ceil(w / WIPE_CELL) * Math.ceil(h / WIPE_CELL)), cols: Math.ceil(w / WIPE_CELL), rows: Math.ceil(h / WIPE_CELL), count: 0 };
      const dirty = Math.max(1, Math.round(found.count / (1 - done)));
      Object.assign(wipe, { dirt, dc, cells: found.cells, cols: found.cols, rows: found.rows, dirty, clean: dirty - found.count, last: null });
      mv(wipe.pad, []);
      if (found.count === 0 && !wipe.fade) wipe.fade = 0.0001;
    }
    render();
    kick();
  }

  /**
   * Wipe the goo where the pad is.
   * @param {number} x pad x
   * @param {number} y pad y
   * @returns {void}
   */
  function wipeAt(x, y) {
    if (!wipe || wipe.fade) return;
    const r = 30 * scale * wipeReach(tool); // the cotton pad in hand wipes a wider path (B13 round 2b)
    const from = wipe.last ?? { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const steps = Math.max(1, Math.ceil(dist / 4));
    wipe.dc.save();
    wipe.dc.globalCompositeOperation = 'destination-out';
    for (let i = 1; i <= steps; i += 1) {
      const px = from.x + ((x - from.x) * i) / steps;
      const py = from.y + ((y - from.y) * i) / steps;
      wipe.dc.beginPath(); wipe.dc.arc(px, py, r * 0.9, 0, Math.PI * 2); wipe.dc.fill();
      const c0 = Math.max(0, Math.floor((px - r) / WIPE_CELL));
      const c1 = Math.min(wipe.cols - 1, Math.floor((px + r) / WIPE_CELL));
      const r0 = Math.max(0, Math.floor((py - r) / WIPE_CELL));
      const r1 = Math.min(wipe.rows - 1, Math.floor((py + r) / WIPE_CELL));
      for (let rr = r0; rr <= r1; rr += 1) {
        for (let cc = c0; cc <= c1; cc += 1) {
          const k = rr * wipe.cols + cc;
          if (wipe.cells[k] === 1 && Math.hypot((cc + 0.5) * WIPE_CELL - px, (rr + 0.5) * WIPE_CELL - py) < r) { wipe.cells[k] = 2; wipe.clean += 1; }
        }
      }
    }
    wipe.dc.restore();
    wipe.last = { x, y };
    wipe.pad = { x, y };
    if (dist > 4 && time - lastWipeSound > 0.2) { lastWipeSound = time; play('wipe'); }
    if (wipe.clean / wipe.dirty >= WIPE_DONE) { wipe.fade = 0.0001; wipe.auto = null; }
    kick();
  }

  /** Wipe for the player (keyboard): the pad sweeps back and forth across the scene. @returns {void} */
  function autoWipe() {
    if (!wipe || wipe.fade || wipe.auto) return;
    wipe.auto = { t: 0 };
    wipe.last = null;
    kick();
  }

  /**
   * Dab cream on every pink mark and rub it in with a clean sweep. A nose strip stuck on but never peeled comes away
   * now, with no bonus (B55: until here it could still be stuck on and peeled).
   * @returns {void}
   */
  function beginCream() {
    wipe = null;
    peel = null;
    if (strip && !strip.off && strip.stuck) { strip.stuck = false; strip.q = 0; }
    cream = { t: 0, dollops: marks.filter((m) => !m.patched).map((m, i) => ({ x: m.x, y: m.y, r: Math.max(6, m.r * 1.1), at: i * 0.08 })) }; // patched spots need no cream
    play('cream_heal');
    irr = irritationSoothe(irr, 'cream'); // the cream soothes the skin
    tellIrritation(true);
    setStep('cream');
  }

  /**
   * One step of the physics.
   * @param {number} dt seconds since the last frame
   * @returns {boolean} true while something still moves
   */
  function update(dt) {
    let busy = twistStep(dt); // the fidgety sway and the ticklish giggle (T8.3)
    for (const p of pimples) {
      if (p.appear < 1) { p.appear = Math.min(1, p.appear + dt * 3.5); busy = true; }
      if (p.growFor && !p.popped && step === 'pop' && p.age < p.growFor) { // a growing bump (Evil Horn) gets bigger while you watch
        if (!p.creaked && !halted) { p.creaked = true; play('creak', { grow: true }); } // a soft creak as it starts to grow out (B58)
        p.age += dt;
        p.r = grownRadius(p.r0, p.rMax, p.growFor, p.age);
        p.hold = grownHold(p.holdFull ?? p.hold, p.r, p.rMax); // bigger = a longer squeeze (B58)
        busy = true;
      }
      if (!p.popped) {
        const held = hold?.p === p || squeeze?.p === p || (keyHold?.p === p && time < keyHold.until);
        const before = p.pressure;
        if (squeeze?.p === p) p.pressure = squeezeTick(p, dt); // two fingers squeezing (T1.7)
        else if (memory?.bump === p) { /* a squeezing finger lifted a moment ago: the pressure waits for it */ }
        else if (twist === 'ticklish' && giggleBlocks(time, giggleAt)) { /* she is giggling: the press keeps what it had (R4 finding 2) */ }
        else if (keyHold?.p === p && time < keyHold.until) p.pressure = Math.min(keyHold.target, p.pressure + dt * 2.4);
        else if (keyHold?.p !== p || hold?.p === p) p.pressure = pressureStep(p.pressure, dt, hold?.p === p, effectiveHold(p.hold, p.tool ?? START_TOOL, p.type, warmth));
        for (const th of [0.3, 0.6, 0.85]) {
          const key = `${p.id}:${th}`;
          if (before < th && p.pressure >= th && !warnedThresholds.has(key)) { warnedThresholds.add(key); play('squish', { level: th }); buzz(6); }
          if (p.pressure < th - 0.15) warnedThresholds.delete(key);
        }
        if (p.pressure >= 1) pop(p);
        if (held || (p.pressure > 0 && keyHold?.p !== p)) busy = true;
      }
      if (p.wob || p.wobV) {
        p.wobV += (-190 * p.wob - 9 * p.wobV) * dt;
        p.wob += p.wobV * dt;
        if (Math.abs(p.wob) < 0.008 && Math.abs(p.wobV) < 0.05) { p.wob = 0; p.wobV = 0; } else busy = true;
      }
      if (p.type === 'gold' && !p.popped && !reduced) busy = true; // it twinkles
      if (p.ouch !== undefined && time - p.ouch < 0.7) busy = true; // ouch lines after an Ow
    }
    if (decoys.some((d) => d.ouch !== undefined && time - d.ouch < 0.7)) busy = true; // ouch lines round a pressed mole
    // The warm meter: fills while the warm cloth is held on the face, then slowly cools.
    const warmBefore = warmth;
    warmth = warmStep(warmth, dt, Boolean(warmHold) && step === 'pop');
    if (warmth > 0 || warmHold) busy = true;
    // The irritation meter calms by itself after a quiet while, faster with the warm cloth or after a cotton pad.
    if (step === 'pop' && irr.level > 0) {
      irr = irritationStep(irr, dt, { warm: Boolean(warmHold), drain: irrScale.drain, calmDelay: irrScale.calm });
      busy = true;
      tellIrritation();
    }
    if (warmth !== warmBefore && (Math.abs(warmth - warmSent) >= 0.02 || warmth === 0 || warmth === 1)) {
      warmSent = warmth;
      try { o.onWarm?.(warmth); } catch (e) { console.warn('onWarm failed:', e); }
    }
    for (const s of strands) {
      if (s.len >= s.max) continue;
      busy = true;
      s.len = Math.min(s.max, s.len + s.speed * dt);
      const pts = [];
      let x = s.x;
      let y = s.y;
      let a = s.ang;
      for (let d = 0; d <= s.len; d += 1.5) {
        pts.push({ x, y });
        a += s.curl * 1.5;
        x += Math.cos(a) * 1.5;
        y += Math.sin(a) * 1.5 + s.sag * d;
      }
      s.pts = pts;
    }
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const d = drops[i];
      busy = true;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vz -= 700 * dt;
      d.z += d.vz * dt;
      if (d.z <= 0) { // it lands: squash, then a short slide that leaves a tiny smear (sa = the slide's direction)
        drops.splice(i, 1);
        blobs.push({ x: d.x, y: d.y, r: d.r, gold: d.gold, goo: d.goo, age: 0, sa: Math.atan2(d.vy, d.vx) });
        capList(blobs, MAX_BLOBS);
      }
    }
    for (const b of blobs) { // the landing squash settles in a third of a second
      if (b.age === undefined || b.age >= 0.4) continue;
      b.age = reduced ? 1 : b.age + dt;
      busy = true;
    }
    for (let i = splats.length - 1; i >= 0; i -= 1) {
      const s = splats[i];
      busy = true;
      const age = time - s.born;
      s.age = Math.max(0, age);
      s.drip = Math.min(s.r * 1.6, s.age * s.r * 0.6); // kept for resize(); the drips themselves come from splatDrips()
      if (age > 2.6) s.a = Math.max(0, 1 - (age - 2.6) / 0.9); // a soft fade out
      if (s.a <= 0) splats.splice(i, 1);
    }
    for (let i = tweezers.length - 1; i >= 0; i -= 1) {
      tweezers[i].t += dt;
      busy = true;
      if (tweezers[i].t > 0.8) tweezers.splice(i, 1);
    }
    for (let i = horns.length - 1; i >= 0; i -= 1) {
      horns[i].t += dt;
      busy = true;
      if (horns[i].t > 1.1) horns.splice(i, 1);
    }
    for (let i = hairs.length - 1; i >= 0; i -= 1) {
      hairs[i].t += dt;
      busy = true;
      if (hairs[i].t > 1.3) hairs.splice(i, 1);
    }
    if (quake >= 0) busy = true; // until wobbleScreen() has put the picture back
    if (strip && !strip.off) {
      if (!peel && strip.q > 0.6 && strip.q < 1) strip.q = Math.min(1, strip.q + dt * 2.2);
      if (strip.q >= 1 && !strip.flying) { strip.flying = true; play('peel'); buzz([12, 30, 18]); }
      if (strip.flying) {
        strip.lift = Math.min(1, strip.lift + dt * (reduced ? 4 : 2.2));
        if (strip.lift >= 1) {
          strip.off = true;
          strip.flying = false;
          try { o.onStripPeeled?.(); } catch (e) { console.warn('onStripPeeled failed:', e); }
          maybeNextStep();
        }
      }
      if (strip.flying || (!peel && strip.q > 0.6 && strip.q < 1)) busy = true;
    }
    if (memory && time > memory.until) forget(); // no finger came back in time: the bump springs back
    if (hold || peel || squeeze || memory) busy = true;
    if (pimples.some((p) => time - (p.ringTo ?? -9) < 0.3)) busy = true; // a squeeze ring fading out
    if (wipe) {
      if (wipe.auto) {
        busy = true;
        wipe.auto.t += dt;
        const t = wipe.auto.t / autoWipeSeconds(tool, 1.6);
        const rows = 4;
        const row = Math.min(rows - 1, Math.floor(t * rows));
        const f = t * rows - row;
        const x = row % 2 ? w - 20 - f * (w - 40) : 20 + f * (w - 40);
        wipeAt(x, ((row + 0.5) / rows) * h);
        if (t >= 1 && !wipe.fade) wipe.fade = 0.0001;
      }
      if (wipe.fade) {
        busy = true;
        wipe.fade = Math.min(1, wipe.fade + dt * 3);
        if (wipe.fade >= 1 && !stripBusy(strip, Boolean(peel))) beginCream(); // a peel going on finishes first (B55)
      }
    }
    if (cream) {
      busy = true;
      cream.t += dt;
      if (cream.t > (reduced ? 1.2 : 1.9) && step === 'cream') {
        step = 'done';
        marks.length = 0;
        try { o.onStep?.('done'); } catch { /* ignore */ }
        setTimeout(() => { if (!disposed) o.onDone?.(); }, 350);
      }
      if (step === 'done') busy = cream.t < 2.6;
    }
    return busy;
  }

  /**
   * Where the clean sweep is during the cream step (x of its edge), or null before it starts.
   * @returns {number|null} x
   */
  function sweepX() {
    if (!cream || reduced) return null;
    const s = (cream.t - 0.6) / 1.1;
    if (s <= 0) return null;
    return -60 + smooth(s) * (w + 120);
  }

  /** Draw the whole scene once. @returns {void} */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(...viewMatrix()); // everything below is drawn in scene px through the zoom view (T1.4)
    ctx.drawImage(texture, 0, 0, w, h);
    const sx = sweepX();
    const fadeAll = reduced && cream ? Math.max(0, 1 - Math.max(0, cream.t - 0.5) / 0.6) : 1;
    // Stretched skin around the pimple being squeezed (and the jiggle after a pop).
    for (const p of pimples) {
      const a = (p.popped ? 0 : p.pressure) + p.wob;
      const shake = !reduced && !p.popped && p.pressure > 0.8 ? Math.sin(time * 70) * 0.03 : 0;
      if (!tweezed(p) && Math.abs(a) > 0.01) drawWarp(p, a + shake, !p.popped);
    }
    faceLife()?.draw(ctx, lifeNow()); // the blinking, glancing eyes over the picture (only while they move, T8.1)
    if (warmth > 0.003 && face) { // a warm rosy glow on the skin while the warm meter is up (only over the person)
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const g = ctx.createRadialGradient(face.cx, face.cy, face.rx * 0.2, face.cx, face.cy, face.ry * 1.1);
      g.addColorStop(0, `rgba(255,140,110,${0.2 * warmth})`);
      g.addColorStop(1, 'rgba(255,140,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(face.cx - face.rx * 1.3, face.cy - face.ry * 1.2, face.rx * 2.6, face.ry * 2.4);
      ctx.restore();
    }
    const blush = Math.max(irr.level, twist === 'sensitive' && (step === 'pop' || step === 'wipe') ? SENSITIVE.blush : 0); // delicate skin starts a bit red (T8.3)
    if (blush > 0.02 && face) drawIrritation(blush); // redder, blotchy cheeks while irritated (no motion)
    for (const d of decoys) drawDecoy(ctx, d); // moles, freckles and beauty marks are part of the skin
    for (const m of marks) {
      const alpha = sx === null ? fadeAll : m.x < sx ? 0 : 1;
      if (alpha > 0) drawMark(ctx, m, alpha);
    }
    for (const pa of patches) drawPatch(ctx, pa.x, pa.y, pa.r);
    if (strip && !strip.off) drawStripDots(ctx, strip.dots, strip.stuck ? strip.x + strip.q * strip.w : -Infinity);
    for (const p of pimples) if (!p.popped) drawPimple(ctx, p, p.pressure, p.appear, time);
    for (const s of strands) drawStrand(ctx, s);
    for (const b of blobs) drawDrop(ctx, b);
    if (wipe) {
      ctx.save();
      ctx.globalAlpha = wipe.fade ? Math.max(0, 1 - wipe.fade) : 1;
      ctx.drawImage(wipe.dirt, 0, 0, w, h);
      ctx.restore();
    }
    // Tweezers: open over a blackhead while it is squeezed, then pull the plug up and away.
    for (const p of pimples) {
      if (haired(p)) continue; // the hair's tweezers grip the hair's tip (below)
      if (tweezed(p) && !p.popped && p.pressure > 0.02) drawTweezers(ctx, p.x, p.y, 1 - p.pressure, scale);
    }
    for (const p of pimples) { // an ingrown hair being pulled: it slides out and keeps coming; the tweezers hold its tip
      if (!haired(p) || p.popped || p.pressure <= 0.02) continue;
      const pts = hairPoints(p.x, p.y, hairDir(p), hairReach(p, p.pressure), scale, reduced ? 0 : time);
      drawHair(ctx, pts, Math.max(1.6, 2.2 * scale));
      const tip = pts[pts.length - 1];
      if (tweezed(p)) drawTweezers(ctx, tip.x, tip.y, Math.max(0, 1 - p.pressure * 8), scale);
    }
    for (const hr of hairs) { // a hair that came out: it springs up, flops over and falls away, fading
      const pts = hairPoints(hr.x, hr.y, hr.dir, hr.reach, scale, reduced ? 0 : time);
      const tip = pts[pts.length - 1];
      const t = hr.t;
      const turn = reduced ? 0 : hr.spin * t * 1.6;
      const dx = hr.spin * t * 30 * scale;
      const dy = (-50 * t + 220 * t * t) * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.8) / 0.5);
      ctx.translate(tip.x + dx, tip.y + dy); // turn round the tip, where the tweezers hold it
      ctx.rotate(turn);
      ctx.translate(-tip.x, -tip.y);
      drawHair(ctx, pts, Math.max(1.6, 2.2 * scale));
      ctx.restore();
    }
    for (const tw of tweezers) {
      const up = smooth(tw.t / 0.6) * 46 * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, tw.t - 0.5) / 0.3);
      drawStrand(ctx, { pts: [{ x: tw.x, y: tw.y - up + tw.r * 2.2 }, { x: tw.x, y: tw.y - up }], w: tw.r * 0.9, tip: true });
      if (tw.withTweezers) drawTweezers(ctx, tw.x, tw.y - up, 0, scale);
      ctx.restore();
    }
    for (const hn of horns) { // an Evil Horn that creaked out: it pops up, tumbles away and fades
      const up = smooth(hn.t / 0.5) * 40 * scale + Math.max(0, hn.t - 0.5) * 60 * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, hn.t - 0.7) / 0.4);
      drawHorn(ctx, hn.x + hn.spin * hn.t * 28 * scale, hn.y - up, hn.r, hn.spin * hn.t * 2.4);
      ctx.restore();
    }
    for (const p of pimples) { // ouch lines round a bump that got the wrong tool
      const age = p.ouch === undefined ? Infinity : time - p.ouch;
      if (age < 0.7) drawOuch(ctx, p.x, p.y, p.r, age / 0.7, reduced);
    }
    for (const d of decoys) { // ouch lines round a decoy that was pressed
      const age = d.ouch === undefined ? Infinity : time - d.ouch;
      if (age < 0.7) drawOuch(ctx, d.x, d.y, Math.max(d.r, 9 * scale), age / 0.7, reduced);
    }
    if (strip && !strip.off && strip.stuck) {
      ctx.save();
      ctx.globalAlpha = 1 - strip.lift;
      drawStrip(ctx, strip, strip.q, strip.lift);
      ctx.restore();
    }
    for (const d of drops) drawDrop(ctx, d);
    if (warmHold) drawCloth(ctx, warmHold.x, warmHold.y, 34 * scale, reduced ? 0 : time);
    if (wipe && !wipe.fade) drawPad(ctx, wipe.pad.x, wipe.pad.y, 26 * scale * wipeReach(tool)); // bigger with the cotton pad
    if (cream) {
      for (const d of cream.dollops) {
        const grow = smooth((cream.t - d.at) / 0.18);
        const gone = sx === null ? fadeAll : d.x < sx ? Math.max(0, 1 - (sx - d.x) / 40) : 1;
        drawCream(ctx, d.x, d.y, d.r * grow, gone * (grow > 0 ? 1 : 0));
      }
      if (sx !== null && !reduced) {
        const g = ctx.createLinearGradient(sx - 70, 0, sx + 10, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.75, 'rgba(255,250,240,0.42)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 70, 0, 80, h);
      }
      if (step === 'done') { // a soft fresh glow over the clean skin
        const a = Math.max(0, 0.22 - Math.abs(cream.t - 2.1) * 0.3);
        ctx.fillStyle = `rgba(255,248,236,${a})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    for (const p of pimples) if (p.ringFrom !== undefined) drawTargetRing(p); // which bump two fingers have (T1.7)
    if (squeeze) drawGhostPads(squeeze.p); // the two squeezing fingers, on the bump's edges (screen px)
    if (splats.length) { // the lens is in front of the zoom: splats are drawn in screen px
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of splats) if (time >= s.born) drawSplat(ctx, s);
      ctx.setTransform(...viewMatrix());
    }
    wobbleScreen();
  }

  /**
   * Which way an ingrown hair comes out: up and a little towards the middle of the face, so the long hair crosses
   * the skin (silly, and easy to see) and has room to keep coming.
   * @param {object} p the hair bump
   * @returns {number} direction in radians
   */
  function hairDir(p) {
    const cx = face ? face.cx : w / 2;
    const side = p.x < cx ? 1 : -1;
    return Math.atan2(-1, side * 0.4);
  }

  /**
   * How far the hair has come out: it keeps coming while held (pressure 0..1), up to longer than the face is wide,
   * but never past the edge of the picture.
   * @param {object} p the hair bump
   * @param {number} pressure 0..1
   * @returns {number} reach in px
   */
  function hairReach(p, pressure) {
    const full = face ? face.rx * 1.6 : 200 * scale;
    const d = hairDir(p);
    const c = Math.cos(d);
    const sn = Math.sin(d);
    const room = Math.min(c ? ((c > 0 ? w - p.x : p.x) - 24) / Math.abs(c) : Infinity, sn < 0 ? (p.y - 24) / -sn : Infinity);
    return Math.max(0, Math.min(full, room)) * Math.max(0, Math.min(1, pressure));
  }

  /** The picture wobbles for a moment after an Evil Horn (or, softly, a hair) comes out (never with reduced motion). @returns {void} */
  function wobbleScreen() {
    if (quake < 0) return;
    const age = time - quake;
    if (age >= 0.6 || reduced) { canvas.style.transform = ''; quake = -1; return; }
    const k = (1 - age / 0.6) * quakeK;
    canvas.style.transform = `translate(${(Math.sin(age * 47) * 5 * k).toFixed(2)}px, ${(Math.sin(age * 31) * 2 * k).toFixed(2)}px) rotate(${(Math.sin(age * 38) * 1.4 * k).toFixed(2)}deg)`;
  }

  /**
   * One animation frame.
   * @param {number} now time stamp
   * @returns {void}
   */
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    const busy = update(dt) || Boolean(faceLife()?.busy(lifeNow())); // a blink or glance keeps it going too (T8.1)
    render();
    if (busy && !raf) raf = requestAnimationFrame(frame); // a kick() during this frame may already have asked for the next
    if (!raf) planLife(); // asleep until the next blink or glance
  }

  /**
   * Redder cheeks (and a pink flush on the forehead) on an irritated face, stronger as the meter fills. Cartoon blush,
   * drawn only over the person; it does not move, so it is safe with reduced motion.
   * @param {number} level the irritation meter, 0..1
   * @returns {void}
   */
  function drawIrritation(level) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const spots = [[-0.55, 0.22, 0.34], [0.55, 0.22, 0.34], [0, -0.45, 0.4]];
    for (const [u, v, size] of spots) {
      const x = face.cx + u * face.rx;
      const y = face.cy + v * face.ry;
      const r = face.rx * size * (0.8 + 0.4 * level);
      const a = (u === 0 ? 0.25 : 0.55) * level;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(235,60,70,${a})`);
      g.addColorStop(1, 'rgba(235,60,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  /**
   * Raise the irritation meter and tell the controller.
   * @param {number} amount how much, 0..1
   * @param {boolean} [spare] true = it stops just under full (the pop that clears the face never makes her storm off)
   * @param {number} [scale] the customer's multiplier for this rise (irrScale.rise; a cold pop uses irrScale.cold)
   * @returns {void}
   */
  function raiseIrritation(amount, spare = false, scale = irrScale.rise) {
    if (!(amount > 0)) return;
    irr = irritationRise(irr, amount * scale);
    if (spare && irr.level >= 1) irr = { ...irr, level: 0.99 };
    tellIrritation(true);
  }

  /**
   * Tell the controller the irritation level when it changed enough (or always, with force).
   * @param {boolean} [force] tell even a small change
   * @returns {void}
   */
  function tellIrritation(force = false) {
    const lv = irr.level;
    if (!force && Math.abs(lv - irrSent) < 0.01 && lv !== 0) return;
    if (lv === irrSent && !force) return;
    irrSent = lv;
    try { o.onIrritation?.(lv); } catch (e) { console.warn('onIrritation failed:', e); }
  }

  /**
   * A wrong-tool or rough press, or a press on a decoy: no pressure and no pop; ouch lines, the "ow" sound, a buzz,
   * the irritation rise, and the controller is told.
   * @param {object} p the bump or decoy (type 'decoy')
   * @returns {void}
   */
  function ow(p) {
    p.ouch = time;
    raiseIrritation(IRRITATION.perOw * (twist === 'sensitive' ? SENSITIVE.owScale : 1)); // delicate skin minds an Ow more (T8.3)
    play('ow_customer');
    buzz([20, 40, 20]);
    try { o.onOw?.({ x: p.x, y: p.y, type: p.type, tool, id: p.id }); } catch (e) { console.warn('onOw failed:', e); }
    kick();
  }

  /**
   * Tell the controller that a press did nothing useful (so it can show a hint).
   * @param {string} n e.g. 'patchFirst'
   * @returns {void}
   */
  const note = (n) => { try { o.onNote?.(n); } catch { /* optional */ } };

  /**
   * Stick a patch on the popped spot under a point.
   * @param {{x: number, y: number}} pt the point
   * @returns {boolean} true when a patch went on
   */
  function patchAt(pt) {
    const m = findPatchSpot(marks, pt.x, pt.y);
    if (!m) return false;
    m.patched = true;
    patches.push({ x: m.x, y: m.y, r: Math.max(9, m.r * 1.25) });
    play('squish', { level: 0.2 });
    buzz(10);
    try { o.onPatch?.(patches.length); } catch (e) { console.warn('onPatch failed:', e); }
    kick();
    return true;
  }

  /**
   * A press while popping, with the tool in hand: squeeze, pull, warm, stick or peel the strip, patch, or Ow.
   * @param {PointerEvent} e the event
   * @param {{x: number, y: number}} pt where, in scene px
   * @returns {boolean} true when the press was used (the pointer is then captured)
   */
  function pressPop(e, pt) {
    const use = toolInfo(tool)?.use;
    const onStrip = strip && !strip.off && !strip.flying && inStripArea(strip, pt.x, pt.y);
    if (onStrip && strip.stuck) { peel = { id: e.pointerId, x0: pt.x, q0: strip.q }; return true; } // any tool peels
    if (use === 'warm') {
      if (!onFace(face, pt.x, pt.y)) return false;
      warmHold = { id: e.pointerId, x: pt.x, y: pt.y };
      play('wipe');
      return true;
    }
    if (use === 'patch') {
      if (patchAt(pt)) return true;
      if (hitTest(pimples, pt.x, pt.y)) note('patchFirst');
      return false;
    }
    const decoy = hitDecoy(decoys, pimples, pt.x, pt.y); // a mole or freckles: never a bump, always an Ow
    if (decoy && !onStrip) { ow(decoy); return false; }
    const p = hitTest(pimples, pt.x, pt.y);
    if (use === 'strip') {
      if (onStrip || (p && p.zone === 'nose' && strip && !strip.off)) { // stick the strip on the nose
        strip.stuck = true;
        play('peel');
        buzz(10);
        return true;
      }
      if (p) ow(p);
      return false;
    }
    if (!p) return false;
    const out = pressOutcome(tool, p.type);
    if (out === 'ow') { ow(p); return false; }
    if (out !== 'squeeze' && out !== 'pull') return false;
    if (!pressAgain(p) && roll() < roughChance(tool, p.type, warmth, irr.level, skin) * (p.roughMul ?? 1)) { ow(p); return false; } // a rough press on a cold bump (mastery lowers it; delicate skin raises it, T8.3)
    if (p.pressure < 0.05 || p.tool !== tool) { p.tool = tool; if (out === 'squeeze') p.axis = fingerAxis(p); }
    delete p.sqReach; // a one-finger hold uses the drawn fingers again (not a two-finger squeeze's ghost pads)
    hold = { p, id: e.pointerId, since: time };
    play('squish', { level: 0.1 });
    return true;
  }

  /**
   * A press with one finger or the mouse: use the tool in hand while popping, or start wiping.
   * @param {PointerEvent|object} e the event (or a stored copy of a finger's down event)
   * @returns {boolean} true when the press was used
   */
  function press(e) {
    if (e.button > 0 || halted) return false;
    const pt = local(e);
    if (step === 'pop' && giggleBlocks(time, giggleAt)) return false; // she is still giggling (ticklish, T8.3): wait
    const stripDo = step === 'wipe' ? wipeStripPress({ // B55: the nose strip still sticks on and peels while wiping
      strip, onStrip: Boolean(strip && inStripArea(strip, pt.x, pt.y)), toolUse: toolInfo(tool)?.use ?? null,
    }) : null;
    if (step === 'pop') {
      if (!pressPop(e, pt)) return false;
    } else if (stripDo === 'peel') {
      peel = { id: e.pointerId, x0: pt.x, q0: strip.q };
    } else if (stripDo === 'stick') {
      strip.stuck = true;
      play('peel');
      buzz(10);
      try { o.onStripStuck?.(); } catch (err) { console.warn('onStripStuck failed:', err); } // the hint says: now peel it
    } else if (step === 'wipe' && toolInfo(tool)?.use === 'patch' && patchAt(pt)) {
      // a patch went on a popped spot; no wiping with this press
    } else if (step === 'wipe' && wipe && !wipe.fade) {
      wipe.id = e.pointerId;
      wipe.auto = null;
      wipe.last = null;
      wipeAt(pt.x, pt.y);
    } else return false;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without */ }
    kick();
    return true;
  }

  // The gesture rule (T1.4): ONE finger never pans or zooms. It always uses the tool in hand (squeeze, pull, peel,
  // wipe...), so popping can never move the view by accident. Pinching and panning need TWO fingers on the face: the
  // fingers' spread sets the zoom and moving them both slides the view. To tell a pinch from a press, a first finger
  // waits PINCH_WAIT_MS (a blink) before it presses; a second finger in that time makes it a pinch with no press at
  // all. A second finger that comes later lets go of whatever the first was doing (no pop) and pinches. Lifting one
  // finger ends the pinch; the other then does nothing until it is lifted. A mouse (no second finger) drags the view
  // from a spot where the press did nothing, only when zoomed in; the wheel zooms. Double-tap is never used (it would
  // fight quick popping taps). Buttons and keys (pop-mode.js) do the same through zoomBy, panBy and resetView.
  // With the squeeze switch on (T1.7) and fingers in hand, two fingers that land in a bump's catch zone squeeze it at
  // once (by position only) and never zoom or pan; a third finger ends a squeeze, a lifted finger has 300 ms to come
  // back. Two fingers far from every bump pinch as above.
  const PINCH_WAIT_MS = 60;

  /** Let go of everything a finger was doing, because a pinch takes over (nothing pops). @returns {void} */
  function letGo() {
    hold = null;
    peel = null;
    warmHold = null;
    if (wipe) { wipe.id = null; wipe.last = null; }
  }

  /** The waiting first finger presses now (no second finger came, or it was lifted or moved on). @returns {void} */
  function firePending() {
    const p = pending;
    if (!p) return;
    pending = null;
    clearTimeout(p.timer);
    press(p.ev);
  }

  /** Two fingers are down: start pinching with the first two (a waiting press is dropped). @returns {void} */
  function startPinch() {
    if (pending) { clearTimeout(pending.timer); pending = null; }
    letGo();
    const [a, b] = [...touches.keys()];
    pinch = { a, b, a0: touches.get(a), b0: touches.get(b), start: { ...view } };
    kick();
  }

  // ---- Two-finger squeeze (T1.7). The rules are in squeeze-logic.js; this is only the glue to the fingers. ----

  /**
   * A finger in scene px (through the zoom view).
   * @param {{x: number, y: number}|undefined} s the finger in screen px
   * @returns {{x: number, y: number}|null} scene point, or null for a lifted finger
   */
  const sceneOf = (s) => (s ? screenToScene(shown(), s.x, s.y) : null);

  /**
   * Two fingers are down: with the squeeze switch on and fingers in hand, two fingers anywhere in a bump's catch zone
   * squeeze the nearest bump at once (decided by where they are, never by how they move). A waiting or holding first
   * finger lets go. Far from every bump they pinch-zoom as before.
   * @returns {boolean} true when it is a squeeze (or a decoy's Ow); false = pinch
   */
  function twoDown() {
    if (!squeezeOn || !canSqueeze(tool) || step !== 'pop' || halted) return false;
    const [a, b] = [...touches.keys()];
    const cand = squeezeCandidate(pimples, decoys, sceneOf(touches.get(a)), sceneOf(touches.get(b)), view.z);
    if (!cand) return false;
    if (pending) { clearTimeout(pending.timer); pending = null; }
    letGo();
    startSqueeze(a, b, cand);
    return true;
  }

  /**
   * Start squeezing a bump with two fingers: the same checks as a one-finger press (a mole or the wrong bump is an Ow,
   * a cold bump may be a rough press), unless a finger was only lifted for a moment (then it carries on). After an
   * Ow the fingers do nothing more until lifted.
   * @param {number} a first finger's pointerId
   * @param {number} b second finger's pointerId
   * @param {{target: object, decoy: boolean}} cand what they squeeze (squeeze-logic.js squeezeCandidate)
   * @returns {void}
   */
  function startSqueeze(a, b, cand) {
    const p = cand.target;
    const again = !cand.decoy && resumes(memory, p, time);
    const level = again ? memory.level : 0;
    if (memory && !again) forget();
    memory = null;
    stale = true; // unless the squeeze really starts below
    if (giggleBlocks(time, giggleAt)) return; // still giggling (ticklish, T8.3): these fingers wait until lifted
    if (!again) {
      if (cand.decoy) { ow(p); return; }
      if (p.popped || step !== 'pop' || halted) return;
      const out = pressOutcome(tool, p.type);
      if (out === 'ow') { ow(p); return; }
      if (out !== 'squeeze' && out !== 'pull') return;
      if (!pressAgain(p) && roll() < roughChance(tool, p.type, warmth, irr.level, skin) * (p.roughMul ?? 1)) { ow(p); return; } // as for a press
    }
    stale = false;
    p.tool = tool;
    const pa = touches.get(a);
    const pb = touches.get(b);
    squeeze = {
      a, b, p, d0: Math.max(1, Math.hypot(pa.x - pb.x, pa.y - pb.y)), drive: startDrive(Math.max(p.pressure, level)),
      nextSqueak: time, nextBuzz: time + 0.08, last: p.pressure, since: time, // since: for the ticklish giggle (T8.3)
    };
    if (!again) p.ringFrom = time;
    aimSqueeze(squeeze);
    if (!again) { play('squish', { level: 0.1 }); buzz(8); }
    kick();
  }

  /**
   * Turn the bump's squeeze to the line between the real fingers (the dents and pads sit on the bump's edges along
   * it, however far away the fingers are).
   * @param {object} sq the squeeze
   * @returns {void}
   */
  function aimSqueeze(sq) {
    const a = touches.get(sq.a);
    const b = touches.get(sq.b);
    if (!a || !b) return;
    if (Math.hypot(b.x - a.x, b.y - a.y) > 2) sq.p.axis = Math.atan2(b.y - a.y, b.x - a.x); // screen and scene angles agree
    sq.p.sqReach = sq.p.r * 1.75;
  }

  /**
   * One frame of a squeeze: the fingers' closing (from the widest they have been) and the time held become the
   * bump's press progress (never faster than a hold); spreading only eases it. A squeak and tiny buzz pulses come
   * quicker as it rises.
   * @param {object} p the squeezed bump
   * @param {number} dt seconds since the last frame
   * @returns {number} the new press progress, 0..1
   */
  function squeezeTick(p, dt) {
    const sq = squeeze;
    const a = touches.get(sq.a);
    const b = touches.get(sq.b);
    if (!a || !b) return p.pressure;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    sq.d0 = Math.max(sq.d0, d); // spread wider: closing counts from there (spreading never zooms)
    const hold = effectiveHold(p.hold, p.tool ?? START_TOOL, p.type, warmth);
    sq.drive = stepDrive(sq.drive, dt, closeAmount(sq.d0, d), hold);
    const next = squeezeProgress(p.pressure, sq.drive.level, dt, hold);
    aimSqueeze(sq);
    if (next > 0.04 && next >= sq.last - 1e-4 && time >= sq.nextSqueak) { // the squeak only while it holds or rises
      play('squeeze', { level: next });
      sq.nextSqueak = time + squeakGap(next);
    }
    if (next > 0.06 && time >= sq.nextBuzz) {
      buzz(next > 0.7 ? 9 : 5);
      sq.nextBuzz = time + buzzGap(next);
    }
    sq.last = next;
    return next;
  }

  /**
   * A bump let go: it springs back with a small jiggle (no Ow), and its ring fades.
   * @param {object} p the bump
   * @returns {void}
   */
  function springBack(p) {
    p.ringTo = time;
    if (!p.popped && !reduced) p.wobV -= 3.5 * p.pressure;
    kick();
  }

  /**
   * Stop squeezing. With remember (a squeezing finger lifted) the bump holds its pressure for a moment, so a finger
   * put down again carries on; otherwise (a third finger, drifting far away, the pop) it ends now and fingers still
   * down do nothing more until all are lifted.
   * @param {boolean} [remember] keep it for a quick re-touch
   * @returns {void}
   */
  function endSqueeze(remember = false) {
    const sq = squeeze;
    if (!sq) return;
    squeeze = null;
    if (remember && !sq.p.popped) {
      memory = rememberSqueeze(sq.p, sq.drive.level, time);
      stale = false;
      kick();
      return;
    }
    stale = touches.size > 0;
    springBack(sq.p);
  }

  /** The quick re-touch time is over (or something else came): the remembered bump springs back. @returns {void} */
  function forget() {
    const m = memory;
    memory = null;
    if (m) springBack(m.bump);
  }

  /** Forget any squeeze at once (lost finger ups, a turn of the phone, halt); a quick re-touch memory stays. @returns {void} */
  function resetSqueeze() {
    endSqueeze();
    stale = false;
  }

  /**
   * More than one finger is down after a finger landed: a third finger ends a squeeze cleanly; two fingers in a
   * bump's catch zone squeeze it; otherwise the first two pinch, as before.
   * @returns {void}
   */
  function moreFingers() {
    if (squeeze) { endSqueeze(); stale = true; return; } // a third finger: stop, nothing pops, nothing stuck
    if (stale || pinch) return;
    if (touches.size === 2 && twoDown()) return;
    startPinch();
  }

  /**
   * A finger moved while two fingers squeeze: wobble and spreading are fine; only both fingers far away end it (it
   * never turns into a zoom).
   * @returns {void}
   */
  function squeezeMove() {
    const { a, b, p } = squeeze;
    if (squeezeEnd({ fingers: touches.size, a: sceneOf(touches.get(a)), b: sceneOf(touches.get(b)), bump: p, z: view.z })) endSqueeze();
    kick();
  }

  /**
   * A soft ring round the bump being squeezed, so the player sees which one the fingers have (it shows the moment two
   * fingers land, glows warmer as the pressure rises, and fades after). Scene px, through the zoom.
   * @param {object} p the bump
   * @returns {boolean} true while it is still showing (fading)
   */
  function drawTargetRing(p) {
    const live = squeeze?.p === p || memory?.bump === p;
    const k = live ? Math.min(1, (time - (p.ringFrom ?? time)) / 0.12 + 0.35) : 1 - (time - (p.ringTo ?? -9)) / 0.3;
    if (k <= 0 || p.popped) return false;
    const pr = Math.max(0, Math.min(1, p.pressure));
    const R = p.r * (1.95 + 0.25 * pr) + (reduced ? 0 : Math.sin(time * 7) * p.r * 0.06);
    const px = 1 / view.z; // one screen px in scene px
    ctx.save();
    ctx.globalAlpha = Math.min(1, k);
    const g = ctx.createRadialGradient(p.x, p.y, Math.max(0, R - 7 * px), p.x, p.y, R + 7 * px);
    g.addColorStop(0, 'rgba(255,240,170,0)');
    g.addColorStop(0.5, `rgba(255,${Math.round(236 - 70 * pr)},${Math.round(170 - 60 * pr)},0.55)`);
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R + 7 * px, 0, Math.PI * 2);
    ctx.arc(p.x, p.y, Math.max(0, R - 7 * px), 0, Math.PI * 2, true);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.2 * px;
    ctx.setLineDash([7 * px, 5 * px]);
    ctx.lineDashOffset = reduced ? 0 : -time * 18 * px; // the dashes slowly run round (still with reduced motion)
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  /**
   * Two soft see-through finger pads on the squeezed bump's edges, along the line between the real fingers (so the
   * picture stays clear even when the fingers are far off to the side), pressing in as the pressure rises. Drawn in
   * screen px, over the face.
   * @param {object} p the squeezed bump (its axis is the finger line)
   * @returns {void}
   */
  function drawGhostPads(p) {
    const pr = Math.max(0, Math.min(1, p.pressure));
    const ang = p.axis ?? 0;
    const R = 14;
    const spots = padSpots(sceneToScreen(shown(), p.x, p.y), p.r * view.z, ang, pr, R);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [pt, dir] of [[spots.a, 1], [spots.b, -1]]) {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(ang);
      const squash = 1 - 0.28 * pr;
      const g = ctx.createRadialGradient(dir * R * 0.35, 0, 1, 0, 0, R);
      g.addColorStop(0, `rgba(255,242,234,${0.16 + 0.14 * pr})`);
      g.addColorStop(0.65, `rgba(255,220,204,${0.3 + 0.16 * pr})`);
      g.addColorStop(1, 'rgba(255,212,192,0.1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * squash, R * (1 + 0.1 * pr), 0, 0, Math.PI * 2); // flattened against the bump
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.35 * pr})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(150,70,55,${0.25 + 0.35 * pr})`; // the pressing edge, on the side facing the bump
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const edge = dir > 0 ? 0 : Math.PI;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * squash * 0.72, R * 0.8, 0, edge - 0.7, edge + 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** Finger, pen or mouse down: a first finger waits a blink (see the gesture rule), others press now. @param {PointerEvent} e event @returns {void} */
  function onDown(e) {
    if (e.pointerType === 'touch') {
      if (e.isPrimary) { touches.clear(); pinch = null; resetSqueeze(); } // a new first finger: forget fingers whose "up" got lost
      touches.set(e.pointerId, screenPt(e));
      e.preventDefault();
      if (touches.size >= 2) { moreFingers(); return; } // pinch, or a two-finger squeeze (T1.7)
      if (e.button > 0 || halted) return;
      const ev = { pointerId: e.pointerId, button: 0, clientX: e.clientX, clientY: e.clientY, preventDefault() {} };
      pending = { ev, timer: setTimeout(firePending, PINCH_WAIT_MS) };
      return;
    }
    if (press(e) || halted || e.pointerType !== 'mouse' || e.button !== 0 || view.z <= 1) return;
    const s = screenPt(e); // a mouse press on empty skin or room while zoomed in: drag the view
    mousePan = { id: e.pointerId, x: s.x, y: s.y };
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without */ }
  }

  /**
   * Zoom and pan moves (a pinch, a mouse drag). Returns true when the move was used for that.
   * @param {PointerEvent} e event
   * @returns {boolean} true = handled here
   */
  function viewMove(e) {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, screenPt(e));
      if (squeeze) { squeezeMove(); return true; } // near a bump two fingers never zoom or pan
      if (stale) return true; // after a squeeze: these fingers do nothing until lifted
      if (pinch) {
        const a1 = touches.get(pinch.a);
        const b1 = touches.get(pinch.b);
        if (a1 && b1) setView(pinchView(pinch.start, pinch.a0, pinch.b0, a1, b1, w, h, face));
        return true;
      }
      if (pending && pending.ev.pointerId === e.pointerId) return true; // still waiting to press
    }
    if (mousePan && e.pointerId === mousePan.id) {
      const s = screenPt(e);
      setView(panView(view, s.x - mousePan.x, s.y - mousePan.y, w, h, face));
      mousePan.x = s.x;
      mousePan.y = s.y;
      return true;
    }
    return false;
  }

  /**
   * Zoom and pan ends: a pinch finger or the dragging mouse lifted, or a waiting finger lifted (it presses now, so a
   * quick tap still squeezes). Returns true when the up was used here.
   * @param {PointerEvent} e event
   * @returns {boolean} true = handled here
   */
  function viewUp(e) {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (squeeze && (e.pointerId === squeeze.a || e.pointerId === squeeze.b)) { endSqueeze(true); return true; } // waits 300 ms for it, then springs back (no Ow)
      if (stale) { if (!touches.size) stale = false; return true; }
      if (pinch && (e.pointerId === pinch.a || e.pointerId === pinch.b)) { pinch = null; return true; }
      if (pending && pending.ev.pointerId === e.pointerId) {
        if (e.type === 'pointercancel') { clearTimeout(pending.timer); pending = null; return true; }
        firePending();
      }
    }
    if (mousePan && e.pointerId === mousePan.id) { mousePan = null; return true; }
    return false;
  }

  /** Mouse wheel (or a trackpad pinch): zoom round the mouse. @param {WheelEvent} e event @returns {void} */
  function onWheel(e) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? h : 1;
    const s = screenPt(e);
    setView(zoomAt(view, Math.exp(-e.deltaY * unit * 0.002), s.x, s.y, w, h, face));
  }

  /** Finger moves: peel the strip further, move the warm cloth, or move the pad. @param {PointerEvent} e event @returns {void} */
  function onMove(e) {
    if (viewMove(e)) return;
    if (warmHold && e.pointerId === warmHold.id) {
      const pt = local(e);
      if (onFace(face, pt.x, pt.y)) { warmHold.x = pt.x; warmHold.y = pt.y; } else warmHold = null; // slid off the face
      kick();
    } else if (peel && e.pointerId === peel.id) {
      const pt = local(e);
      strip.q = Math.max(strip.q, Math.min(1, peel.q0 + (pt.x - peel.x0) / strip.w));
      if (Math.floor(strip.q * 5) !== Math.floor((strip.q - 0.02) * 5)) buzz(4);
      kick();
    } else if (wipe && wipe.id === e.pointerId) {
      const pt = local(e);
      wipeAt(pt.x, pt.y);
    }
  }

  /** Finger up: let go of the pimple (a quick tap still gives a little pressure). @param {PointerEvent} e event @returns {void} */
  function onUp(e) {
    if (viewUp(e)) return;
    if (hold && e.pointerId === hold.id) {
      if (time - hold.since < 0.2 && !hold.p.popped) hold.p.pressure = Math.min(1, hold.p.pressure + 0.2);
      if (hold.p.pressure >= 1) pop(hold.p);
      hold = null;
    }
    if (peel && e.pointerId === peel.id) { peel = null; maybeNextStep(); } // the last bump may be popped already
    if (warmHold && e.pointerId === warmHold.id) warmHold = null;
    if (wipe && wipe.id === e.pointerId) { wipe.id = null; wipe.last = null; }
    kick();
  }

  /**
   * Enter or Space: squeeze the next pimple a bit, peel the strip a bit, or wipe for the player.
   * @returns {boolean} true when something happened
   */
  function keyPress() {
    if (halted) return false;
    if (step === 'pop') {
      // The nose strip first (it is optional, and the step ends with the last bump), then the bumps.
      if (strip && !strip.off && !strip.stuck) { strip.stuck = true; play('peel'); kick(); return true; }
      if (strip && !strip.off && !strip.flying) { strip.q = Math.min(1, strip.q + 0.34); kick(); return true; }
      const p = pimples.find((q) => !q.popped);
      if (p) { // the keyboard always uses the tool that suits the bump, so it never gives an Ow
        if (p.pressure < 0.05) p.tool = bestToolFor(p.type, usable ?? undefined);
        delete p.sqReach; // drawn fingers, not a two-finger squeeze's pads
        keyHold = { p, until: time + 0.25, target: tapPressure(p.pressure) };
        play('squish', { level: keyHold.target });
        kick();
        return true;
      }
    }
    if (step === 'wipe') { autoWipe(); return true; }
    return false;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.popView = () => ({ ...view }); // for browser checks: the zoom view now (T1.4)
  // Debug and smoke-test hook: where the pimples still are (scene coordinates; on screen see popView and sceneToScreen).
  canvas.popTargets = () => pimples.filter((p) => !p.popped).map((p) => ({ x: p.x, y: p.y, r: p.r, type: p.type, zone: p.zone }));
  canvas.popDecoys = () => decoys.map((d) => ({ x: d.x, y: d.y, r: d.r, kind: d.kind })); // for browser checks, like popTargets
  canvas.popStrip = () => (strip && !strip.off ? { x: strip.x, y: strip.y, w: strip.w, h: strip.h } : null);
  canvas.popStep = () => step;
  // For browser checks (T1.7): the two-finger squeeze now ('wait' while deciding, the bump's progress while squeezing).
  canvas.popSqueeze = () => (squeeze ? { pressure: squeeze.p.pressure, x: squeeze.p.x, y: squeeze.p.y } : memory ? 'resume' : stale ? 'stale' : null);
  canvas.popPressures = () => pimples.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure, popped: p.popped }));
  canvas.popTool = () => tool;
  canvas.popWarmth = () => warmth;
  canvas.popIrritation = () => irr.level;
  canvas.popTwist = () => ({ twist, off: { ...off }, room, swayK, giggleAt, time }); // for browser checks (T8.3)
  measureRoom();
  render();
  kick();

  return {
    /**
     * Add more bumps while popping (they grow in). Only while popping.
     * @param {object[]} list bumps like those from layoutFace
     * @returns {boolean} true when they were added
     */
    add(list) {
      if (step !== 'pop') return false;
      for (const p of list) if (isImplemented(p.type)) pimples.push(sceneBump(p, reduced)); // unbuilt kinds are skipped
      kick();
      return true;
    },
    /** Pimples still to pop. @returns {number} count */
    left: () => pimples.filter((p) => !p.popped).length,
    /** Every pimple in the scene (popped or not). @returns {object[]} the pimples */
    all: () => pimples,
    /** The step now: pop, wipe, cream or done. @returns {string} the step */
    step: () => step,
    /** Whether the nose strip is still on the face (not peeled off). @returns {boolean} true while it is there */
    stripOn: () => Boolean(strip && !strip.off),
    /** Whether the nose strip is stuck on and waiting to be peeled. @returns {boolean} true when stuck on */
    stripStuck: () => Boolean(strip && !strip.off && strip.stuck),
    /**
     * Swap the background picture (the face changes mood as it is cleared).
     * @param {HTMLCanvasElement} tex the new texture
     * @returns {void}
     */
    setTexture(tex) { texture = tex; kick(); if (!raf) render(); },
    resize,
    /** The scene size now. @returns {{w: number, h: number}} CSS px */
    size: () => ({ w, h }),
    keyPress,
    /**
     * Pick up a tool (from the tool bar). Unknown or unbuilt tools are ignored.
     * @param {string} id a tool id
     * @returns {boolean} true when it is now in hand
     */
    setTool(id) {
      if (!toolInfo(id)?.implemented) return false;
      tool = id;
      if (wipe) kick(); // the wiping pad's size depends on the tool in hand: redraw it
      return true;
    },
    /** The tool in hand. @returns {string} a tool id */
    tool: () => tool,
    /**
     * Change the tools the player has (T3.1b: a tool was bought). The keyboard picks only from these; a tool in hand
     * that is no longer in the list is put down for fingers.
     * @param {string[]} ids tool ids
     * @returns {void}
     */
    setTools(ids) {
      usable = Array.isArray(ids) ? [...ids] : null;
      if (usable && !usable.includes(tool)) tool = START_TOOL;
    },
    /** The warm meter now. @returns {number} 0..1 */
    warmth: () => warmth,
    /** The irritation meter now (T1.2b). @returns {number} 0..1 */
    irritation: () => irr.level,
    /** Stop all popping (the customer stormed off): let go of every press, ignore new ones. @returns {void} */
    halt() { haltAll(); },
    /** Stop the loop and the listeners. @returns {void} */
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(lifeTimer);
      try { breathing?.cancel(); } catch { /* already gone */ }
      if (quake >= 0) canvas.style.transform = ''; // stop a horn wobble half-way
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      if (pending) clearTimeout(pending.timer);
      pending = null;
      squeeze = null;
      memory = null;
    },
    /** The zoom view now (T1.4): z = zoom, x, y = the scene point at the top left. @returns {{z: number, x: number, y: number}} view */
    view: () => ({ ...view }),
    /**
     * Zoom in or out round a point on the canvas (the buttons and keys use the middle).
     * @param {number} factor more than 1 = closer
     * @param {number} [sx] screen x (CSS px on the canvas), the middle when left out
     * @param {number} [sy] screen y
     * @returns {void}
     */
    zoomBy(factor, sx = w / 2, sy = h / 2) { setView(zoomAt(view, factor, sx, sy, w, h, face)); },
    /**
     * Slide the zoomed view (arrow keys).
     * @param {number} dx screen px (positive = see more of the left side)
     * @param {number} dy screen px (positive = see more of the top)
     * @returns {void}
     */
    panBy(dx, dy) { setView(panView(view, dx, dy, w, h, face)); },
    /** Back to the whole face. @returns {void} */
    resetView() { setView(clampView({ z: 1, x: 0, y: 0 }, w, h, face)); },
    /**
     * Where a scene point is on the canvas now (for bubbles over a bump).
     * @param {number} x scene x
     * @param {number} y scene y
     * @returns {{x: number, y: number}} CSS px on the canvas
     */
    toScreen: (x, y) => sceneToScreen(shown(), x, y),
  };
}
