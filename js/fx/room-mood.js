// The room's mood (SPEC D45 item 3), the game's version of the test page's mood effect (js/dev/fx/mood.js): a soft
// colour wash and vignette over the room (never over the customer: it is drawn on the room's own layer). Dingy
// studio (tier 0): dimmer, a little green, the corners dark and dank, the light gently uneven (soft blotches drifting
// very slowly). Tier 1: neutral and light, only a soft warm vignette. Spa (tier 2): a warm golden glow round the
// edges. Very subtle: it makes the other effects sit in the room. The soft pictures are painted once at a low
// resolution and stretched, and in the game they are baked once into the still room picture (no cost per frame).
import { clamp } from './sprites.js';

const STRENGTH = 0.45; // the pictures are painted at their strong look; the room shows them at this share

/**
 * The mood's recipe for a tier: a darkening wash and vignette (drawn over), a glow (added light), and blotches.
 * @param {number} tier 0..2
 * @returns {{wash: string, washA: number, vig: string, vigA: number, vigIn: number, glow: string|null, glowA: number, blotch: number}}
 *   colours "r,g,b" and strengths
 */
export function moodRecipe(tier) {
  return [
    { wash: '52,74,40', washA: 0.26, vig: '12,24,14', vigA: 0.7, vigIn: 0.25, glow: null, glowA: 0, blotch: 0.3 }, // dim, a bit green
    { wash: '255,246,228', washA: 0.08, vig: '70,48,24', vigA: 0.28, vigIn: 0.4, glow: '255,244,220', glowA: 0.1, blotch: 0 }, // neutral, light
    { wash: '255,232,190', washA: 0.1, vig: '214,156,72', vigA: 0.3, vigIn: 0.4, glow: '255,206,120', glowA: 0.6, blotch: 0 }, // warm golden edges
  ][tier] ?? { wash: '0,0,0', washA: 0, vig: '0,0,0', vigA: 0.3, vigIn: 0.4, glow: null, glowA: 0, blotch: 0 };
}

/**
 * Paint the darkening picture: an even wash, then a vignette that darkens towards the corners (an oval that follows
 * the picture's shape, centred a little above the middle, where the face is).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width (CSS px)
 * @param {number} h height (CSS px)
 * @param {object} r the recipe
 * @returns {void}
 */
function paintShade(c, w, h, r) {
  c.fillStyle = `rgba(${r.wash},${r.washA})`;
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h * 0.45);
  c.scale(w / Math.hypot(w, h), h / Math.hypot(w, h));
  const R = Math.hypot(w, h) * 0.75;
  const g = c.createRadialGradient(0, 0, R * r.vigIn, 0, 0, R);
  g.addColorStop(0, `rgba(${r.vig},0)`);
  g.addColorStop(0.55, `rgba(${r.vig},${r.vigA * 0.35})`);
  g.addColorStop(1, `rgba(${r.vig},${r.vigA})`);
  c.fillStyle = g;
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  c.restore();
}

/**
 * Paint the glow picture (added light): warm light gathering at the edges and corners, clear in the middle.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {object} r the recipe
 * @returns {void}
 */
function paintGlow(c, w, h, r) {
  c.save();
  c.translate(w / 2, h * 0.45);
  c.scale(w / Math.hypot(w, h), h / Math.hypot(w, h));
  const R = Math.hypot(w, h) * 0.72;
  const g = c.createRadialGradient(0, 0, R * 0.3, 0, 0, R);
  g.addColorStop(0, `rgba(${r.glow},0)`);
  g.addColorStop(0.6, `rgba(${r.glow},${r.glowA * 0.4})`);
  g.addColorStop(1, `rgba(${r.glow},${r.glowA})`);
  c.fillStyle = g;
  c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  c.restore();
}

/**
 * Make the room's mood.
 * @param {{W: number, H: number, kit: object, tier: number, still: boolean, blotches?: boolean, baked?: boolean}} o
 *   picture size, the sprite kit, the studio tier, still (reduced motion: no drift), blotches = false leaves out tier
 *   0's patches, baked = painted once into the still room (bake) instead of every frame (draw); the patches then stand still
 * @returns {{step: (dt: number, t: number) => void, draw: (c: CanvasRenderingContext2D) => void,
 *   bake: (c: CanvasRenderingContext2D) => void}} hooks
 */
export function makeMood(o) {
  const { W, H, kit, tier, still } = o;
  const r = moodRecipe(tier);
  const shade = kit.sprite(`mood:${tier}:shade`, W, H, (c, w, h) => paintShade(c, w, h, r), 0.25);
  const glow = r.glow ? kit.sprite(`mood:${tier}:glow`, W, H, (c, w, h) => paintGlow(c, w, h, r), 0.25) : null;
  const noise = r.blotch && o.blotches !== false ? kit.noise(96, 77, 3) : null;
  let T = 0;

  /** The blotchy, uneven light of the dingy room: big soft dark patches drifting very slowly. @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawBlotches(c, a) {
    if (!noise) return;
    const t = still ? 0 : T;
    const n = Math.max(W, H) * 1.4;
    const ox = (((t * 3) % n) + n) % n;
    // The noise is white and see-through: drawn small into a buffer and tinted dark in place (source-atop), it
    // becomes soft dark patches, stretched over the picture in one go.
    const b = kit.buffer('mood-blotch', W, H, 0.2);
    for (let x = -ox; x < W; x += n) b.ctx.drawImage(noise, x, -n * 0.25, n + 1, n + 1);
    b.ctx.globalCompositeOperation = 'source-atop';
    b.ctx.fillStyle = 'rgb(18,30,16)';
    b.ctx.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(a * r.blotch, 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
  }

  /** The wash and vignette, the glow, the dingy blotches. @param {CanvasRenderingContext2D} c context @returns {void} */
  function paint(c) {
    c.save();
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = STRENGTH;
    c.drawImage(shade, 0, 0, W, H);
    if (glow) {
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = STRENGTH;
      c.drawImage(glow, 0, 0, W, H);
    }
    drawBlotches(c, STRENGTH);
    c.restore();
  }

  if (o.baked) { // painted once into the still room (a full-screen layer every frame is too dear on old phones)
    return {
      /** Nothing moves. @returns {void} */
      step() {},
      /** Nothing to draw each frame. @returns {void} */
      draw() {},
      /** Paint the mood once into the still room. @param {CanvasRenderingContext2D} c context @returns {void} */
      bake: paint,
    };
  }
  return {
    /** Keep the clock for the slow drift. @param {number} dt seconds @param {number} t the clock @returns {void} */
    step(dt, t) { T = t; },
    /** Paint the mood bit for this frame (the scrub job and tests). @param {CanvasRenderingContext2D} c context @returns {void} */
    draw: paint,
    /** Nothing is baked. @returns {void} */
    bake() {},
  };
}
