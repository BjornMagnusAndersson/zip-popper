// Effect 10 for the light test page (fx-test.html): the "sparkly clean" reveal. Fire: a bright diagonal shine (a wide
// band and a thin one after it, warm white with a faint pastel fringe) glides over the face from the top left to the
// bottom right, kept inside the face's outline; as it passes, four-point star glints pop on the cheeks, the nose, the
// forehead and the chin, then a soft "ding": a warm glow over the face, a ring of light that opens out and fades, and
// a few tiny sparkles that float up. Idle: now and then one small glint twinkles on the skin.
// Still: no sweep; Fire fades the glints and the glow in and out. The bands and glows are sprites painted once.
// See the README in core.js for the effect interface. Optional env.spots (set by fx-strips.html, not here): the glint spots
// as [x share, y share, size] of the face's half sizes, instead of SPOTS (the comic heads have their eyes lower down).
import { clamp, smooth, TAU } from './sprites.js';

const SWEEP = 0.9; // seconds for the shine to cross the face
const DING = 0.95; // when the ding comes
const END = 2.8;
const ANGLE = 0.62; // the band's travel direction (radians below the x axis): top left to bottom right
const RAYS = 9; // the ding's comic rays round the top of the head
// Where the glints sit, as shares of the face's half sizes (x, y), and how big.
const SPOTS = [[-0.55, 0.18, 1], [0.56, 0.14, 0.85], [0.02, -0.5, 0.8], [0.06, 0.12, 0.7], [-0.2, 0.62, 0.6], [0.36, -0.28, 0.55]];

/**
 * A four-point star (the game's sparkle shape, as in backdrop.js sparkle()) round (x, y).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} z ray length
 * @returns {void}
 */
function starPath(c, x, y, z) {
  const k = z * 0.18;
  c.beginPath();
  c.moveTo(x, y - z);
  c.quadraticCurveTo(x + k, y - k, x + z, y);
  c.quadraticCurveTo(x + k, y + k, x, y + z);
  c.quadraticCurveTo(x - k, y + k, x - z, y);
  c.quadraticCurveTo(x - k, y - k, x, y - z);
  c.closePath();
}

/**
 * Paint the shine band sprite: across its width a soft rise to a bright warm-white core and down again, with a faint
 * aqua fringe on one side and pink on the other (a clean, pearly shine).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width (across the band)
 * @param {number} h height (along the band)
 * @returns {void}
 */
