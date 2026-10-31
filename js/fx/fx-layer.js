// An effects layer for a screen (SPEC D45: the result moment, the Master diploma): one see-through canvas laid over a
// part of the screen that never takes a tap (CSS pointer-events: none), and one animation loop that moves and draws
// the effects on it. The loop only runs while an effect is under way, starts each effect after its own wait, and
// stops for good when the screen closes (dispose). The canvas follows the size of the part it covers (turning the
// phone). Lighter graphics draws it at pixel ratio 1.
//
// An effect is an object with step(dt, W, H) (dt = seconds since the last frame, at most 0.05), draw(ctx, W, H, dpr)
// (ctx comes scaled to CSS px; W and H are the layer's size in CSS px) and done() (true = it can be dropped).
import { makeSprites, clamp } from './sprites.js';

/**
 * The pixel ratio for an effects canvas: 1 with Lighter graphics, else the screen's (at most 2).
 * @param {boolean} lite Lighter graphics
 * @returns {number} pixel ratio
 */
export function fxDpr(lite) {
  return lite ? 1 : Math.min(2, globalThis.devicePixelRatio || 1);
}

/**
 * Make an effects layer over a part of a screen.
 * @param {HTMLElement} host what the canvas covers (it needs position: relative or absolute; the canvas fills it)
 * @param {{lite?: boolean, className?: string}} [o] Lighter graphics; the canvas's CSS class
 * @returns {{canvas: HTMLCanvasElement, kit: ReturnType<typeof makeSprites>, dpr: number,
 *   add: (effect: object, delay?: number) => void, size: () => {w: number, h: number}, busy: () => boolean,
 *   dispose: () => void}} the layer: add an effect (after a wait in seconds); busy = an effect is waiting or running
 */
export function makeFxLayer(host, o = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = o.className ?? 'app-fx';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = fxDpr(Boolean(o.lite));
  const kit = makeSprites(() => dpr);
  const effects = [];
  const timers = new Set();
  let raf = 0;
  let last = null;
  let W = 0;
  let H = 0;
  let dead = false;

  /** Size the canvas to its host (only when the host's size changed). @returns {void} */
  function fit() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === W && h === H) return;
    W = w;
    H = h;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
  }

  /** One frame: move and draw every running effect, drop the finished ones, and ask for the next frame while any run. @param {number} now frame time in ms @returns {void} */
  function frame(now) {
    raf = 0;
    if (dead) return;
    const dt = last === null ? 1 / 60 : clamp((now - last) / 1000, 0, 0.05);
    last = now;
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const e = effects[i];
      e.step(dt, W, H);
      if (e.done()) effects.splice(i, 1);
    }
    for (const e of effects) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      e.draw(ctx, W, H, dpr);
      ctx.restore();
    }
    if (effects.length) raf = requestAnimationFrame(frame);
    else last = null;
  }

  /** Make sure the loop runs. @returns {void} */
  function wake() {
    if (!raf && !dead) raf = requestAnimationFrame(frame);
  }

  return {
    canvas,
    kit,
    dpr,
    /**
     * Start an effect, now or after a wait.
     * @param {object|((W: number, H: number) => object|null)} effect the effect, or a function that makes it when it
     *   starts (from the layer's size then: the screen is in the page by then)
     * @param {number} [delay] seconds to wait
     * @returns {void}
     */
    add(effect, delay = 0) {
      if (dead || !effect) return;
      /** Make the effect if needed and run it. @returns {void} */
      const begin = () => {
        if (dead) return;
        fit();
        const e = typeof effect === 'function' ? effect(W, H) : effect;
        if (!e) return;
        effects.push(e);
        wake();
      };
      if (delay <= 0) { begin(); return; }
      const id = setTimeout(() => { timers.delete(id); begin(); }, delay * 1000);
      timers.add(id);
    },
    /** The effects running now (for checks). @returns {object[]} effects */
    running: () => [...effects],
    /** Draw one still picture now (reduced motion: nothing moves). @param {(ctx: CanvasRenderingContext2D, W: number, H: number) => void} paint draws it in CSS px @returns {void} */
    still(paint) {
      if (dead) return;
      fit();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, W, H);
    },
    /** The layer's size in CSS px (measured now). @returns {{w: number, h: number}} size */
    size() { fit(); return { w: W, h: H }; },
    /** Whether an effect is still waiting or running. @returns {boolean} busy */
    busy: () => !dead && (effects.length > 0 || timers.size > 0),
    /** Stop everything for good and take the canvas away. @returns {void} */
    dispose() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      effects.length = 0;
      kit.clear();
      canvas.remove();
    },
  };
}
