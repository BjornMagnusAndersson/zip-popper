// Effect 11 for the light test page (fx-test.html): the room's mood, a colour wash and vignette over the whole
// picture (glass layer, drawn under the other glass effects so confetti and coins stay bright). Dingy studio (tier
// 0): dimmer, a little green, the corners dark and dank, the light gently uneven (soft blotches that drift very
// slowly). Better studio (tier 1): neutral and light, only a soft warm vignette. Spa (tier 2): a warm golden glow
// round the edges. Party: deep violet corners with a pink and a violet glow drifting slowly at the sides. Very subtle
// by default: it is meant to make the other effects sit in the room. Fire: cycles normal, strong (to compare) and
// off. The soft pictures are painted once at a low resolution and stretched (two or three drawImage calls a frame).
// Still: no drift. See the README in core.js for the effect interface.
import { clamp, smooth, TAU } from './sprites.js';

const LEVELS = [1, 2.2, 0]; // normal, strong, off: Fire steps through these
const NAMES = ['normal', 'strong', 'off'];
const BASE = 0.45; // the pictures are painted at their strong look; normal draws them at this share

/**
 * The mood's recipe for a scene: a darkening wash and vignette (drawn over), a glow (added light), and blotches.
 * @param {number} tier 0..2
 * @param {boolean} party the party mood
 * @returns {{wash: string, washA: number, vig: string, vigA: number, vigIn: number, glow: string|null, glowA: number, blotch: number}} colours "r,g,b" and strengths
 */
function recipe(tier, party) {
  if (party) return { wash: '60,16,90', washA: 0.12, vig: '30,6,52', vigA: 0.75, vigIn: 0.3, glow: null, glowA: 0, blotch: 0 };
  return [
    { wash: '52,74,40', washA: 0.26, vig: '12,24,14', vigA: 0.7, vigIn: 0.25, glow: null, glowA: 0, blotch: 0.3 }, // dim, a bit green
    { wash: '255,246,228', washA: 0.08, vig: '70,48,24', vigA: 0.28, vigIn: 0.4, glow: '255,244,220', glowA: 0.1, blotch: 0 }, // neutral, light
    { wash: '255,232,190', washA: 0.1, vig: '214,156,72', vigA: 0.3, vigIn: 0.4, glow: '255,206,120', glowA: 0.6, blotch: 0 }, // warm golden edges
  ][tier] ?? { wash: '0,0,0', washA: 0, vig: '0,0,0', vigA: 0.3, vigIn: 0.4, glow: null, glowA: 0, blotch: 0 };
}

/**
 * Paint the darkening picture: an even wash, then a vignette that darkens towards the corners (an oval that follows
 * the screen's shape, centred a little above the middle, where the face is).
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
 * Make the room mood for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, tier, still, party } = env;
  const r = recipe(tier, party);
  const key = `mood:${party ? 'p' : tier}`;
  const shade = env.sprite(`${key}:shade`, W, H, (c, w, h) => paintShade(c, w, h, r), 0.25);
  const glow = r.glow ? env.sprite(`${key}:glow`, W, H, (c, w, h) => paintGlow(c, w, h, r), 0.25) : null;
  const noise = r.blotch ? env.noise(96, 77, 3) : null;
  const pink = party ? env.glow('255,90,190', 128) : null;
  const violet = party ? env.glow('150,90,255', 128) : null;
  let level = 0; // which of LEVELS
  let k = LEVELS[0]; // the strength shown now (eases to the chosen level)

  /** The blotchy, uneven light of the dingy room: big soft dark patches drifting very slowly. @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawBlotches(c, a) {
    if (!noise || a <= 0.005) return;
    const t = still ? 0 : env.t;
    const n = Math.max(W, H) * 1.4;
    const ox = (((t * 3) % n) + n) % n;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(a * r.blotch, 0, 1);
    // The noise is white and see-through: drawn small into a buffer and tinted dark in place (source-atop), it
    // becomes soft dark patches, stretched over the stage in one go.
    const b = env.buffer('mood-blotch', 0.2);
    for (let x = -ox; x < W; x += n) b.ctx.drawImage(noise, x, -n * 0.25, n + 1, n + 1);
    b.ctx.globalCompositeOperation = 'source-atop';
    b.ctx.fillStyle = 'rgb(18,30,16)';
    b.ctx.fillRect(0, 0, W, H);
    c.drawImage(b.canvas, 0, 0, W, H);
  }

  /** The party's two coloured glows, drifting slowly round the sides. @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawParty(c, a) {
    if (!pink || a <= 0.005) return;
    const t = still ? 0 : env.t;
    const s = Math.max(W, H) * 0.9;
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = clamp(a * 0.4, 0, 1);
    const px = W * (0.05 + 0.08 * Math.sin(t * 0.21));
    const py = H * (0.25 + 0.12 * Math.sin(t * 0.17 + 1));
    c.drawImage(pink, px - s / 2, py - s / 2, s, s);
    const vx = W * (0.95 + 0.08 * Math.sin(t * 0.19 + 2));
    const vy = H * (0.7 + 0.12 * Math.sin(t * 0.23 + TAU / 3));
    c.drawImage(violet, vx - s / 2, vy - s / 2, s, s);
  }

  return {
    /** Ease the strength towards the chosen level. @param {number} dt seconds @returns {void} */
    step(dt) {
      const goal = LEVELS[level];
      k += (goal - k) * (1 - Math.exp(-dt * (still ? 20 : 4)));
    },
    /** The wash and vignette, the glow, the dingy blotches, the party lights. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const a = clamp(k * BASE, 0, 1);
      if (a <= 0.005) return;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = a;
      c.drawImage(shade, 0, 0, W, H);
      if (glow) {
        c.globalCompositeOperation = 'screen';
        c.globalAlpha = a;
        c.drawImage(glow, 0, 0, W, H);
      }
      drawBlotches(c, a * smooth(Math.min(1, k)));
      drawParty(c, a);
    },
    /** Step to the next strength: normal, strong, off. @returns {void} */
    trigger() { level = (level + 1) % LEVELS.length; },
    /** For checks. @returns {object} state */
    state: () => ({ level: NAMES[level], k: Number(k.toFixed(2)), tier, party }),
  };
}

export default { id: 'mood', num: 11, name: 'Mood', layer: 'glass', order: 10, make };