function paintBand(c, w, h) {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(160,240,255,0)');
  g.addColorStop(0.2, 'rgba(170,236,255,0.35)');
  g.addColorStop(0.42, 'rgba(255,250,236,0.85)');
  g.addColorStop(0.5, 'rgba(255,255,250,1)');
  g.addColorStop(0.58, 'rgba(255,248,236,0.85)');
  g.addColorStop(0.8, 'rgba(255,200,230,0.35)');
  g.addColorStop(1, 'rgba(255,190,230,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/**
 * Make the reveal shine for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, still, party } = env;
  const f = env.face ?? { cx: W / 2, cy: H * 0.5, rx: Math.min(W, H) * 0.3, ry: Math.min(W, H) * 0.36 };
  const band = env.sprite('reveal-band', 64, 8, (c, w, h) => paintBand(c, w, h), 1);
  const halo = env.dot('255,244,200', 0.18);
  const glow = env.glow('255,236,196');
  const dx = Math.cos(ANGLE);
  const dy = Math.sin(ANGLE);
  const reach = Math.abs(f.rx * dx) + Math.abs(f.ry * dy); // how far the face reaches along the travel direction
  const spots = (env.spots ?? SPOTS).map(([u, v, s]) => { // env.spots: another page's own glint spots (fx-strips.html: comic heads)
    const x = f.cx + u * f.rx;
    const y = f.cy + v * f.ry;
    const along = ((x - f.cx) * dx + (y - f.cy) * dy) / reach; // -1 .. 1 along the travel
    return { x, y, s, at: (along * 0.5 + 0.5) * SWEEP * 0.9 + 0.06 };
  });
  const floaters = [];
  for (let i = 0, n = env.count(12); i < n; i += 1) {
    const a = env.rand() * TAU;
    floaters.push({ x: f.cx + Math.cos(a) * f.rx * (0.6 + env.rand() * 0.5), y: f.cy + Math.sin(a) * f.ry * (0.5 + env.rand() * 0.5), d: 0.1 + env.rand() * 0.5, s: (1.6 + env.rand() * 2) * sc, v: (18 + env.rand() * 26) * sc });
  }
  let tt = -1; // seconds since Fire
  let fired = 0;
  let idleAt = 1.2; // when the next idle glint starts (scene seconds)
  let idleSpot = 0;

  /** A glint: a soft halo and a four-point star, popping big and settling. @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} z size @param {number} a alpha @param {number} spin turn @returns {void} */
  function glint(c, x, y, z, a, spin) {
    if (a <= 0.01 || z <= 0.2) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(a * 0.8, 0, 1);
    c.drawImage(halo, x - z * 1.4, y - z * 1.4, z * 2.8, z * 2.8);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = clamp(a, 0, 1);
    c.fillStyle = '#fffdf0';
    c.save();
    c.translate(x, y);
    c.rotate(spin);
    starPath(c, 0, 0, z);
    c.fill();
    c.restore();
  }

  /** How big a glint is at an age since it popped (a quick pop past full size, a settle, then it shrinks away). @param {number} k seconds since it popped @param {number} life how long it lasts @returns {number} 0..1.25 */
  function popSize(k, life) {
    if (k < 0 || k > life) return 0;
    if (k < 0.12) return smooth(k / 0.12) * 1.25;
    return (1 + 0.25 * Math.exp(-(k - 0.12) * 10)) * (1 - smooth((k - life * 0.55) / (life * 0.45)));
  }

  /** The shine bands crossing the face, inside the face's outline. @param {CanvasRenderingContext2D} c context @param {number} p 0..1 how far across @returns {void} */
  function drawSweep(c, p) {
    const pos = (p * 2 - 1) * (reach + f.rx * 0.5);
    const len = (f.rx + f.ry) * 2.4;
    c.save();
    c.beginPath();
    c.ellipse(f.cx, f.cy, f.rx, f.ry, 0, 0, TAU);
    c.clip();
    c.globalCompositeOperation = 'lighter';
    c.translate(f.cx + dx * pos, f.cy + dy * pos);
    c.rotate(ANGLE);
    const fade = smooth(p / 0.15) * (1 - smooth((p - 0.85) / 0.15));
    c.globalAlpha = clamp(fade * (party ? 0.45 : 0.52), 0, 1);
    const bw = f.rx * 0.55;
    c.drawImage(band, -bw / 2, -len / 2, bw, len);
    c.globalAlpha = clamp(fade * (party ? 0.42 : 0.5), 0, 1); // a thin second band trailing behind
    c.drawImage(band, -bw * 0.95, -len / 2, bw * 0.22, len);
    c.restore();
  }

  /** The ding: a warm glow over the face and a ring of light opening out. @param {CanvasRenderingContext2D} c context @param {number} k seconds since the ding @returns {void} */
  function drawDing(c, k) {
    if (k < 0 || k > 1.6) return;
    c.globalCompositeOperation = 'lighter';
    const gk = still ? Math.sin(Math.min(1, k / 1.6) * Math.PI) * 0.6 : smooth(k / 0.08) * Math.exp(-k * 2.6);
    c.globalAlpha = clamp(gk * 0.32, 0, 1);
    c.drawImage(glow, f.cx - f.rx * 1.6, f.cy - f.ry * 1.5, f.rx * 3.2, f.ry * 3);
    if (!still) {
      // Comic "ding" rays: short strokes round the top of the head that shoot outward and fade.
      const u = smooth(k / 0.55);
      if (u < 1) {
        c.globalAlpha = clamp((1 - u) * 0.95, 0, 1);
        c.strokeStyle = 'rgba(255,248,220,1)';
        c.lineCap = 'round';
        c.lineWidth = Math.max(2, 3.4 * sc);
        c.beginPath();
        for (let i = 0; i < RAYS; i += 1) {
          const a = -Math.PI * (0.06 + (0.88 * i) / (RAYS - 1));
          const r0 = 1.06 + u * 0.22;
          const r1 = r0 + 0.07 + 0.1 * (1 - u);
          const ex = Math.cos(a) * f.rx;
          const ey = Math.sin(a) * f.ry * 1.08;
          c.moveTo(f.cx + ex * r0, f.cy + ey * r0);
          c.lineTo(f.cx + ex * r1, f.cy + ey * r1);
        }
        c.stroke();
      }
      for (const q of floaters) { // tiny sparkles floating up
        const kk = k - q.d;
        if (kk < 0 || kk > 1.1) continue;
        const a = Math.sin((kk / 1.1) * Math.PI);
        c.globalAlpha = clamp(a * 0.9, 0, 1);
        const z = q.s * 2.4;
        c.drawImage(halo, q.x - z / 2, q.y - kk * q.v - z / 2, z, z);
      }
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  }

  return {
    /** Move Fire's clock on, and pick the next idle glint. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (tt >= 0) { tt += dt; if (tt > END) tt = -1; }
      if (!still && env.t > idleAt + 0.8) { idleAt = env.t + 1.6 + env.rand() * 1.8; idleSpot = Math.floor(env.rand() * spots.length); }
    },
    /** The sweep, the glints and the ding when fired; else the odd idle glint. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const base = 7 * sc;
      if (tt >= 0) {
        if (!still && tt < SWEEP) drawSweep(c, tt / SWEEP);
        for (const [i, s] of spots.entries()) {
          const k = still ? Math.sin(Math.min(1, tt / END) * Math.PI) : 0;
          const z = still ? k * 0.9 : popSize(tt - s.at, 1.1);
          glint(c, s.x, s.y, base * s.s * 1.6 * z, still ? k : 1, still ? 0 : (tt - s.at) * 0.8 + i);
        }
        drawDing(c, tt - (still ? 0 : DING));
        return;
      }
      if (still) { glint(c, spots[0].x, spots[0].y, base * 0.9, 0.75, 0); return; }
      const k = env.t - idleAt;
      const s = spots[idleSpot];
      glint(c, s.x, s.y, base * s.s * popSize(k, 0.8), 0.9, k * 0.9);
    },
    /** The sparkly clean reveal. @returns {void} */
    trigger() { tt = 0; fired += 1; },
    /** The timeline, for checks. @returns {object} state */
    state: () => ({ fired, t: Math.round(tt * 100) / 100, glints: spots.length }),
  };
}

export default { id: 'reveal', num: 10, name: 'Reveal', layer: 'front', order: 80, make };
