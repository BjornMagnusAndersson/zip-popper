// The stage moment of a boss or event intro (SPEC D45 item 4) on the customer intro screen (screens/customer-intro.js):
// a canvas BEHIND the intro's cards and buttons (so it never covers a text or eats a tap) where the room dims to near
// dark, the spotlight clunks on over the customer's portrait (spotlight-fx.js), floor smoke rolls in at the bottom
// (smoke-fx.js), and the lights come back up into the normal intro, about 2.3 s in all. The portrait itself sits in
// the dark (a shade over it) until the light hits it. A tap anywhere skips it (a quick fade); the intro's buttons work
// at once all the time. Reduced motion: a still lit picture that stays until a tap. Lighter graphics: fewer specks, no
// billows, pixel ratio 1. It stops when the screen closes. The timeline and the looks are in stage-logic.js.
import { makeSprites, clamp } from './sprites.js';
import { stagePlan, stageLevels, stillLevels, STAGE_TIMES } from './stage-logic.js';
import { makeSpotlight } from './spotlight-fx.js';
import { makeFloorSmoke } from './smoke-fx.js';

/**
 * Start the stage moment on an intro screen.
 * @param {{host: HTMLElement, portrait?: HTMLElement|null, bossId: string|null, reduced?: boolean, lite?: boolean,
 *   playSound?: (name: string, o?: object) => void}} o host = the intro screen's node (the canvas goes in first, behind
 *   the cards); portrait = the portrait frame (the light aims at it; without one it aims at the top middle); bossId =
 *   the event (data/bosses.js); reduced motion; Lighter graphics; playSound = the game's sound player (the clunk)
 * @returns {{canvas: HTMLCanvasElement, skip: () => void, stop: () => void, state: () => object}|null} the stage, or
 *   null when this customer gets none (a normal customer, or no canvas)
 */
