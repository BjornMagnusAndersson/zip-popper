// Effect 12 for the light test page (fx-test.html): tip coins fly to the coin counter (screen space, over
// everything). A coin counter pill sits in the top right corner (the game's look: cream, a thick ink outline, the gold
// coin icon, a bold number). Fire: a handful of little cartoon gold coins burst out of the face, spinning (each one
// squashes as it turns and shows its darker rim edge-on, with a flash when it faces us), arc up, then swoop one after
// the other into the counter: each landing gives a tiny glint and makes the counter bump and count up. Idle: now and
// then a single coin hops over. Still: no flight; Fire counts the coins in with a soft glint. Lite: half the coins.
// See the README in core.js for the effect interface.
import { clamp, smooth, lerp, TAU } from './sprites.js';

const INK = '#2a211d';
const GOLD = '#ffd23f';
/** The game's coin icon squiggle (screens/dom.js icon('coin')), in its 24 px box. */
const SQUIGGLE = 'M12 7v10M9.5 9.5c0-1.4 5-1.4 5 0s-5 3.4-5 5 5 1.4 5 0';

/**
 * Paint a coin face: gold, an ink outline, a darker inner ring, the game's coin squiggle and a shine.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @returns {void}
 */
function paintCoin(c, w) {
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
 * Make the coins and the counter for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, still } = env;
  const f = env.face ?? { cx: W / 2, cy: H * 0.5, rx: Math.min(W, H) * 0.3, ry: Math.min(W, H) * 0.36 };
  const face = env.sprite('coin-face', 32, 32, (c, w) => paintCoin(c, w));
  const rim = env.sprite('coin-rim', 32, 32, (c, w) => paintRim(c, w));
  const halo = env.dot('255,236,150', 0.2);
  const D = clamp(22 * sc, 18, 34); // a coin's size in flight
  // The counter pill, top right.
  const pillH = clamp(30 * sc, 28, 44);
  const font = `800 ${Math.round(pillH * 0.56)}px system-ui, sans-serif`;
  const pad = 10;
  const pillR = W - pad; // its right edge
  const pillY = pad;
  const icon = { x: 0, y: pillY + pillH / 2, r: pillH * 0.36 }; // x is set each frame (the pill grows with the number)
  let total = 120;
  let shown = 120; // the number on the pill (counts up as coins land)
  let bump = 0;
  let shine = 0; // the icon's glint after a landing
  const coins = [];
  let fired = 0;
  let nextLone = 3; // scene seconds of the next idle coin
  let stillCount = -1; // still mode: seconds since Fire (the number counts up)
  let stillFrom = 0;

  /** Measure the pill for the number now. @param {CanvasRenderingContext2D} c context @returns {{x: number, w: number}} left and width */
  function pillBox(c) {
    c.font = font;
    const tw = c.measureText(String(shown)).width;
    const w = pillH * 0.95 + tw + pillH * 0.42;
    return { x: pillR - w, w };
  }

  /** Send one coin out of the face: up and out, then home in on the counter. @param {number} i which in the burst @param {number} n how many @returns {void} */
  function launch(i, n) {
    const a = -Math.PI / 2 + (env.rand() - 0.5) * 2.2 + ((i / Math.max(1, n - 1)) - 0.5) * 0.6;
    const v = H * (0.85 + env.rand() * 0.5);
    coins.push({
      x: f.cx + (env.rand() - 0.5) * f.rx * 0.6, y: f.cy + f.ry * (0.05 + env.rand() * 0.25),
      vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v, age: -i * 0.035, fly: 0.48 + i * 0.05 + env.rand() * 0.06,
      home: null, spin: env.rand() * TAU, vs: (9 + env.rand() * 7) * (env.rand() < 0.5 ? -1 : 1),
    });
  }

  /** Move a coin on: a ballistic arc, then a swoop along a curve into the counter (faster as it goes). @param {object} p coin @param {number} dt seconds @returns {boolean} true when it has landed */
  function move(p, dt) {
    p.age += dt;
    if (p.age < 0) return false;
    p.spin += p.vs * dt;
    if (p.age < p.fly) {
      p.vy += H * 2.1 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return false;
    }
    if (!p.home) p.home = { x0: p.x, y0: p.y, cx: p.x + p.vx * 0.22, cy: p.y + p.vy * 0.22 - H * 0.08, u: 0, dur: 0.42 + env.rand() * 0.1 };
    const h = p.home;
    h.u += dt / h.dur;
    const u = Math.min(1, h.u) ** 1.6; // speeding up toward the counter
    const tx = icon.x;
    const ty = icon.y;
    p.x = (1 - u) ** 2 * h.x0 + 2 * (1 - u) * u * h.cx + u * u * tx;
    p.y = (1 - u) ** 2 * h.y0 + 2 * (1 - u) * u * h.cy + u * u * ty;
    return h.u >= 1;
  }

  /** Draw one spinning coin: the rim band edge-on, the face squashed by the turn, a flash when it faces us. @param {CanvasRenderingContext2D} c context @param {number} x centre x @param {number} y centre y @param {number} d size @param {number} spin turn @returns {void} */
  function drawCoin(c, x, y, d, spin) {
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const fw = d * Math.abs(cs);
    const th = d * 0.16 * Math.abs(sn); // the rim's width as it turns
    const side = Math.sign(cs * sn) || 1;
    c.globalCompositeOperation = 'source-over';
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

  /** The counter pill: cream with an ink outline, the coin icon, the number; it bumps when a coin lands. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawPill(c) {
    const box = pillBox(c);
    icon.x = box.x + pillH * 0.52;
    const s = 1 + 0.2 * bump;
    c.save();
    c.translate(box.x + box.w / 2, pillY + pillH / 2);
    c.scale(s, s);
    c.translate(-(box.x + box.w / 2), -(pillY + pillH / 2));
    c.fillStyle = 'rgba(42,33,29,0.35)'; // the game's offset shadow
    c.beginPath(); c.roundRect(box.x + 3, pillY + 4, box.w, pillH, pillH / 2); c.fill();
    c.fillStyle = '#fff3e6';
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath(); c.roundRect(box.x, pillY, box.w, pillH, pillH / 2); c.fill(); c.stroke();
    const ir = icon.r * (1 + 0.25 * bump);
    c.drawImage(face, icon.x - ir * 1.14, icon.y - ir * 1.14, ir * 2.28, ir * 2.28);
    c.font = font;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = bump > 0.3 ? '#b86a00' : INK;
    c.fillText(String(shown), box.x + pillH * 0.95, pillY + pillH / 2 + 1);
    c.restore();
    if (shine > 0.02) { // the glint on the icon
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(shine, 0, 1);
      const z = icon.r * 2.6 * (0.6 + 0.4 * shine);
      c.drawImage(halo, icon.x - z, icon.y - z, z * 2, z * 2);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fffdf0';
      c.save();
      c.translate(icon.x + icon.r * 0.5, icon.y - icon.r * 0.5);
      c.rotate(shine * 0.6);
      starPath(c, 0, 0, icon.r * 1.1 * shine);
      c.fill();
      c.restore();
      c.globalAlpha = 1;
    }
  }

  return {
    /** Fly the coins, land them on the counter (count, bump, glint), send the odd idle coin. @param {number} dt seconds @returns {void} */
    step(dt) {
      bump *= Math.exp(-9 * dt);
      shine *= Math.exp(-5 * dt);
      if (still) {
        if (stillCount >= 0) {
          stillCount += dt;
          const k = smooth(Math.min(1, stillCount / 1.4));
          const next = Math.round(lerp(stillFrom, total, k));
          if (next !== shown) { shown = next; shine = Math.max(shine, 0.6); }
          if (stillCount > 1.6) stillCount = -1;
        }
        return;
      }
      for (let i = coins.length - 1; i >= 0; i -= 1) {
        if (move(coins[i], dt)) {
          coins.splice(i, 1);
          shown += 1;
          bump = 1;
          shine = 1;
        }
      }
      if (env.t > nextLone && coins.length === 0) { // the idle tip: one coin hops over now and then
        nextLone = env.t + 4 + env.rand() * 2;
        total += 1;
        launch(0, 1);
      }
    },
    /** The coins in flight, then the counter on top. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      for (const p of coins) {
        if (p.age < 0) continue;
        const shrink = p.home ? lerp(1, 0.7, smooth(p.home.u)) : smooth(p.age / 0.12) * 0.4 + 0.6;
        drawCoin(c, p.x, p.y, D * shrink, p.spin);
      }
      drawPill(c);
    },
    /** A tip burst: coins out of the face and into the counter. @returns {void} */
    trigger() {
      fired += 1;
      const n = env.count(14);
      if (still) { stillFrom = shown; total = shown + n; stillCount = 0; return; }
      total += n;
      for (let i = 0; i < n; i += 1) launch(i, n);
    },
    /** Counts for checks. @returns {object} state */
    state: () => ({ coins: coins.length, shown, fired, icon: { x: Math.round(icon.x), y: Math.round(icon.y) } }),
  };
}

export default { id: 'coins', num: 12, name: 'Coins', layer: 'glass', make };
