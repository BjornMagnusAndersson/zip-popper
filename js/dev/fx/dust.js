// Effect 3 for the light test page (fx-test.html): dust in the light. A slanted shaft of light falls through the room:
// from the ring light when the 'lamp' upgrade is owned, else from high up on the right like a window (where the spa's
// daylight falls in tier 2). Very fine dust motes drift and slowly tumble in the air; they only show inside the light,
// where they twinkle softly as their flat sides catch it, and fade out as they drift out of it. A few bigger, blurry
// specks float lazily close to us. In the dingy studio the shaft is a dusty yellow with slowly moving haze in it.
// Fire ("scrub done"): the dust whooshes out of the light in a swirl and fades, the shaft warms and turns clean, and a
// few clean glints pop in it. After a while the dust slowly comes back (so it can be tried again).
// Tier 0: lots of dust; tier 1: softer; tier 2: almost none. Still: a calm still frame. Lite: about half the motes.
// See the README in core.js for the effect interface.
import { clamp, smooth, lerp, TAU } from './sprites.js';

const DUSTY = '232,214,146'; // the dingy shaft: a dusty yellow
const CLEAN = '255,234,192'; // after the scrub: a clean warm white
const PARTY = '232,186,255'; // in the party mood: violet-pink light
const MOTE = '255,238,200'; // the motes' colour
const SCRUB_LEN = 3; // seconds the scrub-done whoosh takes
const CLEAN_HOLD = 9; // seconds the shaft stays clean before the dust drifts back
const DUST_BACK = 5; // seconds the dust takes to come back

/**
 * Paint the light shaft sprite: a long soft wedge (pointing right, the light's start at the left), narrower at the
 * start, with soft edges, faint rays that spread with it, fading out towards its far end. Drawn pixel by pixel once.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width (the shaft's length)
 * @param {number} h height (the shaft's width at its far end)
 * @param {string} rgb colour "r,g,b"
 * @param {number} start the width at the start, as a share of the far width
 * @param {number} fadeIn 0..1 how soon it is full strength (0 = right at the start)
 * @returns {void}
 */
