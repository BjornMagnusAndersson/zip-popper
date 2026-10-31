// Her heart puff on the result of a story round before the studio (SPEC D46-25, audit R1): Hubby's chapter 0 round.
// He did NOT want the pop (D33) and protests "NOOOO! My poor chin!", so there is no confetti; instead her joy puffs
// up in a little cloud of cartoon hearts. A soft pink puff swells behind the stars, small hearts (the game's style:
// candy pinks and a few red-leaning pinks, an ink outline, a white shine) fly out from behind the stars, slow down and
// float up with a gentle sway; a few pop into tiny sparkles at the end, the others fade. One big heart rises from
// behind the middle star to above the title, beats once ("ba-dum", with a ring and two little beat marks), drifts up a
// little and pops into mini hearts. All over in about 2 s, and always above the stars, so it never sits over his line
// or the Continue button. The layer lies UNDER the title and the stars (result.js), so the hearts come out from
// behind them. Reduced motion: a few still hearts peeking out from behind the stars and one above the title.
// Lighter graphics: about half the small hearts and sparkles (celebrate-logic.js heartPuffCount), pixel ratio 1.
import { clamp, smooth, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';
import { paintSparkle } from './confetti-fx.js';
import { HEART_PUFF, heartPuffCount, bigHeartScale } from './celebrate-logic.js';

const INK = '#2a211d';
/** The small hearts' colours [top, bottom, shade]: soft pink, candy pink, a red-leaning pink and a pale pink. */
const HEARTS = [
  ['#ffb8d4', '#ff6fa6', '#e0508b'],
  ['#ff9cc8', '#ff4f8b', '#d1346f'],
  ['#ffa0b0', '#f4486f', '#c72f59'],
  ['#ffe0ee', '#ffa3ca', '#ee7cab'],
];
/** The big heart's colours [top, bottom, shade]. */
const BIG = ['#ffaad0', '#ff4a88', '#cc2b67'];
/** The puff cloud: fill and rim, "r,g,b". */
const PUFF_FILL = '255,240,247';
const PUFF_RIM = '242,122,168';

/**
 * Add a plump cartoon heart's outline to the path, in the box (x, y, w, w): lobes at the top, the tip at the bottom.
 * @param {CanvasRenderingContext2D} c context @param {number} x left @param {number} y top @param {number} w size
 * @returns {void}
 */
function heartPath(c, x, y, w) {
  c.moveTo(x + 0.5 * w, y + 0.93 * w);
  c.bezierCurveTo(x + 0.2 * w, y + 0.74 * w, x + 0.03 * w, y + 0.55 * w, x + 0.05 * w, y + 0.34 * w);
  c.bezierCurveTo(x + 0.07 * w, y + 0.12 * w, x + 0.36 * w, y + 0.03 * w, x + 0.5 * w, y + 0.25 * w);
  c.bezierCurveTo(x + 0.64 * w, y + 0.03 * w, x + 0.93 * w, y + 0.12 * w, x + 0.95 * w, y + 0.34 * w);
  c.bezierCurveTo(x + 0.97 * w, y + 0.55 * w, x + 0.8 * w, y + 0.74 * w, x + 0.5 * w, y + 0.93 * w);
  c.closePath();
}

/**
 * Paint one cartoon heart into its sprite: a soft drop shadow, the body light at the top and deeper at the bottom, a
 * shaded crescent at the lower right, the game's ink outline and a white shine on the left lobe.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} S sprite size
 * @param {string[]} cols [top, bottom, shade] css colours
 * @returns {void}
 */
function paintHeart(c, S, cols) {
  const w = S * 0.84;
  const x = (S - w) / 2;
  const y = S * 0.04;
  c.beginPath(); heartPath(c, x, y + w * 0.06, w); // the shadow under it, as the stars have
  c.fillStyle = 'rgba(42,33,29,0.26)';
  c.fill();
  c.save();
  c.beginPath(); heartPath(c, x, y, w);
  c.clip();
  c.fillStyle = cols[2];
  c.fillRect(0, 0, S, S);
  const g = c.createLinearGradient(0, y + w * 0.1, 0, y + w * 0.9);
  g.addColorStop(0, cols[0]);
  g.addColorStop(1, cols[1]);
  c.fillStyle = g;
  c.beginPath(); heartPath(c, x - w * 0.05, y - w * 0.06, w); // shifted up-left: the shade stays as a crescent
  c.fill();
  c.restore();
  c.beginPath(); heartPath(c, x, y, w);
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1.2, w * 0.075);
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.88)'; // the shine
  c.beginPath(); c.ellipse(x + w * 0.27, y + w * 0.31, w * 0.07, w * 0.12, -0.75, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath(); c.arc(x + w * 0.2, y + w * 0.5, w * 0.035, 0, TAU); c.fill();
}

