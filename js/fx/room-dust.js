// Dust in the light for the studio room (SPEC D45 item 3), the game's version of the test page's dust effect
// (js/dev/fx/dust.js, which the owner tried and liked). A slanted shaft of light falls through the room: from the ring
// light when the 'lamp' upgrade is owned, else from high up on the right like a window. Very fine dust motes drift and
// slowly tumble in the air; they only show inside the light, where they twinkle softly as their flat sides catch it.
// A few bigger, blurry specks float lazily close to us. In the dingy room the shaft is a dusty yellow with slowly
// moving haze in it. trigger() is the scrub job's ending: the dust whooshes out of the light in a swirl and fades,
// the shaft turns clean and warm, and a few clean glints pop in it (it then stays clean).
// Everything is drawn on the room's own layer, behind the customer (never on the skin). Still: a calm still frame.
import { clamp, smooth, lerp, TAU } from './sprites.js';
import { fxCount } from './room-logic.js';

const DUSTY = '232,214,146'; // the dingy shaft: a dusty yellow
const CLEAN = '255,234,192'; // after the scrub: a clean warm white
const MOTE = '255,238,200'; // the motes' colour
const SCRUB_LEN = 3; // seconds the scrub-done whoosh takes

/**
 * Paint the light shaft sprite: a long soft wedge (pointing right, the light's start at the left), narrower at the
 * start, with soft edges and faint rays that spread with it, fading out towards its far end. Drawn pixel by pixel once.
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
      const p = (y * w + x) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b;
      img.data[p + 3] = Math.round(clamp(edge * along * rays, 0, 1) * 255);
    }
  }
  c.putImageData(img, 0, 0);
}

/**
 * Where the light shaft is: from the ring light towards a target (the customer, or the chair in the studio view) when
 * it is owned, else from high on the right like a window (the same place the spa's daylight falls from).
 * @param {{W: number, H: number, land: boolean, ring: {x: number, y: number, r: number}|null, target: number[],
 *   window: {x0: number, x1: number, y: number, bx0: number, bx1: number, by: number}}} room the room's spots
 * @returns {{ox: number, oy: number, ang: number, dx: number, dy: number, L: number, w0: number, w1: number, ring: boolean}}
 *   start point, direction (angle and unit vector), length, half width at the start and at the far end
 */
