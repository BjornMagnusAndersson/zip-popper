// Pop effects test page, variant B: Squish and burst. A look-and-feel test only (see popfx/shared.js for the hooks).
import { INK, KIND, CALM, smooth, clamp, backOut, play, later, buzz, W, sc, face, bp, T, realT, rand, drawRing } from './shared.js';
import { gooLook } from '../../pop/art.js';
import { rng } from '../../pop/logic.js';

/**
 * A comic burst star with a word in it (B): a jagged yellow star with a dark ink outline and a soft drop shadow.
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x centre
 * @param {number} y centre
 * @param {number} R outer radius
 * @param {number} alpha opacity
 * @param {string} word the word ("POP!")
 * @param {number} seed for the jagged points
 * @returns {void}
 */
function drawBurst(c, x, y, R, alpha, word, seed) {
  if (R <= 1 || alpha <= 0) return;
  const fr = rng(seed);
  const n = 13;
  const pts = [];
  for (let i = 0; i < n * 2; i += 1) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? R * (0.6 + fr() * 0.08) : R * (0.9 + fr() * 0.16);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]);
  }
  /** Trace the star, scaled. @param {number} k scale @returns {void} */
  const path = (k) => {
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px * k, py * k) : c.moveTo(px * k, py * k)));
    c.closePath();
  };
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(-0.12);
  c.save();
  c.translate(R * 0.05, R * 0.07);
  c.fillStyle = 'rgba(60,30,20,0.28)';
  path(1); c.fill();
  c.restore();
  const g = c.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  g.addColorStop(0, '#fffbe6');
  g.addColorStop(0.55, '#ffe066');
  g.addColorStop(1, '#ffae34');
  c.fillStyle = g;
  path(1); c.fill();
  c.lineJoin = 'round';
  c.lineWidth = Math.max(2.5, R * 0.05);
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = 'rgba(255,255,240,0.65)';
  path(0.62); c.fill();
  let fs = R * 0.5;
  c.font = `900 ${fs}px "Arial Black", "Arial Rounded MT Bold", "Comic Sans MS", system-ui, sans-serif`;
  const wdt = c.measureText(word).width;
  if (wdt > R * 1.45) {
    fs *= (R * 1.45) / wdt;
    c.font = `900 ${fs}px "Arial Black", "Arial Rounded MT Bold", "Comic Sans MS", system-ui, sans-serif`;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = fs * 0.18;
  c.strokeStyle = INK;
  c.strokeText(word, 0, fs * 0.05);
  c.fillStyle = '#ff6f91';
  c.fillText(word, 0, fs * 0.05);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillText(word, -fs * 0.03, fs * 0.01, undefined);
  c.fillStyle = '#ff6f91';
  c.fillText(word, 0, fs * 0.07);
  c.restore();
}

// B's own goo colours: the whitehead's goo a touch creamier than the game's milky white (so the gobs read as glossy
// goo on the skin, not as seeds), the big bump's the game's custard cream. Never red.
const GOB_LOOK = {
  white: { body: '#fffcf0', shade: '#eedfae', edge: '#8c7a4c', hi: '#ffffff' },
  cream: { body: '#fbe39a', shade: '#e8bf5a', edge: '#8f6518', hi: '#fffbe8' },
};

/**
 * The outline of one goo gob: a round ball, a little stretched along the way it flies (no pointed tail: a point made
 * them read as seeds); st = 0 is a plain ball.
 * @param {CanvasRenderingContext2D} c context (already turned so +x is the way it flies)
 * @param {number} R head radius
 * @param {number} st stretch 0..1
 * @returns {void}
 */
function gobPath(c, R, st) {
  c.beginPath();
  c.ellipse(0, 0, R * (1 + st * 0.4), R * (1 - st * 0.22), 0, 0, Math.PI * 2);
}

/**
 * One glossy goo gob in the air: a soft shadow on the skin below it, then the teardrop with a dark rim, a creamy
 * body that is lighter on the lit side, a long shine and a sparkle dot.
 * @param {CanvasRenderingContext2D} c context (scene px)
 * @param {object} g the gob {x, y, z, vx, vy, vz, r}
 * @param {object} look its colours (GOB_LOOK)
 * @returns {void}
 */
