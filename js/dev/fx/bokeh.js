// Effect 7 for the light test page (fx-test.html): bokeh lights. Soft out-of-focus circles of light float slowly in
// the room behind the customer, at three depths (many small far ones, some middle ones with a lens-like brighter rim,
// a few big very soft near ones), each gently pulsing. Party mood: pink, violet, blue, aqua and gold. Otherwise warm
// fairy-light gold and amber, and the room goes a touch dusky so the lights glow. A string of fairy lights swags along
// the top, its little bulbs twinkling. Fire: a sparkle wave runs along the string and the circles flare up and settle.
// Everything is a sprite painted once (the circles, the bulbs' glow), then only copied. Still: nothing moves.
// See the README in core.js for the effect interface.
import { clamp, smooth, TAU, rgba } from './sprites.js';

const PARTY = ['255,92,190', '172,112,255', '84,170,255', '92,236,220', '255,204,92'];
const WARM = ['255,196,104', '255,214,150', '255,174,88', '255,232,190', '255,188,122'];
// The three depths: count, radius range (CSS px before sc), strength, rise speed (px/s), soft or rimmed.
const DEPTHS = [
  { n: 16, r: [4, 9], a: 0.6, v: [3, 6], soft: false },
  { n: 11, r: [11, 20], a: 0.42, v: [6, 10], soft: false },
  { n: 6, r: [26, 44], a: 0.22, v: [9, 15], soft: true },
];

