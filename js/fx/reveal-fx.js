// The reveal sparkle on the result screen's before and after card (SPEC D45 item 2), from the effects test page's
// reveal (js/dev/fx/reveal.js): a pearly band of light (warm white with a faint aqua and pink fringe) glides over the
// clean face from the top left to the bottom right, kept inside the face's outline; as it passes, four-point star
// glints pop on the cheeks, the nose, the forehead and the chin (never on the eyes: celebrate-logic.js revealSpots),
// then a soft "ding": a warm glow over the face, short comic rays round the top of the head and a few tiny sparkles
// floating up. It is drawn on a layer inside the AFTER picture, so it only shows where the clean face shows.
// Reduced motion: a soft still glow and one still glint on the cheek (paintStill), nothing moves.
import { clamp, smooth, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';
import { revealSpots } from './celebrate-logic.js';
import { starPath } from './coins-fx.js';

const SWEEP = 0.9; // seconds for the shine to cross the face
const DING = 0.95; // when the ding comes
const END = 2.8;
const ANGLE = 0.62; // the band's travel direction (radians below the x axis): top left to bottom right
const RAYS = 9; // the ding's comic rays round the top of the head

/** Paint the shine band sprite: a soft rise to a warm-white core and down again, aqua on one side, pink on the other. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w width (across the band) @param {number} h height @returns {void} */
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
 * Make the reveal sparkle for the AFTER picture's effects layer.
 * @param {{kit: object, face: {cx: number, cy: number, rx: number, ry: number}, features?: object}} o kit = the layer's
 *   sprite kit; face = the face's middle and half sizes as shares of the picture's width (cx, rx) and height (cy, ry),
 *   reveal.js revealFaceBox; features = the face's features (eyes), for the glint spots
 * @returns {{step: (dt: number) => void, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, done: () => boolean,
 *   paintStill: (c: CanvasRenderingContext2D, W: number, H: number) => void, state: () => object}} the effect
 */
export function makeRevealSparkle(o) {
  const band = o.kit.sprite('reveal-band', 64, 8, paintBand, 1);
  const halo = o.kit.dot('255,244,200', 0.18);
  const glow = o.kit.glow('255,236,196');
  const rand = rng(31);
  const dx = Math.cos(ANGLE);
  const dy = Math.sin(ANGLE);
  const spots = revealSpots(o.features, o.face.ry / Math.max(0.01, o.face.rx));
  const floaters = Array.from({ length: 10 }, () => ({ a: rand() * TAU, k: 0.6 + rand() * 0.5, d: 0.1 + rand() * 0.5, s: 1.6 + rand() * 2, v: 0.12 + rand() * 0.16 }));
  let tt = 0;

  /** The face in CSS px for the layer's size now. @param {number} W width @param {number} H height @returns {{cx: number, cy: number, rx: number, ry: number}} face */
  function faceAt(W, H) {
    return { cx: o.face.cx * W, cy: o.face.cy * H, rx: o.face.rx * W, ry: o.face.ry * H };
  }

  /** A glint: a soft halo and a four-point star. @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} z size @param {number} a alpha @param {number} spin turn @returns {void} */
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

  /** The shine bands crossing the face, inside its outline. @param {CanvasRenderingContext2D} c context @param {object} f face @param {number} p 0..1 how far across @returns {void} */
  function drawSweep(c, f, p) {
    const reach = Math.abs(f.rx * dx) + Math.abs(f.ry * dy);
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
    const bw = f.rx * 0.55;
    c.globalAlpha = clamp(fade * 0.52, 0, 1);
    c.drawImage(band, -bw / 2, -len / 2, bw, len);
    c.globalAlpha = clamp(fade * 0.5, 0, 1); // a thin second band trailing behind
    c.drawImage(band, -bw * 0.95, -len / 2, bw * 0.22, len);
    c.restore();
  }

  /** The ding: a warm glow over the face, comic rays round the top of the head, tiny sparkles floating up. @param {CanvasRenderingContext2D} c context @param {object} f face @param {number} k seconds since the ding @returns {void} */
  function drawDing(c, f, k) {
    if (k < 0 || k > 1.6) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(smooth(k / 0.08) * Math.exp(-k * 2.6) * 0.32, 0, 1);
    c.drawImage(glow, f.cx - f.rx * 1.6, f.cy - f.ry * 1.5, f.rx * 3.2, f.ry * 3);
    const u = smooth(k / 0.55);
    if (u < 1) {
      c.globalAlpha = clamp((1 - u) * 0.95, 0, 1);
      c.strokeStyle = 'rgba(255,248,220,1)';
      c.lineCap = 'round';
      c.lineWidth = Math.max(1.5, f.rx * 0.035);
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
    for (const q of floaters) {
      const kk = k - q.d;
      if (kk < 0 || kk > 1.1) continue;
      c.globalAlpha = clamp(Math.sin((kk / 1.1) * Math.PI) * 0.9, 0, 1);
      const z = q.s * f.rx * 0.04;
      const x = f.cx + Math.cos(q.a) * f.rx * q.k;
      const y = f.cy + Math.sin(q.a) * f.ry * q.k * 0.8 - kk * q.v * f.ry * 2;
      c.drawImage(halo, x - z, y - z, z * 2, z * 2);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  }

  /** When each glint pops: as the band passes over it. @param {object} f face @param {number[]} s the spot [u, v, size] @returns {number} seconds */
  function popAt(f, s) {
    const reach = Math.abs(f.rx * dx) + Math.abs(f.ry * dy);
    const along = (s[0] * f.rx * dx + s[1] * f.ry * dy) / reach; // -1 .. 1 along the travel
    return (along * 0.5 + 0.5) * SWEEP * 0.9 + 0.06;
  }

  return {
    /** Move the clock on. @param {number} dt seconds @returns {void} */
    step(dt) { tt += dt; },
    /** The sweep, the glints and the ding. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} W width @param {number} H height @returns {void} */
    draw(c, W, H) {
      const f = faceAt(W, H);
      if (tt < SWEEP) drawSweep(c, f, tt / SWEEP);
      const base = f.rx * 0.16;
      for (const [i, s] of spots.entries()) {
        const at = popAt(f, s);
        glint(c, f.cx + s[0] * f.rx, f.cy + s[1] * f.ry, base * s[2] * popSize(tt - at, 1.1), 1, (tt - at) * 0.8 + i);
      }
      drawDing(c, f, tt - DING);
    },
    /** Whether the sparkle is over. @returns {boolean} done */
    done: () => tt > END,
    /** Reduced motion: a soft still glow over the face and one still glint on the left cheek. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} W width @param {number} H height @returns {void} */
    paintStill(c, W, H) {
      const f = faceAt(W, H);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.16;
      c.drawImage(glow, f.cx - f.rx * 1.6, f.cy - f.ry * 1.5, f.rx * 3.2, f.ry * 3);
      c.globalCompositeOperation = 'source-over';
      const s = spots[0];
      if (s) glint(c, f.cx + s[0] * f.rx, f.cy + s[1] * f.ry, f.rx * 0.13, 0.85, 0);
      c.globalAlpha = 1;
    },
    /** The timeline, for checks. @returns {object} state */
    state: () => ({ t: Math.round(tt * 100) / 100, glints: spots.length }),
  };
}
