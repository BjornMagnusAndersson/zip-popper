// Fairy-light bokeh for Prom Penny's party day (SPEC D45 item 6), ported from the developer effects page
// (js/dev/fx/bokeh.js): soft out-of-focus circles of party light (pink, violet, gold, warm white and a little aqua)
// float slowly up the room behind her face at three depths, each gently pulsing, and a string of fairy lights swags
// along the top with its little bulbs twinkling. A touch of dusk over the room makes the lights glow. Every circle
// and glow is a sprite painted once (sprites.js), then only copied. No disco ball (that is saved for the full game).
import { clamp, TAU, rgba } from './sprites.js';

/** The party's light colours "r,g,b". */
export const PARTY_LIGHTS = ['255,104,196', '186,128,255', '255,206,104', '255,236,206', '110,226,226'];
/** The three depths: count, radius range (CSS px before sc), strength, rise speed (px/s), soft or rimmed. */
const DEPTHS = [
  { n: 14, r: [4, 9], a: 0.55, v: [3, 6], soft: false },
  { n: 9, r: [11, 20], a: 0.4, v: [6, 10], soft: false },
  { n: 5, r: [26, 42], a: 0.2, v: [9, 14], soft: true },
];

/**
 * Paint one bokeh circle: a soft disc with a slightly brighter rim, like a lens out of focus, or (soft) a plain blurry
 * disc for the near ones.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string} rgb colour "r,g,b"
 * @param {boolean} soft the blurrier kind
 * @returns {void}
 */
function paintDisc(c, w, rgb, soft) {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  if (soft) {
    g.addColorStop(0, rgba(rgb, 0.6));
    g.addColorStop(0.55, rgba(rgb, 0.5));
    g.addColorStop(0.85, rgba(rgb, 0.18));
    g.addColorStop(1, rgba(rgb, 0));
  } else {
    g.addColorStop(0, rgba(rgb, 0.5));
    g.addColorStop(0.62, rgba(rgb, 0.62));
    g.addColorStop(0.84, rgba(rgb, 0.92));
    g.addColorStop(0.92, rgba(rgb, 0.45));
    g.addColorStop(1, rgba(rgb, 0));
  }
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
}

/**
 * Make the party lights for one picture size.
 * @param {{W: number, H: number, sc: number, kit: object, rand: () => number, share?: number, still?: boolean,
 *   top?: number}} o picture size in CSS px, size factor, the sprite kit (sprites.js makeSprites), a seeded random,
 *   the share of circles to use (Lighter graphics: fewer), still = nothing moves, top = where the string hangs (CSS px)
 * @returns {{step: (dt: number) => void, draw: (c: CanvasRenderingContext2D, t: number) => void, state: () => object}}
 *   the lights: step moves them on by dt seconds, draw paints them at scene time t
 */
