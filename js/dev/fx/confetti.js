// Effect 8 for the light test page (fx-test.html): confetti and petals, over everything (screen space). Fire, the
// 1st, 3rd, 5th time: a big celebration in three waves. First two party cannons at the bottom corners go off with a
// bright pop (a glow, a ring and comic burst lines, a quick light flash over the screen, sparkles), then two more
// poppers further in, then a curtain of confetti tipped from above, so the whole screen fills. The pieces (paper
// strips, squares, dots, little ribbon curls, long curly streamers, cartoon stars and hearts with an ink outline, gold
// foil that glints) fall slowly with air drag and flutter: each one turns (one side squashes, the back shows darker,
// a flash when it faces the light), some spin fast, some tumble slowly and hover when they lie flat to the air. They
// land at the bottom in a little heap that settles and then fades away. The 2nd, 4th time: a petal shower: blossom
// petals and whole little blossoms drift down from the top like falling leaves (swinging side to side, tilting, slower
// at the ends of a swing), a gust blows more in from the left, a few soft twinkles, and they settle in a heap too.
// For 3-star results, Master diplomas, boss wins, strip endings. Idle: a light sprinkle from the top now and then
// (petals in the spa, tier 2). Still: a calm still frame, no flash; Fire shows the pieces softly where they would
// hang or lie and fades them away. Lite: about half of everything. See the README in core.js for the interface.
import { clamp, smooth, TAU } from './sprites.js';

const INK = '#2a211d';
/** Paper colours "r,g,b": bright candy shades near the game's own (lamp yellow, sofa teal, coral, towel blue, spa pink). */
const PAPER = ['255,92,170', '255,210,90', '63,196,160', '84,160,255', '170,110,255', '240,115,84', '120,214,110', '95,206,232'];
const GOLD = '255,196,56';
/** Petal colour pairs [light tip, deep base]: pinks, a near white and a peach. */
const PETALS = [['255,214,228', '236,120,170'], ['255,196,216', '226,96,150'], ['255,242,247', '244,164,200'], ['255,228,214', '240,150,128']];
const XS = new Float32Array(64); // scratch: a streamer's curled points (no new arrays every frame)
const YS = new Float32Array(64);
const BAND = new Uint8Array(64); // scratch: which side of the ribbon each streamer segment shows
/** A curl's wavy line, 10 points, in units of the curl's size (3.4 long, a wave 0.6 high). */
const CURL_X = Array.from({ length: 10 }, (_, i) => 3.4 * (i / 9 - 0.5));
const CURL_Y = Array.from({ length: 10 }, (_, i) => Math.sin(i * 1.25) * 0.6);

/** A colour "r,g,b" times k (darker below 1), as rgb(). @param {string} rgb colour @param {number} k factor @param {number} [white] 0..1 mixed toward white @returns {string} css colour */
function shade(rgb, k, white = 0) {
  const [r, g, b] = rgb.split(',').map((v) => clamp(Number(v) * k, 0, 255));
  return `rgb(${Math.round(r + (255 - r) * white)},${Math.round(g + (255 - g) * white)},${Math.round(b + (255 - b) * white)})`;
}

/**
 * Nine shades of one paper colour, worked out once: 0 = the back seen full on, 4 = edge-on, 8 = the front full on in
 * the light (a flash toward white). Gold foil has a wider, shinier range.
 * @param {string} rgb colour "r,g,b"
 * @param {boolean} metal gold foil
 * @returns {string[]} 9 css colours
 */
function ramp(rgb, metal) {
  const out = [];
  for (let i = 0; i <= 8; i += 1) {
    const f = i / 4 - 1;
    if (f < 0) out.push(shade(rgb, (metal ? 0.64 : 0.66) + 0.12 * -f));
    else out.push(shade(rgb, (metal ? 0.66 : 0.8) + (metal ? 0.34 : 0.2) * f, i === 8 ? (metal ? 0.75 : 0.45) : i === 7 ? (metal ? 0.32 : 0.08) : 0));
  }
  return out;
}

/** Which of the nine shades a piece shows for how much it faces the viewer. @param {number} fy -1 (back) .. 1 (front) @returns {number} 0..8 */
function shadeIndex(fy) {
  return fy > 0.94 ? 8 : Math.min(7, Math.round((fy + 1) * 4));
}

/**
 * Paint a five-point cartoon star with an ink outline into its sprite (gold front, or the darker back).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string[]} cols [top, middle, bottom] css colours
 * @returns {void}
 */
