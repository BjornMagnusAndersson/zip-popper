// The tip coins on the result screen (SPEC D45 item 2), from the effects test page's coins (js/dev/fx/coins.js): a
// handful of little cartoon gold coins burst out of the customer's clean face, spinning (each squashes as it turns and
// shows its darker rim edge-on, with a flash when it faces us), arc up, then swoop one after the other into the coin
// counter (the Total line's coin). Each landing gives a tiny glint on the counter's coin and calls onLand, so the
// screen can bump the counter and count it up (result.js; celebrate-logic.js coinSteps makes it end at the true total).
// Reduced motion: no coins fly (result.js shows the total at once with a still glint). Lighter graphics: fewer coins.
// It draws on an effects layer (fx-layer.js). Where the face and the counter are is asked again every frame, so a
// scrolled screen or a turned phone still sends the coins to the right place.
import { clamp, smooth, lerp, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';

const INK = '#2a211d';
const GOLD = '#ffd23f';
/** The game's coin icon squiggle (screens/dom.js icon('coin')), in its 24 px box. */
const SQUIGGLE = 'M12 7v10M9.5 9.5c0-1.4 5-1.4 5 0s-5 3.4-5 5 5 1.4 5 0';

/** Paint a coin face: gold, an ink outline, a darker inner ring, the game's coin squiggle and a shine. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void} */
export function paintCoin(c, w) {
  const m = w / 2;
  const r = w * 0.44;
  const g = c.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
  g.addColorStop(0, '#fff3a6');
  g.addColorStop(0.55, GOLD);
  g.addColorStop(1, '#f0a822');
  c.fillStyle = g;
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(176,110,10,0.55)'; // the raised inner ring
  c.lineWidth = w * 0.05;
  c.beginPath(); c.arc(m, m, r * 0.74, 0, TAU); c.stroke();
  c.save();
  c.translate(m - r * 0.9, m - r * 0.9);
  c.scale((r * 1.8) / 24, (r * 1.8) / 24);
  c.strokeStyle = INK;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 2.2;
  c.stroke(new Path2D(SQUIGGLE));
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = w * 0.08;
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.7)'; // the cartoon shine
  c.beginPath(); c.ellipse(m - r * 0.42, m - r * 0.44, r * 0.2, r * 0.11, -0.75, 0, TAU); c.fill();
}

/** Paint the coin's rim (what shows edge-on): a darker gold disc with an ink outline. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @returns {void} */
function paintRim(c, w) {
  const m = w / 2;
  const r = w * 0.44;
  c.fillStyle = '#d18a14';
  c.beginPath(); c.arc(m, m, r, 0, TAU); c.fill();
  c.strokeStyle = INK;
  c.lineWidth = w * 0.08;
  c.stroke();
}

/**
 * A four-point star (the game's sparkle shape) round (x, y).
 * @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} z ray length
 * @returns {void}
 */
