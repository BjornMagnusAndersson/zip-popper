// Confetti and petals for the result moment (3 stars) and the Master diploma (SPEC D45 items 2 and 7): a light,
// short version of the effects test page's confetti (js/dev/fx/confetti.js), joyful but over in about 2.5 s.
// Confetti: two party poppers at the bottom corners go off with a soft pop of light, and paper strips, squares, dots,
// little curls, gold foil, cartoon stars and hearts fly up and flutter down (each piece turns, its back shows darker,
// gold and stars flash when they face the light), fading out before they reach the bottom, so nothing stays lying over
// the text or the buttons. Petals (the spa, tier 2): blossom petals and little blossoms drift down from the top and a
// gust blows a few more in from the left, with a few soft twinkles. Reduced motion: a few still pieces along the top
// edge and the sides only. Lighter graphics: about half the pieces (celebrate-logic.js confettiCount).
// It draws on an effects layer (fx-layer.js); the paper pieces are batched by colour, so it stays cheap.
import { clamp, smooth, TAU } from './sprites.js';
import { rng } from '../pop/logic.js';
import { CONFETTI_FX, confettiCount, pieceAlpha } from './celebrate-logic.js';

const INK = '#2a211d';
/** Paper colours "r,g,b": bright candy shades near the game's own (lamp yellow, sofa teal, coral, towel blue, spa pink). */
const PAPER = ['255,92,170', '255,210,90', '63,196,160', '84,160,255', '170,110,255', '240,115,84', '120,214,110', '95,206,232'];
const GOLD = '255,196,56';
/** Petal colour pairs [light tip, deep base]: pinks, a near white and a peach. */
const PETALS = [['255,214,228', '236,120,170'], ['255,196,216', '226,96,150'], ['255,242,247', '244,164,200'], ['255,228,214', '240,150,128']];

/** A colour "r,g,b" times k (darker below 1), as rgb(), optionally mixed toward white. @param {string} rgb colour @param {number} k factor @param {number} [white] 0..1 @returns {string} css colour */
function shade(rgb, k, white = 0) {
  const [r, g, b] = rgb.split(',').map((v) => clamp(Number(v) * k, 0, 255));
  return `rgb(${Math.round(r + (255 - r) * white)},${Math.round(g + (255 - g) * white)},${Math.round(b + (255 - b) * white)})`;
}

/**
 * Five shades of one paper colour, worked out once: 0 = the back full on, 2 = edge-on, 4 = the front full on in the
 * light (a flash toward white). Gold foil has a shinier range.
 * @param {string} rgb colour "r,g,b"
 * @param {boolean} metal gold foil
 * @returns {string[]} 5 css colours
 */
function ramp(rgb, metal) {
  return [shade(rgb, metal ? 0.78 : 0.86, 0.06), shade(rgb, metal ? 0.74 : 0.82, 0.04), shade(rgb, metal ? 0.88 : 0.94), shade(rgb, 1, metal ? 0.3 : 0.08), shade(rgb, 1, metal ? 0.72 : 0.45)];
}

/** Which of the five shades a piece shows for how much it faces the viewer. @param {number} fy -1 (back) .. 1 (front) @returns {number} 0..4 */
function shadeIndex(fy) {
  return fy > 0.93 ? 4 : fy > 0.4 ? 3 : fy > -0.3 ? 2 : fy > -0.8 ? 1 : 0;
}

/** Paint a five-point cartoon star with an ink outline into its sprite (the diploma's gold shower uses it too). @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {string[]} cols [top, middle, bottom] css colours @returns {void} */
export function paintStar(c, w, cols) {
  const m = w / 2;
  const R = w * 0.42;
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.48 : R;
    if (i) c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); else c.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.closePath();
  const g = c.createLinearGradient(0, m - R, 0, m + R);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.5, cols[1]);
  g.addColorStop(1, cols[2]);
  c.fillStyle = g;
  c.lineJoin = 'round';
  c.lineWidth = w * 0.07;
  c.strokeStyle = INK;
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)'; // a small shine
  c.beginPath(); c.ellipse(m - R * 0.18, m - R * 0.32, R * 0.12, R * 0.2, -0.5, 0, TAU); c.fill();
}