export function makeBokeh(o) {
  const { W, H, sc, kit, rand } = o;
  const share = o.share ?? 1;
  const still = Boolean(o.still);
  const discs = {};
  for (const rgb of PARTY_LIGHTS) {
    discs[`${rgb}:0`] = kit.sprite(`bokeh:${rgb}:0`, 64, 64, (c, w) => paintDisc(c, w, rgb, false), 1);
    discs[`${rgb}:1`] = kit.sprite(`bokeh:${rgb}:1`, 64, 64, (c, w) => paintDisc(c, w, rgb, true), 1);
  }
  const lights = [];
  for (const [d, dp] of DEPTHS.entries()) {
    for (let i = 0, n = Math.max(1, Math.round(dp.n * share)); i < n; i += 1) {
      const r = (dp.r[0] + rand() * (dp.r[1] - dp.r[0])) * sc;
      lights.push({
        d, r, rgb: PARTY_LIGHTS[Math.floor(rand() * PARTY_LIGHTS.length)], soft: dp.soft,
        x: ((i + rand()) / n) * W, y: rand() * H * 0.95,
        vy: -(dp.v[0] + rand() * (dp.v[1] - dp.v[0])) * sc, sway: (4 + rand() * 10) * sc,
        a: dp.a * (0.7 + rand() * 0.5), ph: rand() * TAU, pw: 0.6 + rand() * 1.1,
      });
    }
  }
  lights.sort((p, q) => p.d - q.d); // far first
  // The fairy light string: swags between hooks along the top, bulbs evenly along it.
  const land = W > H;
  const swags = land ? 3 : 2;
  const hookY = o.top ?? H * (land ? 0.035 : 0.025);
  const sag = H * (land ? 0.07 : 0.045);
  const bulbs = [];
  const gap = 30 * sc;
  for (let x = gap * 0.5; x < W; x += gap) {
    bulbs.push({ x, rgb: PARTY_LIGHTS[bulbs.length % PARTY_LIGHTS.length], ph: rand() * TAU, pw: 1.2 + rand() * 1.6 });
  }
  const bulbGlow = Object.fromEntries(PARTY_LIGHTS.map((rgb) => [rgb, kit.glow(rgb, 64)]));

  /** Where the string hangs at x (a row of sagging swags). @param {number} x across @returns {number} y */
  function wireY(x) {
    const span = W / swags;
    const u = ((x % span) + span) % span / span;
    return hookY + sag * 4 * u * (1 - u);
  }

  /** The floating circles of light (added light). @param {CanvasRenderingContext2D} c context @param {number} t seconds @returns {void} */
  function drawDiscs(c, t) {
    c.globalCompositeOperation = 'lighter';
    for (const p of lights) {
      const x = p.x + Math.sin(t * 0.23 + p.ph) * p.sway;
      const pulse = 0.72 + 0.28 * Math.sin(t * p.pw + p.ph);
      const r = p.r * (1 + 0.05 * Math.sin(t * p.pw * 0.7 + p.ph));
      c.globalAlpha = clamp(p.a * pulse, 0, 1);
      c.drawImage(discs[`${p.rgb}:${p.soft ? 1 : 0}`], x - r, p.y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
  }

  /** The fairy light string: the wire, each bulb's glow, then the little bulbs and their caps. @param {CanvasRenderingContext2D} c context @param {number} t seconds @returns {void} */
  function drawString(c, t) {
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(42,26,52,0.85)';
    c.lineWidth = Math.max(1.2, 1.4 * sc);
    c.beginPath();
    for (let x = -2; x <= W + 2; x += 6) { if (x < 0) c.moveTo(x, wireY(x)); else c.lineTo(x, wireY(x)); }
    c.stroke();
    const bulbR = 3.6 * sc;
    const lit = bulbs.map((bl) => (still ? 0.85 : 0.7 + 0.3 * Math.sin(t * bl.pw + bl.ph)));
    c.globalCompositeOperation = 'lighter';
    for (const [i, bl] of bulbs.entries()) {
      const y = wireY(bl.x) + bulbR * 1.4;
      const g = bulbR * 5;
      c.globalAlpha = clamp(lit[i] * 0.55, 0, 1);
      c.drawImage(bulbGlow[bl.rgb], bl.x - g, y - g, g * 2, g * 2);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    for (const [i, bl] of bulbs.entries()) {
      const y = wireY(bl.x);
      const k = clamp(lit[i], 0, 1);
      const [r, g, b] = bl.rgb.split(',').map(Number);
      c.fillStyle = `rgb(${Math.round(Math.min(255, r * (0.55 + 0.45 * k) + 60 * k))},${Math.round(Math.min(255, g * (0.55 + 0.45 * k) + 40 * k))},${Math.round(Math.min(255, b * (0.55 + 0.45 * k) + 40 * k))})`;
      c.beginPath(); c.ellipse(bl.x, y + bulbR * 1.5, bulbR * 0.78, bulbR * 1.1, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)'; // the shine
      c.beginPath(); c.ellipse(bl.x - bulbR * 0.25, y + bulbR * 1.2, bulbR * 0.2, bulbR * 0.34, 0, 0, TAU); c.fill();
      c.fillStyle = '#3b2f55'; // the little cap on the wire
      c.fillRect(bl.x - bulbR * 0.45, y - bulbR * 0.1, bulbR * 0.9, bulbR * 0.7);
    }
  }

  return {
    /** Float the circles up (round again from the bottom). @param {number} dt seconds @returns {void} */
    step(dt) {
      if (still) return;
      for (const p of lights) {
        p.y += p.vy * dt;
        if (p.y < -p.r * 1.2) { p.y = H + p.r; p.x = rand() * W; }
      }
    },
    /** A touch of party dusk, then the circles and the string. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} t seconds @returns {void} */
    draw(c, t) {
      const time = still ? 3 : t;
      c.fillStyle = 'rgba(40,18,56,0.14)';
      c.fillRect(0, 0, W, H);
      drawDiscs(c, time);
      drawString(c, time);
    },
    /** Counts for checks. @returns {object} state */
    state: () => ({ lights: lights.length, bulbs: bulbs.length, still }),
  };
}
