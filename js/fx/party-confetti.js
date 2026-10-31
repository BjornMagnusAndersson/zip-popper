// The confetti when Prom Penny's party-day round is finished (SPEC D45 item 6), on the result screen. It reuses the
// result moment's own confetti (confetti-fx.js on an effects layer, fx-layer.js), so it looks the same as a 3-star
// burst; on her party day the result screen throws its own confetti for 3 stars (in the spa too, not petals: R2), so
// then nothing extra is added (never two bursts at once). Reduced motion: a few still pieces at the edges, as the result screen does. Lighter
// graphics: about half the pieces. The layer never takes a tap and is gone when the burst is over or the screen closes.
import { makeFxLayer } from './fx-layer.js';
import { makeConfetti } from './confetti-fx.js';
import { celebration, CONFETTI_FX, RESULT_FX } from './celebrate-logic.js';

/**
 * Whether Penny's party day needs its own confetti on this result: yes, unless the result screen already throws
 * confetti (3 stars, in any studio: on her party day the spa's petals become confetti, R2), and never for a customer
 * who stormed off. So her party day always ends in confetti, and only one burst.
 * @param {{stars?: number, failed?: boolean, tier?: number}} o the result and the studio tier
 * @returns {boolean} true = start the party confetti
 */
export function partyConfettiNeeded(o = {}) {
  return !o.failed && celebration({ ...o, party: true }) !== 'confetti';
}

/**
 * Start the party confetti over a screen.
 * @param {HTMLElement} host the screen's node (positioned; every app screen is)
 * @param {{reduced?: boolean, lite?: boolean}} [o] reduced motion (a few still pieces), Lighter graphics
 * @returns {{canvas: HTMLCanvasElement, stop: () => void, state: () => object}|null} the burst, or null (no page)
 */
export function startPartyConfetti(host, o = {}) {
  if (!host || !globalThis.document?.createElement) return null;
  const layer = makeFxLayer(host, { lite: o.lite, className: 'app-fx app-party-confetti' });
  let burst = null;
  if (o.reduced) {
    /** Paint the still pieces once the screen has its size. @returns {void} */
    const paint = () => layer.still((c, W, H) => makeConfetti({ kit: layer.kit, kind: 'confetti', W, H, lite: o.lite, still: true, seed: 23 }).paintStill(c, W, H));
    globalThis.requestAnimationFrame?.(paint);
  } else {
    layer.add((W, H) => (burst = makeConfetti({ kit: layer.kit, kind: 'confetti', W, H, lite: o.lite, seed: 23 })), RESULT_FX.confettiAt);
  }
  // The burst is over by then: take the layer away (reduced motion keeps its still pieces until the screen closes).
  const end = o.reduced ? 0 : setTimeout(() => stop(), (RESULT_FX.confettiAt + CONFETTI_FX.life + CONFETTI_FX.fade + 1) * 1000);
  const watch = setInterval(() => { if (!host.isConnected) stop(); }, 250); // the screen closed: stop at once
  /** Stop and take the layer away. @returns {void} */
  function stop() { clearTimeout(end); clearInterval(watch); layer.dispose(); }
  /** For checks. @returns {object} state */
  const state = () => ({ busy: layer.busy(), confetti: burst?.state?.() ?? null, still: Boolean(o.reduced) });
  layer.canvas.confettiState = state;
  return { canvas: layer.canvas, stop, state };
}
