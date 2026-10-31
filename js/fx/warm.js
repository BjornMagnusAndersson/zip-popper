// Effects warmed ahead (B99(4), B119; owner 2026-10-31: "a few MB is OK and gives a better experience"). The effects
// paint their sprites (soft glows, stars, hearts, coins, smoke, the stage spotlight) the first time they run, which made
// their first frame slow on an old phone (the boss intro's first frame 40 to 50 ms at 4x slowdown). Here those same
// sprites are made ahead, one effect per idle moment of the phone (on the menu and on the customer intro), into the
// shared sprite store (fx/sprites.js), so the effect itself only copies them. Each set once per pixel ratio and
// Lighter graphics; the sizes are the ones the effect itself uses (Lighter graphics: pixel ratio 1). The juicy pop's goo
// balls (pop/pop-fx-art.js warmGoo) too, unless Gentle pops is on. Nothing is drawn on screen.
import { makeSprites, clamp } from './sprites.js';
import { fxDpr } from './fx-layer.js';
import { stagePlan, STAGE_LOOKS, STAGE_TIMES } from './stage-logic.js';
import { makeSpotlight } from './spotlight-fx.js';
import { makeFloorSmoke } from './smoke-fx.js';
import { makeConfetti } from './confetti-fx.js';
import { makeCoinFlight } from './coins-fx.js';
import { makeRevealSparkle } from './reveal-fx.js';
import { makeHeartPuff } from './heart-puff-fx.js';
import { makeGoldShower } from './gold-shower-fx.js';
import { makeFrameShine } from './frame-shine.js';
import { warmGoo } from '../pop/pop-fx-art.js';

/** The warm-up jobs already done (job name with its pixel ratio): each runs once. */
const DONE = new Set();

/**
 * The screen's size in CSS px (what the intro stage and the result layers roughly cover).
 * @returns {{W: number, H: number}} the size
 */
function screenSize() {
  const W = Math.max(240, Math.round(globalThis.innerWidth || 390));
  const H = Math.max(240, Math.round(globalThis.innerHeight || 800));
  return { W, H };
}

/**
 * The warm-up jobs for these settings, in the order they run (the next boss's stage first, when known). Jobs already
 * done are left out.
 * @param {{reduced?: boolean, lite?: boolean, juicy?: boolean, bossId?: string|null}} o reduced motion, Lighter
 *   graphics, the juicy pop on (not Gentle pops), the boss or event of the next intro (its stage goes first)
 * @returns {{name: string, run: () => void}[]} the jobs
 */
export function warmJobs(o = {}) {
  const lite = Boolean(o.lite);
  const reduced = Boolean(o.reduced);
  const { W, H } = screenSize();
  const stageDpr = Math.max(1, Math.min(lite ? 1 : 2, globalThis.devicePixelRatio || 1)); // as fx/intro-stage.js
  const fxRatio = fxDpr(lite); // as fx/fx-layer.js
  const jobs = [];
  /** Add one job under its name (with the pixel ratio and switches that change its sprites). @param {string} name job @param {() => void} run its work @returns {void} */
  const add = (name, run) => { if (!DONE.has(name)) jobs.push({ name, run }); };
  const ids = Object.keys(STAGE_LOOKS);
  const order = o.bossId && ids.includes(o.bossId) ? [o.bossId, ...ids.filter((id) => id !== o.bossId)] : ids;
  for (const id of order) {
    add(`stage:${id}:${stageDpr}:${lite}:${reduced}`, () => {
      const plan = stagePlan(id, { reduced, lite });
      if (!plan) return;
      const kit = makeSprites(() => stageDpr);
      const sc = clamp(Math.min(W, H) / 360, 0.7, 1.5);
      makeSpotlight({ W, H, sc, kit, plan, face: { cx: W / 2, cy: H * 0.3, r: Math.min(W, H) * 0.22 }, seed: 515 });
      makeFloorSmoke({ W, H, sc, kit, plan, start: STAGE_TIMES.T_ON - 0.05 });
    });
  }
  if (o.juicy !== false) add('goo', () => warmGoo(['white', 'cream', 'gold', 'horn']));
  /** A sprite kit at the effects layers' pixel ratio. @returns {object} the kit */
  const kit = () => makeSprites(() => fxRatio);
  add(`confetti:${fxRatio}:${lite}`, () => {
    const k = kit();
    makeConfetti({ kit: k, kind: 'confetti', W, H, lite, still: reduced });
    makeConfetti({ kit: k, kind: 'petals', W, H, lite, still: reduced });
  });
  add(`coins:${fxRatio}:${lite}`, () => {
    const flight = makeCoinFlight({ kit: kit(), n: 3, from: () => ({ x: W / 2, y: H / 3, r: 60 }), to: () => ({ x: W - 40, y: 40, r: 12 }), W, H, lite });
    const scratch = document.createElement('canvas'); // the coin's turning faces are painted as they turn: run it once unseen
    scratch.width = 2;
    scratch.height = 2;
    const c = scratch.getContext('2d');
    for (let i = 0; i < 40 && !flight.done(); i += 1) { flight.step(0.05, W, H); flight.draw(c); }
  });
  add(`reveal:${fxRatio}`, () => makeRevealSparkle({ kit: kit(), face: { cx: 0.5, cy: 0.45, rx: 0.25, ry: 0.3 } }));
  add(`hearts:${fxRatio}:${lite}`, () => makeHeartPuff({ kit: kit(), W, H, from: { x: W / 2, y: H / 3, w: 200, h: 72 }, lite, still: reduced }));
  add(`gold:${fxRatio}:${lite}`, () => makeGoldShower({ kit: kit(), W, H, lite, still: reduced }));
  add(`frame:${fxRatio}`, () => makeFrameShine(fxRatio));
  return jobs;
}

/**
 * Warm the effects up at the phone's idle moments, one job per moment (requestIdleCallback where it exists, else a
 * short timer). While holdWhile says true (a round scene being built, a stage moment playing) it waits.
 * @param {{reduced?: boolean, lite?: boolean, juicy?: boolean, bossId?: string|null, holdWhile?: () => boolean}} [o]
 *   as warmJobs, plus when to wait
 * @returns {() => void} stops the warm-up (jobs not run yet are left for next time)
 */
export function warmEffects(o = {}) {
  const jobs = warmJobs(o);
  let id = 0;
  let stopped = false;
  /** Wait for the next idle moment (or a short while when holding). @param {number} ms extra wait @returns {void} */
  const next = (ms = 0) => {
    if (stopped || !jobs.length) return;
    /** Ask the phone for its next idle moment. @returns {void} */
    const ask = () => {
      if (stopped) return;
      if (typeof globalThis.requestIdleCallback === 'function') id = globalThis.requestIdleCallback(tick, { timeout: 1500 });
      else id = setTimeout(tick, 30);
    };
    if (ms > 0) id = setTimeout(ask, ms); else ask();
  };
  /** Run one job (or wait if asked to). @returns {void} */
  function tick() {
    if (stopped) return;
    let hold = false;
    try { hold = Boolean(o.holdWhile?.()); } catch { hold = false; }
    if (hold) { next(250); return; }
    const job = jobs.shift();
    if (job) {
      DONE.add(job.name); // once, even if it fails (an effect that cannot paint here never will)
      try { job.run(); } catch (e) { console.warn(`warming ${job.name} failed:`, e); }
    }
    next();
  }
  next(300); // let the screen that just opened settle first
  return () => {
    stopped = true;
    clearTimeout(id);
    if (typeof globalThis.cancelIdleCallback === 'function') globalThis.cancelIdleCallback(id);
  };
}