function paintShaft(c, w, h, rgb, start, fadeIn) {
  const [r, g, b] = rgb.split(',').map(Number);
  const img = c.createImageData(w, h);
  for (let x = 0; x < w; x += 1) {
    const u = x / w;
    const hw = start + (1 - start) * u; // the wedge's half width, as a share of h / 2
    const along = (fadeIn > 0 ? smooth(u / fadeIn) : 1) * (1 - smooth((u - 0.55) / 0.45)) * (1 - u * 0.35);
    for (let y = 0; y < h; y += 1) {
      const v = (y + 0.5 - h / 2) / (h / 2) / hw; // -1..1 across the wedge
      const av = Math.abs(v);
      if (av >= 1) continue;
      const edge = 1 - smooth((av - 0.35) / 0.65);
      const rays = 0.72 + 0.16 * Math.sin(v * 9.3 + 1.1) + 0.12 * Math.sin(v * 23.7 + 0.4); // soft streaks in the light
      const a = edge * along * rays;
      const p = (y * w + x) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b;
      img.data[p + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * Paint a clean glint sprite: a soft halo with a four-point star (long thin rays) and two short diagonal rays.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w the sprite's size
 * @returns {void}
 */
export function paintGlint(c, w) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.6);
  g.addColorStop(0, 'rgba(255,250,232,0.9)');
  g.addColorStop(0.3, 'rgba(255,240,200,0.35)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.fillStyle = 'rgba(255,255,255,1)';
  starPath(c, m, m, m * 0.96, 0.07);
  c.fill();
  c.globalAlpha = 0.7;
  c.translate(m, m);
  c.rotate(Math.PI / 4);
  starPath(c, 0, 0, m * 0.42, 0.1);
  c.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
}

/**
 * A four-point star path (thin curved rays) round (x, y).
 * @param {CanvasRenderingContext2D} c context
 * @param {number} x centre x
 * @param {number} y centre y
 * @param {number} s ray length
 * @param {number} pinch how fat the rays are near the middle (share of s)
 * @returns {void}
 */
function starPath(c, x, y, s, pinch) {
  const k = s * pinch;
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x + k, y - k, x + s, y);
  c.quadraticCurveTo(x + k, y + k, x, y + s);
  c.quadraticCurveTo(x - k, y + k, x - s, y);
  c.quadraticCurveTo(x - k, y - k, x, y - s);
  c.closePath();
}

/**
 * Where the light shaft is for this scene: from the ring light (towards the face) when it is owned, else from high
 * on the right like a window (the same place the spa's daylight falls from).
 * @param {object} env the page's env
 * @returns {{ox: number, oy: number, ang: number, dx: number, dy: number, L: number, w0: number, w1: number, ring: boolean}}
 *   start point, direction (angle and unit vector), length, half width at the start and at the far end
 */
function shaftSpot(env) {
  const { W, H, room, face } = env;
  if (room.ring) {
    const R = room.ring;
    const tx = face ? face.cx : W / 2;
    const ty = face ? face.cy - face.ry * 0.15 : H * 0.5;
    const ang = Math.atan2(ty - R.y, tx - R.x) + (room.land ? 0.18 : -0.12); // aimed a little past the face, slanting down
    const L = Math.hypot(tx - R.x, ty - R.y) * 1.9;
    return { ox: R.x, oy: R.y, ang, dx: Math.cos(ang), dy: Math.sin(ang), L, w0: R.r * 1.05, w1: Math.min(W, H) * 0.42, ring: true };
  }
  const w = room.window;
  const tx = (w.x0 + w.x1) / 2;
  const bx = (w.bx0 + w.bx1) / 2;
  const ang = Math.atan2(w.by - w.y, bx - tx);
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const cosSlant = Math.abs(dy); // widths are measured across the shaft, not along the floor
  const back = Math.min(W, H) * 0.25; // start a little above the top edge, so the start never shows
  const L = Math.hypot(bx - tx, w.by - w.y) + back * 1.2;
  return {
    ox: tx - dx * back, oy: w.y - dy * back, ang, dx, dy, L,
    w0: ((w.x1 - w.x0) / 2) * cosSlant * 0.92, w1: ((w.bx1 - w.bx0) / 2) * cosSlant * 1.05, ring: false,
  };
}

/**
 * Make the dust in the light for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, tier, still, party, room } = env;
  const S = shaftSpot(env);
  const px = -S.dy; // across the shaft (unit vector)
  const py = S.dx;
  const amount = [1, 0.5, 0.14][tier] ?? 1; // how much dust the room has
  const shaftA = (party ? 0.5 : 0.4) * ([1, 0.85, 0.55][tier] ?? 1); // how bright the shaft is
  const startShare = clamp(S.w0 / S.w1, 0.05, 0.95);
  const SW = 256;
  const SH = 128;
  /** The shaft sprite in one colour. @param {string} rgb colour @returns {HTMLCanvasElement} sprite */
  const shaftSprite = (rgb) => env.sprite(`dust-shaft:${rgb}:${startShare.toFixed(2)}:${S.ring}`, SW, SH, (c, w, h) => paintShaft(c, w, h, rgb, startShare, S.ring ? 0.14 : 0.12), 1);
  const dustyRgb = party ? PARTY : tier === 2 ? CLEAN : DUSTY;
  const dusty = shaftSprite(dustyRgb);
  const clean = shaftSprite(party ? PARTY : CLEAN);
  const fine = env.dot(MOTE, 0.3, 16);
  const blur = env.dot(MOTE, 0.6, 32);
  const glint = env.sprite('dust-glint', 48, 48, paintGlint);
  const pool = env.glow(party ? PARTY : CLEAN, 96);
  const noise = env.noise(128, 57, 5);
  const hazeOn = !env.lite && amount > 0.4; // the slowly moving haze inside the dusty shaft

  // The motes, in shaft space: u along (0..1), v across (-1..1 inside the light, they drift out to +-1.5 and wrap).
  const motes = [];
  const nFine = env.count(Math.round(200 * amount) + 6);
  const nBig = env.count(Math.round(9 * amount) + 1);
  for (let i = 0; i < nFine + nBig; i += 1) {
    const big = i >= nFine;
    motes.push({
      u: 0.04 + (S.ring ? env.rand() ** 1.6 : env.rand()) * 0.9, v: (env.rand() * 2 - 1) * 1.5,
      big, front: big ? env.rand() < 0.8 : env.rand() < (S.ring ? 0.55 : 0.35), // the big blurry ones are close to us, in front
      size: big ? 3.2 + env.rand() * 4.5 : 0.9 + env.rand() ** 2 * 1.9,
      rot: env.rand() * TAU, spin: (env.rand() - 0.5) * (big ? 0.6 : 2.4),
      ph: env.rand() * TAU, ph2: env.rand() * TAU, speed: (big ? 0.45 : 0.7) + env.rand() * 0.6,
      bright: 0.6 + env.rand() * 0.4,
      x: 0, y: 0, vx: 0, vy: 0, // screen place and speed during the whoosh
    });
  }
  // With the ring light: more motes in the glow right round the ring (screen offsets hx, hy from its middle).
  const RR = S.ring ? room.ring.r * 3.6 : 0;
  for (let i = 0, n = S.ring ? env.count(Math.round(70 * amount) + 4) : 0; i < n; i += 1) {
    motes.push({
      halo: true, hx: (env.rand() * 2 - 1) * RR, hy: (env.rand() * 2 - 1) * RR, u: 0, v: 0,
      big: false, front: env.rand() < 0.5, size: 0.9 + env.rand() ** 2 * 1.9,
      rot: env.rand() * TAU, spin: (env.rand() - 0.5) * 2.4, ph: env.rand() * TAU, ph2: env.rand() * TAU,
      speed: 0.7 + env.rand() * 0.6, bright: 0.6 + env.rand() * 0.4, x: 0, y: 0, vx: 0, vy: 0,
    });
  }
  const sparks = []; // the clean glints after the scrub
  const puffs = []; // the dusty clouds of the whoosh
  const puffSprite = env.sprite('dust-puff', 64, 64, (c, w) => { // a soft cloudy blob of dust (the noise, cut round)
    c.drawImage(noise, 0, 0, w, w);
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgb(${party ? PARTY : DUSTY})`;
    c.fillRect(0, 0, w, w);
  }, 1);
  let scrub = -1; // seconds since the scrub started (-1 = none)
  let cleanK = tier === 2 ? 1 : 0; // 0 dusty .. 1 clean shaft
  let dustK = 1; // how much of the dust shows (0 after the scrub, back to 1 when it returns)
  let scrubs = 0;

  /** The half width of the shaft at a share u of its length. @param {number} u 0..1 @returns {number} px */
  const halfAt = (u) => lerp(S.w0, S.w1, u);
  /** A shaft-space point on the screen. @param {number} u along @param {number} v across @returns {number[]} [x, y] */
  const toScreen = (u, v) => {
    const d = u * S.L;
    const h = v * halfAt(u);
    return [S.ox + S.dx * d + px * h, S.oy + S.dy * d + py * h];
  };
  /** How much light falls on a shaft-space point (0 outside the shaft). @param {number} u along @param {number} v across @returns {number} 0..1 */
  const lightAt = (u, v) => {
    const av = Math.abs(v);
    if (av >= 1 || u <= 0 || u >= 1) return 0;
    const along = (S.ring ? (1 - u) ** 0.8 : smooth(u / 0.12)) * (1 - smooth((u - 0.5) / 0.45));
    return (1 - smooth((av - 0.3) / 0.7)) * along;
  };

  /** Where a mote is on the screen. @param {object} m mote @returns {number[]} [x, y] */
  const moteXY = (m) => (m.halo ? [room.ring.x + m.hx, room.ring.y + m.hy] : toScreen(m.u, m.v));
  /** How much light falls on a mote (the shaft, or the ring light's round glow). @param {object} m mote @returns {number} 0..1 */
  const moteLight = (m) => (m.halo ? (1 - smooth(Math.hypot(m.hx, m.hy) / RR)) ** 1.4 : lightAt(m.u, m.v));
  /** Near motes fade out in front of the face (so a speck of light never looks like a spot on the skin). @param {number} x x @param {number} y y @returns {number} 0..1 */
  const offFace = (x, y) => (env.face ? smooth((Math.hypot((x - env.face.cx) / env.face.rx, (y - env.face.cy) / env.face.ry) - 0.9) / 0.22) : 1);
  /** The middle of the whoosh's swirl. @returns {number[]} [x, y] */
  const swirlAt = () => toScreen(S.ring ? 0.18 : 0.42, 0);

  /** Drift one mote on through the air: a slow swirl, a gentle settle downwards, and it tumbles. @param {object} m mote @param {number} dt seconds @param {number} t clock @returns {void} */
  function drift(m, dt, t) {
    const [x, y] = moteXY(m);
    const k = sc * m.speed;
    // A soft swirly breeze (cheap: a few waves over place and time) plus a slow settle and sideways drift.
    const vx = (5.5 * Math.sin(y * 0.019 + t * 0.29 + m.ph) + 2.5 * Math.sin(t * 0.11 + m.ph2) + 1.2) * k;
    const vy = (4.5 * Math.cos(x * 0.016 - t * 0.23 + m.ph * 1.3) + 1.6) * k;
    m.rot += m.spin * dt * (1 + 0.5 * Math.sin(t * 0.7 + m.ph));
    if (m.halo) {
      m.hx += vx * dt;
      m.hy += vy * dt;
      if (m.hx > RR) m.hx -= RR * 2; else if (m.hx < -RR) m.hx += RR * 2;
      if (m.hy > RR) m.hy -= RR * 2; else if (m.hy < -RR) m.hy += RR * 2;
      return;
    }
    const d = halfAt(m.u);
    m.u += ((vx * S.dx + vy * S.dy) * dt) / S.L;
    m.v += ((vx * px + vy * py) * dt) / d;
    if (m.u > 0.97) m.u -= 0.92; else if (m.u < 0.04) m.u += 0.92;
    if (m.v > 1.5) m.v -= 3; else if (m.v < -1.5) m.v += 3;
  }

  /** Start the scrub-done whoosh: every mote gets a push into a swirl round the shaft's middle and out of the light. @returns {void} */
  function fire() {
    scrubs += 1;
    scrub = 0;
    sparks.length = 0;
    const [cx, cy] = swirlAt();
    for (const m of motes) {
      [m.x, m.y] = moteXY(m);
      const ax = m.x - cx;
      const ay = m.y - cy;
      const r = Math.hypot(ax, ay) || 1;
      const spinDir = 1; // all one way round: a swirl
      const sp = (60 + env.rand() * 90) * sc;
      m.vx = (-ay / r) * sp * spinDir + (ax / r) * sp * 0.5;
      m.vy = (ax / r) * sp * spinDir + (ay / r) * sp * 0.5 - 20 * sc;
      m.out = 0.15 + env.rand() * 0.5; // when it starts to fade
    }
    const n = env.count(7);
    for (let i = 0; i < n; i += 1) {
      let u = 0;
      let v = 0;
      for (let tries = 0; tries < 8; tries += 1) { // a place in the light, off the face (a glint on the skin would look like a spot)
        u = 0.15 + env.rand() * 0.55;
        v = (env.rand() * 2 - 1) * 0.6;
        if (offFace(...toScreen(u, v)) > 0.9) break;
      }
      if (offFace(...toScreen(u, v)) < 0.9) continue;
      sparks.push({ u, v, at: 1.5 + i * 0.2 + env.rand() * 0.15, life: 0.8 + env.rand() * 0.4, s: (9 + env.rand() * 9) * sc, rot: env.rand() * 0.6 - 0.3 });
    }
    puffs.length = 0; // soft dusty clouds that swirl out with the motes
    for (let i = 0, np = env.count(8); i < np; i += 1) {
      const [x, y] = toScreen(0.15 + env.rand() * 0.6, (env.rand() * 2 - 1) * 0.6);
      const a = Math.atan2(y - cy, x - cx);
      const sp = (50 + env.rand() * 50) * sc;
      puffs.push({ x, y, vx: -Math.sin(a) * sp + Math.cos(a) * sp * 0.4, vy: Math.cos(a) * sp + Math.sin(a) * sp * 0.4, s: S.w1 * (0.35 + env.rand() * 0.3), rot: env.rand() * TAU });
    }
  }

  /** Move the whoosh on: the motes spiral out with air drag and fade; then the clean light holds and the dust returns. @param {number} dt seconds @returns {void} */
  function stepScrub(dt) {
    scrub += dt;
    cleanK = Math.max(cleanK, smooth((scrub - 0.4) / 1.4));
    if (scrub < SCRUB_LEN) {
      dustK = 1;
      if (!still) {
        const [cx, cy] = swirlAt();
        const drag = Math.exp(-1.1 * dt);
        for (const m of motes) {
          const ax = m.x - cx;
          const ay = m.y - cy;
          const r = Math.hypot(ax, ay) || 1;
          m.vx = m.vx * drag + (-ay / r) * 160 * sc * dt + (ax / r) * 70 * sc * dt; // keeps swirling round and out
          m.vy = m.vy * drag + (ax / r) * 160 * sc * dt + (ay / r) * 70 * sc * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.rot += m.spin * dt * 4;
        }
        for (const p of puffs) {
          const ax = p.x - cx;
          const ay = p.y - cy;
          const r = Math.hypot(ax, ay) || 1;
          p.vx = p.vx * drag + (-ay / r) * 90 * sc * dt + (ax / r) * 30 * sc * dt;
          p.vy = p.vy * drag + (ax / r) * 90 * sc * dt + (ay / r) * 30 * sc * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += dt * 1.5;
        }
      }
      return;
    }
    if (dustK === 1 && scrub >= SCRUB_LEN) { // the dust is gone: put the motes back in the air, unseen, for later
      for (const m of motes) { m.u = 0.04 + env.rand() * 0.9; m.v = (env.rand() * 2 - 1) * 1.5; m.hx = (env.rand() * 2 - 1) * RR; m.hy = (env.rand() * 2 - 1) * RR; }
      dustK = 0;
    }
    const back = scrub - SCRUB_LEN - CLEAN_HOLD;
    if (back > 0 && tier < 2) {
      dustK = smooth(back / DUST_BACK);
      cleanK = 1 - dustK;
      if (back > DUST_BACK) { scrub = -1; dustK = 1; cleanK = 0; }
    }
  }

  /** How strong the whoosh motes still are (they fade as they fly out). @param {object} m mote @returns {number} 0..1 */
  const whooshFade = (m) => 1 - smooth((scrub - m.out) / 1.1);

  /** Draw the shaft (dusty and clean colours mixed by how clean it is). @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawShaft(c, a) {
    const t = still ? 0 : env.t;
    const breathe = still ? 1 : 0.92 + 0.05 * Math.sin(t * 0.37) + 0.03 * Math.sin(t * 1.13 + 1);
    const glow = scrub >= 0 ? 1 + 0.35 * Math.exp(-(((scrub - 1.7) / 0.5) ** 2)) : 1; // a warm swell as it turns clean
    c.globalCompositeOperation = 'lighter';
    c.save();
    c.translate(S.ox, S.oy);
    c.rotate(S.ang);
    const k = a * breathe * glow * (1 + 0.22 * cleanK);
    if (cleanK < 1) { c.globalAlpha = clamp(k * (1 - cleanK), 0, 1); c.drawImage(dusty, 0, -S.w1, S.L, S.w1 * 2); }
    if (cleanK > 0) { c.globalAlpha = clamp(k * cleanK, 0, 1); c.drawImage(clean, 0, -S.w1, S.L, S.w1 * 2); }
    c.restore();
  }

  /** The slowly moving haze inside the dusty shaft: cloudy noise cut to the shaft's shape, drawn small. @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawHaze(c, a) {
    const k = a * (1 - cleanK) * amount;
    if (!hazeOn || k < 0.01) return;
    const t = still ? 0 : env.t;
    const b = env.buffer('dust-haze', 0.25);
    const n = Math.min(W, H) * 0.9;
    b.ctx.globalAlpha = 1;
    for (const [sp, off, al] of [[6, 0, 0.9], [-4, 0.37, 0.6]]) { // two layers drifting different ways
      const ox = (((t * sp * sc + off * n) % n) + n) % n;
      const oy = (((t * 2.5 * sc + off * n * 0.6) % n) + n) % n;
      b.ctx.globalAlpha = al;
      for (let x = -ox; x < W; x += n) for (let y = -oy; y < H; y += n) b.ctx.drawImage(noise, x, y, n + 1, n + 1);
    }
    b.ctx.globalAlpha = 1;
    b.ctx.globalCompositeOperation = 'destination-in';
    b.ctx.translate(S.ox, S.oy);
    b.ctx.rotate(S.ang);
    b.ctx.drawImage(dusty, 0, -S.w1, S.L, S.w1 * 2);
    b.ctx.globalCompositeOperation = 'source-atop';
    b.ctx.setTransform(1, 0, 0, 1, 0, 0);
    b.ctx.fillStyle = `rgb(${party ? PARTY : DUSTY})`;
    b.ctx.fillRect(0, 0, b.canvas.width, b.canvas.height);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(k * 0.85, 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
  }

  /** Where the window shaft lands on the floor: a soft pool of light (with the ring light: the lit air round the ring). @param {CanvasRenderingContext2D} c context @param {number} a strength @returns {void} */
  function drawPool(c, a) {
    if (S.ring) {
      const R = room.ring;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(a * 0.6 * (dustK * (1 - cleanK) * 0.5 + 0.5), 0, 1);
      c.drawImage(pool, R.x - RR, R.y - RR, RR * 2, RR * 2);
      return;
    }
    const w = room.window;
    const x = (w.bx0 + w.bx1) / 2;
    const y = Math.max(w.by, room.floorY + (H - room.floorY) * 0.4);
    const rx = (w.bx1 - w.bx0) * 0.6;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(a * 0.55 * (1 + 0.3 * cleanK), 0, 1);
    c.drawImage(pool, x - rx, y - rx * 0.22, rx * 2, rx * 0.44);
  }

  /** Draw the motes of one depth (only where the light falls on them; during the whoosh they swirl out and fade). @param {CanvasRenderingContext2D} c context @param {boolean} front the near ones @returns {void} */
  function drawMotes(c, front) {
    if (dustK <= 0) return;
    const t = still ? 0 : env.t;
    const whoosh = scrub >= 0 && scrub < SCRUB_LEN;
    const base = (party ? 1 : 0.9 + 0.1 * (1 - tier / 2)) * dustK;
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      if (m.front !== front) continue;
      let x;
      let y;
      let lit;
      if (whoosh && !still) {
        x = m.x;
        y = m.y;
        lit = 0.75 * whooshFade(m); // they glow as they fly, then fade
      } else {
        lit = moteLight(m);
        if (whoosh) lit *= whooshFade(m); // still: they just fade away where they are
        if (lit < 0.02) continue;
        [x, y] = moteXY(m);
      }
      if (front) lit *= m.big ? 0.4 + 0.6 * offFace(x, y) : offFace(x, y);
      if (lit < 0.02) continue;
      if (m.big) {
        const s = m.size * sc * 2;
        c.globalAlpha = clamp(lit * 0.16 * base * (0.8 + 0.2 * Math.sin(t * 0.5 + m.ph)), 0, 1);
        c.drawImage(blur, x - s / 2, y - s / 2, s, s);
        continue;
      }
      // A flat flake: bright when its face turns to the light (a soft twinkle), a dim speck when edge on.
      const face = Math.abs(Math.cos(m.rot));
      const tw = 0.3 + 0.7 * face ** 3;
      const s = m.size * sc * (front ? 1.5 : 1) * 2.2;
      const sw = s * (0.55 + 0.45 * face);
      c.globalAlpha = clamp(lit * tw * m.bright * base, 0, 1);
      if (whoosh && !still) { // streaks as they whoosh past
        const sp = Math.hypot(m.vx, m.vy);
        c.save();
        c.translate(x, y);
        c.rotate(Math.atan2(m.vy, m.vx));
        const len = s + Math.min(sp * 0.05, s * 5);
        c.drawImage(fine, -len / 2, -s * 0.3, len, s * 0.6);
        c.restore();
      } else {
        c.drawImage(fine, x - sw / 2, y - s / 2, sw, s);
      }
    }
  }

  /** The whoosh's dusty clouds swirling out and fading, and a band of clean light running down the shaft. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawWhoosh(c) {
    if (scrub < 0 || scrub > SCRUB_LEN) return;
    c.globalCompositeOperation = 'lighter';
    if (!still) {
      for (const [i, p] of puffs.entries()) {
        const k = smooth(scrub / 0.25) * (1 - smooth((scrub - 0.3 - i * 0.05) / 1.3));
        if (k < 0.01) continue;
        const s = p.s * (1 + scrub * 0.8);
        c.globalAlpha = clamp(k * 0.4, 0, 1);
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.drawImage(puffSprite, -s / 2, -s / 2, s, s);
        c.restore();
      }
    }
    const q = (scrub - 0.4) / 1.3; // the clean band: from the light's start to its far end
    if (q > 0 && q < 1) {
      const [x, y] = toScreen(q * 0.8, 0);
      const len = S.L * 0.3;
      const wide = halfAt(q * 0.8) * 2.4;
      c.globalAlpha = 0.4 * Math.sin(q * Math.PI);
      c.save();
      c.translate(x, y);
      c.rotate(S.ang);
      c.drawImage(pool, -len / 2, -wide / 2, len, wide);
      c.restore();
    }
  }

  /** The clean glints popping in the shaft after the scrub. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSparks(c) {
    if (scrub < 0) return;
    c.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const age = scrub - p.at;
      if (age < 0 || age > p.life) continue;
      const q = age / p.life;
      const k = smooth(q / 0.25) * (1 - smooth((q - 0.35) / 0.65));
      const s = p.s * (0.5 + 0.7 * k) * 2;
      const [x, y] = toScreen(p.u, p.v);
      c.globalAlpha = clamp(k, 0, 1);
      c.save();
      c.translate(x, y);
      c.rotate(p.rot + (still ? 0 : q * 0.5));
      c.drawImage(glint, -s / 2, -s / 2, s, s);
      c.restore();
    }
  }

  return {
    /** Drift the motes and run the scrub. @param {number} dt seconds @returns {void} */
    step(dt) {
      const t = env.t;
      if (scrub >= 0) stepScrub(dt);
      if (!still && !(scrub >= 0 && scrub < SCRUB_LEN)) for (const m of motes) drift(m, dt, t);
    },
    /** The shaft on the wall (behind the customer), its haze, the floor pool and the far motes. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      drawShaft(c, shaftA);
      drawHaze(c, shaftA);
      drawPool(c, shaftA);
      drawMotes(c, false);
    },
    /** In front: a faint share of the shaft (it lights the air in front of the face too), the near motes, the glints. @param {CanvasRenderingContext2D} c context @returns {void} */
    front(c) {
      if (env.face) drawShaft(c, shaftA * (S.ring ? 0.1 : 0.32));
      drawMotes(c, true);
      drawWhoosh(c);
      drawSparks(c);
    },
    /** Scrub done: the dust whooshes out and the light turns clean. @returns {void} */
    trigger: fire,
    /** For checks. @returns {object} state */
    state: () => ({ motes: motes.length, ring: S.ring, scrub: Number(scrub.toFixed(2)), clean: Number(cleanK.toFixed(2)), dust: Number(dustK.toFixed(2)), scrubs }),
  };
}

export default { id: 'dust', num: 3, name: 'Dust', layer: 'back', order: 30, make };