function drawFlyingGob(c, g, look) {
  c.fillStyle = 'rgba(110,60,30,0.16)';
  c.beginPath(); c.ellipse(g.x, g.y, g.r, g.r * 0.7, 0, 0, Math.PI * 2); c.fill();
  const y = g.y - g.z * 0.6;
  const R = g.r * (1 + g.z / 220);
  const vy = g.vy - g.vz * 0.6;
  const st = Math.min(0.5, Math.hypot(g.vx, vy) / 600);
  c.save();
  c.translate(g.x, y);
  c.rotate(Math.atan2(vy, g.vx));
  gobPath(c, R, st);
  c.fillStyle = look.edge;
  c.fill();
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1.6, R * 0.22);
  c.strokeStyle = look.edge;
  c.stroke();
  const grad = c.createLinearGradient(0, -R, 0, R);
  grad.addColorStop(0, look.body);
  grad.addColorStop(0.55, look.body);
  grad.addColorStop(1, look.shade);
  c.fillStyle = grad;
  gobPath(c, R, st);
  c.fill();
  c.fillStyle = look.hi;
  c.beginPath(); c.ellipse(-R * 0.1, -R * 0.42, R * (0.45 + st * 0.3), R * 0.17, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(R * 0.42, -R * 0.12, Math.max(0.8, R * 0.12), 0, Math.PI * 2); c.fill();
  c.restore();
}

/**
 * A gob that has landed on the skin: it splats flat, wobbles back round, keeps a short smear where it slid in and a
 * couple of tiny drops beside it (big gobs), all glossy with a dark rim.
 * @param {CanvasRenderingContext2D} c context (scene px)
 * @param {object} g the gob {x, y, r, age, sa, seed}
 * @param {object} look its colours
 * @returns {void}
 */