export function shaftSpot(room) {
  const { W, H } = room;
  if (room.ring) {
    const R = room.ring;
    const [tx, ty] = room.target;
    const ang = Math.atan2(ty - R.y, tx - R.x) + (room.land ? 0.18 : -0.12); // aimed a little past the target, slanting down
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
 * Make the dust in the light.
 * @param {{W: number, H: number, sc: number, kit: object, rand: () => number, still: boolean, amount: number,
 *   share: number, shaft: object, ring: {x: number, y: number, r: number}|null, pool: {x: number, y: number,
 *   rx: number}|null, haze: boolean, strength?: number, clean?: boolean, baked?: boolean}} o (baked = the shaft and its
 *   pool are painted once into the still room by bake; only the motes are drawn each frame) picture size, size factor (sc), the sprite
 *   kit (sprites.js), seeded random numbers, still (reduced motion), how dusty (amount 0..1), the particle share,
 *   the shaft (shaftSpot), the ring light (for the motes in its glow), the floor pool of the window light, haze in the
 *   shaft, how bright (strength, default 0.4), clean = start with the clean warm light and no dust
 * @returns {{step: (dt: number, t: number) => void, draw: (c: CanvasRenderingContext2D) => void, trigger: () => void,
 *   setDust: (k: number) => void, busy: () => boolean, state: () => object}} hooks
 */
export function makeDust(o) {
  const { W, H, sc, kit, rand, still, amount } = o;
  const S = o.shaft;
  const px = -S.dy; // across the shaft (unit vector)
  const py = S.dx;
  const shaftA = o.strength ?? 0.4;
  const startShare = clamp(S.w0 / S.w1, 0.05, 0.95);
  /** The shaft sprite in one colour. @param {string} rgb colour @returns {HTMLCanvasElement} sprite */
  const shaftSprite = (rgb) => kit.sprite(`dust-shaft:${rgb}:${startShare.toFixed(2)}:${S.ring}`, 256, 128, (c, w, h) => paintShaft(c, w, h, rgb, startShare, S.ring ? 0.14 : 0.12), 1);
  const dusty = shaftSprite(DUSTY);
  const clean = shaftSprite(CLEAN);
  const fine = kit.dot(MOTE, 0.3, 16);
  const blur = kit.dot(MOTE, 0.6, 32);
  const glint = kit.glint();
  const pool = kit.glow(CLEAN, 96);
  const noise = kit.noise(128, 57, 5);
  const hazeOn = o.haze && amount > 0.4; // the slowly moving haze inside the dusty shaft

  // The motes, in shaft space: u along (0..1), v across (-1..1 inside the light, they drift out to +-1.5 and wrap).
  const motes = [];
  const nFine = fxCount(Math.round(200 * amount) + 6, o.share);
  const nBig = fxCount(Math.round(9 * amount) + 1, o.share);
  for (let i = 0; i < nFine + nBig; i += 1) {
    const big = i >= nFine;
    motes.push({
      u: 0.04 + (S.ring ? rand() ** 1.6 : rand()) * 0.9, v: (rand() * 2 - 1) * 1.5, big,
      size: big ? 3.2 + rand() * 4.5 : 0.9 + rand() ** 2 * 1.9, rot: rand() * TAU, spin: (rand() - 0.5) * (big ? 0.6 : 2.4),
      ph: rand() * TAU, ph2: rand() * TAU, speed: (big ? 0.45 : 0.7) + rand() * 0.6, bright: 0.6 + rand() * 0.4,
      near: big || rand() < 0.4, // drawn a little bigger (closer to us)
      x: 0, y: 0, vx: 0, vy: 0, out: 0, // screen place and speed during the whoosh
    });
  }
  // With the ring light: more motes in the glow right round the ring (screen offsets hx, hy from its middle).
  const R = o.ring;
  const RR = R ? R.r * 3.6 : 0;
  for (let i = 0, n = R ? fxCount(Math.round(70 * amount) + 4, o.share) : 0; i < n; i += 1) {
    motes.push({
      halo: true, hx: (rand() * 2 - 1) * RR, hy: (rand() * 2 - 1) * RR, u: 0, v: 0, big: false, near: rand() < 0.5,
      size: 0.9 + rand() ** 2 * 1.9, rot: rand() * TAU, spin: (rand() - 0.5) * 2.4, ph: rand() * TAU, ph2: rand() * TAU,
      speed: 0.7 + rand() * 0.6, bright: 0.6 + rand() * 0.4, x: 0, y: 0, vx: 0, vy: 0, out: 0,
    });
  }
  const sparks = []; // the clean glints after the scrub
  const puffs = []; // the dusty clouds of the whoosh
  const puffSprite = kit.sprite('dust-puff', 64, 64, (c, w) => { // a soft cloudy blob of dust (the noise, cut round)
    c.drawImage(noise, 0, 0, w, w);
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgb(${DUSTY})`;
    c.fillRect(0, 0, w, w);
  }, 1);
  let T = 0; // the effect's clock
  let scrub = -1; // seconds since the scrub ending started (-1 = none)
  let cleanK = o.clean ? 1 : 0; // 0 dusty .. 1 clean shaft
  let dustK = o.clean ? 0 : 1; // how much of the dust shows (0 after the scrub)
  let shown = 1; // how much of the dust is left (the scrub job lowers it as the item comes clean)

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
  const moteXY = (m) => (m.halo ? [R.x + m.hx, R.y + m.hy] : toScreen(m.u, m.v));
  /** How much light falls on a mote (the shaft, or the ring light's round glow). @param {object} m mote @returns {number} 0..1 */
  const moteLight = (m) => (m.halo ? (1 - smooth(Math.hypot(m.hx, m.hy) / RR)) ** 1.4 : lightAt(m.u, m.v));
  /** The middle of the whoosh's swirl. @returns {number[]} [x, y] */
  const swirlAt = () => toScreen(S.ring ? 0.18 : 0.42, 0);

  /** Drift one mote on through the air: a slow swirl, a gentle settle downwards, and it tumbles. @param {object} m mote @param {number} dt seconds @returns {void} */
  function drift(m, dt) {
    const [x, y] = moteXY(m);
    const k = sc * m.speed;
    const t = T;
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
    m.u += ((vx * S.dx + vy * S.dy) * dt) / S.L;
    m.v += ((vx * px + vy * py) * dt) / halfAt(m.u);
    if (m.u > 0.97) m.u -= 0.92; else if (m.u < 0.04) m.u += 0.92;
    if (m.v > 1.5) m.v -= 3; else if (m.v < -1.5) m.v += 3;
  }

  /** Start the scrub ending: every mote gets a push into a swirl round the shaft's middle and out of the light. @returns {void} */
  function fire() {
    scrub = 0;
    sparks.length = 0;
    const [cx, cy] = swirlAt();
    for (const m of motes) {
      [m.x, m.y] = moteXY(m);
      const ax = m.x - cx;
      const ay = m.y - cy;
      const r = Math.hypot(ax, ay) || 1;
      const sp = (60 + rand() * 90) * sc;
      m.vx = (-ay / r) * sp + (ax / r) * sp * 0.5; // all one way round: a swirl, and outwards
      m.vy = (ax / r) * sp + (ay / r) * sp * 0.5 - 20 * sc;
      m.out = 0.15 + rand() * 0.5; // when it starts to fade
    }
    for (let i = 0, n = Math.max(3, fxCount(7, Math.max(0.5, o.share))); i < n; i += 1) {
      sparks.push({ u: 0.15 + rand() * 0.55, v: (rand() * 2 - 1) * 0.6, at: 1.5 + i * 0.2 + rand() * 0.15, life: 0.8 + rand() * 0.4, s: (9 + rand() * 9) * sc, rot: rand() * 0.6 - 0.3 });
    }
    puffs.length = 0; // soft dusty clouds that swirl out with the motes
    for (let i = 0, np = fxCount(8, Math.max(0.5, o.share)); i < np; i += 1) {
      const [x, y] = toScreen(0.15 + rand() * 0.6, (rand() * 2 - 1) * 0.6);
      const a = Math.atan2(y - cy, x - cx);
      const sp = (50 + rand() * 50) * sc;
      puffs.push({ x, y, vx: -Math.sin(a) * sp + Math.cos(a) * sp * 0.4, vy: Math.cos(a) * sp + Math.sin(a) * sp * 0.4, s: S.w1 * (0.35 + rand() * 0.3), rot: rand() * TAU });
    }
  }

  /** Move the whoosh on: the motes spiral out with air drag and fade; then the light stays clean. @param {number} dt seconds @returns {void} */
  function stepScrub(dt) {
    scrub += dt;
    cleanK = Math.max(cleanK, smooth((scrub - 0.4) / 1.4));
    if (scrub >= SCRUB_LEN) { dustK = 0; return; }
    if (still) return;
    const [cx, cy] = swirlAt();
    const drag = Math.exp(-1.1 * dt);
    for (const p of [...motes, ...puffs]) {
      const ax = p.x - cx;
      const ay = p.y - cy;
      const r = Math.hypot(ax, ay) || 1;
      const turn = p.s ? 90 : 160; // the puffs swirl a little slower than the motes
      const outw = p.s ? 30 : 70;
      p.vx = p.vx * drag + (-ay / r) * turn * sc * dt + (ax / r) * outw * sc * dt; // keeps swirling round and out
      p.vy = p.vy * drag + (ax / r) * turn * sc * dt + (ay / r) * outw * sc * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.s ? dt * 1.5 : p.spin * dt * 4;
    }
  }

  /** How strong the whoosh motes still are (they fade as they fly out). @param {object} m mote @returns {number} 0..1 */
  const whooshFade = (m) => 1 - smooth((scrub - m.out) / 1.1);

  /** Draw the shaft (dusty and clean colours mixed by how clean it is). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawShaft(c) {
    const t = still ? 0 : T;
    const breathe = still ? 1 : 0.92 + 0.05 * Math.sin(t * 0.37) + 0.03 * Math.sin(t * 1.13 + 1);
    const swell = scrub >= 0 && !still ? 1 + 0.35 * Math.exp(-(((scrub - 1.7) / 0.5) ** 2)) : 1; // a warm swell as it turns clean
    c.globalCompositeOperation = 'lighter';
    c.save();
    c.translate(S.ox, S.oy);
    c.rotate(S.ang);
    const k = shaftA * breathe * swell * (1 + 0.22 * cleanK);
    if (cleanK < 1) { c.globalAlpha = clamp(k * (1 - cleanK), 0, 1); c.drawImage(dusty, 0, -S.w1, S.L, S.w1 * 2); }
    if (cleanK > 0) { c.globalAlpha = clamp(k * cleanK, 0, 1); c.drawImage(clean, 0, -S.w1, S.L, S.w1 * 2); }
    c.restore();
  }

  /** The slowly moving haze inside the dusty shaft: cloudy noise cut to the shaft's shape, drawn small. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawHaze(c) {
    const k = shaftA * (1 - cleanK) * amount * shown;
    if (!hazeOn || k < 0.01) return;
    const t = still ? 0 : T;
    const b = kit.buffer('dust-haze', W, H, 0.25);
    const n = Math.min(W, H) * 0.9;
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
    b.ctx.fillStyle = `rgb(${DUSTY})`;
    b.ctx.fillRect(0, 0, b.canvas.width, b.canvas.height);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(k * 0.85, 0, 1);
    c.drawImage(b.canvas, 0, 0, W, H);
  }

  /** Where the window shaft lands on the floor: a soft pool of light (with the ring light: the lit air round the ring). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawPool(c) {
    c.globalCompositeOperation = 'lighter';
    if (R) {
      c.globalAlpha = clamp(shaftA * 0.6 * (dustK * (1 - cleanK) * 0.5 + 0.5), 0, 1);
      c.drawImage(pool, R.x - RR, R.y - RR, RR * 2, RR * 2);
      return;
    }
    const p = o.pool;
    if (!p) return;
    c.globalAlpha = clamp(shaftA * 0.55 * (1 + 0.3 * cleanK), 0, 1);
    c.drawImage(pool, p.x - p.rx, p.y - p.rx * 0.22, p.rx * 2, p.rx * 0.44);
  }

  /** Draw the motes (only where the light falls on them; during the whoosh they swirl out and fade). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawMotes(c) {
    const k0 = dustK * shown;
    if (k0 <= 0.01) return;
    const t = still ? 0 : T;
    const whoosh = scrub >= 0 && scrub < SCRUB_LEN;
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
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
      if (lit < 0.02) continue;
      if (m.big) {
        const s = m.size * sc * 2;
        c.globalAlpha = clamp(lit * 0.16 * k0 * (0.8 + 0.2 * Math.sin(t * 0.5 + m.ph)), 0, 1);
        c.drawImage(blur, x - s / 2, y - s / 2, s, s);
        continue;
      }
      // A flat flake: bright when its face turns to the light (a soft twinkle), a dim speck when edge on.
      const face = Math.abs(Math.cos(m.rot));
      const tw = 0.3 + 0.7 * face ** 3;
      const s = m.size * sc * (m.near ? 1.5 : 1) * 2.2;
      c.globalAlpha = clamp(lit * tw * m.bright * k0 * 0.95, 0, 1);
      if (whoosh && !still) { // streaks as they whoosh past
        const sp = Math.hypot(m.vx, m.vy);
        const len = s + Math.min(sp * 0.05, s * 5);
        c.save();
        c.translate(x, y);
        c.rotate(Math.atan2(m.vy, m.vx));
        c.drawImage(fine, -len / 2, -s * 0.3, len, s * 0.6);
        c.restore();
      } else {
        const sw = s * (0.55 + 0.45 * face);
        c.drawImage(fine, x - sw / 2, y - s / 2, sw, s);
      }
    }
  }

  /** The whoosh's dusty clouds swirling out and fading, and a band of clean light running down the shaft. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawWhoosh(c) {
    if (scrub < 0 || scrub > SCRUB_LEN || still) return;
    c.globalCompositeOperation = 'lighter';
    for (const [i, p] of puffs.entries()) {
      const k = smooth(scrub / 0.25) * (1 - smooth((scrub - 0.3 - i * 0.05) / 1.3)) * shown;
      if (k < 0.01) continue;
      const s = p.s * (1 + scrub * 0.8);
      c.globalAlpha = clamp(k * 0.4, 0, 1);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.drawImage(puffSprite, -s / 2, -s / 2, s, s);
      c.restore();
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

  /** The clean glints popping in the shaft after the scrub (still: they just show). @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawSparks(c) {
    if (scrub < 0) return;
    c.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const age = still ? p.life * 0.3 : scrub - p.at;
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
    /** Drift the motes and run the scrub ending. @param {number} dt seconds @param {number} t the clock @returns {void} */
    step(dt, t) {
      T = t;
      if (scrub >= 0) stepScrub(dt);
      if (!still && !(scrub >= 0 && scrub < SCRUB_LEN) && dustK > 0) for (const m of motes) drift(m, dt);
    },
    /** The shaft (unless baked), its haze, the floor pool, the motes, the whoosh and the glints. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      c.save();
      if (!o.baked) drawShaft(c);
      drawHaze(c); // (only where it is switched on: the studio view and the scrub job)
      if (!o.baked) drawPool(c);
      drawMotes(c);
      drawWhoosh(c);
      drawSparks(c);
      c.restore();
    },
    /** Paint the still shaft and its floor pool once into the still room (baked: no breathing). @param {CanvasRenderingContext2D} c context @returns {void} */
    bake(c) {
      if (!o.baked) return;
      c.save();
      drawShaft(c);
      drawPool(c);
      c.restore();
    },
    /** Scrub done: the dust whooshes out and the light turns clean (and stays clean). @returns {void} */
    trigger: fire,
    /** How much of the dust is left in the air (the scrub job lowers it as the item comes clean). @param {number} k 0..1 @returns {void} */
    setDust(k) { shown = clamp(k, 0, 1); },
    /** Whether the scrub ending is still under way (frames needed even when still). @returns {boolean} busy */
    busy: () => scrub >= 0 && scrub < SCRUB_LEN + 1.3, // the last glint fades about 4.1 s in
    /** For checks. @returns {object} state */
    state: () => ({ motes: motes.length, ring: S.ring, scrub: Number(scrub.toFixed(2)), clean: Number(cleanK.toFixed(2)), dust: Number((dustK * shown).toFixed(2)) }),
  };
}