export function startIntroStage(o) {
  const plan = stagePlan(o.bossId ?? null, { reduced: o.reduced, lite: o.lite });
  const doc = o.host?.ownerDocument ?? globalThis.document;
  if (!plan || !doc?.createElement) return null;
  const canvas = doc.createElement('canvas');
  canvas.className = 'app-intro-stage';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  o.host.prepend(canvas);
  o.host.classList.add('app-screen--stage');
  const shade = doc.createElement('div'); // the dark over the portrait until the light hits it
  shade.className = 'app-intro__shade';
  shade.style.background = `rgb(${plan.look.dark})`;
  o.portrait?.append(shade);
  const dpr = Math.max(1, Math.min(plan.lite ? 1 : 2, globalThis.devicePixelRatio || 1));
  const kit = makeSprites(() => dpr);
  let parts = null; // the spotlight and the smoke for the size they were made for
  let raf = 0;
  let t0 = null;
  let skipAt = null;
  let stopped = false;
  let clunked = false;
  const cost = { frames: 0, total: 0, max: 0 };

  /** Make (or keep) the spotlight and smoke for the screen's size and the portrait's place now. @returns {object|null} parts */
  function layout() {
    const box = o.host.getBoundingClientRect();
    const W = Math.round(box.width);
    const H = Math.round(box.height);
    if (W < 10 || H < 10) return null;
    const pr = o.portrait?.getBoundingClientRect();
    const face = pr && pr.width > 4
      ? { cx: pr.left - box.left + pr.width / 2, cy: pr.top - box.top + pr.height / 2, r: pr.width / 2 }
      : { cx: W / 2, cy: H * 0.3, r: Math.min(W, H) * 0.22 };
    const key = `${W}x${H}:${Math.round(face.cx)},${Math.round(face.cy)},${Math.round(face.r)}`;
    if (parts?.key === key) return parts;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const sc = clamp(Math.min(W, H) / 360, 0.7, 1.5);
    parts = {
      key, W, H,
      spot: makeSpotlight({ W, H, sc, kit, plan, face, seed: 515 }),
      smoke: makeFloorSmoke({ W, H, sc, kit, plan, start: STAGE_TIMES.T_ON - 0.05 }),
    };
    return parts;
  }

  /** Draw one moment: the smoke at the bottom, then the darkness with the spotlight; and the portrait's shade. @param {object} L levels @param {number} t seconds @returns {void} */
  function paint(L, t) {
    const p = layout();
    if (!p) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p.spot.draw(ctx, L, t);
    ctx.save();
    p.smoke.draw(ctx, L, t);
    ctx.restore();
    shade.style.opacity = clamp(L.shade, 0, 1).toFixed(3);
  }

  /** One animation frame: the levels for now, the clunk sound once, the drawing; stops when done or the screen is gone. @param {number} now ms @returns {void} */
  function frame(now) {
    raf = 0;
    if (stopped) return;
    if (!canvas.isConnected) { stop(); return; } // the screen closed
    t0 ??= now;
    const t = (now - t0) / 1000;
    const L = stageLevels(t, plan.look, skipAt);
    if (!clunked && skipAt === null && t >= STAGE_TIMES.T_ON) {
      clunked = true;
      try { o.playSound?.('clunk', { look: plan.id }); } catch { /* a sound must never break the intro */ }
    }
    const a = globalThis.performance?.now?.() ?? 0;
    try { paint(L, t); } catch (e) { console.warn('intro stage failed:', e); stop(); return; }
    const ms = (globalThis.performance?.now?.() ?? 0) - a;
    cost.frames += 1;
    cost.total += ms;
    cost.max = Math.max(cost.max, ms);
    if (L.done) { stop(); return; }
    raf = globalThis.requestAnimationFrame(frame);
  }

  /** Stop drawing and take the stage away (the normal intro stays). @returns {void} */
  function stop() {
    if (stopped) return;
    stopped = true;
    if (raf) globalThis.cancelAnimationFrame?.(raf);
    raf = 0;
    canvas.remove();
    shade.remove();
    o.host.classList.remove('app-screen--stage');
    o.host.removeEventListener('pointerdown', skip, true);
    o.host.removeEventListener('keydown', skip, true);
  }

  /** A tap or key: fade the stage out quickly (reduced motion: gone at once). The tap itself goes on to its button. @returns {void} */
  function skip() {
    if (stopped || skipAt !== null) return;
    if (plan.still || t0 === null) { stop(); return; }
    skipAt = ((globalThis.performance?.now?.() ?? t0) - t0) / 1000;
  }

  o.host.addEventListener('pointerdown', skip, { capture: true, passive: true });
  o.host.addEventListener('keydown', skip, { capture: true, passive: true });
  if (plan.still) {
    // Reduced motion: one still lit picture, painted when the screen has its size (and again if it changes size).
    const still = stillLevels();
    /** Paint the still picture now (once the screen is in the page). @returns {void} */
    const draw = () => { if (!stopped && canvas.isConnected) { try { paint(still, 2); } catch (e) { console.warn('intro stage failed:', e); stop(); } } };
    globalThis.requestAnimationFrame?.(draw);
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (stopped) watch.disconnect(); else draw(); }) : null;
    watch?.observe(o.host);
  } else raf = globalThis.requestAnimationFrame(frame);

  canvas.stageState = () => ({
    id: plan.id, still: plan.still, lite: plan.lite, stopped, skipped: skipAt !== null, clunked, dpr,
    t: t0 === null ? 0 : Math.round(((globalThis.performance?.now?.() ?? 0) - t0) / 10) / 100,
    frames: cost.frames, avgMs: cost.frames ? Math.round((cost.total / cost.frames) * 100) / 100 : 0, maxMs: Math.round(cost.max * 100) / 100,
    spot: parts?.spot.state() ?? null, smoke: parts?.smoke.state() ?? null,
  });
  /** For checks (headless screenshots): stop the clock and show the moment t seconds in. @param {number} t seconds @returns {void} */
  canvas.stageSeek = (t) => {
    if (raf) globalThis.cancelAnimationFrame?.(raf);
    raf = 0;
    if (!stopped) paint(plan.still ? stillLevels() : stageLevels(t, plan.look), t);
  };
  return { canvas, skip, stop, state: canvas.stageState };
}