function drawLandedGob(c, g, look) {
  const k = CALM ? 0 : g.age < 0.5 ? Math.exp(-g.age * 8) * Math.cos(g.age * 28) : 0;
  const rx = g.r * 1.12 * (1 + 0.55 * k);
  const ry = g.r * 0.86 * (1 - 0.4 * k);
  const fr = rng(g.seed);
  const bits = g.r > 4 * sc ? [0, 1].map(() => ({ a: fr() * Math.PI * 2, d: g.r * (1.6 + fr() * 0.7), r: g.r * (0.2 + fr() * 0.14) })) : [];
  /** Trace the gob, its smear and its tiny drops, grown by e px. @param {number} e grow @returns {void} */
  const shape = (e) => {
    c.beginPath();
    c.ellipse(g.x, g.y, rx + e, ry + e, 0, 0, Math.PI * 2);
    for (const b of bits) { c.moveTo(g.x + Math.cos(b.a) * b.d + b.r + e, g.y + Math.sin(b.a) * b.d * 0.8); c.arc(g.x + Math.cos(b.a) * b.d, g.y + Math.sin(b.a) * b.d * 0.8, b.r + e, 0, Math.PI * 2); }
  };
  const tx = g.x - Math.cos(g.sa) * g.r * 1.5; // the smear where it slid in
  const ty = g.y - Math.sin(g.sa) * g.r * 1.5;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = look.edge;
  c.lineWidth = g.r * 1.1 + 2.4;
  c.beginPath(); c.moveTo(tx, ty); c.lineTo(g.x, g.y); c.stroke();
  c.fillStyle = look.edge;
  shape(1.3); c.fill();
  c.strokeStyle = look.shade;
  c.lineWidth = g.r * 1.1;
  c.beginPath(); c.moveTo(tx, ty); c.lineTo(g.x, g.y); c.stroke();
  c.fillStyle = look.shade;
  shape(0); c.fill();
  c.fillStyle = look.body;
  c.beginPath(); c.ellipse(g.x - rx * 0.1, g.y - ry * 0.16, rx * 0.76, ry * 0.68, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = look.hi;
  c.beginPath(); c.ellipse(g.x - rx * 0.32, g.y - ry * 0.38, rx * 0.34, ry * 0.18, -0.45, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(g.x + rx * 0.4, g.y - ry * 0.05, Math.max(0.7, g.r * 0.1), 0, Math.PI * 2); c.fill();
  c.restore();
}

/**
 * The stretchy goo string between the bump and a gob: it thins as the gob flies off, then snaps and both ends spring
 * back (a gob that never had a string, or a string long gone, draws nothing).
 * @param {CanvasRenderingContext2D} c context (scene px)
 * @param {object} g the gob (with snap = seconds the string holds, and its own age since the pop as g.t)
 * @param {object} look its colours
 * @returns {void}
 */
function drawGobString(c, g, look) {
  if (!g.snap) return;
  const gy = g.landed ? g.y : g.y - g.z * 0.6;
  const dx = g.x - g.x0;
  const dy = gy - g.y0;
  const L = Math.hypot(dx, dy) || 1;
  const w0 = g.r * 0.75;
  /** Stroke one piece of string in rim, body and shine. @param {number} ax start x @param {number} ay start y @param {number} bx end x @param {number} by end y @param {number} cx bend x @param {number} cy bend y @param {number} w width @returns {void} */
  const piece = (ax, ay, bx, by, cx, cy, w) => {
    for (const [col, lw, oy] of [[look.edge, w + 2, 0], [look.body, w, 0], [look.hi, Math.max(0.6, w * 0.25), -w * 0.2]]) {
      c.strokeStyle = col;
      c.lineWidth = lw;
      c.beginPath(); c.moveTo(ax, ay + oy); c.quadraticCurveTo(cx, cy + oy, bx, by + oy); c.stroke();
    }
  };
  c.save();
  c.lineCap = 'round';
  if (g.t < g.snap) { // still joined: it sags in the middle and thins out as it stretches
    const u = g.t / g.snap;
    piece(g.x0, g.y0, g.x, gy, (g.x0 + g.x) / 2, (g.y0 + gy) / 2 + L * 0.18, Math.max(1.2, w0 * (1 - 0.75 * u)));
  } else if (g.t < g.snap + 0.14) { // snapped: two short ends spring back to the bump and to the gob
    const v = (g.t - g.snap) / 0.14;
    const part = 0.4 * (1 - v) ** 2;
    const w = Math.max(1, w0 * 0.3 * (1 - v));
    piece(g.x0, g.y0, g.x0 + dx * part, g.y0 + dy * part, g.x0 + dx * part * 0.5, g.y0 + dy * part * 0.5 + L * part * 0.25, w);
    piece(g.x, gy, g.x - dx * part, gy - dy * part, g.x - dx * part * 0.5, gy - dy * part * 0.5 + L * part * 0.25, w);
  }
  c.restore();
}

/** B: squish and burst. A strong build-up (swell, wobble, shine, strain lines, tremble), then a comic POP star above the finger, glossy goo gobs (some on stretchy strings) that arc out and splat on the skin, and a squash of the face. @returns {object} the variant */
function makeB() {
  const big = KIND === 'big';
  const look = GOB_LOOK[bp.goo] ?? GOB_LOOK.white;
  const gobs = [];
  let star = null;
  let squashAt = -1;
  return {
    /** Swells far more than the game, breathes faster and faster, trembles near the end and puffs up just before it goes. @returns {object} look */
    look() {
      const pr = bp.pressure;
      if (bp.popped) return { amt: 0, warp: 0, jx: 0, jy: 0 };
      const puff = 0.3 * smooth((pr - 0.86) / 0.14); // the last bulge, as if it is about to blow
      const breathe = CALM ? 0 : Math.sin(realT * (9 + 16 * pr)) * 0.07 * pr;
      const tr = CALM ? 0 : smooth((pr - 0.45) / 0.55) * sc;
      return { amt: 1.85 * pr ** 1.2 + puff + breathe, warp: pr * 1.3 + puff * 0.6 + breathe, jx: Math.sin(realT * 93) * 1.6 * tr, jy: Math.cos(realT * 71) * 1.2 * tr };
    },
    /** A big stretched shine and flickering strain lines round the swollen bump. @param {CanvasRenderingContext2D} c context @param {object} p bump @param {object} lk look @returns {void} */
    afterBump(c, p, lk) {
      if (bp.popped) return;
      const pr = bp.pressure;
      const s = p.r * (1 + 0.45 * lk.amt);
      c.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * pr})`;
      c.beginPath(); c.ellipse(p.x - s * 0.12, p.y - s * 0.52, s * (0.2 + 0.36 * pr), s * (0.1 - 0.04 * pr), -0.25, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(p.x + s * 0.42, p.y - s * 0.3, s * 0.06 * (0.5 + pr), 0, Math.PI * 2); c.fill();
      if (pr < 0.4) return;
      const k = (pr - 0.4) / 0.6;
      const fr = rng(Math.floor(realT / 0.07) + 3);
      c.save();
      c.strokeStyle = INK;
      c.lineCap = 'round';
      c.lineWidth = Math.max(1.6, 2.1 * sc);
      c.globalAlpha = Math.min(1, k * 1.8);
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2 + 0.15 + fr() * 0.25;
        const r0 = s * 1.2 + (3 + fr() * 3) * sc;
        const len = (5 + 9 * k + fr() * 4) * sc;
        c.beginPath();
        c.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
        c.lineTo(p.x + Math.cos(a) * (r0 + len), p.y + Math.sin(a) * (r0 + len));
        c.stroke();
      }
      c.restore();
    },
    /** The burst: star, gobs, squash, sound and buzz. @returns {void} */
    pop() {
      const n = big ? 14 : 11;
      const fat = big ? 4 : 3; // the first few are big gobs on goo strings
      for (let i = 0; i < n; i += 1) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.6;
        const isFat = i % Math.ceil(n / fat) === 0;
        const v = (isFat ? 95 + rand() * 100 : 130 + rand() * 150) * sc; // fast out, then the air slows them (step)
        const off = bp.r * 0.5; // they start at the edge of the burst, not all in one spot
        gobs.push({
          x: bp.x + Math.cos(a) * off, y: bp.y + Math.sin(a) * off, x0: bp.x, y0: bp.y, z: 0.1, t: 0, landed: false, age: 0, seed: 50 + i * 13,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20 * sc, vz: isFat ? 150 + rand() * 60 : 160 + rand() * 110,
          r: (isFat ? 6.5 + rand() * 3 : 3 + rand() * 2.8) * sc * (big ? 1.2 : 1),
          snap: isFat ? 0.13 + rand() * 0.1 : 0,
        });
      }
      const R = (big ? 70 : 56) * sc;
      star = {
        at: T, R, seed: big ? 7 : 3,
        x: clamp(bp.x - R * 0.35, R + 6, W - R - 6), y: Math.max(R * 0.9 + 4, bp.y - bp.r - R * 0.8),
      };
      squashAt = T;
      if (big) { play('pop_big'); later(0.34, 'splat'); buzz([35, 30, 70]); } else { play('pop_small'); later(0.06, 'squelch'); buzz(30); }
    },
    /** Gobs fly in arcs and land; landed ones settle. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      for (const g of gobs) {
        g.t += sdt;
        if (g.landed) { g.age += sdt; continue; }
        const drag = Math.exp(-sdt * 2.5);
        g.vx *= drag;
        g.vy *= drag;
        g.x += g.vx * sdt;
        g.y += g.vy * sdt;
        g.vz -= 700 * sdt;
        g.z += g.vz * sdt;
        if (g.z <= 0) { g.z = 0; g.landed = true; g.sa = Math.atan2(g.vy, g.vx); }
      }
    },
    /** The face squashes and springs back after the pop. @returns {object|null} camera */
    cam() {
      if (CALM || squashAt < 0) return null;
      const t = T - squashAt;
      if (t > 0.9) return null;
      const q = (big ? 0.075 : 0.055) * Math.exp(-t * 6) * Math.cos(t * 26);
      return { sx: 1 + q, sy: 1 - q, ax: face.cx, ay: face.cy + face.ry * 1.25 };
    },
    /** Landed gobs lie on the skin, under the fingertips. @param {CanvasRenderingContext2D} c context @returns {void} */
    mid(c) {
      for (const g of gobs) if (g.landed) drawLandedGob(c, g, look);
    },
    /** The flash ring, the goo strings, the flying gobs and the burst star. @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    over(c, p) {
      if (!star) return;
      const t = T - star.at;
      drawRing(c, p, t, 0.25, 3);
      for (const g of gobs) drawGobString(c, g, look);
      for (const g of gobs) if (!g.landed) drawFlyingGob(c, g, look);
      if (t > 0.8) return;
      const grow = CALM ? 1 : t < 0.11 ? backOut(t / 0.11) : 1;
      const fade = t > 0.5 ? Math.max(0, 1 - (t - 0.5) / 0.28) : 1;
      const pulse = CALM ? 0 : Math.sin(t * 40) * 0.035 * Math.exp(-t * 5);
      drawBurst(c, star.x, star.y, star.R * (grow + pulse), CALM ? Math.min(1, t / 0.12) * fade : fade, big ? 'KA-POP!' : 'POP!', star.seed);
    },
  };
}

export default { id: 'B', name: 'Squish and burst', make: makeB };