/** Paint a cartoon heart with an ink outline and a shine into its sprite. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {string[]} cols [top, bottom] css colours @returns {void} */
function paintHeart(c, w, cols) {
  const m = w / 2;
  c.beginPath();
  c.moveTo(m, w * 0.86);
  c.bezierCurveTo(w * 0.04, w * 0.56, w * 0.06, w * 0.12, m, w * 0.3);
  c.bezierCurveTo(w * 0.94, w * 0.12, w * 0.96, w * 0.56, m, w * 0.86);
  c.closePath();
  const g = c.createLinearGradient(0, w * 0.15, 0, w * 0.86);
  g.addColorStop(0, cols[0]);
  g.addColorStop(1, cols[1]);
  c.fillStyle = g;
  c.lineJoin = 'round';
  c.lineWidth = w * 0.07;
  c.strokeStyle = INK;
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath(); c.ellipse(w * 0.32, w * 0.36, w * 0.06, w * 0.1, -0.6, 0, TAU); c.fill();
}

/** Paint one blossom petal (a soft teardrop with a little notch), light at the tip, deeper at the base. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w width @param {number} h height @param {string[]} pair [light, deep] "r,g,b" @param {boolean} back the back side @returns {void} */
function paintPetal(c, w, h, pair, back) {
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.96);
  c.bezierCurveTo(w * 0.02, h * 0.72, w * 0.04, h * 0.14, w * 0.36, h * 0.06);
  c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.64, h * 0.06);
  c.bezierCurveTo(w * 0.96, h * 0.14, w * 0.98, h * 0.72, w * 0.5, h * 0.96);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, back ? shade(pair[1], 1, 0.4) : `rgb(${pair[0]})`);
  g.addColorStop(1, back ? shade(pair[1], 0.96) : `rgb(${pair[1]})`);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = shade(pair[1], 0.87);
  c.lineWidth = Math.max(0.8, w * 0.06);
  c.stroke();
  if (back) return;
  c.strokeStyle = 'rgba(255,255,255,0.6)'; // a light vein down the middle
  c.beginPath(); c.moveTo(w * 0.5, h * 0.88); c.quadraticCurveTo(w * 0.44, h * 0.5, w * 0.5, h * 0.24); c.stroke();
}

