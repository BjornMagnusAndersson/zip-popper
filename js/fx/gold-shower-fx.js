// The Master diploma's gold shower (SPEC D46-31, audit R10): gold stars and long streamers instead of confetti, so it
// differs from the result's confetti a few seconds before, and a bit grander. A golden flash opens round the diploma's
// rosette and part of the stars burst out from behind it; gold and cream-gold cartoon stars (the game's star: an ink
// outline and a shine) rain down from the top too, turning and tumbling, and
// glint when they face the light; a few long gold and cream streamers flutter down, twisting as they fall (their back
// shows darker); little twinkles pop here and there. The stars fade out before the bottom, so nothing lies over the
// "Hang it up!" button for long; the layer never takes a tap. About 3.5 s. Reduced motion: a few still stars along the
// top edge and the sides and two streamers hanging at the top corners. Lighter graphics: about half of everything
// (celebrate-logic.js goldShowerCount), pixel ratio 1.
import { clamp, smooth, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';
import { paintStar } from './confetti-fx.js';
import { GOLD_SHOWER, goldShowerCount } from './celebrate-logic.js';

/** Star colours [top, middle, bottom] for the front and the back: gold and a paler cream gold. */
const STARS = [
  { front: ['#fff2a0', '#ffd23f', '#f4a628'], back: ['#e8bd4a', '#d0901e', '#a86a14'] },
  { front: ['#fffbe8', '#ffe8a3', '#f2c65a'], back: ['#e9d29a', '#d2ad5c', '#b08a3a'] },
];
/** Streamer colours [r, g, b] face-on (light) and edge-on (deep), front then back: gold and cream. */
const RIBBONS = [
  { front: [[255, 236, 160], [240, 172, 40]], back: [[218, 156, 36], [150, 96, 12]] },
  { front: [[255, 252, 240], [232, 210, 160]], back: [[220, 196, 144], [166, 136, 82]] },
];

/** A colour part way between two [r, g, b] colours, as rgb(). @param {number[]} a first @param {number[]} b second @param {number} k 0 = a, 1 = b @returns {string} css colour */
function mix(a, b, k) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

/**
 * Make the gold shower for an effects layer.
 * @param {{kit: object, W: number, H: number, from?: {x: number, y: number, r: number}|null, lite?: boolean, still?: boolean,
 *   seed?: number}} o kit = the layer's sprite kit; W, H = the layer's size now (CSS px); from = the diploma's rosette
 *   (middle and half size in layer px: part of the stars burst out from behind it with a golden flash); lite = Lighter
 *   graphics; still = reduced motion (use paintStill); seed = the same shower every time
 * @returns {{step: (dt: number, W: number, H: number) => void, draw: (c: CanvasRenderingContext2D, W: number, H: number, dpr: number) => void,
 *   done: () => boolean, paintStill: (c: CanvasRenderingContext2D, W: number, H: number) => void, state: () => object}} the effect
 */
export function makeGoldShower(o) {
  const { kit } = o;
  const rand = rng(o.seed ?? 59);
  let W = o.W;
  let H = o.H;
  const sc = clamp(Math.min(W, H) / 300, 0.7, 1.6);
  const n = goldShowerCount({ lite: o.lite, still: o.still });
  const front = STARS.map((s, i) => kit.sprite(`gs-star:${i}`, 40, 40, (c, w) => paintStar(c, w, s.front)));
  const back = STARS.map((s, i) => kit.sprite(`gs-star-b:${i}`, 40, 40, (c, w) => paintStar(c, w, s.back)));
  const glint = kit.glint();
  const halo = kit.glow('255,222,140');
  const B = o.from ?? { x: W / 2, y: H * 0.3, r: 40 * sc }; // the rosette: the burst comes from behind it
  const stars = [];
  const ribbons = [];
  const twinkles = [];
  let clock = 0;

  /** One gold star above the top edge, waiting its turn (most come early). @param {boolean} [now] already in view (the still picture) @returns {object} the star */
  function star(now = false) {
    const big = rand() < 0.14;
    const size = (big ? 38 + rand() * 10 : 18 + rand() * 14) * sc;
    return {
      x: rand() * W, y: now ? 0 : -size - rand() * 30 * sc, vx: 0, vy: (60 + rand() * 80) * sc, vt: H * (0.36 + rand() * 0.14) * (big ? 0.85 : 1),
      age: now ? 0 : -(rand() ** 1.5) * 0.9, size, c: rand() < 0.7 ? 0 : 1, rot: rand() * TAU, vr: (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 2.2),
      flip: rand() * TAU, vf: 1.6 + rand() * 3.4, sw: 1.2 + rand() * 1.6, ph: rand() * TAU, sway: (8 + rand() * 18) * sc, sx: 0,
    };
  }

  /** One gold star bursting out from behind the rosette (up and out), then falling like the others. @returns {object} the star */
  function burstStar() {
    const s = star();
    const a = -Math.PI / 2 + (rand() - 0.5) * 3.6; // up and out, some nearly sideways
    const v = (380 + rand() * 520) * sc;
    return { ...s, x: B.x + (rand() - 0.5) * B.r * 0.6, y: B.y + (rand() - 0.5) * B.r * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: -rand() * 0.08, size: s.size * 0.9 };
  }

  /**
   * One long streamer above the top edge, in the outer parts of the screen (left and right in turn, never over the
   * middle where the diploma's words are).
   * @param {number} i which @param {number} m how many
   * @returns {object} the streamer
   */
  function ribbon(i, m) {
    const len = Math.min(H * 0.42, (150 + rand() * 90) * sc);
    const k = Math.min(1, Math.floor(i / 2) / Math.max(1, Math.ceil(m / 2) - 1)); // 0..1 from the edge inward
    const edge = 0.05 + k * 0.22 + (rand() - 0.5) * 0.05;
    return {
      x: W * (i % 2 ? 1 - edge : edge), head: -rand() * H * 0.05, len, wid: (8 + rand() * 3) * sc,
      vy: H * (0.36 + rand() * 0.1), age: -(0.1 + rand() * 0.4), c: i % 3 === 1 ? 1 : 0, amp: (9 + rand() * 9) * sc,
      k: TAU / ((60 + rand() * 30) * sc), w1: 3 + rand() * 2, ph: rand() * TAU, k2: TAU / ((70 + rand() * 40) * sc), w2: 2.5 + rand() * 2.5, ph2: rand() * TAU,
      drift: (rand() - 0.5) * 20 * sc,
    };
  }

  /** One little twinkle somewhere in the upper part of the screen. @returns {object} the twinkle */
  function twinkle() {
    return { x: W * (0.06 + rand() * 0.88), y: H * (0.05 + rand() * 0.6), age: -(0.25 + rand() * 2.2), life: 0.45 + rand() * 0.35, size: (16 + rand() * 14) * sc };
  }

  if (!o.still) {
    const burst = Math.round(n.stars * 0.4); // these burst out from behind the rosette, the rest rain from the top
    for (let i = 0; i < n.stars; i += 1) stars.push(i < burst ? burstStar() : star());
    for (let i = 0; i < n.streamers; i += 1) ribbons.push(ribbon(i, n.streamers));
    for (let i = 0; i < n.twinkles; i += 1) twinkles.push(twinkle());
  }

  /** How see-through things are near the bottom: they fade out before the button. @param {number} y height in px @returns {number} 0..1 */
  function lowFade(y) {
    return 1 - smooth((y - H * 0.66) / (H * 0.24));
  }

  /** How see-through a streamer is by where its lower end is: it fades out as it reaches the lower part. @param {object} r the streamer @returns {number} 0..1 */
  function ribbonFade(r) {
    return 1 - smooth((r.head - H * 0.6) / (H * 0.3));
  }

  /** The burst's flash at the rosette: a golden glow, a ring opening out and short rays. @param {CanvasRenderingContext2D} c context (CSS px) @returns {void} */
  function drawFlash(c) {
    const u = clock / 0.55;
    if (u < 0 || u >= 1) return;
    const e = 1 - (1 - u) ** 3;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (1 - u) ** 2 * 0.9;
    const r = B.r * (1.6 + 1.4 * e);
    c.drawImage(halo, B.x - r, B.y - r, r * 2, r * 2);
    const g = B.r * 3.4 * Math.sin(Math.min(1, u * 1.6) * Math.PI); // a big "ting!" glint on the rosette
    if (g > 1) c.drawImage(glint, B.x - g / 2, B.y - g / 2, g, g);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = (1 - e) * 0.95;
    c.strokeStyle = '#f2b22c'; // gold, so it shows on the cream card too
    c.lineWidth = (6 * (1 - e) + 1) * sc;
    c.beginPath();
    c.arc(B.x, B.y, B.r * (0.9 + 1.6 * e), 0, TAU);
    c.stroke();
    c.strokeStyle = '#e8a21c';
    c.lineCap = 'round';
    c.lineWidth = (4 * (1 - e) + 0.6) * sc;
    c.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + 0.13;
      const r0 = B.r * (1.1 + 1.5 * e);
      const r1 = r0 + B.r * 0.55 * (1 - e);
      c.moveTo(B.x + Math.cos(a) * r0, B.y + Math.sin(a) * r0);
      c.lineTo(B.x + Math.cos(a) * r1, B.y + Math.sin(a) * r1);
    }
    c.stroke();
  }

  /** Draw one star turned and squashed as it flips (the back shows darker), with a glint when it faces the light. @param {CanvasRenderingContext2D} c context @param {object} s the star @param {number} a alpha @param {number} dpr pixel ratio @returns {void} */
  function drawStar(c, s, a, dpr) {
    const fy = Math.cos(s.flip);
    const k = Math.abs(fy) < 0.1 ? (fy < 0 ? -0.1 : 0.1) : fy;
    const co = Math.cos(s.rot) * dpr;
    const si = Math.sin(s.rot) * dpr;
    c.globalAlpha = a;
    c.setTransform(co * k, si * k, -si, co, dpr * (s.x + s.sx), dpr * s.y);
    c.drawImage(fy >= 0 ? front[s.c] : back[s.c], -s.size / 2, -s.size / 2, s.size, s.size);
  }

  /**
   * Draw one streamer as a chain of short quads: a wave travels down it and it twists, so its width and shade change
   * along it (the back darker).
   * @param {CanvasRenderingContext2D} c context (CSS px) @param {object} r the streamer @param {number} t its time
   * @param {number} a alpha
   * @returns {void}
   */
  function drawRibbon(c, r, t, a) {
    const N = 30;
    const pal = RIBBONS[r.c];
    const pts = [];
    for (let j = 0; j <= N; j += 1) {
      const s = (j / N) * r.len;
      const reach = 0.35 + 0.65 * (s / r.len); // the tail (top) swings more than the head
      pts.push({
        x: r.x + r.drift * t + Math.sin(s * r.k - t * r.w1 + r.ph) * r.amp * reach,
        y: r.head - s,
        tw: Math.cos(s * r.k2 - t * r.w2 + r.ph2),
      });
    }
    c.globalAlpha = a;
    c.lineWidth = 0.9; // each quad is outlined in its own colour, so no thin seams show between them
    c.lineJoin = 'round';
    for (let j = 0; j < N; j += 1) {
      const p = pts[j];
      const q = pts[j + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const tw = (p.tw + q.tw) / 2;
      const hw0 = (r.wid / 2) * Math.max(0.1, Math.abs(p.tw));
      const hw1 = (r.wid / 2) * Math.max(0.1, Math.abs(q.tw));
      const cols = tw >= 0 ? pal.front : pal.back;
      const col = mix(cols[0], cols[1], 1 - Math.abs(tw)); // light face-on, deeper as it turns edge-on
      c.fillStyle = col;
      c.strokeStyle = col;
      c.beginPath();
      c.moveTo(p.x + nx * hw0, p.y + ny * hw0);
      c.lineTo(q.x + nx * hw1, q.y + ny * hw1);
      c.lineTo(q.x - nx * hw1, q.y - ny * hw1);
      c.lineTo(p.x - nx * hw0, p.y - ny * hw0);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  return {
    /** Move the stars, streamers and twinkles on and drop the ones that are over. @param {number} dt seconds @param {number} w layer width @param {number} h layer height @returns {void} */
    step(dt, w, h) {
      W = w || W;
      H = h || H;
      clock += dt;
      let j = 0;
      for (const s of stars) {
        s.age += dt;
        if (s.age >= 0) {
          s.vy += (s.vt - s.vy) * 1.6 * dt; // falls toward its own slow, floaty speed
          s.vx *= Math.exp(-2.4 * dt);
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.vr * dt;
          s.flip += s.vf * dt;
          s.sx = Math.sin(s.age * s.sw + s.ph) * s.sway;
        }
        if (s.age < GOLD_SHOWER.life && lowFade(s.y) > 0.01) { stars[j] = s; j += 1; }
      }
      stars.length = j;
      j = 0;
      for (const r of ribbons) {
        r.age += dt;
        if (r.age >= 0) r.head += r.vy * dt;
        if (ribbonFade(r) > 0.01) { ribbons[j] = r; j += 1; }
      }
      ribbons.length = j;
      j = 0;
      for (const t of twinkles) {
        t.age += dt;
        if (t.age < t.life) { twinkles[j] = t; j += 1; }
      }
      twinkles.length = j;
    },
    /** The opening glow, the streamers, the stars, then the glints and twinkles as light. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height @param {number} dpr pixel ratio @returns {void} */
    draw(c, w, h, dpr) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const open = clock < 0.9 ? Math.sin((clock / 0.9) * Math.PI) : 0;
      if (open > 0) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = open * 0.55;
        const r = Math.max(w, h) * 0.6;
        c.drawImage(halo, w / 2 - r, -r * 0.75, r * 2, r * 1.5);
        c.globalCompositeOperation = 'source-over';
      }
      for (const r of ribbons) {
        if (r.age < 0) continue;
        const a = Math.min(1, r.age / 0.2) * ribbonFade(r);
        if (a > 0.01) drawRibbon(c, r, r.age, a);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFlash(c);
      for (const s of stars) {
        if (s.age < 0) continue;
        const a = Math.min(1, s.age / 0.15) * lowFade(s.y) * Math.min(1, (GOLD_SHOWER.life - s.age) / 0.4);
        if (a > 0.01) drawStar(c, s, a, dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = 'lighter';
      for (const s of stars) { // a glint when a star faces the light
        if (s.age < 0) continue;
        const fy = Math.cos(s.flip);
        if (fy < 0.93 || s.y < 0) continue;
        const v = (fy - 0.93) / 0.07;
        const size = s.size * 1.7 * v;
        c.globalAlpha = clamp(v * lowFade(s.y) * 0.8, 0, 1); // never a white blob where a few overlap
        c.drawImage(glint, s.x + s.sx - size / 2, s.y - size / 2, size, size);
      }
      for (const t of twinkles) {
        if (t.age < 0) continue;
        const u = t.age / t.life;
        const size = t.size * Math.sin(u * Math.PI);
        c.globalAlpha = 0.9;
        c.drawImage(glint, t.x - size / 2, t.y - size / 2, size, size);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    },
    /** Whether everything has fallen and faded. @returns {boolean} done */
    done: () => clock > 0.9 && stars.length === 0 && ribbons.length === 0 && twinkles.length === 0,
    /**
     * Reduced motion: a few still gold stars along the top edge and down the sides, and two streamers hanging at the
     * top corners (never over the middle, where the diploma and its button are), drawn once.
     * @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height
     * @returns {void}
     */
    paintStill(c, w, h) {
      W = w;
      H = h;
      const dpr = c.getTransform().a || 1;
      for (let i = 0; i < n.streamers; i += 1) {
        const r = ribbon(i, n.streamers);
        r.x = i % 2 ? w * 0.95 : w * 0.05;
        r.len = Math.min(h * 0.4, r.len);
        r.head = r.len;
        r.amp *= 0.6;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRibbon(c, r, 0.4, 0.95);
      }
      for (let i = 0; i < n.stars; i += 1) {
        const s = star(true);
        const top = i % 3 !== 2;
        s.x = top ? w * (0.1 + rand() * 0.8) : (i % 2 ? w * (0.02 + rand() * 0.05) : w * (0.93 + rand() * 0.05));
        s.y = top ? h * (0.015 + rand() * 0.05) : h * (0.12 + rand() * 0.4);
        s.flip = Math.acos(0.6 + rand() * 0.4);
        drawStar(c, s, 0.95, dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
    },
    /** Counts, for checks. @returns {object} state */
    state: () => ({ kind: 'gold', t: Number(clock.toFixed(2)), stars: stars.length, streamers: ribbons.length, twinkles: twinkles.length }),
  };
}