/**
 * Paint one bokeh circle (white; tinted by drawing a coloured copy): a soft disc with a slightly brighter rim, like
 * a lens out of focus, or (soft) a plain blurry disc for the near ones.
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
 * Make the bokeh lights for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, party, still } = env;
  const cols = party ? PARTY : WARM;
  const discs = {};
  for (const rgb of cols) {
    discs[`${rgb}:0`] = env.sprite(`bokeh:${rgb}:0`, 64, 64, (c, w) => paintDisc(c, w, rgb, false), 1);
    discs[`${rgb}:1`] = env.sprite(`bokeh:${rgb}:1`, 64, 64, (c, w) => paintDisc(c, w, rgb, true), 1);
  }
  const lights = [];
  for (const [d, o] of DEPTHS.entries()) {
    for (let i = 0, n = env.count(o.n); i < n; i += 1) {
      const r = (o.r[0] + env.rand() * (o.r[1] - o.r[0])) * sc;
      lights.push({
        d, r, rgb: cols[Math.floor(env.rand() * cols.length)], soft: o.soft,
        x: ((i + env.rand()) / n) * W, y: env.rand() * H * 0.95,
        vy: -(o.v[0] + env.rand() * (o.v[1] - o.v[0])) * sc, sway: (4 + env.rand() * 10) * sc,
        a: o.a * (0.7 + env.rand() * 0.5), ph: env.rand() * TAU, pw: 0.6 + env.rand() * 1.1,
      });
    }
  }
  lights.sort((p, q) => p.d - q.d); // far first
  // The fairy light string: swags between hooks along the top, bulbs evenly along it.
  const swags = W > H ? 3 : 2;
  const hookY = H * (W > H ? 0.035 : 0.025);
  const sag = H * (W > H ? 0.07 : 0.045);
  const bulbs = [];
  const gap = 30 * sc;
  for (let x = gap * 0.5; x < W; x += gap) {
    const k = bulbs.length;
    bulbs.push({ x, rgb: party ? PARTY[k % PARTY.length] : (k % 2 ? '255,214,140' : '255,186,96'), ph: env.rand() * TAU, pw: 1.2 + env.rand() * 1.6 });
  }
  const bulbGlow = Object.fromEntries([...new Set(bulbs.map((b) => b.rgb))].map((rgb) => [rgb, env.glow(rgb, 64)]));
  let tt = -1; // seconds since Fire
  let fired = 0;

  /** The scene clock for drifting things (frozen when still). @returns {number} seconds */
  const clock = () => (still ? 3 : env.t);

  /** Where the string hangs at x (a row of sagging swags). @param {number} x across @returns {number} y */
  function wireY(x) {
    const span = W / swags;
    const u = ((x % span) + span) % span / span;
    return hookY + sag * 4 * u * (1 - u);
  }

  /** How much Fire is brightening the lights now (0 none .. 1 full). @returns {number} boost */
  function boost() {
    if (tt < 0) return 0;
    return still ? 0.5 * Math.sin(Math.min(1, tt / 2.4) * Math.PI) : smooth(tt / 0.25) * Math.exp(-Math.max(0, tt - 0.25) * 1.4);
  }

  /** The floating circles of light (additive). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawDiscs(c) {
    const t = clock();
    const b = boost();
    c.globalCompositeOperation = 'lighter';
    for (const p of lights) {
      const x = p.x + Math.sin(t * 0.23 + p.ph) * p.sway;
      const pulse = 0.72 + 0.28 * Math.sin(t * p.pw + p.ph);
      const r = p.r * (1 + 0.05 * Math.sin(t * p.pw * 0.7 + p.ph)) * (1 + 0.12 * b);
      c.globalAlpha = clamp(p.a * pulse * (1 + 0.9 * b), 0, 1);
      c.drawImage(discs[`${p.rgb}:${p.soft ? 1 : 0}`], x - r, p.y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
  }

  /** The fairy light string: the wire, each bulb's glow, then the little bulbs and their caps. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawString(c) {
    const t = clock();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = party ? 'rgba(30,20,46,0.9)' : 'rgba(42,33,29,0.75)';
    c.lineWidth = Math.max(1.2, 1.4 * sc);
    c.beginPath();
    for (let x = -2; x <= W + 2; x += 6) { if (x < 0) c.moveTo(x, wireY(x)); else c.lineTo(x, wireY(x)); }
    c.stroke();
    const bulbR = 3.6 * sc;
    const waving = tt >= 0 && !still;
    const wave = waving ? (tt * W * 0.9) % (W * 1.6) - W * 0.2 : 0; // Fire: a bright wave runs along the string (twice)
    const lit = bulbs.map((bl) => {
      const tw = still ? 0.85 : 0.7 + 0.3 * Math.sin(t * bl.pw + bl.ph);
      const w = waving ? Math.exp(-(((bl.x - wave) / (W * 0.12)) ** 2)) : 0;
      return clamp(tw + w * 0.9 + boost() * 0.4, 0, 1.6);
    });
    c.globalCompositeOperation = 'lighter';
    for (const [i, bl] of bulbs.entries()) {
      const y = wireY(bl.x) + bulbR * 1.4;
      const g = bulbR * (5 + 3 * Math.max(0, lit[i] - 1));
      c.globalAlpha = clamp(lit[i] * (party ? 0.6 : 0.45), 0, 1);
      c.drawImage(bulbGlow[bl.rgb], bl.x - g, y - g, g * 2, g * 2);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    for (const [i, bl] of bulbs.entries()) {
      const y = wireY(bl.x);
      const k = clamp(lit[i], 0, 1);
      const [r, g, b] = bl.rgb.split(',').map(Number);
      c.fillStyle = `rgb(${Math.round(r * (0.55 + 0.45 * k) + 60 * k)},${Math.round(g * (0.55 + 0.45 * k) + 40 * k)},${Math.round(b * (0.55 + 0.45 * k) + 40 * k)})`;
      c.beginPath(); c.ellipse(bl.x, y + bulbR * 1.5, bulbR * 0.78, bulbR * 1.1, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)'; // the shine
      c.beginPath(); c.ellipse(bl.x - bulbR * 0.25, y + bulbR * 1.2, bulbR * 0.2, bulbR * 0.34, 0, 0, TAU); c.fill();
      c.fillStyle = party ? '#3b2f55' : '#3f5a3a'; // the little cap on the wire
      c.fillRect(bl.x - bulbR * 0.45, y - bulbR * 0.1, bulbR * 0.9, bulbR * 0.7);
    }
  }

  return {
    /** Float the circles up (round again from the bottom) and move Fire's clock on. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (tt >= 0) { tt += dt; if (tt > 3.2) tt = -1; }
      if (still) return;
      for (const p of lights) {
        p.y += p.vy * dt;
        if (p.y < -p.r * 1.2) { p.y = H + p.r; p.x = env.rand() * W; }
      }
    },
    /** Outside the party a touch of dusk, then the circles and the string, all behind the customer. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      if (!party) {
        c.fillStyle = 'rgba(34,20,46,0.16)';
        c.fillRect(0, 0, W, H);
      }
      drawDiscs(c);
      drawString(c);
    },
    /** A sparkle wave along the string and a flare of the circles. @returns {void} */
    trigger() { tt = 0; fired += 1; },
    /** Counts for checks. @returns {object} state */
    state: () => ({ lights: lights.length, bulbs: bulbs.length, fired, boost: Math.round(boost() * 100) / 100 }),
  };
}

export default { id: 'bokeh', num: 7, name: 'Bokeh', layer: 'back', make };