export function starPath(c, x, y, z) {
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
 * Make the tip coins' flight for an effects layer.
 * @param {{kit: object, n: number, from: () => {x: number, y: number, r: number}, to: () => {x: number, y: number, r: number},
 *   onLand?: (i: number) => void, W: number, H: number, seed?: number}} o kit = the layer's sprite kit; n = how many coins;
 *   from = where they burst out (the face's middle and size, in layer CSS px); to = the counter's coin (middle and
 *   radius); onLand(i) = coin i (0 first) landed; W, H = the layer's size now
 * @returns {{step: (dt: number, W: number, H: number) => void, draw: (c: CanvasRenderingContext2D) => void, done: () => boolean,
 *   state: () => object}} the effect
 */
export function makeCoinFlight(o) {
  const rand = rng(o.seed ?? 29);
  const face = o.kit.sprite('coin-face', 32, 32, (c, w) => paintCoin(c, w));
  const rim = o.kit.sprite('coin-rim', 32, 32, (c, w) => paintRim(c, w));
  const halo = o.kit.dot('255,236,150', 0.2);
  let W = o.W;
  let H = o.H;
  const S = clamp(Math.min(W, H), 300, 800); // the burst's size follows the screen's short side
  const D = clamp(S * 0.062, 18, 30); // a coin's size in flight
  const coins = [];
  let landed = 0;
  let shine = 0; // the counter coin's glint after a landing
  let target = o.to();

  /**
   * Send one coin out: a small hop up and out toward the counter's side (low, so it never flies over the eyes; the
   * coins after it a moment later), then home in on the counter.
   * @param {number} i which @returns {void}
   */
  function launch(i) {
    const src = o.from();
    const dir = Math.sign(target.x - src.x) || 1;
    const a = -Math.PI / 2 + dir * (0.6 + (rand() - 0.5) * 1.1 + ((i / Math.max(1, o.n - 1)) - 0.5) * 0.3);
    const v = S * (0.42 + rand() * 0.2);
    coins.push({
      i, x: src.x + (rand() - 0.5) * src.r * 0.8, y: src.y + (rand() - 0.5) * src.r * 0.3,
      vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v, age: -i * 0.05, fly: 0.3 + rand() * 0.1,
      home: null, spin: rand() * TAU, vs: (9 + rand() * 7) * (rand() < 0.5 ? -1 : 1),
    });
  }

  /** Move a coin on: an arc, then a swoop along a curve into the counter (faster as it goes). @param {object} p coin @param {number} dt seconds @returns {boolean} true when it has landed */
  function move(p, dt) {
    p.age += dt;
    if (p.age < 0) return false;
    p.spin += p.vs * dt;
    if (p.age < p.fly) {
      p.vy += S * 2.1 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return false;
    }
    if (!p.home) p.home = { x0: p.x, y0: p.y, cx: p.x + p.vx * 0.22, cy: p.y + p.vy * 0.22 - S * 0.06, u: 0, dur: 0.36 + rand() * 0.08 };
    const h = p.home;
    h.u += dt / h.dur;
    const u = Math.min(1, h.u) ** 1.6;
    p.x = (1 - u) ** 2 * h.x0 + 2 * (1 - u) * u * h.cx + u * u * target.x;
    p.y = (1 - u) ** 2 * h.y0 + 2 * (1 - u) * u * h.cy + u * u * target.y;
    return h.u >= 1;
  }

  /** Draw one spinning coin: the rim edge-on, the face squashed by the turn, a flash when it faces us. @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} d size @param {number} spin turn @returns {void} */
  function drawCoin(c, x, y, d, spin) {
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const fw = d * Math.abs(cs);
    const th = d * 0.16 * Math.abs(sn);
    const side = Math.sign(cs * sn) || 1;
    c.drawImage(rim, x - (fw + th) / 2, y - d / 2, fw + th, d);
    if (fw > 0.6) c.drawImage(face, x - fw / 2 + side * th * 0.5, y - d / 2, fw, d);
    const flash = Math.max(0, Math.abs(cs) - 0.93) / 0.07;
    if (flash > 0.02) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = flash * 0.7;
      c.drawImage(halo, x - d * 0.75, y - d * 0.75, d * 1.5, d * 1.5);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
  }

  for (let i = 0; i < o.n; i += 1) launch(i);

  return {
    /** Fly the coins and land them on the counter (glint, onLand). @param {number} dt seconds @param {number} w layer width @param {number} h layer height @returns {void} */
    step(dt, w, h) {
      W = w || W;
      H = h || H;
      target = o.to();
      shine *= Math.exp(-5 * dt);
      for (let i = coins.length - 1; i >= 0; i -= 1) {
        if (!move(coins[i], dt)) continue;
        coins.splice(i, 1);
        shine = 1;
        o.onLand?.(landed);
        landed += 1;
      }
    },
    /** The coins in flight, then the glint on the counter's coin. @param {CanvasRenderingContext2D} c context (CSS px) @returns {void} */
    draw(c) {
      for (const p of coins) {
        if (p.age < 0) continue;
        const z = p.home ? lerp(1, Math.max(0.55, (target.r * 2.2) / D), smooth(p.home.u)) : smooth(p.age / 0.12) * 0.4 + 0.6;
        drawCoin(c, p.x, p.y, D * z, p.spin);
      }
      if (shine > 0.02) {
        const r = target.r;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = clamp(shine, 0, 1);
        const z = r * 2.6 * (0.6 + 0.4 * shine);
        c.drawImage(halo, target.x - z, target.y - z, z * 2, z * 2);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fffdf0';
        c.save();
        c.translate(target.x + r * 0.55, target.y - r * 0.55);
        c.rotate(shine * 0.6);
        starPath(c, 0, 0, r * 1.1 * shine);
        c.fill();
        c.restore();
        c.globalAlpha = 1;
      }
    },
    /** Whether every coin has landed and the last glint has faded. @returns {boolean} done */
    done: () => coins.length === 0 && shine <= 0.02,
    /** Counts, for checks. @returns {object} state */
    state: () => ({ flying: coins.length, landed }),
  };
}