/** Ease out with a little overshoot (a pop-in). @param {number} u 0..1 @returns {number} eased */
function backOut(u) {
  const k = clamp(u, 0, 1) - 1;
  return 1 + 2.70158 * k * k * k + 1.70158 * k * k;
}

/** Ease out (fast start, soft stop). @param {number} u 0..1 @returns {number} eased */
function easeOut(u) {
  const k = 1 - clamp(u, 0, 1);
  return 1 - k * k * k;
}

/**
 * Make the heart puff for an effects layer.
 * @param {{kit: object, W: number, H: number, from: {x: number, y: number, w: number, h: number}, top?: number|null,
 *   lite?: boolean, still?: boolean, seed?: number}} o kit = the layer's sprite kit; W, H = the layer's size (CSS px);
 *   from = the middle and size of the star row in layer px; top = the top of the title in layer px (the big heart
 *   rises above it), or null; lite = Lighter graphics; still = reduced motion (use paintStill); seed = same hearts every time
 * @returns {{step: (dt: number, W: number, H: number) => void, draw: (c: CanvasRenderingContext2D, W: number, H: number, dpr: number) => void,
 *   done: () => boolean, paintStill: (c: CanvasRenderingContext2D, W: number, H: number) => void, state: () => object}} the effect
 */
export function makeHeartPuff(o) {
  const { kit } = o;
  const rand = rng(o.seed ?? 33);
  const O = o.from;
  const S = clamp(O.h || 72, 46, 96); // the stars' size: everything is measured by it (not too tiny on a small sideways screen)
  const sc = S / 72;
  const n = heartPuffCount({ lite: o.lite, still: o.still });
  const imgs = HEARTS.map((cols, i) => kit.sprite(`hp-heart:${i}`, 48, 48, (c, w) => paintHeart(c, w, cols)));
  const bigImg = kit.sprite('hp-heart-big', 96, 96, (c, w) => paintHeart(c, w, BIG));
  const spark = kit.sprite('hp-spark', 32, 32, (c, w) => paintSparkle(c, w, '255,190,222'));
  const sparkW = kit.sprite('hp-spark-w', 32, 32, (c, w) => paintSparkle(c, w, '255,246,226'));
  const bigSize = S * 0.98;
  // where the big heart settles: above the title (or above the stars), never off the top of the screen
  const bigY = Math.max(bigSize * 0.6, Math.min(O.y - S * 1.15, (o.top ?? O.y - S) - bigSize * 0.36));
  const puffs = [];
  const hearts = [];
  const sparkles = [];
  const bursts = [];
  const big = { age: 0, popped: false, x: O.x, y: O.y };
  let clock = 0;

  /** One puff of the pink cloud behind the stars. @param {number} i which @param {number} m how many @returns {object} the puff */
  function puff(i, m) {
    const f = m > 1 ? i / (m - 1) - 0.5 : 0;
    return {
      x: O.x + f * O.w * 1.05 + (rand() - 0.5) * S * 0.2, y: O.y - S * 0.3 + (rand() - 0.5) * S * 0.35 + Math.abs(f) * S * 0.25,
      r: S * (0.4 + rand() * 0.16) * (1 - Math.abs(f) * 0.3), age: -rand() * 0.06, life: 0.52 + rand() * 0.14,
    };
  }

  /** One small heart flying out from behind the stars (spread evenly along the row, so both sides get some). @param {number} i which @param {number} m how many @returns {object} the heart */
  function heart(i, m) {
    const x = O.x + (((i * 0.618034) % 1) - 0.5) * O.w * 0.85 + (rand() - 0.5) * S * 0.15;
    const out = clamp((x - O.x) / (O.w / 2), -1, 1);
    const a = -Math.PI / 2 + out * 0.8 + (rand() - 0.5) * 0.6; // up and out, never down
    const v = (330 + rand() * 260) * sc;
    const second = i >= Math.ceil(m * 0.6); // a second, smaller puff a moment later
    return {
      x, y: O.y + (rand() - 0.5) * S * 0.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      age: second ? -(0.12 + rand() * 0.1) : -rand() * 0.05, life: 0.95 + rand() * 0.6,
      size: S * (second ? 0.26 + rand() * 0.12 : 0.32 + rand() * 0.18), img: imgs[Math.floor(rand() * imgs.length)],
      tilt: (rand() - 0.5) * 0.6, sw: 3 + rand() * 2.4, ph: rand() * TAU, sway: (10 + rand() * 12) * sc,
      pops: rand() < 0.4, sx: 0, rot: 0, scale: 0, alpha: 0,
    };
  }

  /** One little sparkle drifting up with the hearts. @returns {object} the sparkle */
  function sparkle() {
    return {
      x: O.x + (rand() - 0.5) * O.w * 1.1, y: O.y - S * (0.2 + rand() * 1.3), vx: (rand() - 0.5) * 30 * sc, vy: -(20 + rand() * 40) * sc,
      age: -(0.1 + rand() * 0.9), life: 0.45 + rand() * 0.4, size: (10 + rand() * 9) * sc, ph: rand() * TAU, img: rand() < 0.5 ? spark : sparkW,
    };
  }

  /** A heart pops: a pink ring, short pop lines, a few sparkles flying out (mini = mini hearts too, for the big one). @param {number} x where @param {number} y where @param {number} r its size @param {boolean} [mini] the big heart's pop @returns {void} */
  function pop(x, y, r, mini = false) {
    bursts.push({ x, y, r, age: 0, life: mini ? 0.42 : 0.34, rot: rand() * TAU });
    for (let i = 0, m = mini ? 6 : 4; i < m; i += 1) {
      const a = (i / m) * TAU + rand() * 0.6;
      const v = (mini ? 150 : 90) * sc * (0.7 + rand() * 0.5);
      sparkles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20 * sc, age: 0, life: 0.32 + rand() * 0.2, size: (mini ? 16 : 12) * sc, ph: rand() * TAU, img: i % 2 ? spark : sparkW, drag: 4 });
    }
    if (!mini) return;
    for (let i = 0; i < 6; i += 1) { // the big heart bursts into mini hearts
      const a = -Math.PI / 2 + ((i - 2.5) / 2.5) * 1.5 + (rand() - 0.5) * 0.3;
      const v = (170 + rand() * 80) * sc;
      hearts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.5 + rand() * 0.15, size: S * (0.2 + rand() * 0.06),
        img: imgs[i % imgs.length], tilt: (rand() - 0.5) * 0.8, sw: 4, ph: rand() * TAU, sway: 4 * sc, pops: false, sx: 0, rot: 0, scale: 0, alpha: 0, mini: true,
      });
    }
  }

  if (!o.still) {
    for (let i = 0; i < n.puffs; i += 1) puffs.push(puff(i, n.puffs));
    for (let i = 0; i < n.hearts; i += 1) hearts.push(heart(i, n.hearts));
    for (let i = 0; i < n.sparkles; i += 1) sparkles.push(sparkle());
  }

  /** Move a small heart on: it slows in the air, floats up, sways once it is slow, pops in, and fades or pops at the end. @param {object} p heart @param {number} dt seconds @param {number} W layer width @returns {boolean} true = keep it */
  function moveHeart(p, dt, W) {
    p.age += dt;
    if (p.age < 0) return true;
    const k = Math.exp(-(p.mini ? 4.2 : 3.4) * dt);
    p.vx *= k;
    p.vy = p.vy * k - (p.mini ? 20 : 70) * sc * dt; // a little lift: hearts float up
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const half = p.size / 2;
    if (p.x < half) { p.x = half; p.vx = Math.abs(p.vx) * 0.3; }
    if (p.x > W - half) { p.x = W - half; p.vx = -Math.abs(p.vx) * 0.3; }
    const calm = smooth(1 - Math.hypot(p.vx, p.vy) / (240 * sc));
    const swing = Math.sin(p.age * p.sw + p.ph);
    p.sx = swing * p.sway * calm;
    p.rot = p.tilt * (1 - calm * 0.5) + swing * 0.24 * calm;
    const left = p.life - p.age;
    p.scale = backOut(p.age / 0.2);
    p.alpha = 1;
    if (p.pops) {
      if (left < 0.09) p.scale *= 1 + 0.28 * smooth(1 - left / 0.09); // swells, then
      if (left <= 0) { pop(p.x + p.sx, p.y, p.size * 0.55); return false; } // pop!
    } else if (left < 0.34) {
      const u = smooth(1 - left / 0.34);
      p.alpha = 1 - u;
      p.scale *= 1 - 0.25 * u;
    }
    return left > 0;
  }

  /** Move the big heart on: it rises from behind the middle star, beats, drifts up a little and pops. @param {number} dt seconds @returns {void} */
  function moveBig(dt) {
    if (big.popped) return;
    big.age += dt;
    const t = big.age;
    const rise = easeOut(t / 0.5);
    big.y = O.y + (bigY - O.y) * rise - 16 * sc * Math.max(0, t - 0.6);
    big.x = O.x + Math.sin((t - 0.6) * 2.6) * 6 * sc * smooth((t - 0.6) / 0.3);
    if (t >= HEART_PUFF.bigPop) {
      big.popped = true;
      pop(big.x, big.y, bigSize * 0.6, true);
    }
  }

  /** Draw a sprite heart turned and scaled round its middle. @param {CanvasRenderingContext2D} c context @param {HTMLCanvasElement} img sprite @param {number} x middle @param {number} y middle @param {number} size size @param {number} rot turn @param {number} a alpha @param {number} dpr pixel ratio @returns {void} */
  function drawHeartAt(c, img, x, y, size, rot, a, dpr) {
    if (size <= 0.5 || a <= 0.01) return;
    const co = Math.cos(rot) * dpr;
    const si = Math.sin(rot) * dpr;
    c.globalAlpha = clamp(a, 0, 1);
    c.setTransform(co, si, -si, co, dpr * x, dpr * y);
    c.drawImage(img, -size / 2, -size / 2, size, size);
  }

  /**
   * The cloud puff, as ONE cartoon cloud: every puff's rim, then every fill over them, painted solid on a small
   * offscreen buffer (so only the cloud's outer edge has a line and overlaps never show), then laid down see-through.
   * @param {CanvasRenderingContext2D} c context (CSS px) @param {number} dpr pixel ratio
   * @returns {void}
   */
  function drawPuffs(c, dpr) {
    const live = puffs.filter((p) => p.age >= 0 && p.age < p.life);
    if (!live.length) return;
    const bx = O.x - O.w * 0.85;
    const by = O.y - S * 1.5;
    const bw = O.w * 1.7;
    const bh = S * 2.4;
    const buf = kit.buffer('hp-puff', Math.round(bw), Math.round(bh), Math.min(2, dpr));
    const u0 = clamp(clock / 0.62, 0, 1);
    for (const pass of [0, 1]) {
      buf.ctx.fillStyle = pass ? `rgb(${PUFF_FILL})` : `rgb(${PUFF_RIM})`;
      buf.ctx.beginPath();
      for (const p of live) {
        const u = p.age / p.life;
        const r = p.r * (0.4 + 0.8 * easeOut(u)) + (pass ? 0 : 2.6 * sc);
        const x = p.x - bx;
        const y = p.y - by - 30 * sc * u;
        buf.ctx.moveTo(x + r, y);
        buf.ctx.arc(x, y, r, 0, TAU);
      }
      buf.ctx.fill();
    }
    buf.ctx.fillStyle = 'rgba(255,255,255,0.55)'; // a soft light on each puff's upper left: a round, cottony cloud
    buf.ctx.beginPath();
    for (const p of live) {
      const u = p.age / p.life;
      const r = p.r * (0.4 + 0.8 * easeOut(u));
      const x = p.x - bx - r * 0.28;
      const y = p.y - by - 30 * sc * u - r * 0.3;
      buf.ctx.moveTo(x + r * 0.45, y);
      buf.ctx.arc(x, y, r * 0.45, 0, TAU);
    }
    buf.ctx.fill();
    c.globalAlpha = (1 - u0) ** 1.3 * 0.95;
    c.drawImage(buf.canvas, bx, by, bw, bh);
  }

  /** The beat: a heart-shaped ring opening out and two little beat marks beside the big heart. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawBeat(c) {
    const b = big.age - HEART_PUFF.beat;
    if (b < 0 || b > 0.4 || big.popped) return;
    const u = b / 0.4;
    const w = bigSize * 0.84 * (1.05 + 0.75 * easeOut(u));
    c.globalAlpha = (1 - u) * 0.85;
    c.strokeStyle = '#ff6fa6';
    c.lineWidth = (4.5 * (1 - u) + 1) * sc;
    c.lineJoin = 'round';
    c.beginPath();
    heartPath(c, big.x - w / 2, big.y - w * 0.52, w);
    c.stroke();
    if (b > 0.28) return;
    c.globalAlpha = 1 - b / 0.28; // the beat marks: three short ink strokes each side, like a comic heartbeat
    c.strokeStyle = INK;
    c.lineCap = 'round';
    c.lineWidth = 2.6 * sc;
    c.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const a = -Math.PI / 2 + side * (0.7 + i * 0.32);
        const r0 = bigSize * (0.62 + 0.08 * easeOut(b / 0.12));
        const r1 = r0 + bigSize * 0.16;
        c.moveTo(big.x + Math.cos(a) * r0, big.y - bigSize * 0.08 + Math.sin(a) * r0);
        c.lineTo(big.x + Math.cos(a) * r1, big.y - bigSize * 0.08 + Math.sin(a) * r1);
      }
    }
    c.stroke();
  }

  /** A pop: a pink ring opening out and short pop lines. @param {CanvasRenderingContext2D} c context @param {object} f the pop @returns {void} */
  function drawBurst(c, f) {
    const u = f.age / f.life;
    if (u >= 1) return;
    const e = easeOut(u);
    c.globalAlpha = (1 - u) * 0.9;
    c.strokeStyle = '#ff86b8';
    c.lineWidth = (3.2 * (1 - e) + 0.8) * sc;
    c.beginPath();
    c.arc(f.x, f.y, f.r * (0.4 + 0.9 * e), 0, TAU);
    c.stroke();
    c.strokeStyle = '#fff4f9';
    c.lineCap = 'round';
    c.lineWidth = 2.4 * sc * (1 - e) + 0.5;
    c.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = f.rot + (i / 6) * TAU;
      const r0 = f.r * (0.7 + 0.9 * e);
      const r1 = r0 + f.r * 0.45 * (1 - e);
      c.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
      c.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
    }
    c.stroke();
  }

  return {
    /** Move the puff, the hearts, the big heart, the pops and the sparkles on. @param {number} dt seconds @param {number} w layer width @returns {void} */
    step(dt, w) {
      clock += dt;
      for (const p of puffs) p.age += dt;
      for (let i = puffs.length - 1; i >= 0; i -= 1) if (puffs[i].age >= puffs[i].life) puffs.splice(i, 1);
      moveBig(dt);
      for (let i = hearts.length - 1; i >= 0; i -= 1) if (!moveHeart(hearts[i], dt, w || o.W)) hearts.splice(i, 1);
      for (const f of bursts) f.age += dt;
      for (let i = bursts.length - 1; i >= 0; i -= 1) if (bursts[i].age >= bursts[i].life) bursts.splice(i, 1);
      for (let i = sparkles.length - 1; i >= 0; i -= 1) {
        const s = sparkles[i];
        s.age += dt;
        if (s.age >= 0) {
          const k = Math.exp(-(s.drag ?? 1) * dt);
          s.vx *= k;
          s.vy *= k;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        if (s.age >= s.life) sparkles.splice(i, 1);
      }
    },
    /** The puff, the beat ring, the hearts (the big one in front), the pops, then the sparkles as light. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height @param {number} dpr pixel ratio @returns {void} */
    draw(c, w, h, dpr) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPuffs(c, dpr);
      for (const p of hearts) if (p.age >= 0) drawHeartAt(c, p.img, p.x + p.sx, p.y, p.size * p.scale, p.rot, p.alpha, dpr);
      if (!big.popped) {
        drawHeartAt(c, bigImg, big.x, big.y, bigSize * bigHeartScale(big.age), Math.sin(big.age * 2.6) * 0.05, 1, dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBeat(c);
      for (const f of bursts) drawBurst(c, f);
      c.globalCompositeOperation = 'lighter';
      for (const s of sparkles) {
        if (s.age < 0) continue;
        const u = s.age / s.life;
        const size = s.size * (0.65 + 0.35 * Math.sin(s.age * 20 + s.ph)) * (1 - u * 0.3);
        c.globalAlpha = clamp(u < 0.15 ? u / 0.15 : 1 - smooth((u - 0.4) / 0.6), 0, 1);
        c.drawImage(s.img, s.x - size / 2, s.y - size / 2, size, size);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    },
    /** Whether everything is over. @returns {boolean} done */
    done: () => big.popped && !hearts.length && !puffs.length && !bursts.length && !sparkles.length,
    /**
     * Reduced motion: a few still hearts peeking out from behind the left and right stars and one big heart above the
     * title, drawn once.
     * @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height
     * @returns {void}
     */
    paintStill(c, w, h) {
      const dpr = c.getTransform().a || 1;
      const spots = [
        [-0.5, -0.34, 0.44, -0.38], [0.52, -0.5, 0.38, 0.34], [-0.36, -1.0, 0.3, -0.2], [0.3, -1.08, 0.32, 0.26], [0.62, -0.95, 0.24, 0.4],
      ];
      for (const [fx, fy, s, rot] of spots.slice(0, n.hearts)) {
        const i = Math.floor(rand() * imgs.length);
        drawHeartAt(c, imgs[i], clamp(O.x + fx * O.w, S * 0.3, w - S * 0.3), O.y + fy * S, S * s, rot, 1, dpr);
      }
      drawHeartAt(c, bigImg, O.x, Math.max(bigSize * 0.5, bigY), bigSize * 0.9, 0, 1, dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
    },
    /** Counts, for checks. @returns {object} state */
    state: () => ({ kind: 'hearts', t: Number(clock.toFixed(2)), hearts: hearts.length, sparkles: sparkles.length, puffs: puffs.length, big: !big.popped, beat: bigHeartScale(big.age) > 1.01 }),
  };
}
