// Prom Penny's party day in the pop scene (SPEC D45 item 6): the fairy-light bokeh and the string of fairy lights
// (bokeh-fx.js) over the studio room and behind her face, drawn by the pop scene's backdrop (pop/pop-mode.js
// paintBackdrop) after the room and its own effects (room-fx.js), the same way. It moves at the room effects' pace
// (about 16 frames a second); with reduced motion or Lighter graphics it stands still (and Lighter graphics has fewer
// circles), so it costs no extra repaints then. Which round is a party day: stage-logic.js isPartyDay.
import { makeSprites, clamp } from './sprites.js';
import { rng } from '../pop/logic.js';
import { FX_STEP, fxStepTime } from './room-logic.js';
import { makeBokeh } from './bokeh-fx.js';

/** The share of circles with Lighter graphics. */
export const PARTY_LITE_SHARE = 0.5;

/**
 * Make the party lights for one backdrop picture.
 * @param {{w: number, h: number, dpr: number, reduced?: boolean, lite?: boolean}} o picture size in CSS px, pixel
 *   ratio, reduced motion, Lighter graphics
 * @returns {{key: string, frame: (ctx: CanvasRenderingContext2D, time: number) => void, next: () => number,
 *   state: () => object}} the lights: frame moves them on to a moment and draws them (ctx in CSS px), next = seconds
 *   until the next frame is due (Infinity = a still picture)
 */
export function makePartyFx(o) {
  const W = Math.round(o.w);
  const H = Math.round(o.h);
  const still = Boolean(o.reduced || o.lite);
  const kit = makeSprites(() => o.dpr);
  const sc = clamp(Math.min(W, H) / 260, 0.6, 1.6);
  const bokeh = makeBokeh({ W, H, sc, kit, rand: rng(4242), share: o.lite ? PARTY_LITE_SHARE : 1, still, top: H * (W > H ? 0.03 : 0.02) });
  let last = null;
  return {
    key: partyFxKey(o),
    /** Move the lights on to a moment and draw them. @param {CanvasRenderingContext2D} ctx where (CSS px) @param {number} time seconds @returns {void} */
    frame(ctx, time) {
      const dt = fxStepTime(last, time);
      last = time;
      bokeh.step(dt);
      ctx.save();
      try { bokeh.draw(ctx, time); } catch (e) { console.warn('party lights failed:', e); }
      ctx.restore();
    },
    /** Seconds until the lights look different (Infinity = still). @returns {number} seconds */
    next: () => (still ? Infinity : FX_STEP),
    /** For checks. @returns {object} state */
    state: () => ({ key: partyFxKey(o), ...bokeh.state() }),
  };
}

/**
 * The text that names one set of party lights (same text = they can be kept).
 * @param {{w: number, h: number, dpr: number, reduced?: boolean, lite?: boolean}} o as makePartyFx
 * @returns {string} the key
 */
export function partyFxKey(o) {
  return `${Math.round(o.w)}x${Math.round(o.h)}@${o.dpr}:${Boolean(o.reduced)}:${Boolean(o.lite)}`;
}

/**
 * Keep the party lights while the picture stays the same, or make them fresh when the size, reduced motion or
 * Lighter graphics changed; none (null) when it is not a party day.
 * @param {object|null} prev the lights in use (or null)
 * @param {object} o as makePartyFx, plus on (a party day)
 * @returns {object|null} the lights to use, or null
 */
export function syncPartyFx(prev, o) {
  if (!o.on) return null;
  return prev && prev.key === partyFxKey(o) ? prev : makePartyFx(o);
}
