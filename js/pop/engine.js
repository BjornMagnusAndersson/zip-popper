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
// Juicy pop (SPEC D45 item 1, option juicy: true; from pop test G): whiteheads, pink and big bumps dome up tight while
// squeezed and throb, then split open: a goo mound rises out, glossy drops fly and land with splatter specks, a small
// soft crater heals in about 2 s, a see-through ripple bends the picture (ripple.js) and a few drops hit the screen
// glass and slide down (the lens splats, splashLens). Scaled by size; the biggest show for the last goo bump of a face
// (blackheads and hairs left over do not count, D46-32) and for the first pop with option grandFirst (Hubby, chapter 0
// only, D46-26). A chin, jaw or nose bump throws its upward drops sideways (D46-33). The golden bump and the Evil Horn keep their own pop
// and get the ripple (gold also golden glass drops); blackheads and hairs are unchanged. pop-fx.js decides, pop-fx-art.js
// draws. juicy false (the Settings switch "Gentle pops") = the calm pop as before. Reduced motion: no ripple, no glass,
// no jolt, fewer drops; option lite (Lighter graphics, or the slow-phone switch): fewer drops, no ripple. The warm
// cloth steams while it is on a bump (D45 item 5). Splat v2 (owner 2026-10-31): fewer, fatter drops land close round
// the bump as cartoon splats (merged into puddles, drip runs), a fine mist flies and vanishes; goo lands only on bare
// skin (the picture's skin mask, face.js skinAt), elsewhere it slides down and fades; a drop flying at an eye makes her
// flinch (faceLife.flinch) and slides off the shut eye down the cheek. The Evil Horn's own show: it trembles and creaks
// louder while squeezed, then cracks, shoots off spinning and sticks in the wall like a dart (pop-fx.js hornAt).
import { pressureStep, tapPressure, hitTest, hitDecoy, rng, holdTime, grownRadius, grownHold, growStart } from './logic.js';
import { fullView, screenToScene, sceneToScreen, clampView, zoomAt, panView, pinchView, refitView } from './logic.js';
import { bumpInfo, isImplemented } from '../data/bumps.js';
import {
  START_TOOL, pressOutcome, bestToolFor, effectiveHold, warmStep, heatStep, underCloth, inStripArea, onFace, findPatchSpot,
  roughChance, coldPopIrritation, irritationStart, irritationRise, irritationStep, irritationSoothe,
  wipeReach, autoWipeSeconds, padStartSpot, popStepOver, stripBusy, wipeStripPress, noGooWait, wipeKeyAction, peelStalled,
} from './tool-logic.js';
import { toolInfo, IRRITATION } from '../data/tools.js';
import { slowStep } from './perf-logic.js';
import {
  canSqueeze, squeezeCandidate, closeAmount, startDrive, stepDrive, squeezeProgress, squeezeEnd, rememberSqueeze,
  resumes, padSpots, gooDirection, squeakGap, buzzGap,
} from './squeeze-logic.js';
import {
  makeCanvas, drawPimple, drawMark, drawStrand, drawDrop, drawSplat, drawStrip, drawStripDots, drawPad, drawCream,
  drawTweezers, drawFinger, drawCloth, drawWarmBump, drawPatch, drawOuch, drawHorn, drawHair, hairPoints, drawDecoy,
  gooLook, capList,
} from './art.js';
import { popPlan, sprayDrops, glassSpots, stepGlass, throb, outDir, steamStep, steamWisps, CRATER, JUICY_KINDS, lastShow, sprayAim } from './pop-fx.js';
import { mistDrops, eyeAt, slideOffEye, FALL_TIME, HORN_SHOW, hornTarget, hornPuffs } from './pop-fx.js';
import { juicyGoo, drawDome, drawPopped, drawMound, drawFlyer, drawLanded, drawGlassDrop, drawClothSteam, warmGoo } from './pop-fx-art.js';
import { drawHornShow, drawPuff } from './pop-fx-art.js';
import { makeRipple } from './ripple.js';
import { SWAY, TICKLE, SENSITIVE } from '../data/twists.js';
import { swayOffset, swayAmplitude, swayRoom, clampOffset, tickleDue, giggleDrop, giggleBlocks, jerkOffset, ticklishZone, swayView } from './twist-logic.js';

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
 *   stuck on during the wipe, B55), onWarmLift?: () => void (the warm cloth was lifted off, SPEC D37),
 *   onSlow?: () => void (the moving frames stayed slow: an older phone; told once, pop/perf-logic.js),
 *   covered?: () => {x: number, y: number, w: number, h: number}[] (boxes of controls over the scene; the wipe pad
 *   waits clear of them),
 *   onView?: (view: {z: number, x: number, y: number}) => void (the zoom view changed, T1.4),
 *   irritation?: {rise: number, drain: number} (how touchy the customer is, T3.1b; 1 and 1 = normal),
 *   squeeze?: boolean (two fingers round a bump squeeze it, T1.7; off = two fingers always zoom),
 *   zoom?: boolean (false = no zooming at all, only the whole face: the torchlight dark, B28),
 *   twist?: string|null (the customer's twist, T8.3: 'fidgety', 'ticklish' or 'sensitive'; anything else = none),
 *   onGiggle?: (at: {x: number, y: number}) => void (the ticklish customer giggled at this bump, scene px),
 *   refuse?: (p: object) => void (the husband in armor, ch 2: the first pop is NOT done, popping stops and this is told which bump),
 *   gloves?: boolean (she owns the gloves, SPEC D32e: the squeezing fingertips are drawn in blue rubber gloves),
 *   juicy?: boolean (the juicy pop, SPEC D45; false or left out = the calm pop as before, the "Gentle pops" switch),
 *   lite?: boolean (Lighter graphics: fewer juicy drops, no ripple; it also turns on by itself with onSlow),
 *   grandFirst?: boolean (the first pop of this scene gets the biggest show: Hubby's first pop in chapter 0),
 *   random?: () => number}} o options; onIrritation = the irritation meter changed (T1.2b), random = for the rough-press roll; tool = the tool in hand at the
 *   start, face = the skin oval (the warm cloth goes on there), tools = the usable tools (for the keyboard),
 *   onOw = a wrong-tool press, onWarm = the warmest bump's warmth changed, onPatch = a patch went on, onNote = a press did nothing
 *   useful ('patchFirst' = a patch on a bump that is not popped yet)
 * @returns {object} add(pimples), left(), all(), step(), setTexture(tex), resize(w, h, tex, move), setRatio(r, tex), size(), keyPress(),
 *   setTool(id), tool(), setTools(ids), warmth(), irritation(), halt(), setPaused(on), paused(), dispose(). A bump may carry hold (seconds) and
 *   roughMul (part of the rough-press chance left after mastery, round-logic.js applyMastery).
 */
