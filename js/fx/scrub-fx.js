// The scrub job's light (SPEC D45 item 3, screens/scrub.js): while she scrubs, a dusty shaft of light falls across
// the close-up with fine dust drifting in it (thinning out as the item comes clean), and in the dingy studio the ring
// light's close-up has the old bulb's moth fluttering round it. When the item is clean: WHOOSH, the dust swirls out of
// the light, the moth is blown away out of the picture (it loved the cheap bulb), the light turns clean and warm, a soft
// shine glides over the item and a few glints pop (like the effect strip's WHOOSH beat). Reduced motion: straight to
// the clean look, nothing flies. Lighter graphics: half the particles, fewer frames.
import { makeSprites, clamp, smooth, seedOf } from './sprites.js';
import { rng } from '../pop/logic.js';
import { closeupSpot } from '../pop/backdrop.js';
import { FX_STEP, FX_STEP_LITE, fxStepTime, scrubFxAt, SCRUB_FX_LEN } from './room-logic.js';
import { makeDust, shaftSpot } from './room-dust.js';
import { makeMoth } from './room-lamps.js';

/** How dusty the close-up's air is for the studio tier the item arrives in. */
const AIR_BY_TIER = [1, 0.7, 0.45];

/**
 * Whether the scrub job shows the old bulb's moth: the ring light's close-up while the studio is still dingy.
 * @param {string} itemId the studio item being scrubbed
 * @param {number} tier the studio tier 0..2 before it
 * @returns {boolean} true = the moth flutters round the ring light (and is blown away at the end)
 */
export function scrubHasMoth(itemId, tier) {
  return itemId === 'lamp' && tier === 0;
}

/**
 * Make the scrub job's light and dust for its close-up.
 * @param {{w: number, h: number, dpr: number, itemId: string, tier: number, reduced?: boolean, lite?: boolean}} o the
 *   close-up's drawing size and pixel ratio, the item, the studio tier, reduced motion, lighter graphics
 * @returns {{frame: (c: CanvasRenderingContext2D, time: number) => void, setDust: (k: number) => void,
 *   finish: () => void, moving: () => boolean, step: number, state: () => object}} the effects: frame draws them for a
 *   moment (c in drawing px), moving = more frames are needed, step = seconds between ambient frames
 */
export function makeScrubFx(o) {
  const { w: W, h: H, itemId } = o;
  const tier = [0, 1, 2].includes(o.tier) ? o.tier : 1;
  const still = Boolean(o.reduced);
  const kit = makeSprites(() => o.dpr);
  const sc = clamp(Math.min(W, H) / 260, 0.6, 1.6);
  const room = { // a window-like shaft from the top left, down across the item
    W, H, land: true, ring: null, target: [W / 2, H / 2],
    window: { x0: W * 0.04, x1: W * 0.26, y: 0, bx0: W * 0.42, bx1: W * 0.86, by: H * 0.98 },
  };
  const dust = makeDust({
    W, H, sc, kit, rand: rng(seedOf(`scrub:${itemId}`)), still, amount: AIR_BY_TIER[tier], share: o.lite ? 0.5 : 1,
    shaft: shaftSpot(room), ring: null, pool: null, haze: !o.lite, strength: 0.42,
  });
  const spot = closeupSpot('lamp', W, H).spot;
  const moth = scrubHasMoth(itemId, tier) ? makeMoth({
    lamp: { x: spot.x, y: spot.y, r: spot.r }, sc, size: 15, orbit: [spot.r * 1.55, spot.r * 1.05], still, kit, W, H,
    rest: [spot.x + spot.r * 0.95, spot.y - spot.r * 1.05],
  }) : null;
  const glow = kit.glow('255,236,200', 96);
  const band = kit.sprite('scrub-band', 64, 16, (c, w, h) => { // a soft stripe of light for the shine over the item
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,250,236,0)');
    g.addColorStop(0.47, 'rgba(255,250,236,0.9)');
    g.addColorStop(1, 'rgba(255,250,236,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, 1);
  let last = null;
  let doneAt = -1; // the clock when the item came clean (-1 = still scrubbing)
  let T = 0;

  /** The warm clean light over the close-up and the shine gliding over the item, once it is clean. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawClean(c) {
    if (doneAt < 0) return;
    const at = scrubFxAt(T - doneAt, still);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(0.22 * at.clean + 0.2 * at.glow, 0, 1); // the room's light turns warm and clean
    c.drawImage(glow, -W * 0.1, -H * 0.35, W * 1.2, H * 1.7);
    const q = (T - doneAt - 1.1) / 1.0; // the shine glides over the item, left to right
    if (!still && q > 0 && q < 1) {
      c.beginPath();
      c.ellipse(W / 2, H * 0.47, W * 0.34, H * 0.47, 0, 0, Math.PI * 2);
      c.clip();
      c.translate(-W * 0.2 + smooth(q) * W * 1.4, H / 2);
      c.rotate(-0.45);
      c.globalAlpha = 0.45 * Math.sin(q * Math.PI);
      c.drawImage(band, -H * 0.3, -H, H * 0.6, H * 2);
    }
    c.restore();
  }

  return {
    step: o.lite ? FX_STEP_LITE : FX_STEP,
    /** Move everything on to a moment and draw it. @param {CanvasRenderingContext2D} c where (drawing px) @param {number} time seconds @returns {void} */
    frame(c, time) {
      const dt = fxStepTime(last, time);
      last = time;
      T = time;
      dust.step(dt, time);
      moth?.step(dt, time);
      c.save();
      dust.draw(c);
      drawClean(c);
      c.restore();
      moth?.draw(c, 1);
    },
    /** How much dust is left in the air (as the item comes clean). @param {number} k 0..1 @returns {void} */
    setDust(k) { dust.setDust(0.35 + 0.65 * clamp(k, 0, 1)); },
    /** The item is clean: the whoosh, the moth blown away, the clean warm light. @returns {void} */
    finish() {
      if (doneAt >= 0) return;
      doneAt = T;
      dust.setDust(0.9); // the last of the dust is shaken up into the light, so the whoosh shows
      dust.trigger();
      moth?.leave([110, 50]); // the gust blows it off sideways (it takes about a second to tumble out of the picture)
      if (still) dust.step(SCRUB_FX_LEN + 2, T); // reduced motion: straight to the clean look
    },
    /** Whether more frames are needed: the dust drifting, or the ending still under way. @returns {boolean} moving */
    moving: () => (doneAt < 0 ? !still : !still && (dust.busy() || !scrubFxAt(T - doneAt).done || Boolean(moth && !moth.gone()))),
    /** For checks. @returns {object} state */
    state: () => ({ dust: dust.state(), moth: moth?.state() ?? null, done: doneAt >= 0 }),
  };
}