function paintStar(c, w, cols) {
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

/**
 * Paint a cartoon heart with an ink outline and a shine into its sprite.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string[]} cols [top, bottom] css colours
 * @returns {void}
 */
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

/**
 * Paint a sparkle: a small soft glow with a four-point star of long thin rays (drawn added on, as light).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string} rgb tint "r,g,b"
 * @returns {void}
 */
function paintSparkle(c, w, rgb) {
  const m = w / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, `rgba(${rgb},0.75)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [ax, ay] of [[1, 0], [0, 1]]) { // a long vertical and a long sideways ray, thin as a needle
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
 * Paint one blossom petal (a soft teardrop with a little notch at its round end), light at the tip, deeper at the base.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {string[]} pair [light, deep] colours "r,g,b"
 * @param {boolean} back the back side (a little deeper, no vein)
 * @returns {void}
 */
function paintPetal(c, w, h, pair, back) {
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.96);
  c.bezierCurveTo(w * 0.02, h * 0.72, w * 0.04, h * 0.14, w * 0.36, h * 0.06);
  c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.64, h * 0.06);
  c.bezierCurveTo(w * 0.96, h * 0.14, w * 0.98, h * 0.72, w * 0.5, h * 0.96);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, back ? shade(pair[1], 1, 0.4) : `rgb(${pair[0]})`); // the back: the deeper colour, softer (never brown)
  g.addColorStop(1, back ? shade(pair[1], 0.96) : `rgb(${pair[1]})`);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = shade(pair[1], back ? 0.86 : 0.88);
  c.lineWidth = Math.max(0.8, w * 0.06);
  c.stroke();
  if (back) return;
  c.strokeStyle = 'rgba(255,255,255,0.6)'; // a light vein down the middle
  c.beginPath(); c.moveTo(w * 0.5, h * 0.88); c.quadraticCurveTo(w * 0.44, h * 0.5, w * 0.5, h * 0.24); c.stroke();
}

/**
 * Paint a whole little blossom: five round petals with a deeper rim round a yellow middle (like the studio's flower).
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @param {string[]} pair [light, deep] colours "r,g,b"
 * @param {boolean} back the back side (green-tinged middle, deeper petals)
 * @returns {void}
 */
function paintBloom(c, w, pair, back) {
  const m = w / 2;
  c.fillStyle = back ? shade(pair[0], 0.86) : `rgb(${pair[0]})`;
  c.strokeStyle = shade(pair[1], back ? 0.72 : 0.9);
  c.lineWidth = w * 0.05;
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    c.beginPath();
    c.arc(m + Math.cos(a) * w * 0.22, m + Math.sin(a) * w * 0.22, w * 0.2, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.fillStyle = back ? '#a8c56a' : '#ffd23f';
  c.strokeStyle = back ? '#6f8f3e' : '#e09a1c';
  c.beginPath(); c.arc(m, m, w * 0.12, 0, TAU); c.fill(); c.stroke();
}

/**
 * Make the confetti for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, still, dpr } = env;
  const spa = env.tier === 2 && !env.party;
  const ramps = PAPER.map((rgb) => ramp(rgb, false));
  const goldRamp = ramp(GOLD, true);
  const allRamps = [...ramps, goldRamp]; // piece.ri points in here
  const buckets = allRamps.flatMap(() => Array.from({ length: 9 }, () => [])); // flat paper pieces this frame, by colour and shade
  const curlBuckets = allRamps.flatMap(() => Array.from({ length: 9 }, () => [])); // the same for the curls
  const starF = env.sprite('confetti-star', 40, 40, (c, w) => paintStar(c, w, ['#fff2a0', '#ffd23f', '#f4a628']));
  const starB = env.sprite('confetti-star-b', 40, 40, (c, w) => paintStar(c, w, ['#e8bd4a', '#d0901e', '#a86a14']));
  const heartF = env.sprite('confetti-heart', 40, 40, (c, w) => paintHeart(c, w, ['#ff8fc4', '#ff4f8b']));
  const heartB = env.sprite('confetti-heart-b', 40, 40, (c, w) => paintHeart(c, w, ['#d05a8e', '#b03466']));
  const petalF = PETALS.map((pair, i) => env.sprite(`petal:${i}`, 24, 29, (c, w, h) => paintPetal(c, w, h, pair, false)));
  const petalB = PETALS.map((pair, i) => env.sprite(`petal-b:${i}`, 24, 29, (c, w, h) => paintPetal(c, w, h, pair, true)));
  const bloomF = PETALS.slice(1, 3).map((pair, i) => env.sprite(`bloom:${i}`, 32, 32, (c, w) => paintBloom(c, w, pair, false)));
  const bloomB = PETALS.slice(1, 3).map((pair, i) => env.sprite(`bloom-b:${i}`, 32, 32, (c, w) => paintBloom(c, w, pair, true)));
  const sparkW = env.sprite('confetti-spark-w', 32, 32, (c, w) => paintSparkle(c, w, '255,246,214'));
  const sparkG = env.sprite('confetti-spark-g', 32, 32, (c, w) => paintSparkle(c, w, '255,196,80'));
  const sparkP = env.sprite('confetti-spark-p', 32, 32, (c, w) => paintSparkle(c, w, '255,186,220'));
  const halo = env.glow('255,232,160');
  const g = H * 0.62; // gravity, px/s²
  const cw = 7 * sc; // the heap at the bottom: column width and highest height
  const pileMax = Math.min(H * 0.05, 26 * sc);
  const heap = new Float32Array(Math.ceil(W / cw) + 1);
  const maxPieces = env.count(900); // a safety cap when Fire is tapped again and again
  const pieces = [];
  const streamers = [];
  const sparkles = [];
  const flashes = []; // the pops at the cannons (and the screen flash with them)
  let fired = 0;
  let sprinkle = 0; // seconds to the next idle piece
  let stillFade = -1; // still mode: seconds since Fire (the pieces fade in and out)
  let clock = 0; // own seconds, for the breeze
  let gust = 0; // the petal shower's gust from the left, 1 when it starts, dying away
  let wind = 0; // the breeze now, px/s (petals feel it fully, paper a little)

  /** A paper kind for a burst piece: mostly strips, then curls, squares, dots, a few stars and hearts. @returns {string} kind */
  function pickKind() {
    const r = env.rand();
    return r < 0.44 ? 'rect' : r < 0.59 ? 'square' : r < 0.72 ? 'dot' : r < 0.86 ? 'curl' : r < 0.95 ? 'star' : 'heart';
  }

  /**
   * One piece (rect, square, dot, curl, star, heart, petal or bloom) with its look and its way of falling worked out
   * once: fast spinners, steady flutterers and slow tumblers (which also turn round a second axis).
   * @param {string} kind the kind
   * @param {number} x start x
   * @param {number} y start y
   * @param {number} vx speed x
   * @param {number} vy speed y
   * @returns {object} the piece
   */
  function piece(kind, x, y, vx, vy) {
    const r = env.rand;
    const petal = kind === 'petal' || kind === 'bloom';
    const metal = !petal && kind !== 'star' && kind !== 'heart' && r() < 0.15; // gold foil
    const s = r();
    let w;
    let h;
    if (kind === 'rect') { h = (4.4 + s * 2.6) * sc; w = h * (1.5 + r() * 0.9); }
    else if (kind === 'square') { h = (5 + s * 2.8) * sc; w = h; }
    else if (kind === 'dot') { h = (5 + s * 3) * sc; w = h; }
    else if (kind === 'curl') { h = (4.4 + s * 2.2) * sc; w = h; }
    else if (kind === 'star') { h = (13 + s * 7) * sc; w = h; }
    else if (kind === 'heart') { h = (12 + s * 6) * sc; w = h; }
    else if (kind === 'bloom') { h = (14 + s * 6) * sc; w = h; }
    else { w = (13 + s * 6) * sc; h = w * 1.2; }
    const sp = r();
    const cls = petal ? 2 : sp < 0.24 ? 0 : sp < 0.76 ? 1 : 2; // 0 fast spinner, 1 flutterer, 2 slow tumbler
    const vf = petal ? 1.4 + r() * 2.4 : cls === 0 ? 13 + r() * 8 : cls === 1 ? 5 + r() * 5 : 1.3 + r() * 2;
    const vr = (r() < 0.5 ? -1 : 1) * (petal ? 0.2 + r() * 1.2 : cls === 0 ? 5 + r() * 7 : cls === 1 ? 1 + r() * 4 : 0.3 + r() * 1.4);
    const pi = Math.floor(r() * PETALS.length);
    const bi = pi % 2;
    return {
      kind, x, y, vx, vy, age: 0, w, h, metal,
      rot: r() * TAU, vr, flip: r() * TAU, vf, flip2: r() * TAU, vf2: cls === 2 && !petal ? 0.8 + r() * 1.8 : 0,
      sway: (petal ? 30 + r() * 28 : cls === 2 ? 30 + r() * 30 : 16 + r() * 24) * sc, sw: petal ? 1 + r() * 1.1 : 1.6 + r() * 2.4, ph: r() * TAU,
      tiltK: petal ? 0.75 : 0.3, hover: petal ? 0.6 : 0.25, // tilt into the swing; slower at the ends of a swing
      drag: petal ? 2.4 : kind === 'dot' ? 2.4 : kind === 'star' || kind === 'heart' ? 2.6 : 2.9 + r() * 0.5,
      fall: petal ? 0.8 : 1, windK: petal ? 1 : 0.35,
      ri: metal ? ramps.length : Math.floor(r() * ramps.length),
      imgF: kind === 'star' ? starF : kind === 'heart' ? heartF : kind === 'petal' ? petalF[pi] : kind === 'bloom' ? bloomF[bi] : null,
      imgB: kind === 'star' ? starB : kind === 'heart' ? heartB : kind === 'petal' ? petalB[pi] : kind === 'bloom' ? bloomB[bi] : null,
      glint: metal || kind === 'star',
      a: 1, tilt: 0, landed: false, hold: 0, col: -1, add: 0, bounced: false,
    };
  }

  /** Add a piece unless there are already very many. @param {object} p piece @returns {void} */
  function add(p) {
    if (pieces.length < maxPieces) pieces.push(p);
  }

  /** How high the heap is under x (a little smoothed with its neighbours, so it is a soft mound). @param {number} x px @returns {number} the heap's top y */
  function floorAt(x) {
    const i = clamp(Math.floor(x / cw), 0, heap.length - 1);
    const l = heap[Math.max(0, i - 1)];
    const r = heap[Math.min(heap.length - 1, i + 1)];
    return H - (l + heap[i] * 2 + r) / 4;
  }

  /** A piece lands: it stays on the heap (which grows a little), stops spinning soon, and later fades. @param {object} p piece @param {number} y where it lies @returns {void} */
  function settle(p, y) {
    p.landed = true;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.hold = (p.imgF && !p.glint ? 3.4 : 2.6) + env.rand() * 2.4;
    p.col = clamp(Math.floor(p.x / cw), 0, heap.length - 1);
    p.add = Math.max(0, Math.min(p.h * 0.42, pileMax - heap[p.col]));
    heap[p.col] += p.add;
  }

  /**
   * Move a flying piece on: gravity, air drag (more when it lies flat to the air, so slow tumblers hover and dart),
   * a side-to-side swing that grows as it slows (tilting into the swing, slower at the ends), the breeze, turning.
   * @param {object} p piece
   * @param {number} dt seconds
   * @returns {void}
   */
  function move(p, dt) {
    p.age += dt;
    p.flip += p.vf * dt;
    p.flip2 += p.vf2 * dt;
    p.rot += p.vr * dt;
    const face = Math.abs(Math.cos(p.flip));
    const k = Math.exp(-p.drag * (0.5 + 0.85 * face) * dt);
    p.vx *= k;
    p.vy = p.vy * k + g * p.fall * dt;
    const calm = smooth(1 - Math.min(1, Math.hypot(p.vx, p.vy) / (H * 0.9)));
    const swing = Math.cos(p.age * p.sw + p.ph);
    p.tilt = swing * p.tiltK * calm;
    p.x += (p.vx + (swing * p.sway + wind * p.windK) * calm) * dt;
    p.y += p.vy * (1 - p.hover * calm * (1 - Math.abs(swing))) * dt;
  }

  /** A landed piece: its spin dies away, then after a while it shrinks a little and fades. @param {object} p piece @param {number} dt seconds @returns {void} */
  function rest(p, dt) {
    const k = Math.exp(-7 * dt);
    p.vf *= k;
    p.vf2 *= k;
    p.vr *= k;
    p.tilt *= k;
    p.flip += p.vf * dt;
    p.flip2 += p.vf2 * dt;
    p.rot += p.vr * dt;
    p.hold -= dt;
    if (p.hold < 0) p.a = 1 + p.hold / 1.2;
  }

  /**
   * A long curly streamer shot from a point (or dropped from above).
   * @param {number} x start x @param {number} y start y @param {number} vx speed x @param {number} vy speed y @param {number} delay seconds before it starts
   * @returns {object} the streamer
   */
  function streamer(x, y, vx, vy, delay) {
    return {
      x, y, vx, vy, age: -delay, pts: [], tw: env.rand() * TAU, ph: env.rand() * TAU,
      ramp: env.rand() < 0.18 ? goldRamp : ramps[Math.floor(env.rand() * ramps.length)],
      sway: (34 + env.rand() * 30) * sc, a: 1, landed: false, hold: 0, wide: 0.8 + env.rand() * 0.5,
    };
  }

  /**
   * One party cannon: a cone of paper pieces, streamers and sparkles, and its pop of light (not in still mode).
   * @param {number} ox x @param {number} oy y
   * @param {number} side -1 left .. 1 right: how much it leans inward
   * @param {number} n how many pieces @param {number} delay seconds before it goes off @param {number} power speed factor
   * @param {number} wide how much further sideways (a sideways screen) @param {number} ns streamers @param {number} flash screen flash strength
   * @returns {void}
   */
  function cannon(ox, oy, side, n, delay, power, wide, ns, flash) {
    const aim = -Math.PI / 2 - side * 0.32; // radians: up, leaning inward
    for (let i = 0; i < n; i += 1) {
      const a = aim + (env.rand() - 0.5) * 0.95;
      const v = H * (2.2 + env.rand() * 1.6) * power;
      const p = piece(pickKind(), ox + (env.rand() - 0.5) * 12 * sc, oy, Math.cos(a) * v * wide, Math.sin(a) * v);
      p.age = -(delay + env.rand() * 0.16); // not all at once
      add(p);
    }
    for (let i = 0; i < ns; i += 1) {
      const a = aim + (env.rand() - 0.5) * 0.8;
      const v = H * (2.5 + env.rand() * 1.1) * power;
      streamers.push(streamer(ox, oy, Math.cos(a) * v * wide, Math.sin(a) * v, delay + i * 0.04));
    }
    if (still) return;
    for (let i = 0, m = env.count(Math.round(16 * power)); i < m; i += 1) {
      const a = aim + (env.rand() - 0.5) * 1.3;
      const v = H * (1.2 + env.rand() * 1.6) * power;
      sparkles.push({ x: ox, y: oy, vx: Math.cos(a) * v * Math.min(wide, 1.6), vy: Math.sin(a) * v, age: -delay - env.rand() * 0.1, life: 0.6 + env.rand() * 0.9, size: (12 + env.rand() * 12) * sc, ph: env.rand() * TAU, img: env.rand() < 0.5 ? sparkG : sparkW, grav: 0.3, drag: 3.4 });
    }
    flashes.push({ x: ox, y: oy - 4 * sc, aim, age: -delay, big: power, scr: flash });
  }

  /** The celebration: two corner cannons, two more poppers further in, then confetti tipped from above. @returns {void} */
  function burst() {
    const wide = clamp((W / H) * 0.9, 1, 2.6); // on a sideways screen the cannons throw further inward
    const oy = H + 4 * sc;
    for (const side of [-1, 1]) cannon(side < 0 ? W * 0.02 : W * 0.98, oy, side, env.count(95), 0, 1, wide, env.count(3), 0.12);
    for (const side of [-1, 1]) cannon(side < 0 ? W * 0.27 : W * 0.73, oy, side * 0.35, env.count(46), 0.38, 0.85, Math.max(1, wide * 0.6), 1, 0.05);
    for (let i = 0, n = env.count(90); i < n; i += 1) { // the curtain from above: it fills the screen while the first waves fall
      const p = piece(pickKind(), env.rand() * W, -12 * sc - env.rand() * H * 0.3, (env.rand() - 0.5) * 60 * sc, env.rand() * 50 * sc);
      p.age = -(0.8 + env.rand() * 0.9);
      add(p);
    }
    for (let i = 0, n = env.count(2); i < n; i += 1) streamers.push(streamer(W * (0.1 + env.rand() * 0.8), -20 * sc, (env.rand() - 0.5) * 40 * sc, 60 * sc, 0.9 + env.rand() * 0.6));
  }

  /** The petal shower: petals and little blossoms from the top, a gust blowing more in from the left, soft twinkles. @returns {void} */
  function petalShower() {
    for (let i = 0, n = env.count(110); i < n; i += 1) {
      const p = piece(env.rand() < 0.12 ? 'bloom' : 'petal', env.rand() * W * 1.1 - W * 0.12, -16 * sc - env.rand() * H * 0.2, (env.rand() - 0.4) * 40 * sc, 30 * sc + env.rand() * 50 * sc);
      p.age = -env.rand() * 2.6;
      add(p);
    }
    for (let i = 0, n = env.count(30); i < n; i += 1) { // blown in from the left
      const p = piece(env.rand() < 0.1 ? 'bloom' : 'petal', -20 * sc, H * (0.04 + env.rand() * 0.5), W * (0.9 + env.rand() * 0.7), (env.rand() - 0.5) * 40 * sc);
      p.age = -(0.15 + env.rand() * 1.1);
      add(p);
    }
    if (still) return;
    gust = 1;
    for (let i = 0, n = env.count(12); i < n; i += 1) {
      sparkles.push({ x: env.rand() * W, y: H * (0.05 + env.rand() * 0.6), vx: 20 * sc, vy: 14 * sc, age: -env.rand() * 2.4, life: 1.1 + env.rand() * 1.2, size: (12 + env.rand() * 10) * sc, ph: env.rand() * TAU, img: sparkP, grav: 0, drag: 0.5 });
    }
  }

  /** Still mode: a calm frame: a few pieces hanging in the air, a small heap at the bottom, two hanging streamers. @returns {void} */
  function calmScene() {
    for (let i = 0, n = env.count(26); i < n; i += 1) {
      const p = piece(spa ? (env.rand() < 0.15 ? 'bloom' : 'petal') : pickKind(), env.rand() * W, H * (0.04 + env.rand() * 0.8), 0, 0);
      p.calm = true;
      p.age = 1;
      pieces.push(p);
    }
    for (let i = 0, n = env.count(16); i < n; i += 1) {
      const p = piece(spa ? 'petal' : pickKind(), env.rand() * W, H - env.rand() * 8 * sc, 0, 0);
      p.calm = true;
      p.landed = true;
      p.hold = Infinity;
      p.flip = Math.acos(0.4 + env.rand() * 0.6) + (env.rand() < 0.3 ? Math.PI : 0);
      pieces.push(p);
    }
    if (spa) return;
    for (let k = 0; k < 2; k += 1) { // two streamers hanging down, gently curved
      const s = streamer(0, 0, 0, 0, 0);
      const x0 = W * (0.2 + 0.6 * k + (env.rand() - 0.5) * 0.1);
      const y0 = H * (0.35 + env.rand() * 0.3);
      for (let j = 0; j < 22; j += 1) s.pts.push({ x: x0 + Math.sin(j * 0.32 + k) * 16 * sc, y: y0 - j * 7 * sc });
      s.calm = true;
      s.age = 1;
      streamers.push(s);
    }
  }

  /** Still mode: put Fire's pieces where they would hang mid-fall or lie at the bottom, without moving them (they fade in and out). @returns {void} */
  function settleAll() {
    let kept = 0;
    const max = env.count(70);
    for (let i = pieces.length - 1; i >= 0; i -= 1) {
      const p = pieces[i];
      if (p.calm || p.soft) continue;
      if (kept >= max) { pieces.splice(i, 1); continue; }
      kept += 1;
      p.soft = true;
      p.x = env.rand() * W;
      p.vx = 0;
      p.vy = 0;
      p.age = 1;
      if (env.rand() < 0.22) { // some already lie at the bottom
        p.landed = true;
        p.hold = Infinity;
        p.y = H - env.rand() * 10 * sc;
        p.flip = Math.acos(0.4 + env.rand() * 0.6);
      } else p.y = env.rand() * H * (p.imgF && !p.glint ? 0.95 : 0.8) + H * 0.04;
    }
    for (let i = streamers.length - 1; i >= 0; i -= 1) if (!streamers[i].calm) streamers.splice(i, 1);
    sparkles.length = 0;
    flashes.length = 0;
  }

  /** Move a streamer on: it flies, curls and sways, trailing its ribbon; on the bottom its ribbon drops down and lies there, then fades. @param {object} s streamer @param {number} dt seconds @returns {void} */
  function stepStreamer(s, dt) {
    s.age += dt;
    if (s.age < 0) return;
    const floor = H - 3 * sc;
    if (s.landed) {
      s.tw += dt * 0.6;
      for (const q of s.pts) if (q.y < floor) q.y = Math.min(floor, q.y + 150 * sc * dt);
      s.hold -= dt;
      if (s.hold < 0) s.a = 1 + s.hold / 1.2;
      return;
    }
    s.tw += dt * 5;
    const k = Math.exp(-2.8 * dt);
    s.vx *= k;
    s.vy = s.vy * k + g * 0.7 * dt;
    const calm = smooth(1 - Math.min(1, Math.hypot(s.vx, s.vy) / (H * 0.9)));
    s.x += (s.vx + (Math.sin(s.age * 3 + s.ph) * s.sway + wind * 0.35) * calm) * dt;
    s.y += s.vy * dt;
    const prev = s.pts[1];
    if (s.pts.length < 2 || Math.hypot(s.x - prev.x, s.y - prev.y) > 7 * sc) { // a new point every few px: the ribbon keeps its length
      s.pts.unshift({ x: s.x, y: s.y });
      if (s.pts.length > 26) s.pts.pop();
    } else { s.pts[0].x = s.x; s.pts[0].y = s.y; } // the head follows the streamer's end
    if (s.y >= floor && s.vy > 0) {
      s.landed = true;
      s.pts[0].y = floor;
      s.hold = 3 + env.rand() * 1.5;
    }
    if (s.age > 12) s.a = Math.min(s.a, 1 - (s.age - 12) / 1.2);
  }

  /** Whether a piece is plain paper drawn in one go with the others of its colour (rects, squares, dots and curls at full strength). @param {object} p piece @returns {boolean} batched */
  function flat(p) {
    return (p.kind === 'rect' || p.kind === 'square' || p.kind === 'dot' || p.kind === 'curl') && p.a >= 1 && !p.soft;
  }

  /** Add a curl's wavy line to the path being built, its points turned and squashed here (no transform). @param {CanvasRenderingContext2D} c context @param {object} p piece @returns {void} */
  function addCurl(c, p) {
    const k = squash(Math.cos(p.flip)) * p.h;
    const kx = narrow(p) * p.h;
    const a = p.rot + p.tilt;
    const co = Math.cos(a);
    const si = Math.sin(a);
    for (let i = 0; i <= 9; i += 1) {
      const x = CURL_X[i] * kx;
      const y = CURL_Y[i] * k;
      const px = p.x + co * x - si * y;
      const py = p.y + si * x + co * y;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
  }

  /** How narrow a piece looks the other way: tumblers (and pieces on the heap) narrow round a second axis. @param {object} p piece @returns {number} 0.1..1 */
  function narrow(p) {
    return p.vf2 || p.landed ? Math.cos(p.flip2) * 0.45 + 0.55 : 1;
  }

  /** The squash for how much a piece faces us: edge-on it is a thin sliver, never nothing. @param {number} fy -1..1 @returns {number} squash */
  function squash(fy) {
    return Math.abs(fy) < 0.08 ? (fy < 0 ? -0.08 : 0.08) : fy;
  }

  /**
   * Add a flat piece's outline to the path being built (its corners worked out here, no transform), so a whole colour
   * of paper fills in one call: much cheaper than a transform and a colour change for every piece.
   * @param {CanvasRenderingContext2D} c context (stage CSS px)
   * @param {object} p piece
   * @returns {void}
   */
  function addShape(c, p) {
    const k = squash(Math.cos(p.flip));
    const kx = narrow(p);
    const a = p.rot + p.tilt;
    const co = Math.cos(a);
    const si = Math.sin(a);
    if (p.kind === 'dot') {
      const rx = Math.max(0.3, (p.w / 2) * Math.abs(kx));
      const ry = Math.max(0.3, (p.w / 2) * Math.abs(k));
      c.moveTo(p.x + co * rx, p.y + si * rx);
      c.ellipse(p.x, p.y, rx, ry, a, 0, TAU);
      return;
    }
    const ux = (co * kx * p.w) / 2;
    const uy = (si * kx * p.w) / 2;
    const vx = (-si * k * p.h) / 2;
    const vy = (co * k * p.h) / 2;
    c.moveTo(p.x - ux - vx, p.y - uy - vy);
    c.lineTo(p.x + ux - vx, p.y + uy - vy);
    c.lineTo(p.x + ux + vx, p.y + uy + vy);
    c.lineTo(p.x - ux + vx, p.y - uy + vy);
    c.closePath();
  }

  /** Draw all plain paper pieces: sorted into colour and shade buckets, then one fill (and one stroke for the curls) per bucket. @param {CanvasRenderingContext2D} c context @returns {void} */
  function drawFlat(c) {
    for (const b of buckets) b.length = 0;
    for (const b of curlBuckets) b.length = 0;
    for (const p of pieces) if (p.age >= 0 && flat(p)) (p.kind === 'curl' ? curlBuckets : buckets)[p.ri * 9 + shadeIndex(Math.cos(p.flip))].push(p);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
    c.lineWidth = 2.6 * sc;
    for (let i = 0; i < buckets.length; i += 1) {
      const col = allRamps[Math.floor(i / 9)][i % 9];
      if (buckets[i].length) {
        c.fillStyle = col;
        c.beginPath();
        for (const p of buckets[i]) addShape(c, p);
        c.fill();
      }
      if (curlBuckets[i].length) {
        c.strokeStyle = col;
        c.beginPath();
        for (const p of curlBuckets[i]) addCurl(c, p);
        c.stroke();
      }
    }
  }

  /** Draw one piece on its own: turned, squashed as it flips (and round a second axis when tumbling), the back darker, a flash face-on. @param {CanvasRenderingContext2D} c context @param {object} p piece @param {number} fade alpha @returns {void} */
  function drawPiece(c, p, fade) {
    const fy = Math.cos(p.flip);
    const k = squash(fy);
    const kx = narrow(p);
    const z = p.landed ? 0.75 + 0.25 * clamp(p.a, 0, 1) : 1; // a fading piece on the heap shrinks a little
    const a = p.rot + p.tilt;
    const co = Math.cos(a) * dpr * z;
    const si = Math.sin(a) * dpr * z;
    const ga = clamp(fade * p.a, 0, 1);
    if (c.globalAlpha !== ga) c.globalAlpha = ga;
    c.setTransform(co * kx, si * kx, -si * k, co * k, dpr * p.x, dpr * p.y);
    const ramp = allRamps[p.ri];
    if (p.kind === 'rect' || p.kind === 'square') {
      c.fillStyle = ramp[shadeIndex(fy)];
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else if (p.kind === 'dot') {
      c.fillStyle = ramp[shadeIndex(fy)];
      c.beginPath();
      c.arc(0, 0, p.w / 2, 0, TAU);
      c.fill();
    } else if (p.kind === 'curl') { // a short curly ribbon: a tight wave
      c.strokeStyle = ramp[shadeIndex(fy)];
      c.lineWidth = p.h * 0.46;
      const L = p.h * 3.4;
      c.beginPath();
      for (let i = 0; i <= 9; i += 1) {
        const x = -L / 2 + (L * i) / 9;
        const y = Math.sin(i * 1.25) * p.h * 0.6;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
    } else {
      c.drawImage(fy >= 0 ? p.imgF : p.imgB, -p.w / 2, -p.h / 2, p.w, p.h);
    }
  }

  /** Draw one streamer: a long curly ribbon through its trail that twists (wide and bright facing us, thin and dark turned away). @param {CanvasRenderingContext2D} c context @param {object} s streamer @returns {void} */
  function drawStreamer(c, s) {
    const raw = s.pts;
    const n = Math.min(raw.length, XS.length);
    if (n < 3) return;
    for (let i = 0; i < n; i += 1) { // each point pushed sideways by a wave that runs along the ribbon
      const q = raw[i];
      const nx = raw[Math.min(n - 1, i + 1)];
      const m = raw[Math.max(0, i - 1)];
      const dx = nx.x - m.x;
      const dy = nx.y - m.y;
      const l = Math.hypot(dx, dy) || 1;
      const w = Math.sin(i * 0.9 - s.tw * 1.4 + s.ph) * 5.5 * sc * Math.min(1, i / 3);
      XS[i] = q.x - (dy / l) * w;
      YS[i] = q.y + (dx / l) * w;
      const f = Math.sin(i * 0.7 - s.tw + s.ph); // how much this bit of the ribbon faces us
      BAND[i] = f > 0.88 ? 3 : f > 0.3 ? 2 : f > -0.4 ? 1 : 0;
    }
    c.globalAlpha = clamp(s.a, 0, 1);
    c.strokeStyle = s.ramp[1]; // the whole ribbon thin in its back colour, so it never breaks into dashes
    c.lineWidth = 1.6 * sc * s.wide;
    c.beginPath();
    c.moveTo(XS[0], YS[0]);
    for (let i = 1; i < n; i += 1) c.lineTo(XS[i], YS[i]);
    c.stroke();
    for (let band = 1; band < 4; band += 1) { // then the turns facing us wider on top: 1 side, 2 front, 3 front in the light
      c.strokeStyle = s.ramp[[1, 5, 7, 8][band]];
      c.lineWidth = [1.6, 2.6, 3.4, 3.4][band] * sc * s.wide;
      c.beginPath();
      for (let i = 1; i < n; i += 1) {
        if (BAND[i] !== band) continue;
        c.moveTo(XS[i - 1], YS[i - 1]);
        c.lineTo(XS[i], YS[i]);
      }
      c.stroke();
    }
  }

  /** Draw the solid part of a cannon's pop: a white ring opening out and comic burst lines shooting along its aim. @param {CanvasRenderingContext2D} c context @param {object} f flash @returns {void} */
  function drawPop(c, f) {
    const u = f.age / 0.42;
    if (u < 0 || u >= 1) return;
    const e = smooth(Math.min(1, u / 0.8));
    c.globalAlpha = (1 - e) * 0.95;
    c.strokeStyle = '#fff6d2';
    c.lineWidth = (8 * (1 - e) + 1) * sc * f.big;
    c.beginPath();
    c.arc(f.x, f.y, (12 + 120 * e) * sc * f.big, 0, TAU);
    c.stroke();
    c.strokeStyle = '#ffe27a';
    c.lineWidth = 5 * sc * (1 - e) * f.big + 0.5;
    c.beginPath();
    for (let i = 0; i < 7; i += 1) { // the burst lines
      const a = f.aim + (i / 6 - 0.5) * 1.7;
      const r0 = (24 + 110 * e) * sc * f.big;
      const r1 = r0 + 40 * sc * (1 - e) * f.big * (i % 2 ? 0.7 : 1);
      c.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
      c.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
    }
    c.stroke();
  }

  /** Draw the light, added on: the pops' glow and screen flash, the sparkles, and the glints on gold foil and stars facing us. @param {CanvasRenderingContext2D} c context @param {number} fade alpha @returns {void} */
  function drawLight(c, fade) {
    c.globalCompositeOperation = 'lighter';
    for (const f of flashes) {
      if (f.age < 0) continue;
      const u = f.age / 0.5;
      if (u >= 1) continue;
      const r = (110 + 130 * smooth(Math.min(1, u * 3))) * sc * f.big;
      c.globalAlpha = (1 - u) * (1 - u);
      c.drawImage(halo, f.x - r, f.y - r, r * 2, r * 2);
      if (f.scr && f.age < 0.3) { // a quick flash of light over the whole screen
        const v = 1 - f.age / 0.3;
        c.globalAlpha = f.scr * v * v;
        c.fillStyle = 'rgb(255,240,206)';
        c.fillRect(0, 0, W, H);
      }
    }
    for (const s of sparkles) {
      if (s.age < 0) continue;
      const u = s.age / s.life;
      const size = s.size * (0.6 + 0.4 * Math.sin(s.age * 22 + s.ph)) * (1 - u * 0.4);
      c.globalAlpha = clamp((u < 0.12 ? u / 0.12 : 1 - smooth((u - 0.35) / 0.65)) * fade, 0, 1);
      c.drawImage(s.img, s.x - size / 2, s.y - size / 2, size, size);
    }
    for (const p of pieces) {
      if (!p.glint || p.age < 0) continue;
      const fy = Math.cos(p.flip);
      if (fy < 0.93) continue;
      const v = ((fy - 0.93) / 0.07) * (p.landed ? 0.5 + 0.5 * Math.sin(clock * 3 + p.ph) : 1); // on the heap it twinkles
      const size = (p.kind === 'star' ? 30 : 20) * sc * v;
      c.globalAlpha = clamp(v * p.a * fade, 0, 1);
      c.drawImage(sparkW, p.x - size / 2, p.y - size / 2, size, size);
    }
    c.globalCompositeOperation = 'source-over';
  }

  if (still) calmScene();

  return {
    /** Move every piece, streamer, sparkle and pop on, settle the ones that reach the bottom, and sprinkle a few when idle. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (still) {
        if (stillFade >= 0) {
          stillFade += dt;
          if (stillFade > 4.5) { stillFade = -1; for (let i = pieces.length - 1; i >= 0; i -= 1) if (pieces[i].soft) pieces.splice(i, 1); }
        }
        return;
      }
      clock += dt;
      gust *= Math.exp(-0.5 * dt);
      wind = (Math.sin(clock * 0.5) * 0.7 + 0.1) * 26 * sc + gust * 50 * sc;
      let j = 0;
      for (const p of pieces) {
        if (p.age < 0) p.age += dt;
        else if (p.landed) rest(p, dt);
        else {
          move(p, dt);
          const fl = floorAt(p.x) - p.h * 0.25;
          if (p.y >= fl && p.vy > 0) {
            if (!p.bounced && p.vy > 70 * sc && !p.imgF) { p.bounced = true; p.y = fl; p.vy *= -0.25; p.vx *= 0.4; } // a tiny hop
            else settle(p, fl);
          }
        }
        if (p.a <= 0 || p.x < -80 || p.x > W + 80) { if (p.col >= 0) heap[p.col] = Math.max(0, heap[p.col] - p.add); continue; }
        pieces[j] = p;
        j += 1;
      }
      pieces.length = j;
      j = 0;
      for (const s of streamers) {
        stepStreamer(s, dt);
        if (s.a > 0) { streamers[j] = s; j += 1; }
      }
      streamers.length = j;
      j = 0;
      for (const s of sparkles) {
        s.age += dt;
        if (s.age >= 0) {
          const k = Math.exp(-s.drag * dt);
          s.vx *= k;
          s.vy = s.vy * k + g * s.grav * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        if (s.age < s.life) { sparkles[j] = s; j += 1; }
      }
      sparkles.length = j;
      for (const f of flashes) f.age += dt;
      for (let i = flashes.length - 1; i >= 0; i -= 1) if (flashes[i].age > 0.6) flashes.splice(i, 1);
      sprinkle -= dt;
      if (sprinkle <= 0) { // the idle sprinkle: a piece now and then from the top
        sprinkle = 0.45 + env.rand() * 0.6;
        if (pieces.length < 30) add(piece(spa ? 'petal' : env.rand() < 0.25 ? 'curl' : 'rect', env.rand() * W, -12 * sc, 0, 30 * sc));
      }
    },
    /** Streamers first, then the pieces, the pops, then the light added on top. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const fade = still ? (stillFade < 0 ? 1 : smooth(stillFade / 0.6) * (1 - smooth((stillFade - 3) / 1.5))) : 1;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (const s of streamers) if (s.age >= 0) drawStreamer(c, s);
      drawFlat(c);
      for (const p of pieces) if (p.age >= 0 && !flat(p)) drawPiece(c, p, p.soft ? fade : 1);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const f of flashes) drawPop(c, f);
      drawLight(c, fade);
      c.globalAlpha = 1;
    },
    /** Odd times a confetti burst, even times a petal shower. @returns {void} */
    trigger() {
      fired += 1;
      if (fired % 2) burst(); else petalShower();
      if (still) { settleAll(); stillFade = 0; }
    },
    /** Counts for checks. @returns {object} state */
    state: () => ({ pieces: pieces.length, streamers: streamers.length, sparkles: sparkles.length, landed: pieces.reduce((n, p) => n + (p.landed ? 1 : 0), 0), fired, mode: fired % 2 ? 'confetti' : 'petals' }),
  };
}

export default { id: 'confetti', num: 8, name: 'Confetti', layer: 'glass', make };