export function createPopScene(canvas, o) {
  let w = o.width; // changed only by resize()
  let h = o.height;
  let dpr = o.dpr ?? Math.min(2, globalThis.devicePixelRatio || 1); // changed only by setRatio() (lighter graphics, B99(2))
  const reduced = Boolean(o.reduced);
  /** Size factor for goo, pad and tools at a scene size. @param {number} sw width @param {number} sh height @returns {number} factor */
  const sizeFactor = (sw, sh) => Math.max(0.6, Math.min(1.6, Math.min(sw, sh) / 260));
  let scale = sizeFactor(w, h);
  const rand = rng(Math.round(w * 13 + h * 7 + o.pimples.length));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const shownCtx = canvas.getContext('2d'); // the canvas on the screen
  let ctx = shownCtx; // where render() draws: the shown canvas, or the hidden frame while the ripple runs (B114)
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
  let slow = null; // the slow-phone watcher (pop/perf-logic.js slowStep)
  let wasBusy = false; // the last frame asked for the next one (so the gap to this one is a real frame)
  let warmth = 0; // the warm meter: the warmest bump's warmth, 0..1 (each bump has its own, p.warm; SPEC D37)
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
  let paused = false; // true after setPaused(true) (the Field guide is open, B48): no frames, so no time passes at all
  let deferred = []; // jobs that came due while frozen (the wipe start, the done call; D48): run when the scene goes on, so nothing polls meanwhile
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
  const puffs = []; // dust puffs at an Evil Horn's base as it cracks out
  const fxCount = { flinch: 0, eyeSlide: 0, fell: 0, merged: 0 }; // for browser checks: what the splat rules did
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
  const gloves = o.gloves === true; // her blue gloves on the fingertips (SPEC D32e)
  let off = { x: 0, y: 0 };
  let swayK = 0;
  let room = 0;
  let giggleAt = -Infinity;
  let jerk = null; // {x, y}: the way the face jerks after a giggle (away from the pressed bump)
  const skin = twist === 'sensitive' ? SENSITIVE.roughScale : 1; // delicate skin: more rough presses when cold
  // The juicy pop (SPEC D45). juicy = the new pop on (off = "Gentle pops", the calm pop as before); lite = Lighter
  // graphics (fewer drops, no ripple; turns on by itself when the frames stay slow); pops = pops so far (the first may
  // be the grand show); ripple = the see-through ripple; gooLayer = settled juicy goo painted once ({canvas, ctx,
  // dirty}) so dozens of glossy dollops cost one picture a frame; hidden = the frame drawn off screen while the ripple
  // runs; steamK = the warm cloth's steam (0..1).
  const juicy = o.juicy === true;
  let lite = Boolean(o.lite);
  let pops = 0;
  let lastSize = null; // the last pop's show size (popPlan size), for browser checks
  const ripple = makeRipple();
  let gooLayer = null;
  let hidden = null;
  let steamK = 0;
  let steamAt = null; // where the steam rises from: the cloth, or where it was lifted (the steam fades there)
  if (juicy && !reduced && !lite) ripple.warmUp(); // set the ripple's drawing path up now, not at the first pop (B114)

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
  /** The face picture's eyes (scene px, with their lids and lenses; face.js makeFaceLife), none when unknown. @returns {object[]} eyes */
  const eyesNow = () => texture?.faceLife?.eyes ?? [];

  /**
   * Whether a scene point is on bare skin: the face picture's skin mask (face.js skinAt: not on hair, a hat, a helmet
   * or the room), or the skin oval when the picture has no mask.
   * @param {number} x scene x
   * @param {number} y scene y
   * @returns {boolean} true on skin
   */
  function onSkin(x, y) {
    let k = null;
    try { k = texture?.skinAt?.(x, y) ?? null; } catch { k = null; }
    return k === null ? onFace(face, x, y) : k;
  }

  /** She flinches at a goo drop flying at her eye: the eyes snap shut a moment (not with reduced motion or Lighter graphics). @returns {void} */
  function flinch() {
    if (lite) return;
    try { if (faceLife()?.flinch?.(lifeNow())) fxCount.flinch += 1; } catch { /* an older picture without it */ }
  }

  /**
   * While nothing else moves, wake the drawing loop when the face's next blink or glance starts. While the page or
   * the scene is hidden it only looks again now and then (no drawing).
   * @returns {void}
   */
  function planLife() {
    clearTimeout(lifeTimer);
    lifeTimer = 0;
    const life = faceLife();
    if (!life || disposed || paused) return;
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
      const popsNow = due && pressureStep(held.p.pressure, dt, true, effectiveHold(held.p.hold, held.p.tool ?? START_TOOL, held.p.type, held.p.warm ?? 0)) >= 1;
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
    if (raf || disposed || paused) return;
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
   * jerk, T8.3; screen px, so the face moves the same few px at any zoom). Zoomed in, it keeps inside the zoom's own
   * pan limits (twist-logic.js swayView, B52(4)). Without a twist it is the zoom view itself.
   * @returns {{z: number, x: number, y: number}} the view
   */
  function shown() {
    return swayView(view, off, w, h, face);
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
    if (o.zoom === false && next.z > 1 + 1e-6) return; // zoom switched off (the torchlight dark, B28): the whole face only
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
    // The fingertips themselves are drawn later (drawFingertips), over moles, marks and other bumps (owner 2026-10-28).
    const shine = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
    shine.addColorStop(0, `rgba(255,236,228,${(p.sqReach ? 0.36 : 0.22) * Math.min(1, a)})`); // a squeeze shines more
    shine.addColorStop(1, 'rgba(255,236,228,0)');
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2); ctx.fill();
  }

  /**
   * Two fingertips pressing in from both sides of a squeezed bump, drawn after everything that belongs to the skin
   * (moles, freckles, marks, other bumps) so the fingers are always on top. A two-finger squeeze shows ghost pads at
   * the real fingers instead (drawGhostPads).
   * @param {object} p the pimple
   * @param {number} a how hard it is pressed (as for drawWarp)
   * @returns {void}
   */
  function drawFingertips(p, a) {
    if (a <= 0.04 || p.popped || p.sqReach || tweezed(p)) return; // the same bumps drawWarp gave fingers to
    const ax = Math.cos(p.axis);
    const ay = Math.sin(p.axis);
    const reach = (p.r * 1.9) * (1 - 0.2 * a);
    for (const side of [-1, 1]) {
      const fx = p.x + ax * side * (reach + p.r * 0.1);
      const fy = p.y + ay * side * (reach + p.r * 0.1);
      drawFinger(ctx, fx, fy, p.axis + (side < 0 ? Math.PI : 0), Math.max(18, p.r * 1.7), Math.min(1, a * 3), gloves);
      if (p.tool === 'cottonPad') { // a cotton pad wrapped round each fingertip
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 3);
        drawPad(ctx, fx, fy, Math.max(10, p.r * 0.75));
        ctx.restore();
      }
    }
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
  const MAX_SPLATS = 8; // splats and glass drops on the lens (a super zit may raise this for its own splash)
  const MAX_JUICY_DROPS = 70; // juicy drops in the air (a grand pop throws about 30)
  const MAX_JUICY_BLOBS = 180; // juicy goo on the skin (settled goo is painted once into gooLayer, so it costs little)

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
   * @param {{glass?: number, avoid?: object[]}} [opt] glass = this many juicy goo drops on the glass instead of splats
   *   (SPEC D45, pop test G: they hit round the bump, cling, then slide down with a wet trail and fade); power makes
   *   them bigger; avoid = screen circles they keep off (the eyes)
   * @returns {void}
   */
  function splashLens(x, y, goo, power = 1, opt = {}) {
    if (opt.glass > 0) {
      const spots = glassSpots({ n: Math.round(opt.glass), x, y, w, h, scale, power, rand, avoid: opt.avoid });
      for (const s of spots) {
        splats.push({ // v2 (owner 2026-10-31): a lumpy splat that gathers into a fat drop and stick-slips down (pop-fx.js stepGlass fills in the rest)
          glass: true, x: s.x, y: s.y, x0: s.x, y0: s.y, r: s.r, r0: s.r, age: -s.delay, goo, a: 1, born: time,
          lite, still: reduced, W: w, H: h, trail: [],
        });
      }
      capList(splats, Math.max(MAX_SPLATS, spots.length));
      return;
    }
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
   * The goo kind a bump squirts (data/bumps.js): 'white', 'cream', 'gold' or 'horn' (white for the others).
   * @param {object} p the bump
   * @returns {string} the goo kind
   */
  function gooKind(p) {
    const g = bumpInfo(p.type)?.goo;
    return g === 'cream' || g === 'gold' || g === 'horn' ? g : 'white';
  }

  /**
   * Whether a bump gets the juicy look while squeezed and the juicy pop (SPEC D45): the goo kinds, juicy pops on.
   * @param {object} p the bump
   * @returns {boolean} true for a juicy bump
   */
  const juicyBump = (p) => juicy && JUICY_KINDS.includes(p.type);

  /**
   * The juicy bump's dome now (pop test G): its size, tightness, the throb, how much of the creamy head shows, the
   * head's size and the bead of goo at the tip. A whitehead's head always shows, a big one's mostly.
   * @param {object} p the bump
   * @returns {{s: number, pr: number, k: number, head: number, hr: number, bead: number}} the dome
   */
  function domeOf(p) {
    const pr = Math.max(0, Math.min(1, p.pressure));
    const k = reduced ? 0 : throb(p.phase ?? 0) * smooth((pr - 0.12) / 0.3);
    const big = p.type === 'big';
    const s = p.r * (1 + 0.55 * pr + 0.07 * k);
    const hr = s * (big ? 0.4 + 0.28 * pr : 0.5 + 0.2 * pr) * (1 + 0.05 * k);
    const floor = p.type === 'whitehead' ? 1 : big ? 0.8 : 0;
    return { s, pr, k, head: Math.max(floor, smooth(pr / 0.9)), hr, bead: smooth((pr - 0.5) / 0.45) * (1 + 0.3 * k) };
  }

  /**
   * Draw a juicy bump that is not popped yet: the game's own bump at rest, handing over to pop test G's dome as the
   * squeeze starts (tight, shiny, the head showing through, throbbing, a bead of goo at the tip near the end).
   * @param {object} p the bump
   * @returns {void}
   */
  function drawJuicyBump(p) {
    const f = smooth(p.pressure / 0.1);
    if (f < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - f;
      drawPimple(ctx, p, p.pressure, p.appear, time);
      ctx.restore();
    }
    if (f <= 0) return;
    const d = domeOf(p);
    ctx.save();
    ctx.globalAlpha = f;
    drawDome(ctx, p.x, p.y, d.s * p.appear, {
      pr: d.pr, head: d.head, hr: d.hr * p.appear, goo: juicyGoo(gooKind(p)), open: 0, openAng: p.axis + Math.PI / 2, bead: d.bead,
      big: p.type === 'big', red: p.type === 'red',
    });
    ctx.restore();
  }

  /**
   * The juicy pop itself (SPEC D45, pop test G): the dome splits, a goo mound rises out of the opening and slumps (it
   * stays as goo to wipe), a ring of round glossy drops flies out square to the squeeze, the dome sinks into a crater
   * that heals (drawn by render from p.popAt), and the extras: drops on the glass, the ripple, a jolt for the grand show.
   * @param {object} p the bump (popped now)
   * @param {object} plan its pop plan (pop-fx.js popPlan)
   * @param {{s: number, hr: number}} dome the dome at the moment it burst
   * @returns {void}
   */
  function juicyPop(p, plan, dome) {
    const big = p.type === 'big';
    const goo = gooKind(p);
    p.popAt = time;
    p.popS = dome.s;
    p.popHr = dome.hr;
    p.openAng = p.axis + Math.PI / 2;
    const dir = outDir(p.axis, p.x, face ? face.cx : w / 2); // the mound slumps out over the cheek and down
    const R = p.popS * 0.3;
    blobs.push({ juicy: true, mound: true, x: p.x + Math.cos(dir) * R * 1.25, y: p.y + Math.sin(dir) * R * 1.25, r: p.popHr * 0.9, hr: p.popHr, R, dir, big, goo, age: reduced ? 1 : 0 });
    capBlobs();
    // a chin, jaw or nose bump sends its upward drops sideways, off the lips and eyes (D46-33, pop-fx.js sprayAim)
    const aim = face ? sprayAim((p.x - face.cx) / face.rx, (p.y - face.cy) / face.ry) : null;
    for (const d of sprayDrops({ x: p.x, y: p.y, hr: p.popHr, openAng: p.openAng, big, n: plan.drops, scale, goo, reach: plan.reach, aim, rand })) drops.push(d);
    for (const d of mistDrops({ x: p.x, y: p.y, hr: p.popHr, n: plan.mist, scale, goo, reach: plan.reach, rand })) drops.push(d); // a fine mist that vanishes
    capList(drops, MAX_JUICY_DROPS);
    popExtras(p, plan, goo);
    const grand = plan.size === 'grand';
    play('pop_juicy', { big, grand });
    buzz(grand ? [50, 30, 110, 40, 70] : big ? [50, 30, 110] : [30, 20, 50]);
  }

  /**
   * The Evil Horn's show (owner 2026-10-31, pop-fx.js hornPlan): a loud crack, the horn shoots off spinning and sticks
   * in the wall like a dart (hornAt), its base pops open into a soft crater that heals, a big burst of pale horn goo
   * with a mound and a mist, puffs of dust round the base, and the extras: glass drops, the strongest ripple, a jolt.
   * Its game rules (warm cloth, hold, irritation) are the same as before; only the look, feel and sound changed.
   * @param {object} p the horn bump (popped now)
   * @param {object} plan its pop plan
   * @returns {void}
   */
  function hornPop(p, plan) {
    const s = p.r * 1.45; // the bump at full squeeze (drawPimple), so the flying horn starts the size it was
    const hr = s * 1.65 * 1.06;
    const len = hr * 1.3;
    const x = p.x;
    const y = p.y + s * 0.1;
    let boxes = [];
    try { boxes = o.covered?.() ?? []; } catch { boxes = []; }
    const v = shown(); // the buttons' boxes are screen px: into scene px for the target
    const avoid = boxes.map((b) => { const a = screenToScene(v, b.x, b.y); const c = screenToScene(v, b.x + b.w, b.y + b.h); return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y }; });
    const aim = hornTarget({ x, y, len, w, h, face, avoid }); // it sticks in the wall, never behind a button
    horns.push({ x, y, r: hr, len, t: 0, spin: aim.x >= x ? 1 : -1, show: true, calm: reduced, lite, aimX: aim.x, aimY: aim.y, aimA: aim.a, hit: false });
    const goo = 'horn';
    p.popAt = time; // its base pops open and sinks into a soft crater that heals (drawPopped)
    p.popS = s * 0.85;
    p.popHr = p.r * 0.5;
    p.openAng = 0;
    const dir = outDir(p.axis ?? 0, p.x, face ? face.cx : w / 2);
    const R = p.popS * 0.3;
    blobs.push({ juicy: true, mound: true, x: p.x + Math.cos(dir) * R * 1.25, y: p.y + Math.sin(dir) * R * 1.25, r: p.popHr * 0.9, hr: p.popHr, R, dir, big: true, goo, age: reduced ? 1 : 0 });
    capBlobs();
    const steer = face ? sprayAim((p.x - face.cx) / face.rx, (p.y - face.cy) / face.ry) : null;
    for (const d of sprayDrops({ x: p.x, y: p.y, hr: p.popHr, openAng: (p.axis ?? 0) + Math.PI / 2, big: true, n: plan.drops, scale, goo, reach: plan.reach, aim: steer, rand })) drops.push(d);
    for (const d of mistDrops({ x: p.x, y: p.y, hr: p.popHr, n: plan.mist, scale, goo, reach: plan.reach, rand })) drops.push(d);
    capList(drops, MAX_JUICY_DROPS);
    for (const pf of hornPuffs({ x: p.x, y: p.y + p.r * 0.2, r: p.r, n: plan.puffs, rand })) puffs.push(pf);
    popExtras(p, plan, goo);
    play('horn_crack', { calm: reduced });
    buzz(reduced ? [30, 20, 60] : [45, 25, 110, 60, 30, 40, 70]);
  }

  /**
   * A juicy drop settles on the skin: as its own splat (a fatter one may get a drip run, when there is skin below it),
   * or, when it lands on a splat of the same burst, merged into that one as one puddle (at most four drops each).
   * @param {object} d the drop
   * @returns {void}
   */
  function landJuicy(d) {
    const near = blobs.find((b) => b.juicy && !b.mound && !b.baked && (b.parts?.length ?? 1) < 4 && Math.hypot(b.x - d.x, b.y - d.y) < (b.r + d.r) * 0.9);
    if (near) {
      if (!near.parts) near.parts = [{ dx: 0, dy: 0, k: 1 }];
      near.parts.push({ dx: (d.x - near.x) / near.r, dy: (d.y - near.y) / near.r, k: d.r / near.r });
      fxCount.merged += 1;
      return;
    }
    const drip = d.r > 6 * scale && rand() < 0.5 && onSkin(d.x, d.y + d.r * 2.6) ? 0.9 + rand() * 0.9 : 0; // some fat ones run a little
    blobs.push({ juicy: true, x: d.x, y: d.y, r: d.r, goo: d.goo, age: reduced ? 1 : 0, sa: Math.atan2(d.vy, d.vx), seed: rand(), drip });
    capBlobs();
  }

  /**
   * Just before a flying juicy drop lands: if it is coming down on an eye, she flinches now (a real flinch comes
   * before the hit). Checked once per drop.
   * @param {object} d the drop
   * @returns {void}
   */
  function watchEye(d) {
    if (d.watched || d.mist || d.vz >= 0) return;
    const tl = (d.vz + Math.sqrt(d.vz * d.vz + 1400 * Math.max(0, d.z))) / 700; // seconds to the landing
    if (tl > 0.12) return;
    d.watched = true;
    if (eyeAt(eyesNow(), d.x + d.vx * tl, d.y + d.vy * tl, d.r)) flinch();
  }

  /**
   * The pop's extras from its plan (SPEC D45): goo drops on the screen glass round the bump (merged with the lens
   * splats), the see-through ripple, and a short jolt of the picture for the grand show (never with reduced motion).
   * @param {object} p the bump
   * @param {object} plan its pop plan (pop-fx.js popPlan)
   * @param {string} [goo] the goo kind (the bump's own when left out)
   * @returns {void}
   */
  function popExtras(p, plan, goo = gooKind(p)) {
    if (plan.glass > 0) {
      const v = shown();
      const at = sceneToScreen(v, p.x, p.y); // the glass is in front of the zoom: screen px
      const avoid = eyesNow().map((e) => { const q = sceneToScreen(v, e.x, e.y); return { x: q.x, y: q.y, r: Math.max(e.rx, e.ry) * v.z }; });
      splashLens(at.x, at.y, goo, 1, { glass: plan.glass, avoid }); // never over an eye (owner 2026-10-31)
    }
    if (plan.ripple) ripple.start(p.x, p.y, time, { ...plan.ripple, far: Math.min(w, h) * plan.ripple.far, r0: p.r });
    if (plan.jolt > 0 && !reduced && (quake < 0 || quakeK < plan.jolt)) { quake = time; quakeK = plan.jolt; }
  }

  /** Keep the landed goo under its cap (more for juicy goo); the painted goo layer is redone when old goo goes. @returns {void} */
  function capBlobs() {
    if (capList(blobs, juicy ? MAX_JUICY_BLOBS : MAX_BLOBS) && gooLayer) gooLayer.dirty = true;
  }

  /**
   * Draw one bit of goo: the game's drop (flying or landed), or a juicy one (a flying ball, a landed dollop with its
   * specks, or the goo mound).
   * @param {CanvasRenderingContext2D} c context
   * @param {object} d the drop or blob
   * @returns {void}
   */
  function drawAnyDrop(c, d) {
    if (!d.juicy) drawDrop(c, d);
    else if (d.mound) drawMound(c, d);
    else if ((d.z ?? 0) > 0 || d.fall !== undefined || d.slideTo !== undefined) drawFlyer(c, d, scale);
    else drawLanded(c, d);
  }

  /**
   * Paint settled juicy goo into the goo layer once (a picture the size of the scene), so dozens of glossy dollops cost
   * one picture a frame; when old goo was dropped or everything moved, the layer is painted again from the start.
   * @returns {void}
   */
  function bakeGoo() {
    if (!juicy) return;
    /** Whether a bit of juicy goo has settled and is not painted yet. @param {object} b a landed blob @returns {boolean} yes */
    const ready = (b) => b.juicy && !b.baked && (b.age ?? 1) >= (b.mound ? 0.8 : b.drip ? 1 : 0.6); // a drip run creeps down until 1 s
    if (!gooLayer && !blobs.some(ready)) return;
    if (!gooLayer || gooLayer.canvas.width !== Math.round(w * dpr) || gooLayer.canvas.height !== Math.round(h * dpr)) {
      gooLayer = { ...makeCanvas(w, h, dpr), dirty: true, any: false };
    }
    if (gooLayer.dirty) {
      gooLayer.ctx.setTransform(1, 0, 0, 1, 0, 0);
      gooLayer.ctx.clearRect(0, 0, gooLayer.canvas.width, gooLayer.canvas.height);
      gooLayer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const b of blobs) b.baked = false;
      gooLayer.dirty = false;
      gooLayer.any = false;
      gooLayer.box = null;
    }
    for (const b of blobs) {
      if (!ready(b)) continue;
      drawAnyDrop(gooLayer.ctx, b);
      b.baked = true;
      gooLayer.any = true;
      // how far it reaches, with its specks, shadow, drip run and merged parts
      const e = b.mound ? b.hr * 2.2 : b.r * (3.2 + (b.drip ?? 0) + Math.max(0, ...(b.parts ?? []).map((q) => Math.hypot(q.dx, q.dy) + q.k)));
      const bx = gooLayer.box;
      gooLayer.box = bx
        ? { x0: Math.min(bx.x0, b.x - e), y0: Math.min(bx.y0, b.y - e), x1: Math.max(bx.x1, b.x + e), y1: Math.max(bx.y1, b.y + e) }
        : { x0: b.x - e, y0: b.y - e, x1: b.x + e, y1: b.y + e };
    }
  }

  /**
   * Draw the painted juicy goo layer: only the part that has goo on it (a smaller copy is quicker on slow phones).
   * @param {CanvasRenderingContext2D} c the context (scene px through the zoom view)
   * @returns {void}
   */
  function drawGooLayer(c) {
    if (!gooLayer?.any || !gooLayer.box) return;
    const b = gooLayer.box;
    const x0 = Math.max(0, Math.floor(b.x0));
    const y0 = Math.max(0, Math.floor(b.y0));
    const x1 = Math.min(w, Math.ceil(b.x1));
    const y1 = Math.min(h, Math.ceil(b.y1));
    if (x1 <= x0 || y1 <= y0) return;
    const sw = Math.min(gooLayer.canvas.width - x0 * dpr, (x1 - x0) * dpr);
    const sh = Math.min(gooLayer.canvas.height - y0 * dpr, (y1 - y0) * dpr);
    if (sw > 0 && sh > 0) c.drawImage(gooLayer.canvas, x0 * dpr, y0 * dpr, sw, sh, x0, y0, sw / dpr, sh / dpr);
  }

  /**
   * The hidden canvas the frame is drawn on while the ripple runs (the size of the shown one; made once, made again
   * when the size changes), B114.
   * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} it
   */
  function hiddenFrame() {
    if (!hidden || hidden.canvas.width !== canvas.width || hidden.canvas.height !== canvas.height) {
      const c = hidden?.canvas ?? document.createElement('canvas');
      c.width = canvas.width;
      c.height = canvas.height;
      hidden = { canvas: c, ctx: c.getContext('2d') };
    }
    return hidden;
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
    // Which pop it gets (SPEC D45, pop-fx.js): the grand show for the last goo bump of a face (only blackheads and hairs
    // left after it counts too, D46-32) and a grandFirst scene's first pop (Hubby in chapter 0, D46-26).
    const left0 = pimples.filter((q) => q !== p && !q.popped).map((q) => q.type);
    const plan = popPlan({ type: p.type, last: lastShow(p.type, left0), first: o.grandFirst === true && pops === 0, gentle: !juicy, reduced, lite });
    lastSize = plan.size; // for browser checks (popFx show)
    const dome = plan.style === 'juicy' ? domeOf(p) : null; // the dome as it was at the moment it burst
    pops += 1;
    if (keyHold?.p !== p) { // a pop by pointer: a cold bump irritates the skin; the cotton pad soothes (the keyboard is gentle)
      // B72: the pop that clears the face stops the meter just under full, so a customer whose every bump is out
      // never storms off in that same moment (that counted as a fail with no pay, even with no Ow at all).
      const last = pimples.every((q) => q === p || q.popped);
      raiseIrritation(coldPopIrritation(p.tool ?? START_TOOL, p.type, p.warm ?? 0) * (p.roughMul ?? 1), last, irrScale.cold);
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
    } else if (horned(p) && plan.horn) { // the Evil Horn's big show (owner 2026-10-31): a crack, off it shoots into the wall
      hornPop(p, plan);
    } else if (horned(p)) { // Gentle pops: the Evil Horn creaks out, flies off with a dab of pale goo, and the picture wobbles
      horns.push({ x: p.x, y: p.y, r: p.r * 1.65, t: 0, spin: rand() < 0.5 ? -1 : 1 });
      squirt(p);
      play('creak');
      buzz([18, 30, 18, 30, 40]);
      if (!reduced) { quake = time; quakeK = 1; }
      popExtras(p, plan);
    } else if (plan.style === 'juicy') {
      juicyPop(p, plan, dome);
    } else {
      squirt(p);
      play(p.type === 'big' ? 'pop_big' : p.type === 'gold' ? 'pop_gold' : 'pop_small');
      buzz(p.type === 'big' ? [30, 40, 50] : 24);
      popExtras(p, plan);
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
      if (disposed || step !== 'pop' || halted) return; // halted (a special mode's scripted end, B28): no wipe step
      if (paused) { deferred.push(start); return; } // frozen (D48): look again when the scene goes on, no polling meanwhile
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

  /**
   * Put all the goo on its own layer so the pad can wipe it off; count how much there is. No goo at all: straight to
   * the cream, unless the nose strip is still on the face (B61(1)): then a wipe with nothing to wipe waits a few
   * seconds (tool-logic.js noGooWait) so she can still stick and peel it, as on other faces.
   * @returns {void}
   */
  function beginWipe() {
    const wait = noGooWait(strip);
    if (!strands.length && !blobs.length && !wait) { beginCream(); return; }
    const { canvas: dirt, ctx: dc } = makeCanvas(w, h, dpr);
    for (const s of strands) drawStrand(dc, s);
    bakeGoo(); // juicy goo that has settled comes from its painted layer in one copy (quicker than painting it again)
    drawGooLayer(dc);
    for (const b of blobs) if (!b.baked) drawAnyDrop(dc, b);
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
    gooLayer = null; // the juicy goo is on the wipe's layer now
    const { cells, cols, rows, count } = found;
    const corner = 40 * scale * wipeReach(tool); // the pad waits in the bottom corner (further in when it is the big one)
    let covered = [];
    try { covered = o.covered?.() ?? []; } catch (e) { console.warn('covered failed:', e); }
    // ...but never behind the tool bar or other buttons (B13 round 2c); the boxes are screen px, so it is found in screen px (B43a).
    const pad = padStartSpot(shown(), w, h, 26 * scale * wipeReach(tool), corner, covered);
    // No goo cell on the scene at all (it all flew off): nothing to wipe, the wipe fades out by itself (B71), after
    // the strip's wait when it is still on (B61(1), see update).
    const empty = count === 0;
    wipe = { dirt, dc, cells, cols, rows, dirty: Math.max(1, count), clean: 0, pad, last: null, id: null, auto: null, fade: empty && !wait ? 0.0001 : 0, wait: empty ? wait : 0 };
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
    for (const p of pimples) mv(p, ['r', 'r0', 'rMax', 'popS', 'popHr']); // popS, popHr: a juicy crater healing
    for (const k of marks) mv(k);
    for (const hn of horns) {
      mv(hn, ['r', 'len']);
      if (hn.show) { hn.aimX = hn.aimX * s + tx; hn.aimY = hn.aimY * s + ty; } // where it sticks in the wall moves too
    }
    for (const pf of puffs) mv(pf, ['r', 'vx', 'vy']);
    for (const hr of hairs) mv(hr, ['reach']);
    for (const pa of patches) mv(pa);
    for (const d of decoys) mv(d);
    if (face) Object.assign(face, { cx: face.cx * s + tx, cy: face.cy * s + ty, rx: face.rx * s, ry: face.ry * s });
    setView(refitView(view, oldW, oldH, m, w, h, face)); // keep the zoom on the same spot of the face (T1.4)
    if (pinch) pinch = null; // a pinch across a turn starts over
    if (squeeze) { resetSqueeze(); stale = touches.size > 0; } // so does a squeeze (it springs back)
    forget();
    if (warmHold) mv(warmHold, []);
    if (steamAt) mv(steamAt, []);
    for (const st of strands) {
      mv(st, ['len', 'max', 'speed', 'w']);
      st.curl /= s; // the same bend over the longer or shorter worm
      st.sag /= s;
      for (const pt of st.pts) mv(pt, []);
    }
    for (const d of drops) mv(d, ['vx', 'vy', 'r']);
    for (const b of blobs) mv(b, ['r', 'hr', 'R']); // hr, R: the juicy goo mound
    if (gooLayer) gooLayer.dirty = true; // the painted juicy goo is painted again in its new places
    for (const sp of splats) {
      mv(sp, ['r', 'drip', 'r0']);
      if (sp.glass) { // a drop on the glass: where it hit and its trail move too
        sp.x0 = sp.x0 * s + tx;
        sp.y0 = sp.y0 * s + ty;
        for (const pt of sp.trail) mv(pt, []);
      }
    }
    ripple.clear(); // a ripple across a turn just stops
    if (juicy && !reduced && !lite) ripple.warmUp(); // and the new canvas size gets its path set up (B114)
    for (const tw of tweezers) mv(tw);
    if (strip) {
      mv(strip, ['w', 'h']);
      for (const d of strip.dots) mv(d, []);
    }
    if (peel) peel.x0 = peel.x0 * s + tx;
    if (cream) for (const d of cream.dollops) mv(d);
    measureRoom(); // the sway's room on the new size (T8.3)
    if (wipe) {
      redrawGoo(oldW, oldH, m);
      mv(wipe.pad, []);
    }
    render();
    kick();
  }

  /**
   * Redraw the wipe's goo layer at the scene size and pixel ratio now (moved by m from the old size) and count again
   * what is left; the share already wiped is kept. Used by resize() and setRatio().
   * @param {number} oldW the old scene width @param {number} oldH the old scene height
   * @param {{s: number, tx: number, ty: number}} m the move (see resize)
   * @returns {void}
   */
  function redrawGoo(oldW, oldH, m) {
    const { s, tx, ty } = m;
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
    if (found.count === 0 && !wipe.fade && !wipe.wait) wipe.fade = 0.0001; // a no-goo wipe still waits for the strip (B61(1))
  }

  /**
   * Draw the scene at another pixel ratio from now on (lighter graphics switched on by itself in the middle of a face,
   * B99(2): before, only the next face got them). The canvas, the face picture (painted again by the caller at the
   * new ratio) and a wipe's goo layer change; nothing else does, so a squeeze, pinch or peel going on carries on.
   * @param {number} ratio the new pixel ratio (1 = lighter graphics)
   * @param {HTMLCanvasElement} [tex] the face picture at that ratio
   * @returns {void}
   */
  function setRatio(ratio, tex) {
    if (!(ratio > 0) || ratio === dpr || disposed) return;
    dpr = ratio;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (tex) texture = tex;
    if (wipe) redrawGoo(w, h, { s: 1, tx: 0, ty: 0 });
    if (gooLayer) gooLayer.dirty = true; // the painted juicy goo at the new sharpness (bakeGoo makes it again)
    kick();
    if (!raf) render();
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
        else if (keyHold?.p !== p || hold?.p === p) p.pressure = pressureStep(p.pressure, dt, hold?.p === p, effectiveHold(p.hold, p.tool ?? START_TOOL, p.type, p.warm ?? 0));
        for (const th of [0.3, 0.6, 0.85]) {
          const key = `${p.id}:${th}`;
          if (before < th && p.pressure >= th && !warnedThresholds.has(key)) { warnedThresholds.add(key); play('squish', { level: th }); buzz(6); }
          if (p.pressure < th - 0.15) warnedThresholds.delete(key);
        }
        if (!p.popped && held && juicyBump(p) && p.pressure > 0.12) { // the juicy dome throbs, faster as it fills, a soft blub each time
          const beat = Math.floor(p.phase ?? 0);
          p.phase = (p.phase ?? 0) + dt * (1.3 + 4.2 * p.pressure);
          if (!reduced && Math.floor(p.phase) > beat) play('blub', { level: p.pressure });
        }
        if (!p.popped && held && juicy && horned(p) && p.pressure > 0.1) { // the Evil Horn creaks faster and higher as it is squeezed
          const beat = Math.floor(p.creakPh ?? 0);
          p.creakPh = (p.creakPh ?? 0) + dt * (1.2 + 6.5 * p.pressure * p.pressure);
          if (Math.floor(p.creakPh) > beat) play('creak', { tick: true, level: p.pressure });
        }
        if (p.pressure >= 1) pop(p);
        if (held || (p.pressure > 0 && keyHold?.p !== p)) busy = true;
      }
      if (p.popAt !== undefined && time - p.popAt < CRATER.gone + 0.1) busy = true; // a juicy crater healing
      if (p.wob || p.wobV) {
        p.wobV += (-190 * p.wob - 9 * p.wobV) * dt;
        p.wob += p.wobV * dt;
        if (Math.abs(p.wob) < 0.008 && Math.abs(p.wobV) < 0.05) { p.wob = 0; p.wobV = 0; } else busy = true;
      }
      if (p.type === 'gold' && !p.popped && !reduced) busy = true; // it twinkles
      if (p.ouch !== undefined && time - p.ouch < 0.7) busy = true; // ouch lines after an Ow
    }
    if (decoys.some((d) => d.ouch !== undefined && time - d.ouch < 0.7)) busy = true; // ouch lines round a pressed mole
    // The warm cloth (SPEC D37): each bump under it warms up, the others slowly cool. A bump that just got fully warm
    // gives a little buzz and a puff of steam. The meter on the button shows the warmest bump.
    const warmBefore = warmth;
    let warmest = 0;
    let hotOw = false; // one too-hot Ow per moment
    for (const p of pimples) {
      if (p.popped) continue;
      const on = Boolean(warmHold) && step === 'pop' && underCloth(warmHold, p, 34 * scale);
      const before = p.warm ?? 0;
      p.warm = warmStep(before, dt, on);
      if (on && before < 1 && p.warm >= 1) { p.warmAt = time; buzz(14); play('wipe'); }
      p.heat = heatStep(p.heat, dt, on && before >= 1); // left on a warm bump: it gets too hot (SPEC D41)
      if (p.heat >= 1) { // "Ow, too hot!" once, even with two bumps under the cloth; still hot, so staying on means another
        p.heat = 0.35;
        if (!hotOw) ow(p, { hot: true });
        hotOw = true;
      }
      warmest = Math.max(warmest, p.warm);
    }
    warmth = warmest;
    if (warmth > 0 || warmHold) busy = true;
    // Steam from the warm cloth (SPEC D45 item 5): it rises while the cloth is on a bump, stronger as the bump warms,
    // and fades where the cloth was when it is lifted or moved off.
    const steamOn = warmHold && step === 'pop' ? pimples.filter((p) => !p.popped && underCloth(warmHold, p, 34 * scale)) : [];
    steamK = steamStep(steamK, dt, steamOn.length ? Math.max(0.01, ...steamOn.map((p) => p.warm ?? 0)) : 0);
    if (warmHold) steamAt = { x: warmHold.x, y: warmHold.y };
    if (steamK > 0) busy = true;
    // The irritation meter calms by itself after a quiet while, faster with the warm cloth on the face or after a cotton pad.
    if (step === 'pop' && irr.level > 0) {
      const soothing = Boolean(warmHold) && onFace(face, warmHold.x, warmHold.y);
      irr = irritationStep(irr, dt, { warm: soothing, drain: irrScale.drain, calmDelay: irrScale.calm });
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
      // A juicy drop (pop test G): it slows in the air, falls and lands on the skin. One that missed the skin (room,
      // hair, a hat) slides down off it and fades; one flying at an eye makes her flinch and slides off the shut eye
      // down the cheek (owner 2026-10-31); the mist just vanishes where it lands.
      if (d.juicy) {
        if (d.fall !== undefined) {
          d.fall += dt;
          d.vy += 600 * scale * dt;
          d.y += d.vy * dt;
          if (d.fall > FALL_TIME) drops.splice(i, 1);
          continue;
        }
        if (d.slideTo !== undefined) { // sliding off a shut eye, down the cheek
          d.vy = Math.min(d.vy + 900 * scale * dt, 300 * scale);
          d.y += d.vy * dt;
          if (d.y < d.slideTo) continue;
          d.slideTo = undefined;
          if (onSkin(d.x, d.y)) { drops.splice(i, 1); landJuicy(d); } else d.fall = 0;
          continue;
        }
        const drag = Math.exp(-dt * 2.4);
        d.vx *= drag;
        d.vy *= drag;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vz -= 700 * dt;
        d.z += d.vz * dt;
        if (d.z > 0) { watchEye(d); continue; }
        if (d.mist) { drops.splice(i, 1); continue; }
        const eye = eyeAt(eyesNow(), d.x, d.y, d.r);
        if (eye) { // no goo settles on an eye: she blinks it away (with reduced motion it is simply gone)
          flinch();
          fxCount.eyeSlide += 1;
          if (reduced) { drops.splice(i, 1); continue; }
          Object.assign(d, { z: 0, vz: 0, vx: 0, vy: 50 * scale, slideTo: slideOffEye(eye, d.r) });
          continue;
        }
        if (onSkin(d.x, d.y)) {
          drops.splice(i, 1);
          landJuicy(d);
        } else { d.fall = 0; d.z = 0; d.vz = 0; d.vx *= 0.3; d.vy = 40 * scale; fxCount.fell += 1; }
        continue;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vz -= 700 * dt;
      d.z += d.vz * dt;
      if (d.z <= 0) { // it lands: squash, then a short slide that leaves a tiny smear (sa = the slide's direction)
        drops.splice(i, 1);
        if (juicy && (!onSkin(d.x, d.y) || eyeAt(eyesNow(), d.x, d.y, d.r))) continue; // juicy pops on: none off the skin or on an eye
        blobs.push({ x: d.x, y: d.y, r: d.r, gold: d.gold, goo: d.goo, age: 0, sa: Math.atan2(d.vy, d.vx) });
        capBlobs();
      }
    }
    for (const b of blobs) { // the landing squash settles in a third of a second (a juicy dollop's wobble and the mound a little longer)
      if (b.age === undefined || b.age >= (b.juicy ? 1 : 0.4)) continue;
      b.age = reduced ? 1 : b.age + dt;
      busy = true;
    }
    for (let i = splats.length - 1; i >= 0; i -= 1) {
      const s = splats[i];
      busy = true;
      if (s.glass) { // a juicy drop on the glass: clings, slides down, fades (pop-fx.js stepGlass)
        if (!stepGlass(s, dt, scale)) splats.splice(i, 1);
        continue;
      }
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
      const hn = horns[i];
      hn.t += dt;
      busy = true;
      if (hn.show && !hn.calm && !hn.hit && hn.t >= HORN_SHOW.fly) { // thwack: it sticks in the wall (a second, smaller jolt)
        hn.hit = true;
        if (!reduced) { quake = time; quakeK = 0.55; }
        buzz(30);
      }
      if (hn.t > (hn.show && !hn.calm ? HORN_SHOW.gone : 1.1)) horns.splice(i, 1);
    }
    for (let i = puffs.length - 1; i >= 0; i -= 1) { // the horn's dust puffs drift out, slowing (they only fade with reduced motion)
      const pf = puffs[i];
      pf.t += dt;
      busy = true;
      if (!reduced) {
        const k = Math.exp(-dt * 3.2);
        pf.vx *= k;
        pf.vy *= k;
        pf.x += pf.vx * dt;
        pf.y += pf.vy * dt;
      }
      if (pf.t >= pf.life) puffs.splice(i, 1);
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
      if (wipe.wait && !wipe.fade && !wipe.auto) { // no goo to wipe: wait a moment for the nose strip (B61(1))
        busy = true;
        wipe.wait = Math.max(0, wipe.wait - dt);
        if (!wipe.wait || !strip || strip.off) { wipe.wait = 0; wipe.fade = 0.0001; }
      }
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
        // A finger kept still on the strip lets go after a moment, so it never keeps the cream waiting (B61(4)).
        if (wipe.fade >= 1 && peel && peelStalled(time - (peel.at ?? time))) peel = null;
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
        /** Tell the controller the face is done (waits while the scene is frozen, D48). @returns {void} */
        const sayDone = () => { if (disposed) return; if (paused) { deferred.push(sayDone); return; } o.onDone?.(); };
        setTimeout(sayDone, 350);
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

  /**
   * Draw the whole scene once. While the juicy pop's ripple runs, the frame is drawn on a hidden canvas, copied onto
   * the shown one in one go and then bent there (B114: never read the shown canvas half way through a frame); the
   * lens (splats and glass drops) goes on last, over the bend.
   * @returns {void}
   */
  function render() {
    bakeGoo(); // settled juicy goo into its painted layer
    const off = ripple.busy() ? hiddenFrame() : null;
    ctx = off ? off.ctx : shownCtx;
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
      const beat = !p.popped && juicyBump(p) && p.pressure > 0.12 ? domeOf(p).k * 0.1 : 0; // the juicy dome's throb pushes the skin
      if (!tweezed(p) && Math.abs(a) > 0.01) drawWarp(p, a + shake + beat, !p.popped);
    }
    faceLife()?.draw(ctx, lifeNow()); // the blinking, glancing eyes over the picture (only while they move, T8.1)
    for (const p of pimples) { // a warm bump glows pink and steams (SPEC D37); a ring when it just got fully warm
      if (!p.popped && (p.warm ?? 0) > 0.01) drawWarmBump(ctx, p.x, p.y, p.r, p.warm, reduced ? 0 : time, p.warmAt === undefined ? Infinity : time - p.warmAt, p.heat ?? 0);
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
    for (const p of pimples) {
      if (p.popped) continue;
      if (juicyBump(p)) drawJuicyBump(p); // the juicy dome while squeezed (SPEC D45)
      else if (horned(p)) drawPimple(ctx, p, p.pressure, p.appear, reduced ? 0 : time, juicy); // its tense build-up (juicy pops)
      else drawPimple(ctx, p, p.pressure, p.appear, time);
    }
    for (const p of pimples) { // a juicy bump just popped: the split dome sinking into a crater that heals (about 2 s)
      if (p.popped && p.popAt !== undefined && time - p.popAt < CRATER.gone) drawPopped(ctx, p, time - p.popAt, juicyGoo(gooKind(p)));
    }
    for (const s of strands) drawStrand(ctx, s);
    drawGooLayer(ctx); // settled juicy goo, painted once (bakeGoo)
    for (const b of blobs) if (!b.baked) drawAnyDrop(ctx, b);
    for (const p of pimples) { // the squeezing fingertips, over the skin's moles, marks and the other bumps
      const shake = !reduced && !p.popped && p.pressure > 0.8 ? Math.sin(time * 70) * 0.03 : 0;
      drawFingertips(p, (p.popped ? 0 : p.pressure) + p.wob + shake);
    }
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
    for (const pf of puffs) drawPuff(ctx, pf); // dust puffs round an Evil Horn's base
    for (const hn of horns) { // an Evil Horn that creaked out: it pops up, tumbles away and fades (its big show: drawHornShow)
      if (hn.show) { drawHornShow(ctx, hn); continue; }
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
    for (const d of drops) drawAnyDrop(ctx, d);
    if (warmHold) { // the cloth shows the heat of the hottest bump under it (SPEC D41: the bump itself is hidden)
      const heat = Math.max(0, ...pimples.filter((p) => !p.popped && underCloth(warmHold, p, 34 * scale)).map((p) => p.heat ?? 0));
      drawCloth(ctx, warmHold.x, warmHold.y, 34 * scale, reduced ? 0 : time, heat);
    }
    if (steamK > 0.01 && steamAt) { // soft steam wisps curling up from the cloth (D45 item 5; still with reduced motion)
      drawClothSteam(ctx, steamAt.x, steamAt.y, 34 * scale, reduced ? 1.7 : time, steamK, steamWisps(lite, reduced), lite);
    }
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
    ctx = shownCtx;
    if (off) { // the finished frame onto the shown canvas in one copy, then the ripple bends it
      shownCtx.setTransform(1, 0, 0, 1, 0, 0);
      shownCtx.globalCompositeOperation = 'copy';
      shownCtx.drawImage(off.canvas, 0, 0);
      shownCtx.globalCompositeOperation = 'source-over';
      ripple.draw(shownCtx, off.canvas, time, { at: (x, y) => sceneToScreen(shown(), x, y), z: shown().z, dpr });
    }
    if (splats.length) { // the lens is in front of the zoom: splats and glass drops are drawn in screen px
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of splats) {
        if (s.glass) drawGlassDrop(ctx, s);
        else if (time >= s.born) drawSplat(ctx, s);
      }
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
    if (disposed || paused) return;
    if (wasBusy && !slow?.slow) { // the slow-phone watcher counts back-to-back moving frames only
      slow = slowStep(slow, now - last);
      if (slow.slow) {
        lite = true; // the juicy pop gets lighter too: fewer drops, no ripple (SPEC D45)
        try { o.onSlow?.(); } catch (e) { console.warn('onSlow failed:', e); }
      }
    }
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    const busy = update(dt) || Boolean(faceLife()?.busy(lifeNow())); // a blink or glance keeps it going too (T8.1)
    render();
    wasBusy = busy;
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
   * the irritation rise, and the controller is told. Also the warm cloth left too long on a warm bump (SPEC D41).
   * @param {object} p the bump or decoy (type 'decoy')
   * @param {{hot?: boolean}} [why] hot = it was the warm cloth, too hot (the bubble says so)
   * @returns {void}
   */
  function ow(p, why = {}) {
    p.ouch = time;
    raiseIrritation(IRRITATION.perOw * (twist === 'sensitive' ? SENSITIVE.owScale : 1)); // delicate skin minds an Ow more (T8.3)
    play('ow_customer');
    if (why.hot) play('sizzle'); // the too-hot cloth hisses along with the Ow (B101)
    buzz([20, 40, 20]);
    try { o.onOw?.({ x: p.x, y: p.y, type: p.type, tool, id: p.id, hot: Boolean(why.hot) }); } catch (e) { console.warn('onOw failed:', e); }
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
    if (onStrip && strip.stuck) { peel = { id: e.pointerId, x0: pt.x, q0: strip.q, at: time }; return true; } // any tool peels
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
    if (!pressAgain(p) && roll() < roughChance(tool, p.type, p.warm ?? 0, irr.level, skin) * (p.roughMul ?? 1)) { ow(p); return false; } // a rough press on a cold bump (mastery lowers it; delicate skin raises it, T8.3)
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
      peel = { id: e.pointerId, x0: pt.x, q0: strip.q, at: time }; // at = when it last moved the strip (B61(4))
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
      if (!pressAgain(p) && roll() < roughChance(tool, p.type, p.warm ?? 0, irr.level, skin) * (p.roughMul ?? 1)) { ow(p); return; } // as for a press
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
    const hold = effectiveHold(p.hold, p.tool ?? START_TOOL, p.type, p.warm ?? 0);
    sq.drive =stepDrive(sq.drive, dt, closeAmount(sq.d0, d), hold);
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
   * screen px, over the face. Blue when she owns the gloves (B92), like the one-finger fingertips.
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
      if (gloves) { // B92: in her blue rubber gloves, like the fingertips (drawFinger's glove colours)
        g.addColorStop(0, `rgba(154,217,247,${0.22 + 0.14 * pr})`);
        g.addColorStop(0.65, `rgba(116,194,234,${0.38 + 0.16 * pr})`);
        g.addColorStop(1, 'rgba(77,159,204,0.15)');
      } else {
        g.addColorStop(0, `rgba(255,242,234,${0.16 + 0.14 * pr})`);
        g.addColorStop(0.65, `rgba(255,220,204,${0.3 + 0.16 * pr})`);
        g.addColorStop(1, 'rgba(255,212,192,0.1)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * squash, R * (1 + 0.1 * pr), 0, 0, Math.PI * 2); // flattened against the bump
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.35 * pr})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = gloves ? `rgba(40,110,150,${0.25 + 0.35 * pr})` : `rgba(150,70,55,${0.25 + 0.35 * pr})`; // the pressing edge, on the side facing the bump
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const edge = dir > 0 ? 0 : Math.PI;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * squash * 0.72, R * 0.8, 0, edge - 0.7, edge + 0.7);
      ctx.stroke();
      if (p.tool === 'cottonPad') drawPad(ctx, 0, 0, R * 0.85); // with the cotton pad: a pad on each fingertip (D43)
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
      warmHold.x = pt.x; // the cloth goes where the finger goes (off the face it just warms nothing, SPEC D37)
      warmHold.y = pt.y;
      kick();
    } else if (peel && e.pointerId === peel.id) {
      const pt = local(e);
      const q = Math.max(strip.q, Math.min(1, peel.q0 + (pt.x - peel.x0) / strip.w));
      if (q > strip.q) peel.at = time; // still peeling: the cream keeps waiting for it (B61(4))
      strip.q = q;
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
    if (warmHold && e.pointerId === warmHold.id) { // lifted: back to the tool she had before (pop-mode.js, SPEC D37)
      warmHold = null;
      try { o.onWarmLift?.(); } catch (err) { console.warn('onWarmLift failed:', err); }
    }
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
    if (step === 'wipe') { // a stuck-on strip is peeled first, as in the pop step (B61(2)); then the keys wipe
      if (wipeKeyAction(strip) === 'peel') { strip.q = Math.min(1, strip.q + 0.34); kick(); return true; }
      autoWipe();
      return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.popView = () => ({ ...view }); // for browser checks: the zoom view now (T1.4)
  // Debug and smoke-test hook: where the pimples still are (scene coordinates; on screen see popView and sceneToScreen).
  canvas.popTargets = () => pimples.filter((p) => !p.popped).map((p) => ({ x: p.x, y: p.y, r: p.r, type: p.type, zone: p.zone, warm: p.warm ?? 0, heat: p.heat ?? 0 }));
  canvas.popDecoys = () => decoys.map((d) => ({ x: d.x, y: d.y, r: d.r, kind: d.kind })); // for browser checks, like popTargets
  canvas.popStrip = () => (strip && !strip.off ? { x: strip.x, y: strip.y, w: strip.w, h: strip.h } : null);
  canvas.popStep = () => step;
  // For browser checks (T1.7): the two-finger squeeze now ('wait' while deciding, the bump's progress while squeezing).
  canvas.popSqueeze = () => (squeeze ? { pressure: squeeze.p.pressure, x: squeeze.p.x, y: squeeze.p.y } : memory ? 'resume' : stale ? 'stale' : null);
  canvas.popPressures = () => pimples.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure, popped: p.popped }));
  canvas.popTool = () => tool;
  canvas.popWarmth = () => warmth;  canvas.popIrritation = () => irr.level;
  canvas.popTwist = () => ({ twist, off: { ...off }, room, swayK, giggleAt, time }); // for browser checks (T8.3)
  // For browser checks (SPEC D45): the juicy pop's state now (drops in the air, goo on the skin, glass drops, ripple, steam).
  canvas.popFx = () => ({
    juicy, lite, reduced, pops, flying: drops.length, blobs: blobs.length, baked: blobs.filter((b) => b.baked).length,
    glass: splats.filter((s) => s.glass).length, splats: splats.filter((s) => !s.glass).length, ripple: ripple.busy(), steam: steamK,
    show: lastSize, // the last pop's show size ('small', 'big' or 'grand'; null before the first pop)
    ...fxCount, // flinches, drops that slid off an eye, drops that fell off the skin, drops merged into puddles
    horns: horns.map((hn) => ({ t: hn.t, hit: hn.hit, show: Boolean(hn.show) })), puffs: puffs.length,
    eyes: eyesNow().map((e) => ({ x: e.x, y: e.y, rx: e.rx, ry: e.ry })),
    onEyes: blobs.filter((b) => eyeAt(eyesNow(), b.x, b.y)).length, // settled goo on an eye (should stay 0)
    offSkin: blobs.filter((b) => !onSkin(b.x, b.y)).length, // settled goo off the skin (should stay 0)
  });
  /**
   * For browser checks (splat v2): throw one juicy drop from one scene point so it lands on another (to see the eye
   * flinch or the slide off the skin without waiting for a random drop to do it).
   * @param {number} x0 from x @param {number} y0 from y @param {number} x1 to x @param {number} y1 to y
   * @returns {void}
   */
  canvas.popThrow = (x0, y0, x1, y1) => {
    const k = 2.4 / (1 - Math.exp(-2.4 * ((120 + Math.sqrt(120 * 120 + 2800)) / 700))); // speed per px of distance (drag 2.4, gravity 700)
    drops.push({ x: x0, y: y0, z: 2, vx: (x1 - x0) * k, vy: (y1 - y0) * k, vz: 120, r: 6 * scale, goo: 'white', juicy: true });
    kick();
  };
  measureRoom();
  if (juicy) { // the juicy pop's pictures made now, with the face, so the first pop never waits for them
    try { warmGoo([...new Set(pimples.map(gooKind))]); } catch { /* no canvas: drawn the slow way */ }
    gooLayer = { ...makeCanvas(w, h, dpr), dirty: true, any: false, box: null };
  }
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
    setRatio,
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
    /** Let presses work again after halt() (the torchlight stir is only a pause, B28). @returns {void} */
    resume() { if (!disposed) { halted = false; kick(); } },
    /** Take every bit of goo off the face and the lens at once, no wipe (the torchlight catch, B28). @returns {void} */
    clearGoo() {
      strands.length = 0;
      drops.length = 0;
      blobs.length = 0;
      splats.length = 0;
      gooLayer = null;
      wipe = null;
      kick();
      if (!raf) render();
    },
    /**
     * Freeze the scene (the Field guide is open over it, B48) or let it go on. Frozen = the drawing loop stops, so the
     * scene's time, the irritation meter, the Evil Horn growth, the warm cloth, the twists (sway, giggle) and the blinks
     * all stand still and the last picture stays; on going on the loop restarts with a fresh frame clock (no jump).
     * @param {boolean} on true = freeze, false = go on
     * @returns {void}
     */
    setPaused(on) {
      const next = Boolean(on);
      if (next === paused || disposed) return;
      paused = next;
      if (paused) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        clearTimeout(lifeTimer);
        lifeTimer = 0;
        wasBusy = false;
        try { breathing?.pause(); } catch { /* optional */ }
      } else {
        try { breathing?.play(); } catch { /* optional */ }
        kick();
        const due = deferred; // the jobs that waited for the scene to go on (D48)
        deferred = [];
        for (const job of due) job();
      }
    },
    /** Whether the scene is frozen (setPaused). @returns {boolean} true while frozen */
    paused: () => paused,
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