/** Paint a little blossom: five round petals round a yellow middle. @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {string[]} pair [light, deep] "r,g,b" @returns {void} */
function paintBloom(c, w, pair) {
  const m = w / 2;
  c.fillStyle = `rgb(${pair[0]})`;
  c.strokeStyle = shade(pair[1], 0.9);
  c.lineWidth = w * 0.05;
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    c.beginPath();
    c.arc(m + Math.cos(a) * w * 0.22, m + Math.sin(a) * w * 0.22, w * 0.2, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.fillStyle = '#ffd23f';
  c.strokeStyle = '#e09a1c';
  c.beginPath(); c.arc(m, m, w * 0.12, 0, TAU); c.fill(); c.stroke();
}

/** Paint a sparkle: a small soft glow with a long thin four-point star (drawn added on, as light; the heart puff and the gold shower use it too). @param {CanvasRenderingContext2D} c the sprite's context @param {number} w size @param {string} rgb tint "r,g,b" @returns {void} */
export function paintSparkle(c, w, rgb) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, `rgba(${rgb},0.75)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [ax, ay] of [[1, 0], [0, 1]]) {
    c.beginPath();
    c.moveTo(m - ax * m * 0.98, m - ay * m * 0.98);
    c.lineTo(m + ay * w * 0.06, m + ax * w * 0.06);
    c.lineTo(m + ax * m * 0.98, m + ay * m * 0.98);
    c.lineTo(m - ay * w * 0.06, m - ax * w * 0.06);
    c.closePath();
    c.fill();
  }
}

/**
 * Make a confetti burst or a petal shower for an effects layer.
 * @param {{kit: object, kind: 'confetti'|'petals', W: number, H: number, lite?: boolean, still?: boolean, seed?: number}} o
 *   kit = the layer's sprite kit; kind = what falls; W, H = the layer's size now (CSS px); lite = Lighter graphics;
 *   still = reduced motion (use paintStill instead of the moving effect); seed = for the same pieces every time
 * @returns {{step: (dt: number, W: number, H: number) => void, draw: (c: CanvasRenderingContext2D, W: number, H: number, dpr: number) => void,
 *   done: () => boolean, paintStill: (c: CanvasRenderingContext2D, W: number, H: number) => void, state: () => object}} the effect
 */
export function makeConfetti(o) {
  const { kit, kind } = o;
  const petals = kind === 'petals';
  const rand = rng(o.seed ?? (petals ? 41 : 17));
  let W = o.W;
  let H = o.H;
  const sc = clamp(Math.min(W, H) / 260, 0.6, 1.6);
  const ramps = [...PAPER.map((rgb) => ramp(rgb, false)), ramp(GOLD, true)];
  const GOLD_I = ramps.length - 1;
  const buckets = Array.from({ length: ramps.length * 5 }, () => []);
  const starF = kit.sprite('cf-star', 40, 40, (c, w) => paintStar(c, w, ['#fff2a0', '#ffd23f', '#f4a628']));
  const starB = kit.sprite('cf-star-b', 40, 40, (c, w) => paintStar(c, w, ['#e8bd4a', '#d0901e', '#a86a14']));
  const heartF = kit.sprite('cf-heart', 40, 40, (c, w) => paintHeart(c, w, ['#ff8fc4', '#ff4f8b']));
  const heartB = kit.sprite('cf-heart-b', 40, 40, (c, w) => paintHeart(c, w, ['#d05a8e', '#b03466']));
  const petalF = PETALS.map((pair, i) => kit.sprite(`cf-petal:${i}`, 24, 29, (c, w, h) => paintPetal(c, w, h, pair, false)));
  const petalB = PETALS.map((pair, i) => kit.sprite(`cf-petal-b:${i}`, 24, 29, (c, w, h) => paintPetal(c, w, h, pair, true)));
  const bloom = PETALS.slice(1, 3).map((pair, i) => kit.sprite(`cf-bloom:${i}`, 32, 32, (c, w) => paintBloom(c, w, pair)));
  const sparkW = kit.sprite('cf-spark-w', 32, 32, (c, w) => paintSparkle(c, w, '255,246,214'));
  const sparkP = kit.sprite('cf-spark-p', 32, 32, (c, w) => paintSparkle(c, w, '255,186,220'));
  const halo = kit.glow('255,232,160');
  const pieces = [];
  const sparkles = [];
  const pops = [];
  let clock = 0;

  /** A paper kind for a confetti piece: mostly strips, then squares, dots, curls, a few stars and hearts. @returns {string} kind */
  function pickKind() {
    const r = rand();
    return r < 0.42 ? 'rect' : r < 0.58 ? 'square' : r < 0.71 ? 'dot' : r < 0.84 ? 'curl' : r < 0.94 ? 'star' : 'heart';
  }

  /**
   * One piece with its look and its way of falling: fast spinners, flutterers and slow tumblers.
   * @param {string} k kind (rect, square, dot, curl, star, heart, petal, bloom)
   * @param {number} x start x @param {number} y start y @param {number} vx speed x @param {number} vy speed y
   * @param {number} delay seconds before it shows
   * @returns {object} the piece
   */
  function piece(k, x, y, vx, vy, delay) {
    const soft = k === 'petal' || k === 'bloom';
    const s = rand();
    let w;
    let h;
    if (k === 'rect') { h = (4.4 + s * 2.6) * sc; w = h * (1.5 + rand() * 0.9); }
    else if (k === 'square' || k === 'dot') { h = (5 + s * 3) * sc; w = h; }
    else if (k === 'curl') { h = (4.4 + s * 2.2) * sc; w = h; }
    else if (k === 'star') { h = (13 + s * 7) * sc; w = h; }
    else if (k === 'heart') { h = (12 + s * 6) * sc; w = h; }
    else if (k === 'bloom') { h = (11 + s * 5) * sc; w = h; }
    else { w = (10 + s * 5) * sc; h = w * 1.2; }
    const sp = rand();
    const cls = soft ? 2 : sp < 0.25 ? 0 : sp < 0.75 ? 1 : 2; // 0 fast spinner, 1 flutterer, 2 slow tumbler
    const pi = Math.floor(rand() * PETALS.length);
    const metal = !soft && k !== 'star' && k !== 'heart' && rand() < 0.15;
    return {
      k, x, y, vx, vy, age: -delay, life: CONFETTI_FX.life * (0.78 + rand() * 0.3), w, h,
      rot: rand() * TAU, vr: (rand() < 0.5 ? -1 : 1) * (soft ? 0.2 + rand() * 1.2 : cls === 0 ? 5 + rand() * 7 : cls === 1 ? 1 + rand() * 4 : 0.3 + rand() * 1.4),
      flip: rand() * TAU, vf: soft ? 1.4 + rand() * 2.4 : cls === 0 ? 13 + rand() * 8 : cls === 1 ? 5 + rand() * 5 : 1.3 + rand() * 2,
      sway: (soft ? 30 + rand() * 28 : 16 + rand() * 26) * sc, sw: soft ? 1 + rand() * 1.1 : 1.6 + rand() * 2.4, ph: rand() * TAU,
      drag: soft ? 2.4 : k === 'star' || k === 'heart' ? 2.6 : 2.9 + rand() * 0.5, fall: soft ? 0.8 : 1, tilt: 0,
      ri: metal ? GOLD_I : Math.floor(rand() * PAPER.length), glint: metal || k === 'star',
      imgF: k === 'star' ? starF : k === 'heart' ? heartF : k === 'petal' ? petalF[pi] : k === 'bloom' ? bloom[pi % 2] : null,
      imgB: k === 'star' ? starB : k === 'heart' ? heartB : k === 'petal' ? petalB[pi] : k === 'bloom' ? bloom[pi % 2] : null,
    };
  }

  /** One party popper at a bottom corner: a cone of pieces up and inward, a few sparkles and a soft pop of light. @param {number} side -1 left, 1 right @param {number} n pieces @returns {void} */
  function popper(side, n) {
    const ox = side < 0 ? W * 0.03 : W * 0.97;
    const oy = H + 4 * sc;
    const wide = clamp((W / H) * 0.9, 1, 2.4); // sideways: they throw further inward
    const aim = -Math.PI / 2 - side * 0.2; // up, leaning a little inward
    for (let i = 0; i < n; i += 1) {
      const a = aim + (rand() - 0.5) * 0.9;
      const v = H * (1.9 + rand() * 1.4);
      pieces.push(piece(pickKind(), ox + (rand() - 0.5) * 12 * sc, oy, Math.cos(a) * v * wide, Math.sin(a) * v, rand() * 0.14));
    }
    for (let i = 0, m = o.lite ? 4 : 8; i < m; i += 1) {
      const a = aim + (rand() - 0.5) * 1.2;
      const v = H * (1.1 + rand() * 1.3);
      sparkles.push({ x: ox, y: oy, vx: Math.cos(a) * v * Math.min(wide, 1.6), vy: Math.sin(a) * v, age: -rand() * 0.1, life: 0.5 + rand() * 0.7, size: (12 + rand() * 10) * sc, ph: rand() * TAU, img: sparkW, grav: 0.3, drag: 3.4 });
    }
    pops.push({ x: ox, y: oy - 4 * sc, aim, age: 0 });
  }

  /** The petal shower: petals and a few blossoms drifting down from the top (some already in view), more blown in from the left. @param {number} n pieces @returns {void} */
  function shower(n) {
    const blown = Math.round(n * 0.25);
    for (let i = 0; i < n - blown; i += 1) {
      const p = piece(rand() < 0.12 ? 'bloom' : 'petal', rand() * W * 1.1 - W * 0.05, -16 * sc - rand() * H * 0.35, (rand() - 0.4) * 40 * sc, H * (0.25 + rand() * 0.2), rand() * 0.5);
      pieces.push(p);
    }
    for (let i = 0; i < blown; i += 1) {
      pieces.push(piece(rand() < 0.1 ? 'bloom' : 'petal', -20 * sc, H * (0.04 + rand() * 0.45), W * (0.8 + rand() * 0.6), (rand() - 0.5) * 40 * sc, 0.1 + rand() * 0.6));
    }
    for (let i = 0, m = o.lite ? 4 : 8; i < m; i += 1) {
      sparkles.push({ x: rand() * W, y: H * (0.05 + rand() * 0.5), vx: 20 * sc, vy: 14 * sc, age: -rand() * 1.2, life: 0.9 + rand() * 0.8, size: (12 + rand() * 9) * sc, ph: rand() * TAU, img: sparkP, grav: 0, drag: 0.5 });
    }
  }

  /** Move a piece on: gravity, air drag (more when it lies flat to the air), a swing that grows as it slows, turning. @param {object} p piece @param {number} dt seconds @param {number} wind px/s @returns {void} */
  function move(p, dt, wind) {
    p.flip += p.vf * dt;
    p.rot += p.vr * dt;
    const face = Math.abs(Math.cos(p.flip));
    const k = Math.exp(-p.drag * (0.5 + 0.85 * face) * dt);
    p.vx *= k;
    p.vy = p.vy * k + H * 0.62 * p.fall * dt;
    const calm = smooth(1 - Math.min(1, Math.hypot(p.vx, p.vy) / (H * 0.9)));
    const swing = Math.cos(p.age * p.sw + p.ph);
    p.tilt = swing * (p.imgF && !p.glint ? 0.75 : 0.3) * calm;
    p.x += (p.vx + (swing * p.sway + wind) * calm) * dt;
    p.y += p.vy * dt;
  }

  /** The squash for how much a piece faces us: edge-on a thin sliver, never nothing. @param {number} fy -1..1 @returns {number} squash */
  function squash(fy) {
    return Math.abs(fy) < 0.08 ? (fy < 0 ? -0.08 : 0.08) : fy;
  }

  /** Add a plain paper piece's outline to the path being built (corners worked out here, so a colour fills in one call). @param {CanvasRenderingContext2D} c context @param {object} p piece @returns {void} */
  function addShape(c, p) {
    const k = squash(Math.cos(p.flip));
    const a = p.rot + p.tilt;
    const co = Math.cos(a);
    const si = Math.sin(a);
    if (p.k === 'dot') {
      const r = p.w / 2;
      const ry = Math.max(0.3, r * Math.abs(k));
      c.moveTo(p.x + co * r, p.y + si * r);
      c.ellipse(p.x, p.y, r, ry, a, 0, TAU);
      return;
    }
    if (p.k === 'curl') { // a short wavy ribbon, drawn as a thin filled zigzag strip
      const L = p.h * 1.7;
      const hy = p.h * 0.6 * k;
      c.moveTo(p.x - co * L - si * hy, p.y - si * L + co * hy);
      c.lineTo(p.x - co * L * 0.33 + si * hy, p.y - si * L * 0.33 - co * hy);
      c.lineTo(p.x + co * L * 0.33 - si * hy, p.y + si * L * 0.33 + co * hy);
      c.lineTo(p.x + co * L + si * hy, p.y + si * L - co * hy);
      c.lineTo(p.x + co * L + si * hy * 0.4, p.y + si * L - co * hy * 0.4);
      c.lineTo(p.x + co * L * 0.33 - si * hy * 0.4, p.y + si * L * 0.33 + co * hy * 0.4);
      c.lineTo(p.x - co * L * 0.33 + si * hy * 0.4, p.y - si * L * 0.33 - co * hy * 0.4);
      c.lineTo(p.x - co * L - si * hy * 0.4, p.y - si * L + co * hy * 0.4);
      c.closePath();
      return;
    }
    const ux = (co * p.w) / 2;
    const uy = (si * p.w) / 2;
    const vx = (-si * k * p.h) / 2;
    const vy = (co * k * p.h) / 2;
    c.moveTo(p.x - ux - vx, p.y - uy - vy);
    c.lineTo(p.x + ux - vx, p.y + uy - vy);
    c.lineTo(p.x + ux + vx, p.y + uy + vy);
    c.lineTo(p.x - ux + vx, p.y - uy + vy);
    c.closePath();
  }

  /** Draw a picture piece (star, heart, petal, blossom): turned and squashed as it flips, the back darker. @param {CanvasRenderingContext2D} c context @param {object} p piece @param {number} a alpha @param {number} dpr pixel ratio @returns {void} */
  function drawPicture(c, p, a, dpr) {
    const fy = Math.cos(p.flip);
    const k = squash(fy);
    const r = p.rot + p.tilt;
    const co = Math.cos(r) * dpr;
    const si = Math.sin(r) * dpr;
    c.globalAlpha = a;
    c.setTransform(co, si, -si * k, co * k, dpr * p.x, dpr * p.y);
    c.drawImage(fy >= 0 ? p.imgF : p.imgB, -p.w / 2, -p.h / 2, p.w, p.h);
  }

  /** The popper's pop: a soft glow (added on), a white ring opening out and short burst lines. @param {CanvasRenderingContext2D} c context @param {object} f the pop @returns {void} */
  function drawPop(c, f) {
    const u = f.age / 0.45;
    if (u < 0 || u >= 1) return;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (1 - u) * (1 - u) * 0.8;
    const r = (90 + 90 * smooth(Math.min(1, u * 3))) * sc;
    c.drawImage(halo, f.x - r, f.y - r, r * 2, r * 2);
    c.globalCompositeOperation = 'source-over';
    const e = smooth(Math.min(1, u / 0.8));
    c.globalAlpha = (1 - e) * 0.9;
    c.strokeStyle = '#fff6d2';
    c.lineWidth = (6 * (1 - e) + 1) * sc;
    c.beginPath();
    c.arc(f.x, f.y, (10 + 90 * e) * sc, 0, TAU);
    c.stroke();
    c.strokeStyle = '#ffe27a';
    c.lineWidth = 4 * sc * (1 - e) + 0.5;
    c.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = f.aim + (i / 4 - 0.5) * 1.5;
      const r0 = (20 + 80 * e) * sc;
      const r1 = r0 + 30 * sc * (1 - e);
      c.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
      c.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
    }
    c.stroke();
  }

  const n = confettiCount(kind, { lite: o.lite });
  if (!o.still) {
    if (petals) shower(n);
    else { popper(-1, Math.ceil(n / 2)); popper(1, Math.floor(n / 2)); }
  }

  return {
    /** Move every piece, sparkle and pop on and drop the ones whose life is over. @param {number} dt seconds @param {number} w layer width @param {number} h layer height @returns {void} */
    step(dt, w, h) {
      W = w || W;
      H = h || H;
      clock += dt;
      const wind = petals ? (Math.sin(clock * 0.8) * 0.6 + 0.4) * 30 * sc : Math.sin(clock * 0.5) * 8 * sc;
      let j = 0;
      for (const p of pieces) {
        p.age += dt;
        if (p.age >= 0) move(p, dt, wind * (p.imgF && !p.glint ? 1 : 0.35));
        if (p.age < p.life && p.y < H + 60 && p.x > -80 && p.x < W + 80) { pieces[j] = p; j += 1; }
      }
      pieces.length = j;
      j = 0;
      for (const s of sparkles) {
        s.age += dt;
        if (s.age >= 0) {
          const k = Math.exp(-s.drag * dt);
          s.vx *= k;
          s.vy = s.vy * k + H * 0.62 * s.grav * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        if (s.age < s.life) { sparkles[j] = s; j += 1; }
      }
      sparkles.length = j;
      for (const f of pops) f.age += dt;
      for (let i = pops.length - 1; i >= 0; i -= 1) if (pops[i].age > 0.5) pops.splice(i, 1);
    },
    /** The paper in colour batches, the pictures one by one, the pops, then the light on top. @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height @param {number} dpr pixel ratio @returns {void} */
    draw(c, w, h, dpr) {
      for (const b of buckets) b.length = 0;
      for (const p of pieces) {
        if (p.age < 0 || p.imgF) continue;
        const a = pieceAlpha(p.age, p.life);
        if (a >= 0.999) buckets[p.ri * 5 + shadeIndex(Math.cos(p.flip))].push(p);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
      for (let i = 0; i < buckets.length; i += 1) {
        if (!buckets[i].length) continue;
        c.fillStyle = ramps[Math.floor(i / 5)][i % 5];
        c.beginPath();
        for (const p of buckets[i]) addShape(c, p);
        c.fill();
      }
      for (const p of pieces) { // fading paper, one by one
        if (p.age < 0 || p.imgF) continue;
        const a = pieceAlpha(p.age, p.life);
        if (a >= 0.999 || a <= 0.01) continue;
        c.globalAlpha = a;
        c.fillStyle = ramps[p.ri][shadeIndex(Math.cos(p.flip))];
        c.beginPath();
        addShape(c, p);
        c.fill();
      }
      for (const p of pieces) {
        if (p.age < 0 || !p.imgF) continue;
        const a = pieceAlpha(p.age, p.life);
        if (a > 0.01) drawPicture(c, p, a, dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const f of pops) drawPop(c, f);
      c.globalCompositeOperation = 'lighter';
      for (const s of sparkles) {
        if (s.age < 0) continue;
        const u = s.age / s.life;
        const size = s.size * (0.6 + 0.4 * Math.sin(s.age * 22 + s.ph)) * (1 - u * 0.4);
        c.globalAlpha = clamp(u < 0.12 ? u / 0.12 : 1 - smooth((u - 0.35) / 0.65), 0, 1);
        c.drawImage(s.img, s.x - size / 2, s.y - size / 2, size, size);
      }
      for (const p of pieces) { // gold foil and stars flash when they face the light
        if (!p.glint || p.age < 0) continue;
        const fy = Math.cos(p.flip);
        if (fy < 0.93) continue;
        const v = (fy - 0.93) / 0.07;
        const size = (p.k === 'star' ? 28 : 18) * sc * v;
        c.globalAlpha = clamp(v * pieceAlpha(p.age, p.life), 0, 1);
        c.drawImage(sparkW, p.x - size / 2, p.y - size / 2, size, size);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    },
    /** Whether every piece, sparkle and pop is gone. @returns {boolean} done */
    done: () => pieces.length === 0 && sparkles.length === 0 && pops.length === 0,
    /**
     * Reduced motion: a few still pieces along the top edge and down the sides (never over the middle, where the text
     * and the buttons are), drawn once.
     * @param {CanvasRenderingContext2D} c context (CSS px) @param {number} w width @param {number} h height
     * @returns {void}
     */
    paintStill(c, w, h) {
      W = w;
      H = h;
      const m = confettiCount(kind, { lite: o.lite, still: true });
      const dpr = c.getTransform().a || 1;
      for (let i = 0; i < m; i += 1) {
        const top = i % 3 !== 2; // two in three along the top, the rest down the sides
        const x = top ? w * (0.04 + rand() * 0.92) : (i % 2 ? w * (0.015 + rand() * 0.035) : w * (0.95 + rand() * 0.035));
        const y = top ? h * (0.008 + rand() * 0.035) : h * (0.12 + rand() * 0.5);
        const p = piece(petals ? (rand() < 0.15 ? 'bloom' : 'petal') : pickKind(), x, y, 0, 0, 0);
        p.flip = rand() < 0.75 ? Math.acos(0.5 + rand() * 0.5) : Math.PI - 0.6;
        if (p.imgF) { drawPicture(c, p, 0.95, dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0); continue; }
        c.globalAlpha = 0.95;
        c.fillStyle = ramps[p.ri][shadeIndex(Math.cos(p.flip))];
        c.beginPath();
        addShape(c, p);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    /** Counts, for checks. @returns {object} state */
    state: () => ({ kind, pieces: pieces.length, sparkles: sparkles.length, pops: pops.length }),
  };
}
